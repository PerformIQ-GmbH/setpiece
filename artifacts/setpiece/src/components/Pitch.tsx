import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { arcToSvgPath, buildPitchGeometry } from '@/utils/pitchGeometry';

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
  // SVG coordinates: 0,0 is top left. 100,100 is bottom right.
  // We'll draw the pitch based on 100x100 relative coordinates.
  
  const handlePitchClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onPitchClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onPitchClick({ x, y });
  };

  return (
    <div className={cn("relative w-full aspect-[2/3] bg-emerald-900 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/[0.12]", className)}>
      <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(0deg,transparent,transparent_10%,#000_10%,#000_20%)] mix-blend-overlay pointer-events-none" />
      
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full cursor-crosshair z-10"
        onClick={handlePitchClick}
      >
        {/* Pitch Lines — driven by the shared scale-accurate geometry module. */}
        {(() => {
          const g = buildPitchGeometry({
            width: 100,
            height: 100,
            pad: 2,
            orientation: halfPitch ? 'half' : 'full',
          });
          return (
            <g stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" fill="none">
              {/* Outer bounds */}
              <rect x={g.boundary.x} y={g.boundary.y} width={g.boundary.width} height={g.boundary.height} />

              {/* Halfway line (dashed when this is a half-pitch cut edge) */}
              <line
                x1={g.halfwayLine.x1}
                y1={g.halfwayLine.y1}
                x2={g.halfwayLine.x2}
                y2={g.halfwayLine.y2}
                strokeDasharray={g.isHalfwayDashed ? '2.5 1.5' : undefined}
              />
              {g.centerCircle && (
                <circle cx={g.centerCircle.x} cy={g.centerCircle.y} r={g.centerCircle.radius} />
              )}
              {g.centerSpot && (
                <circle cx={g.centerSpot.x} cy={g.centerSpot.y} r="0.5" fill="rgba(255,255,255,0.6)" />
              )}

              {g.penaltyAreas.map((r, i) => (
                <rect key={`pa-${i}`} x={r.x} y={r.y} width={r.width} height={r.height} />
              ))}
              {g.goalAreas.map((r, i) => (
                <rect key={`ga-${i}`} x={r.x} y={r.y} width={r.width} height={r.height} />
              ))}
              {g.goals.map((r, i) => (
                <rect key={`goal-${i}`} x={r.x} y={r.y} width={r.width} height={r.height} fill="rgba(255,255,255,0.3)" stroke="none" />
              ))}
              {g.penaltyArcs.map((a, i) => (
                <path key={`par-${i}`} d={arcToSvgPath(a)} />
              ))}
              {g.cornerArcs.map((a, i) => (
                <path key={`ca-${i}`} d={arcToSvgPath(a)} />
              ))}
              {g.penaltySpots.map((p, i) => (
                <circle key={`ps-${i}`} cx={p.x} cy={p.y} r="0.5" fill="rgba(255,255,255,0.6)" />
              ))}
            </g>
          );
        })()}

        {/* Roles and Movement Paths */}
        {roles.map((role) => {
          if (!role.startPosition || role.startPosition.x == null || role.startPosition.y == null) return null;
          const sx = role.startPosition.x;
          const sy = role.startPosition.y;
          const isActive = role.id === activeRoleId;
          const color = isActive ? "var(--color-primary)" : role.color || "white";
          
          return (
            <g key={role.id}>
              {/* Movement Path */}
              {role.movementPath && role.movementPath.length > 0 && (
                <path
                  d={`M ${sx} ${sy} ${role.movementPath.filter(p => p.x != null && p.y != null).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
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
