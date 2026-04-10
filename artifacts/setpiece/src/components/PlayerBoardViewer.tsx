import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Position {
  x?: number | null;
  y?: number | null;
}

interface RoleData {
  id: string;
  name: string;
  description?: string | null;
  coachingPoint?: string | null;
  startPosition?: Position | null;
  movementPath?: Array<{ x?: number; y?: number }> | null;
}

interface AssignmentData {
  roleId: string;
  playerId: string;
}

interface BoardAnnotation {
  type: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
  dashed: boolean;
  arrowhead: boolean;
  ghost?: boolean;
  linkedRoleId?: string;
  stepId?: string;
}

interface BoardEntity {
  type: 'opponent' | 'goalkeeper' | 'ball';
  position: { x: number; y: number };
  shirtNumber?: number;
  label?: string;
}

interface BoardData {
  annotations?: BoardAnnotation[];
  entities?: BoardEntity[];
  steps?: Array<{ id: string; label: string }>;
}

interface PlayerBoardViewerProps {
  roles: RoleData[];
  assignments?: AssignmentData[];
  boardData?: BoardData | null;
  category?: string;
  activePlayerId?: string | null;
  activeRoleId?: string | null;
  className?: string;
}

const TEAM_COLOR = '#10b981';
const ACTIVE_COLOR = '#10b981';
const MUTED_COLOR = 'rgba(255,255,255,0.35)';
const OPPONENT_COLOR = '#ef4444';
const BALL_COLOR = '#f59e0b';

export function PlayerBoardViewer({
  roles,
  assignments = [],
  boardData,
  category = '',
  activePlayerId,
  activeRoleId: explicitActiveRoleId,
  className,
}: PlayerBoardViewerProps) {
  const isCornerKick = category.includes('corner');

  const activeRoleId = useMemo(() => {
    if (explicitActiveRoleId) return explicitActiveRoleId;
    if (!activePlayerId) return null;
    const assignment = assignments.find(a => a.playerId === activePlayerId);
    return assignment?.roleId || null;
  }, [explicitActiveRoleId, activePlayerId, assignments]);

  const annotations = boardData?.annotations || [];
  const entities = boardData?.entities || [];
  const steps = boardData?.steps || [];
  const firstStepId = steps.length > 0 ? steps[0].id : undefined;
  const visibleAnnotations = firstStepId
    ? annotations.filter(a => !a.stepId || a.stepId === firstStepId)
    : annotations;

  return (
    <div className={cn("relative w-full aspect-[4/5] rounded-xl overflow-hidden", className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        <defs>
          <marker id="pb-arrow" markerWidth="4" markerHeight="3" refX="3" refY="1.5" orient="auto">
            <polygon points="0 0, 4 1.5, 0 3" fill="white" opacity="0.6" />
          </marker>
          <marker id="pb-arrow-active" markerWidth="4" markerHeight="3" refX="3" refY="1.5" orient="auto">
            <polygon points="0 0, 4 1.5, 0 3" fill={ACTIVE_COLOR} />
          </marker>
          <radialGradient id="pb-field-grad" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#0d5a35" />
            <stop offset="100%" stopColor="#0a4d2e" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="100" height="100" rx="2" fill="url(#pb-field-grad)" />

        {isCornerKick ? (
          <CornerPitchLines />
        ) : (
          <HalfPitchLines />
        )}

        {visibleAnnotations.map((ann, i) => {
          if (ann.points.length < 2) return null;
          const isLinkedToActive = ann.linkedRoleId === activeRoleId;
          const color = isLinkedToActive ? ACTIVE_COLOR : ann.ghost ? 'rgba(59,130,246,0.4)' : (ann.color || 'rgba(255,255,255,0.4)');
          const opacity = isLinkedToActive ? 0.9 : 0.4;
          const d = `M ${ann.points[0].x} ${ann.points[0].y} ${ann.points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`;

          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={ann.strokeWidth * 0.4}
              strokeDasharray={ann.dashed ? "2 1" : undefined}
              opacity={opacity}
              markerEnd={ann.arrowhead ? (isLinkedToActive ? "url(#pb-arrow-active)" : "url(#pb-arrow)") : undefined}
            />
          );
        })}

        {entities.map((ent, i) => {
          if (ent.type === 'ball') {
            return (
              <g key={`ent-${i}`}>
                <circle cx={ent.position.x} cy={ent.position.y} r="2" fill={BALL_COLOR} stroke="rgba(0,0,0,0.4)" strokeWidth="0.3" />
              </g>
            );
          }
          const isOpponent = ent.type === 'opponent';
          const fill = isOpponent ? OPPONENT_COLOR : 'rgba(255,255,255,0.5)';
          return (
            <g key={`ent-${i}`}>
              <circle cx={ent.position.x} cy={ent.position.y} r="2.2" fill={fill} opacity={0.6} stroke="rgba(0,0,0,0.3)" strokeWidth="0.3" />
              {ent.shirtNumber && (
                <text x={ent.position.x} y={ent.position.y + 0.5} fontSize="1.8" fontWeight="bold" fill="white" textAnchor="middle" dominantBaseline="middle" opacity={0.8}>
                  {ent.shirtNumber}
                </text>
              )}
            </g>
          );
        })}

        {roles.map((role) => {
          if (!role.startPosition || role.startPosition.x == null || role.startPosition.y == null) return null;
          const sx = role.startPosition.x;
          const sy = role.startPosition.y;
          const isActive = role.id === activeRoleId;
          const fill = isActive ? ACTIVE_COLOR : MUTED_COLOR;
          const r = isActive ? 3.5 : 2.5;

          return (
            <g key={role.id}>
              {isActive && (
                <circle cx={sx} cy={sy} r={r + 2} fill="none" stroke={ACTIVE_COLOR} strokeWidth="0.4" opacity={0.5}>
                  <animate attributeName="r" values={`${r + 1};${r + 3};${r + 1}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={sx} cy={sy} r={r} fill={fill} stroke={isActive ? 'rgba(16,185,129,0.6)' : 'rgba(0,0,0,0.3)'} strokeWidth={isActive ? '0.5' : '0.3'} />
              <text
                x={sx}
                y={sy + 0.5}
                fontSize={isActive ? '2.8' : '2.2'}
                fontWeight="bold"
                fill={isActive ? 'white' : 'rgba(0,0,0,0.7)'}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {role.name.substring(0, 2)}
              </text>
              {isActive && (
                <text
                  x={sx}
                  y={sy + r + 3}
                  fontSize="2.5"
                  fontWeight="bold"
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {role.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HalfPitchLines() {
  return (
    <g stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" fill="none">
      <rect x="2" y="2" width="96" height="96" />
      <rect x="20" y="2" width="60" height="25" />
      <rect x="35" y="2" width="30" height="10" />
      <rect x="42" y="0" width="16" height="2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
      <path d="M 35 27 A 20 20 0 0 0 65 27" />
      <circle cx="50" cy="18" r="0.5" fill="rgba(255,255,255,0.3)" />
      <circle cx="50" cy="98" r="15" />
    </g>
  );
}

function CornerPitchLines() {
  return (
    <g stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" fill="none">
      <rect x="2" y="2" width="96" height="96" />
      <rect x="21" y="9" width="58" height="18" />
      <line x1="21" y1="2" x2="21" y2="9" />
      <line x1="79" y1="2" x2="79" y2="9" />
      <rect x="37" y="2" width="26" height="9" />
      <circle cx="50" cy="13" r="0.5" fill="rgba(255,255,255,0.3)" />
      <path d="M 37 27 A 17 17 0 0 0 63 27" />
      <line x1="2" y1="84" x2="98" y2="84" />
      <path d="M 37 84 A 13 13 0 0 1 63 84" />
      <circle cx="50" cy="84" r="0.5" fill="rgba(255,255,255,0.3)" />
    </g>
  );
}
