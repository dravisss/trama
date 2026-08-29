import { createRoutingFixture } from "../../src/qa/routingFixtures.js";
import { createViewFromStylePreset } from "../../src/styles/library.js";
import {
  FLAGSHIP_ASSETS,
  FLAGSHIP_MODEL,
  FLAGSHIP_PRESENTATION
} from "../../tests/fixtures/flagship-presentation.mjs";

const EXPORTED_AT = "2026-07-21T00:00:00.000Z";
const ONE_PIXEL_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL8mQAAAABJRU5ErkJggg==";

/**
 * A deterministic, local-first project bundle used only by UI QA. It keeps
 * routing scale fixtures, a real V2 presentation and a binary asset in the
 * same project without reading or mutating the user's workspace database.
 */
export function buildUnifiedUiFixture() {
  const routingMaps = [8, 16, 32].map(nodeCount => {
    const model = createRoutingFixture({ id: `ui-qa-${nodeCount}`, nodeCount });
    return mapRecord(model, `Routing QA ${nodeCount}`, model.description);
  });
  const flagshipModel = repairFlagshipPolarityForUiFixture(structuredClone(FLAGSHIP_MODEL));
  const flagshipMap = mapRecord(
    flagshipModel,
    "Flagship — Crescimento sob pressão",
    "Mapa editorial com apresentação V2, três loops e mídia local."
  );
  const maps = [...routingMaps, flagshipMap];

  return {
    format: "loopviewer-project",
    version: 1,
    exported_at: EXPORTED_AT,
    project: {
      id: "unified-ui-qa",
      title: "LoopViewer UI QA",
      description_md: "Fixture isolada e determinística para regressão visual, interação e publicação."
    },
    // The runtime keeps a legacy loop write queue while maps own views and
    // presentation references. Keep both records linked so a mode change
    // exercises the real persistence contract instead of producing a 404.
    loops: maps.map(map => ({
      id: map.id,
      title: map.title,
      summary: map.description_md,
      description_md: map.description_md,
      model: structuredClone(map.model)
    })),
    maps: maps.map(map => ({ ...map, source_loop_id: map.id })),
    // Every map starts in the canonical Matcha view. The flagship also carries
    // a deliberately distinct alternative so acceptance tests exercise real
    // persisted view selection rather than a transient style preview.
    views: [
      ...maps.map(map => viewRecord(map.id, "matcha-executive", "Matcha QA")),
      // The title sorts after Matcha in ProjectStore's deterministic order,
      // so the canonical Matcha view remains the baseline/default canvas.
      viewRecord(flagshipMap.id, "boardroom-ink", "Style Pack Boardroom")
    ],
    presentations: [{
      id: FLAGSHIP_PRESENTATION.id,
      title: FLAGSHIP_PRESENTATION.title,
      presentation: structuredClone(FLAGSHIP_PRESENTATION)
    }],
    assets: [{
      id: FLAGSHIP_ASSETS[0].id,
      filename: FLAGSHIP_ASSETS[0].filename,
      mime_type: "image/png",
      kind: "image",
      alt_text: "Imagem de cobertura da fixture de crescimento.",
      focal_x: 0.5,
      focal_y: 0.5,
      source_json: { kind: "qa-fixture" },
      content_base64: ONE_PIXEL_PNG_BASE64
    }]
  };
}

function viewRecord(mapId, presetId, title) {
  return {
    ...createViewFromStylePreset(presetId, { viewId: `${mapId}-${presetId}`, title }),
    map_id: mapId
  };
}

/**
 * The shared presentation fixture predates the explicit source/target sign
 * convention: it represents the inverse `pressure → demand` relationship as
 * `--`, which the current domain contract correctly classifies as reinforcing.
 * UI QA needs a valid persisted model while retaining the intended balancing
 * narrative, so its private clone encodes the relation as `+-`.
 */
function repairFlagshipPolarityForUiFixture(model) {
  return {
    ...model,
    edges: model.edges.map(edge => edge.id === "pressure-demand"
      ? { ...edge, sourceSign: "+", targetSign: "-" }
      : edge)
  };
}

function mapRecord(model, title, description_md) {
  return {
    id: model.id,
    title,
    description_md,
    model: { ...model, id: model.id, title, description: description_md },
    source_loop_id: null
  };
}
