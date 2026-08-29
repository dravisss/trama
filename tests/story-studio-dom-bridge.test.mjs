import assert from "node:assert/strict";
import test from "node:test";
import { createStoryStudioDomBridge } from "../src/app/storyStudio/domBridge.js";

function target({ id = "", dataset = {} } = {}) {
  const listeners = new Map();
  return {
    id,
    dataset,
    focused: false,
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || new Set();
      handlers.add(handler);
      listeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    emit(type, event = {}) {
      const payload = { ...event, currentTarget: this };
      listeners.get(type)?.forEach(handler => handler(payload));
    },
    focus() {
      this.focused = true;
    }
  };
}

test("Story Studio DOM bridge translates tab and inspector intents and can be destroyed", () => {
  const documentRef = target();
  const inspectorTab = target({ id: "story-sidebar-inspector" });
  const markdownTab = target({ id: "story-sidebar-markdown" });
  const title = target({ id: "story-inspector-title" });
  const selectionAction = target({ id: "story-inspector-add-selection" });
  const editMovement = target({ id: "story-inspector-edit-movement" });
  const calls = [];

  const bridge = createStoryStudioDomBridge({
    documentRef,
    elements: {
      storySidebarInspector: inspectorTab,
      storySidebarMarkdown: markdownTab,
      storyInspectorTitle: title,
      storyInspectorEditMovement: editMovement
    },
    actions: {
      setEditorMode: mode => calls.push(["mode", mode]),
      updateInspector: patch => calls.push(["inspector", patch]),
      addSelectionBeat: () => calls.push(["selection", "add"]),
      editMovement: () => calls.push(["movement", "edit"])
    }
  });

  documentRef.emit("click", {
    target: { closest: selector => selector.includes("story-sidebar-markdown") ? markdownTab : null }
  });
  assert.deepEqual(calls, [["mode", "markdown"]]);

  documentRef.emit("click", { target: { closest: selector => selector.includes("story-inspector-add-selection") ? selectionAction : null } });
  assert.deepEqual(calls.at(-1), ["selection", "add"]);

  documentRef.emit("click", { target: { closest: selector => selector.includes("story-inspector-edit-movement") ? editMovement : null } });
  assert.deepEqual(calls.at(-1), ["movement", "edit"]);

  title.value = "Narrar o movimento";
  title.emit("change");
  assert.deepEqual(calls.at(-1), ["inspector", { title: "Narrar o movimento" }]);

  inspectorTab.emit("keydown", { key: "ArrowRight", preventDefault() {} });
  assert.deepEqual(calls.at(-1), ["mode", "markdown"]);
  assert.equal(markdownTab.focused, true);

  bridge.destroy();
  documentRef.emit("click", {
    target: { closest: () => markdownTab }
  });
  title.value = "Não deve ser aplicado";
  title.emit("change");
  assert.deepEqual(calls, [
    ["mode", "markdown"],
    ["selection", "add"],
    ["movement", "edit"],
    ["inspector", { title: "Narrar o movimento" }],
    ["mode", "markdown"]
  ]);
});
