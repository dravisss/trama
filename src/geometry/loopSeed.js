/**
 * Build a soft, deterministic initial arrangement for loop-bearing graphs.
 * It is a seed for CoSE/fCoSE, not a final circular layout: the force layout
 * remains free to relax it around hubs, bridges and locked nodes.
 */
export function buildLoopAwareSeed(model, topology, {
  idealEdgeLength = 220,
  center = { x: 0, y: 0 },
  seed = "loopviewer"
} = {}) {
  const positions = new Map();
  if (!topology?.hasLoops) return positions;

  const loops = topology.loops || [];
  const loopCenters = new Map();
  const centerRadius = loops.length <= 1
    ? 0
    : Math.max(idealEdgeLength * 1.65, idealEdgeLength * loops.length / 1.7);
  const loopRadius = Math.max(idealEdgeLength * 0.72, 110);

  loops.forEach((loop, loopIndex) => {
    const angle = loops.length === 1
      ? -Math.PI / 2
      : -Math.PI / 2 + (Math.PI * 2 * loopIndex) / loops.length;
    loopCenters.set(loop.id, {
      x: center.x + Math.cos(angle) * centerRadius,
      y: center.y + Math.sin(angle) * centerRadius
    });
  });

  const candidatesByNode = new Map();
  for (const loop of loops) {
    const loopCenter = loopCenters.get(loop.id);
    const nodeCount = Math.max(3, loop.nodeIds.length);
    const radius = Math.max(loopRadius, idealEdgeLength * nodeCount / (Math.PI * 2) * 1.25);
    const rotation = stableUnit(`${seed}:loop:${loop.id}`) * Math.PI * 2 - Math.PI / 2;
    loop.nodeIds.forEach((nodeId, nodeIndex) => {
      const angle = rotation + (Math.PI * 2 * nodeIndex) / nodeCount;
      const candidate = {
        x: loopCenter.x + Math.cos(angle) * radius,
        y: loopCenter.y + Math.sin(angle) * radius
      };
      if (!candidatesByNode.has(nodeId)) candidatesByNode.set(nodeId, []);
      candidatesByNode.get(nodeId).push(candidate);
    });
  }

  const nodes = model?.nodes || [];
  for (const node of nodes) {
    const candidates = candidatesByNode.get(node.id);
    if (candidates?.length) {
      positions.set(node.id, average(candidates));
      continue;
    }
    const neighborPositions = (model.edges || [])
      .filter(edge => edge.source === node.id || edge.target === node.id)
      .map(edge => positions.get(edge.source === node.id ? edge.target : edge.source))
      .filter(Boolean);
    if (neighborPositions.length) {
      const neighborCenter = average(neighborPositions);
      const angle = stableUnit(`${seed}:neighbor:${node.id}`) * Math.PI * 2;
      positions.set(node.id, {
        x: neighborCenter.x + Math.cos(angle) * idealEdgeLength * 1.35,
        y: neighborCenter.y + Math.sin(angle) * idealEdgeLength * 1.35
      });
    }
  }

  const remaining = nodes.filter(node => !positions.has(node.id));
  remaining.forEach((node, index) => {
    const angle = stableUnit(`${seed}:node:${node.id}`) * Math.PI * 2 + index * 0.23;
    const radius = Math.max(idealEdgeLength * 2.6, centerRadius + idealEdgeLength * 1.6);
    positions.set(node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius
    });
  });

  return positions;
}

/**
 * Return a complete deterministic seed, including nodes that do not belong
 * to a curated loop. This prevents a force layout from inventing an initial
 * random state for bridge, leaf and disconnected nodes.
 */
export function buildDeterministicSeed(model, topology, options = {}) {
  const positions = buildLoopAwareSeed(model, topology, options);
  const nodes = [...(model?.nodes || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const idealEdgeLength = Number(options.idealEdgeLength) || 220;
  const center = options.center || { x: 0, y: 0 };
  const seed = options.seed || "loopviewer";
  const remaining = nodes.filter(node => !positions.has(node.id));
  if (!remaining.length) return positions;

  const radius = Math.max(
    idealEdgeLength * 2.4,
    idealEdgeLength * Math.sqrt(Math.max(1, nodes.length)) * 1.35
  );
  remaining.forEach((node, index) => {
    const angle = stableUnit(`${seed}:fallback:${node.id}`) * Math.PI * 2 + index * 0.19;
    positions.set(node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius
    });
  });
  return positions;
}

export function applyLoopAwareSeed(cy, topology, options = {}) {
  const positions = buildLoopAwareSeed(
    {
      nodes: cy.nodes().map(node => node.data()),
      edges: cy.edges().map(edge => edge.data())
    },
    topology,
    options
  );
  cy.batch(() => {
    for (const node of cy.nodes()) {
      if (node.locked() || node.data("position")) continue;
      const position = positions.get(node.id());
      if (position) node.position(position);
    }
  });
  return positions;
}

export function applyDeterministicSeed(cy, topology, options = {}) {
  const positions = buildDeterministicSeed(
    {
      nodes: cy.nodes().map(node => node.data()),
      edges: cy.edges().map(edge => edge.data())
    },
    topology,
    options
  );
  cy.batch(() => {
    for (const node of cy.nodes()) {
      if (node.locked() || node.data("position")) continue;
      const position = positions.get(node.id());
      if (position) node.position(position);
    }
  });
  return positions;
}

/**
 * Build a compact candidate without changing the graph's semantic anchors.
 * The layout engine can be overly generous with whitespace on sparse maps;
 * this variant gives the quality scorer a denser composition to consider.
 */
export function buildCompactPositionVariant(positions, {
  scale = 0.9,
  aspectTarget = 1.9,
  center = null
} = {}) {
  const entries = [...positions.entries()];
  if (!entries.length) return new Map();
  const bounds = entries.reduce((result, [, point]) => ({
    left: Math.min(result.left, point.x),
    right: Math.max(result.right, point.x),
    top: Math.min(result.top, point.y),
    bottom: Math.max(result.bottom, point.y)
  }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const anchor = center || {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2
  };
  let xScale = scale;
  let yScale = scale;
  if (width / height > aspectTarget) xScale *= aspectTarget / (width / height);
  if (height / width > aspectTarget) yScale *= aspectTarget / (height / width);
  return new Map(entries.map(([id, point]) => [id, {
    x: anchor.x + (point.x - anchor.x) * xScale,
    y: anchor.y + (point.y - anchor.y) * yScale
  }]));
}

/**
 * Pull a force-layout result gently toward the deterministic loop skeleton.
 * A small blend preserves useful hub placement while restoring cycle shape.
 */
export function buildSkeletonBlendVariant(positions, skeleton, amount = 0.22) {
  if (!skeleton?.size) return new Map(positions);
  return new Map([...positions.entries()].map(([id, point]) => {
    const anchor = skeleton.get(id);
    if (!anchor) return [id, { ...point }];
    return [id, {
      x: point.x * (1 - amount) + anchor.x * amount,
      y: point.y * (1 - amount) + anchor.y * amount
    }];
  }));
}

function average(points) {
  return points.reduce((sum, point) => ({
    x: sum.x + point.x / points.length,
    y: sum.y + point.y / points.length
  }), { x: 0, y: 0 });
}

function stableUnit(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}
