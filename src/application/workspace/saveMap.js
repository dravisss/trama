import { requireMapRepository } from "../ports/mapRepository.js";

/**
 * Application command for persisting the authored state of one map.
 *
 * The command accepts a map snapshot, not a UI entry. It has no knowledge of
 * React, the DOM, Cytoscape, HTTP or SQLite; those concerns belong to the
 * repository adapter supplied by the composition root.
 */
export function createSaveMap({ mapRepository } = {}) {
  const repository = requireMapRepository(mapRepository);

  return {
    execute({ map } = {}) {
      return repository.update(toMapSnapshot(map));
    }
  };
}

function toMapSnapshot(map) {
  if (!map || typeof map !== "object") {
    throw new TypeError("SaveMap requires a map snapshot.");
  }
  if (!map.id) {
    throw new TypeError("SaveMap requires a map id.");
  }
  if (!map.model || typeof map.model !== "object") {
    throw new TypeError("SaveMap requires a map model.");
  }

  return {
    id: map.id,
    title: map.title ?? map.label ?? map.model.title ?? map.id,
    description_md: map.description_md ?? map.description ?? map.model.description ?? "",
    model: map.model
  };
}
