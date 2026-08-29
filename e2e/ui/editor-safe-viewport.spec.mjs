import { test, expect } from "../support/qa-test.mjs";

function qaBaseURL() {
  const baseURL = process.env.LOOPVIEWER_UI_QA_URL;
  if (!baseURL) throw new Error("LOOPVIEWER_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

test("enquadramento do Editor respeita a área segura dos controles do canvas", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");
  await expect(page.locator("#edit-toolbar")).toBeVisible();
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-safe-rect", /.+/);
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-camera-stable", /^map:stable:/);

  const geometry = await page.evaluate(() => {
    const root = document.querySelector("#cld-root");
    const safe = JSON.parse(root.dataset.qaSafeRect);
    const cy = window.loopViewerDemo.engine.cy;
    const box = cy.elements().boundingBox({ includeLabels: true });
    const zoom = cy.zoom();
    const pan = cy.pan();
    return {
      safe,
      screen: {
        left: box.x1 * zoom + pan.x,
        top: box.y1 * zoom + pan.y,
        right: box.x2 * zoom + pan.x,
        bottom: box.y2 * zoom + pan.y
      }
    };
  });
  expect(geometry.screen.left).toBeGreaterThanOrEqual(geometry.safe.x - 2);
  expect(geometry.screen.top).toBeGreaterThanOrEqual(geometry.safe.y - 2);
  expect(geometry.screen.right).toBeLessThanOrEqual(geometry.safe.x + geometry.safe.width + 2);
  expect(geometry.screen.bottom).toBeLessThanOrEqual(geometry.safe.y + geometry.safe.height + 2);
});

test("o renderer mantém geometria autoral e polaridades legíveis entre modos", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator('.cld-edge-sign[data-hidden-by-density="false"]').first()).toBeVisible();
  const geometryByMode = {};
  for (const mode of ["map", "story", "present"]) {
    if (mode !== "map") await page.locator(`[data-react-ui-mode='${mode}']`).click();
    await expect(page.locator("body")).toHaveAttribute("data-ui-mode", mode);
    if (mode === "present") await expect(page.locator("#presentation-card")).toBeVisible();
    geometryByMode[mode] = await page.evaluate(() => {
      const node = window.loopViewerDemo.engine.cy.nodes().first();
      return {
        shape: node.pstyle("shape").value,
        width: node.width(),
        height: node.height()
      };
    });
  }
  expect(geometryByMode.story).toEqual(geometryByMode.map);
  expect(geometryByMode.present).toEqual(geometryByMode.map);
  await expect(page.locator('.cld-edge-sign[data-hidden-by-density="false"]').first()).toBeVisible();
});
