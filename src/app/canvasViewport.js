const DEFAULT_OVERLAYS = [
  "#edit-toolbar",
  ".map-controls",
  "#story-canvas-header",
  "#story-selection-bar"
];

/**
 * Measure the portion of a canvas that remains unobscured by imperative
 * controls. Returned coordinates are local to the canvas, matching Cytoscape
 * pan coordinates after the fit calculation.
 */
export function measureCanvasSafeRect({ canvas, overlays = DEFAULT_OVERLAYS, sideOverlays = [], gutter = 12, documentRef = globalThis.document } = {}) {
  if (!canvas?.getBoundingClientRect) return null;
  const canvasRect = canvas.getBoundingClientRect();
  const width = Number(canvasRect.width);
  const height = Number(canvasRect.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;

  const outerGutter = Math.max(0, Number.isFinite(Number(gutter)) ? Number(gutter) : 0);
  let left = outerGutter;
  let top = outerGutter;
  let right = width - outerGutter;
  let bottom = height - outerGutter;

  for (const candidate of overlays) {
    const element = resolveElement(candidate, documentRef);
    if (!isVisible(element, documentRef)) continue;
    const overlayRect = element.getBoundingClientRect?.();
    if (!overlayRect) continue;

    const overlapWidth = Math.min(canvasRect.right, overlayRect.right) - Math.max(canvasRect.left, overlayRect.left);
    if (overlapWidth <= 0) continue;

    const center = (overlayRect.top + overlayRect.bottom) / 2;
    const canvasCenter = (canvasRect.top + canvasRect.bottom) / 2;
    if (center <= canvasCenter) top = Math.max(top, overlayRect.bottom - canvasRect.top + outerGutter);
    else bottom = Math.min(bottom, overlayRect.top - canvasRect.top - outerGutter);
  }

  // Presentation cards can occupy a deliberate left/right composition. Only
  // reserve overlays that span a meaningful amount of canvas height; compact
  // controls remain ordinary obstacles and must not distort the camera.
  for (const candidate of sideOverlays) {
    const element = resolveElement(candidate, documentRef);
    if (!isVisible(element, documentRef)) continue;
    const overlayRect = element.getBoundingClientRect?.();
    if (!overlayRect) continue;
    const overlapHeight = Math.min(canvasRect.bottom, overlayRect.bottom) - Math.max(canvasRect.top, overlayRect.top);
    const overlapWidth = Math.min(canvasRect.right, overlayRect.right) - Math.max(canvasRect.left, overlayRect.left);
    if (overlapWidth <= 0 || overlapHeight < canvasRect.height * 0.22) continue;
    const center = (overlayRect.left + overlayRect.right) / 2;
    const canvasCenter = (canvasRect.left + canvasRect.right) / 2;
    if (center <= canvasCenter) left = Math.max(left, overlayRect.right - canvasRect.left + outerGutter);
    else right = Math.min(right, overlayRect.left - canvasRect.left - outerGutter);
  }

  return {
    x: roundPixel(left),
    y: roundPixel(top),
    width: roundPixel(Math.max(1, right - left)),
    height: roundPixel(Math.max(1, bottom - top))
  };
}

function resolveElement(candidate, documentRef) {
  if (candidate && typeof candidate.getBoundingClientRect === "function") return candidate;
  if (typeof candidate !== "string") return null;
  return documentRef?.querySelector?.(candidate) || null;
}

function isVisible(element, documentRef) {
  if (!element || element.hidden) return false;
  const rect = element.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) return false;
  const style = documentRef?.defaultView?.getComputedStyle?.(element);
  return style ? style.display !== "none" && style.visibility !== "hidden" : true;
}

function roundPixel(value) {
  return Math.round(value * 10) / 10;
}
