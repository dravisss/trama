/**
 * Browser download adapter for generated standalone HTML.
 */
export function createBrowserStandalonePublisher({ downloadText } = {}) {
  if (typeof downloadText !== "function") {
    throw new TypeError("createBrowserStandalonePublisher requires downloadText.");
  }

  return {
    publish({ filename, html, mimeType = "text/html" } = {}) {
      downloadText(filename, html, mimeType);
      return { filename, mimeType };
    }
  };
}
