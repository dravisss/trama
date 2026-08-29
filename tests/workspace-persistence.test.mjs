import test from "node:test";
import assert from "node:assert/strict";
import { createWorkspacePersistence } from "../src/app/workspacePersistence.js";

test("workspace persistence loads project data and assets through one boundary", async () => {
  const calls = [];
  const persistence = createWorkspacePersistence({
    fetcher: async (url) => {
      calls.push(url);
      if (url === "/api/project") return { project: { title: "Demo" }, loops: [] };
      if (url === "/api/assets") return { assets: [{ id: "asset-1" }] };
      if (url === "/api/projects") return { projects: [{ path: "data/demo.db" }] };
      throw new Error(`unexpected ${url}`);
    }
  });

  assert.deepEqual(await persistence.loadProject(), {
    project: { title: "Demo" },
    loops: [],
    assets: [{ id: "asset-1" }]
  });
  assert.deepEqual(await persistence.loadLocalProjects(), [{ path: "data/demo.db" }]);
  assert.deepEqual(calls, ["/api/project", "/api/assets", "/api/projects"]);
});

test("workspace persistence serializes loop saves and preserves the authored payload", async () => {
  const calls = [];
  let releaseFirst;
  const firstGate = new Promise(resolve => { releaseFirst = resolve; });
  let saveCount = 0;
  const persistence = createWorkspacePersistence({
    isAvailable: () => true,
    snapshotEntry: entry => ({ ...entry, model: { ...entry.model } }),
    fetcher: async (url, options = {}) => {
      if (url.startsWith("/api/loops/")) {
        saveCount += 1;
        calls.push({ url, options });
        if (saveCount === 1) await firstGate;
        return { loop: { id: "loop-1", title: options.body.title } };
      }
      throw new Error(`unexpected ${url}`);
    }
  });
  const first = persistence.saveLoop({
    entry: { id: "loop-1", persisted: true, label: "Primeira", model: { title: "Primeira" } }
  });
  const second = persistence.saveLoop({
    entry: { id: "loop-1", persisted: true, label: "Segunda", model: { title: "Segunda" } }
  });

  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.body.title, "Primeira");
  releaseFirst();
  await Promise.all([first, second]);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.body.title, "Segunda");
});

test("workspace persistence saves map-first records through the map endpoint", async () => {
  const calls = [];
  const persistence = createWorkspacePersistence({
    isAvailable: () => true,
    snapshotEntry: entry => ({ ...entry, model: { ...entry.model } }),
    fetcher: async (url, options = {}) => {
      calls.push({ url, options });
      return { map: { id: "map-1", title: options.body.title } };
    }
  });

  const result = await persistence.saveMap({
    entry: { id: "map-1", persisted: true, label: "Mapa editorial", description_md: "Resumo", model: { title: "Mapa editorial" } }
  });
  assert.equal(result.map.id, "map-1");
  assert.equal(calls[0].url, "/api/maps/map-1");
  assert.equal(calls[0].options.method, "PUT");
  assert.equal(calls[0].options.body.description_md, "Resumo");
});

test("draft loop creation stays local while persisted creation normalizes the API record", async () => {
  const calls = [];
  const persistence = createWorkspacePersistence({
    isAvailable: () => false,
    fetcher: async (...args) => { calls.push(args); return { loop: { id: "server" } }; },
    toEntry: loop => ({ id: loop.id, persisted: true })
  });
  const draft = { id: "draft:1", label: "Rascunho", model: { nodes: [] } };
  assert.equal(await persistence.createLoop(draft), draft);
  assert.equal(calls.length, 0);

  const online = createWorkspacePersistence({
    isAvailable: () => true,
    fetcher: async (...args) => { calls.push(args); return { loop: { id: "server" } }; },
    toEntry: loop => ({ id: loop.id, persisted: true })
  });
  assert.deepEqual(await online.createLoop(draft), { id: "server", persisted: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].body.title, "Rascunho");
});
