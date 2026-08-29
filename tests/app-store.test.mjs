import assert from "node:assert/strict";
import test from "node:test";
import { createAppStore, normalizeAppState } from "../src/app/appStore.js";
import { createAppCommands } from "../src/app/appCommands.js";

test("app store normalizes invalid UI state at the boundary", () => {
  const state = normalizeAppState({ mode: "unknown", activeIndex: -2, activeDockPanel: "old", story: { editorMode: "split" } });
  assert.equal(state.mode, "workspace");
  assert.equal(state.activeIndex, 0);
  assert.equal(state.activeDockPanel, "map");
  assert.equal(state.story.editorMode, "visual");
  assert.deepEqual(state.story.selection, { sceneId: null, beatId: null });
});
test("app commands publish one coherent snapshot for navigation and story selection", () => {
  const store = createAppStore();
  const snapshots = [];
  store.subscribe((next, previous, action) => snapshots.push({ next, previous, action }));
  const commands = createAppCommands(store);

  commands.setMode("story");
  commands.openDockPanel("story");
  commands.selectModel(2);
  commands.selectStoryTarget("scene-2", "beat-4");
  commands.setStoryEditorMode("markdown");

  const state = store.getState();
  assert.equal(state.mode, "story");
  assert.equal(state.activeDockPanel, "story");
  assert.equal(state.activeIndex, 2);
  assert.deepEqual(state.story.selection, { sceneId: "scene-2", beatId: "beat-4" });
  assert.equal(state.story.editorMode, "markdown");
  assert.equal(snapshots.length, 5);
  assert.equal(snapshots.at(-1).action.type, "SET_STORY_EDITOR_MODE");
});

test("repeating an intent is a no-op and does not notify subscribers", () => {
  const store = createAppStore();
  let notifications = 0;
  store.subscribe(() => { notifications += 1; });
  assert.equal(store.dispatch({ type: "SET_MODE", payload: { mode: "workspace" } }), false);
  assert.equal(store.dispatch({ type: "OPEN_DOCK_PANEL", payload: { panel: "map" } }), false);
  assert.equal(notifications, 0);
});

test("store subscriptions can be removed without leaking listeners", () => {
  const store = createAppStore();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications += 1; });
  unsubscribe();
  store.dispatch({ type: "SET_FOCUS_MODE", payload: { enabled: true } });
  assert.equal(notifications, 0);
});
