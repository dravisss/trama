#!/usr/bin/env node
/**
 * Consistent online backup of a hosted Trama data root.
 *
 * Every SQLite file (registry + one per workspace) is copied with
 * `VACUUM INTO`, which produces a transactionally consistent snapshot while
 * the server keeps running. Snapshots older than the retention are removed.
 *
 *   node scripts/trama-backup.mjs [--data /data] [--out /data/backups] [--keep 14]
 */
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, index, all) => {
  if (arg.startsWith("--")) pairs.push([arg.slice(2), all[index + 1]]);
  return pairs;
}, []));
const dataRoot = resolve(args.data || process.env.TRAMA_DATA_ROOT || "data/hosted");
const outRoot = resolve(args.out || join(dataRoot, "backups"));
const keep = Math.max(1, Number(args.keep || process.env.TRAMA_BACKUP_KEEP || 14));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = join(outRoot, stamp);

function snapshot(source, destination) {
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    db.exec(`VACUUM INTO '${destination.replaceAll("'", "''")}'`);
  } finally {
    db.close();
  }
}

mkdirSync(join(target, "workspaces"), { recursive: true });
let count = 0;
snapshot(join(dataRoot, "registry.db"), join(target, "registry.db"));
count += 1;
const workspaceDir = join(dataRoot, "workspaces");
for (const name of readdirSync(workspaceDir)) {
  if (!name.endsWith(".db")) continue;
  try {
    snapshot(join(workspaceDir, name), join(target, "workspaces", name));
    count += 1;
  } catch (error) {
    console.error(`[backup] ${name}: ${error.message}`);
  }
}

const snapshots = readdirSync(outRoot)
  .filter(name => statSync(join(outRoot, name)).isDirectory())
  .sort();
for (const old of snapshots.slice(0, Math.max(0, snapshots.length - keep))) {
  rmSync(join(outRoot, old), { recursive: true, force: true });
}

console.log(`[backup] ${count} database(s) -> ${target} (keeping ${keep} snapshots)`);
