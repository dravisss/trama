import { normalizePresentation } from "../../presentation/schema.js";
import { requirePresentationRepository } from "../ports/presentationRepository.js";

/**
 * Application command for persisting one authored Presentation V2 snapshot.
 *
 * The command chooses create/update from the explicit persisted id and keeps
 * revision checks in the repository contract. It does not know the DOM,
 * React, the Story Studio renderer, HTTP or SQLite.
 */
export function createSavePresentation({ presentationRepository } = {}) {
  const repository = requirePresentationRepository(presentationRepository);

  return {
    execute({ id, expectedRevision, presentation } = {}) {
      if (!isSnapshot(presentation)) {
        throw new TypeError("SavePresentation requires a Presentation snapshot.");
      }

      const snapshot = normalizePresentation(presentation);
      if (id) {
        const request = {
          id,
          title: snapshot.title,
          presentation: snapshot
        };
        if (expectedRevision !== undefined) request.expected_revision = expectedRevision;
        return repository.update(request);
      }
      return repository.create({ title: snapshot.title, presentation: snapshot });
    }
  };
}

function isSnapshot(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
