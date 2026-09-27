/**
 * Read-only share links (`/p/<share-token>`).
 *
 * A share link renders the same standalone publication the editor exports as
 * HTML, generated on the server from the workspace store. It carries no API
 * access: the page is self-contained and cannot write anything.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createStandaloneHtml } from "../../src/export/standalone.js";
import { resolveView } from "../../src/core/views.js";
import { presentationMapIds } from "./authoring.js";

const CACHE_LIMIT = 32;

export function createShareRenderer({ root, productName = "Trama" }) {
  const cache = new Map();
  let runtimeAssets = null;

  async function loadRuntime() {
    if (runtimeAssets && process.env.TRAMA_DEV !== "1") return runtimeAssets;
    const [runtime, styles, fonts] = await Promise.all([
      readFile(resolve(root, "dist", "standalone-runtime.iife.js"), "utf8"),
      readFile(resolve(root, "standalone.css"), "utf8"),
      readFile(resolve(root, "dist", "standalone-fonts.css"), "utf8")
    ]);
    runtimeAssets = { runtime, styles: `${fonts}\n${styles}` };
    return runtimeAssets;
  }

  /**
   * @param {object} options
   * @param {import("../../src/platform/projectStore.js").ProjectStore} options.store
   * @param {string} options.cacheKey changes whenever the workspace changes
   * @param {string} [options.mapId] map to open first
   * @param {boolean} [options.presentationOnly]
   */
  async function render({ store, cacheKey, mapId = null, presentationOnly = false, sidebar = true }) {
    const key = `${cacheKey}|${mapId || ""}|${presentationOnly ? 1 : 0}|${sidebar ? 1 : 0}`;
    if (cache.has(key)) return cache.get(key);
    const { runtime, styles } = await loadRuntime();
    const project = store.getProject();
    const presentations = store.listPresentations();
    const maps = store.listMaps().map(map => ({ ...map, views: store.listViews(map.id) }));
    const loops = store.listLoops().map(loop => {
      const map = maps.find(item => item.source_loop_id === loop.id || item.id === loop.id);
      const record = presentations.find(item => presentationMapIds(item).includes(loop.id));
      return {
        id: loop.id,
        title: loop.title,
        summary: loop.summary,
        description_md: loop.description_md,
        model: loop.model,
        view: resolveEntryView(map),
        presentation: record?.presentation || null
      };
    });
    if (!loops.length) return null;
    const active = loops.find(loop => loop.id === mapId) || loops[0];
    const assets = store.listAssets().map(asset => {
      const record = store.getAsset(asset.id);
      return {
        ...asset,
        data_url: `data:${asset.mime_type};base64,${Buffer.from(record.content).toString("base64")}`
      };
    });
    const base = {
      model: active.model,
      project: { id: project?.id, title: project?.title || "Trama", description_md: project?.description_md || "" },
      loops,
      activeLoopId: active.id,
      runtime,
      styles,
      maps: maps.map(map => ({ id: map.id, title: map.title, model: map.model })),
      views: maps.flatMap(map => map.views),
      embed: { sidebar, presentationOnly }
    };
    let html;
    try {
      html = createStandaloneHtml({
        ...base,
        presentation: active.presentation,
        presentations: presentations.map(item => item.presentation ? { ...item.presentation, id: item.presentation.id || item.id, title: item.title } : null).filter(Boolean),
        assets
      });
    } catch (error) {
      // A presentation that no longer matches its map must not take the map
      // down with it: publish the maps alone and let the author fix the story.
      console.warn(`[share] publishing without presentations: ${error.message}`);
      html = createStandaloneHtml({
        ...base,
        loops: loops.map(loop => ({ ...loop, presentation: null })),
        presentation: null,
        presentations: [],
        assets
      });
    }
    html = html.replace(/ — (?:LoopViewer|Trama)<\/title>/, ` — ${escapeTitle(productName)}</title>`);
    cache.set(key, html);
    while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
    return html;
  }

  return { render, clear: () => cache.clear() };
}

function escapeTitle(value) {
  return String(value).replace(/[<>&"]/g, "");
}

function resolveEntryView(map) {
  const view = map?.views?.[0];
  if (!view) return null;
  try {
    return resolveView(view, map.views);
  } catch {
    return view;
  }
}
