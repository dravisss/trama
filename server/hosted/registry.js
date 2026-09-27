/**
 * Workspace registry for the account-less hosted mode.
 *
 * - `registry.db` maps secret edit-token hashes and read-only share tokens to
 *   workspace ids. It never stores an edit token in plain text.
 * - Every workspace is an independent Trama project file
 *   (`workspaces/<id>.db`) opened through the unchanged ProjectStore. This
 *   keeps the local-first format, bundles and tooling valid per workspace.
 * - Open stores are cached (LRU) so a busy server does not reopen SQLite files
 *   on every request, and closed when evicted.
 */
import { mkdirSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ProjectStore } from "../../src/platform/projectStore.js";
import { createEmptyModel } from "../../src/core/model.js";
import {
  EDIT_TOKEN_PATTERN,
  SHARE_TOKEN_PATTERN,
  WORKSPACE_ID_PATTERN,
  createEditToken,
  createShareToken,
  createWorkspaceId,
  hashToken
} from "./tokens.js";

const ACCESS_TOUCH_INTERVAL_MS = 60 * 60 * 1000;
export const STARTER_MAP_ID = "novo-mapa";

export class WorkspaceRegistry {
  constructor({ dataRoot, limits = {}, seedCatalog = [], seedAssets = [] }) {
    this.dataRoot = dataRoot;
    this.workspaceDir = resolve(dataRoot, "workspaces");
    mkdirSync(this.workspaceDir, { recursive: true });
    this.limits = limits;
    this.seedCatalog = seedCatalog;
    // Images referenced by the example maps (node media), copied with them.
    this.seedAssets = seedAssets;
    this.maxOpenStores = Math.max(4, limits.openStores || 64);
    this.stores = new Map();
    this.db = new DatabaseSync(resolve(dataRoot, "registry.db"));
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA busy_timeout = 5000");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        edit_token_hash TEXT NOT NULL UNIQUE,
        share_token TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_access_at TEXT NOT NULL,
        write_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS workspaces_access_idx ON workspaces(last_access_at);
    `);
  }

  close() {
    for (const store of this.stores.values()) store.close();
    this.stores.clear();
    this.db.close();
  }

  dbPathFor(id) {
    if (!WORKSPACE_ID_PATTERN.test(id)) throw new Error("Invalid workspace id.");
    return resolve(this.workspaceDir, `${id}.db`);
  }

  /**
   * Create a workspace and return its secret edit token once. The caller is
   * responsible for handing the token to the user; it cannot be recovered.
   */
  create({ title = "Novo espaço", description_md = "", seed = "starter", bundle = null } = {}) {
    const id = createWorkspaceId();
    const editToken = createEditToken();
    const shareToken = createShareToken();
    const now = new Date().toISOString();
    const cleanTitle = String(title || "Novo espaço").slice(0, 160);
    const store = this.openStoreForCreation(id, cleanTitle,
      String(description_md || "").slice(0, 20_000) || "Mapas causais e apresentações deste espaço.");
    try {
      if (bundle) {
        store.importBundle(bundle);
        if (title) store.updateProject({ title: cleanTitle });
      } else if (seed === "examples" && this.seedCatalog.length) {
        store.seed(this.seedCatalog);
        for (const asset of this.seedAssets) if (!store.getAsset(asset.id)) store.createAsset(asset);
        store.ensureMapsForLoops();
      }
      if (!store.listLoops().length && !store.listMaps().length) {
        // The application treats an empty project as "offline", so every
        // workspace starts with at least one (empty) map.
        const initial = store.createLoop({
          id: STARTER_MAP_ID,
          title: "Novo mapa",
          summary: "",
          description_md: "## Novo mapa\n\nDescreva aqui a leitura central deste mapa.",
          model: createEmptyModel({ id: STARTER_MAP_ID, title: "Novo mapa" })
        });
        store.promoteLoopToMap(initial.id);
      }
    } catch (error) {
      this.dropStore(id);
      rmSync(this.dbPathFor(id), { force: true });
      throw error;
    }
    this.db.prepare(`
      INSERT INTO workspaces (id, edit_token_hash, share_token, title, created_at, updated_at, last_access_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, hashToken(editToken), shareToken, store.getProject()?.title || cleanTitle, now, now, now);
    return { workspace: this.get(id), editToken };
  }

  openStoreForCreation(id, title, description_md) {
    const store = new ProjectStore(this.dbPathFor(id), {
      project: { id: `workspace-${id}`, title, description_md },
      wal: true,
      busyTimeoutMs: 5000,
      versionRetention: this.limits.versionsPerRecord || 40
    });
    this.remember(id, store);
    return store;
  }

  get(id) {
    return this.db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id) || null;
  }

  resolveEditToken(token) {
    if (!EDIT_TOKEN_PATTERN.test(String(token || ""))) return null;
    const record = this.db.prepare("SELECT * FROM workspaces WHERE edit_token_hash = ?").get(hashToken(token)) || null;
    if (record) this.touchAccess(record);
    return record;
  }

  resolveShareToken(token) {
    if (!SHARE_TOKEN_PATTERN.test(String(token || ""))) return null;
    const record = this.db.prepare("SELECT * FROM workspaces WHERE share_token = ?").get(token) || null;
    if (record) this.touchAccess(record);
    return record;
  }

  touchAccess(record) {
    const last = Date.parse(record.last_access_at || 0);
    if (Date.now() - last < ACCESS_TOUCH_INTERVAL_MS) return;
    this.db.prepare("UPDATE workspaces SET last_access_at = ? WHERE id = ?").run(new Date().toISOString(), record.id);
  }

  markWrite(id, title) {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE workspaces
      SET updated_at = ?, last_access_at = ?, write_count = write_count + 1, title = COALESCE(?, title)
      WHERE id = ?
    `).run(now, now, title ?? null, id);
  }

  rotateShareToken(id) {
    const token = createShareToken();
    this.db.prepare("UPDATE workspaces SET share_token = ? WHERE id = ?").run(token, id);
    return this.get(id);
  }

  store(id) {
    const cached = this.stores.get(id);
    if (cached) {
      // Refresh LRU order.
      this.stores.delete(id);
      this.stores.set(id, cached);
      return cached;
    }
    const store = new ProjectStore(this.dbPathFor(id), {
      wal: true,
      busyTimeoutMs: 5000,
      versionRetention: this.limits.versionsPerRecord || 40
    });
    this.remember(id, store);
    return store;
  }

  remember(id, store) {
    this.stores.set(id, store);
    while (this.stores.size > this.maxOpenStores) {
      const [oldestId, oldest] = this.stores.entries().next().value;
      this.stores.delete(oldestId);
      oldest.close();
    }
  }

  dropStore(id) {
    const store = this.stores.get(id);
    if (store) {
      this.stores.delete(id);
      store.close();
    }
  }

  delete(id) {
    this.dropStore(id);
    const path = this.dbPathFor(id);
    for (const suffix of ["", "-wal", "-shm"]) rmSync(`${path}${suffix}`, { force: true });
    return this.db.prepare("DELETE FROM workspaces WHERE id = ?").run(id).changes > 0;
  }

  /** Remove abandoned workspaces. Returns the removed ids. */
  sweep({ inactiveDays = 365, untouchedDays = 14, now = Date.now() } = {}) {
    const removed = [];
    const inactiveBefore = new Date(now - inactiveDays * 86_400_000).toISOString();
    const untouchedBefore = new Date(now - untouchedDays * 86_400_000).toISOString();
    const rows = this.db.prepare(`
      SELECT id FROM workspaces
      WHERE (? > 0 AND last_access_at < ?)
         OR (? > 0 AND write_count = 0 AND created_at < ?)
    `).all(inactiveDays, inactiveBefore, untouchedDays, untouchedBefore);
    for (const row of rows) if (this.delete(row.id)) removed.push(row.id);
    return removed;
  }

  fileSize(id) {
    let total = 0;
    for (const suffix of ["", "-wal"]) {
      try {
        total += statSync(`${this.dbPathFor(id)}${suffix}`).size;
      } catch {
        // Missing WAL is normal after a checkpoint.
      }
    }
    return total;
  }

  stats() {
    const row = this.db.prepare(`
      SELECT count(*) AS workspaces, COALESCE(sum(write_count), 0) AS writes FROM workspaces
    `).get();
    return { workspaces: Number(row.workspaces), writes: Number(row.writes), openStores: this.stores.size };
  }

  list({ limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT id, title, created_at, updated_at, last_access_at, write_count
      FROM workspaces ORDER BY updated_at DESC LIMIT ?
    `).all(limit);
  }
}
