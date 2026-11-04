import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as editorTypes from '../../artifacts/setpiece/src/components/editor/types.ts';
import * as interaction from '../../artifacts/setpiece/src/components/editor/editorInteraction.ts';
import * as geometry from '../../artifacts/setpiece/src/utils/pitchGeometry.ts';

const require = createRequire(import.meta.url);
const appRequire = createRequire(new URL('../../artifacts/setpiece/package.json', import.meta.url));
const ts = require('typescript');

// Run the real store and component handlers; only React mounting and visual dependencies
// are replaced. Pointer hit testing, focus, and layout remain browser acceptance checks.
function loadEditor(file, dependencies, globals = {}) {
  const source = readFileSync(new URL('../../artifacts/setpiece/src/components/editor/' + file, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  const localRequire = name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(localRequire, module, module.exports, ...Object.values(globals));
  return module.exports;
}

const { useEditorStore: store } = loadEditor('editorStore.ts', {
  zustand: appRequire('zustand'), './types': editorTypes, './editorInteraction': interaction,
});
const state = () => store.getState();
const point = (x, y) => ({ x, y });
const line = (extra = {}) => ({
  id: 'run-a', type: 'run_path', points: [point(20, 30), point(40, 50)],
  color: '#ffffff', strokeWidth: 2.5, dashed: true, arrowhead: true,
  layerOrder: 0, stepId: 'phase-a', ...extra,
});
const boundLine = () => line({ snappedStartRef: 'role-a', snappedEndRef: 'ball-a', linkedRoleId: 'role-a' });
const getLine = () => state().annotations[0];

beforeEach(() => {
  state().resetStore();
  state().setSteps([{ id: 'phase-a', label: 'Aufstellung', sortOrder: 0 }]);
  state().setStrokeColor('#ffffff');
  state().setStrokeWidth(2.5);
});

test('disabled snap preserves free drawing coordinates and never binds nearby markers', () => {
  const points = [point(20.2, 30.1), point(40.2, 50.1)];
  const markers = [
    { id: 'role-a', type: 'role', position: point(20, 30) },
    { id: 'ball-a', type: 'entity', position: point(40, 50) },
  ];
  const original = structuredClone(points);
  for (const isRun of [false, true]) {
    const result = interaction.finalizeDrawingPoints(points, markers, false, isRun);
    assert.deepEqual(result.points, original);
    assert.equal(result.snappedStartRef, undefined);
    assert.equal(result.snappedEndRef, undefined);
    assert.equal(result.linkedRoleId, undefined);
  }
  assert.deepEqual(points, original, 'finalizing never mutates stored drawing points');
  const snapped = interaction.finalizeDrawingPoints(points, markers, true, true);
  assert.deepEqual(snapped.points, [point(20, 30), point(40, 50)]);
  assert.equal(snapped.snappedStartRef, 'role-a');
  assert.equal(snapped.snappedEndRef, 'ball-a');
  assert.equal(snapped.linkedRoleId, 'role-a');
  assert.equal(interaction.finalizeDrawingPoints(points, markers, true, false).linkedRoleId, undefined, 'passes do not assign a player run');
  assert.equal(interaction.finalizeDrawingPoints([...points].reverse(), markers, true, true).linkedRoleId, undefined, 'starting on a ball does not assign its target player');
});

test('editing an endpoint releases only that binding and undo restores it with its geometry', () => {
  const original = boundLine();
  state().setAnnotations([original]);
  state().beginDrag();
  state().updateAnnotationPoint(original.id, 1, point(55, 60));
  state().updateAnnotationPoint(original.id, 1, point(65, 70));
  state().commitDrag();
  assert.equal(state().undoStack.length, 1);
  assert.equal(getLine().snappedStartRef, 'role-a');
  assert.equal(getLine().snappedEndRef, undefined);
  assert.equal(getLine().linkedRoleId, 'role-a', 'semantic assignment survives geometry correction');
  state().updateSnappedAnnotations('ball-a', point(90, 90));
  assert.deepEqual(getLine().points[1], point(65, 70), 'released endpoint cannot be pulled back by its former marker');
  state().updateSnappedAnnotations('role-a', point(25, 35));
  assert.deepEqual(getLine().points[0], point(25, 35), 'other endpoint remains attached');
  state().undo();
  assert.deepEqual(getLine(), original);
  state().redo();
  assert.deepEqual(getLine().points, [point(25, 35), point(65, 70)]);
  assert.equal(getLine().snappedEndRef, undefined);
});

test('moving a whole curved path retains its shape at boundaries, releases geometry bindings, and is one undo action', () => {
  const original = line({ type: 'curved_run', points: [point(70, 20), point(85, 35), point(90, 50)], snappedStartRef: 'role-a', snappedEndRef: 'ball-a', linkedRoleId: 'role-a' });
  state().setAnnotations([original]);
  state().beginDrag();
  state().moveAnnotation(original.id, 5, -5);
  state().moveAnnotation(original.id, 25, -25);
  state().commitDrag();
  assert.deepEqual(getLine().points, [point(80, 0), point(95, 15), point(100, 30)]);
  assert.equal(getLine().snappedStartRef, undefined);
  assert.equal(getLine().snappedEndRef, undefined);
  assert.equal(getLine().linkedRoleId, 'role-a');
  const moved = structuredClone(getLine());
  state().updateSnappedAnnotations('role-a', point(0, 0));
  state().updateSnappedAnnotations('ball-a', point(0, 0));
  assert.deepEqual(getLine(), moved);
  assert.equal(state().undoStack.length, 1);
  state().undo();
  assert.deepEqual(getLine(), original);
  state().redo();
  assert.deepEqual(getLine(), moved);
});

test('a curve control point changes neither endpoint binding nor the original object', () => {
  const original = line({ type: 'curved_run', points: [point(20, 30), point(30, 10), point(40, 50)], snappedStartRef: 'role-a', snappedEndRef: 'ball-a' });
  const before = structuredClone(original);
  const changed = interaction.updateAnnotationEndpoint(original, 1, point(35, 15));
  assert.deepEqual(changed.points, [point(20, 30), point(35, 15), point(40, 50)]);
  assert.equal(changed.snappedStartRef, 'role-a');
  assert.equal(changed.snappedEndRef, 'ball-a');
  assert.deepEqual(original, before);
  assert.deepEqual(interaction.updateAnnotationEndpoint(original, -1, point(1, 1)), original);
});

test('new drawing is selected, returns to selection, and undo/redo preserves preexisting data', () => {
  const original = line({ id: 'old', label: 'Bestehende Zeichnung' });
  state().setAnnotations([original]);
  state().setActiveTool('run_path');
  state().setDrawingPoints([point(10, 20), point(30, 40)]);
  const created = line({ id: 'new' });
  state().addAnnotation(created);
  assert.equal(state().selectedAnnotationId, 'new');
  assert.equal(state().activeTool, 'select');
  assert.deepEqual(state().drawingPoints, []);
  assert.equal(state().undoStack.length, 1);
  state().undo();
  assert.deepEqual(state().annotations, [original]);
  state().redo();
  assert.deepEqual(state().annotations, [original, created]);
});

test('a role drag and all its attached endpoints restore together in one undo/redo entry', () => {
  state().setAnnotations([boundLine(), line({ id: 'later', stepId: 'phase-b', snappedStartRef: 'role-a' })]);
  const original = structuredClone(state().annotations);
  state().beginDrag();
  state().updateSnappedAnnotations('role-a', point(25, 35), 'phase-a');
  state().updateSnappedAnnotations('role-a', point(30, 40), 'phase-a');
  state().commitDrag({ roleId: 'role-a', prevPos: point(20, 30), newPos: point(30, 40) });
  assert.deepEqual(state().annotations[1], original[1], 'other phases retain their own geometry');
  const undo = state().undo();
  assert.equal(undo.kind, 'role');
  assert.deepEqual(undo.prevPos, point(20, 30));
  assert.deepEqual(undo.newPos, point(30, 40));
  assert.deepEqual(state().annotations, original);
  const redo = state().redo();
  assert.equal(redo.roleId, 'role-a');
  assert.deepEqual(getLine().points[0], point(30, 40));
  assert.equal(state().undoStack.length, 1);
});

test('free paths never move arbitrary players, regardless of annotation order', () => {
  const free = line({ id: 'free' });
  const assigned = line({ id: 'assigned', linkedRoleId: 'role-b' });
  const pass = line({ id: 'pass', type: 'pass_line', linkedRoleId: 'role-a' });
  const invalidRun = line({ id: 'incomplete', linkedRoleId: 'role-a', points: [point(10, 10)] });
  for (const annotations of [[free, assigned, pass, invalidRun], [invalidRun, pass, assigned, free]]) {
    assert.equal(interaction.findRoleRun('role-a', annotations), undefined);
    assert.equal(interaction.findRoleRun('role-b', annotations), assigned);
    assert.equal(interaction.findRoleRun('missing-role', annotations), undefined);
  }
});

function renderControls(file, name, props = {}) {
  const useEditorStore = Object.assign(selector => selector(state()), { getState: state });
  const react = {
    useState: initial => [file === 'ContextualMiniBar.tsx' && initial === null ? { x: 150, y: 100 } : initial, () => {}],
    useRef: initial => ({ current: initial }), useEffect() {}, useLayoutEffect() {},
    useMemo: compute => compute(),
  };
  const components = loadEditor(file, {
    react, 'react/jsx-runtime': appRequire('react/jsx-runtime'), 'react-dom': { createPortal: node => node },
    './editorStore': { useEditorStore }, './types': editorTypes,
    './editorInteraction': interaction,
    '@/lib/utils': { cn: (...classes) => classes.filter(Boolean).join(' ') },
    '@/hooks/use-confirm': { useConfirm: () => async () => true },
    'lucide-react': new Proxy({}, { get: (_, name) => name }),
    '@/components/ui/button': { Button: 'button' }, './BoardHealth': { BoardHealth: () => null },
    '@/lib/roleSuitability': { BADGE_STYLES: {}, ROLE_CLASS_LABELS: {} },
    '@workspace/api-client-react': { useGetSetPieceRoleSuggestions: () => ({ data: null }) },
  }, { window: { innerWidth: 1200, innerHeight: 800 } });
  function expand(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(expand);
    if (typeof node.type === 'function') return expand(node.type(node.props));
    return [node, ...expand(node.props?.children)];
  }
  return expand(components[name](props));
}

for (const [file, component, props] of [
  ['BottomBar.tsx', 'BottomBar', {}],
  ['ContextualMiniBar.tsx', 'ContextualMiniBar', { canvasRef: { current: null } }],
  ['InspectorPanel.tsx', 'InspectorPanel', { roles: [], assignments: [], activeRoleId: null }],
]) {
  test(`${component}: color changes affect only the selected annotation and are undoable once`, () => {
    const original = line();
    const other = line({ id: 'unselected' });
    state().setAnnotations([original, other]);
    state().setSelectedAnnotationId(original.id);
    const color = '#ef4444';
    const findColor = () => renderControls(file, component, props).find(node => node.type === 'button' && node.props.style?.backgroundColor === color);
    const button = findColor();
    assert.ok(button, 'a selected line exposes a color action');
    assert.ok(button.props['aria-label'] || button.props.title, 'color action has an accessible name');
    button.props.onClick();
    assert.equal(getLine().color, color);
    assert.deepEqual(state().annotations[1], other);
    assert.equal(state().strokeColor, '#ffffff', 'selection styling leaves the next drawing preset intact');
    assert.equal(state().undoStack.length, 1);
    findColor().props.onClick();
    assert.equal(state().undoStack.length, 1, 'choosing the same color creates no empty undo step');
    state().undo();
    assert.deepEqual(state().annotations, [original, other]);
    state().redo();
    assert.equal(getLine().color, color);
  });
}

test('without a selection, the bottom color action updates the next drawing preset only', () => {
  const original = line();
  state().setAnnotations([original]);
  state().setActiveTool('run_path');
  const color = '#ef4444';
  const button = renderControls('BottomBar.tsx', 'BottomBar').find(node => node.type === 'button' && node.props.style?.backgroundColor === color);
  assert.ok(button);
  button.props.onClick();
  assert.equal(state().strokeColor, color);
  assert.deepEqual(getLine(), original);
  assert.equal(state().undoStack.length, 0);
});

for (const [file, component, props] of [
  ['ContextualMiniBar.tsx', 'ContextualMiniBar', { canvasRef: { current: null } }],
  ['EditorContextMenu.tsx', 'EditorContextMenu', {}],
]) {
  test(`${component}: a duplicate retains role assignment but releases both geometric bindings`, () => {
    const original = boundLine();
    state().setAnnotations([original]);
    state().setSelectedAnnotationId(original.id);
    state().setContextMenu({ x: 0, y: 0, targetType: 'annotation', targetId: original.id });
    const button = renderControls(file, component, props).find(node => node.type === 'button' &&
      (node.props.title === 'Duplizieren' || /Duplizieren|Duplicate/.test(JSON.stringify(node.props.children) ?? '')));
    assert.ok(button);
    button.props.onClick();
    assert.equal(state().annotations.length, 2);
    const copy = state().annotations[1];
    assert.notEqual(copy.id, original.id);
    assert.notDeepEqual(copy.points, original.points);
    assert.equal(copy.linkedRoleId, original.linkedRoleId);
    assert.equal(copy.snappedStartRef, undefined);
    assert.equal(copy.snappedEndRef, undefined);
    assert.equal(state().selectedAnnotationId, copy.id);
    assert.equal(state().undoStack.length, 1);
    state().updateSnappedAnnotations('role-a', point(1, 1));
    assert.deepEqual(state().annotations[1], copy, 'moving the old anchor cannot move the copy');
    state().undo();
    assert.deepEqual(state().annotations, [original]);
  });
}

test('context-menu type conversion is an undoable action preserving curve geometry and role assignment', () => {
  const original = line({ type: 'curved_run', points: [point(20, 30), point(30, 10), point(40, 50)], linkedRoleId: 'role-a' });
  state().setAnnotations([original]);
  state().setContextMenu({ x: 0, y: 0, targetType: 'annotation', targetId: original.id });
  const button = renderControls('EditorContextMenu.tsx', 'EditorContextMenu').find(node => node.type === 'button' && (JSON.stringify(node.props.children) ?? '').includes('umwandeln'));
  assert.ok(button);
  button.props.onClick();
  assert.equal(getLine().type, 'curved_cross');
  assert.equal(getLine().dashed, false);
  assert.equal(getLine().arrowhead, true);
  assert.deepEqual(getLine().points, original.points);
  assert.equal(getLine().linkedRoleId, 'role-a');
  assert.equal(state().undoStack.length, 1);
  state().undo();
  assert.deepEqual(getLine(), original);
});

test('exported later phases preserve free-role positions and carry forward only explicitly assigned runs', () => {
  const stages = [];
  const Konva = Object.fromEntries(['Stage', 'Layer', 'Rect', 'Line', 'Circle', 'Group', 'Text', 'Arrow'].map(kind => [kind, class {
    constructor(attrs = {}) { this.kind = kind; this.attrs = attrs; this.children = []; if (kind === 'Stage') stages.push(this); }
    add(node) { this.children.push(node); }
    toDataURL() { return 'data:image/png;base64,fixture'; }
    destroy() {}
  }]));
  const { renderSetPieceSteps } = loadEditor('../../utils/offscreenPitchRenderer.ts', {
    konva: Konva, './pitchGeometry': geometry,
    '../components/editor/types': editorTypes,
    '../components/editor/editorInteraction': interaction,
  }, { document: { createElement: () => ({ style: {} }), body: { appendChild() {}, removeChild() {} } } });
  const boardData = {
    annotations: [line({ id: 'free', points: [point(10, 10), point(90, 90)] }), line({ id: 'assigned', linkedRoleId: 'role-b', points: [point(30, 30), point(50, 60)] })],
    entities: [], steps: [{ id: 'phase-a', label: 'Anfang', sortOrder: 0 }, { id: 'phase-b', label: 'Danach', sortOrder: 1 }], stepPositions: {},
  };
  const original = structuredClone(boardData);
  const roles = [{ id: 'role-b', name: 'B', startPosition: point(30, 30) }, { id: 'role-a', name: 'A', startPosition: point(10, 10) }];
  const result = renderSetPieceSteps({ width: 700, height: 900, category: 'offensive_corner_left', boardData, roles });
  assert.equal(result.length, 2);
  const g = geometry.buildPitchGeometry({ width: 700, height: 900, pad: 36, orientation: 'half' });
  const groups = stages[1].children.flatMap(layer => layer.children).filter(node => node.kind === 'Group' && node.attrs.x != null);
  assert.equal(groups.length, 2);
  for (const [index, expected] of [point(50, 60), point(10, 10)].entries()) {
    const pixel = g.percentToPixel(expected);
    assert.ok(Math.abs(groups[index].attrs.x - pixel.x) < 1e-6);
    assert.ok(Math.abs(groups[index].attrs.y - pixel.y) < 1e-6);
  }
  assert.deepEqual(boardData, original, 'rendering never rewrites the saved board');
});
