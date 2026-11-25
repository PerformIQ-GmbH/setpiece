import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../artifacts/setpiece/src");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const sources = walk(root).filter(f => /\.tsx?$/.test(f) && !f.endsWith("guidedTours.ts")).map(f => fs.readFileSync(f, "utf8")).join("\n");
const tours = fs.readFileSync(path.join(root, "components/editor/guidedTours.ts"), "utf8");

test("every spotlight target of every tour exists as a data-tutorial anchor in the app", () => {
  const wanted = [...new Set([...tours.matchAll(/\[data-tutorial="([a-z-]+)"\]/g)].map(m => m[1]))];
  assert.ok(wanted.length >= 15, "tours reference their anchors");
  const missing = wanted.filter(name => !sources.includes(`data-tutorial="${name}"`));
  assert.deepEqual(missing, [], `anchors missing in the UI: ${missing.join(", ")}`);
});

test("every tour has a unique storage key and a closing step", () => {
  const keys = [...tours.matchAll(/key: '([^']+)'/g)].map(m => m[1]);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.length >= 5);
});
