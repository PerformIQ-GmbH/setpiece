// Kennzahlen für das Admin-Dashboard. Nur Zahlen, keine personenbezogenen Daten.
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { effectivePilotTier, pilotEnabled } from "./pilot";
import { isMissingTable, resolveComplimentaryAccess } from "./teamAccess";

export const WEEKS = 12;
export const tiers = ["free", "solo_coach", "team"] as const;
export type TierCounts = Record<(typeof tiers)[number], number>;

const emptyTiers = (): TierCounts => ({ free: 0, solo_coach: 0, team: 0 });
const DAY = 86_400_000;

/** Montag 00:00 UTC der Woche, in der `date` liegt. */
export function weekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

/** Füllt fehlende Wochen mit 0 auf; älteste Woche zuerst, aktuelle Woche zuletzt. */
export function fillWeeks(rows: { week: string | Date; count: number }[], now = new Date(), weeks = WEEKS) {
  const counts = new Map(rows.map((r) => [new Date(r.week).toISOString().slice(0, 10), Number(r.count)]));
  const current = weekStart(now).getTime();
  return Array.from({ length: weeks }, (_, i) => {
    const week = new Date(current - (weeks - 1 - i) * 7 * DAY).toISOString().slice(0, 10);
    return { week, count: counts.get(week) ?? 0 };
  });
}

export interface TeamRow {
  tier: string;
  stripeStatus: string | null;
  pilotExpiresAt: Date | null;
  grant?: { tier: "solo_coach" | "team"; expiresAt: Date | null };
}

function bump(counts: TierCounts, tier: string) {
  if (tier in counts) counts[tier as keyof TierCounts] += 1;
}

/** Verteilung nach Abo und wirksamem Tarif (inkl. Pilot und Gratiszugang). */
export function summarizeTeams(rows: TeamRow[], now = new Date(), showPilot = true) {
  const byBillingTier = emptyTiers();
  const byEffectiveTier = emptyTiers();
  let withActivePilot = 0;
  let withActiveComplimentary = 0;
  let withActiveSubscription = 0;
  for (const row of rows) {
    bump(byBillingTier, row.tier);
    const pilotExpiresAt = showPilot ? row.pilotExpiresAt : null;
    const afterPilot = effectivePilotTier(row.tier, pilotExpiresAt, now);
    const access = resolveComplimentaryAccess(afterPilot, row.grant, now);
    bump(byEffectiveTier, access.effectiveTier);
    if (row.tier === "free" && afterPilot !== row.tier) withActivePilot += 1;
    if (access.complimentaryAccess?.active) withActiveComplimentary += 1;
    if (row.stripeStatus === "active" || row.stripeStatus === "trialing") withActiveSubscription += 1;
  }
  return { total: rows.length, byBillingTier, byEffectiveTier, withActivePilot, withActiveComplimentary, withActiveSubscription };
}

const num = (value: unknown) => Number(value ?? 0);

async function section<T>(name: string, unavailable: string[], load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    // Fehlende Tabelle (Migration offen) oder Abfragefehler: Bereich weglassen, Rest bleibt nutzbar.
    unavailable.push(name);
    if (!isMissingTable(error)) console.error(`Admin-Kennzahlen: Abschnitt «${name}» nicht verfügbar`);
    return null;
  }
}

export async function loadAdminStats(now = new Date()) {
  const unavailable: string[] = [];
  const since7 = new Date(now.getTime() - 7 * DAY);
  const since30 = new Date(now.getTime() - 30 * DAY);
  const sinceWeeks = new Date(weekStart(now).getTime() - (WEEKS - 1) * 7 * DAY);

  const [users, signups, teamRows, grants, activeTeams, players, setPieces, matchdays, quiz, pilot, invites] = await Promise.all([
    section("users", unavailable, async () => {
      const { rows } = await db.execute(sql`
        SELECT count(*)::int AS total,
          count(*) FILTER (WHERE email_verified)::int AS verified,
          count(*) FILTER (WHERE created_at >= ${since7})::int AS new7,
          count(*) FILTER (WHERE created_at >= ${since30})::int AS new30
        FROM users`);
      return rows[0];
    }),
    section("signups", unavailable, async () => {
      const { rows } = await db.execute(sql`
        SELECT date_trunc('week', created_at AT TIME ZONE 'UTC')::date::text AS week, count(*)::int AS count
        FROM users WHERE created_at >= ${sinceWeeks} GROUP BY 1`);
      return rows as unknown as { week: string; count: number }[];
    }),
    section("teams", unavailable, async () => {
      const { rows } = await db.execute(sql`
        SELECT t.id AS id, t.tier AS tier, t.stripe_subscription_status AS stripe_status, p.expires_at AS pilot_expires_at
        FROM teams t LEFT JOIN pilot_access p ON p.team_id = t.id`);
      return rows;
    }),
    // Gratiszugang kann fehlen, solange die Migration nicht angewandt ist; das ist kein Fehler.
    db.execute(sql`SELECT team_id, tier, expires_at FROM complimentary_access`).then((r) => r.rows).catch((error) => {
      if (!isMissingTable(error)) unavailable.push("complimentaryAccess");
      return [] as Record<string, unknown>[];
    }),
    section("activeTeams", unavailable, async () => {
      const { rows } = await db.execute(sql`
        SELECT count(DISTINCT team_id)::int AS total FROM (
          SELECT team_id FROM set_pieces WHERE updated_at >= ${since30}
          UNION ALL SELECT team_id FROM matchdays WHERE updated_at >= ${since30}
          UNION ALL SELECT team_id FROM audit_events WHERE created_at >= ${since30}
          UNION ALL SELECT p.team_id FROM quiz_attempts q JOIN players p ON p.id = q.player_id WHERE q.created_at >= ${since30}
        ) a`);
      return num(rows[0]?.total);
    }),
    section("players", unavailable, async () => {
      const { rows } = await db.execute(sql`SELECT count(*)::int AS total FROM players`);
      return num(rows[0]?.total);
    }),
    section("setPieces", unavailable, async () => {
      const { rows } = await db.execute(sql`
        SELECT count(*)::int AS total,
          count(*) FILTER (WHERE status IN ('ready', 'active_matchday'))::int AS published,
          count(*) FILTER (WHERE status = 'draft')::int AS draft,
          count(*) FILTER (WHERE status = 'archived')::int AS archived
        FROM set_pieces`);
      return rows[0];
    }),
    section("matchdays", unavailable, async () => {
      const { rows } = await db.execute(sql`
        SELECT count(*)::int AS total, count(*) FILTER (WHERE created_at >= ${since30})::int AS new30 FROM matchdays`);
      return rows[0];
    }),
    section("quiz", unavailable, async () => {
      const { rows } = await db.execute(sql`
        SELECT count(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed_total,
          count(*) FILTER (WHERE completed_at >= ${since30})::int AS completed30,
          count(*) FILTER (WHERE completed_at >= ${since30} AND passed)::int AS passed30,
          count(DISTINCT player_id) FILTER (WHERE completed_at >= ${since30})::int AS players30
        FROM quiz_attempts`);
      return rows[0];
    }),
    section("pilot", unavailable, async () => {
      const { rows } = await db.execute(sql`
        SELECT count(*)::int AS total, count(*) FILTER (WHERE user_id IS NOT NULL)::int AS redeemed FROM pilot_access`);
      return rows[0];
    }),
    section("invites", unavailable, async () => {
      const { rows } = await db.execute(sql`
        SELECT count(*)::int AS total FROM team_invites
        WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ${now})
          AND (max_uses IS NULL OR use_count < max_uses)`);
      return num(rows[0]?.total);
    }),
  ]);

  const grantByTeam = new Map(grants.map((g) => [String(g.team_id), {
    tier: g.tier as "solo_coach" | "team", expiresAt: g.expires_at ? new Date(g.expires_at as string) : null,
  }]));
  const teams = teamRows && summarizeTeams(teamRows.map((r) => ({
    tier: String(r.tier),
    stripeStatus: (r.stripe_status as string | null) ?? null,
    pilotExpiresAt: r.pilot_expires_at ? new Date(r.pilot_expires_at as string) : null,
    grant: grantByTeam.get(String(r.id)),
  })), now, pilotEnabled());

  return {
    generatedAt: now.toISOString(),
    unavailable,
    users: users && { total: num(users.total), verified: num(users.verified), new7: num(users.new7), new30: num(users.new30) },
    signupsPerWeek: signups && fillWeeks(signups, now),
    teams: teams && { ...teams, active30: activeTeams },
    players,
    setPieces: setPieces && {
      total: num(setPieces.total), published: num(setPieces.published),
      draft: num(setPieces.draft), archived: num(setPieces.archived),
    },
    matchdays: matchdays && { total: num(matchdays.total), new30: num(matchdays.new30) },
    quiz: quiz && {
      completedTotal: num(quiz.completed_total), completed30: num(quiz.completed30),
      passed30: num(quiz.passed30), players30: num(quiz.players30),
    },
    pilot: pilot && { total: num(pilot.total), redeemed: num(pilot.redeemed), open: num(pilot.total) - num(pilot.redeemed) },
    openInvites: invites,
  };
}
