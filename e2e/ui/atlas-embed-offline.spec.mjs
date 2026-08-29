import { test, expect, qaBaseURL } from "../support/qa-test.mjs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createAtlasEmbedHtml } from "../../src/export/atlasEmbed.js";
import { buildUnifiedUiFixture } from "../../qa/fixtures/unified-ui-fixture.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("Atlas embed is self-contained, preserves the selected style and enables Play only after preparation", async ({ page }) => {
  const fixture = buildUnifiedUiFixture();
  const model = fixture.maps.at(-1).model;
  const presentation = {
    ...fixture.presentations[0].presentation,
    settings: { ...fixture.presentations[0].presentation.settings, presentationStyle: "atlas-editorial" }
  };
  const [runtime, styles] = await Promise.all([
    readFile(resolve(root, "dist/atlas-embed-runtime.iife.js"), "utf8"),
    Promise.all([
      readFile(resolve(root, "dist/standalone-fonts.css"), "utf8"),
      readFile(resolve(root, "atlas-embed.css"), "utf8")
    ]).then(parts => parts.join("\n"))
  ]);
  const html = createAtlasEmbedHtml({
    project: fixture.project,
    model,
    presentation,
    views: fixture.views.filter(view => view.map_id === model.id),
    assets: fixture.assets.map(asset => ({ ...asset, data_url: `data:${asset.mime_type};base64,${asset.content_base64}` })),
    runtime,
    styles
  });
  const directory = await mkdtemp(resolve(tmpdir(), "loopviewer-atlas-embed-"));
  const path = resolve(directory, "atlas.html");
  await writeFile(path, html, "utf8");
  try {
    const externalRequests = [];
    page.on("request", request => {
      const protocol = new URL(request.url()).protocol;
      if (!['file:', 'data:', 'blob:', 'about:'].includes(protocol)) externalRequests.push(request.url());
    });
    await page.context().setOffline(true);
    await page.goto(pathToFileURL(path).href, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".atlas-embed-poster")).toBeVisible();
    await expect(page.locator(".atlas-embed-poster img")).toHaveAttribute("src", /^data:image\/svg\+xml/);
    await expect(page.locator("#loopviewer-atlas-embed")).toHaveAttribute("data-presentation-style", "atlas-editorial");
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-state", "ready");
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-poster-source", "live-map");
    await expect(page.locator(".atlas-embed-poster img")).toBeHidden();
    const play = page.locator('[data-action="play"]');
    await expect(play).toBeEnabled();
    await expect.poll(() => page.locator("#atlas-embed-graph canvas").count()).toBeGreaterThan(0);
    await expect(page.locator(".atlas-embed-camera-snapshot")).toHaveCount(0);
    expect(externalRequests).toEqual([]);
    await play.click();
    await expect(page.locator(".atlas-embed-poster")).toBeHidden();
    await expect(page.locator(".atlas-embed-story h1")).not.toHaveText("");
  } finally {
    await page.context().setOffline(false);
    await rm(directory, { recursive: true, force: true });
  }
});

test("Atlas poster keeps the first focused route legible across editorial viewports", async ({ page }, testInfo) => {
  // Four complete offline boots plus DPR3 screenshots exercise the real
  // publication pipeline, so this proof intentionally exceeds the suite's
  // single-viewport default timeout on slower software-rendered Chromium.
  test.setTimeout(120_000);
  const [runtime, styles] = await Promise.all([
    readFile(resolve(root, "dist/atlas-embed-runtime.iife.js"), "utf8"),
    Promise.all([
      readFile(resolve(root, "dist/standalone-fonts.css"), "utf8"),
      readFile(resolve(root, "atlas-embed.css"), "utf8")
    ]).then(parts => parts.join("\n"))
  ]);
  const model = {
    id: "poster-parity", title: "Pressão e capacidade",
    nodes: [
      { id: "demand", label: "Demanda", position: { x: 80, y: 300 } },
      { id: "capacity", label: "Capacidade", position: { x: 510, y: 300 } },
      { id: "pressure", label: "Pressão", position: { x: 910, y: 120 } },
      { id: "trust", label: "Confiança", position: { x: 1180, y: 620 } }
    ],
    edges: [
      { id: "demand-capacity", source: "demand", target: "capacity", sourceSign: "+", targetSign: "+", route: { controlPointDistance: 150 } },
      { id: "capacity-pressure", source: "capacity", target: "pressure", sourceSign: "+", targetSign: "-", route: { controlPointDistance: -120 } },
      { id: "pressure-trust", source: "pressure", target: "trust", sourceSign: "+", targetSign: "+", route: { controlPointDistance: 80 } },
      { id: "capacity-demand", source: "capacity", target: "demand", sourceSign: "+", targetSign: "+", route: { controlPointDistance: -150 } }
    ], loops: [{ id: "pressure-loop", edgeIds: ["demand-capacity", "capacity-demand"] }]
  };
  const presentation = {
    schemaVersion: 2, id: "poster-parity-story", title: "A pressão antecede a resposta",
    settings: { presentationStyle: "atlas-editorial" },
    chapters: [{ id: "chapter", title: "Abertura", scenes: [{
      id: "scene", title: "A relação decisiva", mapRef: { mapId: "poster-parity" },
      stage: { camera: { mode: "fit-focus", padding: 88 } },
      beats: [{
        id: "beat", title: "A demanda pressiona a capacidade", narrationMd: "A curva inicial abre a leitura.",
        focus: { kind: "edge", edgeId: "demand-capacity" }, delta: { camera: { mode: "fit-focus" } }
      }]
    }] }]
  };
  const html = createAtlasEmbedHtml({ model, presentation, runtime, styles });
  const directory = await mkdtemp(resolve(tmpdir(), "loopviewer-atlas-poster-parity-"));
  const path = resolve(directory, "atlas-poster-parity.html");
  await writeFile(path, html, "utf8");
  try {
    for (const viewport of [
      { id: "desktop", width: 1440, height: 900 },
      { id: "compact-desktop", width: 1024, height: 768 },
      { id: "tablet-landscape", width: 800, height: 450 },
      { id: "mobile", width: 390, height: 844 },
      { id: "tablet-portrait", width: 768, height: 1024 }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(pathToFileURL(path).href, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-state", "ready");
      await expect(page.locator(".atlas-embed-poster img")).toHaveAttribute("src", /^data:image\/svg\+xml/);
      await expect(page.locator(".atlas-embed-poster img")).toBeHidden();
      await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-poster-source", "live-map");
      await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-poster-loop", "pressure-loop");
      await expect(page.locator(".atlas-embed-poster-copy")).toHaveCSS("background-color", "rgba(255, 254, 248, 0.74)");
      await expect(page.locator('[data-action="play"]')).toHaveCSS("min-height", "44px");
      await page.screenshot({ path: testInfo.outputPath(`poster-${viewport.id}.png`) });
      await page.getByRole("button", { name: "Começar leitura" }).click();
      await expect(page.locator(".atlas-embed-poster")).toBeHidden();
      await expect(page.locator(".atlas-embed-shell")).not.toHaveAttribute("data-atlas-poster-loop", "pressure-loop");
      await expect.poll(() => page.locator("#atlas-embed-graph canvas").count()).toBeGreaterThan(0);
      await page.screenshot({ path: testInfo.outputPath(`first-frame-${viewport.id}.png`) });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Atlas enables Play from WebP overviews, upgrades focus by beat, and keeps a later failure local", async ({ page }) => {
  const [runtime, styles] = await Promise.all([
    readFile(resolve(root, "dist/atlas-embed-runtime.iife.js"), "utf8"),
    Promise.all([
      readFile(resolve(root, "dist/standalone-fonts.css"), "utf8"),
      readFile(resolve(root, "atlas-embed.css"), "utf8")
    ]).then(parts => parts.join("\n"))
  ]);
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WQAAAABJRU5ErkJggg==";
  const webp = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAACwAQCdASoBAAEAAUAmJaQAA3AA/vuUAAA=";
  const rendition = data_url => ({ data_url, mime_type: "image/webp", width: 1, height: 1, hasAlpha: false });
  const model = {
    id: "lazy-map", title: "Mapa lazy",
    nodes: [
      { id: "first", label: "Primeiro", position: { x: 100, y: 100 }, media: { assetId: "first-image", altText: "Primeiro" } },
      { id: "later", label: "Depois", position: { x: 860, y: 100 }, media: { assetId: "later-image", altText: "Depois" } }
    ], edges: [], loops: []
  };
  const presentation = {
    schemaVersion: 2, id: "lazy-story", title: "Leitura lazy", settings: { presentationStyle: "atlas-editorial" },
    chapters: [{ id: "chapter", title: "Capítulo", scenes: [{
      id: "scene", title: "Cena", mapRef: { mapId: "lazy-map" }, stage: { camera: { mode: "fit-map" } },
      beats: [
        { id: "overview-beat", title: "Primeiro quadro", narrationMd: "Visão geral pronta em HD." },
        { id: "first-beat", title: "Foco no primeiro", narrationMd: "Atualiza sem quadro em branco.", focus: { kind: "node", nodeId: "first" }, delta: { camera: { mode: "fit-focus" } } },
        { id: "later-beat", title: "Segundo quadro", narrationMd: "Não bloqueia a navegação.", focus: { kind: "node", nodeId: "later" }, delta: { camera: { mode: "fit-focus" } } }
      ]
    }] }]
  };
  const html = createAtlasEmbedHtml({
    model, presentation, runtime, styles,
    assets: [
      { id: "first-image", mime_type: "image/png", data_url: png, renditions: { overview: rendition(webp), focus: rendition(webp) } },
      { id: "later-image", mime_type: "image/png", data_url: png, renditions: { overview: rendition(webp), focus: rendition("data:image/webp;base64,not-a-webp") } }
    ]
  });
  expect(html).toContain("data:image/webp");
  expect(html).not.toContain("data:image/png;base64,iVBORw0K");
  const directory = await mkdtemp(resolve(tmpdir(), "loopviewer-atlas-embed-lazy-"));
  const path = resolve(directory, "atlas-lazy.html");
  await writeFile(path, html, "utf8");
  try {
    await page.context().setOffline(true);
    await page.goto(`${pathToFileURL(path).href}?atlas-qa=1`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-state", "ready");
    await expect(page.locator('[data-action="play"]')).toBeEnabled();
    const overviewUrls = await page.evaluate(() =>
      globalThis.__LOOPVIEWER_ATLAS_QA_ENGINE__.cy.nodes().map(node => node.style("background-image"))
    );
    expect(overviewUrls.every(url => String(url).startsWith("blob:"))).toBe(true);
    await page.getByRole("button", { name: "Começar leitura" }).click();
    await page.getByRole("button", { name: "Próximo" }).click();
    await expect(page.locator(".atlas-embed-story h1")).toHaveText("Foco no primeiro");
    await expect(page.locator(".atlas-embed-asset-warning")).toBeHidden();
    await page.getByRole("button", { name: "Próximo" }).click();
    await expect(page.locator(".atlas-embed-story h1")).toHaveText("Segundo quadro");
    await expect(page.locator(".atlas-embed-asset-warning")).toBeVisible();
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-state", "playing");
    await expect(page.getByRole("button", { name: "Anterior" })).toBeEnabled();
  } finally {
    await page.context().setOffline(false);
    await rm(directory, { recursive: true, force: true });
  }
});

test("Atlas cancels superseded camera motion, anchors an edge card and honours keyboard navigation", async ({ page }) => {
  const [runtime, styles] = await Promise.all([
    readFile(resolve(root, "dist/atlas-embed-runtime.iife.js"), "utf8"),
    Promise.all([
      readFile(resolve(root, "dist/standalone-fonts.css"), "utf8"),
      readFile(resolve(root, "atlas-embed.css"), "utf8")
    ]).then(parts => parts.join("\n"))
  ]);
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WQAAAABJRU5ErkJggg==";
  const webp = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAACwAQCdASoBAAEAAUAmJaQAA3AA/vuUAAA=";
  const model = {
    id: "motion-map", title: "Mapa de movimento",
    nodes: [
      { id: "a", label: "Origem", position: { x: 80, y: 180 }, media: { assetId: "a-image" } },
      { id: "b", label: "Relação", position: { x: 430, y: 240 }, media: { assetId: "b-image" } },
      { id: "c", label: "Consequência", position: { x: 760, y: 120 }, media: { assetId: "c-image" } }
    ],
    edges: [{ id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+" }, { id: "bc", source: "b", target: "c", sourceSign: "+", targetSign: "−" }], loops: []
  };
  const presentation = {
    schemaVersion: 2, id: "motion-story", title: "Movimento Atlas", settings: { presentationStyle: "atlas-editorial" },
    chapters: [{ id: "chapter", title: "Capítulo", scenes: [{
      id: "scene", title: "Cena", mapRef: { mapId: "motion-map" }, stage: { camera: { mode: "fit-map" } },
      beats: [
        { id: "map", title: "Visão geral", narrationMd: "Mapa inteiro." },
        { id: "edge", title: "A relação se move", narrationMd: "A seta fica contextual.", focus: { kind: "edge", edgeId: "ab" }, delta: { camera: { mode: "fit-focus" } } },
        { id: "node", title: "O foco amplia", narrationMd: "O nó ganha ênfase.", focus: { kind: "node", nodeId: "b" }, delta: { camera: { mode: "fit-focus" } } },
        { id: "path", title: "O caminho continua", narrationMd: "A leitura permanece responsiva.", focus: { kind: "path", edgeIds: ["ab", "bc"] }, delta: { camera: { mode: "follow-path" }, flow: { direction: "forward" } } }
      ]
    }] }]
  };
  const html = createAtlasEmbedHtml({
    model, presentation, runtime, styles,
    assets: ["a", "b", "c"].map(id => ({
      id: `${id}-image`, mime_type: "image/png", data_url: png,
      renditions: {
        overview: { data_url: webp, mime_type: "image/webp", width: 1, height: 1, hasAlpha: false },
        focus: { data_url: webp, mime_type: "image/webp", width: 1, height: 1, hasAlpha: false }
      }
    }))
  });
  const directory = await mkdtemp(resolve(tmpdir(), "loopviewer-atlas-embed-motion-"));
  const path = resolve(directory, "atlas-motion.html");
  await writeFile(path, html, "utf8");
  try {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.context().setOffline(true);
    await page.goto(`${pathToFileURL(path).href}?atlas-qa=1`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Começar leitura" }).click();
    await page.keyboard.press("ArrowRight");
    const cardTransition = await page.locator(".atlas-embed-story").evaluate(card => ({
      cardAnimation: getComputedStyle(card).animationName,
      titleAnimation: getComputedStyle(card.querySelector("h1")).animationName,
      titleOpacity: getComputedStyle(card.querySelector("h1")).opacity,
      bodyAnimation: getComputedStyle(card.querySelector(".atlas-embed-story-body")).animationName
    }));
    expect(cardTransition.cardAnimation).toBe("atlas-embed-settle");
    expect(cardTransition.titleAnimation).toBe("none");
    expect(cardTransition.titleOpacity).toBe("1");
    expect(cardTransition.bodyAnimation).toBe("atlas-embed-copy-rise");
    await expect(page.locator(".atlas-embed-story h1")).toHaveText("A relação se move");
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-motion", "stable");
    await expect(page.locator(".atlas-embed-relation-meta")).toBeVisible();
    await expect(page.locator(".atlas-embed-connector path.atlas-embed-connector-line")).toHaveCount(1);
    await expect(page.locator(".atlas-embed-story")).toHaveAttribute("data-anchor", /left|right/);
    await page.evaluate(() => {
      const cy = globalThis.__LOOPVIEWER_ATLAS_QA_ENGINE__.cy;
      globalThis.__ATLAS_NODE_SIZE_TRACE__ = [];
      const started = performance.now();
      const sample = now => {
        globalThis.__ATLAS_NODE_SIZE_TRACE__.push({
          retainedFocus: cy.getElementById("b").width(),
          contextualNode: cy.getElementById("a").width()
        });
        if (now - started < 1500) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".atlas-embed-story h1")).toHaveText("O foco amplia");
    await page.waitForTimeout(1550);
    const nodeSizeTrace = await page.evaluate(() => globalThis.__ATLAS_NODE_SIZE_TRACE__);
    const retainedSizes = nodeSizeTrace.map(sample => sample.retainedFocus);
    const contextualSizes = nodeSizeTrace.map(sample => sample.contextualNode);
    const contextualStart = contextualSizes.findIndex(size => size <= 50);
    expect(Math.min(...retainedSizes)).toBeGreaterThan(110);
    expect(contextualStart).toBeGreaterThanOrEqual(0);
    expect(Math.max(...contextualSizes.slice(contextualStart))).toBeLessThanOrEqual(50);
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".atlas-embed-story h1")).toHaveText("A relação se move");
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-motion", "stable");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-motion", "stable");
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-card-position", "tethered");
    await expect(page.locator(".atlas-embed-story")).toHaveAttribute("data-anchor", "top");
    const mobileTether = await page.locator(".atlas-embed-connector path.atlas-embed-connector-line").evaluate(path => {
      const end = path.getPointAtLength(path.getTotalLength());
      const card = document.querySelector(".atlas-embed-story").getBoundingClientRect();
      return { endpointY: end.y, cardTop: card.top };
    });
    expect(Math.abs(mobileTether.endpointY - mobileTether.cardTop)).toBeLessThan(2);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(80);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".atlas-embed-story h1")).toHaveText("O caminho continua");
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-motion", "stable");
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-path-choreography", "complete");
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-phase-gap-ms", /^\d+$/);
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-input-to-motion-ms", /^\d+$/);
    const motionTiming = await page.locator(".atlas-embed-shell").evaluate(shell => ({
      inputToMotion: Number(shell.dataset.atlasInputToMotionMs),
      phaseGap: Number(shell.dataset.atlasPhaseGapMs)
    }));
    expect(motionTiming.inputToMotion).toBeLessThan(100);
    expect(motionTiming.phaseGap).toBeLessThan(34);
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-flow", "forward");
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-flow-renderer", "cytoscape-dash-offset");
    await expect(page.locator(".atlas-embed-flow-path")).toHaveCount(0);
    await expect.poll(() => page.locator(".atlas-embed-focus-pulse").count()).toBeGreaterThan(0);
    const dashOffsetBefore = await page.evaluate(() => globalThis.__LOOPVIEWER_ATLAS_QA_ENGINE__.cy.edges(".story-current").map(edge => edge.style("line-dash-offset")));
    await page.waitForTimeout(80);
    const dashOffsetAfter = await page.evaluate(() => globalThis.__LOOPVIEWER_ATLAS_QA_ENGINE__.cy.edges(".story-current").map(edge => edge.style("line-dash-offset")));
    expect(dashOffsetBefore.length).toBeGreaterThan(0);
    expect(dashOffsetAfter).not.toEqual(dashOffsetBefore);
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-atlas-last-input-ms", /\d+/);
    await page.getByRole("button", { name: "Anterior" }).click();
    await expect(page.locator(".atlas-embed-story h1")).toHaveText("O foco amplia");
    const qa = await page.evaluate(() => globalThis.__LOOPVIEWER_ATLAS_QA__);
    expect(qa.samples.length).toBeGreaterThan(20);
    expect(new Set(qa.samples.map(sample => sample.zoom)).size).toBeGreaterThan(4);
    expect(new Set(qa.samples.map(sample => sample.connector).filter(Boolean)).size).toBeGreaterThan(2);
    expect(qa.events.filter(event => event.type === "decode-start" && event.motion === "moving")).toEqual([]);
  } finally {
    await page.context().setOffline(false);
    await rm(directory, { recursive: true, force: true });
  }
});

test("Atlas embed keeps Play blocked and exposes recovery when a critical HD asset cannot decode", async ({ page }) => {
  const [runtime, styles] = await Promise.all([
    readFile(resolve(root, "dist/atlas-embed-runtime.iife.js"), "utf8"),
    Promise.all([
      readFile(resolve(root, "dist/standalone-fonts.css"), "utf8"),
      readFile(resolve(root, "atlas-embed.css"), "utf8")
    ]).then(parts => parts.join("\n"))
  ]);
  const model = { id: "broken-map", title: "Mapa", nodes: [{ id: "n1", label: "Variável", media: { assetId: "broken", altText: "Variável" } }], edges: [], loops: [] };
  const presentation = {
    schemaVersion: 2, id: "broken-story", title: "História", settings: { presentationStyle: "atlas-editorial" },
    chapters: [{ id: "chapter", title: "Capítulo", scenes: [{
      id: "scene", title: "Cena", mapRef: { mapId: "broken-map" }, content: { bodyMd: "Texto" },
      stage: { camera: { mode: "fit-map" } }, beats: [{ id: "beat", title: "Beat", narrationMd: "Texto" }]
    }] }]
  };
  const html = createAtlasEmbedHtml({
    model, presentation, runtime, styles,
    assets: [{ id: "broken", mime_type: "image/png", data_url: "data:image/png;base64,not-an-image" }]
  });
  const directory = await mkdtemp(resolve(tmpdir(), "loopviewer-atlas-embed-broken-"));
  const path = resolve(directory, "atlas-broken.html");
  await writeFile(path, html, "utf8");
  try {
    await page.context().setOffline(true);
    await page.goto(pathToFileURL(path).href, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".atlas-embed-shell")).toHaveAttribute("data-state", "failed");
    await expect(page.locator('[data-action="play"]')).toBeDisabled();
    await expect(page.locator('[data-action="retry"]')).toBeVisible();
  } finally {
    await page.context().setOffline(false);
    await rm(directory, { recursive: true, force: true });
  }
});

test("Story Studio exports its selected Atlas style through the product command", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.locator("[data-react-ui-mode='story']").click();
  // Story Studio is React-owned: wait for its timeline and select a real card
  // before changing presentation metadata.
  await expect(page.locator("#story-timeline-shell")).toBeVisible();
  await page.locator(".story-timeline-card-main").first().click();
  const styleInput = page.locator("#presentation-style-input");
  await expect(styleInput).toBeVisible();
  await styleInput.selectOption("atlas-editorial");
  await page.locator("#export-presentation-html").click();
  await page.getByLabel("Formato de saída").selectOption("atlas-embed");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Gerar HTML offline" }).click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  const htmlPath = `${downloadedPath}-${download.suggestedFilename()}`;
  await download.saveAs(htmlPath);
  const offlinePage = await page.context().newPage();
  try {
    await offlinePage.context().setOffline(true);
    await offlinePage.goto(pathToFileURL(htmlPath).href, { waitUntil: "domcontentloaded" });
    await expect(offlinePage.locator("#loopviewer-atlas-embed")).toHaveAttribute("data-presentation-style", "atlas-editorial");
    await expect(offlinePage.locator('[data-action="play"]')).toBeEnabled();
  } finally {
    await offlinePage.context().setOffline(false);
    await offlinePage.close();
  }
});
