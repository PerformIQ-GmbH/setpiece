import { Rect, Circle, Line, Arc, Group, Text } from 'react-konva';
import type { PitchTheme } from './types';
import { PITCH_THEMES } from './types';
import { arcToKonva, buildPitchGeometry } from '@/utils/pitchGeometry';

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

  const stripeCount = 12;
  const stripeH = g.pitchH / stripeCount;

  return (
    <Group>
      <Rect name="pitch-bg" x={0} y={0} width={width} height={height} fill={t.background} cornerRadius={10} />

      <Group listening={false}>
        <Rect x={g.boundary.x} y={g.boundary.y} width={g.boundary.width} height={g.boundary.height} fill={t.field} cornerRadius={4} />

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

        <Rect x={g.boundary.x} y={g.boundary.y} width={g.boundary.width} height={g.boundary.height} stroke={t.lines} strokeWidth={2} opacity={t.lineAlpha} cornerRadius={2} />

        {g.isHalfwayDashed ? (
          <Line points={[g.halfwayLine.x1, g.halfwayLine.y1, g.halfwayLine.x2, g.halfwayLine.y2]} stroke={t.lines} strokeWidth={2} opacity={t.lineAlpha * 0.6} dash={[10, 5]} />
        ) : (
          <Line points={[g.halfwayLine.x1, g.halfwayLine.y1, g.halfwayLine.x2, g.halfwayLine.y2]} stroke={t.lines} strokeWidth={1.5} opacity={t.lineAlpha} />
        )}

        {g.centerCircle && (
          <Circle x={g.centerCircle.x} y={g.centerCircle.y} radius={g.centerCircle.radius} stroke={t.lines} strokeWidth={1.5} opacity={t.lineAlpha} />
        )}
        {g.centerSpot && (
          <Circle x={g.centerSpot.x} y={g.centerSpot.y} radius={4} fill={t.lines} opacity={t.lineAlpha * 0.8} />
        )}

        {g.penaltyAreas.map((r, i) => (
          <Rect key={`pa-${i}`} x={r.x} y={r.y} width={r.width} height={r.height} stroke={t.lines} strokeWidth={1.5} opacity={t.lineAlpha} />
        ))}
        {g.goalAreas.map((r, i) => (
          <Rect key={`ga-${i}`} x={r.x} y={r.y} width={r.width} height={r.height} stroke={t.lines} strokeWidth={1.5} opacity={t.lineAlpha} />
        ))}
        {g.penaltySpots.map((p, i) => (
          <Circle key={`ps-${i}`} x={p.x} y={p.y} radius={3} fill={t.lines} opacity={t.lineAlpha * 0.8} />
        ))}
        {g.penaltyArcs.map((a, i) => {
          const k = arcToKonva(a);
          return <Arc key={`par-${i}`} x={k.x} y={k.y} innerRadius={k.innerRadius} outerRadius={k.outerRadius} angle={k.angle} rotation={k.rotation} stroke={t.lines} strokeWidth={1.5} opacity={t.lineAlpha} fill="transparent" />;
        })}
        {g.cornerArcs.map((a, i) => {
          const k = arcToKonva(a);
          return <Arc key={`ca-${i}`} x={k.x} y={k.y} innerRadius={k.innerRadius} outerRadius={k.outerRadius} angle={k.angle} rotation={k.rotation} stroke={t.lines} strokeWidth={1.2} opacity={t.lineAlpha} fill="transparent" />;
        })}

        <Text
          text="SETPIECE"
          fontSize={Math.min(g.pitchW * 0.06, 14)}
          fontFamily="Inter, sans-serif"
          fill={t.watermark}
          opacity={t.watermarkAlpha}
          x={width / 2}
          y={halfPitch ? g.boundary.y + g.pitchH * 0.85 : height / 2}
          offsetX={g.pitchW * 0.03 * 4}
          letterSpacing={6}
          fontStyle="bold"
        />
      </Group>
    </Group>
  );
}
