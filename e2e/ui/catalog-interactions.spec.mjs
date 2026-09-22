import { test, expect } from "../support/qa-test.mjs";

function catalogUrl() {
  const baseURL = process.env.TRAMA_UI_QA_URL;
  if (!baseURL) throw new Error("TRAMA_UI_QA_URL was not initialized by Playwright global setup.");
  return `${baseURL}/ui-catalog.html`;
}

test("UI Catalog changes density locally and never writes project data", async ({ page }) => {
  const writeRequests = [];
  page.on("request", request => {
    if (request.method() !== "GET" && request.url().includes("/api/")) writeRequests.push(`${request.method()} ${request.url()}`);
  });

  await page.goto(catalogUrl(), { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-density", "comfortable");
  await page.getByRole("button", { name: "Alternar densidade" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  await expect.poll(() => writeRequests).toEqual([]);
});

test("UI Catalog tabs use roving focus and retain one selected tab", async ({ page }) => {
  await page.goto(catalogUrl(), { waitUntil: "domcontentloaded" });
  const visual = page.getByRole("tab", { name: "Visual" });
  const data = page.getByRole("tab", { name: "Dados" });
  const history = page.getByRole("tab", { name: "Histórico" });

  await visual.focus();
  await page.keyboard.press("ArrowRight");
  await expect(data).toBeFocused();
  await expect(data).toHaveAttribute("aria-selected", "true");
  await expect(visual).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("End");
  await expect(history).toBeFocused();
  await expect(history).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { selected: true })).toHaveCount(1);
});

test("UI Catalog dialog and menu restore focus after Escape", async ({ page }) => {
  await page.goto(catalogUrl(), { waitUntil: "domcontentloaded" });
  const dialogTrigger = page.getByRole("button", { name: "Abrir diálogo" });
  const dialog = page.getByRole("dialog", { name: "Exemplo de diálogo" });

  await dialogTrigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Fechar diálogo" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(dialogTrigger).toBeFocused();

  const menuTrigger = page.getByRole("button", { name: "Mais ações" });
  const menu = page.getByRole("menu", { name: "Ações do catálogo" });
  await menuTrigger.click();
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Duplicar" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(menuTrigger).toBeFocused();
});

test("UI Catalog icon actions expose names and tooltips", async ({ page }) => {
  await page.goto(catalogUrl(), { waitUntil: "domcontentloaded" });
  const button = page.getByRole("button", { name: "Mais opções" });
  await button.hover();
  const tooltip = page.getByRole("tooltip", { name: "Mais opções" });
  await expect.poll(() => tooltip.evaluate(element => getComputedStyle(element).opacity)).toBe("1");
});
