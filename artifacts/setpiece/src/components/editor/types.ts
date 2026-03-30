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
