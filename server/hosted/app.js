/**
 * Hosted, account-less Trama.
 *
 *   /                      landing page (create / reopen workspaces)
 *   /new (POST)            create a workspace from the landing form
 *   /w/<edit>              application shell bound to one secret workspace
 *   /w/<edit>/api/...      project API for that workspace (browser)
 *   /w/<edit>/mcp          MCP endpoint bound to that workspace
 *   /p/<share>             read-only interactive publication
 *   /mcp                   MCP endpoint (Bearer token or tool argument)
 *   /api/v1/...            agent REST API (Bearer token)
 *   /llms.txt              authoring guide for agents
 *   /healthz               liveness probe
 */
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { HttpError, readJson, sendJson, sendText } from "../http.js";
import { handleProjectRoutes } from "../projectRoutes.js";
import { examples } from "../../src/models/examples.js";
import { exampleAssets } from "../../src/models/exampleAssets.js";
import { WorkspaceRegistry } from "./registry.js";
import { RateLimiter } from "./rateLimit.js";
import { createOperations } from "./operations.js";
import { createShareRenderer } from "./share.js";
import { createMcpHandler } from "./mcp.js";
import { handleApiV1, OPENAPI_DOCUMENT } from "./apiV1.js";
import { extractEditToken } from "./tokens.js";
import {
  APP_CSP,
  BASE_SECURITY_HEADERS,
  SHARE_CSP,
  escapeHtml,
  renderAppShell,
  resolveStaticPath,
  sendHtml,
  serveStaticFile
} from "./static.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Retry-After",
  "Access-Control-Max-Age": "86400"
};

export function createHostedApp(config) {
  const version = JSON.parse(readFileSync(resolve(config.root, "package.json"), "utf8")).version;
  const registry = new WorkspaceRegistry({
    dataRoot: config.dataRoot,
    limits: config.limits,
    seedCatalog: examples,
    seedAssets: exampleAssets.map(asset => ({ ...asset, content: readFileSync(asset.path) }))
  });
  const limiter = new RateLimiter();
  const operations = createOperations({ registry, config });
  const shareRenderer = createShareRenderer({ root: config.root, productName: config.productName });
  const hostedPublicDir = resolve(config.root, "server", "hosted", "public");
  const guide = renderTemplate(readFileSync(resolve(config.root, "server", "hosted", "guide.md"), "utf8"), config);
  const landingTemplate = readFileSync(resolve(hostedPublicDir, "landing.html"), "utf8");
  const mcp = createMcpHandler({ operations, registry, config, guide, version });

  const server = createServer((request, response) => {
    handle(request, response).catch(error => {
      if (error instanceof HttpError) {
        sendJson(response, error.status, { error: error.message, ...(error.details ? { details: error.details } : {}) }, {
          ...(isAgentPath(request.url) ? CORS_HEADERS : {}),
          ...(error.status === 429 ? { "Retry-After": String(error.details?.retry_after_seconds || 60) } : {})
        });
        return;
      }
      console.error("[trama]", request.method, redactUrl(request.url), error);
      sendJson(response, 500, { error: "Internal server error." });
    });
  });
  server.headersTimeout = 30_000;
  server.requestTimeout = 120_000;

  const sweeper = setInterval(() => {
    try {
      const removed = registry.sweep(config.retention);
      if (removed.length) console.log(`[trama] retention sweep removed ${removed.length} workspace(s)`);
    } catch (error) {
      console.error("[trama] retention sweep failed", error);
    }
  }, Math.max(1, config.retention.sweepMinutes) * 60_000);
  sweeper.unref();

  async function handle(request, response) {
    const url = new URL(request.url, "http://trama.local");
    const path = url.pathname;
    const client = clientAddress(request, config);

    if (request.method === "OPTIONS" && isAgentPath(path)) {
      response.writeHead(204, CORS_HEADERS);
      response.end();
      return;
    }

    if (path === "/healthz") {
      sendJson(response, 200, { ok: true, version, ...registry.stats() });
      return;
    }

    // Static files are cheap and a classroom behind one NAT loads dozens of
    // them at once; only dynamic endpoints count against the client budget.
    if (isDynamicPath(path)) rateLimit(client, request.method);

    if (path === "/" && request.method === "GET") {
      // The editorial product landing (landing/, built into dist/landing) is
      // the public front page; the start page handles workspaces.
      const productLanding = await renderProductLanding();
      sendHtml(response, 200, productLanding || renderLanding(), { csp: APP_CSP, headers: { "Cache-Control": "no-cache" } });
      return;
    }
    if ((path === "/comecar" || path === "/start") && request.method === "GET") {
      sendHtml(response, 200, renderLanding(), { csp: APP_CSP });
      return;
    }
    if (path === "/robots.txt") {
      sendText(response, 200, "User-agent: *\nDisallow: /w/\nDisallow: /p/\nDisallow: /api/\nDisallow: /mcp\n");
      return;
    }
    if (path === "/llms.txt" || path === "/api/v1/guide") {
      sendText(response, 200, guide, "text/markdown; charset=utf-8", { ...CORS_HEADERS, "Cache-Control": "public, max-age=300" });
      return;
    }
    if (path === "/cli/trama.mjs") {
      if (!await serveStaticFile(response, resolve(config.root, "cli", "trama.mjs"), { request })) notFound(response);
      return;
    }
    if (path === "/new" && request.method === "POST") {
      await createFromForm(request, response, client);
      return;
    }
    if (path === "/mcp") {
      await handleMcp(request, response, extractBearer(request));
      return;
    }
    if (path === "/api/v1" || path.startsWith("/api/v1/")) {
      if (path === "/api/v1/workspaces" && request.method === "POST") limitCreation(client);
      await handleApiV1({ request, response, url, operations, registry, config, readBody: kind => readBody(request, kind), cors: CORS_HEADERS });
      return;
    }

    const workspaceMatch = path.match(/^\/w\/([A-Za-z0-9_-]{32,64})(\/.*)?$/);
    if (workspaceMatch) {
      await handleWorkspace(request, response, url, workspaceMatch[1], workspaceMatch[2] || "/", client);
      return;
    }

    const shareMatch = path.match(/^\/p\/([A-Za-z0-9_-]{20,64})\/?$/);
    if (shareMatch && request.method === "GET") {
      await handleShare(response, url, shareMatch[1]);
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      const filePath = resolveStaticPath(config.root, hostedPublicDir, path);
      const cache = path.startsWith("/assets/fonts/") ? "public, max-age=2592000, immutable" : "no-cache";
      if (filePath && await serveStaticFile(response, filePath, { cache, request })) return;
    }
    notFound(response);
  }

  async function handleWorkspace(request, response, url, token, rest, client) {
    const record = registry.resolveEditToken(token);
    if (!record) {
      if (rest.startsWith("/api/") || rest === "/mcp") throw new HttpError(404, "Workspace not found.");
      sendHtml(response, 404, messagePage("Espaço não encontrado",
        "Este link não corresponde a nenhum espaço. Ele pode ter sido digitado errado ou removido por inatividade."));
      return;
    }
    const workspacePath = `/w/${token}`;

    if (rest === "/" && request.method === "GET") {
      const links = operations.links(record, { editToken: token });
      const html = await renderAppShell(config.root, {
        hosted: true,
        productName: config.productName,
        apiBase: workspacePath,
        workspacePath,
        links: { ...links, cli_url: `${config.publicUrl}/cli/trama.mjs`, guide_url: `${config.publicUrl}/llms.txt` }
      }, { productName: config.productName });
      sendHtml(response, 200, html);
      return;
    }

    if (rest === "/mcp") {
      await handleMcp(request, response, token);
      return;
    }

    if (!rest.startsWith("/api/")) {
      notFound(response);
      return;
    }

    const apiUrl = new URL(rest + url.search, "http://trama.local");
    const store = registry.store(record.id);
    const sendProject = (res, status = 200) => {
      const maps = store.listMaps().map(map => ({ ...map, views: store.listViews(map.id) }));
      sendJson(res, status, {
        project: { ...store.getProject(), path: workspacePath },
        loops: store.listLoops(),
        maps,
        presentations: store.listPresentations(),
        assets: store.listAssets()
      });
    };

    if (await handleHostedProjectManagement(request, response, apiUrl, record, token, store, client)) return;

    const handled = await handleProjectRoutes({
      request,
      response,
      url: apiUrl,
      store,
      sendProject,
      hooks: {
        readBody: (req, kind) => readBody(req, kind),
        beforeWrite: kind => operations.enforceQuota(record, kind),
        beforeCreate: kind => operations.enforceQuota(record, kind, { create: true }),
        afterWrite: () => operations.touched(record),
        validateAsset: asset => operations.validateAsset(asset),
        assetCacheControl: "private, max-age=31536000, immutable"
      }
    });
    if (!handled) sendJson(response, 404, { error: "Not found." });
  }

  /**
   * The local shell manages SQLite files by path. In hosted mode the same
   * actions map onto secret workspaces and answer with a redirect.
   */
  async function handleHostedProjectManagement(request, response, url, record, token, store, client) {
    const { pathname } = url;
    const method = request.method;
    if (method === "GET" && pathname === "/api/projects") {
      const maps = store.listMaps();
      sendJson(response, 200, {
        projects: [{
          ...store.getProject(),
          path: `/w/${token}`,
          file: "Este espaço",
          active: true,
          metrics: {
            maps: Math.max(maps.length, store.listLoops().length),
            views: maps.reduce((total, map) => total + store.listViews(map.id).length, 0),
            presentations: store.listPresentations().length,
            assets: store.listAssets().length
          }
        }]
      });
      return true;
    }
    if (method === "POST" && pathname === "/api/project/new") {
      limitCreation(client);
      const body = await readBody(request);
      const created = registry.create({ title: body.title, description_md: body.description_md, seed: "starter" });
      sendJson(response, 201, { redirect: `/w/${created.editToken}` });
      return true;
    }
    if (method === "POST" && pathname === "/api/project/open") {
      const body = await readBody(request);
      const target = extractEditToken(body.path);
      if (!target || !registry.resolveEditToken(target)) {
        sendJson(response, 404, { error: "Workspace does not exist." });
        return true;
      }
      sendJson(response, 200, { redirect: `/w/${target}` });
      return true;
    }
    if (method === "POST" && pathname === "/api/project/import") {
      limitCreation(client);
      const body = await readBody(request, "bundle");
      const bundle = body.bundle;
      operations.validateBundle(bundle);
      const created = registry.create({ title: `${bundle.project?.title || "Projeto"} importado`, bundle });
      sendJson(response, 201, { redirect: `/w/${created.editToken}` });
      return true;
    }
    if (method === "GET" && pathname === "/api/hosted/workspace") {
      sendJson(response, 200, {
        links: operations.links(registry.get(record.id), { editToken: token }),
        limits: config.limits
      });
      return true;
    }
    if (method === "POST" && pathname === "/api/hosted/share/rotate") {
      const next = registry.rotateShareToken(record.id);
      sendJson(response, 200, { links: operations.links(next, { editToken: token }) });
      return true;
    }
    if (method === "DELETE" && pathname === "/api/hosted/workspace") {
      const body = await readBody(request);
      if (body.confirm !== "delete") throw new HttpError(400, "Send { confirm: \"delete\" } to delete this workspace.");
      registry.delete(record.id);
      sendJson(response, 200, { ok: true, redirect: "/" });
      return true;
    }
    return false;
  }

  async function handleShare(response, url, shareToken) {
    const record = registry.resolveShareToken(shareToken);
    if (!record) {
      sendHtml(response, 404, messagePage("Publicação não encontrada",
        "Este link de leitura não existe mais. Peça um link novo a quem compartilhou."), { csp: SHARE_CSP });
      return;
    }
    const store = registry.store(record.id);
    const html = await shareRenderer.render({
      store,
      cacheKey: `${record.id}:${record.updated_at}:${record.share_token}`,
      mapId: url.searchParams.get("map"),
      presentationOnly: url.searchParams.get("embed") === "presentation",
      sidebar: url.searchParams.get("sidebar") !== "0"
    });
    if (!html) {
      sendHtml(response, 404, messagePage("Nada publicado ainda", "Este espaço ainda não tem mapas."), { csp: SHARE_CSP });
      return;
    }
    sendHtml(response, 200, html, {
      csp: SHARE_CSP,
      headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "private, max-age=30" }
    });
  }

  async function handleMcp(request, response, token) {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Use POST for MCP (Streamable HTTP, stateless)." }, { ...CORS_HEADERS, Allow: "POST, OPTIONS" });
      return;
    }
    const body = await readJsonAny(request, config.limits.jsonBytes);
    const messages = Array.isArray(body) ? body : [body];
    const replies = [];
    for (const message of messages) {
      const reply = await mcp.handleMessage(message, token);
      if (reply) replies.push(reply);
    }
    if (!replies.length) {
      response.writeHead(202, CORS_HEADERS);
      response.end();
      return;
    }
    sendJson(response, 200, Array.isArray(body) ? replies : replies[0], CORS_HEADERS);
  }

  async function createFromForm(request, response, client) {
    limitCreation(client);
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 16 * 1024) throw new HttpError(413, "Form too large.");
      chunks.push(chunk);
    }
    const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
    const seed = form.get("seed") === "examples" ? "examples" : "starter";
    const title = (form.get("title") || "").trim() || (seed === "examples" ? "Exemplos" : "Meu espaço");
    const { editToken } = registry.create({ title, seed });
    response.writeHead(303, { ...BASE_SECURITY_HEADERS, Location: `/w/${editToken}`, "Cache-Control": "no-store" });
    response.end();
  }

  function readBody(request, kind = "json") {
    const limit = kind === "asset"
      ? Math.ceil(config.limits.assetBytes * 1.37) + 64 * 1024
      : kind === "bundle"
        ? Math.ceil(config.limits.workspaceBytes * 1.37)
        : config.limits.jsonBytes;
    return readJson(request, { limit });
  }

  function rateLimit(client, method) {
    const write = !["GET", "HEAD", "OPTIONS"].includes(method);
    const bucket = write ? "write" : "read";
    const result = limiter.hit(`${bucket}:${client}`, config.rateLimits[bucket], 60_000);
    if (!result.allowed) throw new RateLimitError(result.retryAfter);
  }

  function limitCreation(client) {
    const result = limiter.hit(`create:${client}`, config.rateLimits.create, 3_600_000);
    if (!result.allowed) throw new RateLimitError(result.retryAfter, "Too many workspaces created from this address. Try again later.");
  }

  function renderLanding() {
    return renderTemplate(landingTemplate, config);
  }

  let productLandingCache = null;
  async function renderProductLanding() {
    if (productLandingCache && process.env.TRAMA_DEV !== "1") return productLandingCache;
    let html;
    try {
      html = readFileSync(resolve(config.root, "dist", "landing", "index.html"), "utf8");
    } catch {
      return null;
    }
    const start = '<a class="nav-action" href="/comecar">Criar meu espaço</a>';
    html = html.replace(/(<nav aria-label="Navegação principal">[\s\S]*?)<\/nav>/, `$1${start}</nav>`);
    html = html.replace(/(<section class="closing[\s\S]*?)(<\/div><\/section>)/,
      '$1<a class="button" href="/comecar">Criar meu espaço, sem conta</a>$2');
    html = html.replace(/(<footer class="site-footer[^>]*>)/,
      '$1<p class="hosted-agents">Para agentes: <a href="/llms.txt">guia</a> · MCP <code>/mcp</code> · <a href="/api/v1/openapi.json">API</a></p>');
    html = html.replace("</head>", `<style>
    nav a[href="/comecar"] { white-space: nowrap; }
    @media (max-width: 560px) { nav a.nav-action[data-start] { display: none; } }
    .hosted-agents { font-size: 0.85em; opacity: 0.8; }
    .hosted-agents code { font-size: 0.95em; }
  </style>
</head>`);
    productLandingCache = html;
    return html;
  }

  function messagePage(title, text) {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} — ${escapeHtml(config.productName)}</title><link rel="stylesheet" href="/hosted/landing.css"></head><body class="trama-message"><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p><p><a class="button" href="/">Ir para ${escapeHtml(config.productName)}</a></p></main></body></html>`;
  }

  function notFound(response) {
    sendText(response, 404, "Not found", "text/plain; charset=utf-8", BASE_SECURITY_HEADERS);
  }

  return {
    server,
    registry,
    operations,
    openapi: OPENAPI_DOCUMENT,
    close() {
      clearInterval(sweeper);
      limiter.close();
      return new Promise(resolveClose => server.close(() => {
        registry.close();
        resolveClose();
      }));
    }
  };
}

class RateLimitError extends HttpError {
  constructor(retryAfter, message = "Too many requests. Slow down and retry later.") {
    super(429, message, { retry_after_seconds: retryAfter });
  }
}

function extractBearer(request) {
  const header = String(request.headers.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? extractEditToken(match[1].trim()) : null;
}

function clientAddress(request, config) {
  if (config.trustProxy) {
    const forwarded = String(request.headers[config.clientIpHeader] || "").split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return request.socket.remoteAddress || "unknown";
}

function isDynamicPath(path) {
  return path === "/new" || path === "/mcp" || path.startsWith("/api/") ||
    path.startsWith("/p/") || /^\/w\/[^/]+\/(api|mcp)/.test(path);
}

function isAgentPath(value) {
  const path = String(value || "");
  return path.startsWith("/api/v1") || path === "/mcp" || /^\/w\/[^/]+\/mcp$/.test(path.split("?")[0]) || path.startsWith("/llms.txt");
}

async function readJsonAny(request, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, "Request body too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "null");
  } catch {
    throw new HttpError(400, "Request body must be valid JSON-RPC.");
  }
}

/** Never log secret edit tokens. */
export function redactUrl(value) {
  return String(value || "").replace(/\/w\/[A-Za-z0-9_-]+/g, "/w/<redacted>").replace(/\/p\/[A-Za-z0-9_-]+/g, "/p/<redacted>");
}

function renderTemplate(template, config) {
  const mb = bytes => `${Math.round(bytes / 1048576)} MB`;
  return template
    .replaceAll("{{PRODUCT}}", config.productName)
    .replaceAll("{{PUBLIC_URL}}", config.publicUrl)
    .replaceAll("{{JSON_LIMIT}}", mb(config.limits.jsonBytes))
    .replaceAll("{{ASSET_LIMIT}}", mb(config.limits.assetBytes))
    .replaceAll("{{MAP_LIMIT}}", String(config.limits.mapsPerWorkspace))
    .replaceAll("{{UNTOUCHED_DAYS}}", String(config.retention.untouchedDays))
    .replaceAll("{{INACTIVE_DAYS}}", String(config.retention.inactiveDays))
    .replaceAll("{{CONTACT}}", config.contact ? escapeHtml(config.contact) : "")
    .replaceAll("{{CONTACT_BLOCK}}", config.contact
      ? `<p>Para denunciar conteúdo abusivo ou pedir remoção, escreva para <a href="mailto:${escapeHtml(config.contact)}">${escapeHtml(config.contact)}</a>.</p>`
      : "");
}
