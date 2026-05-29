import fs from "node:fs";
import { type Page } from "@playwright/test";
import { FIXTURES_PATH } from "./paths";

export interface Fixtures {
  teamId: string;
  dragSetPieceId: string;
  matchdayId: string;
  shareToken: string;
}

export function getFixtures(): Fixtures {
  return JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf-8")) as Fixtures;
}

/**
 * First-run overlays (the editor tutorial and contextual tool tips) cover the
 * canvas and intercept clicks. Pre-seed their localStorage flags so they stay
 * dismissed for the whole context. Must be called before navigation.
 */
export async function suppressOverlays(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("setpiece-tutorial-completed", "true");
      localStorage.setItem(
        "setpiece-dismissed-tips",
        JSON.stringify([
          "select",
          "team_player",
          "opponent",
          "ball",
          "run_path",
          "curved_run",
          "pass_line",
          "curved_cross",
          "zone_circle",
          "zone_rect",
          "label",
          "erase",
        ]),
      );
    } catch {
      /* ignore storage failures */
    }
  });
}

function computePad(width: number): number {
  if (width < 600) return 10;
  if (width < 900) return 14;
  return 24;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Mirrors EditorCanvas#toPixel: converts a pitch percentage point into absolute
 * client coordinates relative to the Konva stage bounding box.
 */
export function pctToClient(box: Box, pct: Point): Point {
  const pad = computePad(box.width);
  const pitchW = box.width - pad * 2;
  const pitchH = box.height - pad * 2;
  return {
    x: box.x + pad + (pct.x / 100) * pitchW,
    y: box.y + pad + (pct.y / 100) * pitchH,
  };
}
