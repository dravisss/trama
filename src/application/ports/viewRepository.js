/**
 * Runtime check for the ViewRepository port used by SaveView.
 *
 * The port deals in authored view snapshots. Transport, SQLite and the
 * workspace entry shape stay outside the application layer.
 */
export function requireViewRepository(repository, operation = "update") {
  if (!repository || typeof repository[operation] !== "function") {
    throw new TypeError(`View application requires a ViewRepository with ${operation}(view).`);
  }
  return repository;
}
