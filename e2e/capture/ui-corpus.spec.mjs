import { test, expect, qaBaseURL } from "../support/qa-test.mjs";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdtemp } from "node:fs/promises";
import { createStandaloneHtml } from "../../src/export/standalone.js";
import { buildUnifiedUiFixture } from "../../qa/fixtures/unified-ui-fixture.js";
import { loadHostedConfig } from "../../server/hosted/config.js";
import { createHostedApp } from "../../server/hosted/app.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(ROOT, "artifacts/ui-capture");
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];
const manifest = [];
let hostedRuntime;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
});

test.afterAll(async () => {
  if (hostedRuntime) await hostedRuntime.stop();
  await writeFile(resolve(OUT, "manifest.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    app: "Trama",
    source: "Local Playwright QA server with isolated deterministic fixture",
    screenshotCount: manifest.length,
    captures: manifest
  }, null, 2)}\n`);
  await writeFile(resolve(OUT, "README.md"), readme(manifest));
});

test.beforeAll(async () => { hostedRuntime = await startHostedRuntime(); });

for (const viewport of VIEWPORTS) {
  test(`base modes ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWorkspace(page);
    await capture(page, `workspace/home/${viewport.name}`, `Workspace inicial em ${viewport.name}.`);
    await openMap(page);
    await capture(page, `editor/map/${viewport.name}`, `Editor do mapa, canvas e controles-base em ${viewport.name}.`);
    if (viewport.name !== "mobile") {
      for (const [key, label] of [["map", "Mapa e descrição"], ["inspect", "Detalhes"], ["code", "Código Markdown"], ["style", "Estilo da vista"], ["table", "Tabela de dados"], ["history", "Histórico de versões"]]) {
        if (viewport.width <= 1100) await page.getByLabel("Painel do editor", { exact: true }).selectOption(key);
        else await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: label }).click();
        await page.waitForTimeout(180);
        await capture(page, `editor/panels/${key}/${viewport.name}`, `Painel ${label} do Editor em ${viewport.name}.`);
      }
    }
    await page.locator("[data-react-ui-mode='story']").click();
    await expect(page.locator("#story-timeline-shell")).toBeVisible();
    await capture(page, `story/studio/${viewport.name}`, `Story Studio em ${viewport.name}.`);
    if (viewport.name === "mobile") {
      await page.locator('button[data-story-surface="movement"]').click();
      await capture(page, "story/mobile-inspector/mobile", "Inspector móvel aberto como folha.");
      await page.locator("#story-mobile-inspector-close").click();
    }
    await page.locator("[data-react-ui-mode='present']").click();
    await expect(page.locator("#presentation-card")).toBeVisible();
    await capture(page, `present/opening/${viewport.name}`, `Apresentação no primeiro movimento em ${viewport.name}.`);
  });
}

test("workspace and editor menus and dialogs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openWorkspace(page);
  await page.locator("#workspace-new-project").click();
  await capture(page, "workspace/dialogs/new-project", "Diálogo de criação de projeto.");
  await page.keyboard.press("Escape");
  await openMap(page);

  await page.locator("#project-switcher summary").click();
  await capture(page, "editor/menus/project-actions", "Menu de projeto, backup, importação e exportação.");
  await page.locator("#edit-project-metadata").click();
  await capture(page, "editor/dialogs/edit-project", "Formulário de metadados do projeto.");
  await page.keyboard.press("Escape");

  await page.locator("#loop-select summary").click();
  await capture(page, "editor/menus/map-selector", "Seletor e ações de mapas.");
  await page.locator("#sidebar-new-loop").click();
  await capture(page, "editor/dialogs/new-map", "Formulário de criação de mapa.");
  await page.keyboard.press("Escape");

  await page.locator("#rename-loop").click();
  await capture(page, "editor/dialogs/rename-map", "Formulário de renomeação de mapa.");
  await page.keyboard.press("Escape");
  await page.locator("#edit-loop-description").click();
  await capture(page, "editor/dialogs/map-description", "Editor de descrição Markdown do mapa.");
  await page.keyboard.press("Escape");

  await page.locator("#active-view-select").selectOption({ label: "Style Pack Boardroom" });
  await expect(page.locator("#active-view-select")).toHaveValue(/.+/);
  await capture(page, "editor/views/alternate", "Vista persistida alternativa do mapa.");
  await page.locator(".editor-title-view-actions > summary").click();
  await page.locator("#new-view").click();
  await capture(page, "editor/dialogs/new-view", "Formulário de nova vista.");
  await page.keyboard.press("Escape");
  await expect(page.locator(".editor-title-view-actions > summary")).toBeFocused();
  await page.locator(".editor-title-view-actions > summary").click();
  await capture(page, "editor/menus/view-actions", "Ações de gestão de vista e estados habilitado/desabilitado.");
  await page.keyboard.press("Escape");

  await page.locator("#save-status").click();
  await capture(page, "editor/popovers/save-status", "Popover do estado de salvamento.");
  await page.keyboard.press("Escape");
  await page.locator("#focus-toggle").click();
  await capture(page, "editor/focus-mode", "Editor em modo de foco.");
  await page.locator("#focus-exit").click();
  await page.locator("#edit-toggle").click();
  await capture(page, "editor/edit-mode", "Controles do modo de edição.");
  await page.locator(".edit-toolbar-more > summary").click();
  await capture(page, "editor/menus/more-actions", "Mais ações, arquivo, roteamento e opções de seleção.");
  await page.locator(".edit-route-options > summary").click();
  await capture(page, "editor/menus/route-quality", "Opções avançadas de qualidade de roteamento.");
});

test("project backup export and import surface", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openMap(page);
  await page.locator("#project-switcher summary").click();
  const backup = page.waitForEvent("download");
  await page.locator("#export-project-backup").click();
  const download = await backup;
  await download.cancel();
  await page.locator("#project-switcher summary").click();
  await capture(page, "editor/menus/project-import-backup", "Ação de importar backup completo para novo projeto.");
});

test("map duplication and deletion confirmation states", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openMap(page);
  await page.locator("#loop-select summary").click();
  await page.locator("#sidebar-duplicate-loop").click();
  await expect(page.locator("#active-loop-label")).toContainText("cópia");
  const reset = await request.post(`${qaBaseURL()}/api/qa/reset-fixture`);
  expect(reset.ok()).toBe(true);
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await openMap(page);
  await page.locator("#loop-select summary").click();
  await page.locator("#sidebar-delete-loop").click();
  await expect(page.locator("#command-dialog")).toBeVisible();
  await capture(page, "editor/dialogs/delete-map-confirmation", "Confirmação de remoção de mapa sem confirmar a ação.");
});

test("editor data panels and loop selection", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openMap(page);
  await page.locator("[data-dock-panel='table']").click();
  for (const tab of ["nodes", "edges", "loops"]) {
    const button = page.locator(`[data-table-tab='${tab}']`);
    if (await button.count()) {
      await button.click();
      await capture(page, `editor/data-table/${tab}`, `Tabela de dados, seção ${tab}.`);
    }
  }

  await page.locator("[data-dock-panel='map']").click();
  const loopChoice = page.locator("#loop-list [data-loop-id]").first();
  if (await loopChoice.count()) {
    await loopChoice.click();
    await expect(loopChoice).toHaveAttribute("aria-pressed", "true");
    await capture(page, "editor/loops/selected", "Loop selecionado e destacado no canvas.");
  }
});

test("Markdown and style builder states", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openMap(page);
  await page.locator("[data-dock-panel='code']").click();
  await page.locator("#loop-source-editor").fill("invalid markdown preview");
  await page.locator("#preview-loop-source").click();
  await capture(page, "editor/markdown/invalid-preview", "Prévia Markdown inválida e estado de validação.");
  await page.locator("#discard-loop-source").click();
  await capture(page, "editor/markdown/source", "Fonte Markdown do mapa no editor.");

  await page.locator("[data-dock-panel='style']").click();
  await page.locator("#view-style-preset").selectOption("systems-atlas");
  await capture(page, "editor/style/preview", "Prévia de estilo sem persistir.");
  await page.locator("#loop-style-editor").fill("style-pack: invalid\n");
  await expect(page.locator("#apply-loop-style")).toBeDisabled();
  await capture(page, "editor/style/invalid-source", "Erro/validação na fonte de estilo.");
});

test("canvas selection popovers and inspector states", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.waitForFunction(() => Boolean(window.tramaDemo?.engine?.cy?.getElementById("demand")?.length));
  await page.evaluate(() => window.tramaDemo.engine.cy.getElementById("demand").select());
  await expect(page.locator("#dock-inspector-form")).toBeVisible();
  await page.locator("[data-dock-panel='inspect']").click();
  await capture(page, "editor/selection/node-inspector", "Inspector com variável selecionada.");
  await page.locator("#cld-root").click({ position: { x: 12, y: 12 } });
  await page.evaluate(() => { const cy = window.tramaDemo.engine.cy; cy.elements().unselect(); const edge = cy.getElementById("demand-planning"); if (!edge.length) throw new Error("QA relation missing"); edge.select(); });
  await expect(page.locator("#dock-edge-fields")).toBeVisible();
  await expect(page.locator(".editor-inspector-empty")).toBeHidden();
  await capture(page, "editor/selection/edge-inspector", "Inspector com relação selecionada.");
  await page.keyboard.press("Escape");
});

test("Story Studio authoring, menus, dialogs, markdown and movement composer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openMap(page);
  await page.locator("[data-react-ui-mode='story']").click();
  await page.locator("#story-v2-more-actions").click();
  await capture(page, "story/menus/more-actions", "Menu secundário da apresentação.");
  await page.locator("#duplicate-presentation").click();
  await capture(page, "story/dialogs/duplicate-presentation", "Confirmação de duplicação da apresentação.");
  await page.keyboard.press("Escape");
  await page.locator("#story-v2-more-actions").click();
  await page.locator("#delete-presentation").click();
  await capture(page, "story/dialogs/delete-presentation", "Confirmação de remoção da apresentação.");
  await page.keyboard.press("Escape");
  await page.locator("#story-v2-more-actions").click();
  await page.locator("#validate-presentation").click();
  await capture(page, "story/validation", "Resultado da validação editorial da apresentação.");
  await page.locator("#story-v2-more-actions").click();
  await page.locator("#story-sidebar-markdown").click();
  await capture(page, "story/markdown/source", "Fonte Markdown da apresentação.");
  await page.locator("#toggle-presentation-diff").click();
  await capture(page, "story/markdown/diff", "Revisão/diff da fonte da apresentação.");
});

test("Story Studio selected movement and camera controls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openMap(page);
  await page.locator("[data-react-ui-mode='story']").click();
  await page.locator("#story-sidebar-inspector").click();
  await page.locator(".story-timeline-card-main").first().click();
  await capture(page, "story/inspector/selected-movement", "Inspector de movimento selecionado.");
  await page.locator("#story-inspector-camera-info").click();
  await capture(page, "story/inspector/camera-help", "Ajuda dos modos de câmera.");
  if (await page.locator("#story-inspector-suggest-next").isVisible()) {
    await capture(page, "story/inspector/suggest-next-action", "Ação Sugerir próximo habilitada para o movimento selecionado.");
  }
});

test("Story Studio movement composers", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openMap(page);
  await page.locator("[data-react-ui-mode='story']").click();
  await page.locator("#story-timeline-add-manual-scene").click();
  await capture(page, "story/dialogs/manual-scene-composer", "Compositor de cena/movimento manual.");
  await page.keyboard.press("Escape");
  await page.locator("#story-timeline-add-scene").click();
  await capture(page, "story/dialogs/loop-scene-composer", "Compositor de cena derivada de loop.");
  await page.keyboard.press("Escape");
});

test("presentation player states", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openMap(page);
  await page.locator("[data-react-ui-mode='present']").click();
  await capture(page, "present/first-beat", "Primeiro movimento da apresentação.");
  const total = Number(await page.locator("#presentation-progress").getAttribute("aria-valuemax"));
  for (let index = 2; index <= Math.min(total, 5); index += 1) {
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#presentation-progress")).toHaveAttribute("aria-valuenow", String(index));
    await capture(page, `present/beat-${String(index).padStart(2, "0")}`, `Movimento ${index} da apresentação.`);
  }
  await page.keyboard.press("p");
  await expect(page.locator("#presentation-presenter-toggle")).toHaveAttribute("aria-pressed", "true");
  await capture(page, "present/presenter-notes", "Estado de ensaio/notas do apresentador via atalho de teclado.");
  await page.keyboard.press("p");
  await page.locator("#presentation-close").click();
});

test("standalone export profiles rendered offline", async ({ page }) => {
  const fixture = buildUnifiedUiFixture();
  const mapEntries = fixture.maps.map(map => ({ ...map, view: fixture.views.find(view => view.map_id === map.id) }));
  const runtime = await readFile(resolve(ROOT, "dist/standalone-runtime.iife.js"), "utf8");
  const styles = await Promise.all([readFile(resolve(ROOT, "dist/standalone-fonts.css"), "utf8"), readFile(resolve(ROOT, "standalone.css"), "utf8")]).then(parts => parts.join("\n"));
  const dir = await mkdtemp(resolve(tmpdir(), "trama-capture-"));
  try {
    for (const [name, embed] of [["clean", { sidebar: false, presentationOnly: true }], ["guided", { sidebar: true, presentationOnly: true }], ["explore", { sidebar: true, presentationOnly: false }]]) {
      const assets = fixture.assets.map(asset => ({ ...asset, data_url: `data:${asset.mime_type};base64,${asset.content_base64}` }));
      const html = createStandaloneHtml({ project: fixture.project, model: mapEntries.at(-1).model, loops: mapEntries, activeLoopId: mapEntries.at(-1).id, presentation: fixture.presentations[0].presentation, presentations: fixture.presentations, assets, runtime, styles, embed });
      const path = resolve(dir, `${name}.html`);
      await writeFile(path, html);
      const tab = await page.context().newPage();
      try {
        await tab.setViewportSize({ width: 1440, height: 900 });
        await tab.context().setOffline(true);
        await tab.goto(pathToFileURL(path).href, { waitUntil: "load" });
        await expect(tab.locator(".standalone-shell")).toBeVisible();
        await capture(tab, `standalone/${name}/opening`, `Exportação standalone ${name} renderizada offline.`);
        if (name === "explore") {
          await tab.locator('[data-action="present"]').click();
          await expect(tab.locator(".standalone-story")).toBeVisible();
          await capture(tab, "standalone/explore/player", "Player de apresentação dentro do export explorável.");
        }
      } finally { await tab.context().setOffline(false); await tab.close(); }
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("hosted landing, workspace notice and sharing dialog", async ({ page, request }) => {
  const created = await request.post(`${hostedRuntime.base}/api/v1/workspaces`, { data: { title: "Captura QA Trama" } });
  expect(created.ok()).toBe(true);
  const { edit_url: editUrl, share_url: shareUrl, present_url: presentUrl, mcp_url: mcpUrl } = (await created.json()).workspace;
  const tokenPath = new URL(editUrl).pathname;

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(hostedRuntime.base, { waitUntil: "domcontentloaded" });
  await capture(page, "hosted/landing/desktop", "Landing hosted e opções de criação.");

  await page.goto(`${hostedRuntime.base}${tokenPath}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".trama-notice")).toBeVisible();
  await capture(page, "hosted/workspace/first-visit-notice", "Aviso de primeira visita com lembrete do link privado.");
  await page.locator(".trama-notice button.trama-secondary").click();
  await page.locator(".trama-share-trigger").click();
  await expect(page.locator(".trama-share-dialog")).toBeVisible();
  await capture(page, "hosted/workspace/share-dialog", "Diálogo hosted de compartilhamento, conexão com agentes e backup.");
  const shareInputs = page.locator(".trama-share-dialog input");
  await expect(shareInputs.nth(2)).toHaveAttribute("type", "password");
  await expect(shareInputs.nth(3)).toHaveAttribute("type", "password");
  await expect(shareInputs.nth(0)).toHaveValue(shareUrl);
  await expect(shareInputs.nth(1)).toHaveValue(presentUrl);
  await expect(shareInputs.nth(3)).toHaveValue(mcpUrl);
  await page.locator(".trama-share-dialog .trama-close").click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(hostedRuntime.base, { waitUntil: "domcontentloaded" });
  await capture(page, "hosted/landing/mobile", "Landing hosted em viewport mobile.");
  await page.goto(`${hostedRuntime.base}${tokenPath}`, { waitUntil: "domcontentloaded" });
  await page.locator(".trama-notice button.trama-secondary").click();
  await page.locator(".trama-share-trigger").click();
  await capture(page, "hosted/workspace/share-dialog-mobile", "Diálogo de compartilhamento em viewport mobile.");

  await page.goto(`${hostedRuntime.base}${new URL(shareUrl).pathname}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#standalone-graph")).toBeVisible();
  await capture(page, "hosted/share/public-map", "Página pública de leitura do mapa compartilhado.");
});

async function openWorkspace(page) {
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#workspace-map-list")).toContainText("Flagship — Crescimento sob pressão");
}

async function openMap(page) {
  await openWorkspace(page);
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-fingerprint", /.+/);
}

async function capture(page, name, description) {
  const path = `${name}.png`;
  const absolute = resolve(OUT, path);
  await mkdir(dirname(absolute), { recursive: true });
  if (/^editor\/(map|panels)\//.test(name) || /^story\/studio\//.test(name)) {
    const mode = await page.locator("body").getAttribute("data-ui-mode");
    await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-camera-stable", new RegExp(`^${mode}:stable:`));
  }
  if (name.startsWith("standalone/") || name.startsWith("present/")) {
    let last, stable = 0;
    await expect.poll(async () => {
      const next = await page.locator(".cld-canvas").evaluate(canvas => { const cy = canvas._cyreg?.cy; return cy && !cy.animated() ? JSON.stringify({ zoom: cy.zoom(), pan: cy.pan() }) : null; });
      stable = next && next === last ? stable + 1 : 0; last = next; return stable;
    }, { intervals: [100] }).toBeGreaterThanOrEqual(4);
  }
  if (name.endsWith("invalid-source")) await page.locator("#loop-style-status").scrollIntoViewIfNeeded();
  if (name.includes("dialogs/") && !name.includes("map-description")) await expect(page.locator("dialog[open]").first()).toBeVisible();
  if (name.endsWith("map-description")) await expect(page.locator("#loop-description-modal")).toBeVisible();
  if (name.endsWith("view-actions")) await expect(page.locator(".editor-title-view-actions")).toHaveAttribute("open", "");
  if (name.endsWith("story/validation")) await expect(page.locator("#story-lint-status")).not.toHaveText("Nenhuma validação executada.");
  if (name.endsWith("presenter-notes")) await expect(page.locator("#presentation-presenter-panel")).toBeVisible();
  if (name.endsWith("edge-inspector")) await expect(page.locator("#dock-edge-fields")).toBeVisible();
  if (name.endsWith("node-inspector")) await expect(page.locator("#dock-node-fields")).toBeVisible();
  await page.screenshot({ path: absolute, fullPage: true, animations: "disabled", caret: "hide" });
  const url = new URL(page.url());
  const safePath = url.pathname.replace(/^\/(w|p)\/[^/]+/, "/$1/<redacted>");
  const safeUrl = `${url.protocol}//${url.host}${safePath}`;
  manifest.push({ path, description, viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })), url: safeUrl });
}

function readme(captures) {
  const byTopLevel = Object.groupBy(captures, item => item.path.split("/")[0]);
  const sections = Object.entries(byTopLevel).map(([key, items]) => `## ${key}\n\n${items.map(item => `- [${item.path}](./${item.path}) — ${item.description}`).join("\n")}`).join("\n\n");
  return `# Trama UI capture corpus\n\nCapturas Playwright contra ambientes efêmeros com fixture de QA. Os screenshots e o manifesto são descartáveis e não entram no Git. Total: ${captures.length} imagens. URLs de workspace são redigidas no manifesto.\n\n${sections}\n\n## Limites de cobertura\n\nCobre o workspace local, menus, painéis, diálogos, estados de authoring, player, perfis standalone e superfícies visuais hosted. Upload/importação não tem uma imagem por conteúdo arbitrário; os screenshots registram superfícies e estados representativos. Ações destrutivas param na confirmação. Erros de rede/autenticação e falhas de arquivo dependem de simulação adicional para cobrir cada variante.\n`;
}

async function startHostedRuntime() {
  const dataRoot = await mkdtemp(resolve(tmpdir(), "trama-hosted-capture-"));
  const config = loadHostedConfig({ PORT: "0", HOST: "127.0.0.1", TRAMA_DATA_ROOT: dataRoot, TRAMA_PUBLIC_URL: "http://127.0.0.1" }, { root: ROOT });
  const app = createHostedApp(config);
  await new Promise((resolve, reject) => {
    app.server.once("error", reject);
    app.server.listen(0, "127.0.0.1", resolve);
  });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  config.publicUrl = base;
  return { base, async stop() { await app.close(); await rm(dataRoot, { recursive: true, force: true }); } };
}
