import React, { useEffect, useRef } from "react";
import { Button } from "./ui/Button.jsx";
import { Input } from "./ui/Field.jsx";
import { Icon } from "./ui/Icon.jsx";

const DRAG_MIME = "application/x-trama-story";

function formatDuration(durationMs = 0) {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function durationFor(scene, beat) {
  return Number(beat?.timing?.durationMs || scene?.timing?.durationMs || 5000);
}

function iconButton(label, onClick, displayLabel = label) {
  return <Button unstyled type="button" className="story-timeline-icon-button story-timeline-icon-trash" aria-label={displayLabel} title={displayLabel} onClick={event => { event.stopPropagation(); onClick?.(); }}>
    <Icon name="trash" size="sm" />
  </Button>;
}

function readDrag(event) {
  try {
    return JSON.parse(event.dataTransfer?.getData(DRAG_MIME) || "");
  } catch {
    return null;
  }
}

function writeDrag(event, payload) {
  event.dataTransfer?.setData(DRAG_MIME, JSON.stringify(payload));
  event.dataTransfer?.setData("text/plain", JSON.stringify(payload));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

/**
 * HTML5 drag is not consistently emitted by touch surfaces and embedded
 * browser automation. Keep the same storyboard command available through a
 * pointer gesture so a card can be moved with mouse, trackpad or touch.
 */
function usePointerDrag(payload, { targetSelector, ignoreSelector, onDrop } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof document === "undefined") return undefined;
    let active = false;
    let moved = false;
    let finished = false;
    let state = null;
    let startPoint = null;

    const clearTargets = () => {
      document.querySelectorAll(targetSelector || ".story-timeline-card, .story-timeline-scene").forEach(target => target.classList.remove("is-drop-target"));
    };
    const cleanup = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", cancel);
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      element.classList.remove("is-pointer-dragging");
      document.body.classList.remove("timeline-pointer-dragging");
      clearTargets();
      active = false;
      state = null;
    };
    const finish = (cancelled, event) => {
      if (finished) return;
      finished = true;
      if (!cancelled && moved && state) {
        state.x = event?.clientX ?? state.x;
        state.y = event?.clientY ?? state.y;
        state.target = document.elementFromPoint(state.x, state.y)?.closest(targetSelector || ".story-timeline-card, .story-timeline-scene") || state.target;
        onDrop?.(state);
      }
      cleanup();
    };
    const move = event => {
      if (!active || !startPoint) return;
      if (!moved && Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y) < 6) return;
      moved = true;
      event.preventDefault();
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(targetSelector || ".story-timeline-card, .story-timeline-scene") || null;
      state = { payload, target, x: event.clientX, y: event.clientY };
      element.classList.add("is-pointer-dragging");
      document.body.classList.add("timeline-pointer-dragging");
      clearTargets();
      target?.classList.add("is-drop-target");
    };
    const up = event => finish(false, event);
    const cancel = () => finish(true);
    const start = event => {
      if (active || (event.button !== undefined && event.button !== 0)) return;
      const targetElement = event.target instanceof Element ? event.target : null;
      if (ignoreSelector && targetElement?.closest(ignoreSelector)) return;
      const nestedButton = targetElement?.closest("button");
      if (nestedButton && nestedButton !== element && !nestedButton.classList.contains("story-timeline-card-main")) return;
      active = true;
      moved = false;
      finished = false;
      startPoint = { x: event.clientX, y: event.clientY };
      document.addEventListener("pointermove", move, { passive: false });
      document.addEventListener("pointerup", up, { once: true });
      document.addEventListener("pointercancel", cancel, { once: true });
      document.addEventListener("mousemove", move, { passive: false });
      document.addEventListener("mouseup", up, { once: true });
    };
    element.addEventListener("pointerdown", start);
    element.addEventListener("mousedown", start);
    return () => {
      if (active) finish(true);
      element.removeEventListener("pointerdown", start);
      element.removeEventListener("mousedown", start);
    };
  }, [payload, targetSelector, ignoreSelector, onDrop]);
  return ref;
}

function StoryBeatCard({ scene, beat, beatIndex, frameIndex, active, title, actions }) {
  const dragPayload = { kind: "beat", beatId: beat.id, sceneId: scene.id };
  const pointerRef = usePointerDrag(dragPayload, {
    targetSelector: ".story-timeline-card, .story-timeline-scene-beats",
    onDrop: state => {
      const target = state.target;
      if (!target) return;
      const targetCard = target.matches(".story-timeline-card") ? target : null;
      const destination = targetCard?.closest(".story-timeline-scene") || target.closest(".story-timeline-scene");
      const targetSceneId = destination?.dataset.sceneId;
      if (!targetSceneId || (targetCard?.dataset.beatId === beat.id && targetSceneId === scene.id)) return;
      const cards = destination ? [...destination.querySelectorAll(":scope > .story-timeline-scene-beats > .story-timeline-card")] : [];
      let targetIndex = cards.length;
      if (targetCard) {
        const cardIndex = cards.indexOf(targetCard);
        targetIndex = cardIndex + (state.x > targetCard.getBoundingClientRect().left + targetCard.getBoundingClientRect().width / 2 ? 1 : 0);
      }
      actions.moveBeatToScene(scene.id, beat.id, targetSceneId, targetIndex);
    }
  });
  return <article
    ref={pointerRef}
    className={`story-timeline-card${active ? " active" : ""}`}
    data-beat-id={beat.id}
    data-scene-id={scene.id}
    onDragOver={event => {
      const payload = readDrag(event);
      if (payload?.kind !== "beat" || payload.beatId === beat.id) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.classList.add("is-drop-target");
    }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.classList.remove("is-drop-target"); }}
    onDrop={event => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.classList.remove("is-drop-target");
      const payload = readDrag(event);
      if (payload?.kind !== "beat" || payload.beatId === beat.id) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const targetIndex = event.clientX > rect.left + rect.width / 2 ? beatIndex + 1 : beatIndex;
      actions.moveBeatToScene(payload.sceneId, payload.beatId, scene.id, targetIndex);
    }}
  >
    <span className="story-timeline-card-handle" draggable="true" aria-hidden="true" title="Arraste para reordenar o movimento" onDragStart={event => { writeDrag(event, dragPayload); event.currentTarget.closest(".story-timeline-card")?.classList.add("is-dragging"); }} onDragEnd={event => event.currentTarget.closest(".story-timeline-card")?.classList.remove("is-dragging", "is-drop-target")}>⋮⋮</span>
    <Button unstyled type="button" className="story-timeline-card-main" aria-label={`Movimento ${frameIndex === undefined ? beatIndex + 1 : frameIndex + 1}: ${title}`} aria-current={active ? "step" : "false"} onClick={() => actions.focusBeat(scene.id, beat.id)}>
      <span className="story-timeline-index">{frameIndex === undefined ? beatIndex + 1 : frameIndex + 1}</span>
      <strong className="story-timeline-title">{title}</strong>
      <time className="story-timeline-duration">{formatDuration(durationFor(scene, beat))}</time>
    </Button>
    {iconButton("Remover beat", () => actions.removeBeat(scene.id, beat.id), "Remover movimento")}
  </article>;
}

function StoryScene({ chapter, scene, sceneIndex, displayIndex = sceneIndex, frameIndexByBeat, currentIndex, getBeatTitle, actions }) {
  const sceneDuration = (scene.beats || []).reduce((sum, beat) => sum + durationFor(scene, beat), 0) || Number(scene.timing?.durationMs || 5000);
  const dragPayload = { kind: "scene", sceneId: scene.id, chapterId: chapter.id };
  const pointerRef = usePointerDrag(dragPayload, {
    targetSelector: ".story-timeline-scene",
    ignoreSelector: ".story-timeline-card, button",
    onDrop: state => {
      const target = state.target;
      if (!target || target.dataset.sceneId === scene.id) return;
      const scenes = [...target.parentElement.querySelectorAll(":scope > .story-timeline-scene")];
      const targetIndex = scenes.indexOf(target) + (state.x > target.getBoundingClientRect().left + target.getBoundingClientRect().width / 2 ? 1 : 0);
      actions.moveScene(scene.id, chapter.id, target.dataset.chapterId || chapter.id, targetIndex);
    }
  });
  return <section
    ref={pointerRef}
    className="story-timeline-scene"
    data-scene-id={scene.id}
    data-chapter-id={chapter.id}
    onDragOver={event => {
      const payload = readDrag(event);
      if (payload?.kind !== "scene" || payload.sceneId === scene.id) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.classList.add("is-drop-target");
    }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.classList.remove("is-drop-target"); }}
    onDrop={event => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.classList.remove("is-drop-target");
      const payload = readDrag(event);
      if (payload?.kind !== "scene" || payload.sceneId === scene.id) return;
      const rect = event.currentTarget.getBoundingClientRect();
      actions.moveScene(payload.sceneId, payload.chapterId, chapter.id, event.clientX > rect.left + rect.width / 2 ? sceneIndex + 1 : sceneIndex);
    }}
  >
    <header className="story-timeline-scene-header">
      <span className="story-timeline-drag-handle" draggable="true" aria-hidden="true" title="Arraste para reordenar a cena" onDragStart={event => { writeDrag(event, dragPayload); event.currentTarget.closest(".story-timeline-scene")?.classList.add("is-dragging"); }} onDragEnd={event => event.currentTarget.closest(".story-timeline-scene")?.classList.remove("is-dragging", "is-drop-target")}>⋮⋮</span>
      <Button unstyled type="button" className="story-timeline-scene-title" aria-label={`Editar cena ${displayIndex + 1}: ${scene.title || "Sem título"}`} onClick={() => actions.selectScene(scene.id)}>
        <span className="story-timeline-scene-number">{String(displayIndex + 1).padStart(2, "0")}</span>
        <span className="story-timeline-scene-copy"><small>{scene.kind || "Cena"}</small><strong>{scene.title || "Sem título"}</strong></span>
      </Button>
      <span className="story-timeline-scene-count">{scene.beats?.length || 0} movimentos · {formatDuration(sceneDuration)}</span>
      <Button unstyled type="button" className="story-timeline-add-beat" aria-label={`Adicionar movimento à cena ${displayIndex + 1}`} title="Adicionar movimento" onClick={() => actions.addBeat(scene.id)}><Icon name="plus" size="sm" /></Button>
      {iconButton("Remover cena", () => actions.removeScene(scene.id))}
    </header>
    <div className="story-timeline-scene-beats" data-scene-id={scene.id}
      onDragOver={event => {
        const payload = readDrag(event);
        if (payload?.kind !== "beat" || payload.sceneId === scene.id) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add("is-drop-target");
      }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.classList.remove("is-drop-target"); }}
      onDrop={event => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove("is-drop-target");
        const payload = readDrag(event);
        if (payload?.kind === "beat") actions.moveBeatToScene(payload.sceneId, payload.beatId, scene.id, scene.beats?.length || 0);
      }}>
      {(scene.beats || []).map((beat, beatIndex) => <StoryBeatCard key={beat.id} scene={scene} beat={beat} beatIndex={beatIndex} frameIndex={frameIndexByBeat.get(beat.id)} active={frameIndexByBeat.get(beat.id) === currentIndex} title={getBeatTitle(beat, scene)} actions={actions} />)}
      {!scene.beats?.length ? <Button unstyled type="button" className="story-timeline-empty-beat" onClick={() => actions.addBeat(scene.id)}>+ Adicionar o primeiro movimento</Button> : null}
    </div>
  </section>;
}

function StoryTimeline({ presentation = {}, timeline = [], currentIndex = -1, getBeatTitle, actions }) {
  const frameIndexByBeat = new Map(timeline.map((frame, frameIndex) => [frame.beatId, frameIndex]));
  return <>
    {(presentation.chapters || []).map((chapter, chapterIndex) => {
      const sceneOffset = (presentation.chapters || []).slice(0, chapterIndex).reduce((count, previousChapter) => count + (previousChapter.scenes || []).length, 0);
      const chapterDuration = (chapter.scenes || []).reduce((sum, scene) => sum + ((scene.beats || []).reduce((beatSum, beat) => beatSum + durationFor(scene, beat), 0) || Number(scene.timing?.durationMs || 5000)), 0);
      return <section className="story-timeline-chapter" data-chapter-id={chapter.id} key={chapter.id}>
        <header className="story-timeline-chapter-header"><strong>{chapterIndex + 1} · {chapter.title}</strong><time>{formatDuration(chapterDuration)}</time></header>
        {(chapter.scenes || []).map((scene, sceneIndex) => <StoryScene key={scene.id} chapter={chapter} scene={scene} sceneIndex={sceneIndex} displayIndex={sceneOffset + sceneIndex} frameIndexByBeat={frameIndexByBeat} currentIndex={currentIndex} getBeatTitle={getBeatTitle} actions={actions} />)}
      </section>;
    })}
    <Button unstyled type="button" className="story-timeline-add-scene-inline" onClick={() => actions.addScene?.()}>+ Cena manual</Button>
    {!presentation.chapters?.length ? <div className="story-timeline-empty-state">Crie uma cena para começar a contar este loop.</div> : null}
  </>;
}

/**
 * React-owned timeline chrome. The shell and its controls share the same
 * stable ids consumed by the domain adapter, but there is only one visible
 * owner for the timeline surface. Keeping this chrome in React prevents a
 * second static timeline from drifting away from the storyboard cards.
 */
export function StoryTimelineShell({ status = "Nenhum movimento selecionado", time = "00:00", currentIndex = -1, totalFrames = 0, presentation = {}, timeline = [], getBeatTitle, actions = {} } = {}) {
  return <section id="story-timeline-shell" data-story-ui="v2" className="story-timeline story-timeline-v2" aria-label="Timeline da apresentação">
    <div className="story-timeline-header">
      <div><span className="dock-eyebrow">Timeline</span><strong id="story-timeline-status">{status}</strong></div>
      <div className="story-timeline-create-actions">
        <Button unstyled type="button" id="story-timeline-add-scene" className="story-timeline-add-scene">+ Cena de loop</Button>
        <Button unstyled type="button" id="story-timeline-add-manual-scene" className="story-timeline-add-manual-scene">+ Cena manual</Button>
      <Button unstyled type="button" id="story-mobile-inspector-toggle" className="story-timeline-edit-mobile" aria-label="Abrir editor do movimento" aria-controls="editor-dock" aria-expanded="false" title="Abrir editor do movimento">Editar movimento</Button>
      </div>
      <span id="story-timeline-time">{time}</span>
    </div>
    <Input unstyled id="story-timeline-scrubber" type="range" min="0" max={Math.max(0, totalFrames - 1)} value={Math.max(0, currentIndex)} step="1" aria-label="Selecionar movimento na timeline" readOnly />
    <div id="react-story-timeline-root" className="story-timeline-track react-story-timeline-track" aria-live="polite"><StoryTimeline presentation={presentation} timeline={timeline} currentIndex={currentIndex} getBeatTitle={getBeatTitle} actions={actions} /></div>
    <div className="story-timeline-actions">
      <Button unstyled type="button" id="story-timeline-first" aria-label="Primeiro movimento">|‹</Button>
      <Button unstyled type="button" id="story-timeline-previous">Anterior</Button>
      <Button unstyled type="button" id="story-timeline-preview">Prévia deste movimento</Button>
      <Button unstyled type="button" id="story-timeline-next">Próximo</Button>
      <Button unstyled type="button" id="story-timeline-last" aria-label="Último movimento">›|</Button>
    </div>
  </section>;
}

export function mountReactStoryTimeline({ root } = {}) {
  // Kept as a compatibility shim for embedders during the root consolidation.
  // The application now renders the timeline through StoryTimelineShell so
  // the editor has one React owner and one lifecycle boundary.
  return { render() {} };
}
