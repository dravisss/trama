import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const output = resolve("artifacts/ui-audit-2026-09-29/before");
const local = process.env.TRAMA_UI_QA_URL || "http://127.0.0.1:58810";
const landing = process.env.TRAMA_LANDING_URL || "http://127.0.0.1:4186";
const hosted = process.env.TRAMA_HOSTED_URL || "http://127.0.0.1:4193";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const entries = [];
const errors = [];
const hash = async path => createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex");
await mkdir(output, { recursive: true });

async function capture({ name, url, width, height, steps = [], setup = async () => {}, fullPage = true }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await context.newPage();
  const consoleEvents = [];
  page.on("console", message => { if (["error", "warning"].includes(message.type())) consoleEvents.push({ type: message.type(), text: message.text() }); });
  page.on("pageerror", error => consoleEvents.push({ type: "pageerror", text: error.message }));
  page.on("requestfailed", request => consoleEvents.push({ type: "requestfailed", url: request.url(), error: request.failure()?.errorText }));
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(error => { errors.push(`${name}: navigation: ${error.message}`); return null; });
  await setup(page);
  await page.waitForTimeout(450);
  const path = join(output, `${name}.png`);
  await page.screenshot({ path, fullPage, animations: "disabled", caret: "hide" }).catch(error => errors.push(`${name}: screenshot: ${error.message}`));
  const metrics = await page.evaluate(() => ({
    title: document.title,
    mode: document.body?.dataset.uiMode || null,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    headings: [...document.querySelectorAll("h1,h2,h3")].map(node => node.textContent.trim()).filter(Boolean).slice(0, 25),
    visibleDialogs: [...document.querySelectorAll("dialog,[role=dialog],.modal-backdrop:not([hidden])")].filter(node => node.open || node.getAttribute("aria-hidden") !== "true").map(node => node.id || node.getAttribute("aria-label") || node.className),
    buttons: [...document.querySelectorAll("button")].filter(node => node.offsetParent).map(node => (node.getAttribute("aria-label") || node.innerText || "").trim().replace(/\s+/g, " ")).filter(Boolean).slice(0, 80)
  })).catch(() => ({}));
  entries.push({ name, route: url, state: steps.length ? steps.at(-1) : "default", viewport: { width, height }, steps, status: response?.status() ?? null, title: metrics.title, mode: metrics.mode, screenshot: `${name}.png`, screenshot_sha256: await hash(path).catch(() => null), horizontalOverflow: metrics.horizontalOverflow ?? null, scrollWidth: metrics.scrollWidth ?? null, clientWidth: metrics.clientWidth ?? null, headings: metrics.headings ?? [], visibleDialogs: metrics.visibleDialogs ?? [], visibleButtons: metrics.buttons ?? [], console_errors_and_warnings: consoleEvents });
  await context.close();
}

const sizes = [{ key: "desktop", width: 1440, height: 900 }, { key: "mobile390", width: 390, height: 844 }, { key: "mobile360", width: 360, height: 844 }];
const openFlagship = async page => {
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click({ timeout: 12000 });
  await page.locator("body[data-ui-mode='map']").waitFor({ timeout: 12000 });
};
for (const size of sizes) {
  await capture({ name: `workspace-${size.key}`, url: `${local}/?qa=1`, ...size, steps: ["Abrir a rota local do fixture isolado", "Aguardar a biblioteca de projetos"] });
  await capture({ name: `map-${size.key}`, url: `${local}/?qa=1`, ...size, steps: ["Abrir a biblioteca", "Selecionar Flagship — Crescimento sob pressão"], setup: openFlagship });
  await capture({ name: `story-${size.key}`, url: `${local}/?qa=1`, ...size, steps: ["Abrir a biblioteca", "Selecionar o mapa Flagship", "Abrir Apresentar história"], setup: async page => { await openFlagship(page); await page.locator("[data-react-ui-mode='story']").click(); await page.locator("#story-timeline-shell").waitFor(); } });
  await capture({ name: `present-${size.key}`, url: `${local}/?qa=1`, ...size, steps: ["Abrir a biblioteca", "Selecionar o mapa Flagship", "Abrir player Apresentar"], setup: async page => { await openFlagship(page); await page.locator("[data-react-ui-mode='present']").click(); await page.locator("#presentation-card").waitFor(); } });
}

const editorStates = [
  ["editor-inspector", async page => { await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Inspector" }).click(); }],
  ["editor-style", async page => { await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Estilo da vista" }).click(); }],
  ["editor-table", async page => { await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Tabela de dados" }).click(); }],
  ["editor-markdown", async page => { await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Código Markdown" }).click(); }],
  ["editor-history", async page => { await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Histórico de versões" }).click(); }],
  ["menu-project", async page => { await page.locator("#project-switcher summary").click(); }],
  ["dialog-project-metadata", async page => { await page.locator("#project-switcher summary").click(); await page.locator("#edit-project-metadata").click(); await page.locator("#command-dialog[open]").waitFor(); }],
  ["dialog-new-map", async page => { await page.locator("#loop-select summary").click(); await page.locator("#sidebar-new-loop").click(); await page.locator("#command-dialog[open]").waitFor(); }],
  ["dialog-edit-map-description", async page => { await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Mapa e descrição" }).click(); await page.locator("#edit-loop-description").click(); await page.locator("#loop-description-modal:not([hidden])").waitFor(); }],
  ["menu-export", async page => { await page.locator(".edit-toolbar-more summary").click(); }]
];
for (const size of sizes) for (const [name, action] of editorStates) {
  await capture({ name: `${name}-${size.key}`, url: `${local}/?qa=1`, ...size, steps: ["Abrir biblioteca", "Selecionar Flagship", `Abrir estado ${name}`], setup: async page => { await openFlagship(page); await action(page); } });
}

for (const size of sizes) {
  await capture({ name: `landing-${size.key}`, url: landing, ...size, steps: ["Abrir landing local publicada em dist/landing"] });
  await capture({ name: `hosted-start-${size.key}`, url: hosted, ...size, steps: ["Abrir página inicial hosted local", "Não criar workspace nem abrir link secreto"] });
}

await browser.close();
await writeFile(join(output, "manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), git_head: "5ad557bf5a3a271a76bcc46654d40b2598a6b47a", server: { local_fixture: local, landing: landing, hosted: hosted }, viewport_matrix: sizes.map(({ key, width, height }) => ({ name: key, width, height })), entries, runner_errors: errors, limitations: ["Hosted editor/share/player depend on secret workspace links; none were created or used.", "Hosted landing visible state was captured without submitting new workspace forms.", "Interaction captures are representative surfaces rather than every permutation of every control.", "Import/export dialogs were captured at menu/button level; no project was imported or exported to avoid writes beyond the evidence folder.", "360px is included to check horizontal overflow."] }, null, 2)}\n`);
await writeFile(join(output, "capture-errors.json"), `${JSON.stringify(errors, null, 2)}\n`);
