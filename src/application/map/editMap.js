import { requireMapEditor } from "../ports/mapEditor.js";

/**
 * Application command for applying an authored Inspector change to a map.
 *
 * The command deliberately accepts a plain target and changes object. It
 * knows neither FormData nor the engine's Cytoscape model, and it leaves
 * persistence and UI status to the composition root.
 */
export function createEditMap({ mapEditor } = {}) {
  const editor = requireMapEditor(mapEditor);

  return {
    execute({ target, changes = {} } = {}) {
      const normalizedTarget = normalizeTarget(target);
      if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
        throw new TypeError("EditMap requires a changes object.");
      }

      if (normalizedTarget.type === "edge") {
        return {
          target: normalizedTarget,
          result: editor.updateEdge(normalizedTarget.id, { ...changes })
        };
      }

      const result = normalizedTarget.ids.length > 1
        ? editor.updateNodes(normalizedTarget.ids, { ...changes })
        : editor.updateNode(normalizedTarget.ids[0], { ...changes });
      return { target: normalizedTarget, result };
    }
  };
}

function normalizeTarget(target) {
  if (!target || typeof target !== "object") {
    throw new TypeError("EditMap requires a target.");
  }

  if (target.type === "edge" && typeof target.id === "string" && target.id) {
    return { type: "edge", id: target.id };
  }

  if (target.type === "node") {
    const ids = Array.isArray(target.ids) ? target.ids : [target.id];
    const normalizedIds = [...new Set(ids)].filter(id => typeof id === "string" && id);
    if (normalizedIds.length) return { type: "node", ids: normalizedIds };
  }

  throw new TypeError("EditMap requires a node or edge target with an id.");
}
