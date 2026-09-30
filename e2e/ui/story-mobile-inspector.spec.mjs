import { test, expect } from "../support/qa-test.mjs";

function qaBaseURL() {
  const baseURL = process.env.TRAMA_UI_QA_URL;
  if (!baseURL) throw new Error("TRAMA_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

async function openStory(page, width = 390) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "História" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "story");
  await expect(page.locator("#story-timeline-shell")).toBeVisible();
  await expect(page.locator(".story-timeline-card-main").first()).toBeVisible();
}

test("story actions fit a 360px viewport with touch targets", async ({ page }) => {
  await openStory(page, 360);
  const boxes = await page.locator(".story-timeline-actions button, .story-timeline-create-actions button").evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return { id: node.id, left: box.left, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
  }));
  for (const box of boxes) {
    expect(box.left, box.id).toBeGreaterThanOrEqual(0);
    expect(box.right, box.id).toBeLessThanOrEqual(360);
    expect(box.bottom, box.id).toBeLessThanOrEqual(844);
    expect(box.width, box.id).toBeGreaterThanOrEqual(44);
    expect(box.height, box.id).toBeGreaterThanOrEqual(44);
  }
});

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
