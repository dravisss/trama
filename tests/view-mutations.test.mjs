import test from "node:test";
import assert from "node:assert/strict";
import { createDuplicateView } from "../src/application/view/duplicateView.js";
import { createDeriveView } from "../src/application/view/deriveView.js";

const sourceView = {
  id: "view-1",
  map_id: "map-1",
  title: "Systems Atlas",
  settings: { background: "#fffdf5", "style-pack": "systems-atlas" },
  rules: [{ selector: { type: "variable" }, properties: { shape: "ellipse" } }],
  style_source: "@view \"Systems Atlas\""
};

test("DuplicateView clones an authored snapshot without reusing its id", async () => {
  let submitted;
  const duplicateView = createDuplicateView({
    viewRepository: {
      create(snapshot) {
        submitted = snapshot;
        return { view: { id: "view-2", ...snapshot } };
      }
    }
  });

  const result = await duplicateView.execute({ view: sourceView });

  assert.equal(result.view.id, "view-2");
  assert.equal(submitted.id, undefined);
  assert.equal(submitted.map_id, "map-1");
  assert.equal(submitted.title, "Systems Atlas cópia");
  assert.deepEqual(submitted.rules, sourceView.rules);
  assert.notEqual(submitted.rules, sourceView.rules);
  assert.notEqual(submitted.rules[0], sourceView.rules[0]);
  assert.match(submitted.style_source, /Systems Atlas cópia/);
  assert.equal(sourceView.title, "Systems Atlas");
});

test("DeriveView creates an empty inheriting snapshot on the same map", async () => {
  let submitted;
  const deriveView = createDeriveView({
    viewRepository: {
      create(snapshot) {
        submitted = snapshot;
        return { view: { id: "view-derived", ...snapshot } };
      }
    }
  });

  const result = await deriveView.execute({ view: sourceView });

  assert.equal(result.view.id, "view-derived");
  assert.equal(submitted.id, undefined);
  assert.equal(submitted.map_id, "map-1");
  assert.equal(submitted.title, "Systems Atlas derivada");
  assert.deepEqual(submitted.settings, { extends: "view-1" });
  assert.deepEqual(submitted.rules, []);
  assert.match(submitted.style_source, /extends: view-1/);
});

test("view mutation commands propagate repository failures for retry", async () => {
  let attempts = 0;
  const duplicateView = createDuplicateView({
    viewRepository: {
      create(snapshot) {
        attempts += 1;
        if (attempts === 1) return Promise.reject(new Error("temporary failure"));
        return Promise.resolve({ view: { id: "view-2", ...snapshot } });
      }
    }
  });

  await assert.rejects(duplicateView.execute({ view: sourceView }), /temporary failure/);
  assert.equal((await duplicateView.execute({ view: sourceView })).view.id, "view-2");
  assert.equal(attempts, 2);
});
