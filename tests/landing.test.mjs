import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createLandingDemo } from "../landing/demo.js";
import { validateModel, classifyLoop, compilePresentation, addNodeToModel, addEdgeToModel } from "../src/index.js";

const map = await readFile(new URL("../seeds/trama-atalhos.loop.md", import.meta.url), "utf8");
const story = await readFile(new URL("../seeds/trama-atalhos.story.md", import.meta.url), "utf8");

test("landing example is a complete directed reinforcing cycle with causal explanations", () => {
  const { model } = createLandingDemo(map, story);
  assert.equal(validateModel(model).valid, true);
  assert.equal(model.nodes.length, 6);
  assert.equal(model.edges.length, 6);
  assert.equal(classifyLoop(model.edges), "reinforcing");
  assert.deepEqual(model.loops[0].edgeIds, ["e01", "e02", "e03", "e04", "e05", "e06"]);
  assert.ok(model.edges.every(edge => edge.description.length > 45));
  assert.ok(model.nodes.every(node => node.media?.assetId && node.media.altText && node.media.labelPlacement === "below"));
  for (const node of model.nodes) assert.ok(node.media.size >= 150);
  assert.equal(model.story, undefined);
});

test("five V2 beats bind real map elements and explicit cameras and close with feedback", () => {
  const { presentation, compiled, lint, model } = createLandingDemo(map, story);
  assert.equal(presentation.schemaVersion, 2);
  assert.equal(compiled.timeline.length, 5);
  assert.equal(compiled.valid, true);
  assert.equal(lint.errors.length, 0);
  assert.equal(lint.warnings.length, 0);
  for (const frame of compiled.timeline) {
    assert.equal(frame.scene.mapRef.mapId, model.id);
    assert.ok(["fit-map", "fit-focus", "follow-path"].includes(frame.stage.camera.mode));
    assert.ok(frame.focus.nodeIds.length || frame.focus.edgeIds.length);
  }
  assert.equal(compiled.timeline.at(-1).beat.type, "consequence");
  assert.equal(compiled.timeline.at(-1).beat.focus.loopId, "r1");
});

test("private draft changes do not mutate the original model or its presentation", () => {
  const { model, presentation } = createLandingDemo(map, story);
  const snapshot = JSON.stringify(model);
  const withNode = addNodeToModel(structuredClone(model), { label: "Visibilidade", position: { x: 400, y: 0 } });
  const withEdge = addEdgeToModel(withNode, { source: withNode.nodes.at(-1).id, target: "espera", sourceSign: "+", targetSign: "-", description: "Mais visibilidade pode reduzir a espera neste contexto." });
  assert.equal(validateModel(withEdge).valid, true);
  assert.equal(withEdge.nodes.length, 7);
  assert.equal(JSON.stringify(model), snapshot);
  assert.equal(compilePresentation(presentation, { model }).valid, true);
});

test("source drift fails rather than silently showing a disconnected presentation", () => {
  assert.throws(() => createLandingDemo(map, story.replace("path e02, e03", "path e02, e06")));
  assert.throws(() => createLandingDemo(map.replace("e01 | espera | atalhos", "e01 | espera | canais"), story));
});

test("every relation of the loop bows away from the centre of the cycle", async () => {
  const { outwardCurve } = await import("../landing/cinema.js");
  const { model } = createLandingDemo(map, story);
  assert.ok(model.edges.every(edge => !edge.route?.locked));
  const points = [[392, 96], [628, 223], [620, 455], [392, 579], [164, 455], [156, 223]];
  const centre = [392, 339];
  for (const edge of model.edges) {
    const a = points[model.nodes.findIndex(node => node.id === edge.source)];
    const b = points[model.nodes.findIndex(node => node.id === edge.target)];
    const { d } = outwardCurve(a, b, centre, { start: 84, end: 92, bow: 34, signOffset: 15 });
    const [, cx, cy] = d.match(/Q(-?[\d.]+) (-?[\d.]+)/).map(Number);
    const chordMid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const distance = point => Math.hypot(point[0] - centre[0], point[1] - centre[1]);
    assert.ok(distance([cx, cy]) > distance(chordMid), `${edge.id} bows inward`);
  }
});
