import { test, expect, type APIRequestContext } from "@playwright/test";
import { getFixtures, suppressOverlays, pctToClient, type Point } from "./helpers";

const fx = getFixtures();

interface Role {
  id: string;
  startPosition: Point | null;
}

async function fetchRoles(
  request: APIRequestContext,
): Promise<Role[]> {
  const res = await request.get(
    `/api/teams/${fx.teamId}/set-pieces/${fx.dragSetPieceId}`,
  );
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as { roles: Role[] };
  return data.roles;
}

function posOf(role: Role): Point {
  return { x: role.startPosition?.x ?? 50, y: role.startPosition?.y ?? 50 };
}

test.describe("Editor drag", () => {
  test("click on empty pitch leaves a marker put; dragging moves it", async ({
    page,
  }) => {
    await suppressOverlays(page);
    await page.goto(
      `/teams/${fx.teamId}/set-pieces/${fx.dragSetPieceId}/editor`,
    );

    const stage = page.locator(".konvajs-content").first();
    await expect(stage).toBeVisible();
    // Let the ResizeObserver settle the final canvas size and role data load.
    await page.waitForTimeout(1500);
    const box = await stage.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    const roles = await fetchRoles(page.request);
    expect(roles.length).toBeGreaterThan(0);
    const target = roles[0];
    const original = posOf(target);
    const markerClient = pctToClient(box, original);

    // --- Regression guard: select the marker, then click an empty area. ---
    await page.mouse.click(markerClient.x, markerClient.y);
    const emptySpot = pctToClient(box, { x: 12, y: 8 });
    await page.mouse.click(emptySpot.x, emptySpot.y);
    await page.waitForTimeout(600);

    const afterClick = await fetchRoles(page.request);
    const clickedPos = posOf(afterClick.find((r) => r.id === target.id)!);
    expect(clickedPos.x).toBeCloseTo(original.x, 1);
    expect(clickedPos.y).toBeCloseTo(original.y, 1);

    // --- Dragging the marker should persist a new position. ---
    const dropClient = pctToClient(box, { x: 22, y: 24 });
    await page.mouse.move(markerClient.x, markerClient.y);
    await page.mouse.down();
    await page.mouse.move(
      (markerClient.x + dropClient.x) / 2,
      (markerClient.y + dropClient.y) / 2,
      { steps: 10 },
    );
    await page.mouse.move(dropClient.x, dropClient.y, { steps: 10 });
    await page.mouse.up();

    await expect
      .poll(
        async () => {
          const latest = await fetchRoles(page.request);
          const p = posOf(latest.find((r) => r.id === target.id)!);
          return Math.hypot(p.x - original.x, p.y - original.y);
        },
        { timeout: 15_000 },
      )
      .toBeGreaterThan(3);

    // Restore the original position so the suite stays idempotent.
    await page.request.patch(
      `/api/teams/${fx.teamId}/set-pieces/${fx.dragSetPieceId}/roles/${target.id}`,
      { data: { startPosition: original } },
    );
  });
});
