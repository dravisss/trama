/**
 * Runtime check for the PresentationRepository port used by SavePresentation.
 *
 * The port deals in authored V2 snapshots and revision metadata. Transport,
 * storage and Story Studio state stay outside the application layer.
 */
export function requirePresentationRepository(repository) {
  if (!repository || typeof repository.create !== "function" || typeof repository.update !== "function") {
    throw new TypeError("SavePresentation requires a PresentationRepository with create() and update().");
  }
  return repository;
}
