import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const out = resolve("artifacts/ui-audit-2026-09-29/after");
const base = process.env.TRAMA_HOSTED_URL || "http://127.0.0.1:4194";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const events = [];
page.on("console", msg => { if (["error", "warning"].includes(msg.type())) events.push({ type: msg.type(), text: msg.text() }); });
page.on("pageerror", error => events.push({ type: "pageerror", text: error.message }));
await page.goto(`${base}/comecar`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /Criar com exemplos/ }).click();
await page.waitForURL(/\/w\//, { timeout: 15000 });
const editUrl = page.url();
await page.locator("[data-react-ui-mode='story']").click();
await page.locator("#story-timeline-shell").waitFor();
const firstUseBanner = page.getByRole("button", { name: "Entendi" });
const capturedBanner = await firstUseBanner.isVisible().catch(() => false);
if (capturedBanner) await page.screenshot({ path: join(out, "hosted-story-first-use-desktop.png"), fullPage: true, animations: "disabled" });
if (capturedBanner) await firstUseBanner.click({ timeout: 3000 });
await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
await page.waitForTimeout(500);
const stable = await page.evaluate(() => ({
  title: document.title,
  mode: document.body.dataset.uiMode,
  cameraStable: document.querySelector("#cld-root")?.dataset.qaCameraStable || null,
  mapRect: (() => { const rect = document.querySelector("#cld-root")?.getBoundingClientRect(); return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null; })(),
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth
}));
const path = join(out, "hosted-story-stable-after-first-use-desktop.png");
await page.screenshot({ path, fullPage: true, animations: "disabled", caret: "hide" });
const digest = createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex");
const redactedRoute = editUrl.replace(/(\/w\/)[^/?]+/, "$1[REDACTED]");
await writeFile(join(out, "hosted-final-story-manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), route: redactedRoute, viewport: { width: 1440, height: 900 }, steps: ["Create examples workspace in isolated hosted server", "Open Story Studio", "Record the first-use notice", "Click Entendi", "Wait two requestAnimationFrame callbacks and 500 ms", "Capture settled composition"], first_use_banner_seen: capturedBanner, stable_state: stable, screenshot: "hosted-story-stable-after-first-use-desktop.png", screenshot_sha256: digest, console_errors_and_warnings: events }, null, 2)}\n`);
await context.close();
await browser.close();
