import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { arcToSvgPath, buildPitchGeometry, type PitchGeometry } from '@/utils/pitchGeometry';

export const SVG_PITCH_WIDTH = 100;
export const SVG_PITCH_HEIGHT = 150;

/** Invert the actual SVG viewport transform, including any letterboxing. */
export function clientToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(matrix.inverse());
}

export function PitchLines({ geometry: g }: { geometry: PitchGeometry }) {
  // The boundary already paints the goal line; leave that side of each box open.
  const areaOutline = (r: typeof g.boundary) => Math.abs(r.y - g.boundary.y) < 1e-6
    ? `M ${r.x} ${r.y} L ${r.x} ${r.y + r.height} L ${r.x + r.width} ${r.y + r.height} L ${r.x + r.width} ${r.y}`
    : `M ${r.x} ${r.y + r.height} L ${r.x} ${r.y} L ${r.x + r.width} ${r.y} L ${r.x + r.width} ${r.y + r.height}`;
  const goalOutline = (r: typeof g.boundary) => Math.abs(r.y + r.height - g.boundary.y) < 1e-6
    ? `M ${r.x} ${r.y + r.height} L ${r.x} ${r.y} L ${r.x + r.width} ${r.y} L ${r.x + r.width} ${r.y + r.height}`
    : `M ${r.x} ${r.y} L ${r.x} ${r.y + r.height} L ${r.x + r.width} ${r.y + r.height} L ${r.x + r.width} ${r.y}`;
  return (
    <g stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" fill="none">
      <rect x={g.boundary.x} y={g.boundary.y} width={g.boundary.width} height={g.boundary.height} />
      {g.orientation === 'full' && <line {...g.halfwayLine} />}
      {g.centerCircle && <circle cx={g.centerCircle.x} cy={g.centerCircle.y} r={g.centerCircle.radius} />}
      {g.centerArcs.map((a, i) => <path key={`center-${i}`} d={arcToSvgPath(a)} />)}
      {g.centerSpot && <circle cx={g.centerSpot.x} cy={g.centerSpot.y} r="0.5" fill="rgba(255,255,255,0.6)" />}
      {g.penaltyAreas.map((r, i) => <path key={`pa-${i}`} d={areaOutline(r)} />)}
      {g.goalAreas.map((r, i) => <path key={`ga-${i}`} d={areaOutline(r)} />)}
      {g.goals.map((r, i) => (
        <g key={`goal-${i}`}>
          <rect {...r} fill="rgba(255,255,255,0.3)" stroke="none" />
          <path d={goalOutline(r)} />
        </g>
      ))}
      {g.penaltyArcs.map((a, i) => <path key={`par-${i}`} d={arcToSvgPath(a)} />)}
      {g.cornerArcs.map((a, i) => <path key={`ca-${i}`} d={arcToSvgPath(a)} />)}
      {g.penaltySpots.map((p, i) => <circle key={`ps-${i}`} cx={p.x} cy={p.y} r="0.5" fill="rgba(255,255,255,0.6)" />)}
    </g>
  );
}

interface Position {
  x?: number;
  y?: number;
}

interface PitchProps {
  roles?: {
    id: string;
    name: string;
    startPosition?: Position | null;
    movementPath?: Position[] | null;
    color?: string;
  }[];
  activeRoleId?: string | null;
  onRoleClick?: (roleId: string) => void;
  onPitchClick?: (pos: Position) => void;
  interactive?: boolean;
  halfPitch?: boolean;
  className?: string;
}

export function Pitch({
  roles = [],
  activeRoleId,
  onRoleClick,
  onPitchClick,
  interactive = false,
  halfPitch = true,
  className
}: PitchProps) {
  const g = buildPitchGeometry({
    width: SVG_PITCH_WIDTH,
    height: SVG_PITCH_HEIGHT,
    pad: 3,
    orientation: halfPitch ? 'half' : 'full',
  });
  
  const handlePitchClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onPitchClick) return;
    const point = clientToSvgPoint(e.currentTarget, e.clientX, e.clientY);
    if (!point || !g.containsPoint(point)) return;
    onPitchClick(g.pixelToPercent(point));
  };

  return (
    <div className={cn("relative w-full aspect-[2/3] bg-emerald-900 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/[0.12]", className)}>
      <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(0deg,transparent,transparent_10%,#000_10%,#000_20%)] mix-blend-overlay pointer-events-none" />
      
      <svg
        viewBox={`0 0 ${SVG_PITCH_WIDTH} ${SVG_PITCH_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full cursor-crosshair z-10"
        onClick={handlePitchClick}
      >
        <PitchLines geometry={g} />

        {/* Roles and Movement Paths */}
        {roles.map((role) => {
          if (!role.startPosition || role.startPosition.x == null || role.startPosition.y == null) return null;
          const { x: sx, y: sy } = g.percentToPixel({ x: role.startPosition.x, y: role.startPosition.y });
          const isActive = role.id === activeRoleId;
          const color = isActive ? "var(--color-primary)" : role.color || "white";
          
          return (
            <g key={role.id}>
              {/* Movement Path */}
              {role.movementPath && role.movementPath.length > 0 && (
                <path
                  d={`M ${sx} ${sy} ${role.movementPath.filter(p => p.x != null && p.y != null).map(p => { const point = g.percentToPixel({ x: p.x!, y: p.y! }); return `L ${point.x} ${point.y}`; }).join(' ')}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="2.5 1.5"
                  className={cn("transition-all duration-300", isActive ? "opacity-100" : "opacity-50")}
                  markerEnd="url(#arrowhead)"
                />
              )}
              
              {/* Role Marker */}
              <motion.g
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRoleClick?.(role.id);
                }}
                className={cn(
                  "transition-all duration-300",
                  onRoleClick && "cursor-pointer hover:brightness-125"
                )}
              >
                <circle
                  cx={sx}
                  cy={sy}
                  r={isActive ? "4" : "3"}
                  fill={color}
                  stroke="rgba(0,0,0,0.6)"
                  strokeWidth="0.6"
                />
                <text
                  x={sx}
                  y={sy + 0.6}
                  fontSize="2.8"
                  fontWeight="bold"
                  fill="#000"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none"
                >
                  {role.name.substring(0, 1)}
                </text>
                
                {isActive && (
                  <circle
                    cx={sx}
                    cy={sy}
                    r="5.5"
                    fill="none"
                    stroke={color}
                    strokeWidth="0.4"
                    opacity="0.6"
                    className="animate-ping origin-center"
                  />
                )}
              </motion.g>
            </g>
          );
        })}

        <defs>
          <marker id="arrowhead" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5" orient="auto">
            <polygon points="0 0, 3 1.5, 0 3" fill="var(--color-primary)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
