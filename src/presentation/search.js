function foldSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function serializableStoryText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value); } catch { return ""; }
}

function matchesAllTerms(text, terms) {
  return terms.every(term => text.includes(term));
}

/**
 * Builds a stable search result for the Story Studio storyboard.
 * Search is intentionally broad: editorial copy, structural ids, focus
 * selectors and timing/type metadata are all searchable without changing the
 * persisted presentation shape.
 */
export function searchPresentationStoryboard(presentation, query = "") {
  const terms = foldSearchText(query).trim().split(/\s+/).filter(Boolean);
  const chapters = presentation?.chapters || [];
  const chapterIds = new Set();
  const sceneIds = new Set();
  let matchedScenes = 0;
  let matchedBeats = 0;

  chapters.forEach(chapter => {
    const chapterText = foldSearchText(serializableStoryText({
      id: chapter.id,
      title: chapter.title,
      role: chapter.role,
      summary: chapter.summary,
      description: chapter.description
    }));
    const chapterMatches = !terms.length || matchesAllTerms(chapterText, terms);
    if (chapterMatches) chapterIds.add(chapter.id);
    (chapter.scenes || []).forEach(scene => {
      const sceneText = foldSearchText(serializableStoryText({
        id: scene.id,
        title: scene.title,
        type: scene.type,
        content: scene.content,
        stage: scene.stage,
        timing: scene.timing,
        transition: scene.transition,
        beats: scene.beats
      }));
      const sceneMatches = !terms.length || chapterMatches || matchesAllTerms(`${chapterText} ${sceneText}`, terms);
      if (!sceneMatches) return;
      sceneIds.add(scene.id);
      matchedScenes += 1;
      matchedBeats += (scene.beats || []).length;
    });
  });

  return {
    query: String(query || ""),
    terms,
    chapterIds,
    sceneIds,
    matchedScenes,
    matchedBeats,
    totalScenes: chapters.reduce((total, chapter) => total + (chapter.scenes || []).length, 0),
    totalBeats: chapters.reduce((total, chapter) => total + (chapter.scenes || []).reduce((sum, scene) => sum + (scene.beats || []).length, 0), 0)
  };
}

