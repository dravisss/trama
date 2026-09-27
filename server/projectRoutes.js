/**
 * Project-scoped REST routes (`/api/project`, loops, maps, views,
 * presentations and assets).
 *
 * These routes operate on one already-resolved ProjectStore. They are shared
 * by the local-first server (one active project chosen by the local user) and
 * the hosted server (one store per secret workspace link). Anything that
 * chooses *which* store to open — opening files by path, listing `.db` files,
 * creating project files — stays in the caller.
 *
 * Hosted mode passes `hooks` to enforce body limits, quotas and asset policy.
 * The local server passes none and keeps its historical behavior.
 */

import { HttpError, readJson as readJsonBody, sendJson } from "./http.js";

const noop = () => {};

export async function handleProjectRoutes({
  request,
  response,
  url,
  store,
  sendProject,
  hooks = {}
}) {
  const parts = url.pathname.split("/").filter(Boolean);
  const method = request.method;
  const readBody = (kind = "json") => hooks.readBody
    ? hooks.readBody(request, kind)
    : readJsonBody(request);
  const beforeCreate = hooks.beforeCreate || noop;
  const beforeWrite = hooks.beforeWrite || noop;
  const afterWrite = hooks.afterWrite || noop;
  const write = async (kind, create, action) => {
    await beforeWrite(kind);
    if (create) await beforeCreate(kind);
    const result = await action();
    await afterWrite(kind);
    return result;
  };

  if (method === "GET" && url.pathname === "/api/project") {
    sendProject(response);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/project/backup") {
    sendJson(response, 200, store.exportBundle());
    return true;
  }

  if (method === "PUT" && url.pathname === "/api/project") {
    const body = await readBody();
    await write("project", false, () => store.updateProject({
      title: body.title,
      description_md: body.description_md
    }));
    sendProject(response);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/loops") {
    sendJson(response, 200, { loops: store.listLoops() });
    return true;
  }

  if (method === "GET" && url.pathname === "/api/maps") {
    sendJson(response, 200, { maps: store.listMaps() });
    return true;
  }

  if (method === "POST" && url.pathname === "/api/maps") {
    const body = await readBody();
    const map = await write("map", true, () => store.createMap(body));
    sendJson(response, 201, { map });
    return true;
  }

  if (parts[0] === "api" && parts[1] === "maps" && parts[2]) {
    const id = decodeURIComponent(parts[2]);
    if (method === "POST" && parts[3] === "promote-loop") {
      const map = await write("map", true, () => store.promoteLoopToMap(id));
      sendJson(response, map ? 201 : 404, map ? { map } : { error: "Loop not found." });
      return true;
    }
    if (method === "GET" && parts[3] === "views") {
      sendJson(response, 200, { views: store.listViews(id) });
      return true;
    }
    if (method === "GET" && parts.length === 3) {
      const map = store.getMap(id);
      sendJson(response, map ? 200 : 404, map ? { map } : { error: "Map not found." });
      return true;
    }
    if (method === "PUT" && parts.length === 3) {
      const body = await readBody();
      const map = await write("map", false, () => store.updateMap(id, body));
      sendJson(response, map ? 200 : 404, map ? { map } : { error: "Map not found." });
      return true;
    }
    if (method === "DELETE" && parts.length === 3) {
      const deleted = await write("map", false, () => store.deleteMap(id));
      sendJson(response, deleted ? 200 : 404, { ok: true });
      return true;
    }
  }

  if (method === "POST" && url.pathname === "/api/views") {
    const body = await readBody();
    const view = await write("view", true, () => store.createView(body));
    sendJson(response, view ? 201 : 404, view ? { view } : { error: "Map not found." });
    return true;
  }

  if (parts[0] === "api" && parts[1] === "views" && parts[2]) {
    const id = decodeURIComponent(parts[2]);
    if (method === "PUT") {
      const body = await readBody();
      const view = await write("view", false, () => store.updateView(id, body));
      sendJson(response, view ? 200 : 404, view ? { view } : { error: "View not found." });
      return true;
    }
    if (method === "DELETE") {
      const deleted = await write("view", false, () => store.deleteView(id));
      sendJson(response, deleted ? 200 : 404, { ok: true });
      return true;
    }
  }

  if (method === "GET" && url.pathname === "/api/presentations") {
    sendJson(response, 200, { presentations: store.listPresentations() });
    return true;
  }

  if (method === "POST" && url.pathname === "/api/presentations") {
    const body = await readBody();
    const presentation = await write("presentation", true, () => store.createPresentation(body));
    sendJson(response, 201, { presentation });
    return true;
  }

  if (parts[0] === "api" && parts[1] === "presentations" && parts[2]) {
    const id = decodeURIComponent(parts[2]);
    if (method === "GET" && parts.length === 3) {
      const presentation = store.getPresentation(id);
      sendJson(response, presentation ? 200 : 404,
        presentation ? { presentation } : { error: "Presentation not found." });
      return true;
    }
    if (method === "POST" && parts[3] === "duplicate") {
      const body = await readBody();
      const duplicate = await write("presentation", true, () => store.duplicatePresentation(id, body));
      sendJson(response, duplicate ? 201 : 404,
        duplicate ? { presentation: duplicate } : { error: "Presentation not found." });
      return true;
    }
    if (method === "GET" && parts[3] === "versions") {
      sendJson(response, 200, { versions: store.listPresentationVersions(id) });
      return true;
    }
    if (method === "POST" && parts[3] === "restore") {
      const body = await readBody();
      const restored = await write("presentation", false,
        () => store.restorePresentationVersion(id, body.version_id || body.versionId));
      sendJson(response, restored ? 200 : 404,
        restored ? { presentation: restored } : { error: "Presentation or version not found." });
      return true;
    }
    if (method === "PUT") {
      const body = await readBody();
      try {
        const presentation = await write("presentation", false, () => store.updatePresentation(id, body));
        sendJson(response, presentation ? 200 : 404,
          presentation ? { presentation } : { error: "Presentation not found." });
      } catch (error) {
        if (error?.status === 409) {
          sendJson(response, 409, { error: "Presentation revision conflict.", current: error.current });
          return true;
        }
        throw error;
      }
      return true;
    }
    if (method === "DELETE") {
      const deleted = await write("presentation", false, () => store.deletePresentation(id));
      sendJson(response, deleted ? 200 : 404, { ok: true });
      return true;
    }
  }

  if (method === "GET" && url.pathname === "/api/assets") {
    sendJson(response, 200, { assets: store.listAssets() });
    return true;
  }

  if (method === "POST" && url.pathname === "/api/assets") {
    const body = await readBody("asset");
    const content = Buffer.from(body.content_base64 || "", "base64");
    if (hooks.validateAsset) hooks.validateAsset({ ...body, content });
    const asset = await write("asset", true, () => store.createAsset({ ...body, content }));
    sendJson(response, 201, { asset });
    return true;
  }

  if (parts[0] === "api" && parts[1] === "assets" && parts[2]) {
    const id = decodeURIComponent(parts[2]);
    if (method === "GET") {
      const asset = store.getAsset(id);
      if (!asset) sendJson(response, 404, { error: "Asset not found." });
      else {
        response.writeHead(200, {
          "Content-Type": safeMimeType(asset.mime_type),
          "Cache-Control": hooks.assetCacheControl || "public, max-age=31536000, immutable",
          "Content-Disposition": `inline; filename="${String(asset.filename).replace(/[^\x20-\x7e]|["\\]/g, "")}"`,
          "X-Content-Type-Options": "nosniff",
          // An uploaded SVG must never run script in the application origin.
          "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"
        });
        response.end(asset.content);
      }
      return true;
    }
    if (method === "DELETE") {
      const deleted = await write("asset", false, () => store.deleteAsset(id));
      sendJson(response, deleted ? 200 : 404, { ok: true });
      return true;
    }
  }

  if (method === "POST" && url.pathname === "/api/loops") {
    const body = await readBody();
    const loop = await write("map", true, () => {
      const created = store.createLoop(body);
      store.promoteLoopToMap(created.id);
      return created;
    });
    sendJson(response, 201, { loop });
    return true;
  }

  if (parts[0] === "api" && parts[1] === "loops" && parts[2]) {
    const id = decodeURIComponent(parts[2]);
    if (method === "GET" && parts[3] === "versions") {
      sendJson(response, 200, { versions: store.listLoopVersions(id) });
      return true;
    }
    if (method === "POST" && parts[3] === "versions" && parts[4] && parts[5] === "restore") {
      const loop = await write("map", false, () => store.restoreLoopVersion(id, Number(parts[4])));
      sendJson(response, loop ? 200 : 404, loop ? { loop } : { error: "Version not found." });
      return true;
    }
    if (method === "GET" && parts.length === 3) {
      const loop = store.getLoop(id);
      sendJson(response, loop ? 200 : 404, loop ? { loop } : { error: "Loop not found." });
      return true;
    }
    if (method === "PUT" && parts.length === 3) {
      const body = await readBody();
      const loop = await write("map", false, () => store.updateLoop(id, body));
      if (!loop) sendJson(response, 404, { error: "Loop not found." });
      else sendJson(response, 200, { loop });
      return true;
    }
    if (method === "DELETE" && parts.length === 3) {
      const deleted = await write("map", false, () => store.deleteLoop(id));
      sendJson(response, deleted ? 200 : 404, { ok: true });
      return true;
    }
    if (method === "POST" && parts[3] === "duplicate") {
      const loop = await write("map", true, () => {
        const created = store.duplicateLoop(id);
        if (created) store.promoteLoopToMap(created.id);
        return created;
      });
      if (!loop) sendJson(response, 404, { error: "Loop not found." });
      else sendJson(response, 201, { loop });
      return true;
    }
  }

  return false;
}

export function safeMimeType(value) {
  const text = String(value || "");
  return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(text) ? text : "application/octet-stream";
}

export { HttpError };
