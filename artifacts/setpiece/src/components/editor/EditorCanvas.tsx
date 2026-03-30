import { useRef, useCallback, useState, useEffect } from 'react';
import { Stage, Layer, Group } from 'react-konva';
import type Konva from 'konva';
import { PremiumPitch } from './PremiumPitch';
import { TeamPlayerMarker, OpponentMarker, GoalkeeperMarker, BallMarker } from './markers';
import { AnnotationLayer, DrawingPreview } from './AnnotationLayer';
import { useEditorStore } from './editorStore';
import type { Point, Annotation, AnnotationType } from './types';

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
  halfPitch?: boolean;
  onRoleClick: (roleId: string) => void;
  onRoleDragEnd: (roleId: string, pos: { x: number; y: number }) => void;
  onPitchClick: (pos: { x: number; y: number }) => void;
  onLabelPrompt: (pos: Point) => void;
}

const PAD = 24;

export function EditorCanvas({
  width, height, roles, assignments, players,
  activeRoleId, halfPitch, onRoleClick, onRoleDragEnd, onPitchClick, onLabelPrompt,
}: EditorCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [hoveredRoleId, setHoveredRoleId] = useState<string | null>(null);

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
  const deleteEntity = useEditorStore((s) => s.deleteEntity);

  const animation = useEditorStore((s) => s.animation);
  const setAnimationProgress = useEditorStore((s) => s.setAnimationProgress);
  const setAnimationPlaying = useEditorStore((s) => s.setAnimationPlaying);

  useEffect(() => {
    if (!animation.playing) return;
    let animFrame: number;
    let lastTime = performance.now();
    const progressRef = { current: useEditorStore.getState().animation.progress };
    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const speed = useEditorStore.getState().animation.speed;
      const newProgress = progressRef.current + dt * 0.2 * speed;
      if (newProgress >= 1) {
        setAnimationProgress(1);
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
  const isDashed = ['run_path', 'curved_run'].includes(activeTool);
  const isCurved = ['curved_run', 'curved_cross'].includes(activeTool);
  const isZoneTool = ['zone_circle', 'zone_rect'].includes(activeTool);
  const isEntityTool = ['team_player', 'opponent', 'goalkeeper', 'ball'].includes(activeTool);

  const finishDrawing = useCallback(() => {
    if (drawingPoints.length < 2) {
      clearDrawingPoints();
      return;
    }
    const ann: Annotation = {
      id: crypto.randomUUID(),
      type: activeTool as AnnotationType,
      points: [...drawingPoints],
      color: strokeColor,
      strokeWidth,
      dashed: isDashed,
      arrowhead: showArrowhead,
      layerOrder: annotations.length,
    };
    addAnnotation(ann);
    clearDrawingPoints();
  }, [drawingPoints, activeTool, strokeColor, strokeWidth, isDashed, showArrowhead, annotations.length, addAnnotation, clearDrawingPoints]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
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
  }, [activeTool, toPct, onPitchClick, strokeColor, strokeWidth, showArrowhead, annotations.length,
    drawingPoints, addDrawingPoint, clearDrawingPoints, addAnnotation, addEntity,
    setSelectedAnnotationId, setSelectedEntityId, isDrawingTool, isEntityTool, onLabelPrompt]);

  const handleDblClick = useCallback(() => {
    if (isDrawingTool && drawingPoints.length >= 2) {
      finishDrawing();
    }
  }, [isDrawingTool, drawingPoints.length, finishDrawing]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
  }, [isDrawingTool, drawingPoints.length, finishDrawing, clearDrawingPoints, setSelectedAnnotationId, setSelectedEntityId, deleteAnnotation, deleteEntity]);

  const getAnimatedPosition = (roleId: string, role: RoleData): Point => {
    if (!animation.playing && animation.progress === 0) {
      return { x: role.startPosition?.x ?? 50, y: role.startPosition?.y ?? 50 };
    }
    const runAnnotations = annotations.filter(
      a => (a.type === 'run_path' || a.type === 'curved_run') && a.points.length >= 2
    );
    const roleIdx = roles.findIndex(r => r.id === roleId);
    if (roleIdx >= 0 && roleIdx < runAnnotations.length) {
      const path = runAnnotations[roleIdx].points;
      const t = animation.progress;
      const totalSegments = path.length - 1;
      const segIdx = Math.min(Math.floor(t * totalSegments), totalSegments - 1);
      const segT = (t * totalSegments) - segIdx;
      if (segIdx < totalSegments) {
        return {
          x: path[segIdx].x + (path[segIdx + 1].x - path[segIdx].x) * segT,
          y: path[segIdx].y + (path[segIdx + 1].y - path[segIdx].y) * segT,
        };
      }
      return path[path.length - 1];
    }
    return { x: role.startPosition?.x ?? 50, y: role.startPosition?.y ?? 50 };
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onClick={handleStageClick}
      onDblClick={handleDblClick}
      style={{ cursor: isDrawingTool ? 'crosshair' : isEntityTool ? 'cell' : 'default' }}
    >
      <Layer>
        <PremiumPitch width={width} height={height} halfPitch={halfPitch} pad={PAD} />
      </Layer>

      <Layer>
        <AnnotationLayer
          annotations={annotations}
          selectedId={selectedAnnotationId}
          onSelect={setSelectedAnnotationId}
          toPixel={toPixel}
          pitchW={pitchW}
          pitchH={pitchH}
          pad={PAD}
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
          const px = toPixel(ent.position);
          const isSelected = ent.id === selectedEntityId;

          if (ent.type === 'opponent') {
            return (
              <OpponentMarker
                key={ent.id}
                x={px.x} y={px.y}
                isSelected={isSelected}
                shirtNumber={ent.shirtNumber}
                label={ent.label}
                draggable
                onDragEnd={(pos) => updateEntity(ent.id, { position: toPct(pos) })}
                onClick={() => setSelectedEntityId(ent.id)}
                onTap={() => setSelectedEntityId(ent.id)}
              />
            );
          }

          if (ent.type === 'goalkeeper') {
            return (
              <GoalkeeperMarker
                key={ent.id}
                x={px.x} y={px.y}
                isSelected={isSelected}
                shirtNumber={ent.shirtNumber}
                label={ent.label}
                draggable
                onDragEnd={(pos) => updateEntity(ent.id, { position: toPct(pos) })}
                onClick={() => setSelectedEntityId(ent.id)}
                onTap={() => setSelectedEntityId(ent.id)}
              />
            );
          }

          if (ent.type === 'ball') {
            return (
              <BallMarker
                key={ent.id}
                x={px.x} y={px.y}
                isSelected={isSelected}
                draggable
                onDragEnd={(pos) => updateEntity(ent.id, { position: toPct(pos) })}
                onClick={() => setSelectedEntityId(ent.id)}
                onTap={() => setSelectedEntityId(ent.id)}
              />
            );
          }
          return null;
        })}

        {roles.map((role) => {
          const pct = getAnimatedPosition(role.id, role);
          const px = toPixel(pct);
          const isActive = role.id === activeRoleId;
          const assignment = assignments.find(a => a.roleId === role.id);
          const player = assignment ? players?.find(p => p.id === assignment.playerId) : null;

          return (
            <TeamPlayerMarker
              key={role.id}
              x={px.x}
              y={px.y}
              isSelected={isActive}
              isHovered={role.id === hoveredRoleId}
              shirtNumber={player?.shirtNumber ?? undefined}
              label={role.name}
              draggable
              onDragEnd={(pos) => onRoleDragEnd(role.id, toPct(pos))}
              onClick={() => onRoleClick(role.id)}
              onTap={() => onRoleClick(role.id)}
              onMouseEnter={() => setHoveredRoleId(role.id)}
              onMouseLeave={() => setHoveredRoleId(null)}
            />
          );
        })}
      </Layer>
    </Stage>
  );
}
