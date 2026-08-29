import { compilePresentationExport } from "../presentation/export.js";
import { DESIGN_SYSTEM_SCHEMA_VERSION, DESIGN_SYSTEM_THEME, resolveFoundationColor } from "../design-system/tokens.js";
import { generateTokenCss } from "../design-system/css.js";
import { DESIGN_SYSTEM_MANIFEST } from "../design-system/generatedManifest.js";

export function createStandaloneHtml({ model, project, loops, activeLoopId, presentation = null, presentations = [], assets = [], runtime, styles, maps = [], views = [], embed = {} }) {
  const entries = Array.isArray(loops) && loops.length
    ? loops
    : [{ id: model.id, title: model.title || model.id, summary: model.description || "", description_md: model.description || "", model }];
  const activeModel = model || entries[0]?.model;
  const exported = compilePresentationExport({
    project: project || { title: "LoopViewer" },
    model: activeModel,
    loops: entries,
    presentation,
    presentations,
    maps,
    views,
    assets,
    activeLoopId: activeLoopId || activeModel?.id || entries[0]?.id,
    embed
  });
  const data = JSON.stringify(exported.payload).replaceAll("</script", "<\\/script");
  const title = project?.title || model?.title || entries[0]?.title || entries[0]?.id || "LoopViewer";
  const sidebar = embed?.sidebar !== false;
  const publicationTokens = generateTokenCss({ layer: "tokens" });
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="loopviewer-design-system" content="${DESIGN_SYSTEM_THEME}@${DESIGN_SYSTEM_SCHEMA_VERSION}">
  <meta name="loopviewer-design-system-hash" content="${DESIGN_SYSTEM_MANIFEST.hash}">
  <meta name="theme-color" content="${resolveFoundationColor("neutral")}">
  <title>${escapeHtml(title)} — LoopViewer</title>
  <style data-loopviewer-design-system="${DESIGN_SYSTEM_THEME}@${DESIGN_SYSTEM_SCHEMA_VERSION}" data-loopviewer-design-system-hash="${DESIGN_SYSTEM_MANIFEST.hash}">${publicationTokens}\n${styles || ""}</style>
</head>
  <body class="${sidebar ? "" : "standalone-no-sidebar"}${embed?.presentationOnly ? " standalone-presentation-only" : ""}">
  <div id="loopviewer-standalone"></div>
  <script>window.__LOOPVIEWER_DATA__=${data};</script>
  <script>${runtime.replaceAll("</script", "<\\/script")}</script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
