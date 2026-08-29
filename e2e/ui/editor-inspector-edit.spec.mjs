import { test, expect } from "../support/qa-test.mjs";
import { activateCanvasEdge, activateCanvasNode } from "../support/canvas-interaction.mjs";

function qaBaseURL() {
  const baseURL = process.env.LOOPVIEWER_UI_QA_URL;
  if (!baseURL) throw new Error("LOOPVIEWER_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

test("Inspector edita uma variável selecionada e o undo restaura o canvas", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const writes = [];
  page.on("request", request => {
    if (request.method() !== "GET" && request.url().includes("/api/")) writes.push(`${request.method()} ${request.url()}`);
  });

  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator("#cld-root")).toBeVisible();
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-camera-stable", /^map:stable:/);

  await activateCanvasNode(page, "demand");
  const label = page.locator("#dock-element-label");
  await expect(label).toBeVisible();
  await expect(label).toHaveValue("Demanda");

  await label.fill("Demanda revisada");
  await page.locator("#dock-inspector-form").evaluate(form => form.requestSubmit());
  await expect(page.locator("#toast")).toContainText("Alterações aplicadas");
  await expect(label).toHaveValue("Demanda revisada");
  await expect.poll(() => writes.length).toBeGreaterThan(0);

  await page.keyboard.press("Meta+z");
  await expect(label).toHaveValue("Demanda");
});

test("Inspector edita uma relação selecionada sem remontar o canvas", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-camera-stable", /^map:stable:/);
  await activateCanvasEdge(page, "demand-planning");

  const description = page.locator("#dock-element-description");
  await expect(description).toBeVisible();
  const original = await description.inputValue();
  await description.fill("Descrição causal revisada.");
  await page.locator("#dock-inspector-form").evaluate(form => form.requestSubmit());
  await expect(description).toHaveValue("Descrição causal revisada.");

  await page.keyboard.press("Meta+z");
  await expect(description).toHaveValue(original);
});
