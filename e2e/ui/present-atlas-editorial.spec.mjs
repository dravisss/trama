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

async function advanceToFocusKind(page, kind, { maxSteps = 12 } = {}) {
  const card = activePresentationCard(page);
  for (let index = 0; index <= maxSteps; index += 1) {
    if (await card.getAttribute("data-focus-kind") === kind) return;
    await card.locator("#presentation-next").click();
  }
  await expect(card).toHaveAttribute("data-focus-kind", kind);
}

test("Atlas editorial is an additive Presentation V2 profile with exact connectors", async ({ page }) => {
  const consoleErrors = [];
  page.on("pageerror", error => consoleErrors.push(error.stack || error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${qaBaseURL()}/?qa=1&presentation-style=atlas-editorial`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("[data-react-ui-mode='present']").click();
  await rewindPresentation(page);

  await expect(page.locator("body")).toHaveAttribute("data-presentation-study", "atlas-editorial");
  await expect(activePresentationCard(page)).toHaveAttribute("data-study", "atlas-editorial");
  await expect(page.locator("#presentation-study-label")).toHaveText("Atlas editorial");

  // A single-node focus has a real tether. Its exact ordinal remains authored
  // content, so this verifies the semantic frame rather than a fragile beat index.
  await advanceToFocusKind(page, "node");
  await expect(page.locator("#presentation-tooltip-connector .presentation-tooltip-line")).toHaveCount(1);
  await expect(page.locator("#presentation-tooltip-connector .presentation-tooltip-halo")).toHaveCount(1);
  await expect(page.locator("#presentation-tooltip-connector circle")).toHaveCount(1);
  await expect(page.locator("#presentation-card")).toHaveAttribute("data-camera-mode", "fit-focus");
  await expect(page.locator("#presentation-card")).toHaveAttribute("data-camera-duration", "820");

  const stage = await page.locator("#map-area").boundingBox();
  const card = await activePresentationCard(page).boundingBox();
  expect(stage).not.toBeNull();
  expect(card).not.toBeNull();
  expect(card.x).toBeGreaterThanOrEqual(stage.x);
  expect(card.y).toBeGreaterThanOrEqual(stage.y);
  expect(card.x + card.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
  expect(card.y + card.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
  const connectorDot = await page.locator("#presentation-tooltip-connector circle").boundingBox();
  expect(connectorDot).not.toBeNull();
  // Atlas deliberately docks its editorial card on the opposite side of the
  // composition, so authored focus remains visible instead of sitting behind
  // the explanation. The side depends on the current semantic focus.
  expect(card.x + card.width <= connectorDot.x || card.x >= connectorDot.x + connectorDot.width).toBe(true);

  // A composed path never receives an invented anchor.
  await advanceToFocusKind(page, "path");
  await expect(page.locator("#presentation-tooltip-connector .presentation-tooltip-line")).toHaveCount(0);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});
