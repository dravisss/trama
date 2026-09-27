import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/landing/", import.meta.url));
const port = Number(process.env.TRAMA_LANDING_PORT || 4180);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".webp": "image/webp" };
const server = createServer(async (request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const path = resolve(root, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
    if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) { response.writeHead(403); response.end(); return; }
    if (!(await stat(path)).isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Type": mime[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    });
    response.end(request.method === "HEAD" ? undefined : await readFile(path));
  } catch { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); response.end("Página não encontrada."); }
});
server.listen(port, "127.0.0.1", () => console.log(`Trama landing → http://127.0.0.1:${port}/ (${root})`));
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close(() => process.exit(0)));
