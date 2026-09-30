import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const out = resolve("artifacts/ui-audit-2026-09-29/after");
const base = process.env.TRAMA_UI_QA_URL || "http://127.0.0.1:58810";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const records = [];
await mkdir(out, { recursive: true });
const saveShot = async (page, name) => {
  const path = join(out, `${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled", caret: "hide" });
  return createHash("sha256").update(await (await import("node:fs/promises")).readFile(path)).digest("hex");
};
async function openMap(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(`${base}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click({ timeout: 3000 });
  await page.locator("body[data-ui-mode='map']").waitFor({ timeout: 3000 });
}

for (const [label, width, height] of [["desktop", 1440, 900], ["mobile390", 390, 844], ["mobile360", 360, 844]]) {
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push({ type: "console", text: msg.text() }); });
  page.on("pageerror", error => errors.push({ type: "pageerror", text: error.message }));
  await openMap(page, width, height);
  const zoom = await page.evaluate(() => [...document.querySelectorAll("#canvas-zoom-in,#canvas-zoom-out")].map(el => ({ id: el.id, visible: !!el.getClientRects().length, parent: el.parentElement?.className, rect: (() => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })() })));
  await page.locator("#canvas-zoom-in").click({ timeout: 3000 });
  const mapShot = await saveShot(page, `zoom-${label}`);
  let axe = null;
  try { const scan = await new AxeBuilder({ page }).analyze(); axe = scan.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })); } catch (error) { errors.push({ type: "axe-error", text: error.message }); }
  records.push({ state: "map with zoom-in clicked", viewport: { width, height }, zoom_controls: zoom, overflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), axe_violations: axe, screenshot: `zoom-${label}.png`, screenshot_sha256: mapShot, console_errors: errors });

  if (label === "desktop") {
    const more = page.locator(".edit-toolbar-more > summary");
    await more.click({ timeout: 3000 });
    const menuShot = await saveShot(page, "menu-export-verified-desktop");
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 });
    await page.locator("#export-standalone").click({ timeout: 3000 });
    const download = await downloadPromise;
    const exportPath = join(out, download.suggestedFilename() || "trama-fixture.html");
    await download.saveAs(exportPath);
    records.push({ state: "standalone export from More actions menu", viewport: { width, height }, steps: ["Open map", "Open .edit-toolbar-more > summary", "Click #export-standalone", "Save downloaded fixture HTML under after/"], screenshot: "menu-export-verified-desktop.png", screenshot_sha256: menuShot, download: download.suggestedFilename(), size_bytes: (await import("node:fs/promises")).stat(exportPath).then(s => s.size) });
  }
  await context.close();
}

// Import a repository example into the disposable Playwright SQLite fixture only.
const importContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const importPage = await importContext.newPage();
const importErrors = [];
importPage.on("console", msg => { if (msg.type() === "error") importErrors.push(msg.text()); });
await importPage.goto(`${base}/?qa=1`, { waitUntil: "domcontentloaded" });
await importPage.locator("[data-react-ui-mode='workspace']").click({ timeout: 3000 });
await importPage.locator("#workspace-home").waitFor({ timeout: 3000 });
const chooserPromise = importPage.waitForEvent("filechooser", { timeout: 5000 });
await importPage.locator("#workspace-import-markdown").click({ timeout: 3000 });
const chooser = await chooserPromise;
await chooser.setFiles(resolve("seeds/sobrecarga-filas.loop.md"));
await importPage.waitForTimeout(1500);
const importScreenshot = await saveShot(importPage, "import-markdown-fixture-desktop");
const importedProject = await importPage.request.get(`${base}/api/project`);
const importedPayload = await importedProject.json();
records.push({ state: "import markdown from repository seed into isolated UI QA database", viewport: { width: 1440, height: 900 }, steps: ["Go to workspace", "Choose Import Markdown", "Select seeds/sobrecarga-filas.loop.md", "Read back only the disposable QA project API"], screenshot: "import-markdown-fixture-desktop.png", screenshot_sha256: importScreenshot, resulting_map_count: importedPayload.maps?.length ?? null, map_titles: importedPayload.maps?.map(map => map.title) || [], console_errors: importErrors });
await importContext.close();

await browser.close();
await writeFile(join(out, "flow-checks-manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), target: base, data_scope: "ephemeral local Playwright fixture database only", records }, null, 2)}\n`);
