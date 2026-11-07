import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBoardData, projectBoardVariant, serializeBoardData, duplicateBoardVariant } from '../../artifacts/setpiece/src/components/editor/boardVariants.ts';

const legacy = () => ({
  unknownExtension: { retained: true }, outcomes: [{ id: 'result', at: '2026-11-05', result: 'chance' }],
  publishedContent: { version: 'snapshot' },
  steps: [{ id: 'phase-1', label: 'Setup', sortOrder: 0 }, { id: 'phase-2', label: 'Run', sortOrder: 1 }],
  annotations: [{ id: 'run', stepId: 'phase-1', type: 'run_path', linkedRoleId: 'role-9', snappedStartRef: 'role-9', points: [{ x: 10, y: 20 }, { x: 35, y: 45 }] }],
  entities: [{ id: 'opponent', type: 'opponent', position: { x: 70, y: 40 } }, { id: 'ball', type: 'ball', position: { x: 5, y: 8 } }],
  stepPositions: { 'phase-1': { 'role-9': { x: 10, y: 20 } } },
});
const roles = [{ id: 'role-9', startPosition: { x: 10, y: 20 } }, { id: 'role-6', position: { x: 50, y: 60 } }];

test('legacy migration preserves source, phases, annotations, extensions, results and publication while filling every phase', () => {
  const source = legacy(), before = structuredClone(source);
  const board = loadBoardData(source, roles);
  assert.deepEqual(source, before);
  assert.equal(board.schemaVersion, 2); assert.equal(board.variants.length, 1);
  assert.deepEqual(board.steps, source.steps); assert.deepEqual(board.annotations, source.annotations);
  assert.deepEqual(board.unknownExtension, source.unknownExtension); assert.deepEqual(board.outcomes, source.outcomes);
  assert.deepEqual(board.publishedContent, source.publishedContent);
  assert.deepEqual(board.stepPositions['phase-2']['role-9'], { x: 35, y: 45 });
  assert.deepEqual(board.stepPositions['phase-2']['role-6'], { x: 50, y: 60 });
  for (const step of board.steps) for (const entity of board.entities) assert.deepEqual(board.entityStepPositions[step.id][entity.id], entity.position);
  board.entityStepPositions['phase-2'].opponent.x = 90;
  assert.equal(board.entityStepPositions['phase-1'].opponent.x, 70);
  assert.equal(board.entities[0].position.x, 70);
  assert.deepEqual(loadBoardData(serializeBoardData(board), roles), serializeBoardData(board), 'saving and reloading does not remigrate IDs or lose fields');
});

test('duplicate remaps variant/phase/annotation IDs while preserving identities and deeply isolating every value', () => {
  const a = loadBoardData(legacy(), roles).variants[0], before = structuredClone(a);
  const b = duplicateBoardVariant(a, 'B');
  assert.notEqual(a.id, b.id); assert.equal(b.name, 'B');
  assert.deepEqual(b.entities.map(e => e.id), a.entities.map(e => e.id));
  assert.notEqual(b.annotations[0].id, a.annotations[0].id);
  assert.equal(b.annotations[0].stepId, b.steps[0].id);
  assert.equal(b.annotations[0].linkedRoleId, 'role-9');
  assert.equal(b.annotations[0].snappedStartRef, 'role-9');
  assert.deepEqual(Object.keys(b.stepPositions).sort(), b.steps.map(s => s.id).sort());
  assert.deepEqual(Object.keys(b.entityStepPositions).sort(), b.steps.map(s => s.id).sort());
  b.annotations[0].points[1].x = 99;
  b.entityStepPositions[b.steps[1].id].opponent.x = 1;
  b.stepPositions[b.steps[0].id]['role-9'].y = 99;
  b.entities[0].position.x = 3;
  b.roleTasks['role-9'] = { description: 'Different run' };
  assert.deepEqual(a, before);
});

test('player default ignores editor selection; serializing B never overwrites A and unknown IDs fail closed', () => {
  let board = loadBoardData(legacy(), roles);
  const a = structuredClone(board.variants[0]), b = duplicateBoardVariant(a, 'B');
  board = projectBoardVariant({ ...board, variants: [a, b], activeVariantId: b.id }, b.id);
  board.annotations[0].points[1].x = 80;
  board.entityStepPositions[b.steps[1].id].opponent.y = 90;
  const saved = serializeBoardData(board);
  assert.deepEqual(saved.variants[0], a);
  assert.equal(saved.variants[1].annotations[0].points[1].x, 80);
  assert.equal(projectBoardVariant(saved).activeVariantId, a.id);
  assert.throws(() => projectBoardVariant(saved, 'outside'), RangeError);
  assert.throws(() => projectBoardVariant(legacy(), 'outside'), RangeError);
});
