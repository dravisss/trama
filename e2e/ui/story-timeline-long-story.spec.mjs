import { test, expect, qaBaseURL } from "../support/qa-test.mjs";

test("Story Studio mantém uma apresentação longa em uma timeline horizontal sem sobrepor cenas", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("[data-react-ui-mode='story']").click();

  await page.locator("#story-timeline-overview").click();

  const track = page.locator(".story-timeline-track");
  const scenes = page.locator(".story-timeline-scene");
  await expect(track).toBeVisible();
  expect(await scenes.count()).toBeGreaterThan(8);

  const layout = await page.evaluate(() => {
    const track = document.querySelector(".story-timeline-track");
    const scenes = [...document.querySelectorAll(".story-timeline-scene")];
    const overlaps = scenes.some((scene, index) => scenes.slice(index + 1).some(other => {
      const a = scene.getBoundingClientRect();
      const b = other.getBoundingClientRect();
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }));
    return {
      clientWidth: track?.clientWidth ?? 0,
      scrollWidth: track?.scrollWidth ?? 0,
      sceneNumbers: scenes.slice(0, 8).map(scene => scene.querySelector(".story-timeline-scene-number")?.textContent?.trim()),
      firstBeatWidths: [...(scenes[0]?.querySelectorAll(".story-timeline-card") ?? [])].map(card => Math.round(card.getBoundingClientRect().width)),
      overlaps
    };
  });

  expect(layout.scrollWidth).toBeGreaterThan(layout.clientWidth);
  expect(layout.overlaps).toBe(false);
  expect(layout.sceneNumbers).toEqual(["01", "02", "03", "04", "05", "06", "07", "08"]);
  expect(layout.firstBeatWidths.every(width => width >= 116)).toBe(true);
});
