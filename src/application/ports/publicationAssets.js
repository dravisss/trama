/**
 * Runtime contract for loading the self-contained resources required by a
 * standalone publication.
 */
export function requirePublicationAssets(assetProvider) {
  if (!assetProvider || typeof assetProvider.load !== "function") {
    throw new TypeError("ExportStandalone requires a PublicationAssets provider with load().");
  }
  return assetProvider;
}
