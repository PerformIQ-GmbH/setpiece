import { create } from 'zustand';
import type { EditorTool, EditorMode, PitchTheme, Annotation, EntityMarker, Point } from './types';
import { BASIC_TOOLS } from './types';

interface AnimationState {
  playing: boolean;
  progress: number;
  speed: number;
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

  animation: AnimationState;
  setAnimationPlaying: (playing: boolean) => void;
  setAnimationProgress: (progress: number) => void;
  setAnimationSpeed: (speed: number) => void;

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

export const useEditorStore = create<EditorState>((set) => ({
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
  addAnnotation: (annotation) => set((s) => ({ annotations: [...s.annotations, annotation] })),
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

  animation: { playing: false, progress: 0, speed: 1 },
  setAnimationPlaying: (playing) => set((s) => ({ animation: { ...s.animation, playing } })),
  setAnimationProgress: (progress) => set((s) => ({ animation: { ...s.animation, progress } })),
  setAnimationSpeed: (speed) => set((s) => ({ animation: { ...s.animation, speed } })),

  resetStore: () => set({
    activeTool: 'select',
    selectedAnnotationId: null,
    selectedEntityId: null,
    annotations: [],
    entities: [],
    drawingPoints: [],
    animation: { playing: false, progress: 0, speed: 1 },
  }),
}));
