import { normalizeCamera } from "./camera.js";

export const PRESENTATION_SCHEMA_VERSION = 2;

export const SCENE_TYPES = new Set([
  "title", "stage", "narrative", "media", "comparison", "choice"
]);

export const BEAT_TYPES = new Set([
  "focus", "reveal", "traverse", "handoff", "compare", "intervention", "consequence", "question", "custom"
]);

export const CHAPTER_ROLES = new Set([
  "setup", "mechanism", "tension", "intervention", "consequence", "synthesis", "custom"
]);

export const TRANSITIONS = new Set(["cut", "dissolve", "slide", "morph-stage"]);

export function normalizePresentation(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const chapters = Array.isArray(source.chapters)
    ? source.chapters
    : legacyScenesToChapters(source.scenes);
  return {
    ...source,
    schemaVersion: PRESENTATION_SCHEMA_VERSION,
    id: source.id || "presentation",
    title: typeof source.title === "string" && source.title.trim() ? source.title : "Nova apresentação",
    summary: typeof source.summary === "string" ? source.summary : "",
    intent: typeof source.intent === "string" ? source.intent : "explain",
    audience: normalizeAudience(source.audience),
    themeId: source.themeId || "matcha-editorial",
    settings: normalizeSettings(source.settings),
    chapters: chapters.map((chapter, chapterIndex) => normalizeChapter(chapter, chapterIndex))
  };
}

export function normalizeChapter(input = {}, index = 0) {
  const chapter = input && typeof input === "object" ? input : {};
  const role = CHAPTER_ROLES.has(chapter.role) ? chapter.role : "custom";
  return {
    ...chapter,
    id: chapter.id || `chapter-${index + 1}`,
    title: nonEmpty(chapter.title, `Capítulo ${index + 1}`),
    role,
    summary: typeof chapter.summary === "string" ? chapter.summary : "",
    scenes: Array.isArray(chapter.scenes)
      ? chapter.scenes.map((scene, sceneIndex) => normalizeScene(scene, sceneIndex))
      : []
  };
}

export function normalizeScene(input = {}, index = 0) {
  const scene = input && typeof input === "object" ? input : {};
  const type = normalizeSceneType(scene.type);
  return {
    ...scene,
    id: scene.id || `scene-${index + 1}`,
    type,
    title: nonEmpty(scene.title || scene.content?.title, `Cena ${index + 1}`),
    content: normalizeContent(scene.content, scene),
    mapRef: normalizeMapRef(scene.mapRef),
    causalFrame: normalizeCausalFrame(scene.causalFrame),
    stage: normalizeStage(scene.stage),
    transition: normalizeTransition(scene.transition),
    timing: normalizeTiming(scene.timing),
    beats: Array.isArray(scene.beats)
      ? scene.beats.map((beat, beatIndex) => normalizeBeat(beat, beatIndex))
      : []
  };
}

export function normalizeBeat(input = {}, index = 0) {
  const beat = input && typeof input === "object" ? input : {};
  return {
    ...beat,
    id: beat.id || `beat-${index + 1}`,
    type: BEAT_TYPES.has(beat.type) ? beat.type : "focus",
    title: nonEmpty(beat.title, `Beat ${index + 1}`),
    narrationMd: typeof beat.narrationMd === "string"
      ? beat.narrationMd
      : typeof beat.body === "string" ? beat.body : "",
    speakerNotesMd: typeof beat.speakerNotesMd === "string" ? beat.speakerNotesMd : "",
    focus: beat.focus ? normalizeFocus(beat.focus) : undefined,
    delta: normalizeDelta(beat.delta),
    timing: normalizeTiming(beat.timing),
    transition: normalizeBeatTransition(beat.transition)
  };
}

export function normalizeFocus(input = {}) {
  const focus = input && typeof input === "object" ? input : {};
  const kind = focus.kind || inferFocusKind(focus);
  if (kind === "node") return { kind, nodeId: focus.nodeId };
  if (kind === "edge") return { kind, edgeId: focus.edgeId };
  if (kind === "loop") return { kind, loopId: focus.loopId };
  if (kind === "path") return { kind, edgeIds: [...(focus.edgeIds || [])] };
  if (kind === "set") return {
    kind,
    nodeIds: [...(focus.nodeIds || [])],
    edgeIds: [...(focus.edgeIds || [])],
    loopIds: [...(focus.loopIds || [])]
  };
  if (kind === "region") return { kind, regionId: focus.regionId };
  if (kind === "query") return { kind, selector: focus.selector || "" };
  return { kind: "custom", ...focus };
}

export function normalizeStage(input = {}) {
  const stage = input && typeof input === "object" ? input : {};
  return {
    ...stage,
    camera: stage.camera && typeof stage.camera === "object" ? normalizeCamera(stage.camera) : {},
    visibility: normalizeVisibility(stage.visibility),
    emphasis: Array.isArray(stage.emphasis) ? stage.emphasis.map(item => ({ ...item })) : [],
    annotations: Array.isArray(stage.annotations) ? stage.annotations.map(item => ({ ...item })) : [],
    flow: stage.flow && typeof stage.flow === "object" ? { ...stage.flow } : undefined,
    contentLayout: stage.contentLayout || undefined,
    themeOverride: stage.themeOverride && typeof stage.themeOverride === "object"
      ? { ...stage.themeOverride }
      : undefined,
    interactionPolicy: stage.interactionPolicy && typeof stage.interactionPolicy === "object"
      ? { ...stage.interactionPolicy }
      : undefined
  };
}

export function normalizeDelta(input = {}) {
  const delta = input && typeof input === "object" ? input : {};
  return {
    ...delta,
    reveal: delta.reveal && typeof delta.reveal === "object"
      ? {
        ...delta.reveal,
        nodeIds: [...(delta.reveal.nodeIds || [])],
        edgeIds: [...(delta.reveal.edgeIds || [])],
        loopIds: [...(delta.reveal.loopIds || [])]
      }
      : undefined,
    visibility: delta.visibility ? normalizeVisibility(delta.visibility) : undefined,
    emphasis: Array.isArray(delta.emphasis) ? delta.emphasis.map(item => ({ ...item })) : undefined,
    annotations: Array.isArray(delta.annotations) ? delta.annotations.map(item => ({ ...item })) : undefined,
    camera: delta.camera && typeof delta.camera === "object" ? normalizeDeltaCamera(delta.camera) : undefined,
    flow: delta.flow && typeof delta.flow === "object" ? { ...delta.flow } : undefined
  };
}

export function validatePresentation(input, { allowEmpty = true } = {}) {
  const presentation = normalizePresentation(input);
  const errors = [];
  if (!presentation.id) errors.push("Presentation requires an id.");
  if (!presentation.title.trim()) errors.push("Presentation requires a title.");
  if (!Array.isArray(presentation.chapters)) errors.push("Presentation chapters must be an array.");
  const ids = { chapters: new Set(), scenes: new Set(), beats: new Set() };
  for (const chapter of presentation.chapters) {
    if (ids.chapters.has(chapter.id)) errors.push(`Duplicate chapter id: ${chapter.id}.`);
    ids.chapters.add(chapter.id);
    if (!chapter.title.trim()) errors.push(`Chapter ${chapter.id} requires a title.`);
    if (!Array.isArray(chapter.scenes)) errors.push(`Chapter ${chapter.id} scenes must be an array.`);
    for (const scene of chapter.scenes || []) {
      if (ids.scenes.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}.`);
      ids.scenes.add(scene.id);
      if (!SCENE_TYPES.has(scene.type)) errors.push(`Scene ${scene.id} has invalid type.`);
      if (!TRANSITIONS.has(scene.transition.type)) errors.push(`Scene ${scene.id} has invalid transition.`);
      if (!Number.isFinite(scene.timing.durationMs) || scene.timing.durationMs <= 0) {
        errors.push(`Scene ${scene.id} duration must be positive.`);
      }
      for (const beat of scene.beats || []) {
        if (ids.beats.has(beat.id)) errors.push(`Duplicate beat id: ${beat.id}.`);
        ids.beats.add(beat.id);
        if (!BEAT_TYPES.has(beat.type)) errors.push(`Beat ${beat.id} has invalid type.`);
        if (!Number.isFinite(beat.timing.durationMs) || beat.timing.durationMs <= 0) {
          errors.push(`Beat ${beat.id} duration must be positive.`);
        }
        errors.push(...validateFocusShape(beat.focus, beat.id));
      }
    }
  }
  if (!allowEmpty && !presentation.chapters.some(chapter => chapter.scenes.length)) {
    errors.push("Presentation requires at least one scene.");
  }
  return errors;
}

function validateFocusShape(focus, id) {
  if (!focus) return [];
  const errors = [];
  const values = {
    node: Boolean(focus.nodeId),
    edge: Boolean(focus.edgeId),
    loop: Boolean(focus.loopId),
    path: Array.isArray(focus.edgeIds) && focus.edgeIds.length > 0,
    set: Boolean(focus.nodeIds?.length || focus.edgeIds?.length || focus.loopIds?.length),
    region: Boolean(focus.regionId),
    query: Boolean(focus.selector)
  };
  if (!values[focus.kind]) errors.push(`Beat ${id} has an incomplete ${focus.kind} focus.`);
  if (focus.kind === "path" && new Set(focus.edgeIds).size !== focus.edgeIds.length) {
    errors.push(`Beat ${id} path cannot repeat an edge.`);
  }
  return errors;
}

function normalizeSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  return {
    ...source,
    autoplay: Boolean(source.autoplay),
    defaultBeatDurationMs: positive(source.defaultBeatDurationMs ?? source.default_duration_ms, 5000),
    allowExplore: source.allowExplore !== false,
    resumeAfterExplore: source.resumeAfterExplore !== false,
    showChapterProgress: source.showChapterProgress !== false,
    reducedMotion: source.reducedMotion || "respect-system",
    // Kept in settings so one authored Presentation V2 can choose a visual
    // player profile without affecting its semantic timeline.
    ...(typeof source.presentationStyle === "string" ? { presentationStyle: source.presentationStyle } : {})
  };
}

function normalizeAudience(audience = {}) {
  const source = audience && typeof audience === "object" ? audience : {};
  return {
    type: source.type || "general",
    knowledge: source.knowledge || "introductory",
    expectedOutcome: source.expectedOutcome || ""
  };
}

function normalizeContent(content = {}, scene = {}) {
  const source = content && typeof content === "object" ? content : {};
  return {
    ...source,
    title: nonEmpty(source.title || scene.title, ""),
    bodyMd: typeof source.bodyMd === "string" ? source.bodyMd : typeof scene.body === "string" ? scene.body : "",
    speakerNotesMd: typeof source.speakerNotesMd === "string" ? source.speakerNotesMd : "",
    caption: typeof source.caption === "string" ? source.caption : "",
    altText: typeof source.altText === "string" ? source.altText : "",
    assetId: source.assetId || scene.assetId || undefined,
    src: source.src || scene.src || undefined
  };
}

function normalizeMapRef(ref) {
  if (!ref || typeof ref !== "object") return undefined;
  return { ...ref, mapId: ref.mapId || ref.id, viewId: ref.viewId || undefined };
}

function normalizeCausalFrame(frame) {
  if (!frame || typeof frame !== "object") return undefined;
  return {
    ...frame,
    primaryLoopId: frame.primaryLoopId,
    loopRoles: Array.isArray(frame.loopRoles) ? frame.loopRoles.map(item => ({ ...item })) : []
  };
}

function normalizeVisibility(visibility = {}) {
  const source = visibility && typeof visibility === "object" ? visibility : {};
  return {
    hidden: [...(source.hidden || [])],
    ghost: [...(source.ghost || [])],
    context: [...(source.context || [])],
    focused: [...(source.focused || [])],
    emphasized: [...(source.emphasized || [])]
  };
}

function normalizeDeltaCamera(camera) {
  const normalized = normalizeCamera(camera);
  if (!Object.prototype.hasOwnProperty.call(camera, "mode")) delete normalized.mode;
  return normalized;
}

function normalizeTransition(transition = {}) {
  if (typeof transition === "string") return { type: TRANSITIONS.has(transition) ? transition : "dissolve", durationMs: 320 };
  const source = transition && typeof transition === "object" ? transition : {};
  return { type: TRANSITIONS.has(source.type) ? source.type : "dissolve", durationMs: positive(source.durationMs, 320) };
}

function normalizeBeatTransition(transition = {}) {
  if (typeof transition === "string") return { type: transition };
  return transition && typeof transition === "object" ? { ...transition } : { type: "instant" };
}

function normalizeTiming(timing = {}) {
  const source = timing && typeof timing === "object" ? timing : {};
  return {
    durationMs: positive(source.durationMs ?? source.duration_ms, 5000),
    advance: source.advance || "manual"
  };
}

function normalizeSceneType(type) {
  if (type === "map") return "stage";
  if (type === "text") return "narrative";
  if (type === "image") return "media";
  return SCENE_TYPES.has(type) ? type : "stage";
}

function inferFocusKind(focus) {
  if (focus.nodeId) return "node";
  if (focus.edgeId) return "edge";
  if (focus.loopId) return "loop";
  if (focus.edgeIds) return "path";
  if (focus.nodeIds || focus.loopIds) return "set";
  if (focus.regionId) return "region";
  if (focus.selector) return "query";
  return "custom";
}

function legacyScenesToChapters(scenes = []) {
  if (!Array.isArray(scenes)) return [];
  return [{ id: "chapter-1", title: "Apresentação", role: "custom", scenes }];
}

function nonEmpty(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
