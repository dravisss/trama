import { test, expect } from "../support/qa-test.mjs";

function qaBaseURL() {
  const baseURL = process.env.LOOPVIEWER_UI_QA_URL;
  if (!baseURL) throw new Error("LOOPVIEWER_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

async function openStory(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Story Studio" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "story");
  await expect(page.locator("#story-timeline-shell")).toBeVisible();
  await expect(page.locator(".story-timeline-card-main").first()).toBeVisible();
}

test("Story Studio móvel abre o inspector como folha e devolve foco", async ({ page }) => {
  await openStory(page);

  const toggle = page.locator("#story-mobile-inspector-toggle");
  await toggle.focus();
  await toggle.click();
  await expect(page.locator("body")).toHaveClass(/story-inspector-mobile-open/);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#story-mobile-inspector-close")).toBeVisible();
  await expect(page.locator("#story-mobile-inspector-close")).toBeFocused();

  await page.locator("#story-mobile-inspector-close").click();
  await expect(page.locator("body")).not.toHaveClass(/story-inspector-mobile-open/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();

  await toggle.click();
  await expect(page.locator("#story-mobile-inspector-close")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveClass(/story-inspector-mobile-open/);
  await expect(toggle).toBeFocused();
});
