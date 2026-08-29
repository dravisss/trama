/**
 * Runtime check for the MapRepository port used by application services.
 *
 * The port intentionally exposes only the operation required by SaveMap.
 * Storage, transport and UI entry shapes stay outside the application layer.
 */
export function requireMapRepository(repository) {
  if (!repository || typeof repository.update !== "function") {
    throw new TypeError("SaveMap requires a MapRepository with update(map).");
  }
  return repository;
}
