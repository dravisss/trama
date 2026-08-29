import test from "node:test";
import assert from "node:assert/strict";
import { buildViewLegend, resolveView, stylePropertiesForEntity, ViewResolutionError } from "../src/core/views.js";
import { createViewFromStylePreset, getStylePreset, listStylePresets } from "../src/styles/library.js";
import { clampBadgePoint } from "../src/annotations/loopBadges.js";

test("derived views compose base settings and rules deterministically", () => {
  const base = {
    id: "base", title: "Base", settings: { background: "#fff", density: "full" },
    rules: [{ selector: { type: "variable" }, properties: { shape: "ellipse" } }]
  };
  const child = {
    id: "child", title: "Child", settings: { extends: "base", density: "minimal" },
    rules: [{ selector: { type: "variable", attribute: "tag", value: "risk" }, properties: { fill: "#f00" } }]
  };
  const resolved = resolveView(child, [base, child]);
  assert.equal(resolved.settings.background, "#fff");
  assert.equal(resolved.settings.density, "minimal");
  assert.equal(resolved.rules.length, 2);
  assert.deepEqual(resolved.source_views, ["base", "child"]);
});

test("view resolution rejects circular inheritance", () => {
  const a = { id: "a", settings: { extends: "b" }, rules: [] };
  const b = { id: "b", settings: { extends: "a" }, rules: [] };
  assert.throws(() => resolveView(a, [a, b]), ViewResolutionError);
});

test("legend entries are derived from authored field rules", () => {
  const legend = buildViewLegend({
    rules: [{
      selector: { type: "variable", attribute: "tag", value: "risk" },
      properties: { fill: "#c44", shape: "hexagon", legend: "Riscos" }
    }]
  });
  assert.deepEqual(legend[0], {
    id: "variable-tag-risk", label: "Riscos", type: "variable", color: "#c44", shape: "hexagon"
  });
});

test("loop and scene rules resolve against semantic attributes", () => {
  const view = { rules: [
    { selector: { type: "loop", attribute: "type", value: "reinforcing" }, properties: { "badge-fill": "#234" } },
    { selector: { type: "scene", attribute: "type", value: "title" }, properties: { fill: "#fff" } }
  ] };
  assert.equal(stylePropertiesForEntity(view, "loop", { type: "reinforcing" })["badge-fill"], "#234");
  assert.equal(stylePropertiesForEntity(view, "scene", { type: "title" }).fill, "#fff");
});

test("style library exposes versioned editorial presets", () => {
  const presets = listStylePresets();
  assert.ok(presets.length >= 4);
  assert.ok(presets.some(preset => preset.id === "matcha-executive"));
  assert.equal(getStylePreset("missing").id, "matcha-executive");
});

test("style preset materialization is self-contained and round-trippable", () => {
  const view = createViewFromStylePreset("boardroom-ink", { viewId: "view-1" });
  assert.equal(view.id, "view-1");
  assert.equal(view.settings["style-pack"], "boardroom-ink");
  assert.equal(view.settings["loop-badges"], false);
  assert.ok(view.rules.some(rule => rule.selector.attribute === "type" && rule.selector.value === "balancing"));
  assert.equal(view.rules.find(rule => rule.selector.value === "reinforcing").properties["arrow-shape"], "chevron");
  assert.match(view.style_source, /@view "Boardroom Ink"/);
});

test("badge candidates stay inside the visible canvas safe area", () => {
  assert.deepEqual(clampBadgePoint({ x: -50, y: 400 }, 120, 24, { width: 640, height: 480 }), { x: 68, y: 400 });
  assert.deepEqual(clampBadgePoint({ x: 700, y: 500 }, 120, 24, { width: 640, height: 480 }), { x: 572, y: 460 });
});
