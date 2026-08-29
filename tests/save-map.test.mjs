import test from "node:test";
import assert from "node:assert/strict";
import { createApiMapRepository } from "../src/adapters/api/mapRepository.js";
import { createSaveMap } from "../src/application/workspace/saveMap.js";

const map = {
  id: "map-1",
  label: "Mapa editorial",
  description_md: "Resumo do mapa.",
  persisted: true,
  model: {
    id: "map-1",
    title: "Mapa editorial",
    nodes: [],
    edges: [],
    loops: []
  }
};

test("SaveMap sends a persistence snapshot through the MapRepository port", async () => {
  const snapshots = [];
  const saveMap = createSaveMap({
    mapRepository: {
      update(snapshot) {
        snapshots.push(snapshot);
        return { map: snapshot };
      }
    }
  });

  const result = await saveMap.execute({ map });

  assert.deepEqual(result, { map: snapshots[0] });
  assert.deepEqual(snapshots, [{
    id: "map-1",
    title: "Mapa editorial",
    description_md: "Resumo do mapa.",
    model: map.model
  }]);
  assert.equal("persisted" in snapshots[0], false);
  assert.equal("label" in snapshots[0], false);
});

test("SaveMap propagates repository failures and can be retried", async () => {
  const failure = new Error("temporarily unavailable");
  let attempts = 0;
  const saveMap = createSaveMap({
    mapRepository: {
      update(snapshot) {
        attempts += 1;
        if (attempts === 1) return Promise.reject(failure);
        return Promise.resolve({ map: snapshot });
      }
    }
  });

  await assert.rejects(saveMap.execute({ map }), failure);
  assert.deepEqual(await saveMap.execute({ map }), {
    map: {
      id: map.id,
      title: map.label,
      description_md: map.description_md,
      model: map.model
    }
  });
  assert.equal(attempts, 2);
});

test("MapRepository serializes map updates and continues after a failed request", async () => {
  const calls = [];
  let releaseFirst;
  const firstGate = new Promise(resolve => { releaseFirst = resolve; });
  let attempt = 0;
  const repository = createApiMapRepository({
    fetcher: async (url, options) => {
      attempt += 1;
      calls.push({ url, options });
      if (attempt === 1) {
        await firstGate;
        throw new Error("first request failed");
      }
      return { map: { id: "map-1", title: options.body.title } };
    }
  });
  const first = repository.update({ ...map, title: "Primeira" });
  const second = repository.update({ ...map, title: "Segunda" });

  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls.length, 1);
  releaseFirst();
  await assert.rejects(first, /first request failed/);
  assert.deepEqual(await second, { map: { id: "map-1", title: "Segunda" } });
  assert.equal(calls.length, 2);
});

test("SaveMap rejects incomplete snapshots before reaching the port", () => {
  const saveMap = createSaveMap({ mapRepository: { update() {} } });
  assert.throws(() => saveMap.execute(), /map snapshot/);
  assert.throws(() => saveMap.execute({ map: { model: {} } }), /map id/);
  assert.throws(() => saveMap.execute({ map: { id: "map-1" } }), /map model/);
});
