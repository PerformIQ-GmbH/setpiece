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

export async function teamAccess(teamId: string, billingTier: string) {
  const [pilot, [grant]] = await Promise.all([
    teamPilotAccess(teamId, billingTier),
    db.select({ tier: complimentaryAccessTable.tier, expiresAt: complimentaryAccessTable.expiresAt })
      .from(complimentaryAccessTable).where(eq(complimentaryAccessTable.teamId, teamId)),
  ]);
  return { ...pilot, ...resolveComplimentaryAccess(pilot.effectiveTier, grant) };
}
