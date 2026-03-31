import { Rect, Circle, Line, Arc, Group } from 'react-konva';
import type { PitchTheme } from './types';
import { CORNER_PITCH_THEMES } from './types';

interface OffensiveCornerPitchProps {
  width: number;
  height: number;
  pad?: number;
  theme?: PitchTheme;
}

const REF_W = 654;
const REF_H = 608;

const GUIDE_DASH = [6, 4];
const CORNER_ARC_R_REF = 14;

const PEN_LEFT = 124 / REF_W;
const PEN_RIGHT = 530 / REF_W;
const PEN_TOP = 54 / REF_H;
const PEN_BOTTOM = 165 / REF_H;

const GOAL_LEFT = 239 / REF_W;
const GOAL_RIGHT = 416 / REF_W;
const GOAL_BOTTOM = 54 / REF_H;

const PEN_SPOT_X = 327 / REF_W;
const PEN_SPOT_Y = 78 / REF_H;

const MID_Y = 510 / REF_H;
const CENTER_X = 327 / REF_W;

const GUIDE_V1 = 124 / REF_W;
const GUIDE_V2 = 327 / REF_W;
const GUIDE_V3 = 529 / REF_W;
const GUIDE_H1 = 357 / REF_H;

const PEN_ARC_R = 58 / REF_H;

const CENTER_CIRCLE_R_REF = 80;

export function OffensiveCornerPitch({ width, height, pad = 0, theme = 'light' }: OffensiveCornerPitchProps) {
  const t = CORNER_PITCH_THEMES[theme];
  const pitchW = width - pad * 2;
  const pitchH = height - pad * 2;

  const sx = (pct: number) => pad + pct * pitchW;
  const sy = (pct: number) => pad + pct * pitchH;
  const sw = (pct: number) => pct * pitchW;
  const sh = (pct: number) => pct * pitchH;

  const cornerR = (CORNER_ARC_R_REF / REF_W) * pitchW;
  const centerCircleR = (CENTER_CIRCLE_R_REF / REF_W) * pitchW;
  const penArcR = sh(PEN_ARC_R);

  return (
    <Group>
      <Rect name="pitch-bg" x={0} y={0} width={width} height={height} fill={t.background} cornerRadius={6} />

      <Group listening={false}>
        <Rect x={pad} y={pad} width={pitchW} height={pitchH} fill={t.field} />

        <Rect
          x={pad} y={pad} width={pitchW} height={pitchH}
          stroke={t.lines} strokeWidth={t.lineWidth}
        />

        <Rect
          x={sx(PEN_LEFT)} y={sy(PEN_TOP)}
          width={sw(PEN_RIGHT - PEN_LEFT)} height={sh(PEN_BOTTOM - PEN_TOP)}
          stroke={t.lines} strokeWidth={t.lineWidth}
        />

        <Line points={[sx(PEN_LEFT), pad, sx(PEN_LEFT), sy(PEN_TOP)]} stroke={t.lines} strokeWidth={t.lineWidth} />
        <Line points={[sx(PEN_RIGHT), pad, sx(PEN_RIGHT), sy(PEN_TOP)]} stroke={t.lines} strokeWidth={t.lineWidth} />

        <Rect
          x={sx(GOAL_LEFT)} y={pad}
          width={sw(GOAL_RIGHT - GOAL_LEFT)} height={sh(GOAL_BOTTOM)}
          stroke={t.lines} strokeWidth={t.lineWidth}
        />

        <Circle x={sx(PEN_SPOT_X)} y={sy(PEN_SPOT_Y)} radius={3.5} fill={t.lines} />

        <Arc
          x={sx(PEN_SPOT_X)} y={sy(PEN_BOTTOM)}
          innerRadius={0} outerRadius={penArcR}
          angle={180} rotation={0}
          stroke={t.lines} strokeWidth={t.lineWidth} fill="transparent"
        />

        <Line points={[pad, sy(MID_Y), pad + pitchW, sy(MID_Y)]} stroke={t.lines} strokeWidth={t.lineWidth} />

        <Arc
          x={sx(CENTER_X)} y={sy(MID_Y)}
          innerRadius={0} outerRadius={centerCircleR}
          angle={180} rotation={0}
          stroke={t.lines} strokeWidth={t.lineWidth} fill="transparent"
        />

        <Circle x={sx(CENTER_X)} y={sy(MID_Y)} radius={3} fill={t.lines} />

        <Arc x={pad} y={pad} innerRadius={0} outerRadius={cornerR} angle={90} rotation={0} stroke={t.lines} strokeWidth={t.thinLine} fill="transparent" />
        <Arc x={pad + pitchW} y={pad} innerRadius={0} outerRadius={cornerR} angle={90} rotation={90} stroke={t.lines} strokeWidth={t.thinLine} fill="transparent" />

        <Line points={[sx(GUIDE_V1), pad, sx(GUIDE_V1), pad + pitchH]} stroke={t.guideColor} strokeWidth={0.6} dash={GUIDE_DASH} opacity={0.5} />
        <Line points={[sx(GUIDE_V2), pad, sx(GUIDE_V2), pad + pitchH]} stroke={t.guideColor} strokeWidth={0.6} dash={GUIDE_DASH} opacity={0.5} />
        <Line points={[sx(GUIDE_V3), pad, sx(GUIDE_V3), pad + pitchH]} stroke={t.guideColor} strokeWidth={0.6} dash={GUIDE_DASH} opacity={0.5} />
        <Line points={[pad, sy(GUIDE_H1), pad + pitchW, sy(GUIDE_H1)]} stroke={t.guideColor} strokeWidth={0.6} dash={GUIDE_DASH} opacity={0.5} />
      </Group>
    </Group>
  );
}
