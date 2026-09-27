/**
 * Small HTTP helpers shared by the local-first server and the hosted (public)
 * server. They carry no project knowledge.
 */

export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

export const DEFAULT_JSON_LIMIT = 4 * 1024 * 1024;

/**
 * Read a JSON request body. The limit is optional for the local server and
 * mandatory in hosted mode, where every caller is untrusted.
 */
export async function readJson(request, { limit = Infinity } = {}) {
  const declared = Number(request.headers["content-length"] || 0);
  if (declared > limit) {
    request.resume();
    throw new HttpError(413, `Request body exceeds ${formatBytes(limit)}.`);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) {
      request.resume();
      throw new HttpError(413, `Request body exceeds ${formatBytes(limit)}.`);
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return value && typeof value === "object" ? value : {};
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

export function sendJson(response, status, body, headers = {}) {
  if (response.headersSent) return;
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(body));
}

export function sendText(response, status, body, contentType = "text/plain; charset=utf-8", headers = {}) {
  if (response.headersSent) return;
  response.writeHead(status, { "Content-Type": contentType, ...headers });
  response.end(body);
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "unlimited";
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
