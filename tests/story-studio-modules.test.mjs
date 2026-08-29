import assert from "node:assert/strict";
import test from "node:test";
import { normalizePresentationSelection, resolvePresentationTarget, storyBeatTitle, timelineIndexForBeat } from "../src/app/storyStudio/selectors.js";
import { createStoryStudioState } from "../src/app/storyStudio/state.js";
import { createStoryStudioCommandBus } from "../src/app/storyStudio/commands.js";
import { createStoryInspectorViewModel } from "../src/app/storyStudio/inspector.js";

const presentation = {
  chapters: [{
    id: "chapter-1",
    title: "Apresentação",
    scenes: [{
      id: "scene-1",
      title: "Loop 1",
      beats: [{ id: "beat-1", title: "Movimento 1" }, { id: "beat-2", title: "Movimento 2" }]
    }]
  }]
};

test("Story Studio selection falls back to a real scene without inventing ids", () => {
  const selection = normalizePresentationSelection(presentation, { sceneId: "missing", beatId: "missing" });
  assert.deepEqual(selection, { sceneId: "scene-1", beatId: "beat-1" });
  assert.equal(resolvePresentationTarget(presentation, "scene-1", "beat-2").beat.id, "beat-2");
});

test("timeline index is derived from the compiled beat identity", () => {
  const timeline = [{ sceneId: "scene-1", beatId: "beat-1" }, { sceneId: "scene-1", beatId: "beat-2" }];
  assert.equal(timelineIndexForBeat(timeline, "beat-2"), 1);
  assert.equal(timelineIndexForBeat(timeline, "missing"), 0);
});

test("Story Studio preserves authored beat titles over generated focus labels", () => {
  const focusLabel = focus => focus.kind === "edge" ? "Variável A → Variável B" : "Foco";
  assert.equal(storyBeatTitle({ title: "Minha explicação", focus: { kind: "edge", edgeId: "e1" } }, null, focusLabel), "Minha explicação");
  assert.equal(storyBeatTitle({ focus: { kind: "edge", edgeId: "e1" } }, null, focusLabel), "Variável A → Variável B");
});

test("Story Inspector exposes inherited and overridden camera intent", () => {
  const target = resolvePresentationTarget({
    chapters: [{ id: "c", scenes: [{ id: "s", title: "Cena", stage: { camera: { mode: "fit-map" } }, beats: [
      { id: "b1", title: "Herdado", focus: { kind: "edge", edgeId: "e1" } },
      { id: "b2", title: "Focado", focus: { kind: "edge", edgeId: "e1" }, delta: { camera: { mode: "fit-focus" } } }
    ] }] }]
  }, "s", "b1");
  const shared = { findLoop: () => null, focusLabel: focus => focus?.edgeId ? "A → B" : "Sem foco", displayTitle: beat => beat.title, formatDuration: value => `${value}ms` };
  const inherited = createStoryInspectorViewModel({ target, ...shared });
  assert.equal(inherited.camera, "fit-map");
  assert.equal(inherited.cameraInherited, true);
  assert.equal(inherited.cameraTarget, "Alvo: A → B");
  const overriddenPresentation = {
    chapters: [{ id: "c", scenes: [{
      id: "s",
      title: "Cena",
      stage: { camera: { mode: "fit-map" } },
      beats: [{ id: "b2", title: "Focado", focus: { kind: "edge", edgeId: "e1" }, delta: { camera: { mode: "fit-focus" } } }]
    }] }]
  };
  const overridden = createStoryInspectorViewModel({ target: resolvePresentationTarget(overriddenPresentation, "s", "b2"), ...shared });
  assert.equal(overridden.camera, "fit-focus");
  assert.equal(overridden.cameraInherited, false);
});

test("Story Studio transient state keeps selection and editor modes together", () => {
  const state = createStoryStudioState();
  state.select("scene-1", "beat-1");
  state.setEditorMode("markdown");
  state.setInspectorMode("advanced");
  assert.deepEqual(state.getState(), {
    selection: { sceneId: "scene-1", beatId: "beat-1" },
    editorMode: "markdown",
    inspectorMode: "advanced",
    dirty: false
  });
});

test("command bus sends structural edits through one commit boundary", () => {
  let current = {
    ...presentation,
    chapters: [{ ...presentation.chapters[0], scenes: [{ ...presentation.chapters[0].scenes[0], beats: [...presentation.chapters[0].scenes[0].beats] }] }]
  };
  const commits = [];
  const selections = [];
  const bus = createStoryStudioCommandBus({
    getPresentation: () => current,
    commit: (next, message) => { commits.push(message); current = next; return true; },
    select: (...selection) => selections.push(selection)
  });
  assert.equal(bus.moveBeat("scene-1", "beat-2", 0), true);
  assert.deepEqual(current.chapters[0].scenes[0].beats.map(beat => beat.id), ["beat-2", "beat-1"]);
  assert.deepEqual(selections.at(-1), ["scene-1", "beat-2"]);
  assert.deepEqual(commits, ["Beat reordenado"]);
});
