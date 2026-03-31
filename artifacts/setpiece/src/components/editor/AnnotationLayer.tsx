import { Group, Line, Circle, Rect, Text, Arrow } from 'react-konva';
import type Konva from 'konva';
import type { Annotation, Point } from './types';

interface AnnotationLayerProps {
  annotations: Annotation[];
  selectedId: string | null;
  focusedRoleId?: string | null;
  hasFocusedElement?: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  toPixel: (pct: Point) => Point;
  toPct: (px: Point) => Point;
  pitchW: number;
  pitchH: number;
  pad: number;
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

export function AnnotationLayer({ annotations, selectedId, focusedRoleId, hasFocusedElement, onSelect, onMove, toPixel, toPct, pitchW, pitchH, pad, readOnly, lockedTypes }: AnnotationLayerProps) {
  const isTypeLocked = (ann: Annotation): boolean => {
    if (readOnly) return true;
    if (!lockedTypes) return false;
    if (['run_path', 'curved_run', 'pass_line', 'curved_cross'].includes(ann.type)) return !!lockedTypes.actions;
    if (['zone_circle', 'zone_rect'].includes(ann.type)) return !!lockedTypes.zones;
    if (ann.type === 'label') return !!lockedTypes.labels;
    return false;
  };

  const makeDragHandlers = (ann: Annotation) => {
    if (isTypeLocked(ann)) return { draggable: false };
    let startPos = { x: 0, y: 0 };
    return {
      draggable: true,
      onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
        startPos = { x: e.target.x(), y: e.target.y() };
      },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        const endPos = { x: e.target.x(), y: e.target.y() };
        const dxPx = endPos.x - startPos.x;
        const dyPx = endPos.y - startPos.y;
        const dxPct = (dxPx / pitchW) * 100;
        const dyPct = (dyPx / pitchH) * 100;
        e.target.x(startPos.x);
        e.target.y(startPos.y);
        onMove(ann.id, dxPct, dyPct);
      },
    };
  };

  return (
    <Group>
      {annotations.map((ann) => {
        const isSelected = ann.id === selectedId;
        const isLinkedToFocused = focusedRoleId ? ann.linkedRoleId === focusedRoleId : false;
        const annOpacityScale = hasFocusedElement && !isSelected && !isLinkedToFocused ? 0.3 : isLinkedToFocused ? 1.15 : 1;
        const drag = makeDragHandlers(ann);

        const ghostColor = ann.ghost ? '#3b82f6' : ann.color;
        const ghostOpacity = ann.ghost ? 0.4 : 1;

        const isRun = ann.type === 'run_path' || ann.type === 'curved_run';
        const isPass = ann.type === 'pass_line' || ann.type === 'curved_cross';
        const effectiveDashed = isRun ? true : isPass ? false : ann.dashed;
        const effectiveArrowhead = (isRun || isPass) ? true : ann.arrowhead;

        switch (ann.type) {
          case 'run_path':
          case 'pass_line': {
            if (ann.points.length < 2) return null;
            const flatPts = pctToAbsPoints(ann.points, toPixel);
            const Component = effectiveArrowhead ? Arrow : Line;
            return (
              <Group key={ann.id} {...drag}>
                {isSelected && (
                  <Line
                    points={flatPts}
                    stroke="#ffffff"
                    strokeWidth={ann.strokeWidth + 4}
                    opacity={0.2}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
                <Component
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
                  onClick={(e) => { e.cancelBubble = true; onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; onSelect(ann.id); }}
                />
              </Group>
            );
          }

          case 'curved_run':
          case 'curved_cross': {
            if (ann.points.length < 2) return null;
            const curvePts = pctToAbsPoints(ann.points, toPixel);
            const Component = effectiveArrowhead ? Arrow : Line;
            return (
              <Group key={ann.id} {...drag}>
                {isSelected && (
                  <Line
                    points={curvePts}
                    stroke="#ffffff"
                    strokeWidth={ann.strokeWidth + 4}
                    opacity={0.2}
                    tension={0.4}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
                <Component
                  points={curvePts}
                  stroke={ghostColor}
                  strokeWidth={isLinkedToFocused ? ann.strokeWidth + 1 : ann.strokeWidth}
                  dash={effectiveDashed ? [8, 5] : undefined}
                  tension={0.4}
                  lineCap="round"
                  lineJoin="round"
                  pointerLength={effectiveArrowhead ? 10 : undefined}
                  pointerWidth={effectiveArrowhead ? 8 : undefined}
                  fill={effectiveArrowhead ? ghostColor : undefined}
                  opacity={Math.min(1, 0.85 * annOpacityScale * ghostOpacity)}
                  hitStrokeWidth={16}
                  onClick={(e) => { e.cancelBubble = true; onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; onSelect(ann.id); }}
                />
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
                <Circle
                  x={center.x}
                  y={center.y}
                  radius={r}
                  fill={ann.color}
                  opacity={0.12 * annOpacityScale}
                  stroke={ann.color}
                  strokeWidth={isSelected ? ann.strokeWidth + 1 : ann.strokeWidth}
                  dash={[6, 4]}
                  hitStrokeWidth={12}
                  draggable={!zoneLocked}
                  onClick={(e) => { e.cancelBubble = true; if (!zoneLocked) onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; if (!zoneLocked) onSelect(ann.id); }}
                  onDragEnd={zoneLocked ? undefined : (e) => {
                    const newPct = toPct({ x: e.target.x(), y: e.target.y() });
                    const dx = newPct.x - ann.points[0].x;
                    const dy = newPct.y - ann.points[0].y;
                    e.target.x(center.x);
                    e.target.y(center.y);
                    onMove(ann.id, dx, dy);
                  }}
                />
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
                <Rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  fill={ann.color}
                  opacity={0.1 * annOpacityScale}
                  stroke={ann.color}
                  strokeWidth={isSelected ? ann.strokeWidth + 1 : ann.strokeWidth}
                  dash={[6, 4]}
                  cornerRadius={3}
                  hitStrokeWidth={12}
                  draggable={!rectLocked}
                  onClick={(e) => { e.cancelBubble = true; if (!rectLocked) onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; if (!rectLocked) onSelect(ann.id); }}
                  onDragEnd={rectLocked ? undefined : (e) => {
                    const newPct = toPct({ x: e.target.x(), y: e.target.y() });
                    const origPct = toPct({ x: rx, y: ry });
                    const dx = newPct.x - origPct.x;
                    const dy = newPct.y - origPct.y;
                    e.target.x(rx);
                    e.target.y(ry);
                    onMove(ann.id, dx, dy);
                  }}
                />
              </Group>
            );
          }

          case 'label': {
            if (ann.points.length < 1) return null;
            const pos = toPixel(ann.points[0]);
            const labelLocked = isTypeLocked(ann);
            return (
              <Group key={ann.id} draggable={!labelLocked}
                onDragEnd={labelLocked ? undefined : (e) => {
                  const newPct = toPct({ x: e.target.x() + pos.x, y: e.target.y() + pos.y });
                  const dx = newPct.x - ann.points[0].x;
                  const dy = newPct.y - ann.points[0].y;
                  e.target.x(0);
                  e.target.y(0);
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
                    strokeWidth={1}
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
  toPixel: (pct: Point) => Point;
  color: string;
  strokeWidth: number;
  dashed: boolean;
  curved: boolean;
  arrowhead: boolean;
}

export function DrawingPreview({ points, toPixel, color, strokeWidth, dashed, curved, arrowhead }: DrawingPreviewProps) {
  if (points.length < 2) return null;
  const flatPts = pctToAbsPoints(points, toPixel);
  const Component = arrowhead ? Arrow : Line;
  return (
    <Component
      points={flatPts}
      stroke={color}
      strokeWidth={strokeWidth}
      dash={dashed ? [8, 5] : undefined}
      tension={curved ? 0.4 : 0}
      lineCap="round"
      lineJoin="round"
      pointerLength={arrowhead ? 10 : undefined}
      pointerWidth={arrowhead ? 8 : undefined}
      fill={arrowhead ? color : undefined}
      opacity={0.6}
    />
  );
}
