import { mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createEmptyModel, normalizeModel, slugId, uniqueId } from "../core/model.js";
import { migrateStoryToPresentation } from "../presentation/migration.js";

const DEFAULT_PROJECT_ID = "default-project";
const PROJECT_BUNDLE_FORMAT = "trama-project";
const LEGACY_PROJECT_BUNDLE_FORMAT = "loopviewer-project";

export class ProjectStore {
  constructor(dbPath, { project, seedModels = [], seedAssets = [] } = {}) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.dbPath = dbPath;
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.migrate();
    this.ensureProject(project);
    if (!this.listLoops().length && seedModels.length) this.seed(seedModels);
    else if (seedModels.length) this.backfillSeedModels(seedModels);
    for (const asset of seedAssets) {
      if (!this.getAsset(asset.id)) this.createAsset(asset);
    }
    this.ensureMapsForLoops();
  }

  close() {
    this.db.close();
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description_md TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS loops (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        description_md TEXT NOT NULL DEFAULT '',
        model_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS loop_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loop_id TEXT NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
        model_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS maps (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description_md TEXT NOT NULL DEFAULT '',
        model_json TEXT NOT NULL,
        source_loop_id TEXT REFERENCES loops(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS views (
        id TEXT PRIMARY KEY,
        map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        settings_json TEXT NOT NULL DEFAULT '{}',
        rules_json TEXT NOT NULL DEFAULT '[]',
        style_source TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS presentations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        presentation_json TEXT NOT NULL DEFAULT '{"scenes":[]}',
        revision INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS presentation_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
        presentation_json TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT 'autosave',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        content BLOB NOT NULL,
        kind TEXT NOT NULL DEFAULT 'binary',
        sha256 TEXT NOT NULL DEFAULT '',
        width INTEGER,
        height INTEGER,
        alt_text TEXT NOT NULL DEFAULT '',
        focal_x REAL NOT NULL DEFAULT 0.5,
        focal_y REAL NOT NULL DEFAULT 0.5,
        source_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS maps_project_idx ON maps(project_id, updated_at);
      CREATE INDEX IF NOT EXISTS views_map_idx ON views(map_id, updated_at);
      CREATE INDEX IF NOT EXISTS presentations_project_idx ON presentations(project_id, updated_at);
      CREATE INDEX IF NOT EXISTS assets_project_idx ON assets(project_id, updated_at);
      CREATE INDEX IF NOT EXISTS presentation_versions_idx ON presentation_versions(presentation_id, created_at);
    `);
    const presentationColumns = new Set(this.db.prepare("PRAGMA table_info(presentations)").all().map(row => row.name));
    if (!presentationColumns.has("revision")) {
      this.db.exec("ALTER TABLE presentations ADD COLUMN revision INTEGER NOT NULL DEFAULT 1");
    }
    const assetColumns = new Set(this.db.prepare("PRAGMA table_info(assets)").all().map(row => row.name));
    const assetMigrations = [
      ["kind", "ALTER TABLE assets ADD COLUMN kind TEXT NOT NULL DEFAULT 'binary'"],
      ["sha256", "ALTER TABLE assets ADD COLUMN sha256 TEXT NOT NULL DEFAULT ''"],
      ["width", "ALTER TABLE assets ADD COLUMN width INTEGER"],
      ["height", "ALTER TABLE assets ADD COLUMN height INTEGER"],
      ["alt_text", "ALTER TABLE assets ADD COLUMN alt_text TEXT NOT NULL DEFAULT ''"],
      ["focal_x", "ALTER TABLE assets ADD COLUMN focal_x REAL NOT NULL DEFAULT 0.5"],
      ["focal_y", "ALTER TABLE assets ADD COLUMN focal_y REAL NOT NULL DEFAULT 0.5"],
      ["source_json", "ALTER TABLE assets ADD COLUMN source_json TEXT NOT NULL DEFAULT '{}'"],
    ];
    for (const [column, sql] of assetMigrations) if (!assetColumns.has(column)) this.db.exec(sql);
  }

  ensureProject(project = {}) {
    const existing = this.getProject();
    if (existing) return existing;
    const now = timestamp();
    this.db.prepare(`
      INSERT INTO projects (id, title, description_md, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      project.id || DEFAULT_PROJECT_ID,
      project.title || "Trama Workspace",
      project.description_md || "Projeto local de loops causais.",
      now,
      now
    );
    return this.getProject();
  }

  getProject() {
    return this.db.prepare("SELECT * FROM projects ORDER BY created_at LIMIT 1").get();
  }

  updateProject(changes = {}) {
    const current = this.getProject();
    if (!current) return this.ensureProject(changes);
    const now = timestamp();
    this.db.prepare(`
      UPDATE projects
      SET title = ?, description_md = ?, updated_at = ?
      WHERE id = ?
    `).run(
      changes.title ?? current.title,
      changes.description_md ?? current.description_md,
      now,
      current.id
    );
    return this.getProject();
  }

  listLoops() {
    return this.db.prepare(`
      SELECT id, project_id, title, summary, description_md, model_json, created_at, updated_at
      FROM loops
      ORDER BY updated_at DESC, title ASC
    `).all().map(rowToLoop);
  }

  getLoop(id) {
    const row = this.db.prepare(`
      SELECT id, project_id, title, summary, description_md, model_json, created_at, updated_at
      FROM loops
      WHERE id = ?
    `).get(id);
    return row ? rowToLoop(row) : null;
  }

  createLoop({ id, title, summary = "", description_md = "", model }) {
    const project = this.getProject();
    const normalized = normalizeModel({
      ...model,
      id: model?.id || id || slugId(title, "loop"),
      title: model?.title || title,
      description: model?.description || summary || description_md
    });
    const existingIds = new Set(this.listLoops().map(loop => loop.id));
    const loopId = uniqueId(id || normalized.id || title, existingIds);
    const now = timestamp();
    this.db.prepare(`
      INSERT INTO loops (id, project_id, title, summary, description_md, model_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      loopId,
      project.id,
      title || normalized.title || loopId,
      summary,
      description_md || normalized.description || "",
      JSON.stringify({ ...normalized, id: loopId, title: title || normalized.title }),
      now,
      now
    );
    return this.getLoop(loopId);
  }

  createInitialLoop({ title = "Novo loop" } = {}) {
    return this.createLoop({
      title,
      summary: "",
      description_md: `## ${title}\n\nDescreva aqui a leitura central deste loop.`,
      model: createEmptyModel({ id: slugId(title, "loop"), title })
    });
  }

  updateLoop(id, changes = {}) {
    const current = this.getLoop(id);
    if (!current) return null;
    const nextModel = changes.model
      ? normalizeModel({ ...changes.model, id, title: changes.title || changes.model.title || current.title })
      : current.model;
    const now = timestamp();
    this.db.prepare(`
      INSERT INTO loop_versions (loop_id, model_json, created_at)
      VALUES (?, ?, ?)
    `).run(id, JSON.stringify(current.model), now);
    this.db.prepare(`
      UPDATE loops
      SET title = ?, summary = ?, description_md = ?, model_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      changes.title ?? current.title,
      changes.summary ?? current.summary,
      changes.description_md ?? current.description_md,
      JSON.stringify({
        ...nextModel,
        id,
        title: changes.title ?? nextModel.title ?? current.title,
        description: changes.summary ?? nextModel.description ?? current.summary
      }),
      now,
      id
    );
    const updated = this.getLoop(id);
    const linkedMaps = this.db.prepare("SELECT id FROM maps WHERE source_loop_id = ?").all(id);
    const syncMap = this.db.prepare(`
      UPDATE maps SET title = ?, description_md = ?, model_json = ?, updated_at = ? WHERE id = ?
    `);
    linkedMaps.forEach(map => syncMap.run(updated.title, updated.description_md,
      JSON.stringify({ ...updated.model, id: map.id, title: updated.title }), now, map.id));
    return updated;
  }

  deleteLoop(id) {
    this.db.prepare("DELETE FROM maps WHERE source_loop_id = ?").run(id);
    const result = this.db.prepare("DELETE FROM loops WHERE id = ?").run(id);
    return result.changes > 0;
  }

  duplicateLoop(id) {
    const source = this.getLoop(id);
    if (!source) return null;
    return this.createLoop({
      title: `${source.title} cópia`,
      summary: source.summary,
      description_md: source.description_md,
      model: {
        ...source.model,
        id: `${source.id}-copy`,
        title: `${source.title} cópia`
      }
    });
  }

  listLoopVersions(loopId, { limit = 50 } = {}) {
    return this.db.prepare(`
      SELECT id, loop_id, model_json, created_at
      FROM loop_versions WHERE loop_id = ? ORDER BY id DESC LIMIT ?
    `).all(loopId, limit).map(row => ({
      id: row.id,
      loop_id: row.loop_id,
      model: JSON.parse(row.model_json),
      created_at: row.created_at
    }));
  }

  restoreLoopVersion(loopId, versionId) {
    const version = this.db.prepare(`
      SELECT model_json FROM loop_versions WHERE id = ? AND loop_id = ?
    `).get(versionId, loopId);
    if (!version) return null;
    return this.updateLoop(loopId, { model: JSON.parse(version.model_json) });
  }

  listMaps() {
    return this.db.prepare(`
      SELECT id, project_id, title, description_md, model_json, source_loop_id, created_at, updated_at
      FROM maps
      ORDER BY updated_at DESC, title ASC
    `).all().map(rowToMap);
  }

  getMap(id) {
    const row = this.db.prepare(`
      SELECT id, project_id, title, description_md, model_json, source_loop_id, created_at, updated_at
      FROM maps WHERE id = ?
    `).get(id);
    return row ? rowToMap(row) : null;
  }

  createMap({ id, title, description_md = "", model, source_loop_id = null }) {
    const project = this.getProject();
    const normalized = normalizeModel(model || createEmptyModel({ id, title }));
    const mapId = uniqueId(id || normalized.id || title, new Set(this.listMaps().map(map => map.id)));
    const now = timestamp();
    this.db.prepare(`
      INSERT INTO maps (id, project_id, title, description_md, model_json, source_loop_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(mapId, project.id, title || normalized.title || mapId, description_md,
      JSON.stringify({ ...normalized, id: mapId, title: title || normalized.title }),
      source_loop_id, now, now);
    return this.getMap(mapId);
  }

  updateMap(id, changes = {}) {
    const current = this.getMap(id);
    if (!current) return null;
    const title = changes.title ?? current.title;
    const model = changes.model
      ? normalizeModel({ ...changes.model, id, title })
      : { ...current.model, title };
    this.db.prepare(`
      UPDATE maps SET title = ?, description_md = ?, model_json = ?, source_loop_id = ?, updated_at = ?
      WHERE id = ?
    `).run(title, changes.description_md ?? current.description_md, JSON.stringify(model),
      changes.source_loop_id ?? current.source_loop_id, timestamp(), id);
    return this.getMap(id);
  }

  deleteMap(id) {
    return this.db.prepare("DELETE FROM maps WHERE id = ?").run(id).changes > 0;
  }

  promoteLoopToMap(loopId) {
    const loop = this.getLoop(loopId);
    if (!loop) return null;
    const existing = this.db.prepare("SELECT id FROM maps WHERE source_loop_id = ?").get(loopId);
    if (existing) return this.getMap(existing.id);
    return this.createMap({
      id: loop.id,
      title: loop.title,
      description_md: loop.description_md,
      model: loop.model,
      source_loop_id: loop.id
    });
  }

  ensureMapsForLoops() {
    for (const loop of this.listLoops()) this.promoteLoopToMap(loop.id);
  }

  listViews(mapId) {
    return this.db.prepare(`
      SELECT id, map_id, title, settings_json, rules_json, style_source, created_at, updated_at
      FROM views WHERE map_id = ? ORDER BY updated_at DESC, title ASC
    `).all(mapId).map(rowToView);
  }

  getView(id) {
    const row = this.db.prepare(`
      SELECT id, map_id, title, settings_json, rules_json, style_source, created_at, updated_at
      FROM views WHERE id = ?
    `).get(id);
    return row ? rowToView(row) : null;
  }

  createView({ id, map_id, title = "Vista padrão", settings = {}, rules = [], style_source = "" }) {
    if (!this.getMap(map_id)) return null;
    // View IDs are global primary keys, even though views are scoped to maps.
    // A common title such as "Matcha" must work on more than one map.
    const ids = new Set(this.db.prepare("SELECT id FROM views").all().map(row => row.id));
    const viewId = uniqueId(id || title, ids);
    const now = timestamp();
    this.db.prepare(`
      INSERT INTO views (id, map_id, title, settings_json, rules_json, style_source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(viewId, map_id, title, JSON.stringify(settings), JSON.stringify(rules), style_source, now, now);
    return this.getView(viewId);
  }

  updateView(id, changes = {}) {
    const current = this.getView(id);
    if (!current) return null;
    this.db.prepare(`
      UPDATE views SET title = ?, settings_json = ?, rules_json = ?, style_source = ?, updated_at = ?
      WHERE id = ?
    `).run(changes.title ?? current.title, JSON.stringify(changes.settings ?? current.settings),
      JSON.stringify(changes.rules ?? current.rules), changes.style_source ?? current.style_source,
      timestamp(), id);
    return this.getView(id);
  }

  deleteView(id) {
    return this.db.prepare("DELETE FROM views WHERE id = ?").run(id).changes > 0;
  }

  listPresentations() {
    return this.db.prepare(`
      SELECT id, project_id, title, presentation_json, revision, created_at, updated_at
      FROM presentations ORDER BY updated_at DESC, title ASC
    `).all().map(rowToPresentation);
  }

  getPresentation(id) {
    const row = this.db.prepare(`
      SELECT id, project_id, title, presentation_json, revision, created_at, updated_at
      FROM presentations WHERE id = ?
    `).get(id);
    return row ? rowToPresentation(row) : null;
  }

  createPresentation({ id, title = "Nova apresentação", scenes = [], presentation, ...data } = {}) {
    const project = this.getProject();
    const presentationId = uniqueId(id || title, new Set(this.listPresentations().map(item => item.id)));
    const now = timestamp();
    const hasPresentationPayload = presentation && typeof presentation === "object";
    const payload = hasPresentationPayload ? { ...presentation } : { ...data, scenes };
    if (!hasPresentationPayload) delete payload.title;
    this.db.prepare(`
      INSERT INTO presentations (id, project_id, title, presentation_json, revision, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(presentationId, project.id, title, JSON.stringify(payload), now, now);
    return this.getPresentation(presentationId);
  }

  updatePresentation(id, changes = {}) {
    const current = this.getPresentation(id);
    if (!current) return null;
    const expectedRevision = changes.expected_revision ?? changes.expectedRevision ?? changes.revision;
    if (expectedRevision !== undefined && Number(expectedRevision) !== current.revision) {
      throw new PresentationConflictError(current);
    }
    const title = changes.title ?? current.title;
    const hasPresentationPayload = changes.presentation && typeof changes.presentation === "object";
    const data = hasPresentationPayload
      ? { ...changes.presentation }
      : { ...current.presentation, ...changes };
    if (!hasPresentationPayload) delete data.title;
    delete data.expected_revision;
    delete data.expectedRevision;
    delete data.revision;
    this.createPresentationVersion(current, "before-update");
    this.db.prepare(`UPDATE presentations SET title = ?, presentation_json = ?, revision = revision + 1, updated_at = ? WHERE id = ?`)
      .run(title, JSON.stringify(data), timestamp(), id);
    return this.getPresentation(id);
  }

  duplicatePresentation(id, { title } = {}) {
    const current = this.getPresentation(id);
    if (!current) return null;
    return this.createPresentation({
      title: title || `${current.title} (cópia)`,
      presentation: JSON.parse(JSON.stringify(current.presentation))
    });
  }

  listPresentationVersions(id) {
    return this.db.prepare(`
      SELECT id, presentation_id, presentation_json, reason, created_at
      FROM presentation_versions WHERE presentation_id = ? ORDER BY id DESC
    `).all(id).map(rowToPresentationVersion);
  }

  restorePresentationVersion(id, versionId) {
    const current = this.getPresentation(id);
    const version = this.db.prepare(`
      SELECT id, presentation_id, presentation_json, reason, created_at
      FROM presentation_versions WHERE id = ? AND presentation_id = ?
    `).get(versionId, id);
    if (!current || !version) return null;
    this.createPresentationVersion(current, "before-restore");
    this.db.prepare(`
      UPDATE presentations SET presentation_json = ?, revision = revision + 1, updated_at = ? WHERE id = ?
    `).run(version.presentation_json, timestamp(), id);
    return this.getPresentation(id);
  }

  createPresentationVersion(presentation, reason = "autosave") {
    if (!presentation?.id) return null;
    this.db.prepare(`
      INSERT INTO presentation_versions (presentation_id, presentation_json, reason, created_at)
      VALUES (?, ?, ?, ?)
    `).run(presentation.id, JSON.stringify(presentation.presentation || {}), reason, timestamp());
    return this.listPresentationVersions(presentation.id)[0] || null;
  }

  deletePresentation(id) {
    return this.db.prepare("DELETE FROM presentations WHERE id = ?").run(id).changes > 0;
  }

  listAssets() {
    return this.db.prepare(`
      SELECT id, project_id, filename, mime_type, kind, sha256, width, height, alt_text,
        focal_x, focal_y, source_json, length(content) AS size, created_at, updated_at
      FROM assets ORDER BY updated_at DESC, filename ASC
    `).all();
  }

  getAsset(id) {
    return this.db.prepare(`
      SELECT id, project_id, filename, mime_type, kind, sha256, width, height, alt_text,
        focal_x, focal_y, source_json, content, created_at, updated_at FROM assets WHERE id = ?
    `).get(id) || null;
  }

  createAsset({ id, filename, mime_type = "application/octet-stream", content, kind, sha256, width, height, alt_text = "", focal_x = 0.5, focal_y = 0.5, source_json = {} }) {
    const project = this.getProject();
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content || "");
    const digest = sha256 || createHash("sha256").update(bytes).digest("hex");
    const existing = this.db.prepare("SELECT id FROM assets WHERE project_id = ? AND sha256 = ? AND sha256 <> '' LIMIT 1").get(project.id, digest);
    if (existing) return this.listAssets().find(asset => asset.id === existing.id);
    const assetId = uniqueId(id || filename, new Set(this.listAssets().map(asset => asset.id)));
    const now = timestamp();
    this.db.prepare(`
      INSERT INTO assets (id, project_id, filename, mime_type, content, kind, sha256, width, height, alt_text, focal_x, focal_y, source_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(assetId, project.id, filename || assetId, mime_type, bytes,
      kind || (mime_type.startsWith("image/") ? "image" : "binary"), digest,
      Number.isFinite(Number(width)) ? Number(width) : null,
      Number.isFinite(Number(height)) ? Number(height) : null,
      String(alt_text || ""), Number.isFinite(Number(focal_x)) ? Number(focal_x) : 0.5,
      Number.isFinite(Number(focal_y)) ? Number(focal_y) : 0.5,
      typeof source_json === "string" ? source_json : JSON.stringify(source_json || {}), now, now);
    return this.listAssets().find(asset => asset.id === assetId);
  }

  deleteAsset(id) {
    return this.db.prepare("DELETE FROM assets WHERE id = ?").run(id).changes > 0;
  }

  exportBundle() {
    const maps = this.listMaps();
    return {
      format: PROJECT_BUNDLE_FORMAT,
      version: 1,
      exported_at: timestamp(),
      project: this.getProject(),
      loops: this.listLoops(),
      maps,
      views: maps.flatMap(map => this.listViews(map.id)),
      presentations: this.listPresentations(),
      assets: this.listAssets().map(asset => {
        const record = this.getAsset(asset.id);
        return {
          ...asset,
          content_base64: Buffer.from(record.content).toString("base64")
        };
      })
    };
  }

  importBundle(bundle) {
    if (![PROJECT_BUNDLE_FORMAT, LEGACY_PROJECT_BUNDLE_FORMAT].includes(bundle?.format) || bundle.version !== 1 || !bundle.project) {
      throw new Error("Invalid Trama project bundle.");
    }
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.exec("DELETE FROM projects");
      this.ensureProject({
        id: bundle.project.id || DEFAULT_PROJECT_ID,
        title: bundle.project.title,
        description_md: bundle.project.description_md
      });
      for (const loop of bundle.loops || []) {
        this.createLoop({
          id: loop.id,
          title: loop.title,
          summary: loop.summary,
          description_md: loop.description_md,
          model: loop.model
        });
      }
      for (const map of bundle.maps || []) {
        this.createMap({
          id: map.id,
          title: map.title,
          description_md: map.description_md,
          model: map.model,
          source_loop_id: map.source_loop_id
        });
      }
      for (const view of bundle.views || []) {
        this.createView({
          id: view.id,
          map_id: view.map_id,
          title: view.title,
          settings: view.settings,
          rules: view.rules,
          style_source: view.style_source
        });
      }
      for (const item of bundle.presentations || []) {
        this.createPresentation({ id: item.id, title: item.title, ...(item.presentation || {}) });
      }
      for (const asset of bundle.assets || []) {
        this.createAsset({
          id: asset.id,
          filename: asset.filename,
          mime_type: asset.mime_type,
          kind: asset.kind,
          sha256: asset.sha256,
          width: asset.width,
          height: asset.height,
          alt_text: asset.alt_text,
          focal_x: asset.focal_x,
          focal_y: asset.focal_y,
          source_json: asset.source_json,
          content: Buffer.from(asset.content_base64 || "", "base64")
        });
      }
      this.db.exec("COMMIT");
      return this.exportBundle();
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  seed(models) {
    for (const source of models) {
      const { presentation: authoredPresentation, story: legacyStory, ...model } = source;
      const presentation = authoredPresentation || (legacyStory?.steps?.length
        ? migrateStoryToPresentation(legacyStory, model, { id: `${model.id}-presentation` })
        : null);
      this.createLoop({
        id: model.id,
        title: model.title || model.id,
        summary: model.description || "",
        description_md: model.description || "",
        model
      });
      if (presentation) {
        this.createPresentation({
          id: presentation.id || `${model.id}-presentation`,
          title: presentation.title || model.title || model.id,
          presentation: bindPresentationToMap(presentation, model.id)
        });
      }
    }
  }

  backfillSeedModels(models) {
    const seeds = new Map(models.map(model => [model.id, model]));
    const presentations = this.listPresentations();
    for (const loop of this.listLoops()) {
      const seed = seeds.get(loop.id);
      if (!seed) continue;
      const missingLoops = !(loop.model.loops || []).length && (seed.loops || []).length;
      if (missingLoops) {
        this.updateLoop(loop.id, {
          title: loop.title,
          summary: loop.summary || seed.description || "",
          description_md: loop.description_md || seed.description || "",
          model: { ...loop.model, loops: seed.loops }
        });
      }
      const { presentation: authoredPresentation, story: legacyStory, ...seedModel } = seed;
      const presentation = authoredPresentation || (legacyStory?.steps?.length
        ? migrateStoryToPresentation(legacyStory, seedModel, { id: `${loop.id}-presentation` })
        : null);
      const hasPresentation = presentations.some(record => record.id === presentation?.id ||
        (record.presentation?.chapters || []).some(chapter =>
          (chapter.scenes || []).some(scene => scene.mapRef?.mapId === loop.id)));
      if (presentation && !hasPresentation) {
        const created = this.createPresentation({
          id: presentation.id || `${loop.id}-presentation`,
          title: presentation.title || loop.title,
          presentation: bindPresentationToMap(presentation, loop.id)
        });
        presentations.push(created);
      }
    }
  }
}

function bindPresentationToMap(presentation, mapId) {
  return {
    ...presentation,
    chapters: (presentation.chapters || []).map(chapter => ({
      ...chapter,
      scenes: (chapter.scenes || []).map(scene => ({
        ...scene,
        mapRef: { ...(scene.mapRef || {}), mapId }
      }))
    }))
  };
}

export function rowToLoop(row) {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    summary: row.summary,
    description_md: row.description_md,
    model: JSON.parse(row.model_json),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function rowToMap(row) {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    description_md: row.description_md,
    model: JSON.parse(row.model_json),
    source_loop_id: row.source_loop_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function rowToView(row) {
  return {
    id: row.id,
    map_id: row.map_id,
    title: row.title,
    settings: JSON.parse(row.settings_json),
    rules: JSON.parse(row.rules_json),
    style_source: row.style_source,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function rowToPresentation(row) {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    revision: Number(row.revision || 1),
    presentation: JSON.parse(row.presentation_json),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function rowToPresentationVersion(row) {
  return {
    id: row.id,
    presentation_id: row.presentation_id,
    presentation: JSON.parse(row.presentation_json),
    reason: row.reason,
    created_at: row.created_at
  };
}

export class PresentationConflictError extends Error {
  constructor(current) {
    super(`Presentation revision conflict: expected a stale revision for ${current.id}.`);
    this.name = "PresentationConflictError";
    this.status = 409;
    this.current = current;
  }
}

function timestamp() {
  return new Date().toISOString();
}
