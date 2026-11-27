export const platformAdminEndpoint = `${import.meta.env.BASE_URL}api/platform-admin`;

type Tiers = { free: number; solo_coach: number; team: number };

/** Antwort von GET /api/platform-admin/stats. Bereiche, die der Server nicht berechnen konnte, sind null. */
export interface AdminStats {
  generatedAt: string;
  unavailable: string[];
  users: { total: number; verified: number; new7: number; new30: number } | null;
  signupsPerWeek: { week: string; count: number }[] | null;
  teams: {
    total: number;
    byBillingTier: Tiers;
    byEffectiveTier: Tiers;
    withActivePilot: number;
    withActiveComplimentary: number;
    withActiveSubscription: number;
    active30: number | null;
  } | null;
  players: number | null;
  setPieces: { total: number; published: number; draft: number; archived: number } | null;
  matchdays: { total: number; new30: number } | null;
  quiz: { completedTotal: number; completed30: number; passed30: number; players30: number } | null;
  pilot: { total: number; redeemed: number; open: number } | null;
  openInvites: number | null;
}

export async function fetchAdminStats(signal?: AbortSignal): Promise<AdminStats> {
  const response = await fetch(`${platformAdminEndpoint}/stats`, { signal, cache: 'no-store' });
  if (response.status === 401 || response.status === 403) throw new Error('Dieser Bereich ist Plattform-Admins vorbehalten.');
  if (!response.ok) throw new Error('Die Kennzahlen konnten nicht geladen werden.');
  return await response.json() as AdminStats;
}
