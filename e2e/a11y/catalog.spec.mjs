import { test, expect } from "../support/qa-test.mjs";
import AxeBuilder from "@axe-core/playwright";

test("UI Catalog has no critical or serious accessibility violations", async ({ page }) => {
  const baseURL = process.env.LOOPVIEWER_UI_QA_URL;
  if (!baseURL) throw new Error("LOOPVIEWER_UI_QA_URL was not initialized by Playwright global setup.");
  await page.goto(`${baseURL}/ui-catalog.html`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "UI Catalog", level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(violation => ["critical", "serious"].includes(violation.impact));
  expect(blocking, blocking.map(item => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
});
