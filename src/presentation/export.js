import { compilePresentation } from "./compiler.js";
import { lintPresentation } from "./lint.js";
import { normalizePresentation } from "./schema.js";

export class PresentationExportError extends Error {
  constructor(errors = [], lint = null) {
    super(`Presentation export blocked:\n${errors.map(error => `- ${error}`).join("\n")}`);
    this.name = "PresentationExportError";
    this.errors = errors;
    this.lint = lint;
  }
}

/**
 * Build the self-contained V3 contract consumed by the standalone runtime.
 * The gate refuses unresolved references and missing local assets so an export
 * cannot silently degrade after leaving the editor.
 */
export function compilePresentationExport({
  project = { title: "LoopViewer" },
  model,
  loops = [],
  presentation,
  presentations = [],
  maps = [],
  views = [],
  assets = [],
  activeLoopId,
  embed = {}
} = {}) {
  const normalized = presentation ? normalizePresentation(presentation) : null;
  const context = {
    model,
    maps: [{ id: model?.id, model }, ...maps].filter(item => item?.id && item.model),
    views,
    assets
  };
  let compiled = null;
  let lint = null;
  const errors = [];
  if (normalized && normalized.chapters.some(chapter => chapter.scenes.length)) {
    lint = lintPresentation(normalized, context);
    compiled = lint.compiled;
    errors.push(...lint.errors.map(item => item.message));
    errors.push(...collectMissingAssets(normalized, assets, [model, ...maps.map(item => item.model)]));
  }
  errors.push(...collectMissingNodeAssets([model, ...maps.map(item => item.model), ...loops.map(item => item.model || item)], assets));
  if (errors.length) throw new PresentationExportError([...new Set(errors)], lint);
  const entries = (Array.isArray(presentations) ? presentations : [])
    .map(item => item?.presentation ? { ...item, presentation: normalizePresentation(item.presentation) } : item)
    .filter(Boolean);
  const referencedAssets = new Set([
    ...(normalized ? referencedAssetIds(normalized) : []),
    ...referencedNodeAssetIds([model, ...maps.map(item => item.model), ...loops.map(item => item.model || item)])
  ]);
  const exportAssets = assets.filter(asset => !referencedAssets.size || referencedAssets.has(asset.id));
  const payload = {
    version: 3,
    format: "loopviewer-presentation",
    project,
    model,
    loops: loops.length ? loops : (model?.loops || []),
    maps: context.maps,
    views,
    activeLoopId: activeLoopId || model?.id,
    presentation: normalized,
    presentations: entries,
    compiled,
    assets: exportAssets,
    embed: normalizeEmbed(embed),
    integrity: { algorithm: "fnv1a32", digest: "" }
  };
  payload.integrity.digest = fnv1a32(stableStringify({ ...payload, integrity: undefined }));
  return { payload, compiled, lint };
}

function collectMissingAssets(presentation, assets, models = []) {
  const available = new Set((assets || []).map(asset => asset.id));
  return [...new Set([
    ...referencedAssetIds(presentation),
    ...referencedNodeAssetIds(models)
  ])]
    .filter(id => !available.has(id))
    .map(id => `Export references missing asset: ${id}.`);
}

function referencedAssetIds(presentation) {
  const ids = new Set();
  for (const chapter of presentation.chapters || []) for (const scene of chapter.scenes || []) {
    if (scene.content?.assetId) ids.add(scene.content.assetId);
  }
  return ids;
}

function referencedNodeAssetIds(models = []) {
  const ids = new Set();
  for (const model of models || []) for (const node of model?.nodes || []) {
    if (node.media?.assetId) ids.add(node.media.assetId);
  }
  return ids;
}

function collectMissingNodeAssets(models, assets) {
  const available = new Set((assets || []).map(asset => asset.id));
  return [...referencedNodeAssetIds(models)]
    .filter(id => !available.has(id))
    .map(id => `Node image references missing asset: ${id}.`);
}

function normalizeEmbed(embed) {
  const source = embed && typeof embed === "object" ? embed : {};
  return {
    allowedOrigins: Array.isArray(source.allowedOrigins) ? [...new Set(source.allowedOrigins)] : [],
    sidebar: source.sidebar !== false,
    presentationOnly: Boolean(source.presentationOnly),
    commands: ["start", "pause", "resume", "next", "previous", "goTo", "explore", "resumeStory"]
  };
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
