import test from "node:test";
import assert from "node:assert/strict";
import {
  addEdgeToModel,
  addNodeToModel,
  createEmptyModel,
  normalizeModel,
  removeEdgeFromModel,
  removeNodeFromModel,
  updateEdgeInModel,
  updateNodeInModel,
  validateModel,
  CLDValidationError
} from "../src/core/model.js";
import { analyzeDensity, resolveDensityProfile } from "../src/core/density.js";
import { classifyLoop, discoverLoops } from "../src/core/loops.js";
import { applySavedLayout, extractLayout } from "../src/app/layoutStorage.js";
import { examples } from "../src/models/examples.js";
import { exampleAssets } from "../src/models/exampleAssets.js";
import { createStandaloneHtml } from "../src/export/standalone.js";
import { alignedNormal, arcLengthTable, bezierPoint, chordNormal, pointAtArcDistance } from "../src/geometry/index.js";

const validModel = {
  id: "test",
  nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
  edges: [{ id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "-" }]
};

test("normalizes ASCII minus to typographic minus", () => {
  assert.equal(normalizeModel(validModel).edges[0].targetSign, "−");
});

test("normalizes optional node media without changing image-free nodes", () => {
  const model = normalizeModel({
    ...validModel,
    nodes: [
      { id: "a", label: "Fila", media: { assetId: "fila-img", size: 180, focalPoint: { x: 0.8, y: 0.2 } } },
      validModel.nodes[1]
    ]
  });
  assert.equal(model.nodes[0].media.size, 180);
  assert.deepEqual(model.nodes[0].media.focalPoint, { x: 0.8, y: 0.2 });
  assert.equal(model.nodes[1].media, undefined);
  assert.equal(validateModel(model).valid, true);
});

test("rejects node media without a stable asset reference", () => {
  const result = validateModel({
    ...validModel,
    nodes: [{ id: "a", label: "Fila", media: { altText: "sem imagem" } }, validModel.nodes[1]]
  });
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /requires assetId/);
});

test("reports broken references", () => {
  const result = validateModel({
    ...validModel,
    edges: [{ ...validModel.edges[0], target: "missing" }]
  });
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /unknown target/);
});

test("throws a typed validation error", () => {
  assert.throws(() => normalizeModel({}), CLDValidationError);
});

test("allows a structurally valid empty workspace model", () => {
  const model = createEmptyModel({ id: "draft", title: "Rascunho" });
  assert.equal(model.id, "draft");
  assert.equal(model.title, "Rascunho");
  assert.deepEqual(model.nodes, []);
  assert.deepEqual(model.edges, []);
  assert.equal(validateModel(model).valid, true);
});

test("adds, updates and removes nodes in a model", () => {
  const withNode = addNodeToModel(createEmptyModel(), {
    label: "Receita recorrente"
  }, {
    position: { x: 12, y: 34 }
  });
  assert.equal(withNode.nodes[0].id, "receita-recorrente");
  assert.deepEqual(withNode.nodes[0].position, { x: 12, y: 34 });

  const renamed = updateNodeInModel(withNode, "receita-recorrente", {
    label: "Receita"
  });
  assert.equal(renamed.nodes[0].label, "Receita");

  const removed = removeNodeFromModel(renamed, "receita-recorrente");
  assert.equal(removed.nodes.length, 0);
});

test("adds, updates and removes edges in a model", () => {
  let model = createEmptyModel();
  model = addNodeToModel(model, { id: "a", label: "A" });
  model = addNodeToModel(model, { id: "b", label: "B" });
  model = addEdgeToModel(model, {
    source: "a",
    target: "b",
    sourceSign: "+",
    targetSign: "-"
  });
  assert.equal(model.edges[0].id, "a-b");
  assert.equal(model.edges[0].targetSign, "−");

  model = updateEdgeInModel(model, "a-b", {
    description: "A reduz B.",
    targetSign: "+"
  });
  assert.equal(model.edges[0].description, "A reduz B.");
  assert.equal(model.edges[0].type, "reinforcing");

  model = removeEdgeFromModel(model, "a-b");
  assert.equal(model.edges.length, 0);
});

test("model editing helpers preserve validity checks for bad edges", () => {
  const model = addNodeToModel(createEmptyModel(), { id: "a", label: "A" });
  assert.throws(() => addEdgeToModel(model, {
    source: "a",
    target: "missing",
    sourceSign: "+",
    targetSign: "+"
  }), CLDValidationError);
  assert.throws(() => addEdgeToModel(model, {
    source: "a",
    target: "a",
    sourceSign: "?",
    targetSign: "+"
  }), CLDValidationError);
});

test("removing structural elements prunes dependent loops without embedding presentation data", () => {
  let model = normalizeModel({
    id: "prune",
    nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
    edges: [
      { id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+" },
      { id: "ba", source: "b", target: "a", sourceSign: "+", targetSign: "+" }
    ],
    loops: [{ id: "r1", edgeIds: ["ab", "ba"] }],
  });
  model = removeEdgeFromModel(model, "ab");
  assert.equal(model.loops.length, 0);
  assert.equal("story" in model, false);
});

test("classifies density and resolves a profile", () => {
  const model = {
    id: "medium",
    nodes: Array.from({ length: 12 }, (_, index) => ({ id: String(index), label: String(index) })),
    edges: Array.from({ length: 18 }, (_, index) => ({
      id: `e${index}`, source: String(index % 12), target: String((index + 1) % 12),
      sourceSign: "+", targetSign: "+"
    }))
  };
  assert.equal(analyzeDensity(model).name, "medium");
  assert.equal(resolveDensityProfile(model).minimumSignSize, 6.5);
});

test("keeps endpoint normals aligned to one chord side", () => {
  const points = Array.from({ length: 51 }, (_, index) =>
    bezierPoint({ x: 0, y: 0 }, { x: 200, y: 0 }, 80, index / 50)
  );
  const table = arcLengthTable(points);
  const reference = chordNormal(table, 1);
  const source = pointAtArcDistance(table, 12);
  const target = pointAtArcDistance(table, table.at(-1).length - 20);
  const sourceNormal = alignedNormal(source.tangent, reference);
  const targetNormal = alignedNormal(target.tangent, reference);
  assert.ok(sourceNormal.x * reference.x + sourceNormal.y * reference.y >= 0);
  assert.ok(targetNormal.x * reference.x + targetNormal.y * reference.y >= 0);
});

test("preserves edge descriptions and persisted node positions", () => {
  const normalized = normalizeModel({
    ...validModel,
    nodes: [
      { id: "a", label: "A", position: { x: 10, y: 20 }, locked: true },
      { id: "b", label: "B", position: { x: 30, y: 40 } }
    ],
    edges: [{ ...validModel.edges[0], description: "A reduz B." }]
  });
  assert.deepEqual(normalized.nodes[0].position, { x: 10, y: 20 });
  assert.equal(normalized.nodes[0].locked, true);
  assert.equal(normalized.edges[0].description, "A reduz B.");
});

test("normalizes curated loops and derives their type", () => {
  const model = normalizeModel({
    id: "curated",
    nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
    edges: [
      { id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+" },
      { id: "ba", source: "b", target: "a", sourceSign: "+", targetSign: "-" }
    ],
    loops: [{
      id: "b1",
      title: "Correção",
      description: "O aumento retorna como pressão corretiva.",
      edgeIds: ["ab", "ba"]
    }]
  });
  assert.equal(model.loops[0].type, "balancing");
  assert.equal(classifyLoop(model.edges), "balancing");
});

test("editing edge polarity recalculates dependent loop type", () => {
  const model = normalizeModel({
    id: "polarity-edit",
    nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
    edges: [
      { id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+" },
      { id: "ba", source: "b", target: "a", sourceSign: "+", targetSign: "+" }
    ],
    loops: [{ id: "r1", edgeIds: ["ab", "ba"], type: "reinforcing" }]
  });
  const updated = updateEdgeInModel(model, "ab", { targetSign: "−" });
  assert.equal(updated.edges.find(edge => edge.id === "ab").type, "balancing");
  assert.equal(updated.loops[0].type, "balancing");
});

test("rejects loop edges that do not form an ordered directed cycle", () => {
  const result = validateModel({
    id: "broken-loop",
    nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }],
    edges: [
      { id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+" },
      { id: "ca", source: "c", target: "a", sourceSign: "+", targetSign: "+" }
    ],
    loops: [{ id: "r1", edgeIds: ["ab", "ca"] }]
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /ordered directed cycle/);
});

test("discovers and deduplicates simple loops", () => {
  const model = normalizeModel({
    id: "discovery",
    nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }],
    edges: [
      { id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+" },
      { id: "bc", source: "b", target: "c", sourceSign: "+", targetSign: "+" },
      { id: "ca", source: "c", target: "a", sourceSign: "+", targetSign: "+" }
    ]
  });
  const loops = discoverLoops(model);
  assert.equal(loops.length, 1);
  assert.equal(loops[0].label, "R1");
  assert.deepEqual(new Set(loops[0].edgeIds), new Set(["ab", "bc", "ca"]));
});

test("caches discovered loops without sharing mutable result arrays", () => {
  const model = normalizeModel({
    id: "discovery-cache",
    nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }],
    edges: [
      { id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+" },
      { id: "bc", source: "b", target: "c", sourceSign: "+", targetSign: "+" },
      { id: "ca", source: "c", target: "a", sourceSign: "+", targetSign: "+" }
    ]
  });
  const first = discoverLoops(model);
  first[0].edgeIds.reverse();
  const second = discoverLoops(model);
  assert.deepEqual(second[0].edgeIds, ["ab", "bc", "ca"]);
});

test("invalidates discovered loop type when an edge sign changes", () => {
  const model = normalizeModel({
    id: "discovery-sign-cache",
    nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }],
    edges: [
      { id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+" },
      { id: "bc", source: "b", target: "c", sourceSign: "+", targetSign: "+" },
      { id: "ca", source: "c", target: "a", sourceSign: "+", targetSign: "+" }
    ]
  });
  assert.equal(discoverLoops(model)[0].type, "reinforcing");
  model.edges[0].sourceSign = "-";
  assert.equal(discoverLoops(model)[0].type, "reinforcing");
});

test("classifies relation feedback from the exact sign pair", () => {
  const positive = normalizeModel({ id: "positive", nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }], edges: [
    { id: "pp", source: "a", target: "b", sourceSign: "+", targetSign: "+" },
    { id: "np", source: "a", target: "b", sourceSign: "−", targetSign: "+" }
  ] });
  const negative = normalizeModel({ id: "negative", nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }], edges: [
    { id: "nn", source: "a", target: "b", sourceSign: "−", targetSign: "−" },
    { id: "pn", source: "a", target: "b", sourceSign: "+", targetSign: "−" }
  ] });
  assert.deepEqual(positive.edges.map(edge => edge.type), ["reinforcing", "reinforcing"]);
  assert.deepEqual(negative.edges.map(edge => edge.type), ["balancing", "balancing"]);
});

test("demo examples provide descriptions for every relation", () => {
  for (const model of examples) {
    assert.ok(model.edges.every(edge => edge.description?.length > 20), model.id);
  }
});

test("demo examples include canonical presentations", () => {
  for (const model of examples) {
    const beats = model.presentation?.chapters?.flatMap(chapter =>
      (chapter.scenes || []).flatMap(scene => scene.beats || [])) || [];
    assert.ok(beats.length >= 4, model.id);
  }
});

test("demo examples are valid CLD models", () => {
  for (const model of examples) {
    const result = validateModel(model);
    assert.deepEqual(result.errors, [], model.id);
  }
});

test("illustrated demo nodes reference every bundled public asset", () => {
  const assetIds = new Set(exampleAssets.map(asset => asset.id));
  const mediaNodes = examples[0].nodes.filter(node => node.media);
  assert.equal(mediaNodes.length, 11);
  assert.ok(mediaNodes.every(node => assetIds.has(node.media.assetId)));
  assert.ok(exampleAssets.every(asset => asset.mime_type === "image/webp" && asset.alt_text));
});

test("extracts and reapplies a saved editorial layout", () => {
  const model = {
    id: "layout",
    nodes: [
      { id: "a", label: "A", position: { x: 12, y: 34 }, locked: true },
      { id: "b", label: "B", position: { x: 56, y: 78 }, locked: false }
    ],
    edges: [],
    loops: []
  };
  const layout = extractLayout(model);
  assert.equal(layout.version, 2);
  assert.ok(Number.isFinite(Date.parse(layout.savedAt)));
  const restored = applySavedLayout({
    ...model,
    nodes: model.nodes.map(({ position: _position, locked: _locked, ...node }) => node)
  }, layout);
  assert.deepEqual(restored.nodes[0].position, { x: 12, y: 34 });
  assert.equal(restored.nodes[0].locked, true);
  assert.deepEqual(restored.nodes[1].position, { x: 56, y: 78 });
});

test("preserves layout provenance when saving and restoring geometry", () => {
  const model = {
    id: "layout-provenance",
    layoutState: "authored",
    nodes: [{ id: "a", label: "A", position: { x: 12, y: 34 } }],
    edges: [],
    loops: []
  };
  const layout = extractLayout(model);
  assert.equal(layout.layoutState, "authored");
  const restored = applySavedLayout({ id: model.id, nodes: [{ id: "a", label: "A" }], edges: [], loops: [] }, layout);
  assert.equal(restored.layoutState, "authored");
  assert.deepEqual(restored.nodes[0].position, { x: 12, y: 34 });
});

test("ignores saved layouts belonging to another model", () => {
  const model = { id: "one", nodes: [{ id: "a", label: "A" }], edges: [], loops: [] };
  const restored = applySavedLayout(model, {
    version: 1,
    modelId: "two",
    nodes: { a: { position: { x: 1, y: 2 }, locked: true } }
  });
  assert.equal(restored.nodes[0].position, undefined);
});

test("restores legacy v1 layout snapshots after adding local recovery metadata", () => {
  const restored = applySavedLayout({
    id: "legacy",
    nodes: [{ id: "a", label: "A" }],
    edges: [],
    loops: []
  }, {
    version: 1,
    modelId: "legacy",
    layoutState: "authored",
    nodes: { a: { position: { x: 7, y: 9 }, locked: false } },
    edges: {}
  });
  assert.equal(restored.layoutState, "authored");
  assert.deepEqual(restored.nodes[0].position, { x: 7, y: 9 });
});

test("validates and preserves locked edge routes", () => {
  const model = normalizeModel({
    ...validModel,
    edges: [{
      ...validModel.edges[0],
      route: { controlPointDistance: -128.5, locked: true }
    }]
  });
  assert.deepEqual(model.edges[0].route, {
    controlPointDistance: -128.5,
    locked: true
  });
});

test("saved editorial layouts include manual routes", () => {
  const model = {
    id: "routes",
    nodes: [{ id: "a", label: "A", position: { x: 1, y: 2 } }],
    edges: [{
      id: "edge",
      source: "a",
      target: "a",
      sourceSign: "+",
      targetSign: "+",
      route: { controlPointDistance: 144, locked: true }
    }],
    loops: []
  };
  const layout = extractLayout(model);
  assert.deepEqual(layout.edges.edge.route, {
    controlPointDistance: 144,
    locked: true
  });
});

test("saved layouts preserve routing provenance and layout seed", () => {
  const model = {
    id: "provenance",
    layoutMeta: { algorithmVersion: "routing-v4", seed: "provenance" },
    nodes: [{ id: "a", label: "A", position: { x: 1, y: 2 } }],
    edges: [{
      id: "edge",
      source: "a",
      target: "a",
      sourceSign: "+",
      targetSign: "+",
      route: {
        controlPointDistance: 24,
        locked: false,
        algorithmVersion: "routing-v4",
        side: -1,
        reason: "loop-outward"
      }
    }],
    loops: []
  };
  const layout = extractLayout(model);
  const restored = applySavedLayout(model, layout);
  assert.deepEqual(restored.layoutMeta, model.layoutMeta);
  assert.deepEqual(restored.edges[0].route, model.edges[0].route);
});

test("creates a self-contained standalone HTML document", () => {
  const html = createStandaloneHtml({
    model: {
      id: "standalone",
      title: "Standalone",
      nodes: [],
      edges: [],
      loops: [],
      story: { title: "Story", steps: [] }
    },
    runtime: "window.runtimeLoaded=true;",
    styles: "body{background:white}"
  });
  assert.match(html, /window\.__LOOPVIEWER_DATA__/);
  assert.match(html, /window\.runtimeLoaded=true/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.doesNotMatch(html, /<link[^>]+stylesheet/);
  assert.match(html, /data-loopviewer-design-system="matcha@1\.0\.0"/);
  assert.match(html, /meta name="loopviewer-design-system-hash" content="[a-f0-9]{64}"/);
  assert.match(html, /data-loopviewer-design-system-hash="[a-f0-9]{64}"/);
  assert.match(html, /--lv-foundation-color-moss600: #6F9A5B;/);
  assert.doesNotMatch(html, /react-dom|createRoot/);
});

test("creates standalone HTML with project and loop entries", () => {
  const html = createStandaloneHtml({
    project: { title: "Projeto Exportado" },
    loops: [{
      id: "loop-a",
      title: "Loop A",
      summary: "Resumo",
      description_md: "## Leitura",
      model: {
        id: "loop-a",
        title: "Loop A",
        nodes: [],
        edges: [],
        loops: [],
        story: { title: "Story", steps: [] }
      },
      view: {
        title: "Boardroom Ink",
        settings: { "style-pack": "boardroom-ink", "style-pack-version": 1 },
        rules: []
      }
    }],
    activeLoopId: "loop-a",
    presentation: { schemaVersion: 2, id: "story-a", chapters: [] },
    assets: [{ id: "cover", data_url: "data:image/png;base64,YQ==" }],
    embed: { sidebar: false, presentationOnly: true },
    runtime: "window.runtimeLoaded=true;",
    styles: "body{background:white}"
  });
  assert.match(html, /"version":3/);
  assert.match(html, /"format":"loopviewer-presentation"/);
  assert.match(html, /"integrity"/);
  assert.match(html, /Projeto Exportado/);
  assert.match(html, /description_md/);
  assert.match(html, /loop-a/);
  assert.match(html, /style-pack/);
  assert.match(html, /story-a/);
  assert.match(html, /standalone-no-sidebar/);
  assert.match(html, /standalone-presentation-only/);
  assert.match(html, /"presentationOnly":true/);
  assert.match(html, /data:image\/png;base64,YQ==/);
});

test("standalone export includes assets referenced by node media", () => {
  const html = createStandaloneHtml({
    model: {
      id: "image-map",
      title: "Image map",
      nodes: [{ id: "a", label: "Fila", media: { assetId: "asset-fila", altText: "Fila" } }],
      edges: [],
      loops: []
    },
    assets: [{ id: "asset-fila", filename: "fila.png", mime_type: "image/png", data_url: "data:image/png;base64,AA==" }],
    runtime: "",
    styles: ""
  });
  assert.match(html, /asset-fila/);
  assert.match(html, /data:image\/png;base64,AA==/);
});
