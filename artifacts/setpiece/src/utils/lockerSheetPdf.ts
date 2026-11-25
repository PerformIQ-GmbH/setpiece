/**
 * Garderoben-Aushang: eine Kachel pro Variante, auf einem Blatt A4 oder A3
 * quer. Spieler sehen in Sekunden: WENN (Gegner erkennen) → SIGNAL → wo stehe
 * ich (grosses Startbild mit Nummern) → was folgt (kleine Phasenleiste).
 * Bewusst ohne Rollenliste und Fliesstext; die Details stehen in der App.
 * Doppelt gedruckt dient dasselbe Blatt als Bankkarte für Wechsel.
 *
 * Reines Layout auf einem übergebenen jsPDF-Dokument; Bilder liefert der
 * Aufrufer (renderSetPieceSteps), damit diese Datei ohne DOM testbar bleibt.
 */
import type { jsPDF } from 'jspdf';
import { buildPitchGeometry, pitchOrientationForCategory } from './pitchGeometry';

export type SheetFormat = 'a4' | 'a3';

export interface SheetPhase { label: string; dataUrl: string; aspect: number }

export interface SheetVariant {
  name: string;
  recognition?: string | null;
  signal?: string | null;
  phases: SheetPhase[];
}

export interface SheetPiece {
  title: string;
  category: string;
  variants: SheetVariant[];
}

export interface SheetInput {
  teamName: string;
  matchTitle: string;
  opponent?: string | null;
  dateLabel?: string | null;
  qrDataUrl?: string | null;
  pieces: SheetPiece[];
  generatedLabel: string;
}

const CATEGORY_DE: Record<string, string> = {
  offensive_corner_left: 'Ecke offensiv links',
  offensive_corner_right: 'Ecke offensiv rechts',
  defensive_corner_left: 'Ecke defensiv links',
  defensive_corner_right: 'Ecke defensiv rechts',
  direct_free_kick_central: 'Freistoss direkt zentral',
  direct_free_kick_left: 'Freistoss direkt links',
  direct_free_kick_right: 'Freistoss direkt rechts',
  indirect_free_kick_wide: 'Freistoss indirekt Flügel',
  indirect_free_kick_left: 'Freistoss indirekt links',
  indirect_free_kick_right: 'Freistoss indirekt rechts',
  attacking_throw_in: 'Einwurf offensiv',
  defensive_throw_in: 'Einwurf defensiv',
};

export const categoryDe = (c: string) => CATEGORY_DE[c] ?? c.replace(/_/g, ' ');

/**
 * Leinwand so gross wie das Spielfeld plus Rand des Renderers (PAD = 36), damit
 * im Raster kein weisser Leerraum neben dem Feld steht. Bewusst klein (≈ 500 px
 * hoch): Marker und Nummern bleiben im verkleinerten Bild gross genug.
 */
export function phaseCanvasSize(category: string): { width: number; height: number } {
  const g = buildPitchGeometry({ width: 1000, height: 1000, pad: 36, orientation: pitchOrientationForCategory(category) });
  const height = 495;
  return { width: Math.round((height - 72) * (g.pitchW / g.pitchH) + 72), height };
}

type RGB = [number, number, number];
const INK: RGB = [17, 24, 20];
const MUTED: RGB = [96, 104, 100];
const HAIR: RGB = [214, 222, 216];
const TINT: RGB = [236, 246, 240];
// Dunkleres Grün als im UI: hält auf Weiss und im Schwarzweissdruck Kontrast.
const GREEN: RGB = [4, 120, 87];

const GRID: Record<SheetFormat, { cols: number; rows: number; w: number; h: number; s: number }> = {
  a4: { cols: 3, rows: 2, w: 297, h: 210, s: 1 },
  a3: { cols: 4, rows: 3, w: 420, h: 297, s: 1.15 },
};

/** Kacheln (= Varianten) pro Blatt. */
export function tilesPerPage(format: SheetFormat): number {
  return GRID[format].cols * GRID[format].rows;
}

function fit(pdf: jsPDF, text: string, width: number): string {
  if (pdf.getTextWidth(text) <= width) return text;
  let t = text;
  while (t.length > 1 && pdf.getTextWidth(t + '…') > width) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

/** Auge: Gegner erkennen. Vektorgrafik, weil die PDF-Grundschrift keine Symbole kennt. */
function eyeIcon(pdf: jsPDF, cx: number, cy: number, r: number) {
  pdf.setDrawColor(...GREEN);
  pdf.setLineWidth(r * 0.16);
  pdf.ellipse(cx, cy, r, r * 0.55, 'S');
  pdf.setFillColor(...GREEN);
  pdf.circle(cx, cy, r * 0.32, 'F');
}

/** Erhobene Hand: Teamsignal. */
function handIcon(pdf: jsPDF, cx: number, cy: number, r: number) {
  pdf.setFillColor(...GREEN);
  const fw = r * 0.3, gap = r * 0.06;
  const palmW = 4 * fw + 3 * gap, palmX = cx - palmW / 2 + r * 0.1, palmY = cy - r * 0.05;
  pdf.roundedRect(palmX, palmY, palmW, r * 0.95, r * 0.18, r * 0.18, 'F');
  [0.75, 1, 0.95, 0.7].forEach((len, i) => {
    pdf.roundedRect(palmX + i * (fw + gap), palmY - r * len, fw, r * len + r * 0.2, fw / 2, fw / 2, 'F');
  });
  pdf.roundedRect(palmX - fw * 0.95, palmY + r * 0.15, fw, r * 0.6, fw / 2, fw / 2, 'F');
}

export function buildLockerSheet(pdf: jsPDF, format: SheetFormat, input: SheetInput): void {
  const { w: W, h: H, s } = GRID[format];
  const margin = 10 * s, headerH = 17 * s, footerH = 6 * s, gap = 4 * s;
  const tiles = input.pieces.flatMap((piece, pi) =>
    (piece.variants.length ? piece.variants : [{ name: '', phases: [] }]).map((variant, vi) => ({
      piece, variant, code: `${pi + 1}${piece.variants.length > 1 ? String.fromCharCode(65 + vi) : ''}`,
    })));
  const perPage = tilesPerPage(format);
  // Wenige Kacheln: kleineres Raster, damit Bilder grösser werden statt Leerraum.
  const shown = Math.max(1, Math.min(tiles.length, perPage));
  const cols = Math.min(GRID[format].cols, shown);
  const rows = Math.min(GRID[format].rows, Math.ceil(shown / cols));
  const pages = Math.max(1, Math.ceil(tiles.length / perPage));
  const tileW = (W - 2 * margin - (cols - 1) * gap) / cols;
  const bodyTop = margin + headerH + gap;
  const tileH = (H - bodyTop - margin - footerH - gap - (rows - 1) * gap) / rows;

  for (let page = 0; page < pages; page++) {
    if (page > 0) pdf.addPage(format, 'l');
    drawHeader(pdf, input, W, margin, headerH, s);

    tiles.slice(page * perPage, (page + 1) * perPage).forEach((tile, i) => {
      const x = margin + (i % cols) * (tileW + gap);
      const y = bodyTop + Math.floor(i / cols) * (tileH + gap);
      drawTile(pdf, tile, x, y, tileW, tileH, s);
    });

    drawFooter(pdf, input, W, H, margin, s, pages > 1 ? `Blatt ${page + 1}/${pages}` : null);
  }
}

function drawHeader(pdf: jsPDF, input: SheetInput, W: number, margin: number, headerH: number, s: number) {
  const qr = 13 * s;
  const textRight = input.qrDataUrl ? W - margin - qr - 4 * s : W - margin;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16 * s);
  pdf.setTextColor(...INK);
  const headline = input.opponent ? `${input.teamName} – ${input.opponent}` : input.teamName;
  pdf.text(fit(pdf, headline, textRight - margin), margin, margin + 6 * s);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9 * s);
  pdf.setTextColor(...MUTED);
  const sub = ['Standards', input.dateLabel, input.matchTitle].filter(Boolean).join('  ·  ');
  pdf.text(fit(pdf, sub, textRight - margin), margin, margin + 11.5 * s);
  if (input.qrDataUrl) {
    const qx = W - margin - qr;
    pdf.addImage(input.qrDataUrl, 'PNG', qx, margin - 1.5 * s, qr, qr);
    pdf.setFontSize(5.5 * s);
    pdf.text('Deine Rolle im Handy', W - margin, margin + qr + 1.2 * s, { align: 'right' });
  }
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.5 * s);
  pdf.line(margin, margin + headerH, W - margin, margin + headerH);
}

function drawTile(
  pdf: jsPDF,
  tile: { piece: SheetPiece; variant: SheetVariant; code: string },
  x: number, y: number, w: number, h: number, s: number,
) {
  const pad = 2.5 * s;
  const innerW = w - 2 * pad;
  pdf.setDrawColor(...HAIR);
  pdf.setLineWidth(0.3 * s);
  pdf.roundedRect(x, y, w, h, 2 * s, 2 * s, 'S');

  // Kopf: Kürzel «1A», Standard, Variante.
  let cy = y + pad;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10 * s);
  const codeW = Math.max(7 * s, pdf.getTextWidth(tile.code) + 3.5 * s);
  pdf.setFillColor(...GREEN);
  pdf.roundedRect(x + pad, cy, codeW, 6 * s, 3 * s, 3 * s, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text(tile.code, x + pad + codeW / 2, cy + 4.3 * s, { align: 'center' });
  const tx = x + pad + codeW + 2 * s;
  const tw = x + w - pad - tx;
  pdf.setTextColor(...INK);
  pdf.setFontSize(9 * s);
  pdf.text(fit(pdf, tile.piece.title, tw), tx, cy + 2.6 * s);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6 * s);
  pdf.setTextColor(...MUTED);
  const sub = [categoryDe(tile.piece.category), tile.variant.name].filter(Boolean).join('  ·  ');
  pdf.text(fit(pdf, sub, tw), tx, cy + 5.6 * s);
  cy += 6 * s + 2 * s;

  // WENN / SIGNAL: die zwei Dinge, die ein Spieler vor dem Standard wissen muss.
  const cue = (icon: typeof eyeIcon, label: string, text: string) => {
    const rowH = 6.2 * s;
    pdf.setFillColor(...TINT);
    pdf.roundedRect(x + pad, cy, innerW, rowH, 1.5 * s, 1.5 * s, 'F');
    icon(pdf, x + pad + 3.4 * s, cy + rowH / 2 + (icon === handIcon ? 0.4 * s : 0), 1.9 * s);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.5 * s);
    pdf.setTextColor(...GREEN);
    pdf.text(label, x + pad + 6.6 * s, cy + rowH / 2 + 0.7 * s);
    const lx = x + pad + 6.6 * s + pdf.getTextWidth(label) + 1.8 * s;
    pdf.setFontSize(8.5 * s);
    pdf.setTextColor(...INK);
    pdf.text(fit(pdf, text, x + pad + innerW - 1.5 * s - lx), lx, cy + rowH / 2 + 1.1 * s);
    cy += rowH + 1.2 * s;
  };
  cue(eyeIcon, 'WENN', tile.variant.recognition?.trim() || 'immer');
  cue(handIcon, 'SIGNAL', tile.variant.signal?.trim() || 'kein Signal');

  const phases = tile.variant.phases;
  if (!phases.length) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7 * s);
    pdf.setTextColor(...MUTED);
    pdf.text('Noch kein Spielbrett', x + w / 2, cy + (y + h - cy) / 2, { align: 'center' });
    return;
  }

  // Grosses Startbild, darunter «dann 2 → 3» als kleine Leiste.
  const bottom = y + h - pad;
  const rest = phases.slice(1, 4);
  const stripH = rest.length ? Math.min(24 * s, (bottom - cy) * 0.24) : 0;
  const bigH = bottom - cy - (rest.length ? stripH + 1.5 * s : 0);
  const big = phases[0];
  const bigW = Math.min(innerW, bigH * big.aspect);
  const bh = bigW / big.aspect;
  const bx = x + (w - bigW) / 2;
  pdf.addImage(big.dataUrl, 'PNG', bx, cy, bigW, bh, undefined, 'FAST');
  pdf.setDrawColor(...HAIR);
  pdf.setLineWidth(0.2 * s);
  pdf.rect(bx, cy, bigW, bh);
  stepBadge(pdf, bx + 1 * s, cy + 1 * s, '1', s);
  if (!rest.length) return;

  const sy = cy + bh + 1.5 * s;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6 * s);
  pdf.setTextColor(...MUTED);
  const lead = 'dann';
  const leadW = pdf.getTextWidth(lead) + 2 * s;
  const arrowW = 3.5 * s;
  const sw = Math.min(stripH * rest[0].aspect, (innerW - leadW - rest.length * arrowW) / rest.length);
  const shh = sw / rest[0].aspect;
  const total = leadW + rest.length * (arrowW + sw);
  let sx = x + (w - total) / 2;
  pdf.text(lead, sx, sy + shh / 2 + 1 * s);
  sx += leadW;
  rest.forEach((phase, i) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...GREEN);
    pdf.setFontSize(8 * s);
    pdf.text('›', sx + arrowW / 2, sy + shh / 2 + 1.2 * s, { align: 'center' });
    sx += arrowW;
    pdf.addImage(phase.dataUrl, 'PNG', sx, sy, sw, shh, undefined, 'FAST');
    pdf.setDrawColor(...HAIR);
    pdf.rect(sx, sy, sw, shh);
    stepBadge(pdf, sx + 0.6 * s, sy + 0.6 * s, String(i + 2), s * 0.8);
    sx += sw;
  });
  if (phases.length > 4) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(5.5 * s);
    pdf.setTextColor(...MUTED);
    pdf.text(`+ ${phases.length - 4} in der App`, x + w - pad, sy + shh + 2.2 * s, { align: 'right' });
  }
}

function stepBadge(pdf: jsPDF, x: number, y: number, label: string, s: number) {
  const r = 2.2 * s;
  pdf.setFillColor(...INK);
  pdf.circle(x + r, y + r, r, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7 * s);
  pdf.setTextColor(255, 255, 255);
  pdf.text(label, x + r, y + r + 0.9 * s, { align: 'center' });
}

function drawFooter(pdf: jsPDF, input: SheetInput, W: number, H: number, margin: number, s: number, pageLabel: string | null) {
  const fy = H - margin - 1 * s;
  pdf.setDrawColor(...HAIR);
  pdf.setLineWidth(0.25 * s);
  pdf.line(margin, fy - 3.6 * s, W - margin, fy - 3.6 * s);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5 * s);
  pdf.setTextColor(...MUTED);
  let lx = margin;
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(0.6 * s);
  pdf.setLineDashPattern([1.2 * s, 0.9 * s], 0);
  pdf.line(lx, fy - 0.8 * s, lx + 7 * s, fy - 0.8 * s);
  pdf.setLineDashPattern([], 0);
  pdf.text('Laufweg', lx + 8.5 * s, fy);
  lx += 8.5 * s + pdf.getTextWidth('Laufweg') + 6 * s;
  pdf.line(lx, fy - 0.8 * s, lx + 7 * s, fy - 0.8 * s);
  pdf.text('Pass / Ball', lx + 8.5 * s, fy);
  lx += 8.5 * s + pdf.getTextWidth('Pass / Ball') + 6 * s;
  pdf.setFillColor(6, 95, 70);
  pdf.circle(lx + 1.4 * s, fy - 0.9 * s, 1.4 * s, 'F');
  pdf.text('Eigene Spieler mit Nummer', lx + 4 * s, fy);
  lx += 4 * s + pdf.getTextWidth('Eigene Spieler mit Nummer') + 6 * s;
  pdf.setFillColor(127, 29, 29);
  pdf.circle(lx + 1.4 * s, fy - 0.9 * s, 1.4 * s, 'F');
  pdf.text('Gegner', lx + 4 * s, fy);
  const right = [input.generatedLabel, pageLabel].filter(Boolean).join('  ·  ');
  pdf.text(right, W - margin, fy, { align: 'right' });
}
