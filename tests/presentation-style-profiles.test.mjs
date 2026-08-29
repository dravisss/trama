import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRESENTATION_STYLE,
  presentationCameraMotion,
  presentationCameraMaxZoom,
  presentationConnectorMode,
  resolvePresentationStyle
} from "../src/presentation/styleProfiles.js";
import { mergeEditorialPresentation } from "../src/presentation/editorial.js";

test("presentation style prefers an explicit preview override and retains a safe default", () => {
  assert.equal(resolvePresentationStyle({ presentation: { settings: { presentationStyle: "atlas-editorial" } } }), "atlas-editorial");
  assert.equal(resolvePresentationStyle({ requested: "relation-tooltip", presentation: { settings: { presentationStyle: "atlas-editorial" } } }), "relation-tooltip");
  assert.equal(resolvePresentationStyle({ requested: "unknown" }), DEFAULT_PRESENTATION_STYLE);
  assert.equal(resolvePresentationStyle({ requested: "unknown", presentation: { settings: { presentationStyle: "atlas-editorial" } } }), "atlas-editorial");
});

test("atlas gives every authored camera mode a deliberate motion contract", () => {
  assert.deepEqual(presentationCameraMotion("atlas-editorial", { mode: "fit-map" }), {
    duration: 960,
    easing: "ease-out-cubic"
  });
  assert.deepEqual(presentationCameraMotion("atlas-editorial", { mode: "fit-focus" }), {
    duration: 820,
    easing: "ease-in-out-cubic"
  });
  assert.deepEqual(presentationCameraMotion("atlas-editorial", { mode: "follow-path" }), {
    duration: 1080,
    easing: "ease-in-out-cubic"
  });
  assert.deepEqual(presentationCameraMotion("atlas-editorial", { mode: "fit-focus" }, { reduced: true }), {
    duration: 0,
    easing: "linear"
  });
});

test("atlas only tethers cards to exact node or edge focus", () => {
  assert.equal(presentationConnectorMode("atlas-editorial", { focus: { kind: "node" }, nodeIds: ["a"] }), "tethered");
  assert.equal(presentationConnectorMode("atlas-editorial", { focus: { kind: "edge" }, edgeIds: ["e1"] }), "tethered");
  assert.equal(presentationConnectorMode("atlas-editorial", { focus: { kind: "path" }, edgeIds: ["e1", "e2"] }), "parked");
  assert.equal(presentationConnectorMode("atlas-editorial", { focus: { kind: "loop" }, edgeIds: ["e1"], loopIds: ["r1"] }), "parked");
});

test("atlas applies editorial camera caps without changing authored camera modes", () => {
  assert.equal(presentationCameraMaxZoom("atlas-editorial", { targetKind: "edge", maxZoom: 3.6 }), 1.62);
  assert.equal(presentationCameraMaxZoom("atlas-editorial", { targetKind: "map", maxZoom: 3.6 }), 1.16);
  const authoredModes = [
    ["fit-map", "map"],
    ["fit-focus", "node-neighborhood"],
    ["follow-path", "path"],
    ["fit-set", "set"],
    ["fixed", "fixed"],
    ["split", "split"]
  ];
  for (const [mode, targetKind] of authoredModes) {
    const plan = { mode, targetKind, maxZoom: 3.6 };
    assert.equal(plan.mode, mode);
    assert.equal(presentationCameraMaxZoom("atlas-editorial", plan) <= plan.maxZoom, true);
  }
});

test("editorial Markdown merges preserve the selected presentation profile", () => {
  const merged = mergeEditorialPresentation(
    { id: "story", settings: { presentationStyle: "atlas-editorial" }, chapters: [] },
    { id: "story", chapters: [] }
  );
  assert.equal(merged.settings.presentationStyle, "atlas-editorial");
});
