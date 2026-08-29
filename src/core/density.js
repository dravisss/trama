export function analyzeDensity(model) {
  const nodeCount = model.nodes.length;
  const edgeCount = model.edges.length;
  const ratio = edgeCount / Math.max(1, nodeCount);

  if (nodeCount <= 8 && ratio < 1.7) return { name: "sparse", nodeCount, edgeCount, ratio };
  if (nodeCount <= 14 && ratio < 2.25) return { name: "medium", nodeCount, edgeCount, ratio };
  return { name: "dense", nodeCount, edgeCount, ratio };
}

export const densityProfiles = {
  sparse: {
    scaleClass: "small",
    idealEdgeLength: 180,
    nodeRepulsion: 60000,
    routingPasses: 4,
    layoutAttempts: 2,
    preferredNodeGap: 34,
    maxVisualLoops: 8,
    minimumSignSize: 8,
    hideCollisions: false
  },
  medium: {
    scaleClass: "medium",
    idealEdgeLength: 240,
    nodeRepulsion: 90000,
    routingPasses: 5,
    layoutAttempts: 3,
    preferredNodeGap: 30,
    maxVisualLoops: 12,
    minimumSignSize: 6.5,
    hideCollisions: true
  },
  dense: {
    scaleClass: "large",
    idealEdgeLength: 300,
    nodeRepulsion: 135000,
    routingPasses: 7,
    layoutAttempts: 4,
    preferredNodeGap: 26,
    maxVisualLoops: 12,
    minimumSignSize: 6,
    hideCollisions: true
  }
};

export function resolveDensityProfile(model, overrides = {}) {
  const density = analyzeDensity(model);
  return { density, ...densityProfiles[density.name], ...overrides };
}
