import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoard } from '../src/library-board.ts';

const roles = [
  { id: 'r1', name: 'Schütze', description: 'tritt', coachingPoint: 'scharf', startPosition: { x: 0, y: 0 } },
  { id: 'r2', name: 'Läufer', startPosition: { x: 60, y: 10 } },
];
const spec = {
  steps: ['Aufstellung', 'Lauf', 'Abschluss'], ball: [0, 0], gk: [50, 1], opponents: [[48, 6]],
  runs: [{ role: 'Läufer', step: 1, to: [[50, 6]] }, { role: 'Läufer', step: 2, to: [[46, 3]], curved: true }],
  passes: [{ step: 1, to: [[50, 6]], curved: true, label: 'Ecke' }],
};

test('board: positions are at step start, runs chain, ball follows passes, ids match roles', () => {
  const board = buildBoard(spec, roles);
  const v = board.variants[0];
  assert.deepEqual(v.steps.map((s) => s.id), ['s1', 's2', 's3']);
  assert.deepEqual(v.stepPositions.s1.r2, { x: 60, y: 10 });
  assert.deepEqual(v.stepPositions.s2.r2, { x: 60, y: 10 }, 'run in step 2 starts where s2 starts');
  assert.deepEqual(v.stepPositions.s3.r2, { x: 50, y: 6 }, 'and ends where s3 starts');
  assert.deepEqual(v.entityStepPositions.s3['ball-1'], { x: 50, y: 6 });
  assert.deepEqual(v.entityStepPositions.s1['opp-1'], { x: 48, y: 6 });
  const [run1, pass, run2] = v.annotations;
  assert.equal(run1.linkedRoleId, 'r2');
  assert.equal(run1.type, 'run_path');
  assert.equal(pass.type, 'curved_cross');
  assert.equal(pass.points.length, 3, 'two-point curve gets a bend');
  assert.equal(pass.snappedStartRef, 'ball-1');
  assert.equal(run2.points[0].x, 50, 'second run starts at the end of the first');
  assert.equal(run2.type, 'curved_run');
  assert.deepEqual(Object.keys(v.roleTasks), ['r1', 'r2']);
  assert.equal(v.roleTasks.r1.coachingPoint, 'scharf');
});

test('board: opponents can move between steps', () => {
  const v = buildBoard({ ...spec, opponentMoves: [{ opponent: 1, step: 1, to: [44, 8] }] }, roles).variants[0];
  assert.deepEqual(v.entityStepPositions.s2['opp-1'], { x: 48, y: 6 });
  assert.deepEqual(v.entityStepPositions.s3['opp-1'], { x: 44, y: 8 });
  assert.throws(() => buildBoard({ ...spec, opponentMoves: [{ opponent: 9, step: 1, to: [44, 8] }] }, roles), /Gegner unbekannt/);
});

test('board: typos and off-pitch points fail loudly', () => {
  assert.throws(() => buildBoard({ ...spec, runs: [{ role: 'Laeufer', step: 1, to: [[50, 6]] }] }, roles), /Rolle unbekannt/);
  assert.throws(() => buildBoard({ ...spec, ball: [101, 0] }, roles), /ausserhalb/);
});
