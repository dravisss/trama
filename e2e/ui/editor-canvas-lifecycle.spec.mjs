import { test, expect } from "../support/qa-test.mjs";

function qaBaseURL() {
  const baseURL = process.env.LOOPVIEWER_UI_QA_URL;
  if (!baseURL) throw new Error("LOOPVIEWER_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

async function openEditor(page) {
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-fingerprint", /.+/);
}

test("trocar mapa mantém o CanvasHost e seus comandos conectados", async ({ page }) => {
  const writes = [];
  let phase = "navigation";
  page.on("request", request => {
    if (request.method() !== "GET" && request.url().includes("/api/")) writes.push(`${phase}: ${request.method()} ${request.url()}`);
  });

  await openEditor(page);
  const canvas = page.locator("#cld-root");
  const canvasHandle = await canvas.elementHandle();
  const fingerprintBefore = await canvas.getAttribute("data-qa-fingerprint");

  await page.locator("#loop-select summary").click();
  await page.locator("#scenario-tabs").getByRole("button", { name: /Routing QA 8/ }).click();
  await expect(page.locator("#loop-select")).not.toHaveAttribute("open", "");
  await expect.poll(async () => await canvas.getAttribute("data-qa-fingerprint")).not.toBe(fingerprintBefore);
  expect(await canvasHandle?.evaluate(element => element.isConnected)).toBe(true);
  expect(writes).toEqual([]);

  // A model switch intentionally leaves edit mode to avoid accidental edits
  // against the new map. Re-entering through the persistent Editor mode must
  // restore the same toolbar instance and its bridge listeners.
  await page.locator("[data-react-ui-mode='map']").click();
  await expect(page.locator("#edit-toolbar")).toBeVisible();

  phase = "mutation";
  await page.getByRole("button", { name: "Adicionar variável" }).click();
  await expect(page.locator("#toast")).toContainText("Variável adicionada");
  await expect.poll(async () => await canvas.getAttribute("data-qa-fingerprint")).not.toBe(fingerprintBefore);
  expect(await canvasHandle?.evaluate(element => element.isConnected)).toBe(true);
  await expect.poll(() => writes.length).toBeGreaterThan(0);
});

test("seletor de mapas filtra e mantém suas ações no owner React", async ({ page }) => {
  await openEditor(page);
  await page.locator("#loop-select summary").click();

  const filter = page.locator("#loop-filter");
  await filter.fill("Routing QA 8");
  await expect(page.locator("#scenario-tabs .loop-option")).toHaveCount(1);
  await expect(page.locator("#scenario-tabs").getByRole("button", { name: /Routing QA 8/ })).toBeVisible();

  await filter.fill("");
  await expect(page.locator("#scenario-tabs").getByRole("button", { name: /Flagship — Crescimento sob pressão/ })).toBeVisible();
});
