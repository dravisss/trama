import { test, expect } from "../support/qa-test.mjs";
import AxeBuilder from "@axe-core/playwright";

for (const width of [1440, 390]) {
  test(`application authoring surfaces have accessible controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${process.env.TRAMA_UI_QA_URL}/?qa=1`);
    await expect(page.locator("#workspace-map-list")).toBeVisible();
    await audit(page);
    await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
    for (const mode of ["map", "story"]) {
      await page.locator(`[data-react-ui-mode='${mode}']`).click();
      await expect(page.locator("body")).toHaveAttribute("data-ui-mode", mode);
      await expect(page.locator("#canvas-zoom-in")).toHaveAccessibleName("Aumentar zoom");
      await audit(page);
      if (mode === "map") {
        await page.locator("#project-switcher > summary").click();
        await audit(page);
        await page.keyboard.press("Escape");
        await page.locator(".edit-toolbar-more > summary").click();
        await audit(page);
        await page.keyboard.press("Escape");
      }
    }
  });
}

async function audit(page) {
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter(item => ["critical", "serious"].includes(item.impact));
  expect(blocking, JSON.stringify(blocking.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })))).toEqual([]);
}
