/** Typed UI-intent commands shared by React and the imperative adapter. */
export function createAppCommands(store) {
  if (!store?.dispatch) throw new TypeError("createAppCommands requires an app store");
  const send = (type, payload = {}) => store.dispatch({ type, payload });
  return {
    setMode: mode => send("SET_MODE", { mode }),
    selectModel: index => send("SELECT_MODEL", { index }),
    setActiveLoop: loopId => send("SET_ACTIVE_LOOP", { loopId }),
    clearActiveLoop: () => send("CLEAR_ACTIVE_LOOP"),
    openDockPanel: panel => send("OPEN_DOCK_PANEL", { panel }),
    setEditing: enabled => send("SET_EDITING", { enabled }),
    setFocusMode: enabled => send("SET_FOCUS_MODE", { enabled }),
    setSidebarCollapsed: collapsed => send("SET_SIDEBAR_COLLAPSED", { collapsed }),
    setPresenterMode: enabled => send("SET_PRESENTER_MODE", { enabled }),
    selectStoryTarget: (sceneId = null, beatId = null) => send("SELECT_STORY_TARGET", { sceneId, beatId }),
    setStoryEditorMode: mode => send("SET_STORY_EDITOR_MODE", { mode }),
    setStoryInspectorMode: mode => send("SET_STORY_INSPECTOR_MODE", { mode }),
    setStoryDirty: dirty => send("SET_STORY_DIRTY", { dirty }),
    setSaveStatus: (state, message) => send("SET_SAVE_STATUS", { state, message }),
    setView: view => send("SET_VIEW", { view }),
    setCallbacks: callbacks => send("SET_CALLBACKS", { callbacks })
  };
}
