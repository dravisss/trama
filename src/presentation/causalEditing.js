/**
 * Editorial helpers for turning causal relations into story movements.
 *
 * These functions deliberately return plain data. The visual editor can use
 * them for dropdowns and suggestions, while tests and Markdown tooling can
 * exercise the same causal rules without a DOM.
 */

export function causalMovementOptions(model = {}, { sourceNodeId = "", loopId = "", loopEdgeIds = [] } = {}) {
  const nodes = new Map((model.nodes || []).map(node => [node.id, node]));
  const loopEdges = new Set(loopEdgeIds || []);
  return (model.edges || [])
    .filter(edge => !sourceNodeId || edge.source === sourceNodeId)
    .map(edge => movementOption(nodes, edge, { loopId, loopEdges }))
    .sort((left, right) => Number(right.inLoop) - Number(left.inLoop) || left.targetLabel.localeCompare(right.targetLabel));
}

export function resolveCausalMovement(model = {}, sourceNodeId = "", targetNodeId = "") {
  const edge = (model.edges || []).find(item => item.source === sourceNodeId && item.target === targetNodeId);
  if (!edge) return null;
  const nodes = new Map((model.nodes || []).map(node => [node.id, node]));
  return movementOption(nodes, edge);
}

export function suggestNextCausalMovements(model = {}, { lastEdgeId = "", lastTargetNodeId = "", loopId = "", loopEdgeIds = [] } = {}) {
  const edge = lastEdgeId ? (model.edges || []).find(item => item.id === lastEdgeId) : null;
  const sourceNodeId = edge?.target || lastTargetNodeId || "";
  return causalMovementOptions(model, { sourceNodeId, loopId, loopEdgeIds });
}

export function movementFromBeat(beat = {}, model = {}) {
  const movement = beat.movement || {};
  const edgeId = movement.edgeId || beat.focus?.edgeId;
  const edge = edgeId ? (model.edges || []).find(item => item.id === edgeId) : null;
  if (!edge && !(movement.sourceNodeId && movement.targetNodeId)) return null;
  const nodes = new Map((model.nodes || []).map(node => [node.id, node]));
  return edge
    ? movementOption(nodes, edge)
    : {
      edgeId: "",
      sourceNodeId: movement.sourceNodeId,
      targetNodeId: movement.targetNodeId,
      sourceLabel: nodes.get(movement.sourceNodeId)?.label || movement.sourceNodeId,
      targetLabel: nodes.get(movement.targetNodeId)?.label || movement.targetNodeId,
      label: `${nodes.get(movement.sourceNodeId)?.label || movement.sourceNodeId} → ${nodes.get(movement.targetNodeId)?.label || movement.targetNodeId}`,
      inLoop: false
    };
}

export function applyMovementToBeat(beat = {}, movement = {}) {
  if (!movement?.edgeId) return beat;
  return {
    ...beat,
    type: "traverse",
    title: beat.title || movement.label,
    movement: {
      kind: "relation",
      edgeId: movement.edgeId,
      sourceNodeId: movement.sourceNodeId,
      targetNodeId: movement.targetNodeId
    },
    focus: { kind: "edge", edgeId: movement.edgeId },
    delta: {
      ...(beat.delta || {}),
      camera: { ...(beat.delta?.camera || {}), mode: "follow-path" }
    }
  };
}

function movementOption(nodes, edge, { loopId = "", loopEdges = new Set() } = {}) {
  const sourceLabel = nodes.get(edge.source)?.label || edge.source;
  const targetLabel = nodes.get(edge.target)?.label || edge.target;
  return {
    edgeId: edge.id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    sourceLabel,
    targetLabel,
    label: `${sourceLabel} → ${targetLabel}`,
    inLoop: Boolean(loopId && loopEdges.has(edge.id)),
    loopId: loopId || undefined
  };
}
