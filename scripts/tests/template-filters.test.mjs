import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../artifacts/setpiece/src/lib/templateFilters.ts');
const ts = createRequire(import.meta.url)('typescript');
const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(out, { module: mod, exports: mod.exports });
const { NO_FILTERS, kindOf, sideOf, categoryLabel, filterTemplates, activeFilterCount, sortTemplates, availableAgainst, recommendTemplates } = mod.exports;
// Arrays from the vm context have another prototype; compare plain copies.
const ids = (list) => Array.from(list, (t) => t.id);

const profile = (level, extra = {}) => ({ level, against: ['zone'], juniors: true, needsHeader: false, ...extra });
const T = (id, category, p, extra = {}) => ({ id, title: id.toUpperCase(), category, profile: p, media: [], defaultRoles: [], ...extra });
const CLIP = [{ provider: 'file', url: 'https://x/y.mp4' }];

const LIST = [
  T('c-hard', 'offensive_corner_left', profile('hard', { needsHeader: true, juniors: false, against: ['man', 'hybrid'] }), { media: CLIP }),
  T('c-easy', 'offensive_corner_right', profile('easy', { against: ['zone', 'man'] })),
  T('c-easy-clip', 'offensive_corner_right', profile('easy'), { media: CLIP }),
  T('f-med', 'direct_free_kick_central', profile('medium', { against: ['wall'] })),
  T('f-easy', 'indirect_free_kick_wide', profile('easy', { against: ['unset'] }), { media: CLIP }),
  T('t-easy', 'attacking_throw_in', profile('easy', { against: ['high'] })),
  T('d-corner', 'defensive_corner_left', profile('medium', { against: ['zone'] }), { title: 'Eckball verteidigen', description: 'Raumdeckung am Fünfmeterraum' }),
  T('legacy', 'attacking_throw_in', null),
];

test('category labels read like a coach talks', () => {
  assert.equal(categoryLabel('offensive_corner_left'), 'Ecke links · Angriff');
  assert.equal(categoryLabel('defensive_corner_right'), 'Ecke rechts · Abwehr');
  assert.equal(categoryLabel('direct_free_kick_central'), 'Direkter Freistoss · Mitte');
  assert.equal(categoryLabel('indirect_free_kick_wide'), 'Indirekter Freistoss · aussen');
  assert.equal(categoryLabel('attacking_throw_in'), 'Einwurf · Angriff');
  assert.equal(categoryLabel('defensive_throw_in'), 'Einwurf · Abwehr');
  assert.equal(kindOf('defensive_corner_left'), 'corner');
  assert.equal(sideOf('defensive_throw_in'), 'defense');
});

test('no filter shows everything, each filter narrows, combined filters intersect', () => {
  assert.equal(filterTemplates(LIST, NO_FILTERS).length, LIST.length);
  assert.deepEqual(ids(filterTemplates(LIST, { ...NO_FILTERS, kind: 'corner' })), ['c-hard', 'c-easy', 'c-easy-clip', 'd-corner']);
  assert.deepEqual(ids(filterTemplates(LIST, { ...NO_FILTERS, kind: 'corner', side: 'defense' })), ['d-corner']);
  assert.deepEqual(ids(filterTemplates(LIST, { ...NO_FILTERS, withVideo: true })), ['c-hard', 'c-easy-clip', 'f-easy']);
  assert.deepEqual(ids(filterTemplates(LIST, { ...NO_FILTERS, level: 'easy', kind: 'corner' })), ['c-easy', 'c-easy-clip']);
  assert.deepEqual(ids(filterTemplates(LIST, { ...NO_FILTERS, against: 'man' })), ['c-hard', 'c-easy']);
  assert.deepEqual(ids(filterTemplates(LIST, { ...NO_FILTERS, level: 'easy', withVideo: true })), ['c-easy-clip', 'f-easy']);
});

test('templates without an assessment are hidden as soon as a profile filter is on, not before', () => {
  assert.ok(ids(filterTemplates(LIST, NO_FILTERS)).includes('legacy'));
  assert.ok(ids(filterTemplates(LIST, { ...NO_FILTERS, kind: 'throw_in' })).includes('legacy'));
  for (const f of [{ level: 'easy' }, { against: 'zone' }, { juniors: true }, { noHeader: true }]) {
    assert.ok(!ids(filterTemplates(LIST, { ...NO_FILTERS, ...f })).includes('legacy'), JSON.stringify(f));
  }
});

test('juniors and no-header filters follow the profile flags', () => {
  assert.ok(!ids(filterTemplates(LIST, { ...NO_FILTERS, juniors: true })).includes('c-hard'));
  const noHeader = ids(filterTemplates(LIST, { ...NO_FILTERS, noHeader: true }));
  assert.ok(!noHeader.includes('c-hard'));
  assert.ok(noHeader.includes('c-easy'));
});

test('search looks at title, description and role names, ignoring case and spaces around', () => {
  assert.deepEqual(ids(filterTemplates(LIST, { ...NO_FILTERS, query: '  raumdeckung ' })), ['d-corner']);
  assert.deepEqual(ids(filterTemplates(LIST, { ...NO_FILTERS, query: 'ECKBALL' })), ['d-corner']);
  const withRole = [T('r', 'offensive_corner_left', profile('easy'), { defaultRoles: [{ name: 'Kurzer Anläufer' }, {}] })];
  assert.equal(filterTemplates(withRole, { ...NO_FILTERS, query: 'anläufer' }).length, 1);
  assert.equal(filterTemplates(withRole, { ...NO_FILTERS, query: 'nichts' }).length, 0);
});

test('activeFilterCount counts only the filters in use', () => {
  assert.equal(activeFilterCount(NO_FILTERS), 0);
  assert.equal(activeFilterCount({ ...NO_FILTERS, query: '   ' }), 0);
  assert.equal(activeFilterCount({ ...NO_FILTERS, kind: 'corner', withVideo: true, query: 'x' }), 3);
});

test('sorting: easy first, then clips first, then title; templates without assessment last', () => {
  assert.deepEqual(ids(sortTemplates(LIST)), ['c-easy-clip', 'f-easy', 'c-easy', 't-easy', 'd-corner', 'f-med', 'c-hard', 'legacy']);
  const before = ids(LIST);
  sortTemplates(LIST);
  assert.deepEqual(ids(LIST), before, 'input list is not reordered');
});

test('availableAgainst lists only values that occur, in a fixed order', () => {
  assert.deepEqual([...availableAgainst(LIST)], ['zone', 'man', 'hybrid', 'high', 'wall', 'unset']);
  assert.deepEqual([...availableAgainst([T('x', 'attacking_throw_in', null)])], []);
});

test('recommendations respect experience, prefer clips and mix kinds', () => {
  const none = recommendTemplates(LIST, 'none', 'all', 6);
  assert.ok(none.every((t) => t.profile.level === 'easy'));
  assert.ok(!ids(none).includes('legacy'), 'unassessed templates are never recommended');
  assert.deepEqual(ids(none), ['c-easy-clip', 'f-easy', 't-easy', 'c-easy']);
  assert.ok(ids(recommendTemplates(LIST, 'some', 'all', 20)).includes('f-med'));
  assert.ok(!ids(recommendTemplates(LIST, 'some', 'all', 20)).includes('c-hard'));
  assert.ok(ids(recommendTemplates(LIST, 'lots', 'all', 20)).includes('c-hard'));
});

test('recommendations by kind and with a limit', () => {
  assert.deepEqual(ids(recommendTemplates(LIST, 'none', 'corner', 6)), ['c-easy-clip', 'c-easy']);
  assert.deepEqual(ids(recommendTemplates(LIST, 'none', 'free_kick', 6)), ['f-easy']);
  assert.equal(recommendTemplates(LIST, 'lots', 'all', 2).length, 2);
  assert.equal(recommendTemplates([], 'none', 'all', 6).length, 0);
});
