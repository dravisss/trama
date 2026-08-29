/**
 * Compute a Cytoscape-compatible viewport that fits a model bounding box into
 * a safe screen rectangle. The function is deliberately DOM-free so camera
 * contracts can be tested without a browser.
 */
export function fitViewportToRect({ boundingBox, rect, padding = 0 } = {}) {
  const source = normalizeBox(boundingBox);
  const target = normalizeRect(rect);
  if (!source || !target) return null;

  const inset = Math.max(0, finiteNumber(padding, 0));
  const width = Math.max(1, target.width - inset * 2);
  const height = Math.max(1, target.height - inset * 2);
  const zoom = Math.min(width / source.width, height / source.height);
  const contentWidth = source.width * zoom;
  const contentHeight = source.height * zoom;

  return {
    zoom,
    pan: {
      x: target.x + inset + (width - contentWidth) / 2 - source.x * zoom,
      y: target.y + inset + (height - contentHeight) / 2 - source.y * zoom
    }
  };
}

/**
 * Keep authored screen-space padding from consuming the whole usable camera
 * rectangle. A lower-third or authoring dock may leave a compact safe area;
 * legacy desktop padding must still produce a legible map overview.
 */
export function clampFitPadding(padding = 0, rect, { minimum = 24, maximumRatio = 0.18 } = {}) {
  const target = normalizeRect(rect);
  const requested = Math.max(0, finiteNumber(padding, 0));
  if (!target || requested === 0) return requested;
  const shortestSide = Math.min(target.width, target.height);
  const readableCap = Math.max(0, Math.min(
    shortestSide / 2 - 1,
    Math.max(minimum, shortestSide * maximumRatio)
  ));
  return Math.min(requested, readableCap);
}

export function normalizeBox(value) {
  if (!value || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) return null;
  const width = Number(value.width);
  const height = Number(value.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { x: Number(value.x), y: Number(value.y), width, height };
}

export function normalizeRect(value) {
  if (!value || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) return null;
  const width = Number(value.width);
  const height = Number(value.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { x: Number(value.x), y: Number(value.y), width, height };
}

function finiteNumber(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}
