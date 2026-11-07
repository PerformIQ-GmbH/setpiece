import test from 'node:test';
import assert from 'node:assert/strict';
import { publishContent, preservePublication, playerContent, variantTask, taskScopeAnswer, taskReadiness, aggregateTaskStatus } from '../src/lib/variantContent.ts';

const role = { id: 'role-9', name: 'Near post', description: 'Run', coachingPoint: null, startPosition: { x: 10, y: 20 }, movementPath: null };
const variant = id => ({ id, name: id, recognitionCue: 'Zonal', teamSignal: 'One arm', roleTasks: { 'role-9': { description: 'Front' } }, steps: [{ id: 'phase-1', sortOrder: 0 }], annotations: [], entities: [{ id: 'opponent', position: { x: 40, y: 50 } }], stepPositions: { 'phase-1': { 'role-9': { x: 12, y: 25 } } }, entityStepPositions: { 'phase-1': { opponent: { x: 40, y: 50 } } } });
const fixture = () => ({ id: 'piece', title: 'Corner', status: 'ready', boardData: { schemaVersion: 2, defaultVariantId: 'A', activeVariantId: 'B', variants: [variant('A'), variant('B')] } });
const completed = (task, extra = {}) => ({ playerId: 'player', setPieceId: 'piece', roleId: role.id, completedAt: new Date('2026-11-05'), passed: true, answers: [taskScopeAnswer(task, 'passed')], ...extra });

test('publication is frozen, client snapshot is ignored, and deleted current roles are not resurrected', () => {
  const piece = fixture();
  const publication = publishContent(piece, [role]);
  piece.boardData.publishedContent = publication;
  piece.boardData.variants[0].teamSignal = 'Changed draft';
  const content = playerContent(piece, [role]);
  assert.equal(content.piece.boardData.variants[0].teamSignal, 'One arm');
  assert.equal(playerContent(piece, []).roles.length, 0);
  assert.equal(playerContent({ ...piece, status: 'draft' }, [role]), null);
  assert.equal(playerContent(fixture(), [role]), null, 'V2 requires an explicit first publication');
  assert.deepEqual(preservePublication({ schemaVersion: 2, publishedContent: { version: 'forged' } }, piece.boardData).publishedContent, publication);
  assert.equal(preservePublication({ publishedContent: { version: 'forged' } }).publishedContent, undefined);
});

test('A never confirms B and a changed B invalidates only B while unrelated role text is ignored', () => {
  const piece = fixture();
  const a = variantTask(piece, role, 'A'), b = variantTask(piece, role, 'B');
  const attempts = [completed(a), completed(b)];
  assert.equal(taskReadiness(b, [completed(a)], 'player', 'piece').status, 'not_opened');
  piece.boardData.variants[1].roleTasks['role-9'].description = 'Far post';
  const nextA = variantTask(piece, role, 'A'), nextB = variantTask(piece, role, 'B');
  assert.equal(nextA.contentVersion, a.contentVersion);
  assert.notEqual(nextB.contentVersion, b.contentVersion);
  assert.equal(taskReadiness(nextA, attempts, 'player', 'piece').status, 'passed');
  assert.equal(taskReadiness(nextB, attempts, 'player', 'piece').status, 'not_opened');
  piece.boardData.variants[0].roleTasks['another-role'] = { description: 'Changed unrelated text' };
  assert.equal(variantTask(piece, role, 'A').contentVersion, a.contentVersion);
  piece.boardData.variants[0].entityStepPositions['phase-1'].opponent.x = 70;
  assert.notEqual(variantTask(piece, role, 'A').contentVersion, a.contentVersion);
});

test('task versions ignore object key ordering and active selection, default variant drives player start position', () => {
  const piece = fixture(); const before = variantTask(piece, role);
  assert.equal(before.variantId, 'A'); assert.deepEqual(before.role.startPosition, { x: 12, y: 25 });
  piece.boardData.activeVariantId = 'A';
  piece.boardData.variants[0].stepPositions['phase-1']['role-9'] = { y: 25, x: 12 };
  assert.equal(variantTask(piece, role).contentVersion, before.contentVersion);
  assert.throws(() => variantTask(piece, role, 'outside'), RangeError);
});

test('publication validates required variants; any pending required task prevents passed status', () => {
  const piece = fixture();
  for (const ids of [[], ['outside'], ['A', 'A']]) assert.throws(() => publishContent(piece, [role], ids), RangeError);
  assert.deepEqual(publishContent(piece, [role]).requiredVariantIds, ['A', 'B']);
  assert.deepEqual(publishContent(piece, [role], ['B']).requiredVariantIds, ['B']);
  assert.equal(aggregateTaskStatus([{ status: 'passed' }, { status: 'not_opened' }]), 'not_opened');
  const task = variantTask(piece, role);
  const feedback = completed(task, { passed: false, answers: [taskScopeAnswer(task, 'opened', 'confirmation')] });
  assert.equal(taskReadiness(task, [feedback], 'player', 'piece').status, 'opened');
  assert.equal(taskReadiness(task, [completed(task, { roleId: 'other-role' })], 'player', 'piece').status, 'not_opened');
});

test('player task board contains only selected geometry and signals, while legacy boards remain intact', () => {
  const piece = fixture();
  piece.boardData.privateExtension = 'editor-only';
  piece.boardData.variants[0].privateExtension = 'variant-only';
  Object.assign(piece.boardData.variants[0].roleTasks[role.id], { id: 'other-role', name: 'Other role' });
  piece.boardData.publishedContent = publishContent(piece, [role]);
  const task = variantTask(piece, role, 'A');
  assert.equal(task.boardData.activeVariantId, 'A');
  assert.equal(task.boardData.recognitionCue, 'Zonal');
  assert.equal(task.boardData.teamSignal, 'One arm');
  assert.equal(task.role.id, role.id);
  assert.equal(task.role.name, role.name);
  assert.equal(task.role.description, 'Front');
  assert.deepEqual(task.boardData.stepPositions, piece.boardData.variants[0].stepPositions);
  for (const key of ['variants', 'roleTasks', 'publishedContent', 'privateExtension', 'outcomes']) {
    assert.equal(key in task.boardData, false, key);
  }
  const legacy = { ...piece, boardData: { annotations: [], entities: [], extension: 'legacy' } };
  assert.deepEqual(variantTask(legacy, role).boardData, legacy.boardData);
});
