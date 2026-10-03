import { test, expect } from "../support/qa-test.mjs";

function qaBaseURL() {
  const baseURL = process.env.TRAMA_UI_QA_URL;
  if (!baseURL) throw new Error("TRAMA_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

async function openStyleBuilder(page) {
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Estilo da vista" }).click();
  await expect(page.locator("#view-style-preset")).toBeVisible();
}

async function openViewActions(page) {
  const actions = page.locator(".editor-title-view-actions");
  if (!await actions.locator("#new-view").isVisible()) await actions.locator("summary").click();
  return actions;
}

function activeViewSelect(page) {
  return page.locator("#active-view-select:visible");
}

async function activeViewTitle(page) {
  return (await activeViewSelect(page).locator("option:checked").textContent())?.trim();
}

test("prévia de Style Builder muda somente o canvas até salvar", async ({ page }) => {
  const writes = [];
  page.on("request", request => {
    if (request.method() !== "GET" && request.url().includes("/api/")) writes.push(`${request.method()} ${request.url()}`);
  });
  await openStyleBuilder(page);

  const preset = page.locator("#view-style-preset");
  const initial = await preset.inputValue();
  const alternatives = await preset.locator("option").evaluateAll(options => options.map(option => option.value).filter(value => value));
  const target = alternatives.find(value => value !== initial);
  expect(target).toBeTruthy();
  await preset.selectOption(target);

  await expect(page.locator("#loop-style-status")).toContainText("Prévia aplicada");
  await expect(page.locator("#apply-loop-style")).toBeVisible();
  expect(writes).toEqual([]);
});

test("CreateView cria uma view sem duplicar o mapa e restaura após reload", async ({ page }) => {
  await openStyleBuilder(page);
  const actions = await openViewActions(page);
  const createRequest = page.waitForRequest(request =>
    request.method() === "POST" && request.url().endsWith("/api/views"));

  await actions.locator("#new-view").click();
  await expect(page.locator("#command-dialog[open]")).toBeVisible();
  await page.locator("#command-dialog-submit").click();
  const request = await createRequest;
  await expect(activeViewSelect(page).locator("option:checked")).toHaveText("Vista 3");
  await expect(page.locator("#toast")).toContainText("Nova vista criada");
  expect(request.postDataJSON()).toMatchObject({ map_id: "flagship-growth" });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(activeViewSelect(page)).toContainText("Vista 3");
});

test("DuplicateView cria uma cópia independente no mesmo mapa", async ({ page }) => {
  await openStyleBuilder(page);
  const actions = await openViewActions(page);
  const currentTitle = await activeViewTitle(page);
  const createRequest = page.waitForRequest(request =>
    request.method() === "POST" && request.url().endsWith("/api/views"));

  await actions.locator("#duplicate-view").click();
  const request = await createRequest;
  await expect(activeViewSelect(page).locator("option:checked")).toHaveText(`${currentTitle} cópia`);
  await expect(page.locator("#toast")).toContainText("Vista duplicada");
  expect(request.postDataJSON()).toMatchObject({
    map_id: "flagship-growth",
    title: `${currentTitle} cópia`
  });
});

test("DeriveView cria uma view que herda a ativa sem duplicar regras", async ({ page }) => {
  await openStyleBuilder(page);
  const actions = await openViewActions(page);
  const currentTitle = await activeViewTitle(page);
  const activeId = await activeViewSelect(page).inputValue();
  const createRequest = page.waitForRequest(request =>
    request.method() === "POST" && request.url().endsWith("/api/views"));

  await actions.locator("#derive-view").click();
  const request = await createRequest;
  await expect(activeViewSelect(page).locator("option:checked")).toHaveText(`${currentTitle} derivada`);
  await expect(page.locator("#toast")).toContainText("Vista derivada");
  expect(request.postDataJSON()).toMatchObject({
    map_id: "flagship-growth",
    title: `${currentTitle} derivada`,
    settings: { extends: activeId },
    rules: []
  });
});

test("DeleteView remove a view criada e preserva o mapa ativo", async ({ page }) => {
  await openStyleBuilder(page);
  const actions = await openViewActions(page);
  const createResponse = page.waitForResponse(response =>
    response.request().method() === "POST" && response.url().endsWith("/api/views"));
  await actions.locator("#new-view").click();
  await page.locator("#command-dialog-submit").click();
  const response = await createResponse;
  const createdTitle = (await response.json()).view?.title;
  expect(createdTitle).toBeTruthy();
  await expect(activeViewSelect(page).locator("option:checked")).toHaveText(createdTitle);

  const deleteRequest = page.waitForRequest(request =>
    request.method() === "DELETE" && /\/api\/views\/[^/]+$/.test(request.url()));
  await openViewActions(page);
  await actions.locator("#delete-view").click();
  const request = await deleteRequest;
  // Deleting the active view can choose any remaining view in the same map.
  // The contract is preservation of the map and a valid active view, not a
  // specific ordering-dependent fallback title.
  await expect(activeViewSelect(page).locator("option:checked")).not.toHaveText(createdTitle);
  await expect(activeViewSelect(page)).not.toHaveValue("");
  await expect(activeViewSelect(page)).not.toContainText(createdTitle);
  await expect(page.locator("#toast")).toContainText("Vista removida");
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-fingerprint", /.+/);
  expect(request.method()).toBe("DELETE");
});

test("prévia Markdown pode ser descartada sem persistir", async ({ page }) => {
  const writes = [];
  page.on("request", request => {
    if (request.method() !== "GET" && request.url().includes("/api/")) writes.push(`${request.method()} ${request.url()}`);
  });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Código Markdown" }).click();

  const source = page.locator("#loop-source-editor");
  await expect(source).toBeVisible();
  await expect(source).not.toHaveValue("");
  await page.locator("#preview-loop-source").click();
  await expect(page.locator("#loop-source-status")).toContainText("Prévia ativa");
  await expect(page.locator("#discard-loop-source")).toBeEnabled();
  expect(writes).toEqual([]);

  await page.locator("#discard-loop-source").click();
  await expect(page.locator("#loop-source-status")).toContainText("Prévia descartada");
  await expect(page.locator("#discard-loop-source")).toBeDisabled();
  expect(writes).toEqual([]);
});
