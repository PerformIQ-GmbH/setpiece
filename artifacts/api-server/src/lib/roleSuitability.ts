/**
 * Role Suitability Engine
 * --------------------------------------------------------------------------
 * Pure functions that map a set-piece role + a player profile to a
 * suitability score, human-readable reasons, and an overall badge.
 *
 * Used by:
 *   - POST /teams/:teamId/matchdays/:matchdayId/assignment-suggestions
 *   - POST /teams/:teamId/set-pieces/:setPieceId/ghost  (suitabilityHints)
 *
 * No DB access, no I/O. Side-effect free.
 */

export type RoleClass =
  | "delivery"
  | "aerial_target"
  | "defensive_marker"
  | "rest_defense"
  | "blocker"
  | "runner"
  | "rebound"
  | "counter_outlet"
  | "generic";

export type SuitabilityBadge = "best" | "good" | "review" | "problem";

export interface PlayerLike {
  id: string;
  firstName: string;
  lastName: string;
  shirtNumber?: number | null;
  dominantFoot?: string | null;
  height?: number | null;
  status?: string | null;
  tags?: string[] | null;
  headingStrength?: number | null;
  speed?: number | null;
}

export interface RoleLike {
  id: string;
  name: string;
  description?: string | null;
  coachingPoint?: string | null;
  startPosition?: { x?: number | null; y?: number | null } | null;
}

export interface SuitabilityResult {
  score: number;          // 0-100
  badge: SuitabilityBadge;
  reasons: string[];      // positive reasons player fits
  cautions: string[];     // concerns / mismatches
}

const ROLE_PRIORITY: RoleClass[] = [
  "delivery",
  "aerial_target",
  "defensive_marker",
  "rest_defense",
  "blocker",
  "runner",
  "rebound",
  "counter_outlet",
  "generic",
];

const TAG_ALIASES: Record<string, string> = {
  "delivery specialist": "delivery_specialist",
  "set piece taker": "delivery_specialist",
  "set-piece taker": "delivery_specialist",
  "free kick specialist": "delivery_specialist",
  "free-kick specialist": "delivery_specialist",
  "corner taker": "delivery_specialist",
  "penalty taker": "penalty_taker",
  "aerial threat": "aerial_threat",
  "header threat": "aerial_threat",
  "target man": "aerial_threat",
  "fast": "fast",
  "quick": "fast",
  "speedster": "fast",
  "marker": "defender",
  "defender": "defender",
  "centre back": "defender",
  "center back": "defender",
  "blocker": "blocker",
  "screen": "blocker",
  "tall": "aerial_threat",
};

export function normalizePlayerTags(tags?: string[] | null): Set<string> {
  const out = new Set<string>();
  if (!tags) return out;
  for (const raw of tags) {
    const t = raw.trim().toLowerCase();
    if (!t) continue;
    out.add(t.replace(/\s+/g, "_"));
    if (TAG_ALIASES[t]) out.add(TAG_ALIASES[t]);
  }
  return out;
}

/**
 * Best-effort role classification from name + description + coachingPoint.
 * A role can match multiple classes; the first (highest-priority) class is
 * treated as the primary one for scoring.
 */
export function classifyRole(role: RoleLike): RoleClass[] {
  const haystack = [
    role.name ?? "",
    role.description ?? "",
    role.coachingPoint ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const matches: RoleClass[] = [];

  const has = (...needles: string[]) => needles.some(n => haystack.includes(n));

  if (has("delivery", "taker", "deliver", "kicker", "crosser", "corner taker", "free-kick taker", "free kick taker", "in-swinger", "out-swinger"))
    matches.push("delivery");
  if (has("aerial", "header", "head", "near post target", "far post target", "target", "flick on", "flick-on"))
    matches.push("aerial_target");
  if (has("mark", "marker", "zonal", "zone defender", "track ", "tracking"))
    matches.push("defensive_marker");
  if (has("rest defense", "rest defence", "cover", "stay back", "sit back", "back cover"))
    matches.push("rest_defense");
  if (has("block", "screen", "pick "))
    matches.push("blocker");
  if (has("runner", "late run", "run into", "burst", "quick run", "attacking run"))
    matches.push("runner");
  if (has("rebound", "second ball", "edge of box"))
    matches.push("rebound");
  if (has("counter", "outlet", "transition", "release"))
    matches.push("counter_outlet");

  if (matches.length === 0) matches.push("generic");

  // Sort matches by global priority so the "primary" class is deterministic.
  matches.sort((a, b) => ROLE_PRIORITY.indexOf(a) - ROLE_PRIORITY.indexOf(b));
  return matches;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function badgeFromScore(score: number, hardBlock: boolean): SuitabilityBadge {
  if (hardBlock) return "problem";
  if (score >= 80) return "best";
  if (score >= 60) return "good";
  if (score >= 35) return "review";
  return "problem";
}

/**
 * Score how well a single player fits a single role.
 * Score is an integer 0-100. Hard problems (injured/suspended/inactive) clamp
 * the score to <= 20 and force the "problem" badge.
 */
export function scorePlayerForRole(
  player: PlayerLike,
  role: RoleLike,
): SuitabilityResult {
  const classes = classifyRole(role);
  const primary = classes[0] ?? "generic";
  const tags = normalizePlayerTags(player.tags);
  const reasons: string[] = [];
  const cautions: string[] = [];

  // Start neutral.
  let score = 55;

  // ── Hard availability blocks ──────────────────────────────────────────
  let hardBlock = false;
  const status = (player.status ?? "active").toLowerCase();
  if (status === "injured") {
    cautions.push("Currently injured");
    hardBlock = true;
    score -= 50;
  } else if (status === "suspended") {
    cautions.push("Currently suspended");
    hardBlock = true;
    score -= 50;
  } else if (status === "inactive") {
    cautions.push("Marked inactive");
    hardBlock = true;
    score -= 50;
  }

  const heading = player.headingStrength ?? null;
  const speed = player.speed ?? null;
  const height = player.height ?? null;
  const foot = (player.dominantFoot ?? "").toLowerCase();

  // ── Class-specific scoring ────────────────────────────────────────────
  switch (primary) {
    case "delivery": {
      if (tags.has("delivery_specialist")) {
        score += 30;
        reasons.push("Tagged as delivery specialist");
      } else {
        cautions.push("Not tagged as a delivery specialist");
        score -= 10;
      }
      // Foot preference cue: roles whose name mentions "left" / "right".
      const roleText = (role.name + " " + (role.description ?? "")).toLowerCase();
      if (roleText.includes("left") && foot === "left") {
        score += 10;
        reasons.push("Left-footed for left-side delivery");
      } else if (roleText.includes("right") && foot === "right") {
        score += 10;
        reasons.push("Right-footed for right-side delivery");
      } else if (roleText.includes("left") && foot === "right") {
        cautions.push("Right-footed in a left-side delivery role");
        score -= 5;
      } else if (roleText.includes("right") && foot === "left") {
        cautions.push("Left-footed in a right-side delivery role");
        score -= 5;
      } else if (foot === "both") {
        score += 4;
        reasons.push("Two-footed");
      }
      break;
    }
    case "aerial_target": {
      if (tags.has("aerial_threat")) {
        score += 18;
        reasons.push("Tagged as aerial threat");
      }
      if (heading !== null) {
        if (heading >= 8) { score += 22; reasons.push(`Strong heading (${heading}/10)`); }
        else if (heading >= 6) { score += 10; reasons.push(`Solid heading (${heading}/10)`); }
        else if (heading <= 3) { score -= 18; cautions.push(`Weak heading (${heading}/10)`); }
      }
      if (height !== null) {
        if (height >= 188) { score += 12; reasons.push(`Tall (${height}cm)`); }
        else if (height >= 180) { score += 5; }
        else if (height <= 170) { score -= 8; cautions.push(`Short for an aerial target (${height}cm)`); }
      }
      break;
    }
    case "defensive_marker": {
      if (tags.has("defender")) { score += 14; reasons.push("Tagged as defender"); }
      if (heading !== null) {
        if (heading >= 7) { score += 14; reasons.push(`Strong in the air (${heading}/10)`); }
        else if (heading <= 3) { score -= 12; cautions.push(`Weak in the air (${heading}/10)`); }
      }
      if (height !== null && height >= 185) { score += 8; reasons.push(`Tall marker (${height}cm)`); }
      break;
    }
    case "rest_defense": {
      if (tags.has("defender")) { score += 18; reasons.push("Tagged as defender"); }
      if (speed !== null) {
        if (speed >= 7) { score += 12; reasons.push(`Quick recovery (${speed}/10)`); }
        else if (speed <= 4) { score -= 6; cautions.push(`Limited recovery pace (${speed}/10)`); }
      }
      break;
    }
    case "blocker": {
      if (tags.has("blocker")) { score += 18; reasons.push("Tagged as blocker"); }
      if (height !== null && height >= 183) { score += 10; reasons.push(`Tall (${height}cm)`); }
      if (heading !== null && heading >= 6) { score += 6; }
      break;
    }
    case "runner": {
      if (tags.has("fast")) { score += 14; reasons.push("Tagged as fast"); }
      if (speed !== null) {
        if (speed >= 8) { score += 22; reasons.push(`High speed (${speed}/10)`); }
        else if (speed >= 6) { score += 10; reasons.push(`Good speed (${speed}/10)`); }
        else if (speed <= 4) { score -= 16; cautions.push(`Lacks pace for this run (${speed}/10)`); }
      }
      break;
    }
    case "rebound": {
      if (tags.has("delivery_specialist")) { score += 6; }
      // Generic — value composure (reuse heading slightly as a proxy if no other data).
      score += 3;
      break;
    }
    case "counter_outlet": {
      if (speed !== null) {
        if (speed >= 7) { score += 18; reasons.push(`Quick on the break (${speed}/10)`); }
        else if (speed <= 4) { score -= 10; cautions.push(`Lacks pace for a counter outlet (${speed}/10)`); }
      }
      if (tags.has("fast")) { score += 8; }
      break;
    }
    case "generic":
    default: {
      // No strong signal — neutral score, mild bonus if any matching tag.
      if (tags.size > 0) score += 4;
      break;
    }
  }

  // Tiny tag-overlap bonus: if any other class also matches and the player
  // has the corresponding tag, nudge the score up.
  for (const c of classes.slice(1)) {
    if (c === "aerial_target" && tags.has("aerial_threat")) score += 4;
    if (c === "runner" && tags.has("fast")) score += 4;
    if (c === "delivery" && tags.has("delivery_specialist")) score += 4;
  }

  score = clamp(Math.round(score), 0, 100);
  if (hardBlock) score = Math.min(score, 20);

  return {
    score,
    badge: badgeFromScore(score, hardBlock),
    reasons,
    cautions,
  };
}

// ───────────────────────── Greedy assignment ─────────────────────────────
export type SuggestionMode = "fill_empty" | "replace_all";

export interface SuggestionAlternative {
  playerId: string;
  score: number;
  badge: SuitabilityBadge;
  reasons: string[];
  cautions: string[];
}

export interface RoleSuggestion {
  roleId: string;
  roleName: string;
  primaryClass: RoleClass;
  suggestedPlayerId: string | null;
  /** Recommended understudy — second best non-blocked candidate, distinct from primary. */
  suggestedBackupPlayerId: string | null;
  score: number;
  badge: SuitabilityBadge;
  reasons: string[];
  cautions: string[];
  /** Top 3 alternatives (excluding the primary pick), ordered by score desc. */
  alternatives: SuggestionAlternative[];
  /** True when the role already has an assignment and mode === 'fill_empty'. */
  skipped?: boolean;
  existingPlayerId?: string | null;
  /** True when the player has no profile data to score from (no tags, no attributes). */
  missingProfileData?: boolean;
}

export interface SetPieceSuggestion {
  setPieceId: string;
  setPieceTitle: string;
  roles: RoleSuggestion[];
}

export interface SuggestAssignmentsInput {
  setPieces: Array<{
    id: string;
    title: string;
    roles: RoleLike[];
    existingAssignments: Array<{ roleId: string; playerId: string }>;
  }>;
  /** Players the coach picked as starters. */
  starterPlayers: PlayerLike[];
  /** Players the coach picked as bench (no overlap with starters). */
  benchPlayers: PlayerLike[];
  mode: SuggestionMode;
}

const STARTER_BIAS = 5;

function hasProfileData(p: PlayerLike): boolean {
  return Boolean(
    (p.tags && p.tags.length > 0) ||
    (p.headingStrength !== null && p.headingStrength !== undefined) ||
    (p.speed !== null && p.speed !== undefined) ||
    (p.height !== null && p.height !== undefined) ||
    (p.dominantFoot && p.dominantFoot.length > 0)
  );
}

/**
 * Greedy per-set-piece assignment with starter/bench awareness.
 *
 * For each set piece independently:
 *   1. Sort its roles by global priority (delivery first, generic last).
 *   2. For each role in priority order, pick the highest-scoring AVAILABLE
 *      player from the combined squad. Starters get a small priority bias
 *      so they are preferred over bench when scores are close.
 *   3. Players are NOT shared across set pieces — the same starter can take
 *      a role in every set piece (which is the realistic matchday case).
 *   4. In 'fill_empty' mode, roles with an existing assignment are skipped
 *      (no suggestion produced for them, but reported as `skipped: true`).
 *   5. A backup is also suggested per role (the next best candidate that's
 *      not the primary).
 *
 * Hard-blocked players (injured/suspended/inactive) are still scored but
 * always rank below available players.
 */
export function suggestAssignments(input: SuggestAssignmentsInput): SetPieceSuggestion[] {
  const { setPieces, starterPlayers, benchPlayers, mode } = input;
  const starterIds = new Set(starterPlayers.map(p => p.id));
  const allPlayers = [...starterPlayers, ...benchPlayers];
  const out: SetPieceSuggestion[] = [];

  for (const sp of setPieces) {
    const existingByRole = new Map<string, string>();
    for (const a of sp.existingAssignments) existingByRole.set(a.roleId, a.playerId);

    // Order roles by classification priority.
    const orderedRoles = [...sp.roles].sort((a, b) => {
      const aClass = classifyRole(a)[0] ?? "generic";
      const bClass = classifyRole(b)[0] ?? "generic";
      return ROLE_PRIORITY.indexOf(aClass) - ROLE_PRIORITY.indexOf(bClass);
    });

    const usedPlayers = new Set<string>();
    const roleSuggestions: RoleSuggestion[] = [];

    for (const role of orderedRoles) {
      const existingPlayerId = existingByRole.get(role.id) ?? null;
      const primary = classifyRole(role)[0] ?? "generic";

      if (mode === "fill_empty" && existingPlayerId) {
        roleSuggestions.push({
          roleId: role.id,
          roleName: role.name,
          primaryClass: primary,
          suggestedPlayerId: null,
          suggestedBackupPlayerId: null,
          score: 0,
          badge: "good",
          reasons: [],
          cautions: [],
          alternatives: [],
          skipped: true,
          existingPlayerId,
        });
        usedPlayers.add(existingPlayerId);
        continue;
      }

      const scored = allPlayers
        .map(p => {
          const fit = scorePlayerForRole(p, role);
          const blocked = fit.badge === "problem" && (p.status ?? "active").toLowerCase() !== "active";
          const isStarter = starterIds.has(p.id);
          // Bias only used for ranking; we report the raw fit.score in output.
          const sortKey = fit.score + (isStarter ? STARTER_BIAS : 0);
          return { player: p, fit, blocked, isStarter, sortKey };
        })
        .sort((a, b) => {
          if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
          if (a.isStarter !== b.isStarter && Math.abs(a.fit.score - b.fit.score) <= STARTER_BIAS) {
            return a.isStarter ? -1 : 1;
          }
          return b.sortKey - a.sortKey;
        });

      const pick = scored.find(s => !usedPlayers.has(s.player.id)) ?? null;
      if (pick) usedPlayers.add(pick.player.id);

      // Backup: next best non-blocked candidate that isn't the primary or
      // already used in this set piece.
      const backup = scored.find(
        s => s.player.id !== pick?.player.id && !usedPlayers.has(s.player.id) && !s.blocked,
      ) ?? null;

      const missing = pick ? !hasProfileData(pick.player) : false;
      const cautions = pick?.fit.cautions.slice() ?? [];
      if (pick && missing) cautions.push("No player profile data — recommendation is generic");
      if (!pick) cautions.push("No available players");

      roleSuggestions.push({
        roleId: role.id,
        roleName: role.name,
        primaryClass: primary,
        suggestedPlayerId: pick?.player.id ?? null,
        suggestedBackupPlayerId: backup?.player.id ?? null,
        score: pick?.fit.score ?? 0,
        badge: pick?.fit.badge ?? "problem",
        reasons: pick?.fit.reasons ?? [],
        cautions,
        alternatives: scored
          .filter(s => s.player.id !== pick?.player.id)
          .slice(0, 3)
          .map(s => ({
            playerId: s.player.id,
            score: s.fit.score,
            badge: s.fit.badge,
            reasons: s.fit.reasons,
            cautions: s.fit.cautions,
          })),
        existingPlayerId,
        missingProfileData: missing,
      });
    }

    // Re-sort role suggestions to original role order for stable UI.
    const originalOrder = new Map(sp.roles.map((r, i) => [r.id, i]));
    roleSuggestions.sort((a, b) => (originalOrder.get(a.roleId) ?? 0) - (originalOrder.get(b.roleId) ?? 0));

    out.push({
      setPieceId: sp.id,
      setPieceTitle: sp.title,
      roles: roleSuggestions,
    });
  }

  return out;
}

// ───────────────────────── Per-role evaluation (for Inspector) ────────────
export interface RoleCandidate {
  playerId: string;
  score: number;
  badge: SuitabilityBadge;
  reasons: string[];
  cautions: string[];
}

export interface RoleEvaluation {
  roleId: string;
  roleName: string;
  primaryClass: RoleClass;
  currentPlayerId: string | null;
  currentScore: number | null;
  currentBadge: SuitabilityBadge | null;
  currentReasons: string[];
  currentCautions: string[];
  /**
   * True when there is a currently assigned player but their profile lacks
   * the inputs (tags, attributes) required to confidently assess fit.
   * BoardHealth uses this to surface a "missing profile data" warning.
   */
  currentMissingProfileData: boolean;
  /** Top N candidates ordered by score desc — includes the current player if present. */
  candidates: RoleCandidate[];
}

/**
 * Evaluate each role against a set of candidate players, exposing per-player
 * fit data the Inspector needs (current player fit + top alternatives).
 * No mutation of assignments — purely advisory.
 */
export function evaluateRolesForPlayers(args: {
  roles: RoleLike[];
  assignments: Array<{ roleId: string; playerId: string }>;
  candidatePlayers: PlayerLike[];
  topN?: number;
}): RoleEvaluation[] {
  const { roles, assignments, candidatePlayers, topN = 5 } = args;
  const assignmentByRole = new Map(assignments.map(a => [a.roleId, a.playerId]));
  const playersById = new Map(candidatePlayers.map(p => [p.id, p]));

  return roles.map(role => {
    const primary = classifyRole(role)[0] ?? "generic";
    const currentPlayerId = assignmentByRole.get(role.id) ?? null;
    const currentPlayer = currentPlayerId ? playersById.get(currentPlayerId) ?? null : null;
    const currentFit = currentPlayer ? scorePlayerForRole(currentPlayer, role) : null;

    const ranked = candidatePlayers
      .map(p => ({ p, fit: scorePlayerForRole(p, role) }))
      .sort((a, b) => {
        const aBlocked = (a.p.status ?? "active").toLowerCase() !== "active";
        const bBlocked = (b.p.status ?? "active").toLowerCase() !== "active";
        if (aBlocked !== bBlocked) return aBlocked ? 1 : -1;
        return b.fit.score - a.fit.score;
      })
      .slice(0, topN)
      .map(r => ({
        playerId: r.p.id,
        score: r.fit.score,
        badge: r.fit.badge,
        reasons: r.fit.reasons,
        cautions: r.fit.cautions,
      }));

    return {
      roleId: role.id,
      roleName: role.name,
      primaryClass: primary,
      currentPlayerId,
      currentScore: currentFit?.score ?? null,
      currentBadge: currentFit?.badge ?? null,
      currentReasons: currentFit?.reasons ?? [],
      currentCautions: currentFit?.cautions ?? [],
      currentMissingProfileData: currentPlayer ? !hasProfileData(currentPlayer) : false,
      candidates: ranked,
    };
  });
}
