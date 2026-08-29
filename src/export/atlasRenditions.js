import { resolveCameraPlan } from "../presentation/camera.js";

export const ATLAS_RENDITION_SPECS = Object.freeze({
  overview: Object.freeze({ id: "overview", maxSide: 256, quality: 0.88 }),
  focus: Object.freeze({ id: "focus", maxSide: 640, quality: 0.9 }),
  card: Object.freeze({ id: "card", maxSide: 1024, quality: 0.9 })
});

export const ATLAS_RENDITION_ORDER = Object.freeze(["overview", "focus", "card"]);

export function atlasRenditionId(assetId, rendition) {
  return `${assetId}::atlas-${rendition}`;
}

/**
 * Resolve the variants visible in one compiled frame. The node image choice
 * follows the camera composition, while scene media is sized for the card.
 */
export function collectAtlasFrameAssetRequests({ model = {}, frame = {} } = {}) {
  const requests = [];
  const add = (assetId, rendition, role) => {
    if (!assetId || requests.some(item => item.assetId === assetId && item.rendition === rendition && item.role === role)) return;
    requests.push({ assetId, rendition, role });
  };
  if (frame.scene?.content?.assetId) add(frame.scene.content.assetId, "card", "card");
  const plan = resolveCameraPlan(frame, model);
  if (plan.isMap || plan.mode === "fixed" || !plan.hasFocus) {
    for (const node of model.nodes || []) add(node.media?.assetId, "overview", "node");
    return requests;
  }
  const focused = focusNodeIds(model, plan);
  const visible = atlasVisibleNodeIds(model, plan);
  for (const node of model.nodes || []) {
    if (visible.has(node.id)) add(node.media?.assetId, "overview", "node");
    if (focused.has(node.id)) add(node.media?.assetId, "focus", "node");
  }
  return requests;
}

export function createAtlasRenditionPlan({ model = {}, timeline = [] } = {}) {
  const byAssetId = new Map();
  for (const frame of timeline) {
    for (const request of collectAtlasFrameAssetRequests({ model, frame })) {
      if (!byAssetId.has(request.assetId)) byAssetId.set(request.assetId, new Set());
      byAssetId.get(request.assetId).add(request.rendition);
    }
  }
  return [...byAssetId].map(([assetId, renditions]) => ({
    assetId,
    renditions: ATLAS_RENDITION_ORDER.filter(rendition => renditions.has(rendition)).map(rendition => ({ ...ATLAS_RENDITION_SPECS[rendition] }))
  }));
}

function focusNodeIds(model, plan) {
  const ids = new Set(plan.nodeIds || []);
  const edges = new Set(plan.edgeIds || []);
  for (const edge of model.edges || []) {
    // Only an explicitly focused relation promotes its endpoints. Expanding
    // from every already-added node turns a connected map into a transitive
    // closure and incorrectly asks the reader to decode every 640px focus
    // rendition for a one-node beat.
    if (edges.has(edge.id)) {
      ids.add(edge.source);
      ids.add(edge.target);
    }
  }
  return ids;
}

/**
 * Conservative one-hop visibility for a focused camera. It includes the
 * semantic focus and its immediate context, but never walks the whole
 * connected component.
 */
export function atlasVisibleNodeIds(model, plan) {
  const focused = focusNodeIds(model, plan);
  const seeds = new Set(focused);
  const visible = new Set(focused);
  for (const edge of model.edges || []) {
    if (seeds.has(edge.source) || seeds.has(edge.target)) {
      visible.add(edge.source);
      visible.add(edge.target);
    }
  }
  return visible;
}
