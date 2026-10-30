import { useRef } from 'react';
import { Group, Line, Circle, Rect, Text, Arrow } from 'react-konva';
import type Konva from 'konva';
import type { Annotation, Point } from './types';
import { expandCurve } from './pathUtils';
import { useEditorStore } from './editorStore';

const snapshotForDrag = () => useEditorStore.getState().snapshotBoard();

interface AnnotationLayerProps {
  annotations: Annotation[];
  selectedId: string | null;
  focusedRoleId?: string | null;
  hasFocusedElement?: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onUpdatePoint: (id: string, pointIndex: number, newPos: Point) => void;
  onUpdateRadius?: (id: string, radius: number) => void;
  toPixel: (pct: Point) => Point;
  toPct: (px: Point) => Point;
  pitchW: number;
  pitchH: number;
  readOnly?: boolean;
  lockedTypes?: { actions?: boolean; zones?: boolean; labels?: boolean };
}

function pctToAbsPoints(points: Point[], toPixel: (p: Point) => Point): number[] {
  const flat: number[] = [];
  for (const p of points) {
    const px = toPixel(p);
    flat.push(px.x, px.y);
  }
  return flat;
}

const HANDLE_RADIUS = 7;
const HANDLE_HIT_WIDTH = 22;

function DragHandle({
  point,
  index,
  annId,
  color,
  toPixel,
  toPct,
  onUpdatePoint,
  locked,
}: {
  point: Point;
  index: number;
  annId: string;
  color: string;
  toPixel: (p: Point) => Point;
  toPct: (px: Point) => Point;
  onUpdatePoint: (id: string, pointIndex: number, newPos: Point) => void;
  locked: boolean;
}) {
  const rafRef = useRef<number>(0);
  if (locked) return null;
  const px = toPixel(point);
  return (
    <Circle
      x={px.x}
      y={px.y}
      radius={HANDLE_RADIUS}
      fill="#ffffff"
      stroke={color}
      strokeWidth={2}
      hitStrokeWidth={HANDLE_HIT_WIDTH}
      draggable
      onDragStart={snapshotForDrag}
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
        cancelAnimationFrame(rafRef.current);
        const pos = e.target.position();
        rafRef.current = requestAnimationFrame(() => {
          onUpdatePoint(annId, index, toPct(pos));
        });
      }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        cancelAnimationFrame(rafRef.current);
        const pos = e.target.position();
        onUpdatePoint(annId, index, toPct(pos));
      }}
      onClick={(e) => { e.cancelBubble = true; }}
      onTap={(e) => { e.cancelBubble = true; }}
    />
  );
}

function RadiusHandle({
  center,
  radiusPct,
  annId,
  color,
  toPixel,
  pitchW,
  pitchH,
  onUpdateRadius,
  locked,
}: {
  center: Point;
  radiusPct: number;
  annId: string;
  color: string;
  toPixel: (p: Point) => Point;
  pitchW: number;
  pitchH: number;
  onUpdateRadius: (id: string, radius: number) => void;
  locked: boolean;
}) {
  const rafRef = useRef<number>(0);
  if (locked) return null;
  const minDim = Math.min(pitchW, pitchH);
  const rPx = (radiusPct / 100) * minDim;
  const centerPx = toPixel(center);
  const edgePx = { x: centerPx.x + rPx, y: centerPx.y };

  const computeRadius = (ex: number, ey: number) => {
    const dx = ex - centerPx.x;
    const dy = ey - centerPx.y;
    return (Math.sqrt(dx * dx + dy * dy) / minDim) * 100;
  };

  return (
    <Circle
      x={edgePx.x}
      y={edgePx.y}
      radius={HANDLE_RADIUS}
      fill="#ffffff"
      stroke={color}
      strokeWidth={2}
      hitStrokeWidth={HANDLE_HIT_WIDTH}
      draggable
      onDragStart={snapshotForDrag}
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
        cancelAnimationFrame(rafRef.current);
        const ex = e.target.x();
        const ey = e.target.y();
        rafRef.current = requestAnimationFrame(() => {
          onUpdateRadius(annId, computeRadius(ex, ey));
        });
      }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        cancelAnimationFrame(rafRef.current);
        onUpdateRadius(annId, computeRadius(e.target.x(), e.target.y()));
      }}
      onClick={(e) => { e.cancelBubble = true; }}
      onTap={(e) => { e.cancelBubble = true; }}
    />
  );
}

export function AnnotationLayer({ annotations, selectedId, focusedRoleId, hasFocusedElement, onSelect, onMove, onUpdatePoint, onUpdateRadius, toPixel, toPct, pitchW, pitchH, readOnly, lockedTypes }: AnnotationLayerProps) {
  const isTypeLocked = (ann: Annotation): boolean => {
    if (readOnly) return true;
    if (!lockedTypes) return false;
    if (['run_path', 'curved_run', 'pass_line', 'curved_cross'].includes(ann.type)) return !!lockedTypes.actions;
    if (['zone_circle', 'zone_rect'].includes(ann.type)) return !!lockedTypes.zones;
    if (ann.type === 'label') return !!lockedTypes.labels;
    return false;
  };

  const makeShapeDragEnd = (ann: Annotation) => {
    if (isTypeLocked(ann)) return undefined;
    return (e: Konva.KonvaEventObject<DragEvent>) => {
      const dx = e.target.x();
      const dy = e.target.y();
      // The node keeps its drag offset (its x/y props don't change), so reset
      // it — the movement is applied to the annotation's points instead.
      // Without this the shape moves twice the drag distance.
      e.target.position({ x: 0, y: 0 });
      const dxPct = (dx / pitchW) * 100;
      const dyPct = (dy / pitchH) * 100;
      onMove(ann.id, dxPct, dyPct);
    };
  };

  const zoneTypes = new Set(['zone_circle', 'zone_rect']);
  const zones = annotations.filter(a => zoneTypes.has(a.type));
  const nonZones = annotations.filter(a => !zoneTypes.has(a.type));
  const orderedAnnotations = [...zones, ...nonZones];

  return (
    <Group>
      {orderedAnnotations.map((ann) => {
        const isSelected = ann.id === selectedId;
        const isLinkedToFocused = focusedRoleId ? ann.linkedRoleId === focusedRoleId : false;
        const dimForSelection = selectedId && !isSelected ? 0.3 : 1;
        const dimForFocus = hasFocusedElement && !isSelected && !isLinkedToFocused ? 0.3 : isLinkedToFocused ? 1.15 : 1;
        const annOpacityScale = Math.min(dimForSelection, dimForFocus);
        const shapeDragEnd = makeShapeDragEnd(ann);

        const ghostColor = ann.ghost ? '#3b82f6' : ann.color;
        const ghostOpacity = ann.ghost ? 0.4 : 1;

        const isRun = ann.type === 'run_path' || ann.type === 'curved_run';
        const isPass = ann.type === 'pass_line' || ann.type === 'curved_cross';
        const effectiveDashed = isRun ? true : isPass ? false : ann.dashed;
        const effectiveArrowhead = (isRun || isPass) ? true : ann.arrowhead;

        const locked = isTypeLocked(ann);

        switch (ann.type) {
          case 'run_path':
          case 'pass_line': {
            if (ann.points.length < 2) return null;
            const flatPts = pctToAbsPoints(ann.points, toPixel);
            const Component = effectiveArrowhead ? Arrow : Line;
            return (
              <Group key={ann.id}>
                {isSelected && (
                  <Line
                    points={flatPts}
                    stroke="#ffffff"
                    strokeWidth={ann.strokeWidth + 4}
                    opacity={0.25}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
                <Component
                  x={0}
                  y={0}
                  points={flatPts}
                  stroke={ghostColor}
                  strokeWidth={isLinkedToFocused ? ann.strokeWidth + 1 : ann.strokeWidth}
                  dash={effectiveDashed ? [8, 5] : undefined}
                  lineCap="round"
                  lineJoin="round"
                  pointerLength={effectiveArrowhead ? 10 : undefined}
                  pointerWidth={effectiveArrowhead ? 8 : undefined}
                  fill={effectiveArrowhead ? ghostColor : undefined}
                  opacity={Math.min(1, 0.85 * annOpacityScale * ghostOpacity)}
                  hitStrokeWidth={16}
                  draggable={!locked && !isSelected}
                  onDragStart={snapshotForDrag}
                  onDragEnd={shapeDragEnd}
                  onClick={(e) => { e.cancelBubble = true; if (!locked) onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; if (!locked) onSelect(ann.id); }}
                />
                {isSelected && ann.points.map((pt, i) => (
                  <DragHandle
                    key={`handle-${ann.id}-${i}`}
                    point={pt}
                    index={i}
                    annId={ann.id}
                    color={ann.color}
                    toPixel={toPixel}
                    toPct={toPct}
                    onUpdatePoint={onUpdatePoint}
                    locked={locked}
                  />
                ))}
              </Group>
            );
          }

          case 'curved_run':
          case 'curved_cross': {
            if (ann.points.length < 2) return null;
            // Render from the same Catmull-Rom expansion the animation travels
            // on, so the ball/players never leave the drawn line.
            const curvePts = pctToAbsPoints(expandCurve(ann.points), toPixel);
            const Component = effectiveArrowhead ? Arrow : Line;
            return (
              <Group key={ann.id}>
                {isSelected && (
                  <Line
                    points={curvePts}
                    stroke="#ffffff"
                    strokeWidth={ann.strokeWidth + 4}
                    opacity={0.25}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
                <Component
                  x={0}
                  y={0}
                  points={curvePts}
                  stroke={ghostColor}
                  strokeWidth={isLinkedToFocused ? ann.strokeWidth + 1 : ann.strokeWidth}
                  dash={effectiveDashed ? [8, 5] : undefined}
                  lineCap="round"
                  lineJoin="round"
                  pointerLength={effectiveArrowhead ? 10 : undefined}
                  pointerWidth={effectiveArrowhead ? 8 : undefined}
                  fill={effectiveArrowhead ? ghostColor : undefined}
                  opacity={Math.min(1, 0.85 * annOpacityScale * ghostOpacity)}
                  hitStrokeWidth={16}
                  draggable={!locked && !isSelected}
                  onDragStart={snapshotForDrag}
                  onDragEnd={shapeDragEnd}
                  onClick={(e) => { e.cancelBubble = true; if (!locked) onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; if (!locked) onSelect(ann.id); }}
                />
                {isSelected && ann.points.map((pt, i) => (
                  <DragHandle
                    key={`handle-${ann.id}-${i}`}
                    point={pt}
                    index={i}
                    annId={ann.id}
                    color={ann.color}
                    toPixel={toPixel}
                    toPct={toPct}
                    onUpdatePoint={onUpdatePoint}
                    locked={locked}
                  />
                ))}
              </Group>
            );
          }

          case 'zone_circle': {
            if (ann.points.length < 1) return null;
            const center = toPixel(ann.points[0]);
            const r = (ann.radius ?? 10) / 100 * Math.min(pitchW, pitchH);
            const zoneLocked = isTypeLocked(ann);
            return (
              <Group key={ann.id}>
                {isSelected && (
                  <Circle
                    x={center.x}
                    y={center.y}
                    radius={r + 3}
                    stroke="#ffffff"
                    strokeWidth={2}
                    opacity={0.3}
                    dash={[4, 4]}
                  />
                )}
                <Circle
                  x={center.x}
                  y={center.y}
                  radius={r}
                  fill={ann.color}
                  opacity={0.25 * annOpacityScale}
                  stroke={ann.color}
                  strokeWidth={isSelected ? ann.strokeWidth + 1.5 : ann.strokeWidth + 0.5}
                  dash={[6, 4]}
                  hitStrokeWidth={12}
                  draggable={!zoneLocked}
                  onDragStart={zoneLocked ? undefined : snapshotForDrag}
                  onClick={(e) => { e.cancelBubble = true; if (!zoneLocked) onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; if (!zoneLocked) onSelect(ann.id); }}
                  onDragEnd={zoneLocked ? undefined : (e) => {
                    const newPct = toPct({ x: e.target.x(), y: e.target.y() });
                    const dx = newPct.x - ann.points[0].x;
                    const dy = newPct.y - ann.points[0].y;
                    onMove(ann.id, dx, dy);
                  }}
                />
                {isSelected && (
                  <DragHandle
                    point={ann.points[0]}
                    index={0}
                    annId={ann.id}
                    color={ann.color}
                    toPixel={toPixel}
                    toPct={toPct}
                    onUpdatePoint={onUpdatePoint}
                    locked={zoneLocked}
                  />
                )}
                {isSelected && onUpdateRadius && (
                  <RadiusHandle
                    center={ann.points[0]}
                    radiusPct={ann.radius ?? 10}
                    annId={ann.id}
                    color={ann.color}
                    toPixel={toPixel}
                    pitchW={pitchW}
                    pitchH={pitchH}
                    onUpdateRadius={onUpdateRadius}
                    locked={zoneLocked}
                  />
                )}
              </Group>
            );
          }

          case 'zone_rect': {
            if (ann.points.length < 2) return null;
            const p1 = toPixel(ann.points[0]);
            const p2 = toPixel(ann.points[1]);
            const rx = Math.min(p1.x, p2.x);
            const ry = Math.min(p1.y, p2.y);
            const rw = Math.abs(p2.x - p1.x);
            const rh = Math.abs(p2.y - p1.y);
            const rectLocked = isTypeLocked(ann);
            return (
              <Group key={ann.id}>
                {isSelected && (
                  <Rect
                    x={rx - 2}
                    y={ry - 2}
                    width={rw + 4}
                    height={rh + 4}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    opacity={0.3}
                    dash={[4, 4]}
                    cornerRadius={3}
                  />
                )}
                <Rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  fill={ann.color}
                  opacity={0.22 * annOpacityScale}
                  stroke={ann.color}
                  strokeWidth={isSelected ? ann.strokeWidth + 1.5 : ann.strokeWidth + 0.5}
                  dash={[6, 4]}
                  cornerRadius={3}
                  hitStrokeWidth={12}
                  draggable={!rectLocked}
                  onDragStart={rectLocked ? undefined : snapshotForDrag}
                  onClick={(e) => { e.cancelBubble = true; if (!rectLocked) onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; if (!rectLocked) onSelect(ann.id); }}
                  onDragEnd={rectLocked ? undefined : (e) => {
                    const newPct = toPct({ x: e.target.x(), y: e.target.y() });
                    const origPct = toPct({ x: rx, y: ry });
                    const dx = newPct.x - origPct.x;
                    const dy = newPct.y - origPct.y;
                    onMove(ann.id, dx, dy);
                  }}
                />
                {isSelected && ann.points.map((pt, i) => (
                  <DragHandle
                    key={`handle-${ann.id}-${i}`}
                    point={pt}
                    index={i}
                    annId={ann.id}
                    color={ann.color}
                    toPixel={toPixel}
                    toPct={toPct}
                    onUpdatePoint={onUpdatePoint}
                    locked={rectLocked}
                  />
                ))}
              </Group>
            );
          }

          case 'label': {
            if (ann.points.length < 1) return null;
            const pos = toPixel(ann.points[0]);
            const labelLocked = isTypeLocked(ann);
            return (
              <Group key={ann.id} x={0} y={0} draggable={!labelLocked}
                onDragStart={labelLocked ? undefined : snapshotForDrag}
                onDragEnd={labelLocked ? undefined : (e) => {
                  const newPct = toPct({ x: e.target.x() + pos.x, y: e.target.y() + pos.y });
                  // Reset the group's drag offset — the movement is applied to
                  // the annotation point; leaving it doubles the shift.
                  e.target.position({ x: 0, y: 0 });
                  const dx = newPct.x - ann.points[0].x;
                  const dy = newPct.y - ann.points[0].y;
                  onMove(ann.id, dx, dy);
                }}
              >
                {isSelected && (
                  <Rect
                    x={pos.x - 4}
                    y={pos.y - 4}
                    width={(ann.label?.length ?? 4) * 8 + 8}
                    height={22}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    opacity={0.4}
                    cornerRadius={3}
                    dash={[3, 3]}
                  />
                )}
                <Text
                  x={pos.x}
                  y={pos.y}
                  text={ann.label || 'Label'}
                  fontSize={13}
                  fontFamily="Inter, sans-serif"
                  fontStyle="bold"
                  fill={ann.color}
                  opacity={Math.min(1, 0.9 * annOpacityScale)}
                  hitStrokeWidth={16}
                  onClick={(e) => { e.cancelBubble = true; if (!labelLocked) onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; if (!labelLocked) onSelect(ann.id); }}
                />
                {isSelected && (
                  <DragHandle
                    point={ann.points[0]}
                    index={0}
                    annId={ann.id}
                    color={ann.color}
                    toPixel={toPixel}
                    toPct={toPct}
                    onUpdatePoint={onUpdatePoint}
                    locked={labelLocked}
                  />
                )}
              </Group>
            );
          }

          default:
            return null;
        }
      })}
    </Group>
  );
}

interface DrawingPreviewProps {
  points: Point[];
  cursorPoint?: Point | null;
  toPixel: (pct: Point) => Point;
  color: string;
  strokeWidth: number;
  dashed: boolean;
  curved: boolean;
  arrowhead: boolean;
}

export function DrawingPreview({ points, cursorPoint, toPixel, color, strokeWidth, dashed, curved, arrowhead }: DrawingPreviewProps) {
  const previewPoints = cursorPoint && points.length >= 1
    ? [...points, cursorPoint]
    : points;
  if (previewPoints.length < 2) return null;
  const flatPts = pctToAbsPoints(curved ? expandCurve(previewPoints) : previewPoints, toPixel);
  const Component = arrowhead ? Arrow : Line;
  return (
    <Component
      points={flatPts}
      stroke={color}
      strokeWidth={strokeWidth}
      dash={dashed ? [8, 5] : undefined}
      lineCap="round"
      lineJoin="round"
      pointerLength={arrowhead ? 10 : undefined}
      pointerWidth={arrowhead ? 8 : undefined}
      fill={arrowhead ? color : undefined}
      opacity={0.6}
    />
  );
}
