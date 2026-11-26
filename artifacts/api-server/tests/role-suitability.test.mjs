import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePlayerForRole, classifyRole, hasProfileData, suggestAssignments } from '../src/lib/roleSuitability.ts';

const role = name => ({ id: name, name });
const player = (id, extra = {}) => ({ id, firstName: 'Fiktiv', lastName: id, ...extra });

test('German role names are classified instead of falling back to generic', () => {
  for (const [name, cls] of [
    ['Schütze', 'delivery'], ['Kopfball erster Pfosten', 'aerial_target'], ['Manndecker', 'defensive_marker'],
    ['Absicherung', 'rest_defense'], ['Sichtblocker', 'blocker'], ['Läufer', 'runner'],
    ['Abpraller Rückraum', 'rebound'], ['Konter', 'counter_outlet'],
  ]) assert.equal(classifyRole(role(name))[0], cls, name);
});

test('profile data separates players that used to share the same neutral score', () => {
  const header = player('a', { height: 190, headingStrength: 10, speed: 4, dominantFoot: 'right', tags: ['aerial_threat', 'self_reported'] });
  const runner = player('b', { height: 172, headingStrength: 2, speed: 10, dominantFoot: 'left', tags: ['runner', 'self_reported'] });
  const aerial = role('Kopfball erster Pfosten'), run = role('Läufer');
  assert.ok(scorePlayerForRole(header, aerial).score > scorePlayerForRole(runner, aerial).score + 30);
  assert.ok(scorePlayerForRole(runner, run).score > scorePlayerForRole(header, run).score + 30);
  assert.match(scorePlayerForRole(header, aerial).reasons.join(' '), /Kopfball/);
});

test('coach tags from the roster are honoured and the self-report marker alone is no profile data', () => {
  const coachTagged = player('c', { tags: ['strong_header'] });
  assert.ok(scorePlayerForRole(coachTagged, role('Far Post Target')).score > scorePlayerForRole(player('d'), role('Far Post Target')).score);
  assert.equal(hasProfileData(player('e', { tags: ['self_reported'] })), false);
  const [piece] = suggestAssignments({ setPieces: [{ id: 'p', title: 'Ecke', roles: [role('Läufer')], existingAssignments: [] }], starterPlayers: [player('f')], benchPlayers: [], mode: 'fill_empty' });
  assert.equal(piece.roles[0].missingProfileData, true);
});
