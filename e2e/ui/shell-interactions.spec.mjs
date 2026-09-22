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

test("save status popover closes on Escape and outside pointer without persisting", async ({ page }) => {
  const writes = [];
  let phase = "open-editor";
  page.on("request", request => {
    if (request.method() !== "GET" && request.url().includes("/api/")) writes.push(`${phase}: ${request.method()} ${request.url()}`);
  });

  await openEditor(page);
  phase = "save-popover";
  const status = page.locator("#save-status");
  const popover = page.locator("#save-popover");
  await status.click();
  await expect(popover).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(status).toBeFocused();

  await status.click();
  await expect(popover).toBeVisible();
  await page.locator(".brand h1").click();
  await expect(popover).toBeHidden();
  expect(writes).toEqual([]);
});

test("project switcher closes on Escape and outside pointer", async ({ page }) => {
  await openEditor(page);
  const menu = page.locator("#project-switcher");
  const summary = menu.locator("summary");
  await summary.click();
  await expect(menu).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(summary).toBeFocused();

  await summary.click();
  await expect(menu).toHaveAttribute("open", "");
  await page.locator(".brand h1").click();
  await expect(menu).not.toHaveAttribute("open", "");
});

test("project command dialog receives focus and closes safely with Escape", async ({ page }) => {
  await openEditor(page);
  await page.locator("#project-switcher summary").click();
  const trigger = page.locator("#edit-project-metadata");
  await trigger.click();
  const dialog = page.locator("#command-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Editar projeto" })).toBeVisible();
  await expect(dialog.locator("input").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.locator("#project-switcher")).not.toHaveAttribute("open", "");
  await expect(page.locator("#project-switcher summary")).toBeFocused();
});

test("ações do topbar permanecem conectadas ao owner React", async ({ page }) => {
  await openEditor(page);

  await expect(page.locator("#edit-toolbar")).toBeVisible();
  await page.locator("#edit-toggle").click();
  await expect(page.locator("#edit-toolbar")).toBeHidden();
  await page.locator("#edit-toggle").click();
  await expect(page.locator("#edit-toolbar")).toBeVisible();
  await page.locator("#edit-toggle").click();
  await expect(page.locator("#edit-toolbar")).toBeHidden();

  await page.locator("#focus-toggle").click();
  await expect(page.locator("body")).toHaveClass(/focus-mode/);
  await page.locator("#focus-exit").click();
  await expect(page.locator("body")).not.toHaveClass(/focus-mode/);
});

test("comandos do shell usam o canal de ações do owner React", async ({ page }) => {
  await openEditor(page);

  const mapSelector = page.locator("#loop-select");
  await mapSelector.locator("summary").click();
  await page.locator("#sidebar-new-loop").click();

  const dialog = page.locator("#command-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Novo mapa" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
