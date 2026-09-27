import { createReadStream, existsSync, readFileSync } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ProjectStore } from "./src/platform/projectStore.js";
import { examples } from "./src/models/examples.js";
import { exampleAssets } from "./src/models/exampleAssets.js";
import { slugId } from "./src/core/model.js";
import { HttpError } from "./server/http.js";
import { handleProjectRoutes } from "./server/projectRoutes.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const configuredDataRoot = process.env.TRAMA_DATA_ROOT || process.env.LOOPVIEWER_DATA_ROOT;
const dataRoot = resolve(configuredDataRoot || resolve(root, "data"));
const tramaDbPath = resolve(dataRoot, "trama.db");
const legacyDbPath = resolve(dataRoot, "loopviewer.db");
const defaultDbPath = existsSync(tramaDbPath) || !existsSync(legacyDbPath) ? tramaDbPath : legacyDbPath;
const configuredDbValue = process.env.TRAMA_DB_PATH || process.env.LOOPVIEWER_DB_PATH;
const configuredDbPath = configuredDbValue ? resolve(configuredDbValue) : defaultDbPath;
const qaFixtureValue = process.env.TRAMA_QA_FIXTURE_PATH || process.env.LOOPVIEWER_QA_FIXTURE_PATH;
const qaFixturePath = qaFixtureValue
  ? resolve(qaFixtureValue)
  : null;
const qaDebug = (process.env.TRAMA_QA_DEBUG || process.env.LOOPVIEWER_QA_DEBUG) === "1";
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const maxJsonBytes = positiveInteger(process.env.TRAMA_MAX_JSON_BYTES || process.env.LOOPVIEWER_MAX_JSON_BYTES, 5 * 1024 * 1024);
const allowExternalDb = (process.env.TRAMA_ALLOW_EXTERNAL_DB || process.env.LOOPVIEWER_ALLOW_EXTERNAL_DB) === "1";
// An explicitly configured database/data root belongs to the caller (QA,
// import/export tooling, or an isolated workspace). Do not silently seed it
// with the demo catalog: that makes deterministic fixtures non-deterministic
// and can mix sample records into a user's selected project.
const seedModels = configuredDbValue || configuredDataRoot ? [] : examples;
const seedAssets = seedModels.length
  ? exampleAssets.map(asset => ({ ...asset, content: readFileSync(asset.path) }))
  : [];
let store = new ProjectStore(configuredDbPath, { seedModels, seedAssets });
let qaFixtureGeneration = 0;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = createServer(async (request, response) => {
  try {
    if (request.url.startsWith("/api/")) {
      if (!isTrustedApiRequest(request)) {
        sendJson(response, 403, { error: "Untrusted request origin." });
        return;
      }
      await handleApi(request, response);
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    console.error(error);
    sendJson(response, error.statusCode || 500, {
      error: error.statusCode ? error.message : "Internal server error."
    });
  }
});

// Browser UI QA starts this process with an ephemeral database. If the test
// runner is interrupted, avoid leaving that server (and its temporary DB) as
// an orphan. Production/local servers never set this variable.
const qaOwnerPid = Number(process.env.TRAMA_QA_OWNER_PID || process.env.LOOPVIEWER_QA_OWNER_PID || 0);
if (Number.isInteger(qaOwnerPid) && qaOwnerPid > 0) {
  const ownerMonitor = setInterval(() => {
    if (process.ppid === qaOwnerPid) return;
    clearInterval(ownerMonitor);
    server.close(() => {
      store.close();
      process.exit(0);
    });
  }, 500);
  ownerMonitor.unref();
  server.once("close", () => clearInterval(ownerMonitor));
}

server.listen(port, host, () => {
  console.log(`Trama running at http://${host}:${port}/`);
});

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  // This endpoint is enabled only by the ephemeral Playwright server. It keeps
  // every browser proof independent without exposing a reset operation in a
  // normal local-first project server.
  if (request.method === "POST" && url.pathname === "/api/qa/reset-fixture") {
    if (!qaFixturePath) {
      sendJson(response, 404, { error: "QA fixture reset is unavailable." });
      return;
    }
    const bundle = JSON.parse(await readFile(qaFixturePath, "utf8"));
    store.importBundle(bundle);
    qaFixtureGeneration += 1;
    if (qaDebug) console.log(`[qa-generation] reset -> ${qaFixtureGeneration}`);
    sendProject(response);
    return;
  }

  // A Playwright page can be closed while one of its debounced writes is still
  // in flight. The next proof resets the same ephemeral database, so reject a
  // write from an older page generation instead of letting it overwrite the
  // freshly restored fixture. Production servers have no fixture path and are
  // entirely unaffected.
  if (qaFixturePath && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const requestGeneration = Number(request.headers["x-trama-qa-generation"] || request.headers["x-loopviewer-qa-generation"] || 0);
    if (qaDebug) console.log(`[qa-generation] ${request.method} ${url.pathname} received=${requestGeneration} current=${qaFixtureGeneration}`);
    if (!Number.isInteger(requestGeneration) || requestGeneration !== qaFixtureGeneration) {
      request.resume();
      sendJson(response, 409, {
        error: "This QA page belongs to an expired fixture generation.",
        qa_generation: qaFixtureGeneration,
        received_generation: requestGeneration
      });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/projects") {
    sendJson(response, 200, { projects: await listLocalProjects() });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/project/import") {
    const body = await readJson(request);
    const bundle = body.bundle;
    if (!["trama-project", "loopviewer-project"].includes(bundle?.format)) {
      sendJson(response, 400, { error: "Invalid Trama project bundle." });
      return;
    }
    const title = `${bundle.project?.title || "Projeto"} importado`;
    const dbPath = body.path && typeof body.path === "string"
      ? resolveDatabasePath(body.path)
      : await nextProjectPath(title);
    try {
      await access(dbPath);
      sendJson(response, 409, { error: "Project file already exists." });
      return;
    } catch {
      // Import always creates a new project file.
    }
    const nextStore = new ProjectStore(dbPath);
    nextStore.importBundle(bundle);
    store.close();
    store = nextStore;
    sendProject(response, 201);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/project/open") {
    const body = await readJson(request);
    if (!body.path || typeof body.path !== "string") {
      sendJson(response, 400, { error: "path is required." });
      return;
    }
    const dbPath = resolveDatabasePath(body.path);
    try {
      await access(dbPath);
    } catch {
      sendJson(response, 404, { error: "Project file does not exist." });
      return;
    }
    const nextStore = new ProjectStore(dbPath);
    store.close();
    store = nextStore;
    sendProject(response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/project/new") {
    const body = await readJson(request);
    const title = body.title || "Novo projeto";
    const dbPath = body.path && typeof body.path === "string"
      ? resolveDatabasePath(body.path)
      : await nextProjectPath(title);
    try {
      await access(dbPath);
      sendJson(response, 409, { error: "Project file already exists." });
      return;
    } catch {
      // Missing is the desired state for creating a project.
    }
    const nextStore = new ProjectStore(dbPath, {
      project: {
        title,
        description_md: body.description_md || ""
      }
    });
    const initial = nextStore.createInitialLoop({ title: "Novo mapa" });
    nextStore.promoteLoopToMap(initial.id);
    store.close();
    store = nextStore;
    sendProject(response, 201);
    return;
  }

  // Shared project routes read bodies through this server's size-limited
  // readJson (TRAMA_MAX_JSON_BYTES), exactly like the routes kept above.
  if (await handleProjectRoutes({
    request,
    response,
    url,
    store,
    sendProject,
    hooks: { readBody: req => readJson(req) }
  })) return;

  sendJson(response, 404, { error: "Not found." });
}

async function listLocalProjects() {
  let names = [];
  try {
    names = await readdir(dataRoot);
  } catch {
    return [];
  }
  const dbPaths = names
    .filter(name => name.endsWith(".db"))
    .map(name => resolve(dataRoot, name));
  const projects = [];
  for (const dbPath of dbPaths) {
    let projectStore = null;
    try {
      projectStore = new ProjectStore(dbPath);
      const project = projectStore.getProject();
      const maps = projectStore.listMaps();
      projects.push({
        ...project,
        path: dbPath,
        file: basename(dbPath),
        active: dbPath === store.dbPath,
        metrics: {
          maps: Math.max(maps.length, projectStore.listLoops().length),
          views: maps.reduce((total, map) => total + projectStore.listViews(map.id).length, 0),
          presentations: projectStore.listPresentations().length,
          assets: projectStore.listAssets().length
        }
      });
    } catch {
      // Ignore non-Trama SQLite files in data/.
    } finally {
      projectStore?.close();
    }
  }
  return projects.sort((a, b) =>
    Number(b.active) - Number(a.active) ||
    String(b.updated_at || "").localeCompare(String(a.updated_at || "")) ||
    String(a.title || "").localeCompare(String(b.title || ""))
  );
}

async function nextProjectPath(title) {
  const base = slugId(title, "projeto");
  let suffix = 0;
  while (true) {
    const filename = `${base}${suffix ? `-${suffix}` : ""}.db`;
    const dbPath = resolve(dataRoot, filename);
    try {
      await access(dbPath);
      suffix += 1;
    } catch {
      return dbPath;
    }
  }
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = resolve(join(root, pathname));
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    await access(filePath);
  } catch {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
}

async function readJson(request) {
  const declaredLength = Number(request.headers["content-length"] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxJsonBytes) {
    const error = new Error("Request body is too large.");
    error.statusCode = 413;
    throw error;
  }
  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > maxJsonBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isTrustedApiRequest(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.origin;
  if (!origin) return true; // Non-browser local clients such as curl remain supported.
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function resolveDatabasePath(candidate) {
  const dbPath = resolve(candidate);
  if (extname(dbPath).toLowerCase() !== ".db") {
    const error = new Error("Project path must point to a .db file.");
    error.statusCode = 400;
    throw error;
  }
  const dataRelative = relative(dataRoot, dbPath);
  if (!allowExternalDb && (dataRelative.startsWith("..") || dataRelative === "")) {
    const error = new Error("Project path must stay inside the Trama data directory.");
    error.statusCode = 403;
    throw error;
  }
  return dbPath;
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function sendProject(response, status = 200) {
  const maps = store.listMaps().map(map => ({ ...map, views: store.listViews(map.id) }));
  sendJson(response, status, {
    project: { ...store.getProject(), path: store.dbPath },
    loops: store.listLoops(),
    maps,
    presentations: store.listPresentations(),
    assets: store.listAssets(),
    ...(qaFixturePath ? { qa_generation: qaFixtureGeneration } : {})
  });
}
