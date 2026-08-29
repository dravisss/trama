import { curvePolyline } from "./index.js";
import { diagnoseRoutes } from "./routeDiagnostics.js";

export function evaluateLayoutQuality(cy, routing = {}, { loopEdgeIds = [] } = {}) {
  const nodes = cy.nodes().toArray();
  const edges = cy.edges().toArray();
  let nodeOverlaps = 0;
  let labelOverlaps = 0;
  let edgeNodeHits = 0;
  let edgeLength = 0;
  let excessiveCurvatureCount = 0;
  let excessiveCurvatureMagnitude = 0;
  const paths = new Map();

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i].position();
      const b = nodes[j].position();
      const aSize = nodeDimensions(nodes[i]);
      const bSize = nodeDimensions(nodes[j]);
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      const nodeGap = Math.max(92, (aSize.width + bSize.width + aSize.height + bSize.height) / 4 + 16);
      if (distance < nodeGap) nodeOverlaps++;
      // Headless Cytoscape has no label bounds. Use the visual node envelope
      // as a conservative label proxy so fresh maps are not accepted while
      // their text-bearing circles are visibly stacked.
      if (distance < nodeGap + 10) labelOverlaps++;
    }
  }

  for (const edge of edges) {
    const source = edge.source().position();
    const target = edge.target().position();
    edgeLength += Math.hypot(target.x - source.x, target.y - source.y);
    const distance = Number(edge.data("curveDistance") || 0);
    const chordLength = Math.hypot(target.x - source.x, target.y - source.y) || 1;
    const normalizedCurvature = Math.abs(distance) / chordLength;
    if (normalizedCurvature > 0.38) {
      excessiveCurvatureCount++;
      excessiveCurvatureMagnitude += normalizedCurvature - 0.38;
    }
    const path = curvePolyline(source, target, distance);
    paths.set(edge.id(), path);
    for (const node of nodes) {
      if (node.id() === edge.source().id() || node.id() === edge.target().id()) continue;
      const position = node.position();
      const minimum = Math.min(...path.map(point => Math.hypot(point.x - position.x, point.y - position.y)));
      const dimensions = nodeDimensions(node);
      const clearance = Math.max(dimensions.width, dimensions.height) / 2 + 18;
      if (minimum < clearance) edgeNodeHits++;
    }
  }

  const bounds = cy.nodes().boundingBox();
  const shortSide = Math.max(1, Math.min(bounds.w, bounds.h));
  const aspectRatio = Math.max(bounds.w, bounds.h) / shortSide;
  const aspectPenalty = Math.max(0, aspectRatio - 2.1);
  const crossings = Number(routing.crossings || 0);
  const loopCrossings = Number(routing.loopCrossings || 0);
  const lockedCrossings = Number(routing.lockedCrossings || 0);
  const innerLoopCurves = countInnerLoopCurves(cy, loopEdgeIds);
  const loopShapePenalty = measureLoopShape(cy, loopEdgeIds);
  const portMetrics = countPortCongestion(cy, paths);
  const routeDiagnostics = diagnoseRoutes(cy, routing);
  const annotationCollisions = Number(routing.annotationCollisions || 0);

  const metrics = {
    crossings,
    loopCrossings,
    lockedCrossings,
    nodeOverlaps,
    labelOverlaps,
    edgeNodeHits,
    annotationCollisions,
    ambiguousTangencies: Number(routing.closeSegments || 0),
    excessiveCurvatureCount,
    excessiveCurvatureMagnitude: Number(excessiveCurvatureMagnitude.toFixed(3)),
    innerLoopCurves,
    loopShapePenalty,
    portCongestion: portMetrics.portCongestion,
    lockedPortCongestion: portMetrics.lockedPortCongestion,
    minimumEdgeNodeClearance: routeDiagnostics.metrics.minimumEdgeNodeClearance,
    routeExceptionCount: routeDiagnostics.metrics.routeExceptionCount,
    shallowCurvatureCount: routeDiagnostics.metrics.shallowCurvatureCount,
    edgeLength: Math.round(edgeLength),
    aspectRatio: Number(aspectRatio.toFixed(2))
  };
  const scored = { ...metrics, aspectPenalty };
  return {
    ...metrics,
    qualityVector: layoutQualityVector(scored),
    score: scoreLayoutMetrics(scored),
    routeDiagnostics
  };
}

export function layoutQualityVector(metrics = {}) {
  const hardViolations = Number(metrics.nodeOverlaps || 0) +
    Number(metrics.edgeNodeHits || 0) +
    Number(metrics.labelOverlaps || 0) +
    Number(metrics.annotationCollisions || 0);
  return [
    hardViolations,
    Number(metrics.loopCrossings || 0),
    Number(metrics.edgeNodeHits || 0),
    Number(metrics.labelOverlaps || 0),
    Number(metrics.annotationCollisions || 0),
    Number(metrics.crossings || 0),
    Number(metrics.ambiguousTangencies || metrics.closeSegments || 0),
    Number(metrics.portCongestion || 0),
    Number(metrics.excessiveCurvatureCount || 0),
    Number(metrics.excessiveCurvatureMagnitude || 0),
    Number(metrics.lockedCrossings || 0),
    Number(metrics.loopShapePenalty || 0),
    Number(metrics.edgeLength || 0),
    Number(metrics.aspectPenalty || Math.max(0, Number(metrics.aspectRatio || 1) - 2.1))
  ];
}

export function compareLayoutQuality(a = {}, b = {}) {
  const left = a.qualityVector || layoutQualityVector(a);
  const right = b.qualityVector || layoutQualityVector(b);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = Number(left[index] || 0) - Number(right[index] || 0);
    if (difference !== 0) return difference;
  }
  return Number(a.score || 0) - Number(b.score || 0);
}

export function evaluateQualityGate(metrics = {}, { nodeCount = 0, edgeCount = 0, mode = "balanced" } = {}) {
  const reasons = [];
  const hardViolations = Number(metrics.nodeOverlaps || 0) +
    Number(metrics.edgeNodeHits || 0) +
    Number(metrics.labelOverlaps || 0) +
    Number(metrics.annotationCollisions || 0);
  if (hardViolations) reasons.push("hard-collision");
  if (Number(metrics.loopCrossings || 0)) reasons.push("loop-crossing");

  // Locked crossings are reported, but they are not treated as automatic
  // failures: a deliberate manual route is an editorial exception.
  const automaticCrossings = Math.max(
    0,
    Number(metrics.crossings || 0) - Number(metrics.lockedCrossings || 0)
  );
  const crossingBudget = edgeCount <= 12 ? 0 : Math.floor(edgeCount / 24);
  if (automaticCrossings > crossingBudget) reasons.push("edge-crossing");
  const innerLoopBudget = nodeCount > 15 ? 1 : 0;
  if (Number(metrics.innerLoopCurves || 0) > innerLoopBudget) reasons.push("inner-loop-curve");
  if (mode === "publish" && Number(metrics.excessiveCurvatureCount || 0)) {
    reasons.push("excessive-curvature");
  }
  if (nodeCount <= 25 && Number(metrics.portCongestion || 0)) reasons.push("port-congestion");

  return {
    accepted: reasons.length === 0,
    reasons,
    hardViolations,
    automaticCrossings,
    crossingBudget,
    innerLoopBudget
  };
}

export function scoreLayoutMetrics(metrics) {
  return (
    Number(metrics.loopCrossings || 0) * 350000 +
    Number(metrics.crossings || 0) * 100000 +
    Number(metrics.edgeNodeHits || 0) * 60000 +
    Number(metrics.nodeOverlaps || 0) * 80000 +
    Number(metrics.labelOverlaps || 0) * 70000 +
    Number(metrics.annotationCollisions || 0) * 65000 +
    Number(metrics.innerLoopCurves || 0) * 140000 +
    Number(metrics.loopShapePenalty || 0) * 18000 +
    Number(metrics.ambiguousTangencies || metrics.closeSegments || 0) * 1400 +
    Number(metrics.excessiveCurvatureCount || 0) * 42000 +
    Number(metrics.excessiveCurvatureMagnitude || 0) * 36000 +
    Number(metrics.portCongestion || 0) * 30000 +
    Number(metrics.lockedCrossings || 0) * 50000 +
    Number(metrics.edgeLength || 0) * 0.35 +
    Number(metrics.aspectPenalty || Math.max(0, Number(metrics.aspectRatio || 1) - 2.1)) * 25000
  );
}

function measureLoopShape(cy, loopEdgeIds) {
  let penalty = 0;
  for (const edgeIds of loopEdgeIds) {
    const nodes = new Map();
    for (const edgeId of edgeIds) {
      const edge = cy.getElementById(edgeId);
      if (!edge.length) continue;
      nodes.set(edge.source().id(), edge.source());
      nodes.set(edge.target().id(), edge.target());
    }
    if (nodes.size < 3) continue;
    const points = [...nodes.values()].map(node => node.position());
    const center = points.reduce((sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length
    }), { x: 0, y: 0 });
    const radii = points.map(point => Math.hypot(point.x - center.x, point.y - center.y));
    const meanRadius = radii.reduce((sum, value) => sum + value, 0) / radii.length || 1;
    const radialVariance = radii.reduce((sum, value) =>
      sum + Math.abs(value - meanRadius) / meanRadius, 0) / radii.length;
    const lengths = [...nodes.values()].map(node => {
      const outgoing = node.outgoers("node").filter(other => nodes.has(other.id())).first();
      if (!outgoing?.length) return null;
      const a = node.position();
      const b = outgoing.position();
      return Math.hypot(b.x - a.x, b.y - a.y);
    }).filter(value => Number.isFinite(value));
    const meanLength = lengths.reduce((sum, value) => sum + value, 0) / (lengths.length || 1) || 1;
    const lengthVariance = lengths.reduce((sum, value) =>
      sum + Math.abs(value - meanLength) / meanLength, 0) / (lengths.length || 1);
    // Shared hubs and bridge-heavy cycles are allowed to be imperfect. The
    // penalty is deliberately soft and only breaks ties between clear maps.
    penalty += Math.min(8, radialVariance * 2.4 + lengthVariance * 1.6);
  }
  return Number(penalty.toFixed(3));
}

function countPortCongestion(cy, paths) {
  let portCongestion = 0;
  let lockedPortCongestion = 0;
  for (const node of cy.nodes()) {
    const directions = node.connectedEdges().map(edge => {
      const path = paths.get(edge.id());
      if (!path?.length) return null;
      const angle = edge.source().id() === node.id()
        ? Math.atan2(path[2].y - path[0].y, path[2].x - path[0].x)
        : (() => {
          const last = path.length - 1;
          return Math.atan2(path[last - 2].y - path[last].y, path[last - 2].x - path[last].x);
        })();
      return { angle, locked: Boolean(edge.data("routeLocked")) };
    }).filter(value => value !== null).sort((a, b) => a.angle - b.angle);
    if (directions.length < 2) continue;
    const gaps = directions.slice(1).map((entry, index) => ({
      gap: entry.angle - directions[index].angle,
      edges: [entry, directions[index]]
    }));
    gaps.push({ gap: directions[0].angle + Math.PI * 2 - directions.at(-1).angle, edges: [directions[0], directions.at(-1)] });
    for (const { gap, edges } of gaps) {
      // Below ~10 degrees the ports are visually indistinguishable; wider
      // gaps are close but still readable in the Matcha scale.
      if (gap >= 0.18) continue;
      if (edges.every(edge => edge.locked)) lockedPortCongestion++;
      else portCongestion++;
    }
  }
  return { portCongestion, lockedPortCongestion };
}

function countInnerLoopCurves(cy, loopEdgeIds) {
  const allowedSigns = new Map();
  for (const edgeIds of loopEdgeIds) {
    const nodes = new Map();
    for (const edgeId of edgeIds) {
      const edge = cy.getElementById(edgeId);
      if (!edge.length) continue;
      nodes.set(edge.source().id(), edge.source());
      nodes.set(edge.target().id(), edge.target());
    }
    if (nodes.size < 3) continue;
    const center = [...nodes.values()].reduce((sum, node) => {
      const point = node.position();
      return { x: sum.x + point.x / nodes.size, y: sum.y + point.y / nodes.size };
    }, { x: 0, y: 0 });
    for (const edgeId of edgeIds) {
      const edge = cy.getElementById(edgeId);
      if (!edge.length) continue;
      const source = edge.source().position();
      const target = edge.target().position();
      const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
      const vector = { x: target.x - source.x, y: target.y - source.y };
      const toward = { x: center.x - midpoint.x, y: center.y - midpoint.y };
      const outwardSign = vector.x * toward.y - vector.y * toward.x >= 0 ? -1 : 1;
      if (!allowedSigns.has(edgeId)) allowedSigns.set(edgeId, new Set());
      allowedSigns.get(edgeId).add(outwardSign);
    }
  }
  let count = 0;
  for (const [edgeId, signs] of allowedSigns) {
    const edge = cy.getElementById(edgeId);
    const sign = Math.sign(Number(edge.data("curveDistance") || 0));
    if (sign && !signs.has(sign)) count++;
  }
  return count;
}

function nodeDimensions(node) {
  const envelope = node.data("visualEnvelope") || {};
  if (Number(envelope.width) > 0 || Number(envelope.height) > 0) {
    return {
      width: Number(envelope.width) || 90,
      height: Number(envelope.height) || 90
    };
  }
  const style = node.data("style") || {};
  const width = finitePositive(style.width) || finitePositive(style.size) || 90;
  const height = finitePositive(style.height) || finitePositive(style.size) || 90;
  return { width, height };
}

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
