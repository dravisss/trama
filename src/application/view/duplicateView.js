import { serializeLoopStyle } from "../../language/styleLanguage.js";
import { requireViewRepository } from "../ports/viewRepository.js";
import { normalizeViewSnapshot } from "./viewSnapshot.js";

/**
 * Application command for creating an independent copy of an authored view.
 * The cloned snapshot is still associated with the same map; only the
 * repository adapter knows how that snapshot reaches persistence.
 */
export function createDuplicateView({ viewRepository } = {}) {
  const repository = requireViewRepository(viewRepository, "create");

  function draft({ view } = {}) {
    const source = normalizeViewSnapshot(view);
    const copy = {
      map_id: source.map_id,
      title: `${source.title} cópia`,
      settings: { ...source.settings },
      rules: source.rules.map(rule => ({
        selector: { ...(rule.selector || {}) },
        properties: { ...(rule.properties || {}) }
      })),
      style_source: ""
    };
    copy.style_source = serializeLoopStyle(copy);
    return copy;
  }

  return {
    draft,
    execute({ view } = {}) {
      return repository.create(draft({ view }));
    }
  };
}
