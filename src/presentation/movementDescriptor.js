/**
 * Resolve the editorial form of a Story Studio beat.
 *
 * `focus` and `delta.camera` remain the runtime contract. `movement.kind` is
 * an optional authoring hint for newly created beats; legacy beats are
 * inferred here so the inspector can evolve without a data migration.
 */

const MOVEMENT_KINDS = new Set(["relation", "loop", "map", "path"]);

export function describeMovement(beat = {}, model = {}, loops = []) {
  const nodes = new Map((model.nodes || []).map(node => [node.id, node]));
  const edges = new Map((model.edges || []).map(edge => [edge.id, edge]));
  const loopCatalog = uniqueLoops([...(model.loops || []), ...(loops || [])]);
  const explicitKind = MOVEMENT_KINDS.has(beat.movement?.kind) ? beat.movement.kind : "";
  const inferredKind = explicitKind || inferKind(beat);

  if (inferredKind === "relation") return describeRelation(beat, nodes, edges, explicitKind);
  if (inferredKind === "loop") return describeLoop(beat, loopCatalog, edges, explicitKind);
  if (inferredKind === "path") return describePath(beat, edges, nodes, explicitKind);
  if (inferredKind === "map") return {
    kind: "map",
    source: explicitKind ? "explicit" : "inferred",
    label: "Mapa inteiro",
    title: "O sistema inteiro em perspectiva",
    nodeCount: (model.nodes || []).length,
    edgeCount: (model.edges || []).length,
    cameraMode: "fit-map",
    valid: true
  };

  return {
    kind: "generic",
    source: "focus",
    label: genericLabel(beat.focus),
    title: beat.title || "Foco semântico",
    focus: beat.focus || null,
    cameraMode: beat.delta?.camera?.mode || "fit-map",
    valid: true
  };
}

export function movementKind(beat = {}, model = {}, loops = []) {
  return describeMovement(beat, model, loops).kind;
}

function inferKind(beat) {
  const focusKind = beat.focus?.kind;
  if (focusKind === "loop") return "loop";
  if (focusKind === "path") return "path";
  if (focusKind === "edge" || beat.movement?.edgeId || (beat.movement?.sourceNodeId && beat.movement?.targetNodeId)) return "relation";
  if (!beat.focus && beat.delta?.camera?.mode === "fit-map") return "map";
  return "generic";
}

function describeRelation(beat, nodes, edges, explicitKind) {
  const movement = beat.movement || {};
  const edgeId = movement.edgeId || beat.focus?.edgeId || "";
  const edge = edges.get(edgeId);
  const sourceNodeId = movement.sourceNodeId || edge?.source || "";
  const targetNodeId = movement.targetNodeId || edge?.target || "";
  const sourceLabel = nodeLabel(nodes, sourceNodeId);
  const targetLabel = nodeLabel(nodes, targetNodeId);
  const valid = Boolean(edgeId && edge && sourceNodeId && targetNodeId);
  return {
    kind: "relation",
    source: explicitKind ? "explicit" : "inferred",
    label: "Relação",
    title: valid ? `${sourceLabel} → ${targetLabel}` : "Relação indisponível",
    edgeId,
    sourceNodeId,
    targetNodeId,
    sourceLabel,
    targetLabel,
    cameraMode: "follow-path",
    valid
  };
}

function describeLoop(beat, loops, edges, explicitKind) {
  const loopId = beat.movement?.loopId || beat.focus?.loopId || "";
  const loop = loops.find(item => item.id === loopId);
  const edgeIds = [...(loop?.edgeIds || [])];
  const valid = Boolean(loopId && loop && edgeIds.length && edgeIds.every(edgeId => edges.has(edgeId)));
  return {
    kind: "loop",
    source: explicitKind ? "explicit" : "inferred",
    label: "Loop",
    title: loop?.label || loop?.title || loop?.name || (loopId ? `Loop ${loopId}` : "Loop indisponível"),
    loopId,
    loop: loop || null,
    edgeIds,
    loopKind: loop?.kind || "cycle",
    edgeCount: edgeIds.length,
    cameraMode: "fit-focus",
    valid
  };
}

function describePath(beat, edges, nodes, explicitKind) {
  const edgeIds = [...(beat.movement?.edgeIds || beat.focus?.edgeIds || [])];
  const pathEdges = edgeIds.map(edgeId => edges.get(edgeId)).filter(Boolean);
  const valid = edgeIds.length > 0 && pathEdges.length === edgeIds.length && pathEdges.every((edge, index) => index === 0 || pathEdges[index - 1].target === edge.source);
  const nodeIds = pathEdges.length ? [pathEdges[0].source, ...pathEdges.map(edge => edge.target)] : [];
  return {
    kind: "path",
    source: explicitKind ? "explicit" : "inferred",
    label: "Caminho",
    title: pathTitle(nodeIds, nodes),
    edgeIds,
    nodeIds,
    nodes: nodeIds.map(nodeId => nodeLabel(nodes, nodeId)),
    edgeCount: edgeIds.length,
    cameraMode: "follow-path",
    valid
  };
}

function uniqueLoops(loops) {
  return loops.filter((loop, index, all) => loop?.id && all.findIndex(item => item.id === loop.id) === index);
}

function nodeLabel(nodes, id) {
  return nodes.get(id)?.label || id || "Variável indisponível";
}

function pathTitle(nodeIds, nodes) {
  if (!nodeIds.length) return "Caminho indisponível";
  return `${nodeLabel(nodes, nodeIds[0])} → ${nodeLabel(nodes, nodeIds.at(-1))}`;
}

function genericLabel(focus) {
  if (!focus) return "Visão geral";
  if (focus.kind === "node") return "Variável em foco";
  if (focus.kind === "set") return "Conjunto em foco";
  if (focus.kind === "query") return "Consulta em foco";
  if (focus.kind === "region") return "Região em foco";
  return "Foco semântico";
}
