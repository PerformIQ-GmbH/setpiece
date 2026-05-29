import { test, expect } from "@playwright/test";
import { getFixtures } from "./helpers";

const fx = getFixtures();

test.describe("Share link", () => {
  test("generates a team share link with QR code and URL", async ({ page }) => {
    await page.goto(`/teams/${fx.teamId}/matchdays/${fx.matchdayId}`);

    await page.getByRole("button", { name: "Share" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("Share Match Pack", { exact: true }),
    ).toBeVisible();

    // "Team Link" scope is selected by default.
    await dialog
      .getByRole("button", { name: "Generate Share Link" })
      .click();

    // QR code renders as an inline SVG once the link is created.
    await expect(dialog.locator("svg").first()).toBeVisible();

    const urlField = dialog.locator('input[readonly]');
    await expect(urlField).toBeVisible();
    await expect(urlField).toHaveValue(/\/p\//);

    await expect(dialog.getByRole("button", { name: /Copy/ })).toBeVisible();
  });
});
