import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const out = resolve("artifacts/ui-audit-2026-09-29/after");
const base = process.env.TRAMA_UI_QA_URL || "http://127.0.0.1:58810";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const results = [];
for (const [viewport, width, height] of [["desktop", 1440, 900], ["mobile390", 390, 844]]) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => fetch("/api/qa/reset-fixture", { method: "POST" }));
  const scan = async state => {
    const result = await new AxeBuilder({ page }).analyze();
    const metrics = await page.evaluate(() => ({ mode: document.body.dataset.uiMode, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
    results.push({ viewport, state, ...metrics, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, description: v.description })) });
  };
  await page.goto(`${base}/?qa=1`, { waitUntil: "domcontentloaded" });
  await scan("workspace");
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await scan("map");
  await page.locator("#project-switcher > summary").click();
  await scan("project-menu");
  await page.locator("#edit-project-metadata").click();
  await page.locator("#command-dialog[open]").waitFor();
  await scan("edit-project-dialog");
  await page.keyboard.press("Escape");
  await page.locator("[data-react-ui-mode='story']").click();
  await page.locator("body[data-ui-mode='story']").waitFor();
  await scan("story");
  await page.locator("[data-react-ui-mode='present']").click();
  await page.locator("body[data-ui-mode='present']").waitFor();
  await scan("present");
  await context.close();
}
await browser.close();
await writeFile(join(out, "axe-final-manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), target: base, records: results, historical_findings: "Earlier after captures recorded landmark-unique, summary-name, color-contrast and heading-order. New build includes fixes; final scan below supersedes those snapshots where clean." }, null, 2)}\n`);
