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
  await page.goto(`${base}/?qa=1`, { waitUntil: "domcontentloaded" });
  const workspace = await new AxeBuilder({ page }).analyze();
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("body[data-ui-mode='map']").waitFor();
  await page.locator("#project-switcher > summary").click();
  const menu = await new AxeBuilder({ page }).analyze();
  results.push({ viewport, workspace: workspace.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })), projectMenu: menu.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })) });
  await context.close();
}
await browser.close();
await writeFile(join(out, "axe-project-menu-targets.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), build_mtime: (await (await import("node:fs/promises")).stat(resolve("dist/react-app.iife.js"))).mtime.toISOString(), results }, null, 2)}\n`);
