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
}

export interface BoardData {
  annotations: Annotation[];
  entities: EntityMarker[];
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
