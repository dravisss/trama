import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const out = resolve("artifacts/ui-audit-2026-09-29/after");
const base = process.env.TRAMA_HOSTED_URL || "http://127.0.0.1:4194";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const records = [];
await (await import("node:fs/promises")).mkdir(out, { recursive: true });
const redact = url => String(url).replace(/\/w\/[^/]+/g, "/w/[REDACTED]").replace(/\/p\/[^/]+/g, "/p/[REDACTED]");
const digest = async path => createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex");

const createContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await createContext.newPage();
const errors = [];
page.on("console", msg => { if (["error", "warning"].includes(msg.type())) errors.push({ type: msg.type(), text: msg.text() }); });
page.on("pageerror", error => errors.push({ type: "pageerror", text: error.message }));
page.on("response", response => { if (response.status() >= 400) errors.push({ type: "http-response", status: response.status(), url: redact(response.url()) }); });
page.on("requestfailed", request => errors.push({ type: "requestfailed", url: redact(request.url()), error: request.failure()?.errorText }));
await page.goto(`${base}/comecar`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /Criar com exemplos/ }).click({ timeout: 5000 });
await page.waitForURL(/\/w\//, { timeout: 15000 });
const editUrl = page.url();
const redactedEditRoute = redact(editUrl);
const apiBase = `${new URL(editUrl).origin}${new URL(editUrl).pathname.replace(/\/$/, "")}`;
const linksResponse = await page.request.get(`${apiBase}/api/hosted/workspace`);
const shareUrl = (await linksResponse.json()).links.share_url;
const redactedShareRoute = redact(shareUrl);

async function settle() {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(500);
}
async function capture(name, state, width, height, route, steps, { blurSecrets = false } = {}) {
  await settle();
  if (blurSecrets) await page.addStyleTag({ content: `.trama-share-dialog input { filter: blur(10px) !important; }` });
  const path = join(out, `${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled", caret: "hide" });
  const metrics = await page.evaluate(() => ({ title: document.title, mode: document.body.dataset.uiMode || null, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, dialogs: [...document.querySelectorAll("dialog[open],[role=dialog]")].map(el => el.id || el.className) }));
  let axe = null;
  try { const scan = await new AxeBuilder({ page }).analyze(); axe = scan.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })); } catch (error) { errors.push({ type: "axe-error", text: error.message }); }
  records.push({ name, state, viewport: { width, height }, route: redact(route), steps, ...metrics, screenshot: `${name}.png`, screenshot_sha256: await digest(path), axe_violations: axe, console_errors_and_warnings: [...errors] });
}

for (const [key, width] of [["mobile390", 390], ["mobile360", 360]]) {
  const height = 844;
  await page.setViewportSize({ width, height });
  await page.goto(editUrl, { waitUntil: "domcontentloaded" });
  const exampleMap = page.getByRole("button", { name: /Sobrecarga de Filas/ });
  if (await exampleMap.isVisible().catch(() => false)) {
    await exampleMap.click({ timeout: 4000 });
    await page.locator("body[data-ui-mode='map']").waitFor({ timeout: 4000 });
  }
  const firstUseNotice = page.getByRole("button", { name: "Entendi" });
  const firstUseVisible = await firstUseNotice.isVisible().catch(() => false);
  if (firstUseVisible) {
    await settle();
    const firstUsePath = join(out, `hosted-first-use-notice-${key}.png`);
    await page.screenshot({ path: firstUsePath, fullPage: true, animations: "disabled", caret: "hide" });
    records.push({ name: `hosted-first-use-notice-${key}`, state: "Initial keep-secret-link notice", viewport: { width, height }, route: redactedEditRoute, steps: ["Open newly created isolated workspace", "Capture initial notice before dismissing"], screenshot: `hosted-first-use-notice-${key}.png`, screenshot_sha256: await digest(firstUsePath) });
    await firstUseNotice.click({ timeout: 3000 });
  }
  await capture(`hosted-editor-map-${key}`, "Hosted workspace editor / map mode", width, height, editUrl, ["Open disposable examples workspace", "Wait two animation frames plus 500 ms"]);
  await page.locator("[data-react-ui-mode='story']").click({ timeout: 4000 });
  await page.locator("body[data-ui-mode='story']").waitFor({ timeout: 4000 });
  await capture(`hosted-editor-story-${key}`, "Hosted Story Studio settled after first-use notice", width, height, editUrl, ["Tap História", "Dismiss Entendi notice if present", "Wait two animation frames plus 500 ms"]);
  await page.locator("[data-react-ui-mode='present']").click({ timeout: 4000 });
  await page.locator("body[data-ui-mode='present']").waitFor({ timeout: 4000 });
  await capture(`hosted-editor-player-${key}`, "Hosted presentation player", width, height, editUrl, ["Tap Apresentar", "Wait for settled view"]);
  await page.goto(editUrl, { waitUntil: "domcontentloaded" });
  const shareButton = page.getByRole("button", { name: "Compartilhar" });
  await shareButton.click({ timeout: 4000 });
  await page.locator(".trama-share-dialog[open]").waitFor({ timeout: 4000 });
  await capture(`hosted-settings-share-${key}`, "Hosted Share settings modal with secret fields blurred", width, height, editUrl, ["Open Compartilhar", "Blur every input in the modal", "Capture link/settings surfaces"], { blurSecrets: true });
  await page.locator(".trama-share-dialog").getByRole("button", { name: /Fechar|Close/ }).click({ timeout: 3000 }).catch(async () => page.keyboard.press("Escape"));
  await page.goto(`${shareUrl}`, { waitUntil: "domcontentloaded" });
  await capture(`hosted-share-${key}`, "Read-only hosted share page", width, height, shareUrl, ["Open disposable read-only share URL"]);
  await page.goto(`${shareUrl}?embed=presentation`, { waitUntil: "domcontentloaded" });
  await capture(`hosted-player-${key}`, "Read-only presentation embed", width, height, `${shareUrl}?embed=presentation`, ["Open read-only presentation mode"]);
  await page.goto(`${shareUrl}?sidebar=0`, { waitUntil: "domcontentloaded" });
  await capture(`hosted-no-sidebar-${key}`, "Read-only share without sidebar", width, height, `${shareUrl}?sidebar=0`, ["Open read-only share with sidebar=0"]);
}

await createContext.close();
await browser.close();
await writeFile(join(out, "hosted-final-mobile-manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), server: base, disposable_workspace: true, routes: { edit: redactedEditRoute, share: redactedShareRoute }, records, limitations: ["The edit and share tokens remain only in this process and are redacted from this manifest.", "Screenshots are local-only and never published."] }, null, 2)}\n`);
