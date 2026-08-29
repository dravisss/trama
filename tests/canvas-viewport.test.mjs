import assert from "node:assert/strict";
import test from "node:test";
import { measureCanvasSafeRect } from "../src/app/canvasViewport.js";

function element(rect) {
  return { hidden: false, getBoundingClientRect: () => rect };
}

const documentRef = {
  defaultView: { getComputedStyle: () => ({ display: "block", visibility: "visible" }) }
};

test("measureCanvasSafeRect reserves a substantial Atlas card without fixed offsets", () => {
  const safeRect = measureCanvasSafeRect({
    canvas: element({ left: 0, top: 0, right: 1200, bottom: 800, width: 1200, height: 800 }),
    overlays: [],
    sideOverlays: [element({ left: 24, top: 130, right: 444, bottom: 700, width: 420, height: 570 })],
    gutter: 12,
    documentRef
  });

  assert.deepEqual(safeRect, { x: 456, y: 12, width: 732, height: 776 });
});

test("measureCanvasSafeRect ignores compact side controls", () => {
  const safeRect = measureCanvasSafeRect({
    canvas: element({ left: 0, top: 0, right: 1200, bottom: 800, width: 1200, height: 800 }),
    overlays: [],
    sideOverlays: [element({ left: 24, top: 20, right: 180, bottom: 130, width: 156, height: 110 })],
    gutter: 12,
    documentRef
  });

  assert.deepEqual(safeRect, { x: 12, y: 12, width: 1176, height: 776 });
});
