import Konva from 'konva';
import { PITCH_THEMES, CORNER_PITCH_THEMES, migrateLegacyBoardData } from '../components/editor/types';
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

const RENDER_W = 800;
const RENDER_H = 560;
const PAD = 20;
const MARKER_R = 14;

function drawPremiumPitch(layer: Konva.Layer, w: number, h: number, halfPitch: boolean) {
  const t = PITCH_THEMES.light;
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

  layer.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: t.background, cornerRadius: 10 }));
  layer.add(new Konva.Rect({ x: PAD, y: PAD, width: pitchW, height: pitchH, fill: t.field, cornerRadius: 4 }));

  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      layer.add(new Konva.Rect({
        x: PAD, y: PAD + i * stripeH, width: pitchW, height: stripeH,
        fill: '#000000', opacity: t.stripeAlpha,
      }));
    }
  }

  layer.add(new Konva.Rect({ x: PAD, y: PAD, width: pitchW, height: pitchH, stroke: t.lines, strokeWidth: 2, opacity: t.lineAlpha, cornerRadius: 2 }));

  if (!halfPitch) {
    layer.add(new Konva.Line({ points: [PAD, cy, PAD + pitchW, cy], stroke: t.lines, strokeWidth: 1.5, opacity: t.lineAlpha }));
    layer.add(new Konva.Circle({ x: cx, y: cy, radius: centerR, stroke: t.lines, strokeWidth: 1.5, opacity: t.lineAlpha }));
    layer.add(new Konva.Circle({ x: cx, y: cy, radius: 4, fill: t.lines, opacity: t.lineAlpha * 0.8 }));
  }

  layer.add(new Konva.Rect({ x: cx - penBoxW / 2, y: PAD, width: penBoxW, height: penBoxH, stroke: t.lines, strokeWidth: 1.5, opacity: t.lineAlpha }));
  layer.add(new Konva.Rect({ x: cx - goalBoxW / 2, y: PAD, width: goalBoxW, height: goalBoxH, stroke: t.lines, strokeWidth: 1.5, opacity: t.lineAlpha }));
  layer.add(new Konva.Circle({ x: cx, y: PAD + penSpotDist, radius: 3, fill: t.lines, opacity: t.lineAlpha * 0.8 }));

  layer.add(new Konva.Arc({ x: cx, y: PAD + penBoxH, innerRadius: 0, outerRadius: centerR * 0.6, angle: 180, rotation: -90, stroke: t.lines, strokeWidth: 1.5, opacity: t.lineAlpha, fill: 'transparent' }));

  layer.add(new Konva.Arc({ x: PAD, y: PAD, innerRadius: 0, outerRadius: cornerR, angle: 90, rotation: 0, stroke: t.lines, strokeWidth: 1.2, opacity: t.lineAlpha, fill: 'transparent' }));
  layer.add(new Konva.Arc({ x: PAD + pitchW, y: PAD, innerRadius: 0, outerRadius: cornerR, angle: 90, rotation: 90, stroke: t.lines, strokeWidth: 1.2, opacity: t.lineAlpha, fill: 'transparent' }));

  if (!halfPitch) {
    layer.add(new Konva.Rect({ x: cx - penBoxW / 2, y: PAD + pitchH - penBoxH, width: penBoxW, height: penBoxH, stroke: t.lines, strokeWidth: 1.5, opacity: t.lineAlpha }));
    layer.add(new Konva.Rect({ x: cx - goalBoxW / 2, y: PAD + pitchH - goalBoxH, width: goalBoxW, height: goalBoxH, stroke: t.lines, strokeWidth: 1.5, opacity: t.lineAlpha }));
    layer.add(new Konva.Circle({ x: cx, y: PAD + pitchH - penSpotDist, radius: 3, fill: t.lines, opacity: t.lineAlpha * 0.8 }));
    layer.add(new Konva.Arc({ x: cx, y: PAD + pitchH - penBoxH, innerRadius: 0, outerRadius: centerR * 0.6, angle: 180, rotation: 90, stroke: t.lines, strokeWidth: 1.5, opacity: t.lineAlpha, fill: 'transparent' }));
    layer.add(new Konva.Arc({ x: PAD, y: PAD + pitchH, innerRadius: 0, outerRadius: cornerR, angle: 90, rotation: -90, stroke: t.lines, strokeWidth: 1.2, opacity: t.lineAlpha, fill: 'transparent' }));
    layer.add(new Konva.Arc({ x: PAD + pitchW, y: PAD + pitchH, innerRadius: 0, outerRadius: cornerR, angle: 90, rotation: 180, stroke: t.lines, strokeWidth: 1.2, opacity: t.lineAlpha, fill: 'transparent' }));
  }

  if (halfPitch) {
    layer.add(new Konva.Line({ points: [PAD, PAD + pitchH, PAD + pitchW, PAD + pitchH], stroke: t.lines, strokeWidth: 2, opacity: t.lineAlpha * 0.6, dash: [10, 5] }));
  }
}

function drawCornerPitch(layer: Konva.Layer, w: number, h: number) {
  const t = CORNER_PITCH_THEMES.light;
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

  layer.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, fill: t.background, cornerRadius: 6 }));
  layer.add(new Konva.Rect({ x: PAD, y: PAD, width: pitchW, height: pitchH, fill: t.field }));
  layer.add(new Konva.Rect({ x: PAD, y: PAD, width: pitchW, height: pitchH, stroke: t.lines, strokeWidth: t.lineWidth }));

  layer.add(new Konva.Rect({ x: sx(PEN_LEFT), y: sy(PEN_TOP), width: sw(PEN_RIGHT - PEN_LEFT), height: sh(PEN_BOTTOM - PEN_TOP), stroke: t.lines, strokeWidth: t.lineWidth }));
  layer.add(new Konva.Rect({ x: sx(GOAL_LEFT), y: PAD, width: sw(GOAL_RIGHT - GOAL_LEFT), height: sh(GOAL_BOTTOM), stroke: t.lines, strokeWidth: t.lineWidth }));
  layer.add(new Konva.Circle({ x: sx(PEN_SPOT_X), y: sy(PEN_SPOT_Y), radius: 3, fill: t.lines }));
  layer.add(new Konva.Line({ points: [PAD, sy(MID_Y), sx(1), sy(MID_Y)], stroke: t.lines, strokeWidth: t.thinLine, dash: [8, 4] }));

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

function drawAnnotations(layer: Konva.Layer, annotations: Annotation[], w: number, h: number) {
  const pitchW = w - PAD * 2;
  const pitchH = h - PAD * 2;

  for (const ann of annotations) {
    const ghostColor = ann.ghost ? '#3b82f6' : ann.color;
    const ghostOpacity = ann.ghost ? 0.4 : 1;
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

        if (effectiveArrowhead) {
          layer.add(new Konva.Arrow({
            points: flat,
            stroke: ghostColor,
            strokeWidth: ann.strokeWidth,
            dash: effectiveDashed ? [8, 5] : undefined,
            tension: isCurved ? 0.4 : undefined,
            lineCap: 'round',
            lineJoin: 'round',
            pointerLength: 10,
            pointerWidth: 8,
            fill: ghostColor,
            opacity: 0.85 * ghostOpacity,
          }));
        } else {
          layer.add(new Konva.Line({
            points: flat,
            stroke: ghostColor,
            strokeWidth: ann.strokeWidth,
            dash: effectiveDashed ? [8, 5] : undefined,
            tension: isCurved ? 0.4 : undefined,
            lineCap: 'round',
            lineJoin: 'round',
            opacity: 0.85 * ghostOpacity,
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
          fill: ann.color, opacity: 0.25,
          stroke: ann.color, strokeWidth: ann.strokeWidth + 0.5, dash: [6, 4],
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
          fill: ann.color, opacity: 0.22,
          stroke: ann.color, strokeWidth: ann.strokeWidth + 0.5, dash: [6, 4], cornerRadius: 3,
        }));
        break;
      }
      case 'label': {
        if (ann.points.length < 1) continue;
        const pos = toPixel(ann.points[0], w, h);
        layer.add(new Konva.Text({
          x: pos.x, y: pos.y,
          text: ann.label || 'Label',
          fontSize: 13, fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
          fill: ann.color, opacity: 0.9,
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
  for (const ent of entities) {
    const px = toPixel(ent.position, w, h);
    if (ent.type === 'opponent') {
      const group = new Konva.Group({ x: px.x, y: px.y });
      group.add(new Konva.Circle({ radius: MARKER_R, fill: '#7f1d1d', stroke: '#dc2626', strokeWidth: 2 }));
      group.add(new Konva.Text({
        text: String(ent.shirtNumber ?? ''),
        fontSize: 12, fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
        fill: '#ffffff', align: 'center', verticalAlign: 'middle',
        width: MARKER_R * 2, height: MARKER_R * 2, x: -MARKER_R, y: -MARKER_R,
      }));
      layer.add(group);
    } else if (ent.type === 'goalkeeper') {
      const group = new Konva.Group({ x: px.x, y: px.y });
      group.add(new Konva.Circle({ radius: MARKER_R, fill: '#92400e', stroke: '#f59e0b', strokeWidth: 2 }));
      group.add(new Konva.Text({
        text: String(ent.shirtNumber ?? 'GK'),
        fontSize: 11, fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
        fill: '#ffffff', align: 'center', verticalAlign: 'middle',
        width: MARKER_R * 2, height: MARKER_R * 2, x: -MARKER_R, y: -MARKER_R,
      }));
      layer.add(group);
    } else if (ent.type === 'ball') {
      layer.add(new Konva.Circle({ x: px.x, y: px.y, radius: 8, fill: '#ffffff', stroke: '#1a1a1a', strokeWidth: 1.5 }));
    }
  }

  for (const role of roles) {
    const pos = computeRolePositionAtStep(role.id, stepIndex, roles, steps, annotations, stepPositions);
    const px = toPixel(pos, w, h);
    const assignment = assignments.find(a => a.roleId === role.id);
    const player = assignment ? players.find(p => p.id === assignment.playerId) : null;
    const isUnassigned = !assignment;

    const group = new Konva.Group({ x: px.x, y: px.y });

    const fill = isUnassigned ? '#6b7280' : '#059669';
    const border = isUnassigned ? '#9ca3af' : '#047857';

    group.add(new Konva.Circle({
      radius: MARKER_R, fill, stroke: border, strokeWidth: 2,
      dash: isUnassigned ? [4, 3] : undefined,
    }));

    if (!isUnassigned) {
      group.add(new Konva.Circle({ radius: MARKER_R - 3, fill: 'transparent', stroke: '#10b981', strokeWidth: 0.8, opacity: 0.4 }));
    }

    group.add(new Konva.Text({
      text: isUnassigned ? '?' : String(player?.shirtNumber ?? ''),
      fontSize: isUnassigned ? 15 : (player?.shirtNumber && player.shirtNumber > 9 ? 11 : 13),
      fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
      fill: isUnassigned ? '#9ca3af' : '#ffffff',
      align: 'center', verticalAlign: 'middle',
      width: MARKER_R * 2, height: MARKER_R * 2, x: -MARKER_R, y: -MARKER_R,
    }));

    const labelText = player?.lastName || (isUnassigned ? 'Unassigned' : role.name);
    group.add(new Konva.Text({
      text: labelText,
      fontSize: 9, fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
      fill: '#065f46', opacity: isUnassigned ? 0.6 : 0.95,
      align: 'center', width: 80, x: -40, y: MARKER_R + 3,
    }));

    if (player?.lastName && role.name) {
      group.add(new Konva.Text({
        text: role.name,
        fontSize: 8, fontFamily: 'Inter, sans-serif', fontStyle: '600',
        fill: '#065f46', opacity: 0.6,
        align: 'center', width: 70, x: -35, y: MARKER_R + 15,
      }));
    }

    layer.add(group);
  }
}

export interface StepImage {
  stepLabel: string;
  dataUrl: string;
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
      results.push({ stepLabel: step.label || `Step ${si + 1}`, dataUrl });

      stage.destroy();
    }
  } finally {
    document.body.removeChild(container);
  }

  return results;
}
