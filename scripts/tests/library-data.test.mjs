import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const ts = createRequire(import.meta.url)('typescript');
const cache = {};
// library-data.ts imports sibling .ts files without extension (tsx style), so load them like the app does.
function load(name) {
  if (cache[name]) return cache[name];
  const out = ts.transpileModule(fs.readFileSync(path.join(dir, `${name}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(out, { module, exports: module.exports, require: (n) => load(n.replace('./', '')) });
  return (cache[name] = module.exports);
}
// Objects from the vm context have another prototype; compare plain JSON copies.
const plain = (value) => JSON.parse(JSON.stringify(value));
const LIBRARY = plain(load('library-data').LIBRARY);
const SPECS = plain(load('library-specs').SPECS);

test('every template has a drawing whose roles, steps and positions are consistent', () => {
  assert.ok(LIBRARY.length >= 29);
  assert.deepEqual(Object.keys(SPECS).filter((slug) => !LIBRARY.some((e) => e.slug === slug)), [], 'drawings without template');
  for (const e of LIBRARY) {
    const ids = e.defaultRoles.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length, `${e.slug}: role ids unique`);
    const [variant] = e.boardData.variants;
    const stepIds = variant.steps.map((s) => s.id);
    assert.ok(stepIds.length >= 2, `${e.slug}: at least two steps`);
    assert.ok(variant.annotations.length >= 2, `${e.slug}: has runs or passes`);
    for (const a of variant.annotations) {
      assert.ok(stepIds.includes(a.stepId), `${e.slug}: annotation step`);
      if (a.linkedRoleId) assert.ok(ids.includes(a.linkedRoleId), `${e.slug}: run belongs to a role`);
      assert.ok(a.points.every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100), `${e.slug}: points on the pitch`);
    }
    for (const id of stepIds) assert.deepEqual(Object.keys(variant.stepPositions[id]).sort(), [...ids].sort(), `${e.slug}: every role placed in ${id}`);
    for (const r of e.defaultRoles) assert.deepEqual(variant.stepPositions[stepIds[0]][r.id], r.startPosition, `${e.slug}: ${r.name} starts where the role says`);
    assert.ok(variant.entities.some((x) => x.type === 'ball'), `${e.slug}: ball`);
  }
});

const LEVELS = ['easy', 'medium', 'hard'];
const AGAINST = ['zone', 'man', 'hybrid', 'deep', 'high', 'wall', 'unset'];

test('every template has a complete, honest profile (filters, pros, cons, tip, basis, sources)', () => {
  const slugs = LIBRARY.map((e) => e.slug);
  const PROFILES = plain(load('library-profiles').PROFILES);
  assert.deepEqual(Object.keys(PROFILES).filter((slug) => !slugs.includes(slug)), [], 'profiles without template');
  for (const e of LIBRARY) {
    const p = e.profile;
    assert.ok(p, `${e.slug}: profile`);
    assert.ok(LEVELS.includes(p.level), `${e.slug}: level`);
    assert.ok(Array.isArray(p.against) && p.against.every((a) => AGAINST.includes(a)), `${e.slug}: against values`);
    assert.equal(typeof p.juniors, 'boolean', `${e.slug}: juniors`);
    assert.equal(typeof p.needsHeader, 'boolean', `${e.slug}: needsHeader`);
    assert.ok(p.effort.length >= 5 && p.effort.length <= 60, `${e.slug}: effort`);
    assert.ok(p.pros.length >= 2 && p.pros.length <= 4, `${e.slug}: 2 to 4 pros`);
    assert.ok(p.cons.length >= 2 && p.cons.length <= 3, `${e.slug}: 2 to 3 cons`);
    for (const line of [...p.pros, ...p.cons]) assert.ok(line.length >= 15 && line.length <= 170, `${e.slug}: line length «${line}»`);
    assert.ok(p.tip.length >= 15 && p.tip.length <= 200, `${e.slug}: tip`);
    assert.ok(['research', 'ai'].includes(p.basis), `${e.slug}: basis`);
    if (p.basis === 'research') assert.ok(p.sources?.length >= 1, `${e.slug}: research needs sources`);
    for (const src of p.sources ?? []) assert.ok(src.label && /^https:\/\//.test(src.url), `${e.slug}: source url`);
    // Level must agree with the «Niveau:» sentence in the description.
    const stated = /Niveau: (einfach|mittel|anspruchsvoll)/.exec(e.description ?? '')?.[1];
    if (stated) assert.equal(p.level, { einfach: 'easy', mittel: 'medium', anspruchsvoll: 'hard' }[stated], `${e.slug}: level matches description`);
    // Honesty: no promises of goals.
    assert.ok(![...p.pros, ...p.cons, p.tip].some((t) => /garantier|sicher(es)? Tor|führt immer/i.test(t)), `${e.slug}: no guarantees`);
    // Attacking corners and free kicks say against whom they are meant.
    if (/^(offensive_corner|direct_free_kick|indirect_free_kick)/.test(e.category)) assert.ok(p.against.length >= 1, `${e.slug}: against`);
  }
});
