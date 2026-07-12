// Shared path math for the tactical board.
//
// Curved annotations are rendered AND animated from the same Catmull-Rom
// expansion (`expandCurve`), so the ball/players always travel exactly on the
// drawn line. Interpolation is arc-length based, so movement speed is uniform
// along the path regardless of how far apart the clicked points are.
import type { Point } from './types';

/** Expand control points into a dense Catmull-Rom polyline that passes
 *  through every control point. Returns the input untouched for < 3 points. */
export function expandCurve(points: Point[], samplesPerSeg = 16): Point[] {
  if (points.length < 3) return points;
  const P = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  const out: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let j = i === 0 ? 0 : 1; j <= samplesPerSeg; j++) {
      const t = j / samplesPerSeg;
      const t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return out;
}

/** Annotation path in travel order: curved types get the dense expansion. */
export function annotationPath(type: string, points: Point[]): Point[] {
  return type === 'curved_run' || type === 'curved_cross' ? expandCurve(points) : points;
}

const safe = (p: Point | undefined): Point => ({
  x: Number.isFinite(p?.x) ? (p as Point).x : 50,
  y: Number.isFinite(p?.y) ? (p as Point).y : 50,
});

function cumulativeLengths(path: Point[]): number[] {
  const lens = [0];
  for (let i = 1; i < path.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  }
  return lens;
}

/** Point at normalized arc-length t ∈ [0,1] along the polyline. */
export function interpolatePath(path: Point[], t: number): Point {
  if (path.length === 0) return { x: 50, y: 50 };
  if (path.length === 1 || t <= 0) return safe(path[0]);
  if (t >= 1) return safe(path[path.length - 1]);
  const lens = cumulativeLengths(path);
  const total = lens[lens.length - 1];
  if (total <= 0) return safe(path[0]);
  const target = t * total;
  let i = 1;
  while (i < lens.length - 1 && lens[i] < target) i++;
  const segLen = lens[i] - lens[i - 1];
  const segT = segLen > 0 ? (target - lens[i - 1]) / segLen : 0;
  const a = safe(path[i - 1]), b = safe(path[i]);
  return { x: a.x + (b.x - a.x) * segT, y: a.y + (b.y - a.y) * segT };
}

/** The traveled portion of a path up to normalized arc-length t (for trails). */
export function subPath(path: Point[], t: number): Point[] {
  if (path.length < 2 || t <= 0) return [];
  if (t >= 1) return path;
  const lens = cumulativeLengths(path);
  const total = lens[lens.length - 1];
  if (total <= 0) return [];
  const target = t * total;
  const out: Point[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    if (lens[i] <= target) { out.push(path[i]); continue; }
    const segLen = lens[i] - lens[i - 1];
    const segT = segLen > 0 ? (target - lens[i - 1]) / segLen : 0;
    out.push({ x: path[i - 1].x + (path[i].x - path[i - 1].x) * segT, y: path[i - 1].y + (path[i].y - path[i - 1].y) * segT });
    break;
  }
  return out;
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Distance from point p to segment ab. */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export const REDUCED_MOTION =
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
