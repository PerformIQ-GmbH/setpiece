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
