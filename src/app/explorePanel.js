function createElement(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * Owns the Explore-mode detail surface without knowing anything about the
 * persistence layer or Cytoscape. The demo supplies model/query callbacks;
 * the component only renders authored loop data and emits user intent.
 */
export function createExplorePanelController({
  elements,
  getLoops,
  getModel,
  getActiveLoopId,
  setActiveLoopId,
  onSelectLoop,
  renderMarkdown
}) {
  let entries = [];

  function activeLoop() {
    entries = getLoops?.() || [];
    return entries.find(loop => loop.id === getActiveLoopId?.()) || entries[0] || null;
  }

  function render() {
    if (!elements.explorePanel) return;
    const open = document.body.classList.contains("explore-mode");
    elements.explorePanel.hidden = !open;
    if (!open) return;

    const loop = activeLoop();
    if (!loop) {
      elements.exploreLoopTitle.textContent = "Nenhum loop encontrado";
      elements.exploreLoopType.textContent = "";
      elements.exploreLoopPath.textContent = "Adicione relações cíclicas ao mapa para explorar um loop.";
      elements.exploreLoopMeta.textContent = "";
      elements.exploreLoopDescription.textContent = "Este mapa ainda não possui um ciclo direcionado.";
      elements.exploreLoopEdges.replaceChildren();
      elements.exploreLoopChoices?.replaceChildren();
      elements.exploreWalkLoop.disabled = true;
      return;
    }

    setActiveLoopId?.(loop.id);
    const model = getModel?.() || {};
    const labels = new Map((model.nodes || []).map(node => [node.id, node.label || node.id]));
    const edges = new Map((model.edges || []).map(edge => [edge.id, edge]));
    renderChoices(loop);
    const typeLabel = loop.type === "reinforcing" ? "Feedback positivo" : "Feedback negativo";
    elements.exploreLoopTitle.textContent = loop.title || loop.label || loop.id;
    elements.exploreLoopType.textContent = `${loop.label || loop.id} · ${typeLabel}`;
    elements.exploreLoopPath.textContent = (loop.nodeIds || []).map(id => labels.get(id) || id).join("  →  ");
    elements.exploreLoopMeta.textContent = `${(loop.edgeIds || []).length} relações · ${typeLabel.toLowerCase()}`;
    const reading = authoredLoopReading(loop, edges, labels);
    if (renderMarkdown) elements.exploreLoopDescription.innerHTML = renderMarkdown(reading);
    else elements.exploreLoopDescription.textContent = reading;
    elements.exploreLoopEdges.replaceChildren();
    (loop.edgeIds || []).forEach(edgeId => {
      const edge = edges.get(edgeId);
      if (!edge) return;
      const item = document.createElement("li");
      const source = labels.get(edge.source) || edge.source;
      const target = labels.get(edge.target) || edge.target;
      item.append(
        createElement("span", "explore-edge-copy", `${source} → ${target}`),
        createElement("strong", "explore-edge-sign", `${edge.sourceSign || "+"}${edge.targetSign || "+"}`)
      );
      elements.exploreLoopEdges.append(item);
    });
    elements.exploreWalkLoop.disabled = false;
  }

  function renderChoices(active) {
    if (!elements.exploreLoopChoices) return;
    elements.exploreLoopChoices.replaceChildren();
    entries.forEach(loop => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = loop.id === active.id ? "active" : "";
      button.setAttribute("aria-pressed", String(loop.id === active.id));
      button.append(
        createElement("strong", "", loop.label || loop.id),
        createElement("span", "", loop.title || (loop.type === "reinforcing" ? "Loop de feedback positivo" : "Loop de feedback negativo"))
      );
      button.addEventListener("click", () => {
        setActiveLoopId?.(loop.id);
        onSelectLoop?.(loop);
        render();
      });
      elements.exploreLoopChoices.append(button);
    });
  }

  return {
    render,
    activeLoop
  };
}

function authoredLoopReading(loop, edges, labels) {
  if (loop.description?.trim()) return loop.description.trim();
  const causalNotes = (loop.edgeIds || [])
    .map(edgeId => edges.get(edgeId))
    .filter(edge => edge?.description?.trim())
    .map(edge => `${labels.get(edge.source) || edge.source} → ${labels.get(edge.target) || edge.target}: ${edge.description.trim()}`);
  if (causalNotes.length) return causalNotes.join("\n\n");
  return "Este ciclo ainda não tem uma leitura autoral. As relações abaixo são os dados disponíveis no mapa.";
}
