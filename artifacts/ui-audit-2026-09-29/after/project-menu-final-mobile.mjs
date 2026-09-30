import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const out = resolve("artifacts/ui-audit-2026-09-29/after");
const base = process.env.TRAMA_UI_QA_URL || "http://127.0.0.1:58810";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const rows = [];
for (const [key, width] of [["390", 390], ["360", 360]]) {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", error => consoleErrors.push(error.message));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const response = await fetch("/api/qa/reset-fixture", { method: "POST" });
    if (!response.ok) throw new Error(`Fixture reset failed: ${response.status}`);
  });
  await page.goto(`${base}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click({ timeout: 3000 });
  await page.locator("body[data-ui-mode='map']").waitFor({ timeout: 3000 });
  const summary = page.locator("#project-switcher > summary");
  const summaryVisible = await summary.isVisible();
  const summaryBox = await summary.boundingBox();
  if (summaryVisible) await summary.click({ timeout: 3000 });
  await page.locator("#project-switcher").waitFor({ state: "visible", timeout: 3000 });
  await page.locator(".project-menu-panel").waitFor({ state: "visible", timeout: 3000 });
  const metrics = await page.evaluate(() => {
    const trigger = document.querySelector("#project-switcher > summary");
    const panel = document.querySelector(".project-menu-panel");
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, triggerRect: rect(trigger), panelRect: rect(panel), panelPosition: getComputedStyle(panel).position, panelClientHeight: panel.clientHeight, panelScrollHeight: panel.scrollHeight, menuOpen: document.querySelector("#project-switcher").open };
  });
  const save = async name => {
    const path = join(out, `${name}.png`);
    await page.screenshot({ path, fullPage: true, animations: "disabled", caret: "hide" });
    return createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex");
  };
  const menuHash = await save(`project-menu-final-${key}`);
  await page.locator("#edit-project-metadata").click({ timeout: 3000 });
  await page.locator("#command-dialog[open]").waitFor({ timeout: 3000 });
  const dialogHash = await save(`edit-project-final-${key}`);
  rows.push({ viewport: { width, height: 844 }, summary_visible: summaryVisible, summary_rect: summaryBox, ...metrics, overflow: metrics.scrollWidth > metrics.clientWidth, menu_screenshot: `project-menu-final-${key}.png`, menu_sha256: menuHash, edit_project_dialog_screenshot: `edit-project-final-${key}.png`, edit_dialog_sha256: dialogHash, steps: ["Open Flagship map", "Tap Projeto button", "Verify fixed menu", "Tap Editar projeto", "Capture command dialog"], console_errors: consoleErrors });
  await context.close();
}
await browser.close();
await writeFile(join(out, "project-menu-final-mobile-manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), target: base, records: rows }, null, 2)}\n`);
