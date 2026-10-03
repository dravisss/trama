import { test, expect } from "../support/qa-test.mjs";

function qaBaseURL() {
  const baseURL = process.env.TRAMA_UI_QA_URL;
  if (!baseURL) throw new Error("TRAMA_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

async function openEditor(page) {
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");
}

test("rail do Editor abre Style, Dados, Markdown e Histórico por teclado sem persistir", async ({ page }) => {
  const writes = [];
  page.on("request", request => {
    if (request.method() !== "GET" && request.url().includes("/api/")) writes.push(`${request.method()} ${request.url()}`);
  });
  await openEditor(page);

  const rail = page.getByRole("navigation", { name: "Painéis do editor" });
  const style = rail.getByRole("button", { name: "Estilo da vista" });
  await style.focus();
  await page.keyboard.press("Space");
  await expect(style).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("section[data-dock-content='style']")).toBeVisible();
  await expect(page.locator("#apply-loop-style")).toBeVisible();

  await rail.getByRole("button", { name: "Tabela de dados" }).click();
  await expect(page.locator("section[data-dock-content='table']")).toBeVisible();
  await expect(page.locator("#data-table-wrap")).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/editor-data-workspace/);
  await expect(page.locator(".map-area")).toBeHidden();

  await rail.getByRole("button", { name: "Código Markdown" }).click();
  await expect(page.locator("section[data-dock-content='code']")).toBeVisible();
  await expect(page.locator("body")).not.toHaveClass(/editor-data-workspace/);
  await expect(page.locator("#loop-source-editor")).toBeVisible();

  await rail.getByRole("button", { name: "Histórico de versões" }).click();
  await expect(page.locator("section[data-dock-content='history']")).toBeVisible();
  await expect(page.locator("#version-list")).toBeVisible();
  expect(writes).toEqual([]);
});

test("ações do dock de mapa usam o owner React", async ({ page }) => {
  await openEditor(page);

  const rail = page.getByRole("navigation", { name: "Painéis do editor" });
  await rail.getByRole("button", { name: "Mapa e descrição" }).click();
  await expect(page.locator("#rename-loop")).toBeVisible();
  await page.locator("#rename-loop").click({ position: { x: 2, y: 15 } });
  await expect(page.getByRole("dialog", { name: "Renomear mapa" })).toBeVisible();
  await expect(page.locator("#command-dialog").getByRole("heading", { name: "Renomear mapa" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#command-dialog")).toBeHidden();

  await page.locator("#edit-loop-description").click();
  await expect(page.locator("#loop-description-modal")).toBeVisible();
  const description = page.getByRole("dialog", { name: "Editar descrição do mapa" });
  await expect(description).toBeVisible();
  await description.getByRole("button", { name: "Salvar descrição" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.locator("#close-loop-description")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(description.getByRole("button", { name: "Salvar descrição" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#loop-description-modal")).toBeHidden();
  await expect(page.locator("#edit-loop-description")).toBeFocused();
});
