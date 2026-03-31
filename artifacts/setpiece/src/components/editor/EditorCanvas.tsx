import { useRef, useCallback, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Group, Line, Circle as KonvaCircle } from 'react-konva';
import type Konva from 'konva';
import { PremiumPitch } from './PremiumPitch';
import { OffensiveCornerPitch } from './OffensiveCornerPitch';
import { TeamPlayerMarker, OpponentMarker, GoalkeeperMarker, BallMarker } from './markers';
import { AnnotationLayer, DrawingPreview } from './AnnotationLayer';
import { useEditorStore } from './editorStore';
import type { Point, Annotation, AnnotationType } from './types';
import { snapPosition, PITCH_ANCHORS } from './snapUtils';

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

const PAD = 24;

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(function EditorCanvas({
  width, height, roles, assignments, players,
  activeRoleId, category = '', readOnly = false, onRoleClick, onRoleDragEnd, onPitchClick, onLabelPrompt,
}, ref) {
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
  }), [pitchW, pitchH]);

  const toPct = useCallback((px: Point) => ({
    x: Math.max(0, Math.min(100, ((px.x - PAD) / pitchW) * 100)),
    y: Math.max(0, Math.min(100, ((px.y - PAD) / pitchH) * 100)),
  }), [pitchW, pitchH]);

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
  const deleteEntity = useEditorStore((s) => s.deleteEntity);

  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const showGrid = useEditorStore((s) => s.showGrid);
  const layerVisibility = useEditorStore((s) => s.layerVisibility);
  const layerLocked = useEditorStore((s) => s.layerLocked);
  const setContextMenu = useEditorStore((s) => s.setContextMenu);

  const markerPositions: Point[] = [
    ...roles.map(r => ({ x: r.startPosition?.x ?? 50, y: r.startPosition?.y ?? 50 })),
    ...entities.map(e => e.position),
  ];

  const snapPos = useCallback((pos: Point) => snapPosition(pos, markerPositions, snapEnabled), [markerPositions, snapEnabled]);

  const animation = useEditorStore((s) => s.animation);
  const setAnimationProgress = useEditorStore((s) => s.setAnimationProgress);
  const setAnimationPlaying = useEditorStore((s) => s.setAnimationPlaying);
  const steps = useEditorStore((s) => s.steps);
  const goToNextStep = useEditorStore((s) => s.goToNextStep);

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

  const finishDrawing = useCallback(() => {
    if (drawingPoints.length < 2) {
      clearDrawingPoints();
      return;
    }
    const toolType = activeTool as AnnotationType;
    const isRunType = toolType === 'run_path' || toolType === 'curved_run';
    const isPassType = toolType === 'pass_line' || toolType === 'curved_cross';
    const semanticDashed = isRunType ? true : isPassType ? false : isDashed;
    const semanticArrowhead = isRunType || isPassType ? true : showArrowhead;
    const ann: Annotation = {
      id: crypto.randomUUID(),
      type: toolType,
      points: [...drawingPoints],
      color: strokeColor,
      strokeWidth,
      dashed: semanticDashed,
      arrowhead: semanticArrowhead,
      layerOrder: annotations.length,
    };
    addAnnotation(ann);
    clearDrawingPoints();
  }, [drawingPoints, activeTool, strokeColor, strokeWidth, isDashed, showArrowhead, annotations.length, addAnnotation, clearDrawingPoints]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (readOnly) return;
    const isBackground = e.target === stageRef.current || e.target.name() === 'pitch-bg';
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return;
    const pct = toPct(pos);

    if (activeTool === 'select') {
      if (isBackground) {
        setSelectedAnnotationId(null);
        setSelectedEntityId(null);
        onPitchClick(pct);
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
      onLabelPrompt(pct);
      return;
    }

    if (isEntityTool && isBackground) {
      if (activeTool === 'team_player') {
        onPitchClick(pct);
        return;
      }
      addEntity({
        id: crypto.randomUUID(),
        type: activeTool === 'ball' ? 'ball' : activeTool === 'goalkeeper' ? 'goalkeeper' : 'opponent',
        position: pct,
        shirtNumber: activeTool === 'goalkeeper' ? 1 : undefined,
      });
      return;
    }

    if (isDrawingTool) {
      addDrawingPoint(pct);
      return;
    }

    if (activeTool === 'zone_circle' && isBackground) {
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
    deleteAnnotation, deleteEntity]);

  const handleDblClick = useCallback(() => {
    if (isDrawingTool && drawingPoints.length >= 2) {
      finishDrawing();
    }
  }, [isDrawingTool, drawingPoints.length, finishDrawing]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (readOnly) return;
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
    if (path.length === 1 || t <= 0) return path[0];
    if (t >= 1) return path[path.length - 1];
    const totalSegments = path.length - 1;
    const segIdx = Math.min(Math.floor(t * totalSegments), totalSegments - 1);
    const segT = (t * totalSegments) - segIdx;
    return {
      x: path[segIdx].x + (path[segIdx + 1].x - path[segIdx].x) * segT,
      y: path[segIdx].y + (path[segIdx + 1].y - path[segIdx].y) * segT,
    };
  };

  const activeStep = steps[animation.activeStepIndex];
  const activeStepId = activeStep?.id;

  const stepAnnotations = activeStepId
    ? annotations.filter(a => a.stepId === activeStepId)
    : annotations;

  const sortedStepIds = steps.map(s => s.id);
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

  const getAnimatedPosition = (roleId: string, role: RoleData): Point => {
    const basePos = { x: role.startPosition?.x ?? 50, y: role.startPosition?.y ?? 50 };
    if (!animation.playing && animation.progress === 0) return basePos;

    let currentPos = basePos;

    if (isAllMode && isPlaying) {
      for (let i = 0; i < animation.activeStepIndex; i++) {
        const sid = sortedStepIds[i];
        const completedAnns = annotations.filter(a => a.stepId === sid);
        currentPos = resolvePositionForStep(roleId, completedAnns, currentPos, 1);
      }
    }

    return resolvePositionForStep(roleId, stepAnnotations, currentPos, animation.progress);
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
      onClick={handleStageClick}
      onDblClick={handleDblClick}
      onContextMenu={handleContextMenu}
      style={{ cursor: isDrawingTool ? 'crosshair' : isEntityTool ? 'cell' : 'default' }}
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
          toPixel={toPixel}
          toPct={toPct}
          pitchW={pitchW}
          pitchH={pitchH}
          pad={PAD}
          readOnly={readOnly}
          lockedTypes={{ actions: layerLocked.actions, zones: layerLocked.zones, labels: layerLocked.labels }}
        />

        {isDrawingTool && drawingPoints.length >= 2 && (
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
      </Layer>

      <Layer>
        {entities.map((ent) => {
          const layerKey = ent.type === 'opponent' ? 'opponents' : ent.type === 'ball' ? 'ball' : 'team';
          if (!layerVisibility[layerKey]) return null;
          const isLocked = layerLocked[layerKey];

          const px = toPixel(ent.position);
          const isSelected = ent.id === selectedEntityId;
          const isDimmed = hasFocusedElement && !isSelected;

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
                draggable={!isLocked}
                onDragEnd={(pos) => updateEntity(ent.id, { position: snapPos(toPct(pos)) })}
                onClick={() => !isLocked && setSelectedEntityId(ent.id)}
                onTap={() => !isLocked && setSelectedEntityId(ent.id)}
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
                draggable={!isLocked}
                onDragEnd={(pos) => updateEntity(ent.id, { position: snapPos(toPct(pos)) })}
                onClick={() => !isLocked && setSelectedEntityId(ent.id)}
                onTap={() => !isLocked && setSelectedEntityId(ent.id)}
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
                draggable={!isLocked}
                onDragEnd={(pos) => updateEntity(ent.id, { position: snapPos(toPct(pos)) })}
                onClick={() => !isLocked && setSelectedEntityId(ent.id)}
                onTap={() => !isLocked && setSelectedEntityId(ent.id)}
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
              draggable={!isLocked}
              onDragEnd={(pos) => onRoleDragEnd(role.id, snapPos(toPct(pos)))}
              onClick={() => !isLocked && onRoleClick(role.id)}
              onTap={() => !isLocked && onRoleClick(role.id)}
              onMouseEnter={() => setHoveredRoleId(role.id)}
              onMouseLeave={() => setHoveredRoleId(null)}
            />
          );
        })}
      </Layer>
    </Stage>
  );
});
