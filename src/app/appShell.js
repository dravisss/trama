import { applyDesignSystemContext } from "../design-system/runtime.js";

const MODE_COPY = Object.freeze({
  workspace: {
    title: "Projetos",
    subtitle: "Organize os mapas sistêmicos do seu workspace local"
  },
  map: {
    title: "Editor do mapa",
    subtitle: "Edite o canvas, os dados e a fonte Markdown em um só lugar"
  },
  story: {
    title: "Story Studio",
    subtitle: "Transforme o mapa em uma narrativa causal editável"
  },
  present: {
    title: "Apresentar",
    subtitle: "Conduza a história sem perder o contexto do sistema"
  }
});

export function workspaceViewModel({ project = {}, workspace = [], presentations = [], localProjects = [], activeIndex = 0, hydrating = false } = {}) {
  const activePath = project?.path || "";
  const otherProjects = localProjects.filter(item => item?.path && item.path !== activePath);
  return {
    hydrating: Boolean(hydrating),
    project: {
      title: project?.title || "Projeto local",
      description: project?.description_md || "Projeto SQLite local da Trama.",
      path: activePath,
      updatedAt: project?.updatedAt || project?.updated_at || null,
      active: true,
      metrics: {
        maps: workspace.length,
        views: workspace.reduce((sum, entry) => sum + (entry?.views?.length || (entry?.view ? 1 : 0)), 0),
        presentations: presentations.length || workspace.filter(entry => presentationForEntry(entry, presentations)).length
      },
      previewModel: workspace[activeIndex]?.model || workspace[0]?.model || null
    },
    otherProjects: otherProjects.map(item => ({
      title: item.title || fileName(item.path),
      description: item.description_md || item.description || "",
      path: item.path,
      metrics: item.metrics || null,
      updatedAt: item.updatedAt || item.updated_at || null,
      active: false
    })),
    maps: workspace.map((entry, index) => ({
      index,
      id: entry?.id || entry?.model?.id || `map-${index + 1}`,
      title: entry?.label || entry?.model?.title || entry?.model?.id || `Mapa ${index + 1}`,
      summary: entry?.summary || entry?.description_md || entry?.model?.description || "Sem descrição editorial.",
      nodes: entry?.model?.nodes?.length || 0,
      edges: entry?.model?.edges?.length || 0,
      loops: entry?.model?.loops?.length || 0,
      storySteps: presentationBeatCount(presentationForEntry(entry, presentations)),
      hasPresentation: Boolean(presentationForEntry(entry, presentations)),
      updatedAt: entry?.updatedAt || null,
      model: entry?.model || null,
      active: index === activeIndex
    }))
  };
}

function presentationForEntry(entry, presentations) {
  if (entry?.presentation) return entry.presentation;
  const mapIds = new Set([entry?.id, entry?.mapId, entry?.model?.id].filter(Boolean));
  return presentations.find(record => (record?.presentation?.chapters || [])
    .flatMap(chapter => chapter.scenes || [])
    .some(scene => mapIds.has(scene.mapRef?.mapId)))?.presentation || null;
}

export function presentationBeatCount(presentation) {
  return presentation?.chapters?.reduce((total, chapter) => total + (chapter.scenes || []).reduce(
    (sceneTotal, scene) => sceneTotal + (scene.beats?.length || 1), 0
  ), 0) || 0;
}

export function mapPreviewGeometry(model, { width = 220, height = 106, padding = 14 } = {}) {
  const nodes = (model?.nodes || []).slice(0, 24);
  const ids = new Set(nodes.map(node => node.id));
  const edges = (model?.edges || []).filter(edge => ids.has(edge.source) && ids.has(edge.target)).slice(0, 36);
  if (!nodes.length) return { width, height, nodes: [], edges: [] };

  const raw = nodes.map((node, index) => {
    if (Number.isFinite(node?.position?.x) && Number.isFinite(node?.position?.y)) {
      return { id: node.id, x: node.position.x, y: node.position.y };
    }
    const angle = (Math.PI * 2 * index) / nodes.length - Math.PI / 2;
    return { id: node.id, x: Math.cos(angle), y: Math.sin(angle) };
  });
  const minX = Math.min(...raw.map(point => point.x));
  const maxX = Math.max(...raw.map(point => point.x));
  const minY = Math.min(...raw.map(point => point.y));
  const maxY = Math.max(...raw.map(point => point.y));
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const projected = raw.map(point => ({
    id: point.id,
    x: padding + ((point.x - minX) / spanX) * (width - padding * 2),
    y: padding + ((point.y - minY) / spanY) * (height - padding * 2)
  }));
  const byId = new Map(projected.map(point => [point.id, point]));
  return {
    width,
    height,
    nodes: projected,
    edges: edges.map(edge => ({
      id: edge.id,
      source: byId.get(edge.source),
      target: byId.get(edge.target),
      type: edge.type || (edge.sourceSign === "+" && edge.targetSign === "+" || edge.sourceSign === "−" && edge.targetSign === "+" ? "reinforcing" : "balancing")
    })).filter(edge => edge.source && edge.target)
  };
}

export function createAppShellController({
  home,
  stage,
  modeTitle,
  modeSubtitle,
  projectGrid,
  mapList,
  status,
  newProjectButton,
  openProjectButton,
  createMapButton,
  importMarkdownButton,
  onNewProject,
  onOpenProject,
  onCreateMap,
  onImportMarkdown,
  onOpenProjectPath,
  onOpenMap,
  reactApp
} = {}) {
  let currentMode = "workspace";
  let lastState = {};

  if (!reactApp) {
    newProjectButton?.addEventListener("click", () => onNewProject?.());
    openProjectButton?.addEventListener("click", () => onOpenProject?.());
    createMapButton?.addEventListener("click", () => onCreateMap?.());
    importMarkdownButton?.addEventListener("click", () => onImportMarkdown?.());
  }

  function setMode(mode = "workspace") {
    const previousMode = currentMode;
    currentMode = MODE_COPY[mode] ? mode : "workspace";
    const copy = MODE_COPY[currentMode];
    if (modeTitle) modeTitle.textContent = copy.title;
    if (modeSubtitle) modeSubtitle.textContent = copy.subtitle;
    document.body.dataset.uiMode = currentMode;
    applyDesignSystemContext(document.documentElement, { mode: currentMode });
    document.body.classList.toggle("workspace-mode", currentMode === "workspace");
    document.body.classList.toggle("editor-mode", currentMode === "map");
    reactApp?.setMode(currentMode);
    if (home) home.hidden = currentMode !== "workspace";
    if (stage) stage.hidden = currentMode === "workspace";
    if (home && currentMode === "workspace" && previousMode !== "workspace") {
      home.scrollTop = 0;
    }
  }

  function render(state = {}) {
    lastState = state;
    const view = workspaceViewModel(state);
    if (!reactApp) {
      renderProjects(projectGrid, view, { onNewProject, onOpenProjectPath, onOpenMap });
      renderMaps(mapList, view.maps, { onOpenMap });
    }
    reactApp?.render({
      view,
      callbacks: { onNewProject, onOpenProject, onOpenProjectPath, onCreateMap, onImportMarkdown, onOpenMap }
    });
    if (status && !reactApp) {
      const mapLabel = view.maps.length === 1 ? "1 mapa" : `${view.maps.length} mapas`;
      const storageLabel = view.project.path ? "SQLite local" : "modo local";
      status.textContent = `${view.project.title} · ${mapLabel} · ${storageLabel}`;
    }
    return view;
  }

  return {
    render,
    setMode,
    refresh() { return render(lastState); },
    get mode() { return currentMode; }
  };
}

function renderProjects(container, view, callbacks) {
  if (!container) return;
  container.replaceChildren();
  const activeMapIndex = Math.max(0, view.maps.findIndex(map => map.active));
  container.append(projectCard(view.project, {
    onActivate: () => callbacks.onOpenMap?.(activeMapIndex),
    previewModel: view.project.previewModel
  }));
  view.otherProjects.forEach(item => {
    container.append(projectCard(item, {
      onActivate: () => callbacks.onOpenProjectPath?.(item.path)
    }));
  });
  const create = document.createElement("button");
  create.type = "button";
  create.className = "workspace-project-card workspace-create-card";
  create.setAttribute("aria-label", "Criar novo projeto");
  const plus = element("span", "workspace-create-icon", "+");
  create.append(plus, element("strong", "", "Novo projeto"), element("small", "", "Crie um workspace SQLite independente"));
  create.addEventListener("click", () => callbacks.onNewProject?.());
  container.append(create);
}

function projectCard(item, { onActivate, previewModel = null } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `workspace-project-card${item.active ? " active" : ""}`;
  const visual = element("span", "workspace-project-visual");
  if (previewModel) visual.append(createMapPreview(previewModel, "Prévia do primeiro mapa do projeto"));
  else visual.append(element("span", "workspace-folder-visual", "□"));
  const metrics = item.metrics
    ? `${item.metrics.maps || 0} mapas · ${item.metrics.views || 0} vistas · ${item.metrics.presentations || 0} histórias`
    : "Projeto local";
  const copy = element("span", "workspace-project-copy");
  copy.append(element("strong", "", item.title), element("small", "", metrics));
  button.append(visual, copy);
  button.addEventListener("click", () => onActivate?.());
  return button;
}

function renderMaps(container, maps, { onOpenMap } = {}) {
  if (!container) return;
  container.replaceChildren();
  if (!maps.length) {
    const empty = element("div", "workspace-empty-state");
    empty.append(element("strong", "", "Este projeto ainda não possui mapas."), element("p", "", "Crie um mapa vazio ou importe uma fonte Markdown para começar."));
    container.append(empty);
    return;
  }
  maps.forEach(map => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `workspace-map-card${map.active ? " active" : ""}`;
    const preview = element("span", "workspace-map-preview");
    preview.append(createMapPreview(map.model, `Prévia do mapa ${map.title}`));
    const copy = element("span", "workspace-map-copy");
    copy.append(
      element("strong", "", map.title),
      element("small", "", `${map.nodes} variáveis · ${map.edges} relações · ${map.loops} ciclos`),
      element("span", "", firstLine(map.summary))
    );
    const meta = element("span", "workspace-map-meta");
    meta.append(
      element("small", "", map.storySteps ? `${map.storySteps} passos de apresentação` : "Sem apresentação"),
      element("strong", "", "Abrir no editor →")
    );
    card.append(preview, copy, meta);
    card.addEventListener("click", () => onOpenMap?.(map.index));
    container.append(card);
  });
}

function createMapPreview(model, label) {
  const geometry = mapPreviewGeometry(model);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${geometry.width} ${geometry.height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);
  svg.classList.add("workspace-map-svg");
  geometry.edges.forEach(edge => {
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", edge.source.x);
    line.setAttribute("y1", edge.source.y);
    line.setAttribute("x2", edge.target.x);
    line.setAttribute("y2", edge.target.y);
    line.setAttribute("class", edge.type === "balancing" ? "balancing" : "reinforcing");
    svg.append(line);
  });
  geometry.nodes.forEach((node, index) => {
    const circle = document.createElementNS(svg.namespaceURI, "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", index === 0 ? "4.5" : "3.5");
    svg.append(circle);
  });
  return svg;
}

function fileName(path = "") {
  return String(path).split(/[\\/]/).pop()?.replace(/\.db$/i, "") || "Projeto local";
}

function firstLine(value = "") {
  return String(value).replace(/[#*_>`]/g, "").split("\n").map(line => line.trim()).find(Boolean) || "Sem descrição editorial.";
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
