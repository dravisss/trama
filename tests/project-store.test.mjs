import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProjectStore } from "../src/platform/projectStore.js";

const model = {
  id: "growth",
  title: "Growth Loop",
  description: "A compact loop.",
  nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
  edges: [{ id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+" }],
  loops: []
};

test("project store creates, updates, duplicates and deletes loop JSON records", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const store = new ProjectStore(join(dir, "project.db"));
  try {
    const created = store.createLoop({
      title: "Growth",
      summary: "Summary",
      description_md: "## Growth\n\nMarkdown body.",
      model
    });
    assert.equal(created.title, "Growth");
    assert.equal("story" in created.model, false);

    const updated = store.updateLoop(created.id, {
      title: "Growth Edited",
      description_md: "Edited markdown.",
      model: { ...created.model, title: "Growth Edited" }
    });
    assert.equal(updated.title, "Growth Edited");
    assert.equal(updated.description_md, "Edited markdown.");

    const duplicate = store.duplicateLoop(created.id);
    assert.match(duplicate.id, /growth.*copy|growth-edited.*copy/);
    assert.equal(store.listLoops().length, 2);

    assert.equal(store.deleteLoop(created.id), true);
    assert.equal(store.listLoops().length, 1);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("seed migration persists only the Presentation V2 result", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const store = new ProjectStore(join(dir, "project.db"), {
    seedModels: [{
      ...model,
      story: {
        title: "Imported",
        steps: [{ id: "legacy-step", title: "A to B", body: "A reinforces B.", focus: { edgeId: "ab" } }]
      }
    }]
  });
  try {
    const seeded = store.getLoop("growth");
    assert.equal("story" in seeded.model, false);
    assert.equal(store.listPresentations().length, 1);
    assert.equal(store.listPresentations()[0].presentation.schemaVersion, 2);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bundled demo assets are seeded once with stable ids", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const dbPath = join(dir, "project.db");
  const seedAsset = {
    id: "demo-backlog",
    filename: "backlog.webp",
    mime_type: "image/webp",
    content: Buffer.from("demo-image"),
    width: 512,
    height: 512,
    alt_text: "Backlog ilustrado"
  };
  const first = new ProjectStore(dbPath, { seedModels: [model], seedAssets: [seedAsset] });
  try {
    assert.equal(first.listAssets().length, 1);
    assert.equal(first.getAsset("demo-backlog").alt_text, "Backlog ilustrado");
  } finally {
    first.close();
  }

  const second = new ProjectStore(dbPath, { seedModels: [model], seedAssets: [seedAsset] });
  try {
    assert.equal(second.listAssets().length, 1);
  } finally {
    second.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("project store persists loops across reopen", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const dbPath = join(dir, "project.db");
  const first = new ProjectStore(dbPath);
  try {
    first.createLoop({ title: "Persisted", model });
  } finally {
    first.close();
  }

  const second = new ProjectStore(dbPath);
  try {
    assert.equal(second.listLoops().length, 1);
    assert.equal(second.listLoops()[0].model.edges[0].id, "ab");
  } finally {
    second.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("project store lists and restores automatic loop versions", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const store = new ProjectStore(join(dir, "project.db"));
  try {
    const created = store.createLoop({ title: "Versioned", model });
    store.updateLoop(created.id, { model: { ...created.model, title: "Second" } });
    store.updateLoop(created.id, { model: { ...created.model, title: "Third" } });
    const versions = store.listLoopVersions(created.id);
    assert.equal(versions.length, 2);
    const restored = store.restoreLoopVersion(created.id, versions[1].id);
    assert.equal(restored.model.title, "Versioned");
    assert.equal(store.listLoopVersions(created.id).length, 3);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("project store persists positions, locks and routes", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const dbPath = join(dir, "project.db");
  const first = new ProjectStore(dbPath);
  try {
    const created = first.createLoop({ title: "Layout", model });
    first.updateLoop(created.id, {
      model: {
        ...created.model,
        nodes: created.model.nodes.map((node, index) => ({
          ...node,
          position: { x: 100 + index * 50, y: 200 + index * 25 },
          locked: index === 0
        })),
        edges: created.model.edges.map(edge => ({
          ...edge,
          route: { controlPointDistance: 72, locked: true }
        }))
      }
    });
  } finally {
    first.close();
  }

  const second = new ProjectStore(dbPath);
  try {
    const [loop] = second.listLoops();
    assert.deepEqual(loop.model.nodes[0].position, { x: 100, y: 200 });
    assert.equal(loop.model.nodes[0].locked, true);
    assert.deepEqual(loop.model.edges[0].route, { controlPointDistance: 72, locked: true });
  } finally {
    second.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("project store creates project metadata and first empty loop", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const store = new ProjectStore(join(dir, "project.db"), {
    project: {
      title: "Projeto de Exemplo",
      description_md: "Projeto de loops comerciais."
    }
  });
  try {
    assert.equal(store.getProject().title, "Projeto de Exemplo");
    assert.equal(store.getProject().description_md, "Projeto de loops comerciais.");

    const firstLoop = store.createInitialLoop({ title: "Novo loop" });
    assert.equal(firstLoop.title, "Novo loop");
    assert.deepEqual(firstLoop.model.nodes, []);
    assert.deepEqual(firstLoop.model.edges, []);
    assert.match(firstLoop.description_md, /Descreva aqui/);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("project store updates project metadata", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const store = new ProjectStore(join(dir, "project.db"));
  try {
    const updated = store.updateProject({
      title: "Projeto editado",
      description_md: "Descrição em markdown."
    });
    assert.equal(updated.title, "Projeto editado");
    assert.equal(updated.description_md, "Descrição em markdown.");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("project store persists maps with independent views", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const store = new ProjectStore(join(dir, "project.db"));
  try {
    const map = store.createMap({ title: "Mapa sistêmico", model });
    const firstView = store.createView({
      map_id: map.id,
      title: "Matcha",
      settings: { background: "#f7f3e7", "style-pack": "boardroom-ink", "style-pack-version": 1 },
      rules: [{ selector: "variable", properties: { shape: "ellipse" } }],
      style_source: "variable { shape: ellipse; }"
    });
    const secondView = store.createView({ map_id: map.id, title: "Executiva" });
    const secondMap = store.createMap({ title: "Outro mapa", model: { ...model, id: "other-map" } });
    const sameNamedView = store.createView({ map_id: secondMap.id, title: "Matcha" });

    assert.equal(store.listMaps().length, 2);
    assert.equal(store.listViews(map.id).length, 2);
    assert.equal(store.getView(firstView.id).settings.background, "#f7f3e7");
    assert.equal(store.getView(firstView.id).settings["style-pack"], "boardroom-ink");
    assert.equal(store.getView(firstView.id).rules[0].selector, "variable");
    assert.notEqual(sameNamedView.id, firstView.id);

    store.updateMap(map.id, { title: "Mapa editado" });
    store.updateView(secondView.id, { settings: { labelDensity: "minimal" } });
    assert.equal(store.getMap(map.id).title, "Mapa editado");
    assert.equal(store.getView(secondView.id).settings.labelDensity, "minimal");
    assert.equal(store.listMaps().length, 2);

    assert.equal(store.deleteMap(map.id), true);
    assert.equal(store.getView(firstView.id), null);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("project store promotes existing loops without duplicating their map", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const store = new ProjectStore(join(dir, "project.db"));
  try {
    const loop = store.createLoop({ title: "Legado", model });
    const map = store.promoteLoopToMap(loop.id);
    const repeated = store.promoteLoopToMap(loop.id);
    assert.equal(map.source_loop_id, loop.id);
    assert.equal(repeated.id, map.id);
    assert.equal(store.listMaps().length, 1);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("legacy loop updates keep their promoted map and views synchronized", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const store = new ProjectStore(join(dir, "project.db"));
  try {
    const loop = store.createLoop({ title: "Legacy", model });
    const map = store.promoteLoopToMap(loop.id);
    store.createView({ map_id: map.id, title: "View" });
    store.updateLoop(loop.id, { title: "Renamed", model: { ...loop.model, title: "Renamed" } });
    assert.equal(store.getMap(map.id).title, "Renamed");
    assert.equal(store.getMap(map.id).model.title, "Renamed");
    store.deleteLoop(loop.id);
    assert.equal(store.getMap(map.id), null);
    assert.equal(store.listViews(map.id).length, 0);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("project store persists presentations and binary assets", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const store = new ProjectStore(join(dir, "project.db"));
  try {
    const presentation = store.createPresentation({
      title: "Narrativa",
      scenes: [{ id: "opening", type: "title", title: "Abertura" }]
    });
    store.updatePresentation(presentation.id, {
      presentation: { scenes: [{ id: "map", type: "map", camera: { zoom: 1.2 } }] }
    });
    assert.equal(store.getPresentation(presentation.id).presentation.scenes[0].type, "map");

    const content = Buffer.from("local image bytes");
    const asset = store.createAsset({ filename: "cover.png", mime_type: "image/png", content, kind: "image", width: 512, height: 512, alt_text: "Capa" });
    assert.equal(store.listAssets()[0].size, content.length);
    assert.equal(store.listAssets()[0].kind, "image");
    assert.equal(store.listAssets()[0].width, 512);
    assert.equal(store.listAssets()[0].alt_text, "Capa");
    assert.deepEqual([...store.getAsset(asset.id).content], [...content]);
    assert.equal(store.createAsset({ filename: "same.png", mime_type: "image/png", content }).id, asset.id);
    assert.equal(store.deleteAsset(asset.id), true);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("project store versions presentations and rejects stale revisions", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-presentation-store-"));
  const store = new ProjectStore(join(dir, "project.db"));
  try {
    const created = store.createPresentation({
      title: "Narrativa",
      presentation: {
        schemaVersion: 2,
        chapters: [{ id: "chapter", scenes: [{ id: "scene", beats: [] }] }]
      }
    });
    assert.equal(created.revision, 1);
    assert.equal(created.presentation.schemaVersion, 2);
    const updated = store.updatePresentation(created.id, {
      expected_revision: created.revision,
      presentation: { schemaVersion: 2, chapters: [{ id: "chapter-2", scenes: [] }] }
    });
    assert.equal(updated.revision, 2);
    assert.equal(store.listPresentationVersions(created.id).length, 1);
    assert.throws(() => store.updatePresentation(created.id, {
      expected_revision: created.revision,
      presentation: { schemaVersion: 2, chapters: [] }
    }), error => error.name === "PresentationConflictError" && error.status === 409);
    const restored = store.restorePresentationVersion(created.id, store.listPresentationVersions(created.id)[0].id);
    assert.equal(restored.revision, 3);
    assert.equal(restored.presentation.chapters[0].id, "chapter");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("project store duplicates presentations without sharing JSON state", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-presentation-copy-"));
  const store = new ProjectStore(join(dir, "project.db"));
  try {
    const created = store.createPresentation({
      title: "Original",
      scenes: [{ id: "scene", type: "title" }]
    });
    const duplicate = store.duplicatePresentation(created.id);
    assert.notEqual(duplicate.id, created.id);
    assert.match(duplicate.title, /cópia/);
    assert.deepEqual(duplicate.presentation.scenes, created.presentation.scenes);
    store.updatePresentation(duplicate.id, { presentation: { scenes: [{ id: "changed" }] } });
    assert.equal(store.getPresentation(created.id).presentation.scenes[0].id, "scene");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("project bundles round-trip every local-first entity", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-store-"));
  const source = new ProjectStore(join(dir, "source.db"), { project: { title: "Portfolio" } });
  let bundle;
  try {
    const loop = source.createLoop({ title: "Loop", model });
    const map = source.promoteLoopToMap(loop.id);
    source.createView({ map_id: map.id, title: "Executive", settings: { background: "#fff" } });
    source.createPresentation({ title: "Deck", scenes: [{ id: "cover", type: "title" }] });
    source.createAsset({ filename: "cover.png", mime_type: "image/png", content: Buffer.from("image") });
    bundle = source.exportBundle();
  } finally {
    source.close();
  }

  const target = new ProjectStore(join(dir, "target.db"));
  try {
    target.importBundle(bundle);
    assert.equal(target.getProject().title, "Portfolio");
    assert.equal(target.listLoops().length, 1);
    assert.equal(target.listMaps().length, 1);
    assert.equal(target.listViews(target.listMaps()[0].id)[0].title, "Executive");
    assert.equal(target.listPresentations()[0].title, "Deck");
    assert.equal(Buffer.from(target.getAsset(target.listAssets()[0].id).content).toString(), "image");
  } finally {
    target.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
