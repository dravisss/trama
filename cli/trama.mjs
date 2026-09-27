#!/usr/bin/env node
/**
 * trama — command line client for a hosted Trama server.
 *
 * Single file, no dependencies (Node 18+). Download it from
 * <server>/cli/trama.mjs or run it from the repository.
 *
 * Credentials, in order of precedence:
 *   --token / --url flags
 *   TRAMA_TOKEN / TRAMA_URL environment variables (TRAMA_TOKEN may be the full edit URL)
 *   ./.trama.json (written by `trama init`)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";

const DEFAULT_URL = "https://trama.org-agents.work";
const CONFIG_FILE = ".trama.json";

const HELP = `trama — publish causal loop maps and presentations

Usage: trama <command> [options]

Workspace
  init [--title T] [--examples]     Create a workspace and save .trama.json here
  status                            Show maps, presentations and links
  links                             Print share, presentation, edit and MCP links
  export [--out file.json]          Download a full backup bundle
  rotate-share                      Replace the read-only share link
  delete --yes                      Permanently delete the workspace

Authoring
  validate <map> [--story story.md] Compile and audit without saving
  push <map> [--story story.md]     Save a map (and its presentation), print links
  story <map-id> <story.md>         Save the presentation of a saved map
  pull <map-id> [--out f] [--story-out f]
                                    Download a map (loop Markdown) and its presentation
  maps                              List maps
  rm <map-id> --yes                 Delete a map

Agents
  guide                             Print the authoring guide (llms.txt)
  mcp                               Print MCP connection instructions

Map files: .loop.md (loop Markdown), .mmd/.mermaid (Mermaid), .json (model JSON).

Options
  --url URL        Server (default ${DEFAULT_URL} or TRAMA_URL)
  --token TOKEN    Workspace edit token or edit URL (or TRAMA_TOKEN)
  --json           Machine-readable output
`;

async function main(argv) {
  const { positionals, flags } = parseArgs(argv);
  const command = positionals.shift() || "help";
  const ctx = resolveContext(flags);
  const out = flags.json ? value => console.log(JSON.stringify(value, null, 2)) : null;

  switch (command) {
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return;

    case "init": {
      if (ctx.token && !flags.force) fail(`A workspace is already configured (${ctx.source}). Use --force to create another.`);
      const result = await request(ctx, "POST", "/workspaces", {
        title: flags.title || basename(process.cwd()),
        seed: flags.examples ? "examples" : "starter"
      }, { auth: false });
      const ws = result.workspace;
      writeFileSync(resolve(CONFIG_FILE), `${JSON.stringify({ url: ctx.url, token: ws.edit_token }, null, 2)}\n`, { mode: 0o600 });
      if (out) return out(result);
      console.log(`Workspace created: ${ws.title}`);
      printLinks(ws);
      console.log(`\nSaved credentials to ${CONFIG_FILE}. Keep it private (add it to .gitignore).`);
      return;
    }

    case "status": {
      const { workspace } = await request(ctx, "GET", "/workspace");
      if (out) return out(workspace);
      console.log(`${workspace.title}\n`);
      if (!workspace.maps.length) console.log("No maps yet.");
      for (const map of workspace.maps) {
        const loops = map.loops.map(loop => loop.id).join(", ");
        console.log(`• ${map.id} — ${map.title} (${map.nodes} variables, ${map.edges} relations${loops ? `, loops ${loops}` : ""})${map.presentation_ids.length ? " [presentation]" : ""}`);
      }
      console.log("");
      printLinks({ ...workspace, edit_url: editUrl(ctx) });
      return;
    }

    case "links": {
      const { workspace } = await request(ctx, "GET", "/workspace");
      const links = { ...pickLinks(workspace), edit_url: editUrl(ctx), mcp_url: `${editUrl(ctx)}/mcp` };
      if (out) return out(links);
      printLinks(links);
      return;
    }

    case "maps": {
      const result = await request(ctx, "GET", "/maps");
      if (out) return out(result);
      for (const map of result.maps) console.log(`${map.id}\t${map.title}`);
      return;
    }

    case "validate": {
      const file = requireArg(positionals[0], "validate <map-file>");
      const map = readMapSource(file);
      const report = await request(ctx, "POST", "/validate/map", map, { auth: false });
      let story = null;
      if (flags.story) {
        story = await request(ctx, "POST", "/validate/story", {
          map,
          markdown: readFileSync(resolve(flags.story), "utf8")
        }, { auth: false });
      }
      if (out) return out({ map: report, story });
      printReport(report.report, report.map_id);
      if (story) printLint(story.lint);
      return;
    }

    case "push": {
      const file = requireArg(positionals[0], "push <map-file>");
      const body = {
        map: { ...readMapSource(file), ...(flags.title ? { title: flags.title } : {}) },
        story: flags.story ? { markdown: readFileSync(resolve(flags.story), "utf8") } : null
      };
      const result = await request(ctx, "POST", "/publish", body);
      if (out) return out(result);
      console.log(`Saved map ${result.map.id} — ${result.map.title}`);
      printReport(result.report, result.map.id);
      if (result.lint) printLint(result.lint);
      console.log("");
      console.log(`Share:        ${result.links.share_url}`);
      console.log(`Presentation: ${result.links.present_url}`);
      return;
    }

    case "story": {
      const mapId = requireArg(positionals[0], "story <map-id> <story.md>");
      const file = requireArg(positionals[1], "story <map-id> <story.md>");
      const result = await request(ctx, "PUT", `/maps/${encodeURIComponent(mapId)}/presentation`, {
        markdown: readFileSync(resolve(file), "utf8")
      });
      if (out) return out(result);
      console.log(`${result.created ? "Created" : "Updated"} presentation ${result.presentation.id} (revision ${result.presentation.revision})`);
      printLint(result.lint);
      console.log(`Presentation: ${result.links.present_url}`);
      return;
    }

    case "pull": {
      const mapId = requireArg(positionals[0], "pull <map-id>");
      const { map } = await request(ctx, "GET", `/maps/${encodeURIComponent(mapId)}?format=markdown`);
      let storyMarkdown = null;
      if (map.presentation_id) {
        const { presentation } = await request(ctx, "GET", `/maps/${encodeURIComponent(mapId)}/presentation?format=markdown`);
        storyMarkdown = presentation.markdown;
      }
      if (out) return out({ map, story_markdown: storyMarkdown });
      const mapOut = flags.out || `${mapId}.loop.md`;
      writeFileSync(resolve(mapOut), map.markdown || "");
      console.log(`Wrote ${mapOut}`);
      if (storyMarkdown) {
        const storyOut = flags["story-out"] || `${mapId}.story.md`;
        writeFileSync(resolve(storyOut), storyMarkdown);
        console.log(`Wrote ${storyOut}`);
      }
      return;
    }

    case "rm": {
      const mapId = requireArg(positionals[0], "rm <map-id> --yes");
      if (!flags.yes) fail("Deleting a map is permanent. Re-run with --yes.");
      const result = await request(ctx, "DELETE", `/maps/${encodeURIComponent(mapId)}`);
      if (out) return out(result);
      console.log(`Deleted ${mapId}`);
      return;
    }

    case "export": {
      const bundle = await request(ctx, "GET", "/workspace/export");
      const file = flags.out || `${slug(bundle.project?.title || "trama")}.loopviewer.json`;
      writeFileSync(resolve(file), JSON.stringify(bundle, null, 2));
      if (out) return out({ file });
      console.log(`Wrote ${file}`);
      return;
    }

    case "rotate-share": {
      const result = await request(ctx, "POST", "/workspace/share/rotate");
      if (out) return out(result);
      console.log(`New share link: ${result.workspace.share_url}`);
      return;
    }

    case "delete": {
      if (!flags.yes) fail("This permanently deletes the whole workspace. Re-run with --yes.");
      const result = await request(ctx, "DELETE", "/workspace?confirm=delete");
      if (out) return out(result);
      console.log("Workspace deleted.");
      return;
    }

    case "guide": {
      const response = await fetch(`${ctx.url}/llms.txt`);
      console.log(await response.text());
      return;
    }

    case "mcp": {
      const mcpUrl = ctx.token ? `${editUrl(ctx)}/mcp` : `${ctx.url}/mcp`;
      if (out) return out({ mcp_url: mcpUrl });
      console.log(`MCP endpoint (Streamable HTTP): ${mcpUrl}`);
      console.log("\nClaude Code:");
      console.log(`  claude mcp add --transport http trama ${mcpUrl}`);
      console.log("\nGeneric client config:");
      console.log(JSON.stringify({ mcpServers: { trama: { type: "http", url: mcpUrl } } }, null, 2));
      if (ctx.token) console.log("\nThis URL contains the workspace edit key. Keep it private.");
      return;
    }

    default:
      fail(`Unknown command "${command}". Run: trama help`);
  }
}

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      const [key, inline] = arg.slice(2).split("=", 2);
      if (inline !== undefined) flags[key] = inline;
      else if (argv[index + 1] && !argv[index + 1].startsWith("--") && !["json", "yes", "examples", "force"].includes(key)) {
        flags[key] = argv[index + 1];
        index += 1;
      } else flags[key] = true;
    } else positionals.push(arg);
  }
  return { positionals, flags };
}

function resolveContext(flags) {
  let url = flags.url || process.env.TRAMA_URL || null;
  let token = flags.token || process.env.TRAMA_TOKEN || null;
  let source = flags.token ? "--token" : process.env.TRAMA_TOKEN ? "TRAMA_TOKEN" : null;
  if (!token && existsSync(resolve(CONFIG_FILE))) {
    try {
      const saved = JSON.parse(readFileSync(resolve(CONFIG_FILE), "utf8"));
      token = saved.token || null;
      url = url || saved.url || null;
      source = CONFIG_FILE;
    } catch {
      fail(`${CONFIG_FILE} is not valid JSON.`);
    }
  }
  if (token) {
    const match = String(token).match(/^(https?:\/\/[^/]+)\/w\/([A-Za-z0-9_-]{32,64})/);
    if (match) {
      url = url || match[1];
      token = match[2];
    }
  }
  return { url: String(url || DEFAULT_URL).replace(/\/+$/, ""), token, source };
}

async function request(ctx, method, path, body, { auth = true } = {}) {
  if (auth && !ctx.token) fail("No workspace configured. Run `trama init`, or set TRAMA_TOKEN to your edit link.");
  let response;
  try {
    response = await fetch(`${ctx.url}/api/v1${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(auth && ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    fail(`Could not reach ${ctx.url}: ${error.message}`);
  }
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!response.ok) {
    const details = data.details ? `\n${formatDetails(data.details)}` : "";
    fail(`${response.status} ${data.error || response.statusText}${details}`);
  }
  return data;
}

function readMapSource(file) {
  const path = resolve(file);
  if (!existsSync(path)) fail(`File not found: ${file}`);
  const text = readFileSync(path, "utf8");
  const ext = extname(path).toLowerCase();
  if (ext === ".json") return { model: JSON.parse(text) };
  if (ext === ".mmd" || ext === ".mermaid" || /^\s*(graph|flowchart)\s+(TD|TB|LR|RL|BT)/i.test(text)) return { mermaid: text };
  return { markdown: text };
}

function printReport(report, mapId) {
  if (!report) return;
  const stats = report.stats || {};
  console.log(`Map ${mapId}: ${stats.nodes} variables, ${stats.edges} relations, ${stats.curated_loops} curated loops (${stats.discovered_cycles} cycles found)`);
  for (const loop of report.loops || []) {
    const mismatch = loop.declared_type && loop.declared_type !== loop.type ? `  ⚠ labelled ${loop.declared_type}` : "";
    console.log(`  ${loop.id}: ${loop.type}${mismatch} — ${loop.label}`);
  }
  for (const warning of report.warnings || []) console.log(`  ⚠ ${warning}`);
}

function printLint(lint) {
  if (!lint) return;
  console.log(`Presentation: ${lint.scenes} scenes, ${lint.beats} beats${lint.valid ? "" : " — INVALID"}`);
  for (const error of lint.errors || []) console.log(`  ✗ ${error.message}`);
  for (const warning of lint.warnings || []) console.log(`  ⚠ ${warning.message}`);
}

function pickLinks(workspace) {
  return {
    share_url: workspace.share_url,
    present_url: workspace.present_url,
    edit_url: workspace.edit_url,
    mcp_url: workspace.mcp_url
  };
}

function printLinks(workspace) {
  const links = pickLinks(workspace);
  if (links.share_url) console.log(`Share (read-only): ${links.share_url}`);
  if (links.present_url) console.log(`Presentation:      ${links.present_url}`);
  if (links.edit_url) console.log(`Edit (secret):     ${links.edit_url}`);
  if (links.mcp_url) console.log(`MCP (secret):      ${links.mcp_url}`);
}

function editUrl(ctx) {
  return `${ctx.url}/w/${ctx.token}`;
}

function formatDetails(details) {
  if (details.errors) return details.errors.map(error => `  - ${typeof error === "string" ? error : `line ${error.line}: ${error.message}`}`).join("\n");
  if (details.lint) return details.lint.errors.map(error => `  - ${error.message}`).join("\n");
  return JSON.stringify(details, null, 2);
}

function requireArg(value, usage) {
  if (!value) fail(`Usage: trama ${usage}`);
  return value;
}

function slug(value) {
  return String(value).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "trama";
}

function fail(message) {
  console.error(`trama: ${message}`);
  process.exit(1);
}

main(process.argv.slice(2)).catch(error => fail(error.message));
