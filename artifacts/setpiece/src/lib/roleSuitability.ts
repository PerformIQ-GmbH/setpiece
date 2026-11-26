/**
 * Client-side presentation helpers for the role suitability engine.
 *
 * NO scoring logic lives here — the server is the single source of truth
 * (artifacts/api-server/src/lib/roleSuitability.ts) and exposes:
 *   - POST /teams/:teamId/matchdays/:matchdayId/assignment-suggestions
 *   - POST /teams/:teamId/set-pieces/:setPieceId/role-suggestions
 *
 * This module only re-exposes the shared enums and styling tokens used by
 * the UI to render the server's verdicts.
 */

import type {
  RoleClass as GeneratedRoleClass,
  SuitabilityBadge as GeneratedSuitabilityBadge,
} from '@workspace/api-client-react';

export type RoleClass = GeneratedRoleClass;
export type SuitabilityBadge = GeneratedSuitabilityBadge;

export const ROLE_CLASS_LABELS: Record<RoleClass, string> = {
  delivery: 'Delivery',
  aerial_target: 'Aerial target',
  defensive_marker: 'Defensive marker',
  rest_defense: 'Rest defence',
  blocker: 'Blocker / screen',
  runner: 'Runner',
  rebound: 'Rebound / 2nd ball',
  counter_outlet: 'Counter outlet',
  generic: 'General',
};

export const BADGE_STYLES: Record<
  SuitabilityBadge,
  { label: string; bg: string; text: string; ring: string; dot: string }
> = {
  best: { label: 'Best fit', bg: 'bg-emerald-500/15', text: 'text-emerald-300', ring: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  good: { label: 'Good fit', bg: 'bg-emerald-500/10', text: 'text-emerald-300/90', ring: 'border-emerald-500/20', dot: 'bg-emerald-400/80' },
  review: { label: 'Review', bg: 'bg-amber-500/15', text: 'text-amber-300', ring: 'border-amber-500/30', dot: 'bg-amber-400' },
  problem: { label: 'Problem', bg: 'bg-red-500/15', text: 'text-red-300', ring: 'border-red-500/30', dot: 'bg-red-400' },
};

/**
 * Katalog «Was machst du bei Standards gern?». Keys = STANDARD_PROFILE_TAGS in
 * artifacts/api-server/src/lib/roleSuitability.ts (Server prüft die Liste).
 */
export const STANDARD_PROFILE_TAG_OPTIONS = [
  { key: 'delivery_specialist', label: 'Schütze (Ecke/Freistoss)' },
  { key: 'aerial_threat', label: 'Kopfballspieler' },
  { key: 'runner', label: 'Läufer' },
  { key: 'blocker', label: 'Blocker' },
  { key: 'marker', label: 'Manndecker' },
  { key: 'zonal', label: 'Raumdecker' },
  { key: 'rest_defense', label: 'Absicherung' },
  { key: 'rebound', label: 'Abpraller/Rückraum' },
  { key: 'counter', label: 'Konter' },
] as const;

export const SELF_REPORTED_TAG = 'self_reported';

const TAG_LABELS: Record<string, string> = {
  ...Object.fromEntries(STANDARD_PROFILE_TAG_OPTIONS.map(o => [o.key, o.label])),
  [SELF_REPORTED_TAG]: 'Selbstangabe',
};

export function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag.replace(/_/g, ' ');
}

type ProfileFields = {
  tags?: string[] | null; headingStrength?: number | null; speed?: number | null;
  height?: number | null; dominantFoot?: string | null;
};

/** Spiegelt hasProfileData des Servers: ohne Daten keine Zahl anzeigen, nur «Profil unvollständig». */
export function hasProfileData(p: ProfileFields | undefined | null): boolean {
  if (!p) return false;
  return Boolean(
    (p.tags ?? []).some(t => t !== SELF_REPORTED_TAG) ||
    p.headingStrength != null || p.speed != null || p.height != null || p.dominantFoot,
  );
}
