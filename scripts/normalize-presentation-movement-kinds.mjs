#!/usr/bin/env node

/**
 * Add the explicit authoring kind to persisted movement beats.
 *
 * The runtime still infers legacy beats, so this migration is intentionally
 * additive: it preserves focus, camera, copy, ids and all custom fields.
 * Run without --write for a report; pass --write to persist the changes.
 */
import { resolve } from "node:path";
import { ProjectStore } from "../src/platform/projectStore.js";
import { describeMovement } from "../src/presentation/movementDescriptor.js";

const dbPath = resolve(process.argv[2] || "data/trama.db");
const shouldWrite = process.argv.includes("--write");
const store = new ProjectStore(dbPath);
const maps = new Map(store.listMaps().map(map => [map.id, map]));
const report = [];

try {
  for (const record of store.listPresentations()) {
    const presentation = record.presentation;
    const scenes = (presentation.chapters || []).flatMap(chapter => chapter.scenes || []);
    const mapId = scenes.map(scene => scene.mapRef?.mapId).find(Boolean);
    const map = maps.get(mapId);
    if (!map) {
      report.push({ id: record.id, title: record.title, mapId: mapId || null, skipped: "map-not-found" });
      continue;
    }

    let changedBeats = 0;
    let invalidBeats = 0;
    const next = {
      ...presentation,
      chapters: (presentation.chapters || []).map(chapter => ({
        ...chapter,
        scenes: (chapter.scenes || []).map(scene => ({
          ...scene,
          beats: (scene.beats || []).map(beat => {
            const repaired = repairLegacyRelation(beat, map.model);
            const descriptor = describeMovement(repaired, map.model, map.model.loops || []);
            if (!["relation", "loop", "path", "map"].includes(descriptor.kind)) return beat;
            if (!descriptor.valid) invalidBeats += 1;
            const movement = { ...(repaired.movement || {}), kind: descriptor.kind };
            if (descriptor.kind === "relation") {
              if (descriptor.edgeId) movement.edgeId = movement.edgeId || descriptor.edgeId;
              if (descriptor.sourceNodeId) movement.sourceNodeId = movement.sourceNodeId || descriptor.sourceNodeId;
              if (descriptor.targetNodeId) movement.targetNodeId = movement.targetNodeId || descriptor.targetNodeId;
            }
            if (descriptor.kind === "loop" && descriptor.loopId) movement.loopId = movement.loopId || descriptor.loopId;
            if (descriptor.kind === "path" && descriptor.edgeIds?.length) movement.edgeIds = movement.edgeIds || [...descriptor.edgeIds];
            const nextBeat = { ...repaired, movement };
            if (JSON.stringify(nextBeat) === JSON.stringify(beat)) return beat;
            changedBeats += 1;
            return nextBeat;
          })
        }))
      }))
    };

    const updated = shouldWrite && changedBeats
      ? store.updatePresentation(record.id, { title: record.title, presentation: next })
      : record;
    report.push({
      id: record.id,
      title: record.title,
      mapId,
      changedBeats,
      invalidBeats,
      written: Boolean(shouldWrite && changedBeats),
      revision: updated.revision
    });
  }
} finally {
  store.close();
}

console.log(JSON.stringify({ dbPath, mode: shouldWrite ? "write" : "dry-run", presentations: report }, null, 2));

function repairLegacyRelation(beat, model) {
  if (beat.movement?.kind !== "relation") return beat;
  const movement = beat.movement;
  const edges = model.edges || [];
  if (edges.some(edge => edge.id === movement.edgeId)) return beat;
  const sourceId = numericNodeAlias(movement.sourceNodeId, model.nodes || []);
  const targetId = numericNodeAlias(movement.targetNodeId, model.nodes || []);
  const edge = sourceId && targetId ? edges.find(item => item.source === sourceId && item.target === targetId) : null;
  if (!edge) return beat;
  const reveal = beat.delta?.reveal;
  return {
    ...beat,
    movement: { ...movement, edgeId: edge.id, sourceNodeId: edge.source, targetNodeId: edge.target },
    focus: beat.focus || { kind: "edge", edgeId: edge.id },
    delta: reveal
      ? { ...beat.delta, reveal: { ...reveal, edgeIds: (reveal.edgeIds || []).map(id => id === movement.edgeId ? edge.id : id) } }
      : beat.delta
  };
}

function numericNodeAlias(value, nodes) {
  const match = String(value || "").match(/(\d+)$/);
  if (!match) return "";
  const candidate = `v${match[1].padStart(2, "0")}`;
  return nodes.some(node => node.id === candidate) ? candidate : "";
}
