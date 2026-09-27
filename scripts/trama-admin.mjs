#!/usr/bin/env node
/**
 * Operator commands for a hosted Trama data root.
 *
 *   node scripts/trama-admin.mjs stats
 *   node scripts/trama-admin.mjs list [--limit 50]
 *   node scripts/trama-admin.mjs find <share-link|edit-link|workspace-id>
 *   node scripts/trama-admin.mjs delete <share-link|edit-link|workspace-id> --yes
 *   node scripts/trama-admin.mjs sweep [--dry-run]
 *
 * `delete` is the takedown path for abusive content: it accepts the public
 * share link someone reported, so operators never need the edit token.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadHostedConfig } from "../server/hosted/config.js";
import { WorkspaceRegistry } from "../server/hosted/registry.js";
import { extractEditToken, WORKSPACE_ID_PATTERN } from "../server/hosted/tokens.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const config = loadHostedConfig(process.env, { root });
const [command = "stats", target] = process.argv.slice(2).filter(arg => !arg.startsWith("--"));
const flag = name => process.argv.includes(`--${name}`);
const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};

const registry = new WorkspaceRegistry({ dataRoot: config.dataRoot, limits: config.limits });

function resolveTarget(value) {
  const text = String(value || "").trim();
  if (WORKSPACE_ID_PATTERN.test(text)) return registry.get(text);
  const share = text.match(/\/p\/([A-Za-z0-9_-]{20,64})/)?.[1] || (text.length <= 24 ? text : null);
  if (share) {
    const record = registry.resolveShareToken(share);
    if (record) return record;
  }
  const edit = extractEditToken(text);
  return edit ? registry.resolveEditToken(edit) : null;
}

function describe(record) {
  const store = registry.store(record.id);
  return {
    id: record.id,
    title: store.getProject()?.title || record.title,
    maps: store.listLoops().length,
    presentations: store.listPresentations().length,
    assets: store.listAssets().length,
    bytes: registry.fileSize(record.id),
    created_at: record.created_at,
    updated_at: record.updated_at,
    last_access_at: record.last_access_at,
    writes: record.write_count
  };
}

try {
  switch (command) {
    case "stats":
      console.log(JSON.stringify({ dataRoot: config.dataRoot, ...registry.stats() }, null, 2));
      break;
    case "list":
      console.table(registry.list({ limit: Number(option("limit", 50)) }));
      break;
    case "find": {
      const record = resolveTarget(target);
      if (!record) throw new Error("No workspace matches that link or id.");
      console.log(JSON.stringify(describe(record), null, 2));
      break;
    }
    case "delete": {
      const record = resolveTarget(target);
      if (!record) throw new Error("No workspace matches that link or id.");
      if (!flag("yes")) {
        console.log(JSON.stringify(describe(record), null, 2));
        console.log("\nRe-run with --yes to permanently delete this workspace.");
        break;
      }
      registry.delete(record.id);
      console.log(`Deleted workspace ${record.id}.`);
      break;
    }
    case "sweep": {
      if (flag("dry-run")) {
        console.log("Retention:", config.retention);
        console.log("Dry run: use without --dry-run to remove abandoned workspaces.");
        break;
      }
      const removed = registry.sweep(config.retention);
      console.log(`Removed ${removed.length} workspace(s).`);
      break;
    }
    default:
      throw new Error(`Unknown command ${command}.`);
  }
} catch (error) {
  console.error(`trama-admin: ${error.message}`);
  process.exitCode = 1;
} finally {
  registry.close();
}
