import { useRef, useCallback, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Group, Line, Circle as KonvaCircle } from 'react-konva';
import type Konva from 'konva';
import { PremiumPitch } from './PremiumPitch';
import { OffensiveCornerPitch } from './OffensiveCornerPitch';
import { TeamPlayerMarker, OpponentMarker, GoalkeeperMarker, BallMarker } from './markers';
import { AnnotationLayer, DrawingPreview } from './AnnotationLayer';
import { useEditorStore } from './editorStore';
import type { Point, Annotation, AnnotationType, EditorTool } from './types';
import { snapPosition, findNearestMarker, buildMarkerRefs } from './snapUtils';
import { PITCH_ANCHORS } from './snapUtils';
import { annotationPath, interpolatePath, subPath, easeInOutQuad, distToSegment, REDUCED_MOTION } from './pathUtils';

/** Clamp one axis of the stage pan offset so the pitch never leaves the viewport. */
export function clampViewAxis(value: number, size: number, scale: number): number {
  return Math.max(size - size * scale, Math.min(0, value));
}

const MAX_ZOOM = 4;

const TOOL_HOTKEYS: Record<string, EditorTool> = {
  v: 'select',
  p: 'team_player',
  o: 'opponent',
  g: 'goalkeeper',
  b: 'ball',
  r: 'run_path',
  c: 'curved_run',
  l: 'pass_line',
  x: 'curved_cross',
  z: 'zone_circle',
  u: 'zone_rect',
  t: 'label',
  e: 'erase',
};

interface RoleData {
  id: string;
  name: string;
  startPosition?: { x?: number | null; y?: number | null } | null;
}

interface AssignmentData {
  roleId: string;
  playerId: string;
}

interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  shirtNumber?: number | null;
}

interface EditorCanvasProps {
  width: number;
  height: number;
  roles: RoleData[];
  assignments: AssignmentData[];
  players?: PlayerData[];
  activeRoleId: string | null;
  category?: string;
  readOnly?: boolean;
  compact?: boolean;
  onRoleClick: (roleId: string) => void;
  onRoleDragEnd: (roleId: string, pos: { x: number; y: number }) => void;
  onPitchClick: (pos: { x: number; y: number }) => void;
  onLabelPrompt: (pos: Point) => void;
}

export interface EditorCanvasHandle {
  toDataURL: (config?: { pixelRatio?: number; mimeType?: string }) => string;
  finishDrawing: () => void;
  getLastDrawingPointScreen: () => { x: number; y: number } | null;
}

function computePad(width: number): number {
  if (width < 600) return 10;
  if (width < 900) return 14;
  return 24;
}

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(function EditorCanvas({
  width, height, roles, assignments, players,
  activeRoleId, category = '', readOnly = false, compact = false, onRoleClick, onRoleDragEnd, onPitchClick, onLabelPrompt,
}, ref) {
  const PAD = computePad(width);
  const isCornerKick = category.includes('corner');
  const halfPitch = !isCornerKick && category.includes('free_kick');
  const pitchTheme = useEditorStore((s) => s.pitchTheme);
  const lightPitch = pitchTheme === 'light';
  const stageRef = useRef<Konva.Stage>(null);
  const [hoveredRoleId, setHoveredRoleId] = useState<string | null>(null);
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null);

  const pitchW = width - PAD * 2;
  const pitchH = height - PAD * 2;

  const toPixel = useCallback((pct: Point) => ({
    x: PAD + (pct.x / 100) * pitchW,
    y: PAD + (pct.y / 100) * pitchH,
  }), [pitchW, pitchH, PAD]);

  const toPct = useCallback((px: Point) => ({
    x: Math.max(0, Math.min(100, ((px.x - PAD) / pitchW) * 100)),
    y: Math.max(0, Math.min(100, ((px.y - PAD) / pitchH) * 100)),
  }), [pitchW, pitchH, PAD]);

  const activeTool = useEditorStore((s) => s.activeTool);
  const annotations = useEditorStore((s) => s.annotations);
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId);
  const setSelectedAnnotationId = useEditorStore((s) => s.setSelectedAnnotationId);
  const addAnnotation = useEditorStore((s) => s.addAnnotation);
  const drawingPoints = useEditorStore((s) => s.drawingPoints);
  const addDrawingPoint = useEditorStore((s) => s.addDrawingPoint);
  const clearDrawingPoints = useEditorStore((s) => s.clearDrawingPoints);
  const strokeColor = useEditorStore((s) => s.strokeColor);
  const strokeWidth = useEditorStore((s) => s.strokeWidth);
  const showArrowhead = useEditorStore((s) => s.showArrowhead);

  const entities = useEditorStore((s) => s.entities);
  const addEntity = useEditorStore((s) => s.addEntity);
  const updateEntity = useEditorStore((s) => s.updateEntity);
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const setSelectedEntityId = useEditorStore((s) => s.setSelectedEntityId);
  const deleteAnnotation = useEditorStore((s) => s.deleteAnnotation);
  const moveAnnotation = useEditorStore((s) => s.moveAnnotation);
  const updateAnnotationPoint = useEditorStore((s) => s.updateAnnotationPoint);
  const updateAnnotationRadius = useEditorStore((s) => s.updateAnnotationRadius);
  const deleteEntity = useEditorStore((s) => s.deleteEntity);

  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const showGrid = useEditorStore((s) => s.showGrid);
  const updateSnappedAnnotations = useEditorStore((s) => s.updateSnappedAnnotations);
  const layerVisibility = useEditorStore((s) => s.layerVisibility);
  const layerLocked = useEditorStore((s) => s.layerLocked);
  const setContextMenu = useEditorStore((s) => s.setContextMenu);

  const view = useEditorStore((s) => s.view);
  const setView = useEditorStore((s) => s.setView);
  const beginDrag = useEditorStore((s) => s.beginDrag);
  const snapshotBoard = useEditorStore((s) => s.snapshotBoard);

  // Live feedback while a marker is dragged: magnet target + alignment guides.
  const [dragGuides, setDragGuides] = useState<{ snap?: Point; vx?: number; hy?: number } | null>(null);

  const animation = useEditorStore((s) => s.animation);
  const setAnimationProgress = useEditorStore((s) => s.setAnimationProgress);
  const setAnimationPlaying = useEditorStore((s) => s.setAnimationPlaying);
  const steps = useEditorStore((s) => s.steps);
  const goToNextStep = useEditorStore((s) => s.goToNextStep);

  const [stepTransitionT, setStepTransitionT] = useState(1);
  const prevStepIndexRef = useRef(animation.activeStepIndex);
  const transitionFromStepRef = useRef(animation.activeStepIndex);

  useEffect(() => {
    if (prevStepIndexRef.current !== animation.activeStepIndex && !animation.playing) {
      transitionFromStepRef.current = prevStepIndexRef.current;
      prevStepIndexRef.current = animation.activeStepIndex;
      if (REDUCED_MOTION) {
        setStepTransitionT(1);
        return undefined;
      }
      setStepTransitionT(0);
      let start: number | null = null;
      let frameId: number;
      let cancelled = false;
      const duration = 300;
      const animate = (ts: number) => {
        if (cancelled) return;
        if (!start) start = ts;
        const elapsed = ts - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        setStepTransitionT(eased);
        if (t < 1) {
          frameId = requestAnimationFrame(animate);
        }
      };
      frameId = requestAnimationFrame(animate);
      return () => {
        cancelled = true;
        cancelAnimationFrame(frameId);
      };
    } else {
      prevStepIndexRef.current = animation.activeStepIndex;
    }
    return undefined;
  }, [animation.activeStepIndex, animation.playing]);

  const hasFocusedElement = activeRoleId !== null || selectedEntityId !== null;

  useEffect(() => {
    if (!animation.playing) return;
    let animFrame: number;
    let lastTime = performance.now();
    const progressRef = { current: useEditorStore.getState().animation.progress };
    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const state = useEditorStore.getState();
      const speed = state.animation.speed;
      const newProgress = progressRef.current + dt * 0.2 * speed;
      if (newProgress >= 1) {
        setAnimationProgress(1);
        if (state.animation.playMode === 'all' && state.animation.activeStepIndex < state.steps.length - 1) {
          goToNextStep();
          progressRef.current = 0;
          lastTime = now;
          animFrame = requestAnimationFrame(tick);
          return;
        }
        setAnimationPlaying(false);
        return;
      }
      progressRef.current = newProgress;
      setAnimationProgress(newProgress);
      animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [animation.playing]);


  const isDrawingTool = ['run_path', 'curved_run', 'pass_line', 'curved_cross'].includes(activeTool);
  const forceDashed = useEditorStore((s) => s.forceDashed);
  const isDashed = forceDashed || ['run_path', 'curved_run'].includes(activeTool);
  const isCurved = ['curved_run', 'curved_cross'].includes(activeTool);
  const isZoneTool = ['zone_circle', 'zone_rect'].includes(activeTool);
  const isEntityTool = ['team_player', 'opponent', 'goalkeeper', 'ball'].includes(activeTool);

  const stepPositions = useEditorStore((s) => s.stepPositions);
  const sortedStepIds = steps.map(s => s.id);

  const resolvePositionForStep = (
    roleId: string,
    stepAnns: Annotation[],
    startPos: Point,
    t: number
  ): Point => {
    const linkedRun = stepAnns.find(
      a => a.linkedRoleId === roleId && (a.type === 'run_path' || a.type === 'curved_run') && a.points.length >= 2
    );
    if (linkedRun) return interpolatePath(annotationPath(linkedRun.type, linkedRun.points), t);

    const unlinkedRuns = stepAnns.filter(
      a => !a.linkedRoleId && (a.type === 'run_path' || a.type === 'curved_run') && a.points.length >= 2
    );
    const roleIdx = roles.findIndex(r => r.id === roleId);
    const usedLinkedCount = stepAnns.filter(
      a => a.linkedRoleId && (a.type === 'run_path' || a.type === 'curved_run') && a.points.length >= 2
    ).length;
    const unlinkedIdx = roleIdx - usedLinkedCount;
    if (unlinkedIdx >= 0 && unlinkedIdx < unlinkedRuns.length) {
      const run = unlinkedRuns[unlinkedIdx];
      return interpolatePath(annotationPath(run.type, run.points), t);
    }

    return startPos;
  };

  const computeStepResolvedPosition = (roleId: string, stepIndex: number): Point => {
    const basePos = { x: (roles.find(r => r.id === roleId)?.startPosition?.x ?? 50), y: (roles.find(r => r.id === roleId)?.startPosition?.y ?? 50) };
    const clampedIndex = Math.max(0, Math.min(stepIndex, sortedStepIds.length - 1));
    if (clampedIndex === 0) {
      const sid0 = sortedStepIds[0];
      if (sid0 && stepPositions[sid0]?.[roleId]) {
        return stepPositions[sid0][roleId];
      }
      return basePos;
    }
    let cur = basePos;
    for (let i = 0; i < clampedIndex; i++) {
      const prevSid = sortedStepIds[i];
      if (prevSid && stepPositions[prevSid]?.[roleId]) {
        cur = stepPositions[prevSid][roleId];
      }
      const prevAnns = annotations.filter(a => a.stepId === prevSid);
      const endOfRun = resolvePositionForStep(roleId, prevAnns, cur, 1);
      if (endOfRun.x !== cur.x || endOfRun.y !== cur.y) cur = endOfRun;
    }
    const targetSid = sortedStepIds[clampedIndex];
    if (targetSid && stepPositions[targetSid]?.[roleId]) {
      return stepPositions[targetSid][roleId];
    }
    return cur;
  };

  const markerRefs = (() => {
    const refs = buildMarkerRefs([], entities);
    for (const role of roles) {
      const pos = computeStepResolvedPosition(role.id, animation.activeStepIndex);
      refs.push({ id: role.id, type: 'role', position: pos });
    }
    return refs;
  })();

  // Snap against the positions markers are actually displayed at (step-resolved),
  // excluding the dragged marker itself.
  const snapPos = useCallback((pos: Point, excludeId?: string) => {
    const positions = markerRefs.filter(r => r.id !== excludeId).map(r => r.position);
    return snapPosition(pos, positions, snapEnabled);
  }, [markerRefs, snapEnabled]);

  /** Live magnet + guide feedback while dragging marker `id`. Returns the
   *  position (in pct) the marker should sit at. */
  const applyDragSnap = useCallback((id: string, rawPct: Point): Point => {
    let pos = snapPos(rawPct, id);
    const snapped = pos !== rawPct;
    let vx: number | undefined;
    let hy: number | undefined;
    if (!snapped && snapEnabled) {
      // Soft axis alignment with other markers.
      for (const m of markerRefs) {
        if (m.id === id) continue;
        if (vx === undefined && Math.abs(m.position.x - pos.x) < 1) vx = m.position.x;
        if (hy === undefined && Math.abs(m.position.y - pos.y) < 1) hy = m.position.y;
      }
      if (vx !== undefined || hy !== undefined) {
        pos = { x: vx ?? pos.x, y: hy ?? pos.y };
      }
    }
    setDragGuides(snapped || vx !== undefined || hy !== undefined
      ? { snap: snapped ? pos : undefined, vx, hy }
      : null);
    return pos;
  }, [snapPos, snapEnabled, markerRefs]);

  /** Konva dragBoundFunc for markers: operates in absolute (stage-transformed)
   *  coordinates, applies magnet/alignment snapping and keeps markers on the pitch. */
  const makeDragBound = useCallback((id: string) => (absPos: { x: number; y: number }) => {
    const content = { x: (absPos.x - view.x) / view.scale, y: (absPos.y - view.y) / view.scale };
    const pct = applyDragSnap(id, toPct(content));
    const px = toPixel(pct);
    return { x: px.x * view.scale + view.x, y: px.y * view.scale + view.y };
  }, [view, toPct, toPixel, applyDragSnap]);

  const finishDrawing = useCallback(() => {
    const drawingTools = ['run_path', 'curved_run', 'pass_line', 'curved_cross'];
    if (!drawingTools.includes(activeTool)) {
      clearDrawingPoints();
      return;
    }
    if (drawingPoints.length < 2) {
      clearDrawingPoints();
      return;
    }
    const fds = useEditorStore.getState();
    if (fds.layerLocked.actions || !fds.layerVisibility.actions) {
      clearDrawingPoints();
      return;
    }
    const toolType = activeTool as AnnotationType;
    const isRunType = toolType === 'run_path' || toolType === 'curved_run';
    const isPassType = toolType === 'pass_line' || toolType === 'curved_cross';
    const semanticDashed = isRunType ? true : isPassType ? false : isDashed;
    const semanticArrowhead = isRunType || isPassType ? true : showArrowhead;

    const pts = [...drawingPoints];
    const startMarker = findNearestMarker(pts[0], markerRefs);
    const endMarker = findNearestMarker(pts[pts.length - 1], markerRefs);

    if (startMarker) pts[0] = startMarker.position;
    if (endMarker) pts[pts.length - 1] = endMarker.position;

    const ann: Annotation = {
      id: crypto.randomUUID(),
      type: toolType,
      points: pts,
      color: strokeColor,
      strokeWidth,
      dashed: semanticDashed,
      arrowhead: semanticArrowhead,
      layerOrder: annotations.length,
      snappedStartRef: startMarker?.id,
      snappedEndRef: endMarker?.id,
    };

    if (isRunType && startMarker?.type === 'role' && !ann.linkedRoleId) {
      ann.linkedRoleId = startMarker.id;
    }

    addAnnotation(ann);
    clearDrawingPoints();
    setCursorPoint(null);
  }, [drawingPoints, activeTool, strokeColor, strokeWidth, isDashed, showArrowhead, annotations.length, addAnnotation, clearDrawingPoints, markerRefs]);

  useImperativeHandle(ref, () => ({
    toDataURL: (config) => {
      const stage = stageRef.current;
      if (!stage) return '';
      // Export the un-zoomed board regardless of the current viewport.
      const prev = { x: stage.x(), y: stage.y(), scaleX: stage.scaleX(), scaleY: stage.scaleY() };
      stage.position({ x: 0, y: 0 });
      stage.scale({ x: 1, y: 1 });
      const url = stage.toDataURL({ pixelRatio: config?.pixelRatio ?? 2, mimeType: config?.mimeType ?? 'image/png' });
      stage.position({ x: prev.x, y: prev.y });
      stage.scale({ x: prev.scaleX, y: prev.scaleY });
      return url;
    },
    finishDrawing,
    getLastDrawingPointScreen: () => {
      const pts = useEditorStore.getState().drawingPoints;
      if (pts.length === 0) return null;
      const lastPt = pts[pts.length - 1];
      const px = toPixel(lastPt);
      const container = stageRef.current?.container();
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const v = useEditorStore.getState().view;
      return { x: rect.left + px.x * v.scale + v.x, y: rect.top + px.y * v.scale + v.y };
    },
  }), [finishDrawing, toPixel]);

  // Pointer position in stage-content coordinates (zoom/pan aware).
  const contentPointer = useCallback((): Point | null => {
    const pos = stageRef.current?.getRelativePointerPosition();
    return pos ?? null;
  }, []);

  const pinchRef = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    const v = useEditorStore.getState().view;
    const factor = e.evt.deltaY < 0 ? 1.08 : 1 / 1.08;
    const scale = Math.max(1, Math.min(MAX_ZOOM, v.scale * factor));
    if (scale === 1) {
      setView({ scale: 1, x: 0, y: 0 });
      return;
    }
    const mx = (pointer.x - v.x) / v.scale;
    const my = (pointer.y - v.y) / v.scale;
    setView({
      scale,
      x: clampViewAxis(pointer.x - mx * scale, width, scale),
      y: clampViewAxis(pointer.y - my * scale, height, scale),
    });
  }, [setView, width, height]);

  const handlePinch = useCallback((e: Konva.KonvaEventObject<TouchEvent>): boolean => {
    const touches = e.evt.touches;
    if (touches.length !== 2) {
      pinchRef.current = null;
      return false;
    }
    e.evt.preventDefault();
    const rect = stageRef.current?.container().getBoundingClientRect();
    if (!rect) return true;
    const [a, b] = [touches[0], touches[1]];
    const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const center = {
      x: (a.clientX + b.clientX) / 2 - rect.left,
      y: (a.clientY + b.clientY) / 2 - rect.top,
    };
    const prev = pinchRef.current;
    pinchRef.current = { dist, center };
    if (!prev) return true;
    const v = useEditorStore.getState().view;
    const scale = Math.max(1, Math.min(MAX_ZOOM, v.scale * (dist / prev.dist)));
    if (scale === 1) {
      setView({ scale: 1, x: 0, y: 0 });
      return true;
    }
    const mx = (prev.center.x - v.x) / v.scale;
    const my = (prev.center.y - v.y) / v.scale;
    // Zoom around the pinch center, panning with the moving midpoint.
    setView({
      scale,
      x: clampViewAxis(center.x - mx * scale, width, scale),
      y: clampViewAxis(center.y - my * scale, height, scale),
    });
    return true;
  }, [setView, width, height]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if ('touches' in e.evt && handlePinch(e as Konva.KonvaEventObject<TouchEvent>)) return;
    if (!isDrawingTool || readOnly) {
      if (cursorPoint) setCursorPoint(null);
      return;
    }
    const pos = contentPointer();
    if (!pos) return;
    setCursorPoint(toPct(pos));
  }, [isDrawingTool, readOnly, toPct, cursorPoint, contentPointer, handlePinch]);

  const handleStageInteraction = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (readOnly) return;
    const isBackground = e.target === stageRef.current || e.target.name() === 'pitch-bg';
    const pos = contentPointer();
    if (!pos) return;
    const pct = toPct(pos);

    if (activeTool === 'select') {
      if (isBackground) {
        setSelectedAnnotationId(null);
        setSelectedEntityId(null);
        const ts = useEditorStore.getState();
        if (!ts.layerLocked.team && ts.layerVisibility.team) {
          onPitchClick(pct);
        }
      }
      return;
    }

    if (activeTool === 'erase') {
      // Hit-test in pixel space against the actual drawn geometry (segments,
      // circle edges, rect bounds) — not just the stored control points.
      const HIT_PX = 14;
      const ENTITY_HIT_PX = 22;
      const cursor = pos;
      const state = useEditorStore.getState();
      const lv = state.layerVisibility;
      const ll = state.layerLocked;
      const currentStepId = state.steps[state.animation.activeStepIndex]?.id;
      const visibleAnns = (currentStepId ? state.annotations.filter(a => a.stepId === currentStepId) : state.annotations)
        .filter(a => {
          if (['run_path', 'curved_run', 'pass_line', 'curved_cross'].includes(a.type)) return lv.actions && !ll.actions;
          if (['zone_circle', 'zone_rect'].includes(a.type)) return lv.zones && !ll.zones;
          if (a.type === 'label') return lv.labels && !ll.labels;
          return true;
        });

      let best: { d: number; del: () => void } | null = null;
      const consider = (d: number, limit: number, del: () => void) => {
        if (d <= limit && (!best || d < best.d)) best = { d, del };
      };

      for (const ann of visibleAnns) {
        if (ann.type === 'zone_circle' && ann.points.length >= 1) {
          const c = toPixel(ann.points[0]);
          const r = ((ann.radius ?? 10) / 100) * Math.min(pitchW, pitchH);
          consider(Math.max(0, Math.hypot(cursor.x - c.x, cursor.y - c.y) - r), HIT_PX, () => deleteAnnotation(ann.id));
        } else if (ann.type === 'zone_rect' && ann.points.length >= 2) {
          const p1 = toPixel(ann.points[0]);
          const p2 = toPixel(ann.points[1]);
          const dx = Math.max(Math.min(p1.x, p2.x) - cursor.x, 0, cursor.x - Math.max(p1.x, p2.x));
          const dy = Math.max(Math.min(p1.y, p2.y) - cursor.y, 0, cursor.y - Math.max(p1.y, p2.y));
          consider(Math.hypot(dx, dy), HIT_PX, () => deleteAnnotation(ann.id));
        } else if (ann.type === 'label' && ann.points.length >= 1) {
          const p = toPixel(ann.points[0]);
          consider(Math.hypot(cursor.x - p.x, cursor.y - p.y), ENTITY_HIT_PX, () => deleteAnnotation(ann.id));
        } else if (ann.points.length >= 2) {
          const px = annotationPath(ann.type, ann.points).map(toPixel);
          for (let i = 1; i < px.length; i++) {
            consider(distToSegment(cursor, px[i - 1], px[i]), HIT_PX, () => deleteAnnotation(ann.id));
          }
        }
      }
      for (const ent of state.entities) {
        const layerKey = ent.type === 'opponent' ? 'opponents' as const : ent.type === 'ball' ? 'ball' as const : 'team' as const;
        if (!lv[layerKey] || ll[layerKey]) continue;
        const p = toPixel(ent.position);
        consider(Math.hypot(cursor.x - p.x, cursor.y - p.y), ENTITY_HIT_PX, () => deleteEntity(ent.id));
      }
      (best as { d: number; del: () => void } | null)?.del();
      return;
    }

    if (activeTool === 'label') {
      const ls = useEditorStore.getState();
      if (ls.layerLocked.labels || !ls.layerVisibility.labels) return;
      onLabelPrompt(pct);
      return;
    }

    if (isEntityTool && isBackground) {
      const ls = useEditorStore.getState();
      if (activeTool === 'team_player') {
        if (ls.layerLocked.team || !ls.layerVisibility.team) return;
        onPitchClick(pct);
        return;
      }
      const entType = activeTool === 'ball' ? 'ball' : activeTool === 'goalkeeper' ? 'goalkeeper' : 'opponent';
      const entLayerKey = entType === 'opponent' ? 'opponents' : entType === 'ball' ? 'ball' : 'team';
      if (ls.layerLocked[entLayerKey as keyof typeof ls.layerLocked] || !ls.layerVisibility[entLayerKey as keyof typeof ls.layerVisibility]) return;
      addEntity({
        id: crypto.randomUUID(),
        type: entType,
        position: pct,
        shirtNumber: activeTool === 'goalkeeper' ? 1 : undefined,
      });
      return;
    }

    if (isDrawingTool) {
      const ds = useEditorStore.getState();
      if (ds.layerLocked.actions || !ds.layerVisibility.actions) return;
      addDrawingPoint(pct);
      return;
    }

    if (activeTool === 'zone_circle' && isBackground) {
      const zs = useEditorStore.getState();
      if (zs.layerLocked.zones || !zs.layerVisibility.zones) return;
      const ann: Annotation = {
        id: crypto.randomUUID(),
        type: 'zone_circle',
        points: [pct],
        color: strokeColor,
        strokeWidth,
        dashed: true,
        arrowhead: false,
        radius: 8,
        layerOrder: annotations.length,
      };
      addAnnotation(ann);
      return;
    }

    if (activeTool === 'zone_rect') {
      const zrs = useEditorStore.getState();
      if (zrs.layerLocked.zones || !zrs.layerVisibility.zones) return;
      if (drawingPoints.length === 0) {
        addDrawingPoint(pct);
      } else {
        const ann: Annotation = {
          id: crypto.randomUUID(),
          type: 'zone_rect',
          points: [drawingPoints[0], pct],
          color: strokeColor,
          strokeWidth,
          dashed: true,
          arrowhead: false,
          layerOrder: annotations.length,
        };
        addAnnotation(ann);
        clearDrawingPoints();
      }
      return;
    }
  }, [activeTool, toPct, onPitchClick, strokeColor, strokeWidth, showArrowhead, annotations, entities,
    drawingPoints, addDrawingPoint, clearDrawingPoints, addAnnotation, addEntity,
    setSelectedAnnotationId, setSelectedEntityId, isDrawingTool, isEntityTool, onLabelPrompt,
    deleteAnnotation, deleteEntity, readOnly]);

  const handleDblClick = useCallback(() => {
    if (readOnly) return;
    if (isDrawingTool && drawingPoints.length >= 2) {
      finishDrawing();
    }
  }, [readOnly, isDrawingTool, drawingPoints.length, finishDrawing]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      if (readOnly || useEditorStore.getState().presentationMode) return;
      const state = useEditorStore.getState();

      if (e.key === 'Enter' && isDrawingTool && drawingPoints.length >= 2) {
        finishDrawing();
        return;
      }
      if (e.key === 'Escape') {
        clearDrawingPoints();
        setSelectedAnnotationId(null);
        setSelectedEntityId(null);
        return;
      }
      // While drawing, Backspace removes only the last placed point.
      if (e.key === 'Backspace' && isDrawingTool && state.drawingPoints.length > 0) {
        e.preventDefault();
        state.setDrawingPoints(state.drawingPoints.slice(0, -1));
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedAnnotationId) deleteAnnotation(state.selectedAnnotationId);
        if (state.selectedEntityId) deleteEntity(state.selectedEntityId);
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        setAnimationPlaying(!state.animation.playing);
        return;
      }
      // Arrow-key nudge for the selected element (Shift = coarse).
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
          (state.selectedEntityId || state.selectedAnnotationId)) {
        e.preventDefault();
        const step = e.shiftKey ? 2 : 0.5;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        state.snapshotBoard();
        if (state.selectedEntityId) {
          const ent = state.entities.find(en => en.id === state.selectedEntityId);
          if (ent) {
            updateEntity(ent.id, {
              position: {
                x: Math.max(0, Math.min(100, ent.position.x + dx)),
                y: Math.max(0, Math.min(100, ent.position.y + dy)),
              },
            });
          }
        } else if (state.selectedAnnotationId) {
          moveAnnotation(state.selectedAnnotationId, dx, dy);
        }
        return;
      }
      // Single-letter tool shortcuts.
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const tool = TOOL_HOTKEYS[e.key.toLowerCase()];
        if (tool) {
          state.setActiveTool(tool);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [readOnly, isDrawingTool, drawingPoints.length, finishDrawing, clearDrawingPoints,
    setSelectedAnnotationId, setSelectedEntityId, deleteAnnotation, deleteEntity,
    setAnimationPlaying, updateEntity, moveAnnotation]);

  const activeStep = steps[animation.activeStepIndex];
  const activeStepId = activeStep?.id;

  const stepAnnotations = activeStepId
    ? annotations.filter(a => a.stepId === activeStepId)
    : annotations;

  const isPlaying = animation.playing || animation.progress > 0;
  const isAllMode = animation.playMode === 'all';

  const priorStepAnnotations = (isPlaying && isAllMode)
    ? annotations.filter(a => {
        if (!a.stepId) return false;
        const stepIdx = sortedStepIds.indexOf(a.stepId);
        return stepIdx >= 0 && stepIdx < animation.activeStepIndex;
      })
    : [];

  const playbackAnnotations = isPlaying && isAllMode
    ? [...priorStepAnnotations, ...stepAnnotations]
    : stepAnnotations;

  const lerpPoint = (a: Point, b: Point, t: number): Point => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });

  const safePoint = (p: Point): Point => ({
    x: Number.isFinite(p.x) ? p.x : 50,
    y: Number.isFinite(p.y) ? p.y : 50,
  });

  const getAnimatedPosition = (roleId: string, role: RoleData): Point => {
    const roleStartPos = { x: role.startPosition?.x ?? 50, y: role.startPosition?.y ?? 50 };
    if (!animation.playing && animation.progress === 0) {
      const target = safePoint(computeStepResolvedPosition(roleId, animation.activeStepIndex));
      if (stepTransitionT < 1) {
        const clampedFrom = Math.min(transitionFromStepRef.current, steps.length - 1);
        const from = safePoint(computeStepResolvedPosition(roleId, Math.max(0, clampedFrom)));
        return lerpPoint(from, target, stepTransitionT);
      }
      return target;
    }

    let currentPos = roleStartPos;

    if (isAllMode && isPlaying) {
      for (let i = 0; i < animation.activeStepIndex; i++) {
        const sid = sortedStepIds[i];
        if (sid && stepPositions[sid]?.[roleId]) {
          currentPos = stepPositions[sid][roleId];
        }
        const completedAnns = annotations.filter(a => a.stepId === sid);
        currentPos = resolvePositionForStep(roleId, completedAnns, currentPos, 1);
      }
      const curSid = sortedStepIds[animation.activeStepIndex];
      if (curSid && stepPositions[curSid]?.[roleId]) {
        currentPos = stepPositions[curSid][roleId];
      }
    } else {
      currentPos = computeStepResolvedPosition(roleId, animation.activeStepIndex);
    }

    // Ease-in/out so runs accelerate and decelerate like real movement.
    return safePoint(resolvePositionForStep(roleId, stepAnnotations, currentPos, easeInOutQuad(animation.progress)));
  };

  interface BallFlight {
    pos: Point;
    /** Eased progress along the CURRENT step's pass (1 for completed steps). */
    t: number;
    /** The pass annotation the ball is currently traveling on, if any. */
    ann: Annotation | null;
  }

  const getBallFlight = (): BallFlight | null => {
    if (!animation.playing && animation.progress === 0) return null;
    const easedProgress = easeInOutQuad(animation.progress);

    if (isAllMode && isPlaying) {
      let flight: BallFlight | null = null;
      for (let i = 0; i <= animation.activeStepIndex; i++) {
        const sid = sortedStepIds[i];
        const anns = annotations.filter(a => a.stepId === sid);
        const passAnns = anns.filter(
          a => (a.type === 'pass_line' || a.type === 'curved_cross') && a.points.length >= 2
        );
        if (passAnns.length > 0) {
          const t = i < animation.activeStepIndex ? 1 : easedProgress;
          const ann = passAnns[0];
          flight = { pos: interpolatePath(annotationPath(ann.type, ann.points), t), t, ann };
        }
      }
      return flight;
    }

    const passAnns = stepAnnotations.filter(
      a => (a.type === 'pass_line' || a.type === 'curved_cross') && a.points.length >= 2
    );
    if (passAnns.length === 0) return null;
    const ann = passAnns[0];
    return { pos: interpolatePath(annotationPath(ann.type, ann.points), easedProgress), t: easedProgress, ann };
  };

  const handleContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    if (readOnly) return;
    const state = useEditorStore.getState();
    if (state.selectedAnnotationId) {
      setContextMenu({
        x: e.evt.clientX,
        y: e.evt.clientY,
        targetType: 'annotation',
        targetId: state.selectedAnnotationId,
      });
      return;
    }
    if (state.selectedEntityId) {
      setContextMenu({
        x: e.evt.clientX,
        y: e.evt.clientY,
        targetType: 'entity',
        targetId: state.selectedEntityId,
      });
    }
  }, [setContextMenu, readOnly]);

  const filteredAnnotations = playbackAnnotations.filter(a => {
    if (['run_path', 'curved_run', 'pass_line', 'curved_cross'].includes(a.type) && !layerVisibility.actions) return false;
    if (['zone_circle', 'zone_rect'].includes(a.type) && !layerVisibility.zones) return false;
    if (a.type === 'label' && !layerVisibility.labels) return false;
    return true;
  });

  const gridColor = lightPitch ? '#0f172a' : '#ffffff';

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={view.scale}
      scaleY={view.scale}
      x={view.x}
      y={view.y}
      draggable={!readOnly && view.scale > 1 && activeTool === 'select'}
      dragBoundFunc={(pos) => ({
        x: clampViewAxis(pos.x, width, view.scale),
        y: clampViewAxis(pos.y, height, view.scale),
      })}
      onDragEnd={(e) => {
        if (e.target === stageRef.current) {
          setView({ scale: view.scale, x: e.target.x(), y: e.target.y() });
        }
      }}
      onClick={handleStageInteraction}
      onTap={handleStageInteraction}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      onTouchEnd={() => { pinchRef.current = null; }}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      style={{ cursor: isDrawingTool ? 'crosshair' : isEntityTool ? 'cell' : activeTool === 'erase' ? 'not-allowed' : 'default', touchAction: 'none' }}
    >
      <Layer>
        {isCornerKick ? (
          <OffensiveCornerPitch width={width} height={height} pad={PAD} theme={pitchTheme} />
        ) : (
          <PremiumPitch width={width} height={height} halfPitch={halfPitch} pad={PAD} theme={pitchTheme} />
        )}
      </Layer>

      {showGrid && (
        <Layer listening={false} opacity={lightPitch ? 0.25 : 0.15}>
          {Array.from({ length: 11 }, (_, i) => {
            const x = PAD + (i * 10 / 100) * pitchW;
            return <Line key={`gv${i}`} points={[x, PAD, x, PAD + pitchH]} stroke={gridColor} strokeWidth={0.5} />;
          })}
          {Array.from({ length: 11 }, (_, i) => {
            const y = PAD + (i * 10 / 100) * pitchH;
            return <Line key={`gh${i}`} points={[PAD, y, PAD + pitchW, y]} stroke={gridColor} strokeWidth={0.5} />;
          })}
          {PITCH_ANCHORS.map((a, i) => {
            const px = toPixel(a.pos);
            return <KonvaCircle key={`sa${i}`} x={px.x} y={px.y} radius={3} fill="#10b981" opacity={0.6} />;
          })}
        </Layer>
      )}

      {dragGuides && (
        <Layer listening={false}>
          {dragGuides.vx !== undefined && (
            <Line points={[toPixel({ x: dragGuides.vx, y: 0 }).x, PAD, toPixel({ x: dragGuides.vx, y: 0 }).x, PAD + pitchH]} stroke="#10b981" strokeWidth={1} dash={[4, 4]} opacity={0.7} />
          )}
          {dragGuides.hy !== undefined && (
            <Line points={[PAD, toPixel({ x: 0, y: dragGuides.hy }).y, PAD + pitchW, toPixel({ x: 0, y: dragGuides.hy }).y]} stroke="#10b981" strokeWidth={1} dash={[4, 4]} opacity={0.7} />
          )}
          {dragGuides.snap && (
            <KonvaCircle x={toPixel(dragGuides.snap).x} y={toPixel(dragGuides.snap).y} radius={22} stroke="#10b981" strokeWidth={2} dash={[4, 3]} opacity={0.8} />
          )}
        </Layer>
      )}

      {/* While erasing, shapes must not swallow clicks — the stage handler
          does the hit-testing and deletion. */}
      <Layer listening={activeTool !== 'erase'}>
        <AnnotationLayer
          annotations={filteredAnnotations}
          selectedId={selectedAnnotationId}
          focusedRoleId={activeRoleId}
          hasFocusedElement={hasFocusedElement}
          onSelect={readOnly ? () => {} : setSelectedAnnotationId}
          onMove={moveAnnotation}
          onUpdatePoint={updateAnnotationPoint}
          onUpdateRadius={updateAnnotationRadius}
          toPixel={toPixel}
          toPct={toPct}
          pitchW={pitchW}
          pitchH={pitchH}
          pad={PAD}
          readOnly={readOnly}
          lockedTypes={{ actions: layerLocked.actions, zones: layerLocked.zones, labels: layerLocked.labels }}
        />

        {isDrawingTool && drawingPoints.length >= 1 && (() => {
          const startSnap = findNearestMarker(drawingPoints[0], markerRefs);
          const endSnap = drawingPoints.length >= 2 ? findNearestMarker(drawingPoints[drawingPoints.length - 1], markerRefs) : null;
          const startSnapPx = startSnap ? toPixel(startSnap.position) : null;
          const endSnapPx = endSnap ? toPixel(endSnap.position) : null;
          return (
            <>
              {startSnapPx && (
                <KonvaCircle x={startSnapPx.x} y={startSnapPx.y} radius={20} stroke="#10b981" strokeWidth={2} opacity={0.7} dash={[4, 3]} />
              )}
              {endSnapPx && (
                <KonvaCircle x={endSnapPx.x} y={endSnapPx.y} radius={20} stroke="#10b981" strokeWidth={2} opacity={0.7} dash={[4, 3]} />
              )}
              <DrawingPreview
                points={drawingPoints}
                cursorPoint={cursorPoint}
                toPixel={toPixel}
                color={strokeColor}
                strokeWidth={strokeWidth}
                dashed={isDashed}
                curved={isCurved}
                arrowhead={showArrowhead}
              />
            </>
          );
        })()}
      </Layer>

      <Layer listening={activeTool !== 'erase'}>
        {entities.map((ent) => {
          const layerKey = ent.type === 'opponent' ? 'opponents' : ent.type === 'ball' ? 'ball' : 'team';
          if (!layerVisibility[layerKey]) return null;
          const isLocked = layerLocked[layerKey];

          const px = toPixel(ent.position);
          const isSelected = ent.id === selectedEntityId;
          const isDimmed = hasFocusedElement && !isSelected;

          const canInteract = !readOnly && !isLocked;

          const entityDragProps = canInteract ? {
            dragBoundFunc: makeDragBound(ent.id),
            onDragStart: () => snapshotBoard(),
            onDragMove: (pos: Point) => {
              updateSnappedAnnotations(ent.id, toPct(pos), activeStepId);
            },
            onDragEnd: (pos: Point) => {
              setDragGuides(null);
              const newPct = toPct(pos);
              updateSnappedAnnotations(ent.id, newPct, activeStepId);
              updateEntity(ent.id, { position: newPct });
            },
          } : {};

          if (ent.type === 'opponent') {
            return (
              <OpponentMarker
                key={ent.id}
                x={px.x} y={px.y}
                isSelected={isSelected}
                isDimmed={isDimmed}
                shirtNumber={ent.shirtNumber}
                label={ent.label}
                lightPitch={lightPitch}
                draggable={canInteract}
                {...entityDragProps}
                onClick={() => canInteract && setSelectedEntityId(ent.id)}
                onTap={() => canInteract && setSelectedEntityId(ent.id)}
              />
            );
          }

          if (ent.type === 'goalkeeper') {
            return (
              <GoalkeeperMarker
                key={ent.id}
                x={px.x} y={px.y}
                isSelected={isSelected}
                isDimmed={isDimmed}
                shirtNumber={ent.shirtNumber}
                label={ent.label}
                lightPitch={lightPitch}
                draggable={canInteract}
                {...entityDragProps}
                onClick={() => canInteract && setSelectedEntityId(ent.id)}
                onTap={() => canInteract && setSelectedEntityId(ent.id)}
              />
            );
          }

          if (ent.type === 'ball') {
            const flight = getBallFlight();
            const ballPx = flight ? toPixel(flight.pos) : px;
            // Lofted crosses get a flight-arc illusion: the ball grows toward
            // mid-flight and lands back at normal size.
            const inFlight = flight && flight.t > 0 && flight.t < 1;
            const flightScale = inFlight && flight.ann?.type === 'curved_cross'
              ? 1 + 0.35 * Math.sin(Math.PI * flight.t)
              : 1;
            const trail = inFlight && flight.ann
              ? subPath(annotationPath(flight.ann.type, flight.ann.points), flight.t)
              : null;
            return (
              <Group key={ent.id}>
                {trail && trail.length >= 2 && (
                  <Line
                    listening={false}
                    points={trail.flatMap(p => { const tp = toPixel(p); return [tp.x, tp.y]; })}
                    stroke={lightPitch ? '#334155' : '#ffffff'}
                    strokeWidth={2.5}
                    lineCap="round"
                    lineJoin="round"
                    opacity={0.3}
                  />
                )}
                <BallMarker
                  x={ballPx.x} y={ballPx.y}
                  flightScale={flightScale}
                  isSelected={isSelected}
                  isDimmed={isDimmed}
                  lightPitch={lightPitch}
                  draggable={canInteract && !inFlight}
                  {...(canInteract && !inFlight ? entityDragProps : {})}
                  onClick={() => canInteract && setSelectedEntityId(ent.id)}
                  onTap={() => canInteract && setSelectedEntityId(ent.id)}
                />
              </Group>
            );
          }
          return null;
        })}

        {/* Onion-skin: ghost of each role's previous-step position while editing later steps. */}
        {layerVisibility.team && animation.activeStepIndex > 0 && !isPlaying && stepTransitionT >= 1 && (
          <Group listening={false}>
            {roles.map((role) => {
              const cur = computeStepResolvedPosition(role.id, animation.activeStepIndex);
              const prev = computeStepResolvedPosition(role.id, animation.activeStepIndex - 1);
              if (Math.hypot(cur.x - prev.x, cur.y - prev.y) < 0.5) return null;
              const prevPx = toPixel(prev);
              const curPx = toPixel(cur);
              const ghostColor = lightPitch ? '#475569' : '#94a3b8';
              return (
                <Group key={`ghost-${role.id}`} opacity={0.28}>
                  <Line points={[prevPx.x, prevPx.y, curPx.x, curPx.y]} stroke={ghostColor} strokeWidth={1} dash={[3, 5]} opacity={0.6} />
                  <KonvaCircle x={prevPx.x} y={prevPx.y} radius={13} stroke={ghostColor} strokeWidth={1.5} dash={[4, 3]} />
                </Group>
              );
            })}
          </Group>
        )}

        {layerVisibility.team && roles.map((role) => {
          const pct = getAnimatedPosition(role.id, role);
          const px = toPixel(pct);
          const isActive = role.id === activeRoleId;
          const assignment = assignments.find(a => a.roleId === role.id);
          const player = assignment ? players?.find(p => p.id === assignment.playerId) : null;
          const isUnassigned = !assignment;
          const isDimmed = hasFocusedElement && !isActive;
          const isLocked = layerLocked.team;
          const roleInteractive = !readOnly && !isLocked;

          const compactLabel = compact ? undefined : role.name;
          const compactLastName = compact
            ? (player ? (player.lastName.length > 6 ? player.lastName.slice(0, 5) + '.' : player.lastName) : undefined)
            : player?.lastName;

          return (
            <TeamPlayerMarker
              key={role.id}
              x={px.x}
              y={px.y}
              isSelected={isActive}
              isHovered={role.id === hoveredRoleId}
              isDimmed={isDimmed}
              isUnassigned={isUnassigned}
              shirtNumber={player?.shirtNumber ?? undefined}
              lastName={compactLastName}
              label={compactLabel}
              lightPitch={lightPitch}
              draggable={roleInteractive}
              dragBoundFunc={roleInteractive ? makeDragBound(role.id) : undefined}
              onDragStart={roleInteractive ? () => beginDrag() : undefined}
              onDragMove={roleInteractive ? (pos) => {
                updateSnappedAnnotations(role.id, toPct(pos), activeStepId);
              } : undefined}
              onDragEnd={roleInteractive ? (pos) => {
                setDragGuides(null);
                const newPct = toPct(pos);
                updateSnappedAnnotations(role.id, newPct, activeStepId);
                onRoleDragEnd(role.id, newPct);
              } : undefined}
              onClick={() => roleInteractive && onRoleClick(role.id)}
              onTap={() => roleInteractive && onRoleClick(role.id)}
              onMouseEnter={() => setHoveredRoleId(role.id)}
              onMouseLeave={() => setHoveredRoleId(null)}
            />
          );
        })}
      </Layer>
    </Stage>
  );
});
