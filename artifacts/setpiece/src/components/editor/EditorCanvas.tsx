import { useRef, useMemo, useCallback, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Group, Line, Circle as KonvaCircle } from 'react-konva';
import type Konva from 'konva';
import { PremiumPitch } from './PremiumPitch';
import { OffensiveCornerPitch } from './OffensiveCornerPitch';
import { TeamPlayerMarker, OpponentMarker, GoalkeeperMarker, BallMarker } from './markers';
import { AnnotationLayer, AnnotationHandles, DrawingPreview } from './AnnotationLayer';
import { useEditorStore } from './editorStore';
import type { Point, Annotation, AnnotationType, EditorTool, EntityMarker } from './types';
import { entityPositionAtStep, finalizeDrawingPoints, findBallPass, findRoleRun, moveAnnotationGeometry, rolePositionAtStep } from './editorInteraction';
import { editorKeyboardBlocked } from './keyboardScope';
import { snapPosition, findNearestMarker, type MarkerRef } from './snapUtils';
import { buildPitchAnchors } from './snapUtils';
import { buildPitchGeometry, pitchOrientationForCategory } from '@/utils/pitchGeometry';
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
  getStage: () => Konva.Stage | null;
  pointToScreen: (point: Point) => Point | null;
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
  const orientation = pitchOrientationForCategory(category);
  const halfPitch = orientation === 'half';
  const pitchTheme = useEditorStore((s) => s.pitchTheme);
  const lightPitch = pitchTheme === 'light';
  const stageRef = useRef<Konva.Stage>(null);
  const [hoveredRoleId, setHoveredRoleId] = useState<string | null>(null);
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null);

  useEffect(() => {
    const container = stageRef.current?.container();
    if (!container || readOnly) return;
    container.tabIndex = 0;
    container.setAttribute('aria-label', 'Taktikfeld');
  }, [readOnly]);

  const geometry = useMemo(() => buildPitchGeometry({ width, height, pad: PAD, orientation }), [width, height, PAD, orientation]);
  const { pitchW, pitchH, boundary } = geometry;
  const toPixel = geometry.percentToPixel;
  const toPct = geometry.pixelToPercent;
  const pitchAnchors = useMemo(() => buildPitchAnchors(geometry), [geometry]);

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
  const entityStepPositions = useEditorStore((s) => s.entityStepPositions);
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
  const activeVariantId = useEditorStore((s) => s.activeVariantId);
  const goToNextStep = useEditorStore((s) => s.goToNextStep);

  const [stepTransitionT, setStepTransitionT] = useState(1);
  const prevStepIndexRef = useRef(animation.activeStepIndex);
  const prevVariantIdRef = useRef(activeVariantId);
  const transitionFromStepRef = useRef(animation.activeStepIndex);

  useEffect(() => {
    if (prevVariantIdRef.current !== activeVariantId || animation.playing) {
      prevVariantIdRef.current = activeVariantId;
      prevStepIndexRef.current = animation.activeStepIndex;
      setStepTransitionT(1);
      return;
    }
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
  }, [activeVariantId, animation.activeStepIndex, animation.playing]);

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
  const activeStepId = sortedStepIds[animation.activeStepIndex];

  const computeStepResolvedPosition = (role: RoleData, stepIndex: number): Point =>
    rolePositionAtStep(role, stepIndex, steps, annotations, stepPositions);

  const markerRefs: MarkerRef[] = [
    ...entities.map((entity): MarkerRef => ({ id: entity.id, type: 'entity',
      position: entityPositionAtStep(entity, activeStepId, entityStepPositions) })),
    ...roles.map((role): MarkerRef => ({ id: role.id, type: 'role',
      position: computeStepResolvedPosition(role, animation.activeStepIndex) })),
  ];

  // Snap against the positions markers are actually displayed at (step-resolved),
  // excluding the dragged marker itself.
  const snapPos = useCallback((pos: Point, excludeId?: string) => {
    const positions = markerRefs.filter(r => r.id !== excludeId).map(r => r.position);
    return snapPosition(pos, positions, snapEnabled, undefined, pitchAnchors);
  }, [markerRefs, snapEnabled, pitchAnchors]);

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

  const finishDrawing = useCallback((completedPoints?: Point[]) => {
    const points = completedPoints ?? useEditorStore.getState().drawingPoints;
    const drawingTools = ['run_path', 'curved_run', 'pass_line', 'curved_cross'];
    if (!drawingTools.includes(activeTool)) {
      clearDrawingPoints();
      return;
    }
    if (points.length < 2) {
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

    const binding = finalizeDrawingPoints(points, markerRefs, snapEnabled, isRunType);

    const ann: Annotation = {
      id: crypto.randomUUID(),
      type: toolType,
      ...binding,
      color: strokeColor,
      strokeWidth,
      dashed: semanticDashed,
      arrowhead: semanticArrowhead,
      layerOrder: annotations.length,
    };

    addAnnotation(ann);
    clearDrawingPoints();
    setCursorPoint(null);
  }, [drawingPoints, activeTool, strokeColor, strokeWidth, isDashed, showArrowhead, annotations.length, addAnnotation, clearDrawingPoints, markerRefs, snapEnabled]);

  const pointToScreen = useCallback((point: Point): Point | null => {
    const container = stageRef.current?.container();
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const px = toPixel(point);
    const v = useEditorStore.getState().view;
    return { x: rect.left + px.x * v.scale + v.x, y: rect.top + px.y * v.scale + v.y };
  }, [toPixel]);

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
    getStage: () => stageRef.current,
    getLastDrawingPointScreen: () => {
      const pts = useEditorStore.getState().drawingPoints;
      if (pts.length === 0) return null;
      return pointToScreen(pts[pts.length - 1]);
    },
    pointToScreen,
  }), [finishDrawing, pointToScreen]);

  // Pointer position in stage-content coordinates (zoom/pan aware).
  const contentPointer = useCallback((): Point | null => {
    const pos = stageRef.current?.getRelativePointerPosition();
    return pos ?? null;
  }, []);

  const pinchRef = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);
  const drawingGestureRef = useRef<{ start: Point; screenStart: Point; dragged: boolean } | null>(null);
  const suppressDrawingClickRef = useRef(false);

  // Straight actions support both a quick drag and the accessible two-click flow.
  // No board snapshot is taken until the finished annotation is added.
  const handleDrawingStart = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!readOnly) stageRef.current?.container().focus({ preventScroll: true });
    suppressDrawingClickRef.current = false;
    if (readOnly || !['run_path', 'pass_line'].includes(activeTool)) return;
    if ('button' in e.evt && e.evt.button !== 0) return;
    if ('touches' in e.evt && e.evt.touches.length !== 1) return;
    const state = useEditorStore.getState();
    if (state.drawingPoints.length || state.layerLocked.actions || !state.layerVisibility.actions) return;
    const position = contentPointer();
    const screenStart = stageRef.current?.getPointerPosition();
    if (!position || !screenStart || !geometry.containsPoint(position)) return;
    drawingGestureRef.current = { start: toPct(position), screenStart, dragged: false };
  }, [activeTool, readOnly, contentPointer, geometry, toPct]);

  const cancelDrawingGesture = useCallback(() => {
    if (drawingGestureRef.current?.dragged) clearDrawingPoints();
    drawingGestureRef.current = null;
    setCursorPoint(null);
  }, [clearDrawingPoints]);

  const handleDrawingEnd = useCallback(() => {
    pinchRef.current = null;
    const gesture = drawingGestureRef.current;
    drawingGestureRef.current = null;
    if (!gesture?.dragged) return;
    suppressDrawingClickRef.current = true;
    const position = contentPointer();
    if (!position || !geometry.containsPoint(position)) {
      clearDrawingPoints();
      setCursorPoint(null);
      return;
    }
    finishDrawing([gesture.start, toPct(position)]);
  }, [contentPointer, geometry, toPct, finishDrawing, clearDrawingPoints]);

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
    if ('touches' in e.evt && handlePinch(e as Konva.KonvaEventObject<TouchEvent>)) {
      cancelDrawingGesture();
      return;
    }
    if (!isDrawingTool || readOnly) {
      if (cursorPoint) setCursorPoint(null);
      return;
    }
    const pos = contentPointer();
    if (!pos || !geometry.containsPoint(pos)) {
      setCursorPoint(null);
      return;
    }
    const gesture = drawingGestureRef.current;
    const pointer = stageRef.current?.getPointerPosition();
    if (gesture && pointer && !gesture.dragged &&
        Math.hypot(pointer.x - gesture.screenStart.x, pointer.y - gesture.screenStart.y) >= 6) {
      gesture.dragged = true;
      useEditorStore.getState().setDrawingPoints([gesture.start]);
    }
    setCursorPoint(snapPos(toPct(pos)));
  }, [isDrawingTool, readOnly, toPct, cursorPoint, contentPointer, handlePinch, geometry, snapPos, cancelDrawingGesture]);

  const handleStageInteraction = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (suppressDrawingClickRef.current) {
      suppressDrawingClickRef.current = false;
      return;
    }
    if (readOnly) return;
    const isBackground = e.target === stageRef.current || e.target.name() === 'pitch-bg';
    const pos = contentPointer();
    if (!pos || !geometry.containsPoint(pos)) return;
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
        const p = toPixel(entityPositionAtStep(ent, currentStepId, state.entityStepPositions));
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
      if (!isCurved && ds.drawingPoints.length === 1) {
        finishDrawing([ds.drawingPoints[0], pct]);
      } else {
        addDrawingPoint(snapPos(pct));
      }
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
    deleteAnnotation, deleteEntity, readOnly, geometry, contentPointer, toPixel, pitchW, pitchH, isCurved, finishDrawing, snapPos]);

  const handleDblClick = useCallback(() => {
    if (readOnly) return;
    if (isDrawingTool && drawingPoints.length >= 2) {
      finishDrawing();
    }
  }, [readOnly, isDrawingTool, drawingPoints.length, finishDrawing]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editorKeyboardBlocked(e)) return;
      if (readOnly || useEditorStore.getState().presentationMode) return;
      const state = useEditorStore.getState();
      const stepId = state.steps[state.animation.activeStepIndex]?.id;

      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'd') {
        const annotation = state.annotations.find(ann => ann.id === state.selectedAnnotationId);
        const entity = state.entities.find(ent => ent.id === state.selectedEntityId);
        if (!annotation && !entity) return;
        e.preventDefault();
        if (annotation) {
          state.addAnnotation({ ...moveAnnotationGeometry(annotation, 3, 3), id: crypto.randomUUID(), layerOrder: state.annotations.length });
        } else if (entity) {
          const id = crypto.randomUUID();
          const position = entityPositionAtStep(entity, stepId, state.entityStepPositions);
          state.addEntity({ ...entity, id, position: {
            x: Math.min(100, position.x + 3), y: Math.min(100, position.y + 3),
          } });
          state.setSelectedEntityId(id);
        }
        return;
      }
      // Leave modified navigation and browser commands to their native owner.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Enter' && isDrawingTool && drawingPoints.length >= 2) {
        finishDrawing();
        return;
      }
      if (e.key === 'Escape') {
        drawingGestureRef.current = null;
        setCursorPoint(null);
        state.setActiveTool('select');
        clearDrawingPoints();
        setSelectedAnnotationId(null);
        setSelectedEntityId(null);
        if (activeRoleId) onRoleClick(activeRoleId);
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
          state.activeTool === 'select' && !state.animation.playing) {
        const step = e.shiftKey ? 2 : 0.5;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const movePoint = (point: Point): Point => ({
          x: Math.max(0, Math.min(100, point.x + dx)),
          y: Math.max(0, Math.min(100, point.y + dy)),
        });
        if (state.selectedEntityId) {
          const ent = state.entities.find(en => en.id === state.selectedEntityId);
          if (!ent) return;
          const layer = ent.type === 'opponent' ? 'opponents' : ent.type === 'ball' ? 'ball' : 'team';
          if (state.layerLocked[layer] || !state.layerVisibility[layer]) return;
          e.preventDefault();
          const from = entityPositionAtStep(ent, stepId, state.entityStepPositions);
          const position = movePoint(from);
          if (position.x === from.x && position.y === from.y) return;
          state.snapshotBoard();
          if (state.animation.progress) state.setAnimationProgress(0);
          state.updateSnappedAnnotations(ent.id, position, stepId);
          state.updateEntity(ent.id, { position });
        } else if (state.selectedAnnotationId) {
          e.preventDefault();
          state.snapshotBoard();
          moveAnnotation(state.selectedAnnotationId, dx, dy);
        } else if (activeRoleId && stepId && state.layerVisibility.team && !state.layerLocked.team) {
          const role = roles.find(candidate => candidate.id === activeRoleId);
          if (!role) return;
          e.preventDefault();
          const from = rolePositionAtStep(role, state.animation.activeStepIndex, state.steps, state.annotations, state.stepPositions);
          const position = movePoint(from);
          if (position.x === from.x && position.y === from.y) return;
          state.snapshotBoard();
          if (state.animation.progress) state.setAnimationProgress(0);
          state.updateSnappedAnnotations(role.id, position, stepId);
          state.setStepRolePosition(stepId, role.id, position);
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
  }, [readOnly, activeRoleId, roles, onRoleClick, isDrawingTool, drawingPoints.length, finishDrawing, clearDrawingPoints,
    setSelectedAnnotationId, setSelectedEntityId, deleteAnnotation, deleteEntity,
    setAnimationPlaying, moveAnnotation]);

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

  const getAnimatedPosition = (role: RoleData): Point => {
    const target = safePoint(computeStepResolvedPosition(role, animation.activeStepIndex));
    if (animation.progress > 0) {
      const run = findRoleRun(role.id, stepAnnotations);
      if (run) return safePoint(interpolatePath(annotationPath(run.type, run.points), easeInOutQuad(animation.progress)));
    } else if (!isPlaying && stepTransitionT < 1 && prevVariantIdRef.current === activeVariantId) {
      const from = safePoint(computeStepResolvedPosition(role, transitionFromStepRef.current));
      return lerpPoint(from, target, stepTransitionT);
    }
    return target;
  };

  const getBallFlight = (entity: EntityMarker) => {
    if (animation.progress === 0) return null;
    const ann = findBallPass(entity.id, entities, stepAnnotations);
    if (!ann) return null;
    const t = easeInOutQuad(animation.progress);
    return { pos: interpolatePath(annotationPath(ann.type, ann.points), t), t, ann };
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
      onMouseDown={handleDrawingStart}
      onTouchStart={handleDrawingStart}
      onMouseUp={handleDrawingEnd}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleDrawingEnd}
      onTouchCancel={cancelDrawingGesture}
      onMouseLeave={cancelDrawingGesture}
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
            const x = boundary.x + (i * 10 / 100) * pitchW;
            return <Line key={`gv${i}`} points={[x, boundary.y, x, boundary.y + pitchH]} stroke={gridColor} strokeWidth={0.5} />;
          })}
          {Array.from({ length: 11 }, (_, i) => {
            const y = boundary.y + (i * 10 / 100) * pitchH;
            return <Line key={`gh${i}`} points={[boundary.x, y, boundary.x + pitchW, y]} stroke={gridColor} strokeWidth={0.5} />;
          })}
          {pitchAnchors.map((a, i) => {
            const px = toPixel(a.pos);
            return <KonvaCircle key={`sa${i}`} x={px.x} y={px.y} radius={3} fill="#10b981" opacity={0.6} />;
          })}
        </Layer>
      )}

      {dragGuides && (
        <Layer listening={false}>
          {dragGuides.vx !== undefined && (
            <Line points={[toPixel({ x: dragGuides.vx, y: 0 }).x, boundary.y, toPixel({ x: dragGuides.vx, y: 0 }).x, boundary.y + pitchH]} stroke="#10b981" strokeWidth={1} dash={[4, 4]} opacity={0.7} />
          )}
          {dragGuides.hy !== undefined && (
            <Line points={[boundary.x, toPixel({ x: 0, y: dragGuides.hy }).y, boundary.x + pitchW, toPixel({ x: 0, y: dragGuides.hy }).y]} stroke="#10b981" strokeWidth={1} dash={[4, 4]} opacity={0.7} />
          )}
          {dragGuides.snap && (
            <KonvaCircle x={toPixel(dragGuides.snap).x} y={toPixel(dragGuides.snap).y} radius={22} stroke="#10b981" strokeWidth={2} dash={[4, 3]} opacity={0.8} />
          )}
        </Layer>
      )}

      {/* While erasing, shapes must not swallow clicks — the stage handler
          does the hit-testing and deletion. */}
      <Layer listening={activeTool === 'select'}>
        <AnnotationLayer
          annotations={filteredAnnotations}
          showHandles={false}
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
          readOnly={readOnly}
          lockedTypes={{ actions: layerLocked.actions, zones: layerLocked.zones, labels: layerLocked.labels }}
        />

        {isDrawingTool && drawingPoints.length >= 1 && (() => {
          const startSnap = snapEnabled ? findNearestMarker(drawingPoints[0], markerRefs) : null;
          const endSnap = snapEnabled && drawingPoints.length >= 2 ? findNearestMarker(drawingPoints[drawingPoints.length - 1], markerRefs) : null;
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

      <Layer listening={activeTool === 'select'}>
        {entities.map((ent) => {
          const layerKey = ent.type === 'opponent' ? 'opponents' : ent.type === 'ball' ? 'ball' : 'team';
          if (!layerVisibility[layerKey]) return null;
          const isLocked = layerLocked[layerKey];

          const target = entityPositionAtStep(ent, activeStepId, entityStepPositions);
          const fromStepId = sortedStepIds[transitionFromStepRef.current];
          const position = !isPlaying && stepTransitionT < 1 && prevVariantIdRef.current === activeVariantId
            ? lerpPoint(entityPositionAtStep(ent, fromStepId, entityStepPositions), target, stepTransitionT)
            : target;
          const px = toPixel(position);
          const isSelected = ent.id === selectedEntityId;
          const isDimmed = hasFocusedElement && !isSelected;

          const canInteract = !readOnly && !isLocked && !animation.playing && activeTool === 'select';

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
            const flight = getBallFlight(ent);
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
              const cur = computeStepResolvedPosition(role, animation.activeStepIndex);
              const prev = computeStepResolvedPosition(role, animation.activeStepIndex - 1);
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
          const pct = getAnimatedPosition(role);
          const px = toPixel(pct);
          const isActive = role.id === activeRoleId;
          const assignment = assignments.find(a => a.roleId === role.id);
          const player = assignment ? players?.find(p => p.id === assignment.playerId) : null;
          const isUnassigned = !assignment;
          const isDimmed = hasFocusedElement && !isActive;
          const isLocked = layerLocked.team;
          const roleInteractive = !readOnly && !isLocked && !animation.playing && activeTool === 'select';

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
      <Layer listening={!readOnly && activeTool === 'select'}>
        <AnnotationHandles
          annotations={filteredAnnotations}
          selectedId={selectedAnnotationId}
          onUpdatePoint={updateAnnotationPoint}
          onUpdateRadius={updateAnnotationRadius}
          toPixel={toPixel}
          toPct={toPct}
          pitchW={pitchW}
          pitchH={pitchH}
          readOnly={readOnly}
          lockedTypes={{ actions: layerLocked.actions, zones: layerLocked.zones, labels: layerLocked.labels }}
        />
      </Layer>
    </Stage>
  );
});
