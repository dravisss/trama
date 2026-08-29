import { normalizeFocus, normalizePresentation } from "./schema.js";
import { discoverLoops } from "../core/loops.js";

export function createReferenceContext({ model, maps = [], views = [], assets = [], regions = [], queryResolver } = {}) {
  const rawModel = model || { nodes: [], edges: [], loops: [] };
  // Curated loops are optional in a CLD model. Presentation references still
  // need stable loop IDs, so resolve against the deterministic discovered
  // cycles when the author has not curated any yet.
  const currentModel = withResolvedLoops(rawModel);
  const models = new Map();
  if (currentModel.id) models.set(currentModel.id, currentModel);
  for (const map of maps || []) if (map?.id && map.model) models.set(map.id, withResolvedLoops(map.model));
  const viewsById = new Map((views || []).filter(Boolean).map(view => [view.id, view]));
  const assetsById = new Map((assets || []).filter(Boolean).map(asset => [asset.id, asset]));
  const suppliedRegions = Array.isArray(regions) ? regions : Object.entries(regions || {}).map(([id, region]) => ({ id, ...region }));
  const modelRegions = Array.isArray(currentModel.regions) ? currentModel.regions : Object.entries(currentModel.regions || {}).map(([id, region]) => ({ id, ...region }));
  const regionsById = new Map([...modelRegions, ...suppliedRegions]
    .filter(region => region?.id)
    .map(region => [region.id, region]));
  return { model: currentModel, models, viewsById, assetsById, regionsById, queryResolver };
}

function withResolvedLoops(model) {
  if (Array.isArray(model.loops) && model.loops.length) return model;
  const loops = discoverLoops(model, { maxLength: 8, maxLoops: 32 });
  return loops.length ? { ...model, loops } : model;
}

export function resolveFocus(focusInput, context = {}) {
  const focus = normalizeFocus(focusInput);
  const model = context.model || { nodes: [], edges: [], loops: [] };
  const nodes = new Set((model.nodes || []).map(item => item.id));
  const edgesById = new Map((model.edges || []).map(item => [item.id, item]));
  const loopsById = new Map((model.loops || []).map(item => [item.id, item]));
  const errors = [];
  const nodeIds = [];
  const edgeIds = [];
  const loopIds = [];
  if (focus.kind === "node") {
    if (!nodes.has(focus.nodeId)) errors.push(`Unknown focus node: ${focus.nodeId}.`);
    else nodeIds.push(focus.nodeId);
  } else if (focus.kind === "edge") {
    if (!edgesById.has(focus.edgeId)) errors.push(`Unknown focus edge: ${focus.edgeId}.`);
    else edgeIds.push(focus.edgeId);
  } else if (focus.kind === "loop") {
    const loop = loopsById.get(focus.loopId);
    if (!loop) errors.push(`Unknown focus loop: ${focus.loopId}.`);
    else {
      loopIds.push(loop.id);
      for (const edgeId of loop.edgeIds || []) {
        if (!edgesById.has(edgeId)) errors.push(`Loop ${loop.id} references unknown edge: ${edgeId}.`);
        else edgeIds.push(edgeId);
      }
    }
  } else if (focus.kind === "path") {
    for (const edgeId of focus.edgeIds || []) {
      if (!edgesById.has(edgeId)) errors.push(`Unknown path edge: ${edgeId}.`);
      else edgeIds.push(edgeId);
    }
    errors.push(...validateDirectedPath(edgeIds, edgesById));
  } else if (focus.kind === "set") {
    for (const id of focus.nodeIds || []) {
      if (!nodes.has(id)) errors.push(`Unknown focus node: ${id}.`);
      else nodeIds.push(id);
    }
    for (const id of focus.edgeIds || []) {
      if (!edgesById.has(id)) errors.push(`Unknown focus edge: ${id}.`);
      else edgeIds.push(id);
    }
    for (const id of focus.loopIds || []) {
      if (!loopsById.has(id)) errors.push(`Unknown focus loop: ${id}.`);
      else loopIds.push(id);
    }
  } else if (focus.kind === "query") {
    const result = resolveQuery(focus.selector, model, context);
    errors.push(...result.errors);
    nodeIds.push(...result.nodeIds);
    edgeIds.push(...result.edgeIds);
    loopIds.push(...result.loopIds);
  } else if (focus.kind === "region") {
    const region = context.regionsById?.get(focus.regionId)
      || (Array.isArray(context.regions) ? context.regions.find(item => item?.id === focus.regionId) : context.regions?.[focus.regionId]);
    if (!region) errors.push(`Unknown focus region: ${focus.regionId}.`);
    else {
      const result = resolveSetFocus({ kind: "set", ...region }, { nodes, edgesById, loopsById });
      errors.push(...result.errors);
      nodeIds.push(...result.nodeIds);
      edgeIds.push(...result.edgeIds);
      loopIds.push(...result.loopIds);
    }
  }
  return {
    focus,
    nodeIds: [...new Set(nodeIds)],
    edgeIds: [...new Set(edgeIds)],
    loopIds: [...new Set(loopIds)],
    errors
  };
}

export function resolvePresentationReferences(input, context = {}) {
  const presentation = normalizePresentation(input);
  const errors = [];
  const resolved = [];
  for (const chapter of presentation.chapters) {
    for (const scene of chapter.scenes) {
      if (scene.mapRef?.mapId && context.models?.size && !context.models.has(scene.mapRef.mapId)) {
        errors.push(`Scene ${scene.id} references unknown map: ${scene.mapRef.mapId}.`);
      }
      if (scene.mapRef?.viewId && context.viewsById?.size && !context.viewsById.has(scene.mapRef.viewId)) {
        errors.push(`Scene ${scene.id} references unknown view: ${scene.mapRef.viewId}.`);
      }
      if (scene.content.assetId && context.assetsById?.size && !context.assetsById.has(scene.content.assetId)) {
        errors.push(`Scene ${scene.id} references unknown asset: ${scene.content.assetId}.`);
      }
      const beats = [];
      const sceneContext = scene.mapRef?.mapId && context.models?.get(scene.mapRef.mapId)
        ? { ...context, model: context.models.get(scene.mapRef.mapId) }
        : context;
      for (const beat of scene.beats) {
        const focus = beat.focus ? resolveFocus(beat.focus, sceneContext) : null;
        if (focus?.errors?.length) errors.push(...focus.errors.map(error => `${beat.id}: ${error}`));
        beats.push({ ...beat, resolvedFocus: focus });
      }
      resolved.push({ chapterId: chapter.id, scene: { ...scene, beats } });
    }
  }
  return { presentation, scenes: resolved, errors };
}

function resolveSetFocus(focus, { nodes, edgesById, loopsById }) {
  const errors = [];
  const nodeIds = [];
  const edgeIds = [];
  const loopIds = [];
  for (const id of focus.nodeIds || []) {
    if (!nodes.has(id)) errors.push(`Unknown focus node: ${id}.`);
    else nodeIds.push(id);
  }
  for (const id of focus.edgeIds || []) {
    if (!edgesById.has(id)) errors.push(`Unknown focus edge: ${id}.`);
    else edgeIds.push(id);
  }
  for (const id of focus.loopIds || []) {
    if (!loopsById.has(id)) errors.push(`Unknown focus loop: ${id}.`);
    else loopIds.push(id);
  }
  return { errors, nodeIds, edgeIds, loopIds };
}

function resolveQuery(selector, model, context) {
  if (typeof context.queryResolver === "function") {
    const custom = context.queryResolver(selector, model);
    if (custom) return normalizeQueryResult(custom);
  }
  const match = String(selector || "").trim().match(/^(node|edge|loop)\s*(?:\[([^\]]+)\])?$/i);
  if (!match) return { errors: [`Unsupported focus query: ${selector}.`], nodeIds: [], edgeIds: [], loopIds: [] };
  const kind = match[1].toLowerCase();
  const predicate = parsePredicate(match[2]);
  if (match[2] && !predicate) return { errors: [`Invalid focus query predicate: ${match[2]}.`], nodeIds: [], edgeIds: [], loopIds: [] };
  const values = kind === "node" ? model.nodes || [] : kind === "edge" ? model.edges || [] : model.loops || [];
  const matching = values.filter(item => !predicate || predicate(item));
  if (!matching.length) return { errors: [`Focus query matched no ${kind}s: ${selector}.`], nodeIds: [], edgeIds: [], loopIds: [] };
  return {
    errors: [],
    nodeIds: kind === "node" ? matching.map(item => item.id) : [],
    edgeIds: kind === "edge" ? matching.map(item => item.id) : [],
    loopIds: kind === "loop" ? matching.map(item => item.id) : []
  };
}

function normalizeQueryResult(result) {
  return {
    errors: result.errors || [],
    nodeIds: [...(result.nodeIds || [])],
    edgeIds: [...(result.edgeIds || [])],
    loopIds: [...(result.loopIds || [])]
  };
}

function parsePredicate(source) {
  if (!source) return null;
  const match = String(source).trim().match(/^([\w.-]+)\s*(=|!=|~=)\s*["']?([^"']+?)["']?$/);
  if (!match) return null;
  const [, field, operator, expected] = match;
  return item => {
    const actual = readSemanticField(item, field);
    if (operator === "=") return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? "") === expected;
    if (operator === "!=") return String(actual ?? "") !== expected;
    return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? "").toLowerCase().includes(expected.toLowerCase());
  };
}

function readSemanticField(item, field) {
  if (field in (item || {})) return item[field];
  if (field in (item?.fields || {})) return item.fields[field];
  if (field === "tag") return item?.tags || [];
  if (field === "type") return item?.type;
  return undefined;
}

function validateDirectedPath(edgeIds, edgesById) {
  const errors = [];
  for (let index = 1; index < edgeIds.length; index += 1) {
    const previous = edgesById.get(edgeIds[index - 1]);
    const next = edgesById.get(edgeIds[index]);
    if (previous && next && previous.target !== next.source) {
      errors.push(`Path is not continuous between ${previous.id} and ${next.id}.`);
    }
  }
  return errors;
}
