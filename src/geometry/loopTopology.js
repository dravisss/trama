import { discoverLoops } from "../core/loops.js";

/**
 * Derive the structural information the layout and router need from any CLD
 * model. Curated loops remain authoritative; discovery is a fallback for
 * models that only provide nodes and signed relations.
 */
export function deriveLoopTopology(model, {
  discoverMissing = true,
  maxLength = 8,
  maxLoops = 48,
  maxVisualLoops = 12
} = {}) {
  const edgesById = new Map((model?.edges || []).map(edge => [edge.id, edge]));
  const curatedLoops = Array.isArray(model?.loops) ? model.loops : [];
  const discoveredLoops = curatedLoops.length || !discoverMissing
    ? curatedLoops
    : discoverLoops(model, { maxLength, maxLoops });
  const sourceLoops = curatedLoops.length
    ? discoveredLoops
    : selectVisualLoops(discoveredLoops, maxVisualLoops);
  const loops = sourceLoops
    .map(loop => normalizeLoop(loop, edgesById))
    .filter(loop => loop.edgeIds.length >= 2 && loop.nodeIds.length >= 2);

  const nodeMembership = new Map();
  const edgeMembership = new Map();
  for (const loop of loops) {
    for (const nodeId of loop.nodeIds) addMembership(nodeMembership, nodeId, loop.id);
    for (const edgeId of loop.edgeIds) addMembership(edgeMembership, edgeId, loop.id);
  }

  const degree = new Map((model?.nodes || []).map(node => [node.id, 0]));
  for (const edge of model?.edges || []) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
  }

  const nodeRoles = new Map();
  for (const node of model?.nodes || []) {
    const memberships = nodeMembership.get(node.id)?.length || 0;
    const connections = degree.get(node.id) || 0;
    nodeRoles.set(node.id, memberships > 1 || connections >= 4
      ? "hub"
      : memberships > 0
        ? "loop-member"
        : connections > 0
          ? "bridge"
          : "isolated");
  }

  return {
    source: curatedLoops.length ? "curated" : loops.length ? "discovered" : "none",
    allLoops: discoveredLoops
      .map(loop => normalizeLoop(loop, edgesById))
      .filter(loop => loop.edgeIds.length >= 2 && loop.nodeIds.length >= 2),
    loops,
    loopEdgeIds: loops.map(loop => [...loop.edgeIds]),
    loopNodeIds: loops.map(loop => [...loop.nodeIds]),
    nodeMembership,
    edgeMembership,
    nodeRoles,
    bridgeEdgeIds: (model?.edges || [])
      .filter(edge => !edgeMembership.has(edge.id))
      .map(edge => edge.id),
    hasLoops: loops.length > 0
  };
}

function selectVisualLoops(loops, maxVisualLoops) {
  if (loops.length <= maxVisualLoops) return loops;
  const remaining = loops.map(loop => ({
    loop,
    edgeIds: new Set(loop.edgeIds || []),
    nodeIds: new Set(loop.nodeIds || [])
  }));
  const selected = [];
  const coveredEdges = new Set();
  const coveredNodes = new Set();
  while (remaining.length && selected.length < maxVisualLoops) {
    remaining.sort((a, b) => score(b) - score(a) || String(a.loop.id).localeCompare(String(b.loop.id)));
    const best = remaining.shift();
    if (!best) break;
    selected.push(best.loop);
    best.edgeIds.forEach(id => coveredEdges.add(id));
    best.nodeIds.forEach(id => coveredNodes.add(id));
  }
  return selected;

  function score(candidate) {
    const newEdges = [...candidate.edgeIds].filter(id => !coveredEdges.has(id)).length;
    const newNodes = [...candidate.nodeIds].filter(id => !coveredNodes.has(id)).length;
    const length = candidate.edgeIds.size || 1;
    // Coverage is more valuable than a long cycle that repeats the same visual
    // corridor. Shorter cycles get a small tie-breaking preference.
    return newEdges * 8 + newNodes * 1.5 + 1 / length;
  }
}

function normalizeLoop(loop, edgesById) {
  const edgeIds = [...new Set((loop?.edgeIds || []).filter(edgeId => edgesById.has(edgeId)))];
  const nodeIds = [];
  for (const edgeId of edgeIds) {
    const edge = edgesById.get(edgeId);
    if (!nodeIds.includes(edge.source)) nodeIds.push(edge.source);
    if (!nodeIds.includes(edge.target)) nodeIds.push(edge.target);
  }
  return {
    id: loop.id,
    type: loop.type,
    edgeIds,
    nodeIds
  };
}

function addMembership(map, id, value) {
  if (!map.has(id)) map.set(id, []);
  map.get(id).push(value);
}
