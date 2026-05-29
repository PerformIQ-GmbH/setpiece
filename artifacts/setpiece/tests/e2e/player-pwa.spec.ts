import { test, expect } from "@playwright/test";
import { getFixtures } from "./helpers";

const fx = getFixtures();

test.describe("Player PWA share route", () => {
  test("loads the set-piece list and opens a detail view", async ({ page }) => {
    // The player route is public; start from a clean (unauthenticated) context.
    await page.context().clearCookies();
    await page.goto(`/p/${fx.shareToken}`);

    // Team links open on the "identify yourself" screen listing players.
    const playerButton = page
      .getByRole("button")
      .filter({ hasText: /#\d+/ })
      .first();
    await expect(playerButton).toBeVisible({ timeout: 20_000 });
    await playerButton.click();

    // Overview screen shows the matchday's set pieces as clickable cards.
    const card = page.locator(".cursor-pointer.group").first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.click();

    // Detail view renders the board (Konva canvas) for the chosen set piece.
    await expect(page.locator(".konvajs-content").first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
