import type { Point, EntityMarker } from './types';
import { buildPitchGeometry, type PitchGeometry } from '@/utils/pitchGeometry';

export interface MarkerRef {
  id: string;
  type: 'role' | 'entity';
  position: Point;
}

interface PitchAnchor {
  label: string;
  pos: Point;
}

/** Derive every snap target from the same metric geometry as the painted lines. */
export function buildPitchAnchors(g: PitchGeometry): PitchAnchor[] {
  const anchors: PitchAnchor[] = [];
  const add = (label: string, point: Point) => {
    const pos = g.pixelToPercent(point);
    if (!anchors.some(a => Math.abs(a.pos.x - pos.x) < 1e-6 && Math.abs(a.pos.y - pos.y) < 1e-6)) {
      anchors.push({ label, pos });
    }
  };
  const corners = (label: string, r: PitchGeometry['boundary']) => {
    add(label + ' top left', { x: r.x, y: r.y });
    add(label + ' top right', { x: r.x + r.width, y: r.y });
    add(label + ' bottom left', { x: r.x, y: r.y + r.height });
    add(label + ' bottom right', { x: r.x + r.width, y: r.y + r.height });
  };
  corners('Field', g.boundary);
  if (g.centerSpot) add('Center', g.centerSpot);
  add('Halfway left', { x: g.halfwayLine.x1, y: g.halfwayLine.y1 });
  add('Halfway right', { x: g.halfwayLine.x2, y: g.halfwayLine.y2 });
  g.penaltySpots.forEach((point, i) => add('Penalty spot ' + (i + 1), point));
  g.penaltyAreas.forEach((r, i) => corners('Penalty area ' + (i + 1), r));
  g.goalAreas.forEach((r, i) => corners('Goal area ' + (i + 1), r));
  g.goals.forEach((r, i) => {
    const y = Math.abs(r.y + r.height - g.boundary.y) < 1e-6 ? g.boundary.y : g.boundary.y + g.pitchH;
    add('Goal ' + (i + 1) + ' left post', { x: r.x, y });
    add('Goal ' + (i + 1) + ' right post', { x: r.x + r.width, y });
  });
  return anchors;
}

export const PITCH_ANCHORS = buildPitchAnchors(buildPitchGeometry({ width: 680, height: 1050 }));

const SNAP_THRESHOLD = 2.5;

export function snapPosition(
  pos: Point,
  markerPositions: Point[],
  enabled: boolean,
  excludePosition?: Point,
  anchors: PitchAnchor[] = PITCH_ANCHORS,
): Point {
  if (!enabled) return pos;

  let bestDist = SNAP_THRESHOLD;
  let snapped = pos;

  for (const anchor of anchors) {
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
