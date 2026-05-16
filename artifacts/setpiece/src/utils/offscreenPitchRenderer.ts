import Konva from 'konva';
import { migrateLegacyBoardData } from '../components/editor/types';
import type { Annotation, AnimationStep, EntityMarker, Point } from '../components/editor/types';

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

function drawPremiumPitch(layer: Konva.Layer, w: number, h: number, halfPitch: boolean) {
  const t = PRINT_PITCH;
  const pitchW = w - PAD * 2;
  const pitchH = h - PAD * 2;
  const cx = w / 2;
  const cy = h / 2;

  const penBoxW = pitchW * 0.44;
  const penBoxH = pitchH * 0.18;
  const goalBoxW = pitchW * 0.18;
  const goalBoxH = pitchH * 0.06;
  const centerR = Math.min(pitchW, pitchH) * 0.12;
  const cornerR = Math.min(pitchW, pitchH) * 0.025;
  const penSpotDist = pitchH * 0.12;
  const stripeCount = 12;
  const stripeH = pitchH / stripeCount;

  layer.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: t.background }));
  layer.add(new Konva.Rect({ x: PAD, y: PAD, width: pitchW, height: pitchH, fill: t.field }));

  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      layer.add(new Konva.Rect({
        x: PAD, y: PAD + i * stripeH, width: pitchW, height: stripeH,
        fill: t.fieldStripe,
      }));
    }
  }

  const lw = 2.2;
  layer.add(new Konva.Rect({ x: PAD, y: PAD, width: pitchW, height: pitchH, stroke: t.lines, strokeWidth: lw }));

  if (!halfPitch) {
    layer.add(new Konva.Line({ points: [PAD, cy, PAD + pitchW, cy], stroke: t.lines, strokeWidth: lw }));
    layer.add(new Konva.Circle({ x: cx, y: cy, radius: centerR, stroke: t.lines, strokeWidth: lw }));
    layer.add(new Konva.Circle({ x: cx, y: cy, radius: 5, fill: t.lines }));
  }

  layer.add(new Konva.Rect({ x: cx - penBoxW / 2, y: PAD, width: penBoxW, height: penBoxH, stroke: t.lines, strokeWidth: lw }));
  layer.add(new Konva.Rect({ x: cx - goalBoxW / 2, y: PAD, width: goalBoxW, height: goalBoxH, stroke: t.lines, strokeWidth: lw }));
  layer.add(new Konva.Circle({ x: cx, y: PAD + penSpotDist, radius: 4, fill: t.lines }));

  layer.add(new Konva.Arc({ x: cx, y: PAD + penBoxH, innerRadius: 0, outerRadius: centerR * 0.6, angle: 180, rotation: -90, stroke: t.lines, strokeWidth: lw, fill: 'transparent' }));

  layer.add(new Konva.Arc({ x: PAD, y: PAD, innerRadius: 0, outerRadius: cornerR, angle: 90, rotation: 0, stroke: t.lines, strokeWidth: lw, fill: 'transparent' }));
  layer.add(new Konva.Arc({ x: PAD + pitchW, y: PAD, innerRadius: 0, outerRadius: cornerR, angle: 90, rotation: 90, stroke: t.lines, strokeWidth: lw, fill: 'transparent' }));

  if (!halfPitch) {
    layer.add(new Konva.Rect({ x: cx - penBoxW / 2, y: PAD + pitchH - penBoxH, width: penBoxW, height: penBoxH, stroke: t.lines, strokeWidth: lw }));
    layer.add(new Konva.Rect({ x: cx - goalBoxW / 2, y: PAD + pitchH - goalBoxH, width: goalBoxW, height: goalBoxH, stroke: t.lines, strokeWidth: lw }));
    layer.add(new Konva.Circle({ x: cx, y: PAD + pitchH - penSpotDist, radius: 4, fill: t.lines }));
    layer.add(new Konva.Arc({ x: cx, y: PAD + pitchH - penBoxH, innerRadius: 0, outerRadius: centerR * 0.6, angle: 180, rotation: 90, stroke: t.lines, strokeWidth: lw, fill: 'transparent' }));
    layer.add(new Konva.Arc({ x: PAD, y: PAD + pitchH, innerRadius: 0, outerRadius: cornerR, angle: 90, rotation: -90, stroke: t.lines, strokeWidth: lw, fill: 'transparent' }));
    layer.add(new Konva.Arc({ x: PAD + pitchW, y: PAD + pitchH, innerRadius: 0, outerRadius: cornerR, angle: 90, rotation: 180, stroke: t.lines, strokeWidth: lw, fill: 'transparent' }));
  }

  if (halfPitch) {
    layer.add(new Konva.Line({ points: [PAD, PAD + pitchH, PAD + pitchW, PAD + pitchH], stroke: t.lines, strokeWidth: lw, dash: [14, 8] }));
  }
}

function drawCornerPitch(layer: Konva.Layer, w: number, h: number) {
  const t = PRINT_CORNER_PITCH;
  const pitchW = w - PAD * 2;
  const pitchH = h - PAD * 2;

  const REF_W = 654;
  const REF_H = 608;
  const sx = (pct: number) => PAD + pct * pitchW;
  const sy = (pct: number) => PAD + pct * pitchH;
  const sw = (pct: number) => pct * pitchW;
  const sh = (pct: number) => pct * pitchH;

  const PEN_LEFT = 124 / REF_W;
  const PEN_RIGHT = 530 / REF_W;
  const PEN_TOP = 54 / REF_H;
  const PEN_BOTTOM = 165 / REF_H;
  const GOAL_LEFT = 239 / REF_W;
  const GOAL_RIGHT = 416 / REF_W;
  const GOAL_BOTTOM = 54 / REF_H;
  const PEN_SPOT_X = 327 / REF_W;
  const PEN_SPOT_Y = 78 / REF_H;
  const MID_Y = 510 / REF_H;
  const CORNER_ARC_R_REF = 14;
  const cornerR = (CORNER_ARC_R_REF / REF_W) * pitchW;

  layer.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: t.background }));
  layer.add(new Konva.Rect({ x: PAD, y: PAD, width: pitchW, height: pitchH, fill: t.field }));
  layer.add(new Konva.Rect({ x: PAD, y: PAD, width: pitchW, height: pitchH, stroke: t.lines, strokeWidth: t.lineWidth }));

  layer.add(new Konva.Rect({ x: sx(PEN_LEFT), y: sy(PEN_TOP), width: sw(PEN_RIGHT - PEN_LEFT), height: sh(PEN_BOTTOM - PEN_TOP), stroke: t.lines, strokeWidth: t.lineWidth }));
  layer.add(new Konva.Rect({ x: sx(GOAL_LEFT), y: PAD, width: sw(GOAL_RIGHT - GOAL_LEFT), height: sh(GOAL_BOTTOM), stroke: t.lines, strokeWidth: t.lineWidth }));
  layer.add(new Konva.Circle({ x: sx(PEN_SPOT_X), y: sy(PEN_SPOT_Y), radius: 4, fill: t.lines }));
  layer.add(new Konva.Line({ points: [PAD, sy(MID_Y), sx(1), sy(MID_Y)], stroke: t.lines, strokeWidth: t.thinLine, dash: [12, 6] }));

  layer.add(new Konva.Arc({ x: PAD, y: PAD, innerRadius: 0, outerRadius: cornerR, angle: 90, rotation: 0, stroke: t.lines, strokeWidth: t.thinLine, fill: 'transparent' }));
  layer.add(new Konva.Arc({ x: sx(1), y: PAD, innerRadius: 0, outerRadius: cornerR, angle: 90, rotation: 90, stroke: t.lines, strokeWidth: t.thinLine, fill: 'transparent' }));
}

function toPixel(pct: Point, w: number, h: number): Point {
  const pitchW = w - PAD * 2;
  const pitchH = h - PAD * 2;
  return {
    x: PAD + (pct.x / 100) * pitchW,
    y: PAD + (pct.y / 100) * pitchH,
  };
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

function drawAnnotations(layer: Konva.Layer, annotations: Annotation[], w: number, h: number) {
  const pitchW = w - PAD * 2;
  const pitchH = h - PAD * 2;

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
          const px = toPixel(p, w, h);
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
        const center = toPixel(ann.points[0], w, h);
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
        const p1 = toPixel(ann.points[0], w, h);
        const p2 = toPixel(ann.points[1], w, h);
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
        const pos = toPixel(ann.points[0], w, h);
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
  w: number,
  h: number,
) {
  // Opponents / GK / ball first, players on top.
  for (const ent of entities) {
    const px = toPixel(ent.position, w, h);
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
    const px = toPixel(pos, w, h);
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
  const halfPitch = !isCornerKick && category.includes('free_kick');

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
      drawAnnotations(contentLayer, stepAnns, width, height);
      drawMarkers(contentLayer, roles, assignments, players, entities, si, steps, annotations, stepPositions ?? {}, width, height);
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
