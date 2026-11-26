import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../artifacts/setpiece/src/lib/onboardingLogic.ts');
const ts = createRequire(import.meta.url)('typescript');
const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(out, { module: mod, exports: mod.exports });
const { emptyDraft, isDraftEmpty, profileDetails, parsePlayers, suggestAssignments } = mod.exports;
// Objects from the vm context have another prototype; compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));
const draft = (key, patch = {}) => ({ ...emptyDraft(key), ...patch });

test('an untouched row is empty and is skipped, a touched one is not', () => {
  assert.equal(isDraftEmpty(draft('a')), true);
  assert.equal(isDraftEmpty(draft('a', { firstName: '  ' })), true, 'spaces only');
  for (const patch of [{ firstName: 'A' }, { shirtNumber: '7' }, { foot: 'left' }, { height: '170' }, { heading: 1 }, { speed: 1 }, { tags: ['x'] }]) {
    assert.equal(isDraftEmpty(draft('a', patch)), false, JSON.stringify(patch));
  }
  const { payloads, errors } = parsePlayers([draft('a'), draft('b')]);
  assert.deepEqual([payloads.length, Object.keys(errors).length], [0, 0]);
});

test('a name-only player is accepted and sends nothing else', () => {
  const { payloads, errors } = parsePlayers([draft('a', { firstName: ' Lea ', lastName: 'Meier ' })]);
  assert.deepEqual(plain(errors), {});
  assert.deepEqual(plain(payloads[0].payload), { firstName: 'Lea', lastName: 'Meier' });
});

test('a full profile is converted to the values the API stores (1 to 5 becomes 2 to 10)', () => {
  const { payloads } = parsePlayers([draft('a', { firstName: 'Lea', lastName: 'Meier', shirtNumber: '9', foot: 'both', height: '172', heading: 4, speed: 5, tags: ['corner_taker', 'header'] })]);
  assert.deepEqual(plain(payloads[0].payload), {
    firstName: 'Lea', lastName: 'Meier', shirtNumber: 9, dominantFoot: 'both', height: 172, headingStrength: 8, speed: 10, tags: ['corner_taker', 'header'],
  });
  assert.equal(payloads[0].draft.key, 'a');
});

test('errors are reported per row and a bad row is not sent', () => {
  const { payloads, errors } = parsePlayers([
    draft('ok', { firstName: 'A', lastName: 'B' }),
    draft('noLast', { firstName: 'A' }),
    draft('shirt', { firstName: 'A', lastName: 'B', shirtNumber: '0' }),
    draft('tall', { firstName: 'A', lastName: 'B', height: '17' }),
    draft('giant', { firstName: 'A', lastName: 'B', height: '999' }),
  ]);
  assert.deepEqual(Array.from(payloads, (p) => p.draft.key), ['ok']);
  assert.deepEqual(Object.keys(errors).sort(), ['giant', 'noLast', 'shirt', 'tall']);
  assert.match(errors.noLast.name, /Nachname/);
  assert.match(errors.shirt.shirtNumber, /1 bis 99/);
  assert.match(errors.tall.height, /100 bis 230/);
});

test('rows with only a rating or a tag still need a name', () => {
  const { errors } = parsePlayers([draft('a', { heading: 3 }), draft('b', { tags: ['x'] })]);
  assert.deepEqual(Object.keys(errors), ['a', 'b']);
});

test('the same shirt number twice is caught on the second row, even next to an empty row', () => {
  const { payloads, errors } = parsePlayers([
    draft('a', { firstName: 'A', lastName: 'A', shirtNumber: '10' }),
    draft('gap'),
    draft('b', { firstName: 'B', lastName: 'B', shirtNumber: '10' }),
  ]);
  assert.deepEqual(Array.from(payloads, (p) => p.draft.key), ['a']);
  assert.match(errors.b.shirtNumber, /Nummer 10 ist schon vergeben/);
  assert.equal(errors.a, undefined);
});

test('a row that already exists on the server is returned with its saved id', () => {
  const { payloads } = parsePlayers([draft('a', { savedId: 'srv-1', firstName: 'A', lastName: 'B' })]);
  assert.equal(payloads[0].draft.savedId, 'srv-1');
});

test('profileDetails counts the five details role suggestions use', () => {
  assert.equal(profileDetails(draft('a')), 0);
  assert.equal(profileDetails(draft('a', { foot: 'left', height: '170', heading: 2, speed: 2, tags: ['x'] })), 5);
  assert.equal(profileDetails(draft('a', { foot: 'left', heading: 2 })), 2);
});

const cand = (playerId, score, badge) => ({ playerId, score, badge });

test('role suggestions: best pairs first, nobody twice, weak or risky fits stay open', () => {
  const picks = suggestAssignments([
    { roleId: 'r1', candidates: [cand('p1', 90, 'best'), cand('p2', 70, 'good')] },
    { roleId: 'r2', candidates: [cand('p1', 95, 'best'), cand('p3', 60, 'good')] },
    { roleId: 'r3', candidates: [cand('p2', 99, 'review'), cand('p4', 50, 'problem')] },
  ]);
  assert.deepEqual(plain(picks), { r2: 'p1', r1: 'p2' });
});

test('role suggestions: ties are stable and empty input gives nothing', () => {
  assert.deepEqual(plain(suggestAssignments([])), {});
  assert.deepEqual(plain(suggestAssignments([{ roleId: 'r1', candidates: [] }])), {});
  const picks = suggestAssignments([
    { roleId: 'r1', candidates: [cand('p1', 80, 'good')] },
    { roleId: 'r2', candidates: [cand('p1', 80, 'good'), cand('p2', 80, 'good')] },
  ]);
  assert.deepEqual(plain(picks), { r1: 'p1', r2: 'p2' });
});
