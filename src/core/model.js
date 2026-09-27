import { classifyLoop, LOOP_TYPES } from "./loops.js";
import { normalizeNodeMedia, validateNodeMedia } from "./nodeMedia.js";

const VALID_SIGNS = new Set(["+", "−", "-"]);

export class CLDValidationError extends Error {
  constructor(errors) {
    super(`Invalid CLD model:\n${errors.map(error => `- ${error}`).join("\n")}`);
    this.name = "CLDValidationError";
    this.errors = errors;
  }
}

export function validateModel(model) {
  const errors = [];
  if (!model || typeof model !== "object") return { valid: false, errors: ["Model must be an object."] };
  if (!model.id) errors.push("Model requires an id.");
  if (!Array.isArray(model.nodes)) errors.push("Model nodes must be an array.");
  if (!Array.isArray(model.edges)) errors.push("Model edges must be an array.");

  const nodes = Array.isArray(model.nodes) ? model.nodes : [];
  const edges = Array.isArray(model.edges) ? model.edges : [];
  const nodeIds = new Set();
  for (const node of nodes) {
    if (!node.id) errors.push("Every node requires an id.");
    else if (nodeIds.has(node.id)) errors.push(`Duplicate node id: ${node.id}.`);
    else nodeIds.add(node.id);
    if (!node.label) errors.push(`Node ${node.id || "(unknown)"} requires a label.`);
    if (node.position !== undefined && !isPosition(node.position)) {
      errors.push(`Node ${node.id || "(unknown)"} has an invalid position.`);
    }
    if (node.locked !== undefined && typeof node.locked !== "boolean") {
      errors.push(`Node ${node.id || "(unknown)"} locked must be a boolean.`);
    }
    if (node.fields !== undefined && (!node.fields || Array.isArray(node.fields) || typeof node.fields !== "object")) {
      errors.push(`Node ${node.id || "(unknown)"} fields must be an object.`);
    }
    errors.push(...validateNodeMedia(node.media, node.id || "(unknown)"));
  }

  const edgeIds = new Set();
  const edgesById = new Map();
  for (const edge of edges) {
    if (!edge.id) errors.push("Every edge requires an id.");
    else if (edgeIds.has(edge.id)) errors.push(`Duplicate edge id: ${edge.id}.`);
    else edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source)) errors.push(`Edge ${edge.id} has unknown source: ${edge.source}.`);
    if (!nodeIds.has(edge.target)) errors.push(`Edge ${edge.id} has unknown target: ${edge.target}.`);
    if (!VALID_SIGNS.has(edge.sourceSign)) errors.push(`Edge ${edge.id} has invalid sourceSign.`);
    if (!VALID_SIGNS.has(edge.targetSign)) errors.push(`Edge ${edge.id} has invalid targetSign.`);
    if (edge.description !== undefined && typeof edge.description !== "string") {
      errors.push(`Edge ${edge.id} description must be a string.`);
    }
    if (edge.route !== undefined && !isRoute(edge.route)) {
      errors.push(`Edge ${edge.id} has an invalid route.`);
    }
    if (edge.fields !== undefined && (!edge.fields || Array.isArray(edge.fields) || typeof edge.fields !== "object")) {
      errors.push(`Edge ${edge.id || "(unknown)"} fields must be an object.`);
    }
    if (edge.id) edgesById.set(edge.id, edge);
  }

  const loopIds = new Set();
  if (model.loops !== undefined && !Array.isArray(model.loops)) {
    errors.push("Model loops must be an array.");
  }
  const loops = Array.isArray(model.loops) ? model.loops : [];
  for (const loop of loops) {
    if (!loop.id) errors.push("Every loop requires an id.");
    else if (loopIds.has(loop.id)) errors.push(`Duplicate loop id: ${loop.id}.`);
    else loopIds.add(loop.id);
    if (!Array.isArray(loop.edgeIds) || loop.edgeIds.length < 2) {
      errors.push(`Loop ${loop.id || "(unknown)"} requires at least two edgeIds.`);
      continue;
    }
    if (new Set(loop.edgeIds).size !== loop.edgeIds.length) {
      errors.push(`Loop ${loop.id} cannot repeat edges.`);
    }
    const loopEdges = loop.edgeIds.map(id => edgesById.get(id));
    const missingId = loop.edgeIds.find((id, index) => !loopEdges[index]);
    if (missingId) {
      errors.push(`Loop ${loop.id} has unknown edge: ${missingId}.`);
      continue;
    }
    if (!formsDirectedCycle(loopEdges)) {
      errors.push(`Loop ${loop.id} edgeIds must form an ordered directed cycle.`);
    }
    if (loop.type !== undefined && !LOOP_TYPES.has(loop.type)) {
      errors.push(`Loop ${loop.id} has invalid type.`);
    } else if (loop.type && loop.type !== classifyLoop(loopEdges)) {
      errors.push(`Loop ${loop.id} type does not match its edge polarities.`);
    }
    if (loop.description !== undefined && typeof loop.description !== "string") {
      errors.push(`Loop ${loop.id} description must be a string.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function normalizeModel(input) {
  const result = validateModel(input);
  if (!result.valid) throw new CLDValidationError(result.errors);

  const edges = input.edges.map(normalizeEdge);
  const edgesById = new Map(edges.map(edge => [edge.id, edge]));

  return {
    ...input,
    nodes: input.nodes.map(node => ({
      ...node,
      ...(node.media ? { media: normalizeNodeMedia(node.media) } : {}),
      ...(node.position ? { position: { ...node.position } } : {})
    })),
    edges: edges.map(edge => ({
      ...edge,
      ...(edge.route ? { route: { ...edge.route } } : {})
    })),
    loops: (input.loops || []).map(loop => ({
      ...loop,
      edgeIds: [...loop.edgeIds],
      type: loop.type || classifyLoop(loop.edgeIds.map(id => edgesById.get(id)))
    })),
  };
}

export function createEmptyModel({
  id = "untitled-diagram",
  title = "Novo diagrama",
  description = ""
} = {}) {
  return normalizeModel({
    id: uniqueId(slugId(id || title || "diagram"), new Set()),
    title,
    description,
    nodes: [],
    edges: [],
    loops: []
  });
}

export function addNodeToModel(model, data = {}, { position } = {}) {
  const normalized = normalizeModel(model);
  const existingIds = new Set(normalized.nodes.map(node => node.id));
  const label = String(data.label || "Nova variável").trim() || "Nova variável";
  const id = uniqueId(data.id || slugId(label, "node"), existingIds);
  return normalizeModel({
    ...normalized,
    nodes: [
      ...normalized.nodes,
      {
        ...data,
        id,
        label,
        ...(data.position || position ? { position: { ...(data.position || position) } } : {}),
        ...(data.locked !== undefined ? { locked: Boolean(data.locked) } : {})
      }
    ]
  });
}

export function updateNodeInModel(model, id, changes = {}) {
  const normalized = normalizeModel(model);
  const node = normalized.nodes.find(item => item.id === id);
  if (!node) throw new CLDValidationError([`Unknown node id: ${id}.`]);
  const nextId = changes.id && changes.id !== id
    ? uniqueId(changes.id, new Set(normalized.nodes.filter(item => item.id !== id).map(item => item.id)))
    : id;
  const next = {
    ...normalized,
    nodes: normalized.nodes.map(item => item.id === id
      ? normalizeNodeChanges({ ...item, ...changes, id: nextId })
      : item),
    edges: normalized.edges.map(edge => ({
      ...edge,
      source: edge.source === id ? nextId : edge.source,
      target: edge.target === id ? nextId : edge.target
    }))
  };
  return normalizeModel(next);
}

export function removeNodeFromModel(model, id) {
  const normalized = normalizeModel(model);
  const removedEdgeIds = new Set(normalized.edges
    .filter(edge => edge.source === id || edge.target === id)
    .map(edge => edge.id));
  return normalizeModel(pruneReferences({
    ...normalized,
    nodes: normalized.nodes.filter(node => node.id !== id),
    edges: normalized.edges.filter(edge => !removedEdgeIds.has(edge.id)),
    loops: normalized.loops.filter(loop => !loop.edgeIds.some(edgeId => removedEdgeIds.has(edgeId)))
  }, { removedNodeIds: new Set([id]), removedEdgeIds }));
}

export function addEdgeToModel(model, data = {}) {
  const normalized = normalizeModel(model);
  const source = data.source;
  const target = data.target;
  const sourceLabel = normalized.nodes.find(node => node.id === source)?.label || source || "source";
  const targetLabel = normalized.nodes.find(node => node.id === target)?.label || target || "target";
  const existingIds = new Set(normalized.edges.map(edge => edge.id));
  const id = uniqueId(data.id || `${slugId(sourceLabel, "source")}-${slugId(targetLabel, "target")}`, existingIds);
  return normalizeModel({
    ...normalized,
    edges: [
      ...normalized.edges,
      {
        sourceSign: "+",
        targetSign: "+",
        ...data,
        id
      }
    ]
  });
}

export function updateEdgeInModel(model, id, changes = {}) {
  const normalized = normalizeModel(model);
  const edge = normalized.edges.find(item => item.id === id);
  if (!edge) throw new CLDValidationError([`Unknown edge id: ${id}.`]);
  const nextId = changes.id && changes.id !== id
    ? uniqueId(changes.id, new Set(normalized.edges.filter(item => item.id !== id).map(item => item.id)))
    : id;
  const changesPolarity = changes.sourceSign !== undefined || changes.targetSign !== undefined;
  const next = {
    ...normalized,
    edges: normalized.edges.map(item => item.id === id
      ? normalizeEdgeChanges(item, changes, nextId)
      : item),
    loops: normalized.loops.map(loop =>
      normalizeLoopAfterEdgeChange(loop, id, nextId, changesPolarity)
    )
  };
  return normalizeModel(pruneReferences(next));
}

function normalizeLoopAfterEdgeChange(loop, previousId, nextId, changesPolarity) {
  const nextLoop = {
    ...loop,
    edgeIds: loop.edgeIds.map(edgeId => edgeId === previousId ? nextId : edgeId)
  };
  if (changesPolarity && nextLoop.edgeIds.includes(nextId)) {
    delete nextLoop.type;
  }
  return nextLoop;
}

function normalizeEdgeChanges(edge, changes, nextId) {
  const merged = { ...edge, ...changes, id: nextId };
  if (changes.type === undefined && (changes.sourceSign !== undefined || changes.targetSign !== undefined)) {
    delete merged.type;
  }
  return merged;
}

export function removeEdgeFromModel(model, id) {
  const normalized = normalizeModel(model);
  return normalizeModel(pruneReferences({
    ...normalized,
    edges: normalized.edges.filter(edge => edge.id !== id),
    loops: normalized.loops.filter(loop => !loop.edgeIds.includes(id))
  }, { removedEdgeIds: new Set([id]) }));
}

export function slugId(value, fallback = "item") {
  const slug = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || fallback;
}

export function uniqueId(base, existingIds) {
  const clean = slugId(base, "item");
  let id = clean;
  let suffix = 2;
  while (existingIds.has(id)) id = `${clean}-${suffix++}`;
  return id;
}

function normalizeEdge(edge) {
  const sourceSign = normalizeSign(edge.sourceSign);
  const targetSign = normalizeSign(edge.targetSign);
  const feedbackType = sourceSign === targetSign ? "reinforcing" : "balancing";
  return {
    ...edge,
    sourceSign,
    targetSign,
    type: feedbackType
  };
}

export function normalizeSign(sign) {
  return sign === "-" ? "−" : sign;
}

function normalizeNodeChanges(node) {
  return {
    ...node,
    label: String(node.label || "").trim(),
    ...(node.position ? { position: { ...node.position } } : {}),
    ...(node.media ? { media: normalizeNodeMedia(node.media) } : {}),
    ...(node.locked !== undefined ? { locked: Boolean(node.locked) } : {})
  };
}

function isPosition(position) {
  return position && Number.isFinite(position.x) && Number.isFinite(position.y);
}

function isRoute(route) {
  return route && Number.isFinite(route.controlPointDistance) &&
    (route.locked === undefined || typeof route.locked === "boolean");
}

function formsDirectedCycle(edges) {
  return edges.every((edge, index) =>
    edge.target === edges[(index + 1) % edges.length].source
  );
}

function pruneReferences(model, {
  removedNodeIds = new Set(),
  removedEdgeIds = new Set()
} = {}) {
  const edgeIds = new Set(model.edges.map(edge => edge.id));
  const loopIdsToRemove = new Set();
  const loops = (model.loops || []).filter(loop => {
    if (loop.edgeIds.some(edgeId => removedEdgeIds.has(edgeId) || !edgeIds.has(edgeId))) {
      loopIdsToRemove.add(loop.id);
      return false;
    }
    const loopEdges = loop.edgeIds.map(edgeId => model.edges.find(edge => edge.id === edgeId));
    const valid = new Set(loop.edgeIds).size === loop.edgeIds.length && formsDirectedCycle(loopEdges);
    if (!valid) loopIdsToRemove.add(loop.id);
    return valid;
  });
  return { ...model, loops };
}
