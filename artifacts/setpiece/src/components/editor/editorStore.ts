import { create } from 'zustand';
import type { EditorTool, Annotation, EntityMarker, Point } from './types';

interface AnimationState {
  playing: boolean;
  progress: number;
  speed: number;
}

interface EditorState {
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

  animation: AnimationState;
  setAnimationPlaying: (playing: boolean) => void;
  setAnimationProgress: (progress: number) => void;
  setAnimationSpeed: (speed: number) => void;

  resetStore: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
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
