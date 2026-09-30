import { chromium } from "playwright";
import { DatabaseSync } from "node:sqlite";
import { writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const root = "/tmp/trama-ui-audit-hosted-2026-09-29";
const db = new DatabaseSync(resolve(root, "registry.db"), { readOnly: true });
const row = db.prepare("SELECT share_token FROM workspaces ORDER BY created_at DESC LIMIT 1").get();
db.close();
const token = row?.share_token;
if (!token) throw new Error("No disposable hosted share record found.");
const base = process.env.TRAMA_HOSTED_URL || "http://127.0.0.1:4194";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 360, height: 844 } });
const redact = url => String(url).replace(/\/p\/[^/]+/g, "/p/[REDACTED]").replace(/\/w\/[^/]+/g, "/w/[REDACTED]");
const routes = [`${base}/p/${token}`, `${base}/p/${token}?embed=presentation`, `${base}/p/${token}?sidebar=0`];
const output = [];
for (const url of routes) {
  const responses = [];
  const failed = [];
  const consoleErrors = [];
  const onResponse = response => { if (response.status() >= 400) responses.push({ status: response.status(), url: redact(response.url()), resourceType: response.request().resourceType() }); };
  const onFail = request => failed.push({ url: redact(request.url()), error: request.failure()?.errorText });
  const onConsole = message => { if (message.type() === "error") consoleErrors.push({ text: message.text(), location: message.location() }); };
  page.on("response", onResponse); page.on("requestfailed", onFail); page.on("console", onConsole);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const resources = await page.evaluate(() => performance.getEntriesByType("resource").map(entry => ({ name: entry.name, status: entry.responseStatus })).filter(entry => entry.status >= 400));
  output.push({ route: redact(url), responses, failed, resourceTiming404s: resources.map(entry => ({ ...entry, name: redact(entry.name) })), consoleErrors });
  page.off("response", onResponse); page.off("requestfailed", onFail); page.off("console", onConsole);
}
await browser.close();
await writeFile(resolve("artifacts/ui-audit-2026-09-29/after/hosted-404-trace.json"), `${JSON.stringify({ checked_at: new Date().toISOString(), results: output }, null, 2)}\n`);
