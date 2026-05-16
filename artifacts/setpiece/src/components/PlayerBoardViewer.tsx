import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Stage, Layer, Group, Line, Arrow, Circle as KonvaCircle, Ring } from 'react-konva';
import type Konva from 'konva';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { PremiumPitch } from '@/components/editor/PremiumPitch';
import { OffensiveCornerPitch } from '@/components/editor/OffensiveCornerPitch';
import { TeamPlayerMarker, OpponentMarker, GoalkeeperMarker, BallMarker } from '@/components/editor/markers';
import type { Annotation, EntityMarker, Point } from '@/components/editor/types';

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

interface BoardDataLike {
  annotations?: Annotation[];
  entities?: EntityMarker[];
  steps?: Array<{ id: string; label: string }>;
  stepPositions?: Record<string, Record<string, { x: number; y: number }>>;
  [key: string]: unknown;
}

interface PlayerBoardViewerProps {
  roles: RoleData[];
  assignments?: AssignmentData[];
  boardData?: BoardDataLike | null;
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

function safe(p: Point): Point {
  return {
    x: Number.isFinite(p.x) ? p.x : 50,
    y: Number.isFinite(p.y) ? p.y : 50,
  };
}

function interpolatePath(path: Point[], t: number): Point {
  if (path.length === 0) return { x: 50, y: 50 };
  if (path.length === 1 || t <= 0) return safe(path[0]);
  if (t >= 1) return safe(path[path.length - 1]);
  const totalSegments = path.length - 1;
  const segIdx = Math.min(Math.floor(t * totalSegments), totalSegments - 1);
  const segT = t * totalSegments - segIdx;
  const p0 = path[segIdx];
  const p1 = path[segIdx + 1];
  return safe({ x: p0.x + (p1.x - p0.x) * segT, y: p0.y + (p1.y - p0.y) * segT });
}

const ACCENT = '#22d3ee';
const ACCENT_GLOW = '#06b6d4';

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
    const assignment = assignments.find((a) => a.playerId === activePlayerId);
    return assignment?.roleId || null;
  }, [explicitActiveRoleId, activePlayerId, assignments]);

  const annotations: Annotation[] = boardData?.annotations || [];
  const entities: EntityMarker[] = boardData?.entities || [];
  const steps = useMemo(() => boardData?.steps || [], [boardData]);
  const stepPositions = boardData?.stepPositions || {};
  const sortedStepIds = useMemo(() => steps.map((s) => s.id), [steps]);
  const hasMultipleSteps = steps.length > 1;

  // ─── Animation state (per-component) ─────────────────────────────
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const progressRef = useRef(0);
  const stepIndexRef = useRef(0);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { stepIndexRef.current = stepIndex; }, [stepIndex]);

  // Reset playback whenever the underlying board or step set changes (e.g.
  // user opens a different set piece). Without this, a stale stepIndex can
  // exceed the new steps.length and break position resolution / labels.
  const boardKey = useMemo(
    () => `${steps.length}:${sortedStepIds.join('|')}`,
    [steps.length, sortedStepIds]
  );
  const didAutoPlay = useRef(false);
  useEffect(() => {
    didAutoPlay.current = false;
    setPlaying(false);
    setStepIndex(0);
    setProgress(0);
    progressRef.current = 0;
    stepIndexRef.current = 0;
  }, [boardKey]);

  // Auto-play once after layout settles (per board)
  useEffect(() => {
    if (didAutoPlay.current) return;
    if (!hasMultipleSteps) return;
    if (width < 50) return;
    didAutoPlay.current = true;
    const t = setTimeout(() => {
      setStepIndex(0);
      setProgress(0);
      progressRef.current = 0;
      stepIndexRef.current = 0;
      setPlaying(true);
    }, 400);
    return () => clearTimeout(t);
  }, [hasMultipleSteps, width, boardKey]);

  // Animation loop
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = progressRef.current + dt * 0.35; // ~3 seconds per step
      if (next >= 1) {
        if (stepIndexRef.current < steps.length - 1) {
          stepIndexRef.current = stepIndexRef.current + 1;
          progressRef.current = 0;
          setStepIndex(stepIndexRef.current);
          setProgress(0);
        } else {
          progressRef.current = 1;
          setProgress(1);
          setPlaying(false);
          return;
        }
      } else {
        progressRef.current = next;
        setProgress(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, steps.length]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (stepIndex >= steps.length - 1 && progress >= 0.999) {
      setStepIndex(0);
      setProgress(0);
      progressRef.current = 0;
      stepIndexRef.current = 0;
    }
    setPlaying(true);
  };

  const goToStep = (i: number) => {
    setPlaying(false);
    const clamped = Math.max(0, Math.min(i, steps.length - 1));
    setStepIndex(clamped);
    setProgress(0);
    progressRef.current = 0;
    stepIndexRef.current = clamped;
  };

  const reset = () => {
    setPlaying(false);
    setStepIndex(0);
    setProgress(0);
    progressRef.current = 0;
    stepIndexRef.current = 0;
  };

  // ─── Position computation per step ──────────────────────────────
  // Mirrors EditorCanvas.resolvePositionForStep: linked runs first, then fall
  // back to unlinked runs assigned to roles in declaration order.
  const resolvePositionForStep = useCallback(
    (roleId: string, stepAnns: Annotation[], startPos: Point, t: number): Point => {
      const linkedRun = stepAnns.find(
        (a) =>
          a.linkedRoleId === roleId &&
          (a.type === 'run_path' || a.type === 'curved_run') &&
          a.points.length >= 2
      );
      if (linkedRun) return interpolatePath(linkedRun.points, t);

      const unlinkedRuns = stepAnns.filter(
        (a) =>
          !a.linkedRoleId &&
          (a.type === 'run_path' || a.type === 'curved_run') &&
          a.points.length >= 2
      );
      if (unlinkedRuns.length > 0) {
        const roleIdx = roles.findIndex((r) => r.id === roleId);
        const usedLinkedCount = stepAnns.filter(
          (a) =>
            a.linkedRoleId &&
            (a.type === 'run_path' || a.type === 'curved_run') &&
            a.points.length >= 2
        ).length;
        const unlinkedIdx = roleIdx - usedLinkedCount;
        if (unlinkedIdx >= 0 && unlinkedIdx < unlinkedRuns.length) {
          return interpolatePath(unlinkedRuns[unlinkedIdx].points, t);
        }
      }
      return startPos;
    },
    [roles]
  );

  const computeRolePosition = useCallback(
    (role: RoleData): Point => {
      const basePos: Point = {
        x: role.startPosition?.x ?? 50,
        y: role.startPosition?.y ?? 50,
      };
      if (steps.length === 0) return basePos;

      let cur: Point = basePos;
      // Walk completed steps
      for (let i = 0; i < stepIndex; i++) {
        const sid = sortedStepIds[i];
        if (sid && stepPositions[sid]?.[role.id]) cur = stepPositions[sid][role.id];
        const prevAnns = annotations.filter((a) => a.stepId === sid);
        cur = resolvePositionForStep(role.id, prevAnns, cur, 1);
      }
      // Apply current step start position override
      const curSid = sortedStepIds[stepIndex];
      if (curSid && stepPositions[curSid]?.[role.id]) cur = stepPositions[curSid][role.id];
      // Interpolate within current step
      const curAnns = annotations.filter((a) => a.stepId === curSid);
      return safe(resolvePositionForStep(role.id, curAnns, cur, progress));
    },
    [annotations, stepIndex, sortedStepIds, stepPositions, progress, resolvePositionForStep, steps.length]
  );

  // Determine which annotations to show this step
  const currentStepId = sortedStepIds[stepIndex];
  const visibleAnnotations = useMemo(() => {
    if (steps.length === 0) return annotations;
    return annotations.filter((a) => !a.stepId || a.stepId === currentStepId);
  }, [annotations, steps.length, currentStepId]);

  // The full personal-run annotation for the current step (rendered as a
  // ghost) and a progress-truncated subpath that traces along with the marker.
  const selfArrowFull = useMemo(() => {
    if (!activeRoleId) return null;
    const linkedRun = visibleAnnotations.find(
      (a) =>
        a.linkedRoleId === activeRoleId &&
        (a.type === 'run_path' || a.type === 'curved_run') &&
        a.points.length >= 2
    );
    return linkedRun || null;
  }, [visibleAnnotations, activeRoleId]);

  const selfArrowTracedPoints = useMemo(() => {
    if (!selfArrowFull) return null;
    const path = selfArrowFull.points;
    if (path.length < 2) return null;
    if (progress >= 1) return path;
    if (progress <= 0) return [path[0]];
    const totalSegments = path.length - 1;
    const exact = progress * totalSegments;
    const lastFullIdx = Math.floor(exact);
    const segT = exact - lastFullIdx;
    const head = path.slice(0, lastFullIdx + 1);
    const p0 = path[lastFullIdx];
    const p1 = path[lastFullIdx + 1];
    if (!p1) return head;
    head.push({ x: p0.x + (p1.x - p0.x) * segT, y: p0.y + (p1.y - p0.y) * segT });
    return head;
  }, [selfArrowFull, progress]);

  const playerMap = useMemo(() => {
    const m = new Map<string, { firstName: string; lastName: string; shirtNumber?: number | null }>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  // ─── Marching-ants offset for personal arrow ────────────────────
  const [dashOffset, setDashOffset] = useState(0);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setDashOffset((v) => (v - dt * 16) % 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ─── Pulse for active marker ────────────────────────────────────
  const [pulseT, setPulseT] = useState(0);
  useEffect(() => {
    if (!activeRoleId) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setPulseT(((now - start) / 1400) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeRoleId]);

  // ─── Pinch-zoom & pan via Konva Stage scale/position ────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stageRef = useRef<Konva.Stage>(null);
  const lastTouchRef = useRef<{
    dist?: number;
    center?: { x: number; y: number };
    single?: { x: number; y: number };
  }>({});
  const lastTapRef = useRef(0);

  const clampPan = useCallback(
    (p: { x: number; y: number }, z: number) => {
      // Limit pan so the pitch never leaves the viewport
      const maxX = (width * (z - 1)) / 2;
      const maxY = (height * (z - 1)) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, p.x)),
        y: Math.max(-maxY, Math.min(maxY, p.y)),
      };
    },
    [width, height]
  );

  const setZoomAround = useCallback(
    (newZoom: number, focal?: { x: number; y: number }) => {
      const z = Math.max(1, Math.min(3, newZoom));
      if (!focal) {
        setZoom(z);
        setPan((p) => clampPan(p, z));
        return;
      }
      // Keep the focal point stable in viewport coordinates
      setZoom((prevZ) => {
        const ratio = z / prevZ;
        setPan((prevPan) => {
          const cx = width / 2;
          const cy = height / 2;
          const dx = (focal.x - cx - prevPan.x) * (1 - ratio);
          const dy = (focal.y - cy - prevPan.y) * (1 - ratio);
          return clampPan({ x: prevPan.x + dx, y: prevPan.y + dy }, z);
        });
        return z;
      });
    },
    [width, height, clampPan]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      lastTouchRef.current = {
        dist,
        center: {
          x: (a.clientX + b.clientX) / 2 - rect.left,
          y: (a.clientY + b.clientY) / 2 - rect.top,
        },
      };
    } else if (e.touches.length === 1) {
      const now = performance.now();
      if (now - lastTapRef.current < 300) {
        // double-tap → reset zoom
        setZoom(1);
        setPan({ x: 0, y: 0 });
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
      lastTouchRef.current = {
        single: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && lastTouchRef.current.dist) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        const factor = dist / lastTouchRef.current.dist;
        lastTouchRef.current.dist = dist;
        setZoomAround(zoom * factor, lastTouchRef.current.center);
      } else if (e.touches.length === 1 && lastTouchRef.current.single && zoom > 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - lastTouchRef.current.single.x;
        const dy = e.touches[0].clientY - lastTouchRef.current.single.y;
        lastTouchRef.current.single = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setPan((p) => clampPan({ x: p.x + dx, y: p.y + dy }, zoom));
      }
    },
    [zoom, setZoomAround, clampPan]
  );

  const handleTouchEnd = useCallback(() => {
    lastTouchRef.current = {};
  }, []);

  const stageX = width / 2 + pan.x - (width / 2) * zoom;
  const stageY = height / 2 + pan.y - (height / 2) * zoom;

  const stepLabel = currentStepId ? steps[stepIndex]?.label : null;
  const showStepHeader = hasMultipleSteps && stepLabel;

  return (
    <div className={`relative w-full ${className || ''}`}>
      {/* Step header */}
      {showStepHeader && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
            Step {stepIndex + 1} / {steps.length}
          </span>
          <span className="text-sm font-semibold text-white truncate">{stepLabel}</span>
        </div>
      )}

      {/* Pitch container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/5] overflow-hidden rounded-xl select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ touchAction: 'none' }}
      >
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          listening={false}
          scaleX={zoom}
          scaleY={zoom}
          x={stageX}
          y={stageY}
        >
          <Layer>
            {isCornerKick ? (
              <OffensiveCornerPitch width={width} height={height} pad={PAD} theme="dark" />
            ) : (
              <PremiumPitch width={width} height={height} halfPitch={halfPitch} pad={PAD} theme="dark" />
            )}

            {/* Background annotations (non-personal) */}
            <Group>
              {visibleAnnotations.map((ann: Annotation) => {
                if (!ann.points || ann.points.length < 2) return null;
                if (ann.id === selfArrowFull?.id) return null; // drawn separately
                const isLinkedToActive = ann.linkedRoleId === activeRoleId;
                const opacity = isLinkedToActive ? 0.85 : activeRoleId ? 0.5 : 0.7;
                const color = ann.ghost
                  ? 'rgba(59,130,246,0.5)'
                  : ann.color || 'rgba(255,255,255,0.6)';
                const flatPoints = ann.points.flatMap((p) => {
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
                      pointerLength={9}
                      pointerWidth={8}
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

            {/* Personal arrow — full path as faint ghost + traced progress */}
            {selfArrowFull && (() => {
              const fullFlat = selfArrowFull.points.flatMap((p) => {
                const px = toPixel(p);
                return [px.x, px.y];
              });
              const traced = selfArrowTracedPoints || [];
              const tracedFlat = traced.flatMap((p) => {
                const px = toPixel(p);
                return [px.x, px.y];
              });
              const tracedHasArrow = progress >= 0.999;
              return (
                <Group listening={false}>
                  {/* Ghost full path so player sees their whole route */}
                  <Line
                    points={fullFlat}
                    stroke={ACCENT}
                    strokeWidth={2.5}
                    opacity={0.3}
                    dash={[6, 6]}
                    listening={false}
                  />
                  {/* Soft glow underlay along traced portion */}
                  {tracedFlat.length >= 4 && (
                    <Line
                      points={tracedFlat}
                      stroke={ACCENT_GLOW}
                      strokeWidth={8}
                      opacity={0.25}
                      lineCap="round"
                      lineJoin="round"
                      listening={false}
                    />
                  )}
                  {/* Main accent stroke — arrow head only when fully traced */}
                  {tracedFlat.length >= 4 && (
                    tracedHasArrow ? (
                      <Arrow
                        points={tracedFlat}
                        stroke={ACCENT}
                        strokeWidth={4}
                        opacity={0.95}
                        dash={[10, 6]}
                        dashOffset={dashOffset}
                        pointerLength={14}
                        pointerWidth={12}
                        fill={ACCENT}
                        lineCap="round"
                        lineJoin="round"
                        listening={false}
                      />
                    ) : (
                      <Line
                        points={tracedFlat}
                        stroke={ACCENT}
                        strokeWidth={4}
                        opacity={0.95}
                        dash={[10, 6]}
                        dashOffset={dashOffset}
                        lineCap="round"
                        lineJoin="round"
                        listening={false}
                      />
                    )
                  )}
                </Group>
              );
            })()}

            {/* Entities (opponents, GK, ball) — opponents stay dimmed, ball/GK full */}
            <Group>
              {entities.map((ent: EntityMarker) => {
                const px = toPixel(ent.position);
                if (ent.type === 'opponent') {
                  return (
                    <OpponentMarker
                      key={ent.id}
                      x={px.x}
                      y={px.y}
                      shirtNumber={ent.shirtNumber}
                      isDimmed={true}
                    />
                  );
                }
                if (ent.type === 'goalkeeper') {
                  return (
                    <GoalkeeperMarker
                      key={ent.id}
                      x={px.x}
                      y={px.y}
                      shirtNumber={ent.shirtNumber}
                      isDimmed={false}
                    />
                  );
                }
                if (ent.type === 'ball') {
                  return (
                    <BallMarker key={ent.id} x={px.x} y={px.y} isDimmed={false} lightPitch={false} />
                  );
                }
                return null;
              })}
            </Group>

            {/* Roles (teammates + me) */}
            <Group>
              {roles.map((role) => {
                if (!role.startPosition || role.startPosition.x == null || role.startPosition.y == null) return null;
                const pct = computeRolePosition(role);
                const px = toPixel(pct);
                const isActive = role.id === activeRoleId;

                const assignment = assignments.find((a) => a.roleId === role.id);
                const player = assignment ? playerMap.get(assignment.playerId) : undefined;

                return (
                  <Group key={role.id}>
                    {/* Pulsing ring around active marker */}
                    {isActive && (
                      <>
                        <KonvaCircle
                          x={px.x}
                          y={px.y}
                          radius={22 + pulseT * 18}
                          stroke={ACCENT}
                          strokeWidth={2}
                          opacity={0.5 * (1 - pulseT)}
                          listening={false}
                        />
                        <Ring
                          x={px.x}
                          y={px.y}
                          innerRadius={20}
                          outerRadius={26}
                          fill={ACCENT}
                          opacity={0.35}
                          listening={false}
                        />
                      </>
                    )}
                    <TeamPlayerMarker
                      x={px.x}
                      y={px.y}
                      isSelected={isActive}
                      isDimmed={!isActive && !!activeRoleId}
                      isUnassigned={!assignment}
                      label={undefined}
                      lastName={player?.lastName}
                      shirtNumber={player?.shirtNumber ?? undefined}
                      lightPitch={false}
                      draggable={false}
                    />
                  </Group>
                );
              })}
            </Group>
          </Layer>
        </Stage>

        {/* Mini legend overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 px-2 py-1.5 rounded-lg bg-black/55 backdrop-blur-sm border border-white/10 text-[10px] text-white/85 font-medium pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }} />
            <span>Du</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-700 border border-emerald-500" />
            <span>Mitspieler</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span>Gegner</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-5 h-0"
              style={{
                borderTop: `2px dashed ${ACCENT}`,
                boxShadow: `0 0 4px ${ACCENT}`,
              }}
            />
            <span>Dein Laufweg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-white" />
            <span>Ball</span>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setZoomAround(zoom + 0.5)}
            className="w-9 h-9 rounded-lg bg-black/55 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/85 active:bg-white/10"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomAround(zoom - 0.5)}
            className="w-9 h-9 rounded-lg bg-black/55 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/85 active:bg-white/10"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {zoom > 1 && (
            <button
              type="button"
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="w-9 h-9 rounded-lg bg-black/55 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/85 active:bg-white/10"
              aria-label="Reset zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Playback controls */}
      {hasMultipleSteps && (
        <div className="mt-2 flex items-center gap-2 px-2 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <button
            type="button"
            onClick={togglePlay}
            className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center active:scale-95 transition-transform"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={reset}
            className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.06] text-white/80 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto">
            {steps.map((s, i) => {
              const active = i === stepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStep(i)}
                  className={`min-w-8 h-9 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                    active
                      ? 'bg-primary text-black'
                      : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]'
                  }`}
                  aria-label={`Step ${i + 1}: ${s.label}`}
                  title={s.label}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
