import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { validateModel } from "../src/index.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, process.env.TRAMA_LANDING_QA_DIR || "printscreens/trama-landing");
const externalUrl = process.env.TRAMA_LANDING_QA_URL;
const url = externalUrl || "http://127.0.0.1:4181/";
let server;
let browser;
const report = { url, viewports: [], checks: [], errors: [], networkFailures: [], hashes: {} };
await mkdir(output, { recursive: true });
try {
  if (!externalUrl) {
    server = spawn(process.execPath, ["scripts/serve-landing.mjs"], { cwd: root, env: { ...process.env, TRAMA_LANDING_PORT: "4181" }, stdio: ["ignore", "pipe", "pipe"] });
    await new Promise((resolveReady, reject) => {
      server.stdout.once("data", resolveReady); server.once("error", reject);
      server.once("exit", code => reject(new Error(`QA server exited: ${code}`)));
    });
  }
  browser = await chromium.launch({ headless: true, ...(process.env.TRAMA_CHROMIUM_PATH ? { executablePath: process.env.TRAMA_CHROMIUM_PATH } : { channel: "chromium" }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") report.errors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 400) report.networkFailures.push(`${response.status()} ${response.url()}`); });
  page.on("request", request => { assert.ok(["GET", "HEAD"].includes(request.method()), "The demo must never write to a shared service"); });
  await page.goto(url);
  await page.locator('#demo[data-ready="true"]').waitFor({ timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#graph canvas").first().waitFor();
  for (const [name, width, height] of [["desktop", 1440, 1000], ["user-1280", 1280, 720], ["tablet", 1024, 900], ["user-830", 830, 863], ["mobile", 390, 844]]) {
    await page.setViewportSize({ width, height });
    // Exercise real lazy loading before a full-page evidence capture.
    await page.locator(".paper-sculpture img").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const img = document.querySelector(".paper-sculpture img"); return img.complete && img.naturalWidth > 0; });
    if (name === "mobile") await page.locator(".contexts").screenshot({ path: resolve(output, "mobile-thinking-together.png"), animations: "disabled" });
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForFunction(() => !document.querySelector(".cld-canvas")._cyreg.cy.animated());
    // ResizeObserver settles the semantic camera; two animation frames plus
    // its bounded debounce cover layout without arbitrary multi-second sleeps.
    await page.waitForTimeout(250);
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight }));
    assert.ok(sizes.document <= width, `${name} horizontal overflow: ${sizes.document}`);
    await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true, animations: "disabled" });
    await page.screenshot({ path: resolve(output, `${name}-first.png`), animations: "disabled" });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    report.viewports.push({ name, width, height, ...sizes, axeViolations: axe.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => n.target) })) });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Sample every authored scroll state, a transition midpoint and reverse.
  async function storyScroll(progress) {
    await page.evaluate(progress => {
      const root = document.querySelector(".journey");
      const span = root.offsetHeight - root.firstElementChild.offsetHeight;
      scrollTo({ top: scrollY + root.getBoundingClientRect().top + span * progress, behavior: "instant" });
    }, progress);
  }
  for (let index = 0; index < 5; index++) {
    await storyScroll(index * .2 + .04);
    await page.waitForFunction(index => document.querySelector("#step-number").textContent === String(index + 1), index);
    if (index === 1) {
      await page.waitForTimeout(260);
      await page.screenshot({ path: resolve(output, "story-transition.png") });
    }
    await page.waitForFunction(() => !document.querySelector(".cld-canvas")._cyreg.cy.animated());
    await page.waitForTimeout(400);
    await page.screenshot({ path: resolve(output, `story-${index + 1}.png`) });
  }
  await storyScroll(.24);
  await page.waitForFunction(() => document.querySelector("#step-number").textContent === "2");
  await page.waitForTimeout(700);
  await page.screenshot({ path: resolve(output, "story-reverse.png") });
  await page.locator("#next").click();
  assert.equal(await page.locator("#step-number").textContent(), "3");
  assert.equal(await page.locator(".journey").evaluate(el => el.classList.contains("is-cinematic")), false);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(100);
  assert.equal(await page.locator("#step-number").textContent(), "3", "manual navigation must win over scrolling");
  await page.locator("#scroll-follow").click();
  assert.equal(await page.locator(".journey").evaluate(el => el.classList.contains("is-cinematic")), true);
  await page.waitForTimeout(100);
  assert.equal(await page.locator("#step-number").textContent(), "3", "resuming scroll preserves the current beat");
  await storyScroll(.24);
  await page.waitForFunction(() => document.querySelector("#step-number").textContent === "2");
  await page.reload(); await page.locator('#demo[data-ready="true"]').waitFor();
  await page.waitForFunction(() => document.querySelector("#step-number").textContent === "2");
  report.checks.push("Native scroll: five real authored beats, camera midpoint, reverse, manual override/resume and reload mid-scene");
  for (const [selector, name] of [[".process", "product-studies"], [".contexts", "thinking-together"], [".closing", "closing"]]) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.locator(selector).screenshot({ path: resolve(output, `${name}.png`) });
  }
  await page.getByRole("link", { name: "Explorar: Canais paralelos", exact: true }).click();
  assert.equal(await page.locator("#demo").getAttribute("data-mode"), "explore");
  assert.equal(await page.locator(".explore-reader h2").textContent(), "Canais paralelos");
  report.checks.push("Illustrated opening SVG opens the corresponding real variable in exploration mode");
  await page.locator('#demo .demo-tabs [data-mode="story"]').click();
  await page.getByRole("button", { name: /^Passo 1:/ }).click();
  for (let index = 2; index <= 5; index++) {
    await page.locator("#next").click();
    assert.equal(await page.locator("#step-number").textContent(), String(index));
  }
  assert.match(await page.locator("#story-text").textContent(), /ciclo de reforço/);
  await page.locator("#previous").click(); assert.equal(await page.locator("#step-number").textContent(), "4");
  await page.getByRole("button", { name: /^Passo 5:/ }).click();
  await page.waitForTimeout(450);
  await page.locator("#demo").screenshot({ path: resolve(output, "feedback.png") });
  await page.locator("#next").click();
  assert.equal(await page.locator("#demo").getAttribute("data-mode"), "explore");
  const canvasPoint = (target, kind = "node") => page.evaluate(({ target, kind }) => {
    const graph = document.querySelector(".cld-canvas"); const rect = graph.getBoundingClientRect();
    const element = graph._cyreg.cy.getElementById(target);
    const point = kind === "edge" ? element.renderedMidpoint() : element.renderedPosition();
    return { x: rect.x + point.x, y: rect.y + point.y };
  }, { target, kind });
  const clickCanvas = async (target, kind) => { const point = await canvasPoint(target, kind); await page.mouse.click(point.x, point.y); };
  // Edit steps dispatch the renderer's own tap, so the check does not depend on page scroll after each layout change.
  const tapNode = async id => { await page.waitForTimeout(400); await page.evaluate(id => document.querySelector(".cld-canvas")._cyreg.cy.getElementById(id).emit("tap"), id); };
  const counts = () => page.evaluate(() => { const cy = document.querySelector(".cld-canvas")._cyreg.cy; return { nodes: cy.nodes().length, edges: cy.edges().length }; });
  // Real canvas clicks, using the renderer's coordinates as the hit target.
  await clickCanvas("e02", "edge");
  assert.match(await page.locator("#explore-text").textContent(), /canais paralelos/);
  await clickCanvas("espera");
  assert.equal(await page.locator(".explore-reader h2").textContent(), "Tempo de espera");
  report.checks.push("Five real Presentation V2 beats, reverse navigation, loop synthesis, select relation and real canvas hit");

  await page.locator('.demo-tabs [data-mode="edit"]').click();
  await tapNode("espera");
  await page.locator("#node-label").fill("Espera pela resposta");
  await page.locator("#node-description").fill("Uma leitura feita na demonstração.");
  await page.getByRole("button", { name: "Aplicar alteração" }).click();
  assert.equal(await page.locator("#node-label").inputValue(), "Espera pela resposta");
  await page.locator('.demo-tabs [data-mode="story"]').click();
  await page.locator('.demo-tabs [data-mode="edit"]').click();
  await tapNode("espera");
  assert.equal(await page.locator("#node-label").inputValue(), "Espera pela resposta");
  await page.locator("#undo").click();
  await tapNode("espera");
  assert.equal(await page.locator("#node-label").inputValue(), "Tempo de espera");
  await page.locator('[data-edit-tool="add"]').click();
  await page.locator("#new-label").fill("Visibilidade do trabalho");
  await page.getByRole("button", { name: "Criar variável" }).click();
  await tapNode("espera");
  await page.locator('input[name="polarity"][value="-"]').check({ force: true });
  await page.locator("#new-description").fill("Mais visibilidade pode reduzir a espera neste contexto.");
  await page.getByRole("button", { name: "Criar relação" }).click();
  assert.deepEqual(await counts(), { nodes: 7, edges: 7 });
  await page.waitForTimeout(250);
  await page.locator("#demo").screenshot({ path: resolve(output, "experiment.png") });
  const downloadPending = page.waitForEvent("download");
  await page.locator("#download").click();
  const download = await downloadPending;
  const saved = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(validateModel(saved).valid, true); assert.equal(saved.nodes.length, 7); assert.equal(saved.edges.length, 7);
  await page.locator("#undo").click(); assert.deepEqual(await counts(), { nodes: 7, edges: 6 });
  await page.locator("#undo").click(); assert.deepEqual(await counts(), { nodes: 6, edges: 6 });
  await tapNode("espera");
  await page.locator("#node-label").fill("Outra hipótese"); await page.getByRole("button", { name: "Aplicar alteração" }).click();
  await page.locator("#reset").click(); await page.locator("#cancel-reset").click(); assert.equal(await page.locator("#node-label").inputValue(), "Outra hipótese");
  await page.locator("#reset").click(); await page.locator("#confirm-reset").click();
  await tapNode("espera"); assert.equal(await page.locator("#node-label").inputValue(), "Tempo de espera");
  const axeEdit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  report.editAxeViolations = axeEdit.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, html: n.html.slice(0, 240), why: n.any.map(x => x.message) })) }));
  report.checks.push("Edit, retain draft across story mode, undo, add node and signed relation, valid JSON download, atomic undo, reset/cancel");
  const storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
  assert.deepEqual(storage, { local: 0, session: 0 });
  await tapNode("espera");
  await page.locator("#node-label").fill("Temporário"); await page.getByRole("button", { name: "Aplicar alteração" }).click();
  await page.reload(); await page.locator('#demo[data-ready="true"]').waitFor();
  await page.locator('.demo-tabs [data-mode="edit"]').click(); await tapNode("espera"); assert.equal(await page.locator("#node-label").inputValue(), "Tempo de espera");
  report.checks.push("No shared writes or browser storage; reload starts a clean isolated example");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('.demo-tabs [data-mode="story"]').click();
  await page.getByRole("button", { name: /^Passo 3:/ }).focus(); await page.keyboard.press("Enter");
  assert.equal(await page.locator("#step-number").textContent(), "3");
  const motion = await page.evaluate(() => ({ scroll: getComputedStyle(document.documentElement).scrollBehavior, cameraAnimating: document.querySelector(".cld-canvas")._cyreg.cy.animated() }));
  assert.equal(motion.scroll, "auto"); assert.equal(motion.cameraAnimating, false);
  report.checks.push("Keyboard step selection and immediate camera with reduced motion");
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobileContext.newPage(); await mobilePage.goto(url);
  await mobilePage.locator('#demo[data-ready="true"]').waitFor();
  await mobilePage.locator('.demo-tabs [data-mode="edit"]').tap();
  await mobilePage.locator("#graph").scrollIntoViewIfNeeded();
  const mobilePoint = await mobilePage.evaluate(() => { const g = document.querySelector(".cld-canvas"); const r = g.getBoundingClientRect(); const p = g._cyreg.cy.getElementById("espera").renderedPosition(); return { x: r.x + p.x, y: r.y + p.y }; });
  await mobilePage.touchscreen.tap(mobilePoint.x, mobilePoint.y);
  await mobilePage.locator("#node-label").fill("Espera no celular");
  await mobilePage.getByRole("button", { name: "Aplicar alteração" }).tap();
  assert.equal(await mobilePage.locator("#node-label").inputValue(), "Espera no celular");
  await mobilePage.locator("#undo").tap();
  await mobilePage.touchscreen.tap(mobilePoint.x, mobilePoint.y); assert.equal(await mobilePage.locator("#node-label").inputValue(), "Tempo de espera");
  await mobilePage.locator('.demo-tabs [data-mode="story"]').tap();
  await mobilePage.locator("#next").tap(); assert.equal(await mobilePage.locator("#step-number").textContent(), "2");
  await mobileContext.close(); report.checks.push("Touch viewport: edit, undo and guided navigation on a 390px mobile device");
  report.performance = await page.evaluate(() => ({ navigation: performance.getEntriesByType("navigation").map(n => ({ domContentLoadedMs: Math.round(n.domContentLoadedEventEnd), loadMs: Math.round(n.loadEventEnd) })), resources: performance.getEntriesByType("resource").map(r => ({ name: new URL(r.name).pathname, transferredBytes: r.transferSize, durationMs: Math.round(r.duration) })) }));
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const staticPage = await noJs.newPage(); await staticPage.goto(url); await staticPage.locator(".accessible-map summary").click();
  assert.equal(await staticPage.locator("#relations-list li").count(), 6);
  assert.ok(await staticPage.locator("#demo noscript").isVisible());
  await staticPage.screenshot({ path: resolve(output, "no-javascript.png"), fullPage: true });
  await noJs.close();
  report.checks.push("No-JavaScript explanatory page and causal text remain available");
  for (const file of ["landing/index.html", "landing/landing.css", "landing/main.js", "landing/cinema.js", "landing/demo.js", "dist/landing/assets/landing.js"]) {
    report.hashes[file] = createHash("sha256").update(await readFile(resolve(root, file))).digest("hex");
  }
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
  assert.equal(report.networkFailures.length, 0, JSON.stringify(report.networkFailures));
  assert.equal(report.viewports.flatMap(v => v.axeViolations).length, 0, JSON.stringify(report.viewports));
  assert.equal(report.editAxeViolations.length, 0, JSON.stringify(report.editAxeViolations));
  report.status = "PASS";
} catch (error) { report.status = "FAIL"; report.failure = error.stack; process.exitCode = 1; }
finally {
  await browser?.close(); server?.kill("SIGTERM");
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
