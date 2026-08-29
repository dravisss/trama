/**
 * Pure selectors for the Story Studio editing surface.
 *
 * The presentation model remains the source of truth. These helpers only
 * derive UI state so the canvas, timeline and inspector can consume the same
 * selection without owning separate copies of it.
 */

export function resolvePresentationTarget(presentation, sceneId = null, beatId = null) {
  const chapters = presentation?.chapters || [];
  for (const chapter of chapters) {
    const scene = chapter.scenes?.find(item => item.id === sceneId);
    if (!scene) continue;
    const beat = beatId ? scene.beats?.find(item => item.id === beatId) || null : null;
    return { chapter, scene, beat };
  }
  return { chapter: null, scene: null, beat: null };
}

export function normalizePresentationSelection(presentation, selection = {}) {
  const target = resolvePresentationTarget(presentation, selection.sceneId, selection.beatId);
  if (target.scene) {
    return {
      sceneId: target.scene.id,
      beatId: target.beat?.id || target.scene.beats?.[0]?.id || null
    };
  }
  const scenes = presentation?.chapters?.flatMap(chapter => chapter.scenes || []) || [];
  const firstScene = scenes.find(scene => scene.beats?.length) || scenes[0] || null;
  return {
    sceneId: firstScene?.id || null,
    beatId: firstScene?.beats?.[0]?.id || null
  };
}

export function timelineIndexForBeat(timeline, beatId) {
  const index = (timeline || []).findIndex(frame => frame.beatId === beatId);
  return index >= 0 ? index : timeline?.length ? 0 : -1;
}

export function presentationSceneIds(presentation) {
  return new Set((presentation?.chapters || []).flatMap(chapter => (chapter.scenes || []).map(scene => scene.id)));
}

export function storyBeatTitle(beat, scene = null, focusLabel = () => "") {
  const authored = String(beat?.title || "").trim();
  if (authored) return authored;
  const focus = beat?.focus;
  if (focus && ["edge", "node", "loop"].includes(focus.kind)) return focusLabel(focus) || "Beat sem título";
  return scene?.title || "Beat sem título";
}
