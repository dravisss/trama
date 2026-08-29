/**
 * Runtime contract for the map-authoring operations used by EditMap.
 *
 * The application layer speaks in map-editing operations. The concrete
 * renderer/engine remains an adapter and is not imported by the use case.
 */
export function requireMapEditor(editor) {
  const methods = ["updateNode", "updateNodes", "updateEdge"];
  if (!editor || methods.some(method => typeof editor[method] !== "function")) {
    throw new TypeError("EditMap requires a MapEditorPort with node and edge update operations.");
  }
  return editor;
}
