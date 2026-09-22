import { test, expect } from "../support/qa-test.mjs";

function qaBaseURL() {
  const baseURL = process.env.TRAMA_UI_QA_URL;
  if (!baseURL) throw new Error("TRAMA_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

test("dez trocas de modo preservam um CanvasHost e uma composição React", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();

  const canvas = page.locator("#cld-root");
  const canvasHandle = await canvas.elementHandle();
  const cyContainerId = await page.evaluate(() => window.tramaDemo.engine.cy.container()?.id);
  for (const action of ["story", "map", "present", "close", "story", "map", "present", "close", "story", "map"]) {
    if (action === "close") {
      await page.locator("#presentation-close").click();
      await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");
      continue;
    }
    await page.locator(`[data-react-ui-mode="${action}"]`).click();
    await expect(page.locator("body")).toHaveAttribute("data-ui-mode", action);
  }

  expect(await canvasHandle?.evaluate(element => element.isConnected)).toBe(true);
  await expect(canvas).toHaveAttribute("data-qa-canvas-mounts", "1");
  expect(await page.evaluate(() => window.tramaDemo.engine.cy.container()?.isConnected)).toBe(true);
  expect(await page.evaluate(() => window.tramaDemo.engine.cy.container()?.id)).toBe(cyContainerId);
  expect(await page.locator("#cld-root")).toHaveCount(1);
  expect(await page.locator("#react-root")).toHaveCount(1);
  expect(await page.locator("[data-react-ui-mode]")).toHaveCount(4);
  expect(await page.locator("#react-root").evaluate(root => root.querySelectorAll("[data-react-ui-mode]").length)).toBe(4);
});
