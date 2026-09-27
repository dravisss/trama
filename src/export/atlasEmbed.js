import { compilePresentationExport } from "../presentation/export.js";
import { resolveCameraPlan } from "../presentation/camera.js";
import { bezierPoint } from "../geometry/index.js";
import { atlasRenditionId, atlasVisibleNodeIds, collectAtlasFrameAssetRequests, createAtlasRenditionPlan } from "./atlasRenditions.js";
import { DESIGN_SYSTEM_SCHEMA_VERSION, DESIGN_SYSTEM_THEME, resolveFoundationColor } from "../design-system/tokens.js";
import { generateTokenCss } from "../design-system/css.js";
import { DESIGN_SYSTEM_MANIFEST } from "../design-system/generatedManifest.js";

const GENERATED_POSTER_ID = "trama-atlas-poster-svg";

export class AtlasEmbedExportError extends Error {
  constructor(message) {
    super(message);
    this.name = "AtlasEmbedExportError";
  }
}

/**
 * The Atlas file keeps binary data out of the startup JSON.  The manifest is
 * parsed immediately, while each data URL stays in an inert script element
 * until its frame actually needs it.  This prevents a large editorial deck
 * from allocating and decoding every image before its opening composition.
 */
export function createAtlasEmbedHtml({ model, project, presentation, views = [], assets = [], runtime = "", styles = "" } = {}) {
  const payload = compileAtlasEmbedPayload({ model, project, presentation, views, assets });
  const title = presentation?.title || model?.title || project?.title || "Apresentação Atlas";
  const publicationTokens = generateTokenCss({ layer: "tokens" });
  const assetSources = createAssetSources(payload, assets);
  const data = scriptSafe(JSON.stringify(payload));
  const criticalIds = new Set([
    payload.publication?.posterAssetId,
    ...(payload.publication?.criticalAssetIds || [])
  ]);
  const assetTag = asset => {
    const source = assetSources.get(asset.id) || "";
    return `<script type="application/octet-stream" id="atlas-embed-asset-${asset.slot}" data-trama-atlas-asset="${asset.slot}">${scriptSafe(source)}</script>`;
  };
  // An HTML file cannot defer its own bytes over the network. It can, however,
  // execute the small shell as soon as the poster and first-frame sources have
  // been parsed, before the parser reaches later-frame asset blocks.
  const criticalAssetTags = payload.assets.filter(asset => criticalIds.has(asset.id)).map(assetTag).join("\n  ");
  const deferredAssetTags = payload.assets.filter(asset => !criticalIds.has(asset.id)).map(assetTag).join("\n  ");
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="trama-design-system" content="${DESIGN_SYSTEM_THEME}@${DESIGN_SYSTEM_SCHEMA_VERSION}">
  <meta name="trama-design-system-hash" content="${DESIGN_SYSTEM_MANIFEST.hash}">
  <meta name="theme-color" content="${resolveFoundationColor("neutral")}">
  <title>${escapeHtml(title)} — Trama</title>
  <style data-trama-design-system="${DESIGN_SYSTEM_THEME}@${DESIGN_SYSTEM_SCHEMA_VERSION}" data-trama-design-system-hash="${DESIGN_SYSTEM_MANIFEST.hash}">${publicationTokens}\n${styles}</style>
</head>
<body>
  <div id="trama-atlas-embed"></div>
  <script id="trama-atlas-embed-payload" type="application/json">${data}</script>
  ${criticalAssetTags}
  <script data-trama-atlas-runtime>${scriptSafe(String(runtime))}</script>
  ${deferredAssetTags}
</body>
</html>`;
}

export function compileAtlasEmbedPayload({ model, project = { title: "Trama" }, presentation, views = [], assets = [] } = {}) {
  if (!model?.id) throw new AtlasEmbedExportError("Atlas embed requires one map.");
  if (!presentation) throw new AtlasEmbedExportError("Atlas embed requires one Presentation V2.");
  const compiledExport = compilePresentationExport({
    project,
    model,
    loops: [{ id: model.id, title: model.title || model.id, model }],
    activeLoopId: model.id,
    presentation,
    views,
    assets,
    embed: { sidebar: false, presentationOnly: true }
  });
  const timeline = compiledExport.compiled?.timeline || [];
  if (!timeline.length) throw new AtlasEmbedExportError("Atlas embed requires at least one compiled presentation frame.");
  const firstFrame = timeline[0];
  // Publication never asks the reader to run a layout. Persisted maps retain
  // their authored coordinates; legacy/imported nodes without coordinates get
  // a deterministic emergency grid at export time instead of cose-bilkent.
  const publicationModel = withPublicationPositions(compiledExport.payload.model);
  const exportAssets = compiledExport.payload.assets || [];
  const assetIds = new Set(exportAssets.map(asset => asset.id));
  const explicitPosterId = presentation?.settings?.posterAssetId;
  const posterAssetId = explicitPosterId && assetIds.has(explicitPosterId) ? explicitPosterId : GENERATED_POSTER_ID;
  const renditionPlan = createAtlasRenditionPlan({ model: publicationModel, timeline });
  const publicationAssets = buildPublicationAssets(exportAssets, renditionPlan);
  const frameAssets = timeline.map(frame => collectAtlasFrameAssetRequests({ model: publicationModel, frame })
    .map(request => ({ ...request, id: publicationAssets.assetVariants[request.assetId]?.[request.rendition] }))
    .filter(request => request.id));
  const criticalAssetIds = [...new Set(frameAssets[0]?.map(request => request.id) || [])];
  const manifest = [
    ...publicationAssets.assets.map((asset, slot) => assetManifest(asset, slot)),
    ...(posterAssetId === GENERATED_POSTER_ID ? [generatedPosterManifest({
      slot: publicationAssets.assets.length,
      model: publicationModel,
      frame: firstFrame,
      title: compiledExport.payload.presentation?.title || compiledExport.payload.model?.title
    })] : [])
  ];
  const payload = {
    version: 2,
    format: "trama-atlas-embed",
    project: compiledExport.payload.project,
    model: publicationModel,
    views: compiledExport.payload.views,
    presentation: compiledExport.payload.presentation,
    compiled: compiledExport.payload.compiled,
    assets: manifest,
    publication: {
      // This publication target is the Atlas reader. Older Presentation V2
      // records may predate presentationStyle; keep an explicit authored
      // selection, but never silently downgrade an Atlas export to lower-third.
      style: compiledExport.payload.presentation?.settings?.presentationStyle || "atlas-editorial",
      initialFrame: 0,
      posterAssetId,
      criticalAssetIds,
      lazyAssetIds: manifest.map(asset => asset.id).filter(id => id !== posterAssetId && !criticalAssetIds.includes(id)),
      assetVariants: publicationAssets.assetVariants,
      frameAssets
    },
    integrity: { algorithm: "fnv1a32", digest: "" }
  };
  payload.integrity.digest = fnv1a32(stableStringify({ ...payload, integrity: undefined }));
  return payload;
}

export function collectAtlasEmbedAssetIds({ model, presentation } = {}) {
  const ids = new Set();
  for (const node of model?.nodes || []) if (node.media?.assetId) ids.add(node.media.assetId);
  for (const chapter of presentation?.chapters || []) for (const scene of chapter.scenes || []) {
    if (scene.content?.assetId) ids.add(scene.content.assetId);
  }
  return [...ids];
}

/** Assets that must decode before Play: scene media and map nodes visible in frame zero. */
export function collectFirstFrameAssetIds({ model, frame, available = null } = {}) {
  const allowed = available instanceof Set ? available : new Set(available || []);
  const ids = new Set();
  const add = id => {
    if (id && (!allowed.size || allowed.has(id))) ids.add(id);
  };
  add(frame?.scene?.content?.assetId);
  const plan = resolveCameraPlan(frame || {}, model || {});
  const visibleNodeIds = plan.isMap || plan.mode === "fixed" || !plan.hasFocus
    ? (model?.nodes || []).map(node => node.id)
    : atlasVisibleNodeIds(model || {}, plan);
  const visible = visibleNodeIds instanceof Set ? visibleNodeIds : new Set(visibleNodeIds);
  for (const node of model?.nodes || []) if (visible.has(node.id)) add(node.media?.assetId);
  return [...ids];
}

/**
 * A compact, deterministic projection of the first Atlas frame. It deliberately
 * uses the same persisted positions and quadratic route semantics as the live
 * renderer, but never starts Cytoscape just to make a publication poster.
 */
export function createAtlasPosterProjection({ model = {}, frame = {} } = {}) {
  const nodes = (model.nodes || []).map((node, index) => ({
    ...node,
    position: validPosition(node.position) ? node.position : emergencyPosition(index)
  }));
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const plan = resolveCameraPlan(frame, { ...model, nodes });
  const focus = posterFocus(model, plan);
  const isFocusedFrame = Boolean(plan.hasFocus && !plan.isMap && plan.mode !== "fixed");
  const edges = (model.edges || []).flatMap(edge => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target || source.id === target.id) return [];
    const routeDistance = routeDistanceFor(edge);
    const control = routeControlPoint(source.position, target.position, routeDistance);
    const focused = isFocusedFrame && (focus.edgeIds.has(edge.id)
      || (focus.nodeIds.has(source.id) && focus.nodeIds.has(target.id)));
    return [{
      ...edge,
      source,
      target,
      control,
      routeDistance,
      focused,
      context: isFocusedFrame && !focused,
      negative: isNegativePolarity(edge),
      d: quadraticPath(source.position, target.position, control)
    }];
  });
  const projectedNodes = nodes.map(node => ({
    ...node,
    focused: isFocusedFrame && focus.nodeIds.has(node.id),
    context: isFocusedFrame && !focus.nodeIds.has(node.id)
  }));
  const bounds = posterBounds({ nodes: projectedNodes, edges, plan });
  return { nodes: projectedNodes, edges, bounds, plan, focus };
}

/** A deterministic, sanitised map poster. No node raster image is used by default. */
export function createAtlasPosterSvg({ model = {}, frame = {}, title = "Apresentação Atlas" } = {}) {
  const projection = createAtlasPosterProjection({ model, frame });
  const { bounds } = projection;
  const edges = projection.edges.map(edge => {
    const classes = ["edge", edge.focused ? "focus" : "", edge.context ? "context" : "", edge.negative ? "negative" : ""].filter(Boolean).join(" ");
    const marker = edge.focused ? (edge.negative ? "arrow-focus-negative" : "arrow-focus") : (edge.negative ? "arrow-negative" : "arrow-context");
    return `<path class="${classes}" d="${edge.d}" marker-end="url(#${marker})"/>`;
  }).join("");
  const circles = projection.nodes.map(node => {
    const classes = ["node", node.focused ? "focus" : "", node.context ? "context" : ""].filter(Boolean).join(" ");
    const radius = node.focused ? 34 : 28;
    return `<g class="${classes}"><circle cx="${round(node.position.x)}" cy="${round(node.position.y)}" r="${radius}"/><text x="${round(node.position.x)}" y="${round(node.position.y + radius + 18)}">${escapeXml(trimLabel(node.label || node.id))}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="title desc"><title id="title">${escapeXml(title)}</title><desc id="desc">Mapa causal da abertura da apresentação Atlas</desc><defs><marker id="arrow-context" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path fill="#66806a" d="M 0 0 L 10 5 L 0 10 z"/></marker><marker id="arrow-negative" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path fill="#8f7450" d="M 0 0 L 10 5 L 0 10 z"/></marker><marker id="arrow-focus" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path fill="#4f8745" d="M 0 0 L 10 5 L 0 10 z"/></marker><marker id="arrow-focus-negative" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path fill="#8f7450" d="M 0 0 L 10 5 L 0 10 z"/></marker><style>.edge{fill:none;stroke:#66806a;stroke-width:2.2;opacity:.82}.edge.context{opacity:.24;stroke-width:1.35}.edge.negative{stroke:#8f7450;stroke-dasharray:7 5}.edge.focus{stroke:#4f8745;stroke-width:4.1;stroke-dasharray:3 8;opacity:1}.edge.focus.negative{stroke:#8f7450}.node circle{fill:#f5f1e5;stroke:#667762;stroke-width:2}.node text{fill:#203a2c;font:600 14px 'Noto Serif',Georgia,serif;text-anchor:middle;paint-order:stroke;stroke:#fffef8;stroke-width:4px;stroke-linejoin:round}.node.context{opacity:.3}.node.context circle{fill:#e8ecdf}.node.focus circle{fill:#fffef8;stroke:#6f9f5f;stroke-width:3.2}.node.focus text{font-size:15px;fill:#203a2c}</style></defs>${edges}${circles}</svg>`;
}

export function atlasEmbedBreakdown({ html = "", payload = null } = {}) {
  const assets = payload?.assets || [];
  const assetBytes = assets.reduce((total, asset) => total + Number(asset.byteLength || 0), 0);
  const runtimeBytes = byteLengthFromHtml(html, /<script data-trama-atlas-runtime>([\s\S]*?)<\/script>/g);
  return {
    htmlBytes: byteLength(html),
    payloadBytes: byteLength(payload ? JSON.stringify(payload) : ""),
    assetBytes,
    assetCount: assets.length,
    criticalAssetCount: payload?.publication?.criticalAssetIds?.length || 0,
    lazyAssetCount: payload?.publication?.lazyAssetIds?.length || 0,
    runtimeBytes
  };
}

function assetManifest(asset, slot) {
  const dataUrl = String(asset?.data_url || "");
  // Do not spread storage adapter fields here. SQLite callers can expose the
  // original Blob as `content`; placing it in JSON duplicates every image
  // before the inert asset block and defeats lazy startup.
  const metadata = pickAssetMetadata(asset);
  return {
    ...metadata,
    sourceAssetId: asset.sourceAssetId || asset.id,
    rendition: asset.rendition || "master",
    slot,
    byteLength: byteLength(dataUrl),
    digest: fnv1a32(dataUrl)
  };
}

function pickAssetMetadata(asset = {}) {
  const fields = ["id", "filename", "mime_type", "kind", "width", "height", "alt_text", "focal_x", "focal_y", "sha256", "hasAlpha"];
  return Object.fromEntries(fields
    .filter(field => asset[field] !== undefined && asset[field] !== null && asset[field] !== "")
    .map(field => [field, asset[field]]));
}

function generatedPosterManifest({ slot, model, frame, title }) {
  const dataUrl = posterDataUrl({ model, frame, title });
  return {
    id: GENERATED_POSTER_ID,
    filename: "atlas-poster.svg",
    mime_type: "image/svg+xml",
    kind: "publication-poster",
    slot,
    generated: "atlas-poster-svg",
    byteLength: byteLength(dataUrl),
    digest: fnv1a32(dataUrl)
  };
}

function createAssetSources(payload, assets) {
  const sources = new Map((assets || []).map(asset => [asset.id, String(asset.data_url || "")]));
  for (const asset of payload.assets || []) {
    if (asset.generated === "atlas-poster-svg") {
      sources.set(asset.id, posterDataUrl({
        model: payload.model,
        frame: payload.compiled.timeline[payload.publication.initialFrame],
        title: payload.presentation.title || payload.model.title
      }));
    }
    else if (asset.sourceAssetId) {
      const source = (assets || []).find(item => item.id === asset.sourceAssetId);
      const rendition = source?.renditions?.[asset.rendition];
      sources.set(asset.id, String(rendition?.data_url || source?.data_url || ""));
    }
  }
  return sources;
}

function buildPublicationAssets(assets, renditionPlan) {
  const planned = new Map(renditionPlan.map(entry => [entry.assetId, entry.renditions.map(rendition => rendition.id)]));
  const assetVariants = {};
  const publicationAssets = [];
  for (const asset of assets || []) {
    const requested = planned.get(asset.id) || [];
    const available = asset.renditions && typeof asset.renditions === "object" ? asset.renditions : null;
    const variants = {};
    if (available && requested.length) {
      for (const rendition of requested) {
        if (!available[rendition]?.data_url) continue;
        const id = atlasRenditionId(asset.id, rendition);
        variants[rendition] = id;
        publicationAssets.push({
          ...asset,
          id,
          sourceAssetId: asset.id,
          rendition,
          filename: renditionFilename(asset.filename, rendition),
          mime_type: available[rendition].mime_type || "image/webp",
          width: available[rendition].width,
          height: available[rendition].height,
          hasAlpha: Boolean(available[rendition].hasAlpha),
          data_url: available[rendition].data_url
        });
      }
    }
    if (!Object.keys(variants).length) {
      variants.master = asset.id;
      publicationAssets.push({ ...asset, sourceAssetId: asset.id, rendition: "master" });
    }
    // A missing high-res derivative never creates a blank frame: runtime will
    // retain the overview/master rendition while the requested variant loads.
    for (const rendition of requested) {
      variants[rendition] ||= variants.overview || variants.focus || variants.card || variants.master;
    }
    assetVariants[asset.id] = variants;
  }
  return { assets: publicationAssets, assetVariants };
}

function renditionFilename(filename = "asset", rendition) {
  const base = String(filename).replace(/\.[^.]+$/, "") || "asset";
  return `${base}-${rendition}.webp`;
}

function posterDataUrl({ model, frame, title }) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createAtlasPosterSvg({ model, frame, title }))}`;
}

function posterFocus(model, plan) {
  if (plan.isMap || !plan.hasFocus || plan.mode === "fixed") {
    return {
      nodeIds: new Set((model.nodes || []).map(node => node.id)),
      edgeIds: new Set((model.edges || []).map(edge => edge.id))
    };
  }
  const nodeIds = new Set(plan.nodeIds || []);
  const authoredNodeIds = new Set(plan.nodeIds || []);
  const edgeIds = new Set(plan.edgeIds || []);
  const isNodeNeighborhood = plan.targetKind === "node-neighborhood";
  for (const edge of model.edges || []) {
    if (edgeIds.has(edge.id)) {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
      continue;
    }
    if (isNodeNeighborhood && (authoredNodeIds.has(edge.source) || authoredNodeIds.has(edge.target))) {
      edgeIds.add(edge.id);
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }
  }
  return { nodeIds, edgeIds };
}

function posterBounds({ nodes = [], edges = [], plan = {} } = {}) {
  const importantNodeIds = new Set(plan.isMap || !plan.hasFocus
    ? nodes.map(node => node.id)
    : nodes.filter(node => node.focused).map(node => node.id));
  const importantEdges = plan.isMap || !plan.hasFocus ? edges : edges.filter(edge => edge.focused);
  const points = nodes.filter(node => importantNodeIds.has(node.id)).flatMap(node => [
    { x: node.position.x - posterLabelHalfWidth(node), y: node.position.y - 62 },
    { x: node.position.x + posterLabelHalfWidth(node), y: node.position.y + 82 }
  ]);
  for (const edge of importantEdges) {
    // Include actual Bezier extrema, rather than endpoint-only bounds. This is
    // what prevents a persisted route from being cropped by the poster frame.
    for (let step = 0; step <= 16; step += 1) points.push(bezierPoint(edge.source.position, edge.target.position, edge.routeDistance, step / 16));
  }
  if (!points.length) return { x: 0, y: 0, width: 720, height: 440 };
  const xs = points.map(point => Number(point.x));
  const ys = points.map(point => Number(point.y));
  const padding = plan.isMap || !plan.hasFocus ? 100 : 132;
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const width = Math.max(420, Math.max(...xs) - Math.min(...xs) + padding * 2);
  const height = Math.max(320, Math.max(...ys) - Math.min(...ys) + padding * 2);
  return { x: round(minX), y: round(minY), width: round(width), height: round(height) };
}

function routeDistanceFor(edge) {
  const route = edge?.route;
  const distance = Number(route?.controlPointDistance ?? edge?.controlPointDistance);
  // A publication thumbnail must preserve the loop's directional rhythm.
  // Authored curves stay exact; straight or missing legacy routes receive a
  // small deterministic bend so the poster never collapses into a wireframe.
  if (Number.isFinite(distance) && Math.abs(distance) >= 18) return distance;
  const seed = [...String(edge?.id || `${edge?.source}:${edge?.target}`)]
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return (seed % 2 ? 1 : -1) * 72;
}

function posterLabelHalfWidth(node = {}) {
  const label = trimLabel(node.label || node.id || "");
  return Math.min(168, Math.max(62, label.length * 4.7));
}

function routeControlPoint(source, target, distance) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: (source.x + target.x) / 2 + (-dy / length) * distance,
    y: (source.y + target.y) / 2 + (dx / length) * distance
  };
}

function quadraticPath(source, target, control) {
  const span = Math.hypot(target.x - source.x, target.y - source.y) || 1;
  const trim = Math.min(.18, Math.max(.045, 28 / span));
  const start = quadraticPoint(source, control, target, trim);
  const end = quadraticPoint(source, control, target, 1 - trim);
  const delta = 1 - trim * 2;
  const derivative = {
    x: 2 * ((1 - trim) * (control.x - source.x) + trim * (target.x - control.x)),
    y: 2 * ((1 - trim) * (control.y - source.y) + trim * (target.y - control.y))
  };
  const trimmedControl = { x: start.x + derivative.x * delta / 2, y: start.y + derivative.y * delta / 2 };
  return `M ${round(start.x)} ${round(start.y)} Q ${round(trimmedControl.x)} ${round(trimmedControl.y)} ${round(end.x)} ${round(end.y)}`;
}

function quadraticPoint(source, control, target, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * source.x + 2 * mt * t * control.x + t * t * target.x,
    y: mt * mt * source.y + 2 * mt * t * control.y + t * t * target.y
  };
}

function isNegativePolarity(edge = {}) {
  if (edge.sourceSign && edge.targetSign) return isMinusSign(edge.sourceSign) !== isMinusSign(edge.targetSign);
  return isMinusSign(edge.targetSign) || edge.type === "balancing";
}

function isMinusSign(sign) {
  return ["-", "−", "–"].includes(String(sign || "").trim());
}

function validPosition(position) {
  return Number.isFinite(position?.x) && Number.isFinite(position?.y);
}

function emergencyPosition(index) {
  return { x: 180 + (index % 4) * 190, y: 150 + Math.floor(index / 4) * 150 };
}

function withPublicationPositions(model = {}) {
  const nodes = (model.nodes || []).map((node, index) => validPosition(node.position)
    ? node
    : { ...node, position: emergencyPosition(index) });
  return { ...model, nodes };
}

function trimLabel(value) {
  return String(value).replace(/\s+/g, " ").trim().slice(0, 56);
}

function round(value) {
  return Math.round(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("'", "&apos;");
}

function scriptSafe(value) {
  return String(value).replaceAll("</script", "<\\/script");
}

function byteLength(value) {
  return new TextEncoder().encode(String(value || "")).byteLength;
}

function byteLengthFromHtml(html, expression) {
  let total = 0;
  for (const match of String(html).matchAll(expression)) total += byteLength(match[1]);
  return total;
}

function stableStringify(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
