import type { Team } from '@workspace/api-client-react';

const labels: Record<string, string> = { free: 'Kostenlos', solo_coach: 'Solo Coach', team: 'Team' };

export function tierLabel(tier: string): string {
  return labels[tier] ?? tier;
}

export function teamPlanLabel(team: Team): string {
  const effectiveTier = team.effectiveTier ?? team.tier;
  const label = tierLabel(effectiveTier);
  if (effectiveTier === team.tier) return label;
  if (team.complimentaryAccess?.active && team.complimentaryAccess.tier === effectiveTier) return `${label} · Gratiszugang`;
  return team.pilotExpiresAt ? `${label} · Pilot` : label;
}
