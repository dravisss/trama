import assert from "node:assert/strict";
import test from "node:test";
import cytoscape from "cytoscape";
import { removeNodeOverlaps } from "../src/geometry/overlapRemoval.js";

test("overlap removal separates movable nodes while preserving locked nodes", () => {
  const cy = cytoscape({
    headless: true,
    elements: [
      { data: { id: "a" }, position: { x: 0, y: 0 } },
      { data: { id: "b" }, position: { x: 1, y: 1 }, locked: true }
    ],
    style: [
      { selector: "node", style: { width: 40, height: 40 } }
    ]
  });
  const lockedBefore = { ...cy.getElementById("b").position() };
  removeNodeOverlaps(cy, { iterations: 8, gap: 8 });
  const lockedAfter = cy.getElementById("b").position();
  const movableAfter = cy.getElementById("a").position();
  assert.deepEqual(lockedAfter, lockedBefore);
  assert.ok(Math.hypot(movableAfter.x - lockedAfter.x, movableAfter.y - lockedAfter.y) > Math.SQRT2);
  assert.ok(Math.hypot(movableAfter.x - lockedAfter.x, movableAfter.y - lockedAfter.y) >= 80);
  cy.destroy();
});
