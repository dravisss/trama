import { curvePolyline, curvesInteraction, segmentDistance } from "../geometry/index.js";
import { ROUTING_ALGORITHM_VERSION } from "../geometry/routeDiagnostics.js";

export function optimizeRoutes(cy, profile, { quality = "balanced", respectLocks = true, loopEdgeIds = [] } = {}) {
  const center = graphCenter(cy);
  const edges = cy.edges().toArray().sort((a, b) => directLength(b) - directLength(a));
  const budget = routingBudget(edges.length, quality, profile);
  const paths = new Map();
  const distances = new Map();
  const routeMeta = new Map();
  const loopSignsByEdge = loopOutwardSigns(cy, loopEdgeIds);
  const loopPairs = loopEdgePairs(loopEdgeIds);
  const fixedEdges = edges.filter(edge => respectLocks && hasLockedRoute(edge));
  const automaticEdges = edges.filter(edge => !hasLockedRoute(edge));

  for (const edge of fixedEdges) {
    const distance = Number(edge.data("route")?.controlPointDistance ?? edge.data("curveDistance"));
    distances.set(edge.id(), distance);
    paths.set(edge.id(), curvePolyline(edge.source().position(), edge.target().position(), distance, budget.interactionSteps));
    routeMeta.set(edge.id(), {
      algorithmVersion: edge.data("route")?.algorithmVersion || ROUTING_ALGORITHM_VERSION,
      normalizedCurvature: normalizedCurvature(edge, distance),
      side: Math.sign(distance) || 0,
      reason: "locked"
    });
  }

  for (const edge of automaticEdges) {
    chooseBest(edge, candidates(edge, center, quality, loopSignsByEdge.get(edge.id()), budget), paths, distances, loopPairs, routeMeta, budget);
  }

  const routingPasses = budget.routingPasses;
  for (let pass = 0; pass < routingPasses; pass++) {
    const ordered = pass % 2 ? [...automaticEdges].reverse() : automaticEdges;
    for (const edge of ordered) {
      chooseBest(edge, candidates(edge, center, quality, loopSignsByEdge.get(edge.id()), budget), paths, distances, loopPairs, routeMeta, budget);
    }
  }

  cy.batch(() => {
    for (const edge of edges) {
      const distance = distances.get(edge.id());
      edge.style({ "control-point-distances": distance, "control-point-weights": 0.5 });
      edge.data("curveDistance", Math.round(distance));
      edge.data("routeLocked", hasLockedRoute(edge));
      const meta = routeMeta.get(edge.id()) || {};
      edge.data("route", {
        ...(edge.data("route") || {}),
        controlPointDistance: distance,
        locked: hasLockedRoute(edge),
        algorithmVersion: meta.algorithmVersion || ROUTING_ALGORITHM_VERSION,
        normalizedCurvature: meta.normalizedCurvature ?? normalizedCurvature(edge, distance),
        side: meta.side ?? (Math.sign(distance) || 0),
        reason: meta.reason || (hasLockedRoute(edge) ? "locked" : "automatic")
      });
      edge.removeData("annotationSide");
    }
  });

  let crossings = 0;
  let closeSegments = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const interaction = curvesInteraction(
        paths.get(edges[i].id()),
        paths.get(edges[j].id()),
        sharesEndpoint(edges[i], edges[j])
      );
      crossings += interaction.crossings;
      closeSegments += interaction.closeSegments;
    }
  }

  let loopCrossings = 0;
  let lockedCrossings = 0;
  for (const pair of loopPairs) {
    const [aId, bId] = pair.split("|");
    const a = cy.getElementById(aId);
    const b = cy.getElementById(bId);
    if (!a.length || !b.length) continue;
    const crossingsForPair = curvesInteraction(paths.get(aId), paths.get(bId), true).crossings;
    loopCrossings += crossingsForPair;
    if (hasLockedRoute(a) && hasLockedRoute(b)) lockedCrossings += crossingsForPair;
  }

  return {
    crossings,
    closeSegments,
    loopCrossings,
    lockedCrossings,
    diverted: [...distances.values()].filter(value => Math.abs(value) > 120).length,
    distances,
    algorithmVersion: ROUTING_ALGORITHM_VERSION
  };

  function chooseBest(edge, edgeCandidates, pathCache, distanceCache, loopPairSet, metadataCache, routeBudget) {
    let best = { score: Infinity, rank: null };
    const preferred = edgeCandidates[0];
    for (const distance of edgeCandidates) {
      const path = curvePolyline(edge.source().position(), edge.target().position(), distance, routeBudget.interactionSteps);
      const candidate = scoreCandidate(cy, edge, path, distance, preferred, pathCache, distanceCache, loopPairSet);
      if (compareCandidate(candidate, best) < 0) {
        best = { ...candidate, distance, path };
      }
    }
    pathCache.set(edge.id(), best.path);
    distanceCache.set(edge.id(), best.distance);
    metadataCache.set(edge.id(), {
      algorithmVersion: ROUTING_ALGORITHM_VERSION,
      normalizedCurvature: normalizedCurvature(edge, best.distance),
      side: Math.sign(best.distance) || 0,
      reason: inferRouteReason(edge, best.distance, preferred)
    });
  }
}

function hasLockedRoute(edge) {
  const route = edge.data("route");
  return Boolean(route?.locked && Number.isFinite(route.controlPointDistance));
}

function normalizedCurvature(edge, distance) {
  return Number((Math.abs(Number(distance) || 0) / (directLength(edge) || 1)).toFixed(3));
}

function inferRouteReason(edge, distance, preferred) {
  const curvature = normalizedCurvature(edge, distance);
  if (preferred && Math.sign(distance) !== Math.sign(preferred)) return "conflict-avoidance";
  if (curvature > 0.55) return "obstacle-detour";
  if (preferred) return "loop-outward";
  if (curvature < 0.05) return "short-clearance";
  return "local-outward";
}

function scoreCandidate(cy, edge, path, distance, preferred, pathCache, distanceCache, loopPairSet = new Set()) {
  // Keep automatic curves on the outward side of the local loop whenever the
  // geometry permits it. Crossings and node overlap still take precedence.
  let score = nodePenalty(cy, edge, path) +
    portPenalty(cy, edge, path, pathCache) +
    parallelLanePenalty(cy, edge, distance, pathCache, distanceCache) +
    terminalCorridorPenalty(cy, edge, path, pathCache);
  const chordLength = directLength(edge) || 1;
  const normalizedCurvature = Math.abs(distance) / chordLength;
  const edgeNodeHits = countNodeHits(cy, edge, path);
  let crossings = 0;
  let closeSegments = 0;
  let loopCrossings = 0;
  const interactionRecords = [];
  for (const [otherId, otherPath] of pathCache) {
    if (otherId === edge.id()) continue;
    const other = cy.getElementById(otherId);
    const interaction = curvesInteraction(path, otherPath, sharesEndpoint(edge, other));
    interactionRecords.push({ otherId, otherPath, other, interaction });
    crossings += interaction.crossings;
    closeSegments += interaction.closeSegments;
    if (loopPairSet.has([edge.id(), otherId].sort().join("|"))) loopCrossings += interaction.crossings;
  }
  const portConflicts = countPortConflicts(cy, edge, path, pathCache);
  const curvatureDebt = normalizedCurvature < 0.085
    ? 0.085 - normalizedCurvature
    : Math.max(0, normalizedCurvature - 0.22);
  const excessiveCurvature = normalizedCurvature > 0.38 ? 1 : 0;
  const extremeCurvature = normalizedCurvature > 0.55 ? 1 : 0;
  const outwardMismatch = preferred !== 0 && Math.sign(distance) !== Math.sign(preferred) ? 1 : 0;
  if (preferred !== 0 && Math.sign(distance) !== Math.sign(preferred)) {
    // Outward is a tie-breaker after readability. It must not justify a giant
    // arc or a crossing simply because it has the preferred sign.
    score += 120000;
  }
  // A normal relation is never visually straight: reserve a small sagitta so
  // long edges remain legible at overview scale. Obstacle avoidance and loop
  // structure still win because this is a soft penalty, not a hard clamp.
  const minimumVisibleCurvature = 0.085;
  if (normalizedCurvature < minimumVisibleCurvature) {
    score += (minimumVisibleCurvature - normalizedCurvature) * 100000;
  }
  score += normalizedCurvature * 2200;
  if (normalizedCurvature > 0.22) score += (normalizedCurvature - 0.22) * 45000;
  if (normalizedCurvature > 0.55) score += (normalizedCurvature - 0.55) * 180000;
  for (const { otherId, otherPath, other, interaction } of interactionRecords) {
    if (otherId === edge.id()) continue;
    const pair = [edge.id(), otherId].sort().join("|");
    const crossingPenalty = loopPairSet.has(pair) ? 220000 : 50000;
    score += interaction.crossings * crossingPenalty + interaction.closeSegments * 900;
    if (!sharesEndpoint(edge, other) && interaction.minimum < 10) score += (10 - interaction.minimum) * 600;
  }
  return {
    score: score + Math.abs(distance) * 0.7 + Math.abs(distance - preferred) * 0.3,
    rank: [
      edgeNodeHits,
      loopCrossings,
      crossings,
      closeSegments,
      portConflicts,
      extremeCurvature,
      excessiveCurvature,
      Number(curvatureDebt.toFixed(4)),
      outwardMismatch,
      Math.abs(distance)
    ]
  };
}

function compareCandidate(a, b) {
  if (!b?.rank) return -1;
  for (let index = 0; index < Math.max(a.rank.length, b.rank.length); index++) {
    const difference = Number(a.rank[index] || 0) - Number(b.rank[index] || 0);
    if (difference !== 0) return difference;
  }
  return Number(a.score || 0) - Number(b.score || 0);
}

function countNodeHits(cy, edge, path) {
  let hits = 0;
  for (const node of cy.nodes()) {
    if (node.id() === edge.source().id() || node.id() === edge.target().id()) continue;
    const position = node.position();
    const envelope = node.data("visualEnvelope") || {};
    const style = node.data("style") || {};
    const width = Number(envelope.width || style.width || style.size || 90);
    const height = Number(envelope.height || style.height || style.size || 90);
    const clearance = Math.max(width, height) / 2 + 18;
    const minimum = Math.min(...path.map(point => Math.hypot(point.x - position.x, point.y - position.y)));
    if (minimum < clearance) hits++;
  }
  return hits;
}

function countPortConflicts(cy, edge, path, cache) {
  let conflicts = 0;
  for (const nodeId of [edge.source().id(), edge.target().id()]) {
    const direction = outward(path, edge, nodeId);
    for (const [otherId, otherPath] of cache) {
      if (otherId === edge.id()) continue;
      const other = cy.getElementById(otherId);
      if (other.source().id() !== nodeId && other.target().id() !== nodeId) continue;
      if (angleBetween(direction, outward(otherPath, other, nodeId)) < 0.18) conflicts++;
    }
  }
  return conflicts;
}

function terminalCorridorPenalty(cy, edge, path, pathCache) {
  let penalty = 0;
  for (const [otherId, otherPath] of pathCache) {
    const other = cy.getElementById(otherId);
    if (!other.length || other.id() === edge.id()) continue;
    const sharedNodeIds = [edge.source().id(), edge.target().id()]
      .filter(nodeId => nodeId === other.source().id() || nodeId === other.target().id());
    for (const nodeId of sharedNodeIds) {
      const localPath = pathFromEndpoint(path, edge, nodeId);
      const otherLocalPath = pathFromEndpoint(otherPath, other, nodeId);
      const tangentAngle = angleBetween(
        directionAtStart(localPath),
        directionAtStart(otherLocalPath)
      );
      if (tangentAngle > 0.72) continue;

      const interaction = corridorInteraction(localPath, otherLocalPath);
      if (interaction.minimum < 28 || interaction.closeSegments > 0) {
        // Penalize a shared tangent corridor strongly enough to choose a
        // nearby opposite-side lane, but allow a deliberate smooth chain when
        // its first few segments actually separate.
        penalty += 18000 + Math.max(0, 28 - interaction.minimum) * 1800;
        penalty += interaction.closeSegments * 2600;
      }
    }
  }
  return penalty;
}

function pathFromEndpoint(path, edge, nodeId) {
  const startsAtNode = edge.source().id() === nodeId;
  const endsAtNode = edge.target().id() === nodeId;
  if (startsAtNode) return path;
  if (endsAtNode) return [...path].reverse();
  return [];
}

function directionAtStart(path) {
  if (path.length < 2) return { x: 1, y: 0 };
  const dx = path[1].x - path[0].x;
  const dy = path[1].y - path[0].y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function corridorInteraction(pathA, pathB) {
  const limitA = Math.min(pathA.length - 1, 7);
  const limitB = Math.min(pathB.length - 1, 7);
  let closeSegments = 0;
  let minimum = Infinity;
  // Skip the first segment: both curves necessarily share the endpoint, so
  // comparing it would report a false overlap for every incident pair.
  for (let i = 1; i < limitA; i++) {
    for (let j = 1; j < limitB; j++) {
      const distance = segmentDistance(pathA[i], pathA[i + 1], pathB[j], pathB[j + 1]);
      minimum = Math.min(minimum, distance);
      if (distance < 18) closeSegments++;
    }
  }
  return { closeSegments, minimum };
}

function parallelLanePenalty(cy, edge, distance, pathCache, distanceCache) {
  let penalty = 0;
  for (const [otherId] of pathCache) {
    const other = cy.getElementById(otherId);
    if (!other.length || other.id() === edge.id()) continue;
    const sameDirection = edge.source().id() === other.source().id() &&
      edge.target().id() === other.target().id();
    const reverseDirection = edge.source().id() === other.target().id() &&
      edge.target().id() === other.source().id();
    if (!sameDirection && !reverseDirection) continue;
    const otherDistance = Number(distanceCache.get(otherId) ?? other.data("curveDistance") ?? 0);
    const separation = Math.abs(distance - otherDistance);
    if (separation < 24) penalty += (24 - separation) * 4200;
  }
  return penalty;
}

function nodePenalty(cy, edge, path) {
  let penalty = 0;
  cy.nodes().forEach(node => {
    if (node.id() === edge.source().id() || node.id() === edge.target().id()) return;
    const position = node.position();
    const envelope = node.data("visualEnvelope") || {};
    const style = node.data("style") || {};
    const width = Number(envelope.width || style.width || style.size || 90);
    const height = Number(envelope.height || style.height || style.size || 90);
    const clearance = Math.max(width, height) / 2 + 18;
    const minimum = Math.min(...path.map(point => Math.hypot(point.x - position.x, point.y - position.y)));
    if (minimum < clearance) penalty += 24000 + (clearance - minimum) * 1200;
    else if (minimum < clearance + 22) penalty += (clearance + 22 - minimum) * 240;
  });
  return penalty;
}

function portPenalty(cy, edge, path, cache) {
  let penalty = 0;
  for (const nodeId of [edge.source().id(), edge.target().id()]) {
    const direction = outward(path, edge, nodeId);
    for (const [otherId, otherPath] of cache) {
      const other = cy.getElementById(otherId);
      if (otherId === edge.id()) continue;
      if (other.source().id() !== nodeId && other.target().id() !== nodeId) continue;
      const angle = angleBetween(direction, outward(otherPath, other, nodeId));
      if (angle < 0.18) penalty += 70000;
      else if (angle < 0.32) penalty += (0.32 - angle) * 70000;
      else if (angle < 0.48) penalty += (0.48 - angle) * 11000;
    }
  }
  return penalty;
}

function routingBudget(edgeCount, quality, profile) {
  const dense = edgeCount > 40;
  const veryDense = edgeCount > 70;
  // Once the graph crosses roughly fifty relations, the full balanced search
  // becomes disproportionate: every extra candidate is compared against most
  // already-routed curves. Keep a bounded coarse search for this scale and
  // reserve the exhaustive pass for explicit publish-quality routing.
  const boundedBalanced = edgeCount > 48 && quality === "balanced";
  if (quality === "draft") {
    return {
      interactionSteps: veryDense ? 6 : dense ? 8 : 12,
      candidateFactors: dense ? [0.2, 0.34, 0.5, 0.7] : null,
      routingPasses: 1
    };
  }
  if (quality === "publish") {
    return {
      interactionSteps: veryDense ? 12 : dense ? 16 : 20,
      candidateFactors: dense ? [0.18, 0.26, 0.36, 0.48, 0.62, 0.8, 1, 1.24, 1.52] : null,
      routingPasses: Math.max(2, profile.routingPasses + (dense ? 1 : 3))
    };
  }
  return {
    interactionSteps: veryDense ? 8 : dense ? 10 : 16,
    candidateFactors: boundedBalanced
      ? [0.24, 0.42, 0.68, 0.96]
      : dense ? [0.2, 0.3, 0.42, 0.56, 0.72, 0.92, 1.16] : null,
    routingPasses: boundedBalanced
      ? 1
      : Math.min(profile.routingPasses, veryDense ? 2 : dense ? 3 : profile.routingPasses)
  };
}

function candidates(edge, center, quality, loopSigns = null, budget = {}) {
  const source = edge.source().position();
  const target = edge.target().position();
  const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  const vector = { x: target.x - source.x, y: target.y - source.y };
  const local = localCentroid(edge, center);
  const toward = { x: local.x - midpoint.x, y: local.y - midpoint.y };
  const naturalSign = vector.x * toward.y - vector.y * toward.x >= 0 ? -1 : 1;
  const loopSignList = preferredLoopSigns(loopSigns, naturalSign);
  // Shared edges can belong to loops whose geometric outward sides disagree.
  // Keep a loop-derived side in that case instead of silently falling back to
  // the local graph centroid, which is often inside one of the loops.
  const outwardSign = loopSignList.length ? loopSignList[0] : naturalSign;
  const scale = Math.max(45, Math.min(190, Math.hypot(vector.x, vector.y) * 0.38));
  const factors = budget.candidateFactors || (quality === "draft"
    ? [0.18, 0.25, 0.34, 0.44, 0.56, 0.7]
    : quality === "publish"
      ? [0.18, 0.25, 0.34, 0.44, 0.56, 0.7, 0.84, 1.02, 1.2, 1.4, 1.64, 1.86]
      : [0.18, 0.25, 0.34, 0.44, 0.56, 0.7, 0.84, 1.04, 1.3, 1.58]);
  return [...new Set(factors.flatMap(factor => {
    const value = Math.round(scale * factor);
    return [outwardSign * value, -outwardSign * value];
  }))];
}

function loopOutwardSigns(cy, loopEdgeIds) {
  const signsByEdge = new Map();
  for (const edgeIds of loopEdgeIds) {
    const loopNodes = new Map();
    for (const edgeId of edgeIds) {
      const edge = cy.getElementById(edgeId);
      if (!edge.length) continue;
      loopNodes.set(edge.source().id(), edge.source());
      loopNodes.set(edge.target().id(), edge.target());
    }
    if (loopNodes.size < 3) continue;
    const center = [...loopNodes.values()].reduce((sum, node) => {
      const point = node.position();
      return { x: sum.x + point.x / loopNodes.size, y: sum.y + point.y / loopNodes.size };
    }, { x: 0, y: 0 });
    const windingSign = loopWindingSign(cy, edgeIds);
    for (const edgeId of edgeIds) {
      const edge = cy.getElementById(edgeId);
      if (!edge.length) continue;
      const source = edge.source().position();
      const target = edge.target().position();
      const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
      const vector = { x: target.x - source.x, y: target.y - source.y };
      const toward = { x: center.x - midpoint.x, y: center.y - midpoint.y };
      const centroidSign = vector.x * toward.y - vector.y * toward.x >= 0 ? -1 : 1;
      const sign = windingSign ?? centroidSign;
      if (!signsByEdge.has(edgeId)) signsByEdge.set(edgeId, new Map());
      const signCounts = signsByEdge.get(edgeId);
      signCounts.set(sign, (signCounts.get(sign) || 0) + 1);
    }
  }
  return signsByEdge;
}

function preferredLoopSigns(loopSigns, naturalSign) {
  if (!loopSigns) return [];
  if (loopSigns instanceof Map) {
    const ranked = [...loopSigns.entries()].sort((a, b) => {
      const countDelta = b[1] - a[1];
      if (countDelta !== 0) return countDelta;
      return a[0] === naturalSign ? -1 : 1;
    });
    return ranked.map(([sign]) => sign);
  }
  return [...loopSigns];
}

function loopWindingSign(cy, edgeIds) {
  const edges = edgeIds
    .map(edgeId => cy.getElementById(edgeId))
    .filter(edge => edge.length);
  if (edges.length < 3) return null;

  const orderedNodes = [edges[0].source()];
  let current = edges[0].target();
  const remaining = edges.slice(1);
  while (remaining.length && current.id() !== orderedNodes[0].id()) {
    const index = remaining.findIndex(edge => edge.source().id() === current.id());
    if (index < 0) return null;
    const edge = remaining.splice(index, 1)[0];
    orderedNodes.push(current);
    current = edge.target();
  }
  if (current.id() !== orderedNodes[0].id() || orderedNodes.length < 3) return null;

  let areaTwice = 0;
  for (let index = 0; index < orderedNodes.length; index++) {
    const a = orderedNodes[index].position();
    const b = orderedNodes[(index + 1) % orderedNodes.length].position();
    areaTwice += a.x * b.y - b.x * a.y;
  }
  if (Math.abs(areaTwice) < 1e-6) return null;
  return areaTwice >= 0 ? -1 : 1;
}

function loopEdgePairs(loopEdgeIds) {
  const pairs = new Set();
  for (const edgeIds of loopEdgeIds) {
    for (let i = 0; i < edgeIds.length; i++) {
      for (let j = i + 1; j < edgeIds.length; j++) {
        pairs.add([edgeIds[i], edgeIds[j]].sort().join("|"));
      }
    }
  }
  return pairs;
}

function graphCenter(cy) {
  const nodes = cy.nodes();
  const total = nodes.reduce((sum, node) => {
    const p = node.position();
    return { x: sum.x + p.x, y: sum.y + p.y };
  }, { x: 0, y: 0 });
  return { x: total.x / nodes.length, y: total.y / nodes.length };
}

function localCentroid(edge, fallback) {
  const excluded = new Set([edge.source().id(), edge.target().id()]);
  const neighbors = edge.source().neighborhood("node").union(edge.target().neighborhood("node"))
    .filter(node => !excluded.has(node.id()));
  if (!neighbors.length) return fallback;
  const total = neighbors.reduce((sum, node) => {
    const p = node.position();
    return { x: sum.x + p.x, y: sum.y + p.y };
  }, { x: 0, y: 0 });
  return { x: total.x / neighbors.length, y: total.y / neighbors.length };
}

function sharesEndpoint(a, b) {
  return a.source().id() === b.source().id() || a.source().id() === b.target().id() ||
    a.target().id() === b.source().id() || a.target().id() === b.target().id();
}

function directLength(edge) {
  const a = edge.source().position();
  const b = edge.target().position();
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function outward(path, edge, nodeId) {
  if (edge.source().id() === nodeId) return { x: path[2].x - path[0].x, y: path[2].y - path[0].y };
  const last = path.length - 1;
  return { x: path[last - 2].x - path[last].x, y: path[last - 2].y - path[last].y };
}

function angleBetween(a, b) {
  const denominator = (Math.hypot(a.x, a.y) || 1) * (Math.hypot(b.x, b.y) || 1);
  return Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / denominator)));
}
