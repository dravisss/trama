import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { createCLD, matchaTheme, PresentationController, resolveCameraPlan, getCameraViewport, addNodeToModel, addEdgeToModel, validateModel } from "../src/index.js";
import { createLandingDemo } from "./demo.js";
import { assetUrl, renderAtlas, renderProductStudies, mountChoreography } from "./cinema.js";
import mapSource from "../seeds/trama-atalhos.loop.md";
import storySource from "../seeds/trama-atalhos.story.md";

globalThis.cytoscape = cytoscape;
cytoscape.use(coseBilkent);
document.body.classList.remove("no-js");

const $ = selector => document.querySelector(selector);
const demo = $("#demo");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
let engine;
let controller;
let original;
let draft;
let draftHistory = [];
let draftFuture = [];
let mode = "story";
let ready = false;
let resizeTimer;
let resizeObserver;
let chosenNode = "espera";
let draftTouched = false;
let choreography;
let textAnimation;
let editTool = "select";
let editingNode = false;
let connectionSource = null;
let connectionTarget = null;

function announce(message = "") { $("#demo-status").textContent = message; }
function clone(value) { return structuredClone(value); }
function element(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}
function portrait(node, className = "") {
  if (!node.media?.assetId) return element("span", `node-initial ${className}`, node.label.slice(0, 1));
  const image = element("img", className); image.src = assetUrl(node.media.assetId); image.alt = "";
  return image;
}
function arrowIcon() {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24"); icon.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(icon.namespaceURI, "path"); path.setAttribute("d", "M4 12h15m-6-6 6 6-6 6"); icon.append(path); return icon;
}

function responsiveCopy(model) {
  const copy = clone(model);
  if (innerWidth <= 760) copy.nodes.forEach(node => { node.position.x *= 0.72; });
  return copy;
}

function arrangeReference() {
  if (mode === "edit") return;
  engine.cy.batch(() => original.nodes.forEach(node => engine.cy.getElementById(node.id).position({
    x: node.position.x * (innerWidth <= 760 ? 0.72 : 1), y: node.position.y
  })));
}

function styleGraph() {
  engine.cy.style().append([
    { selector: "node", style: { "font-weight": 500, "border-width": 0.8, "underlay-opacity": 0, "transition-duration": reduceMotion.matches ? "0ms" : "350ms" } },
    { selector: "node.focused", style: { "border-width": 2.5, "border-color": "#436445", "underlay-opacity": 0.08, "underlay-padding": 7 } },
    { selector: "edge", style: { width: 2, "arrow-scale": 1.1, opacity: 0.75, "transition-duration": reduceMotion.matches ? "0ms" : "350ms" } },
    { selector: "edge.focused", style: { width: 2.5, opacity: 1 } },
    { selector: ".faded", style: { opacity: 0.18 } }
  ]).update();
  engine.cy.userZoomingEnabled(false);
  engine.cy.boxSelectionEnabled(false);
  engine.cy.userPanningEnabled(mode !== "story");
}

function fitMap() {
  engine.cy.stop();
  engine.cy.resize();
  arrangeReference();
  engine.fit({ padding: innerWidth <= 760 ? 16 : 26, duration: 0 });
  engine.annotations?.request();
}

function readFrame(frame, animate = true) {
  if (!frame || mode !== "story") return;
  arrangeReference();
  const index = frame.index;
  const changed = demo.dataset.beat !== String(index);
  demo.dataset.beat = String(index);
  $("#step-number").textContent = String(index + 1);
  $("#story-title").textContent = frame.beat.title;
  $("#story-text").textContent = frame.beat.narrationMd;
  if (changed && animate && !reduceMotion.matches) {
    textAnimation?.cancel();
    textAnimation = $(".story-copy").animate([{ opacity: .4, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" });
  }
  $("#previous").disabled = index === 0;
  $("#next").disabled = false;
  $("#next").setAttribute("aria-label", index === 4 ? "Explorar o mapa" : "Próximo passo");
  document.querySelectorAll(".step-dots button").forEach((button, step) => {
    if (step === index) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  const focus = frame.focus;
  if (index === 0) {
    engine.clearFocus();
    engine.cy.getElementById("espera").addClass("focused");
  } else {
    let elements = engine.cy.collection();
    for (const id of [...(focus?.nodeIds || []), ...(focus?.edgeIds || [])]) {
      const element = engine.cy.getElementById(id);
      elements = elements.union(element);
      if (element.isEdge()) elements = elements.union(element.connectedNodes());
    }
    engine.applyFocus(elements);
  }
  $(".map-wrap").dataset.focused = String(index > 0 && index < 4);
  const plan = resolveCameraPlan(frame, engine.model);
  if (innerWidth <= 760) plan.camera.padding = Math.min(plan.camera.padding || 34, 18);
  const target = getCameraViewport(engine.cy, plan, { padding: innerWidth <= 760 ? 25 : 34 });
  if (target?.viewport) {
    engine.cy.stop();
    if (!animate || reduceMotion.matches) engine.cy.viewport(target.viewport);
    else engine.cy.animate(target.viewport, { duration: 650, easing: "ease-out-cubic" });
  }
  engine.annotations?.request();
}

function refreshModelControls() {
  const model = engine.currentEditableModel();
  if (!model.nodes.some(node => node.id === chosenNode)) chosenNode = model.nodes[0].id;
  if (!model.nodes.some(node => node.id === connectionSource)) connectionSource = null;
  if (!model.nodes.some(node => node.id === connectionTarget)) connectionTarget = null;
  renderEditor();
  $("#map-keyboard").replaceChildren(...model.nodes.map(node => {
    const button = element("button", "map-node-target"); button.type = "button";
    button.dataset.node = node.id; button.setAttribute("aria-label", `${mode === "edit" ? "Selecionar" : "Explorar"}: ${node.label}`);
    button.tabIndex = mode === "story" ? -1 : 0;
    button.addEventListener("click", () => activateNode(node.id));
    return button;
  }));
  positionKeyboardTargets();
  $("#relations-list").replaceChildren(...model.edges.map(edge => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button"; button.textContent = edge.description;
    button.addEventListener("click", () => {
      if (mode === "edit") { engine.focusEdge(edge.id); announce(edge.description); }
      else { setMode("explore"); inspectElement(`edge:${edge.id}`); }
    });
    li.append(button); return li;
  }));
  $("#undo").disabled = !engine.history.length;
}

function positionKeyboardTargets() {
  if (!engine) return;
  document.querySelectorAll(".map-node-target").forEach(button => {
    const node = engine.cy.getElementById(button.dataset.node);
    if (!node.length) return;
    const point = node.renderedPosition(), size = Math.max(36, node.renderedWidth());
    Object.assign(button.style, { left: `${point.x}px`, top: `${point.y}px`, width: `${size}px`, height: `${size}px` });
  });
}

function renderEditor() {
  const node = engine.model.nodes.find(node => node.id === chosenNode);
  if (!node) return;
  $("#node-label").value = node.label;
  $("#node-description").value = node.description || "";
  $("#edit-image").hidden = !node.media?.assetId;
  if (node.media?.assetId) $("#edit-image").src = assetUrl(node.media.assetId);
  $("#edit-form").hidden = editTool !== "select" || !editingNode;
}

function neighborButton(node, edge, incoming) {
  const button = element("button", "neighbor-button"); button.type = "button";
  button.append(portrait(node));
  const copy = element("span", "neighbor-copy");
  copy.append(element("small", "", incoming ? "É influenciado por" : "Influencia"), element("strong", "", node.label));
  button.append(copy, arrowIcon());
  button.addEventListener("click", () => inspectElement(`edge:${edge.id}`));
  return button;
}

function inspectElement(value) {
  const colon = value.indexOf(":");
  const kind = value.slice(0, colon), id = value.slice(colon + 1);
  $("#causal-neighbors").replaceChildren();
  $("#relation-path").replaceChildren();
  if (kind === "node") {
    const node = engine.model.nodes.find(item => item.id === id);
    if (!node) return;
    engine.focusNode(id);
    $(".explore-reader h2").textContent = node.label;
    $("#explore-text").textContent = node.description || "Esta variável ainda não tem uma explicação.";
    $("#inspect-image").hidden = !node.media?.assetId;
    if (node.media?.assetId) $("#inspect-image").src = assetUrl(node.media.assetId);
    $(".explore-reader .reader-eyebrow").textContent = "Siga o fio";
    for (const edge of engine.model.edges.filter(item => item.target === id || item.source === id)) {
      const incoming = edge.target === id;
      const neighbor = engine.model.nodes.find(item => item.id === (incoming ? edge.source : edge.target));
      $("#causal-neighbors").append(neighborButton(neighbor, edge, incoming));
    }
  } else if (kind === "edge") {
    const edge = engine.model.edges.find(item => item.id === id);
    if (!edge) return;
    engine.focusEdge(id);
    const source = engine.model.nodes.find(node => node.id === edge.source);
    const target = engine.model.nodes.find(node => node.id === edge.target);
    $(".explore-reader h2").textContent = "Uma coisa leva à outra.";
    $(".explore-reader .reader-eyebrow").textContent = "A relação entre as duas";
    $("#inspect-image").hidden = true;
    $("#explore-text").textContent = edge.description;
    renderConnection($("#relation-path"), source, target);
    for (const [node, label] of [[target, "Siga até"], [source, "Volte para"]]) {
      const button = element("button", "follow-relation"); button.type = "button";
      button.append(element("span", "", `${label} ${node.label.toLocaleLowerCase("pt-BR")}`), arrowIcon());
      button.addEventListener("click", () => inspectElement(`node:${node.id}`)); $("#causal-neighbors").append(button);
    }
  } else { engine.clearFocus(); return; }
  demo.dataset.inspected = value;
  $(".map-wrap").dataset.focused = "true";
}

function renderConnection(container, source, target) {
  container.replaceChildren();
  for (const [index, node] of [source, target].entries()) {
    if (index) container.append(arrowIcon());
    const item = element("div", "connection-node"); item.append(portrait(node), element("span", "", node.label)); container.append(item);
  }
}

function showLoop() {
  setMode("explore");
  engine.focusLoop("r1"); fitMap();
  $(".explore-reader h2").textContent = "Um ciclo que se reforça.";
  $("#explore-text").textContent = original.loops[0].description;
  $("#inspect-image").hidden = true;
  $(".explore-reader .reader-eyebrow").textContent = "De volta ao começo";
  $("#causal-neighbors").replaceChildren(); $("#relation-path").replaceChildren();
  const restart = element("button", "follow-relation", "Começar pelo tempo de espera"); restart.type = "button";
  restart.append(arrowIcon()); restart.addEventListener("click", () => inspectElement("node:espera")); $("#causal-neighbors").append(restart);
  $(".map-wrap").dataset.focused = "false";
}

function setMode(nextMode) {
  if (!ready || !["story", "explore", "edit"].includes(nextMode)) return;
  const previousMode = mode;
  if (previousMode === "edit") {
    draft = clone(engine.currentEditableModel());
    draftHistory = clone(engine.history); draftFuture = clone(engine.future);
  }
  mode = nextMode;
  demo.dataset.mode = mode;
  choreography?.refresh();
  $(".story-reader").hidden = mode !== "story";
  $(".explore-reader").hidden = mode !== "explore";
  $(".edit-reader").hidden = mode !== "edit";
  $("#reset-confirm").hidden = true;
  document.querySelectorAll(".demo-tabs button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
  if (mode === "edit" || previousMode === "edit") {
    if (mode === "edit" && !draftTouched) draft = responsiveCopy(original);
    engine.setModel(mode === "edit" ? clone(draft) : responsiveCopy(original));
    engine.history = mode === "edit" ? clone(draftHistory) : [];
    engine.future = mode === "edit" ? clone(draftFuture) : [];
  }
  engine.setEditing(mode === "edit");
  engine.clearFocus();
  styleGraph();
  refreshModelControls();
  announce();
  $(".map-wrap").dataset.focused = String(mode === "edit");
  $("#graph-help").textContent = mode === "story"
    ? "Siga as relações. O último passo revela o ciclo completo."
    : mode === "explore" ? "Toque nas variáveis ou nas setas para conhecer as relações."
      : "O mapa é sua área de trabalho. Arraste, edite ou conecte as variáveis.";
  if (mode === "story") {
    controller.resumeStory(); readFrame(controller.current(), false);
  } else {
    controller.explore(); fitMap();
    if (mode === "explore") {
      inspectElement("node:espera");
    } else setEditTool("select");
  }
}

function setEditTool(tool) {
  editTool = tool; editingNode = false; connectionSource = null; connectionTarget = null;
  engine.clearFocus();
  $("#edit-form").hidden = true; $("#connect-form").hidden = true;
  $("#add-form").hidden = tool !== "add"; $("#edit-prompt").hidden = tool === "add";
  $("#edit-instruction").textContent = tool === "connect" ? "Toque na variável de onde a relação começa." : "Toque em uma variável para editar. Arraste para reorganizar.";
  document.querySelectorAll("button[data-edit-tool]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.editTool === tool)));
  demo.dataset.editTool = tool;
  if (tool === "add") $("#new-label").focus({ preventScroll: true });
}

function activateNode(id) {
  choreography?.manual();
  if (mode !== "edit") { if (mode === "story") setMode("explore"); inspectElement(`node:${id}`); return; }
  chosenNode = id;
  if (editTool === "connect") {
    if (!connectionSource || connectionTarget) {
      connectionSource = id; connectionTarget = null;
      $("#connect-form").hidden = true; $("#edit-prompt").hidden = false;
      engine.focusNode(id);
      $("#edit-instruction").textContent = `“${engine.model.nodes.find(node => node.id === id).label}” influencia o quê? Toque em outra variável.`;
      announce("Origem escolhida. Agora escolha o destino no mapa.");
    } else if (connectionSource === id) {
      announce("Escolha outra variável para conectar.");
    } else if (engine.model.edges.some(edge => edge.source === connectionSource && edge.target === id)) {
      announce("Essa relação já existe. Escolha outro destino para acrescentar sua leitura.");
    } else {
      connectionTarget = id;
      engine.applyFocus(engine.cy.getElementById(connectionSource).union(engine.cy.getElementById(id)));
      renderConnection($("#connection-preview"), engine.model.nodes.find(node => node.id === connectionSource), engine.model.nodes.find(node => node.id === id));
      $("#edit-prompt").hidden = true; $("#connect-form").hidden = false;
      $("#new-description").value = "";
      announce("Agora indique o sentido da influência e explique a relação.");
    }
  } else {
    if (editTool === "add") setEditTool("select");
    editingNode = true; $("#edit-prompt").hidden = true; renderEditor(); engine.focusNode(id);
  }
}

function nonempty(field, message) {
  field.setCustomValidity(field.value.trim() ? "" : message);
  if (!field.reportValidity()) return false;
  return true;
}

function bindControls() {
  document.querySelectorAll(".demo-tabs button").forEach(button => button.addEventListener("click", () => { choreography?.manual(); setMode(button.dataset.mode); }));
  document.querySelectorAll("[data-start]").forEach(link => link.addEventListener("click", event => {
    if (!ready) return;
    event.preventDefault();
    choreography?.manual();
    if (link.dataset.start === "loop") showLoop();
    else { setMode(link.dataset.start); if (link.dataset.start === "story") controller.start(0); }
    demo.scrollIntoView({ behavior: reduceMotion.matches ? "instant" : "smooth", block: "start" });
    const target = $(".demo-tabs button[aria-pressed='true']");
    target.focus({ preventScroll: true });
  }));
  $("#previous").addEventListener("click", () => { choreography?.manual(); controller.previous(); });
  $("#next").addEventListener("click", () => { choreography?.manual(); controller.state.index === 4 ? setMode("explore") : controller.next(); });
  document.querySelectorAll("[data-tool]").forEach(button => button.addEventListener("click", () => {
    choreography?.manual();
    if (button.dataset.tool === "fit") fitMap();
    else {
      const cy = engine.cy;
      const level = Math.max(cy.minZoom(), Math.min(cy.maxZoom(), cy.zoom() * (button.dataset.tool === "in" ? 1.2 : 1 / 1.2)));
      cy.zoom({ level, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    }
  }));
  $("#show-loop").addEventListener("click", showLoop);
  document.querySelectorAll("button[data-edit-tool]").forEach(button => button.addEventListener("click", () => { setEditTool(button.dataset.editTool); announce(); }));
  $("#cancel-connection").addEventListener("click", () => setEditTool("connect"));
  document.querySelectorAll("input,textarea").forEach(field => field.addEventListener("input", () => field.setCustomValidity("")));
  $("#edit-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!nonempty($("#node-label"), "Dê um nome para a variável.")) return;
    draftTouched = true;
    engine.updateNode(chosenNode, { label: $("#node-label").value.trim(), description: $("#node-description").value.trim() });
    announce("Alteração aplicada à sua cópia. Você pode desfazer quando quiser.");
  });
  $("#add-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!nonempty($("#new-label"), "Dê um nome para a variável.")) return;
    if (engine.model.nodes.length >= 12) { announce("Esta demonstração comporta até 12 variáveis. Baixe seu mapa para continuar no Trama."); return; }
    const before = engine.currentEditableModel();
    draftTouched = true;
    const next = addNodeToModel(before, { label: $("#new-label").value.trim(), position: { x: (before.nodes.length - 6) * 170, y: 0 }, style: { size: 138, fontSize: 18, textMaxWidth: 120, fill: "#efe2c9", borderColor: "#9ca88d", textColor: "#253e30" } });
    const id = next.nodes.at(-1).id;
    chosenNode = id;
    engine.setModel(next, { history: true });
    styleGraph(); fitMap();
    $("#add-form").reset(); setEditTool("connect"); activateNode(id);
    announce("Sua variável está no mapa. Toque em outra para criar uma relação.");
  });
  $("#connect-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!connectionSource || !connectionTarget || !nonempty($("#new-description"), "Explique a relação que você quer acrescentar.")) return;
    draftTouched = true;
    const model = addEdgeToModel(engine.currentEditableModel(), { source: connectionSource, target: connectionTarget, sourceSign: "+", targetSign: $("input[name='polarity']:checked").value, description: $("#new-description").value.trim() });
    engine.setModel(model, { history: true }); styleGraph(); fitMap();
    const edgeId = model.edges.at(-1).id;
    setEditTool("select"); engine.focusEdge(edgeId);
    $("#edit-instruction").textContent = "Uma relação nova, uma hipótese a mais. Continue experimentando ou baixe sua versão.";
    announce("Relação criada na sua cópia. O mapa agora inclui sua hipótese.");
  });
  $("#undo").addEventListener("click", () => { if (engine.undo()) { setEditTool("select"); styleGraph(); refreshModelControls(); fitMap(); announce("Última alteração desfeita."); } });
  $("#reset").addEventListener("click", () => { $("#reset-confirm").hidden = false; $("#confirm-reset").focus(); });
  $("#cancel-reset").addEventListener("click", () => { $("#reset-confirm").hidden = true; $("#reset").focus(); });
  $("#confirm-reset").addEventListener("click", () => {
    draftTouched = false;
    draft = responsiveCopy(original); draftHistory = []; draftFuture = [];
    engine.history = []; engine.future = []; engine.setModel(clone(draft));
    chosenNode = original.nodes[0].id; setEditTool("select"); styleGraph(); refreshModelControls(); fitMap();
    $("#reset-confirm").hidden = true; $("#reset").focus(); announce("Seu mapa voltou ao exemplo original.");
  });
  $("#download").addEventListener("click", () => {
    const model = engine.currentEditableModel();
    if (!validateModel(model).valid) { announce("Não foi possível baixar o mapa. Desfaça a última alteração e tente novamente."); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(model, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "minha-trama.json"; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce("Seu mapa foi preparado para download em JSON.");
  });
  engine.addEventListener("nodeactivate", event => {
    activateNode(event.detail.node.id);
  });
  engine.addEventListener("edgeactivate", event => {
    choreography?.manual();
    if (mode === "edit") announce(event.detail.edge.description);
    else { if (mode === "story") setMode("explore"); inspectElement(`edge:${event.detail.edge.id}`); }
  });
  engine.addEventListener("modelchange", () => refreshModelControls());
  engine.addEventListener("positionchange", () => { if (mode === "edit") draftTouched = true; $("#undo").disabled = !engine.history.length; });
  engine.cy.on("pan zoom position render", positionKeyboardTargets);
  reduceMotion.addEventListener("change", () => { styleGraph(); if (mode === "story") readFrame(controller.current(), false); });
  resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (!ready) return; if (mode === "story") readFrame(controller.current(), false); else fitMap(); }, 120);
  });
  resizeObserver.observe($(".map-wrap"));
}

async function start() {
  try {
    const data = createLandingDemo(mapSource, storySource);
    original = clone(data.model); draft = clone(data.model);
    await Promise.all([document.fonts.load('500 14px "Noto Sans"'), document.fonts.load('500 22px "Noto Serif"')]);
    engine = createCLD({ container: $("#graph"), model: responsiveCopy(original), editable: false, assetResolver: assetUrl, theme: matchaTheme, densityProfile: { minimumSignSize: 9 }, rendererOptions: { pixelRatio: Math.min(devicePixelRatio || 1, 2), userZoomingEnabled: false, boxSelectionEnabled: false } });
    controller = new PresentationController({ compiled: data.compiled, context: { model: original } });
    data.compiled.timeline.forEach(frame => {
      const button = document.createElement("button"); button.type = "button"; button.setAttribute("aria-label", `Passo ${frame.index + 1}: ${frame.beat.title}`);
      button.addEventListener("click", () => { choreography?.manual(); controller.goTo(frame.index); }); $(".step-dots").append(button);
    });
    controller.addEventListener("beatchange", event => readFrame(event.detail.frame));
    bindControls(); styleGraph(); refreshModelControls();
    ready = true;
    $(".map-loading").hidden = true;
    document.querySelectorAll(".demo-tabs button,[data-tool]").forEach(button => button.disabled = false);
    controller.start(0); readFrame(controller.current(), false);
    renderAtlas(original, id => {
      choreography?.manual(); setMode("explore"); inspectElement(`node:${id}`);
      demo.scrollIntoView({ behavior: reduceMotion.matches ? "instant" : "smooth", block: "start" });
      $(".demo-tabs button[data-mode='explore']").focus({ preventScroll: true });
    });
    renderProductStudies(original);
    choreography = mountChoreography({ controller, reduceMotion, onStoryEnter() { setMode("story"); controller.start(0); } });
    demo.dataset.ready = "true";
    // QA observes the public UI and downloaded models; no application database is used.
  } catch (error) {
    engine?.destroy(); ready = false; demo.dataset.ready = "error";
    const loading = $(".map-loading"); loading.hidden = false; loading.textContent = "O mapa não carregou. Você ainda pode ler as relações abaixo.";
    const retry = document.createElement("button"); retry.className = "small-button"; retry.textContent = "Tentar novamente"; retry.type = "button";
    retry.addEventListener("click", () => location.reload()); loading.append(retry);
    $(".accessible-map").open = true;
    console.error("Trama: falha ao iniciar a demonstração.", error);
  }
}

addEventListener("pagehide", event => {
  if (event.persisted) return;
  ready = false; clearTimeout(resizeTimer); resizeObserver?.disconnect(); choreography?.destroy(); textAnimation?.cancel(); controller?.stop(); engine?.destroy();
});
start();
