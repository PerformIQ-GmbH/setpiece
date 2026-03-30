import { Group, Line, Circle, Rect, Text, Arrow } from 'react-konva';
import type { Annotation, Point } from './types';

interface AnnotationLayerProps {
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  toPixel: (pct: Point) => Point;
  pitchW: number;
  pitchH: number;
  pad: number;
}

function pctToAbsPoints(points: Point[], toPixel: (p: Point) => Point): number[] {
  const flat: number[] = [];
  for (const p of points) {
    const px = toPixel(p);
    flat.push(px.x, px.y);
  }
  return flat;
}

function getCurvePoints(points: Point[], toPixel: (p: Point) => Point): number[] {
  if (points.length < 2) return pctToAbsPoints(points, toPixel);
  const pxPts = points.map(toPixel);
  const result: number[] = [];
  for (let i = 0; i < pxPts.length; i++) {
    result.push(pxPts[i].x, pxPts[i].y);
  }
  return result;
}

export function AnnotationLayer({ annotations, selectedId, onSelect, toPixel, pitchW, pitchH, pad }: AnnotationLayerProps) {
  return (
    <Group>
      {annotations.map((ann) => {
        const isSelected = ann.id === selectedId;
        const selStroke = isSelected ? 2 : 0;

        switch (ann.type) {
          case 'run_path':
          case 'pass_line': {
            if (ann.points.length < 2) return null;
            const flatPts = pctToAbsPoints(ann.points, toPixel);
            const Component = ann.arrowhead ? Arrow : Line;
            return (
              <Group key={ann.id}>
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
                  stroke={ann.color}
                  strokeWidth={ann.strokeWidth}
                  dash={ann.dashed ? [8, 5] : undefined}
                  lineCap="round"
                  lineJoin="round"
                  pointerLength={ann.arrowhead ? 10 : undefined}
                  pointerWidth={ann.arrowhead ? 8 : undefined}
                  fill={ann.arrowhead ? ann.color : undefined}
                  opacity={0.85}
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
            const curvePts = getCurvePoints(ann.points, toPixel);
            const Component = ann.arrowhead ? Arrow : Line;
            return (
              <Group key={ann.id}>
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
                  stroke={ann.color}
                  strokeWidth={ann.strokeWidth}
                  dash={ann.dashed ? [8, 5] : undefined}
                  tension={0.4}
                  lineCap="round"
                  lineJoin="round"
                  pointerLength={ann.arrowhead ? 10 : undefined}
                  pointerWidth={ann.arrowhead ? 8 : undefined}
                  fill={ann.arrowhead ? ann.color : undefined}
                  opacity={0.85}
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
            return (
              <Group key={ann.id}>
                <Circle
                  x={center.x}
                  y={center.y}
                  radius={r}
                  fill={ann.color}
                  opacity={0.12}
                  stroke={ann.color}
                  strokeWidth={isSelected ? ann.strokeWidth + 1 : ann.strokeWidth}
                  dash={[6, 4]}
                  hitStrokeWidth={12}
                  onClick={(e) => { e.cancelBubble = true; onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; onSelect(ann.id); }}
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
            return (
              <Group key={ann.id}>
                <Rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  fill={ann.color}
                  opacity={0.1}
                  stroke={ann.color}
                  strokeWidth={isSelected ? ann.strokeWidth + 1 : ann.strokeWidth}
                  dash={[6, 4]}
                  cornerRadius={3}
                  hitStrokeWidth={12}
                  onClick={(e) => { e.cancelBubble = true; onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; onSelect(ann.id); }}
                />
              </Group>
            );
          }

          case 'label': {
            if (ann.points.length < 1) return null;
            const pos = toPixel(ann.points[0]);
            return (
              <Group key={ann.id}>
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
                  opacity={0.9}
                  hitStrokeWidth={16}
                  onClick={(e) => { e.cancelBubble = true; onSelect(ann.id); }}
                  onTap={(e) => { e.cancelBubble = true; onSelect(ann.id); }}
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
