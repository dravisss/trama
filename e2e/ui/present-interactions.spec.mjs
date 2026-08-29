import { test, expect } from "../support/qa-test.mjs";

test("Present supports guided keyboard playback, presenter notes and close", async ({ page }) => {
  const consoleErrors = [];
  page.on("pageerror", error => consoleErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page).toHaveTitle(/LoopViewer/);
  await page.locator("[data-react-ui-mode='present']").click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "present");
  await expect(page.locator("#presentation-card")).toBeVisible();
  await expect(page.locator("#presentation-progress")).toHaveAttribute("aria-valuenow", "1");

  const firstTitle = await page.locator("#presentation-title").textContent();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#presentation-progress")).toHaveAttribute("aria-valuenow", "2");
  await expect(page.locator("#presentation-title")).not.toHaveText(firstTitle || "");

  await expect(page.locator("#presentation-explore")).toHaveCount(0);
  await expect(page.locator("#presentation-resume")).toHaveCount(0);
  await expect(page.locator(".story-current")).toHaveCount(0);

  // The deterministic QA presentation uses the lower-third profile, which
  // intentionally hides presenter notes from the compact player chrome. The
  // keyboard command remains available and exposes its state through ARIA.
  await page.keyboard.press("p");
  await expect(page.locator("#presentation-presenter-toggle")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("p");
  await expect(page.locator("#presentation-presenter-toggle")).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("Escape");
  await expect(page.locator("#presentation-card")).toBeHidden();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

function qaBaseURL() {
  const baseURL = process.env.LOOPVIEWER_UI_QA_URL;
  if (!baseURL) throw new Error("LOOPVIEWER_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}
