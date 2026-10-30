import { Rect, Circle, Line, Group, Text } from 'react-konva';
import type { PitchTheme } from './types';
import { PITCH_THEMES } from './types';
import { arcToPoints, buildPitchGeometry } from '@/utils/pitchGeometry';

interface PremiumPitchProps {
  width: number;
  height: number;
  halfPitch?: boolean;
  pad?: number;
  theme?: PitchTheme;
}

export function PremiumPitch({ width, height, halfPitch, pad = 24, theme = 'dark' }: PremiumPitchProps) {
  const t = PITCH_THEMES[theme];
  const g = buildPitchGeometry({
    width,
    height,
    pad,
    orientation: halfPitch ? 'half' : 'full',
  });

  // Goal lines are already painted by the boundary; keep box outlines open there.
  const areaOutline = (r: typeof g.boundary) => Math.abs(r.y - g.boundary.y) < 1e-6
    ? [r.x, r.y, r.x, r.y + r.height, r.x + r.width, r.y + r.height, r.x + r.width, r.y]
    : [r.x, r.y + r.height, r.x, r.y, r.x + r.width, r.y, r.x + r.width, r.y + r.height];
  const goalOutline = (r: typeof g.boundary) => Math.abs(r.y + r.height - g.boundary.y) < 1e-6
    ? [r.x, r.y + r.height, r.x, r.y, r.x + r.width, r.y, r.x + r.width, r.y + r.height]
    : [r.x, r.y, r.x, r.y + r.height, r.x + r.width, r.y + r.height, r.x + r.width, r.y];

  const stripeCount = 12;
  const stripeH = g.pitchH / stripeCount;

  return (
    <Group>
      <Rect name="pitch-bg" x={0} y={0} width={width} height={height} fill={t.background} cornerRadius={10} />

      <Group listening={false}>
        <Rect x={g.boundary.x} y={g.boundary.y} width={g.boundary.width} height={g.boundary.height} fill={t.field} />

        {Array.from({ length: stripeCount }).map((_, i) => (
          i % 2 === 0 ? (
            <Rect
              key={`stripe-${i}`}
              x={g.boundary.x}
              y={g.boundary.y + i * stripeH}
              width={g.boundary.width}
              height={stripeH}
              fill={theme === 'light' ? '#000000' : '#ffffff'}
              opacity={t.stripeAlpha}
            />
          ) : null
        ))}

        {/* Stadium lighting: brighter center falling into a soft vignette. */}
        <Rect
          x={g.boundary.x}
          y={g.boundary.y}
          width={g.boundary.width}
          height={g.boundary.height}
          fillRadialGradientStartPoint={{ x: g.boundary.width / 2, y: g.boundary.height / 2 }}
          fillRadialGradientEndPoint={{ x: g.boundary.width / 2, y: g.boundary.height / 2 }}
          fillRadialGradientStartRadius={0}
          fillRadialGradientEndRadius={Math.max(g.boundary.width, g.boundary.height) * 0.72}
          fillRadialGradientColorStops={
            theme === 'light'
              ? [0, 'rgba(255,255,255,0.35)', 0.65, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.05)']
              : [0, 'rgba(255,255,255,0.06)', 0.6, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.22)']
          }
        />

        <Rect x={g.boundary.x} y={g.boundary.y} width={g.boundary.width} height={g.boundary.height} stroke={t.lines} strokeWidth={2} opacity={t.lineAlpha} />

        {g.orientation === 'full' && (
          <Line points={[g.halfwayLine.x1, g.halfwayLine.y1, g.halfwayLine.x2, g.halfwayLine.y2]} stroke={t.lines} strokeWidth={2} opacity={t.lineAlpha} />
        )}

        {g.centerArcs.map((arc, i) => (
          <Line key={`center-arc-${i}`} points={arcToPoints(arc)} stroke={t.lines} strokeWidth={2} opacity={t.lineAlpha} />
        ))}
        {g.centerCircle && (
          <Circle x={g.centerCircle.x} y={g.centerCircle.y} radius={g.centerCircle.radius} stroke={t.lines} strokeWidth={2} opacity={t.lineAlpha} />
        )}
        {g.centerSpot && (
          <Circle x={g.centerSpot.x} y={g.centerSpot.y} radius={4} fill={t.lines} opacity={t.lineAlpha * 0.8} />
        )}

        {g.penaltyAreas.map((r, i) => (
          <Line key={`pa-${i}`} points={areaOutline(r)} stroke={t.lines} strokeWidth={2} opacity={t.lineAlpha} />
        ))}
        {g.goalAreas.map((r, i) => (
          <Line key={`ga-${i}`} points={areaOutline(r)} stroke={t.lines} strokeWidth={2} opacity={t.lineAlpha} />
        ))}
        {g.goals.map((r, i) => (
          <Group key={`goal-${i}`}>
            <Rect x={r.x} y={r.y} width={r.width} height={r.height} fill={t.lines} opacity={t.lineAlpha * 0.18} />
            <Line points={goalOutline(r)} stroke={t.lines} strokeWidth={2} opacity={t.lineAlpha} />
            {/* Net */}
            {Array.from({ length: 5 }, (_, n) => (
              <Line
                key={`net-v-${n}`}
                points={[r.x + ((n + 1) * r.width) / 6, r.y, r.x + ((n + 1) * r.width) / 6, r.y + r.height]}
                stroke={t.lines}
                strokeWidth={0.5}
                opacity={t.lineAlpha * 0.4}
              />
            ))}
            <Line
              points={[r.x, r.y + r.height / 2, r.x + r.width, r.y + r.height / 2]}
              stroke={t.lines}
              strokeWidth={0.5}
              opacity={t.lineAlpha * 0.4}
            />
          </Group>
        ))}
        {g.penaltySpots.map((p, i) => (
          <Circle key={`ps-${i}`} x={p.x} y={p.y} radius={3} fill={t.lines} opacity={t.lineAlpha * 0.8} />
        ))}
        {g.penaltyArcs.map((a, i) => (
          <Line key={`par-${i}`} points={arcToPoints(a)} stroke={t.lines} strokeWidth={2} opacity={t.lineAlpha} lineCap="round" lineJoin="round" />
        ))}
        {g.cornerArcs.map((a, i) => (
          <Line key={`ca-${i}`} points={arcToPoints(a)} stroke={t.lines} strokeWidth={2} opacity={t.lineAlpha} lineCap="round" lineJoin="round" />
        ))}

        <Text
          text="SETPIECE"
          fontSize={Math.min(g.pitchW * 0.06, 14)}
          fontFamily="Inter, sans-serif"
          fill={t.watermark}
          opacity={t.watermarkAlpha}
          x={g.boundary.x}
          width={g.boundary.width}
          align="center"
          y={halfPitch ? g.boundary.y + g.pitchH * 0.85 : height / 2}
          letterSpacing={6}
          fontStyle="bold"
        />
      </Group>
    </Group>
  );
}
