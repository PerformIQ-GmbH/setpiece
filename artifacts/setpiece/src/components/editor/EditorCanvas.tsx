import { useRef, useCallback, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Group, Line, Circle as KonvaCircle } from 'react-konva';
import type Konva from 'konva';
import { PremiumPitch } from './PremiumPitch';
import { OffensiveCornerPitch } from './OffensiveCornerPitch';
import { TeamPlayerMarker, OpponentMarker, GoalkeeperMarker, BallMarker } from './markers';
import { AnnotationLayer, DrawingPreview } from './AnnotationLayer';
import { useEditorStore } from './editorStore';
import type { Point, Annotation, AnnotationType } from './types';
import { snapPosition, PITCH_ANCHORS, findNearestMarker, buildMarkerRefs } from './snapUtils';
import type { MarkerRef } from './snapUtils';

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
  onRoleClick: (roleId: string) => void;
  onRoleDragEnd: (roleId: string, pos: { x: number; y: number }) => void;
  onPitchClick: (pos: { x: number; y: number }) => void;
  onLabelPrompt: (pos: Point) => void;
}

export interface EditorCanvasHandle {
  toDataURL: (config?: { pixelRatio?: number; mimeType?: string }) => string;
}

function computePad(width: number): number {
  if (width < 600) return 10;
  if (width < 900) return 14;
  return 24;
}

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(function EditorCanvas({
  width, height, roles, assignments, players,
  activeRoleId, category = '', readOnly = false, onRoleClick, onRoleDragEnd, onPitchClick, onLabelPrompt,
}, ref) {
  const PAD = computePad(width);
  const isCornerKick = category.includes('corner');
  const halfPitch = !isCornerKick && category.includes('free_kick');
  const pitchTheme = useEditorStore((s) => s.pitchTheme);
  const lightPitch = pitchTheme === 'light';
  const stageRef = useRef<Konva.Stage>(null);
  const [hoveredRoleId, setHoveredRoleId] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    toDataURL: (config) => {
      if (!stageRef.current) return '';
      return stageRef.current.toDataURL({ pixelRatio: config?.pixelRatio ?? 2, mimeType: config?.mimeType ?? 'image/png' });
    },
  }), []);

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

  const markerPositions: Point[] = [
    ...roles.map(r => ({ x: r.startPosition?.x ?? 50, y: r.startPosition?.y ?? 50 })),
    ...entities.map(e => e.position),
  ];

  const snapPos = useCallback((pos: Point, excludePosition?: Point) => snapPosition(pos, markerPositions, snapEnabled, excludePosition), [markerPositions, snapEnabled]);

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
    if (linkedRun) return interpolatePath(linkedRun.points, t);

    const unlinkedRuns = stepAnns.filter(
      a => !a.linkedRoleId && (a.type === 'run_path' || a.type === 'curved_run') && a.points.length >= 2
    );
    const roleIdx = roles.findIndex(r => r.id === roleId);
    const usedLinkedCount = stepAnns.filter(
      a => a.linkedRoleId && (a.type === 'run_path' || a.type === 'curved_run') && a.points.length >= 2
    ).length;
    const unlinkedIdx = roleIdx - usedLinkedCount;
    if (unlinkedIdx >= 0 && unlinkedIdx < unlinkedRuns.length) {
      return interpolatePath(unlinkedRuns[unlinkedIdx].points, t);
    }

    return startPos;
  };

  const computeStepResolvedPosition = (roleId: string, stepIndex: number): Point => {
    const basePos = { x: (roles.find(r => r.id === roleId)?.startPosition?.x ?? 50), y: (roles.find(r => r.id === roleId)?.startPosition?.y ?? 50) };
    const clampedIndex = Math.max(0, Math.min(stepIndex, sortedStepIds.length - 1));
    const sid = sortedStepIds[clampedIndex];
    if (sid && stepPositions[sid]?.[roleId]) {
      return stepPositions[sid][roleId];
    }
    if (clampedIndex === 0) return basePos;
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

  const finishDrawing = useCallback(() => {
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
  }, [drawingPoints, activeTool, strokeColor, strokeWidth, isDashed, showArrowhead, annotations.length, addAnnotation, clearDrawingPoints, markerRefs]);

  const handleStageInteraction = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (readOnly) return;
    const isBackground = e.target === stageRef.current || e.target.name() === 'pitch-bg';
    const pos = stageRef.current?.getPointerPosition();
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
      const hitThreshold = 3;
      let closestAnnId: string | null = null;
      let closestAnnDist = Infinity;
      const state = useEditorStore.getState();
      const lv = state.layerVisibility;
      const ll = state.layerLocked;
      const currentStep = state.steps[state.animation.activeStepIndex];
      const currentStepId = currentStep?.id;
      const visibleAnns = (currentStepId ? state.annotations.filter(a => a.stepId === currentStepId) : state.annotations)
        .filter(a => {
          if (['run_path', 'curved_run', 'pass_line', 'curved_cross'].includes(a.type)) return lv.actions && !ll.actions;
          if (['zone_circle', 'zone_rect'].includes(a.type)) return lv.zones && !ll.zones;
          if (a.type === 'label') return lv.labels && !ll.labels;
          return true;
        });
      for (const ann of visibleAnns) {
        for (const pt of ann.points) {
          const d = Math.hypot(pt.x - pct.x, pt.y - pct.y);
          if (d < closestAnnDist) { closestAnnDist = d; closestAnnId = ann.id; }
        }
      }
      let closestEntId: string | null = null;
      let closestEntDist = Infinity;
      for (const ent of state.entities) {
        const layerKey = ent.type === 'opponent' ? 'opponents' as const : ent.type === 'ball' ? 'ball' as const : 'team' as const;
        if (!lv[layerKey] || ll[layerKey]) continue;
        const d = Math.hypot(ent.position.x - pct.x, ent.position.y - pct.y);
        if (d < closestEntDist) { closestEntDist = d; closestEntId = ent.id; }
      }
      if (closestAnnDist <= hitThreshold && closestAnnDist <= closestEntDist && closestAnnId) {
        deleteAnnotation(closestAnnId);
      } else if (closestEntDist <= hitThreshold && closestEntId) {
        deleteEntity(closestEntId);
      }
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
      if (readOnly || useEditorStore.getState().presentationMode) return;
      if (e.key === 'Enter' && isDrawingTool && drawingPoints.length >= 2) {
        finishDrawing();
      }
      if (e.key === 'Escape') {
        clearDrawingPoints();
        setSelectedAnnotationId(null);
        setSelectedEntityId(null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selAnn = useEditorStore.getState().selectedAnnotationId;
        const selEnt = useEditorStore.getState().selectedEntityId;
        if (selAnn) deleteAnnotation(selAnn);
        if (selEnt) deleteEntity(selEnt);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [readOnly, isDrawingTool, drawingPoints.length, finishDrawing, clearDrawingPoints, setSelectedAnnotationId, setSelectedEntityId, deleteAnnotation, deleteEntity]);

  const interpolatePath = (path: Point[], t: number): Point => {
    if (path.length === 0) return { x: 50, y: 50 };
    if (path.length === 1 || t <= 0) return { x: path[0]?.x ?? 50, y: path[0]?.y ?? 50 };
    if (t >= 1) { const last = path[path.length - 1]; return { x: last?.x ?? 50, y: last?.y ?? 50 }; }
    const totalSegments = path.length - 1;
    const segIdx = Math.min(Math.floor(t * totalSegments), totalSegments - 1);
    const segT = (t * totalSegments) - segIdx;
    const p0 = path[segIdx];
    const p1 = path[segIdx + 1];
    if (!p0 || !p1) return { x: 50, y: 50 };
    const x = (p0.x ?? 50) + ((p1.x ?? 50) - (p0.x ?? 50)) * segT;
    const y = (p0.y ?? 50) + ((p1.y ?? 50) - (p0.y ?? 50)) * segT;
    return { x: Number.isFinite(x) ? x : 50, y: Number.isFinite(y) ? y : 50 };
  };

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
    } else {
      currentPos = computeStepResolvedPosition(roleId, animation.activeStepIndex);
    }

    return safePoint(resolvePositionForStep(roleId, stepAnnotations, currentPos, animation.progress));
  };

  const getAnimatedBallPosition = (): Point | null => {
    if (!animation.playing && animation.progress === 0) return null;

    if (isAllMode && isPlaying) {
      let lastBallPos: Point | null = null;
      for (let i = 0; i <= animation.activeStepIndex; i++) {
        const sid = sortedStepIds[i];
        const anns = annotations.filter(a => a.stepId === sid);
        const passAnns = anns.filter(
          a => (a.type === 'pass_line' || a.type === 'curved_cross') && a.points.length >= 2
        );
        if (passAnns.length > 0) {
          const t = i < animation.activeStepIndex ? 1 : animation.progress;
          lastBallPos = interpolatePath(passAnns[0].points, t);
        }
      }
      return lastBallPos;
    }

    const passAnns = stepAnnotations.filter(
      a => (a.type === 'pass_line' || a.type === 'curved_cross') && a.points.length >= 2
    );
    if (passAnns.length === 0) return null;
    return interpolatePath(passAnns[0].points, animation.progress);
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

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onClick={handleStageInteraction}
      onTap={handleStageInteraction}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onContextMenu={handleContextMenu}
      style={{ cursor: isDrawingTool ? 'crosshair' : isEntityTool ? 'cell' : 'default', touchAction: 'none' }}
    >
      <Layer>
        {isCornerKick ? (
          <OffensiveCornerPitch width={width} height={height} pad={PAD} theme={pitchTheme} />
        ) : (
          <PremiumPitch width={width} height={height} halfPitch={halfPitch} pad={PAD} theme={pitchTheme} />
        )}
      </Layer>

      {showGrid && (
        <Layer listening={false} opacity={0.15}>
          {Array.from({ length: 11 }, (_, i) => {
            const x = PAD + (i * 10 / 100) * pitchW;
            return <Line key={`gv${i}`} points={[x, PAD, x, PAD + pitchH]} stroke="#fff" strokeWidth={0.5} />;
          })}
          {Array.from({ length: 11 }, (_, i) => {
            const y = PAD + (i * 10 / 100) * pitchH;
            return <Line key={`gh${i}`} points={[PAD, y, PAD + pitchW, y]} stroke="#fff" strokeWidth={0.5} />;
          })}
          {PITCH_ANCHORS.map((a, i) => {
            const px = toPixel(a.pos);
            return <KonvaCircle key={`sa${i}`} x={px.x} y={px.y} radius={3} fill="#10b981" opacity={0.6} />;
          })}
        </Layer>
      )}

      <Layer>
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
              {drawingPoints.length >= 2 && (
                <DrawingPreview
                  points={drawingPoints}
                  toPixel={toPixel}
                  color={strokeColor}
                  strokeWidth={strokeWidth}
                  dashed={isDashed}
                  curved={isCurved}
                  arrowhead={showArrowhead}
                />
              )}
            </>
          );
        })()}
      </Layer>

      <Layer>
        {entities.map((ent) => {
          const layerKey = ent.type === 'opponent' ? 'opponents' : ent.type === 'ball' ? 'ball' : 'team';
          if (!layerVisibility[layerKey]) return null;
          const isLocked = layerLocked[layerKey];

          const px = toPixel(ent.position);
          const isSelected = ent.id === selectedEntityId;
          const isDimmed = hasFocusedElement && !isSelected;

          const canInteract = !readOnly && !isLocked;

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
                onDragMove={canInteract ? (pos) => {
                  updateSnappedAnnotations(ent.id, toPct(pos), activeStepId);
                } : undefined}
                onDragEnd={canInteract ? (pos) => {
                  const newPct = snapPos(toPct(pos), ent.position);
                  updateSnappedAnnotations(ent.id, newPct, activeStepId);
                  updateEntity(ent.id, { position: newPct });
                } : undefined}
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
                onDragMove={canInteract ? (pos) => {
                  updateSnappedAnnotations(ent.id, toPct(pos), activeStepId);
                } : undefined}
                onDragEnd={canInteract ? (pos) => {
                  const newPct = snapPos(toPct(pos), ent.position);
                  updateSnappedAnnotations(ent.id, newPct, activeStepId);
                  updateEntity(ent.id, { position: newPct });
                } : undefined}
                onClick={() => canInteract && setSelectedEntityId(ent.id)}
                onTap={() => canInteract && setSelectedEntityId(ent.id)}
              />
            );
          }

          if (ent.type === 'ball') {
            const animBallPos = getAnimatedBallPosition();
            const ballPx = animBallPos ? toPixel(animBallPos) : px;
            return (
              <BallMarker
                key={ent.id}
                x={ballPx.x} y={ballPx.y}
                isSelected={isSelected}
                isDimmed={isDimmed}
                lightPitch={lightPitch}
                draggable={canInteract}
                onDragMove={canInteract ? (pos) => {
                  updateSnappedAnnotations(ent.id, toPct(pos), activeStepId);
                } : undefined}
                onDragEnd={canInteract ? (pos) => {
                  const newPct = snapPos(toPct(pos), ent.position);
                  updateSnappedAnnotations(ent.id, newPct, activeStepId);
                  updateEntity(ent.id, { position: newPct });
                } : undefined}
                onClick={() => canInteract && setSelectedEntityId(ent.id)}
                onTap={() => canInteract && setSelectedEntityId(ent.id)}
              />
            );
          }
          return null;
        })}

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
              lastName={player?.lastName}
              label={role.name}
              lightPitch={lightPitch}
              draggable={roleInteractive}
              onDragMove={roleInteractive ? (pos) => {
                updateSnappedAnnotations(role.id, toPct(pos), activeStepId);
              } : undefined}
              onDragEnd={roleInteractive ? (pos) => {
                const newPct = snapPos(toPct(pos), { x: role.startPosition?.x ?? 50, y: role.startPosition?.y ?? 50 });
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
