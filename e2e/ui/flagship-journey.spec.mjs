import { test, expect, qaBaseURL } from "../support/qa-test.mjs";
import { pathToFileURL } from "node:url";
import { activateCanvasNode } from "../support/canvas-interaction.mjs";

async function openFlagship(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-react-ui-mode='workspace']")).toBeVisible();
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-fingerprint", /.+/);
}

async function selectFlagshipView(page, title) {
  const select = page.locator("#active-view-select");
  await expect(select).toBeVisible();
  await select.selectOption({ label: title });
  await expect(select.locator("option:checked")).toHaveText(title);
}

async function selectDemandOnCanvas(page, { inspectorVisible = true } = {}) {
  await activateCanvasNode(page, "demand");
  if (inspectorVisible) await expect(page.locator("#dock-element-label")).toBeVisible();
}

async function reorderOpeningBeats(page) {
  const source = page.locator(".story-timeline-card[data-beat-id='opening-context']");
  const target = page.locator(".story-timeline-card[data-beat-id='opening-question']");
  const handle = source.locator(".story-timeline-card-handle");
  await expect(handle).toBeVisible();
  const targetBox = await target.boundingBox();
  if (!targetBox) throw new Error("Could not resolve the flagship opening beat drop target.");
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await handle.dispatchEvent("dragstart", { dataTransfer });
  await target.dispatchEvent("dragover", { dataTransfer });
  await target.dispatchEvent("drop", { dataTransfer, clientX: targetBox.x + targetBox.width * 0.8 });
  await handle.dispatchEvent("dragend", { dataTransfer });
  await expect(page.locator(".story-timeline-scene[data-scene-id='opening'] .story-timeline-card").first()).toHaveAttribute("data-beat-id", "opening-question");
}

test("flagship desktop cobre a jornada local-first completa até o standalone offline", async ({ page }) => {
  await openFlagship(page, { width: 1440, height: 900 });

  // A fixture exposes both persisted alternatives: this is a real view switch,
  // not only a temporary Style Builder preview.
  await selectFlagshipView(page, "Style Pack Boardroom");

  await selectDemandOnCanvas(page);
  const label = page.locator("#dock-element-label");
  await label.fill("Demanda de aceitação");
  await page.locator("#dock-inspector-form").evaluate(form => form.requestSubmit());
  await expect(page.locator("#toast")).toContainText("Alterações aplicadas");
  await expect(page.locator("#save-status")).toHaveText(/Salvo/);

  await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Estilo da vista" }).click();
  const preset = page.locator("#view-style-preset");
  await expect(preset).toBeVisible();
  await preset.selectOption("systems-atlas");
  await expect(page.locator("#loop-style-status")).toContainText("Prévia aplicada");
  await expect(page.locator("#loop-style-editor")).toHaveValue(/style-pack:\s*systems-atlas/);
  await page.locator("#save-loop-style").click();
  await expect(page.locator("#loop-style-status")).toContainText("Estilo salvo");

  // Reload proves that both the node change and style package write reached
  // the isolated SQLite project, rather than surviving only in React state.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-react-ui-mode='workspace']")).toBeVisible();
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");
  await selectDemandOnCanvas(page);
  await expect(page.locator("#dock-element-label")).toHaveValue("Demanda de aceitação");
  await expect(page.locator("#active-view-select option:checked")).toHaveText("Systems Atlas");
  await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Estilo da vista" }).click();
  await expect(page.locator("#view-style-preset")).toHaveValue("systems-atlas");

  await page.locator("[data-react-ui-mode='present']").click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "present");
  await expect(page.locator("#presentation-card")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");

  await page.locator("[data-react-ui-mode='present']").click();
  await expect(page.locator("#presentation-progress")).toHaveAttribute("aria-valuenow", "1");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#presentation-progress")).toHaveAttribute("aria-valuenow", "2");
  await expect(page.locator("#presentation-explore")).toHaveCount(0);
  await expect(page.locator("#presentation-resume")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");

  await page.locator("[data-react-ui-mode='story']").click();
  await expect(page.locator("#story-timeline-shell")).toBeVisible();

  const storyTitle = page.locator("#story-inspector-title");
  await expect(storyTitle).toBeVisible();
  await storyTitle.fill("A pergunta revisada");
  await storyTitle.press("Enter");
  await expect(storyTitle).toHaveValue("A pergunta revisada");
  await reorderOpeningBeats(page);
  await page.locator("#save-presentation").click();
  await expect(page.locator("#toast")).toContainText("História salva no projeto SQLite");

  // The real command-bar export is opened with networking disabled. This is
  // deliberately not a direct call to the exporter: it proves the user path.
  await page.locator("[data-react-ui-mode='map']").click();
  const moreActions = page.locator(".edit-toolbar-more");
  await moreActions.locator(":scope > summary").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export-standalone").click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  // `download.path()` is an extensionless Playwright temp file. Copy it to a
  // real HTML path before navigating by file://, otherwise Chromium renders
  // the downloaded document as plain text instead of executing the runtime.
  const downloadedHtmlPath = `${downloadedPath}-${download.suggestedFilename()}`;
  await download.saveAs(downloadedHtmlPath);

  const offlinePage = await page.context().newPage();
  try {
    await offlinePage.context().setOffline(true);
    await offlinePage.goto(pathToFileURL(downloadedHtmlPath).href, { waitUntil: "load" });
    await expect(offlinePage.locator(".standalone-shell")).toBeVisible();
    await expect(offlinePage.locator("meta[name='trama-design-system-hash']")).toHaveAttribute("content", /^[a-f0-9]{64}$/);
    await expect.poll(() => offlinePage.locator("#standalone-graph canvas").count()).toBeGreaterThan(0);
  } finally {
    await offlinePage.context().setOffline(false);
    await offlinePage.close();
  }
});

test("flagship mobile preserva os controles críticos de edição, Apresentar e Story Studio", async ({ page }) => {
  await openFlagship(page, { width: 390, height: 844 });
  await selectDemandOnCanvas(page, { inspectorVisible: false });
  await page.locator("#sidebar-toggle").click();
  await page.getByLabel("Painel do editor", {exact:true}).selectOption("inspect");
  const label = page.locator("#dock-element-label");
  await expect(label).toBeVisible();
  await label.fill("Demanda móvel");
  await page.locator("#dock-inspector-form").evaluate(form => form.requestSubmit());
  await expect(page.locator("#toast")).toContainText("Alterações aplicadas");

  await page.locator("[data-react-ui-mode='present']").click();
  await expect(page.locator("#presentation-card")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.locator("[data-react-ui-mode='story']").click();
  const inspectorToggle = page.locator("button[data-story-surface=movement]");
  await inspectorToggle.click();
  await expect(page.locator("body")).toHaveClass(/story-inspector-mobile-open/);

  const storyTitle = page.locator("#story-inspector-title");
  await storyTitle.fill("Movimento móvel revisado");
  await storyTitle.press("Enter");
  await expect(storyTitle).toHaveValue("Movimento móvel revisado");
  await page.locator("#story-mobile-inspector-close").click();
  await expect(inspectorToggle).toBeFocused();
});
