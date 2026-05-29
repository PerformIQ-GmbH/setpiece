import { Rect, Circle, Line, Arc, Group } from 'react-konva';
import type { PitchTheme } from './types';
import { CORNER_PITCH_THEMES } from './types';
import { arcToKonva, buildPitchGeometry } from '@/utils/pitchGeometry';

interface OffensiveCornerPitchProps {
  width: number;
  height: number;
  pad?: number;
  theme?: PitchTheme;
}

const GUIDE_DASH = [6, 4];

export function OffensiveCornerPitch({ width, height, pad = 0, theme = 'light' }: OffensiveCornerPitchProps) {
  const t = CORNER_PITCH_THEMES[theme];
  const g = buildPitchGeometry({ width, height, pad, orientation: 'half' });

  return (
    <Group>
      <Rect name="pitch-bg" x={0} y={0} width={width} height={height} fill={t.background} cornerRadius={6} />

      <Group listening={false}>
        <Rect x={g.boundary.x} y={g.boundary.y} width={g.boundary.width} height={g.boundary.height} fill={t.field} />

        <Rect x={g.boundary.x} y={g.boundary.y} width={g.boundary.width} height={g.boundary.height} stroke={t.lines} strokeWidth={t.lineWidth} />

        {g.penaltyAreas.map((r, i) => (
          <Rect key={`pa-${i}`} x={r.x} y={r.y} width={r.width} height={r.height} stroke={t.lines} strokeWidth={t.lineWidth} />
        ))}
        {g.goalAreas.map((r, i) => (
          <Rect key={`ga-${i}`} x={r.x} y={r.y} width={r.width} height={r.height} stroke={t.lines} strokeWidth={t.lineWidth} />
        ))}
        {g.penaltySpots.map((p, i) => (
          <Circle key={`ps-${i}`} x={p.x} y={p.y} radius={3.5} fill={t.lines} />
        ))}
        {g.penaltyArcs.map((a, i) => {
          const k = arcToKonva(a);
          return <Arc key={`par-${i}`} x={k.x} y={k.y} innerRadius={k.innerRadius} outerRadius={k.outerRadius} angle={k.angle} rotation={k.rotation} stroke={t.lines} strokeWidth={t.lineWidth} fill="transparent" />;
        })}

        <Line points={[g.halfwayLine.x1, g.halfwayLine.y1, g.halfwayLine.x2, g.halfwayLine.y2]} stroke={t.lines} strokeWidth={t.lineWidth} dash={[12, 6]} />

        {g.cornerArcs.map((a, i) => {
          const k = arcToKonva(a);
          return <Arc key={`ca-${i}`} x={k.x} y={k.y} innerRadius={k.innerRadius} outerRadius={k.outerRadius} angle={k.angle} rotation={k.rotation} stroke={t.lines} strokeWidth={t.thinLine} fill="transparent" />;
        })}

        {g.guides.vertical.map((x, i) => (
          <Line key={`gv-${i}`} points={[x, g.boundary.y, x, g.boundary.y + g.pitchH]} stroke={t.guideColor} strokeWidth={0.6} dash={GUIDE_DASH} opacity={0.5} />
        ))}
        {g.guides.horizontal.map((y, i) => (
          <Line key={`gh-${i}`} points={[g.boundary.x, y, g.boundary.x + g.pitchW, y]} stroke={t.guideColor} strokeWidth={0.6} dash={GUIDE_DASH} opacity={0.5} />
        ))}
      </Group>
    </Group>
  );
}
