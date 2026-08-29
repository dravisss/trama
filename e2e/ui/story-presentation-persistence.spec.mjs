import { test, expect, qaBaseURL } from "../support/qa-test.mjs";

test("SavePresentation preserva V2, revisão e fonte após reload", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  const initialRevision = await page.evaluate(async () => {
    const payload = await fetch("/api/presentations").then(response => response.json());
    return payload.presentations.find(item => item.id === "flagship-growth-story")?.revision;
  });
  expect(initialRevision).toEqual(expect.any(Number));
  await page.locator("[data-react-ui-mode='story']").click();
  await expect(page.locator("#story-timeline-shell[data-story-ui='v2']")).toBeVisible();

  const title = page.locator("#presentation-title-input");
  await expect(title).toHaveValue("Crescimento sob pressão — uma história do sistema");
  await title.fill("Crescimento sob pressão — história revisada");
  await title.press("Tab");
  await expect(title).toHaveValue("Crescimento sob pressão — história revisada");

  const saveResponse = page.waitForResponse(response =>
    response.request().method() === "PUT" && /\/api\/presentations\/[^/]+$/.test(response.url()));
  await page.locator("#save-presentation").click();
  const response = await saveResponse;
  const payload = await response.json();
  expect(response.ok()).toBe(true);
  expect(response.request().postDataJSON()).toMatchObject({
    title: "Crescimento sob pressão — história revisada",
    expected_revision: initialRevision,
    presentation: {
      schemaVersion: 2,
      title: "Crescimento sob pressão — história revisada",
      source_md: expect.any(String),
      chapters: expect.any(Array)
    }
  });
  expect(payload.presentation.revision).toBe(initialRevision + 1);
  await expect(page.locator("#toast")).toContainText("História salva no projeto SQLite");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("[data-react-ui-mode='story']").click();
  await expect(page.locator("#presentation-title-input")).toHaveValue("Crescimento sob pressão — história revisada");
  await expect(page.locator("#story-timeline-shell[data-story-ui='v2']")).toBeVisible();
});

test("SavePresentation mantém dirty state após erro e permite retry", async ({ page }) => {
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("[data-react-ui-mode='story']").click();
  await expect(page.locator("#story-timeline-shell[data-story-ui='v2']")).toBeVisible();

  let attempts = 0;
  await page.route("**/api/presentations/*", async route => {
    if (route.request().method() !== "PUT") return route.continue();
    attempts += 1;
    if (attempts === 1) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "temporarily unavailable" })
      });
    }
    return route.continue();
  });

  const title = page.locator("#presentation-title-input");
  await title.fill("Crescimento sob pressão — retry");
  await title.press("Tab");
  await page.locator("#save-presentation").click();
  await expect(page.locator("#toast")).toContainText("Não foi possível salvar a história");
  await expect(page.locator("#save-status")).toHaveClass(/saving/);

  const retryResponse = page.waitForResponse(response =>
    response.request().method() === "PUT" && /\/api\/presentations\/[^/]+$/.test(response.url()));
  await page.locator("#save-presentation").click();
  const response = await retryResponse;
  expect(response.ok()).toBe(true);
  await expect(page.locator("#toast")).toContainText("História salva no projeto SQLite");
  await expect(page.locator("#save-status")).toHaveClass(/saved/);
  expect(attempts).toBe(2);
});
