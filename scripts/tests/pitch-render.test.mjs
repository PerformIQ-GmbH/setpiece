import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import * as geometry from '../../artifacts/setpiece/src/utils/pitchGeometry.ts';

const ts = createRequire(import.meta.url)('typescript');
function load(relative, mocks, globals = {}) {
  const file = new URL('../../artifacts/setpiece/src/' + relative, import.meta.url);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => { assert.ok(name in mocks, name); return mocks[name]; }, ...globals });
  return module.exports;
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('PDF renderer keeps player and annotation positions on the same metric field in every mode', () => {
  for (const category of ['offensive_corner_left', 'direct_free_kick_central', 'throw_in']) {
    for (const [width, height] of [[1400, 990], [700, 1100]]) {
      const nodes = [];
      const Konva = Object.fromEntries(['Stage', 'Layer', 'Rect', 'Line', 'Circle', 'Group', 'Text', 'Arrow'].map(kind => [kind, class {
        constructor(attrs = {}) { this.kind = kind; this.attrs = attrs; this.children = []; nodes.push(this); }
        add(node) { this.children.push(node); }
        toDataURL() { return 'data:image/png;base64,fixture'; }
        destroy() {}
      }]));
      const { renderSetPieceSteps } = load('utils/offscreenPitchRenderer.ts', {
        konva: Konva, './pitchGeometry': geometry,
        '../components/editor/types': { migrateLegacyBoardData: data => data },
      }, { document: { createElement: () => ({ style: {} }), body: { appendChild() {}, removeChild() {} } } });
      const orientation = category === 'throw_in' ? 'full' : 'half';
      const expected = geometry.buildPitchGeometry({ width, height, pad: 36, orientation });
      const position = { x: 50, y: 11 / (orientation === 'full' ? 105 : 52.5) * 100 };
      const boardData = { annotations: [{ id: 'zone', type: 'zone_circle', points: [position], radius: 5, color: '#ffffff', stepId: 'one' }], entities: [], steps: [{ id: 'one', label: 'Test' }], stepPositions: {} };
      const before = JSON.stringify(boardData);
      const result = renderSetPieceSteps({ width, height, category, boardData, roles: [{ id: 'role', name: 'Test', startPosition: position }] });
      assert.equal(result.length, 1);
      const marker = nodes.find(n => n.kind === 'Group' && n.attrs.x != null);
      near(marker.attrs.x, expected.penaltySpots[0].x); near(marker.attrs.y, expected.penaltySpots[0].y);
      const zone = nodes.find(n => n.kind === 'Circle' && Math.abs((n.attrs.radius ?? 0) - Math.min(expected.pitchW, expected.pitchH) * .05) < 1e-6);
      assert.ok(zone); near(zone.attrs.x, marker.attrs.x); near(zone.attrs.y, marker.attrs.y);
      for (const line of nodes.filter(n => n.kind === 'Line')) {
        const points = line.attrs.points ?? [];
        for (let i = 2; i < points.length; i += 2) {
          if (Math.abs(points[i - 1] - points[i + 1]) > 1e-6) continue;
          for (const goalY of [expected.boundary.y, expected.boundary.y + expected.pitchH]) {
            assert.ok(Math.abs(points[i + 1] - goalY) > 1e-6, 'goal line is painted once by the boundary');
          }
        }
      }
      assert.equal(JSON.stringify(boardData), before, 'export never rewrites stored positions');
    }
  }
});

test('snap targets match actual penalty spots, posts and box edges for full and half fields', () => {
  const { buildPitchAnchors } = load('components/editor/snapUtils.ts', { '@/utils/pitchGeometry': geometry });
  for (const orientation of ['full', 'half']) for (const attackDirection of ['up', 'down']) {
    const g = geometry.buildPitchGeometry({ width: 375, height: 812, pad: 10, orientation, attackDirection });
    const anchors = buildPitchAnchors(g).map(a => g.percentToPixel(a.pos));
    const points = [...g.penaltySpots, ...g.penaltyAreas.flatMap(r => [{ x: r.x, y: r.y }, { x: r.x + r.width, y: r.y + r.height }])];
    for (const point of points) assert.ok(anchors.some(a => Math.hypot(a.x - point.x, a.y - point.y) < 1e-6));
  }
});
