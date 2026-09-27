import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { WorkspaceRegistry } from "../../server/hosted/registry.js";
import { extractEditToken, hashToken } from "../../server/hosted/tokens.js";
import { ProjectStore } from "../../src/platform/projectStore.js";

function withRegistry(fn, options = {}) {
  const dataRoot = mkdtempSync(join(tmpdir(), "trama-registry-"));
  const registry = new WorkspaceRegistry({ dataRoot, limits: { versionsPerRecord: 3, openStores: 4 }, ...options });
  try {
    return fn(registry, dataRoot);
  } finally {
    registry.close();
    rmSync(dataRoot, { recursive: true, force: true });
  }
}

test("edit tokens are stored only as hashes and resolve to their workspace", () => withRegistry(registry => {
  const { workspace, editToken } = registry.create({ title: "Pesquisa" });
  assert.equal(workspace.edit_token_hash, hashToken(editToken));
  assert.ok(!JSON.stringify(registry.list()).includes(editToken));
  assert.equal(registry.resolveEditToken(editToken).id, workspace.id);
  assert.equal(registry.resolveEditToken(`${editToken}x`), null);
  assert.equal(registry.resolveShareToken(workspace.share_token).id, workspace.id);
  assert.equal(registry.resolveEditToken(workspace.share_token), null, "a share token never grants edit access");
}));

test("every new workspace has at least one map so the editor is usable", () => withRegistry(registry => {
  const { workspace } = registry.create({});
  assert.equal(registry.store(workspace.id).listLoops().length, 1);
  assert.equal(registry.store(workspace.id).listMaps().length, 1);
}));

test("the example seed creates the demo catalog", () => withRegistry(registry => {
  const { workspace } = registry.create({ seed: "examples" });
  assert.equal(registry.store(workspace.id).listLoops().length, 1);
}, { seedCatalog: [{ id: "demo", title: "Demo", nodes: [{ id: "a", label: "A" }], edges: [] }] }));

test("delete removes the workspace file and its registry entry", () => withRegistry(registry => {
  const { workspace, editToken } = registry.create({});
  const path = registry.dbPathFor(workspace.id);
  assert.ok(existsSync(path));
  assert.ok(registry.delete(workspace.id));
  assert.ok(!existsSync(path));
  assert.equal(registry.resolveEditToken(editToken), null);
}));

test("retention sweep removes untouched and inactive workspaces only", () => withRegistry(registry => {
  const untouched = registry.create({}).workspace;
  const edited = registry.create({}).workspace;
  registry.markWrite(edited.id);
  const later = Date.now() + 20 * 86_400_000;
  const removed = registry.sweep({ inactiveDays: 365, untouchedDays: 14, now: later });
  assert.deepEqual(removed, [untouched.id]);
  assert.ok(registry.get(edited.id));
  const muchLater = Date.now() + 400 * 86_400_000;
  assert.deepEqual(registry.sweep({ inactiveDays: 365, untouchedDays: 14, now: muchLater }), [edited.id]);
}));

test("the store cache stays bounded", () => withRegistry(registry => {
  const ids = Array.from({ length: 7 }, () => registry.create({}).workspace.id);
  ids.forEach(id => registry.store(id));
  assert.ok(registry.stats().openStores <= 4);
  assert.equal(registry.store(ids[0]).listLoops().length, 1, "evicted stores reopen transparently");
}));

test("version history is bounded when retention is configured", () => withRegistry(registry => {
  const { workspace } = registry.create({});
  const store = registry.store(workspace.id);
  for (let index = 0; index < 8; index += 1) {
    store.updateLoop("novo-mapa", { title: `v${index}` });
  }
  assert.equal(store.listLoopVersions("novo-mapa").length, 3);
}));

test("local ProjectStore keeps unlimited history by default", () => {
  const dir = mkdtempSync(join(tmpdir(), "trama-local-"));
  const store = new ProjectStore(join(dir, "local.db"));
  try {
    const loop = store.createInitialLoop({ title: "Local" });
    for (let index = 0; index < 8; index += 1) store.updateLoop(loop.id, { title: `v${index}` });
    assert.equal(store.listLoopVersions(loop.id).length, 8);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("edit tokens can be extracted from links", () => {
  const token = "A".repeat(32);
  assert.equal(extractEditToken(token), token);
  assert.equal(extractEditToken(`https://trama.org-agents.work/w/${token}`), token);
  assert.equal(extractEditToken(`/w/${token}/mcp`), token);
  assert.equal(extractEditToken("/etc/passwd"), null);
  assert.equal(extractEditToken("short"), null);
});
