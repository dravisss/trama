import { test, expect, qaBaseURL } from "../support/qa-test.mjs";

function activePresentationCard(page) {
  return page.locator("#presentation-card:visible");
}

async function rewindPresentation(page) {
  const card = activePresentationCard(page);
  const previous = card.locator("#presentation-previous");
  await expect(card.locator("#presentation-progress")).toHaveAttribute("aria-valuenow", /\d+/);
  for (let index = 0; index < 32 && !(await previous.isDisabled()); index += 1) await previous.click();
  await expect(card.locator("#presentation-progress")).toHaveAttribute("aria-valuenow", "1");
  await expect(card.locator("#presentation-next")).toBeEnabled();
  await page.waitForTimeout(120);
}

async function advancePresentation(page, count = 1) {
  const next = activePresentationCard(page).locator("#presentation-next");
  for (let index = 0; index < count; index += 1) await next.click();
}

test("Presentation V2 can run the reversible relation-tooltip study", async ({ page }) => {
  const consoleErrors = [];
  page.on("pageerror", error => consoleErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${qaBaseURL()}/?qa=1&presentation-style=relation-tooltip`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("[data-react-ui-mode='present']").click();
  await rewindPresentation(page);

  await expect(page.locator("body")).toHaveAttribute("data-presentation-study", "relation-tooltip");
  await expect(activePresentationCard(page)).toBeVisible();
  await expect(activePresentationCard(page)).toHaveAttribute("data-study", "relation-tooltip");
  await expect(page.locator("#presentation-tooltip-connector")).toBeVisible();
  await expect(activePresentationCard(page)).toHaveAttribute("data-focus-kind", "map");
  await expect(page.locator("#presentation-tooltip-connector .presentation-tooltip-line")).toHaveCount(0);
  await expect(page.locator("#presentation-explore")).toHaveCount(0);
  await expect(page.locator("#presentation-resume")).toHaveCount(0);
  await expect(page.locator("#presentation-presenter-toggle")).toBeHidden();
  const stageBox = await page.locator("#map-area").boundingBox();
  const cardBox = await activePresentationCard(page).boundingBox();
  const previousBox = await activePresentationCard(page).locator("#presentation-previous").boundingBox();
  const nextBox = await activePresentationCard(page).locator("#presentation-next").boundingBox();
  expect(stageBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(cardBox.x).toBeGreaterThanOrEqual(stageBox.x);
  expect(cardBox.y).toBeGreaterThanOrEqual(stageBox.y);
  expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 1);
  expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1);
  expect(cardBox.height).toBeLessThan(420);
  expect(previousBox).not.toBeNull();
  expect(nextBox).not.toBeNull();
  const controlsCenter = ((previousBox.x + previousBox.width / 2) + (nextBox.x + nextBox.width / 2)) / 2;
  const cardCenter = cardBox.x + cardBox.width / 2;
  expect(Math.abs(controlsCenter - cardCenter)).toBeLessThan(4);

  // Beat 2 is a single-node focus and therefore gets a tethered card.
  await advancePresentation(page);
  await expect(activePresentationCard(page).locator("#presentation-progress")).toHaveAttribute("aria-valuenow", "2");
  await expect(activePresentationCard(page)).toHaveAttribute("data-focus-kind", "node");
  await expect(page.locator("#presentation-tooltip-connector .presentation-tooltip-line")).toHaveCount(1);
  await expect(page.locator("#presentation-tooltip-connector circle")).toHaveCount(1);
  await expect(page.locator("#presentation-tooltip-connector .presentation-tooltip-line")).toHaveAttribute("d", / Q /);

  // Beat 7 is a real single-edge focus from the persisted Presentation V2
  // fixture. It exposes the relation footer and keeps the connector visible.
  await advancePresentation(page, 5);
  await expect(activePresentationCard(page).locator("#presentation-progress")).toHaveAttribute("aria-valuenow", "7");
  await expect(page.locator("#presentation-relation-meta")).toBeVisible();
  await expect(page.locator("#presentation-relation-meta")).toContainText("Capacidade");
  await expect(page.locator("#presentation-relation-meta")).toContainText("Disponibilidade");
  await expect(page.locator("#presentation-relation-meta .presentation-relation-sign")).toHaveText("↑");
  await expect(activePresentationCard(page)).toHaveAttribute("data-focus-kind", "edge");
  await expect(page.locator("#presentation-tooltip-connector .presentation-tooltip-line")).toHaveCount(1);
  await expect(page.locator("#presentation-tooltip-connector .presentation-tooltip-line")).toHaveAttribute("d", / Q /);

  await page.keyboard.press("Escape");
  await expect(activePresentationCard(page)).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveAttribute("data-presentation-study", "relation-tooltip");

  // The study is URL-scoped and does not change the persisted presentation or
  // the default player profile.
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("[data-react-ui-mode='present']").click();
  await rewindPresentation(page);
  await expect(page.locator("body")).toHaveAttribute("data-presentation-study", "lower-third");
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("relation tooltip keeps a continuous offset while the camera animates", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`${qaBaseURL()}/?qa=1&presentation-style=relation-tooltip`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("[data-react-ui-mode='present']").click();
  await rewindPresentation(page);
  await expect(page.locator("body")).toHaveAttribute("data-presentation-study", "relation-tooltip");

  await advancePresentation(page);
  await expect(page.locator("#presentation-tooltip-connector .presentation-tooltip-line")).toHaveCount(1);
  await page.waitForTimeout(80);

  const samples = await page.evaluate(async () => {
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const values = [];
    for (let index = 0; index < 24; index += 1) {
      await nextFrame();
      const card = document.querySelector("#presentation-card")?.getBoundingClientRect();
      const svg = document.querySelector("#presentation-tooltip-connector")?.getBoundingClientRect();
      const dot = document.querySelector("#presentation-tooltip-connector circle");
      if (!card || !svg || !dot) continue;
      values.push({
        left: card.left,
        top: card.top,
        anchorLeft: svg.left + Number(dot.getAttribute("cx") || 0),
        anchorTop: svg.top + Number(dot.getAttribute("cy") || 0)
      });
    }
    return values;
  });

  expect(samples.length).toBeGreaterThan(10);
  const offsets = samples.map(sample => ({
    x: sample.left - sample.anchorLeft,
    y: sample.top - sample.anchorTop
  }));
  const stableOffsets = offsets.slice(2, -2);
  const maxXDrift = Math.max(...stableOffsets.map(offset => offset.x)) - Math.min(...stableOffsets.map(offset => offset.x));
  const maxYDrift = Math.max(...stableOffsets.map(offset => offset.y)) - Math.min(...stableOffsets.map(offset => offset.y));
  expect(maxXDrift).toBeLessThan(2);
  expect(maxYDrift).toBeLessThan(2);
});
