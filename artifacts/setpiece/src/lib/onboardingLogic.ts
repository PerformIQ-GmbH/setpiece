// Logik des Onboardings ohne Oberfläche: Spielerangaben prüfen und in API-Werte umrechnen,
// Rollen automatisch vorschlagen. Keine Importe, damit sie sich ohne Browser testen lässt
// (scripts/tests/onboarding-logic.test.mjs).

export type Foot = 'left' | 'right' | 'both';

export interface PlayerDraft {
  /** Stable key for React lists. */
  key: string;
  /** Set once the player exists on the server; later passes update instead of create. */
  savedId?: string;
  firstName: string;
  lastName: string;
  shirtNumber: string;
  foot: Foot | '';
  height: string;
  /** 1 to 5 as picked by the coach; the API takes 1 to 10. */
  heading: number;
  speed: number;
  tags: string[];
}

export const emptyDraft = (key: string): PlayerDraft => ({ key, firstName: '', lastName: '', shirtNumber: '', foot: '', height: '', heading: 0, speed: 0, tags: [] });

export interface PlayerPayload {
  firstName: string;
  lastName: string;
  shirtNumber?: number;
  dominantFoot?: Foot;
  height?: number;
  headingStrength?: number;
  speed?: number;
  tags?: string[];
}

export type DraftErrors = Partial<Record<'name' | 'shirtNumber' | 'height', string>>;

/** A row nobody touched is ignored instead of reported. */
export const isDraftEmpty = (d: PlayerDraft): boolean =>
  !d.firstName.trim() && !d.lastName.trim() && !d.shirtNumber && !d.foot && !d.height && !d.heading && !d.speed && d.tags.length === 0;

/** How many of the five profile details the role suggestions use are filled in (foot, height, heading, speed, tags). */
export const profileDetails = (d: Pick<PlayerDraft, 'foot' | 'height' | 'heading' | 'speed' | 'tags'>): number =>
  [!!d.foot, !!d.height, d.heading > 0, d.speed > 0, d.tags.length > 0].filter(Boolean).length;

const wholeNumber = (text: string): number | null => (/^\d{1,3}$/.test(text.trim()) ? parseInt(text, 10) : null);

/** Validates all rows together (duplicate shirt numbers need the whole list). Empty rows are skipped. */
export function parsePlayers(drafts: PlayerDraft[]): { payloads: { draft: PlayerDraft; payload: PlayerPayload }[]; errors: Record<string, DraftErrors> } {
  const errors: Record<string, DraftErrors> = {};
  const payloads: { draft: PlayerDraft; payload: PlayerPayload }[] = [];
  const used = new Map<number, string>();
  for (const d of drafts) {
    if (isDraftEmpty(d)) continue;
    const e: DraftErrors = {};
    if (!d.firstName.trim() || !d.lastName.trim()) e.name = 'Vor- und Nachname fehlen noch.';
    let shirt: number | undefined;
    if (d.shirtNumber) {
      const n = wholeNumber(d.shirtNumber);
      if (n === null || n < 1 || n > 99) e.shirtNumber = 'Rückennummer von 1 bis 99.';
      else if (used.has(n)) e.shirtNumber = `Nummer ${n} ist schon vergeben.`;
      else { shirt = n; used.set(n, d.key); }
    }
    let height: number | undefined;
    if (d.height) {
      const n = wholeNumber(d.height);
      if (n === null || n < 100 || n > 230) e.height = 'Grösse in cm, von 100 bis 230.';
      else height = n;
    }
    if (Object.keys(e).length) { errors[d.key] = e; continue; }
    payloads.push({
      draft: d,
      payload: {
        firstName: d.firstName.trim(),
        lastName: d.lastName.trim(),
        ...(shirt !== undefined && { shirtNumber: shirt }),
        ...(d.foot && { dominantFoot: d.foot }),
        ...(height !== undefined && { height }),
        // Das Profil rechnet mit 1 bis 10; der Trainer wählt wie die Spieler beim Beitritt 1 bis 5.
        ...(d.heading > 0 && { headingStrength: d.heading * 2 }),
        ...(d.speed > 0 && { speed: d.speed * 2 }),
        ...(d.tags.length > 0 && { tags: d.tags }),
      },
    });
  }
  return { payloads, errors };
}

export interface RoleSuggestion {
  roleId: string;
  candidates: { playerId: string; score: number; badge: string }[];
}

/**
 * One player per role, best fits first: all pairs rated «best» or «good» sorted by score,
 * taken greedily so no player is used twice. Roles without a good candidate stay open.
 */
export function suggestAssignments(roles: RoleSuggestion[]): Record<string, string> {
  const pairs = roles.flatMap(r => r.candidates.filter(c => c.badge === 'best' || c.badge === 'good').map(c => ({ roleId: r.roleId, playerId: c.playerId, score: c.score })));
  pairs.sort((a, b) => b.score - a.score);
  const out: Record<string, string> = {};
  const usedPlayers = new Set<string>();
  for (const p of pairs) {
    if (out[p.roleId] || usedPlayers.has(p.playerId)) continue;
    out[p.roleId] = p.playerId;
    usedPlayers.add(p.playerId);
  }
  return out;
}
