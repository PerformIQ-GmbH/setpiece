import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import {
  db,
  usersTable,
  passwordResetTokensTable,
  emailVerificationTokensTable,
} from "@workspace/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod/v4";
import {
  clearSession,
  getSessionId,
  createSession,
  deleteSession,
  revokeUserSessions,
  limitAuthAttempts,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../lib/email";

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL = 60 * 60 * 1000;
const VERIFICATION_TOKEN_TTL = 24 * 60 * 60 * 1000;
const OAUTH_STATE_TTL = 10 * 60 * 1000;
const OAUTH_STATE_COOKIE = "oauth_state";

const router: IRouter = Router();

const emailSchema = z.string().trim().toLowerCase().max(254).email();
const newPasswordSchema = z.string().min(8).refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
  message: "Password must be at most 72 UTF-8 bytes",
});
const registerSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  firstName: z.string().trim().max(255).optional(),
  lastName: z.string().trim().max(255).optional(),
});
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(1024) });
const emailBodySchema = z.object({ email: emailSchema });
const resetPasswordSchema = z.object({ token: z.string().min(1).max(256), password: newPasswordSchema });
const googleProfileSchema = z.object({
  id: z.string().min(1),
  email: emailSchema,
  verified_email: z.literal(true),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  picture: z.string().optional(),
});

function getOrigin(req: Request): string {
  // Reset tokens and OAuth codes must never be sent to a request-controlled host.
  const domains = [process.env.APP_DOMAIN,
    process.env.REPLIT_DEPLOYMENT !== "1" ? process.env.REPLIT_DEV_DOMAIN : undefined,
    ...process.env.REPLIT_DOMAINS?.split(",") ?? [],
  ].filter((domain): domain is string => Boolean(domain?.trim())).map(domain => domain.trim().toLowerCase());
  const header = req.headers["x-forwarded-host"] || req.headers.host;
  const requested = typeof header === "string" ? header.toLowerCase() : "";
  // Trusted aliases retain their OAuth state cookie on the same host.
  const domain = domains.includes(requested) ? requested : domains[0] || "setpiece.performiq.ch";
  return `https://${domain}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")
    || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    return "/";
  }
  return value;
}

async function issueVerificationEmail(userId: string, email: string, origin: string) {
  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(emailVerificationTokensTable).values({
    userId,
    token,
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL),
  });
  await sendVerificationEmail(email, token, origin);
}

async function createUserSession(user: SessionData["user"], database: Pick<typeof db, "insert"> = db) {
  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    },
  };
  return createSession(sessionData, database);
}

async function authenticatePassword(email: string, password: string) {
  return db.transaction(async (tx) => {
    // Credential changes and session creation take the same user lock. A login
    // that started before a reset/Google claim cannot leave a later session behind.
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.email, email)).for("update");
    if (!user?.passwordHash || !await bcrypt.compare(password, user.passwordHash)) return null;
    const sid = await createUserSession(user, tx);
    return { user, sid };
  });
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.post("/auth/register", async (req: Request, res: Response) => {
  if (!limitAuthAttempts(req, res, "register")) return;
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email and a password of at least 8 characters (maximum 72 UTF-8 bytes)." });
    return;
  }
  const { email: emailLower, password, firstName, lastName } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, emailLower));

  if (existing) {
    res.status(409).json({ error: "An account with this email already exists. Sign in or reset your password." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const created = await db.transaction(async (tx) => {
    const [newUser] = await tx.insert(usersTable).values({
      email: emailLower,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      authProvider: "email",
      emailVerified: false,
    })
    .onConflictDoNothing({ target: usersTable.email }).returning();
    if (!newUser) return null;
    return { newUser, sid: await createUserSession(newUser, tx) };
  });
  if (!created) {
    res.status(409).json({ error: "An account with this email already exists. Sign in or reset your password." });
    return;
  }
  const { newUser, sid } = created;
  setSessionCookie(res, sid);
  await issueVerificationEmail(newUser.id, emailLower, getOrigin(req));
  res.status(201).json({ user: { id: newUser.id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName } });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  if (!limitAuthAttempts(req, res, "login")) return;
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid email and password are required" });
    return;
  }
  const { email: emailLower, password } = parsed.data;

  const authenticated = await authenticatePassword(emailLower, password);
  if (!authenticated) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const { user, sid } = authenticated;
  setSessionCookie(res, sid);
  res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
});

router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  if (!limitAuthAttempts(req, res, "forgot_password")) return;
  const parsed = emailBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  const emailLower = parsed.data.email;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, emailLower));

  res.json({ message: "If an account with that email exists, a password reset link has been sent." });

  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(passwordResetTokensTable).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL),
  });

  await sendPasswordResetEmail(emailLower, token, getOrigin(req));
  req.log.info({ email: emailLower }, "Password reset email sent");
});

router.post("/auth/reset-password", async (req: Request, res: Response) => {
  if (!limitAuthAttempts(req, res, "reset_password")) return;
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid token and a password of at least 8 characters (maximum 72 UTF-8 bytes) are required" });
    return;
  }
  const { token, password } = parsed.data;

  const [resetToken] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.token, token));

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const reset = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, resetToken.userId)).for("update");
    if (!user) return false;
    const resetAt = new Date();
    const [consumed] = await tx.update(passwordResetTokensTable)
      .set({ usedAt: resetAt })
      .where(and(eq(passwordResetTokensTable.id, resetToken.id), isNull(passwordResetTokensTable.usedAt), gt(passwordResetTokensTable.expiresAt, resetAt)))
      .returning({ userId: passwordResetTokensTable.userId });
    if (!consumed) return false;

    await tx.update(usersTable)
      .set({ passwordHash, authProvider: "email", updatedAt: resetAt })
      .where(eq(usersTable.id, consumed.userId));
    await tx.update(passwordResetTokensTable)
      .set({ usedAt: resetAt })
      .where(eq(passwordResetTokensTable.userId, consumed.userId));
    await revokeUserSessions(consumed.userId, tx);
    return true;
  });
  if (!reset) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ message: "Password reset successfully" });
});

router.get("/auth/verify-email", async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    res.redirect("/login?error=invalid_verification");
    return;
  }

  const [verifyToken] = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(eq(emailVerificationTokensTable.token, token));

  if (!verifyToken || verifyToken.usedAt || verifyToken.expiresAt < new Date()) {
    res.redirect("/login?error=expired_verification");
    return;
  }

  await db
    .update(usersTable)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(usersTable.id, verifyToken.userId));

  await db
    .update(emailVerificationTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokensTable.id, verifyToken.id));

  res.redirect("/login?verified=true");
});

router.post("/auth/resend-verification", async (req: Request, res: Response) => {
  if (!limitAuthAttempts(req, res, "resend_verification")) return;
  const parsed = emailBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  const emailLower = parsed.data.email;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, emailLower));

  res.json({ message: "If an unverified account exists, a verification email has been sent." });

  if (!user || user.emailVerified) return;

  await issueVerificationEmail(user.id, emailLower, getOrigin(req));
});

router.get("/auth/google", (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Google login is not configured" });
    return;
  }

  const returnTo = getSafeReturnTo(req.query.returnTo);
  const nonce = crypto.randomBytes(16).toString("hex");
  const statePayload = Buffer.from(JSON.stringify({ nonce, returnTo })).toString("base64url");

  res.cookie(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: OAUTH_STATE_TTL,
    path: "/api/auth/google",
  });

  const callbackUrl = `${getOrigin(req)}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state: statePayload,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || typeof code !== "string") {
    res.redirect("/login?error=google_failed");
    return;
  }

  if (!state || typeof state !== "string") {
    res.redirect("/login?error=invalid_state");
    return;
  }

  const cookieNonce = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/api/auth/google" });

  let stateData: { nonce: string; returnTo: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    res.redirect("/login?error=invalid_state");
    return;
  }

  if (!cookieNonce || cookieNonce !== stateData.nonce) {
    res.redirect("/login?error=invalid_state");
    return;
  }

  const returnTo = getSafeReturnTo(stateData.returnTo);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.redirect("/login?error=google_not_configured");
    return;
  }

  const callbackUrl = `${getOrigin(req)}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      res.redirect("/login?error=google_token_failed");
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const { access_token } = tokenData;

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userInfoRes.ok) {
      res.redirect("/login?error=google_profile_failed");
      return;
    }

    const parsedProfile = googleProfileSchema.safeParse(await userInfoRes.json());
    if (!parsedProfile.success) {
      res.redirect("/login?error=google_profile_failed");
      return;
    }
    const profile = parsedProfile.data;
    const emailLower = profile.email;

    const sid = await db.transaction(async (tx) => {
      let [existing] = await tx.select().from(usersTable)
        .where(eq(usersTable.email, emailLower)).for("update");
      if (!existing) {
        // A concurrent registration must be claimed under the same user lock.
        [existing] = await tx.insert(usersTable).values({
          email: emailLower,
          firstName: profile.given_name || null,
          lastName: profile.family_name || null,
          profileImageUrl: profile.picture || null,
          authProvider: "google",
          emailVerified: true,
        }).onConflictDoNothing({ target: usersTable.email }).returning();
        if (!existing) {
          [existing] = await tx.select().from(usersTable)
            .where(eq(usersTable.email, emailLower)).for("update");
        }
      }
      if (!existing) throw new Error("Google account could not be linked");
      // An unverified signup cannot retain credentials when Google proves email ownership.
      if (!existing.emailVerified) {
        await revokeUserSessions(existing.id, tx);
        await tx.update(passwordResetTokensTable).set({ usedAt: new Date() })
          .where(eq(passwordResetTokensTable.userId, existing.id));
        await tx.update(emailVerificationTokensTable).set({ usedAt: new Date() })
          .where(eq(emailVerificationTokensTable.userId, existing.id));
      }
      const [dbUser] = await tx.update(usersTable)
        .set({
          firstName: profile.given_name || existing.firstName,
          lastName: profile.family_name || existing.lastName,
          profileImageUrl: profile.picture || existing.profileImageUrl,
          passwordHash: existing.emailVerified ? existing.passwordHash : null,
          emailVerified: true,
          authProvider: existing.emailVerified && existing.passwordHash ? existing.authProvider : "google",
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, existing.id))
        .returning();
      return createUserSession(dbUser, tx);
    });
    setSessionCookie(res, sid);
    res.redirect(returnTo);
  } catch (err) {
    req.log.error({ err }, "Google OAuth callback error");
    res.redirect("/login?error=google_failed");
  }
});

router.get("/login", (req: Request, res: Response) => {
  const returnTo = getSafeReturnTo(req.query.returnTo);
  res.redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.redirect("/");
});

router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    if (!limitAuthAttempts(req, res, "login")) return;
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const emailLower = parsed.data.email.toLowerCase().trim();
    const { password } = parsed.data;
    const authenticated = await authenticatePassword(emailLower, password);
    if (!authenticated) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: authenticated.sid }));
  },
);

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
