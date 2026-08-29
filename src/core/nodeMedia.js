/**
 * Optional visual media attached to a causal-loop variable.
 *
 * The model stores only a stable asset reference and editorial crop metadata.
 * Bytes and URLs belong to the platform/export adapters.
 */
export const NODE_MEDIA_DEFAULTS = Object.freeze({
  size: 112,
  labelGap: 14,
  labelPlacement: "below",
  fit: "cover",
  focalPoint: Object.freeze({ x: 0.5, y: 0.5 })
});

const FITS = new Set(["cover", "contain"]);
const LABEL_PLACEMENTS = new Set(["below", "inside", "hidden"]);

export function normalizeNodeMedia(input) {
  if (input === undefined || input === null || input === false) return undefined;
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const focalPoint = input.focalPoint || {};
  return {
    ...input,
    assetId: String(input.assetId || "").trim(),
    ...(input.altText !== undefined ? { altText: String(input.altText || "").trim() } : {}),
    size: finiteRange(input.size, NODE_MEDIA_DEFAULTS.size, 32, 256),
    labelGap: finiteRange(input.labelGap, NODE_MEDIA_DEFAULTS.labelGap, 0, 64),
    labelPlacement: LABEL_PLACEMENTS.has(input.labelPlacement) ? input.labelPlacement : NODE_MEDIA_DEFAULTS.labelPlacement,
    fit: FITS.has(input.fit) ? input.fit : NODE_MEDIA_DEFAULTS.fit,
    focalPoint: {
      x: finiteRange(focalPoint.x, NODE_MEDIA_DEFAULTS.focalPoint.x, 0, 1),
      y: finiteRange(focalPoint.y, NODE_MEDIA_DEFAULTS.focalPoint.y, 0, 1)
    }
  };
}

export function validateNodeMedia(media, nodeId = "(unknown)") {
  const errors = [];
  if (media === undefined || media === null || media === false) return errors;
  if (!media || typeof media !== "object" || Array.isArray(media)) {
    return [`Node ${nodeId} media must be an object.`];
  }
  if (!String(media.assetId || "").trim()) errors.push(`Node ${nodeId} media requires assetId.`);
  if (media.altText !== undefined && typeof media.altText !== "string") errors.push(`Node ${nodeId} media altText must be a string.`);
  if (media.size !== undefined && !inRange(media.size, 32, 256)) errors.push(`Node ${nodeId} media size must be between 32 and 256.`);
  if (media.labelGap !== undefined && !inRange(media.labelGap, 0, 64)) errors.push(`Node ${nodeId} media labelGap must be between 0 and 64.`);
  if (media.fit !== undefined && !FITS.has(media.fit)) errors.push(`Node ${nodeId} media fit must be cover or contain.`);
  if (media.labelPlacement !== undefined && !LABEL_PLACEMENTS.has(media.labelPlacement)) errors.push(`Node ${nodeId} media labelPlacement is invalid.`);
  const point = media.focalPoint;
  if (point !== undefined && (!point || typeof point !== "object" || !inRange(point.x, 0, 1) || !inRange(point.y, 0, 1))) {
    errors.push(`Node ${nodeId} media focalPoint must contain x and y between 0 and 1.`);
  }
  return errors;
}

export function nodeMediaEnvelope(node, { fontSize = 11, maxLabelWidth = 128 } = {}) {
  const media = normalizeNodeMedia(node?.media);
  if (!media?.assetId || media.labelPlacement === "inside" || media.labelPlacement === "hidden") {
    const style = node?.style || {};
    const width = positive(style.width) || positive(style.size) || 90;
    const height = positive(style.height) || positive(style.size) || 90;
    return { width, height, image: false, labelHeight: 0, labelWidth: width };
  }
  const size = media.size;
  const label = String(node?.label || "");
  const lineWidth = Math.max(40, Math.min(maxLabelWidth, size + 22));
  const estimatedCharsPerLine = Math.max(7, Math.floor(lineWidth / Math.max(5, fontSize * 0.56)));
  const lines = Math.max(1, label.split(/\s+/).reduce((count, word) => {
    const current = count.at(-1) || "";
    if (!current || `${current} ${word}`.length > estimatedCharsPerLine) count.push(word);
    else count[count.length - 1] = `${current} ${word}`;
    return count;
  }, []).length);
  const labelHeight = lines * Math.max(12, fontSize * 1.16);
  return {
    width: size,
    height: size + media.labelGap + labelHeight,
    image: true,
    imageSize: size,
    labelHeight,
    labelWidth: lineWidth,
    labelGap: media.labelGap
  };
}

function finiteRange(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function inRange(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
