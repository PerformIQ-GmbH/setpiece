// Single source of truth for football pitch geometry.
//
// All four pitch renderers (the Konva editor pitches, the offscreen PDF/print
// renderer, and the SVG thumbnail) consume this module so that the same set
// piece looks proportionally identical everywhere. This module returns geometry
// only (lines / rects / circles / arcs / points). It never deals with colors,
// stripes, watermarks, or other styling — those stay in the renderers.
//
// Coordinate model
// ----------------
// The pitch is drawn in portrait: the field width (68 m) runs left→right and the
// field length runs top→bottom. Meters are mapped into the padded interior with
// independent per-axis scaling so that the painted lines stay aligned with the
// 0–100 percentage coordinate space used to position markers. Radial features
// (circles / arcs) use the width-axis scale so they are deterministic regardless
// of viewport aspect ratio.

export const FIFA_PITCH = {
  fieldLength: 105,
  fieldWidth: 68,
  penaltyAreaDepth: 16.5,
  penaltyAreaWidth: 40.32,
  goalAreaDepth: 5.5,
  goalAreaWidth: 18.32,
  goalWidth: 7.32,
  penaltySpotDistance: 11,
  penaltyArcRadius: 9.15,
  centerCircleRadius: 9.15,
  cornerArcRadius: 1,
} as const;

export type PitchOrientation = 'full' | 'half';
export type AttackDirection = 'up' | 'down';

export interface GeoPoint {
  x: number;
  y: number;
}

export interface GeoLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GeoRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GeoCircle {
  x: number;
  y: number;
  radius: number;
}

/** An arc expressed canonically by center, radius and screen-space angles in
 *  degrees (0° = +x / east, increasing clockwise because the y-axis points
 *  down). Use {@link arcToKonva} / {@link arcToSvgPath} to consume it. */
export interface GeoArc {
  x: number;
  y: number;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface PitchGeometryOptions {
  width: number;
  height: number;
  pad?: number;
  orientation?: PitchOrientation;
  attackDirection?: AttackDirection;
}

export interface PitchGeometry {
  width: number;
  height: number;
  pad: number;
  pitchW: number;
  pitchH: number;
  orientation: PitchOrientation;
  attackDirection: AttackDirection;
  /** Field length visible in this orientation, in meters. */
  visibleLength: number;
  /** Map a width-axis meter value (0..68) to a pixel x. */
  toX: (m: number) => number;
  /** Map a length-axis meter value (measured from the top edge) to a pixel y. */
  toY: (m: number) => number;
  /** Convert a meter distance to pixels using the width-axis scale. */
  scale: (m: number) => number;
  boundary: GeoRect;
  halfwayLine: GeoLine;
  /** True when the halfway line is the cut edge of a half pitch (draw dashed). */
  isHalfwayDashed: boolean;
  centerCircle: GeoCircle | null;
  centerSpot: GeoPoint | null;
  penaltyAreas: GeoRect[];
  goalAreas: GeoRect[];
  goals: GeoRect[];
  penaltySpots: GeoPoint[];
  penaltyArcs: GeoArc[];
  cornerArcs: GeoArc[];
  /** Alignment guides (pixel coordinates) useful for the corner-kick view. */
  guides: { vertical: number[]; horizontal: number[] };
}

const DEG = 180 / Math.PI;

/** Convert a canonical {@link GeoArc} into Konva.Arc props. */
export function arcToKonva(arc: GeoArc): {
  x: number;
  y: number;
  innerRadius: number;
  outerRadius: number;
  rotation: number;
  angle: number;
} {
  return {
    x: arc.x,
    y: arc.y,
    innerRadius: 0,
    outerRadius: arc.radius,
    rotation: arc.startAngle,
    angle: arc.endAngle - arc.startAngle,
  };
}

/** Sample a canonical {@link GeoArc} into a flat `[x0, y0, x1, y1, …]` point
 *  array describing an OPEN arc. Render with a Konva `Line` (no `closed`, no
 *  `fill`) so only the curve is drawn — never the radial sector edges that a
 *  Konva `Arc` would stroke from the center to the endpoints. */
export function arcToPoints(arc: GeoArc, segments = 32): number[] {
  const rad = (d: number) => d / DEG;
  const span = arc.endAngle - arc.startAngle;
  const steps = Math.max(2, segments);
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const ang = rad(arc.startAngle + (span * i) / steps);
    pts.push(arc.x + arc.radius * Math.cos(ang), arc.y + arc.radius * Math.sin(ang));
  }
  return pts;
}

/** Convert a canonical {@link GeoArc} into an SVG path `d` string. */
export function arcToSvgPath(arc: GeoArc): string {
  const rad = (d: number) => d / DEG;
  const x1 = arc.x + arc.radius * Math.cos(rad(arc.startAngle));
  const y1 = arc.y + arc.radius * Math.sin(rad(arc.startAngle));
  const x2 = arc.x + arc.radius * Math.cos(rad(arc.endAngle));
  const y2 = arc.y + arc.radius * Math.sin(rad(arc.endAngle));
  const sweep = arc.endAngle - arc.startAngle;
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
  const sweepFlag = sweep >= 0 ? 1 : 0;
  return `M ${x1} ${y1} A ${arc.radius} ${arc.radius} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`;
}

export function buildPitchGeometry(opts: PitchGeometryOptions): PitchGeometry {
  const {
    width,
    height,
    pad = 0,
    orientation = 'full',
    attackDirection = 'up',
  } = opts;

  const F = FIFA_PITCH;
  const pitchW = width - pad * 2;
  const pitchH = height - pad * 2;
  const visibleLength = orientation === 'full' ? F.fieldLength : F.fieldLength / 2;
  const cxM = F.fieldWidth / 2;

  const toX = (m: number) => pad + (m / F.fieldWidth) * pitchW;
  const toY = (m: number) => pad + (m / visibleLength) * pitchH;
  const scale = (m: number) => (m / F.fieldWidth) * pitchW;
  // Length-axis meter -> pixels (independent of width-axis scaling).
  const depthPx = (m: number) => (m / visibleLength) * pitchH;

  const topY = pad;
  const bottomY = pad + pitchH;
  const leftX = pad;
  const rightX = pad + pitchW;

  // Half-angle (degrees) where the penalty arc meets the penalty-area edge.
  const arcAngle =
    Math.asin((F.penaltyAreaDepth - F.penaltySpotDistance) / F.penaltyArcRadius) * DEG;
  const arcR = scale(F.penaltyArcRadius);

  const penaltyAreas: GeoRect[] = [];
  const goalAreas: GeoRect[] = [];
  const goals: GeoRect[] = [];
  const penaltySpots: GeoPoint[] = [];
  const penaltyArcs: GeoArc[] = [];
  const cornerArcs: GeoArc[] = [];

  const cornerR = scale(F.cornerArcRadius);
  const goalDepthPx = Math.min(pad * 0.7, scale(1.8));

  const buildEnd = (end: 'top' | 'bottom') => {
    const isTop = end === 'top';
    const goalLineY = isTop ? topY : bottomY;
    const sign = isTop ? 1 : -1; // direction into the field

    const paDepth = depthPx(F.penaltyAreaDepth);
    const gaDepth = depthPx(F.goalAreaDepth);

    penaltyAreas.push({
      x: toX(cxM - F.penaltyAreaWidth / 2),
      y: isTop ? goalLineY : goalLineY - paDepth,
      width: scale(F.penaltyAreaWidth),
      height: paDepth,
    });

    goalAreas.push({
      x: toX(cxM - F.goalAreaWidth / 2),
      y: isTop ? goalLineY : goalLineY - gaDepth,
      width: scale(F.goalAreaWidth),
      height: gaDepth,
    });

    goals.push({
      x: toX(cxM - F.goalWidth / 2),
      y: isTop ? goalLineY - goalDepthPx : goalLineY,
      width: scale(F.goalWidth),
      height: goalDepthPx,
    });

    penaltySpots.push({
      x: toX(cxM),
      y: goalLineY + sign * depthPx(F.penaltySpotDistance),
    });

    penaltyArcs.push(
      isTop
        ? { x: toX(cxM), y: goalLineY + depthPx(F.penaltySpotDistance), radius: arcR, startAngle: arcAngle, endAngle: 180 - arcAngle }
        : { x: toX(cxM), y: goalLineY - depthPx(F.penaltySpotDistance), radius: arcR, startAngle: 180 + arcAngle, endAngle: 360 - arcAngle },
    );

    if (isTop) {
      cornerArcs.push({ x: leftX, y: topY, radius: cornerR, startAngle: 0, endAngle: 90 });
      cornerArcs.push({ x: rightX, y: topY, radius: cornerR, startAngle: 90, endAngle: 180 });
    } else {
      cornerArcs.push({ x: leftX, y: bottomY, radius: cornerR, startAngle: 270, endAngle: 360 });
      cornerArcs.push({ x: rightX, y: bottomY, radius: cornerR, startAngle: 180, endAngle: 270 });
    }
  };

  let centerCircle: GeoCircle | null = null;
  let centerSpot: GeoPoint | null = null;
  let halfwayLine: GeoLine;
  let isHalfwayDashed: boolean;
  let guideHorizontal: number;

  if (orientation === 'full') {
    buildEnd('top');
    buildEnd('bottom');
    const midY = pad + pitchH / 2;
    halfwayLine = { x1: leftX, y1: midY, x2: rightX, y2: midY };
    isHalfwayDashed = false;
    centerCircle = { x: toX(cxM), y: midY, radius: scale(F.centerCircleRadius) };
    centerSpot = { x: toX(cxM), y: midY };
    guideHorizontal = topY + depthPx(F.penaltyAreaDepth);
  } else {
    const attackingEnd = attackDirection === 'up' ? 'top' : 'bottom';
    buildEnd(attackingEnd);
    const cutY = attackDirection === 'up' ? bottomY : topY;
    halfwayLine = { x1: leftX, y1: cutY, x2: rightX, y2: cutY };
    isHalfwayDashed = true;
    guideHorizontal =
      attackDirection === 'up'
        ? topY + depthPx(F.penaltyAreaDepth)
        : bottomY - depthPx(F.penaltyAreaDepth);
  }

  return {
    width,
    height,
    pad,
    pitchW,
    pitchH,
    orientation,
    attackDirection,
    visibleLength,
    toX,
    toY,
    scale,
    boundary: { x: leftX, y: topY, width: pitchW, height: pitchH },
    halfwayLine,
    isHalfwayDashed,
    centerCircle,
    centerSpot,
    penaltyAreas,
    goalAreas,
    goals,
    penaltySpots,
    penaltyArcs,
    cornerArcs,
    guides: {
      vertical: [
        toX(cxM - F.penaltyAreaWidth / 2),
        toX(cxM),
        toX(cxM + F.penaltyAreaWidth / 2),
      ],
      horizontal: [guideHorizontal],
    },
  };
}
