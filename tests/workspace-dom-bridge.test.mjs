import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspaceDomBridge } from "../src/app/workspaceDomBridge.js";

function target({ dataset = {} } = {}) {
  const listeners = new Map();
  return {
    dataset,
    clicks: 0,
    focuses: 0,
    hidden: true,
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
    click() {
      this.clicks += 1;
    },
    focus() {
      this.focuses += 1;
    },
    contains(candidate) {
      return candidate === this;
    }
  };
}

test("workspace DOM bridge delegates shell commands and cleans up", () => {
  const mode = target({ dataset: { uiMode: "map" } });
  const importFile = target();
  const documentRef = target();
  const calls = [];

  const bridge = createWorkspaceDomBridge({
    documentRef,
    elements: {
      modeButtons: [mode],
      importJsonFile: importFile
    },
    actions: {
      setWorkspaceMode: value => calls.push(["mode", value]),
      importJsonFile: () => calls.push(["import"]),
      handleKeydown: event => calls.push(["keydown", event.key])
    }
  });

  mode.emit("click");
  importFile.emit("change");
  documentRef.emit("keydown", { key: "Escape" });
  assert.deepEqual(calls, [["import"], ["keydown", "Escape"]]);

  bridge.destroy();
  mode.emit("click");
  documentRef.emit("keydown", { key: "Enter" });
  assert.deepEqual(calls, [["import"], ["keydown", "Escape"]]);
});

test("workspace save popover closes on Escape and does not leak the event to global shortcuts", () => {
  const documentRef = target();
  const saveStatus = target();
  const savePopover = target();
  const calls = [];

  createWorkspaceDomBridge({
    documentRef,
    elements: { saveStatus, savePopover },
    actions: {
      toggleSavePopover: open => {
        calls.push(["save", open]);
        savePopover.hidden = !open;
      },
      handleKeydown: event => calls.push(["keydown", event.key])
    }
  });

  saveStatus.emit("click");
  assert.equal(savePopover.hidden, false);
  assert.deepEqual(calls, [["save", true]]);

  let prevented = false;
  documentRef.emit("keydown", { key: "Escape", preventDefault: () => { prevented = true; } });
  assert.equal(savePopover.hidden, true);
  assert.equal(saveStatus.focuses, 1);
  assert.equal(prevented, true);
  assert.deepEqual(calls, [["save", true], ["save", false]]);

  saveStatus.emit("click");
  documentRef.emit("pointerdown", { target: target() });
  assert.equal(savePopover.hidden, true);
  assert.deepEqual(calls, [["save", true], ["save", false], ["save", true], ["save", false]]);
});

test("workspace command menu closes on Escape or outside pointer and returns focus to its summary", () => {
  const documentRef = target();
  const summary = target();
  const menu = { ...target(), open: true, querySelector: selector => selector === "summary" ? summary : null };
  const calls = [];

  createWorkspaceDomBridge({
    documentRef,
    elements: { commandMenus: [menu] },
    actions: { handleKeydown: event => calls.push(["keydown", event.key]) }
  });

  let prevented = false;
  documentRef.emit("keydown", { key: "Escape", preventDefault: () => { prevented = true; } });
  assert.equal(menu.open, false);
  assert.equal(summary.focuses, 1);
  assert.equal(prevented, true);
  assert.deepEqual(calls, []);

  menu.open = true;
  documentRef.emit("pointerdown", { target: target() });
  assert.equal(menu.open, false);
  assert.equal(summary.focuses, 1);
});
