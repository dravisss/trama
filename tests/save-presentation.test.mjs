import test from "node:test";
import assert from "node:assert/strict";
import { apiFetch } from "../src/app/api.js";
import { createApiPresentationRepository } from "../src/adapters/api/presentationRepository.js";
import { createSavePresentation } from "../src/application/presentation/savePresentation.js";

const presentation = {
  schemaVersion: 2,
  id: "growth-story",
  title: "Crescimento sob pressão",
  source_md: "# Crescimento sob pressão\n",
  chapters: [{
    id: "chapter-1",
    role: "mechanism",
    scenes: [{
      id: "scene-1",
      mapRef: { mapId: "flagship-growth", viewId: "boardroom" },
      stage: { camera: { mode: "fit-focus", padding: 180 } },
      beats: [{
        id: "beat-1",
        focus: { kind: "edge", edgeId: "pressure-demand" },
        delta: { camera: { mode: "follow-path", padding: 120 } }
      }]
    }]
  }]
};

test("SavePresentation creates a normalized V2 snapshot through the port", async () => {
  const calls = [];
  const savePresentation = createSavePresentation({
    presentationRepository: {
      create(snapshot) {
        calls.push(snapshot);
        return { presentation: { id: "record-1", revision: 1, ...snapshot } };
      },
      update() { throw new Error("unexpected update"); }
    }
  });

  const result = await savePresentation.execute({ presentation });

  assert.equal(result.presentation.id, "record-1");
  assert.equal(calls[0].title, "Crescimento sob pressão");
  assert.equal(calls[0].presentation.schemaVersion, 2);
  assert.equal(calls[0].presentation.source_md, presentation.source_md);
  assert.deepEqual(calls[0].presentation.chapters[0].scenes[0].mapRef, presentation.chapters[0].scenes[0].mapRef);
  assert.deepEqual(calls[0].presentation.chapters[0].scenes[0].stage.camera, presentation.chapters[0].scenes[0].stage.camera);
  assert.deepEqual(calls[0].presentation.chapters[0].scenes[0].beats[0].delta.camera, presentation.chapters[0].scenes[0].beats[0].delta.camera);
});

test("SavePresentation updates with the expected revision", async () => {
  const calls = [];
  const savePresentation = createSavePresentation({
    presentationRepository: {
      update(snapshot) {
        calls.push(snapshot);
        return { presentation: { id: snapshot.id, revision: 8, presentation: snapshot.presentation } };
      },
      create() { throw new Error("unexpected create"); }
    }
  });

  await savePresentation.execute({ id: "record-1", expectedRevision: 7, presentation });

  assert.equal(calls[0].id, "record-1");
  assert.equal(calls[0].expected_revision, 7);
  assert.equal(calls[0].title, presentation.title);
  assert.equal(calls[0].presentation.chapters[0].scenes[0].mapRef.mapId, "flagship-growth");
});

test("SavePresentation propagates a failed save and allows retry", async () => {
  let attempts = 0;
  const failure = new Error("temporarily unavailable");
  const savePresentation = createSavePresentation({
    presentationRepository: {
      create(snapshot) {
        attempts += 1;
        if (attempts === 1) return Promise.reject(failure);
        return Promise.resolve({ presentation: { id: "record-1", ...snapshot } });
      },
      update() { throw new Error("unexpected update"); }
    }
  });

  await assert.rejects(savePresentation.execute({ presentation }), failure);
  await assert.doesNotReject(savePresentation.execute({ presentation }));
  assert.equal(attempts, 2);
});

test("PresentationRepository sends V2 create and update requests", async () => {
  const calls = [];
  const repository = createApiPresentationRepository({
    fetcher: async (url, options = {}) => {
      calls.push({ url, options });
      return { presentation: { id: "record-1", revision: 2, presentation } };
    }
  });

  await repository.create({ title: presentation.title, presentation });
  await repository.update({ id: "record-1", title: presentation.title, presentation, expected_revision: 1 });

  assert.equal(calls[0].url, "/api/presentations");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(calls[0].options.body, { title: presentation.title, presentation });
  assert.equal(calls[1].url, "/api/presentations/record-1");
  assert.equal(calls[1].options.method, "PUT");
  assert.deepEqual(calls[1].options.body, {
    title: presentation.title,
    presentation,
    expected_revision: 1
  });
});

test("apiFetch preserves current presentation metadata on a conflict", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: "Presentation revision conflict.",
    current: { id: "record-1", revision: 8 }
  }), { status: 409, headers: { "Content-Type": "application/json" } });

  try {
    await assert.rejects(apiFetch("/api/presentations/record-1", { method: "PUT", body: {} }), error => {
      assert.equal(error.status, 409);
      assert.deepEqual(error.current, { id: "record-1", revision: 8 });
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
