/**
 * Runtime contract for handing one generated standalone document to its
 * publication surface (browser download, file system, or another adapter).
 */
export function requireStandalonePublisher(publisher) {
  if (!publisher || typeof publisher.publish !== "function") {
    throw new TypeError("ExportStandalone requires a StandalonePublisher with publish().");
  }
  return publisher;
}
