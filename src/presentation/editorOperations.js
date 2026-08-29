/**
 * Immutable operations used by the Story Studio storyboard.
 *
 * These helpers deliberately operate on presentation data only. They never
 * touch the causal model, so reordering a story cannot mutate the map or its
 * loop definitions.
 */

export function movePresentationChapter(presentation, chapterId, delta) {
  const chapters = presentation?.chapters || [];
  const index = chapters.findIndex(chapter => chapter.id === chapterId);
  if (index < 0) return presentation;
  const nextIndex = index + Number(delta || 0);
  if (nextIndex < 0 || nextIndex >= chapters.length) return presentation;
  return { ...presentation, chapters: moveItem(chapters, index, nextIndex) };
}

export function movePresentationScene(presentation, chapterId, sceneId, delta) {
  const chapter = (presentation?.chapters || []).find(item => item.id === chapterId);
  if (!chapter) return presentation;
  const index = (chapter.scenes || []).findIndex(scene => scene.id === sceneId);
  if (index < 0) return presentation;
  const nextIndex = index + Number(delta || 0);
  if (nextIndex < 0 || nextIndex >= chapter.scenes.length) return presentation;
  return replaceChapter(presentation, chapterId, {
    ...chapter,
    scenes: moveItem(chapter.scenes, index, nextIndex)
  });
}

export function movePresentationBeat(presentation, sceneId, beatId, delta) {
  const location = locateScene(presentation, sceneId);
  if (!location) return presentation;
  const index = (location.scene.beats || []).findIndex(beat => beat.id === beatId);
  if (index < 0) return presentation;
  const nextIndex = index + Number(delta || 0);
  if (nextIndex < 0 || nextIndex >= location.scene.beats.length) return presentation;
  const scene = { ...location.scene, beats: moveItem(location.scene.beats, index, nextIndex) };
  return replaceScene(presentation, location.chapter.id, scene);
}

/**
 * Move one beat between scenes without mutating the source presentation.
 * Keeping this operation in the presentation domain makes the visual editor,
 * Markdown tooling and automated QA exercise the same behavior.
 */
export function movePresentationBeatToScene(presentation, fromSceneId, beatId, toSceneId, targetIndex = Infinity) {
  if (!presentation || !fromSceneId || !beatId || !toSceneId || fromSceneId === toSceneId) return presentation;
  const sourceLocation = locateScene(presentation, fromSceneId);
  const targetLocation = locateScene(presentation, toSceneId);
  if (!sourceLocation || !targetLocation) return presentation;
  const beat = (sourceLocation.scene.beats || []).find(item => item.id === beatId);
  if (!beat) return presentation;
  const sourceBeats = (sourceLocation.scene.beats || []).filter(item => item.id !== beatId);
  const targetBeats = [...(targetLocation.scene.beats || [])];
  const insertAt = Math.max(0, Math.min(
    Number.isFinite(targetIndex) ? Number(targetIndex) : targetBeats.length,
    targetBeats.length
  ));
  targetBeats.splice(insertAt, 0, beat);
  return {
    ...presentation,
    chapters: (presentation.chapters || []).map(chapter => ({
      ...chapter,
      scenes: (chapter.scenes || []).map(scene => (
        scene.id === fromSceneId
          ? { ...scene, beats: sourceBeats }
          : scene.id === toSceneId
            ? { ...scene, beats: targetBeats }
            : scene
      ))
    }))
  };
}

export function movePresentationSceneToChapter(presentation, sceneId, fromChapterId, toChapterId, targetIndex = Infinity) {
  const chapters = presentation?.chapters || [];
  const sourceChapter = chapters.find(chapter => chapter.id === fromChapterId);
  const targetChapter = chapters.find(chapter => chapter.id === toChapterId);
  if (!sourceChapter || !targetChapter) return presentation;
  const sourceIndex = (sourceChapter.scenes || []).findIndex(scene => scene.id === sceneId);
  if (sourceIndex < 0) return presentation;
  if (sourceChapter.id === targetChapter.id) {
    const bounded = Math.max(0, Math.min(Number.isFinite(targetIndex) ? targetIndex : sourceChapter.scenes.length - 1, sourceChapter.scenes.length - 1));
    return replaceChapter(presentation, sourceChapter.id, {
      ...sourceChapter,
      scenes: moveItem(sourceChapter.scenes, sourceIndex, bounded)
    });
  }
  const [scene] = sourceChapter.scenes.slice(sourceIndex, sourceIndex + 1);
  const nextSource = { ...sourceChapter, scenes: sourceChapter.scenes.filter(item => item.id !== sceneId) };
  const targetScenes = [...targetChapter.scenes];
  const insertAt = Math.max(0, Math.min(Number.isFinite(targetIndex) ? targetIndex : targetScenes.length, targetScenes.length));
  targetScenes.splice(insertAt, 0, scene);
  return {
    ...presentation,
    chapters: chapters.map(chapter => chapter.id === sourceChapter.id
      ? nextSource
      : chapter.id === targetChapter.id ? { ...chapter, scenes: targetScenes } : chapter)
  };
}

export function createPresentationChapter(presentation, { id, title = "Novo capítulo", role = "custom", summary = "", scenes = [] } = {}, index = Infinity) {
  const chapters = presentation?.chapters || [];
  const used = new Set(chapters.map(chapter => chapter.id));
  const chapter = {
    id: uniqueId(id || "chapter", used),
    title: typeof title === "string" && title.trim() ? title.trim() : "Novo capítulo",
    role,
    summary,
    scenes: Array.isArray(scenes) ? scenes.map(scene => ({ ...scene })) : []
  };
  const next = [...chapters];
  const insertAt = Math.max(0, Math.min(Number.isFinite(index) ? index : next.length, next.length));
  next.splice(insertAt, 0, chapter);
  return { ...presentation, chapters: next };
}

export function duplicatePresentationChapter(presentation, chapterId, suffix = `-copy-${Date.now()}`) {
  const chapters = presentation?.chapters || [];
  const source = chapters.find(chapter => chapter.id === chapterId);
  if (!source) return presentation;
  const used = collectIds(presentation);
  const clone = cloneChapter(source, suffix, used);
  const index = chapters.indexOf(source);
  return { ...presentation, chapters: [...chapters.slice(0, index + 1), clone, ...chapters.slice(index + 1)] };
}

export function removePresentationChapter(presentation, chapterId) {
  const chapters = presentation?.chapters || [];
  if (!chapters.some(chapter => chapter.id === chapterId)) return presentation;
  const remaining = chapters.filter(chapter => chapter.id !== chapterId);
  return {
    ...presentation,
    chapters: remaining.length ? remaining : [{ id: "chapter-1", title: "Apresentação", role: "custom", summary: "", scenes: [] }]
  };
}

export function duplicatePresentationScene(presentation, chapterId, sceneId, suffix = `-copy-${Date.now()}`) {
  const chapter = (presentation?.chapters || []).find(item => item.id === chapterId);
  const source = chapter?.scenes?.find(scene => scene.id === sceneId);
  if (!chapter || !source) return presentation;
  const clone = cloneScene(source, suffix);
  const index = chapter.scenes.indexOf(source);
  return replaceChapter(presentation, chapterId, {
    ...chapter,
    scenes: [...chapter.scenes.slice(0, index + 1), clone, ...chapter.scenes.slice(index + 1)]
  });
}

/**
 * Duplicate several scenes in place, preserving the authored chapter order.
 * IDs are generated against the complete presentation so a batch cannot create
 * collisions with another scene or beat that already exists.
 */
export function duplicatePresentationScenes(presentation, sceneIds = [], suffix = `-copy-${Date.now()}`) {
  const selected = new Set(sceneIds.filter(Boolean));
  if (!selected.size) return presentation;
  const used = collectIds(presentation);
  let changed = false;
  const chapters = (presentation?.chapters || []).map(chapter => {
    const scenes = [];
    let chapterChanged = false;
    for (const scene of chapter.scenes || []) {
      scenes.push(scene);
      if (!selected.has(scene.id)) continue;
      scenes.push(cloneScene(scene, suffix, used));
      changed = true;
      chapterChanged = true;
    }
    return chapterChanged ? { ...chapter, scenes } : chapter;
  });
  return changed ? { ...presentation, chapters } : presentation;
}

/**
 * Duplicate beats in place. `beatsByScene` may be a Map or a plain object whose
 * values are arrays of beat ids. The shape keeps the operation usable from the
 * visual editor and from future command/Markdown tooling.
 */
export function duplicatePresentationBeats(presentation, beatsByScene = {}, suffix = `-copy-${Date.now()}`) {
  const selection = normalizeBeatSelection(beatsByScene);
  if (!selection.size) return presentation;
  const used = collectIds(presentation);
  let changed = false;
  const chapters = (presentation?.chapters || []).map(chapter => ({
    ...chapter,
    scenes: (chapter.scenes || []).map(scene => {
      const beatIds = selection.get(scene.id);
      if (!beatIds?.size) return scene;
      const beats = [];
      let sceneChanged = false;
      for (const beat of scene.beats || []) {
        beats.push(beat);
        if (!beatIds.has(beat.id)) continue;
        const clone = cloneValue(beat);
        clone.id = uniqueId(`${beat.id}${suffix}`, used);
        used.add(clone.id);
        clone.title = `${beat.title} · cópia`;
        beats.push(clone);
        changed = true;
        sceneChanged = true;
      }
      return sceneChanged ? { ...scene, beats } : scene;
    })
  }));
  return changed ? { ...presentation, chapters } : presentation;
}

/** Move several scenes to one chapter as a stable, ordered batch. */
export function movePresentationScenesToChapter(presentation, sceneIds = [], toChapterId, targetIndex = Infinity) {
  const selected = new Set(sceneIds.filter(Boolean));
  const chapters = presentation?.chapters || [];
  const target = chapters.find(chapter => chapter.id === toChapterId);
  if (!selected.size || !target) return presentation;
  const moved = [];
  for (const chapter of chapters) {
    for (const scene of chapter.scenes || []) {
      if (selected.has(scene.id)) moved.push(scene);
    }
  }
  if (!moved.length) return presentation;
  const nextChapters = chapters.map(chapter => ({
    ...chapter,
    scenes: (chapter.scenes || []).filter(scene => !selected.has(scene.id))
  }));
  const nextTarget = nextChapters.find(chapter => chapter.id === toChapterId);
  const insertAt = Math.max(0, Math.min(
    Number.isFinite(targetIndex) ? Number(targetIndex) : nextTarget.scenes.length,
    nextTarget.scenes.length
  ));
  nextTarget.scenes.splice(insertAt, 0, ...moved);
  return { ...presentation, chapters: nextChapters };
}

/** Remove selected scenes and/or beats without mutating the source object. */
export function removePresentationItems(presentation, { sceneIds = [], beatsByScene = {} } = {}) {
  const selectedScenes = new Set(sceneIds.filter(Boolean));
  const selectedBeats = normalizeBeatSelection(beatsByScene);
  if (!selectedScenes.size && !selectedBeats.size) return presentation;
  let changed = false;
  const chapters = (presentation?.chapters || []).map(chapter => ({
    ...chapter,
    scenes: (chapter.scenes || [])
      .filter(scene => {
        const remove = selectedScenes.has(scene.id);
        if (remove) changed = true;
        return !remove;
      })
      .map(scene => {
        const beatIds = selectedBeats.get(scene.id);
        if (!beatIds?.size) return scene;
        const beats = (scene.beats || []).filter(beat => {
          const remove = beatIds.has(beat.id);
          if (remove) changed = true;
          return !remove;
        });
        return { ...scene, beats };
      })
  }));
  return changed ? { ...presentation, chapters } : presentation;
}

function cloneChapter(chapter, suffix, used) {
  const id = uniqueId(`${chapter.id}${suffix}`, used);
  const sceneIds = new Set([...used, id]);
  const scenes = (chapter.scenes || []).map(scene => cloneScene(scene, suffix, sceneIds));
  return { ...cloneValue(chapter), id, title: `${chapter.title} · cópia`, scenes };
}

function cloneScene(scene, suffix, used = new Set()) {
  const clone = cloneValue(scene);
  clone.id = uniqueId(`${scene.id}${suffix}`, used);
  used.add(clone.id);
  clone.title = `${scene.title} · cópia`;
  clone.beats = (clone.beats || []).map((beat, index) => ({ ...beat, id: uniqueId(`${beat.id}${suffix}-${index + 1}`, used) }));
  clone.beats.forEach(beat => used.add(beat.id));
  return clone;
}

function collectIds(presentation) {
  const used = new Set();
  for (const chapter of presentation?.chapters || []) {
    if (chapter.id) used.add(chapter.id);
    for (const scene of chapter.scenes || []) {
      if (scene.id) used.add(scene.id);
      for (const beat of scene.beats || []) if (beat.id) used.add(beat.id);
    }
  }
  return used;
}

function normalizeBeatSelection(value) {
  const selection = new Map();
  if (value instanceof Map) {
    for (const [sceneId, beatIds] of value.entries()) {
      const ids = new Set((beatIds || []).filter(Boolean));
      if (sceneId && ids.size) selection.set(sceneId, ids);
    }
    return selection;
  }
  for (const [sceneId, beatIds] of Object.entries(value || {})) {
    const ids = new Set((beatIds || []).filter(Boolean));
    if (sceneId && ids.size) selection.set(sceneId, ids);
  }
  return selection;
}

function locateScene(presentation, sceneId) {
  for (const chapter of presentation?.chapters || []) {
    const scene = (chapter.scenes || []).find(item => item.id === sceneId);
    if (scene) return { chapter, scene };
  }
  return null;
}

function replaceChapter(presentation, chapterId, nextChapter) {
  return {
    ...presentation,
    chapters: (presentation.chapters || []).map(chapter => chapter.id === chapterId ? nextChapter : chapter)
  };
}

function replaceScene(presentation, chapterId, nextScene) {
  const chapter = (presentation?.chapters || []).find(item => item.id === chapterId);
  if (!chapter) return presentation;
  return replaceChapter(presentation, chapterId, {
    ...chapter,
    scenes: (chapter.scenes || []).map(scene => scene.id === nextScene.id ? nextScene : scene)
  });
}

function moveItem(items, fromIndex, toIndex) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function uniqueId(base, used) {
  let id = base;
  let index = 2;
  while (used.has(id)) id = `${base}-${index++}`;
  return id;
}

function cloneValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
