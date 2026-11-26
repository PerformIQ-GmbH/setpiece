// Turns a short description of a set piece (who runs where, where the ball goes) into the
// board format the editor and player view read. Positions are percentages of the pitch
// half: x across 68 m, y from the goal line over 52.5 m. Step i holds the positions at the
// START of step i; a run or pass drawn in step i ends where step i + 1 starts.
export type P = [number, number];

export interface BoardSpec {
  /** Step labels, e.g. ["Aufstellung", "Läufe", "Abschluss"]. */
  steps: string[];
  /** Ball start (step 0). */
  ball: P;
  /** Role (by name) runs in a step along these points, starting where the role currently stands. */
  runs?: { role: string; step: number; to: P[]; curved?: boolean }[];
  /** Ball travels in a step, starting where the ball currently is. */
  passes?: { step: number; to: P[]; curved?: boolean; label?: string }[];
  gk?: P;
  opponents?: P[];
  /** Opponent n (1-based) moves to a point in a step; no line is drawn. */
  opponentMoves?: { opponent: number; step: number; to: P }[];
  /** Replaces the start points stored with the template roles (by role name). */
  start?: Record<string, P>;
  cue?: string;
  signal?: string;
}

interface RoleIn { id: string; name: string; description?: string; coachingPoint?: string; startPosition: { x: number; y: number } }
interface Pt { x: number; y: number }

const pt = ([x, y]: P): Pt => {
  if (!(x >= 0 && x <= 100 && y >= 0 && y <= 100)) throw new Error(`Punkt ausserhalb des Felds: ${x}, ${y}`);
  return { x, y };
};
const round = (n: number) => Math.round(n * 10) / 10;

/** Catmull-Rom needs three points; give a two-point curve a visible bend. */
function bendPath(points: Pt[], bend = 5): Pt[] {
  if (points.length !== 2) return points;
  const [a, b] = points;
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  return [a, { x: round(Math.min(100, Math.max(0, (a.x + b.x) / 2 - (dy / len) * bend))), y: round(Math.min(100, Math.max(0, (a.y + b.y) / 2 + (dx / len) * bend))) }, b];
}

export function buildBoard(spec: BoardSpec, roles: RoleIn[]): Record<string, unknown> {
  const steps = spec.steps.map((label, i) => ({ id: `s${i + 1}`, label, sortOrder: i }));
  const byName = new Map(roles.map((r) => [r.name, r]));
  const where = new Map<string, Pt>(roles.map((r) => [r.id, { x: r.startPosition.x, y: r.startPosition.y }]));
  let ball = pt(spec.ball);
  const opponents = (spec.opponents ?? []).map(pt);
  const annotations: Record<string, unknown>[] = [];
  const stepPositions: Record<string, Record<string, Pt>> = {};
  const entityStepPositions: Record<string, Record<string, Pt>> = {};

  steps.forEach((step, i) => {
    stepPositions[step.id] = Object.fromEntries([...where].map(([id, p]) => [id, { ...p }]));
    entityStepPositions[step.id] = { "ball-1": { ...ball } };
    opponents.forEach((p, o) => { entityStepPositions[step.id][`opp-${o + 1}`] = { ...p }; });
    if (spec.gk) entityStepPositions[step.id]["gk-1"] = pt(spec.gk);

    for (const run of (spec.runs ?? []).filter((r) => r.step === i)) {
      const role = byName.get(run.role);
      if (!role) throw new Error(`Rolle unbekannt: ${run.role}`);
      const path = [where.get(role.id)!, ...run.to.map(pt)];
      const points = run.curved ? bendPath(path) : path;
      annotations.push({ id: `run-${annotations.length + 1}`, type: run.curved ? "curved_run" : "run_path", stepId: step.id, linkedRoleId: role.id,
        points, color: "#37d89a", strokeWidth: 3, dashed: true, arrowhead: true, layerOrder: 1 });
      where.set(role.id, path[path.length - 1]);
    }
    for (const pass of (spec.passes ?? []).filter((p) => p.step === i)) {
      const path = [ball, ...pass.to.map(pt)];
      const points = pass.curved ? bendPath(path) : path;
      annotations.push({ id: `pass-${annotations.length + 1}`, type: pass.curved ? "curved_cross" : "pass_line", stepId: step.id, snappedStartRef: "ball-1",
        points, color: "#f4f7f6", strokeWidth: 2, dashed: false, arrowhead: true, layerOrder: 2, ...(pass.label ? { label: pass.label } : {}) });
      ball = path[path.length - 1];
    }
    for (const move of (spec.opponentMoves ?? []).filter((m) => m.step === i)) {
      if (!opponents[move.opponent - 1]) throw new Error(`Gegner unbekannt: ${move.opponent}`);
      opponents[move.opponent - 1] = pt(move.to);
    }
  });

  const entities = [
    { id: "ball-1", type: "ball", position: pt(spec.ball) },
    ...(spec.gk ? [{ id: "gk-1", type: "goalkeeper", position: pt(spec.gk) }] : []),
    ...(spec.opponents ?? []).map((p, i) => ({ id: `opp-${i + 1}`, type: "opponent", position: pt(p) })),
  ];
  const variant = {
    id: "v1", name: "Standard", recognitionCue: spec.cue ?? "", teamSignal: spec.signal ?? "",
    roleTasks: Object.fromEntries(roles.map((r) => [r.id, { description: r.description ?? "", coachingPoint: r.coachingPoint ?? "" }])),
    steps, annotations, entities, stepPositions, entityStepPositions,
  };
  return { schemaVersion: 2, defaultVariantId: "v1", activeVariantId: "v1", requiredVariantIds: ["v1"], variants: [variant] };
}
