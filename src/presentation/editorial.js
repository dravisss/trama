import { normalizePresentation } from "./schema.js";

/**
 * Applies an editorial Markdown edit without discarding visual direction that
 * already exists on matching scenes and beats. New editorial items receive
 * the normal defaults from the schema.
 */
export function mergeEditorialPresentation(baseInput, editorialInput) {
  const base = normalizePresentation(baseInput);
  const next = normalizePresentation(editorialInput);
  const oldScenes = base.chapters.flatMap(chapter => chapter.scenes || []);
  const sceneFor = scene => oldScenes.find(item => item.id === scene.id || item.title === scene.title);
  const chapters = next.chapters.map((chapter, chapterIndex) => {
    const oldChapter = base.chapters.find(item => item.id === chapter.id || item.title === chapter.title) || base.chapters[chapterIndex];
    return {
      ...chapter,
      id: oldChapter?.id || chapter.id,
      scenes: (chapter.scenes || []).map((scene, sceneIndex) => {
        const oldScene = sceneFor(scene) || oldChapter?.scenes?.[sceneIndex];
        if (!oldScene) return scene;
        const oldBeats = oldScene.beats || [];
        return {
          ...scene,
          id: oldScene.id,
          type: oldScene.type || scene.type,
          mapRef: oldScene.mapRef || scene.mapRef,
          causalFrame: oldScene.causalFrame || scene.causalFrame,
          stage: oldScene.stage || scene.stage,
          transition: oldScene.transition || scene.transition,
          timing: oldScene.timing || scene.timing,
          beats: (scene.beats || []).map((beat, beatIndex) => {
            const oldBeat = oldBeats.find(item => item.id === beat.id || item.title === beat.title) || oldBeats[beatIndex];
            if (!oldBeat) return beat;
            return {
              ...beat,
              id: oldBeat.id,
              type: oldBeat.type || beat.type,
              focus: oldBeat.focus || beat.focus,
              delta: oldBeat.delta || beat.delta,
              timing: oldBeat.timing || beat.timing,
              transition: oldBeat.transition || beat.transition,
              intervention: oldBeat.intervention || beat.intervention
            };
          })
        };
      })
    };
  });
  // Markdown is intentionally about narrative copy. Keep the chosen player
  // profile when an author switches between visual and Markdown authoring so
  // an Atlas presentation never silently falls back to the default profile.
  const presentationStyle = base.settings?.presentationStyle || next.settings?.presentationStyle;
  return normalizePresentation({
    ...next,
    id: base.id,
    ...(presentationStyle ? { settings: { ...next.settings, presentationStyle } } : {}),
    chapters
  });
}
