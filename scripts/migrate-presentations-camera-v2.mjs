#!/usr/bin/env node

/**
 * Make the V2 camera contract explicit in every persisted presentation.
 *
 * Focused scenes that only carried the old normalized fit-map default become
 * fit-focus. Scenes without semantic focus remain fit-map, and fixed camera
 * captures are preserved. Existing source Markdown is regenerated so a later
 * edit cannot reintroduce the implicit legacy default.
 */
import { resolve } from "node:path";
import { ProjectStore } from "../src/platform/projectStore.js";
import { normalizePresentation } from "../src/presentation/schema.js";
import { compilePresentation } from "../src/presentation/compiler.js";
import { lintPresentation } from "../src/presentation/lint.js";
import { serializePresentationMarkdown } from "../src/language/presentationMarkdown.js";
import { resolveFocus } from "../src/presentation/references.js";

const dbPath = resolve(process.argv[2] || "data/trama.db");
const store = new ProjectStore(dbPath);
const mapRecords = store.listMaps();
const maps = new Map(mapRecords.map(map => [map.id, map.model]));
const report = [];

try {
  for (const record of store.listPresentations()) {
    const current = normalizePresentation(record.presentation);
    const hadLegacyCamera = JSON.stringify(record.presentation).includes('"mode":"focus"');
    const referencedMapId = current.chapters.flatMap(chapter => chapter.scenes || [])
      .map(scene => scene.mapRef?.mapId).find(Boolean);
    const mapId = maps.has(referencedMapId) ? referencedMapId : bestMapId(current, record.title);
    const model = maps.get(mapId);
    if (!model) throw new Error(`${record.id}: no map model found for ${referencedMapId || "presentation"}`);
    let changedScenes = hadLegacyCamera ? 1 : 0;
    const chapters = current.chapters.map(chapter => ({
      ...chapter,
      scenes: chapter.scenes.map(scene => {
        const beats = scene.beats.map(beat => sanitizeBeat(beat, model));
        const hasFocus = beats.some(beat =>
          beat.focus?.nodeIds?.length || beat.focus?.edgeIds?.length || beat.focus?.loopIds?.length ||
          beat.focus?.nodeId || beat.focus?.edgeId || beat.focus?.loopId
        );
        const currentMode = scene.stage?.camera?.mode;
        const nextMode = hasFocus
          ? (currentMode === "focus" || currentMode === "fit-map" ? "fit-focus" : currentMode)
          : (currentMode === "fit-focus" ? "fit-map" : currentMode);
        const nextScene = {
          ...scene,
          beats,
          mapRef: { ...(scene.mapRef || {}), mapId },
          ...(nextMode && nextMode !== currentMode
            ? { stage: { ...(scene.stage || {}), camera: { ...(scene.stage?.camera || {}), mode: nextMode } } }
            : {})
        };
        if (nextMode !== currentMode || scene.mapRef?.mapId !== mapId) changedScenes += 1;
        if (!nextMode || nextMode === currentMode) return nextScene;
        return {
          ...nextScene
        };
      })
    }));

    let next = normalizePresentation({ ...current, chapters });
    if (current.source_md) {
      next = { ...next, source_md: serializePresentationMarkdown(next, { mode: "editorial" }) };
    }
    const compiled = compilePresentation(next, { model });
    const lint = lintPresentation(next, { model });
    const validationErrors = [...compiled.errors, ...lint.errors.map(item => item.message)];
    if (changedScenes || next.source_md !== current.source_md) {
      const updated = store.updatePresentation(record.id, { title: next.title || record.title, presentation: next });
      report.push({ id: record.id, revision: updated.revision, changedScenes, sourceRegenerated: next.source_md !== current.source_md, validationErrors });
    } else {
      report.push({ id: record.id, revision: record.revision, changedScenes: 0, sourceRegenerated: false, validationErrors });
    }
  }
} finally {
  store.close();
}

console.log(JSON.stringify(report, null, 2));

function bestMapId(presentation, title = "") {
  const focuses = presentation.chapters.flatMap(chapter => chapter.scenes || [])
    .flatMap(scene => scene.beats || [])
    .map(beat => beat.focus || {})
    .reduce((all, focus) => ({
      nodeIds: [...all.nodeIds, ...(focus.nodeIds || [])],
      edgeIds: [...all.edgeIds, ...(focus.edgeIds || [])],
      loopIds: [...all.loopIds, ...(focus.loopIds || [])]
    }), { nodeIds: [], edgeIds: [], loopIds: [] });
  const titleWords = new Set(String(title).toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 3));
  let winner = null;
  for (const record of mapRecords) {
    const model = record.model || {};
    const score = focuses.nodeIds.filter(id => model.nodes?.some(node => node.id === id)).length * 5
      + focuses.edgeIds.filter(id => model.edges?.some(edge => edge.id === id)).length * 3
      + focuses.loopIds.filter(id => model.loops?.some(loop => loop.id === id)).length * 4
      + [...titleWords].filter(word => String(record.title).toLowerCase().includes(word)).length;
    if (!winner || score > winner.score) winner = { id: record.id, score };
  }
  return winner?.score > 0 ? winner.id : null;
}

function sanitizeBeat(beat, model) {
  if (!beat.focus) return beat;
  const resolved = resolveFocus(beat.focus, { model });
  return resolved.errors.length ? { ...beat, focus: undefined } : beat;
}
