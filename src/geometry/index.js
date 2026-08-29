export function bezierPoint(source, target, cpDistance, t) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy) || 1;
  const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  const control = {
    x: midpoint.x + (-dy / length) * cpDistance,
    y: midpoint.y + (dx / length) * cpDistance
  };
  const mt = 1 - t;
  return {
    x: mt * mt * source.x + 2 * mt * t * control.x + t * t * target.x,
    y: mt * mt * source.y + 2 * mt * t * control.y + t * t * target.y
  };
}

export function curvePolyline(source, target, cpDistance, steps = 28) {
  return Array.from({ length: steps + 1 }, (_, index) =>
    bezierPoint(source, target, cpDistance, index / steps)
  );
}

export function pointSegmentDistance(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function segmentDistance(a, b, c, d) {
  if (segmentsCross(a, b, c, d)) return 0;
  return Math.min(
    pointSegmentDistance(a, c, d),
    pointSegmentDistance(b, c, d),
    pointSegmentDistance(c, a, b),
    pointSegmentDistance(d, a, b)
  );
}

export function curvesInteraction(pathA, pathB, sharesEndpoint) {
  const crossingPoints = [];
  const closePoints = [];
  let minimum = Infinity;
  const guard = sharesEndpoint ? 4 : 0;
  for (let i = guard; i < pathA.length - 1 - guard; i++) {
    for (let j = guard; j < pathB.length - 1 - guard; j++) {
      const distance = segmentDistance(pathA[i], pathA[i + 1], pathB[j], pathB[j + 1]);
      minimum = Math.min(minimum, distance);
      const point = segmentPairCenter(pathA[i], pathA[i + 1], pathB[j], pathB[j + 1]);
      if (distance === 0) {
        if (!crossingPoints.some(existing => Math.hypot(existing.x - point.x, existing.y - point.y) < 12)) {
          crossingPoints.push(point);
        }
      } else if (distance < 18) {
        if (!closePoints.some(existing => Math.hypot(existing.x - point.x, existing.y - point.y) < 14)) {
          closePoints.push(point);
        }
      }
    }
  }
  return {
    crossings: crossingPoints.length,
    closeSegments: Math.min(6, closePoints.length),
    minimum
  };
}

function segmentPairCenter(a, b, c, d) {
  return {
    x: (a.x + b.x + c.x + d.x) / 4,
    y: (a.y + b.y + c.y + d.y) / 4
  };
}

export function arcLengthTable(points) {
  let total = 0;
  return points.map((point, index) => {
    if (index) total += Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y);
    return { ...point, length: total };
  });
}

export function pointAtArcDistance(table, distance) {
  const total = table.at(-1).length;
  const wanted = Math.max(0, Math.min(total, distance));
  let upperIndex = table.findIndex(point => point.length >= wanted);
  if (upperIndex <= 0) upperIndex = 1;
  const upper = table[upperIndex];
  const lower = table[upperIndex - 1];
  const ratio = (wanted - lower.length) / (upper.length - lower.length || 1);
  const tangent = { x: upper.x - lower.x, y: upper.y - lower.y };
  const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
  return {
    point: {
      x: lower.x + (upper.x - lower.x) * ratio,
      y: lower.y + (upper.y - lower.y) * ratio
    },
    tangent: { x: tangent.x / tangentLength, y: tangent.y / tangentLength },
    total
  };
}

export function alignedNormal(tangent, referenceNormal) {
  const a = { x: -tangent.y, y: tangent.x };
  const b = { x: tangent.y, y: -tangent.x };
  const dotA = a.x * referenceNormal.x + a.y * referenceNormal.y;
  const dotB = b.x * referenceNormal.x + b.y * referenceNormal.y;
  return dotA >= dotB ? a : b;
}

export function chordNormal(table, side) {
  const source = table[0];
  const target = table.at(-1);
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: (-dy / length) * side, y: (dx / length) * side };
}

export function rectangleIntersects(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

export { deriveLoopTopology } from "./loopTopology.js";
export {
  applyDeterministicSeed,
  applyLoopAwareSeed,
  buildCompactPositionVariant,
  buildDeterministicSeed,
  buildLoopAwareSeed,
  buildSkeletonBlendVariant
} from "./loopSeed.js";
export { ROUTING_ALGORITHM_VERSION, diagnoseRoutes, routeClass } from "./routeDiagnostics.js";

function orientation(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsCross(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}
