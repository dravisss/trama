import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const root = resolve("artifacts/ui-audit-2026-09-29/before");
const files = await readdir(root);
const manifests = [];
for (const name of ["hosted-manifest.json", "local-remainder-manifest.json"]) {
  try { manifests.push(JSON.parse(await readFile(join(root, name), "utf8"))); } catch {}
}
const items = [];
for (const file of files.filter(file => file.endsWith(".png"))) {
  const name = file.replace(/\.png$/, "");
  const [state, viewport] = split(name);
  items.push({ screenshot: file, state, viewport: viewport || "desktop", source: state.startsWith("hosted") ? "hosted" : state.startsWith("landing") ? "landing" : "local isolated UI QA fixture", route: state.startsWith("hosted") ? "http://127.0.0.1:4194 (secret paths redacted)" : state.startsWith("landing") ? "http://127.0.0.1:4186/" : "http://127.0.0.1:58810/?qa=1" });
}
const coverage = {
  captured: [...new Set(items.map(item => item.state))],
  viewports: ["1440x900", "390x844", "360x844"],
  limitations: [
    "The first screenshots were captured while dist contained the previous baseline; later screenshots in this folder may include the build updated during this audit. See Git HEAD and source timestamps in the parent manifest.",
    "Local project/editor evidence uses the deterministic Trama UI QA fixture, not user project data.",
    "Hosted evidence uses an isolated disposable workspace under /tmp/trama-ui-audit-hosted-2026-09-29. Secret edit/share paths are redacted from hosted-manifest.json.",
    "Hosted share settings were captured with secret fields blurred. No real tokens were opened.",
    "Story/player 360 and 390 plus core map/workspace were captured; some low-level dialogs/menus lack mobile screenshots because compact selectors did not resolve in the before build.",
    "No import flow was submitted in before. Standalone export evidence may be absent if the export download step was not reached before interruption.",
    "Axe scans were attempted in an interrupted runner and did not produce a complete consolidated result. No claim of accessibility pass is made.",
    "Screenshots are inventory evidence and do not constitute visual acceptance or a complete permutation audit."
  ]
};
await writeFile(join(root, "manifest.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), project: "/Users/Ravi/Apps/LoopViewer", git_head: "5ad557bf5a3a271a76bcc46654d40b2598a6b47a", servers: { local_ui_fixture: "http://127.0.0.1:58810", landing: "http://127.0.0.1:4186", hosted_ephemeral: "http://127.0.0.1:4194" }, entries: items, source_manifests: manifests.map(item => ({ generated_at: item.generated_at || null, entries: item.entries?.length || 0, failures: item.failures?.length || 0 })), coverage }, null, 2)}\n`);
const grouped = new Map();
for (const item of items) {
  const key = `${item.source} · ${item.state}`;
  grouped.set(key, [...(grouped.get(key) || []), item.viewport]);
}
const markdown = `# Trama / LoopViewer UI inventory — before\n\nCaptured on 2026-09-29 from the current local checkout. This is a state inventory, not a visual acceptance report.\n\n## Runtime targets\n\n- Local app / isolated SQLite QA fixture: http://127.0.0.1:58810\n- Landing build: http://127.0.0.1:4186/\n- Hosted mode with temporary data root: http://127.0.0.1:4194\n- Git HEAD at audit start: \`5ad557bf5a3a271a76bcc46654d40b2598a6b47a\`\n\n## Captured states\n\n${[...grouped].map(([key, viewports]) => `- **${key}** — ${[...new Set(viewports)].join(", ")}`).join("\n")}\n\n## Important coverage boundaries\n\n${coverage.limitations.map(item => `- ${item}`).join("\n")}\n\n## Files\n\n- \`manifest.json\` contains per-screenshot routes, state and viewport labels plus hosted token-redaction note.\n- \`hosted-manifest.json\` records hosted routes after redaction.\n- \`capture.mjs\`, \`capture-hosted.mjs\`, and \`capture-local-remainder.mjs\` are reproducible Playwright runners.\n- PNG files are the captured states listed above.\n`;
await writeFile(join(root, "inventory.md"), markdown);
console.log(`before screenshots=${items.length}; source manifests=${manifests.length}`);

function split(name) {
  const match = name.match(/-(desktop|mobile390|mobile360)$/);
  return match ? [name.slice(0, -match[0].length), match[1]] : [name, "desktop"];
}
