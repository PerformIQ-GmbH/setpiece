import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Stage, Layer, Group, Line, Arrow, Circle as KonvaCircle, Rect, Text } from 'react-konva';
import { PremiumPitch } from '@/components/editor/PremiumPitch';
import { OffensiveCornerPitch } from '@/components/editor/OffensiveCornerPitch';
import { TeamPlayerMarker, OpponentMarker, GoalkeeperMarker, BallMarker } from '@/components/editor/markers';
import type { Annotation, EntityMarker, BoardData as EditorBoardData } from '@/components/editor/types';

interface RoleData {
  id: string;
  name: string;
  description?: string | null;
  coachingPoint?: string | null;
  startPosition?: { x?: number | null; y?: number | null } | null;
  movementPath?: Array<{ x?: number; y?: number }> | null;
}

interface AssignmentData {
  roleId: string;
  playerId: string;
}

interface PlayerBoardViewerProps {
  roles: RoleData[];
  assignments?: AssignmentData[];
  boardData?: EditorBoardData | Record<string, unknown> | null;
  category?: string;
  activePlayerId?: string | null;
  activeRoleId?: string | null;
  className?: string;
  players?: Array<{ id: string; firstName: string; lastName: string; shirtNumber?: number | null }>;
}

function computePad(width: number): number {
  if (width < 300) return 8;
  if (width < 600) return 10;
  return 14;
}

export function PlayerBoardViewer({
  roles,
  assignments = [],
  boardData,
  category = '',
  activePlayerId,
  activeRoleId: explicitActiveRoleId,
  className,
  players = [],
}: PlayerBoardViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 400, height: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDims({ width, height: width * 1.25 });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dims;
  const PAD = computePad(width);
  const isCornerKick = category.includes('corner');
  const halfPitch = !isCornerKick && category.includes('free_kick');
  const pitchW = width - PAD * 2;
  const pitchH = height - PAD * 2;

  const toPixel = useCallback((pct: { x: number; y: number }) => ({
    x: PAD + (pct.x / 100) * pitchW,
    y: PAD + (pct.y / 100) * pitchH,
  }), [pitchW, pitchH, PAD]);

  const activeRoleId = useMemo(() => {
    if (explicitActiveRoleId) return explicitActiveRoleId;
    if (!activePlayerId) return null;
    const assignment = assignments.find(a => a.playerId === activePlayerId);
    return assignment?.roleId || null;
  }, [explicitActiveRoleId, activePlayerId, assignments]);

  const annotations: Annotation[] = (boardData as EditorBoardData)?.annotations || [];
  const entities: EntityMarker[] = (boardData as EditorBoardData)?.entities || [];
  const steps = (boardData as EditorBoardData)?.steps || [];
  const firstStepId = steps.length > 0 ? steps[0].id : undefined;
  const visibleAnnotations = firstStepId
    ? annotations.filter((a: Annotation) => !a.stepId || a.stepId === firstStepId)
    : annotations;

  const playerMap = useMemo(() => {
    const m = new Map<string, { firstName: string; lastName: string; shirtNumber?: number | null }>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  return (
    <div ref={containerRef} className={`relative w-full aspect-[4/5] ${className || ''}`}>
      <Stage width={width} height={height} listening={false}>
        <Layer>
          {isCornerKick ? (
            <OffensiveCornerPitch width={width} height={height} pad={PAD} theme="dark" />
          ) : (
            <PremiumPitch width={width} height={height} halfPitch={halfPitch} pad={PAD} theme="dark" />
          )}

          <Group>
            {visibleAnnotations.map((ann: Annotation) => {
              if (!ann.points || ann.points.length < 2) return null;
              const isLinkedToActive = ann.linkedRoleId === activeRoleId;
              const opacity = isLinkedToActive ? 0.9 : 0.35;
              const color = isLinkedToActive ? '#10b981' : (ann.ghost ? 'rgba(59,130,246,0.5)' : (ann.color || 'rgba(255,255,255,0.5)'));
              const flatPoints = ann.points.flatMap((p: { x: number; y: number }) => {
                const px = toPixel(p);
                return [px.x, px.y];
              });

              if (ann.arrowhead) {
                return (
                  <Arrow
                    key={ann.id}
                    points={flatPoints}
                    stroke={color}
                    strokeWidth={ann.strokeWidth || 2}
                    opacity={opacity}
                    dash={ann.dashed ? [6, 4] : undefined}
                    pointerLength={8}
                    pointerWidth={6}
                    fill={color}
                    listening={false}
                  />
                );
              }

              return (
                <Line
                  key={ann.id}
                  points={flatPoints}
                  stroke={color}
                  strokeWidth={ann.strokeWidth || 2}
                  opacity={opacity}
                  dash={ann.dashed ? [6, 4] : undefined}
                  listening={false}
                />
              );
            })}
          </Group>

          <Group>
            {entities.map((ent: EntityMarker) => {
              const px = toPixel(ent.position);
              if (ent.type === 'opponent') {
                return (
                  <OpponentMarker
                    key={ent.id}
                    x={px.x} y={px.y}
                    shirtNumber={ent.shirtNumber}
                    isDimmed={false}
                  />
                );
              }
              if (ent.type === 'goalkeeper') {
                return (
                  <GoalkeeperMarker
                    key={ent.id}
                    x={px.x} y={px.y}
                    shirtNumber={ent.shirtNumber}
                    isDimmed={false}
                  />
                );
              }
              if (ent.type === 'ball') {
                return (
                  <BallMarker
                    key={ent.id}
                    x={px.x} y={px.y}
                    isDimmed={false}
                    lightPitch={false}
                  />
                );
              }
              return null;
            })}
          </Group>

          <Group>
            {roles.map((role) => {
              if (!role.startPosition || role.startPosition.x == null || role.startPosition.y == null) return null;
              const px = toPixel({ x: role.startPosition.x, y: role.startPosition.y });
              const isActive = role.id === activeRoleId;
              const isDimmed = activeRoleId != null && !isActive;

              const assignment = assignments.find(a => a.roleId === role.id);
              const player = assignment ? playerMap.get(assignment.playerId) : undefined;

              return (
                <TeamPlayerMarker
                  key={role.id}
                  x={px.x}
                  y={px.y}
                  isSelected={isActive}
                  isDimmed={isDimmed}
                  isUnassigned={!assignment}
                  label={role.name}
                  lastName={player?.lastName}
                  shirtNumber={player?.shirtNumber ?? undefined}
                  lightPitch={false}
                  draggable={false}
                />
              );
            })}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}
