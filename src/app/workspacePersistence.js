/**
 * Local-first persistence boundary for the application shell.
 *
 * This module deliberately knows nothing about DOM or render functions. It
 * owns API-shaped reads/writes and keeps the legacy loop boundary stable while
 * map writes are delegated to the MapRepository adapter used by SaveMap.
 */

import { createApiMapRepository } from "../adapters/api/mapRepository.js";
import { createApiPresentationRepository } from "../adapters/api/presentationRepository.js";
import { createApiViewRepository } from "../adapters/api/viewRepository.js";

export function createWorkspacePersistence({
  fetcher,
  snapshotEntry = entry => entry,
  toEntry = loop => loop,
  isAvailable = () => true,
  mapRepository: providedMapRepository,
  presentationRepository: providedPresentationRepository,
  viewRepository: providedViewRepository
} = {}) {
  if (typeof fetcher !== "function") {
    throw new TypeError("createWorkspacePersistence requires a fetcher");
  }

  const saveQueues = new Map();
  const mapRepository = providedMapRepository || createApiMapRepository({ fetcher, isAvailable });
  const presentationRepository = providedPresentationRepository || createApiPresentationRepository({ fetcher, isAvailable });
  const viewRepository = providedViewRepository || createApiViewRepository({ fetcher, isAvailable });

  async function loadProject() {
    const data = await fetcher("/api/project");
    // The project endpoint already carries the asset inventory. Keep the
    // fallback for older/custom API boundaries, but avoid fetching the same
    // metadata twice on the normal local server path.
    if (Array.isArray(data?.assets)) return data;
    const assets = await fetcher("/api/assets").catch(() => ({ assets: [] }));
    return {
      ...(data || {}),
      assets: assets?.assets || []
    };
  }

  async function loadLocalProjects() {
    const data = await fetcher("/api/projects");
    return data?.projects || [];
  }

  async function createLoop(entry) {
    if (!isAvailable()) return entry;
    const data = await fetcher("/api/loops", {
      method: "POST",
      body: {
        title: entry.label,
        summary: entry.summary || "",
        description_md: entry.description_md || "",
        model: entry.model
      }
    });
    return toEntry(data.loop);
  }

  function saveLoop({ entry } = {}) {
    if (!entry) return Promise.resolve(null);
    if (!isAvailable() || !entry.persisted) return Promise.resolve(null);

    const snapshot = snapshotEntry(entry);
    const key = entry.id || snapshot.id;
    const previous = saveQueues.get(key) || Promise.resolve();
    const task = previous.catch(() => null).then(() => fetcher(`/api/loops/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: {
        title: snapshot.label || snapshot.model?.title || snapshot.id,
        summary: snapshot.summary || snapshot.model?.description || "",
        description_md: snapshot.description_md || snapshot.model?.description || "",
        model: snapshot.model
      }
    }));
    saveQueues.set(key, task);
    return task.finally(() => {
      if (saveQueues.get(key) === task) saveQueues.delete(key);
    });
  }

  function saveMap({ entry } = {}) {
    if (!entry) return Promise.resolve(null);
    if (!isAvailable() || !entry.persisted) return Promise.resolve(null);

    const snapshot = snapshotEntry(entry);
    return mapRepository.update({
      id: snapshot.id || entry.id,
      title: snapshot.label || snapshot.title || snapshot.model?.title || snapshot.id,
      description_md: snapshot.description_md || snapshot.model?.description || "",
      model: snapshot.model
    });
  }

  return {
    loadProject,
    loadLocalProjects,
    createLoop,
    saveLoop,
    saveMap,
    mapRepository,
    presentationRepository,
    viewRepository,
    clear() {
      saveQueues.clear();
      mapRepository.clear?.();
      presentationRepository.clear?.();
      viewRepository.clear?.();
    }
  };
}
