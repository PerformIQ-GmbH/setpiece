import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ts = createRequire(import.meta.url)("typescript");
const file = path.join(root, "artifacts/setpiece/src/components/editor/tourPlacement.ts");
const out = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(out, { module: mod, exports: mod.exports });
const { computeCardPlacement } = mod.exports;

const card = { w: 340, h: 260 };
const inside = (p, vp) => p.left >= 12 && p.top >= 12 && p.left + card.w <= vp.w - 12 && p.top + card.h <= vp.h - 12;

test("card always stays fully inside the viewport, wherever the target is", () => {
  for (const vp of [{ w: 1366, h: 800 }, { w: 1024, h: 700 }, { w: 390, h: 844 }, { w: 360, h: 640 }]) {
    const targets = [null, { x: 0, y: 0, width: vp.w, height: 44 }, { x: vp.w - 60, y: 8, width: 52, height: 32 }, { x: 0, y: vp.h - 56, width: 56, height: 56 },
      { x: 0, y: 100, width: vp.w, height: vp.h - 200 }, { x: vp.w - 320, y: 48, width: 320, height: vp.h - 48 }];
    for (const target of targets) for (const side of ["right", "left", "bottom", "top"]) {
      const cardW = Math.min(card.w, vp.w - 24);
      const p = computeCardPlacement(target, { w: cardW, h: card.h }, vp, side);
      assert.ok(p.left >= 12 && p.top >= 12 && p.left + cardW <= vp.w - 12 && p.top + card.h <= vp.h - 12, `${vp.w}x${vp.h} ${JSON.stringify(target)} ${side} -> ${JSON.stringify(p)}`);
    }
  }
});

test("desktop card prefers the requested side and keeps the target uncovered", () => {
  const vp = { w: 1366, h: 800 };
  const target = { x: 10, y: 120, width: 56, height: 400 };
  const p = computeCardPlacement(target, card, vp, "right");
  assert.ok(p.left >= target.x + target.width, "card sits right of the toolbar");
  assert.equal(p.docked, false);
});

test("a target that fills the screen docks the card opposite to it", () => {
  const vp = { w: 390, h: 844 };
  const top = computeCardPlacement({ x: 0, y: 0, width: 390, height: 700 }, { w: 366, h: 260 }, vp, "bottom");
  assert.equal(top.docked, true);
  assert.ok(top.top >= 12);
  const bottomTarget = computeCardPlacement({ x: 0, y: 500, width: 390, height: 344 }, { w: 366, h: 260 }, vp, "bottom");
  assert.ok(bottomTarget.top + 260 <= 500, "card above a bottom target on phones");
});
