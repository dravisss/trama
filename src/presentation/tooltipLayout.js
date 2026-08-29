/**
 * Pure placement primitives for the experimental relation-tooltip player.
 *
 * Coordinates are local to the presentation stage. The DOM adapter is kept
 * in app.js so this module can be tested without a browser or Cytoscape.
 */

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function tooltipModeForFocus({ kind = "custom", nodeIds = [], edgeIds = [], loopIds = [] } = {}) {
  const nodeCount = uniqueIds(nodeIds).length;
  const edgeCount = uniqueIds(edgeIds).length;
  const loopCount = uniqueIds(loopIds).length;
  if (kind === "node" && nodeCount === 1 && edgeCount === 0 && loopCount === 0) return "tethered";
  if (kind === "edge" && edgeCount === 1 && nodeCount === 0 && loopCount === 0) return "tethered";
  return "parked";
}

/**
 * Pick a card placement for a focused point or a compound focus.
 *
 * `bounds` is the usable stage rectangle, `anchor` is the focused point for
 * tethered placements, and obstacles are circles or rectangles in the same
 * coordinate system. The result is deterministic for the same inputs.
 */
export function chooseTooltipPlacement({
  mode = "parked",
  bounds,
  width = 360,
  height = 180,
  anchor = null,
  obstacles = [],
  chrome = [],
  margin = 20,
  grid = 26,
  gap = 28
} = {}) {
  const safeBounds = normalizeBounds(bounds);
  const size = { width: Math.max(1, Number(width) || 1), height: Math.max(1, Number(height) || 1) };
  if (!safeBounds) return { mode, x: 0, y: 0, connector: null, score: 0 };

  const available = placementBounds(safeBounds, size, margin);
  if (mode === "tethered" && anchor) {
    const candidates = gridCandidates(available, size, grid);
    const best = candidates
      .map(rect => ({
        ...rect,
        score: tetheredPenalty(rect, anchor, obstacles, chrome, gap)
      }))
      .sort((a, b) => a.score - b.score || distanceToAnchor(a, anchor) - distanceToAnchor(b, anchor))[0];
    const rect = best || fallbackTethered(available, anchor, size, gap);
    return {
      mode: "tethered",
      x: rect.x,
      y: rect.y,
      connector: { from: { x: anchor.x, y: anchor.y }, to: nearestPointOnRect(rect, anchor) },
      score: best?.score ?? tetheredPenalty(rect, anchor, obstacles, chrome, gap)
    };
  }

  const parked = parkedCandidates(available, safeBounds, size, margin);
  const best = parked
    .map(rect => ({
      ...rect,
      score: parkedPenalty(rect, obstacles, chrome)
    }))
    .sort((a, b) => b.score - a.score || a.y - b.y)[0];
  const rect = best || { x: available.x0, y: available.y0 };
  return {
    mode: "parked",
    x: rect.x,
    y: rect.y,
    connector: null,
    score: best?.score ?? parkedPenalty(rect, obstacles, chrome)
  };
}

/**
 * Keep the chosen relation-tooltip side stable while the camera moves.
 *
 * Placement selection is intentionally discrete and relatively expensive. It
 * belongs to a semantic/layout change, not to every camera render frame.
 */
export function createTooltipTrackingState({
  key = "",
  mode = "parked",
  placement = {},
  anchor = null,
  width = 1,
  height = 1,
  bounds = null,
  margin = 20
} = {}) {
  return {
    key,
    mode: placement.mode || mode,
    x: Number(placement.x) || 0,
    y: Number(placement.y) || 0,
    width: Math.max(1, Number(width) || 1),
    height: Math.max(1, Number(height) || 1),
    bounds: normalizeBounds(bounds),
    margin: Math.max(0, Number(margin) || 0),
    offset: anchor && Number.isFinite(Number(anchor.x)) && Number.isFinite(Number(anchor.y))
      ? {
        x: (Number(placement.x) || 0) - Number(anchor.x),
        y: (Number(placement.y) || 0) - Number(anchor.y)
      }
      : null
  };
}

/**
 * Track a previously selected placement without choosing another grid cell.
 * The result is continuous except when the card reaches the safe bounds.
 */
export function trackTooltipPlacement({
  state,
  bounds,
  width = state?.width || 1,
  height = state?.height || 1,
  anchor = null,
  margin = state?.margin || 20,
  followAnchor = true
} = {}) {
  if (!state) return null;
  const safeBounds = normalizeBounds(bounds);
  if (!safeBounds) return null;
  const size = {
    width: Math.max(1, Number(width) || state.width || 1),
    height: Math.max(1, Number(height) || state.height || 1)
  };
  const available = placementBounds(safeBounds, size, Math.max(0, Number(margin) || 0));
  const tethered = state.mode === "tethered" && anchor && state.offset;
  const movingCard = tethered && followAnchor;
  const x = movingCard
    ? clamp(Number(anchor.x) + state.offset.x, available.x0, available.x1)
    : clamp(state.x, available.x0, available.x1);
  const y = movingCard
    ? clamp(Number(anchor.y) + state.offset.y, available.y0, available.y1)
    : clamp(state.y, available.y0, available.y1);
  const rect = { x, y, width: size.width, height: size.height };
  return {
    mode: state.mode,
    x,
    y,
    connector: tethered
      ? { from: { x: Number(anchor.x), y: Number(anchor.y) }, to: nearestPointOnRect(rect, anchor) }
      : null,
    score: 0
  };
}

export function nearestPointOnRect(rect, point) {
  return {
    x: clamp(point.x, rect.x, rect.x + rect.width),
    y: clamp(point.y, rect.y, rect.y + rect.height)
  };
}

export function rectOverlapArea(a, b) {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

export function rectPointDistance(rect, point) {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}

function normalizeBounds(value) {
  if (!value) return null;
  const x = Number(value.x) || 0;
  const y = Number(value.y) || 0;
  const width = Number(value.width);
  const height = Number(value.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function placementBounds(bounds, size, margin) {
  const x0 = bounds.x + margin;
  const y0 = bounds.y + margin;
  const x1 = Math.max(x0, bounds.x + bounds.width - margin - size.width);
  const y1 = Math.max(y0, bounds.y + bounds.height - margin - size.height);
  return { x0, y0, x1, y1 };
}

function gridCandidates(bounds, size, step) {
  const candidates = [];
  const increment = Math.max(8, Number(step) || 26);
  for (let x = bounds.x0; x <= bounds.x1 + 0.01; x += increment) {
    for (let y = bounds.y0; y <= bounds.y1 + 0.01; y += increment) candidates.push({ x, y, width: size.width, height: size.height });
  }
  if (!candidates.length) candidates.push({ x: bounds.x0, y: bounds.y0, width: size.width, height: size.height });
  return candidates;
}

function parkedCandidates(available, bounds, size, margin) {
  const right = clamp(bounds.x + bounds.width - margin - size.width, available.x0, available.x1);
  const top = available.y0;
  const middle = available.y0 + Math.max(0, available.y1 - available.y0) / 2;
  const bottom = available.y1;
  return [
    { x: right, y: top, width: size.width, height: size.height },
    { x: right, y: middle, width: size.width, height: size.height },
    { x: right, y: bottom, width: size.width, height: size.height },
    { x: available.x0, y: top, width: size.width, height: size.height },
    { x: available.x0, y: middle, width: size.width, height: size.height },
    { x: available.x0, y: bottom, width: size.width, height: size.height }
  ];
}

function fallbackTethered(available, anchor, size, gap) {
  return {
    x: clamp(anchor.x - size.width / 2, available.x0, available.x1),
    y: clamp(anchor.y - size.height - gap, available.y0, available.y1),
    width: size.width,
    height: size.height
  };
}

function tetheredPenalty(rect, anchor, obstacles, chrome, gap) {
  let score = distanceToAnchor(rect, anchor) * 0.05;
  // Tethered relation cards also need a hard collision preference. A focused
  // edge can sit between large nodes, and the nearest grid cell may otherwise
  // cover one of those nodes while still looking close to the anchor.
  score += obstaclePenalty(rect, obstacles) * 100000;
  score += obstaclePenalty(rect, chrome) * 100000;
  const connector = nearestPointOnRect(rect, anchor);
  const connectorDistance = Math.hypot(connector.x - anchor.x, connector.y - anchor.y);
  if (connectorDistance < gap) score += (gap - connectorDistance) * 0.8;
  return score;
}

function parkedPenalty(rect, obstacles, chrome) {
  const obstacleDistance = minimumObstacleDistance(rect, [...obstacles, ...chrome]);
  const obstacleOverlap = obstaclePenalty(rect, obstacles);
  const chromeOverlap = obstaclePenalty(rect, chrome);
  // A parked card must not cover a selected variable when a clear candidate
  // exists. Keep distance as the tie-breaker, but make collisions dominant.
  return obstacleDistance - obstacleOverlap * 100000 - chromeOverlap * 100000;
}

function obstaclePenalty(rect, obstacles) {
  return (obstacles || []).reduce((score, obstacle) => {
    if (obstacle?.type === "circle") {
      const distance = rectPointDistance(rect, obstacle);
      if (distance < (Number(obstacle.r) || 0)) {
        const overlap = (Number(obstacle.r) || 0) - distance;
        return score + overlap * overlap;
      }
      return score;
    }
    if (obstacle?.type === "rect") return score + rectOverlapArea(rect, obstacle);
    return score;
  }, 0);
}

function minimumObstacleDistance(rect, obstacles) {
  if (!obstacles.length) return 0;
  return Math.min(...obstacles.map(obstacle => {
    if (obstacle?.type === "circle") return Math.max(0, rectPointDistance(rect, obstacle) - (Number(obstacle.r) || 0));
    if (obstacle?.type === "rect") return rectPointDistance(rect, obstacle);
    return Infinity;
  }));
}

function distanceToAnchor(rect, anchor) {
  return Math.hypot(rect.x + rect.width / 2 - anchor.x, rect.y + rect.height / 2 - anchor.y);
}

function uniqueIds(ids = []) {
  return [...new Set((Array.isArray(ids) ? ids : []).filter(id => typeof id === "string" && id.length))];
}
