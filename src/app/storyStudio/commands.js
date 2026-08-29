/**
 * Story Studio structure commands.
 *
 * Commands are deliberately small and model-agnostic: the composition root
 * supplies the current presentation, commit/history behavior and selection
 * bridge. This keeps drag-and-drop and future keyboard commands on the same
 * mutation path.
 */
import {
  movePresentationBeat,
  movePresentationBeatToScene,
  movePresentationChapter,
  movePresentationSceneToChapter
} from "../../presentation/editorOperations.js";

export function createStoryStudioCommandBus({ getPresentation, commit, select }) {
  const run = (next, message, selection) => {
    const current = getPresentation();
    if (!next || next === current) return false;
    if (selection) select(selection.sceneId ?? null, selection.beatId ?? null);
    return commit(next, message);
  };

  return {
    moveBeatToScene(fromSceneId, beatId, toSceneId, targetIndex) {
      const current = getPresentation();
      if (fromSceneId === toSceneId) {
        return this.moveBeat(fromSceneId, beatId, targetIndex);
      }
      const next = movePresentationBeatToScene(current, fromSceneId, beatId, toSceneId, targetIndex);
      return run(next, "Beat movido para outra cena", { sceneId: toSceneId, beatId });
    },

    moveBeat(sceneId, beatId, targetIndex) {
      const current = getPresentation();
      const scene = current.chapters.flatMap(chapter => chapter.scenes || []).find(item => item.id === sceneId);
      const fromIndex = scene?.beats?.findIndex(beat => beat.id === beatId) ?? -1;
      if (!scene || fromIndex < 0) return false;
      const boundedTarget = Math.max(0, Math.min(Number(targetIndex), scene.beats.length - 1));
      if (boundedTarget === fromIndex) return false;
      const next = movePresentationBeat(current, sceneId, beatId, boundedTarget - fromIndex);
      return run(next, "Beat reordenado", { sceneId, beatId });
    },

    moveScene(sceneId, fromChapterId, toChapterId, targetIndex) {
      const current = getPresentation();
      const next = movePresentationSceneToChapter(current, sceneId, fromChapterId, toChapterId, targetIndex);
      return run(next, fromChapterId === toChapterId ? "Cena reordenada" : "Cena movida de capítulo", { sceneId, beatId: null });
    },

    moveChapter(chapterId, delta) {
      const next = movePresentationChapter(getPresentation(), chapterId, delta);
      return run(next, "Capítulo reordenado");
    }
  };
}
