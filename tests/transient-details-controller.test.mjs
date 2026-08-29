import assert from "node:assert/strict";
import test from "node:test";
import { createTransientDetailsController } from "../src/adapters/browser/transientDetailsController.js";

class FakeTarget extends EventTarget {
  constructor({ open = false } = {}) {
    super();
    this.open = open;
    this.children = [];
    this.parent = null;
  }

  contains(target) {
    return target === this || this.children.includes(target);
  }

  closest(selector) {
    if (selector.includes("details") && this.isTransientDetail) return this;
    return this.parent?.closest(selector) || null;
  }
}

class FakeDocument extends FakeTarget {
  constructor(details = [], buttons = [], dialogs = []) {
    super();
    this.details = details;
    this.buttons = buttons;
    this.dialogs = dialogs;
  }

  querySelectorAll(selector) {
    if (selector === ".command-menu-panel button") return this.buttons;
    return this.details;
  }

  querySelector(selector) {
    if (selector === "dialog[open]") return this.dialogs.find(dialog => dialog.open) || null;
    return null;
  }
}

function transientDetail(open = false) {
  const detail = new FakeTarget({ open });
  detail.isTransientDetail = true;
  return detail;
}

function keyEvent(key) {
  const event = new Event("keydown");
  Object.defineProperty(event, "key", { value: key });
  return event;
}

test("transient details controller enforces one open menu and closes on Escape/outside", () => {
  const first = transientDetail(true);
  const second = transientDetail(true);
  const button = new FakeTarget();
  const documentRef = new FakeDocument([first, second], [button]);
  const controller = createTransientDetailsController({ documentRef });

  first.dispatchEvent(new Event("toggle"));
  assert.equal(first.open, true);
  assert.equal(second.open, false);

  second.open = true;
  documentRef.dispatchEvent(keyEvent("Escape"));
  assert.equal(first.open, false);
  assert.equal(second.open, false);

  first.open = true;
  documentRef.dispatchEvent(new Event("pointerdown"));
  assert.equal(first.open, false);

  controller.destroy();
  second.open = true;
  second.dispatchEvent(new Event("toggle"));
  assert.equal(second.open, true);
});

test("transient details controller preserves menus while a native dialog is open", () => {
  const detail = transientDetail(true);
  const dialog = new FakeTarget({ open: true });
  const documentRef = new FakeDocument([detail], [], [dialog]);
  const controller = createTransientDetailsController({ documentRef });

  documentRef.dispatchEvent(keyEvent("Escape"));
  documentRef.dispatchEvent(new Event("pointerdown"));
  assert.equal(detail.open, true);
  controller.destroy();
});

test("transient details controller delegates modal backdrop clicks and cleans up", () => {
  const documentRef = new FakeDocument();
  const modal = new FakeTarget();
  const calls = [];
  const controller = createTransientDetailsController({
    documentRef,
    loopDescriptionModal: modal,
    onCloseLoopDescription: () => calls.push("modal")
  });

  modal.dispatchEvent(new Event("click"));
  assert.deepEqual(calls, ["modal"]);
  controller.destroy();
  modal.dispatchEvent(new Event("click"));
  assert.deepEqual(calls, ["modal"]);
});
