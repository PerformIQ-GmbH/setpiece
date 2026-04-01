import type { Point, EntityMarker } from './types';

export interface MarkerRef {
  id: string;
  type: 'role' | 'entity';
  position: Point;
}

export const PITCH_ANCHORS: { label: string; pos: Point }[] = [
  { label: 'Center', pos: { x: 50, y: 50 } },
  { label: 'Penalty Spot (top)', pos: { x: 50, y: 12 } },
  { label: 'Penalty Spot (bottom)', pos: { x: 50, y: 88 } },
  { label: 'Top-Left Corner', pos: { x: 0, y: 0 } },
  { label: 'Top-Right Corner', pos: { x: 100, y: 0 } },
  { label: 'Bottom-Left Corner', pos: { x: 0, y: 100 } },
  { label: 'Bottom-Right Corner', pos: { x: 100, y: 100 } },
  { label: 'Goal Left Post (top)', pos: { x: 43.5, y: 0 } },
  { label: 'Goal Right Post (top)', pos: { x: 56.5, y: 0 } },
  { label: 'Goal Left Post (bottom)', pos: { x: 43.5, y: 100 } },
  { label: 'Goal Right Post (bottom)', pos: { x: 56.5, y: 100 } },
  { label: 'Center Left', pos: { x: 0, y: 50 } },
  { label: 'Center Right', pos: { x: 100, y: 50 } },
  { label: 'Box Top-Left (top)', pos: { x: 32, y: 0 } },
  { label: 'Box Top-Right (top)', pos: { x: 68, y: 0 } },
  { label: 'Box Bottom-Left (bottom)', pos: { x: 32, y: 100 } },
  { label: 'Box Bottom-Right (bottom)', pos: { x: 68, y: 100 } },
  { label: '6-Yard Left (top)', pos: { x: 38.5, y: 0 } },
  { label: '6-Yard Right (top)', pos: { x: 61.5, y: 0 } },
  { label: '6-Yard Left (bottom)', pos: { x: 38.5, y: 100 } },
  { label: '6-Yard Right (bottom)', pos: { x: 61.5, y: 100 } },
];

const SNAP_THRESHOLD = 2.5;

export function snapPosition(
  pos: Point,
  markerPositions: Point[],
  enabled: boolean,
  excludePosition?: Point,
): Point {
  if (!enabled) return pos;

  let bestDist = SNAP_THRESHOLD;
  let snapped = pos;

  for (const anchor of PITCH_ANCHORS) {
    const d = Math.hypot(pos.x - anchor.pos.x, pos.y - anchor.pos.y);
    if (d < bestDist) {
      bestDist = d;
      snapped = anchor.pos;
    }
  }

  for (const mp of markerPositions) {
    if (excludePosition && Math.abs(mp.x - excludePosition.x) < 0.01 && Math.abs(mp.y - excludePosition.y) < 0.01) continue;
    const d = Math.hypot(pos.x - mp.x, pos.y - mp.y);
    if (d < bestDist) {
      bestDist = d;
      snapped = mp;
    }
  }

  return snapped;
}

const MARKER_SNAP_THRESHOLD = 3.5;

export function findNearestMarker(
  pos: Point,
  markers: MarkerRef[],
): MarkerRef | null {
  let best: MarkerRef | null = null;
  let bestDist = MARKER_SNAP_THRESHOLD;

  for (const m of markers) {
    const d = Math.hypot(pos.x - m.position.x, pos.y - m.position.y);
    if (d < bestDist) {
      bestDist = d;
      best = m;
    }
  }

  return best;
}

export function buildMarkerRefs(
  roles: { id: string; startPosition?: { x?: number | null; y?: number | null } | null }[],
  entities: EntityMarker[],
): MarkerRef[] {
  const refs: MarkerRef[] = [];
  for (const r of roles) {
    refs.push({ id: r.id, type: 'role', position: { x: r.startPosition?.x ?? 50, y: r.startPosition?.y ?? 50 } });
  }
  for (const e of entities) {
    refs.push({ id: e.id, type: 'entity', position: e.position });
  }
  return refs;
}
