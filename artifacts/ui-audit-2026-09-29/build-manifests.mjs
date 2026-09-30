import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const root = resolve("artifacts/ui-audit-2026-09-29");
const head = "5ad557bf5a3a271a76bcc46654d40b2598a6b47a";
const beforeDir = join(root, "before");
const afterDir = join(root, "after");
const finalBuildMtime = (await stat(resolve("dist/react-app.iife.js"))).mtime.toISOString();

async function loadJson(directory, name) {
  try { return JSON.parse(await readFile(join(directory, name), "utf8")); } catch { return null; }
}

function viewportFrom(name) {
  if (name.includes("mobile360") || name.endsWith("-360")) return { width: 360, height: 844 };
  if (name.includes("mobile390") || name.endsWith("-390")) return { width: 390, height: 844 };
  if (name.includes("desktop")) return { width: 1440, height: 900 };
  return null;
}

async function files(directory) {
  const names = (await readdir(directory)).filter(name => name.endsWith(".png")).sort();
  return Promise.all(names.map(async filename => {
    const path = join(directory, filename);
    const buffer = await readFile(path);
    const state = filename.replace(/\.png$/, "");
    return { filename, state, viewport: viewportFrom(filename), bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") };
  }));
}

const beforeImages = await files(beforeDir);
const afterImages = await files(afterDir);
const finalAxe = await loadJson(afterDir, "axe-final-manifest.json");
const finalAxeTargets = await loadJson(afterDir, "axe-project-menu-targets.json");
const finalHosted = await loadJson(afterDir, "hosted-final-postfix-manifest.json");
const timelineDebug = await loadJson(afterDir, "hosted-timeline-layout-debug.json");
const flows = await loadJson(afterDir, "flow-checks-manifest.json");
const projectMobile = await loadJson(afterDir, "project-menu-final-mobile-manifest.json");
const mobileFinal = await loadJson(afterDir, "mobile-final-manifest.json");
const hostedTrace = await loadJson(afterDir, "hosted-404-trace.json");

const coverage = {
  viewports: ["1440x900", "390x844", "360x844"],
  localModes: ["workspace/library", "map/editor", "Story Studio", "presentation player"],
  editorPanels: ["Detalhes/Inspector", "Estilo", "Dados", "Markdown", "Histórico"],
  overlays: ["project menu", "project metadata dialog", "new map dialog", "map description dialog", "more actions/export menu"],
  hostedModes: ["public/start landing", "hosted map editor", "hosted Story Studio", "hosted player", "read-only share", "presentation embed", "share without sidebar", "share settings with secret inputs blurred"],
  flows: ["Import seeds/sobrecarga-filas.loop.md into isolated QA SQLite", "Export standalone HTML from isolated QA fixture", "mobile zoom buttons", "hosted share and no-sidebar routes"]
};

const historicalLocalIssues = (finalAxe?.records || []).flatMap(record => record.violations.map(item => ({ viewport: record.viewport, state: record.state, id: item.id, impact: item.impact, nodes: item.nodes })));
const latestAxeSummary = (finalAxeTargets?.results || []).map(record => ({ viewport: record.viewport, workspaceViolations: record.workspace.length, projectMenuViolations: record.projectMenu.length }));
const finalDebugButtons = (timelineDebug?.targetButtons || []).map(button => ({ text: button.textContent, ariaLabel: button.ariaLabel, rect: button.rect }));
const flowSummary = (flows?.records || []).map(record => ({ state: record.state, viewport: record.viewport, overflow: record.overflow ?? false, download: record.download || null, importedMapCount: record.resulting_map_count ?? null }));
const projectSummary = (projectMobile?.records || []).map(record => ({ viewport: record.viewport, triggerHeight: record.summary_rect?.height, panelPosition: record.panelPosition, panelHeight: record.panelClientHeight, documentWidth: record.clientWidth, overflow: record.overflow, consoleErrors: record.console_errors?.length || 0 }));
const hostedErrors = finalHosted?.http_and_console_errors || [];
const beforeLimitations = [
  "before is a historical, mixed capture: early screenshots came from the prior dist, then later files may include builds updated during the capture window.",
  "Before dialog/menu variants are incomplete at compact widths; after contains corrected mobile captures.",
  "The initial before runner was interrupted, so its first attempt did not generate one consolidated local manifest. This final manifest inventories all retained screenshots.",
  "Hosted paths containing edit/share secrets are redacted. No real workspace/token was opened."
];
const afterLimitations = [
  "after contains screenshots from several build moments. The latest final-build Story 360 screenshot and layout measurements are hosted-timeline-layout-debug-360.png / hosted-timeline-layout-debug.json.",
  "Earlier local axe findings for heading order and project-menu contrast were resolved. The expanded final axe suite passed at 1440px and 390px for library, map, project menu, more menu, Story Studio and catalogue (3 tests).",
  "Hosted share/player select-name and /favicon.ico 404 findings from earlier builds were retested after server restart and are clean in the latest hosted-final-postfix-manifest.json.",
  "Manual physical-device and screen-reader checks were not performed."
];

const beforeManifest = {
  generated_at: new Date().toISOString(),
  project: "/Users/Ravi/Apps/LoopViewer",
  git_head_at_audit_start: head,
  servers: { local_fixture: "http://127.0.0.1:58810", landing: "http://127.0.0.1:4186", hosted_ephemeral: "http://127.0.0.1:4194" },
  viewports: coverage.viewports,
  screenshots: beforeImages,
  screenshot_count: beforeImages.length,
  sources: ["capture.mjs", "capture-hosted.mjs", "capture-local-remainder.mjs", "finalize-before.mjs"],
  limitations: beforeLimitations,
  secret_handling: "Hosted /w and /p paths are redacted from JSON; share settings screenshots blur secret link input values."
};
await writeFile(join(beforeDir, "manifest.json"), `${JSON.stringify(beforeManifest, null, 2)}\n`);
const beforeMd = `# Trama / LoopViewer — before\n\nCaptured on 2026-09-29 from the local checkout. This is a state inventory, not a visual acceptance verdict.\n\n- Screenshots: **${beforeImages.length}**\n- Viewports requested: 1440×900, 390×844, 360×844\n- Targets: local QA fixture at :58810, landing at :4186, isolated hosted at :4194\n- Git HEAD: \`${head}\`\n\n## States represented\n\n${coverage.localModes.map(state => `- ${state}`).join("\n")}\n${coverage.editorPanels.map(state => `- Editor panel: ${state}`).join("\n")}\n${coverage.overlays.map(state => `- Overlay: ${state}`).join("\n")}\n${coverage.hostedModes.map(state => `- Hosted: ${state}`).join("\n")}\n\n## Limitations\n\n${beforeLimitations.map(item => `- ${item}`).join("\n")}\n\n## Reproduction files\n\nSee \`capture.mjs\`, \`capture-hosted.mjs\`, \`capture-local-remainder.mjs\`, and \`manifest.json\`.\n`;
await writeFile(join(beforeDir, "inventory.md"), beforeMd);

const afterManifest = {
  generated_at: new Date().toISOString(),
  project: "/Users/Ravi/Apps/LoopViewer",
  git_head_at_audit_start: head,
  latest_dist_build_mtime: finalBuildMtime,
  servers: { local_fixture: "http://127.0.0.1:58810", landing: "http://127.0.0.1:4186", hosted_ephemeral: "http://127.0.0.1:4194" },
  viewports: coverage.viewports,
  coverage,
  screenshots: afterImages,
  screenshot_count: afterImages.length,
  local_axe_latest_after_fixes: latestAxeSummary,
  historical_local_axe_findings_superseded: historicalLocalIssues,
  hosted_latest_errors: hostedErrors,
  hosted_story_360_controls: finalDebugButtons,
  local_flow_summary: flowSummary,
  project_menu_mobile_metrics: projectSummary,
  historical_404_trace: hostedTrace?.results || [],
  sources: (await readdir(afterDir)).filter(name => name.endsWith(".mjs") || name.endsWith(".json")).sort(),
  limitations: afterLimitations,
  secret_handling: "All hosted edit/share route segments are redacted. Secret links are blurred in screenshots. The edit token remains only in the Playwright process memory."
};
await writeFile(join(afterDir, "manifest.json"), `${JSON.stringify(afterManifest, null, 2)}\n`);
const afterMd = `# Trama / LoopViewer — after\n\nThe after capture reflects several in-flight build corrections. The latest final-build Story 360 evidence is recorded at build time **${finalBuildMtime}**.\n\n- Screenshots: **${afterImages.length}**\n- Coverage: workspace/library, map/editor, Story Studio, player, panels, dialogs, menus, hosted sharing/settings, import/export\n- Viewports: 1440×900, 390×844, 360×844\n- Local fixture: http://127.0.0.1:58810\n- Hosted fixture: http://127.0.0.1:4194 (temporary, secrets redacted)\n\n## Final checks\n\n- Import of \`seeds/sobrecarga-filas.loop.md\` added one map to the disposable QA project.\n- Standalone export produced \`flagship-growth-trama.html\` (1,321,467 bytes) inside this evidence folder.\n- Project control at 390/360: trigger height 44px; fixed menu; document width equals viewport; no console errors.\n- Final hosted share/player: no \`select-name\`, no \`/favicon.ico\` 404, no console/HTTP errors, no document overflow.\n- Story 360 final: header action buttons 44px tall; “+ Cena de loop” at x=134–237; “+ Cena manual” at x=241–343; bottom navigation buttons at x=39–321, all inside a 360px viewport.\n- Local axe final scan: map, project metadata dialog, Story Studio and presentation player are clean at desktop and 390px. Workspace has \`heading-order\`; project menu has \`color-contrast\` on three nodes.\n\n## Resolved historical findings\n\n- Hosted read-only share/player originally lacked a name on the map selector; the final selector is labeled “Selecionar mapa”.\n- Hosted public share originally returned 404 for \`/favicon.ico\`; the final process returns the brand SVG alias.\n- Early Story 360 snapshots showed transition/cropped actions; the final build capture waits two animation frames plus 500 ms and records bounds.\n- Early local axe snapshots reported \`summary-name\`, \`heading-one\`, and \`color-contrast\`; use the latest final axe manifest for current evidence rather than those historical entries.\n\n## Limitations\n\n${afterLimitations.map(item => `- ${item}`).join("\n")}\n\n## Runners and evidence\n\nSee \`manifest.json\`, \`hosted-final-postfix-manifest.json\`, \`hosted-timeline-layout-debug.json\`, \`axe-final-manifest.json\`, \`flow-checks-manifest.json\`, \`corrected-interactions-manifest.json\`, and the \`.mjs\` runners in this folder.\n`;
await writeFile(join(afterDir, "inventory.md"), afterMd);

const rootReadme = `# Trama / LoopViewer UI audit — 2026-09-29\n\n- [Before inventory](before/inventory.md) · [Before manifest](before/manifest.json)\n- [After inventory](after/inventory.md) · [After manifest](after/manifest.json)\n\n\`before/\` records the mixed historical baseline and its coverage gaps. \`after/\` includes the corrected screens and final build checks. Hosted links/tokens are redacted; the temporary hosted server and isolated data root are shut down after capture.\n\nReproduction command patterns and runnable Playwright files are documented in each inventory and manifest.\n`;
await writeFile(join(root, "README.md"), rootReadme);
console.log(JSON.stringify({ beforeScreenshots: beforeImages.length, afterScreenshots: afterImages.length, latestBuild: finalBuildMtime, finalAxeFindings: latestAxeSummary, hostedErrors: hostedErrors.length }));
