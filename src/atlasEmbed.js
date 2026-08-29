import cytoscape from "cytoscape";
import { createCLD } from "./CLDEngine.js";
import { measureCanvasSafeRect } from "./app/canvasViewport.js";
import { applyNodeMediaImage } from "./rendering/cytoscape.js";
import { PresentationController } from "./presentation/controller.js";
import { getCameraViewport, resolveCameraPlan } from "./presentation/camera.js";
import { renderPresentationMarkdown } from "./presentation/markdown.js";
import { presentationCameraMaxZoom, presentationCameraMotion, presentationConnectorMode, resolvePresentationStyle, usesContextualPresentation } from "./presentation/styleProfiles.js";
import { chooseTooltipPlacement, createTooltipTrackingState, trackTooltipPlacement } from "./presentation/tooltipLayout.js";
import { matchaTheme } from "./themes/matcha.js";

// The persisted editorial composition is the publication contract. Atlas does
// not ship a layout extension or rerun layout in the reader's browser.
globalThis.cytoscape = cytoscape;

const payload = readPayload();
const root = document.querySelector("#loopviewer-atlas-embed");
const atlasQuery = new URLSearchParams(globalThis.location?.search || "");
const atlasQaEnabled = atlasQuery.has("atlas-qa");
const atlasReferenceEnabled = atlasQuery.has("atlas-reference-qa");
const atlasQaSession = atlasQaEnabled ? { version: 1, samples: [], events: [] } : null;
let atlasQaLastRenderAt = null;

if (!root) throw new Error("Atlas embed root was not found.");
if (atlasQaSession) globalThis.__LOOPVIEWER_ATLAS_QA__ = atlasQaSession;

let engine = null;
let controller = null;
let currentFrame = null;
let presentationStyle = "atlas-editorial";
let viewportRevision = 0;
let viewportSizeKey = "";
let rendererViewportRevision = -1;
let cameraGeneration = 0;
let cameraRaf = null;
let lastReaderInputAt = 0;
let storyFlowDirection = -1;
let storyFlowRaf = null;
let focusMotionFrameKey = null;
let cardMotionRaf = null;
let tooltipRaf = null;
let tooltipPlacementState = null;
let tooltipFrameKey = null;
let tooltipGeometryState = null;
let atlasCardSideState = null;
let pendingInput = null;
const navigationSamples = [];
const longTaskSamples = [];
const assetMetadata = new Map((payload?.assets || []).map(asset => [asset.id, asset]));
const assetData = new Map();
const assetObjectUrls = new Map();
const assetJobs = new Map();
const failedAssetIds = new Set();
const activeNodeVariants = new Map();
const preloadQueue = [];
let preloadTimer = null;
let activePreloads = 0;
// One decode at a time is intentional for a single-file reader. The overview
// is already visible, so concurrent WebP upgrades buy little but can steal a
// frame from the camera on modest devices.
const MAX_CONCURRENT_PRELOADS = 1;
const PREFETCH_IDLE_MS = 2800;

root.innerHTML = `
  <main class="atlas-embed-shell" data-state="preparing" aria-busy="true">
    <section class="atlas-embed-player" aria-label="Apresentação Atlas Editorial">
      <div id="atlas-embed-graph"></div>
      <svg class="atlas-embed-focus-motion" aria-hidden="true"></svg>
      <svg class="atlas-embed-connector" aria-hidden="true"></svg>
      <aside class="atlas-embed-story" aria-live="polite" aria-atomic="true">
        <div class="atlas-embed-progress" aria-hidden="true"></div>
        <small>Atlas Editorial</small>
        <h1></h1>
        <div class="atlas-embed-story-body"></div>
        <div class="atlas-embed-relation-meta" hidden></div>
        <img alt="" hidden>
        <p class="atlas-embed-asset-warning" role="status" hidden></p>
        <div class="atlas-embed-controls">
          <button type="button" data-action="previous" title="Passo anterior">
            <span aria-hidden="true">←</span><span>Anterior</span>
          </button>
          <button type="button" data-action="next" title="Próximo passo">
            <span aria-hidden="true">→</span><span>Próximo</span>
          </button>
        </div>
      </aside>
    </section>
    <section class="atlas-embed-poster" aria-live="polite">
      <img alt="" hidden>
      <div class="atlas-embed-poster-copy">
        <small>LoopViewer · Atlas Editorial</small>
        <h1></h1>
        <p>Preparando a apresentação em alta definição.</p>
        <button type="button" data-action="play" disabled aria-describedby="atlas-embed-status">Preparando…</button>
        <p id="atlas-embed-status" class="atlas-embed-status" role="status">Validando mapa, câmera, fontes e imagens visíveis.</p>
      </div>
      <button type="button" data-action="retry" hidden>Tentar novamente</button>
    </section>
  </main>`;

const elements = {
  shell: root.querySelector(".atlas-embed-shell"),
  graph: root.querySelector("#atlas-embed-graph"),
  focusMotion: root.querySelector(".atlas-embed-focus-motion"),
  connector: root.querySelector(".atlas-embed-connector"),
  poster: root.querySelector(".atlas-embed-poster"),
  posterCopy: root.querySelector(".atlas-embed-poster-copy"),
  posterImage: root.querySelector(".atlas-embed-poster img"),
  posterTitle: root.querySelector(".atlas-embed-poster h1"),
  posterText: root.querySelector(".atlas-embed-poster-copy > p"),
  status: root.querySelector("#atlas-embed-status"),
  play: root.querySelector('[data-action="play"]'),
  retry: root.querySelector('[data-action="retry"]'),
  card: root.querySelector(".atlas-embed-story"),
  cardTitle: root.querySelector(".atlas-embed-story h1"),
  cardText: root.querySelector(".atlas-embed-story-body"),
  relationMeta: root.querySelector(".atlas-embed-relation-meta"),
  cardImage: root.querySelector(".atlas-embed-story img"),
  cardWarning: root.querySelector(".atlas-embed-asset-warning"),
  progress: root.querySelector(".atlas-embed-progress"),
  previous: root.querySelector('[data-action="previous"]'),
  next: root.querySelector('[data-action="next"]'),
  nextLabel: root.querySelector('[data-action="next"] span:last-child')
};

elements.play.addEventListener("click", startPlayback);
elements.retry.addEventListener("click", () => globalThis.location.reload());
elements.previous.addEventListener("click", () => requestNavigation("previous"));
elements.next.addEventListener("click", () => requestNavigation("next"));
document.addEventListener("keydown", event => {
  if (!elements.poster.hidden || !controller || isEditableTarget(event.target)) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    requestNavigation("previous", "keyboard");
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    requestNavigation("next", "keyboard");
  }
});

observeLongTasks();
globalThis.addEventListener("pagehide", releaseAssetObjectUrls, { once: true });

prepare().catch(showFailure);

async function prepare() {
  validatePayload(payload);
  const firstFrame = payload.compiled.timeline[payload.publication.initialFrame];
  presentationStyle = resolvePresentationStyle({
    requested: payload.publication?.style || "atlas-editorial",
    presentation: payload.presentation
  });
  elements.posterTitle.textContent = payload.presentation.title || payload.model.title || "Apresentação Atlas";
  root.dataset.presentationStyle = presentationStyle;
  hydratePoster();

  // A reader does not pay for later scene media before the opening frame is
  // usable. Critical failures are terminal; later failures remain local to a
  // beat and never block navigation.
  await Promise.all([
    preloadAssetIds(payload.publication?.criticalAssetIds || [], { required: true, priority: "urgent" }),
    document.fonts?.ready || Promise.resolve()
  ]);
  createFirstFrameEngine();
  await afterPaint();
  await renderFrame(firstFrame, { animate: false, prepared: true });
  setReady();
  prefetchFollowingFrame();
}

function validatePayload(value) {
  if (value?.format !== "loopviewer-atlas-embed") throw new Error("Arquivo Atlas Embed inválido.");
  if (!value.model || !value.presentation || !Array.isArray(value.compiled?.timeline) || !value.compiled.timeline.length) {
    throw new Error("A apresentação Atlas não possui um primeiro quadro compilado.");
  }
  if (value.integrity?.digest && value.integrity.digest !== hashPayload(value)) throw new Error("A integridade do arquivo Atlas não pôde ser confirmada.");
  for (const id of [...(value.publication?.criticalAssetIds || []), value.publication?.posterAssetId].filter(Boolean)) {
    if (!assetMetadata.has(id)) throw new Error(`O asset de publicação “${id}” não está no arquivo exportado.`);
  }
}

function hydratePoster() {
  const poster = readAssetData(payload.publication?.posterAssetId);
  if (!poster) return;
  elements.posterImage.src = poster;
  elements.posterImage.alt = "Mapa causal da apresentação";
  elements.posterImage.hidden = false;
}

function createFirstFrameEngine() {
  engine = createCLD({
    container: elements.graph,
    model: payload.model,
    view: payload.views?.[0] || null,
    editable: false,
    theme: matchaTheme,
    assetResolver: assetUrl,
    // Retina 2x already resolves the 192/640px editorial renditions at their
    // authored CSS sizes. Rendering the full graph at mobile DPR3 adds 125%
    // more canvas pixels without visible detail, and is the main source of
    // mobile camera stalls.
    rendererOptions: { pixelRatio: Math.min(Number(globalThis.devicePixelRatio) || 1, 2) }
  });
  if (atlasQaSession) globalThis.__LOOPVIEWER_ATLAS_QA_ENGINE__ = engine;
  if (atlasReferenceEnabled) globalThis.__LOOPVIEWER_ATLAS_REFERENCE_ENGINE__ = engine;
  engine.setEditing(false);
  engine.cy.nodes().addClass("atlas-embed-compositor-motion");
  engine.cy.on("render", () => {
    const renderListenerStartedAt = atlasQaSession ? performance.now() : 0;
    recordAtlasQaRender();
    updateFocusMotionOverlay();
    if (currentFrame && elements.poster.hidden && usesContextualPresentation(presentationStyle)) {
      positionContextualCard(currentFrame);
    }
    if (atlasQaSession) {
      const duration = performance.now() - renderListenerStartedAt;
      if (duration >= 2) recordAtlasQaEvent("render-listener", { duration: roundQa(duration) });
    }
  });
  observeViewport();
}

function setReady() {
  lastReaderInputAt = performance.now();
  elements.shell.dataset.state = "ready";
  elements.shell.dataset.atlasPosterSource = "live-map";
  elements.shell.setAttribute("aria-busy", "false");
  elements.posterImage.hidden = true;
  elements.posterText.textContent = "Uma leitura guiada do mapa causal, pronta para começar.";
  elements.play.disabled = false;
  elements.play.textContent = "Começar leitura";
  elements.status.textContent = "Primeiro quadro completo e pronto em alta definição.";
}

function startPlayback() {
  if (elements.play.disabled || !engine) return;
  // Publication readiness has its own cost. Navigation telemetry begins only
  // once the reader can act, so a report never attributes opening decodes to
  // an Arrow/Next interaction.
  navigationSamples.length = 0;
  longTaskSamples.length = 0;
  lastReaderInputAt = performance.now();
  delete elements.shell.dataset.atlasLongTaskCount;
  delete elements.shell.dataset.atlasLongTaskP95;
  elements.shell.dataset.state = "playing";
  // The prepared first frame is already stable underneath the poster.
  // Invalidate that marker before starting the controller so an observer
  // cannot mistake the card/camera entrance for a completed playback frame.
  elements.shell.dataset.atlasMotion = "pending";
  clearPosterLoopCue();
  elements.poster.hidden = true;
  controller = new PresentationController({
    presentation: payload.presentation,
    context: { model: payload.model, views: payload.views || [], assets: payload.assets || [] },
    compiled: payload.compiled,
    initialIndex: payload.publication.initialFrame
  });
  controller.addEventListener("beatchange", event => renderFrame(event.detail.frame));
  controller.addEventListener("statechange", event => {
    const { index, total } = event.detail.state;
    elements.previous.disabled = index <= 0;
    elements.next.disabled = index >= total - 1;
    elements.previous.setAttribute("aria-label", index <= 0 ? "Primeiro passo" : "Voltar para o passo anterior");
    elements.next.setAttribute("aria-label", index >= total - 1 ? "Último passo" : "Avançar para o próximo passo");
    elements.nextLabel.textContent = index >= total - 1 ? "Fim" : "Próximo";
  });
  controller.start(payload.publication.initialFrame);
}

function renderFrame(frame, { animate = true, prepared = false } = {}) {
  if (!frame || !engine) return Promise.resolve();
  let resolveSettled;
  const settled = new Promise(resolve => { resolveSettled = resolve; });
  currentFrame = frame;
  const step = frame.beat || {};
  const scene = frame.scene || {};
  const timeline = payload.compiled.timeline;
  const index = Math.max(0, timeline.indexOf(frame));
  elements.cardTitle.textContent = step.title || scene.title || payload.presentation.title || "Apresentação";
  elements.cardText.innerHTML = renderPresentationMarkdown(step.narrationMd || scene.content?.bodyMd || "");
  elements.progress.style.setProperty("--atlas-progress", `${((index + 1) / timeline.length) * 100}%`);
  elements.progress.dataset.progress = `${index + 1}/${timeline.length}`;
  elements.progress.setAttribute("aria-label", `Passo ${index + 1} de ${timeline.length}`);
  elements.progress.setAttribute("role", "progressbar");
  elements.progress.setAttribute("aria-valuemin", "1");
  elements.progress.setAttribute("aria-valuemax", String(timeline.length));
  elements.progress.setAttribute("aria-valuenow", String(index + 1));
  activateFrameVariants(frame);
  const plan = resolveCameraPlan(frame, payload.model);
  elements.card.dataset.cameraMode = plan.mode;
  elements.card.dataset.focusKind = plan.focus?.kind || "map";
  restartEditorialCardMotion();
  renderSceneImage(frame);
  const focusStartedAt = performance.now();
  applyFocus(frame);
  applyPosterLoopCue(frame);
  elements.shell.dataset.atlasFocusSyncMs = String(Math.round(performance.now() - focusStartedAt));
  startStoryFlow(frame.stage?.flow || frame.beat?.delta?.flow || {});
  renderRelationMeta(plan);
  elements.connector.replaceChildren();
  positionContextualCard(frame, { reselect: true });
  applyCamera(frame, {
    animate,
    onSettled: () => {
      positionContextualCard(frame);
      settleFrame(frame);
      if (!prepared) {
        scheduleFrameAssetUpgrade(frame);
        prefetchFollowingFrame();
      }
      resolveSettled();
    }
  });
  return settled;
}

function renderSceneImage(frame) {
  const scene = frame.scene || {};
  const source = directAssetUrl(frameAssetEntries(frame).find(entry => entry.role === "card")?.id);
  if (source) {
    elements.cardImage.src = source;
    elements.cardImage.alt = scene.content?.altText || frame.beat?.title || "Imagem editorial";
    elements.cardImage.hidden = false;
  } else {
    elements.cardImage.removeAttribute("src");
    elements.cardImage.hidden = true;
  }
}

async function loadFrameAssets(frame) {
  const ids = frameAssetEntries(frame).map(entry => entry.id);
  const result = await preloadAssetIds(ids, { required: false, priority: "urgent" });
  if (currentFrame !== frame) return;
  refreshLoadedNodeAssets(result.loaded);
  renderSceneImage(frame);
  if (result.failed.length) showDeferredAssetWarning(result.failed);
}

function scheduleFrameAssetUpgrade(frame) {
  const run = () => {
    if (currentFrame !== frame) return;
    const quietFor = performance.now() - lastReaderInputAt;
    if (elements.shell.dataset.atlasMotion === "moving" || quietFor < 1200) {
      setTimeout(() => scheduleFrameAssetUpgrade(frame), Math.max(180, 1200 - quietFor));
      return;
    }
    void loadFrameAssets(frame);
  };
  // An overview remains painted while a focus/card rendition is decoded. Do
  // not make a new reader input compete with image decoding on the main
  // thread; the bounded preload queue will still promote it shortly after.
  if (typeof requestIdleCallback === "function") requestIdleCallback(run);
  else setTimeout(run, 120);
}

function prefetchFollowingFrame() {
  const index = Math.max(0, payload.compiled.timeline.indexOf(currentFrame));
  const next = payload.compiled.timeline[index + 1];
  if (!next) return;
  void preloadAssetIds(frameAssetEntries(next).map(entry => entry.id), { required: false, priority: "idle" });
}

function frameAssetEntries(frame) {
  const index = Number(frame?.index);
  const entries = payload.publication?.frameAssets?.[index];
  if (Array.isArray(entries)) return entries.filter(entry => assetMetadata.has(entry.id));
  // Compatibility for v1 files created before context renditions.
  const ids = new Set();
  if (frame?.scene?.content?.assetId) ids.add(frame.scene.content.assetId);
  const plan = resolveCameraPlan(frame || {}, payload.model || {});
  const nodeIds = plan.isMap || plan.mode === "fixed" || !plan.hasFocus
    ? new Set((payload.model.nodes || []).map(node => node.id))
    : new Set(plan.nodeIds || []);
  for (const node of payload.model.nodes || []) if (nodeIds.has(node.id) && node.media?.assetId) ids.add(node.media.assetId);
  return [...ids].filter(id => assetMetadata.has(id)).map(id => ({ id, assetId: id, role: "node", rendition: "master" }));
}

function activateFrameVariants(frame) {
  const nextVariants = new Map();
  for (const [assetId, variants] of Object.entries(payload.publication?.assetVariants || {})) {
    if (variants.overview) nextVariants.set(assetId, variants.overview);
  }
  for (const entry of frameAssetEntries(frame)) {
    if (entry.role === "node" && entry.assetId) nextVariants.set(entry.assetId, entry.id);
  }
  const changed = new Set();
  for (const [assetId, renditionId] of nextVariants) {
    if (activeNodeVariants.get(assetId) !== renditionId) changed.add(assetId);
    activeNodeVariants.set(assetId, renditionId);
  }
  if (changed.size && engine?.cy) {
    engine.cy.batch(() => {
      engine.cy.nodes().forEach(node => {
        if (changed.has(node.data("media")?.assetId)) applyNodeMediaImage(node, { assetResolver: assetUrl });
      });
    });
  }
}

function applyFocus(frame) {
  stopStoryFlow();
  const focus = frame.focus;
  if (presentationStyle === "atlas-editorial") {
    engine.cy.batch(() => applyAtlasEditorialFocus(focus));
    return;
  }
  engine.cy.batch(() => {
    const all = engine.cy.elements();
    all.removeClass("atlas-embed-current atlas-embed-context story-current story-current-node story-context story-source-node story-target-node atlas-near-context atlas-focus-node atlas-focus-source atlas-focus-target atlas-focus-edge atlas-negative atlas-poster-loop");
    if (!focus) {
      all.filter(".story-background").removeClass("story-background");
      all.filter(".atlas-context").removeClass("atlas-context");
      all.filter(".faded, .focused").removeClass("faded focused");
      return;
    }
    // Atlas owns its contextual hierarchy. Reusing the engine's generic
    // focus would mark every element faded/focused again on every beat and
    // restart opacity/image transitions across the whole map.
    engine.clearFocus();
    if (focus.nodeIds?.length === 1) engine.focusNode(focus.nodeIds[0]);
    else if (focus.edgeIds?.length === 1) engine.focusEdge(focus.edgeIds[0]);
    else if (focus.loopIds?.length === 1) engine.focusLoop(focus.loopIds[0]);
    else {
      const ids = [...(focus.nodeIds || []), ...(focus.edgeIds || [])];
      ids.map(id => engine.cy.getElementById(id)).forEach(item => item.addClass("focused"));
    }
    const loopIds = [...(focus.loopIds || []), ...(focus.loopId ? [focus.loopId] : [])];
    const loopEdges = loopIds.flatMap(loopId => (engine.model.loops || []).find(loop => loop.id === loopId)?.edgeIds || []);
    const edgeIds = [...(focus.edgeIds || []), ...(focus.edgeId ? [focus.edgeId] : []), ...loopEdges];
    const focusEdges = edgeIds.reduce((collection, id) => collection.union(engine.cy.getElementById(id)), engine.cy.collection());
    const focusNodes = [...(focus.nodeIds || []), ...(focus.nodeId ? [focus.nodeId] : [])]
      .reduce((collection, id) => collection.union(engine.cy.getElementById(id)), focusEdges.connectedNodes());
    const focusElements = focusEdges.union(focusNodes);
    const contextElements = all.difference(focusElements);
    if (usesContextualPresentation(presentationStyle)) {
      contextElements.not(".story-background").addClass("story-background");
      focusElements.filter(".story-background").removeClass("story-background");
    } else all.filter(".story-background").removeClass("story-background");
    all.filter(".atlas-context").removeClass("atlas-context");
    edgeIds.map(id => engine.cy.getElementById(id)).filter(edge => edge.length).forEach(edge => {
      edge.addClass("story-current atlas-embed-current");
      edge.removeClass("story-background atlas-context");
      edge.connectedNodes().removeClass("story-background atlas-context").addClass("story-current-node");
    });
    (focus.nodeIds || []).map(id => engine.cy.getElementById(id)).filter(node => node.length).forEach(node => {
      node.removeClass("story-background atlas-context").addClass("story-current-node atlas-embed-current");
      node.connectedEdges().removeClass("story-background atlas-context").addClass("story-context");
    });
  });
}

function applyAtlasEditorialFocus(focus) {
  const cy = engine.cy;
  const all = cy.elements();
  const empty = cy.collection();
  all.filter(".faded, .focused").removeClass("faded focused");

  if (!focus) {
    syncPresentationClasses(all, [
      ["atlas-embed-current", empty], ["atlas-embed-context", empty], ["story-current", empty],
      ["story-current-node", empty], ["story-context", empty], ["story-source-node", empty],
      ["story-target-node", empty], ["story-background", empty], ["atlas-context", empty],
      ["atlas-near-context", empty], ["atlas-focus-node", empty], ["atlas-focus-source", empty],
      ["atlas-focus-target", empty], ["atlas-focus-edge", empty], ["atlas-negative", empty],
      ["atlas-poster-loop", empty]
    ]);
    return;
  }

  const loopIds = [...(focus.loopIds || []), ...(focus.loopId ? [focus.loopId] : [])];
  const loopEdges = loopIds.flatMap(loopId => (engine.model.loops || []).find(loop => loop.id === loopId)?.edgeIds || []);
  const edgeIds = [...new Set([...(focus.edgeIds || []), ...(focus.edgeId ? [focus.edgeId] : []), ...loopEdges])];
  const nodeIds = [...new Set([...(focus.nodeIds || []), ...(focus.nodeId ? [focus.nodeId] : [])])];
  const focusEdges = collectionForIds(cy, edgeIds);
  const explicitNodes = collectionForIds(cy, nodeIds);
  const sourceNodes = focusEdges.sources();
  const targetNodes = focusEdges.targets();
  const focusNodes = focusEdges.connectedNodes().union(explicitNodes);
  const focusElements = focusEdges.union(focusNodes);
  const contextElements = all.difference(focusElements);
  const nearEdges = explicitNodes.connectedEdges();
  const nearNodes = explicitNodes.neighborhood("node").intersection(contextElements.nodes());
  const nearContext = nearEdges.union(nearNodes);
  const contextWithoutNearEdges = contextElements.difference(nearEdges);
  const negativeEdges = focusEdges.filter(edge => {
    const sourceSign = ["-", "−", "–"].includes(String(edge.data("sourceSign") || "+").trim()) ? -1 : 1;
    const targetSign = ["-", "−", "–"].includes(String(edge.data("targetSign") || "+").trim()) ? -1 : 1;
    return sourceSign !== targetSign;
  });

  // Add every new semantic role before removing obsolete roles. A retained
  // focus therefore never passes through Atlas' 28px context style between
  // beats (116 -> 28 -> 116), while a role that genuinely changes still gets
  // the official size, opacity and blur transition.
  syncPresentationClasses(all, [
    ["atlas-embed-current", focusEdges.union(explicitNodes)],
    ["atlas-embed-context", empty],
    ["story-current", focusEdges],
    ["story-current-node", focusNodes],
    ["story-context", nearEdges],
    ["story-source-node", sourceNodes],
    ["story-target-node", targetNodes],
    ["story-background", contextWithoutNearEdges],
    ["atlas-context", contextWithoutNearEdges],
    ["atlas-near-context", nearContext],
    ["atlas-focus-node", focusNodes],
    ["atlas-focus-source", sourceNodes],
    ["atlas-focus-target", targetNodes],
    ["atlas-focus-edge", focusEdges],
    ["atlas-negative", negativeEdges],
    ["atlas-poster-loop", empty]
  ]);
}

function collectionForIds(cy, ids) {
  return ids.reduce((collection, id) => collection.union(cy.getElementById(id)), cy.collection());
}

function syncPresentationClasses(all, entries) {
  const current = new Map(entries.map(([className]) => [className, all.filter(`.${className}`)]));
  for (const [className, desired] of entries) desired.difference(current.get(className)).addClass(className);
  for (const [className, desired] of entries) current.get(className).difference(desired).removeClass(className);
}

function clearPosterLoopCue() {
  if (!engine?.cy) return;
  engine.cy.elements().removeClass("atlas-poster-loop");
  delete elements.shell.dataset.atlasPosterLoop;
}

function applyPosterLoopCue(frame) {
  clearPosterLoopCue();
  if (elements.poster.hidden || !engine?.cy) return;
  const loops = Array.isArray(engine.model?.loops) ? engine.model.loops.filter(loop => loop?.edgeIds?.length > 1) : [];
  if (!loops.length) return;

  const focusedEdges = new Set([
    ...(frame?.focus?.edgeIds || []),
    ...(frame?.focus?.edgeId ? [frame.focus.edgeId] : [])
  ]);
  const focusedNodes = new Set([
    ...(frame?.focus?.nodeIds || []),
    ...(frame?.focus?.nodeId ? [frame.focus.nodeId] : [])
  ]);
  const scoreLoop = loop => {
    const edges = loop.edgeIds || [];
    const matchingEdges = edges.filter(id => focusedEdges.has(id)).length;
    const matchingNodes = edges.flatMap(id => {
      const edge = engine.cy.getElementById(id);
      return edge.length ? [edge.source().id(), edge.target().id()] : [];
    }).filter(id => focusedNodes.has(id)).length;
    return matchingEdges * 100 + matchingNodes * 10 - edges.length / 100;
  };
  const loop = [...loops].sort((left, right) => scoreLoop(right) - scoreLoop(left))[0];
  const elementsInLoop = loop.edgeIds.reduce((collection, id) => collection.union(engine.cy.getElementById(id)), engine.cy.collection());
  if (!elementsInLoop.length) return;
  elementsInLoop.addClass("atlas-poster-loop");
  elementsInLoop.connectedNodes().addClass("atlas-poster-loop");
  elements.shell.dataset.atlasPosterLoop = loop.id || "loop";
}

function resolveCameraTarget(frame, plan = resolveCameraPlan(frame, engine.model)) {
  const cy = engine?.cy;
  if (!cy) return { plan, side: null, viewport: null };
  const startedAt = performance.now();
  const side = atlasCardSide(plan);
  let viewport;
  if (plan.mode === "fixed" && Number.isFinite(plan.camera.zoom) && plan.camera.pan) viewport = { zoom: plan.camera.zoom, pan: plan.camera.pan };
  else {
    const result = getCameraViewport(cy, plan, {
      padding: plan.isMap ? (plan.camera.padding || 70) : 68,
      maxZoom: presentationCameraMaxZoom(presentationStyle, plan),
      rect: cameraSafeRect(side)
    });
    viewport = result?.viewport || null;
  }
  elements.shell.dataset.atlasCameraResolveSyncMs = String(Math.round(performance.now() - startedAt));
  return { plan, side, viewport };
}

function applyCamera(frame, { animate = true, onSettled = null } = {}) {
  const cy = engine?.cy;
  if (!cy) return;
  const generation = cameraGeneration;
  resizeRendererForViewport();
  const run = () => {
    cameraRaf = null;
    if (generation !== cameraGeneration || !engine?.cy || frame !== currentFrame) return;
    // Focus changes node dimensions. Resolve the camera only after the Atlas
    // emphasis styles have committed; otherwise the target is stale and the
    // final renderer frame visibly snaps.
    const state = resolveCameraTarget(frame);
    const { plan, viewport } = state;
    const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const motion = presentationCameraMotion(presentationStyle, plan, { reduced });
    if (!viewport) {
      engine.fit({ padding: plan.camera.padding || 72, duration: 0 });
      onSettled?.();
      return;
    }
    if (animate && presentationStyle === "atlas-editorial" && plan.mode === "follow-path" && !reduced && plan.edgeIds?.length > 1) {
      const firstPlan = resolveCameraPlan({
        focus: { kind: "edge", edgeId: plan.edgeIds[0] },
        stage: { camera: { mode: "fit-focus", maxZoom: 1.5 } }
      }, engine.model);
      const first = getCameraViewport(cy, firstPlan, {
        padding: 132,
        rect: cameraSafeRect(state.side),
        maxZoom: 1.5
      });
      if (first?.viewport) {
        animateViewportSequence([
          {
            target: first.viewport,
            motion: { duration: 280, easing: "ease-out-cubic" },
            onStart: () => { elements.shell.dataset.atlasPathChoreography = "entry"; }
          },
          {
            target: viewport,
            motion: { duration: 800, easing: "ease-in-out-cubic" },
            onStart: () => { elements.shell.dataset.atlasPathChoreography = "traverse"; }
          }
        ], onSettled);
        return;
      }
    }
    animateViewport(viewport, animate ? motion : { duration: 0, easing: "linear" }, onSettled);
  };
  if (animate) cameraRaf = requestAnimationFrame(run);
  else run();
}

function resizeRendererForViewport() {
  if (!engine?.cy || rendererViewportRevision === viewportRevision) return;
  engine.cy.resize();
  rendererViewportRevision = viewportRevision;
}

function cameraSafeRect(side = null) {
  const graph = elements.graph.getBoundingClientRect();
  const posterVisible = !elements.poster.hidden;
  if (posterVisible) {
    const copy = elements.posterCopy?.getBoundingClientRect();
    if (copy && copy.width && copy.height) {
      const left = Math.max(0, copy.left - graph.left);
      const top = Math.max(0, copy.top - graph.top);
      const right = Math.min(graph.width, copy.right - graph.left);
      const bottom = Math.min(graph.height, copy.bottom - graph.top);
      const isLeftRail = left <= graph.width * .18 && copy.height >= graph.height * .72 && copy.width >= graph.width * .3;
      if (isLeftRail) {
        const x = Math.min(graph.width - 180, right + 16);
        return { x, y: 0, width: Math.max(180, graph.width - x), height: graph.height };
      }
      const isBottomCard = top >= graph.height * .24 && bottom >= graph.height * .7;
      if (isBottomCard) return { x: 0, y: 0, width: graph.width, height: Math.max(180, top - 16) };
    }
  }
  if (graph.width <= 840) {
    const reserved = posterVisible
      ? Math.min(graph.height * .6, Math.max(260, graph.height * .54))
      : Math.min(340, graph.height * .44);
    return { x: 0, y: 0, width: graph.width, height: Math.max(180, graph.height - reserved) };
  }
  return measureCanvasSafeRect({
    canvas: elements.graph,
    overlays: [],
    sideOverlays: side ? [elements.card] : [],
    gutter: 12
  }) || { x: 0, y: 0, width: graph.width, height: graph.height };
}

function observeViewport() {
  if (typeof ResizeObserver === "undefined") return;
  new ResizeObserver(entries => {
    const rect = entries[0]?.contentRect;
    const nextSizeKey = `${Math.round(rect?.width || 0)}x${Math.round(rect?.height || 0)}`;
    if (nextSizeKey === viewportSizeKey) return;
    viewportSizeKey = nextSizeKey;
    viewportRevision += 1;
    atlasCardSideState = null;
    tooltipGeometryState = null;
    if (!currentFrame) return;
    cancelAtlasMotion();
    scheduleContextualCardPosition({ reselect: true });
    applyCamera(currentFrame, {
      animate: false,
      onSettled: () => {
        positionContextualCard(currentFrame, { reselect: true });
        settleFrame(currentFrame);
      }
    });
  }).observe(elements.graph);
}

function refreshLoadedNodeAssets(ids) {
  if (!ids?.length || !engine?.cy) return;
  const changed = new Set(ids.map(id => assetMetadata.get(id)?.sourceAssetId || id));
  engine.cy.batch(() => {
    engine.cy.nodes().forEach(node => {
      if (changed.has(node.data("media")?.assetId)) applyNodeMediaImage(node, { assetResolver: assetUrl });
    });
  });
}

function showDeferredAssetWarning(ids) {
  const labels = ids.map(id => assetMetadata.get(id)?.filename || id).join(", ");
  elements.cardWarning.textContent = `Uma imagem desta etapa não pôde ser aberta (${labels}). A leitura continua; tente reabrir o arquivo para recuperá-la.`;
  elements.cardWarning.hidden = false;
}

function preloadAssetIds(ids, { required = false, priority = "idle" } = {}) {
  const unique = [...new Set(ids || [])];
  return Promise.all(unique.map(id => queueAssetPreload(id, priority).then(
    () => ({ id, ok: true }),
    error => ({ id, ok: false, error })
  ))).then(results => {
    const failed = results.filter(result => !result.ok).map(result => result.id);
    if (required && failed.length) throw results.find(result => !result.ok).error;
    return { loaded: results.filter(result => result.ok).map(result => result.id), failed };
  });
}

function queueAssetPreload(id, priority) {
  if (failedAssetIds.has(id)) return Promise.reject(new Error(`Não foi possível decodificar a imagem “${id}”.`));
  // Extracting the inline data URL is not the same as having a paintable
  // rendition. A second request can arrive while fetch()/decode() is still
  // running; only the materialized object URL satisfies the readiness
  // contract, otherwise a focus upgrade may be announced one frame early.
  if (assetObjectUrls.has(id)) return Promise.resolve();
  if (assetJobs.has(id)) {
    if (priority === "urgent") promoteQueuedAsset(id);
    return assetJobs.get(id).promise;
  }
  const job = {};
  job.promise = new Promise((resolve, reject) => Object.assign(job, { resolve, reject }));
  assetJobs.set(id, job);
  if (priority === "urgent") preloadQueue.unshift({ id, job, priority });
  else preloadQueue.push({ id, job, priority });
  schedulePreloadPump(priority);
  return job.promise;
}

function schedulePreloadPump(priority) {
  if (priority === "urgent" && preloadTimer) {
    clearTimeout(preloadTimer);
    preloadTimer = null;
  }
  if (priority === "idle" && typeof requestIdleCallback === "function") requestIdleCallback(pumpPreloadQueue);
  else queueMicrotask(pumpPreloadQueue);
}

function pumpPreloadQueue() {
  while (activePreloads < MAX_CONCURRENT_PRELOADS && preloadQueue.length) {
    const next = preloadQueue[0];
    const readyAt = next.priority === "idle" ? lastReaderInputAt + PREFETCH_IDLE_MS : 0;
    const wait = readyAt - performance.now();
    if (wait > 0) {
      if (!preloadTimer) {
        preloadTimer = setTimeout(() => {
          preloadTimer = null;
          schedulePreloadPump("idle");
        }, Math.max(60, wait));
      }
      return;
    }
    const { id, job } = preloadQueue.shift();
    activePreloads += 1;
    recordAtlasQaEvent("decode-start", {
      id,
      priority: next.priority,
      motion: elements.shell.dataset.atlasMotion || ""
    });
    decodeAsset(id).then(job.resolve, job.reject).finally(() => {
      recordAtlasQaEvent("decode-finish", {
        id,
        priority: next.priority,
        motion: elements.shell.dataset.atlasMotion || ""
      });
      activePreloads -= 1;
      assetJobs.delete(id);
      pumpPreloadQueue();
    });
  }
}

function promoteQueuedAsset(id) {
  const index = preloadQueue.findIndex(entry => entry.id === id);
  if (index < 0) return;
  const [entry] = preloadQueue.splice(index, 1);
  entry.priority = "urgent";
  preloadQueue.unshift(entry);
  schedulePreloadPump("urgent");
}

async function decodeAsset(id) {
  if (assetObjectUrls.has(id)) return;
  const source = readAssetData(id);
  if (!source) throw new Error(`A imagem “${id}” não está disponível no arquivo.`);
  let objectUrl = "";
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Não foi possível materializar a imagem “${id}”.`);
    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await waitForImage(image, id);
    if (!image.naturalWidth || !image.naturalHeight) throw new Error(`A imagem “${id}” não possui dimensões válidas.`);
    if (typeof image.decode === "function") await image.decode();
    assetObjectUrls.set(id, objectUrl);
    // The Blob now owns the binary bytes. Keeping the original base64 string
    // would retain a second, much larger representation for the full reader
    // session and increases GC pressure between camera movements.
    assetData.delete(id);
  } catch (error) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    assetData.delete(id);
    failedAssetIds.add(id);
    throw error;
  }
}

function waitForImage(image, id) {
  if (image.complete) return image.naturalWidth ? Promise.resolve() : Promise.reject(new Error(`Não foi possível decodificar a imagem “${id}”.`));
  return new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", () => reject(new Error(`Não foi possível decodificar a imagem “${id}”.`)), { once: true });
  });
}

function readAssetData(id) {
  if (!id) return "";
  if (assetData.has(id)) return assetData.get(id);
  const asset = assetMetadata.get(id);
  if (!asset) return "";
  const sourceNode = document.querySelector(`#atlas-embed-asset-${asset.slot}`);
  const source = sourceNode?.textContent || "";
  sourceNode?.remove();
  if (!source || (asset.digest && fnv1a32(source) !== asset.digest)) {
    failedAssetIds.add(id);
    return "";
  }
  assetData.set(id, source);
  return source;
}

function assetUrl(id) {
  const requested = activeNodeVariants.get(id) || payload.publication?.assetVariants?.[id]?.overview || id;
  return directAssetUrl(requested) || fallbackAssetUrl(id);
}

function directAssetUrl(id) {
  return assetObjectUrls.get(id) || "";
}

function fallbackAssetUrl(sourceAssetId) {
  const variants = payload.publication?.assetVariants?.[sourceAssetId] || {};
  for (const rendition of ["overview", "focus", "card", "master"]) {
    const source = assetObjectUrls.get(variants[rendition]);
    if (source) return source;
  }
  return "";
}

function releaseAssetObjectUrls() {
  for (const url of assetObjectUrls.values()) URL.revokeObjectURL(url);
  assetObjectUrls.clear();
}

function requestNavigation(direction, source = "control") {
  if (!controller) return;
  const state = controller.state;
  if ((direction === "next" && state.index >= state.total - 1) || (direction === "previous" && state.index <= 0)) return;
  pendingInput = { at: performance.now(), source, direction, sequence: Number(elements.shell.dataset.atlasInputSequence || 0) + 1 };
  recordAtlasQaEvent("input", { source, direction, sequence: pendingInput.sequence });
  lastReaderInputAt = pendingInput.at;
  elements.shell.dataset.atlasInputSequence = String(pendingInput.sequence);
  elements.shell.dataset.atlasInputSource = source;
  elements.shell.dataset.atlasMotion = "interrupted";
  cancelAtlasMotion();
  if (direction === "next") controller.next();
  else controller.previous();
}

function cancelAtlasMotion() {
  cameraGeneration += 1;
  if (cameraRaf) cancelAnimationFrame(cameraRaf);
  cameraRaf = null;
  engine?.cy?.stop?.(true, false);
}

function animateViewport(target, motion, onSettled) {
  animateViewportSequence([{ target, motion }], onSettled);
}

function animateViewportSequence(steps, onSettled) {
  const cy = engine?.cy;
  if (!cy) return;
  const alreadyInterrupted = elements.shell.dataset.atlasMotion === "interrupted";
  if (!alreadyInterrupted) cancelAtlasMotion();
  const generation = cameraGeneration;
  let index = 0;
  let previousStepCompletedAt = null;
  const finishSequence = () => {
    if (generation !== cameraGeneration || !engine?.cy) return;
    elements.shell.dataset.atlasMotion = "settling";
    requestAnimationFrame(() => {
      if (generation !== cameraGeneration) return;
      requestAnimationFrame(() => {
        if (generation === cameraGeneration) onSettled?.();
      });
    });
  };
  const runNext = () => {
    if (generation !== cameraGeneration || !engine?.cy) return;
    const step = steps[index++];
    if (!step) {
      finishSequence();
      return;
    }
    if (index === 1 && pendingInput) elements.shell.dataset.atlasInputToMotionMs = String(Math.round(performance.now() - pendingInput.at));
    if (previousStepCompletedAt !== null) elements.shell.dataset.atlasPhaseGapMs = String(Math.round(performance.now() - previousStepCompletedAt));
    step.onStart?.();
    const duration = Math.max(0, Number(step.motion?.duration) || 0);
    const current = { zoom: cy.zoom(), pan: cy.pan() };
    if (!duration || sameViewport(current, step.target)) {
      cy.viewport(step.target);
      runNext();
      return;
    }
    elements.shell.dataset.atlasMotion = "moving";
    cy.animate({
      zoom: step.target.zoom,
      pan: step.target.pan
    }, {
      duration,
      easing: step.motion?.easing || "ease-in-out-cubic",
      complete: () => {
        previousStepCompletedAt = performance.now();
        runNext();
      }
    });
  };
  runNext();
}

function sameViewport(left, right) {
  return Math.abs(Number(left?.zoom || 0) - Number(right?.zoom || 0)) < .0005 &&
    Math.abs(Number(left?.pan?.x || 0) - Number(right?.pan?.x || 0)) < .5 &&
    Math.abs(Number(left?.pan?.y || 0) - Number(right?.pan?.y || 0)) < .5;
}

function renderRelationMeta(plan) {
  const meta = elements.relationMeta;
  if (!meta) return;
  meta.replaceChildren();
  meta.hidden = true;
  if (plan.focus?.kind !== "edge" || plan.edgeIds?.length !== 1) return;
  const edge = engine?.model?.edges?.find(item => item.id === plan.edgeIds[0]);
  const source = engine?.model?.nodes?.find(item => item.id === edge?.source);
  const target = engine?.model?.nodes?.find(item => item.id === edge?.target);
  if (!edge || !source || !target) return;
  const positive = edge.targetSign === "+" || edge.targetSign === "＋" || (!edge.targetSign && edge.sourceSign !== "−");
  const sign = document.createElement("b");
  sign.textContent = positive ? "↑" : "↓";
  sign.setAttribute("aria-label", positive ? "Aumenta" : "Diminui");
  const label = document.createElement("span");
  label.textContent = `${singleLineLabel(source.label)} → ${singleLineLabel(target.label)}`;
  meta.append(sign, label);
  meta.hidden = false;
}

function scheduleContextualCardPosition({ reselect = false } = {}) {
  if (!currentFrame || !engine || elements.poster.hidden === false) {
    elements.shell.dataset.atlasCardPosition = "deferred";
    return;
  }
  if (tooltipRaf) return;
  elements.shell.dataset.atlasCardPosition = "queued";
  tooltipRaf = requestAnimationFrame(() => {
    tooltipRaf = null;
    positionContextualCard(currentFrame, { reselect });
  });
}

function positionContextualCard(frame, { reselect = false } = {}) {
  if (!engine?.cy || !elements.card || !usesContextualPresentation(presentationStyle)) {
    elements.shell.dataset.atlasCardPosition = "unavailable";
    return;
  }
  elements.shell.dataset.atlasCardPosition = "measuring";
  const geometryKey = `${viewportRevision}:${frameKeyFor(frame)}:${Math.round(elements.graph.clientWidth)}x${Math.round(elements.graph.clientHeight)}`;
  if (reselect || tooltipGeometryState?.key !== geometryKey) {
    const stageRect = elements.graph.parentElement?.getBoundingClientRect?.();
    const cardRect = elements.card.getBoundingClientRect();
    const canvasRect = elements.graph.getBoundingClientRect();
    if (!stageRect || stageRect.width <= 0 || stageRect.height <= 0 || !cardRect.width || !cardRect.height) return;
    tooltipGeometryState = {
      key: geometryKey,
      stageRect: { width: stageRect.width, height: stageRect.height },
      cardRect: {
        x: cardRect.left - stageRect.left,
        y: cardRect.top - stageRect.top,
        width: cardRect.width,
        height: cardRect.height
      },
      canvasOffset: { x: canvasRect.left - stageRect.left, y: canvasRect.top - stageRect.top }
    };
  }
  const { stageRect, cardRect, canvasOffset } = tooltipGeometryState;
  if (!stageRect || stageRect.width <= 0 || stageRect.height <= 0 || !cardRect.width || !cardRect.height) return;
  const plan = resolveCameraPlan(frame, engine.model);
  const mode = presentationConnectorMode(presentationStyle, plan);
  const anchor = mode === "tethered" ? contextualAnchor(plan, canvasOffset) : null;
  const frameKey = frameKeyFor(frame);
  if (tooltipFrameKey !== frameKey) {
    tooltipFrameKey = frameKey;
    tooltipPlacementState = null;
    elements.connector.replaceChildren();
  }
  if (stageRect.width <= 840) {
    // A compact embed uses a stable bottom sheet rather than letting a
    // discrete placement search jump the card around the map. Exact node and
    // edge focuses still retain their semantic tether, terminating at the
    // nearest point along the sheet's top edge.
    elements.card.style.removeProperty("left");
    elements.card.style.removeProperty("right");
    elements.card.style.removeProperty("top");
    elements.card.style.removeProperty("bottom");
    const connector = anchor ? {
      from: anchor,
      to: {
        x: Math.max(cardRect.x + 28, Math.min(cardRect.x + cardRect.width - 28, anchor.x)),
        y: cardRect.y
      }
    } : null;
    elements.card.dataset.anchor = connector ? "top" : "parked";
    elements.card.dataset.cardSide = "bottom";
    renderContextualConnector(connector, stageRect);
    elements.shell.dataset.atlasCardPosition = connector ? "tethered" : "parked";
    return;
  }
  const side = atlasCardSide(plan);
  const bounds = { x: 0, y: 0, width: stageRect.width, height: stageRect.height };
  const layoutKey = `${frameKey}:${mode}:${side}:${Math.round(cardRect.width)}:${Math.round(cardRect.height)}:${Math.round(stageRect.width)}:${Math.round(stageRect.height)}`;
  if (reselect || tooltipPlacementState?.key !== layoutKey) {
    const placement = chooseTooltipPlacement({
      mode,
      bounds,
      width: cardRect.width,
      height: cardRect.height,
      anchor,
      obstacles: contextualObstacles(plan, canvasOffset),
      chrome: atlasSideChrome(stageRect, side),
      margin: 20,
      grid: 26,
      gap: 28
    });
    tooltipPlacementState = createTooltipTrackingState({
      key: layoutKey,
      mode,
      placement,
      anchor,
      width: cardRect.width,
      height: cardRect.height,
      bounds,
      margin: 20
    });
  }
  const placement = trackTooltipPlacement({
    state: tooltipPlacementState,
    bounds,
    width: cardRect.width,
    height: cardRect.height,
    anchor,
    margin: 20,
    followAnchor: presentationStyle !== "atlas-editorial"
  });
  if (!placement) return;
  const nextLeft = `${placement.x}px`;
  const nextTop = `${placement.y}px`;
  if (elements.card.style.left !== nextLeft) elements.card.style.left = nextLeft;
  elements.card.style.right = "auto";
  if (elements.card.style.top !== nextTop) elements.card.style.top = nextTop;
  elements.card.style.bottom = "auto";
  elements.card.dataset.anchor = placement.connector ? (placement.connector.from.x < placement.x ? "left" : "right") : "parked";
  elements.card.dataset.cardSide = side || "free";
  renderContextualConnector(placement.connector, stageRect);
  elements.shell.dataset.atlasCardPosition = placement.connector ? "tethered" : "parked";
}

function atlasCardSide(plan) {
  const key = frameKeyFor(currentFrame || {});
  if (atlasCardSideState?.key === key) return atlasCardSideState.side;
  let side = "right";
  if (plan.mode === "fit-map") side = "left";
  else if (plan.mode === "split") side = "right";
  else {
    const focused = [...new Set([...(plan.nodeIds || []), ...(plan.edgeIds || [])])]
      .reduce((collection, id) => collection.union(engine?.cy?.getElementById(id)), engine?.cy?.collection());
    if (focused?.length) {
      const mapBox = engine.cy.elements(":visible").renderedBoundingBox({ includeLabels: true });
      const focusBox = focused.renderedBoundingBox({ includeLabels: true });
      side = focusBox.x1 + focusBox.w / 2 <= mapBox.x1 + mapBox.w / 2 ? "right" : "left";
    }
  }
  atlasCardSideState = { key, side };
  return side;
}

function atlasSideChrome(stageRect, side) {
  if (!side || stageRect.width < 980) return [];
  const reserved = Math.min(470, stageRect.width * 0.44);
  return side === "right"
    ? [{ type: "rect", x: 0, y: 0, width: stageRect.width - reserved, height: stageRect.height }]
    : [{ type: "rect", x: reserved, y: 0, width: stageRect.width - reserved, height: stageRect.height }];
}

function contextualAnchor(plan, canvasOffset) {
  if (plan.focus?.kind === "node" && plan.nodeIds?.length === 1) return canvasPoint(engine.cy.getElementById(plan.nodeIds[0])?.renderedPosition?.(), canvasOffset);
  if (plan.focus?.kind !== "edge" || plan.edgeIds?.length !== 1) return null;
  const edge = engine.cy.getElementById(plan.edgeIds[0]);
  if (!edge?.length) return null;
  const midpoint = edge.renderedMidpoint?.();
  if (Number.isFinite(midpoint?.x) && Number.isFinite(midpoint?.y)) return canvasPoint(midpoint, canvasOffset);
  const source = edge.renderedSourceEndpoint?.() || edge.source().renderedPosition();
  const target = edge.renderedTargetEndpoint?.() || edge.target().renderedPosition();
  const control = edge.renderedControlPoints?.()?.[0] || { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  return canvasPoint({ x: .25 * source.x + .5 * control.x + .25 * target.x, y: .25 * source.y + .5 * control.y + .25 * target.y }, canvasOffset);
}

function contextualObstacles(plan, canvasOffset) {
  const ids = new Set(plan.nodeIds || []);
  (plan.edgeIds || []).forEach(id => {
    const edge = engine.cy.getElementById(id);
    if (edge?.length) {
      ids.add(edge.source().id());
      ids.add(edge.target().id());
    }
  });
  const obstacles = [...ids].flatMap(id => {
    const node = engine.cy.getElementById(id);
    if (!node?.length) return [];
    const point = canvasPoint(node.renderedPosition(), canvasOffset);
    const box = node.renderedBoundingBox?.();
    const width = Number(box?.w || 0);
    const height = Number(box?.h || 0);
    const radius = Math.max(48, Math.max(width, height || 120) / 2 + 18);
    return [
      { type: "rect", x: point.x - width / 2 - 18, y: point.y - height / 2 - 18, width: width + 36, height: height + 36 },
      { type: "circle", x: point.x, y: point.y, r: radius },
      { type: "rect", x: point.x - 88, y: point.y + radius - 4, width: 176, height: 60 }
    ];
  });
  for (const edgeId of plan.edgeIds || []) {
    for (const point of contextualEdgeSamples(edgeId, canvasOffset)) obstacles.push({ type: "circle", x: point.x, y: point.y, r: 10 });
  }
  return obstacles;
}

function contextualEdgeSamples(edgeId, canvasOffset) {
  const edge = engine.cy?.getElementById(edgeId);
  if (!edge?.length) return [];
  const source = edge.renderedSourceEndpoint?.() || edge.source().renderedPosition();
  const target = edge.renderedTargetEndpoint?.() || edge.target().renderedPosition();
  const control = edge.renderedControlPoints?.()?.[0] || { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  const points = [];
  for (let index = 0; index <= 10; index += 1) {
    const t = index / 10;
    const u = 1 - t;
    points.push(canvasPoint({
      x: u * u * source.x + 2 * u * t * control.x + t * t * target.x,
      y: u * u * source.y + 2 * u * t * control.y + t * t * target.y
    }, canvasOffset));
  }
  return points;
}

function canvasPoint(point, canvasOffset) {
  return { x: Number(point?.x || 0) + canvasOffset.x, y: Number(point?.y || 0) + canvasOffset.y };
}

function renderContextualConnector(connector, stageRect) {
  const svg = elements.connector;
  svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  svg.setAttribute("width", String(stageRect.width));
  svg.setAttribute("height", String(stageRect.height));
  if (!connector) {
    svg.replaceChildren();
    return;
  }
  const ns = "http://www.w3.org/2000/svg";
  let halo = svg.querySelector(".atlas-embed-connector-halo");
  let line = svg.querySelector(".atlas-embed-connector-line");
  let dot = svg.querySelector(".atlas-embed-connector-dot");
  if (!halo || !line || !dot) {
    halo = document.createElementNS(ns, "path");
    halo.setAttribute("class", "atlas-embed-connector-halo");
    line = document.createElementNS(ns, "path");
    line.setAttribute("class", "atlas-embed-connector-line");
    dot = document.createElementNS(ns, "circle");
    dot.setAttribute("class", "atlas-embed-connector-dot");
    dot.setAttribute("r", "4.5");
    svg.replaceChildren(halo, line, dot);
  }
  const dx = connector.to.x - connector.from.x;
  const dy = connector.to.y - connector.from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const bend = Math.min(36, distance * .16);
  const controlX = connector.from.x + dx * .52 - dy / distance * bend;
  const controlY = connector.from.y + dy * .52 + dx / distance * bend;
  const path = `M ${connector.from.x} ${connector.from.y} Q ${controlX} ${controlY} ${connector.to.x} ${connector.to.y}`;
  halo.setAttribute("d", path);
  line.setAttribute("d", path);
  dot.setAttribute("cx", String(connector.from.x));
  dot.setAttribute("cy", String(connector.from.y));
}

function startStoryFlow(flow = {}) {
  stopStoryFlow();
  storyFlowDirection = flow?.direction === "reverse" || flow?.direction === "backward" ? 1 : -1;
  elements.shell.dataset.atlasFlow = storyFlowDirection > 0 ? "reverse" : "forward";
  elements.shell.dataset.atlasFlowRenderer = "cytoscape-dash-offset";
  if (!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches && engine?.cy) {
    const startedAt = performance.now();
    const tick = now => {
      const elapsed = now - startedAt;
      const offset = storyFlowDirection * ((elapsed / 18) % 32);
      engine.cy.edges(".story-current").style("line-dash-offset", offset);
      storyFlowRaf = requestAnimationFrame(tick);
    };
    storyFlowRaf = requestAnimationFrame(tick);
  }
  buildFocusMotionOverlay();
}

function stopStoryFlow() {
  if (storyFlowRaf) cancelAnimationFrame(storyFlowRaf);
  storyFlowRaf = null;
  engine?.cy?.edges().removeStyle("line-dash-offset");
  delete elements.shell.dataset.atlasFlow;
  delete elements.shell.dataset.atlasFlowRenderer;
  focusMotionFrameKey = null;
  elements.focusMotion?.replaceChildren();
}

function buildFocusMotionOverlay() {
  const svg = elements.focusMotion;
  if (!svg || !engine?.cy || globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
  const key = frameKeyFor(currentFrame || {});
  const ns = "http://www.w3.org/2000/svg";
  const fragment = document.createDocumentFragment();
  for (const node of engine.cy.nodes(".story-current-node")) {
    const pulse = document.createElementNS(ns, "circle");
    pulse.setAttribute("class", "atlas-embed-focus-pulse");
    pulse.dataset.nodeId = node.id();
    fragment.append(pulse);
  }
  svg.replaceChildren(fragment);
  focusMotionFrameKey = key;
  updateFocusMotionOverlay();
}

function updateFocusMotionOverlay() {
  const svg = elements.focusMotion;
  if (!svg || !engine?.cy || !focusMotionFrameKey || focusMotionFrameKey !== frameKeyFor(currentFrame || {})) return;
  const stageRect = elements.graph.parentElement?.getBoundingClientRect?.();
  const canvasRect = elements.graph.getBoundingClientRect();
  if (!stageRect?.width || !stageRect?.height) return;
  const offset = { x: canvasRect.left - stageRect.left, y: canvasRect.top - stageRect.top };
  svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  for (const pulse of svg.querySelectorAll(".atlas-embed-focus-pulse")) {
    const node = engine.cy.getElementById(pulse.dataset.nodeId);
    if (!node?.length) continue;
    const point = canvasPoint(node.renderedPosition(), offset);
    const box = node.renderedBoundingBox({ includeLabels: false });
    pulse.setAttribute("cx", String(point.x));
    pulse.setAttribute("cy", String(point.y));
    pulse.setAttribute("r", String(Math.max(Number(box?.w || 0), Number(box?.h || 0)) / 2 + 16));
  }
}

function restartEditorialCardMotion() {
  if (cardMotionRaf) cancelAnimationFrame(cardMotionRaf);
  cardMotionRaf = null;
  if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
  // The integrated Atlas animates the card once and the body copy once. The
  // title does not get a second opacity animation; stacking both made the
  // embed's text effectively disappear whenever the main thread missed one
  // of the short opening frames.
  elements.card.style.animation = "none";
  elements.cardText.style.animation = "none";
  cardMotionRaf = requestAnimationFrame(() => {
    cardMotionRaf = null;
    elements.card.style.animation = "";
    elements.cardText.style.animation = "";
  });
}

function settleFrame(frame) {
  if (frame !== currentFrame) return;
  const input = pendingInput;
  if (input) {
    const duration = performance.now() - input.at;
    navigationSamples.push(duration);
    if (navigationSamples.length > 60) navigationSamples.shift();
    pendingInput = null;
    elements.shell.dataset.atlasLastInputMs = String(Math.round(duration));
    elements.shell.dataset.atlasNavigationP50 = String(Math.round(percentile(navigationSamples, .5)));
    elements.shell.dataset.atlasNavigationP95 = String(Math.round(percentile(navigationSamples, .95)));
  }
  elements.shell.dataset.atlasMotion = "stable";
  elements.shell.dataset.atlasStableFrame = frameKeyFor(frame);
  recordAtlasQaEvent("stable", { frame: frameKeyFor(frame) });
  if (elements.shell.dataset.atlasPathChoreography === "traverse") elements.shell.dataset.atlasPathChoreography = "complete";
}

function recordAtlasQaRender() {
  if (!atlasQaSession || !engine?.cy || !currentFrame) return;
  const now = performance.now();
  const pan = engine.cy.pan();
  const focusedNodes = engine.cy.nodes(".atlas-focus-node").map(node => {
    const width = Number.parseFloat(node.renderedStyle("width")) || 0;
    const height = Number.parseFloat(node.renderedStyle("height")) || 0;
    return { id: node.id(), width: roundQa(width), height: roundQa(height) };
  });
  atlasQaSession.samples.push({
    t: roundQa(now),
    dt: atlasQaLastRenderAt === null ? 0 : roundQa(now - atlasQaLastRenderAt),
    frame: frameKeyFor(currentFrame),
    motion: elements.shell.dataset.atlasMotion || "",
    zoom: roundQa(engine.cy.zoom()),
    panX: roundQa(pan.x),
    panY: roundQa(pan.y),
    focusedNodes,
    connector: elements.connector.querySelector(".atlas-embed-connector-line")?.getAttribute("d") || ""
  });
  atlasQaLastRenderAt = now;
  if (atlasQaSession.samples.length > 1200) atlasQaSession.samples.splice(0, atlasQaSession.samples.length - 1200);
}

function recordAtlasQaEvent(type, detail = {}) {
  if (!atlasQaSession) return;
  atlasQaSession.events.push({ type, t: roundQa(performance.now()), ...detail });
  if (atlasQaSession.events.length > 200) atlasQaSession.events.shift();
}

function roundQa(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function observeLongTasks() {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        longTaskSamples.push(entry.duration);
        recordAtlasQaEvent("longtask", {
          startTime: roundQa(entry.startTime),
          duration: roundQa(entry.duration),
          motion: elements.shell.dataset.atlasMotion || "",
          frame: currentFrame ? frameKeyFor(currentFrame) : ""
        });
      }
      while (longTaskSamples.length > 60) longTaskSamples.shift();
      elements.shell.dataset.atlasLongTaskCount = String(longTaskSamples.length);
      elements.shell.dataset.atlasLongTaskP95 = String(Math.round(percentile(longTaskSamples, .95)));
    }).observe({ type: "longtask", buffered: true });
  } catch {}
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

function frameKeyFor(frame) {
  return frame?.id || `${frame?.scene?.id || frame?.sceneId || "scene"}:${frame?.beat?.id || frame?.beatId || "beat"}`;
}

function singleLineLabel(label = "") {
  return String(label).replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
}

function isEditableTarget(target) {
  return target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function afterPaint() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function showFailure(error) {
  console.error(error);
  cancelAtlasMotion();
  stopStoryFlow();
  elements.shell.dataset.state = "failed";
  elements.shell.setAttribute("aria-busy", "false");
  elements.posterText.textContent = "A apresentação não foi iniciada porque o primeiro quadro em alta definição não pôde ser confirmado.";
  elements.status.textContent = error?.message || "Falha ao preparar o primeiro quadro.";
  elements.posterImage.hidden = false;
  elements.play.disabled = true;
  elements.play.textContent = "Apresentação indisponível";
  elements.retry.hidden = false;
  engine?.destroy();
  engine = null;
}

function readPayload() {
  const node = document.querySelector("#loopviewer-atlas-embed-payload");
  if (node?.textContent) {
    const value = JSON.parse(node.textContent);
    node.remove();
    return value;
  }
  return globalThis.__LOOPVIEWER_ATLAS_EMBED__;
}

function hashPayload(value) {
  const copy = { ...value, integrity: undefined };
  return fnv1a32(stableStringify(copy));
}

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableStringify(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}
