import { test, expect } from "../support/qa-test.mjs";

test("Editor mantém ações essenciais alcançáveis em zoom equivalente a 200%", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator("#edit-toolbar")).toBeVisible();

  // CSS zoom gives the browser fixture an explicit 2x layout scale while
  // keeping the test deterministic across headed/headless Chromium.
  await page.locator("html").evaluate(element => { element.style.zoom = "2"; });
  await expect(page.getByRole("button", { name: "Adicionar variável" })).toBeVisible();
  await page.locator(".edit-toolbar-more > summary").click();
  await expect(page.locator("#connect-selection")).toBeVisible();
  await expect(page.locator("#save-layout")).toBeVisible();
  const overflowX = await page.locator("#edit-toolbar").evaluate(element => getComputedStyle(element).overflowX);
  expect(overflowX).not.toBe("auto");
});

function qaBaseURL() {
  const baseURL = process.env.TRAMA_UI_QA_URL;
  if (!baseURL) throw new Error("TRAMA_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}
