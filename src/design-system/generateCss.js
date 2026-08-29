import { createHash } from "node:crypto";
import {
  DESIGN_SYSTEM_SCHEMA_VERSION,
  DESIGN_SYSTEM_THEME,
  designTokens,
  resolveToken
} from "./tokens.js";
import { generateTokenCss as generateCssTokens } from "./css.js";
import { flattenTokens } from "./tokenSchema.js";

export function buildTokenManifest(css) {
  const resolved = Object.fromEntries(
    flattenTokens(designTokens).map(({ path, value }) => [path, resolveToken(value)])
  );
  const hash = createHash("sha256").update(css).digest("hex");
  return {
    schemaVersion: DESIGN_SYSTEM_SCHEMA_VERSION,
    theme: DESIGN_SYSTEM_THEME,
    hash,
    tokenCount: Object.keys(resolved).length,
    tokens: resolved,
    aliases: {}
  };
}

export function generateTokenCss({ layer = "tokens" } = {}) {
  const css = generateCssTokens({ layer });
  return { css, manifest: buildTokenManifest(css) };
}
