import Konva from 'konva';
import { migrateLegacyBoardData } from '../components/editor/types';
import type { Annotation, AnimationStep, EntityMarker, Point } from '../components/editor/types';
import { arcToPoints, buildPitchGeometry, pitchOrientationForCategory, type PitchGeometry } from './pitchGeometry';

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

interface RenderOptions {
  boardData: Record<string, unknown>;
  roles: RoleData[];
  assignments?: AssignmentData[];
  players?: PlayerData[];
  category?: string;
  width?: number;
  height?: number;
}

// Landscape A4 aspect (297 / 210 ≈ 1.414). Resolution tuned for crisp print.
const RENDER_W = 1400;
const RENDER_H = 990;
const PAD = 36;
const MARKER_R = 26;

const PRINT_PITCH = {
  background: '#ffffff',
  field: '#b9d8a8',
  fieldStripe: '#a8cd96',
  lines: '#0b1f12',
  lineAlpha: 1,
  stripeAlpha: 1,
};

const PRINT_CORNER_PITCH = {
  background: '#ffffff',
  field: '#b9d8a8',
  lines: '#0b1f12',
  lineWidth: 2.4,
  thinLine: 1.8,
};

function areaOutline(r: PitchGeometry['boundary'], g: PitchGeometry, goal = false) {
  const openTop = goal ? Math.abs(r.y - (g.boundary.y + g.pitchH)) < 1e-6 : Math.abs(r.y - g.boundary.y) < 1e-6;
  return openTop
    ? [r.x, r.y, r.x, r.y + r.height, r.x + r.width, r.y + r.height, r.x + r.width, r.y]
    : [r.x, r.y + r.height, r.x, r.y, r.x + r.width, r.y, r.x + r.width, r.y + r.height];
}

function drawPremiumPitch(layer: Konva.Layer, w: number, h: number, halfPitch: boolean) {
  const t = PRINT_PITCH;
  const g = buildPitchGeometry({ width: w, height: h, pad: PAD, orientation: halfPitch ? 'half' : 'full' });
  const lw = 2.2;

  const stripeCount = 12;
  const stripeH = g.pitchH / stripeCount;

  layer.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: t.background }));
  layer.add(new Konva.Rect({ x: g.boundary.x, y: g.boundary.y, width: g.boundary.width, height: g.boundary.height, fill: t.field }));

  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      layer.add(new Konva.Rect({
        x: g.boundary.x, y: g.boundary.y + i * stripeH, width: g.boundary.width, height: stripeH,
        fill: t.fieldStripe,
      }));
    }
  }

  layer.add(new Konva.Rect({ x: g.boundary.x, y: g.boundary.y, width: g.boundary.width, height: g.boundary.height, stroke: t.lines, strokeWidth: lw }));

  if (g.orientation === 'full') layer.add(new Konva.Line({
    points: [g.halfwayLine.x1, g.halfwayLine.y1, g.halfwayLine.x2, g.halfwayLine.y2],
    stroke: t.lines, strokeWidth: lw,
  }));
  if (g.centerCircle) {
    layer.add(new Konva.Circle({ x: g.centerCircle.x, y: g.centerCircle.y, radius: g.centerCircle.radius, stroke: t.lines, strokeWidth: lw }));
  }
  if (g.centerSpot) {
    layer.add(new Konva.Circle({ x: g.centerSpot.x, y: g.centerSpot.y, radius: 5, fill: t.lines }));
  }

  for (const r of g.penaltyAreas) {
    layer.add(new Konva.Line({ points: areaOutline(r, g), stroke: t.lines, strokeWidth: lw }));
  }
  for (const r of g.goalAreas) {
    layer.add(new Konva.Line({ points: areaOutline(r, g), stroke: t.lines, strokeWidth: lw }));
  }
  for (const r of g.goals) {
    layer.add(new Konva.Line({ points: areaOutline(r, g, true), stroke: t.lines, strokeWidth: lw }));
  }
  for (const p of g.penaltySpots) {
    layer.add(new Konva.Circle({ x: p.x, y: p.y, radius: 4, fill: t.lines }));
  }
  for (const a of [...g.centerArcs, ...g.penaltyArcs]) {
    layer.add(new Konva.Line({ points: arcToPoints(a), stroke: t.lines, strokeWidth: lw, lineCap: 'round', lineJoin: 'round' }));
  }
  for (const a of g.cornerArcs) {
    layer.add(new Konva.Line({ points: arcToPoints(a), stroke: t.lines, strokeWidth: lw, lineCap: 'round', lineJoin: 'round' }));
  }
}

function drawCornerPitch(layer: Konva.Layer, w: number, h: number) {
  const t = PRINT_CORNER_PITCH;
  const g = buildPitchGeometry({ width: w, height: h, pad: PAD, orientation: 'half' });

  layer.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: t.background }));
  layer.add(new Konva.Rect({ x: g.boundary.x, y: g.boundary.y, width: g.boundary.width, height: g.boundary.height, fill: t.field }));
  layer.add(new Konva.Rect({ x: g.boundary.x, y: g.boundary.y, width: g.boundary.width, height: g.boundary.height, stroke: t.lines, strokeWidth: t.lineWidth }));

  for (const r of g.penaltyAreas) {
    layer.add(new Konva.Line({ points: areaOutline(r, g), stroke: t.lines, strokeWidth: t.lineWidth }));
  }
  for (const r of g.goalAreas) {
    layer.add(new Konva.Line({ points: areaOutline(r, g), stroke: t.lines, strokeWidth: t.lineWidth }));
  }
  for (const r of g.goals) {
    layer.add(new Konva.Line({ points: areaOutline(r, g, true), stroke: t.lines, strokeWidth: t.lineWidth }));
  }
  for (const p of g.penaltySpots) {
    layer.add(new Konva.Circle({ x: p.x, y: p.y, radius: 4, fill: t.lines }));
  }
  for (const a of [...g.centerArcs, ...g.penaltyArcs]) {
    layer.add(new Konva.Line({ points: arcToPoints(a), stroke: t.lines, strokeWidth: t.lineWidth, lineCap: 'round', lineJoin: 'round' }));
  }

  for (const a of g.cornerArcs) {
    layer.add(new Konva.Line({ points: arcToPoints(a), stroke: t.lines, strokeWidth: t.thinLine, lineCap: 'round', lineJoin: 'round' }));
  }
}

// Print-tuned annotation colors: solid, dark, no washed-out tones.
function tunedColor(input: string, isGhost: boolean): string {
  if (isGhost) return '#1e3a8a';
  const c = (input || '').toLowerCase();
  // Replace washed/bright tones with denser equivalents that pop on green.
  if (c === '#ffffff' || c === 'white') return '#0b1f12';
  if (c === '#10b981' || c === '#34d399') return '#065f46';
  if (c === '#f59e0b' || c === '#fbbf24') return '#b45309';
  if (c === '#a855f7' || c === '#c084fc') return '#6b21a8';
  if (c === '#ec4899' || c === '#f472b6') return '#9d174d';
  if (c === '#06b6d4' || c === '#22d3ee') return '#0e7490';
  if (c === '#3b82f6' || c === '#60a5fa') return '#1d4ed8';
  if (c === '#ef4444' || c === '#f87171') return '#b91c1c';
  return input;
}

function drawAnnotations(layer: Konva.Layer, annotations: Annotation[], g: PitchGeometry) {
  const { pitchW, pitchH } = g;

  for (const ann of annotations) {
    const drawColor = tunedColor(ann.color, !!ann.ghost);
    const isRun = ann.type === 'run_path' || ann.type === 'curved_run';
    const isPass = ann.type === 'pass_line' || ann.type === 'curved_cross';
    const effectiveDashed = isRun;
    const effectiveArrowhead = isRun || isPass;
    const isCurved = ann.type === 'curved_run' || ann.type === 'curved_cross';

    switch (ann.type) {
      case 'run_path':
      case 'pass_line':
      case 'curved_run':
      case 'curved_cross': {
        if (ann.points.length < 2) continue;
        const flat: number[] = [];
        for (const p of ann.points) {
          const px = g.percentToPixel(p);
          flat.push(px.x, px.y);
        }

        // Bold, fully opaque arrows tuned for print legibility.
        const baseWidth = Math.max(ann.strokeWidth ?? 3, 3);
        const strokeW = baseWidth * 1.9 + 2.5;
        const haloW = strokeW + 3;
        const haloColor = '#0b1f12';

        if (effectiveArrowhead) {
          // Dark halo behind the arrow so it pops against the green pitch.
          layer.add(new Konva.Arrow({
            points: flat,
            stroke: haloColor,
            strokeWidth: haloW,
            dash: effectiveDashed ? [16, 10] : undefined,
            tension: isCurved ? 0.4 : undefined,
            lineCap: 'round',
            lineJoin: 'round',
            pointerLength: 18,
            pointerWidth: 16,
            fill: haloColor,
            opacity: 1,
          }));
          layer.add(new Konva.Arrow({
            points: flat,
            stroke: drawColor,
            strokeWidth: strokeW,
            dash: effectiveDashed ? [16, 10] : undefined,
            tension: isCurved ? 0.4 : undefined,
            lineCap: 'round',
            lineJoin: 'round',
            pointerLength: 16,
            pointerWidth: 14,
            fill: drawColor,
            opacity: 1,
          }));
        } else {
          layer.add(new Konva.Line({
            points: flat,
            stroke: haloColor,
            strokeWidth: haloW,
            dash: effectiveDashed ? [16, 10] : undefined,
            tension: isCurved ? 0.4 : undefined,
            lineCap: 'round',
            lineJoin: 'round',
            opacity: 1,
          }));
          layer.add(new Konva.Line({
            points: flat,
            stroke: drawColor,
            strokeWidth: strokeW,
            dash: effectiveDashed ? [16, 10] : undefined,
            tension: isCurved ? 0.4 : undefined,
            lineCap: 'round',
            lineJoin: 'round',
            opacity: 1,
          }));
        }
        break;
      }
      case 'zone_circle': {
        if (ann.points.length < 1) continue;
        const center = g.percentToPixel(ann.points[0]);
        const r = (ann.radius ?? 10) / 100 * Math.min(pitchW, pitchH);
        layer.add(new Konva.Circle({
          x: center.x, y: center.y, radius: r,
          fill: drawColor, opacity: 0.18,
          stroke: drawColor, strokeWidth: 3, dash: [10, 6],
        }));
        break;
      }
      case 'zone_rect': {
        if (ann.points.length < 2) continue;
        const p1 = g.percentToPixel(ann.points[0]);
        const p2 = g.percentToPixel(ann.points[1]);
        layer.add(new Konva.Rect({
          x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y),
          width: Math.abs(p2.x - p1.x), height: Math.abs(p2.y - p1.y),
          fill: drawColor, opacity: 0.16,
          stroke: drawColor, strokeWidth: 3, dash: [10, 6], cornerRadius: 4,
        }));
        break;
      }
      case 'label': {
        if (ann.points.length < 1) continue;
        const pos = g.percentToPixel(ann.points[0]);
        layer.add(new Konva.Text({
          x: pos.x, y: pos.y,
          text: ann.label || 'Label',
          fontSize: 22, fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
          fill: drawColor,
        }));
        break;
      }
    }
  }
}

function resolvePositionForStep(
  roleId: string,
  roles: RoleData[],
  stepAnns: Annotation[],
  startPos: Point,
): Point {
  const linkedRun = stepAnns.find(
    a => a.linkedRoleId === roleId && (a.type === 'run_path' || a.type === 'curved_run') && a.points.length >= 2
  );
  if (linkedRun) {
    const last = linkedRun.points[linkedRun.points.length - 1];
    return { x: last?.x ?? startPos.x, y: last?.y ?? startPos.y };
  }

  const unlinkedRuns = stepAnns.filter(
    a => !a.linkedRoleId && (a.type === 'run_path' || a.type === 'curved_run') && a.points.length >= 2
  );
  const roleIdx = roles.findIndex(r => r.id === roleId);
  const usedLinkedCount = stepAnns.filter(
    a => a.linkedRoleId && (a.type === 'run_path' || a.type === 'curved_run') && a.points.length >= 2
  ).length;
  const unlinkedIdx = roleIdx - usedLinkedCount;
  if (unlinkedIdx >= 0 && unlinkedIdx < unlinkedRuns.length) {
    const run = unlinkedRuns[unlinkedIdx];
    const last = run.points[run.points.length - 1];
    return { x: last?.x ?? startPos.x, y: last?.y ?? startPos.y };
  }

  return startPos;
}

function computeRolePositionAtStep(
  roleId: string,
  stepIndex: number,
  roles: RoleData[],
  steps: AnimationStep[],
  annotations: Annotation[],
  stepPositions: Record<string, Record<string, Point>>,
): Point {
  const role = roles.find(r => r.id === roleId);
  const basePos = { x: role?.startPosition?.x ?? 50, y: role?.startPosition?.y ?? 50 };
  const sortedStepIds = steps.map(s => s.id);
  const clampedIndex = Math.max(0, Math.min(stepIndex, sortedStepIds.length - 1));

  if (clampedIndex === 0) {
    const sid0 = sortedStepIds[0];
    if (sid0 && stepPositions[sid0]?.[roleId]) {
      return stepPositions[sid0][roleId];
    }
    return basePos;
  }

  let cur = basePos;
  for (let i = 0; i < clampedIndex; i++) {
    const prevSid = sortedStepIds[i];
    if (prevSid && stepPositions[prevSid]?.[roleId]) {
      cur = stepPositions[prevSid][roleId];
    }
    const prevAnns = annotations.filter(a => a.stepId === prevSid);
    const endOfRun = resolvePositionForStep(roleId, roles, prevAnns, cur);
    if (endOfRun.x !== cur.x || endOfRun.y !== cur.y) cur = endOfRun;
  }

  const targetSid = sortedStepIds[clampedIndex];
  if (targetSid && stepPositions[targetSid]?.[roleId]) {
    return stepPositions[targetSid][roleId];
  }
  return cur;
}

function drawTextWithBackdrop(
  layer: Konva.Layer,
  text: string,
  x: number,
  y: number,
  opts: { fontSize: number; width: number; fill: string; padY?: number },
) {
  const padX = 5;
  const padY = opts.padY ?? 2;
  // Approximate text width — we let Konva center inside the given width.
  layer.add(new Konva.Rect({
    x: x - opts.width / 2 - padX,
    y: y - padY,
    width: opts.width + padX * 2,
    height: opts.fontSize + padY * 2,
    fill: '#ffffff',
    opacity: 0.92,
    cornerRadius: 4,
    stroke: '#0b1f12',
    strokeWidth: 0.8,
  }));
  layer.add(new Konva.Text({
    text,
    x: x - opts.width / 2,
    y,
    width: opts.width,
    fontSize: opts.fontSize,
    fontFamily: 'Inter, sans-serif',
    fontStyle: 'bold',
    fill: opts.fill,
    align: 'center',
  }));
}

function drawMarkers(
  layer: Konva.Layer,
  roles: RoleData[],
  assignments: AssignmentData[],
  players: PlayerData[],
  entities: EntityMarker[],
  stepIndex: number,
  steps: AnimationStep[],
  annotations: Annotation[],
  stepPositions: Record<string, Record<string, Point>>,
  g: PitchGeometry,
) {
  // Opponents / GK / ball first, players on top.
  for (const ent of entities) {
    const px = g.percentToPixel(ent.position);
    if (ent.type === 'opponent') {
      const group = new Konva.Group({ x: px.x, y: px.y });
      group.add(new Konva.Circle({ radius: MARKER_R, fill: '#7f1d1d', stroke: '#0b1f12', strokeWidth: 3 }));
      group.add(new Konva.Text({
        text: String(ent.shirtNumber ?? ''),
        fontSize: 22, fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
        fill: '#ffffff', align: 'center', verticalAlign: 'middle',
        width: MARKER_R * 2, height: MARKER_R * 2, x: -MARKER_R, y: -MARKER_R,
      }));
      layer.add(group);
    } else if (ent.type === 'goalkeeper') {
      const group = new Konva.Group({ x: px.x, y: px.y });
      group.add(new Konva.Circle({ radius: MARKER_R, fill: '#b45309', stroke: '#0b1f12', strokeWidth: 3 }));
      group.add(new Konva.Text({
        text: String(ent.shirtNumber ?? 'GK'),
        fontSize: 20, fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
        fill: '#ffffff', align: 'center', verticalAlign: 'middle',
        width: MARKER_R * 2, height: MARKER_R * 2, x: -MARKER_R, y: -MARKER_R,
      }));
      layer.add(group);
    } else if (ent.type === 'ball') {
      layer.add(new Konva.Circle({ x: px.x, y: px.y, radius: 13, fill: '#ffffff', stroke: '#0b1f12', strokeWidth: 2.5 }));
      layer.add(new Konva.Circle({ x: px.x, y: px.y, radius: 4, fill: '#0b1f12' }));
    }
  }

  for (const role of roles) {
    const pos = computeRolePositionAtStep(role.id, stepIndex, roles, steps, annotations, stepPositions);
    const px = g.percentToPixel(pos);
    const assignment = assignments.find(a => a.roleId === role.id);
    const player = assignment ? players.find(p => p.id === assignment.playerId) : null;
    const isUnassigned = !assignment;

    const group = new Konva.Group({ x: px.x, y: px.y });

    const fill = isUnassigned ? '#6b7280' : '#065f46';
    const border = '#0b1f12';

    group.add(new Konva.Circle({
      radius: MARKER_R, fill, stroke: border, strokeWidth: 3,
      dash: isUnassigned ? [6, 4] : undefined,
    }));

    const num = isUnassigned ? '?' : String(player?.shirtNumber ?? '');
    group.add(new Konva.Text({
      text: num,
      fontSize: num.length > 2 ? 18 : 24,
      fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
      fill: '#ffffff',
      align: 'center', verticalAlign: 'middle',
      width: MARKER_R * 2, height: MARKER_R * 2, x: -MARKER_R, y: -MARKER_R,
    }));

    layer.add(group);

    // Player name label with white backdrop for legibility on the green pitch.
    const labelText = player?.lastName || (isUnassigned ? 'Unassigned' : role.name);
    drawTextWithBackdrop(layer, labelText, px.x, px.y + MARKER_R + 4, {
      fontSize: 14,
      width: 110,
      fill: '#0b1f12',
    });
  }
}

export interface StepImage {
  stepLabel: string;
  dataUrl: string;
  aspect: number; // width / height
}

export function renderSetPieceSteps(options: RenderOptions): StepImage[] {
  const {
    boardData,
    roles,
    assignments = [],
    players = [],
    category = '',
    width = RENDER_W,
    height = RENDER_H,
  } = options;

  const migrated = migrateLegacyBoardData(boardData as any);
  const { annotations, entities, stepPositions } = migrated;
  const steps = migrated.steps || [];

  const isCornerKick = category.includes('corner');
  const orientation = pitchOrientationForCategory(category);
  const halfPitch = orientation === 'half';
  const geometry = buildPitchGeometry({ width, height, pad: PAD, orientation });

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);

  const results: StepImage[] = [];

  try {
    for (let si = 0; si < steps.length; si++) {
      const step = steps[si];
      const stepId = step.id;
      const stepAnns = annotations.filter(a => a.stepId === stepId);

      const stage = new Konva.Stage({ container, width, height });

      const pitchLayer = new Konva.Layer();
      if (isCornerKick) {
        drawCornerPitch(pitchLayer, width, height);
      } else {
        drawPremiumPitch(pitchLayer, width, height, halfPitch);
      }
      stage.add(pitchLayer);

      const contentLayer = new Konva.Layer();
      drawAnnotations(contentLayer, stepAnns, geometry);
      drawMarkers(contentLayer, roles, assignments, players, entities, si, steps, annotations, stepPositions ?? {}, geometry);
      stage.add(contentLayer);

      const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
      results.push({ stepLabel: step.label || `Step ${si + 1}`, dataUrl, aspect: width / height });

      stage.destroy();
    }
  } finally {
    document.body.removeChild(container);
  }

  return results;
}
