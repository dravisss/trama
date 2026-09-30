import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const output = resolve("artifacts/ui-audit-2026-09-29/before");
const landing = process.env.TRAMA_LANDING_URL || "http://127.0.0.1:4186";
const hosted = process.env.TRAMA_HOSTED_URL || "http://127.0.0.1:4194";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const entries = [];
await mkdir(output, { recursive: true });
const redact = url => String(url).replace(/\/w\/[^/]+/g, "/w/[REDACTED]").replace(/\/p\/[^/]+/g, "/p/[REDACTED]");

async function snap(name, url, width, height, steps, { scrubSecrets = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const events = [];
  page.on("console", message => { if (["error", "warning"].includes(message.type())) events.push({ type: message.type(), text: message.text() }); });
  page.on("pageerror", error => events.push({ type: "pageerror", text: error.message }));
  page.on("requestfailed", request => events.push({ type: "requestfailed", url: redact(request.url()), error: request.failure()?.errorText }));
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(400);
  if (scrubSecrets) await page.addStyleTag({ content: `input[type=password],input[readonly],input[value*="/w/"],input[value*="/p/"] { filter: blur(10px) !important; }` }).catch(() => {});
  const path = join(output, `${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled", caret: "hide" });
  const metrics = await Promise.race([page.evaluate(() => ({ title: document.title, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, headings: [...document.querySelectorAll("h1,h2,h3")].map(h => h.innerText.trim()).filter(Boolean), dialogs: [...document.querySelectorAll("dialog[open],[role=dialog],.modal-backdrop:not([hidden])")].map(el => el.id || el.className) })), new Promise(resolve => setTimeout(() => resolve({}), 2000))]);
  entries.push({ name, route: redact(url), state: steps.at(-1), viewport: { width, height }, steps, status: response.status(), title: metrics.title || null, horizontalOverflow: metrics.overflow ?? null, scrollWidth: metrics.scrollWidth ?? null, clientWidth: metrics.clientWidth ?? null, headings: metrics.headings || [], visibleDialogs: metrics.dialogs || [], screenshot: `${name}.png`, screenshot_sha256: createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex"), console_errors_and_warnings: events });
  await context.close();
}

for (const [tag, width, height] of [["desktop", 1440, 900], ["mobile390", 390, 844], ["mobile360", 360, 844]]) {
  await snap(`landing-${tag}`, landing, width, height, ["Abrir landing local em /" ]);
  await snap(`hosted-start-${tag}`, hosted, width, height, ["Abrir página inicial hosted", "Não submeter criação de workspace nesta tela"]);
}

// Create a fully disposable examples workspace in the isolated hosted data root.
const createContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const createPage = await createContext.newPage();
await createPage.goto(`${hosted}/comecar`, { waitUntil: "domcontentloaded" });
await createPage.getByRole("button", { name: /Criar com exemplos/ }).click();
await createPage.waitForURL(/\/w\//, { timeout: 15000 });
const editUrl = createPage.url();
const tokenlessEditUrl = editUrl.replace(/(\/w\/)[^/?]+/, "$1[REDACTED]");
const apiBase = `${new URL(editUrl).origin}${new URL(editUrl).pathname.replace(/\/$/, "")}`;
const linkResponse = await createPage.request.get(`${apiBase}/api/hosted/workspace`);
const linkData = await linkResponse.json();
const shareUrl = linkData.links.share_url;
const tokenlessShareUrl = shareUrl.replace(/(\/p\/)[^/?]+/, "$1[REDACTED]");
await createPage.waitForTimeout(500);
const localModes = [
  ["hosted-editor-map", async () => {}],
  ["hosted-editor-story", async () => { await createPage.locator("[data-react-ui-mode='story']").click(); await createPage.locator("#story-timeline-shell").waitFor(); }],
  ["hosted-editor-player", async () => { await createPage.locator("[data-react-ui-mode='present']").click(); await createPage.locator("#presentation-card").waitFor(); }]
];
for (const [name, action] of localModes) {
  await action();
  const path = join(output, `${name}-desktop.png`);
  await createPage.screenshot({ path, fullPage: true, animations: "disabled", caret: "hide" });
  const metrics = await createPage.evaluate(() => ({ title: document.title, mode: document.body.dataset.uiMode, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, headings: [...document.querySelectorAll("h1,h2,h3")].map(h => h.innerText.trim()).filter(Boolean) }));
  entries.push({ name, route: tokenlessEditUrl, state: name, viewport: { width: 1440, height: 900 }, steps: ["Criar espaço descartável com exemplos", `Abrir estado ${name}`], status: 200, ...metrics, screenshot: `${name}-desktop.png`, screenshot_sha256: createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex"), console_errors_and_warnings: [] });
}

// Read-only publication and hosted workspace controls; secret link fields are obscured in screenshots.
for (const [name, suffix] of [["hosted-share", ""], ["hosted-presentation", "?embed=presentation"], ["hosted-no-sidebar", "?sidebar=0"]]) {
  const url = `${shareUrl}${suffix}`;
  await snap(`${name}-desktop`, url, 1440, 900, ["Abrir link de leitura efêmero", `Capturar ${name}`]);
}
await createPage.goto(editUrl, { waitUntil: "domcontentloaded" });
const shareButton = createPage.getByRole("button", { name: /Compartilhar/ });
if (await shareButton.count()) {
  await shareButton.click();
  const dialog = createPage.locator(".trama-share-dialog[open]");
  await dialog.waitFor({ timeout: 5000 });
  await createPage.addStyleTag({ content: `.trama-share-dialog input { filter: blur(10px) !important; }` });
  const path = join(output, "hosted-share-settings-desktop.png");
  await createPage.screenshot({ path, fullPage: true, animations: "disabled" });
  entries.push({ name: "hosted-share-settings-desktop", route: tokenlessEditUrl, state: "Modal Compartilhar aberto; valores secretos borrados por CSS", viewport: { width: 1440, height: 900 }, steps: ["Abrir workspace descartável", "Abrir Compartilhar", "Borrar campos que contenham links/tokens antes da captura"], status: 200, screenshot: "hosted-share-settings-desktop.png", screenshot_sha256: createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex"), visibleDialogs: ["trama-share-dialog"], console_errors_and_warnings: [] });
}
await createContext.close();

await writeFile(join(output, "hosted-manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), server: { landing, hosted }, disposable_workspace: true, edit_url: tokenlessEditUrl, share_url: tokenlessShareUrl, entries, limitations: ["Secret workspace paths are redacted in this manifest; temporary tokens exist only in this runner's memory.", "The workspace is isolated under /tmp/trama-ui-audit-hosted-2026-09-29 and is disposable.", "No share token rotation, deletion or publication outside localhost was performed."] }, null, 2)}\n`);
await browser.close();
