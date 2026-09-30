import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const out = resolve("artifacts/ui-audit-2026-09-29/after");
const base = process.env.TRAMA_HOSTED_URL || "http://127.0.0.1:4194";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const context = await browser.newContext({ viewport: { width: 360, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on("console", msg => { if (["error", "warning"].includes(msg.type())) errors.push({ type: msg.type(), text: msg.text(), location: { url: redact(msg.location().url), line: msg.location().lineNumber, column: msg.location().columnNumber } }); });
page.on("pageerror", error => errors.push({ type: "pageerror", text: error.message }));
const redact = url => String(url).replace(/\/w\/[^/]+/g, "/w/[REDACTED]").replace(/\/p\/[^/]+/g, "/p/[REDACTED]");
page.on("response", response => { if (response.status() >= 400) errors.push({ type: "http-response", status: response.status(), pathname: redact(response.url()) }); });
page.on("requestfailed", request => errors.push({ type: "requestfailed", pathname: redact(request.url()), error: request.failure()?.errorText }));
const records = [];
const sha = async path => createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex");

await page.goto(`${base}/comecar`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /Criar com exemplos/ }).click();
await page.waitForURL(/\/w\//, { timeout: 12000 });
const editUrl = page.url();
const redactedEdit = redact(editUrl);
const apiBase = `${new URL(editUrl).origin}${new URL(editUrl).pathname.replace(/\/$/, "")}`;
const workspaceResponse = await page.request.get(`${apiBase}/api/hosted/workspace`);
const shareUrl = (await workspaceResponse.json()).links.share_url;
const redactedShare = redact(shareUrl);
const settle = async () => {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(500);
};
async function record(name, state, route, steps, viewport = 360) {
  await settle();
  const path = join(out, `${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled", caret: "hide" });
  const metrics = await page.evaluate(() => ({ title: document.title, mode: document.body.dataset.uiMode || null, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, primaryHeadings: [...document.querySelectorAll("h1,h2")].map(el => el.innerText.trim()).filter(Boolean).slice(0, 12), selectControls: [...document.querySelectorAll("select")].map(el => ({ id: el.id, name: el.getAttribute("aria-label"), labelledby: el.getAttribute("aria-labelledby"), labels: [...(el.labels || [])].map(label => label.innerText.trim()), value: el.value })) }));
  let violations = null;
  try { const scan = await new AxeBuilder({ page }).analyze(); violations = scan.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })); } catch (error) { errors.push({ type: "axe-error", text: error.message }); }
  records.push({ name, state, route: redact(route), viewport: { width: viewport, height: 844 }, steps, ...metrics, screenshot: `${name}.png`, screenshot_sha256: await sha(path), axe_violations: violations, console_errors_and_warnings: [...errors] });
}

await page.goto(editUrl, { waitUntil: "domcontentloaded" });
const initialNotice = page.getByRole("button", { name: "Entendi" });
if (await initialNotice.isVisible().catch(() => false)) await initialNotice.click({ timeout: 3000 });
await page.getByRole("button", { name: /Sobrecarga de Filas/ }).click({ timeout: 4000 });
await page.locator("body[data-ui-mode='map']").waitFor({ timeout: 4000 });
await record("hosted-map-final-mobile360", "Hosted map selected from workspace library", editUrl, ["Open editor link", "Select Sobrecarga de Filas from map library", "Dismiss first-use notice if present"]);
await page.locator("[data-react-ui-mode='story']").click({ timeout: 4000 });
await page.locator("body[data-ui-mode='story']").waitFor({ timeout: 4000 });
const actionMetrics = await page.evaluate(() => [...document.querySelectorAll(".story-timeline-v2 button,.story-v2-primary-actions button,.story-timeline-create-actions button")].filter(el => el.getClientRects().length).map(el => { const rect = el.getBoundingClientRect(); return { label: el.getAttribute("aria-label") || el.innerText.trim().replace(/\s+/g, " "), width: Math.round(rect.width), height: Math.round(rect.height), x: Math.round(rect.x), y: Math.round(rect.y) }; }));
await record("hosted-story-actions-final-mobile360", "Hosted Story Studio timeline actions after final fixes", editUrl, ["Tap História", "Wait for camera/timeline to settle", "Measure visible timeline and primary-action hit areas"]);
records.at(-1).action_metrics = actionMetrics;

for (const [name, suffix, state] of [["hosted-share-final-mobile360", "", "Read-only map/share"], ["hosted-player-final-mobile360", "?embed=presentation", "Read-only presentation/player"], ["hosted-no-sidebar-final-mobile360", "?sidebar=0", "Read-only share without sidebar"]]) {
  await page.goto(`${shareUrl}${suffix}`, { waitUntil: "domcontentloaded" });
  await record(name, state, `${shareUrl}${suffix}`, [`Open ${state} on 360px after the final hosted build`]);
}

await page.goto(editUrl, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Compartilhar" }).click({ timeout: 4000 });
await page.locator(".trama-share-dialog[open]").waitFor({ timeout: 4000 });
await page.addStyleTag({ content: `.trama-share-dialog input { filter: blur(10px) !important; }` });
await record("hosted-settings-share-final-mobile360", "Hosted share settings with secret values blurred", editUrl, ["Open Compartilhar", "Blur fields containing secret URLs before screenshot"]);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${shareUrl}`, { waitUntil: "domcontentloaded" });
await record("hosted-share-final-mobile390", "Read-only map/share", shareUrl, ["Open read-only share on 390px after final hosted build"], 390);
await page.goto(`${shareUrl}?embed=presentation`, { waitUntil: "domcontentloaded" });
await record("hosted-player-final-mobile390", "Read-only presentation/player", `${shareUrl}?embed=presentation`, ["Open read-only presentation/player on 390px after final hosted build"], 390);
await page.goto(`${shareUrl}?sidebar=0`, { waitUntil: "domcontentloaded" });
await record("hosted-no-sidebar-final-mobile390", "Read-only share without sidebar", `${shareUrl}?sidebar=0`, ["Open read-only share without sidebar on 390px after final hosted build"], 390);
await page.goto(editUrl, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Compartilhar" }).click({ timeout: 4000 });
await page.locator(".trama-share-dialog[open]").waitFor({ timeout: 4000 });
await page.addStyleTag({ content: `.trama-share-dialog input { filter: blur(10px) !important; }` });
await record("hosted-settings-share-final-mobile390", "Hosted share settings with secret values blurred", editUrl, ["Open Compartilhar on 390px", "Blur fields containing secret URLs before screenshot"], 390);

await writeFile(join(out, "hosted-final-postfix-manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), server: base, final_build_mtime: (await (await import("node:fs/promises")).stat(resolve("dist/react-app.iife.js"))).mtime.toISOString(), routes: { edit: redactedEdit, share: redactedShare }, records, http_and_console_errors: errors.filter(event => event.type === "http-response" || event.type === "requestfailed" || event.type === "pageerror" || event.type === "error"), limitation: "All credential paths are redacted; the disposable workspace is in the isolated hosted data root." }, null, 2)}\n`);
await context.close();
await browser.close();
