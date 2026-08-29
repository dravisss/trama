import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer as createNetServer } from "node:net";
import { fileURLToPath } from "node:url";
import { ProjectStore } from "../../src/platform/projectStore.js";
import { buildUnifiedUiFixture } from "../../qa/fixtures/unified-ui-fixture.js";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));

export async function startQaServer() {
  const port = await availablePort();
  const fixtureDirectory = mkdtempSync(join(tmpdir(), "loopviewer-ui-e2e-"));
  const databasePath = join(fixtureDirectory, "loopviewer.db");
  const fixturePath = join(fixtureDirectory, "unified-ui-fixture.json");
  const fixture = buildUnifiedUiFixture();
  writeFileSync(fixturePath, `${JSON.stringify(fixture)}\n`);
  const store = new ProjectStore(databasePath);
  try {
    store.importBundle(fixture);
  } finally {
    store.close();
  }

  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      LOOPVIEWER_DB_PATH: databasePath,
      LOOPVIEWER_DATA_ROOT: fixtureDirectory,
      LOOPVIEWER_QA_FIXTURE_PATH: fixturePath,
      LOOPVIEWER_QA_OWNER_PID: String(process.pid)
    },
    stdio: "inherit"
  });
  const baseURL = `http://127.0.0.1:${port}`;
  try {
    await waitForFixture(baseURL, child);
  } catch (error) {
    await stopChild(child);
    rmSync(fixtureDirectory, { recursive: true, force: true });
    throw error;
  }

  let stopped = false;
  return {
    baseURL,
    databasePath,
    async stop() {
      if (stopped) return;
      stopped = true;
      await stopChild(child);
      rmSync(fixtureDirectory, { recursive: true, force: true });
    }
  };
}

async function availablePort() {
  const probe = createNetServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise(resolve => probe.close(resolve));
  if (!port) throw new Error("Could not reserve an ephemeral port for LoopViewer UI QA.");
  return port;
}

async function waitForFixture(baseURL, child) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`LoopViewer QA server exited with ${child.exitCode}.`);
    try {
      const response = await fetch(`${baseURL}/api/project`);
      const payload = await response.json();
      if (response.ok && payload?.project?.title === "LoopViewer UI QA" && payload.maps?.length === 4) return;
    } catch {
      // The child is still binding the server or initializing SQLite.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("LoopViewer QA server did not expose the deterministic fixture within 10 seconds.");
}

async function stopChild(child) {
  if (child.exitCode !== null || child.killed) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const timeout = new Promise(resolve => setTimeout(resolve, 3_000, "timeout"));
  if (await Promise.race([exited, timeout]) === "timeout") {
    child.kill("SIGKILL");
    await once(child, "exit");
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const runtime = await startQaServer();
  console.log(`LoopViewer UI QA server uses isolated fixture DB: ${runtime.databasePath}`);
  const shutdown = async () => {
    await runtime.stop();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
