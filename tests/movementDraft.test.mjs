import test from "node:test";
import assert from "node:assert/strict";
import { createMovementBeat, validatePath } from "../src/presentation/movementDraft.js";
import { describeMovement } from "../src/presentation/movementDescriptor.js";
import { compilePresentation } from "../src/presentation/compiler.js";
import { resolveCameraPlan } from "../src/presentation/camera.js";

const model = {
  id: "movement-test-map",
  nodes: [
    { id: "a", label: "Origem" },
    { id: "b", label: "Meio" },
    { id: "c", label: "Destino" }
  ],
  edges: [
    { id: "e1", source: "a", target: "b" },
    { id: "e2", source: "b", target: "c" },
    { id: "e3", source: "c", target: "a" }
  ],
  loops: [{ id: "r1", edgeIds: ["e1", "e2", "e3"], kind: "reinforcing" }]
};

test("movement drafts preserve the V2 camera contract for every visual form", () => {
  const relation = createMovementBeat({ model, draft: { kind: "relation", sourceNodeId: "a", targetNodeId: "b", title: "A passagem", role: "traverse" } });
  assert.equal(relation.errors.length, 0);
  assert.equal(relation.beat.focus.edgeId, "e1");
  assert.equal(relation.beat.delta.camera.mode, "follow-path");

  const map = createMovementBeat({ model, draft: { kind: "map", title: "Contexto", role: "focus" } });
  assert.equal(map.beat.focus, undefined);
  assert.equal(map.beat.delta.camera.mode, "fit-map");

  const loop = createMovementBeat({ model, draft: { kind: "loop", loopId: "r1", title: "O ciclo", role: "focus" } });
  assert.deepEqual(loop.beat.focus, { kind: "loop", loopId: "r1" });
  assert.equal(loop.beat.delta.camera.mode, "fit-focus");

  const path = createMovementBeat({ model, draft: { kind: "path", edgeIds: ["e1", "e2"], title: "O caminho", role: "traverse" } });
  assert.deepEqual(path.beat.focus, { kind: "path", edgeIds: ["e1", "e2"] });
  assert.equal(path.beat.delta.camera.mode, "follow-path");
  assert.equal(relation.beat.movement.kind, "relation");
  assert.equal(map.beat.movement.kind, "map");
});

test("movement descriptors classify explicit and legacy forms without changing the V2 runtime contract", () => {
  assert.equal(describeMovement({ movement: { kind: "loop", loopId: "r1" }, focus: { kind: "loop", loopId: "r1" } }, model).kind, "loop");
  assert.equal(describeMovement({ focus: { kind: "path", edgeIds: ["e1", "e2"] }, delta: { camera: { mode: "follow-path" } } }, model).kind, "path");
  assert.equal(describeMovement({ delta: { camera: { mode: "fit-map" } } }, model).kind, "map");
  assert.equal(describeMovement({ focus: { kind: "node", nodeId: "a" } }, model).kind, "generic");
  assert.equal(describeMovement({ movement: { kind: "relation", edgeId: "missing" }, focus: { kind: "edge", edgeId: "missing" } }, model).valid, false);
});

test("movement drafts reject disconnected or stale paths before persistence", () => {
  assert.deepEqual(validatePath(["e1", "e3"], model.edges), ["As relações do caminho precisam ser contínuas."]);
  assert.deepEqual(validatePath(["missing"], model.edges), ["A relação missing não existe neste mapa."]);
  const result = createMovementBeat({ model, draft: { kind: "path", edgeIds: ["e1", "e3"] } });
  assert.equal(result.beat, null);
  assert.match(result.errors[0], /contínuas/);
});

test("movement drafts accept loops discovered outside the curated model list", () => {
  const discoveredLoop = { id: "r-discovered", edgeIds: ["e1", "e2", "e3"], kind: "reinforcing" };
  const result = createMovementBeat({ model: { ...model, loops: [] }, loops: [discoveredLoop], draft: { kind: "loop", loopId: "r-discovered", title: "Ciclo descoberto" } });
  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.beat.focus, { kind: "loop", loopId: "r-discovered" });
});

test("movement drafts compile into a valid Presentation V2 timeline", () => {
  const drafts = [
    { kind: "relation", sourceNodeId: "a", targetNodeId: "b", title: "Relação" },
    { kind: "map", title: "Mapa" },
    { kind: "loop", loopId: "r1", title: "Loop" },
    { kind: "path", edgeIds: ["e1", "e2"], title: "Caminho" }
  ];
  for (const draft of drafts) {
    const result = createMovementBeat({ model, draft });
    assert.equal(result.errors.length, 0, draft.kind);
    const presentation = {
      id: `presentation-${draft.kind}`,
      title: "Movimentos",
      chapters: [{ id: "chapter", title: "Capítulo", scenes: [{
        id: `scene-${draft.kind}`,
        title: "Cena",
        mapRef: { mapId: model.id },
        beats: [result.beat]
      }] }]
    };
    const compiled = compilePresentation(presentation, { model });
    assert.equal(compiled.valid, true, draft.kind);
    assert.equal(compiled.timeline.length, 1, draft.kind);
    assert.equal(resolveCameraPlan(compiled.timeline[0], model).mode, result.beat.delta.camera.mode, draft.kind);
  }
});
