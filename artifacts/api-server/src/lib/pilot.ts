import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, pilotAccessTable } from "@workspace/db";

export const pilotEnabled = () => process.env.SETPIECE_PILOT_ENABLED === "true";

export function effectivePilotTier(tier: string, expiresAt: Date | null, now = new Date()): string {
  return tier === "free" && expiresAt && expiresAt > now ? "solo_coach" : tier;
}

export async function teamPilotAccess(teamId: string, tier: string) {
  if (!pilotEnabled()) return { effectiveTier: tier, pilotExpiresAt: null, pilotAvailable: false };
  const [pilot] = await db.select({ expiresAt: pilotAccessTable.expiresAt })
    .from(pilotAccessTable).where(eq(pilotAccessTable.teamId, teamId));
  const expiresAt = pilot?.expiresAt ?? null;
  return { effectiveTier: effectivePilotTier(tier, expiresAt), pilotExpiresAt: expiresAt, pilotAvailable: true };
}

export async function redeemPilot(teamId: string, userId: string, code: string) {
  const hash = createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
  try {
    return await db.transaction(async (tx) => {
      // Lock ownership and paid plan while consuming a code; never alter billing state.
      const team = await tx.execute(sql`
        SELECT t.id FROM teams t WHERE t.id = ${teamId} AND t.owner_id = ${userId}
        AND t.tier = 'free' AND EXISTS (
          SELECT 1 FROM memberships m WHERE m.team_id = t.id
          AND m.user_id = ${userId} AND m.role = 'head_coach'
        ) FOR UPDATE OF t
      `);
      if (!team.rows.length) return { error: "ineligible" as const };
      const previous = await tx.execute(sql`
        SELECT expires_at FROM pilot_access
        WHERE code_hash = ${hash} AND user_id = ${userId} AND team_id = ${teamId}
      `);
      if (previous.rows.length) return { expiresAt: previous.rows[0].expires_at as Date };
      // One statement claims one slot. Unique user/team constraints also cover competing codes.
      const claimed = await tx.execute(sql`
        UPDATE pilot_access SET user_id = ${userId}, team_id = ${teamId},
          redeemed_at = CURRENT_TIMESTAMP, expires_at = CURRENT_TIMESTAMP + interval '720 hours'
        WHERE code_hash = ${hash} AND user_id IS NULL
        RETURNING expires_at
      `);
      return claimed.rows.length
        ? { expiresAt: claimed.rows[0].expires_at as Date }
        : { error: "unavailable" as const };
    });
  } catch (error) {
    const pgError = error as { code?: string; cause?: { code?: string } };
    if (pgError.code === "23505" || pgError.cause?.code === "23505") return { error: "unavailable" as const };
    throw error;
  }
}
