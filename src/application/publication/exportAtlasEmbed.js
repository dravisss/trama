import { collectAtlasEmbedAssetIds, createAtlasEmbedHtml } from "../../export/atlasEmbed.js";
import { createAtlasRenditionPlan } from "../../export/atlasRenditions.js";
import { compilePresentation } from "../../presentation/compiler.js";
import { requirePublicationAssets } from "../ports/publicationAssets.js";
import { requireStandalonePublisher } from "../ports/standalonePublisher.js";

/** Publish the final Atlas presentation product without the generic viewer. */
export function createExportAtlasEmbed({ assetProvider, publisher, htmlFactory = createAtlasEmbedHtml } = {}) {
  const assets = requirePublicationAssets(assetProvider);
  const output = requireStandalonePublisher(publisher);
  if (typeof htmlFactory !== "function") throw new TypeError("ExportAtlasEmbed requires an HTML factory.");
  return {
    async execute({ filename, ...snapshot } = {}) {
      if (!filename) throw new TypeError("ExportAtlasEmbed requires a filename.");
      const assetIds = collectAtlasEmbedAssetIds(snapshot);
      const resources = await assets.load({ assetIds });
      const compiled = compilePresentation(snapshot.presentation, { model: snapshot.model, views: snapshot.views || [], assets: resources.assets || [] });
      const renditionPlan = createAtlasRenditionPlan({ model: snapshot.model, timeline: compiled.timeline });
      const publicationAssets = typeof assets.createRenditions === "function"
        ? await assets.createRenditions({ assets: resources.assets || [], plan: renditionPlan })
        : resources.assets;
      const html = htmlFactory({ ...snapshot, ...resources, assets: publicationAssets });
      const publication = await output.publish({ filename, html, mimeType: "text/html" });
      return { filename, html, ...(publication || {}) };
    }
  };
}
