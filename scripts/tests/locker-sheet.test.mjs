import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ts = createRequire(import.meta.url)("typescript");
const file = path.join(root, "artifacts/setpiece/src/utils/lockerSheetPdf.ts");
const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(compiled, { module: mod, exports: mod.exports, require: (name) => {
  if (name === "./pitchGeometry") return { pitchOrientationForCategory: () => "half", buildPitchGeometry: () => ({ pitchW: 68, pitchH: 52.5 }) };
  throw new Error(`unexpected import ${name}`);
} });
const { buildLockerSheet, tilesPerPage } = mod.exports;

// Minimales jsPDF-Double: zeichnet Texte und Bilder mit Seite und Position auf.
function fakePdf() {
  let size = 10, page = 1;
  const texts = [], images = [];
  return {
    texts, images, pages: () => page,
    setFont() {}, setTextColor() {}, setDrawColor() {}, setFillColor() {}, setLineWidth() {}, setLineDashPattern() {},
    line() {}, circle() {}, rect() {}, roundedRect() {}, ellipse() {}, addPage() { page++; },
    addImage(_d, _t, x, y, w, h) { images.push({ x, y, w, h, page }); },
    setFontSize(v) { size = v; }, getTextWidth: (t) => String(t).length * size * 0.18,
    text(t, x, y) { texts.push({ text: String(t), x, y, page }); },
  };
}
const phase = { label: "Phase", dataUrl: "data:image/png;base64,", aspect: 1.2 };
const variant = (name, recognition, signal, phases = 3) => ({ name, recognition, signal, phases: Array(phases).fill(phase) });
const input = (pieces) => ({ teamName: "FC Beispiel", matchTitle: "Runde", pieces, generatedLabel: "Stand" });

test("one tile per variant with code, WENN and SIGNAL, images inside the sheet", () => {
  const pdf = fakePdf();
  buildLockerSheet(pdf, "a4", input([
    { title: "Ecke kurz", category: "offensive_corner_left", variants: [variant("Gegen Zone", "Raumdeckung", "Faust"), variant("Gegen Mann", "Manndeckung", "Zwei Arme")] },
    { title: "Freistoss", category: "direct_free_kick_central", variants: [variant("", "", "")] },
  ]));
  const has = (t) => pdf.texts.some(x => x.text === t);
  for (const t of ["1A", "1B", "2", "Raumdeckung", "Manndeckung", "Faust", "Zwei Arme", "immer", "kein Signal"]) assert.ok(has(t), t);
  assert.equal(pdf.pages(), 1);
  assert.equal(pdf.images.length, 3 * 3, "big start image plus two follow-up phases per tile");
  assert.ok(pdf.images.every(i => i.x >= 10 && i.x + i.w <= 287 + 0.01 && i.y >= 10 && i.y + i.h <= 200), "images stay inside the margins");
});

test("more variants than tiles continue on a numbered second sheet", () => {
  assert.equal(tilesPerPage("a4"), 6);
  assert.equal(tilesPerPage("a3"), 12);
  const pdf = fakePdf();
  buildLockerSheet(pdf, "a4", input(Array.from({ length: 7 }, (_, i) => ({ title: `S${i}`, category: "attacking_throw_in", variants: [variant("", "x", "y", 1)] }))));
  assert.equal(pdf.pages(), 2);
  assert.ok(pdf.texts.some(t => t.text === "Stand  ·  Blatt 2/2" && t.page === 2));
});

test("few variants get a smaller grid with larger images", () => {
  const big = (n) => { const pdf = fakePdf(); buildLockerSheet(pdf, "a4", input(Array.from({ length: n }, (_, i) => ({ title: `S${i}`, category: "attacking_throw_in", variants: [variant("", "x", "y", 1)] })))); return pdf.images[0].h; };
  assert.ok(big(2) > big(6) * 1.5);
});
