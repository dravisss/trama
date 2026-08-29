import test from "node:test";
import assert from "node:assert/strict";
import { createExportAtlasEmbed } from "../src/application/publication/exportAtlasEmbed.js";
import {
  AtlasEmbedExportError,
  atlasEmbedBreakdown,
  collectAtlasEmbedAssetIds,
  collectFirstFrameAssetIds,
  compileAtlasEmbedPayload,
  createAtlasPosterProjection,
  createAtlasEmbedHtml,
  createAtlasPosterSvg
} from "../src/export/atlasEmbed.js";
import { createAtlasRenditionPlan } from "../src/export/atlasRenditions.js";
import { cytoscapeStyles } from "../src/rendering/cytoscape.js";
import { renderPresentationMarkdown } from "../src/presentation/markdown.js";
import { matchaTheme } from "../src/themes/matcha.js";

const model = {
  id: "atlas-map",
  title: "Mapa Atlas",
  nodes: [{ id: "n1", label: "Demanda", media: { assetId: "node-image", altText: "Demanda" } }],
  edges: [],
  loops: []
};

const presentation = {
  schemaVersion: 2,
  id: "atlas-story",
  title: "História Atlas",
  settings: { presentationStyle: "atlas-editorial" },
  chapters: [{
    id: "chapter-1",
    title: "Abertura",
    scenes: [{
      id: "scene-1",
      title: "O primeiro quadro",
      mapRef: { mapId: "atlas-map" },
      content: { bodyMd: "A leitura começa aqui.", assetId: "scene-image", altText: "Cena de abertura" },
      stage: { camera: { mode: "fit-map" } },
      beats: [{ id: "beat-1", title: "Começo", narrationMd: "A leitura começa aqui." }]
    }]
  }]
};

const assets = [
  { id: "node-image", filename: "node.png", mime_type: "image/png", data_url: "data:image/png;base64,AA==" },
  { id: "scene-image", filename: "scene.png", mime_type: "image/png", data_url: "data:image/png;base64,AQ==" },
  { id: "unused", filename: "unused.png", mime_type: "image/png", data_url: "data:image/png;base64,Ag==" }
];

test("Atlas readers share sanitised Presentation V2 Markdown rendering", () => {
  const html = renderPresentationMarkdown("Uma **ênfase** editorial.\n\n- Primeiro\n- Segundo\n\n<script>alert(1)</script>");
  assert.match(html, /<strong>ênfase<\/strong>/);
  assert.match(html, /<ul><li>Primeiro<\/li><li>Segundo<\/li><\/ul>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("atlas embed contracts a generated SVG poster and only first-frame HD assets", () => {
  assert.deepEqual(collectAtlasEmbedAssetIds({ model, presentation }), ["node-image", "scene-image"]);
  const payload = compileAtlasEmbedPayload({
    model,
    presentation,
    assets: assets.map(asset => ({ ...asset, content: Buffer.from("storage-only") }))
  });
  assert.equal(payload.format, "loopviewer-atlas-embed");
  assert.equal(payload.publication.style, "atlas-editorial");
  assert.equal(payload.publication.posterAssetId, "loopviewer-atlas-poster-svg");
  assert.deepEqual(payload.publication.criticalAssetIds, ["scene-image", "node-image"]);
  assert.deepEqual(payload.publication.lazyAssetIds, []);
  assert.equal(payload.assets.at(-1).mime_type, "image/svg+xml");
  assert.ok(payload.assets.every(asset => !Object.hasOwn(asset, "data_url")));
  assert.ok(payload.assets.every(asset => !Object.hasOwn(asset, "content")));
  assert.equal(payload.compiled.timeline.length, 1);
  assert.equal(payload.assets.length, 3);
  assert.ok(payload.integrity.digest);
});

test("atlas publication defaults legacy stories to Atlas and preserves an explicit Story Studio style", () => {
  const legacy = compileAtlasEmbedPayload({
    model,
    presentation: { ...presentation, settings: { autoplay: false } },
    assets
  });
  const explicit = compileAtlasEmbedPayload({
    model,
    presentation: { ...presentation, settings: { presentationStyle: "relation-tooltip" } },
    assets
  });
  assert.equal(legacy.publication.style, "atlas-editorial");
  assert.equal(explicit.publication.style, "relation-tooltip");
});

test("atlas embed interpolates both focus growth and contextual recession", () => {
  const styles = cytoscapeStyles(matchaTheme);
  const context = styles.find(rule => rule.selector === "node.atlas-context");
  const embedContext = styles.find(rule => rule.selector === "node.atlas-context.atlas-embed-compositor-motion");
  const embedFocus = styles.find(rule => rule.selector === "node.atlas-focus-node.atlas-embed-compositor-motion");
  const contextProperties = embedContext.style["transition-property"].split(",").map(value => value.trim());
  const focusProperties = embedFocus.style["transition-property"].split(",").map(value => value.trim());
  assert.match(context.style["transition-property"], /\bwidth\b/);
  assert.match(context.style["transition-property"], /\bheight\b/);
  assert.equal(contextProperties.includes("width"), true);
  assert.equal(contextProperties.includes("height"), true);
  assert.equal(focusProperties.includes("width"), true);
  assert.equal(focusProperties.includes("height"), true);
  assert.equal(contextProperties.includes("background-image"), false);
  assert.equal(focusProperties.includes("background-image"), false);
});

test("atlas readiness excludes later disconnected media and the poster is deterministic and sanitised", () => {
  const focusedModel = {
    id: "focus-map",
    title: "<script>não executar</script>",
    nodes: [
      { id: "n1", label: "Início", position: { x: 0, y: 0 }, media: { assetId: "one" } },
      { id: "n2", label: "Vizinho", position: { x: 180, y: 0 }, media: { assetId: "two" } },
      { id: "n3", label: "Depois", position: { x: 900, y: 0 }, media: { assetId: "later" } }
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
    loops: []
  };
  const focusedPresentation = {
    ...presentation,
    id: "focus-story",
    chapters: [{ ...presentation.chapters[0], scenes: [{
      ...presentation.chapters[0].scenes[0],
      mapRef: { mapId: "focus-map" },
      stage: { camera: { mode: "fit-focus" } },
      beats: [{ id: "focus-n1", title: "Início", narrationMd: "Foco inicial", focus: { kind: "node", nodeId: "n1" } }]
    }] }]
  };
  const focusedAssets = ["one", "two", "later", "scene-image"].map(id => ({ id, mime_type: "image/png", data_url: `data:image/png;base64,${id}` }));
  const payload = compileAtlasEmbedPayload({ model: focusedModel, presentation: focusedPresentation, assets: focusedAssets });
  assert.deepEqual(payload.publication.criticalAssetIds, ["scene-image", "one", "two"]);
  assert.deepEqual(payload.publication.lazyAssetIds, ["later"]);
  assert.deepEqual(collectFirstFrameAssetIds({ model: focusedModel, frame: payload.compiled.timeline[0], available: new Set(focusedAssets.map(asset => asset.id)) }), ["scene-image", "one", "two"]);
  const first = createAtlasPosterSvg({ model: focusedModel, frame: payload.compiled.timeline[0], title: focusedModel.title });
  assert.equal(first, createAtlasPosterSvg({ model: focusedModel, frame: payload.compiled.timeline[0], title: focusedModel.title }));
  assert.match(first, /&lt;script&gt;não executar&lt;\/script&gt;/);
  assert.match(first, /class="node focus"/);
});

test("atlas poster projects persisted curves, polarity and first-frame focus without Cytoscape", () => {
  const posterModel = {
    id: "poster-map",
    title: "Mapa com rotas",
    nodes: [
      { id: "a", label: "Origem", position: { x: 0, y: 180 } },
      { id: "b", label: "Foco", position: { x: 420, y: 180 } },
      { id: "c", label: "Contexto", position: { x: 900, y: 40 } },
      { id: "d", label: "Fora do foco", position: { x: 1280, y: 560 } }
    ],
    edges: [
      { id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+", route: { controlPointDistance: 170 } },
      { id: "bc", source: "b", target: "c", sourceSign: "+", targetSign: "-", route: { controlPointDistance: -120 } },
      { id: "cd", source: "c", target: "d", sourceSign: "+", targetSign: "+", route: { controlPointDistance: 0 } }
    ],
    loops: []
  };
  const focusFrame = {
    stage: { camera: { mode: "fit-focus", padding: 88 } },
    focus: { kind: "edge", edgeId: "ab", edgeIds: ["ab"] }
  };
  const overview = createAtlasPosterProjection({ model: posterModel, frame: { stage: { camera: { mode: "fit-map" } } } });
  const focus = createAtlasPosterProjection({ model: posterModel, frame: focusFrame });
  const svg = createAtlasPosterSvg({ model: posterModel, frame: focusFrame, title: posterModel.title });
  assert.equal(overview.edges.every(edge => !edge.focused && !edge.context), true);
  assert.equal(focus.edges.find(edge => edge.id === "ab").focused, true);
  assert.equal(focus.edges.find(edge => edge.id === "bc").context, true);
  assert.equal(focus.edges.find(edge => edge.id === "bc").negative, true);
  assert.ok(Math.abs(overview.edges.find(edge => edge.id === "cd").routeDistance) >= 18);
  assert.match(svg, /class="edge focus" d="M [^\"]+ Q /);
  assert.match(svg, /class="edge context negative"/);
  assert.match(svg, /marker-end="url\(#arrow-focus\)"/);
  // The focused poster follows the camera target rather than shrinking the
  // relationship into the distant, unrelated c→d context.
  assert.ok(focus.bounds.width < overview.bounds.width);
  assert.ok(focus.bounds.height < overview.bounds.height);
  // The extreme control point is included in the viewBox, not cropped.
  assert.ok(focus.bounds.y < 60);
});

test("atlas manifest embeds only WebP renditions selected for overview, focus and card contexts", () => {
  const renditionModel = {
    id: "rendition-map", title: "Renditions",
    nodes: [
      { id: "n1", label: "Um", position: { x: 0, y: 0 }, media: { assetId: "one" } },
      { id: "n2", label: "Dois", position: { x: 360, y: 0 }, media: { assetId: "two" } }
    ], edges: [], loops: []
  };
  const renditionPresentation = {
    ...presentation,
    id: "rendition-story",
    chapters: [{ ...presentation.chapters[0], scenes: [{
      ...presentation.chapters[0].scenes[0], mapRef: { mapId: "rendition-map" },
      stage: { camera: { mode: "fit-map" } },
      beats: [
        { id: "overview", title: "Visão geral", narrationMd: "Visão geral" },
        { id: "focus", title: "Foco", narrationMd: "Foco", focus: { kind: "node", nodeId: "n1" }, delta: { camera: { mode: "fit-focus" } } }
      ]
    }] }]
  };
  const rendition = (value, width) => ({ data_url: `data:image/webp;base64,${value}`, mime_type: "image/webp", width, height: width, hasAlpha: false });
  const renditionAssets = [
    { id: "one", filename: "one.png", mime_type: "image/png", data_url: "data:image/png;base64,master-one", renditions: { overview: rendition("overview-one", 256), focus: rendition("focus-one", 640) } },
    { id: "two", filename: "two.png", mime_type: "image/png", data_url: "data:image/png;base64,master-two", renditions: { overview: rendition("overview-two", 256) } },
    { id: "scene-image", filename: "scene.png", mime_type: "image/png", data_url: "data:image/png;base64,master-scene", renditions: { card: rendition("card-scene", 1024) } }
  ];
  const payload = compileAtlasEmbedPayload({ model: renditionModel, presentation: renditionPresentation, assets: renditionAssets });
  const plan = createAtlasRenditionPlan({ model: renditionModel, timeline: payload.compiled.timeline });
  assert.deepEqual(plan, [
    { assetId: "scene-image", renditions: [{ id: "card", maxSide: 1024, quality: 0.9 }] },
    { assetId: "one", renditions: [{ id: "overview", maxSide: 256, quality: 0.88 }, { id: "focus", maxSide: 640, quality: 0.9 }] },
    { assetId: "two", renditions: [{ id: "overview", maxSide: 256, quality: 0.88 }] }
  ]);
  assert.deepEqual(payload.publication.criticalAssetIds, ["scene-image::atlas-card", "one::atlas-overview", "two::atlas-overview"]);
  assert.equal(payload.publication.frameAssets[1].find(item => item.assetId === "one" && item.role === "node" && item.rendition === "focus").id, "one::atlas-focus");
  assert.ok(payload.assets.filter(asset => asset.kind !== "publication-poster").every(asset => asset.mime_type === "image/webp"));
  const html = createAtlasEmbedHtml({ model: renditionModel, presentation: renditionPresentation, assets: renditionAssets, runtime: "window.atlasEmbedRuntime = true;" });
  assert.match(html, /data:image\/webp/);
  assert.doesNotMatch(html, /data:image\/png;base64,master/);
  const criticalSlot = payload.assets.find(asset => asset.id === "one::atlas-overview").slot;
  const lazySlot = payload.assets.find(asset => asset.id === "one::atlas-focus").slot;
  const runtimeIndex = html.indexOf("data-loopviewer-atlas-runtime");
  assert.ok(html.indexOf(`atlas-embed-asset-${criticalSlot}`) < runtimeIndex);
  assert.ok(html.indexOf(`atlas-embed-asset-${lazySlot}`) > runtimeIndex);
});

test("atlas focus renditions do not expand through a connected component", () => {
  const connectedModel = {
    id: "connected-renditions",
    nodes: [
      { id: "a", media: { assetId: "asset-a" } },
      { id: "b", media: { assetId: "asset-b" } },
      { id: "c", media: { assetId: "asset-c" } },
      { id: "d", media: { assetId: "asset-d" } }
    ],
    edges: [
      { id: "ab", source: "a", target: "b" },
      { id: "bc", source: "b", target: "c" },
      { id: "cd", source: "c", target: "d" }
    ],
    loops: []
  };
  const nodeFrame = { focus: { kind: "node", nodeId: "a" }, stage: { camera: { mode: "fit-focus" } } };
  const edgeFrame = { focus: { kind: "edge", edgeId: "bc" }, stage: { camera: { mode: "fit-focus" } } };
  const nodeRequests = createAtlasRenditionPlan({ model: connectedModel, timeline: [nodeFrame] });
  const edgeRequests = createAtlasRenditionPlan({ model: connectedModel, timeline: [edgeFrame] });
  assert.deepEqual(nodeRequests.filter(item => item.renditions.some(rendition => rendition.id === "focus")).map(item => item.assetId), ["asset-a"]);
  assert.deepEqual(edgeRequests.filter(item => item.renditions.some(rendition => rendition.id === "focus")).map(item => item.assetId), ["asset-b", "asset-c"]);
});

test("atlas embed refuses an incomplete publication and keeps generic HTML absent", () => {
  assert.throws(() => compileAtlasEmbedPayload({ model, presentation, assets: [assets[0]] }), /Presentation export blocked/);
  assert.throws(() => compileAtlasEmbedPayload({ model, presentation: null, assets }), AtlasEmbedExportError);
  const html = createAtlasEmbedHtml({ model, presentation, assets, runtime: "window.atlas=true;", styles: ".atlas{}" });
  assert.match(html, /loopviewer-atlas-embed/);
  assert.match(html, /loopviewer-atlas-embed-payload/);
  assert.match(html, /data-loopviewer-atlas-asset/);
  assert.doesNotMatch(html, /window\.__LOOPVIEWER_ATLAS_EMBED__=/);
  assert.doesNotMatch(html, /standalone-sidebar|data-action="explore"/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
  const payload = compileAtlasEmbedPayload({ model, presentation, assets });
  const breakdown = atlasEmbedBreakdown({ html, payload });
  assert.ok(breakdown.htmlBytes > breakdown.assetBytes);
  assert.equal(breakdown.assetCount, 3);
});

test("atlas publication command requests only referenced assets before writing", async () => {
  const calls = [];
  const renditionCalls = [];
  const service = createExportAtlasEmbed({
    assetProvider: { load: async options => {
      calls.push(options);
      return { runtime: "runtime", styles: "styles", assets };
    }, createRenditions: async ({ assets: sourceAssets, plan }) => {
      renditionCalls.push(plan);
      return sourceAssets;
    } },
    publisher: { publish: async request => ({ filename: request.filename, bytes: request.html.length }) }
  });
  const result = await service.execute({ filename: "atlas.html", model, presentation });
  assert.deepEqual(calls, [{ assetIds: ["node-image", "scene-image"] }]);
  assert.deepEqual(renditionCalls, [[
    { assetId: "scene-image", renditions: [{ id: "card", maxSide: 1024, quality: 0.9 }] },
    { assetId: "node-image", renditions: [{ id: "overview", maxSide: 256, quality: 0.88 }] }
  ]]);
  assert.equal(result.filename, "atlas.html");
  assert.ok(result.bytes > 0);
});
