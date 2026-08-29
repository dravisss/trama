export const LOOP_TYPES = new Set(["reinforcing", "balancing"]);

const discoveryCache = new WeakMap();

export function relationPolarity(edge) {
  const signs = `${normalizeSign(edge.sourceSign)}${normalizeSign(edge.targetSign)}`;
  return signs === "++" || signs === "−+" ? 1 : -1;
}

export function classifyLoop(edges) {
  const polarity = edges.reduce((product, edge) => product * relationPolarity(edge), 1);
  return polarity > 0 ? "reinforcing" : "balancing";
}

export function discoverLoops(model, { maxLength = 8, maxLoops = 100 } = {}) {
  if (!model || typeof model !== "object") return [];
  const cacheKey = `${maxLength}:${maxLoops}:${model.nodes.map(node => node.id).join(",")}:${model.edges
    .map(edge => `${edge.id}:${edge.source}:${edge.target}:${edge.sourceSign}:${edge.targetSign}`).join(",")}`;
  let modelCache = discoveryCache.get(model);
  if (!modelCache) {
    modelCache = new Map();
    discoveryCache.set(model, modelCache);
  }
  const cached = modelCache.get(cacheKey);
  if (cached) return cloneDiscoveredLoops(cached);

  const adjacency = new Map(model.nodes.map(node => [node.id, []]));
  const discovered = new Map();

  for (const edge of model.edges) adjacency.get(edge.source)?.push(edge);
  for (const edges of adjacency.values()) edges.sort((a, b) => a.id.localeCompare(b.id));

  for (const node of model.nodes) {
    visit(node.id, node.id, [], new Set([node.id]));
    if (discovered.size >= maxLoops) break;
  }

  const cycles = [...discovered.values()]
    .sort((a, b) => a.edgeIds.length - b.edgeIds.length || a.key.localeCompare(b.key))
    .slice(0, maxLoops);
  const counters = { reinforcing: 0, balancing: 0 };

  const result = cycles.map(({ key: _key, ...cycle }) => {
    counters[cycle.type]++;
    const prefix = cycle.type === "reinforcing" ? "R" : "B";
    return {
      id: `auto-${prefix.toLowerCase()}${counters[cycle.type]}`,
      label: `${prefix}${counters[cycle.type]}`,
      ...cycle
    };
  });
  modelCache.set(cacheKey, result);
  return cloneDiscoveredLoops(result);

  function visit(startId, nodeId, edgePath, visitedNodes) {
    if (edgePath.length >= maxLength || discovered.size >= maxLoops) return;

    for (const edge of adjacency.get(nodeId) || []) {
      if (edge.target === startId && edgePath.length > 0) {
        const cycleEdges = [...edgePath, edge];
        const key = canonicalCycleKey(cycleEdges.map(item => item.id));
        if (!discovered.has(key)) {
          discovered.set(key, {
            key,
            type: classifyLoop(cycleEdges),
            edgeIds: cycleEdges.map(item => item.id),
            nodeIds: cycleEdges.map(item => item.source)
          });
        }
        continue;
      }

      if (visitedNodes.has(edge.target)) continue;
      visitedNodes.add(edge.target);
      visit(startId, edge.target, [...edgePath, edge], visitedNodes);
      visitedNodes.delete(edge.target);
    }
  }
}

function cloneDiscoveredLoops(loops) {
  return loops.map(loop => ({ ...loop, edgeIds: [...loop.edgeIds], nodeIds: [...loop.nodeIds] }));
}

export function canonicalCycleKey(edgeIds) {
  return edgeIds
    .map((_, index) => [...edgeIds.slice(index), ...edgeIds.slice(0, index)].join(">"))
    .sort()[0];
}

function normalizeSign(sign) {
  return sign === "-" ? "−" : sign;
}
