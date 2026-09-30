import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const output = resolve("artifacts/ui-audit-2026-09-29/after");
const base = process.env.TRAMA_UI_QA_URL || "http://127.0.0.1:58810";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const entries = [];
const failures = [];
await mkdir(output, { recursive: true });
const sizes = [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile390", width: 390, height: 844 }, { name: "mobile360", width: 360, height: 844 }];
const exists = async path => { try { await access(path); return true; } catch { return false; } };
const sha = async path => createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex");

async function capture(state, size, action) {
  const name = `${state}-${size.name}`;
  const path = join(output, `${name}.png`);
  if (await exists(path)) return;
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, acceptDownloads: true });
  const page = await context.newPage();
  const events = [];
  page.on("console", message => { if (["error", "warning"].includes(message.type())) events.push({ type: message.type(), text: message.text() }); });
  page.on("pageerror", error => events.push({ type: "pageerror", text: error.message }));
  page.on("requestfailed", request => events.push({ type: "requestfailed", url: request.url(), error: request.failure()?.errorText }));
  try {
    await page.goto(`${base}/?qa=1`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click({ timeout: 3000 });
    await page.locator("body[data-ui-mode='map']").waitFor({ timeout: 3000 });
    await Promise.race([action(page, context), new Promise((_, reject) => setTimeout(() => reject(new Error("action timeout after 3s")), 3000))]).catch(error => failures.push({ name, action_error: error.message }));
    await page.waitForTimeout(250);
    await page.screenshot({ path, fullPage: true, animations: "disabled", caret: "hide" });
    const metrics = await Promise.race([page.evaluate(() => ({ title: document.title, mode: document.body.dataset.uiMode, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, headings: [...document.querySelectorAll("h1,h2,h3")].map(node => node.innerText.trim()).filter(Boolean), dialogs: [...document.querySelectorAll("dialog[open],[role=dialog],.modal-backdrop:not([hidden])")].map(node => node.id || node.className) })), new Promise(resolve => setTimeout(() => resolve({}), 2000))]);
    let axe = null;
    if (state === "map" || state === "story" || state === "present" || state === "workspace") {
      try { axe = await Promise.race([new AxeBuilder({ page }).analyze(), new Promise(resolve => setTimeout(() => resolve(null), 6000))]); } catch (error) { events.push({ type: "axe-error", text: error.message }); }
    }
    entries.push({ name, route: `${base}/?qa=1`, state, viewport: { width: size.width, height: size.height }, steps: ["Abrir o fixture QA isolado", "Selecionar Flagship — Crescimento sob pressão", `Abrir estado ${state}`], status: 200, title: metrics.title || null, mode: metrics.mode || null, horizontalOverflow: metrics.scrollWidth > metrics.clientWidth, scrollWidth: metrics.scrollWidth ?? null, clientWidth: metrics.clientWidth ?? null, headings: metrics.headings || [], visibleDialogs: metrics.dialogs || [], screenshot: `${name}.png`, screenshot_sha256: await sha(path), axe: axe ? { violations: axe.violations.map(item => ({ id: item.id, impact: item.impact, description: item.description, nodes: item.nodes.length })), incomplete: axe.incomplete.length } : "not-run", console_errors_and_warnings: events });
  } catch (error) {
    failures.push({ name, error: error.message });
    if (await exists(path)) entries.push({ name, route: `${base}/?qa=1`, state, viewport: { width: size.width, height: size.height }, screenshot: `${name}.png`, screenshot_sha256: await sha(path), capture_error: error.message });
  } finally { await context.close(); }
}

const states = [
  ["map", async () => {}],
  ["workspace", async page => { await page.locator("[data-react-ui-mode='workspace']").click(); await page.locator("#workspace-home").waitFor(); }],
  ["panel-details", async page => page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Detalhes" }).click({ timeout: 2500 })],
  ["panel-style", async page => page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Estilo da vista" }).click({ timeout: 2500 })],
  ["panel-table", async page => page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Tabela de dados" }).click({ timeout: 2500 })],
  ["panel-markdown", async page => page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Código Markdown" }).click({ timeout: 2500 })],
  ["panel-history", async page => page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Histórico de versões" }).click({ timeout: 2500 })],
  ["menu-project", async page => page.locator("#project-switcher summary").click({ timeout: 2500 })],
  ["dialog-project", async page => { await page.locator("#project-switcher summary").click({ timeout: 2500 }); await page.locator("#edit-project-metadata").click({ timeout: 2500 }); await page.locator("#command-dialog[open]").waitFor({ timeout: 2500 }); }],
  ["dialog-new-map", async page => { await page.locator("#loop-select summary").click({ timeout: 2500 }); await page.locator("#sidebar-new-loop").click({ timeout: 2500 }); await page.locator("#command-dialog[open]").waitFor({ timeout: 2500 }); }],
  ["dialog-map-description", async page => { await page.getByRole("navigation", { name: "Painéis do editor" }).getByRole("button", { name: "Mapa e descrição" }).click({ timeout: 2500 }); await page.locator("#edit-loop-description").click({ timeout: 2500 }); await page.locator("#loop-description-modal:not([hidden])").waitFor({ timeout: 2500 }); }],
  ["menu-export", async page => page.locator(".edit-toolbar-more summary").click({ timeout: 2500 })],
  ["story", async page => { await page.locator("[data-react-ui-mode='story']").click({ timeout: 2500 }); await page.locator("#story-timeline-shell").waitFor({ timeout: 2500 }); }],
  ["present", async page => { await page.locator("[data-react-ui-mode='present']").click({ timeout: 2500 }); await page.locator("#presentation-card").waitFor({ timeout: 2500 }); }]
];
for (const size of sizes) for (const [state, action] of states) await capture(state, size, action);

// Save the standalone HTML generated through its real menu flow into this evidence folder.
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(`${base}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator(".edit-toolbar-more summary").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export-standalone").click();
  const download = await downloadPromise;
  await download.saveAs(join(output, download.suggestedFilename() || "trama-fixture-standalone.html"));
  entries.push({ name: "export-standalone", route: `${base}/?qa=1`, state: "Standalone HTML exportado pelo menu", viewport: { width: 1440, height: 900 }, steps: ["Selecionar fixture Flagship", "Abrir menu Mais ações", "Exportar standalone HTML", "Salvar arquivo somente na pasta de evidências"], status: 200, file: download.suggestedFilename() });
  await context.close();
} catch (error) { failures.push({ name: "export-standalone", error: error.message }); }

await browser.close();
await writeFile(join(output, "local-remainder-manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), server: base, git_head: "recorded by finalize-after.mjs", viewport_matrix: sizes, entries, failures, limitations: ["Screenshots are captured from the isolated QA fixture.", "Accessibility results are axe-core scans; they do not replace manual keyboard/screen-reader checks."] }, null, 2)}\n`);
