import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseTooltipPlacement,
  createTooltipTrackingState,
  nearestPointOnRect,
  rectOverlapArea,
  rectPointDistance,
  trackTooltipPlacement,
  tooltipModeForFocus
} from "../src/presentation/tooltipLayout.js";

test("relation tooltip uses tethered mode only for a single node or edge", () => {
  assert.equal(tooltipModeForFocus({ kind: "node", nodeIds: ["n1"] }), "tethered");
  assert.equal(tooltipModeForFocus({ kind: "edge", edgeIds: ["e1"] }), "tethered");
  assert.equal(tooltipModeForFocus({ kind: "path", edgeIds: ["e1", "e2"] }), "parked");
  assert.equal(tooltipModeForFocus({ kind: "set", nodeIds: ["n1"], edgeIds: ["e1"] }), "parked");
  assert.equal(tooltipModeForFocus({ kind: "loop", loopIds: ["r1"] }), "parked");
});

test("tethered placement stays inside bounds and clears the focused node", () => {
  const placement = chooseTooltipPlacement({
    mode: "tethered",
    bounds: { x: 0, y: 0, width: 900, height: 560 },
    width: 260,
    height: 150,
    anchor: { x: 450, y: 280 },
    obstacles: [{ type: "circle", x: 450, y: 280, r: 92 }]
  });
  const card = { x: placement.x, y: placement.y, width: 260, height: 150 };

  assert.equal(placement.mode, "tethered");
  assert.ok(placement.connector);
  assert.ok(placement.x >= 20 && placement.y >= 20);
  assert.ok(placement.x + card.width <= 880);
  assert.ok(placement.y + card.height <= 540);
  assert.ok(rectPointDistance(card, { x: 450, y: 280 }) >= 92);
  assert.deepEqual(placement.connector.from, { x: 450, y: 280 });
  assert.deepEqual(placement.connector.to, nearestPointOnRect(card, placement.connector.from));
});

test("parked placement has no connector and avoids compound-focus obstacles", () => {
  const placement = chooseTooltipPlacement({
    mode: "parked",
    bounds: { x: 0, y: 0, width: 1000, height: 620 },
    width: 300,
    height: 180,
    obstacles: [
      { type: "circle", x: 760, y: 120, r: 120 },
      { type: "rect", x: 700, y: 260, width: 250, height: 120 }
    ]
  });
  const card = { x: placement.x, y: placement.y, width: 300, height: 180 };

  assert.equal(placement.mode, "parked");
  assert.equal(placement.connector, null);
  assert.ok(placement.x >= 20 && placement.y >= 20);
  assert.ok(placement.x + card.width <= 980);
  assert.ok(placement.y + card.height <= 600);
  assert.equal(rectOverlapArea(card, { x: 700, y: 260, width: 250, height: 120 }), 0);
});

test("tracking preserves the chosen tethered offset instead of hopping grid cells", () => {
  const initial = chooseTooltipPlacement({
    mode: "tethered",
    bounds: { x: 0, y: 0, width: 900, height: 560 },
    width: 260,
    height: 150,
    anchor: { x: 450, y: 280 },
    obstacles: [{ type: "circle", x: 450, y: 280, r: 92 }]
  });
  const state = createTooltipTrackingState({
    key: "beat-1",
    mode: "tethered",
    placement: initial,
    anchor: { x: 450, y: 280 },
    width: 260,
    height: 150,
    bounds: { x: 0, y: 0, width: 900, height: 560 }
  });
  const next = trackTooltipPlacement({
    state,
    bounds: { x: 0, y: 0, width: 900, height: 560 },
    width: 260,
    height: 150,
    anchor: { x: 452.75, y: 282.5 }
  });

  assert.equal(next.x, initial.x + 2.75);
  assert.equal(next.y, initial.y + 2.5);
  assert.deepEqual(next.connector.from, { x: 452.75, y: 282.5 });
});

test("tracking clamps a moving tooltip without changing its selected side", () => {
  const state = createTooltipTrackingState({
    key: "beat-2",
    mode: "tethered",
    placement: { mode: "tethered", x: 500, y: 200 },
    anchor: { x: 450, y: 280 },
    width: 260,
    height: 150,
    bounds: { x: 0, y: 0, width: 900, height: 560 }
  });
  const next = trackTooltipPlacement({
    state,
    bounds: { x: 0, y: 0, width: 900, height: 560 },
    width: 260,
    height: 150,
    anchor: { x: 1000, y: 900 }
  });

  assert.equal(next.x, 620);
  assert.equal(next.y, 390);
  assert.equal(next.mode, "tethered");
});

test("tracking can freeze an editorial card while its exact connector follows the camera", () => {
  const state = createTooltipTrackingState({
    key: "atlas-beat",
    mode: "tethered",
    placement: { mode: "tethered", x: 22, y: 180 },
    anchor: { x: 520, y: 310 },
    width: 428,
    height: 292,
    bounds: { x: 0, y: 0, width: 1100, height: 820 }
  });
  const next = trackTooltipPlacement({
    state,
    bounds: { x: 0, y: 0, width: 1100, height: 820 },
    width: 428,
    height: 292,
    anchor: { x: 760.25, y: 452.75 },
    followAnchor: false
  });

  assert.equal(next.x, 22);
  assert.equal(next.y, 180);
  assert.deepEqual(next.connector.from, { x: 760.25, y: 452.75 });
  assert.deepEqual(next.connector.to, nearestPointOnRect({ x: 22, y: 180, width: 428, height: 292 }, next.connector.from));
});
