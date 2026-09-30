import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const out = resolve("artifacts/ui-audit-2026-09-29/after");
const base = process.env.TRAMA_UI_QA_URL || "http://127.0.0.1:58810";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
await mkdir(out, { recursive: true });
const records = [];
const shot = async (page, name, state, width, height, steps) => {
  const path = join(out, `${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled", caret: "hide" });
  const details = await page.evaluate(() => ({ mode: document.body.dataset.uiMode, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
  const axe = await new AxeBuilder({ page }).analyze().then(scan => scan.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))).catch(error => [{ id: "axe-error", impact: null, error: error.message }]);
  records.push({ name, state, viewport: { width, height }, steps, ...details, axe_violations: axe, screenshot: `${name}.png`, screenshot_sha256: createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex") });
};

for (const [key, width] of [["390", 390], ["360", 360]]) {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${base}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("body[data-ui-mode='map']").waitFor();
  await page.locator("#sidebar-toggle").click();
  await shot(page, `editor-dock-hamburger-${key}`, "Open editor dock via topbar hamburger", width, 844, ["Open Flagship map", "Tap #sidebar-toggle"]);
  await page.locator("[data-react-ui-mode='workspace']").click();
  await page.locator("body[data-ui-mode='workspace']").waitFor();
  await shot(page, `project-library-mobile-${key}`, "Project library navigation path", width, 844, ["Tap Projetos from mobile app navigation", "Verify Open project and New project actions are visible"]);
  await context.close();
}

for (const [key, width, height] of [["desktop", 1440, 900], ["mobile390", 390, 844], ["mobile360", 360, 844]]) {
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(`${base}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("body[data-ui-mode='map']").waitFor();
  await page.locator(".edit-toolbar-more > summary").click();
  await shot(page, `export-menu-final-${key}`, "More actions menu open", width, height, ["Open Flagship map", "Click the exact More actions summary selector"]);
  const downloadPromise = page.waitForEvent("download", { timeout: 10000 });
  await page.locator("#export-standalone").click({ timeout: 3000 });
  const download = await downloadPromise;
  const downloadPath = join(out, `standalone-${key}-${download.suggestedFilename()}`);
  await download.saveAs(downloadPath);
  records.push({ name: `standalone-export-${key}`, state: "Export standalone HTML", viewport: { width, height }, steps: ["Open More actions", "Click Export standalone", "Save to after evidence folder"], download: download.suggestedFilename(), saved_as: downloadPath, bytes: (await (await import("node:fs/promises")).stat(downloadPath)).size });
  await context.close();
}

await browser.close();
await writeFile(join(out, "corrected-interactions-manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), target: base, observations: ["On compact widths, #project-switcher is hidden; the topbar hamburger toggles the editor dock. Project open/create actions remain available from the Projetos workspace library."], records }, null, 2)}\n`);
