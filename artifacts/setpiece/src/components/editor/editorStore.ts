import { create } from 'zustand';
import type { EditorTool, EditorMode, PitchTheme, Annotation, EntityMarker, Point, AnimationStep } from './types';
import { BASIC_TOOLS, createDefaultStep } from './types';

interface AnimationState {
  playing: boolean;
  progress: number;
  speed: number;
  activeStepIndex: number;
  playMode: 'step' | 'all';
}

interface EditorState {
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

  mirrorBoard: () => void;

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

const defaultStep = createDefaultStep();

export const useEditorStore = create<EditorState>((set, get) => ({
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
  setActiveTool: (tool) => set({ activeTool: tool, selectedAnnotationId: null, selectedEntityId: null }),

  selectedAnnotationId: null,
  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id, selectedEntityId: null }),

  annotations: [],
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) => set((s) => {
    const activeStep = s.steps[s.animation.activeStepIndex];
    const ann = activeStep && !annotation.stepId
      ? { ...annotation, stepId: activeStep.id }
      : annotation;
    return { annotations: [...s.annotations, ann] };
  }),
  updateAnnotation: (id, updates) => set((s) => ({
    annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...updates } : a)),
  })),
  deleteAnnotation: (id) => set((s) => ({
    annotations: s.annotations.filter((a) => a.id !== id),
    selectedAnnotationId: s.selectedAnnotationId === id ? null : s.selectedAnnotationId,
  })),
  moveAnnotation: (id, dxPct, dyPct) => set((s) => ({
    annotations: s.annotations.map((a) => {
      if (a.id !== id) return a;
      return {
        ...a,
        points: a.points.map((p) => ({
          x: Math.max(0, Math.min(100, p.x + dxPct)),
          y: Math.max(0, Math.min(100, p.y + dyPct)),
        })),
      };
    }),
  })),
  clearAnnotations: () => set({ annotations: [], selectedAnnotationId: null }),

  entities: [],
  setEntities: (entities) => set({ entities }),
  addEntity: (entity) => set((s) => ({ entities: [...s.entities, entity] })),
  updateEntity: (id, updates) => set((s) => ({
    entities: s.entities.map((e) => (e.id === id ? { ...e, ...updates } : e)),
  })),
  deleteEntity: (id) => set((s) => ({
    entities: s.entities.filter((e) => e.id !== id),
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

  steps: [defaultStep],
  setSteps: (steps) => set({ steps }),
  addStep: () => set((s) => {
    const maxOrder = s.steps.reduce((max, st) => Math.max(max, st.sortOrder), -1);
    const newStep: AnimationStep = {
      id: crypto.randomUUID(),
      label: `Step ${s.steps.length + 1}`,
      sortOrder: maxOrder + 1,
    };
    return { steps: [...s.steps, newStep] };
  }),
  updateStep: (id, updates) => set((s) => ({
    steps: s.steps.map((st) => (st.id === id ? { ...st, ...updates } : st)),
  })),
  deleteStep: (id) => set((s) => {
    if (s.steps.length <= 1) return s;
    const filtered = s.steps.filter((st) => st.id !== id);
    const fallbackId = filtered[0]?.id;
    return {
      steps: filtered,
      annotations: s.annotations.map((a) =>
        a.stepId === id ? { ...a, stepId: fallbackId } : a
      ),
      animation: {
        ...s.animation,
        activeStepIndex: Math.min(s.animation.activeStepIndex, filtered.length - 1),
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
      steps: newSteps,
      animation: { ...s.animation, activeStepIndex: newIdx >= 0 ? newIdx : s.animation.activeStepIndex },
    };
  }),

  animation: { playing: false, progress: 0, speed: 1, activeStepIndex: 0, playMode: 'step' },
  setAnimationPlaying: (playing) => set((s) => ({ animation: { ...s.animation, playing } })),
  setAnimationProgress: (progress) => set((s) => ({ animation: { ...s.animation, progress } })),
  setAnimationSpeed: (speed) => set((s) => ({ animation: { ...s.animation, speed } })),
  setActiveStepIndex: (index) => set((s) => ({
    animation: { ...s.animation, activeStepIndex: index, progress: 0, playing: false },
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
  setLayerVisibility: (layer, visible) => set((s) => ({
    layerVisibility: { ...s.layerVisibility, [layer]: visible },
  })),
  setLayerLocked: (layer, locked) => set((s) => ({
    layerLocked: { ...s.layerLocked, [layer]: locked },
  })),

  presentationMode: false,
  setPresentationMode: (on) => set({ presentationMode: on }),

  mirrorBoard: () => set((s) => ({
    annotations: s.annotations.map(a => ({
      ...a,
      points: a.points.map(p => ({ x: 100 - p.x, y: p.y })),
    })),
    entities: s.entities.map(e => ({
      ...e,
      position: { x: 100 - e.position.x, y: e.position.y },
    })),
  })),

  contextMenu: null,
  setContextMenu: (menu) => set({ contextMenu: menu }),

  resetStore: () => {
    const fresh = createDefaultStep();
    set({
      activeTool: 'select',
      selectedAnnotationId: null,
      selectedEntityId: null,
      annotations: [],
      entities: [],
      drawingPoints: [],
      steps: [fresh],
      animation: { playing: false, progress: 0, speed: 1, activeStepIndex: 0, playMode: 'step' },
      contextMenu: null,
      presentationMode: false,
    });
  },
}));
