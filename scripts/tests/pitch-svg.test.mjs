import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import * as geometry from '../../artifacts/setpiece/src/utils/pitchGeometry.ts';

const ts = createRequire(import.meta.url)('typescript');
const jsx = (type, props) => ({ type, props: props ?? {} });
const runtime = { jsx, jsxs: jsx, Fragment: 'fragment' };
const motion = { div: 'div', g: 'g' };

function load(relative, mocks) {
  const filename = new URL(`../../artifacts/setpiece/src/${relative}`, import.meta.url);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, URLSearchParams,
    window: { location: { search: '?setPieceId=synthetic-piece&playerId=synthetic-player' } },
    require(name) {
      if (name === 'react/jsx-runtime') return runtime;
      if (name === 'framer-motion') return { motion, AnimatePresence: 'presence' };
      if (name === '@/utils/pitchGeometry') return geometry;
      if (name in mocks) return mocks[name];
      throw new Error(`Unmocked import: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}

const pitch = load('components/Pitch.tsx', { react: {}, '@/lib/utils': { cn: (...values) => values.join(' ') } });
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  return [node.props?.children].flat(Infinity).map(child => find(child, predicate)).find(Boolean);
}

// A viewport with nonzero page offset, scaling, and horizontal letterboxing.
function viewport() {
  return {
    getScreenCTM: () => ({ inverse: () => ({ a: 0.5, d: 0.5, e: -35, f: -20 }) }),
    createSVGPoint: () => ({ x: 0, y: 0, matrixTransform(m) { return { x: this.x * m.a + m.e, y: this.y * m.d + m.f }; } }),
  };
}
const client = point => ({ clientX: point.x * 2 + 70, clientY: point.y * 2 + 40, currentTarget: viewport() });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

test('SVG field includes the real half-pitch center arc without a dashed cut edge', () => {
  const g = geometry.buildPitchGeometry({ width: 100, height: 150, pad: 3, orientation: 'half' });
  const tree = pitch.PitchLines({ geometry: g });
  assert.equal(find(tree, n => n.type === 'line'), undefined);
  const centerArc = geometry.arcToSvgPath(g.centerArcs[0]);
  assert.ok(find(tree, n => n.type === 'path' && n.props.d === centerArc));
});

test('SVG box outlines never repaint a boundary segment at either goal line', () => {
  for (const orientation of ['full', 'half']) for (const attackDirection of ['up', 'down']) {
    const g = geometry.buildPitchGeometry({ width: 100, height: 150, pad: 3, orientation, attackDirection });
    const tree = pitch.PitchLines({ geometry: g });
    assert.equal(Boolean(find(tree, n => n.type === 'line')), orientation === 'full');
    const outlines = [];
    const walk = node => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'path' && !node.props.d.includes('A')) outlines.push(node.props.d);
      for (const child of [node.props?.children].flat(Infinity)) walk(child);
    };
    walk(tree);
    assert.equal(outlines.length, g.penaltyAreas.length + g.goalAreas.length + g.goals.length);
    for (const d of outlines) {
      assert.ok(!d.includes('Z'), 'box outline must stay open');
      const points = d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
      assert.equal(points.length, 8, 'each box has exactly three stroked sides');
      for (let i = 0; i < 6; i += 2) {
        if (Math.abs(points[i + 1] - points[i + 3]) > 1e-6) continue;
        const y = points[i + 1];
        assert.ok(Math.abs(y - g.boundary.y) > 1e-6 && Math.abs(y - g.boundary.y - g.boundary.height) > 1e-6, 'goal line is painted only by boundary');
      }
    }
  }
});

test('SVG preview keeps markers and paths on the fitted field and inverts letterboxed clicks', () => {
  for (const halfPitch of [false, true]) {
    const answers = [];
    const tree = pitch.Pitch({ halfPitch, interactive: true, onPitchClick: p => answers.push(p), roles: [
      { id: 'synthetic-role', name: 'A', startPosition: { x: 0, y: 0 }, movementPath: [{ x: 100, y: 100 }] },
    ] });
    const svg = find(tree, n => n.type === 'svg');
    assert.equal(svg.props.preserveAspectRatio, 'xMidYMid meet');
    const g = geometry.buildPitchGeometry({ width: 100, height: 150, pad: 3, orientation: halfPitch ? 'half' : 'full' });
    const marker = find(svg, n => n.type === 'circle' && n.props.r === '3');
    close(marker.props.cx, g.boundary.x);
    close(marker.props.cy, g.boundary.y);
    const path = find(svg, n => n.type === 'path' && n.props.markerEnd);
    const end = g.percentToPixel({ x: 100, y: 100 });
    assert.ok(path.props.d.endsWith(`L ${end.x} ${end.y}`));
    const target = { x: 22.125, y: 76.875 };
    svg.props.onClick(client(g.percentToPixel(target)));
    close(answers[0].x, target.x);
    close(answers[0].y, target.y);
    svg.props.onClick(client({ x: g.boundary.x - 1, y: g.boundary.y }));
    assert.equal(answers.length, 1);
  }
  assert.equal(pitch.clientToSvgPoint({ getScreenCTM: () => null }, 0, 0), null);
});

test('quiz selects the fetched category and emits unchanged 0–100 positions after SVG inversion', () => {
  for (const category of ['offensive_corner', 'offensive_free_kick', 'throw_in']) {
    let stateIndex = 0;
    let answers = {};
    const quiz = load('pages/PlayerQuiz.tsx', {
      react: { useState(initial) { const index = stateIndex++; return [initial, next => { if (index === 1) answers = next(answers); }]; } },
      wouter: { useRoute: () => [true, { shareToken: 'synthetic-token' }], Link: 'a' },
      '@workspace/api-client-react': {
        useGetQuizQuestions: () => ({ data: { questions: [{ id: 'position', type: 'tap_zone', prompt: 'Synthetic position' }] } }),
        useGetPlayerView: () => ({ data: { setPieces: [{ id: 'synthetic-piece', category }] } }),
        useSubmitQuiz: () => ({ isPending: false }),
      },
      'lucide-react': {}, '@/components/ui/button': { Button: 'button' },
      '@/hooks/use-toast': { useToast: () => ({ toast() {} }) }, '@/components/Pitch': pitch,
    }).default;
    const svg = find(quiz(), n => n.type === 'svg');
    const field = find(svg, n => n.type === pitch.PitchLines).props.geometry;
    assert.equal(field.orientation, geometry.pitchOrientationForCategory(category));
    const target = { x: 44.618, y: 20.952 };
    svg.props.onClick(client(field.percentToPixel(target)));
    close(answers.position.x, target.x);
    close(answers.position.y, target.y);
    const before = answers;
    svg.props.onClick(client({ x: field.boundary.x, y: field.boundary.y - 1 }));
    assert.equal(answers, before);
  }
});
