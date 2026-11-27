import { eq } from "drizzle-orm";
import { db, complimentaryAccessTable } from "@workspace/db";
import { teamPilotAccess } from "./pilot";

type Grant = Pick<typeof complimentaryAccessTable.$inferSelect, "tier" | "expiresAt">;
const tierOrder = ["free", "solo_coach", "team"];

export function resolveComplimentaryAccess(baseTier: string, grant: Grant | undefined, now = new Date()) {
  const active = Boolean(grant && (!grant.expiresAt || grant.expiresAt > now));
  const effectiveTier = grant && active && tierOrder.indexOf(grant.tier) > tierOrder.indexOf(baseTier)
    ? grant.tier
    : baseTier;
  return { effectiveTier, complimentaryAccess: grant ? { ...grant, active } : null };
}

/** PostgreSQL "undefined_table": die additive Migration ist noch nicht angewandt. */
export function isMissingTable(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "42P01" || e?.cause?.code === "42P01";
}

async function teamGrant(teamId: string): Promise<Grant | undefined> {
  try {
    const [grant] = await db.select({ tier: complimentaryAccessTable.tier, expiresAt: complimentaryAccessTable.expiresAt })
      .from(complimentaryAccessTable).where(eq(complimentaryAccessTable.teamId, teamId));
    return grant;
  } catch (error) {
    // Ohne Migration gibt es keinen Gratiszugang; Teamabfragen dürfen deswegen nicht ausfallen.
    if (isMissingTable(error)) return undefined;
    throw error;
  }
}

export async function teamAccess(teamId: string, billingTier: string) {
  const [pilot, grant] = await Promise.all([teamPilotAccess(teamId, billingTier), teamGrant(teamId)]);
  return { ...pilot, ...resolveComplimentaryAccess(pilot.effectiveTier, grant) };
}
