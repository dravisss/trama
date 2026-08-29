export const PRODUCT_MODES = Object.freeze(["workspace", "map", "explore", "story", "present"]);

export const MODE_DENSITY = Object.freeze({
  workspace: "comfortable",
  map: "compact",
  explore: "compact",
  story: "compact",
  present: "immersive"
});

export function densityForMode(mode = "workspace") {
  return MODE_DENSITY[mode] || MODE_DENSITY.workspace;
}

/** Apply the shared product visual context at the document boundary. */
export function applyDesignSystemContext(root = typeof document !== "undefined" ? document.documentElement : null, {
  theme = "matcha",
  mode = "workspace",
  density = densityForMode(mode)
} = {}) {
  if (!root?.dataset) return { theme, mode, density };
  root.dataset.theme = theme;
  root.dataset.density = density;
  root.dataset.productMode = mode;
  root.dataset.designSystemHash = DESIGN_SYSTEM_MANIFEST.hash;
  return { theme, mode, density };
}
import { DESIGN_SYSTEM_MANIFEST } from "./generatedManifest.js";
