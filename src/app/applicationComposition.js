import { createEngineMapEditor } from "../adapters/engine/mapEditor.js";
import { createBrowserPublicationAssets } from "../adapters/browser/publicationAssets.js";
import { createBrowserStandalonePublisher } from "../adapters/browser/standalonePublisher.js";
import { createEditMap } from "../application/map/editMap.js";
import { createExportStandalone } from "../application/publication/exportStandalone.js";
import { createExportAtlasEmbed } from "../application/publication/exportAtlasEmbed.js";
import { createEditPresentation } from "../application/presentation/editPresentation.js";
import { createSavePresentation } from "../application/presentation/savePresentation.js";
import { createCreateView } from "../application/view/createView.js";
import { createDeleteView } from "../application/view/deleteView.js";
import { createDeriveView } from "../application/view/deriveView.js";
import { createDuplicateView } from "../application/view/duplicateView.js";
import { createSaveView } from "../application/view/saveView.js";
import { createSaveMap } from "../application/workspace/saveMap.js";
import { createWorkspacePersistence } from "./workspacePersistence.js";

/**
 * Composition boundary for application services and browser adapters.
 *
 * The legacy entrypoint still owns UI policy and compatibility listeners, but
 * it no longer decides which repository, publication adapter, or application
 * command implementation is wired to the runtime.
 */
export function createApplicationComposition({
  engine,
  fetcher,
  snapshotEntry,
  toEntry,
  isAvailable,
  resourceFetcher,
  downloadText
} = {}) {
  const mapEditor = createEngineMapEditor({ engine });
  const editMapCommand = createEditMap({ mapEditor });
  const workspacePersistence = createWorkspacePersistence({
    fetcher,
    snapshotEntry,
    toEntry,
    isAvailable
  });
  const saveMap = createSaveMap({ mapRepository: workspacePersistence.mapRepository });
  const saveView = createSaveView({ viewRepository: workspacePersistence.viewRepository });
  const createView = createCreateView({ viewRepository: workspacePersistence.viewRepository });
  const duplicateView = createDuplicateView({ viewRepository: workspacePersistence.viewRepository });
  const deriveView = createDeriveView({ viewRepository: workspacePersistence.viewRepository });
  const deleteView = createDeleteView({ viewRepository: workspacePersistence.viewRepository });
  const editPresentation = createEditPresentation();
  const savePresentation = createSavePresentation({ presentationRepository: workspacePersistence.presentationRepository });
  const exportStandaloneApplication = createExportStandalone({
    assetProvider: createBrowserPublicationAssets({
      resourceFetcher,
      listAssets: path => fetcher(path),
      fetchAsset: path => resourceFetcher(path),
      isAvailable
    }),
    publisher: createBrowserStandalonePublisher({ downloadText })
  });
  const exportAtlasEmbedApplication = createExportAtlasEmbed({
    assetProvider: createBrowserPublicationAssets({
      resourceFetcher,
      listAssets: path => fetcher(path),
      fetchAsset: path => resourceFetcher(path),
      isAvailable,
      runtimePath: "dist/atlas-embed-runtime.iife.js",
      stylePath: "atlas-embed.css"
    }),
    publisher: createBrowserStandalonePublisher({ downloadText })
  });

  return {
    mapEditor,
    editMapCommand,
    workspacePersistence,
    saveMap,
    saveView,
    createView,
    duplicateView,
    deriveView,
    deleteView,
    editPresentation,
    savePresentation,
    exportStandaloneApplication,
    exportAtlasEmbedApplication
  };
}
