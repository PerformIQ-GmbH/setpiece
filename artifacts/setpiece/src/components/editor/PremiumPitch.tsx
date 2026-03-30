import { Rect, Circle, Line, Arc, Group, Text } from 'react-konva';

interface PremiumPitchProps {
  width: number;
  height: number;
  halfPitch?: boolean;
  pad?: number;
}

const LINE_COLOR = '#ffffff';
const LINE_ALPHA = 0.55;
const STRIPE_ALPHA = 0.04;

export function PremiumPitch({ width, height, halfPitch, pad = 24 }: PremiumPitchProps) {
  const pitchW = width - pad * 2;
  const pitchH = height - pad * 2;
  const cx = width / 2;
  const cy = height / 2;

  const penBoxW = pitchW * 0.44;
  const penBoxH = pitchH * 0.18;
  const goalBoxW = pitchW * 0.18;
  const goalBoxH = pitchH * 0.06;
  const centerR = Math.min(pitchW, pitchH) * 0.12;
  const cornerR = Math.min(pitchW, pitchH) * 0.025;
  const penSpotDist = pitchH * 0.12;

  const stripeCount = 12;
  const stripeH = pitchH / stripeCount;

  return (
    <Group>
      <Rect name="pitch-bg" x={0} y={0} width={width} height={height} fill="#0c1a12" cornerRadius={10} />

      <Rect x={pad} y={pad} width={pitchW} height={pitchH} fill="#0a4d2e" cornerRadius={4} />

      {Array.from({ length: stripeCount }).map((_, i) => (
        i % 2 === 0 ? (
          <Rect
            key={`stripe-${i}`}
            x={pad}
            y={pad + i * stripeH}
            width={pitchW}
            height={stripeH}
            fill="#ffffff"
            opacity={STRIPE_ALPHA}
          />
        ) : null
      ))}

      <Rect x={pad} y={pad} width={pitchW} height={pitchH} stroke={LINE_COLOR} strokeWidth={2} opacity={LINE_ALPHA} cornerRadius={2} />

      {!halfPitch && (
        <>
          <Line points={[pad, cy, pad + pitchW, cy]} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />
          <Circle x={cx} y={cy} radius={centerR} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />
          <Circle x={cx} y={cy} radius={4} fill={LINE_COLOR} opacity={LINE_ALPHA * 0.8} />
        </>
      )}

      <Rect x={cx - penBoxW / 2} y={pad} width={penBoxW} height={penBoxH} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />
      <Rect x={cx - goalBoxW / 2} y={pad} width={goalBoxW} height={goalBoxH} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />
      <Circle x={cx} y={pad + penSpotDist} radius={3} fill={LINE_COLOR} opacity={LINE_ALPHA * 0.8} />

      <Arc x={cx} y={pad + penBoxH} innerRadius={0} outerRadius={centerR * 0.6} angle={180} rotation={-90} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} fill="transparent" />

      <Arc x={pad} y={pad} innerRadius={0} outerRadius={cornerR} angle={90} rotation={0} stroke={LINE_COLOR} strokeWidth={1.2} opacity={LINE_ALPHA} fill="transparent" />
      <Arc x={pad + pitchW} y={pad} innerRadius={0} outerRadius={cornerR} angle={90} rotation={90} stroke={LINE_COLOR} strokeWidth={1.2} opacity={LINE_ALPHA} fill="transparent" />

      {!halfPitch && (
        <>
          <Rect x={cx - penBoxW / 2} y={pad + pitchH - penBoxH} width={penBoxW} height={penBoxH} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />
          <Rect x={cx - goalBoxW / 2} y={pad + pitchH - goalBoxH} width={goalBoxW} height={goalBoxH} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />
          <Circle x={cx} y={pad + pitchH - penSpotDist} radius={3} fill={LINE_COLOR} opacity={LINE_ALPHA * 0.8} />
          <Arc x={cx} y={pad + pitchH - penBoxH} innerRadius={0} outerRadius={centerR * 0.6} angle={180} rotation={90} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} fill="transparent" />
          <Arc x={pad} y={pad + pitchH} innerRadius={0} outerRadius={cornerR} angle={90} rotation={-90} stroke={LINE_COLOR} strokeWidth={1.2} opacity={LINE_ALPHA} fill="transparent" />
          <Arc x={pad + pitchW} y={pad + pitchH} innerRadius={0} outerRadius={cornerR} angle={90} rotation={180} stroke={LINE_COLOR} strokeWidth={1.2} opacity={LINE_ALPHA} fill="transparent" />
        </>
      )}

      {halfPitch && (
        <Line points={[pad, pad + pitchH, pad + pitchW, pad + pitchH]} stroke={LINE_COLOR} strokeWidth={2} opacity={LINE_ALPHA * 0.6} dash={[10, 5]} />
      )}

      <Text
        text="SETPIECE"
        fontSize={Math.min(pitchW * 0.06, 14)}
        fontFamily="Inter, sans-serif"
        fill="#ffffff"
        opacity={0.06}
        x={cx}
        y={halfPitch ? pad + pitchH * 0.85 : cy}
        offsetX={pitchW * 0.03 * 4}
        letterSpacing={6}
        fontStyle="bold"
      />
    </Group>
  );
}
