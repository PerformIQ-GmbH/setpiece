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
