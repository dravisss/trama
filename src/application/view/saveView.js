import { requireViewRepository } from "../ports/viewRepository.js";
import { normalizeViewSnapshot } from "./viewSnapshot.js";

/**
 * Application command for persisting one authored view.
 *
 * A preview never reaches this command. The caller explicitly submits the
 * current view and its map reference when the user chooses Save.
 */
export function createSaveView({ viewRepository } = {}) {
  const repository = requireViewRepository(viewRepository);

  return {
    execute({ view } = {}) {
      return repository.update(normalizeViewSnapshot(view));
    }
  };
}
