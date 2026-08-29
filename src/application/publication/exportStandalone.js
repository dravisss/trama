import { createStandaloneHtml } from "../../export/standalone.js";
import { requirePublicationAssets } from "../ports/publicationAssets.js";
import { requireStandalonePublisher } from "../ports/standalonePublisher.js";

/**
 * Application command for publishing one self-contained standalone snapshot.
 *
 * The command owns the publication sequence but not the browser, HTTP,
 * filesystem, DOM, React, Cytoscape, or SQLite. It receives a complete
 * snapshot from the composition root, loads publishable resources through a
 * port, compiles the existing V3 envelope, and delegates delivery.
 */
export function createExportStandalone({ assetProvider, publisher, htmlFactory = createStandaloneHtml } = {}) {
  const assets = requirePublicationAssets(assetProvider);
  const output = requireStandalonePublisher(publisher);
  if (typeof htmlFactory !== "function") {
    throw new TypeError("ExportStandalone requires an HTML factory.");
  }

  return {
    async execute({ filename, ...snapshot } = {}) {
      if (!filename) throw new TypeError("ExportStandalone requires a filename.");
      const resources = await assets.load();
      const html = htmlFactory({ ...snapshot, ...resources });
      const publication = await output.publish({ filename, html, mimeType: "text/html" });
      return { filename, html, ...(publication || {}) };
    }
  };
}
