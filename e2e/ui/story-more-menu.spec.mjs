import { test, expect, qaBaseURL } from "../support/qa-test.mjs";

test("Story Studio abre e fecha o menu de mais ações sem perder seus comandos", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("[data-react-ui-mode='story']").click();
  await expect(page.locator("#story-timeline-shell")).toBeVisible();

  const trigger = page.locator("#story-v2-more-actions");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#story-v2-more-menu")).toBeVisible();
  await expect(page.locator("#story-v2-more-menu #validate-presentation")).toBeVisible();
  await expect(page.locator("#story-v2-more-menu #export-presentation-source")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#story-v2-more-menu")).toBeHidden();
});
