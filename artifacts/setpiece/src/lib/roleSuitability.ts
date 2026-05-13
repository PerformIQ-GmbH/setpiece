/**
 * Client-side mirror of the server's role suitability engine
 * (artifacts/api-server/src/lib/roleSuitability.ts).
 *
 * Used for instant in-Inspector "Role-Fit" hints and Board Health checks
 * without requiring an API round-trip. The server remains the source of
 * truth for the Matchday Assistant suggestions.
 *
 * Keep these scoring rules in sync with the server file.
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
}

export interface SuitabilityResult {
  score: number;
  badge: SuitabilityBadge;
  reasons: string[];
  cautions: string[];
  primaryClass: RoleClass;
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

export function classifyRole(role: RoleLike): RoleClass[] {
  const haystack = [role.name ?? "", role.description ?? "", role.coachingPoint ?? ""]
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
  matches.sort((a, b) => ROLE_PRIORITY.indexOf(a) - ROLE_PRIORITY.indexOf(b));
  return matches;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function badgeFromScore(score: number, hardBlock: boolean): SuitabilityBadge {
  if (hardBlock) return "problem";
  if (score >= 80) return "best";
  if (score >= 60) return "good";
  if (score >= 35) return "review";
  return "problem";
}

export function scorePlayerForRole(player: PlayerLike, role: RoleLike): SuitabilityResult {
  const classes = classifyRole(role);
  const primary = classes[0] ?? "generic";
  const tags = normalizePlayerTags(player.tags);
  const reasons: string[] = [];
  const cautions: string[] = [];
  let score = 55;

  let hardBlock = false;
  const status = (player.status ?? "active").toLowerCase();
  if (status === "injured") { cautions.push("Currently injured"); hardBlock = true; score -= 50; }
  else if (status === "suspended") { cautions.push("Currently suspended"); hardBlock = true; score -= 50; }
  else if (status === "inactive") { cautions.push("Marked inactive"); hardBlock = true; score -= 50; }

  const heading = player.headingStrength ?? null;
  const speed = player.speed ?? null;
  const height = player.height ?? null;
  const foot = (player.dominantFoot ?? "").toLowerCase();

  switch (primary) {
    case "delivery": {
      if (tags.has("delivery_specialist")) { score += 30; reasons.push("Tagged as delivery specialist"); }
      else { cautions.push("Not tagged as a delivery specialist"); score -= 10; }
      const roleText = (role.name + " " + (role.description ?? "")).toLowerCase();
      if (roleText.includes("left") && foot === "left") { score += 10; reasons.push("Left-footed for left-side delivery"); }
      else if (roleText.includes("right") && foot === "right") { score += 10; reasons.push("Right-footed for right-side delivery"); }
      else if (roleText.includes("left") && foot === "right") { cautions.push("Right-footed in a left-side delivery role"); score -= 5; }
      else if (roleText.includes("right") && foot === "left") { cautions.push("Left-footed in a right-side delivery role"); score -= 5; }
      else if (foot === "both") { score += 4; reasons.push("Two-footed"); }
      break;
    }
    case "aerial_target": {
      if (tags.has("aerial_threat")) { score += 18; reasons.push("Tagged as aerial threat"); }
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
    default: {
      if (tags.size > 0) score += 4;
      break;
    }
  }

  for (const c of classes.slice(1)) {
    if (c === "aerial_target" && tags.has("aerial_threat")) score += 4;
    if (c === "runner" && tags.has("fast")) score += 4;
    if (c === "delivery" && tags.has("delivery_specialist")) score += 4;
  }

  score = clamp(Math.round(score), 0, 100);
  if (hardBlock) score = Math.min(score, 20);
  return { score, badge: badgeFromScore(score, hardBlock), reasons, cautions, primaryClass: primary };
}

export const ROLE_CLASS_LABELS: Record<RoleClass, string> = {
  delivery: "Delivery",
  aerial_target: "Aerial target",
  defensive_marker: "Defensive marker",
  rest_defense: "Rest defence",
  blocker: "Blocker / screen",
  runner: "Runner",
  rebound: "Rebound / 2nd ball",
  counter_outlet: "Counter outlet",
  generic: "General",
};

export const BADGE_STYLES: Record<SuitabilityBadge, { label: string; bg: string; text: string; ring: string; dot: string }> = {
  best: { label: "Best fit", bg: "bg-emerald-500/15", text: "text-emerald-300", ring: "border-emerald-500/30", dot: "bg-emerald-400" },
  good: { label: "Good fit", bg: "bg-emerald-500/10", text: "text-emerald-300/90", ring: "border-emerald-500/20", dot: "bg-emerald-400/80" },
  review: { label: "Review", bg: "bg-amber-500/15", text: "text-amber-300", ring: "border-amber-500/30", dot: "bg-amber-400" },
  problem: { label: "Problem", bg: "bg-red-500/15", text: "text-red-300", ring: "border-red-500/30", dot: "bg-red-400" },
};
