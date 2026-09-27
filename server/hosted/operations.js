/**
 * Workspace operations shared by the agent REST API (`/api/v1`), the MCP
 * server and — through them — the CLI. Each operation returns plain JSON so
 * transports only translate inputs and errors.
 */
import { HttpError } from "../http.js";
import {
  analyzeModel,
  compileMapSource,
  compileStorySource,
  mapToMarkdown,
  presentationMapIds,
  summarizeWorkspace,
  upsertMap,
  upsertPresentationForMap
} from "./authoring.js";
import { serializePresentationMarkdown } from "../../src/language/presentationMarkdown.js";

const ALLOWED_ASSET_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml"
]);

export function createOperations({ registry, config }) {
  const { limits } = config;

  function links(record, { editToken } = {}) {
    const base = config.publicUrl;
    return {
      ...(editToken ? {
        edit_url: `${base}/w/${editToken}`,
        mcp_url: `${base}/w/${editToken}/mcp`
      } : {}),
      share_url: `${base}/p/${record.share_token}`,
      present_url: `${base}/p/${record.share_token}?mode=presentation`,
      api_base: `${base}/api/v1`,
      mcp_endpoint: `${base}/mcp`
    };
  }

  function mapLinks(record, mapId) {
    const share = `${config.publicUrl}/p/${record.share_token}?map=${encodeURIComponent(mapId)}`;
    return { share_url: share, present_url: `${share}&mode=presentation` };
  }

  function storeFor(record) {
    return registry.store(record.id);
  }

  /** Quotas protect a single shared VPS from any one anonymous workspace. */
  function enforceQuota(record, kind, { create = false } = {}) {
    const store = storeFor(record);
    if (registry.fileSize(record.id) > limits.workspaceBytes) {
      throw new HttpError(413, `This workspace reached its storage limit (${Math.round(limits.workspaceBytes / 1048576)} MB). Delete old maps, presentations or images.`);
    }
    if (!create) return;
    const checks = {
      map: [() => store.listLoops().length, limits.mapsPerWorkspace, "maps"],
      presentation: [() => store.listPresentations().length, limits.presentationsPerWorkspace, "presentations"],
      asset: [() => store.listAssets().length, limits.assetsPerWorkspace, "images"],
      view: [() => store.listMaps().reduce((total, map) => total + store.listViews(map.id).length, 0), limits.viewsPerWorkspace, "views"]
    };
    const check = checks[kind];
    if (check && check[0]() >= check[1]) {
      throw new HttpError(409, `This workspace reached its limit of ${check[1]} ${check[2]}.`);
    }
  }

  function validateAsset({ mime_type, content }) {
    if (!ALLOWED_ASSET_TYPES.has(String(mime_type || ""))) {
      throw new HttpError(415, "Only PNG, JPEG, GIF, WebP, AVIF and SVG images can be uploaded.");
    }
    if (!content?.length) throw new HttpError(400, "The image is empty.");
    if (content.length > limits.assetBytes) {
      throw new HttpError(413, `Images are limited to ${Math.round(limits.assetBytes / 1048576)} MB.`);
    }
  }

  function validateBundle(bundle) {
    if (!["trama-project", "loopviewer-project"].includes(bundle?.format) || bundle.version !== 1 || !bundle.project) {
      throw new HttpError(400, "Invalid Trama project bundle.");
    }
    if ((bundle.loops || []).length > limits.mapsPerWorkspace) throw new HttpError(409, "The bundle has too many maps.");
    if ((bundle.presentations || []).length > limits.presentationsPerWorkspace) throw new HttpError(409, "The bundle has too many presentations.");
    if ((bundle.assets || []).length > limits.assetsPerWorkspace) throw new HttpError(409, "The bundle has too many images.");
    for (const asset of bundle.assets || []) {
      validateAsset({ mime_type: asset.mime_type, content: Buffer.from(asset.content_base64 || "", "base64") });
    }
  }

  function touched(record) {
    const store = storeFor(record);
    registry.markWrite(record.id, store.getProject()?.title);
  }

  function workspaceInfo(record, extra = {}) {
    const store = storeFor(record);
    return {
      id: record.id,
      title: store.getProject()?.title || record.title,
      created_at: record.created_at,
      ...links(record, extra),
      ...summarizeWorkspace(store)
    };
  }

  function requireMap(store, id) {
    const loop = store.getLoop(id);
    if (!loop) throw new HttpError(404, `Map "${id}" not found. Use list_maps to see the ids in this workspace.`);
    return loop;
  }

  return {
    links,
    enforceQuota,
    validateAsset,
    validateBundle,
    touched,
    storeFor,

    createWorkspace({ title, description_md, seed = "starter", bundle } = {}) {
      if (bundle) validateBundle(bundle);
      if (!["starter", "examples", "empty"].includes(seed)) throw new HttpError(400, "seed must be starter, examples or empty.");
      const { workspace, editToken } = registry.create({ title, description_md, seed, bundle });
      return {
        workspace: {
          ...workspaceInfo(workspace, { editToken }),
          edit_token: editToken
        },
        notice: "Keep edit_token/edit_url private: they grant full edit access and cannot be recovered. Share share_url for read-only access."
      };
    },

    getWorkspace(record) {
      return { workspace: workspaceInfo(record) };
    },

    updateWorkspace(record, { title, description_md } = {}) {
      enforceQuota(record, "project");
      const store = storeFor(record);
      store.updateProject({
        title: typeof title === "string" ? title.slice(0, 160) : undefined,
        description_md: typeof description_md === "string" ? description_md : undefined
      });
      touched(record);
      return { workspace: workspaceInfo(registry.get(record.id)) };
    },

    deleteWorkspace(record) {
      registry.delete(record.id);
      return { ok: true, deleted: record.id };
    },

    rotateShare(record) {
      const next = registry.rotateShareToken(record.id);
      return { workspace: workspaceInfo(next), notice: "The previous share link no longer works." };
    },

    exportWorkspace(record) {
      return storeFor(record).exportBundle();
    },

    listMaps(record) {
      return { maps: summarizeWorkspace(storeFor(record)).maps };
    },

    getMap(record, id, { format = "json" } = {}) {
      const store = storeFor(record);
      const loop = requireMap(store, id);
      const presentation = store.listPresentations().find(item => presentationMapIds(item).includes(id));
      return {
        map: {
          id: loop.id,
          title: loop.title,
          summary: loop.summary,
          description_md: loop.description_md,
          updated_at: loop.updated_at,
          ...(format === "markdown" ? { markdown: mapToMarkdown(loop) } : { model: loop.model }),
          presentation_id: presentation?.id || null
        },
        report: analyzeModel(loop.model),
        links: mapLinks(record, id)
      };
    },

    validateMap(input = {}) {
      const { model, format, report } = compileMapSource(input);
      return { valid: true, format, map_id: model.id, title: model.title, report, model: input.include_model ? model : undefined };
    },

    saveMap(record, input = {}, { id } = {}) {
      const store = storeFor(record);
      const { model, format, report } = compileMapSource({ ...input, ...(id ? { id } : {}) });
      const exists = Boolean(store.getLoop(model.id));
      enforceQuota(record, "map", { create: !exists });
      const { loop, created } = upsertMap(store, {
        model,
        title: input.title,
        description_md: input.description_md,
        summary: input.summary
      });
      touched(record);
      return {
        created,
        format,
        map: { id: loop.id, title: loop.title, nodes: loop.model.nodes.length, edges: loop.model.edges.length },
        report,
        links: mapLinks(record, loop.id)
      };
    },

    deleteMap(record, id) {
      const store = storeFor(record);
      requireMap(store, id);
      if (store.listLoops().length <= 1) {
        throw new HttpError(409, "A workspace keeps at least one map. Replace it with save_map instead of deleting it.");
      }
      store.deleteLoop(id);
      store.deleteMap(id);
      touched(record);
      return { ok: true, deleted: id };
    },

    validateStory(record, { map_id, map, markdown, presentation } = {}) {
      let model;
      if (map && typeof map === "object") model = compileMapSource(map).model;
      else if (record && map_id) model = requireMap(storeFor(record), map_id).model;
      else throw new HttpError(400, "Provide map_id (with a workspace token) or map (markdown/mermaid/model) to validate against.");
      const { presentation: compiled, lint } = compileStorySource({ markdown, presentation }, { model });
      return { valid: true, lint, scenes: lint.scenes, beats: lint.beats, map_id: model.id, title: compiled.title };
    },

    savePresentation(record, mapId, { markdown, presentation, title, id } = {}) {
      const store = storeFor(record);
      const loop = requireMap(store, mapId);
      const { presentation: compiled, lint } = compileStorySource({ markdown, presentation, title }, { model: loop.model });
      const existing = store.listPresentations().find(item => presentationMapIds(item).includes(mapId));
      enforceQuota(record, "presentation", { create: !existing && !(id && store.getPresentation(id)) });
      const saved = upsertPresentationForMap(store, { mapId, presentation: compiled, id, title });
      touched(record);
      return {
        created: saved.created,
        presentation: { id: saved.presentation.id, title: saved.presentation.title, revision: saved.presentation.revision, map_id: mapId },
        lint,
        links: mapLinks(record, mapId)
      };
    },

    listPresentations(record) {
      return { presentations: summarizeWorkspace(storeFor(record)).presentations };
    },

    getPresentation(record, { id, map_id, format = "json" } = {}) {
      const store = storeFor(record);
      const found = id
        ? store.getPresentation(id)
        : store.listPresentations().find(item => presentationMapIds(item).includes(map_id));
      if (!found) throw new HttpError(404, "Presentation not found.");
      const markdown = format === "markdown"
        ? found.presentation?.source_md || serializePresentationMarkdown(found.presentation, { mode: "editorial" })
        : undefined;
      return {
        presentation: {
          id: found.id,
          title: found.title,
          revision: found.revision,
          map_ids: presentationMapIds(found),
          updated_at: found.updated_at,
          ...(format === "markdown" ? { markdown } : { data: found.presentation })
        }
      };
    },

    deletePresentation(record, id) {
      const store = storeFor(record);
      if (!store.deletePresentation(id)) throw new HttpError(404, "Presentation not found.");
      touched(record);
      return { ok: true, deleted: id };
    },

    /** One call for the common agent flow: map + story -> share links. */
    publish(record, { map = {}, story = null } = {}) {
      const savedMap = this.saveMap(record, map);
      const savedStory = story && (story.markdown || story.presentation)
        ? this.savePresentation(record, savedMap.map.id, story)
        : null;
      return {
        map: savedMap.map,
        report: savedMap.report,
        presentation: savedStory?.presentation || null,
        lint: savedStory?.lint || null,
        links: savedMap.links
      };
    }
  };
}
