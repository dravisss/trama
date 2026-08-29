import { normalizePresentation } from "../../presentation/schema.js";

/**
 * Application command for applying one authored Presentation V2 snapshot.
 *
 * History, dirty state, lint and rendering remain composition concerns. This
 * command only normalizes the boundary, compares semantic snapshots and
 * returns immutable-looking values for the shell to commit.
 */
export function createEditPresentation() {
  return {
    execute({ current, next } = {}) {
      if (!isSnapshot(current) || !isSnapshot(next)) {
        throw new TypeError("EditPresentation requires current and next Presentation snapshots.");
      }

      const previous = normalizePresentation(current);
      const presentation = normalizePresentation(next);
      return {
        changed: JSON.stringify(previous) !== JSON.stringify(presentation),
        previous,
        presentation
      };
    }
  };
}

function isSnapshot(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
