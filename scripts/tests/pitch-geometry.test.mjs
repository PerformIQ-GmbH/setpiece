import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as pitch from '../../artifacts/setpiece/src/utils/pitchGeometry.ts';
import { demoSetPiece } from '../../artifacts/setpiece/src/lib/demo-fixture.ts';

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} != ${expected}`);
const { FIFA_PITCH: F, buildPitchGeometry, arcToPoints, arcToSvgPath, pitchOrientationForCategory } = pitch;

const rectangles = [
  [400, 500, 10],
  [375, 812, 10],
  [768, 500, 20],
  [1440, 900, 24],
  [1400, 990, 20],
  [240, 240, 0],
  [1000, 100, 0],
  [100, 1000, 0],
  [0.5, 0.25, 0],
  [0.5, 0.25, 10],
];

test('penalty arcs meet the penalty-area edge in the reported 400 × 500 half-pitch regression', () => {
  const g = pitch.buildPitchGeometry({ width: 400, height: 500, pad: 10, orientation: 'half' });
  const points = pitch.arcToPoints(g.penaltyArcs[0]);
  const edgeY = g.penaltyAreas[0].y + g.penaltyAreas[0].height;
  close(points[1], edgeY, 'first arc endpoint');
  close(points.at(-1), edgeY, 'last arc endpoint');
});

for (const orientation of ['full', 'half']) {
  for (const attackDirection of ['up', 'down']) {
    test(`${orientation}/${attackDirection}: one centered metric fit, exact markings and visible goals across viewports`, () => {
      for (const [width, height, pad] of rectangles) {
        const g = buildPitchGeometry({ width, height, pad, orientation, attackDirection });
        const { boundary: b } = g;
        assert.ok(b.width > 0 && b.height > 0);
        close(b.x + b.width / 2, width / 2, 'horizontal center');
        close(b.y + b.height / 2, height / 2, 'vertical center');
        close(b.width / b.height, F.fieldWidth / g.visibleLength, 'field aspect ratio');
        close(g.toX(1) - g.toX(0), g.toY(1) - g.toY(0), 'same meter scale');
        close(g.scale(1), b.width / F.fieldWidth, 'meter radius');
        close(g.toX(0), b.x, 'left boundary');
        close(g.toY(0), b.y, 'top boundary');
        assert.equal(g.penaltyAreas.length, orientation === 'half' ? 1 : 2);

        for (const [index, area] of g.penaltyAreas.entries()) {
          close(area.width, g.scale(F.penaltyAreaWidth), 'penalty-area width');
          close(area.height, g.scale(F.penaltyAreaDepth), 'penalty-area depth');
          const spot = g.penaltySpots[index];
          const arc = g.penaltyArcs[index];
          const points = arcToPoints(arc);
          const top = orientation === 'full' ? index === 0 : attackDirection === 'up';
          const edgeY = top ? area.y + area.height : area.y;
          close(spot.y, top ? g.toY(11) : g.toY(g.visibleLength - 11), '11m penalty spot');
          close(arc.radius, g.scale(9.15), 'penalty-arc radius');
          close(points[1], edgeY, 'first arc endpoint meets area');
          close(points.at(-1), edgeY, 'last arc endpoint meets area');
          const halfChord = g.scale(Math.sqrt(F.penaltyArcRadius ** 2 - (F.penaltyAreaDepth - F.penaltySpotDistance) ** 2));
          close(Math.abs(points[0] - spot.x), halfChord, 'analytic arc connection x');
          for (let p = 0; p < points.length; p += 2) {
            close(Math.hypot(points[p] - spot.x, points[p + 1] - spot.y), arc.radius, 'all samples on circle');
            assert.ok(top ? points[p + 1] >= edgeY - 1e-6 : points[p + 1] <= edgeY + 1e-6);
          }
        }

        for (const goal of g.goals) {
          close(goal.width, g.scale(F.goalWidth), 'goal width');
          close(goal.height, g.scale(1.8), 'positive goal depth');
          assert.ok(goal.height > 0);
          assert.ok(goal.x > 0 && goal.y > 0, 'goal clears viewport top/left');
          assert.ok(goal.x + goal.width < width && goal.y + goal.height < height, 'goal clears viewport right/bottom');
        }
        for (const arc of g.cornerArcs) {
          close(arc.radius, g.scale(1), 'one-meter corner arc');
          for (const coordinate of arcToPoints(arc)) assert.ok(Number.isFinite(coordinate));
        }
        for (const area of g.goalAreas) {
          close(area.width, g.scale(F.goalAreaWidth), 'goal-area width');
          close(area.height, g.scale(F.goalAreaDepth), 'goal-area depth');
        }
      }
    });

    test(`${orientation}/${attackDirection}: saved percentages roundtrip in the visible field and reject margin clicks`, () => {
      for (const [width, height, pad] of rectangles) {
        const g = buildPitchGeometry({ width, height, pad, orientation, attackDirection });
        // Synthetic persisted corners, posts, penalty spot and penalty-area edge.
        const points = [
          { x: 0, y: 0 }, { x: 100, y: 100 }, { x: 50, y: 50 },
          { x: (F.fieldWidth - F.goalWidth) / 2 / F.fieldWidth * 100, y: 0 },
          { x: 50, y: F.penaltySpotDistance / g.visibleLength * 100 },
          { x: (F.fieldWidth - F.penaltyAreaWidth) / 2 / F.fieldWidth * 100, y: F.penaltyAreaDepth / g.visibleLength * 100 },
          { x: 23.456789123, y: 78.912345678 },
        ];
        for (const point of points) {
          const pixel = g.percentToPixel(point);
          const saved = g.pixelToPercent(pixel);
          close(saved.x, point.x, 'saved x roundtrip');
          close(saved.y, point.y, 'saved y roundtrip');
          assert.ok(g.containsPoint(pixel));
        }
        const b = g.boundary;
        assert.ok(!g.containsPoint({ x: b.x - 0.01, y: height / 2 }));
        assert.ok(!g.containsPoint({ x: width / 2, y: b.y + b.height + 0.01 }));
        assert.deepEqual(g.pixelToPercent({ x: -100, y: -100 }), { x: 0, y: 0 });
        assert.deepEqual(g.pixelToPercent({ x: width + 100, y: height + 100 }), { x: 100, y: 100 });
      }
    });
  }
}

test('half pitch shows exactly the visible center-circle half and a solid true halfway line', () => {
  for (const attackDirection of ['up', 'down']) {
    const g = buildPitchGeometry({ width: 400, height: 500, pad: 10, orientation: 'half', attackDirection });
    const cutY = attackDirection === 'up' ? g.toY(g.visibleLength) : g.toY(0);
    assert.equal(g.isHalfwayDashed, false);
    assert.equal(g.centerCircle, null);
    assert.equal(g.centerArcs.length, 1);
    close(g.halfwayLine.y1, cutY, 'halfway position');
    close(g.halfwayLine.y2, cutY, 'horizontal halfway line');
    close(g.centerSpot.y, cutY, 'center spot on halfway line');
    const arc = g.centerArcs[0];
    close(arc.radius, g.scale(F.centerCircleRadius), 'center radius');
    close(arc.endAngle - arc.startAngle, 180, 'visible half-circle angle');
    const points = arcToPoints(arc);
    close(points[1], cutY, 'center arc first endpoint');
    close(points.at(-1), cutY, 'center arc last endpoint');
    for (let i = 0; i < points.length; i += 2) {
      assert.ok(points[i + 1] >= g.boundary.y - 1e-6 && points[i + 1] <= g.toY(g.visibleLength) + 1e-6);
    }
  }
  const full = buildPitchGeometry({ width: 400, height: 500 });
  assert.equal(full.centerArcs.length, 0);
  close(full.centerCircle.radius, full.scale(9.15), 'full center-circle radius');
  close(full.halfwayLine.y1, full.toY(52.5), 'full halfway line');
});

test('half-pitch attack directions mirror all end markings and keep the same percent coordinate frame', () => {
  const up = buildPitchGeometry({ width: 375, height: 812, pad: 10, orientation: 'half', attackDirection: 'up' });
  const down = buildPitchGeometry({ width: 375, height: 812, pad: 10, orientation: 'half', attackDirection: 'down' });
  assert.deepEqual(up.boundary, down.boundary);
  assert.deepEqual(up.percentToPixel({ x: 10, y: 20 }), down.percentToPixel({ x: 10, y: 20 }));
  for (const key of ['goals', 'penaltyAreas', 'goalAreas']) {
    close(up[key][0].y + up[key][0].height, up.height - down[key][0].y, `${key} mirrored y`);
    close(up[key][0].x, down[key][0].x, `${key} preserved x`);
  }
  close(up.penaltySpots[0].y, up.height - down.penaltySpots[0].y, 'mirrored spot');
  for (const key of ['penaltyArcs', 'cornerArcs', 'centerArcs']) {
    for (const [index, arc] of up[key].entries()) {
      const mirrored = arcToPoints(down[key][index]);
      const points = arcToPoints(arc);
      close(arc.x, down[key][index].x, `${key} center x`);
      close(arc.y, up.height - down[key][index].y, `${key} center y`);
      close(Math.abs(arc.endAngle - arc.startAngle), Math.abs(down[key][index].endAngle - down[key][index].startAngle), `${key} span`);
      assert.equal(points.length, mirrored.length);
      // Reflection reverses the winding, so compare coordinate pairs in reverse order.
      for (let i = 0; i < points.length; i += 2) {
        close(points[i], mirrored[mirrored.length - 2 - i], `${key} sample x`);
        close(points[i + 1], up.height - mirrored[mirrored.length - 1 - i], `${key} sample y`);
      }
    }
  }
});

test('arcs use open curve output and categories share one orientation resolver', () => {
  const g = buildPitchGeometry({ width: 400, height: 500, orientation: 'half' });
  for (const arc of [...g.penaltyArcs, ...g.cornerArcs, ...g.centerArcs]) {
    const path = arcToSvgPath(arc);
    assert.match(path, /^M .* A /);
    assert.doesNotMatch(path, /[ZzLl]/, 'no radial sector edges or closure');
    assert.equal(arcToPoints(arc, 8).length, 18);
  }
  assert.equal(pitchOrientationForCategory('corner'), 'half');
  assert.equal(pitchOrientationForCategory('free_kick'), 'half');
  for (const category of ['throw_in', 'penalty', 'open_play', 'unknown']) {
    assert.equal(pitchOrientationForCategory(category), 'full');
  }
});

test('every database category and the public demo select the established pitch crop', async () => {
  const source = await readFile(new URL('../../lib/db/src/schema/setPieceTemplates.ts', import.meta.url), 'utf8');
  const enumBody = source.match(/pgEnum\("set_piece_category",\s*\[([\s\S]*?)\]\)/)?.[1];
  assert.ok(enumBody, 'read the actual category enum');
  const categories = [...enumBody.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  const expected = {
    offensive_corner_left: 'half',
    offensive_corner_right: 'half',
    defensive_corner_left: 'half',
    defensive_corner_right: 'half',
    direct_free_kick_central: 'half',
    direct_free_kick_left: 'half',
    direct_free_kick_right: 'half',
    indirect_free_kick_wide: 'half',
    indirect_free_kick_left: 'half',
    indirect_free_kick_right: 'half',
    attacking_throw_in: 'full',
    defensive_throw_in: 'full',
  };
  assert.deepEqual(categories.sort(), Object.keys(expected).sort(), 'cover every real enum category');
  for (const category of categories) {
    assert.equal(pitchOrientationForCategory(category), expected[category], category);
  }
  assert.equal(pitchOrientationForCategory(demoSetPiece.category), 'half', demoSetPiece.category);
});
