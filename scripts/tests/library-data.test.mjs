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

const NEW_SLUGS = ['corner-man-free-run', 'corner-man-cross-run', 'corner-mixed-zone-gap', 'corner-short-feint', 'corner-def-mixed',
  'freistoss-zwei-am-ball-fluegel', 'corner-edge-cluster', 'corner-short-edge-cross', 'kickoff-outside-runner', 'kickoff-inside-run'];
const metres = (e, p) => [(p.x * 68) / 100, (p.y * (e.category.endsWith('throw_in') ? 105 : 52.5)) / 100];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test('slugs and titles are unique, the ten clip templates are present with texts', () => {
  assert.equal(new Set(LIBRARY.map((e) => e.slug)).size, LIBRARY.length, 'slugs unique');
  assert.equal(new Set(LIBRARY.map((e) => e.title)).size, LIBRARY.length, 'titles unique');
  assert.ok(LIBRARY.length >= 39);
  for (const slug of NEW_SLUGS) {
    const e = LIBRARY.find((x) => x.slug === slug);
    assert.ok(e, `${slug} exists`);
    assert.ok(e.title && e.description?.length > 60 && e.coachingNote?.length > 60, `${slug}: texts`);
    assert.match(e.description, /Trainingsclip/, `${slug}: names its clip origin`);
    assert.match(e.coachingNote, /Rückmeldung nach dem Training/, `${slug}: feedback line`);
    assert.equal(e.profile.basis, 'ai', `${slug}: clip-derived, no research claim`);
    const ids = e.boardData.variants[0].steps.length;
    assert.ok(ids >= 4, `${slug}: at least four steps`);
  }
});

test('free kicks keep the wall at least 9.15 m from the ball', () => {
  for (const e of LIBRARY.filter((x) => x.category.includes('free_kick'))) {
    const v = e.boardData.variants[0];
    const ball = metres(e, v.entityStepPositions.s1['ball-1']);
    for (const [id, p] of Object.entries(v.entityStepPositions.s1)) if (id.startsWith('opp-')) assert.ok(dist(metres(e, p), ball) >= 9.15, `${e.slug}: ${id} only ${dist(metres(e, p), ball).toFixed(1)} m from the ball`);
  }
});

test('clip templates: markers apart, runs chain, passes start at the ball holder and end at a player or the goal', () => {
  for (const slug of NEW_SLUGS) {
    const e = LIBRARY.find((x) => x.slug === slug);
    const full = e.category.endsWith('throw_in');
    const v = e.boardData.variants[0];
    const ids = e.defaultRoles.map((r) => r.id);
    const roleAt = (step) => ids.map((id) => metres(e, v.stepPositions[step][id]));
    for (const s of v.steps) {
      const marks = [...roleAt(s.id).map((p) => ['role', p]), ...Object.entries(v.entityStepPositions[s.id]).filter(([id]) => id !== 'ball-1').map(([id, p]) => [id, metres(e, p)])];
      for (let i = 0; i < marks.length; i++) for (let j = i + 1; j < marks.length; j++) {
        const wall = e.category.includes('free_kick') && marks[i][0].startsWith('opp-') && marks[j][0].startsWith('opp-'); // Mauer steht Schulter an Schulter
        assert.ok(dist(marks[i][1], marks[j][1]) >= (wall ? 1.5 : full ? 2.5 : 2), `${slug} ${s.id}: two markers on top of each other`);
      }
    }
    const defensive = e.category.startsWith('defensive');
    v.annotations.forEach((a) => {
      const i = v.steps.findIndex((s) => s.id === a.stepId);
      const first = metres(e, a.points[0]), last = metres(e, a.points.at(-1));
      if (a.type.includes('run')) {
        assert.equal(a.points.length, 2, `${slug}: run without detours`);
        assert.ok(dist(first, metres(e, v.stepPositions[a.stepId][a.linkedRoleId])) < 0.2, `${slug}: run starts at its player`);
        if (v.steps[i + 1]) assert.ok(dist(last, metres(e, v.stepPositions[v.steps[i + 1].id][a.linkedRoleId])) < 0.2, `${slug}: run ends where the next step starts`);
      } else {
        if (!defensive) assert.ok(roleAt(a.stepId).some((p) => dist(p, first) <= (full ? 3 : 2.5)), `${slug}: pass starts at a player`);
        const goal = last[1] < 1 && last[0] > 30.3 && last[0] < 37.7;
        const next = v.steps[i + 1] ? roleAt(v.steps[i + 1].id) : v.annotations.filter((q) => q.stepId === a.stepId && q.linkedRoleId).map((q) => metres(e, q.points.at(-1)));
        assert.ok(goal || next.some((p) => dist(p, last) <= 1), `${slug}: pass ends at a player or in the goal`);
      }
    });
    if (full) { // Anstoss: Gegner in ihrer Hälfte und ≥ 9,15 m vom Ball, Angreifer in der eigenen Hälfte
      const ball = metres(e, v.entityStepPositions.s1['ball-1']);
      for (const [id, p] of Object.entries(v.entityStepPositions.s1)) if (id.startsWith('opp-')) { const m = metres(e, p); assert.ok(m[1] <= 52.5 && dist(m, ball) >= 9.15, `${slug}: ${id} illegal at kick-off`); }
      for (const p of roleAt('s1')) assert.ok(p[1] >= 52.5, `${slug}: attacker in the opponent half at kick-off`);
    }
  }
});
