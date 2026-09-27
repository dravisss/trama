/**
 * Static delivery for hosted mode.
 *
 * Only an explicit allowlist leaves the server: the built bundles, the CSS
 * the shell links to, fonts, vendored Cytoscape files and the hosted UI. The
 * repository itself (data/, docs/, research/, .git, source JS) is never
 * reachable, unlike the local-first development server.
 */
import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { sendText } from "../http.js";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

const ROOT_FILES = new Set(["/styles.css", "/standalone.css", "/atlas-embed.css"]);

const VENDOR_FILES = {
  "/vendor/cytoscape.min.js": "node_modules/cytoscape/dist/cytoscape.min.js",
  "/vendor/layout-base.js": "node_modules/layout-base/layout-base.js",
  "/vendor/cose-base.js": "node_modules/cose-base/cose-base.js",
  "/vendor/cytoscape-cose-bilkent.js": "node_modules/cytoscape-cose-bilkent/cytoscape-cose-bilkent.js"
};

const CDN_REWRITES = [
  [/https:\/\/unpkg\.com\/cytoscape@[^"]+\/dist\/cytoscape\.min\.js/g, "/vendor/cytoscape.min.js"],
  [/https:\/\/unpkg\.com\/layout-base\/layout-base\.js/g, "/vendor/layout-base.js"],
  [/https:\/\/unpkg\.com\/cose-base\/cose-base\.js/g, "/vendor/cose-base.js"],
  [/https:\/\/unpkg\.com\/cytoscape-cose-bilkent@[^"]+\/cytoscape-cose-bilkent\.js/g, "/vendor/cytoscape-cose-bilkent.js"]
];

export const APP_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

export const SHARE_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob: 'self'",
  "font-src data:",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors *"
].join("; ");

export const BASE_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()"
};

export function resolveStaticPath(root, hostedPublicDir, pathname) {
  if (pathname.includes("\0")) return null;
  if (VENDOR_FILES[pathname]) return resolve(root, VENDOR_FILES[pathname]);
  if (ROOT_FILES.has(pathname)) return resolve(root, `.${pathname}`);
  if (pathname.startsWith("/hosted/")) return within(hostedPublicDir, pathname.slice("/hosted/".length));
  if (pathname.startsWith("/dist/")) return within(resolve(root, "dist"), pathname.slice("/dist/".length));
  // The product landing is served at "/" and references ./assets/*.
  if (pathname.startsWith("/assets/")) {
    const landingAsset = within(resolve(root, "dist", "landing", "assets"), pathname.slice("/assets/".length));
    if (landingAsset && existsSync(landingAsset)) return landingAsset;
  }
  if (pathname.startsWith("/assets/fonts/")) return within(resolve(root, "assets", "fonts"), pathname.slice("/assets/fonts/".length));
  // The shell links stylesheets that live next to their components.
  if (pathname.startsWith("/src/") && pathname.endsWith(".css")) return within(resolve(root, "src"), pathname.slice("/src/".length));
  return null;
}

function within(base, relative) {
  const target = resolve(base, relative);
  return target.startsWith(base + sep) ? target : null;
}

export async function serveStaticFile(response, filePath, { cache = "no-cache", request = null } = {}) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    // Bundles keep stable names across deploys, so clients revalidate them
    // cheaply (304) instead of running stale code after an update.
    const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
    const headers = {
      ...BASE_SECURITY_HEADERS,
      "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream",
      "Cache-Control": cache,
      ETag: etag
    };
    if (request?.headers["if-none-match"] === etag) {
      response.writeHead(304, headers);
      response.end();
      return true;
    }
    response.writeHead(200, { ...headers, "Content-Length": info.size });
    if (request?.method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
    return true;
  } catch {
    return false;
  }
}

let indexTemplate = null;

/**
 * Serve the application shell for one workspace. The original index.html is
 * reused so local and hosted modes cannot drift; hosted concerns are injected.
 */
export async function renderAppShell(root, context, { productName = "Trama" } = {}) {
  if (!indexTemplate || process.env.TRAMA_DEV === "1") indexTemplate = await readFile(resolve(root, "index.html"), "utf8");
  let html = indexTemplate;
  for (const [pattern, replacement] of CDN_REWRITES) html = html.replace(pattern, replacement);
  const payload = JSON.stringify(context).replaceAll("<", "\\u003c");
  html = html.replace("<head>", `<head>
  <base href="/">
  <meta name="robots" content="noindex, nofollow">
  <script>window.__TRAMA__=${payload};</script>`);
  html = html.replace('<span class="dock-eyebrow">Editor local</span>', '<span class="dock-eyebrow">Editor</span>');
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(productName)} — Mapas sistêmicos</title>`);
  html = html.replace("</body>", `  <link rel="stylesheet" href="/hosted/hosted-ui.css">
  <script type="module" src="/hosted/hosted-ui.js"></script>
</body>`);
  return html;
}

export function sendHtml(response, status, html, { csp = APP_CSP, headers = {} } = {}) {
  sendText(response, status, html, "text/html; charset=utf-8", {
    ...BASE_SECURITY_HEADERS,
    "Content-Security-Policy": csp,
    "Cache-Control": "no-store",
    ...headers
  });
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
