import test from "node:test";
import assert from "node:assert/strict";
import { createApiViewRepository } from "../src/adapters/api/viewRepository.js";
import { createDeleteView } from "../src/application/view/deleteView.js";

const view = {
  id: "view-1",
  map_id: "map-1",
  title: "Systems Atlas",
  settings: { background: "#fffdf5" },
  rules: [],
  style_source: "@view \"Systems Atlas\""
};

test("DeleteView sends only the authored identity through the repository port", async () => {
  let submitted;
  const deleteView = createDeleteView({
    viewRepository: {
      delete(snapshot) {
        submitted = snapshot;
        return { deleted: true };
      }
    }
  });

  assert.deepEqual(await deleteView.execute({ view }), { deleted: true });
  assert.deepEqual(submitted, view);
});

test("DeleteView propagates a failed delete and allows retry", async () => {
  let attempts = 0;
  const deleteView = createDeleteView({
    viewRepository: {
      delete(snapshot) {
        attempts += 1;
        if (attempts === 1) return Promise.reject(new Error("delete unavailable"));
        return Promise.resolve({ deleted: snapshot.id });
      }
    }
  });

  await assert.rejects(deleteView.execute({ view }), /delete unavailable/);
  assert.deepEqual(await deleteView.execute({ view }), { deleted: "view-1" });
  assert.equal(attempts, 2);
});

test("ViewRepository deletes a view and continues after a failed request", async () => {
  const calls = [];
  let attempt = 0;
  const repository = createApiViewRepository({
    fetcher: async (url, options = {}) => {
      calls.push({ url, options });
      attempt += 1;
      if (attempt === 1) throw new Error("first delete failed");
      return { deleted: "view-1" };
    }
  });

  await assert.rejects(repository.delete(view), /first delete failed/);
  assert.deepEqual(await repository.delete(view), { deleted: "view-1" });
  assert.deepEqual(calls, [
    { url: "/api/views/view-1", options: { method: "DELETE" } },
    { url: "/api/views/view-1", options: { method: "DELETE" } }
  ]);
});
