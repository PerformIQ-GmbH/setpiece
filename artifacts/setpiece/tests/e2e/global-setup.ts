import crypto from "node:crypto";
import fs from "node:fs";
import {
  db,
  usersTable,
  sessionsTable,
  membershipsTable,
  setPiecesTable,
  setPieceRolesTable,
  matchdaysTable,
  shareLinksTable,
} from "@workspace/db";
import { AUTH_DIR, STATE_PATH, FIXTURES_PATH } from "./paths";

const DEMO_USER_ID = "demo-coach-001";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Seeds an authenticated session for the demo coach directly in the database
 * (the demo user has no password) and resolves the happy-path fixtures the
 * specs need. IDs are queried at runtime so the suite survives re-seeds.
 */
export default async function globalSetup(): Promise<void> {
  const domain = process.env.REPLIT_DEV_DOMAIN;
  if (!domain) {
    throw new Error("REPLIT_DEV_DOMAIN must be set to run the e2e suite.");
  }

  const [user] = (await db.select().from(usersTable)).filter(
    (u) => u.id === DEMO_USER_ID,
  );
  if (!user) {
    throw new Error(
      `Demo user '${DEMO_USER_ID}' not found. Run: pnpm --filter @workspace/scripts seed`,
    );
  }

  const memberships = (await db.select().from(membershipsTable)).filter(
    (m) => m.userId === DEMO_USER_ID,
  );
  if (memberships.length === 0) {
    throw new Error("Demo user has no team membership. Re-run the seed script.");
  }
  const teamId = memberships[0].teamId;

  const setPieces = (await db.select().from(setPiecesTable)).filter(
    (s) => s.teamId === teamId,
  );
  const allRoles = await db.select().from(setPieceRolesTable);
  const setPiecesWithRoles = setPieces.filter((sp) =>
    allRoles.some((r) => r.setPieceId === sp.id),
  );
  // A non-corner set piece renders the full-size pitch (corners shrink the
  // canvas via an aspect-ratio adjustment), which keeps the drag math simple.
  const dragSetPiece =
    setPiecesWithRoles.find((sp) => !sp.category.includes("corner")) ??
    setPiecesWithRoles[0];
  if (!dragSetPiece) {
    throw new Error("No set piece with roles found for the demo team.");
  }

  const matchdays = (await db.select().from(matchdaysTable)).filter(
    (m) => m.teamId === teamId,
  );
  if (matchdays.length === 0) {
    throw new Error("No matchday found for the demo team. Re-run the seed.");
  }
  const matchdayId = matchdays[0].id;

  const shareLinks = (await db.select().from(shareLinksTable)).filter(
    (s) => s.teamId === teamId && !s.revokedAt,
  );
  if (shareLinks.length === 0) {
    throw new Error("No active share link for the demo team. Re-run the seed.");
  }
  const shareToken = shareLinks[0].token;

  const sid = crypto.randomBytes(32).toString("hex");
  const expiresUnix = Math.floor((Date.now() + SESSION_TTL_MS) / 1000);
  await db.insert(sessionsTable).values({
    sid,
    sess: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
    },
    expire: new Date(Date.now() + SESSION_TTL_MS),
  });

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify(
      {
        cookies: [
          {
            name: "sid",
            value: sid,
            domain,
            path: "/",
            expires: expiresUnix,
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
          },
        ],
        origins: [],
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    FIXTURES_PATH,
    JSON.stringify(
      { teamId, dragSetPieceId: dragSetPiece.id, matchdayId, shareToken },
      null,
      2,
    ),
  );
}
