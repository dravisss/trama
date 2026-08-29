/**
 * UI-only state for Story Studio.
 *
 * Presentation data remains owned by the presentation editor. This store keeps
 * transient view state in one place so selection and panel changes do not
 * become another implicit data model inside the application composition root.
 */

function normalizeSelection(sceneId = null, beatId = null) {
  return {
    sceneId: sceneId || null,
    beatId: beatId || null
  };
}
export function createStoryStudioState(initial = {}) {
  let state = {
    selection: normalizeSelection(initial.selection?.sceneId, initial.selection?.beatId),
    inspectorMode: initial.inspectorMode === "advanced" ? "advanced" : "basic",
    editorMode: initial.editorMode === "markdown" ? "markdown" : "visual",
    dirty: Boolean(initial.dirty)
  };

  const notify = () => state;
  const update = patch => {
    state = { ...state, ...patch };
    return notify();
  };

  return {
    getState: () => state,
    select: (sceneId = null, beatId = null) => update({ selection: normalizeSelection(sceneId, beatId) }),
    setInspectorMode: mode => update({ inspectorMode: mode === "advanced" ? "advanced" : "basic" }),
    setEditorMode: mode => update({ editorMode: mode === "markdown" ? "markdown" : "visual" }),
    setDirty: dirty => update({ dirty: Boolean(dirty) }),
    reset: () => update({ selection: normalizeSelection(), inspectorMode: "basic", editorMode: "visual", dirty: false })
  };
}
