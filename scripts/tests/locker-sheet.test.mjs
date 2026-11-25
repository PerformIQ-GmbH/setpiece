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
const { buildLockerSheet, rowsPerPage } = mod.exports;

// Minimales jsPDF-Double: zeichnet Texte mit Seite und Position auf.
function fakePdf() {
  let size = 10, page = 1;
  const texts = [];
  const width = (t) => String(t).length * size * 0.18;
  return {
    texts, pages: () => page,
    setFont() {}, setTextColor() {}, setDrawColor() {}, setFillColor() {}, setLineWidth() {}, setLineDashPattern() {},
    line() {}, circle() {}, rect() {}, addImage() {}, addPage() { page++; },
    setFontSize(v) { size = v; }, getTextWidth: width,
    splitTextToSize(t, w) { const words = t.split(" "), out = []; let cur = "";
      for (const word of words) { const next = cur ? `${cur} ${word}` : word; if (width(next) > w && cur) { out.push(cur); cur = word; } else cur = next; }
      if (cur) out.push(cur); return out; },
    text(t, x, y) { for (const [i, line] of [].concat(t).entries()) texts.push({ text: line, x, y: y + i * 3, page }); },
  };
}
const phase = { label: "Phase 1", dataUrl: "data:image/png;base64,", aspect: 1.2 };
const piece = (i, roles) => ({
  title: `Standard ${i}`, category: "offensive_corner_left", cue: "Erst mit dem Anlauf starten. ".repeat(12),
  roles: Array.from({ length: roles }, (_, r) => ({ roleName: `Rolle${i}x${r}`, shirtNumber: r + 1, playerName: `Fiktiv Spieler${r}` })),
  phases: [phase, phase, phase],
});

test("all roles of every set piece land on the sheet inside their own row", () => {
  for (const [format, height] of [["a4", 210], ["a3", 297]]) {
    const n = rowsPerPage(format);
    const pdf = fakePdf();
    buildLockerSheet(pdf, format, { teamName: "FC Beispiel", matchTitle: "Runde", pieces: Array.from({ length: n }, (_, i) => piece(i, 10)), generatedLabel: "Stand" });
    assert.equal(pdf.pages(), 1, `${format}: one sheet for ${n} set pieces`);
    for (let i = 0; i < n; i++) {
      const roles = pdf.texts.filter(t => t.text.startsWith(`Rolle${i}x`));
      assert.equal(roles.length, 10, `${format} piece ${i}: all roles printed`);
      const title = pdf.texts.find(t => t.text === `Standard ${i}`);
      const next = pdf.texts.find(t => t.text === `Standard ${i + 1}`);
      const limit = next ? next.y - 5 : height - 10;
      assert.ok(roles.every(r => r.y > title.y && r.y < limit), `${format} piece ${i}: roles stay inside the row`);
    }
  }
  assert.equal(rowsPerPage("a4"), 4);
  assert.equal(rowsPerPage("a3"), 6);
});

test("more set pieces than fit continue on a numbered second sheet", () => {
  const pdf = fakePdf();
  buildLockerSheet(pdf, "a4", { teamName: "FC Beispiel", matchTitle: "Runde", pieces: Array.from({ length: 6 }, (_, i) => piece(i, 3)), generatedLabel: "Stand" });
  assert.equal(pdf.pages(), 2);
  assert.ok(pdf.texts.some(t => t.text === "Stand  ·  Blatt 2/2" && t.page === 2));
});
