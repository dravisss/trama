/**
 * Small, framework-agnostic application store.
 *
 * The editor still has imperative services (Cytoscape, persistence and the
 * standalone exporter), but UI intent must have one observable source of
 * truth.  Keeping this store independent from React makes it useful to the
 * legacy adapter, React components, browser QA and future non-browser hosts.
 */

export const APP_MODES = Object.freeze(["workspace", "map", "story", "present"]);
export const APP_DOCK_PANELS = Object.freeze(["inspect", "map", "code", "style", "story", "table", "history"]);

const DEFAULT_STATE = {
  mode: "workspace",
  activeIndex: 0,
  activeLoopId: null,
  activeDockPanel: "map",
  editing: false,
  focusMode: false,
  sidebarCollapsed: false,
  presenterMode: false,
  view: null,
  callbacks: null,
  // React composition snapshots live beside navigation state. Imperative
  // bridges may still publish compatibility intents, but they no longer own
  // a second mutable render state inside the React mount.
  composition: {
    loopBrowser: { summary: "", loops: [], editing: false, activeLoopId: null },
    mapSelector: { items: [] },
    canvasActions: {},
    editorActions: {},
    editorToolbar: { visible: false, selectionText: "Selecione um nó para mover ou fixar" },
    editorDockActions: {},
    presentationActions: {},
    viewSwitcher: { options: [], activeId: "", currentTitle: "Matcha padrão", canManage: false },
    editorInspector: { nodeIds: [], node: null, edge: null, help: "Selecione uma variável ou relação no canvas." },
    dataTable: { activeTab: "nodes", columns: [], rows: [] },
    versionHistory: { message: "Carregando versões...", versions: [], kind: "loop" },
    styleBuilder: { values: {}, editorValue: "", status: "Vista válida" },
    movementComposer: { open: false, sessionId: 0 },
    movementInspector: { kind: "generic", label: "Foco semântico", model: {} },
    storyTimeline: { status: "Nenhum movimento selecionado", time: "00:00", currentIndex: -1, totalFrames: 0, presentation: {}, timeline: [], getBeatTitle: () => "Sem título", actions: {} }
  },
  save: { state: "idle", message: "" },
  story: {
    selection: { sceneId: null, beatId: null },
    editorMode: "visual",
    inspectorMode: "basic",
    dirty: false
  }
};

function validValue(value, values, fallback) {
  return values.includes(value) ? value : fallback;
}

function normalizeStory(story = {}, previous = DEFAULT_STATE.story) {
  const selection = story.selection
    ? {
      ...previous.selection,
      ...story.selection,
      sceneId: story.selection.sceneId || null,
      beatId: story.selection.beatId || null
    }
    : previous.selection;
  return {
    ...previous,
    ...story,
    selection,
    editorMode: validValue(story.editorMode, ["visual", "markdown"], previous.editorMode),
    inspectorMode: validValue(story.inspectorMode, ["basic", "advanced"], previous.inspectorMode),
    dirty: Boolean(story.dirty)
  };
}

export function normalizeAppState(initial = {}) {
  const state = { ...DEFAULT_STATE, ...initial };
  return {
    ...state,
    mode: validValue(state.mode, APP_MODES, DEFAULT_STATE.mode),
    activeIndex: Number.isInteger(state.activeIndex) && state.activeIndex >= 0 ? state.activeIndex : 0,
    activeLoopId: state.activeLoopId || null,
    activeDockPanel: validValue(state.activeDockPanel, APP_DOCK_PANELS, DEFAULT_STATE.activeDockPanel),
    editing: Boolean(state.editing),
    focusMode: Boolean(state.focusMode),
    sidebarCollapsed: Boolean(state.sidebarCollapsed),
    presenterMode: Boolean(state.presenterMode),
    composition: state.composition && typeof state.composition === "object"
      ? state.composition
      : DEFAULT_STATE.composition,
    save: { ...DEFAULT_STATE.save, ...(state.save || {}) },
    story: normalizeStory(state.story, DEFAULT_STATE.story)
  };
}

function sameAppState(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.mode === right.mode
    && left.activeIndex === right.activeIndex
    && left.activeLoopId === right.activeLoopId
    && left.activeDockPanel === right.activeDockPanel
    && left.editing === right.editing
    && left.focusMode === right.focusMode
    && left.sidebarCollapsed === right.sidebarCollapsed
    && left.presenterMode === right.presenterMode
    && left.view === right.view
    && left.callbacks === right.callbacks
    && left.composition === right.composition
    && left.save?.state === right.save?.state
    && left.save?.message === right.save?.message
    && left.story?.editorMode === right.story?.editorMode
    && left.story?.inspectorMode === right.story?.inspectorMode
    && left.story?.dirty === right.story?.dirty
    && left.story?.selection?.sceneId === right.story?.selection?.sceneId
    && left.story?.selection?.beatId === right.story?.selection?.beatId;
}

export function reduceAppState(state, action = {}) {
  const current = normalizeAppState(state);
  const payload = action.payload || action;
  switch (action.type) {
    case "SET_MODE":
      return { ...current, mode: validValue(payload.mode, APP_MODES, current.mode) };
    case "SELECT_MODEL":
      return { ...current, activeIndex: Math.max(0, Number(payload.index) || 0), activeLoopId: null,
        story: normalizeStory({ selection: { sceneId: null, beatId: null } }, current.story) };
    case "SET_ACTIVE_LOOP":
      return { ...current, activeLoopId: payload.loopId || null };
    case "CLEAR_ACTIVE_LOOP":
      return { ...current, activeLoopId: null };
    case "OPEN_DOCK_PANEL":
      return { ...current, activeDockPanel: validValue(payload.panel, APP_DOCK_PANELS, current.activeDockPanel) };
    case "SET_EDITING":
      return { ...current, editing: Boolean(payload.enabled) };
    case "SET_FOCUS_MODE":
      return { ...current, focusMode: Boolean(payload.enabled) };
    case "SET_SIDEBAR_COLLAPSED":
      return { ...current, sidebarCollapsed: Boolean(payload.collapsed) };
    case "SET_PRESENTER_MODE":
      return { ...current, presenterMode: Boolean(payload.enabled) };
    case "SELECT_STORY_TARGET":
      return { ...current, story: normalizeStory({ selection: { sceneId: payload.sceneId, beatId: payload.beatId } }, current.story) };
    case "SET_STORY_EDITOR_MODE":
      return { ...current, story: normalizeStory({ editorMode: payload.mode }, current.story) };
    case "SET_STORY_INSPECTOR_MODE":
      return { ...current, story: normalizeStory({ inspectorMode: payload.mode }, current.story) };
    case "SET_STORY_DIRTY":
      return { ...current, story: normalizeStory({ dirty: payload.dirty }, current.story) };
    case "SET_SAVE_STATUS":
      return { ...current, save: { state: payload.state || "idle", message: payload.message || "" } };
    case "SET_VIEW":
      return { ...current, view: payload.view ?? null };
    case "SET_CALLBACKS":
      return { ...current, callbacks: payload.callbacks ?? null };
    case "RESET":
      return normalizeAppState(payload.state || {});
    default:
      return current;
  }
}

export function createAppStore(initial = {}) {
  let state = normalizeAppState(initial);
  const listeners = new Set();

  const notify = (next, previous, action) => {
    listeners.forEach(listener => listener(next, previous, action));
  };

  const setState = (patch, action = { type: "SET_STATE" }) => {
    const previous = state;
    const nextPatch = typeof patch === "function" ? patch(previous) : patch;
    const next = normalizeAppState({
      ...previous,
      ...(nextPatch || {}),
      composition: { ...previous.composition, ...(nextPatch?.composition || {}) },
      story: { ...previous.story, ...(nextPatch?.story || {}) },
      save: { ...previous.save, ...(nextPatch?.save || {}) }
    });
    if (sameAppState(previous, next)) return false;
    state = next;
    notify(state, previous, action);
    return true;
  };

  const dispatch = action => {
    const next = reduceAppState(state, action);
    if (sameAppState(state, next)) return false;
    const previous = state;
    state = next;
    notify(state, previous, action);
    return true;
  };

  return {
    getState: () => state,
    getSnapshot: () => state,
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setState,
    dispatch,
    reset(next = {}) { return dispatch({ type: "RESET", state: next }); },
    destroy() { listeners.clear(); }
  };
}
