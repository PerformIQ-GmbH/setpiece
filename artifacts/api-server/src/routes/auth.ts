import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import {
  db,
  usersTable,
  passwordResetTokensTable,
  emailVerificationTokensTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  clearSession,
  getSessionId,
  createSession,
  deleteSession,
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

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
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
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
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

async function createUserSession(res: Response, user: { id: string; email: string | null; firstName: string | null; lastName: string | null; profileImageUrl: string | null }) {
  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    },
  };
  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  return sid;
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.post("/auth/register", async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const emailLower = email.toLowerCase().trim();

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, emailLower));

  if (existing) {
    if (existing.passwordHash) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [updated] = await db
      .update(usersTable)
      .set({
        passwordHash,
        firstName: firstName || existing.firstName,
        lastName: lastName || existing.lastName,
        authProvider: "email",
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, existing.id))
      .returning();

    await createUserSession(res, updated);
    if (!updated.emailVerified) {
      await issueVerificationEmail(updated.id, emailLower, getOrigin(req));
    }
    res.json({ user: { id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName } });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [newUser] = await db
    .insert(usersTable)
    .values({
      email: emailLower,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      authProvider: "email",
      emailVerified: false,
    })
    .returning();

  await createUserSession(res, newUser);
  await issueVerificationEmail(newUser.id, emailLower, getOrigin(req));
  res.status(201).json({ user: { id: newUser.id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName } });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const emailLower = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, emailLower));

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await createUserSession(res, user);
  res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
});

router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const emailLower = email.toLowerCase().trim();
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
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({ error: "Token and password are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const [resetToken] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.token, token));

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await db
    .update(usersTable)
    .set({ passwordHash, authProvider: "email", updatedAt: new Date() })
    .where(eq(usersTable.id, resetToken.userId));

  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, resetToken.id));

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
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const emailLower = email.toLowerCase().trim();
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

    const profile = await userInfoRes.json() as { id: string; email: string; given_name?: string; family_name?: string; picture?: string };

    const emailLower = profile.email.toLowerCase();

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, emailLower));

    let dbUser;
    if (existing) {
      [dbUser] = await db
        .update(usersTable)
        .set({
          firstName: profile.given_name || existing.firstName,
          lastName: profile.family_name || existing.lastName,
          profileImageUrl: profile.picture || existing.profileImageUrl,
          emailVerified: true,
          authProvider: existing.passwordHash ? existing.authProvider : "google",
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, existing.id))
        .returning();
    } else {
      [dbUser] = await db
        .insert(usersTable)
        .values({
          email: emailLower,
          firstName: profile.given_name || null,
          lastName: profile.family_name || null,
          profileImageUrl: profile.picture || null,
          authProvider: "google",
          emailVerified: true,
        })
        .returning();
    }

    await createUserSession(res, dbUser);
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
    const { email, password } = req.body;
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, emailLower));

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const sessionData: SessionData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
    };
    const sid = await createSession(sessionData);
    res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
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
