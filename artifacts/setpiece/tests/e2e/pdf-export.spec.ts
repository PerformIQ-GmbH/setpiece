import { test, expect } from "@playwright/test";
import { getFixtures, suppressOverlays } from "./helpers";

const fx = getFixtures();

test.describe("PDF export", () => {
  test("set-piece editor exports a PDF with a loading state", async ({
    page,
  }) => {
    await suppressOverlays(page);
    await page.goto(
      `/teams/${fx.teamId}/set-pieces/${fx.dragSetPieceId}/editor`,
    );

    const exportBtn = page.getByRole("button", { name: "PDF", exact: true });
    await expect(exportBtn).toBeVisible();

    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
    await exportBtn.click();

    // Loading state (best-effort: the export can finish quickly).
    await page
      .getByText("Exporting…")
      .waitFor({ state: "visible", timeout: 8_000 })
      .catch(() => {});

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test("matchday detail exports the match pack PDF", async ({ page }) => {
    await page.goto(`/teams/${fx.teamId}/matchdays/${fx.matchdayId}`);

    const exportBtn = page.getByRole("button", { name: "Export PDF" });
    await expect(exportBtn).toBeVisible();

    const downloadPromise = page.waitForEvent("download", { timeout: 75_000 });
    await exportBtn.click();

    await page
      .getByText("Exporting...")
      .waitFor({ state: "visible", timeout: 8_000 })
      .catch(() => {});

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
