import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { generateTokenCss } from "../src/design-system/generateCss.js";
import { validateDesignTokens } from "../src/design-system/tokenSchema.js";
import { DESIGN_SYSTEM_MANIFEST } from "../src/design-system/generatedManifest.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else files.push(path);
  }
  return files;
}

const reactFiles = (await listFiles(resolve(root, "src/react"))).filter(file => /\.(jsx|js)$/.test(file));

const publicationFontFiles = [
  "noto-sans-latin-400-normal.woff2",
  "noto-sans-latin-ext-400-normal.woff2",
  "noto-sans-latin-500-normal.woff2",
  "noto-sans-latin-ext-500-normal.woff2",
  "noto-sans-latin-600-normal.woff2",
  "noto-sans-latin-ext-600-normal.woff2",
  "noto-serif-latin-500-normal.woff2",
  "noto-serif-latin-ext-500-normal.woff2",
  "noto-serif-latin-600-normal.woff2",
  "noto-serif-latin-ext-600-normal.woff2"
];
const deprecatedCssVariables = [
  "primary",
  "secondary",
  "tertiary",
  "accent",
  "accent-strong",
  "neutral",
  "surface",
  "surface-strong",
  "line",
  "line-strong",
  "moss",
  "muted",
  "ui-[\\w-]+",
  "story-v2-[\\w-]+"
];

const [html, manifestText, sourceTexts, fontCss, publicationFontCss, standaloneRuntime, knownExceptionsText, storyV2Css, standaloneCss] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "docs/UI_COMPATIBILITY_MANIFEST.json"), "utf8"),
  Promise.all([
    "src/app.js",
    "src/react/main.jsx",
    "src/react/presentationCard.jsx",
    "src/react/explorePanel.jsx",
    "src/react/storyFrame.jsx",
    "src/react/storyStudioV2/storyStudioV2.jsx"
  ].map(file => readFile(resolve(root, file), "utf8"))),
  readFile(resolve(root, "src/design-system/fonts.css"), "utf8"),
  readFile(resolve(root, "dist/standalone-fonts.css"), "utf8"),
  readFile(resolve(root, "dist/standalone-runtime.iife.js"), "utf8"),
  readFile(resolve(root, "qa/known-baseline-exceptions.json"), "utf8"),
  readFile(resolve(root, "src/react/storyStudioV2/storyStudioV2.css"), "utf8"),
  readFile(resolve(root, "standalone.css"), "utf8")
]);
const manifest = JSON.parse(manifestText);
const knownExceptions = JSON.parse(knownExceptionsText);
const compatibilitySources = [html, ...sourceTexts].join("\n");
const failures = [];
const warnings = [];

function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }

const idMatches = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const idCounts = new Map();
for (const id of idMatches) idCounts.set(id, (idCounts.get(id) || 0) + 1);
for (const [id, count] of idCounts) if (count > 1) fail(`duplicate static id #${id} (${count})`);

for (const id of [...manifest.mountPoints, ...manifest.bridgeIds]) {
  if (!compatibilitySources.includes(id)) fail(`manifest id missing from index.html or React source: ${id}`);
}

const reactSourceEntries = await Promise.all(reactFiles.map(async file => ({ file, text: await readFile(file, "utf8") })));
const rawControlFiles = reactSourceEntries
  .filter(({ file, text }) => !file.includes(`${resolve(root, "src/react/ui")}/`) && /<(?:button|input|select|textarea)\b/.test(text))
  .map(({ file }) => file.replace(`${root}/`, ""));
if (rawControlFiles.length) fail(`raw form controls outside src/react/ui: ${rawControlFiles.join(", ")}`);
const reactHexLiterals = reactSourceEntries.flatMap(({ file, text }) => {
  const matches = [...text.matchAll(/#[0-9a-f]{3,8}\b/gi)].map(match => match[0]);
  return matches.length ? [`${file.replace(`${root}/`, "")}: ${[...new Set(matches)].join(", ")}`] : [];
});
if (reactHexLiterals.length) fail(`React product components must consume design tokens instead of hex literals: ${reactHexLiterals.join("; ")}`);
const createRootCount = reactSourceEntries.reduce((sum, { text }) => sum + (text.match(/\bcreateRoot\s*\(/g) || []).length, 0);
const flushSyncCount = reactSourceEntries.reduce((sum, { text }) => sum + (text.match(/\bflushSync\s*\(/g) || []).length, 0);
if (createRootCount !== 1) fail(`React composition must use exactly one createRoot call, found ${createRootCount}`);
if (flushSyncCount > 1 || (flushSyncCount === 1 && !sourceTexts.find(text => text.includes("Bootstrap is the only synchronous render")))) {
  fail("flushSync is only allowed for the documented React bootstrap barrier");
}
const storyV2Consumers = reactSourceEntries
  .filter(({ file, text }) => file.includes("storyStudioV2") && /--story-v2-/.test(text))
  .map(({ file }) => file.replace(`${root}/`, ""));
if (/--story-v2-/.test(storyV2Css)) storyV2Consumers.push("src/react/storyStudioV2/storyStudioV2.css");
if (storyV2Consumers.length) fail(`migrated Story Studio code still consumes legacy --story-v2-* tokens: ${storyV2Consumers.join(", ")}`);
if (knownExceptions.exceptions.length) fail(`known visual baseline exceptions remain: ${knownExceptions.exceptions.map(item => item.id).join(", ")}`);

const stylesheetHrefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g)]
  .map(match => match[1]);
if (stylesheetHrefs[0] !== "dist/trama-ui-tokens.css") {
  fail("generated token stylesheet must be the first product stylesheet in index.html");
}
if (!html.includes('data-theme="matcha"')) fail('index.html must declare data-theme="matcha"');
if (html.includes("fonts.googleapis.com") || html.includes("fonts.gstatic.com")) {
  fail("application typography must not depend on remote Google Fonts");
}
if (html.includes("uiPolish.css") || existsSync(resolve(root, "src/react/uiPolish.css"))) {
  fail("retired uiPolish.css must not remain in the application or repository");
}
for (const filename of publicationFontFiles) {
  if (!existsSync(resolve(root, "assets/fonts", filename))) fail(`local font asset is missing: ${filename}`);
  if (!fontCss.includes(filename)) fail(`app font stylesheet does not reference: ${filename}`);
}
if ((publicationFontCss.match(/@font-face/g) || []).length !== publicationFontFiles.length) {
  fail("standalone publication font CSS must contain one embedded face per local subset");
}
if (!publicationFontCss.includes("data:font/woff2;base64,")) {
  fail("standalone publication fonts must be embedded as data URLs");
}
if (/\b(?:ReactDOM|createRoot)\b/.test(standaloneRuntime)) {
  fail("standalone runtime must not contain React composition code");
}

const tokenValidation = validateDesignTokens();
const generated = generateTokenCss();
const tokenCssPath = resolve(root, "dist/trama-ui-tokens.css");
const tokenManifestPath = resolve(root, "dist/trama-ui-tokens.manifest.json");
if (!existsSync(tokenCssPath) || !existsSync(tokenManifestPath)) {
  fail("generated design-token artifacts are missing; run npm run build:tokens");
} else {
  const [tokenCss, tokenManifest] = await Promise.all([
    readFile(tokenCssPath, "utf8"),
    readFile(tokenManifestPath, "utf8").then(JSON.parse)
  ]);
  if (tokenCss !== generated.css) fail("dist/trama-ui-tokens.css is stale");
  if (!tokenCss.includes("@layer reset, legacy, tokens, primitives, patterns, routes, states, utilities;")) {
    fail("generated token stylesheet must declare the canonical cascade layer order");
  }
  if (JSON.stringify(tokenManifest) !== JSON.stringify(generated.manifest)) {
    fail("dist/trama-ui-tokens.manifest.json is stale");
  }
  for (const key of ["schemaVersion", "theme", "hash", "tokenCount"]) {
    if (DESIGN_SYSTEM_MANIFEST[key] !== generated.manifest[key]) {
      fail(`runtime design-system manifest is stale at ${key}`);
    }
  }
}

const sourceFiles = [
  "styles.css",
  "src/app/appShell.css",
  "src/app/storyStudio/storyStudio.css",
  "src/react/reactApp.css",
  "src/react/storyStudioV2/storyStudioV2.css",
  "src/react/applicationRoutes.css",
  "src/react/ui/ui.css"
];
const cssSources = await Promise.all(sourceFiles.map(file => readFile(resolve(root, file), "utf8")));
const importantCount = cssSources.reduce((sum, css) => sum + (css.match(/!important/g) || []).length, 0);
const standaloneImportantCount = (standaloneCss.match(/!important/g) || []).length;
if (importantCount !== 0) fail(`application CSS must not contain !important declarations, found ${importantCount}`);
if (standaloneImportantCount !== 2 || !/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)[\s\S]*!important/.test(standaloneCss)) {
  fail("standalone !important declarations must be exactly the two reduced-motion overrides");
}
if (/[#][0-9a-f]{3,8}\b/i.test(standaloneCss)) {
  fail("standalone CSS must consume generated color tokens instead of hex literals");
}
const deprecatedVariablePattern = new RegExp(`--(?:${deprecatedCssVariables.join("|")})(?![\\w-])`, "g");
const deprecatedVariableUses = cssSources.flatMap((css, index) => {
  const matches = [...css.matchAll(deprecatedVariablePattern)].map(match => match[0]);
  return matches.length ? [`${sourceFiles[index]}: ${[...new Set(matches)].join(", ")}`] : [];
});
if (deprecatedVariableUses.length) fail(`deprecated CSS variable use remains: ${deprecatedVariableUses.join("; ")}`);
const hexLiterals = cssSources.flatMap((css, index) => {
  const matches = [...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map(match => match[0]);
  return matches.length ? [`${sourceFiles[index]}: ${[...new Set(matches)].join(", ")}`] : [];
});
if (hexLiterals.length) fail(`application CSS must consume generated color tokens instead of hex literals: ${hexLiterals.join("; ")}`);

const report = {
  tokenCount: tokenValidation.count,
  staticIds: idCounts.size,
  stylesheets: stylesheetHrefs,
  reactFiles: reactFiles.length,
  rawControlFiles,
  createRootCount,
  flushSyncCount,
  importantCount,
  standaloneImportantCount,
  fontAssets: publicationFontFiles.length,
  publicationFontFaces: publicationFontCss.match(/@font-face/g)?.length || 0,
  failures,
  warnings
};
if (args.has("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`UI contract: ${tokenValidation.count} tokens, ${idCounts.size} static IDs, ${importantCount} legacy !important`);
  for (const warning of warnings) console.warn(`WARN ${warning}`);
}
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
}
