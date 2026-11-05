import type { Annotation, Point } from './types';

interface DrawingMarker {
  id: string;
  type: 'role' | 'entity';
  position: Point;
}

/** Snap is an explicit editing preference, including when a line is completed. */
export function finalizeDrawingPoints(points: Point[], markers: DrawingMarker[], snapEnabled: boolean, isRun: boolean) {
  const result: {
    points: Point[];
    snappedStartRef?: string;
    snappedEndRef?: string;
    linkedRoleId?: string;
  } = { points: points.map(point => ({ ...point })) };
  if (!snapEnabled || points.length < 2) return result;
  const nearest = (point: Point) => {
    let found: DrawingMarker | undefined;
    let distance = 3.5;
    for (const marker of markers) {
      const next = Math.hypot(point.x - marker.position.x, point.y - marker.position.y);
      if (next < distance) { found = marker; distance = next; }
    }
    return found;
  };
  const start = nearest(points[0]);
  const end = nearest(points[points.length - 1]);
  if (start) {
    result.points[0] = { ...start.position };
    result.snappedStartRef = start.id;
    if (isRun && start.type === 'role') result.linkedRoleId = start.id;
  }
  if (end) {
    result.points[result.points.length - 1] = { ...end.position };
    result.snappedEndRef = end.id;
  }
  return result;
}

/** A free sketch never assigns a movement to a player by array order. */
export function findRoleRun(roleId: string, annotations: Annotation[]): Annotation | undefined {
  return annotations.find(annotation => annotation.linkedRoleId === roleId &&
    (annotation.type === 'run_path' || annotation.type === 'curved_run') && annotation.points.length >= 2);
}

export function moveAnnotationGeometry(annotation: Annotation, dx: number, dy: number): Annotation {
  if (!annotation.points.length || (dx === 0 && dy === 0)) return annotation;
  // Clamp the translation once, so moving near an edge preserves its shape.
  const xs = annotation.points.map(point => point.x);
  const ys = annotation.points.map(point => point.y);
  const x = Math.max(-Math.min(...xs), Math.min(100 - Math.max(...xs), dx));
  const y = Math.max(-Math.min(...ys), Math.min(100 - Math.max(...ys), dy));
  return { ...annotation, snappedStartRef: undefined, snappedEndRef: undefined,
    points: annotation.points.map(point => ({ x: point.x + x, y: point.y + y })) };
}

export function updateAnnotationEndpoint(annotation: Annotation, index: number, position: Point): Annotation {
  if (index < 0 || index >= annotation.points.length) return annotation;
  const points = [...annotation.points];
  points[index] = { x: Math.max(0, Math.min(100, position.x)), y: Math.max(0, Math.min(100, position.y)) };
  return { ...annotation, points,
    snappedStartRef: index === 0 ? undefined : annotation.snappedStartRef,
    snappedEndRef: index === points.length - 1 ? undefined : annotation.snappedEndRef };
}
