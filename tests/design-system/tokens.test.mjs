import test from "node:test";
import assert from "node:assert/strict";
import { designTokens } from "../../src/design-system/tokens.js";
import { matchaTheme } from "../../src/themes/matcha.js";
import { generateTokenCss } from "../../src/design-system/generateCss.js";
import { flattenTokens, validateDesignTokens } from "../../src/design-system/tokenSchema.js";
import { applyDesignSystemContext, densityForMode } from "../../src/design-system/runtime.js";
import { DESIGN_SYSTEM_MANIFEST } from "../../src/design-system/generatedManifest.js";

test("design tokens validate and flatten deterministically", () => {
  const validation = validateDesignTokens();
  assert.ok(validation.count > 80);
  assert.equal(validation.entries.length, flattenTokens(designTokens).length);
  assert.equal(new Set(validation.entries.map(entry => entry.path)).size, validation.count);
});

test("generated CSS exposes only canonical variables", () => {
  const first = generateTokenCss();
  const second = generateTokenCss();
  assert.equal(first.css, second.css);
  assert.match(first.css, /@layer reset, legacy, tokens, primitives, patterns, routes, states, utilities;/);
  assert.match(first.css, /--lv-foundation-color-moss600: #6F9A5B;/);
  assert.match(first.css, /--lv-semantic-color-text-primary: var\(--lv-foundation-color-ink\);/);
  assert.doesNotMatch(first.css, /--(?:ui-|story-v2-|primary|surface|line)/);
  assert.equal(first.manifest.hash.length, 64);
  assert.deepEqual(first.manifest.aliases, {});
  assert.deepEqual(DESIGN_SYSTEM_MANIFEST, {
    schemaVersion: first.manifest.schemaVersion,
    theme: first.manifest.theme,
    hash: first.manifest.hash,
    tokenCount: first.manifest.tokenCount
  });
});

test("design-system context maps product modes to shared density", () => {
  const root = { dataset: {} };
  assert.deepEqual(applyDesignSystemContext(root, { mode: "story" }), {
    theme: "matcha",
    mode: "story",
    density: "compact"
  });
  assert.equal(root.dataset.theme, "matcha");
  assert.equal(root.dataset.density, "compact");
  assert.equal(root.dataset.designSystemHash, DESIGN_SYSTEM_MANIFEST.hash);
  assert.equal(densityForMode("present"), "immersive");
});

test("Matcha engine theme resolves shared foundation colors without changing its canvas palette", () => {
  assert.equal(matchaTheme.colors.neutral, designTokens.foundation.color.neutral);
  assert.equal(matchaTheme.colors.surface, designTokens.foundation.color.paperEditorial);
  assert.equal(matchaTheme.colors.line, designTokens.foundation.color.canvasLine);
});
