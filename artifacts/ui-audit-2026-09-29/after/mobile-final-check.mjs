import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const out = resolve("artifacts/ui-audit-2026-09-29/after");
const base = process.env.TRAMA_UI_QA_URL || "http://127.0.0.1:58810";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const results = [];
for (const [label, width] of [["mobile390", 390], ["mobile360", 360]]) {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push({ type: "console", message: msg.text() }); });
  page.on("pageerror", error => errors.push({ type: "pageerror", message: error.message }));
  await page.goto(`${base}/?qa=1`, { waitUntil: "domcontentloaded" });
  const recents = await page.evaluate(() => [...document.querySelectorAll("[data-react-ui-mode]")].map(el => ({ mode: el.getAttribute("data-react-ui-mode"), visible: !!el.getClientRects().length, text: el.getAttribute("aria-label") || el.innerText.trim() })));
  const capture = async (name, steps) => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const path = join(out, `${name}.png`);
    await page.screenshot({ path, fullPage: true, animations: "disabled", caret: "hide" });
    const metrics = await page.evaluate(() => ({ title: document.title, mode: document.body.dataset.uiMode, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, visibleWidth: document.documentElement.clientWidth, headings: [...document.querySelectorAll("h1,h2,h3")].map(el => el.innerText.trim()).filter(Boolean) }));
    const digest = createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex");
    let axe = null;
    try { const scan = await new AxeBuilder({ page }).analyze(); axe = scan.violations.map(issue => ({ id: issue.id, impact: issue.impact, nodes: issue.nodes.length })); } catch (error) { errors.push({ type: "axe-error", message: error.message }); }
    results.push({ name, viewport: { width, height: 844 }, steps, ...metrics, screenshot: `${name}.png`, screenshot_sha256: digest, axe_violations: axe, console_errors: [...errors] });
  };
  await capture(`workspace-final-${label}`, ["Open isolated QA fixture home", "Capture after mobile grid correction"]);
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click({ timeout: 3000 });
  await page.locator("body[data-ui-mode='map']").waitFor({ timeout: 3000 });
  await capture(`map-final-${label}`, ["Select Flagship map from project library"]);
  await page.locator("[data-react-ui-mode='story']").click({ timeout: 3000 });
  await page.locator("body[data-ui-mode='story']").waitFor({ timeout: 3000 });
  await capture(`story-navigation-final-${label}`, ["Tap História from mobile navigation"]);
  await page.locator("[data-react-ui-mode='present']").click({ timeout: 3000 });
  await page.locator("body[data-ui-mode='present']").waitFor({ timeout: 3000 });
  await capture(`present-navigation-final-${label}`, ["Tap Apresentar from mobile navigation"]);
  results.at(-1).navigation_controls = recents;
  await context.close();
}
await browser.close();
await writeFile(join(out, "mobile-final-manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), target: base, records: results, limitation: "Manual screen-reader and physical-device testing was not performed." }, null, 2)}\n`);
