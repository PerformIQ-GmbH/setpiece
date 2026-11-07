import { create } from 'zustand';
import type { EditorTool, EditorMode, PitchTheme, Annotation, EntityMarker, Point, AnimationStep, BoardData, BoardVariant, RolePositionSource, StepPositions, VariantBoardData, VariantRoleTask } from './types';
import { BASIC_TOOLS } from './types';
import { findRoleRun, moveAnnotationGeometry, updateAnnotationEndpoint } from './editorInteraction';
import { loadBoardData, serializeBoardData, projectBoardVariant, duplicateBoardVariant } from './boardVariants.ts';

interface AnimationState {
  playing: boolean;
  progress: number;
  speed: number;
  activeStepIndex: number;
  playMode: 'step' | 'all';
}

interface BoardSnapshot {
  annotations: Annotation[];
  entities: EntityMarker[];
  steps: AnimationStep[];
  stepPositions: Record<string, Record<string, Point>>;
  entityStepPositions: StepPositions;
  variants: BoardVariant[];
  activeVariantId: string;
  defaultVariantId: string;
  requiredVariantIds: string[];
  boardExtras: Record<string, unknown>;
  animation: AnimationState;
}

/** One undoable action. 'board' entries restore local board state; 'role'
 *  entries additionally carry the server-persisted role move for the caller
 *  to replay via the API. */
export type UndoEntry =
  | { kind: 'board'; snap: BoardSnapshot }
  | { kind: 'role'; roleId: string; prevPos: Point; newPos: Point; snap: BoardSnapshot };

const HISTORY_LIMIT = 50;

interface ViewState {
  scale: number;
  x: number;
  y: number;
}

interface EditorState {
  variants: BoardVariant[];
  activeVariantId: string;
  defaultVariantId: string;
  requiredVariantIds: string[];
  boardExtras: Record<string, unknown>;
  loadBoardData: (board: Partial<BoardData> | null | undefined, roles?: RolePositionSource[]) => void;
  serializeBoardData: () => VariantBoardData;
  switchVariant: (id: string) => void;
  duplicateVariant: (id?: string, name?: string) => void;
  deleteVariant: (id: string) => void;
  setDefaultVariant: (id: string) => void;
  setVariantRequired: (id: string, required: boolean) => void;
  updateActiveVariant: (updates: Partial<Pick<BoardVariant, 'name' | 'recognitionCue' | 'teamSignal'>>) => void;
  setVariantRoleTask: (roleId: string, patch: VariantRoleTask) => void;
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;

  pitchTheme: PitchTheme;
  setPitchTheme: (theme: PitchTheme) => void;

  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;

  showLegend: boolean;
  setShowLegend: (show: boolean) => void;

  showTips: boolean;
  setShowTips: (show: boolean) => void;

  inspectorCollapsed: boolean;
  setInspectorCollapsed: (collapsed: boolean) => void;

  activeTool: EditorTool;
  setActiveTool: (tool: EditorTool) => void;

  selectedAnnotationId: string | null;
  setSelectedAnnotationId: (id: string | null) => void;

  annotations: Annotation[];
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  moveAnnotation: (id: string, dxPct: number, dyPct: number) => void;
  updateAnnotationPoint: (id: string, pointIndex: number, newPos: Point) => void;
  updateAnnotationRadius: (id: string, radius: number) => void;
  updateSnappedAnnotations: (refId: string, newPos: Point, stepId?: string) => void;
  clearAnnotations: () => void;

  entities: EntityMarker[];
  setEntities: (entities: EntityMarker[]) => void;
  addEntity: (entity: EntityMarker) => void;
  updateEntity: (id: string, updates: Partial<EntityMarker>) => void;
  deleteEntity: (id: string) => void;

  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;

  drawingPoints: Point[];
  setDrawingPoints: (points: Point[]) => void;
  addDrawingPoint: (point: Point) => void;
  clearDrawingPoints: () => void;

  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  showArrowhead: boolean;
  setShowArrowhead: (show: boolean) => void;
  forceDashed: boolean;
  setForceDashed: (dashed: boolean) => void;

  stepPositions: Record<string, Record<string, Point>>;
  setStepPositions: (sp: Record<string, Record<string, Point>>) => void;
  setStepRolePosition: (stepId: string, roleId: string, pos: Point) => void;
  entityStepPositions: StepPositions;
  setEntityStepPositions: (positions: StepPositions) => void;
  setStepEntityPosition: (stepId: string, entityId: string, pos: Point) => void;

  steps: AnimationStep[];
  setSteps: (steps: AnimationStep[]) => void;
  addStep: () => void;
  updateStep: (id: string, updates: Partial<AnimationStep>) => void;
  deleteStep: (id: string) => void;
  reorderStep: (id: string, direction: 'up' | 'down') => void;

  animation: AnimationState;
  setAnimationPlaying: (playing: boolean) => void;
  setAnimationProgress: (progress: number) => void;
  setAnimationSpeed: (speed: number) => void;
  setActiveStepIndex: (index: number) => void;
  setPlayMode: (mode: 'step' | 'all') => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;

  snapEnabled: boolean;
  setSnapEnabled: (on: boolean) => void;
  showGrid: boolean;
  setShowGrid: (on: boolean) => void;

  layerVisibility: Record<string, boolean>;
  layerLocked: Record<string, boolean>;
  setLayerVisibility: (layer: string, visible: boolean) => void;
  setLayerLocked: (layer: string, locked: boolean) => void;

  presentationMode: boolean;
  setPresentationMode: (on: boolean) => void;

  view: ViewState;
  setView: (view: ViewState) => void;

  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  /** Push the current board state as an undoable entry (call BEFORE mutating,
   *  or on drag start). */
  snapshotBoard: () => void;
  /** Capture board state at drag start; paired with commitDrag at drag end. */
  beginDrag: () => void;
  /** Turn the pending beginDrag snapshot into a history entry. With roleMove
   *  info it becomes a combined role+board entry. */
  commitDrag: (roleMove?: { roleId: string; prevPos: Point; newPos: Point }) => void;
  /** Undo the latest entry. Board state is restored internally; the entry is
   *  returned so the caller can replay server-side role moves. */
  undo: () => UndoEntry | null;
  redo: () => UndoEntry | null;

  mirrorBoard: (roles?: RolePositionSource[]) => void;

  contextMenu: { x: number; y: number; targetType: 'annotation' | 'entity' | 'role'; targetId: string } | null;
  setContextMenu: (menu: { x: number; y: number; targetType: 'annotation' | 'entity' | 'role'; targetId: string } | null) => void;

  resetStore: () => void;
}

function getStoredPitchTheme(): PitchTheme {
  try {
    const v = localStorage.getItem('setpiece-pitch-theme');
    if (v === 'dark' || v === 'green' || v === 'light') return v;
  } catch {}
  return 'dark';
}

function getStoredEditorMode(): EditorMode {
  try {
    const v = localStorage.getItem('setpiece-editor-mode');
    if (v === 'basic' || v === 'advanced') return v;
  } catch {}
  return 'basic';
}

function getStoredTips(): boolean {
  try {
    return localStorage.getItem('setpiece-tips-dismissed') !== 'true';
  } catch {}
  return true;
}

const initialBoard = loadBoardData({});

// All board mutations replace objects immutably, so a snapshot can safely hold
// references to the current arrays/maps.
const takeSnap = (s: EditorState): BoardSnapshot => ({
  annotations: s.annotations,
  entities: s.entities,
  steps: s.steps,
  stepPositions: s.stepPositions,
  entityStepPositions: s.entityStepPositions,
  variants: s.variants,
  activeVariantId: s.activeVariantId,
  defaultVariantId: s.defaultVariantId,
  requiredVariantIds: s.requiredVariantIds,
  boardExtras: s.boardExtras,
  animation: s.animation,
});

const boardFromState = (s: EditorState): VariantBoardData => ({
  ...s.boardExtras, schemaVersion: 2, variants: s.variants,
  activeVariantId: s.activeVariantId, defaultVariantId: s.defaultVariantId,
  requiredVariantIds: s.requiredVariantIds,
  annotations: s.annotations, entities: s.entities, steps: s.steps,
  stepPositions: s.stepPositions, entityStepPositions: s.entityStepPositions,
});

const workingBoard = (board: VariantBoardData) => ({
  variants: board.variants, activeVariantId: board.activeVariantId, defaultVariantId: board.defaultVariantId,
  requiredVariantIds: board.requiredVariantIds,
  annotations: board.annotations, entities: board.entities, steps: board.steps,
  stepPositions: board.stepPositions, entityStepPositions: board.entityStepPositions,
});

const resetInteraction = (s: EditorState) => ({
  selectedAnnotationId: null, selectedEntityId: null, drawingPoints: [], contextMenu: null,
  animation: { ...s.animation, activeStepIndex: 0, progress: 0, playing: false },
});

const pushSnap = (s: EditorState): Pick<EditorState, 'undoStack' | 'redoStack'> => ({
  undoStack: [...s.undoStack.slice(-(HISTORY_LIMIT - 1)), { kind: 'board', snap: takeSnap(s) }],
  redoStack: [],
});

let pendingDragSnap: BoardSnapshot | null = null;

export const useEditorStore = create<EditorState>((set, get) => ({
  variants: initialBoard.variants,
  activeVariantId: initialBoard.activeVariantId,
  defaultVariantId: initialBoard.defaultVariantId,
  requiredVariantIds: initialBoard.requiredVariantIds,
  boardExtras: {},
  loadBoardData: (input, roles) => {
    const board = loadBoardData(input, roles);
    const managed = new Set(['schemaVersion', 'variants', 'activeVariantId', 'defaultVariantId', 'requiredVariantIds',
      'annotations', 'entities', 'steps', 'stepPositions', 'entityStepPositions']);
    pendingDragSnap = null;
    set(s => ({ ...workingBoard(board), ...resetInteraction(s), undoStack: [], redoStack: [],
      boardExtras: Object.fromEntries(Object.entries(board).filter(([key]) => !managed.has(key))) }));
  },
  serializeBoardData: () => serializeBoardData(boardFromState(get())),
  switchVariant: (id) => set(s => {
    if (id === s.activeVariantId || !s.variants.some(variant => variant.id === id)) return {};
    const board = serializeBoardData(boardFromState(s));
    pendingDragSnap = null;
    return { ...pushSnap(s), ...workingBoard(projectBoardVariant(board, id)), ...resetInteraction(s) };
  }),
  duplicateVariant: (id, name) => set(s => {
    const board = serializeBoardData(boardFromState(s));
    const source = board.variants.find(variant => variant.id === (id ?? s.activeVariantId));
    if (!source) return {};
    const copy = duplicateBoardVariant(source, name);
    pendingDragSnap = null;
    return { ...pushSnap(s), ...workingBoard(projectBoardVariant({ ...board, variants: [...board.variants, copy],
      requiredVariantIds: [...board.requiredVariantIds, copy.id] }, copy.id)),
      ...resetInteraction(s) };
  }),
  deleteVariant: (id) => set(s => {
    if (s.variants.length <= 1 || !s.variants.some(variant => variant.id === id)) return {};
    const board = serializeBoardData(boardFromState(s));
    board.variants = board.variants.filter(variant => variant.id !== id);
    if (board.defaultVariantId === id) board.defaultVariantId = board.variants[0].id;
    if (board.activeVariantId === id) board.activeVariantId = board.defaultVariantId;
    board.requiredVariantIds = board.requiredVariantIds.filter(requiredId => requiredId !== id);
    if (!board.requiredVariantIds.length) board.requiredVariantIds = [board.defaultVariantId];
    pendingDragSnap = null;
    return { ...pushSnap(s), ...workingBoard(projectBoardVariant(board, board.activeVariantId)), ...resetInteraction(s) };
  }),
  setDefaultVariant: (id) => set(s => s.defaultVariantId !== id && s.variants.some(variant => variant.id === id)
    ? { ...pushSnap(s), defaultVariantId: id } : {}),
  setVariantRequired: (id, required) => set(s => {
    if (!s.variants.some(variant => variant.id === id) || s.requiredVariantIds.includes(id) === required ||
      (!required && s.requiredVariantIds.length <= 1)) return {};
    return { ...pushSnap(s), requiredVariantIds: required ? [...s.requiredVariantIds, id]
      : s.requiredVariantIds.filter(requiredId => requiredId !== id) };
  }),
  updateActiveVariant: (updates) => set(s => ({ ...pushSnap(s),
    variants: s.variants.map(variant => variant.id === s.activeVariantId ? { ...variant, ...updates } : variant) })),
  setVariantRoleTask: (roleId, patch) => set(s => ({ ...pushSnap(s),
    variants: s.variants.map(variant => variant.id === s.activeVariantId ? { ...variant,
      roleTasks: { ...variant.roleTasks, [roleId]: { ...variant.roleTasks[roleId], ...patch } } } : variant) })),
  editorMode: getStoredEditorMode(),
  setEditorMode: (mode) => {
    try { localStorage.setItem('setpiece-editor-mode', mode); } catch {}
    set((s) => {
      const updates: Partial<EditorState> = { editorMode: mode };
      if (mode === 'basic' && !BASIC_TOOLS.includes(s.activeTool)) {
        updates.activeTool = 'select';
      }
      return updates;
    });
  },

  pitchTheme: getStoredPitchTheme(),
  setPitchTheme: (theme) => {
    try { localStorage.setItem('setpiece-pitch-theme', theme); } catch {}
    set({ pitchTheme: theme });
  },

  showTutorial: false,
  setShowTutorial: (show) => set({ showTutorial: show }),

  showLegend: false,
  setShowLegend: (show) => set({ showLegend: show }),

  showTips: getStoredTips(),
  setShowTips: (show) => {
    try { localStorage.setItem('setpiece-tips-dismissed', show ? 'false' : 'true'); } catch {}
    set({ showTips: show });
  },

  inspectorCollapsed: false,
  setInspectorCollapsed: (collapsed) => set({ inspectorCollapsed: collapsed }),

  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool, selectedAnnotationId: null, selectedEntityId: null, drawingPoints: [] }),

  selectedAnnotationId: null,
  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id, selectedEntityId: null }),

  annotations: [],
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) => set((s) => {
    const activeStep = s.steps[s.animation.activeStepIndex];
    const ann = activeStep && !annotation.stepId
      ? { ...annotation, stepId: activeStep.id }
      : annotation;
    return { ...pushSnap(s), annotations: [...s.annotations, ann], activeTool: 'select',
      selectedAnnotationId: ann.id, selectedEntityId: null, drawingPoints: [] };
  }),
  updateAnnotation: (id, updates) => set((s) => ({
    annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...updates } : a)),
  })),
  deleteAnnotation: (id) => set((s) => ({
    ...pushSnap(s),
    annotations: s.annotations.filter((a) => a.id !== id),
    selectedAnnotationId: s.selectedAnnotationId === id ? null : s.selectedAnnotationId,
  })),
  moveAnnotation: (id, dxPct, dyPct) => set((s) => ({
    annotations: s.annotations.map((a) => {
      if (a.id !== id) return a;
      return moveAnnotationGeometry(a, dxPct, dyPct);
    }),
  })),
  updateAnnotationPoint: (id, pointIndex, newPos) => set((s) => ({
    annotations: s.annotations.map((a) => {
      if (a.id !== id) return a;
      return updateAnnotationEndpoint(a, pointIndex, newPos);
    }),
  })),
  updateAnnotationRadius: (id, radius) => set((s) => ({
    annotations: s.annotations.map((a) =>
      a.id === id ? { ...a, radius: Math.max(1, Math.min(50, radius)) } : a
    ),
  })),
  updateSnappedAnnotations: (refId, newPos, stepId?) => set((s) => ({
    annotations: s.annotations.map((a) => {
      if (stepId && a.stepId !== stepId) return a;
      let updated = a;
      if (a.snappedStartRef === refId) {
        const pts = [...updated.points];
        pts[0] = newPos;
        updated = { ...updated, points: pts };
      }
      if (a.snappedEndRef === refId) {
        const pts = [...updated.points];
        pts[pts.length - 1] = newPos;
        updated = { ...updated, points: pts };
      }
      return updated;
    }),
  })),
  clearAnnotations: () => set((s) => ({ ...pushSnap(s), annotations: [], selectedAnnotationId: null })),

  entities: [],
  setEntities: (entities) => set({ entities }),
  addEntity: (entity) => set((s) => ({ ...pushSnap(s), entities: [...s.entities, entity],
    entityStepPositions: Object.fromEntries(s.steps.map(step => [step.id,
      { ...s.entityStepPositions[step.id], [entity.id]: { ...entity.position } }])) })),
  updateEntity: (id, updates) => set((s) => {
    const step = s.steps[s.animation.activeStepIndex];
    const { position, ...metadata } = updates;
    return {
      entities: s.entities.map(entity => entity.id === id ? { ...entity, ...metadata,
        ...(position && s.animation.activeStepIndex === 0 ? { position: { ...position } } : {}) } : entity),
      ...(position && step ? { entityStepPositions: { ...s.entityStepPositions,
        [step.id]: { ...s.entityStepPositions[step.id], [id]: { ...position } } } } : {}),
    };
  }),
  deleteEntity: (id) => set((s) => ({
    ...pushSnap(s),
    entities: s.entities.filter((e) => e.id !== id),
    entityStepPositions: Object.fromEntries(Object.entries(s.entityStepPositions).map(([stepId, positions]) =>
      [stepId, Object.fromEntries(Object.entries(positions).filter(([entityId]) => entityId !== id))])),
    selectedEntityId: s.selectedEntityId === id ? null : s.selectedEntityId,
  })),

  selectedEntityId: null,
  setSelectedEntityId: (id) => set({ selectedEntityId: id, selectedAnnotationId: null }),

  drawingPoints: [],
  setDrawingPoints: (points) => set({ drawingPoints: points }),
  addDrawingPoint: (point) => set((s) => ({ drawingPoints: [...s.drawingPoints, point] })),
  clearDrawingPoints: () => set({ drawingPoints: [] }),

  strokeColor: '#ffffff',
  setStrokeColor: (color) => set({ strokeColor: color }),
  strokeWidth: 2.5,
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  showArrowhead: true,
  setShowArrowhead: (show) => set({ showArrowhead: show }),
  forceDashed: false,
  setForceDashed: (dashed) => set({ forceDashed: dashed }),

  stepPositions: {},
  setStepPositions: (sp) => set({ stepPositions: sp }),
  setStepRolePosition: (stepId, roleId, pos) => set((s) => ({
    stepPositions: {
      ...s.stepPositions,
      [stepId]: { ...(s.stepPositions[stepId] || {}), [roleId]: { ...pos } },
    },
  })),
  entityStepPositions: initialBoard.entityStepPositions,
  setEntityStepPositions: (positions) => set({ entityStepPositions: positions }),
  setStepEntityPosition: (stepId, entityId, pos) => set(s => ({
    entityStepPositions: { ...s.entityStepPositions,
      [stepId]: { ...s.entityStepPositions[stepId], [entityId]: { ...pos } } },
    entities: stepId === s.steps[0]?.id
      ? s.entities.map(entity => entity.id === entityId ? { ...entity, position: { ...pos } } : entity) : s.entities,
  })),

  steps: initialBoard.steps,
  setSteps: (steps) => set({ steps }),
  addStep: () => set((s) => {
    const maxOrder = s.steps.reduce((max, st) => Math.max(max, st.sortOrder), -1);
    const newStep: AnimationStep = {
      id: crypto.randomUUID(),
      label: `Step ${s.steps.length + 1}`,
      sortOrder: maxOrder + 1,
    };
    const previousStepId = s.steps[s.steps.length - 1]?.id;
    const positions = structuredClone(s.stepPositions[previousStepId] ?? {});
    const previousAnnotations = s.annotations.filter(annotation => annotation.stepId === previousStepId);
    for (const roleId of Object.keys(positions)) {
      const run = findRoleRun(roleId, previousAnnotations);
      if (run) positions[roleId] = { ...run.points[run.points.length - 1] };
    }
    return { ...pushSnap(s), steps: [...s.steps, newStep],
      stepPositions: { ...s.stepPositions, [newStep.id]: positions },
      entityStepPositions: { ...s.entityStepPositions, [newStep.id]: Object.fromEntries(
        s.entities.map(entity => [entity.id, { ...(s.entityStepPositions[previousStepId]?.[entity.id] ?? entity.position) }])) },
    };
  }),
  updateStep: (id, updates) => set((s) => ({
    steps: s.steps.map((st) => (st.id === id ? { ...st, ...updates } : st)),
  })),
  deleteStep: (id) => set((s) => {
    if (s.steps.length <= 1 || !s.steps.some(step => step.id === id)) return {};
    const filtered = s.steps.filter((st) => st.id !== id);
    const activeStepId = s.steps[s.animation.activeStepIndex]?.id;
    return {
      ...pushSnap(s),
      steps: filtered,
      annotations: s.annotations.filter(annotation => annotation.stepId !== id),
      stepPositions: Object.fromEntries(Object.entries(s.stepPositions).filter(([stepId]) => stepId !== id)),
      entityStepPositions: Object.fromEntries(Object.entries(s.entityStepPositions).filter(([stepId]) => stepId !== id)),
      selectedAnnotationId: null,
      selectedEntityId: null,
      drawingPoints: [],
      animation: {
        ...s.animation,
        progress: 0, playing: false,
        activeStepIndex: activeStepId === id ? Math.min(s.animation.activeStepIndex, filtered.length - 1)
          : Math.max(0, filtered.findIndex(step => step.id === activeStepId)),
      },
    };
  }),
  reorderStep: (id, direction) => set((s) => {
    const idx = s.steps.findIndex((st) => st.id === id);
    if (idx < 0) return s;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= s.steps.length) return s;
    const newSteps = [...s.steps];
    const tempOrder = newSteps[idx].sortOrder;
    newSteps[idx] = { ...newSteps[idx], sortOrder: newSteps[swapIdx].sortOrder };
    newSteps[swapIdx] = { ...newSteps[swapIdx], sortOrder: tempOrder };
    newSteps.sort((a, b) => a.sortOrder - b.sortOrder);
    const newIdx = newSteps.findIndex((st) => st.id === id);
    return {
      ...pushSnap(s),
      steps: newSteps,
      animation: { ...s.animation, activeStepIndex: newIdx >= 0 ? newIdx : s.animation.activeStepIndex },
    };
  }),

  animation: { playing: false, progress: 0, speed: 1, activeStepIndex: 0, playMode: 'step' },
  // Pressing play with a finished run restarts it instead of ending instantly.
  setAnimationPlaying: (playing) => set((s) => ({
    animation: {
      ...s.animation,
      playing,
      progress: playing && s.animation.progress >= 1 ? 0 : s.animation.progress,
    },
  })),
  setAnimationProgress: (progress) => set((s) => ({ animation: { ...s.animation, progress } })),
  setAnimationSpeed: (speed) => set((s) => ({ animation: { ...s.animation, speed } })),
  setActiveStepIndex: (index) => set((s) => ({
    animation: { ...s.animation, activeStepIndex: Math.max(0, Math.min(index, s.steps.length - 1)), progress: 0, playing: false },
  })),
  setPlayMode: (mode) => set((s) => ({
    animation: { ...s.animation, playMode: mode },
  })),
  goToNextStep: () => {
    const s = get();
    const nextIdx = s.animation.activeStepIndex + 1;
    if (nextIdx < s.steps.length) {
      set({ animation: { ...s.animation, activeStepIndex: nextIdx, progress: 0 } });
    }
  },
  goToPrevStep: () => {
    const s = get();
    const prevIdx = s.animation.activeStepIndex - 1;
    if (prevIdx >= 0) {
      set({ animation: { ...s.animation, activeStepIndex: prevIdx, progress: 0 } });
    }
  },

  snapEnabled: true,
  setSnapEnabled: (on) => set({ snapEnabled: on }),
  showGrid: false,
  setShowGrid: (on) => set({ showGrid: on }),

  layerVisibility: { team: true, opponents: true, actions: true, labels: true, zones: true, ball: true },
  layerLocked: { team: false, opponents: false, actions: false, labels: false, zones: false, ball: false },
  setLayerVisibility: (layer, visible) => set((s) => {
    const updates: Record<string, unknown> = { layerVisibility: { ...s.layerVisibility, [layer]: visible } };
    if (!visible) {
      if (s.selectedAnnotationId) {
        const ann = s.annotations.find(a => a.id === s.selectedAnnotationId);
        if (ann) {
          const annLayer = ['run_path','curved_run','pass_line','curved_cross'].includes(ann.type) ? 'actions'
            : ['zone_circle','zone_rect'].includes(ann.type) ? 'zones'
            : ann.type === 'label' ? 'labels' : null;
          if (annLayer === layer) updates.selectedAnnotationId = null;
        }
      }
      if (s.selectedEntityId) {
        const ent = s.entities.find(e => e.id === s.selectedEntityId);
        if (ent) {
          const entLayer = ent.type === 'opponent' ? 'opponents' : ent.type === 'ball' ? 'ball' : 'team';
          if (entLayer === layer) updates.selectedEntityId = null;
        }
      }
    }
    return updates;
  }),
  setLayerLocked: (layer, locked) => set((s) => {
    const updates: Record<string, unknown> = { layerLocked: { ...s.layerLocked, [layer]: locked } };
    if (locked) {
      if (s.selectedAnnotationId) {
        const ann = s.annotations.find(a => a.id === s.selectedAnnotationId);
        if (ann) {
          const annLayer = ['run_path','curved_run','pass_line','curved_cross'].includes(ann.type) ? 'actions'
            : ['zone_circle','zone_rect'].includes(ann.type) ? 'zones'
            : ann.type === 'label' ? 'labels' : null;
          if (annLayer === layer) updates.selectedAnnotationId = null;
        }
      }
      if (s.selectedEntityId) {
        const ent = s.entities.find(e => e.id === s.selectedEntityId);
        if (ent) {
          const entLayer = ent.type === 'opponent' ? 'opponents' : ent.type === 'ball' ? 'ball' : 'team';
          if (entLayer === layer) updates.selectedEntityId = null;
        }
      }
    }
    return updates;
  }),

  presentationMode: false,
  setPresentationMode: (on) => set({ presentationMode: on }),

  view: { scale: 1, x: 0, y: 0 },
  setView: (view) => set({ view }),

  undoStack: [],
  redoStack: [],
  snapshotBoard: () => set((s) => pushSnap(s)),
  beginDrag: () => { pendingDragSnap = takeSnap(get()); },
  commitDrag: (roleMove) => set((s) => {
    const snap = pendingDragSnap;
    pendingDragSnap = null;
    if (!snap) return {};
    const entry: UndoEntry = roleMove ? { kind: 'role', ...roleMove, snap } : { kind: 'board', snap };
    return {
      undoStack: [...s.undoStack.slice(-(HISTORY_LIMIT - 1)), entry],
      redoStack: [],
    };
  }),
  undo: () => {
    const s = get();
    const entry = s.undoStack[s.undoStack.length - 1];
    if (!entry) return null;
    const current = takeSnap(s);
    const redoEntry: UndoEntry = entry.kind === 'role'
      ? { ...entry, snap: current }
      : { kind: 'board', snap: current };
    set({
      ...entry.snap,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, redoEntry],
      selectedAnnotationId: null,
      selectedEntityId: null,
      drawingPoints: [],
      animation: {
        ...s.animation,
        playing: false,
        progress: 0,
        activeStepIndex: Math.min(entry.snap.animation.activeStepIndex, entry.snap.steps.length - 1),
      },
    });
    return entry;
  },
  redo: () => {
    const s = get();
    const entry = s.redoStack[s.redoStack.length - 1];
    if (!entry) return null;
    const current = takeSnap(s);
    const undoEntry: UndoEntry = entry.kind === 'role'
      ? { ...entry, snap: current }
      : { kind: 'board', snap: current };
    set({
      ...entry.snap,
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, undoEntry],
      selectedAnnotationId: null,
      selectedEntityId: null,
      drawingPoints: [],
      animation: {
        ...s.animation,
        playing: false,
        progress: 0,
        activeStepIndex: Math.min(entry.snap.animation.activeStepIndex, entry.snap.steps.length - 1),
      },
    });
    return entry;
  },

  mirrorBoard: (roles = []) => set((s) => {
    const mirroredStepPositions: Record<string, Record<string, Point>> = {};
    for (const [stepId, roleMap] of Object.entries(s.stepPositions)) {
      mirroredStepPositions[stepId] = {};
      for (const [roleId, pos] of Object.entries(roleMap)) {
        mirroredStepPositions[stepId][roleId] = { x: 100 - pos.x, y: pos.y };
      }
    }
    const firstStepId = s.steps[0]?.id;
    if (firstStepId && roles.length) {
      const firstPositions = mirroredStepPositions[firstStepId] ??= {};
      for (const role of roles) {
        if (firstPositions[role.id]) continue;
        const position = role.startPosition ?? role.position;
        firstPositions[role.id] = { x: 100 - (position?.x ?? 50), y: position?.y ?? 50 };
      }
    }
    const mirroredEntityPositions: StepPositions = {};
    for (const [stepId, entityMap] of Object.entries(s.entityStepPositions)) {
      mirroredEntityPositions[stepId] = Object.fromEntries(Object.entries(entityMap).map(([entityId, position]) =>
        [entityId, { x: 100 - position.x, y: position.y }]));
    }
    return {
      ...pushSnap(s),
      annotations: s.annotations.map(a => ({
        ...a,
        points: a.points.map(p => ({ x: 100 - p.x, y: p.y })),
      })),
      entities: s.entities.map(e => ({
        ...e,
        position: { x: 100 - e.position.x, y: e.position.y },
      })),
      stepPositions: mirroredStepPositions,
      entityStepPositions: mirroredEntityPositions,
    };
  }),

  contextMenu: null,
  setContextMenu: (menu) => set({ contextMenu: menu }),

  resetStore: () => {
    const fresh = loadBoardData({});
    pendingDragSnap = null;
    set({
      ...workingBoard(fresh),
      boardExtras: {},
      activeTool: 'select',
      selectedAnnotationId: null,
      selectedEntityId: null,
      drawingPoints: [],
      animation: { playing: false, progress: 0, speed: 1, activeStepIndex: 0, playMode: 'step' },
      contextMenu: null,
      presentationMode: false,
      view: { scale: 1, x: 0, y: 0 },
      undoStack: [],
      redoStack: [],
    });
  },
}));
