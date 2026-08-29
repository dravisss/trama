import test from "node:test";
import assert from "node:assert/strict";
import { createEditPresentation } from "../src/application/presentation/editPresentation.js";

const current = {
  schemaVersion: 2,
  id: "growth-story",
  title: "Crescimento sob pressão",
  chapters: [{
    id: "chapter-1",
    role: "mechanism",
    scenes: [{
      id: "scene-1",
      mapRef: { mapId: "flagship-growth" },
      stage: { camera: { mode: "fit-focus", padding: 180 } },
      beats: [{
        id: "beat-1",
        focus: { kind: "path", edgeIds: ["e1", "e2"] },
        delta: { camera: { mode: "follow-path", padding: 120 } }
      }]
    }]
  }]
};

test("EditPresentation normalizes a V2 snapshot without mutating the source", () => {
  const editPresentation = createEditPresentation();
  const next = structuredClone(current);
  next.title = "Crescimento revisado";

  const result = editPresentation.execute({ current, next });

  assert.equal(result.changed, true);
  assert.equal(result.previous.title, "Crescimento sob pressão");
  assert.equal(result.presentation.title, "Crescimento revisado");
  assert.equal(result.presentation.schemaVersion, 2);
  assert.equal(result.presentation.chapters[0].scenes[0].mapRef.mapId, "flagship-growth");
  assert.deepEqual(result.presentation.chapters[0].scenes[0].stage.camera, { mode: "fit-focus", padding: 180 });
  assert.deepEqual(result.presentation.chapters[0].scenes[0].beats[0].delta.camera, { mode: "follow-path", padding: 120 });
  assert.equal(current.title, "Crescimento sob pressão");
});

test("EditPresentation returns a no-op for an equivalent normalized snapshot", () => {
  const editPresentation = createEditPresentation();
  const result = editPresentation.execute({
    current,
    next: { ...structuredClone(current), schemaVersion: 1 }
  });

  assert.equal(result.changed, false);
  assert.deepEqual(result.previous, result.presentation);
});

test("EditPresentation rejects a missing snapshot", () => {
  const editPresentation = createEditPresentation();
  assert.throws(() => editPresentation.execute(), /Presentation snapshot/i);
  assert.throws(() => editPresentation.execute({ current }), /Presentation snapshot/i);
});
