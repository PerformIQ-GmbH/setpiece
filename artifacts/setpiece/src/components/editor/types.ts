export type EditorTool =
  | 'select'
  | 'team_player'
  | 'opponent'
  | 'goalkeeper'
  | 'ball'
  | 'run_path'
  | 'curved_run'
  | 'pass_line'
  | 'curved_cross'
  | 'zone_circle'
  | 'zone_rect'
  | 'label'
  | 'erase';

export type AnnotationType =
  | 'run_path'
  | 'curved_run'
  | 'pass_line'
  | 'curved_cross'
  | 'zone_circle'
  | 'zone_rect'
  | 'label';

export type EditorMode = 'basic' | 'advanced';

export type PitchTheme = 'dark' | 'green' | 'light';

export interface Point {
  x: number;
  y: number;
}

export interface AnimationStep {
  id: string;
  label: string;
  sortOrder: number;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  points: Point[];
  color: string;
  strokeWidth: number;
  dashed: boolean;
  arrowhead: boolean;
  label?: string;
  layerOrder: number;
  radius?: number;
  width?: number;
  height?: number;
  linkedRoleId?: string;
  stepId?: string;
  ghost?: boolean;
}

export interface BoardData {
  annotations: Annotation[];
  entities: EntityMarker[];
  steps?: AnimationStep[];
}

export interface EntityMarker {
  id: string;
  type: 'opponent' | 'goalkeeper' | 'ball';
  position: Point;
  label?: string;
  shirtNumber?: number;
}

export const ANNOTATION_COLORS = [
  '#ffffff',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#f59e0b',
  '#a855f7',
  '#ec4899',
  '#06b6d4',
];

export const DEFAULT_STROKE_WIDTH = 2.5;

export const BASIC_TOOLS: EditorTool[] = [
  'select', 'team_player', 'opponent', 'ball',
  'run_path', 'pass_line',
];

export const ADVANCED_TOOLS: EditorTool[] = [
  'goalkeeper', 'curved_run', 'curved_cross',
  'zone_circle', 'zone_rect', 'label', 'erase',
];

export const ACTION_SEMANTICS: Record<string, { label: string; description: string; style: string }> = {
  run_path: { label: 'Player Run', description: 'Dashed line showing player movement', style: 'dashed' },
  curved_run: { label: 'Curved Run', description: 'Curved dashed line for arcing runs', style: 'dashed' },
  pass_line: { label: 'Pass', description: 'Solid line representing a pass', style: 'solid' },
  curved_cross: { label: 'Cross / Delivery', description: 'Curved solid line for crosses', style: 'solid' },
};

export function createDefaultStep(): AnimationStep {
  return { id: crypto.randomUUID(), label: 'Step 1', sortOrder: 0 };
}

export function migrateLegacyBoardData(bd: Partial<BoardData>): BoardData {
  const annotations = Array.isArray(bd.annotations) ? [...bd.annotations] : [];
  const entities = Array.isArray(bd.entities) ? bd.entities : [];
  let steps = Array.isArray(bd.steps) && bd.steps.length > 0 ? [...bd.steps] : [];

  if (steps.length === 0) {
    const defaultStep = createDefaultStep();
    steps = [defaultStep];
  }

  steps.sort((a, b) => a.sortOrder - b.sortOrder);

  const validStepIds = new Set(steps.map(s => s.id));
  const fallbackStepId = steps[0].id;

  for (const ann of annotations) {
    if (!ann.stepId || !validStepIds.has(ann.stepId)) {
      ann.stepId = fallbackStepId;
    }
  }

  return { annotations, entities, steps };
}

export interface PitchThemeColors {
  background: string;
  field: string;
  lines: string;
  lineAlpha: number;
  stripeAlpha: number;
  watermark: string;
  watermarkAlpha: number;
}

export const PITCH_THEMES: Record<PitchTheme, PitchThemeColors> = {
  dark: {
    background: '#0c1a12',
    field: '#0a4d2e',
    lines: '#ffffff',
    lineAlpha: 0.55,
    stripeAlpha: 0.04,
    watermark: '#ffffff',
    watermarkAlpha: 0.06,
  },
  green: {
    background: '#1a3a24',
    field: '#2d7a4f',
    lines: '#ffffff',
    lineAlpha: 0.7,
    stripeAlpha: 0.06,
    watermark: '#ffffff',
    watermarkAlpha: 0.05,
  },
  light: {
    background: '#f5f7f5',
    field: '#e8f0e8',
    lines: '#1a1a1a',
    lineAlpha: 0.85,
    stripeAlpha: 0.03,
    watermark: '#1a1a1a',
    watermarkAlpha: 0.06,
  },
};

export interface CornerPitchThemeColors {
  background: string;
  field: string;
  lines: string;
  lineWidth: number;
  thinLine: number;
  guideColor: string;
}

export const CORNER_PITCH_THEMES: Record<PitchTheme, CornerPitchThemeColors> = {
  dark: {
    background: '#0c1a12',
    field: '#0a4d2e',
    lines: '#ffffff',
    lineWidth: 1.8,
    thinLine: 1.2,
    guideColor: '#888888',
  },
  green: {
    background: '#1a3a24',
    field: '#2d7a4f',
    lines: '#ffffff',
    lineWidth: 1.8,
    thinLine: 1.2,
    guideColor: '#aaaaaa',
  },
  light: {
    background: '#f5f7f5',
    field: '#e8f0e8',
    lines: '#1a1a1a',
    lineWidth: 1.8,
    thinLine: 1.2,
    guideColor: '#b0b0b0',
  },
};
