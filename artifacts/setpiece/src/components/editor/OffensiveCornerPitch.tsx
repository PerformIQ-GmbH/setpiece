import { Rect, Circle, Line, Group } from 'react-konva';
import type { PitchTheme } from './types';
import { CORNER_PITCH_THEMES } from './types';
import { arcToPoints, buildPitchGeometry } from '@/utils/pitchGeometry';

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

  const areaOutline = (r: typeof g.boundary) => [r.x, r.y, r.x, r.y + r.height, r.x + r.width, r.y + r.height, r.x + r.width, r.y];

  const goalOutline = (r: typeof g.boundary) => Math.abs(r.y + r.height - g.boundary.y) < 1e-6
    ? [r.x, r.y + r.height, r.x, r.y, r.x + r.width, r.y, r.x + r.width, r.y + r.height]
    : [r.x, r.y, r.x, r.y + r.height, r.x + r.width, r.y + r.height, r.x + r.width, r.y];

  return (
    <Group>
      <Rect name="pitch-bg" x={0} y={0} width={width} height={height} fill={t.background} cornerRadius={6} />

      <Group listening={false}>
        <Rect x={g.boundary.x} y={g.boundary.y} width={g.boundary.width} height={g.boundary.height} fill={t.field} />

        <Rect x={g.boundary.x} y={g.boundary.y} width={g.boundary.width} height={g.boundary.height} stroke={t.lines} strokeWidth={2} />

        {g.penaltyAreas.map((r, i) => (
          <Line key={`pa-${i}`} points={areaOutline(r)} stroke={t.lines} strokeWidth={2} />
        ))}
        {g.goalAreas.map((r, i) => (
          <Line key={`ga-${i}`} points={areaOutline(r)} stroke={t.lines} strokeWidth={2} />
        ))}
        {g.goals.map((r, i) => (
          <Group key={`goal-${i}`}>
            <Rect x={r.x} y={r.y} width={r.width} height={r.height} fill={t.lines} opacity={0.35} />
            <Line points={goalOutline(r)} stroke={t.lines} strokeWidth={2} />
          </Group>
        ))}
        {g.penaltySpots.map((p, i) => (
          <Circle key={`ps-${i}`} x={p.x} y={p.y} radius={3.5} fill={t.lines} />
        ))}
        {g.penaltyArcs.map((a, i) => (
          <Line key={`par-${i}`} points={arcToPoints(a)} stroke={t.lines} strokeWidth={2} lineCap="round" lineJoin="round" />
        ))}

        {g.centerArcs.map((arc, i) => (
          <Line key={`center-arc-${i}`} points={arcToPoints(arc)} stroke={t.lines} strokeWidth={2} />
        ))}
        {g.centerSpot && <Circle x={g.centerSpot.x} y={g.centerSpot.y} radius={3.5} fill={t.lines} />}

        {g.cornerArcs.map((a, i) => (
          <Line key={`ca-${i}`} points={arcToPoints(a)} stroke={t.lines} strokeWidth={2} lineCap="round" lineJoin="round" />
        ))}

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
