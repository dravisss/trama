import test from "node:test";
import assert from "node:assert/strict";
import { createApiViewRepository } from "../src/adapters/api/viewRepository.js";
import { createCreateView } from "../src/application/view/createView.js";
import { createSaveView } from "../src/application/view/saveView.js";

const view = {
  id: "view-1",
  map_id: "map-1",
  title: "Systems Atlas",
  settings: { background: "#fffdf5", "style-pack": "systems-atlas" },
  rules: [{ selector: { type: "variable" }, properties: { shape: "ellipse" } }],
  style_source: "@settings { style-pack: systems-atlas; }",
  created_at: "old",
  updated_at: "old"
};

test("SaveView sends an authored snapshot through the ViewRepository port", async () => {
  const snapshots = [];
  const saveView = createSaveView({
    viewRepository: {
      update(snapshot) {
        snapshots.push(snapshot);
        return { view: snapshot };
      }
    }
  });

  const result = await saveView.execute({ view });

  assert.deepEqual(result, { view: snapshots[0] });
  assert.deepEqual(snapshots, [{
    id: view.id,
    map_id: view.map_id,
    title: view.title,
    settings: view.settings,
    rules: view.rules,
    style_source: view.style_source
  }]);
  assert.equal("created_at" in snapshots[0], false);
  assert.equal("updated_at" in snapshots[0], false);
});

test("SaveView propagates repository failures and can be retried", async () => {
  const failure = new Error("temporarily unavailable");
  let attempts = 0;
  const saveView = createSaveView({
    viewRepository: {
      update(snapshot) {
        attempts += 1;
        if (attempts === 1) return Promise.reject(failure);
        return Promise.resolve({ view: snapshot });
      }
    }
  });

  await assert.rejects(saveView.execute({ view }), failure);
  assert.deepEqual(await saveView.execute({ view }), {
    view: {
      id: view.id,
      map_id: view.map_id,
      title: view.title,
      settings: view.settings,
      rules: view.rules,
      style_source: view.style_source
    }
  });
  assert.equal(attempts, 2);
});

test("ViewRepository updates the selected view and preserves its payload", async () => {
  const calls = [];
  const repository = createApiViewRepository({
    fetcher: async (url, options = {}) => {
      calls.push({ url, options });
      if (url === "/api/maps/map-1/views") return { views: [{ id: "view-1", title: "Old" }] };
      return { view: { id: "view-1", ...options.body } };
    }
  });

  const result = await repository.update(view);

  assert.equal(result.view.id, "view-1");
  assert.equal(calls[0].url, "/api/maps/map-1/views");
  assert.equal(calls[1].url, "/api/views/view-1");
  assert.equal(calls[1].options.method, "PUT");
  assert.deepEqual(calls[1].options.body, {
    map_id: "map-1",
    title: "Systems Atlas",
    settings: view.settings,
    rules: view.rules,
    style_source: view.style_source
  });
});

test("ViewRepository serializes updates per view and continues after failure", async () => {
  const calls = [];
  let releaseFirst;
  const firstGate = new Promise(resolve => { releaseFirst = resolve; });
  let attempt = 0;
  const repository = createApiViewRepository({
    fetcher: async (url, options = {}) => {
      calls.push({ url, options });
      if (url === "/api/maps/map-1/views") {
        attempt += 1;
        if (attempt === 1) {
          await firstGate;
          throw new Error("first request failed");
        }
        return { views: [{ id: "view-1" }] };
      }
      return { view: { id: "view-1", ...options.body } };
    }
  });
  const first = repository.update({ ...view, title: "Primeira" });
  const second = repository.update({ ...view, title: "Segunda" });

  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls.length, 1);
  releaseFirst();
  await assert.rejects(first, /first request failed/);
  assert.equal((await second).view.title, "Segunda");
  assert.equal(calls.length, 3);
});

test("SaveView rejects incomplete snapshots before reaching the port", () => {
  const saveView = createSaveView({ viewRepository: { update() {} } });
  assert.throws(() => saveView.execute(), /view snapshot/i);
  assert.throws(() => saveView.execute({ view: { map_id: "map-1" } }), /view id/i);
  assert.throws(() => saveView.execute({ view: { id: "view-1" } }), /map id/i);
});

test("CreateView sends a draft snapshot without requiring a client id", async () => {
  const snapshots = [];
  const createView = createCreateView({
    viewRepository: {
      create(snapshot) {
        snapshots.push(snapshot);
        return { view: { id: "view-new", ...snapshot } };
      }
    }
  });

  const result = await createView.execute({
    view: {
      map_id: "map-1",
      title: "View 3",
      settings: { background: "#fffdf5" },
      rules: [],
      style_source: "@view \"View 3\""
    }
  });

  assert.equal(result.view.id, "view-new");
  assert.equal("id" in snapshots[0], false);
  assert.equal(snapshots[0].map_id, "map-1");
});

test("ViewRepository creates a new view and serializes retries per map", async () => {
  const calls = [];
  let attempt = 0;
  const repository = createApiViewRepository({
    fetcher: async (url, options = {}) => {
      calls.push({ url, options });
      attempt += 1;
      if (attempt === 1) throw new Error("first create failed");
      return { view: { id: "view-new", ...options.body } };
    }
  });

  const first = repository.create({ ...view, id: undefined, title: "Primeira" });
  const second = repository.create({ ...view, id: undefined, title: "Segunda" });

  await assert.rejects(first, /first create failed/);
  assert.equal((await second).view.title, "Segunda");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "/api/views");
  assert.equal(calls[0].options.method, "POST");
});
