import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import test from "node:test";

test("local server rejects foreign origins, oversized JSON and external database paths", async t => {
  const dataRoot = await mkdtemp(join(tmpdir(), "trama-server-security-"));
  const port = await availablePort();
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      TRAMA_DATA_ROOT: dataRoot,
      TRAMA_MAX_JSON_BYTES: "128"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(async () => {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise(resolve => child.once("exit", resolve));
    }
    await rm(dataRoot, { recursive: true, force: true });
  });
  await waitForServer(child, port);

  const foreign = await fetch(`http://127.0.0.1:${port}/api/project/new`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.invalid" },
    body: JSON.stringify({ title: "Blocked" })
  });
  assert.equal(foreign.status, 403);

  const oversized = await fetch(`http://127.0.0.1:${port}/api/project/new`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "x".repeat(256) })
  });
  assert.equal(oversized.status, 413);

  const external = await fetch(`http://127.0.0.1:${port}/api/project/new`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Blocked", path: join(tmpdir(), "outside-trama.db") })
  });
  assert.equal(external.status, 403);
});

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(0, "127.0.0.1", resolve).once("error", reject));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForServer(child, port) {
  let stderr = "";
  child.stderr.on("data", chunk => { stderr += chunk; });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Server exited early: ${stderr}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/project`);
      if (response.ok) return;
    } catch {
      // Startup is still in progress.
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`Server did not start: ${stderr}`);
}
