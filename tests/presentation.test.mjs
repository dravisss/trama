import test from "node:test";
import assert from "node:assert/strict";
import {
  compilePresentation,
  createPresentationState,
  analyzeTopology,
  suggestPresentation,
  repairGeneratedPresentation,
  lintPresentation,
  compilePresentationMarkdown,
  serializePresentationMarkdown,
  PresentationLanguageError,
  migrateStoryToPresentation,
  normalizePresentation,
  reducePresentationState,
  resolveFocus,
  createReferenceContext,
  validatePresentation,
  PresentationController,
  compilePresentationExport,
  measurePresentationPerformance,
  normalizeCameraMode,
  resolveCameraPlan,
  cameraTargetIds
} from "../src/index.js";
import { mergeEditorialPresentation } from "../src/presentation/editorial.js";
import { applyLintFixes } from "../src/presentation/lint.js";
import { searchPresentationStoryboard } from "../src/presentation/search.js";
import { applyMovementToBeat, causalMovementOptions, resolveCausalMovement, suggestNextCausalMovements } from "../src/presentation/causalEditing.js";
import {
  createPresentationChapter,
  duplicatePresentationBeats,
  duplicatePresentationChapter,
  duplicatePresentationScenes,
  duplicatePresentationScene,
  movePresentationBeat,
  movePresentationChapter,
  movePresentationScenesToChapter,
  movePresentationScene,
  movePresentationSceneToChapter,
  removePresentationChapter,
  removePresentationItems
} from "../src/presentation/editorOperations.js";
import { FLAGSHIP_MODEL, FLAGSHIP_PRESENTATION, FLAGSHIP_ASSETS } from "./fixtures/flagship-presentation.mjs";

const model = {
  id: "growth-map",
  title: "Growth",
  nodes: [
    { id: "demand", label: "Demand" },
    { id: "capacity", label: "Capacity" },
    { id: "limit", label: "Limit" }
  ],
  edges: [
    { id: "demand-capacity", source: "demand", target: "capacity", sourceSign: "+", targetSign: "+", description: "Demand increases capacity." },
    { id: "capacity-limit", source: "capacity", target: "limit", sourceSign: "+", targetSign: "+", description: "Capacity increases pressure." },
    { id: "limit-demand", source: "limit", target: "demand", sourceSign: "-", targetSign: "+", description: "Limit reduces demand." }
  ],
  loops: [{ id: "B1", title: "Limit", edgeIds: ["demand-capacity", "capacity-limit", "limit-demand"], type: "balancing" }]
};

test("storyboard search finds editorial copy, focus ids and chapter matches", () => {
  const presentation = normalizePresentation({
    title: "História",
    chapters: [{ id: "c1", title: "Mecanismo", role: "mechanism", scenes: [{
      id: "scene-pressure", title: "Pressão de demanda", content: { bodyMd: "A capacidade reage." },
      beats: [{ id: "beat-path", type: "traverse", focus: { kind: "path", edgeIds: ["demand-capacity"] } }]
    }] }, { id: "c2", title: "Consequência", scenes: [{ id: "scene-end", title: "Fecho", beats: [] }] }]
  });
  const byCopy = searchPresentationStoryboard(presentation, "capacidade reage");
  assert.deepEqual([...byCopy.sceneIds], ["scene-pressure"]);
  assert.equal(byCopy.matchedBeats, 1);
  const byChapter = searchPresentationStoryboard(presentation, "mecanismo");
  assert.equal(byChapter.chapterIds.has("c1"), true);
  assert.equal(byChapter.sceneIds.has("scene-pressure"), true);
  assert.equal(byChapter.sceneIds.has("scene-end"), false);
  const accentInsensitive = searchPresentationStoryboard(presentation, "pressao");
  assert.equal(accentInsensitive.matchedScenes, 1);
});

test("normalizes V2 presentation hierarchy and defaults", () => {
  const presentation = normalizePresentation({
    id: "story",
    title: "Story",
    chapters: [{ scenes: [{ type: "map", title: "Mechanism", beats: [{ focus: { edgeId: "demand-capacity" } }] }] }]
  });
  assert.equal(presentation.schemaVersion, 2);
  assert.equal(presentation.chapters[0].role, "custom");
  assert.equal(presentation.chapters[0].scenes[0].type, "stage");
  assert.equal(presentation.chapters[0].scenes[0].beats[0].focus.kind, "edge");
  assert.deepEqual(validatePresentation(presentation), []);
});

test("resolves camera intent without collapsing semantic focus", () => {
  assert.equal(normalizeCameraMode("fit-focus"), "fit-focus");

  const implicitFocusPlan = resolveCameraPlan({ focus: { kind: "edge", edgeId: "demand-capacity" } }, model);
  assert.equal(implicitFocusPlan.mode, "fit-focus");
  assert.equal(implicitFocusPlan.targetKind, "edge");
  assert.equal(resolveCameraPlan({}, model).mode, "fit-map");

  const edgeFrame = compilePresentation({
    id: "camera-edge",
    title: "Camera edge",
    chapters: [{ id: "c", title: "C", scenes: [{
      id: "s", title: "S", mapRef: { mapId: model.id },
      stage: { camera: { mode: "fit-focus" } },
      beats: [{ id: "b", title: "Edge", focus: { kind: "edge", edgeId: "demand-capacity" } }]
    }] }]
  }, { model }).timeline[0];
  const edgePlan = resolveCameraPlan(edgeFrame, model);
  assert.equal(edgePlan.mode, "fit-focus");
  assert.equal(edgePlan.targetKind, "edge");
  assert.deepEqual(cameraTargetIds(edgePlan), { nodeIds: [], edgeIds: ["demand-capacity"] });

  const mapFrame = compilePresentation({
    id: "camera-map",
    title: "Camera map",
    chapters: [{ id: "c", title: "C", scenes: [{
      id: "s", title: "S", mapRef: { mapId: model.id },
      stage: { camera: { mode: "fit-map" } },
      beats: [{ id: "b", title: "Edge", focus: { kind: "edge", edgeId: "demand-capacity" } }]
    }] }]
  }, { model }).timeline[0];
  const mapPlan = resolveCameraPlan(mapFrame, model);
  assert.equal(mapPlan.isMap, true);
  assert.deepEqual(cameraTargetIds(mapPlan), { nodeIds: [], edgeIds: [] });

  const loopFrame = compilePresentation({
    id: "camera-loop",
    title: "Camera loop",
    chapters: [{ id: "c", title: "C", scenes: [{
      id: "s", title: "S", mapRef: { mapId: model.id },
      stage: { camera: { mode: "fit-focus" } },
      beats: [{ id: "b", title: "Loop", focus: { kind: "loop", loopId: "B1" } }]
    }] }]
  }, { model }).timeline[0];
  const loopPlan = resolveCameraPlan(loopFrame, model);
  assert.equal(loopPlan.targetKind, "loop");
  assert.deepEqual(loopPlan.edgeIds, ["demand-capacity", "capacity-limit", "limit-demand"]);

  const nodeFrame = compilePresentation({
    id: "camera-node",
    title: "Camera node",
    chapters: [{ id: "c", title: "C", scenes: [{
      id: "s", title: "S", mapRef: { mapId: model.id },
      stage: { camera: { mode: "fit-focus" } },
      beats: [{ id: "b", title: "Node", focus: { kind: "node", nodeId: "capacity" } }]
    }] }]
  }, { model }).timeline[0];
  assert.equal(resolveCameraPlan(nodeFrame, model).targetKind, "node-neighborhood");

  assert.equal(resolveCameraPlan({ stage: { camera: { mode: "fit-set" } }, focus: { kind: "edge", edgeId: "demand-capacity" } }, model).targetKind, "set");
  assert.equal(resolveCameraPlan({ stage: { camera: { mode: "follow-path" } }, focus: { kind: "edge", edgeId: "demand-capacity" } }, model).targetKind, "path");
});

test("camera delta keeps the scene mode when only zoom or pan changes", () => {
  const compiled = compilePresentation({
    id: "camera-delta",
    title: "Camera delta",
    chapters: [{ id: "c", title: "C", scenes: [{
      id: "s", title: "S", mapRef: { mapId: model.id },
      stage: { camera: { mode: "fit-focus", padding: 90 } },
      beats: [{ id: "b", title: "B", focus: { kind: "edge", edgeId: "demand-capacity" }, delta: { camera: { zoom: 1.4, pan: { x: 10, y: 20 } } } }]
    }] }]
  }, { model });
  assert.equal(compiled.timeline[0].stage.camera.mode, "fit-focus");
  assert.equal(compiled.timeline[0].stage.camera.zoom, 1.4);
  assert.deepEqual(compiled.timeline[0].stage.camera.pan, { x: 10, y: 20 });
});

test("resolves ordered path focus and rejects disconnected paths", () => {
  const valid = resolveFocus({ kind: "path", edgeIds: ["demand-capacity", "capacity-limit"] }, { model });
  assert.deepEqual(valid.errors, []);
  assert.deepEqual(valid.edgeIds, ["demand-capacity", "capacity-limit"]);

  const invalid = resolveFocus({ kind: "path", edgeIds: ["demand-capacity", "limit-demand"] }, { model });
  assert.match(invalid.errors.join("\n"), /not continuous/);
});

test("compiles scene base plus beat deltas without flattening the scene", () => {
  const compiled = compilePresentation({
    id: "story",
    title: "Story",
    chapters: [{
      id: "mechanism",
      title: "Mechanism",
      scenes: [{
        id: "scene-r1",
        type: "stage",
        mapRef: { mapId: model.id },
        content: { title: "The mechanism", bodyMd: "Keep this context." },
        stage: { camera: { mode: "fixed", zoom: 1.2 }, visibility: { ghost: ["limit"] } },
        beats: [
          { id: "first", type: "traverse", focus: { kind: "edge", edgeId: "demand-capacity" }, delta: { reveal: { edgeIds: ["demand-capacity"] } } },
          { id: "close", type: "traverse", focus: { kind: "loop", loopId: "B1" }, delta: { camera: { zoom: 1.4 } } }
        ]
      }]
    }]
  }, { model });
  assert.equal(compiled.valid, true);
  assert.equal(compiled.timeline.length, 2);
  assert.equal(compiled.timeline[0].scene.id, "scene-r1");
  assert.equal(compiled.timeline[0].scene.content.bodyMd, "Keep this context.");
  assert.equal(compiled.timeline[0].stage.camera.zoom, 1.2);
  assert.equal(compiled.timeline[1].stage.camera.zoom, 1.4);
  assert.deepEqual(compiled.timeline[1].focus.loopIds, ["B1"]);
});

test("migration preserves legacy scene properties and makes loop expansion explicit beats", () => {
  const presentation = migrateStoryToPresentation({
    title: "Legacy story",
    autoplay: true,
    default_duration_ms: 4200,
    steps: [{
      id: "legacy-loop",
      type: "map",
      title: "The limit",
      body: "The loop closes.",
      focus: { loopId: "B1" },
      camera: { zoom: 1.3, pan: { x: 20, y: 30 } },
      reveal: { edgeIds: ["demand-capacity"] },
      duration_ms: 7000,
      transition: "slide"
    }]
  }, model);
  const scene = presentation.chapters[0].scenes[0];
  assert.equal(scene.type, "stage");
  assert.equal(scene.content.bodyMd, "The loop closes.");
  assert.equal(scene.stage.camera.zoom, 1.3);
  assert.equal(scene.transition.type, "slide");
  assert.equal(scene.timing.durationMs, 7000);
  assert.equal(scene.beats[0].narrationMd, "Demand increases capacity.");
  assert.equal(scene.beats.length, 3);
  assert.equal(scene.beats[0].focus.edgeId, "demand-capacity");
  assert.equal(presentation.settings.autoplay, true);
});

test("migration treats a loop as one scene containing its beats", () => {
  const presentation = migrateStoryToPresentation({
    steps: [
      { id: "loop-intro", title: "Limit", body: "O loop começa.", focus: { loopId: "B1" } },
      { id: "loop-repeat", title: "Limit", body: "O mesmo loop continua.", focus: { loopId: "B1" } }
    ]
  }, model);
  const scenes = presentation.chapters[0].scenes;
  assert.equal(scenes.length, 1);
  assert.equal(scenes[0].causalFrame.primaryLoopId, "B1");
  assert.equal(scenes[0].beats.length, 3);
  assert.deepEqual(scenes[0].beats.map(beat => beat.focus.edgeId), ["demand-capacity", "capacity-limit", "limit-demand"]);
});

test("generated drafts repair adjacent one-beat loop scenes into one loop scene", () => {
  const draft = normalizePresentation({
    id: "old-draft",
    director: { generated: true },
    chapters: [{ id: "mechanism", role: "mechanism", scenes: [
      { id: "s-1", title: "Demand", causalFrame: { primaryLoopId: "B1" }, beats: [{ id: "b-1", focus: { kind: "edge", edgeId: "demand-capacity" } }] },
      { id: "s-2", title: "Capacity", causalFrame: { primaryLoopId: "B1" }, beats: [{ id: "b-2", focus: { kind: "edge", edgeId: "capacity-limit" } }] },
      { id: "s-3", title: "Limit", causalFrame: { primaryLoopId: "B1" }, beats: [{ id: "b-3", focus: { kind: "edge", edgeId: "limit-demand" } }] }
    ] }]
  });
  const repaired = repairGeneratedPresentation(draft, model);
  assert.equal(repaired.chapters[0].scenes.length, 1);
  assert.deepEqual(repaired.chapters[0].scenes[0].beats.map(beat => beat.id), ["b-1", "b-2", "b-3"]);
  assert.equal(repaired.director.repaired, true);
});

test("reducer handles guided, explore/resume and completion states", () => {
  const compiled = compilePresentation({
    id: "story",
    chapters: [{ scenes: [{ id: "scene", beats: [{ id: "one" }, { id: "two" }] }] }]
  }, { model });
  let state = createPresentationState(compiled);
  assert.equal(state.status, "ready");
  state = reducePresentationState(state, { type: "START" });
  assert.equal(state.status, "playing");
  state = reducePresentationState(state, { type: "NEXT" });
  assert.equal(state.index, 1);
  state = reducePresentationState(state, { type: "EXPLORE" });
  assert.equal(state.status, "exploring");
  state = reducePresentationState(state, { type: "RESUME_STORY" });
  assert.equal(state.index, 1);
  state = reducePresentationState(state, { type: "NEXT" });
  assert.equal(state.status, "complete");
});

test("PresentationController emits shared beat and completion events", () => {
  const controller = new PresentationController({
    presentation: { id: "story", chapters: [{ scenes: [{ id: "scene", beats: [{ id: "one" }, { id: "two" }] }] }] },
    context: { model }
  });
  const beats = [];
  let complete = 0;
  controller.addEventListener("beatchange", event => beats.push(event.detail.frame.beatId));
  controller.addEventListener("complete", () => { complete += 1; });
  controller.start();
  controller.next();
  controller.next();
  assert.deepEqual(beats, ["one", "two"]);
  assert.equal(complete, 1);
});

test("PresentationController toggles continuous playback across manual beats", () => {
  const controller = new PresentationController({
    presentation: {
      id: "story",
      settings: { autoplay: false },
      chapters: [{ scenes: [{ id: "scene", beats: [{ id: "one" }, { id: "two" }] }] }]
    },
    context: { model }
  });
  const playback = [];
  controller.addEventListener("playbackchange", event => playback.push(event.detail.playing));
  controller.start();
  controller.setContinuousPlay(true);
  assert.equal(controller.continuousPlay, true);
  assert.equal(controller.state.status, "playing");
  controller.setContinuousPlay(false);
  assert.equal(controller.state.status, "paused");
  controller.setContinuousPlay(true);
  assert.equal(controller.state.status, "playing");
  assert.deepEqual(playback, [true, false, true]);
  controller.stop();
});

test("continuous playback advances even when beat settings are manual", async () => {
  const controller = new PresentationController({
    presentation: {
      id: "story",
      settings: { autoplay: false },
      chapters: [{ scenes: [{ id: "scene", beats: [
        { id: "one", timing: { durationMs: 15, advance: "manual" } },
        { id: "two", timing: { durationMs: 15, advance: "manual" } }
      ] }] }]
    },
    context: { model }
  });
  controller.start();
  controller.setContinuousPlay(true);
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.equal(controller.state.index, 1);
  controller.stop();
});

test("Story Director orders connected loops and authors explicit handoffs", () => {
  const extended = {
    ...model,
    loops: [
      model.loops[0],
      { id: "R1", title: "Growth", edgeIds: ["demand-capacity", "capacity-limit", "limit-demand"], nodeIds: ["demand", "capacity", "limit"], type: "reinforcing" }
    ]
  };
  const topology = analyzeTopology(extended, { loopIds: ["B1", "R1"], primaryLoopId: "B1" });
  assert.deepEqual(topology.order.map(loop => loop.id), ["B1", "R1"]);
  assert.equal(topology.handoffs.length, 1);
  const presentation = suggestPresentation(extended, { loopIds: ["B1", "R1"], primaryLoopId: "B1", includeHandoffScenes: true });
  assert.equal(presentation.chapters.length, 3);
  assert.ok(presentation.chapters[1].scenes.some(scene => scene.beats.some(beat => beat.type === "handoff")));
  assert.equal(lintPresentation(presentation, { model: extended }).errors.length, 0);
});

test("causal movement editing exposes connected destinations and predicts loop continuation", () => {
  const causalModel = {
    nodes: [
      { id: "a", label: "Demanda" },
      { id: "b", label: "Promessas" },
      { id: "c", label: "Prioridades" },
      { id: "x", label: "Desconectado" }
    ],
    edges: [
      { id: "ab", source: "a", target: "b" },
      { id: "bc", source: "b", target: "c" },
      { id: "bx", source: "b", target: "x" }
    ]
  };
  const options = causalMovementOptions(causalModel, { sourceNodeId: "b", loopId: "R1", loopEdgeIds: ["bc"] });
  assert.deepEqual(options.map(option => option.targetNodeId), ["c", "x"]);
  assert.equal(options[0].inLoop, true);
  assert.equal(resolveCausalMovement(causalModel, "a", "b").edgeId, "ab");
  assert.deepEqual(suggestNextCausalMovements(causalModel, { lastEdgeId: "ab", loopId: "R1", loopEdgeIds: ["bc"] }).map(option => option.edgeId), ["bc", "bx"]);
  const beat = applyMovementToBeat({ id: "beat", title: "Movimento", narrationMd: "" }, resolveCausalMovement(causalModel, "a", "b"));
  assert.deepEqual(beat.movement, { kind: "relation", edgeId: "ab", sourceNodeId: "a", targetNodeId: "b" });
  assert.deepEqual(beat.focus, { kind: "edge", edgeId: "ab" });
  assert.equal(beat.type, "traverse");
});

test("default Director draft keeps one scene per loop and relations inside that scene", () => {
  const draft = suggestPresentation(model, { loopIds: model.loops.map(loop => loop.id), primaryLoopId: model.loops[0].id });
  const loopScenes = draft.chapters.flatMap(chapter => chapter.scenes).filter(scene => scene.causalFrame?.primaryLoopId);
  assert.equal(loopScenes.length, model.loops.length);
  assert.equal(draft.chapters.flatMap(chapter => chapter.scenes).some(scene => scene.title === "A ponte entre os loops"), false);
  for (const loop of model.loops) {
    const scene = loopScenes.find(item => item.causalFrame.primaryLoopId === loop.id);
    assert.equal(scene.beats.length, loop.edgeIds.length);
    assert.ok(scene.beats.every(beat => beat.focus?.kind === "edge" && beat.movement?.edgeId));
  }
});

test("Story Lint blocks missing media alt text and explains locations", () => {
  const presentation = normalizePresentation({
    id: "media-story",
    title: "Media",
    chapters: [{ id: "c1", role: "setup", scenes: [{
      id: "media-scene", type: "media", title: "Imagem", content: { assetId: "asset-1" }, beats: []
    }] }]
  });
  const result = lintPresentation(presentation, { model, assets: [{ id: "asset-1" }] });
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].location.sceneId, "media-scene");
  assert.match(result.errors[0].message, /texto alternativo/);
});

test("comparison choreography keeps baseline, intervention and consequence as separate beats", () => {
  const presentation = normalizePresentation({
    id: "comparison-story",
    title: "Comparison",
    chapters: [{ id: "c1", role: "intervention", scenes: [{
      id: "comparison", type: "comparison", title: "Compare",
      beats: [
        { id: "baseline", type: "focus", focus: { kind: "loop", loopId: "B1" } },
        { id: "intervene", type: "intervention", focus: { kind: "node", nodeId: "demand" }, intervention: { kind: "qualitative", target: { nodeId: "demand" } } },
        { id: "consequence", type: "consequence", focus: { kind: "loop", loopId: "B1" } }
      ]
    }] }]
  });
  const result = lintPresentation(presentation, { model });
  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.compiled.timeline.map(frame => frame.beat.type), ["focus", "intervention", "consequence"]);
});

test("presentation markdown round-trips V2 chapters, scenes, beats and multiline copy", () => {
  const input = {
    schemaVersion: 2,
    id: "growth-story",
    title: "Growth story",
    summary: "A causal narrative",
    intent: "explain-and-persuade",
    audience: { type: "executive", knowledge: "introductory", expectedOutcome: "Act" },
    settings: { autoplay: false, allowExplore: true },
    chapters: [{
      id: "mechanism", title: "Mechanism", role: "mechanism", scenes: [{
        id: "scene-r1", type: "stage", mapRef: { mapId: model.id, viewId: "exec" },
        content: { title: "Build", bodyMd: "Line one\nLine two", speakerNotesMd: "Pause here." },
        stage: { camera: { mode: "fixed", zoom: 1.2, pan: { x: 10, y: 20 } }, visibility: { focused: ["demand"] } },
        transition: { type: "dissolve", durationMs: 320 }, timing: { durationMs: 4200, advance: "manual" },
        beats: [{ id: "beat", type: "traverse", title: "Traverse", focus: { kind: "path", edgeIds: ["demand-capacity", "capacity-limit"] },
          narrationMd: "Follow the path.", delta: { reveal: { edgeIds: ["demand-capacity"] } }, timing: { durationMs: 4000, advance: "manual" } }]
      }]
    }]
  };
  const source = serializePresentationMarkdown(input);
  const restored = compilePresentationMarkdown(source);
  assert.equal(restored.title, input.title);
  assert.equal(restored.chapters[0].scenes[0].content.bodyMd, "Line one\nLine two");
  assert.deepEqual(restored.chapters[0].scenes[0].beats[0].focus, input.chapters[0].scenes[0].beats[0].focus);
  assert.equal(restored.chapters[0].scenes[0].stage.camera.zoom, 1.2);
  assert.throws(() => compilePresentationMarkdown("# Broken\n#### Beat x\nfocus: nope"), error => error instanceof PresentationLanguageError);
});

test("editorial Markdown accepts human-friendly scenes and beats without technical metadata", () => {
  const source = `# QA · Capacidade e Confiança · apresentação

Loop novo de 16 variáveis para inspeção e teste de estresse visual.

## Cena: Loop 1

### Promessas comerciais → Prioridades conflitantes

Mais demanda estimula novas promessas comerciais.

### Capacidade de atendimento → Fila de solicitações

As filas aumentam quando a capacidade não acompanha a demanda.

## Próxima Cena: Loop 2

### Conclusão

O sistema precisa recuperar capacidade de resposta.`;
  const parsed = compilePresentationMarkdown(source);
  assert.equal(parsed.title, "QA · Capacidade e Confiança · apresentação");
  assert.match(parsed.summary, /Loop novo de 16 variáveis/);
  assert.deepEqual(parsed.chapters[0].scenes.map(scene => scene.title), ["Loop 1", "Loop 2"]);
  assert.equal(parsed.chapters[0].scenes[0].beats[0].title, "Promessas comerciais → Prioridades conflitantes");
  assert.match(parsed.chapters[0].scenes[1].beats[0].narrationMd, /recuperar capacidade/);
  assert.match(serializePresentationMarkdown(parsed, { mode: "editorial" }), /## Cena: Loop 1/);
  assert.doesNotMatch(serializePresentationMarkdown(parsed, { mode: "editorial" }), /schemaVersion|timing:|focus:/);
});

test("editorial edits preserve visual direction for matching scenes and beats", () => {
  const base = normalizePresentation({
    id: "story",
    title: "Story",
    chapters: [{ id: "c1", title: "Apresentação", scenes: [{
      id: "s1", title: "Loop 1", type: "stage", mapRef: { mapId: model.id },
      beats: [{ id: "b1", title: "Promessas", focus: { kind: "edge", edgeId: "e1" }, timing: { durationMs: 9000 } }]
    }] }]
  });
  const edited = compilePresentationMarkdown(`# Story\n\n## Cena: Loop 1\n\n### Promessas\n\nTexto revisado.`);
  const merged = mergeEditorialPresentation(base, edited);
  const beat = merged.chapters[0].scenes[0].beats[0];
  assert.equal(beat.id, "b1");
  assert.equal(beat.narrationMd, "Texto revisado.");
  assert.deepEqual(beat.focus, { kind: "edge", edgeId: "e1" });
  assert.equal(beat.timing.durationMs, 9000);
  assert.equal(merged.chapters[0].scenes[0].mapRef.mapId, model.id);
});

test("editorial Markdown preserves causal focus on scenes and beats", () => {
  const source = `# Causal story

## Cena: Expansion
focus: node a

### Lucratividade aumenta a expansão
focus: edge e1

Texto causal.

## Cena: Ciclo
focus: loop R1

### O ciclo se fecha
focus: loop R1

Texto do ciclo.`;
  const parsed = compilePresentationMarkdown(source);
  assert.deepEqual(parsed.chapters[0].scenes[0].beats[0].focus, { kind: "edge", edgeId: "e1" });
  assert.deepEqual(parsed.chapters[0].scenes[1].beats[0].focus, { kind: "loop", loopId: "R1" });
  assert.match(serializePresentationMarkdown(parsed, { mode: "editorial" }), /focus: edge e1/);
  const compiled = compilePresentation(parsed, {
    model: {
      id: "map",
      nodes: [{ id: "a", label: "A" }],
      edges: [{ id: "e1", source: "a", target: "a", sourceSign: "+", targetSign: "+" }],
      loops: [{ id: "R1", label: "R1", edgeIds: ["e1"], type: "reinforcing" }]
    }
  });
  assert.equal(compiled.valid, true);
  assert.deepEqual(compiled.timeline[0].focus.edgeIds, ["e1"]);
  assert.deepEqual(compiled.timeline[1].focus.loopIds, ["R1"]);
});

test("regions and semantic queries compile into explicit standalone ids", () => {
  const context = {
    model: {
      ...model,
      nodes: model.nodes.map((node, index) => ({ ...node, tags: index === 0 ? ["risk"] : ["capacity"] })),
      edges: model.edges.map(edge => ({ ...edge, fields: { kind: "causal" } }))
    },
    regions: [{ id: "risk-region", nodeIds: ["demand"], edgeIds: ["demand-capacity"] }]
  };
  const referenceContext = createReferenceContext(context);
  assert.deepEqual(resolveFocus({ kind: "region", regionId: "risk-region" }, referenceContext).nodeIds, ["demand"]);
  assert.deepEqual(resolveFocus({ kind: "query", selector: "node[tag=risk]" }, referenceContext).nodeIds, ["demand"]);
  assert.deepEqual(resolveFocus({ kind: "query", selector: "edge[kind=causal]" }, referenceContext).edgeIds, ["demand-capacity", "capacity-limit", "limit-demand"]);
  assert.match(resolveFocus({ kind: "query", selector: "node[tag=missing]" }, referenceContext).errors[0], /matched no nodes/);
});

test("presentation export gate emits V3 timeline, referenced assets and integrity", () => {
  const presentation = normalizePresentation({ id: "export-story", title: "Export", chapters: [{ id: "c", role: "setup", scenes: [{ id: "s", type: "media", content: { assetId: "cover", altText: "Cover" }, stage: { flow: { mode: "ordered", direction: "causal" } }, beats: [{ id: "b", type: "focus", focus: { kind: "node", nodeId: "demand" }, delta: { flow: { mode: "ordered", direction: "reverse" } } }] }] }] });
  const result = compilePresentationExport({ model, presentation, embed: { sidebar: false, presentationOnly: true }, assets: [{ id: "cover", data_url: "data:text/plain,ok" }, { id: "unused", data_url: "data:text/plain,no" }] });
  assert.equal(result.payload.version, 3);
  assert.equal(result.payload.assets.map(asset => asset.id).join(), "cover");
  assert.equal(result.payload.integrity.algorithm, "fnv1a32");
  assert.equal(result.payload.embed.sidebar, false);
  assert.equal(result.payload.embed.presentationOnly, true);
  assert.ok(result.compiled.timeline.length);
  assert.equal(result.compiled.timeline[0].stage.flow.direction, "reverse");
  assert.throws(() => compilePresentationExport({ model, presentation, assets: [] }), /missing asset/);
});

test("lint returns scores and applies declared accessibility fixes immutably", () => {
  const presentation = normalizePresentation({ id: "media-story", title: "Media", chapters: [{ id: "c", role: "setup", scenes: [{ id: "media", type: "media", content: { assetId: "cover" }, beats: [] }] }] });
  const lint = lintPresentation(presentation, { model, assets: [{ id: "cover" }] });
  assert.equal(lint.safeFixes.length, 1);
  const fixed = applyLintFixes(presentation, lint.safeFixes);
  assert.equal(fixed.chapters[0].scenes[0].content.altText, "Cena 1");
  assert.equal(presentation.chapters[0].scenes[0].content.altText, "");
  assert.ok(lint.scores.overall < 100);
});

test("flagship fixture tells a complex multi-loop story without blocking lint", () => {
  const scenes = FLAGSHIP_PRESENTATION.chapters.flatMap(chapter => chapter.scenes);
  const beats = scenes.flatMap(scene => scene.beats);
  assert.equal(FLAGSHIP_PRESENTATION.chapters.length, 3);
  assert.ok(scenes.length >= 10);
  assert.ok(beats.length >= 25);
  assert.ok(scenes.some(scene => scene.type === "comparison"));
  assert.ok(beats.some(beat => beat.type === "handoff"));
  assert.ok(beats.some(beat => beat.intervention));
  const lint = lintPresentation(FLAGSHIP_PRESENTATION, { model: FLAGSHIP_MODEL, assets: FLAGSHIP_ASSETS });
  assert.deepEqual(lint.errors, []);
  assert.ok(lint.compiled.timeline.length >= 25);
});

test("editor and standalone compilation produce the same flagship timeline", () => {
  const context = { model: FLAGSHIP_MODEL, assets: FLAGSHIP_ASSETS };
  const editor = compilePresentation(FLAGSHIP_PRESENTATION, context);
  const standalone = compilePresentation(FLAGSHIP_PRESENTATION, context);
  const snapshot = result => result.timeline.map(frame => ({
    sceneId: frame.sceneId, beatId: frame.beatId, type: frame.beat.type,
    focus: frame.focus, durationMs: frame.durationMs,
    stage: frame.stage
  }));
  assert.deepEqual(snapshot(editor), snapshot(standalone));
});

test("flagship compilation stays within the dense-map authoring budget", () => {
  const result = measurePresentationPerformance(FLAGSHIP_PRESENTATION, { model: FLAGSHIP_MODEL, assets: FLAGSHIP_ASSETS }, { budgetMs: 120 });
  assert.equal(result.valid, true);
  assert.equal(result.withinBudget, true);
});

test("storyboard structure operations reorder immutably and move scenes across chapters", () => {
  const presentation = normalizePresentation({
    id: "structure-story",
    title: "Structure",
    chapters: [
      { id: "chapter-a", title: "A", scenes: [
        { id: "scene-a1", title: "A1", beats: [{ id: "beat-a1" }, { id: "beat-a2" }] },
        { id: "scene-a2", title: "A2", beats: [{ id: "beat-a3" }] }
      ] },
      { id: "chapter-b", title: "B", scenes: [{ id: "scene-b1", title: "B1", beats: [{ id: "beat-b1" }] }] }
    ]
  });
  const chapterMoved = movePresentationChapter(presentation, "chapter-b", -1);
  assert.deepEqual(chapterMoved.chapters.map(chapter => chapter.id), ["chapter-b", "chapter-a"]);
  assert.deepEqual(presentation.chapters.map(chapter => chapter.id), ["chapter-a", "chapter-b"]);

  const sceneMoved = movePresentationScene(presentation, "chapter-a", "scene-a2", -1);
  assert.deepEqual(sceneMoved.chapters[0].scenes.map(scene => scene.id), ["scene-a2", "scene-a1"]);
  assert.equal(presentation.chapters[0].scenes[0].id, "scene-a1");

  const crossChapter = movePresentationSceneToChapter(presentation, "scene-a1", "chapter-a", "chapter-b", 1);
  assert.deepEqual(crossChapter.chapters[0].scenes.map(scene => scene.id), ["scene-a2"]);
  assert.deepEqual(crossChapter.chapters[1].scenes.map(scene => scene.id), ["scene-b1", "scene-a1"]);
  assert.equal(crossChapter.chapters[1].scenes[1].beats[0].id, "beat-a1");
});

test("storyboard batch operations preserve order, immutability and unique ids", () => {
  const presentation = normalizePresentation({
    id: "batch-story",
    chapters: [
      { id: "chapter-a", scenes: [
        { id: "scene-a1", title: "A1", beats: [{ id: "beat-a1" }, { id: "beat-a2" }] },
        { id: "scene-a2", title: "A2", beats: [{ id: "beat-a3" }] }
      ] },
      { id: "chapter-b", scenes: [{ id: "scene-b1", title: "B1", beats: [{ id: "beat-b1" }] }] }
    ]
  });
  const moved = movePresentationScenesToChapter(presentation, ["scene-a2", "scene-b1"], "chapter-a");
  assert.deepEqual(moved.chapters[0].scenes.map(scene => scene.id), ["scene-a1", "scene-a2", "scene-b1"]);
  assert.deepEqual(moved.chapters[1].scenes, []);
  assert.deepEqual(presentation.chapters[1].scenes.map(scene => scene.id), ["scene-b1"]);

  const duplicatedScenes = duplicatePresentationScenes(presentation, ["scene-a1", "scene-b1"], "-batch");
  const sceneIds = duplicatedScenes.chapters.flatMap(chapter => chapter.scenes.map(scene => scene.id));
  assert.equal(new Set(sceneIds).size, sceneIds.length);
  assert.deepEqual(duplicatedScenes.chapters[0].scenes.map(scene => scene.id), ["scene-a1", "scene-a1-batch", "scene-a2"]);

  const duplicatedBeats = duplicatePresentationBeats(presentation, { "scene-a1": ["beat-a2"] }, "-batch");
  assert.deepEqual(duplicatedBeats.chapters[0].scenes[0].beats.map(beat => beat.id), ["beat-a1", "beat-a2", "beat-a2-batch",]);
  const removed = removePresentationItems(duplicatedBeats, {
    sceneIds: ["scene-b1"],
    beatsByScene: { "scene-a1": ["beat-a1"] }
  });
  assert.equal(removed.chapters[1].scenes.length, 0);
  assert.deepEqual(removed.chapters[0].scenes[0].beats.map(beat => beat.id), ["beat-a2", "beat-a2-batch"]);
});

test("storyboard duplication gives every cloned chapter, scene and beat a unique id", () => {
  const presentation = normalizePresentation({
    id: "duplicate-story",
    chapters: [
      { id: "chapter-a", scenes: [{ id: "scene-a", beats: [{ id: "beat-a" }] }] },
      { id: "chapter-b", scenes: [{ id: "scene-b", beats: [{ id: "beat-b" }] }] }
    ]
  });
  const duplicatedChapter = duplicatePresentationChapter(presentation, "chapter-a", "-copy");
  const clone = duplicatedChapter.chapters[1];
  assert.equal(clone.id, "chapter-a-copy");
  assert.equal(clone.scenes[0].id, "scene-a-copy");
  assert.equal(clone.scenes[0].beats[0].id, "beat-a-copy-1");
  const ids = duplicatedChapter.chapters.flatMap(chapter => [chapter.id, ...chapter.scenes.flatMap(scene => [scene.id, ...scene.beats.map(beat => beat.id)])]);
  assert.equal(new Set(ids).size, ids.length);

  const duplicatedScene = duplicatePresentationScene(presentation, "chapter-a", "scene-a", "-copy");
  assert.equal(duplicatedScene.chapters[0].scenes[1].id, "scene-a-copy");
  assert.equal(duplicatedScene.chapters[0].scenes[1].beats[0].id, "beat-a-copy-1");
});

test("storyboard chapter creation and removal preserve a usable empty story", () => {
  const base = normalizePresentation({ id: "chapter-story", chapters: [{ id: "chapter-a", title: "A", scenes: [] }] });
  const created = createPresentationChapter(base, { id: "chapter-a", title: "  Novo  ", role: "tension" });
  assert.deepEqual(created.chapters.map(chapter => chapter.id), ["chapter-a", "chapter-a-2"]);
  assert.equal(created.chapters[1].title, "Novo");
  assert.equal(created.chapters[1].role, "tension");
  const removed = removePresentationChapter(created, "chapter-a");
  assert.deepEqual(removed.chapters.map(chapter => chapter.id), ["chapter-a-2"]);
  const empty = removePresentationChapter(base, "chapter-a");
  assert.equal(empty.chapters.length, 1);
  assert.deepEqual(empty.chapters[0].scenes, []);
});
