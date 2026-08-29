import React, { useEffect, useMemo, useRef, useState } from "react";
import { causalMovementOptions, resolveCausalMovement } from "../presentation/causalEditing.js";
import { MapGlyph, LoopGlyph, PathGlyph, RelationGlyph, TypeGlyph } from "./movementVisuals.jsx";
import { Button } from "./ui/Button.jsx";
import { Input, Select, Textarea } from "./ui/Field.jsx";
import { Icon } from "./ui/Icon.jsx";

const MOVEMENT_TYPES = [
  { id: "relation", label: "Relação", description: "Mostre uma passagem causal entre duas variáveis.", eyebrow: "1 → 1" },
  { id: "map", label: "Mapa inteiro", description: "Reabra o sistema para orientar a leitura.", eyebrow: "visão geral" },
  { id: "loop", label: "Loop", description: "Destaque um ciclo completo e seu retorno.", eyebrow: "ciclo" },
  { id: "path", label: "Caminho", description: "Siga uma sequência contínua entre variáveis.", eyebrow: "trajeto" }
];

const ROLE_OPTIONS = [
  ["focus", "Orientar"],
  ["traverse", "Explicar a passagem"],
  ["consequence", "Mostrar consequência"],
  ["intervention", "Marcar intervenção"]
];

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function loopLabel(loop, index = 0) {
  return text(loop?.label || loop?.title || loop?.name, `Loop ${index + 1}`);
}

function nodeLabel(nodes, id) {
  const label = nodes.find(node => node.id === id)?.label || id || "Selecione uma variável";
  return String(label).replace(/\s+/g, " ").trim();
}

function edgeLabel(edges, nodes, id) {
  const edge = edges.find(item => item.id === id);
  if (!edge) return id;
  return `${nodeLabel(nodes, edge.source)} → ${nodeLabel(nodes, edge.target)}`;
}

function pathLabel(edgeIds, edges, nodes) {
  const byId = new Map(edges.map(edge => [edge.id, edge]));
  const first = byId.get(edgeIds?.[0]);
  const last = byId.get(edgeIds?.[edgeIds.length - 1]);
  if (!first || !last) return "Caminho causal";
  return `${nodeLabel(nodes, first.source)} → ${nodeLabel(nodes, last.target)}`;
}

function pathIsContinuous(edgeIds, edges) {
  if (!Array.isArray(edgeIds) || edgeIds.length < 1) return false;
  const byId = new Map(edges.map(edge => [edge.id, edge]));
  return edgeIds.every((id, index) => {
    const edge = byId.get(id);
    const previous = index ? byId.get(edgeIds[index - 1]) : null;
    return Boolean(edge) && (!previous || previous.target === edge.source);
  });
}

function firstOutgoing(model, sourceNodeId, loopId = "", loopEdgeIds = []) {
  return causalMovementOptions(model, { sourceNodeId, loopId, loopEdgeIds })[0] || null;
}

function initialState({ initial = {}, model = {}, loops = [] } = {}) {
  const nodes = [...(model.nodes || [])].sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id)));
  const edges = model.edges || [];
  const fallbackSource = initial.sourceNodeId || nodes[0]?.id || "";
  const fallbackMovement = initial.targetNodeId
    ? resolveCausalMovement(model, fallbackSource, initial.targetNodeId)
    : firstOutgoing(model, fallbackSource, initial.loopId, initial.loopEdgeIds);
  const edgeIds = initial.edgeIds?.length ? initial.edgeIds : initial.pathEdgeIds || [];
  const kind = MOVEMENT_TYPES.some(item => item.id === initial.kind) ? initial.kind : "relation";
  const selectedLoop = initial.loopId && loops.some(loop => loop.id === initial.loopId)
    ? initial.loopId
    : loops[0]?.id || "";
  const movementLabel = kind === "map"
    ? "O sistema inteiro em perspectiva"
    : kind === "loop"
      ? loopLabel(loops.find(loop => loop.id === selectedLoop))
      : kind === "path"
        ? pathLabel(edgeIds, edges, nodes)
        : fallbackMovement?.label || "";
  return {
    kind,
    sourceNodeId: fallbackMovement?.sourceNodeId || fallbackSource,
    targetNodeId: fallbackMovement?.targetNodeId || initial.targetNodeId || "",
    loopId: selectedLoop,
    edgeIds,
    role: initial.role || (kind === "relation" || kind === "path" ? "traverse" : "focus"),
    title: text(initial.title, movementLabel),
    narration: initial.narration || "",
    durationMs: Number(initial.durationMs) > 0 ? Number(initial.durationMs) : 5000,
    advance: initial.advance || "manual",
    transition: initial.transition || "dissolve"
  };
}

export function MovementComposerDialog({
  open = false,
  sessionId = 0,
  sceneTitle = "esta cena",
  model = {},
  loops = [],
  initial = {},
  onSubmit,
  onCancel
} = {}) {
  const dialogRef = useRef(null);
  const [draft, setDraft] = useState(() => initialState({ initial, model, loops }));
  // The title supplied by the app is a suggestion, not an authored value yet.
  // Keep it reactive while the author explores the four visual forms; the
  // first keystroke turns it into an explicit editorial choice.
  const [titleTouched, setTitleTouched] = useState(false);
  const nodes = useMemo(() => [...(model.nodes || [])].sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id))), [model.nodes]);
  const edges = useMemo(() => model.edges || [], [model.edges]);
  const selectedMovement = useMemo(() => resolveCausalMovement(model, draft.sourceNodeId, draft.targetNodeId), [model, draft.sourceNodeId, draft.targetNodeId]);
  const selectedLoop = loops.find(loop => loop.id === draft.loopId) || null;
  const validPath = pathIsContinuous(draft.edgeIds, edges);
  const canSubmit = draft.kind === "map"
    || (draft.kind === "relation" && Boolean(selectedMovement?.edgeId))
    || (draft.kind === "loop" && Boolean(selectedLoop?.id))
    || (draft.kind === "path" && validPath);

  useEffect(() => {
    setDraft(initialState({ initial, model, loops }));
    setTitleTouched(false);
  }, [sessionId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (open) {
      if (!dialog.open) {
        try { dialog.showModal(); } catch { dialog.setAttribute("open", ""); }
      }
      window.requestAnimationFrame(() => dialog.querySelector("input, select, button")?.focus());
    } else if (dialog.open) {
      dialog.close();
    }
    return undefined;
  }, [open, sessionId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const handleCancel = event => {
      event.preventDefault();
      onCancel?.();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onCancel]);

  const updateDraft = (patch, { generatedTitle = "" } = {}) => {
    setDraft(previous => {
      const next = { ...previous, ...patch };
      if (!titleTouched && generatedTitle) next.title = generatedTitle;
      return next;
    });
  };

  const chooseKind = kind => {
    const nextRole = kind === "relation" || kind === "path" ? "traverse" : "focus";
    const loop = loops.find(item => item.id === draft.loopId);
    const generatedTitle = kind === "map"
      ? "O sistema inteiro em perspectiva"
      : kind === "loop"
        ? loopLabel(loop)
        : kind === "path"
          ? pathLabel(draft.edgeIds, edges, nodes)
          : selectedMovement?.label || "Novo movimento";
    updateDraft({ kind, role: nextRole }, { generatedTitle });
  };

  const chooseSource = sourceNodeId => {
    const movement = firstOutgoing(model, sourceNodeId, draft.loopId, selectedLoop?.edgeIds || []);
    updateDraft({ sourceNodeId, targetNodeId: movement?.targetNodeId || "" }, { generatedTitle: movement?.label || "Novo movimento" });
  };

  const chooseLoop = loopId => {
    const loop = loops.find(item => item.id === loopId);
    updateDraft({ loopId, edgeIds: draft.kind === "path" && !draft.edgeIds.length ? loop?.edgeIds || [] : draft.edgeIds }, { generatedTitle: loopLabel(loop) });
  };

  const handleSubmit = event => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit?.({
      ...draft,
      edgeId: selectedMovement?.edgeId || "",
      loopId: draft.kind === "loop" ? draft.loopId : draft.loopId || "",
      edgeIds: draft.kind === "path" ? [...draft.edgeIds] : [],
      sourceLabel: selectedMovement?.sourceLabel || "",
      targetLabel: selectedMovement?.targetLabel || ""
    });
  };

  const selectedPathNodes = useMemo(() => {
    const byId = new Map(edges.map(edge => [edge.id, edge]));
    const first = byId.get(draft.edgeIds[0]);
    if (!first) return [];
    const ids = [first.source, ...draft.edgeIds.map(id => byId.get(id)?.target).filter(Boolean)];
    return ids.filter((id, index) => ids.indexOf(id) === index);
  }, [draft.edgeIds, edges]);

  return (
    <dialog ref={dialogRef} className="movement-dialog" id="movement-dialog" aria-labelledby="movement-dialog-title" data-qa-movement-dialog>
      <form className="movement-dialog-form" onSubmit={handleSubmit}>
        <header className="movement-dialog-header">
          <div>
            <span className="movement-dialog-kicker">STORY STUDIO · NOVO MOVIMENTO</span>
            <h2 id="movement-dialog-title">Adicionar movimento</h2>
            <p>Construa o enquadramento visual e dê a ele um papel na narrativa de <strong>{sceneTitle}</strong>.</p>
          </div>
          <Button unstyled type="button" className="movement-dialog-close" aria-label="Fechar criação de movimento" onClick={() => onCancel?.()}><Icon name="close" size="sm" /></Button>
        </header>

        <section className="movement-composer-types" aria-labelledby="movement-type-title">
          <div className="movement-section-heading"><div><span className="movement-section-kicker">01 · FORMA</span><h3 id="movement-type-title">O que você quer mostrar?</h3></div><span className="movement-step-hint">Uma escolha por movimento</span></div>
          <div className="movement-type-grid" role="radiogroup" aria-label="Tipo de movimento">
            {MOVEMENT_TYPES.map(item => <MovementTypeCard key={item.id} item={item} selected={draft.kind === item.id} onClick={() => chooseKind(item.id)} />)}
          </div>
        </section>

        <div className="movement-composer-pair">
          <section className="movement-composer-stage" aria-labelledby="movement-preview-title">
            <div className="movement-preview-copy"><span className="movement-section-kicker">02 · PRÉVIA</span><h3 id="movement-preview-title">Veja a composição antes de narrar</h3><p>{MOVEMENT_TYPES.find(item => item.id === draft.kind)?.description}</p></div>
            <MovementPreview kind={draft.kind} model={model} nodes={nodes} edges={edges} draft={draft} loops={loops} selectedLoop={selectedLoop} selectedMovement={selectedMovement} selectedPathNodes={selectedPathNodes} />
          </section>

          {draft.kind === "relation" && <RelationFields nodes={nodes} options={causalMovementOptions(model, { sourceNodeId: draft.sourceNodeId, loopId: draft.loopId, loopEdgeIds: selectedLoop?.edgeIds || [] })} draft={draft} onSource={chooseSource} onTarget={(targetNodeId) => updateDraft({ targetNodeId }, { generatedTitle: resolveCausalMovement(model, draft.sourceNodeId, targetNodeId)?.label || "Novo movimento" })} />}
          {draft.kind === "loop" && <LoopFields loops={loops} selected={draft.loopId} onSelect={chooseLoop} />}
          {draft.kind === "path" && <PathFields edges={edges} nodes={nodes} loops={loops} draft={draft} validPath={validPath} onPath={edgeIds => updateDraft({ edgeIds }, { generatedTitle: pathLabel(edgeIds, edges, nodes) })} onLoop={loopId => { const loop = loops.find(item => item.id === loopId); updateDraft({ loopId, edgeIds: loop?.edgeIds || [] }, { generatedTitle: loopLabel(loop) }); }} />}
          {draft.kind === "map" && <MapFields />}
        </div>

        <section className="movement-composer-copy" aria-labelledby="movement-copy-title">
          <div className="movement-section-heading"><div><span className="movement-section-kicker">03 · NARRATIVA</span><h3 id="movement-copy-title">Dê sentido ao movimento</h3></div><span className="movement-step-hint">Você pode editar depois</span></div>
          <div className="movement-copy-grid">
            <label className="movement-field movement-field-title">Título do movimento<Input unstyled value={draft.title} onChange={event => { setTitleTouched(true); updateDraft({ title: event.target.value }); }} placeholder="Ex.: O backlog atravessa mais áreas" required /></label>
            <label className="movement-field">Papel na narrativa<Select unstyled value={draft.role} onChange={event => updateDraft({ role: event.target.value })}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
            <label className="movement-field movement-field-wide">Narração<Textarea unstyled value={draft.narration} onChange={event => updateDraft({ narration: event.target.value })} placeholder="Explique o que muda e por que isso importa para a história." rows="3" /></label>
          </div>
          <details className="movement-advanced"><summary>Ritmo da apresentação</summary><div className="movement-advanced-grid"><label className="movement-field">Duração (segundos)<Input unstyled type="number" min="1" max="60" step="1" value={Math.round(draft.durationMs / 1000)} onChange={event => updateDraft({ durationMs: Math.max(1000, Math.min(60000, Number(event.target.value || 5) * 1000)) })} /></label><label className="movement-field">Avanço<Select unstyled value={draft.advance} onChange={event => updateDraft({ advance: event.target.value })}><option value="manual">Manual</option><option value="auto">Automático</option></Select></label><label className="movement-field">Transição<Select unstyled value={draft.transition} onChange={event => updateDraft({ transition: event.target.value })}><option value="dissolve">Dissolver</option><option value="cut">Corte</option><option value="slide">Deslizar</option></Select></label></div></details>
        </section>

        <footer className="movement-dialog-footer"><div className={`movement-validation${canSubmit ? " ready" : ""}`} role="status">{canSubmit ? "Pronto para entrar na timeline." : validationMessage(draft.kind, { options: causalMovementOptions(model, { sourceNodeId: draft.sourceNodeId }), loops, validPath })}</div><div className="movement-dialog-actions"><Button unstyled type="button" className="movement-button movement-button-quiet" onClick={() => onCancel?.()}>Cancelar</Button><Button unstyled type="submit" className="movement-button movement-button-primary" disabled={!canSubmit}>Adicionar movimento <span aria-hidden="true">→</span></Button></div></footer>
      </form>
    </dialog>
  );
}

function validationMessage(kind, { options, loops, validPath }) {
  if (kind === "relation") return options.length ? "Escolha o destino na relação visual." : "Esta variável não tem uma relação de saída.";
  if (kind === "loop") return loops.length ? "Escolha um loop para destacar." : "Este mapa ainda não tem loops disponíveis.";
  if (kind === "path") return validPath ? "" : "Selecione uma sequência contínua no mapa ou use um loop como caminho.";
  return "";
}

function MovementTypeCard({ item, selected, onClick }) {
  return <Button unstyled type="button" className={`movement-type-card${selected ? " selected" : ""}`} role="radio" aria-checked={selected} onClick={onClick} data-movement-kind={item.id}><span className="movement-type-visual"><TypeGlyph kind={item.id} /></span><span className="movement-type-copy"><strong>{item.label}</strong><small>{item.description}</small></span><span className="movement-type-eyebrow">{item.eyebrow}</span></Button>;
}

function MovementPreview({ kind, nodes, edges, draft, loops, selectedLoop, selectedMovement, selectedPathNodes }) {
  if (kind === "map") return <div className="movement-preview-visual"><MapGlyph model={{ nodes, edges }} /><span className="movement-preview-caption">O mapa inteiro · câmera abre em visão geral</span></div>;
  if (kind === "loop") return <div className="movement-preview-visual"><LoopGlyph loop={selectedLoop} /><span className="movement-preview-caption">{selectedLoop ? loopLabel(selectedLoop) : "Escolha um loop abaixo"}</span></div>;
  if (kind === "path") return <div className="movement-preview-visual"><PathGlyph nodes={selectedPathNodes.map(id => nodeLabel(nodes, id))} /><span className="movement-preview-caption">{selectedPathNodes.length ? `${selectedPathNodes.length} variáveis · câmera acompanha o percurso` : "O caminho aparece aqui"}</span></div>;
  return <div className="movement-preview-visual"><RelationGlyph source={nodeLabel(nodes, draft.sourceNodeId)} target={selectedMovement?.targetLabel || "Escolha um destino"} active={Boolean(selectedMovement)} /><span className="movement-preview-caption">{selectedMovement?.label || "Selecione uma relação conectada"}</span></div>;
}

function RelationFields({ nodes, options, draft, onSource, onTarget }) {
  return <section className="movement-selection-section"><div className="movement-section-heading"><div><span className="movement-section-kicker">SELEÇÃO</span><h3>Escolha a passagem</h3></div><span className="movement-step-hint">O destino segue a origem</span></div><label className="movement-field"><span>Variável de origem</span><Select unstyled value={draft.sourceNodeId} onChange={event => onSource(event.target.value)}>{nodes.map(node => <option key={node.id} value={node.id}>{node.label || node.id}</option>)}</Select></label><div className="movement-target-grid" aria-label="Destinos conectados">{options.length ? options.map(option => <Button unstyled type="button" className={`movement-target-card${option.targetNodeId === draft.targetNodeId ? " selected" : ""}`} key={option.edgeId} aria-pressed={option.targetNodeId === draft.targetNodeId} onClick={() => onTarget(option.targetNodeId)}><span className="movement-target-arrow">→</span><span><strong>{option.targetLabel}</strong><small>{option.inLoop ? "continua o loop da cena" : "relação disponível"}</small></span></Button>) : <div className="movement-empty-selection">Nenhuma relação de saída para esta variável.</div>}</div></section>;
}

function LoopFields({ loops, selected, onSelect }) {
  return <section className="movement-selection-section"><div className="movement-section-heading"><div><span className="movement-section-kicker">SELEÇÃO</span><h3>Escolha o loop</h3></div><span className="movement-step-hint">O cálculo do mapa é reaproveitado</span></div><div className="movement-loop-grid">{loops.length ? loops.map((loop, index) => <Button unstyled type="button" key={loop.id} className={`movement-loop-card${selected === loop.id ? " selected" : ""}`} aria-pressed={selected === loop.id} onClick={() => onSelect(loop.id)}><span className="movement-loop-mini"><LoopGlyph loop={loop} /></span><span><strong>{loopLabel(loop, index)}</strong><small>{loop.edgeIds?.length || 0} relações · {loop.kind === "reinforcing" ? "reforçador" : loop.kind === "balancing" ? "balanceador" : "ciclo"}</small></span></Button>) : <div className="movement-empty-selection">Este mapa ainda não tem um loop calculado.</div>}</div></section>;
}

function PathFields({ edges, nodes, loops, draft, validPath, onPath, onLoop }) {
  const selected = new Set(draft.edgeIds);
  const edgeById = new Map(edges.map(edge => [edge.id, edge]));
  const lastEdge = draft.edgeIds.length ? edgeById.get(draft.edgeIds[draft.edgeIds.length - 1]) : null;
  const nextSourceNodeId = lastEdge?.target || draft.sourceNodeId || "";
  const choices = edges.filter(edge => selected.has(edge.id) || !nextSourceNodeId || edge.source === nextSourceNodeId).slice(0, 12);
  return <section className="movement-selection-section"><div className="movement-section-heading"><div><span className="movement-section-kicker">SELEÇÃO</span><h3>Monte um caminho contínuo</h3></div><span className="movement-step-hint">A ordem importa</span></div><div className="movement-path-toolbar"><span>{draft.edgeIds.length ? `${draft.edgeIds.length} relações selecionadas` : "Nenhuma relação selecionada"}</span><Button unstyled type="button" className="movement-inline-button" onClick={() => onPath([])} disabled={!draft.edgeIds.length}>Limpar</Button></div>{draft.edgeIds.length ? <div className="movement-path-chips">{draft.edgeIds.map((edgeId, index) => <span key={edgeId}><b>{index + 1}</b>{edgeLabel(edges, nodes, edgeId)}</span>)}</div> : <div className="movement-empty-selection">Selecione relações conectadas no canvas antes de abrir este compositor, ou comece por um loop abaixo.</div>}<div className="movement-path-options">{choices.map(edge => <Button unstyled type="button" className={`movement-path-option${selected.has(edge.id) ? " selected" : ""}`} key={edge.id} onClick={() => onPath(selected.has(edge.id) ? draft.edgeIds.filter(id => id !== edge.id) : [...draft.edgeIds, edge.id])}><span>{selected.has(edge.id) ? "✓" : "+"}</span>{edgeLabel(edges, nodes, edge.id)}</Button>)}</div>{loops.length ? <div className="movement-path-loop-presets"><span>Atalhos seguros</span>{loops.slice(0, 4).map(loop => <Button unstyled type="button" key={loop.id} onClick={() => onLoop(loop.id)}>Usar {loopLabel(loop)}</Button>)}</div> : null}{draft.edgeIds.length && !validPath ? <p className="movement-field-error">Esse caminho tem uma quebra. Remova a relação fora de sequência ou escolha um loop.</p> : null}</section>;
}

function MapFields() {
  return <section className="movement-selection-section movement-map-note"><div><span className="movement-section-kicker">SELEÇÃO</span><h3>O mapa inteiro será a cena</h3><p>Este movimento não cria um foco parcial. A câmera abre em <strong>fit-map</strong> para devolver contexto ao leitor.</p></div></section>;
}
