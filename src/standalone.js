import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { createCLD } from "./CLDEngine.js";
import { PresentationController } from "./presentation/controller.js";
import { compilePresentation } from "./presentation/compiler.js";
import { normalizePresentation } from "./presentation/schema.js";
import { getCameraViewport, resolveCameraPlan } from "./presentation/camera.js";
import {
  DEFAULT_PRESENTATION_STYLE,
  presentationCameraMotion,
  presentationCameraMaxZoom,
  presentationConnectorMode,
  resolvePresentationStyle,
  usesContextualPresentation
} from "./presentation/styleProfiles.js";
import {
  chooseTooltipPlacement,
  createTooltipTrackingState,
  trackTooltipPlacement
} from "./presentation/tooltipLayout.js";
import { matchaTheme } from "./themes/matcha.js";
import { buildViewLegend, stylePropertiesForEntity } from "./core/views.js";
import { measureCanvasSafeRect } from "./app/canvasViewport.js";

globalThis.cytoscape = cytoscape;
cytoscape.use(coseBilkent);

const payload = globalThis.__TRAMA_DATA__ || globalThis.__LOOPVIEWER_DATA__;
if (!payload?.model && !payload?.loops?.length) throw new Error("Trama standalone model was not found.");
if (payload.version >= 3 && payload.integrity?.digest && payload.integrity.digest !== hashPayload(payload)) {
  throw new Error("Trama export integrity check failed.");
}
const route = new URLSearchParams(globalThis.location?.search || "");
const reducedMotion = payload.presentation?.settings?.reducedMotion === "always" ||
  (payload.presentation?.settings?.reducedMotion !== "never" && globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

const entries = normalizeEntries(payload);
let activeIndex = Math.max(0, entries.findIndex(entry => entry.id === payload.activeLoopId));
if (activeIndex < 0) activeIndex = 0;
let engine = null;
let controller = null;
let currentStory = null;
let currentPresentation = null;
let currentView = null;
let disabledRuleIndexes = new Set();
let storyFlowTimer = null;
let storyFlowDirection = -1;
let presentationStyle = DEFAULT_PRESENTATION_STYLE;
let currentPresentationFrame = null;
let standaloneTooltipRaf = null;
let standaloneConnectorFrameKey = null;
let standaloneTooltipPlacementState = null;
let standaloneAtlasCardSideState = null;

const root = document.querySelector("#trama-standalone, #loopviewer-standalone");
if (payload.embed?.sidebar === false) document.body.classList.add("standalone-no-sidebar");
if (payload.embed?.presentationOnly) document.body.classList.add("standalone-presentation-only");
if (payload.embed?.presentationOnly && payload.embed?.sidebar !== false) document.body.classList.add("standalone-guided");
root.innerHTML = `
  <main class="standalone-shell">
    <header class="standalone-header">
      <div class="standalone-brand">
        <small>Trama export</small>
        <h1></h1>
        <p></p>
      </div>
      <div class="standalone-actions">
        <button type="button" data-action="toggle-sidebar">Fechar painel</button>
        <button type="button" data-action="present">Apresentar</button>
        <button type="button" data-action="fit">Ajustar</button>
      </div>
    </header>
    <section class="standalone-stage">
      <aside class="standalone-sidebar">
        <section class="standalone-section">
          <div class="standalone-section-title">Mapa ativo</div>
          <select class="standalone-loop-select" aria-label="Selecionar mapa"></select>
        </section>
        <section class="standalone-section standalone-overview">
          <small class="standalone-eyebrow"></small>
          <h2></h2>
          <div class="standalone-markdown"></div>
          <div class="standalone-metrics"></div>
        </section>
        <section class="standalone-section standalone-inspector">
          <div class="standalone-tabs">
            <button type="button" class="active" data-tab="relation">Relação</button>
            <button type="button" data-tab="loops">Loops R/B</button>
            <button type="button" data-tab="story">Apresentação</button>
          </div>
          <div data-pane="relation"></div>
          <div data-pane="loops" hidden></div>
          <div data-pane="story" hidden></div>
        </section>
      </aside>
      <div class="standalone-map">
        <div id="standalone-graph"></div>
        <p class="standalone-empty" role="status" hidden>Este mapa ainda não possui variáveis ou relações.</p>
        <div class="standalone-view-controls" hidden></div>
        <div class="standalone-view-legend" hidden></div>
        <svg class="standalone-story-connector" aria-hidden="true"></svg>
        <aside class="standalone-story" hidden>
          <div class="standalone-progress"></div>
          <small>Apresentação guiada</small>
          <h2></h2>
          <p></p>
          <img class="standalone-story-image" alt="" hidden>
          <div>
            <button data-story="previous">Anterior</button>
            <button data-story="playback" aria-pressed="false" aria-label="Reproduzir apresentação" title="Reproduzir apresentação">Reproduzir</button>
            <button data-story="next">Próximo</button>
            <button data-story="explore">Explorar mapa</button>
            <button data-story="resume" hidden>Retomar história</button>
            <button data-story="close">Fechar</button>
          </div>
        </aside>
      </div>
    </section>
  </main>`;

const elements = {
  shell: root.querySelector(".standalone-shell"),
  projectTitle: root.querySelector(".standalone-header h1"),
  projectSubtitle: root.querySelector(".standalone-header p"),
  sidebar: root.querySelector(".standalone-sidebar"),
  toggleSidebar: root.querySelector('[data-action="toggle-sidebar"]'),
  loopSelect: root.querySelector(".standalone-loop-select"),
  eyebrow: root.querySelector(".standalone-eyebrow"),
  title: root.querySelector(".standalone-overview h2"),
  markdown: root.querySelector(".standalone-markdown"),
  metrics: root.querySelector(".standalone-metrics"),
  relationPane: root.querySelector('[data-pane="relation"]'),
  loopsPane: root.querySelector('[data-pane="loops"]'),
  storyPane: root.querySelector('[data-pane="story"]'),
  storyCard: root.querySelector(".standalone-story"),
  storyConnector: root.querySelector(".standalone-story-connector"),
  viewControls: root.querySelector(".standalone-view-controls"),
  viewLegend: root.querySelector(".standalone-view-legend")
};

if (globalThis.matchMedia?.("(max-width: 820px)").matches || payload.embed?.presentationOnly) {
  elements.shell.classList.add("sidebar-hidden");
  elements.toggleSidebar.textContent = "Informações do mapa";
}

function standaloneSafeRect() {
  return measureCanvasSafeRect({
    canvas: engine?.canvas,
    overlays: [elements.viewControls, elements.viewLegend, ...(presentationStyle === "lower-third" ? [elements.storyCard] : [])],
    sideOverlays: presentationStyle === "atlas-editorial" ? [elements.storyCard] : []
  });
}

function fitStandalone(options = {}) {
  if (!engine?.cy) return;
  engine.cy.resize();
  engine.fit({ ...options, safeRect: standaloneSafeRect() });
}

elements.projectTitle.textContent = payload.project?.title || "Trama";
elements.projectSubtitle.textContent = payload.project?.description_md || "Visualização exportada";

entries.forEach((entry, index) => {
  const option = document.createElement("option");
  option.value = String(index);
  option.textContent = entry.title || entry.model.title || entry.id;
  elements.loopSelect.append(option);
});
elements.loopSelect.value = String(activeIndex);
elements.loopSelect.disabled = entries.length <= 1;

elements.loopSelect.addEventListener("change", () => selectEntry(Number(elements.loopSelect.value)));
elements.toggleSidebar.addEventListener("click", toggleSidebar);
root.querySelector('[data-action="fit"]').addEventListener("click", () => fitStandalone({ padding: 70, duration: 220 }));
root.querySelector('[data-action="present"]').addEventListener("click", () => startStory());
root.querySelector('[data-story="previous"]').addEventListener("click", () => controller?.previous());
root.querySelector('[data-story="playback"]').addEventListener("click", () => controller?.toggleContinuousPlay());
root.querySelector('[data-story="next"]').addEventListener("click", () => controller?.next());
root.querySelector('[data-story="explore"]').addEventListener("click", () => {
  controller?.explore();
  engine?.clearFocus();
  root.querySelector('[data-story="explore"]').hidden = true;
  root.querySelector('[data-story="resume"]').hidden = false;
});
root.querySelector('[data-story="resume"]').addEventListener("click", () => {
  controller?.resumeStory();
  root.querySelector('[data-story="explore"]').hidden = false;
  root.querySelector('[data-story="resume"]').hidden = true;
});
root.querySelector('[data-story="close"]').addEventListener("click", () => controller?.stop());
root.querySelectorAll("[data-tab]").forEach(button =>
  button.addEventListener("click", () => selectTab(button.dataset.tab)));
document.addEventListener("keydown", event => {
  if (!controller?.current?.() || elements.storyCard.hidden) return;
  if (event.key === "ArrowRight") {
    event.preventDefault();
    controller.next();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    controller.previous();
  } else if (event.key === "Escape") {
    event.preventDefault();
    controller.stop();
  }
});

selectEntry(activeIndex, { first: true });
if (route.get("mode") === "presentation" || payload.embed?.presentationOnly) startStory(routeIndex());
emitEmbed("ready", { version: payload.version, presentationId: currentPresentation?.id || null });

window.addEventListener("message", event => {
  if (!isAllowedOrigin(event.origin)) return;
  const message = event.data && typeof event.data === "object" ? event.data : {};
  const command = message.type || message.command;
  if (!command) return;
  try {
    if (command === "start") startStory(Number.isFinite(message.index) ? message.index : routeIndex());
    else if (command === "pause") controller?.pause();
    else if (command === "resume") controller?.resume();
    else if (command === "next") controller?.next();
    else if (command === "previous") controller?.previous();
    else if (command === "goTo") controller?.goTo(resolveRouteIndex(message));
    else if (command === "explore") controller?.explore();
    else if (command === "resumeStory") controller?.resumeStory();
    else if (command === "stop" || command === "close") controller?.stop();
  } catch (error) {
    emitEmbed("error", { message: error.message });
  }
});

function normalizeEntries(data) {
  const raw = Array.isArray(data.loops) && data.loops.length
    ? data.loops
    : [{ id: data.model.id, title: data.model.title || data.model.id, summary: data.model.description || "", description_md: data.model.description || "", model: data.model }];
  return raw.map((entry, index) => ({
    id: entry.id || entry.model?.id || `loop-${index + 1}`,
    title: entry.title || entry.label || entry.model?.title || entry.model?.id || `Loop ${index + 1}`,
    summary: entry.summary || entry.model?.description || "",
    description_md: entry.description_md || entry.model?.description || "",
    model: entry.model || entry,
    view: entry.view || null,
    presentation: entry.presentation || (entry.id === data.activeLoopId ? data.presentation : null) || null
  }));
}

function selectEntry(index, { first = false } = {}) {
  activeIndex = Math.max(0, Math.min(entries.length - 1, index));
  const entry = entries[activeIndex];
  elements.loopSelect.value = String(activeIndex);
  controller?.stop();
  currentPresentation = presentationForEntry(entry) || normalizePresentation({
    id: `${entry.id || entry.model.id}-presentation`,
    title: entry.title || entry.model.title || "Apresentação",
    chapters: []
  });
  presentationStyle = resolvePresentationStyle({
    requested: route.get("presentation-style") || route.get("presentationStyle"),
    presentation: currentPresentation
  });
  currentView = entry.view || null;
  disabledRuleIndexes = new Set();
  if (!engine || first) {
    engine = createCLD({
      container: "#standalone-graph",
      model: entry.model,
      theme: matchaTheme,
      view: entry.view,
      editable: false,
      assetResolver: assetId => payload.assets?.find(asset => asset.id === assetId)?.data_url || ""
    });
    engine.setEditing(false);
    engine.addEventListener("edgeactivate", event => renderRelation(event.detail));
    engine.addEventListener("nodeactivate", event => renderNode(event.detail.node.id));
    engine.addEventListener("backgroundactivate", renderRelationPlaceholder);
    engine.cy?.on("render", () => scheduleStandaloneTooltipPosition());
  } else {
    engine.setModel(entry.model, { animate: false });
    engine.setView(entry.view || null);
    engine.setAssetResolver(assetId => payload.assets?.find(asset => asset.id === assetId)?.data_url || "");
    engine.setEditing(false);
  }
  renderOverview(entry);
  renderRelationPlaceholder();
  renderLoops();
  renderStoryList();
  renderViewTools();
  requestAnimationFrame(() => {
    if (currentPresentationFrame && !elements.storyCard.hidden) {
      engine.cy.stop(true, false);
      focusStoryCamera(currentPresentationFrame);
    } else fitStandalone({ padding: 70, duration: 160 });
  });
}

function renderViewTools() {
  elements.viewControls.replaceChildren();
  elements.viewLegend.replaceChildren();
  const interactiveRules = (currentView?.rules || [])
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) => rule.selector?.attribute &&
      (rule.properties?.visible !== undefined || rule.properties?.highlight !== undefined));
  elements.viewControls.hidden = interactiveRules.length === 0;
  interactiveRules.forEach(({ rule, index }) => {
    const label = rule.properties.legend || `${rule.selector.attribute}: ${rule.selector.value}`;
    const button = element("button", "active", label);
    button.type = "button";
    button.setAttribute("aria-pressed", "true");
    button.addEventListener("click", () => {
      if (disabledRuleIndexes.has(index)) disabledRuleIndexes.delete(index);
      else disabledRuleIndexes.add(index);
      const active = !disabledRuleIndexes.has(index);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      engine.setView({
        ...currentView,
        rules: currentView.rules.filter((_item, ruleIndex) => !disabledRuleIndexes.has(ruleIndex))
      });
      renderStandaloneLegend();
    });
    elements.viewControls.append(button);
  });
  renderStandaloneLegend();
}

function renderStandaloneLegend() {
  elements.viewLegend.replaceChildren();
  const activeView = currentView ? {
    ...currentView,
    rules: currentView.rules.filter((_item, index) => !disabledRuleIndexes.has(index))
  } : null;
  const entries = buildViewLegend(activeView);
  elements.viewLegend.hidden = entries.length === 0;
  entries.forEach(entry => {
    const item = element("span", "");
    const swatch = element("i", "");
    swatch.style.background = entry.color;
    item.append(swatch, document.createTextNode(entry.label));
    elements.viewLegend.append(item);
  });
}

function renderOverview(entry) {
  const model = entry.model;
  root.querySelector(".standalone-empty").hidden = model.nodes.length > 0;
  const storyCount = compilePresentation(currentPresentation, { model }).timeline.length;
  const loopCount = model.loops?.length || 0;
  elements.eyebrow.textContent = payload.project?.title || "Trama";
  elements.title.textContent = entry.title || model.title || model.id;
  elements.markdown.innerHTML = renderMarkdown(entry.description_md || model.description || "Este mapa não possui descrição editorial.");
  elements.metrics.textContent = `${model.nodes.length} variáveis · ${model.edges.length} relações · ${loopCount} ciclos · ${storyCount} passos`;
}

function renderRelation({ edge, source, target }) {
  elements.relationPane.replaceChildren(
    element("small", "standalone-pane-eyebrow", "Relação selecionada"),
    element("h3", "", `${source?.label || edge.source} → ${target?.label || edge.target}`),
    element("strong", "", `${edge.sourceSign} → ${edge.targetSign}`),
    element("p", "", edge.description || "Relação sem descrição.")
  );
  selectTab("relation");
}

function renderNode(id) {
  const node = engine.model.nodes.find(item => item.id === id);
  if (!node) return;
  const connected = engine.model.edges.filter(edge => edge.source === id || edge.target === id);
  const list = element("div", "standalone-connected");
  connected.forEach(edge => {
    const otherId = edge.source === id ? edge.target : edge.source;
    const other = engine.model.nodes.find(item => item.id === otherId);
    const button = element("button", "", `${edge.source === id ? "→" : "←"} ${other?.label || otherId}`);
    button.type = "button";
    button.addEventListener("click", () => {
      engine.focusEdge(edge.id);
      renderRelation({
        edge,
        source: engine.model.nodes.find(item => item.id === edge.source),
        target: engine.model.nodes.find(item => item.id === edge.target)
      });
    });
    list.append(button);
  });
  elements.relationPane.replaceChildren(
    element("small", "standalone-pane-eyebrow", "Variável selecionada"),
    element("h3", "", node.label),
    element("p", "", node.description || "Esta variável ainda não possui descrição."),
    element("small", "standalone-pane-eyebrow", "Relações conectadas"),
    list
  );
  selectTab("relation");
}

function renderRelationPlaceholder() {
  elements.relationPane.replaceChildren(
    element("small", "standalone-pane-eyebrow", "Relações"),
    element("h3", "", engine.model.edges.length ? "Selecione uma relação" : "Este mapa ainda não possui relações"),
    element("p", "", engine.model.edges.length ? "Você verá as variáveis conectadas, os sinais nas duas pontas e a explicação causal da relação." : "O mapa compartilhado está vazio. Volte quando seu autor adicionar conteúdo.")
  );
}

function renderLoops() {
  elements.loopsPane.replaceChildren();
  const loops = engine.getLoops({ discover: true, maxLength: 8, maxLoops: 24 });
  if (!loops.length) {
    elements.loopsPane.append(element("p", "", "Nenhum loop encontrado neste mapa."));
    return;
  }
  const labels = new Map(engine.model.nodes.map(node => [node.id, node.label]));
  loops.forEach(loop => {
    const visual = stylePropertiesForEntity(currentView, "loop", loop);
    if (visual.visible === false || visual.visible === "false") return;
    const button = element("button", `standalone-loop ${loop.type}`);
    button.type = "button";
    button.append(
      element("strong", "", loop.label || loop.id),
      element("span", "", loop.nodeIds.map(id => labels.get(id) || id).join(" → ")),
      element("small", "", loop.type === "reinforcing" ? "Feedback positivo" : "Feedback negativo")
    );
    if (visual["badge-fill"] || visual.fill) button.style.background = visual["badge-fill"] || visual.fill;
    if (visual["badge-color"] || visual.color) button.style.color = visual["badge-color"] || visual.color;
    button.addEventListener("click", () => {
      engine.focusLoop(loop.id);
      selectTab("loops");
    });
    elements.loopsPane.append(button);
  });
}

function renderStoryList() {
  elements.storyPane.replaceChildren();
  const compiled = compilePresentation(currentPresentation, { model: engine.model });
  if (!compiled.timeline.length) {
    elements.storyPane.append(element("p", "", "Este mapa exportado ainda não possui apresentação."));
    return;
  }
  elements.storyPane.append(element("p", "", `${compiled.timeline.length} beats disponíveis. Use Apresentar ou as setas do teclado.`));
  compiled.timeline.forEach((frame, index) => {
    const button = element("button", "standalone-step", `${index + 1}. ${frame.beat.title || frame.scene.title}`);
    button.type = "button";
    button.addEventListener("click", () => startStory(index));
    elements.storyPane.append(button);
  });
}

function selectTab(name) {
  root.querySelectorAll("[data-tab]").forEach(button =>
    button.classList.toggle("active", button.dataset.tab === name));
  elements.relationPane.hidden = name !== "relation";
  elements.loopsPane.hidden = name !== "loops";
  elements.storyPane.hidden = name !== "story";
}

function startStory(index = 0) {
  const startIndex = Number.isFinite(index) ? index : routeIndex();
  const compiled = compilePresentation(currentPresentation, {
    model: engine.model,
    views: currentView ? [currentView] : [],
    assets: payload.assets || []
  });
  if (!compiled.timeline.length || compiled.errors.length) {
    selectTab("story");
    return;
  }
  controller?.stop();
  presentationStyle = resolvePresentationStyle({
    requested: route.get("presentation-style") || route.get("presentationStyle"),
    presentation: currentPresentation
  });
  root.dataset.presentationStyle = presentationStyle;
  controller = new PresentationController({
    presentation: currentPresentation,
    context: { model: engine.model, views: currentView ? [currentView] : [], assets: payload.assets || [] },
    initialIndex: startIndex,
    compiled: payload.compiled?.presentation?.id === currentPresentation?.id ? payload.compiled : null
  });
  controller.addEventListener("beatchange", event => {
    const { frame, state } = event.detail;
    const { index, total } = state;
    const hasPrevious = index > 0;
    const hasNext = index < total - 1;
    const step = frame.beat;
    const scene = frame.scene;
    currentPresentationFrame = frame;
    elements.storyCard.hidden = false;
    elements.storyCard.dataset.presentationStyle = presentationStyle;
    elements.storyCard.querySelector("h2").textContent = step.title || scene.title;
    elements.storyCard.querySelector("p").textContent = step.narrationMd || scene.content.bodyMd || "";
    elements.storyCard.dataset.sceneType = scene.type || "stage";
    elements.storyCard.dataset.transition = frame.transition?.type || scene.transition?.type || "dissolve";
    const cameraPlan = resolveCameraPlan(frame, engine.model);
    elements.storyCard.dataset.cameraMode = cameraPlan.mode || "fit-map";
    elements.storyCard.dataset.cameraDuration = String(presentationCameraMotion(presentationStyle, cameraPlan, { reduced: reducedMotion }).duration);
    const sceneVisual = stylePropertiesForEntity(currentView, "scene", scene);
    elements.storyCard.style.background = sceneVisual.fill || sceneVisual.background || "";
    elements.storyCard.style.color = sceneVisual.color || "";
    if (!reducedMotion) {
      elements.storyCard.style.animation = "none";
      requestAnimationFrame(() => { elements.storyCard.style.animation = ""; });
    }
    const storyImage = elements.storyCard.querySelector(".standalone-story-image");
    const imageSource = resolveSceneImage(frame);
    storyImage.hidden = !imageSource;
    if (imageSource) {
      storyImage.src = imageSource;
      storyImage.alt = scene.content.altText || step.title || "Imagem da apresentação";
    } else {
      storyImage.removeAttribute("src");
    }
    elements.storyCard.querySelector('[data-story="previous"]').disabled = !hasPrevious;
    elements.storyCard.querySelector('[data-story="next"]').disabled = !hasNext;
    elements.storyCard.querySelector('[data-story="next"]').textContent = hasNext ? "Próximo" : "Fim";
    elements.storyCard.querySelector(".standalone-progress").style.setProperty(
      "--progress", `${((index + 1) / total) * 100}%`);
    elements.storyCard.querySelector(".standalone-progress").dataset.progress = `${index + 1}/${total}`;
    positionStandaloneTooltip(frame);
    persistResume(index, frame);
    updateRoute(frame);
    emitEmbed("beatchange", { index, total, sceneId: frame.sceneId, beatId: frame.beatId, status: state.status });
    applyStandaloneFocus(frame);
    startStandaloneStoryFlow(frame.stage?.flow || frame.beat?.delta?.flow || {});
    focusStoryCamera(frame);
    applyReveal(frame);
  });
  controller.addEventListener("stop", () => {
    stopStandaloneStoryFlow();
    elements.storyCard.hidden = true;
    clearStandaloneTooltip();
    currentPresentationFrame = null;
    root.querySelector('[data-story="explore"]').hidden = false;
    root.querySelector('[data-story="resume"]').hidden = true;
    engine.clearFocus();
    engine.cy?.elements().removeClass("faded focused story-current story-current-node story-background story-hidden story-ghost");
    emitEmbed("stop", {});
  });
  controller.addEventListener("statechange", event => {
    const { state } = event.detail;
    root.querySelector('[data-story="explore"]').hidden = state.status === "exploring";
    root.querySelector('[data-story="resume"]').hidden = state.status !== "exploring";
    updateStandalonePlaybackControl(controller.continuousPlay && state.status === "playing");
    emitEmbed("statechange", { status: state.status, index: state.index, total: state.total });
  });
  controller.addEventListener("playbackchange", event => updateStandalonePlaybackControl(event.detail.playing));
  controller.addEventListener("complete", event => emitEmbed("complete", { index: event.detail.state.index }));
  controller.start(startIndex);
}

function updateStandalonePlaybackControl(playing = false) {
  const button = root.querySelector('[data-story="playback"]');
  if (!button) return;
  button.dataset.playing = String(playing);
  button.setAttribute("aria-pressed", String(playing));
  button.setAttribute("aria-label", playing ? "Pausar apresentação" : "Reproduzir apresentação");
  button.title = playing ? "Pausar apresentação" : "Reproduzir apresentação";
  button.textContent = playing ? "Pausar" : "Reproduzir";
}

function applyStandaloneFocus(frame) {
  stopStandaloneStoryFlow();
  const focus = frame.focus;
  if (!focus || !engine.cy) return;
  engine.clearFocus();
  engine.cy.elements().removeClass("story-current story-current-node story-background atlas-context atlas-near-context atlas-focus-node atlas-focus-source atlas-focus-target atlas-focus-edge atlas-negative");
  if (focus.nodeIds?.length === 1) engine.focusNode(focus.nodeIds[0]);
  else if (focus.edgeIds?.length === 1) engine.focusEdge(focus.edgeIds[0]);
  else if (focus.loopIds?.length === 1) engine.focusLoop(focus.loopIds[0]);
  else {
    const ids = [...(focus.nodeIds || []), ...(focus.edgeIds || [])];
    engine.cy.elements().removeClass("faded focused story-hidden story-ghost");
    ids.map(id => engine.cy.getElementById(id)).forEach(item => item.addClass("focused"));
  }
  const loopIds = [...(focus.loopIds || []), ...(focus.loopId ? [focus.loopId] : [])];
  const loopEdges = loopIds.flatMap(loopId => (engine.model.loops || []).find(loop => loop.id === loopId)?.edgeIds || []);
  const focusedEdgeIds = [...(focus.edgeIds || []), ...(focus.edgeId ? [focus.edgeId] : []), ...loopEdges];
  const focusedEdges = focusedEdgeIds.map(id => engine.cy.getElementById(id)).filter(item => item.length);
  const atlasEditorial = presentationStyle === "atlas-editorial";
  if (usesContextualPresentation(presentationStyle)) engine.cy.elements().addClass("story-background");
  if (atlasEditorial) engine.cy.elements().addClass("atlas-context");
  focusedEdges.forEach(edge => {
    edge.addClass("story-current");
    edge.removeClass("story-background atlas-context");
    if (atlasEditorial) {
      edge.addClass("atlas-focus-edge");
      const sourceSign = ["-", "−", "–"].includes(String(edge.data("sourceSign") || "+").trim()) ? -1 : 1;
      const targetSign = ["-", "−", "–"].includes(String(edge.data("targetSign") || "+").trim()) ? -1 : 1;
      if (sourceSign !== targetSign) edge.addClass("atlas-negative");
      edge.source().removeClass("atlas-context").addClass("atlas-focus-node atlas-focus-source");
      edge.target().removeClass("atlas-context").addClass("atlas-focus-node atlas-focus-target");
    }
    edge.connectedNodes().removeClass("story-background atlas-context").addClass("story-current-node");
  });
  (focus.nodeIds || []).map(id => engine.cy.getElementById(id)).filter(item => item.length).forEach(node => {
    node.removeClass("story-background atlas-context").addClass(`story-current-node${atlasEditorial ? " atlas-focus-node" : ""}`);
    if (atlasEditorial) node.neighborhood().filter(".atlas-context").addClass("atlas-near-context");
  });
}

function startStandaloneStoryFlow(flow = {}) {
  storyFlowDirection = flow?.direction === "reverse" || flow?.direction === "backward" ? 1 : -1;
  if (storyFlowTimer || !engine?.cy || reducedMotion) return;
  const startedAt = performance.now();
  const tick = now => {
    const elapsed = now - startedAt;
    const offset = storyFlowDirection * ((elapsed / 18) % 32);
    const pulse = (Math.sin(elapsed / 300) + 1) / 2;
    engine.cy.edges(".story-current").style("line-dash-offset", offset);
    engine.cy.nodes(".story-current-node").style({ "underlay-opacity": 0.2 + pulse * 0.1, "underlay-padding": 16 + pulse * 6 });
    storyFlowTimer = requestAnimationFrame(tick);
  };
  storyFlowTimer = requestAnimationFrame(tick);
}

function stopStandaloneStoryFlow() {
  if (storyFlowTimer) cancelAnimationFrame(storyFlowTimer);
  storyFlowTimer = null;
  engine?.cy?.elements().removeStyle("line-dash-offset underlay-opacity underlay-padding");
}

function focusStoryCamera(frame) {
  if (!engine.cy) return;
  const plan = resolveCameraPlan(frame, engine.model);
  const motion = presentationCameraMotion(presentationStyle, plan, { reduced: reducedMotion });
  const animate = (properties, localMotion = motion, complete) => engine.cy.animate(properties, {
    duration: localMotion.duration,
    easing: localMotion.easing,
    ...(complete ? { complete } : {})
  });
  if (plan.mode === "fixed" && Number.isFinite(plan.camera.zoom) && plan.camera.pan) {
    engine.cy.resize();
    animate({ zoom: plan.camera.zoom, pan: plan.camera.pan });
    return;
  }
  engine.cy.resize();
  const safeRect = standaloneSafeRect();
  if (plan.isMap) {
    const mapViewport = safeRect ? getCameraViewport(engine.cy, plan, { padding: plan.camera.padding || 70, rect: safeRect }) : null;
    animate(mapViewport?.viewport ? { zoom: mapViewport.viewport.zoom, pan: mapViewport.viewport.pan } : { fit: { eles: engine.cy.elements(":visible"), padding: plan.camera.padding || 70 } });
    return;
  }
  const result = getCameraViewport(engine.cy, plan, {
    padding: 68,
    rect: safeRect,
    maxZoom: presentationCameraMaxZoom(presentationStyle, plan)
  });
  if (!result?.viewport || !result.collection?.length) {
    animate({ fit: { eles: engine.cy.elements(":visible"), padding: plan.camera.padding || 70 } });
    return;
  }
  if (presentationStyle === "atlas-editorial" && plan.mode === "follow-path" && !reducedMotion && plan.edgeIds.length > 1) {
    const firstPlan = resolveCameraPlan({
      focus: { kind: "edge", edgeId: plan.edgeIds[0] },
      stage: { camera: { mode: "fit-focus", maxZoom: 1.5 } }
    }, engine.model);
    const first = getCameraViewport(engine.cy, firstPlan, { padding: 132, rect: safeRect, maxZoom: 1.5 });
    if (first?.viewport) {
      animate(
        { zoom: first.viewport.zoom, pan: first.viewport.pan },
        { duration: 280, easing: "ease-out-cubic" },
        () => animate({ zoom: result.viewport.zoom, pan: result.viewport.pan }, { duration: 800, easing: "ease-in-out-cubic" })
      );
      return;
    }
  }
  animate({ zoom: result.viewport.zoom, pan: result.viewport.pan });
}

function applyReveal(frame) {
  if (!engine.cy) return;
  const visibility = frame.stage?.visibility || {};
  const ids = [
    ...(visibility.focused || []),
    ...(visibility.emphasized || []),
    ...(visibility.context || []),
    ...(visibility.ghost || [])
  ];
  if (!ids.length) {
    engine.cy.elements().removeClass("faded focused story-hidden story-ghost");
    return;
  }
  const revealed = ids
    .map(id => engine.cy.getElementById(id))
    .reduce((collection, item) => collection.union(item), engine.cy.collection());
  // Keep a stale presentation focus from fading the entire standalone map.
  if (ids.length && !revealed.length) {
    engine.cy.elements().removeClass("faded focused");
    return;
  }
  engine.cy.elements().removeClass("faded");
  if (!usesContextualPresentation(presentationStyle)) engine.cy.elements().addClass("faded");
  revealed.union(revealed.connectedNodes()).removeClass("faded").addClass("focused");
  const ghost = (visibility.ghost || [])
    .map(id => engine.cy.getElementById(id))
    .reduce((collection, item) => collection.union(item), engine.cy.collection());
  ghost.removeClass("faded").addClass("story-ghost");
  (visibility.hidden || []).map(id => engine.cy.getElementById(id)).forEach(item => item.addClass("story-hidden"));
}

function scheduleStandaloneTooltipPosition() {
  if (!usesContextualPresentation(presentationStyle) || !currentPresentationFrame || elements.storyCard.hidden) return;
  if (standaloneTooltipRaf) return;
  standaloneTooltipRaf = requestAnimationFrame(() => {
    standaloneTooltipRaf = null;
    positionStandaloneTooltip(currentPresentationFrame);
  });
}

function clearStandaloneTooltip() {
  if (standaloneTooltipRaf) cancelAnimationFrame(standaloneTooltipRaf);
  standaloneTooltipRaf = null;
  standaloneConnectorFrameKey = null;
  standaloneTooltipPlacementState = null;
  standaloneAtlasCardSideState = null;
  elements.storyConnector?.replaceChildren();
  elements.storyCard?.style.removeProperty("left");
  elements.storyCard?.style.removeProperty("right");
  elements.storyCard?.style.removeProperty("top");
  elements.storyCard?.style.removeProperty("bottom");
  elements.storyCard?.removeAttribute("data-anchor");
}

function positionStandaloneTooltip(frame) {
  if (!usesContextualPresentation(presentationStyle) || !engine?.cy || !elements.storyCard || elements.storyCard.hidden) return;
  const stage = elements.storyCard.parentElement;
  const stageRect = stage?.getBoundingClientRect?.();
  const card = elements.storyCard;
  const width = card.offsetWidth || 380;
  const height = card.offsetHeight || 180;
  if (!stageRect || stageRect.width <= 0 || stageRect.height <= 0) return;
  const plan = resolveCameraPlan(frame, engine.model);
  const mode = presentationConnectorMode(presentationStyle, plan);
  const anchor = mode === "tethered" ? standaloneTooltipAnchor(plan, stageRect) : null;
  const frameKey = `${frame.sceneId || "scene"}:${frame.beatId || "beat"}`;
  if (standaloneConnectorFrameKey !== frameKey) {
    standaloneConnectorFrameKey = frameKey;
    elements.storyConnector?.replaceChildren();
  }
  if (presentationStyle === "atlas-editorial" && standaloneAtlasCardSideState?.frameKey !== frameKey) {
    standaloneAtlasCardSideState = { frameKey, side: standaloneAtlasCardSide(plan) };
  }
  const cardSide = presentationStyle === "atlas-editorial" ? standaloneAtlasCardSideState?.side : null;
  const bounds = { x: 0, y: 0, width: stageRect.width, height: stageRect.height };
  const layoutKey = [frameKey, mode, anchor ? "anchor" : "no-anchor", cardSide || "free", Math.round(width), Math.round(height), Math.round(stageRect.width), Math.round(stageRect.height)].join(":");
  if (standaloneTooltipPlacementState?.key !== layoutKey) {
    const initial = chooseTooltipPlacement({
      mode,
      bounds,
      width,
      height,
      anchor,
      obstacles: standaloneTooltipObstacles(plan, stageRect),
      chrome: standaloneAtlasSideChrome(stageRect, cardSide),
      margin: 22,
      grid: 24,
      gap: 30
    });
    standaloneTooltipPlacementState = createTooltipTrackingState({
      key: layoutKey,
      mode,
      placement: initial,
      anchor,
      width,
      height,
      bounds,
      margin: 22
    });
  }
  const placement = trackTooltipPlacement({
    state: standaloneTooltipPlacementState,
    bounds,
    width,
    height,
    anchor,
    margin: 22,
    followAnchor: presentationStyle !== "atlas-editorial"
  });
  if (!placement) return;
  card.style.left = `${placement.x}px`;
  card.style.right = "auto";
  card.style.top = `${placement.y}px`;
  card.style.bottom = "auto";
  card.dataset.anchor = placement.connector ? (placement.connector.from.x < placement.x ? "left" : "right") : "parked";
  card.dataset.cardSide = cardSide || "free";
  renderStandaloneTooltipConnector(placement.connector, stageRect);
}

function standaloneAtlasCardSide(plan) {
  if (plan.mode === "fit-map") return "left";
  if (plan.mode === "split") return "right";
  const focusedIds = [...new Set([...(plan.nodeIds || []), ...(plan.edgeIds || [])])];
  const focused = focusedIds.reduce((collection, id) => collection.union(engine.cy.getElementById(id)), engine.cy.collection());
  if (!focused.length) return "right";
  const mapBox = engine.cy.elements(":visible").renderedBoundingBox({ includeLabels: true });
  const focusBox = focused.renderedBoundingBox({ includeLabels: true });
  return focusBox.x1 + focusBox.w / 2 <= mapBox.x1 + mapBox.w / 2 ? "right" : "left";
}

function standaloneAtlasSideChrome(stageRect, cardSide) {
  if (presentationStyle !== "atlas-editorial" || !cardSide || stageRect.width < 980) return [];
  const reserved = Math.min(470, stageRect.width * 0.44);
  return cardSide === "right"
    ? [{ type: "rect", x: 0, y: 0, width: stageRect.width - reserved, height: stageRect.height }]
    : [{ type: "rect", x: reserved, y: 0, width: stageRect.width - reserved, height: stageRect.height }];
}

function standaloneTooltipAnchor(plan, stageRect) {
  if (plan.focus?.kind === "node" && plan.nodeIds.length === 1) return standaloneCanvasPoint(engine.cy.getElementById(plan.nodeIds[0])?.renderedPosition?.(), stageRect);
  if (plan.focus?.kind !== "edge" || plan.edgeIds.length !== 1) return null;
  const edge = engine.cy.getElementById(plan.edgeIds[0]);
  if (!edge?.length) return null;
  const renderedMidpoint = edge.renderedMidpoint?.();
  if (Number.isFinite(renderedMidpoint?.x) && Number.isFinite(renderedMidpoint?.y)) {
    return standaloneCanvasPoint(renderedMidpoint, stageRect);
  }
  const source = edge.renderedSourceEndpoint?.() || edge.source().renderedPosition();
  const target = edge.renderedTargetEndpoint?.() || edge.target().renderedPosition();
  const control = edge.renderedControlPoints?.()?.[0] || { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  return standaloneCanvasPoint({
    x: .25 * source.x + .5 * control.x + .25 * target.x,
    y: .25 * source.y + .5 * control.y + .25 * target.y
  }, stageRect);
}

function standaloneTooltipObstacles(plan, stageRect) {
  const ids = new Set(plan.nodeIds || []);
  (plan.edgeIds || []).forEach(id => {
    const edge = engine.cy.getElementById(id);
    if (edge?.length) {
      ids.add(edge.source().id());
      ids.add(edge.target().id());
    }
  });
  return [...ids].flatMap(id => {
    const node = engine.cy.getElementById(id);
    if (!node?.length) return [];
    const point = standaloneCanvasPoint(node.renderedPosition(), stageRect);
    const box = node.renderedBoundingBox?.();
    const margin = 18;
    return [{ type: "circle", x: point.x, y: point.y, r: Math.max(46, Math.max(Number(box?.w || 0), Number(box?.h || 0)) / 2 + margin) }];
  });
}

function standaloneCanvasPoint(point, stageRect) {
  const canvasRect = engine.canvas?.getBoundingClientRect?.();
  return {
    x: Number(point?.x || 0) + (canvasRect?.left || stageRect.left) - stageRect.left,
    y: Number(point?.y || 0) + (canvasRect?.top || stageRect.top) - stageRect.top
  };
}

function renderStandaloneTooltipConnector(connector, stageRect) {
  const svg = elements.storyConnector;
  if (!svg) return;
  svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  svg.setAttribute("width", String(stageRect.width));
  svg.setAttribute("height", String(stageRect.height));
  if (!connector) {
    svg.replaceChildren();
    return;
  }
  const ns = "http://www.w3.org/2000/svg";
  let halo = svg.querySelector(".standalone-story-connector-halo");
  let path = svg.querySelector(".standalone-story-connector-line");
  let dot = svg.querySelector(".standalone-story-connector-dot");
  if (!halo || !path || !dot) {
    halo = document.createElementNS(ns, "path");
    halo.setAttribute("class", "standalone-story-connector-halo");
    path = document.createElementNS(ns, "path");
    path.setAttribute("class", "standalone-story-connector-line");
    dot = document.createElementNS(ns, "circle");
    dot.setAttribute("class", "standalone-story-connector-dot");
    dot.setAttribute("r", "4.5");
    svg.replaceChildren(halo, path, dot);
  }
  const dx = connector.to.x - connector.from.x;
  const dy = connector.to.y - connector.from.y;
  const bend = Math.min(36, Math.hypot(dx, dy) * .16);
  const length = Math.hypot(dx, dy) || 1;
  const controlX = connector.from.x + dx * .52 - dy / length * bend;
  const controlY = connector.from.y + dy * .52 + dx / length * bend;
  const pathData = `M ${connector.from.x} ${connector.from.y} Q ${controlX} ${controlY} ${connector.to.x} ${connector.to.y}`;
  halo.setAttribute("d", pathData);
  path.setAttribute("d", pathData);
  dot.setAttribute("cx", String(connector.from.x));
  dot.setAttribute("cy", String(connector.from.y));
}

function resolveSceneImage(frame) {
  const content = frame.scene?.content || {};
  if (content.src) return content.src;
  if (!content.assetId) return "";
  return payload.assets?.find(asset => asset.id === content.assetId)?.data_url || "";
}

function presentationForEntry(entry) {
  const requested = route.get("presentation");
  if (requested) {
    const record = (payload.presentations || []).find(item => item?.id === requested || item?.presentation?.id === requested);
    if (record) return record.presentation || record;
  }
  return entry.presentation;
}

function routeIndex() {
  const sceneId = route.get("scene");
  const beatId = route.get("beat");
  const resume = route.get("resume") !== "0" ? readResume() : null;
  const target = controller?.compiled?.timeline || (currentPresentation ? compilePresentation(currentPresentation, { model: engine?.model || {} }).timeline : []);
  if (sceneId || beatId) {
    const index = target.findIndex(frame => (!sceneId || frame.sceneId === sceneId) && (!beatId || frame.beatId === beatId));
    if (index >= 0) return index;
  }
  if (resume?.presentationId === currentPresentation?.id && resume.entryId === entries[activeIndex]?.id) return resume.index;
  return 0;
}

function resolveRouteIndex(message) {
  if (Number.isFinite(message.index)) return message.index;
  const timeline = controller?.compiled?.timeline || [];
  return timeline.findIndex(frame => (!message.sceneId || frame.sceneId === message.sceneId) && (!message.beatId || frame.beatId === message.beatId));
}

function updateRoute(frame) {
  if (!globalThis.history?.replaceState) return;
  const params = new URLSearchParams(globalThis.location.search);
  params.set("mode", "presentation");
  params.set("scene", frame.sceneId);
  params.set("beat", frame.beatId);
  globalThis.history.replaceState(null, "", `${globalThis.location.pathname}?${params.toString()}${globalThis.location.hash}`);
}

function persistResume(index, frame) {
  try {
    globalThis.localStorage?.setItem(`trama:resume:${payload.project?.id || payload.project?.title || "project"}`, JSON.stringify({
      index, sceneId: frame.sceneId, beatId: frame.beatId,
      presentationId: currentPresentation?.id, entryId: entries[activeIndex]?.id
    }));
  } catch {}
}

function readResume() {
  try {
    const projectKey = payload.project?.id || payload.project?.title || "project";
    const value = globalThis.localStorage?.getItem(`trama:resume:${projectKey}`)
      || globalThis.localStorage?.getItem(`loopviewer:resume:${projectKey}`);
    return JSON.parse(value || "null");
  } catch { return null; }
}

function isAllowedOrigin(origin) {
  const allowed = payload.embed?.allowedOrigins || [];
  if (allowed.includes("*")) return true;
  if (allowed.length) return allowed.includes(origin);
  return origin === globalThis.location.origin || origin === "null";
}

function emitEmbed(type, detail) {
  if (!globalThis.parent || globalThis.parent === globalThis) return;
  const allowed = payload.embed?.allowedOrigins || [];
  const targetOrigin = allowed.length === 1 && allowed[0] !== "*" ? allowed[0] : "*";
  try { globalThis.parent.postMessage({ source: "trama", type, detail }, targetOrigin); } catch {}
}

function motionDuration(value) {
  return reducedMotion ? 0 : value;
}

function hashPayload(payload) {
  const copy = { ...payload, integrity: undefined };
  const text = stableStringify(copy);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
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

function toggleSidebar() {
  elements.shell.classList.toggle("sidebar-hidden");
  elements.toggleSidebar.textContent = elements.shell.classList.contains("sidebar-hidden")
    ? "Abrir painel"
    : "Fechar painel";
  requestAnimationFrame(() => {
    engine?.cy?.resize();
    engine?.fit({ padding: 70, duration: 180 });
  });
}

function renderMarkdown(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.split(/\n{2,}/).map(block => {
    const escaped = escapeHtml(block.trim());
    if (escaped.startsWith("### ")) return `<h4>${inlineMarkdown(escaped.slice(4))}</h4>`;
    if (escaped.startsWith("## ")) return `<h3>${inlineMarkdown(escaped.slice(3))}</h3>`;
    if (escaped.startsWith("# ")) return `<h3>${inlineMarkdown(escaped.slice(2))}</h3>`;
    if (/^- /.test(escaped)) {
      const items = escaped.split("\n").map(line => line.replace(/^- /, "")).filter(Boolean);
      return `<ul>${items.map(item => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`;
    }
    return `<p>${inlineMarkdown(escaped).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

function inlineMarkdown(value) {
  return value.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}
