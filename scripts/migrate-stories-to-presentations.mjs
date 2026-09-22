#!/usr/bin/env node
/** Promote every persisted legacy model.story to a project Presentation V2. */
import { resolve } from "node:path";
import { ProjectStore } from "../src/platform/projectStore.js";
import { migrateStoryToPresentation } from "../src/presentation/migration.js";
import { normalizePresentation } from "../src/presentation/schema.js";
import { compilePresentation } from "../src/presentation/compiler.js";
import { lintPresentation } from "../src/presentation/lint.js";

const dbPath = resolve("data/trama.db");
const store = new ProjectStore(dbPath);
let presentations = store.listPresentations();
const report = [];

function presentationForLoop(loopId) {
  return presentations.find(record => (record.presentation?.chapters || [])
    .some(chapter => (chapter.scenes || []).some(scene => scene.mapRef?.mapId === loopId)));
}

function removeHistoricalMetadata(presentation) {
  if (!presentation || typeof presentation !== "object") return presentation;
  const { sourceLegacyStory: _sourceLegacyStory, ...cleanPresentation } = presentation;
  return cleanPresentation;
}

function bindToMap(presentation, loopId) {
  return normalizePresentation({
    ...removeHistoricalMetadata(presentation),
    chapters: (presentation.chapters || []).map(chapter => ({
      ...chapter,
      scenes: (chapter.scenes || []).map(scene => ({ ...scene, mapRef: { ...(scene.mapRef || {}), mapId: loopId } }))
    }))
  });
}

for (const record of [...presentations]) {
  if (!record.presentation?.sourceLegacyStory) continue;
  const cleanPresentation = normalizePresentation(removeHistoricalMetadata(record.presentation));
  const updated = store.updatePresentation(record.id, {
    title: cleanPresentation.title,
    presentation: cleanPresentation
  });
  const index = presentations.findIndex(item => item.id === record.id);
  if (index >= 0) presentations[index] = updated;
}

for (const loop of store.listLoops()) {
  const legacyStory = loop.model?.story;
  let record = presentationForLoop(loop.id);
  const hadHistoricalMetadata = Boolean(record?.presentation?.sourceLegacyStory);
  let presentation = record?.presentation ? bindToMap(record.presentation, loop.id) : null;
  if (!presentation && legacyStory?.steps?.length) {
    presentation = bindToMap(migrateStoryToPresentation(legacyStory, loop.model, {
      id: `${loop.id}-presentation`,
      summary: loop.summary || loop.model.description || ""
    }), loop.id);
    const compiled = compilePresentation(presentation, { model: loop.model });
    const lint = lintPresentation(presentation, { model: loop.model });
    if (compiled.errors.length || !lint.valid) {
      throw new Error(`${loop.id}: migration validation failed: ${[...compiled.errors, ...lint.errors.map(item => item.message)].join(" | ")}`);
    }
    record = store.createPresentation({ id: presentation.id, title: presentation.title, presentation });
    presentations.push(record);
  } else if (presentation && record) {
    record = store.updatePresentation(record.id, { title: presentation.title, presentation });
    const index = presentations.findIndex(item => item.id === record.id);
    if (index >= 0) presentations[index] = record;
  }

  if (legacyStory) {
    const { story: _removed, ...modelWithoutStory } = loop.model;
    store.updateLoop(loop.id, { model: modelWithoutStory });
  }
  report.push({
    id: loop.id,
    legacySteps: legacyStory?.steps?.length || 0,
    presentationId: record?.id || null,
    removedLegacyStory: Boolean(legacyStory),
    removedHistoricalMetadata: hadHistoricalMetadata
  });
}

store.close();
console.log(JSON.stringify(report, null, 2));
