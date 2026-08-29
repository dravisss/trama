import { curvePolyline, curvesInteraction } from "./index.js";

// Increment this whenever the route contract or its scoring semantics change.
// It is persisted with saved routes so old automatic decisions remain
// explainable instead of looking like unexplained manual edits.
export const ROUTING_ALGORITHM_VERSION = "routing-v4";

export function diagnoseRoutes(cy, routing = {}) {
  const edges = cy?.edges?.().toArray?.() || [];
  const nodes = cy?.nodes?.().toArray?.() || [];
  const paths = new Map();
  const edgeDiagnostics = {};
  let minimumEdgeNodeClearance = Infinity;
  let excessiveCurvatureCount = 0;
  let excessiveCurvatureMagnitude = 0;
  let shallowCurvatureCount = 0;
  let routeExceptionCount = 0;
  let closeEdgePairs = 0;
  let crossingPairs = 0;

  for (const edge of edges) {
    const source = edge.source().position();
    const target = edge.target().position();
    const distance = Number(edge.data("curveDistance") || edge.data("route")?.controlPointDistance || 0);
    const chordLength = Math.hypot(target.x - source.x, target.y - source.y) || 1;
    const normalizedCurvature = Math.abs(distance) / chordLength;
    const path = curvePolyline(source, target, distance);
    paths.set(edge.id(), path);

    let minimumNodeClearance = Infinity;
    const blockingNodes = [];
    for (const node of nodes) {
      if (node.id() === edge.source().id() || node.id() === edge.target().id()) continue;
      const clearance = minimumPathClearance(path, node);
      minimumNodeClearance = Math.min(minimumNodeClearance, clearance);
      if (clearance < 18) blockingNodes.push(node.id());
    }
    if (!Number.isFinite(minimumNodeClearance)) minimumNodeClearance = null;
    if (minimumNodeClearance !== null) {
      minimumEdgeNodeClearance = Math.min(minimumEdgeNodeClearance, minimumNodeClearance);
    }

    const excessive = normalizedCurvature > 0.38;
    const shallow = normalizedCurvature < 0.05;
    if (excessive) {
      excessiveCurvatureCount++;
      excessiveCurvatureMagnitude += normalizedCurvature - 0.38;
    }
    if (shallow) shallowCurvatureCount++;
    if (blockingNodes.length) routeExceptionCount++;

    const persisted = edge.data("route") || {};
    edgeDiagnostics[edge.id()] = {
      edgeId: edge.id(),
      locked: Boolean(edge.data("routeLocked") || persisted.locked),
      controlPointDistance: round(distance),
      chordLength: round(chordLength),
      normalizedCurvature: round(normalizedCurvature),
      routeClass: routeClass(normalizedCurvature),
      minimumNodeClearance: minimumNodeClearance === null ? null : round(minimumNodeClearance),
      blockingNodes,
      side: Math.sign(distance) || 0,
      reason: persisted.reason || edge.data("routeReason") || "automatic"
    };
  }

  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i];
      const b = edges[j];
      const interaction = curvesInteraction(
        paths.get(a.id()),
        paths.get(b.id()),
        sharesEndpoint(a, b)
      );
      if (interaction.crossings) crossingPairs++;
      if (interaction.closeSegments || interaction.minimum < 18) closeEdgePairs++;
    }
  }

  const metrics = {
    algorithmVersion: ROUTING_ALGORITHM_VERSION,
    minimumEdgeNodeClearance: Number.isFinite(minimumEdgeNodeClearance)
      ? round(minimumEdgeNodeClearance)
      : null,
    excessiveCurvatureCount,
    excessiveCurvatureMagnitude: round(excessiveCurvatureMagnitude),
    shallowCurvatureCount,
    routeExceptionCount,
    closeEdgePairs,
    crossingPairs,
    lockedRouteCount: edges.filter(edge => Boolean(edge.data("routeLocked") || edge.data("route")?.locked)).length,
    crossings: Number(routing.crossings || 0),
    closeSegments: Number(routing.closeSegments || 0),
    loopCrossings: Number(routing.loopCrossings || 0),
    lockedCrossings: Number(routing.lockedCrossings || 0)
  };

  return { algorithmVersion: ROUTING_ALGORITHM_VERSION, metrics, edges: edgeDiagnostics, paths };
}

export function routeClass(normalizedCurvature) {
  if (normalizedCurvature < 0.05) return "straight";
  if (normalizedCurvature < 0.16) return "gentle";
  if (normalizedCurvature < 0.38) return "moderate";
  return "deep";
}

function minimumPathClearance(path, node) {
  const position = node.position();
  const dimensions = nodeDimensions(node);
  const radius = Math.max(dimensions.width, dimensions.height) / 2;
  return Math.min(...path.map(point => Math.hypot(point.x - position.x, point.y - position.y))) - radius;
}

function nodeDimensions(node) {
  const style = node.data("style") || {};
  const width = finitePositive(style.width) || finitePositive(style.size) || 90;
  const height = finitePositive(style.height) || finitePositive(style.size) || 90;
  return { width, height };
}

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function sharesEndpoint(a, b) {
  return a.source().id() === b.source().id() || a.source().id() === b.target().id() ||
    a.target().id() === b.source().id() || a.target().id() === b.target().id();
}

function round(value) {
  return Number(Number(value).toFixed(3));
}
