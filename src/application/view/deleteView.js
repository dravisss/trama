import { requireViewRepository } from "../ports/viewRepository.js";
import { normalizeViewSnapshot } from "./viewSnapshot.js";

/**
 * Application command for removing one persisted view. The composition root
 * decides how the active in-memory selection is reconciled after success.
 */
export function createDeleteView({ viewRepository } = {}) {
  const repository = requireViewRepository(viewRepository, "delete");

  return {
    execute({ view } = {}) {
      return repository.delete(normalizeViewSnapshot(view));
    }
  };
}
