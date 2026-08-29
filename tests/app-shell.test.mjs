import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapPreviewGeometry, presentationBeatCount, workspaceViewModel } from "../src/app/appShell.js";

test("workspace view model is derived from real project and map records", () => {
  const project = { title: "Projeto Matcha", path: "/tmp/matcha.db" };
  const workspace = [{
    id: "loop-1",
    label: "Capacidade e confiança",
    views: [{ id: "view-1" }],
    model: {
      id: "capacity",
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ id: "ab", source: "a", target: "b" }],
      loops: [{ id: "R1" }]
    }
  }];
  const view = workspaceViewModel({
    project,
    workspace,
    localProjects: [
      { title: "Projeto Matcha", path: "/tmp/matcha.db" },
      { title: "Outro projeto", path: "/tmp/outro.db", metrics: { maps: 3 } }
    ]
  });

  assert.equal(view.project.title, "Projeto Matcha");
  assert.equal(view.project.metrics.maps, 1);
  assert.equal(view.project.metrics.views, 1);
  assert.equal(view.project.metrics.presentations, 0);
  assert.equal(view.otherProjects.length, 1);
  assert.equal(view.maps[0].title, "Capacidade e confiança");
  assert.equal(view.maps[0].nodes, 2);
  assert.equal(view.maps[0].loops, 1);
  assert.equal(view.maps[0].storySteps, 0);
});

test("workspace cards prefer persisted presentations", () => {
  const workspace = [{
    id: "sobrecarga-filas",
    model: { id: "sobrecarga-filas", nodes: [], edges: [], loops: [] }
  }];
  const presentations = [{
    id: "sobrecarga-filas-presentation",
    presentation: {
      chapters: [{ scenes: [{ mapRef: { mapId: "sobrecarga-filas" }, beats: [{ id: "a" }, { id: "b" }, { id: "c" }] }] }]
    }
  }];
  const view = workspaceViewModel({ workspace, presentations });

  assert.equal(view.maps[0].storySteps, 3);
  assert.equal(view.maps[0].hasPresentation, true);
  assert.equal(view.project.metrics.presentations, 1);
  assert.equal(presentationBeatCount(presentations[0].presentation), 3);
});

test("map preview geometry projects authored positions without mutating the model", () => {
  const model = {
    nodes: [
      { id: "a", position: { x: -100, y: 50 } },
      { id: "b", position: { x: 300, y: 250 } }
    ],
    edges: [{ id: "ab", source: "a", target: "b", type: "balancing" }]
  };
  const before = structuredClone(model);
  const preview = mapPreviewGeometry(model, { width: 200, height: 100, padding: 10 });

  assert.deepEqual(model, before);
  assert.deepEqual(preview.nodes, [
    { id: "a", x: 10, y: 10 },
    { id: "b", x: 190, y: 90 }
  ]);
  assert.equal(preview.edges[0].type, "balancing");
  assert.equal(preview.edges[0].source.id, "a");
  assert.equal(preview.edges[0].target.id, "b");
});

test("map preview falls back to a deterministic ring for unpositioned models", () => {
  const model = {
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [{ id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+" }]
  };
  assert.deepEqual(mapPreviewGeometry(model), mapPreviewGeometry(model));
});

test("editor shell keeps navigation, canvas and properties in separate regions", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const sidebarReact = readFileSync(new URL("../src/react/workspaceSidebar.jsx", import.meta.url), "utf8");
  const inspectorReact = readFileSync(new URL("../src/react/editorInspector.jsx", import.meta.url), "utf8");
  const railReact = readFileSync(new URL("../src/react/editorRail.jsx", import.meta.url), "utf8");
  const canvasReact = readFileSync(new URL("../src/react/canvasSurface.jsx", import.meta.url), "utf8");
  const sidebar = html.match(/<aside class="workspace-sidebar"[\s\S]*?<\/aside>/)?.[0] || "";
  const dock = html.match(/<aside class="editor-dock[\s\S]*?<\/aside>/)?.[0] || "";

  assert.match(sidebar, /id="react-workspace-sidebar-root"/);
  assert.match(sidebarReact, /export function WorkspaceSidebar\(\) \{ return null; \}/);
  assert.match(html, /id="react-canvas-surface-root"/);
  assert.match(canvasReact, /id="loop-select"/);
  assert.doesNotMatch(sidebar, /data-inspector-tab="story"/);
  assert.match(dock, /id="react-editor-dock-panels-root"/);
  assert.match(inspectorReact, /id="relation-view"/);
  assert.match(railReact, /data-dock-panel={panel}/);
  assert.match(readFileSync(new URL("../src/react/editorDockPanels.jsx", import.meta.url), "utf8"), /data-dock-content="map"/);
  assert.match(readFileSync(new URL("../src/react/editorDockPanels.jsx", import.meta.url), "utf8"), /editor-map-loops/);
  assert.doesNotMatch(dock, /data-dock-panel="story"/);
});
