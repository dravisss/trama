import assert from "node:assert/strict";
import test from "node:test";
import { clampFitPadding, fitViewportToRect, normalizeBox, normalizeRect } from "../src/geometry/fitViewport.js";

test("fitViewportToRect centers a model inside the safe rectangle", () => {
  const viewport = fitViewportToRect({
    boundingBox: { x: 0, y: 0, width: 100, height: 50 },
    rect: { x: 20, y: 40, width: 400, height: 300 }
  });

  assert.equal(viewport.zoom, 4);
  assert.deepEqual(viewport.pan, { x: 20, y: 90 });
});

test("fitViewportToRect applies pixel padding before calculating zoom", () => {
  const viewport = fitViewportToRect({
    boundingBox: { x: -50, y: 25, width: 200, height: 100 },
    rect: { x: 0, y: 0, width: 500, height: 300 },
    padding: 25
  });

  assert.equal(viewport.zoom, 2.25);
  assert.deepEqual(viewport.pan, { x: 137.5, y: -18.75 });
});

test("fitViewportToRect rejects invalid boxes and rectangles", () => {
  assert.equal(fitViewportToRect({ boundingBox: { width: 0, height: 10 }, rect: { x: 0, y: 0, width: 100, height: 100 } }), null);
  assert.equal(fitViewportToRect({ boundingBox: { x: 0, y: 0, width: 10, height: 10 }, rect: { x: 0, y: 0, width: 0, height: 100 } }), null);
  assert.equal(normalizeBox({ x: 1, y: 2, width: 3, height: 4 }).height, 4);
  assert.equal(normalizeRect({ x: 1, y: 2, width: -3, height: 4 }), null);
});

test("clampFitPadding preserves spacious cameras and protects compact safe rectangles", () => {
  assert.equal(clampFitPadding(180, { x: 0, y: 0, width: 2000, height: 1200 }), 180);
  assert.equal(clampFitPadding(180, { x: 0, y: 0, width: 749, height: 234 }), 42.12);
  assert.equal(clampFitPadding(0, { x: 0, y: 0, width: 749, height: 234 }), 0);
});
