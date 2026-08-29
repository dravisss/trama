import { test, expect } from "../support/qa-test.mjs";

function qaBaseURL() {
  const baseURL = process.env.LOOPVIEWER_UI_QA_URL;
  if (!baseURL) throw new Error("LOOPVIEWER_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

async function openMobileEditor(page, viewport = { width: 390, height: 844 }) {
  await page.setViewportSize(viewport);
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");
  await expect(page.locator("#edit-toolbar")).toBeVisible();
}

test("toolbar móvel não depende de overflow horizontal e mantém ações essenciais por teclado", async ({ page }) => {
  await openMobileEditor(page);

  const toolbar = page.locator("#edit-toolbar");
  const metrics = await toolbar.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.overflowX).not.toBe("auto");

  await expect(page.getByRole("button", { name: "Adicionar variável" })).toBeVisible();
  const more = page.locator(".edit-toolbar-more > summary");
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".edit-toolbar-more")).toHaveAttribute("open", "");
  await expect(page.locator("#connect-selection")).toBeVisible();
  await expect(page.locator("#save-layout")).toBeVisible();
});

test("reflow equivalente a zoom de 200% mantém ações do Editor alcançáveis", async ({ page }) => {
  // 1024×768 a 200% de zoom resulta em aproximadamente 512×384 CSS px.
  // Exercitar esse viewport verifica reflow real, não somente densidade de
  // pixels da captura.
  await openMobileEditor(page, { width: 512, height: 384 });

  const toolbar = page.locator("#edit-toolbar");
  const metrics = await toolbar.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.overflowX).not.toBe("auto");

  const more = page.locator(".edit-toolbar-more > summary");
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#connect-selection")).toBeVisible();
  await expect(page.locator("#save-layout")).toBeVisible();
});
