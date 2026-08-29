/**
 * Adapter from the reusable CLD engine to the MapEditorPort consumed by
 * EditMap. No UI or persistence policy belongs in this adapter.
 */
export function createEngineMapEditor({ engine } = {}) {
  const methods = ["updateNode", "updateNodes", "updateEdge"];
  if (!engine || methods.some(method => typeof engine[method] !== "function")) {
    throw new TypeError("createEngineMapEditor requires an editable engine.");
  }

  return {
    updateNode: (...args) => engine.updateNode(...args),
    updateNodes: (...args) => engine.updateNodes(...args),
    updateEdge: (...args) => engine.updateEdge(...args)
  };
}
