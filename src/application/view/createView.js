import { requireViewRepository } from "../ports/viewRepository.js";
import { normalizeViewSnapshot } from "./viewSnapshot.js";

/**
 * Application command for creating one authored view without duplicating its
 * map. Offline fallback remains a composition-root concern.
 */
export function createCreateView({ viewRepository } = {}) {
  const repository = requireViewRepository(viewRepository, "create");

  return {
    execute({ view } = {}) {
      return repository.create(normalizeViewSnapshot(view, { requireId: false }));
    }
  };
}
