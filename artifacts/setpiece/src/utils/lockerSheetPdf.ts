/**
 * Garderoben-Aushang: alle Standards eines Spieltags auf einem Blatt (A4 oder
 * A3 quer). Eine Zeile pro Standard: Titel, Kernhinweis und Rollen links,
 * daneben die Phasen als Spielfelder in einem festen Spaltenraster, damit
 * Phase 1, 2, 3 über alle Zeilen exakt untereinander stehen.
 *
 * Reines Layout auf einem übergebenen jsPDF-Dokument; Bilder liefert der
 * Aufrufer (renderSetPieceSteps), damit diese Datei ohne DOM testbar bleibt.
 */
import type { jsPDF } from 'jspdf';
import { buildPitchGeometry, pitchOrientationForCategory } from './pitchGeometry';

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

export type SheetFormat = 'a4' | 'a3';

export interface SheetRole {
  roleName: string;
  shirtNumber?: number | null;
  playerName?: string | null;
}

export interface SheetPiece {
  title: string;
  category: string;
  cue?: string | null;
  roles: SheetRole[];
  phases: Array<{ label: string; dataUrl: string; aspect: number }>;
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

const INK: [number, number, number] = [17, 24, 20];
const MUTED: [number, number, number] = [96, 104, 100];
const HAIR: [number, number, number] = [214, 222, 216];
// Dunkleres Grün als im UI: hält auf Weiss und im Schwarzweissdruck Kontrast.
const GREEN: [number, number, number] = [4, 120, 87];

const MAX_PHASES = 4;
const MIN_ROW_MM = 34;
const PT = 0.3528; // mm pro Punkt

/** Wie viele Standards passen auf eine Seite des Formats. */
export function rowsPerPage(format: SheetFormat): number {
  return Math.max(1, Math.floor(bodyHeight(format) / MIN_ROW_MM));
}

function pageSize(format: SheetFormat) {
  return format === 'a3' ? { w: 420, h: 297 } : { w: 297, h: 210 };
}
function scale(format: SheetFormat) { return format === 'a3' ? 1.3 : 1; }
function frame(format: SheetFormat) {
  const s = scale(format);
  const margin = 10 * s, header = 19 * s, footer = 6 * s, gap = 3 * s;
  return { margin, header, footer, gap };
}
function bodyHeight(format: SheetFormat) {
  const { h } = pageSize(format);
  const f = frame(format);
  return h - 2 * f.margin - f.header - f.footer - 2 * f.gap;
}

function fit(pdf: jsPDF, text: string, width: number): string {
  if (pdf.getTextWidth(text) <= width) return text;
  let t = text;
  while (t.length > 1 && pdf.getTextWidth(t + '…') > width) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

const shortName = (name?: string | null) => {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : parts[0];
};

export function buildLockerSheet(pdf: jsPDF, format: SheetFormat, input: SheetInput): void {
  const { w: W, h: H } = pageSize(format);
  const s = scale(format);
  const f = frame(format);
  const perPage = rowsPerPage(format);
  const pages = Math.max(1, Math.ceil(input.pieces.length / perPage));
  const contentW = W - 2 * f.margin;

  for (let page = 0; page < pages; page++) {
    if (page > 0) pdf.addPage(format, 'l');
    const pieces = input.pieces.slice(page * perPage, (page + 1) * perPage);

    // ─── Kopf ───────────────────────────────────────────────────────────
    const qr = 14 * s;
    const textRight = input.qrDataUrl ? W - f.margin - qr - 4 * s : W - f.margin;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7 * s);
    pdf.setTextColor(...GREEN);
    pdf.text('STANDARDS · GARDEROBE', f.margin, f.margin + 3 * s);
    pdf.setFontSize(17 * s);
    pdf.setTextColor(...INK);
    const headline = input.opponent ? `${input.teamName} – ${input.opponent}` : input.teamName;
    pdf.text(fit(pdf, headline, textRight - f.margin), f.margin, f.margin + 10.5 * s);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9 * s);
    pdf.setTextColor(...MUTED);
    const sub = [input.dateLabel, input.matchTitle].filter(Boolean).join('  ·  ');
    pdf.text(fit(pdf, sub, textRight - f.margin), f.margin, f.margin + 15.5 * s);
    if (input.qrDataUrl) {
      const qx = W - f.margin - qr;
      pdf.addImage(input.qrDataUrl, 'PNG', qx, f.margin - 1.5 * s, qr, qr);
      pdf.setFontSize(6 * s);
      pdf.text('Deine Rolle im Handy', W - f.margin, f.margin + qr + 1.5 * s, { align: 'right' });
    }
    const ruleY = f.margin + f.header;
    pdf.setDrawColor(...INK);
    pdf.setLineWidth(0.5 * s);
    pdf.line(f.margin, ruleY, W - f.margin, ruleY);

    // ─── Zeilen ─────────────────────────────────────────────────────────
    const bodyH = bodyHeight(format);
    let rowH = bodyH / Math.max(pieces.length, 1);
    const colGap = 3 * s;
    const labelH = 3.6 * s;
    // Eine Zellgrösse für alle Phasen: das breiteste Bild bestimmt das Raster.
    const aspect = Math.max(0.5, ...pieces.flatMap(p => p.phases.map(ph => ph.aspect)));
    const cols = Math.min(MAX_PHASES, Math.max(1, ...pieces.map(p => p.phases.length)));
    const maxImgArea = contentW * 0.66;
    let imgH = rowH - labelH - 3 * s;
    let imgW = imgH * aspect;
    if (cols * imgW + (cols - 1) * colGap > maxImgArea) {
      imgW = (maxImgArea - (cols - 1) * colGap) / cols;
      imgH = imgW / aspect;
    }
    // Begrenzt die Bildbreite, wird die Zeile nur so hoch wie ihr Inhalt; der
    // Block steht dann vertikal zentriert statt oben mit leerem Rest.
    rowH = Math.min(rowH, labelH + imgH + 4.5 * s);
    const bodyTop = ruleY + f.gap + (bodyH - rowH * pieces.length) / 2;
    // Bildblock bündig am rechten Rand, Text erhält den gesamten Rest.
    const imgX0 = W - f.margin - (cols * imgW + (cols - 1) * colGap);
    const textW = imgX0 - 6 * s - f.margin;

    pieces.forEach((piece, i) => {
      const y = bodyTop + i * rowH;
      const index = page * perPage + i + 1;
      if (i > 0) {
        pdf.setDrawColor(...HAIR);
        pdf.setLineWidth(0.25 * s);
        pdf.line(f.margin, y - 0.5 * s, W - f.margin, y - 0.5 * s);
      }
      const top = y + 1.5 * s;
      // Nummer als ausgefüllter Kreis: schneller Bezug beim Durchsprechen («Standard 2»).
      const r = 3.2 * s;
      pdf.setFillColor(...GREEN);
      pdf.circle(f.margin + r, top + r, r, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9 * s);
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(index), f.margin + r, top + r + 1.1 * s, { align: 'center' });

      const tx = f.margin + 2 * r + 2.5 * s;
      const tw = textW - (tx - f.margin);
      pdf.setTextColor(...INK);
      pdf.setFontSize(11 * s);
      pdf.text(fit(pdf, piece.title, tw), tx, top + 3.2 * s);
      pdf.setFontSize(6.5 * s);
      pdf.setTextColor(...GREEN);
      pdf.text(fit(pdf, categoryDe(piece.category).toUpperCase(), tw), tx, top + 6.6 * s);

      const ty0 = top + 2 * r + 3.2 * s;
      const bottom = y + rowH - 1.5 * s;
      // Rollen haben Vorrang vor dem Hinweis: erst Hinweis kürzen, dann Schrift
      // verkleinern, erst zuletzt «+ n weitere».
      const maxRoleCols = Math.max(1, Math.min(3, Math.floor(textW / (52 * s))));
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7.5 * s);
      const cueLines = piece.cue ? pdf.splitTextToSize(piece.cue.replace(/\s+/g, ' '), Math.min(textW, 150 * s)) as string[] : [];
      const cueLineH = 7.5 * s * PT * 1.25;
      const layout = (() => {
        for (const pt of [7.5 * s, 6.5 * s]) {
          const lh = pt * PT * 1.35;
          for (const n of [Math.min(2, cueLines.length), Math.min(1, cueLines.length), 0]) {
            const start = ty0 + (n ? n * cueLineH + 1.2 * s : 0);
            const cap = Math.max(1, Math.floor((bottom - start) / lh));
            if (piece.roles.length <= cap * maxRoleCols) return { pt, lh, n, start, cap };
          }
        }
        const lh = 6.5 * s * PT * 1.35;
        return { pt: 6.5 * s, lh, n: 0, start: ty0, cap: Math.max(1, Math.floor((bottom - ty0) / lh)) };
      })();
      if (layout.n > 0) {
        pdf.setTextColor(...MUTED);
        const shown = cueLines.slice(0, layout.n);
        if (cueLines.length > layout.n) shown[layout.n - 1] = fit(pdf, shown[layout.n - 1] + '…', Math.min(textW, 150 * s));
        pdf.text(shown, f.margin, ty0);
      }
      const ty = layout.start;
      const fontPt = layout.pt;
      const lineH = layout.lh;
      const capacity = layout.cap;
      const roleCols = Math.min(maxRoleCols, Math.ceil(piece.roles.length / capacity));
      const colW = (textW - (roleCols - 1) * 3 * s) / roleCols;
      const maxShown = capacity * roleCols;
      const overflow = piece.roles.length > maxShown;
      const shownRoles = piece.roles.slice(0, overflow ? maxShown - 1 : maxShown);
      pdf.setFontSize(fontPt);
      pdf.setFont('helvetica', 'bold');
      const numW = pdf.getTextWidth('#99') + 2 * s;
      shownRoles.forEach((role, ri) => {
        const cx = f.margin + Math.floor(ri / capacity) * (colW + 3 * s);
        const cy = ty + (ri % capacity) * lineH + fontPt * PT * 0.8;
        const assigned = !!role.playerName;
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...(assigned ? GREEN : MUTED));
        pdf.text(role.shirtNumber != null ? `#${role.shirtNumber}` : '–', cx, cy);
        const name = assigned ? shortName(role.playerName)! : 'offen';
        pdf.setTextColor(...(assigned ? INK : MUTED));
        const nameText = fit(pdf, name, (colW - numW) * 0.48);
        pdf.text(nameText, cx + numW, cy);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...MUTED);
        pdf.setFont('helvetica', 'bold');
        const roleX = cx + numW + pdf.getTextWidth(nameText) + 1.8 * s;
        pdf.setFont('helvetica', 'normal');
        pdf.text(fit(pdf, role.roleName, cx + colW - roleX), roleX, cy);
      });
      if (overflow) {
        const ri = shownRoles.length;
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(...MUTED);
        pdf.text(`+ ${piece.roles.length - shownRoles.length} weitere in der App`,
          f.margin + Math.floor(ri / capacity) * (colW + 3 * s), ty + (ri % capacity) * lineH + fontPt * PT * 0.8);
      }

      // Phasen im festen Raster.
      const imgTop = y + 1.5 * s + labelH;
      piece.phases.slice(0, cols).forEach((phase, pi) => {
        const cellX = imgX0 + pi * (imgW + colGap);
        // Schmalere Felder (ganzes Spielfeld) mittig in der Zelle.
        const pw = Math.min(imgW, imgH * phase.aspect);
        const ix = cellX + (imgW - pw) / 2;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5 * s);
        pdf.setTextColor(...INK);
        const name = /^(Step|Phase) \d+$/.test(phase.label) ? '' : phase.label;
        pdf.text(fit(pdf, `Phase ${pi + 1}${name ? `  ·  ${name}` : ''}`, imgW), cellX, imgTop - 1.1 * s);
        pdf.addImage(phase.dataUrl, 'PNG', ix, imgTop, pw, imgH, undefined, 'FAST');
        pdf.setDrawColor(...HAIR);
        pdf.setLineWidth(0.2 * s);
        pdf.rect(ix, imgTop, pw, imgH);
      });
      if (piece.phases.length > cols) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(6 * s);
        pdf.setTextColor(...MUTED);
        pdf.text(`+ ${piece.phases.length - cols} Phasen in der App`, W - f.margin, imgTop + imgH + 2.6 * s, { align: 'right' });
      }
    });

    // ─── Fuss: Legende links, Stand und Seite rechts ────────────────────
    const fy = H - f.margin - 1 * s;
    pdf.setDrawColor(...HAIR);
    pdf.setLineWidth(0.25 * s);
    pdf.line(f.margin, fy - 3.6 * s, W - f.margin, fy - 3.6 * s);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5 * s);
    pdf.setTextColor(...MUTED);
    let lx = f.margin;
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
    pdf.text('Eigene Spieler mit Trikotnummer', lx + 4 * s, fy);
    lx += 4 * s + pdf.getTextWidth('Eigene Spieler mit Trikotnummer') + 6 * s;
    pdf.setFillColor(127, 29, 29);
    pdf.circle(lx + 1.4 * s, fy - 0.9 * s, 1.4 * s, 'F');
    pdf.text('Gegner', lx + 4 * s, fy);
    const right = pages > 1 ? `${input.generatedLabel}  ·  Blatt ${page + 1}/${pages}` : input.generatedLabel;
    pdf.text(right, W - f.margin, fy, { align: 'right' });
  }
}
