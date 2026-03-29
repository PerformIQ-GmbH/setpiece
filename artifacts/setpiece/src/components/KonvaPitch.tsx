import { useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Group } from 'react-konva';
import type Konva from 'konva';

interface RoleData {
  id: string;
  name: string;
  startPosition?: { x?: number | null; y?: number | null } | null;
}

interface KonvaPitchProps {
  width: number;
  height: number;
  roles: RoleData[];
  activeRoleId: string | null;
  halfPitch?: boolean;
  onRoleClick: (roleId: string) => void;
  onRoleDragEnd: (roleId: string, pos: { x: number; y: number }) => void;
  onPitchClick: (pos: { x: number; y: number }) => void;
}

const PITCH_COLOR = '#0a4d2e';
const LINE_COLOR = '#ffffff';
const LINE_ALPHA = 0.4;
const ROLE_RADIUS = 18;
const ACTIVE_COLOR = '#10b981';
const INACTIVE_COLOR = '#6b7280';

export function KonvaPitch({ width, height, roles, activeRoleId, halfPitch, onRoleClick, onRoleDragEnd, onPitchClick }: KonvaPitchProps) {
  const stageRef = useRef<Konva.Stage>(null);

  const pad = 20;
  const pitchW = width - pad * 2;
  const pitchH = height - pad * 2;
  const cx = width / 2;
  const cy = height / 2;

  const toPixel = useCallback((pct: { x: number; y: number }) => ({
    x: pad + (pct.x / 100) * pitchW,
    y: pad + (pct.y / 100) * pitchH,
  }), [pitchW, pitchH]);

  const toPct = useCallback((px: { x: number; y: number }) => ({
    x: Math.max(0, Math.min(100, ((px.x - pad) / pitchW) * 100)),
    y: Math.max(0, Math.min(100, ((px.y - pad) / pitchH) * 100)),
  }), [pitchW, pitchH]);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === stageRef.current || e.target.name() === 'pitch-bg') {
      const pos = stageRef.current?.getPointerPosition();
      if (pos) onPitchClick(toPct(pos));
    }
  };

  const penaltyBoxW = pitchW * 0.44;
  const penaltyBoxH = pitchH * 0.18;
  const goalBoxW = pitchW * 0.18;
  const goalBoxH = pitchH * 0.06;
  const centerCircleR = Math.min(pitchW, pitchH) * 0.12;

  return (
    <Stage ref={stageRef} width={width} height={height} onClick={handleStageClick}>
      <Layer>
        <Rect x={0} y={0} width={width} height={height} fill={PITCH_COLOR} cornerRadius={8} name="pitch-bg" />

        <Rect x={pad} y={pad} width={pitchW} height={pitchH} stroke={LINE_COLOR} strokeWidth={2} opacity={LINE_ALPHA} />

        {!halfPitch && <Line points={[cx, pad, cx, pad + pitchH]} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />}
        {!halfPitch && <Circle x={cx} y={cy} radius={centerCircleR} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />}
        {!halfPitch && <Circle x={cx} y={cy} radius={4} fill={LINE_COLOR} opacity={LINE_ALPHA} />}

        <Rect x={cx - penaltyBoxW / 2} y={pad} width={penaltyBoxW} height={penaltyBoxH} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />
        <Rect x={cx - goalBoxW / 2} y={pad} width={goalBoxW} height={goalBoxH} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />

        {!halfPitch && (
          <>
            <Rect x={cx - penaltyBoxW / 2} y={pad + pitchH - penaltyBoxH} width={penaltyBoxW} height={penaltyBoxH} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />
            <Rect x={cx - goalBoxW / 2} y={pad + pitchH - goalBoxH} width={goalBoxW} height={goalBoxH} stroke={LINE_COLOR} strokeWidth={1.5} opacity={LINE_ALPHA} />
          </>
        )}

        {halfPitch && (
          <Line points={[pad, pad + pitchH, pad + pitchW, pad + pitchH]} stroke={LINE_COLOR} strokeWidth={2} opacity={LINE_ALPHA} dash={[8, 4]} />
        )}
      </Layer>

      <Layer>
        {roles.map((role) => {
          const pct = { x: role.startPosition?.x ?? 50, y: role.startPosition?.y ?? 50 };
          const px = toPixel(pct);
          const isActive = role.id === activeRoleId;

          return (
            <Group
              key={role.id}
              x={px.x}
              y={px.y}
              draggable
              onDragEnd={(e) => {
                const newPos = toPct({ x: e.target.x(), y: e.target.y() });
                onRoleDragEnd(role.id, newPos);
              }}
              onClick={(e) => {
                e.cancelBubble = true;
                onRoleClick(role.id);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onRoleClick(role.id);
              }}
            >
              <Circle
                radius={ROLE_RADIUS + 4}
                fill={isActive ? ACTIVE_COLOR : 'transparent'}
                opacity={0.25}
              />
              <Circle
                radius={ROLE_RADIUS}
                fill={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
                stroke={isActive ? '#ffffff' : 'transparent'}
                strokeWidth={isActive ? 2 : 0}
                shadowColor={isActive ? ACTIVE_COLOR : '#000'}
                shadowBlur={isActive ? 12 : 4}
                shadowOpacity={isActive ? 0.6 : 0.3}
              />
              <Text
                text={role.name.length > 6 ? role.name.slice(0, 5) + '..' : role.name}
                fontSize={10}
                fontFamily="Inter, sans-serif"
                fontStyle="bold"
                fill="#ffffff"
                align="center"
                verticalAlign="middle"
                width={ROLE_RADIUS * 2}
                height={ROLE_RADIUS * 2}
                x={-ROLE_RADIUS}
                y={-ROLE_RADIUS}
              />
              <Text
                text={role.name}
                fontSize={9}
                fontFamily="Inter, sans-serif"
                fill="#ffffff"
                opacity={0.7}
                align="center"
                width={80}
                x={-40}
                y={ROLE_RADIUS + 4}
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
