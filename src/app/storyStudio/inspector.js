/**
 * Pure view model for the Story Studio inspector.
 * DOM rendering and mutations stay in the app composition root; this module
 * only translates a selected scene/beat into language the inspector can use.
 */

export function createStoryInspectorViewModel({ target, findLoop, focusLabel, displayTitle, formatDuration }) {
  const { scene, beat, chapter } = target || {};
  const hasTarget = Boolean(scene);
  const isBeat = Boolean(beat);
  const primaryLoopId = scene?.causalFrame?.primaryLoopId;
  const primaryLoop = primaryLoopId ? findLoop(primaryLoopId) : null;
  const loopLabel = primaryLoop?.label || primaryLoop?.title || primaryLoopId || "";
  const beatCount = scene?.beats?.length || 0;
  const beatIndex = isBeat ? Math.max(0, scene.beats.findIndex(item => item.id === beat.id)) + 1 : 0;
  const title = isBeat && /^beat-auto-/.test(beat.id || "")
    ? displayTitle(beat, scene)
    : (isBeat ? beat.title : scene?.title);
  const timing = isBeat ? beat.timing : scene?.timing;
  const duration = Number(timing?.durationMs || 5000);

  const cameraOverride = isBeat ? beat.delta?.camera?.mode : undefined;
  const camera = cameraOverride || scene?.stage?.camera?.mode || "fit-map";
  const focusText = focusLabel(isBeat ? beat.focus : null);
  const cameraTarget = isBeat
    ? (beat.focus ? `Alvo: ${focusText}` : "Alvo: nenhum foco semântico")
    : "A câmera da cena é o padrão dos beats.";
  return {
    scene,
    beat,
    chapter,
    hasTarget,
    isBeat,
    primaryLoop,
    loopLabel,
    beatCount,
    beatIndex,
    title: title || "",
    narration: isBeat ? beat.narrationMd : scene?.content?.bodyMd,
    timing,
    transition: isBeat ? beat.transition?.type : scene?.transition?.type,
    camera,
    cameraInherited: isBeat && !cameraOverride,
    cameraTarget,
    focus: isBeat ? beat.focus : null,
    duration,
    durationLabel: formatDuration(duration),
    targetLabel: hasTarget
      ? `${isBeat ? `Beat ${beatIndex} de ${beatCount}` : (primaryLoop ? "Cena do loop" : "Cena")} · ${title || "Sem título"}`
      : "Nenhuma cena selecionada",
    canvasTitle: hasTarget ? `${isBeat ? "Beat" : "Cena"} · ${title || "Sem título"}` : "Nenhum beat selecionado",
    canvasMeta: hasTarget ? `${chapter?.title || "Apresentação"} · ${scene.title}` : "Selecione um beat na estrutura ou na timeline",
    context: hasTarget
      ? `${loopLabel ? `Loop · ${loopLabel} · ${beatCount} beats` : `${chapter?.title || "Apresentação"} · ${scene.title}`}${isBeat ? ` · Beat ${beatIndex}` : ""}`
      : "Selecione uma cena ou beat no storyboard para dirigir o palco."
  };
}
