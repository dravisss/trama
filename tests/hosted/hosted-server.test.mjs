import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { loadHostedConfig } from "../../server/hosted/config.js";
import { createHostedApp, redactUrl } from "../../server/hosted/app.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const loopMarkdown = readFileSync(resolve(root, "tests/hosted/fixtures/capitalismo.loop.md"), "utf8");
const storyMarkdown = readFileSync(resolve(root, "tests/hosted/fixtures/capitalismo.story.md"), "utf8");
const run = promisify(execFile);

async function startServer(overrides = {}) {
  const dataRoot = mkdtempSync(join(tmpdir(), "trama-test-"));
  const config = loadHostedConfig({ PORT: "0", TRAMA_DATA_ROOT: dataRoot, ...overrides }, { root });
  const app = createHostedApp(config);
  await new Promise(done => app.server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  config.publicUrl = base;
  return {
    app,
    base,
    dataRoot,
    async stop() {
      await app.close();
      rmSync(dataRoot, { recursive: true, force: true });
    }
  };
}

async function json(base, method, path, body, headers = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data, headers: response.headers };
}

const bearer = token => ({ Authorization: `Bearer ${token}` });

describe("hosted server", () => {
  let server;
  before(async () => { server = await startServer(); });
  after(async () => { await server.stop(); });

  test("never serves repository internals, only the static allowlist", async () => {
    const blocked = ["/server.mjs", "/package.json", "/src/app.js", "/.git/config", "/registry.db", "/data/loopviewer.db", "/docs/ARCHITECTURE.md", "/seeds/sobrecarga-filas.story.md", "/dist/../server.mjs", "/%2e%2e/server.mjs"];
    for (const path of blocked) {
      const response = await fetch(`${server.base}${path}`);
      assert.equal(response.status, 404, path);
    }
    for (const path of ["/", "/dist/app.iife.js", "/styles.css", "/src/react/reactApp.css", "/vendor/cytoscape.min.js", "/hosted/hosted-ui.js", "/llms.txt", "/cli/trama.mjs", "/healthz"]) {
      const response = await fetch(`${server.base}${path}`);
      assert.equal(response.status, 200, path);
    }
  });

  test("workspaces are isolated by their secret edit token", async () => {
    const a = (await json(server.base, "POST", "/api/v1/workspaces", { title: "A" })).data.workspace;
    const b = (await json(server.base, "POST", "/api/v1/workspaces", { title: "B" })).data.workspace;
    assert.match(a.edit_token, /^[A-Za-z0-9_-]{32}$/);
    assert.notEqual(a.edit_token, b.edit_token);

    const created = await json(server.base, "POST", `/w/${a.edit_token}/api/loops`, {
      title: "Só em A",
      model: { id: "so-em-a", title: "Só em A", nodes: [{ id: "x", label: "X" }], edges: [] }
    });
    assert.equal(created.status, 201);

    const projectA = await json(server.base, "GET", `/w/${a.edit_token}/api/project`);
    const projectB = await json(server.base, "GET", `/w/${b.edit_token}/api/project`);
    assert.ok(projectA.data.loops.some(loop => loop.id === "so-em-a"));
    assert.ok(!projectB.data.loops.some(loop => loop.id === "so-em-a"));
    assert.equal(projectA.data.project.path, `/w/${a.edit_token}`);

    const unknown = await json(server.base, "GET", `/w/${"x".repeat(32)}/api/project`);
    assert.equal(unknown.status, 404);
    const page = await fetch(`${server.base}/w/${"y".repeat(32)}`);
    assert.equal(page.status, 404);
  });

  test("the app shell is injected with the workspace base and self-hosted vendors", async () => {
    const { edit_token: token } = (await json(server.base, "POST", "/api/v1/workspaces", {})).data.workspace;
    const response = await fetch(`${server.base}/w/${token}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /<base href="\/">/);
    assert.match(html, /window\.__TRAMA__=/);
    assert.ok(html.includes(`"apiBase":"/w/${token}"`));
    assert.ok(!html.includes("unpkg.com"));
    assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
    assert.match(html, /noindex/);
  });

  test("local file-management endpoints cannot escape the workspace", async () => {
    const { edit_token: token } = (await json(server.base, "POST", "/api/v1/workspaces", {})).data.workspace;
    for (const path of ["/etc/passwd", "../../data/loopviewer.db", resolve(root, "data", "loopviewer.db")]) {
      const opened = await json(server.base, "POST", `/w/${token}/api/project/open`, { path });
      assert.equal(opened.status, 404, path);
    }
    const created = await json(server.base, "POST", `/w/${token}/api/project/new`, { title: "Outro", path: "/tmp/evil.db" });
    assert.equal(created.status, 201);
    assert.match(created.data.redirect, /^\/w\/[A-Za-z0-9_-]{32}$/);
    assert.notEqual(created.data.redirect, `/w/${token}`);

    const projects = await json(server.base, "GET", `/w/${token}/api/projects`);
    assert.equal(projects.data.projects.length, 1);
    assert.equal(projects.data.projects[0].path, `/w/${token}`);

    const reopen = await json(server.base, "POST", `/w/${token}/api/project/open`, { path: `${server.base}${created.data.redirect}` });
    assert.equal(reopen.data.redirect, created.data.redirect);

    const backup = await json(server.base, "GET", `/w/${token}/api/project/backup`);
    const imported = await json(server.base, "POST", `/w/${token}/api/project/import`, { bundle: backup.data });
    assert.equal(imported.status, 201);
    assert.match(imported.data.redirect, /^\/w\//);
  });

  test("uploads reject non-image content types", async () => {
    const { edit_token: token } = (await json(server.base, "POST", "/api/v1/workspaces", {})).data.workspace;
    const html = await json(server.base, "POST", `/w/${token}/api/assets`, {
      filename: "x.html",
      mime_type: "text/html",
      content_base64: Buffer.from("<script>alert(1)</script>").toString("base64")
    });
    assert.equal(html.status, 415);
    const png = await json(server.base, "POST", `/w/${token}/api/assets`, {
      filename: "x.png",
      mime_type: "image/png",
      content_base64: Buffer.from("fake-png").toString("base64")
    });
    assert.equal(png.status, 201);
    const served = await fetch(`${server.base}/w/${token}/api/assets/${png.data.asset.id}`);
    assert.match(served.headers.get("content-security-policy"), /sandbox/);
    assert.equal(served.headers.get("x-content-type-options"), "nosniff");
  });

  test("agents author, audit and publish through /api/v1", async () => {
    const created = await json(server.base, "POST", "/api/v1/workspaces", { title: "Agente" });
    assert.equal(created.status, 201);
    const ws = created.data.workspace;
    assert.ok(ws.share_url.includes("/p/"));
    assert.ok(ws.mcp_url.endsWith("/mcp"));

    const unauth = await json(server.base, "GET", "/api/v1/workspace");
    assert.equal(unauth.status, 401);

    const validation = await json(server.base, "POST", "/api/v1/validate/map", { markdown: loopMarkdown });
    assert.equal(validation.status, 200);
    assert.equal(validation.data.map_id, "capitalismo-exaustao-recursos");
    assert.equal(validation.data.report.loops.length, 2);

    const invalid = await json(server.base, "POST", "/api/v1/validate/map", { markdown: "## Relations\n\na ++ b" });
    assert.equal(invalid.status, 422);
    assert.ok(invalid.data.details.errors.length);

    const empty = await json(server.base, "POST", "/api/v1/validate/map", { markdown: "# Só título\n\nSem variáveis." });
    assert.equal(empty.status, 422);
    assert.match(empty.data.error, /no variables/);

    const embedded = await json(server.base, "POST", "/api/v1/validate/map", {
      markdown: "# Espera\n\n```mermaid\ngraph TD\nA[Espera] -->|+| B[Atalhos]\nB -->|+| A\n```\n"
    });
    assert.equal(embedded.status, 200);
    assert.equal(embedded.data.format, "markdown-mermaid");
    assert.equal(embedded.data.report.stats.nodes, 2);

    const published = await json(server.base, "POST", "/api/v1/publish", {
      map: { markdown: loopMarkdown },
      story: { markdown: storyMarkdown }
    }, bearer(ws.edit_token));
    assert.equal(published.status, 200, JSON.stringify(published.data));
    assert.equal(published.data.map.id, "capitalismo-exaustao-recursos");
    assert.ok(published.data.presentation.id);
    assert.ok(published.data.lint.valid);

    const summary = await json(server.base, "GET", "/api/v1/workspace", undefined, bearer(ws.edit_token));
    // The empty starter map is replaced by the first real map.
    assert.deepEqual(summary.data.workspace.maps.map(map => map.id), ["capitalismo-exaustao-recursos"]);
    assert.deepEqual(summary.data.workspace.maps[0].presentation_ids, [published.data.presentation.id]);

    // Re-publishing updates instead of duplicating.
    await json(server.base, "POST", "/api/v1/publish", { map: { markdown: loopMarkdown }, story: { markdown: storyMarkdown } }, bearer(ws.edit_token));
    const presentations = await json(server.base, "GET", "/api/v1/presentations", undefined, bearer(ws.edit_token));
    assert.equal(presentations.data.presentations.length, 1);

    const scenes = (await json(server.base, "GET", `/api/v1/presentations/${published.data.presentation.id}`, undefined, bearer(ws.edit_token)))
      .data.presentation.data.chapters.flatMap(chapter => chapter.scenes);
    assert.ok(scenes.every(scene => scene.mapRef?.mapId === "capitalismo-exaustao-recursos"));
    assert.ok(scenes.every(scene => ["fit-map", "fit-focus", "follow-path", "fit-set"].includes(scene.stage.camera.mode)));
    assert.ok(scenes.some(scene => scene.stage.camera.mode !== "fit-map"));

    const markdown = await json(server.base, "GET", "/api/v1/maps/capitalismo-exaustao-recursos?format=markdown", undefined, bearer(ws.edit_token));
    assert.match(markdown.data.map.markdown, /## Relations/);

    const badStory = await json(server.base, "PUT", "/api/v1/maps/capitalismo-exaustao-recursos/presentation", {
      markdown: "# X\n\n## Cena: A\nfocus: node nao-existe\n\n### B\nfocus: node nao-existe\n\nTexto."
    }, bearer(ws.edit_token));
    assert.equal(badStory.status, 422);

    const lastMap = await json(server.base, "DELETE", "/api/v1/maps/capitalismo-exaustao-recursos", undefined, bearer(ws.edit_token));
    assert.equal(lastMap.status, 409);

    const share = await fetch(published.data.links.present_url.replace(/^https?:\/\/[^/]+/, server.base));
    const shareHtml = await share.text();
    assert.equal(share.status, 200);
    assert.match(shareHtml, /__LOOPVIEWER_DATA__/);
    assert.ok(shareHtml.includes("capitalismo-exaustao-recursos"));
    assert.ok(!shareHtml.includes(ws.edit_token), "share page must not leak the edit token");
    assert.match(share.headers.get("content-security-policy"), /connect-src 'none'/);

    const openapi = await json(server.base, "GET", "/api/v1/openapi.json");
    assert.equal(openapi.data.openapi, "3.1.0");
  });

  test("rotating the share link invalidates the old one", async () => {
    const ws = (await json(server.base, "POST", "/api/v1/workspaces", {})).data.workspace;
    const oldShare = ws.share_url.replace(/^https?:\/\/[^/]+/, server.base);
    assert.equal((await fetch(oldShare)).status, 200);
    const rotated = await json(server.base, "POST", "/api/v1/workspace/share/rotate", undefined, bearer(ws.edit_token));
    assert.notEqual(rotated.data.workspace.share_url, ws.share_url);
    assert.equal((await fetch(oldShare)).status, 404);
  });

  test("MCP: initialize, list tools, create a workspace and author through the workspace URL", async () => {
    const rpc = async (path, method, params, id = 1, headers = {}) => json(server.base, "POST", path, { jsonrpc: "2.0", id, method, params }, headers);
    const init = await rpc("/mcp", "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    assert.equal(init.data.result.protocolVersion, "2025-06-18");
    assert.equal(init.data.result.serverInfo.name, "trama");
    assert.equal(init.headers.get("access-control-allow-origin"), "*");

    const notification = await fetch(`${server.base}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })
    });
    assert.equal(notification.status, 202);

    const tools = await rpc("/mcp", "tools/list", {});
    const names = tools.data.result.tools.map(tool => tool.name);
    for (const name of ["get_authoring_guide", "create_workspace", "validate_map", "save_map", "save_presentation", "publish", "get_map"]) {
      assert.ok(names.includes(name), name);
    }

    const noWorkspace = await rpc("/mcp", "tools/call", { name: "get_workspace", arguments: {} });
    assert.equal(noWorkspace.data.result.isError, true);

    const created = await rpc("/mcp", "tools/call", { name: "create_workspace", arguments: { title: "Via MCP" } });
    const ws = created.data.result.structuredContent.workspace;
    assert.ok(ws.edit_token);

    const saved = await rpc(`/w/${ws.edit_token}/mcp`, "tools/call", { name: "publish", arguments: { map_markdown: loopMarkdown, story_markdown: storyMarkdown } });
    assert.equal(saved.data.result.isError, undefined, saved.data.result.content?.[0]?.text);
    assert.equal(saved.data.result.structuredContent.map.id, "capitalismo-exaustao-recursos");

    const read = await rpc("/mcp", "tools/call", { name: "get_map", arguments: { map_id: "capitalismo-exaustao-recursos" } }, 2, bearer(ws.edit_token));
    assert.match(read.data.result.structuredContent.map.markdown, /expectativa-lucratividade/);

    const viaArgument = await rpc("/mcp", "tools/call", { name: "get_workspace", arguments: { workspace_token: ws.edit_url } });
    assert.equal(viaArgument.data.result.structuredContent.workspace.maps.length, 1);

    const invalidMap = await rpc("/mcp", "tools/call", { name: "validate_map", arguments: { markdown: "## Relations\n\na ++ b" } });
    assert.equal(invalidMap.data.result.isError, true);

    const unknownMethod = await rpc("/mcp", "does/not/exist", {});
    assert.equal(unknownMethod.data.error.code, -32601);

    const get = await fetch(`${server.base}/mcp`);
    assert.equal(get.status, 405);
  });

  test("the CLI drives the full agent workflow", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "trama-cli-"));
    const cli = resolve(root, "cli/trama.mjs");
    const env = { ...process.env, TRAMA_URL: server.base, TRAMA_TOKEN: "" };
    try {
      const init = await run(process.execPath, [cli, "init", "--title", "CLI", "--json"], { cwd, env });
      const token = JSON.parse(init.stdout).workspace.edit_token;
      assert.ok(token);
      assert.equal(JSON.parse(readFileSync(join(cwd, ".trama.json"), "utf8")).token, token);
      writeFileSync(join(cwd, "mapa.loop.md"), loopMarkdown);
      writeFileSync(join(cwd, "mapa.story.md"), storyMarkdown);
      const validate = await run(process.execPath, [cli, "validate", "mapa.loop.md", "--story", "mapa.story.md"], { cwd, env });
      assert.match(validate.stdout, /R1: reinforcing/);
      const push = await run(process.execPath, [cli, "push", "mapa.loop.md", "--story", "mapa.story.md"], { cwd, env });
      assert.match(push.stdout, /Presentation: http/);
      const pull = await run(process.execPath, [cli, "pull", "capitalismo-exaustao-recursos"], { cwd, env });
      assert.match(pull.stdout, /capitalismo-exaustao-recursos\.story\.md/);
      const status = await run(process.execPath, [cli, "status"], { cwd, env });
      assert.match(status.stdout, /capitalismo-exaustao-recursos/);
      const viaUrl = await run(process.execPath, [cli, "maps"], { cwd: tmpdir(), env: { ...env, TRAMA_URL: "", TRAMA_TOKEN: `${server.base}/w/${token}` } });
      assert.match(viaUrl.stdout, /capitalismo-exaustao-recursos/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("logs redact secret tokens", () => {
    assert.equal(redactUrl("/w/abcdefabcdefabcdefabcdefabcdefab/api/project"), "/w/<redacted>/api/project");
    assert.equal(redactUrl("/p/abcdefabcdefabcdefabcd?map=x"), "/p/<redacted>?map=x");
  });
});

describe("hosted limits", () => {
  let server;
  before(async () => {
    server = await startServer({ TRAMA_MAX_JSON_BYTES: "2048", TRAMA_MAX_MAPS: "2", TRAMA_RATE_CREATE: "3", TRAMA_RATE_WRITE: "1000" });
  });
  after(async () => { await server.stop(); });

  test("body size, map quota and creation rate are enforced", async () => {
    const ws = (await json(server.base, "POST", "/api/v1/workspaces", {})).data.workspace;
    const big = await json(server.base, "PUT", `/w/${ws.edit_token}/api/project`, { description_md: "x".repeat(5000) });
    assert.equal(big.status, 413);

    const malformed = await fetch(`${server.base}/w/${ws.edit_token}/api/project`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{nope" });
    assert.equal(malformed.status, 400);

    const make = id => json(server.base, "POST", `/w/${ws.edit_token}/api/loops`, { title: id, model: { id, title: id, nodes: [], edges: [] } });
    assert.equal((await make("um")).status, 201); // starter + 1 = 2 maps
    assert.equal((await make("dois")).status, 409);

    // 1 creation above + 2 more = 3, the 4th is limited.
    assert.equal((await json(server.base, "POST", "/api/v1/workspaces", {})).status, 201);
    assert.equal((await json(server.base, "POST", "/api/v1/workspaces", {})).status, 201);
    const limited = await json(server.base, "POST", "/api/v1/workspaces", {});
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
  });
});
