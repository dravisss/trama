import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const out = resolve("artifacts/ui-audit-2026-09-29/after");
const base = process.env.TRAMA_HOSTED_URL || "http://127.0.0.1:4194";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const context = await browser.newContext({ viewport: { width: 360, height: 844 } });
const page = await context.newPage();
const redact = value => String(value).replace(/\/w\/[^/]+/g, "/w/[REDACTED]").replace(/\/p\/[^/]+/g, "/p/[REDACTED]");
await page.goto(`${base}/comecar`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /Criar com exemplos/ }).click();
await page.waitForURL(/\/w\//, { timeout: 12000 });
const editUrl = page.url();
await page.getByRole("button", { name: "Entendi" }).click({ timeout: 4000 }).catch(() => {});
await page.getByRole("button", { name: /Sobrecarga de Filas/ }).click({ timeout: 4000 });
await page.locator("body[data-ui-mode='map']").waitFor({ timeout: 4000 });
await page.locator("[data-react-ui-mode='story']").click({ timeout: 4000 });
await page.locator("body[data-ui-mode='story']").waitFor({ timeout: 4000 });
await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
await page.waitForTimeout(500);
const result = await page.evaluate(() => {
  const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const style = el => { const s = getComputedStyle(el); return { display: s.display, flexDirection: s.flexDirection, flexWrap: s.flexWrap, gridTemplateRows: s.gridTemplateRows, gridTemplateColumns: s.gridTemplateColumns, gap: s.gap, overflow: s.overflow, overflowX: s.overflowX, justifyContent: s.justifyContent, minWidth: s.minWidth, width: s.width }; };
  const targets = [...document.querySelectorAll("button")].filter(button => {
    const text = button.textContent.trim();
    const aria = button.getAttribute("aria-label") || "";
    return /Cena manual|Cena de loop|Prévia|Primeiro movimento|Último movimento/.test(text + " " + aria);
  }).map(button => {
    const ancestors = [];
    let current = button;
    for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) ancestors.push({ tag: current.tagName, className: typeof current.className === "string" ? current.className : current.className.baseVal, id: current.id, rect: rect(current), style: style(current) });
    return { textContent: button.textContent.trim(), innerText: button.innerText.trim(), ariaLabel: button.getAttribute("aria-label"), title: button.title, className: button.className, rect: rect(button), style: style(button), ancestors };
  });
  return {
    viewport: { width: innerWidth, height: innerHeight },
    page: { title: document.title, mode: document.body.dataset.uiMode, pathname: location.pathname.replace(/(\/w\/)[^/]+/, "$1[REDACTED]"), scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
    targetButtons: targets,
    resourceUrls: performance.getEntriesByType("resource").map(entry => entry.name.replace(/\/w\/[^/]+/g, "/w/[REDACTED]").replace(/\/p\/[^/]+/g, "/p/[REDACTED]")).filter(name => /\.css|\.js|\.woff|\.svg/.test(name)).slice(0, 80)
  };
});
const shot = join(out, "hosted-timeline-layout-debug-360.png");
await page.screenshot({ path: shot, fullPage: true, animations: "disabled", caret: "hide" });
await writeFile(join(out, "hosted-timeline-layout-debug.json"), `${JSON.stringify({ captured_at: new Date().toISOString(), build_mtime: (await (await import("node:fs/promises")).stat(resolve("dist/react-app.iife.js"))).mtime.toISOString(), route: redact(editUrl), static_root: "/Users/Ravi/Apps/LoopViewer", ...result }, null, 2)}\n`);
await context.close();
await browser.close();
