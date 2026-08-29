import React, { useId } from "react";

function svgId(prefix) {
  return `${prefix}-${useId().replace(/:/g, "")}`;
}

export function TypeGlyph({ kind }) {
  if (kind === "map") return <svg viewBox="0 0 74 42" aria-hidden="true"><path d="M9 28 24 12l13 10 13-14 15 13" /><circle cx="9" cy="28" r="3" /><circle cx="24" cy="12" r="3" /><circle cx="37" cy="22" r="3" /><circle cx="50" cy="8" r="3" /><circle cx="65" cy="21" r="3" /></svg>;
  if (kind === "loop") return <svg viewBox="0 0 74 42" aria-hidden="true"><path d="M52 11c-8-8-23-7-30 2-9 12 1 25 14 25 10 0 17-6 19-13" /><path d="m51 7 3 7-8-1" /><path d="m54 26-3-7 8 1" /></svg>;
  if (kind === "path") return <svg viewBox="0 0 74 42" aria-hidden="true"><path d="M9 29c9 0 8-16 18-16s9 16 19 16 9-16 19-16" /><circle cx="9" cy="29" r="3" /><circle cx="27" cy="13" r="3" /><circle cx="46" cy="29" r="3" /><circle cx="65" cy="13" r="3" /></svg>;
  return <svg viewBox="0 0 74 42" aria-hidden="true"><path d="M11 21h49" /><path d="m51 12 10 9-10 9" /><circle cx="11" cy="21" r="4" /><circle cx="63" cy="21" r="4" /></svg>;
}

export function RelationGlyph({ source, target, active }) {
  const markerId = svgId("movement-arrow");
  return <svg viewBox="0 0 620 150" role="img" aria-label={`Relação de ${source} para ${target}`}><defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8z" /></marker></defs><path className={`movement-preview-path${active ? " active" : ""}`} d="M188 75C260 75 310 75 388 75" markerEnd={`url(#${markerId})`} /><PreviewNode x="24" y="45" width="164" label={source} accent /><PreviewNode x="388" y="45" width="208" label={target} accent={active} /></svg>;
}

export function LoopGlyph({ loop }) {
  const label = loopLabel(loop);
  const markerId = svgId("movement-loop-arrow");
  return <svg viewBox="0 0 620 150" role="img" aria-label={`Loop ${label}`}><defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8z" /></marker></defs><path className="movement-preview-loop" d="M160 104C72 104 60 40 150 32c92-9 162 15 238 0 90-18 143 32 80 69-62 36-168-5-245 9-25 4-51 4-63-6" markerEnd={`url(#${markerId})`} /><circle cx="126" cy="72" r="18" /><circle cx="310" cy="42" r="18" /><circle cx="502" cy="76" r="18" /><text x="126" y="76" textAnchor="middle">1</text><text x="310" y="46" textAnchor="middle">2</text><text x="502" y="80" textAnchor="middle">3</text></svg>;
}

export function PathGlyph({ nodes = [] }) {
  const names = nodes.length ? nodes : ["Origem", "…", "Destino"];
  const positions = names.slice(0, 5).map((_, index, array) => 42 + index * (536 / Math.max(1, array.length - 1)));
  const markerId = svgId("movement-path-arrow");
  return <svg viewBox="0 0 620 150" role="img" aria-label="Caminho causal"><defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8z" /></marker></defs><path className="movement-preview-path active" d={positions.slice(0, -1).map((x, index) => `M${x + 18} 75C${(x + positions[index + 1]) / 2} 75 ${(x + positions[index + 1]) / 2} 75 ${positions[index + 1] - 18} 75`).join(" ")} markerEnd={`url(#${markerId})`} />{positions.map((x, index) => <g key={`${x}-${index}`}><circle cx={x} cy="75" r="18" /><text x={x} y="80" textAnchor="middle">{index + 1}</text><title>{names[index]}</title></g>)}</svg>;
}

export function MapGlyph({ model = {} }) {
  const nodes = model.nodes || [];
  const positions = nodes.slice(0, 8).map((node, index) => ({ ...node, x: 44 + (index % 4) * 168, y: 34 + Math.floor(index / 4) * 72 }));
  const byId = new Map(positions.map(node => [node.id, node]));
  return <svg viewBox="0 0 620 150" role="img" aria-label="Mapa inteiro"><path className="movement-map-frame" d="M20 16h580v118H20z" />{(model.edges || []).map(edge => { const source = byId.get(edge.source); const target = byId.get(edge.target); return source && target ? <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} /> : null; })}{positions.map(node => <g key={node.id}><circle cx={node.x} cy={node.y} r="10" /><title>{node.label || node.id}</title></g>)}</svg>;
}

export function InspectorMovementVisual({ kind = "generic", source = "", options = [], selectedTargetNodeId = "", model = {}, loop = null, pathNodes = [], label = "", valid = true }) {
  if (kind === "map") return <div className="story-movement-type-visual story-movement-map-visual"><MapGlyph model={model} /><span className="story-movement-visual-caption">{label || "Mapa inteiro"}</span></div>;
  if (kind === "loop") return <div className="story-movement-type-visual story-movement-loop-visual"><LoopGlyph loop={loop} /><span className="story-movement-visual-caption">{label || "Loop"}</span></div>;
  if (kind === "path") return <div className="story-movement-type-visual story-movement-path-visual"><PathGlyph nodes={pathNodes} /><span className="story-movement-visual-caption">{label || "Caminho causal"}</span></div>;
  if (kind === "relation") return <InspectorRelationVisual source={source} options={options} selectedTargetNodeId={selectedTargetNodeId} valid={valid} />;
  return <div className="story-movement-type-visual story-movement-generic-visual"><TypeGlyph kind="map" /><span className="story-movement-visual-caption">{label || "Foco semântico"}</span></div>;
}

function InspectorRelationVisual({ source = "", options = [], selectedTargetNodeId = "", valid = true }) {
  const markerId = svgId("story-causal-arrow");
  const height = Math.max(208, 112 + Math.max(0, options.length - 1) * 68);
  const sourceY = height / 2;
  const positions = options.length
    ? options.map((_, index) => ({ y: sourceY - ((options.length - 1) * 68) / 2 + index * 68 }))
    : [];
  const sourceLabel = source || "Escolha a origem";
  return <div className="story-movement-type-visual story-movement-relation-visual"><svg viewBox={`0 0 620 ${height}`} role="img" aria-labelledby="story-inspector-causal-title story-inspector-causal-description"><title id="story-inspector-causal-title">{sourceLabel} e suas relações causais</title><desc id="story-inspector-causal-description">Selecione uma relação causal entre a variável de origem e uma das variáveis de destino.</desc><defs><marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs><text className="story-causal-caption" x="30" y="20">ORIGEM</text><text className="story-causal-caption" x="412" y="20">DESTINOS POSSÍVEIS</text>{options.map((option, index) => { const position = positions[index]; const selected = option.targetNodeId === selectedTargetNodeId; const path = `M 170 ${sourceY} C 265 ${sourceY}, 320 ${position.y}, 412 ${position.y}`; return <g className={`story-causal-relation${selected ? " is-selected" : ""}`} role="button" tabIndex="0" key={option.edgeId} data-source-node-id={option.sourceNodeId} data-target-node-id={option.targetNodeId} aria-label={`Escolher relação: ${option.label}`}><title>{option.label}{option.inLoop ? " · continua este loop" : ""}</title><path d={path} markerEnd={`url(#${markerId})`} /></g>; })}<InspectorNode id={source} label={sourceLabel} x={92} y={sourceY} source /><>{options.map((option, index) => <InspectorNode key={option.edgeId} id={option.targetNodeId} label={option.targetLabel} x={490} y={positions[index].y} sourceNodeId={option.sourceNodeId} targetNodeId={option.targetNodeId} selected={option.targetNodeId === selectedTargetNodeId} />)}</>{!options.length && <text className="story-causal-empty" x="310" y={sourceY + 4} textAnchor="middle">{valid ? "Nenhuma relação de saída" : "Relação indisponível"}</text>}</svg><span className="story-movement-visual-caption">{valid ? (options.find(option => option.targetNodeId === selectedTargetNodeId)?.label || "Selecione uma relação conectada") : "Esta relação não está mais disponível no mapa."}</span></div>;
}

function InspectorNode({ id, label, x, y, sourceNodeId = "", targetNodeId = "", selected = false, source = false }) {
  const lines = labelLines(label, 23);
  const attributes = targetNodeId
    ? { "data-source-node-id": sourceNodeId, "data-target-node-id": targetNodeId }
    : { "data-source-node-id": id };
  const action = source ? "Alterar variável de origem" : "Escolher relação";
  return <g className={`story-causal-node ${source ? "story-causal-source" : "story-causal-target"}${selected ? " is-selected" : ""}`} role="button" tabIndex="0" aria-label={`${action}: ${label}`} {...attributes}><title>{action}: {label}</title><rect x={x - 78} y={y - 27} width="156" height="54" rx="14" /><text x={x} y={y - (lines.length - 1) * 7.5} textAnchor="middle">{lines.map((line, index) => <tspan key={`${line}-${index}`} x={x} dy={index ? 15 : 0}>{line}</tspan>)}</text></g>;
}

function PreviewNode({ x, y, width, label, accent = false }) {
  const left = Number(x) || 0;
  const top = Number(y) || 0;
  return <g className={accent ? "active" : ""}><rect x={left} y={top} width={width} height="60" rx="14" /><text x={left + width / 2} y={top + 35} textAnchor="middle">{shortLabel(label, width < 180 ? 22 : 28)}</text></g>;
}

function labelLines(value, maxLength = 26) {
  const words = String(value || "—").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maxLength) {
      lines.push(current);
      current = word;
    } else current = next;
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function shortLabel(value, max = 26) {
  const clean = String(value || "—").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function loopLabel(loop) {
  return loop?.label || loop?.title || loop?.name || "Escolha um loop";
}
