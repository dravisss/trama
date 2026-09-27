/**
 * Hosted mode (trama) serves each secret workspace under `/w/<token>` and
 * injects `window.__TRAMA__.apiBase`. Local-first mode has no base, so every
 * `/api/...` path is used unchanged.
 */
export function hostedContext() {
  const context = globalThis.__TRAMA__;
  return context && typeof context === "object" && context.hosted ? context : null;
}

export function apiUrl(path) {
  const base = hostedContext()?.apiBase || "";
  return base && typeof path === "string" && path.startsWith("/api/") ? `${base}${path}` : path;
}

export async function apiFetch(path, { method = "GET", body } = {}) {
  const response = await fetch(apiUrl(path), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || `Request failed: ${response.status}`);
    if (data && typeof data === "object") Object.assign(error, data);
    error.status = response.status;
    throw error;
  }
  return data;
}
