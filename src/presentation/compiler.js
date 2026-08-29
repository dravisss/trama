import { normalizePresentation, validatePresentation } from "./schema.js";
import { createReferenceContext, resolvePresentationReferences } from "./references.js";

export function compilePresentation(input, context = {}, options = {}) {
  const presentation = normalizePresentation(input);
  const errors = validatePresentation(presentation, { allowEmpty: options.allowEmpty !== false });
  const referenceContext = createReferenceContext(context);
  const references = resolvePresentationReferences(presentation, referenceContext);
  errors.push(...references.errors);
  if (errors.length && options.throwOnError) {
    const error = new Error(`Invalid presentation:\n${errors.map(item => `- ${item}`).join("\n")}`);
    error.name = "PresentationValidationError";
    error.errors = errors;
    throw error;
  }
  const timeline = [];
  let index = 0;
  for (const chapter of presentation.chapters) {
    const chapterScenes = references.scenes.filter(item => item.chapterId === chapter.id);
    for (const item of chapterScenes) {
      const scene = item.scene;
      const beats = scene.beats.length ? scene.beats : [{
        id: `${scene.id}-entry`,
        type: "focus",
        title: scene.title,
        narrationMd: scene.content.bodyMd,
        focus: undefined,
        delta: {},
        timing: scene.timing,
        transition: { type: "instant" }
      }];
      let stage = cloneStage(scene.stage);
      for (const beat of beats) {
        stage = mergeStage(stage, beat.delta);
        timeline.push({
          index,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          sceneId: scene.id,
          sceneType: scene.type,
          beatId: beat.id,
          scene,
          beat,
          focus: beat.resolvedFocus || (beat.focus ? resolveFocusForCompile(beat.focus, referenceContext) : null),
          stage: cloneStage(stage),
          transition: beat.transition?.type === "instant" ? scene.transition : beat.transition,
          durationMs: beat.timing?.durationMs || scene.timing.durationMs,
          isSceneEntry: beats.length === 1 && beat.id === `${scene.id}-entry`
        });
        index += 1;
      }
    }
  }
  return {
    version: 1,
    presentation,
    timeline,
    errors,
    valid: errors.length === 0
  };
}

export function mergeStage(base = {}, delta = {}) {
  const next = cloneStage(base);
  if (!delta || typeof delta !== "object") return next;
  if (delta.camera) next.camera = { ...next.camera, ...delta.camera };
  if (delta.visibility) next.visibility = mergeVisibility(next.visibility, delta.visibility);
  if (delta.emphasis) next.emphasis = delta.emphasis.map(item => ({ ...item }));
  if (delta.annotations) next.annotations = delta.annotations.map(item => ({ ...item }));
  if (delta.flow) next.flow = { ...next.flow, ...delta.flow };
  if (delta.contentLayout) next.contentLayout = delta.contentLayout;
  if (delta.themeOverride) next.themeOverride = { ...next.themeOverride, ...delta.themeOverride };
  if (delta.interactionPolicy) next.interactionPolicy = { ...next.interactionPolicy, ...delta.interactionPolicy };
  if (delta.reveal) {
    const ids = [
      ...(delta.reveal.nodeIds || []),
      ...(delta.reveal.edgeIds || []),
      ...(delta.reveal.loopIds || [])
    ];
    next.visibility.focused = [...new Set([...(next.visibility.focused || []), ...ids])];
  }
  return next;
}

function mergeVisibility(base = {}, delta = {}) {
  const next = { ...base };
  for (const level of ["hidden", "ghost", "context", "focused", "emphasized"]) {
    if (delta[level]) next[level] = [...new Set(delta[level])];
  }
  return next;
}

function cloneStage(stage = {}) {
  return {
    ...stage,
    camera: { ...(stage.camera || {}) },
    visibility: {
      hidden: [...(stage.visibility?.hidden || [])],
      ghost: [...(stage.visibility?.ghost || [])],
      context: [...(stage.visibility?.context || [])],
      focused: [...(stage.visibility?.focused || [])],
      emphasized: [...(stage.visibility?.emphasized || [])]
    },
    emphasis: (stage.emphasis || []).map(item => ({ ...item })),
    annotations: (stage.annotations || []).map(item => ({ ...item })),
    ...(stage.flow ? { flow: { ...stage.flow } } : {}),
    ...(stage.themeOverride ? { themeOverride: { ...stage.themeOverride } } : {})
  };
}

function resolveFocusForCompile(focus, context) {
  return resolvePresentationReferences({ chapters: [{ scenes: [{ id: "compile", beats: [{ id: "focus", focus }] }] }] }, context)
    .scenes[0]?.scene.beats[0]?.resolvedFocus || null;
}
