#!/usr/bin/env node

/**
 * Re-derive persisted loop types under the source/target movement convention.
 *
 * Relation polarity used to depend only on the target sign (−+ positive, −− negative).
 * It now compares both ends (++/−− same direction, +−/−+ opposite direction), so a
 * stored loop `type` derived under the old rule may no longer match its edges and
 * would be rejected by `validateModel`. This script drops only those stale loop
 * types and lets `normalizeModel` derive them again. Signs are never changed.
 *
 * Usage: node scripts/migrate-polarity-convention.mjs [data/loopviewer.db] [--write]
 * Without --write it only reports what would change.
 */
import { resolve } from "node:path";
import { ProjectStore } from "../src/platform/projectStore.js";
import { classifyLoop } from "../src/core/loops.js";

const args = process.argv.slice(2);
const write = args.includes("--write");
const dbPath = resolve(args.find(arg => !arg.startsWith("--")) || "data/loopviewer.db");
const store = new ProjectStore(dbPath);
const report = [];

try {
  for (const record of store.listLoops()) {
    const migration = migrateModel(record.model);
    if (!migration.changes.length) continue;
    report.push({ kind: "loop", id: record.id, changes: migration.changes });
    if (write) store.updateLoop(record.id, { model: migration.model });
  }
  for (const record of store.listMaps()) {
    const migration = migrateModel(record.model);
    if (!migration.changes.length) continue;
    report.push({ kind: "map", id: record.id, changes: migration.changes });
    if (write) store.updateMap(record.id, { model: migration.model });
  }
} finally {
  store.close();
}

console.log(JSON.stringify({ dbPath, write, updated: report.length, report }, null, 2));
if (!write && report.length) console.log("Dry run. Re-run with --write to apply.");

function migrateModel(model) {
  const edgesById = new Map((model.edges || []).map(edge => [edge.id, edge]));
  const changes = [];
  const loops = (model.loops || []).map(loop => {
    const edges = (loop.edgeIds || []).map(id => edgesById.get(id));
    if (!loop.type || edges.some(edge => !edge)) return loop;
    const derived = classifyLoop(edges);
    if (derived === loop.type) return loop;
    changes.push({ loopId: loop.id, label: loop.label, from: loop.type, to: derived });
    const { type, ...rest } = loop;
    return rest;
  });
  return { changes, model: { ...model, loops } };
}
