import { serializeLoopStyle } from "../../language/styleLanguage.js";
import { requireViewRepository } from "../ports/viewRepository.js";
import { normalizeViewSnapshot } from "./viewSnapshot.js";

/**
 * Application command for creating a view that inherits the selected view.
 * It intentionally persists only the inheritance declaration and no copied
 * rules, so later edits remain owned by the base view resolution contract.
 */
export function createDeriveView({ viewRepository } = {}) {
  const repository = requireViewRepository(viewRepository, "create");

  function draft({ view } = {}) {
    const source = normalizeViewSnapshot(view);
    const derived = {
      map_id: source.map_id,
      title: `${source.title} derivada`,
      settings: { extends: source.id },
      rules: [],
      style_source: ""
    };
    derived.style_source = serializeLoopStyle(derived);
    return derived;
  }

  return {
    draft,
    execute({ view } = {}) {
      return repository.create(draft({ view }));
    }
  };
}
