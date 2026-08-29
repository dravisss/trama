import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateModel } from "../src/core/model.js";
import { compilePresentation } from "../src/presentation/compiler.js";
import { ProjectStore } from "../src/platform/projectStore.js";
import { buildUnifiedUiFixture } from "../qa/fixtures/unified-ui-fixture.js";

test("unified UI fixture is deterministic and covers maps 8, 16, 32 and flagship presentation", () => {
  const first = buildUnifiedUiFixture();
  const second = buildUnifiedUiFixture();
  assert.deepEqual(first, second);
  assert.equal(first.format, "loopviewer-project");
  assert.equal(first.version, 1);
  assert.deepEqual(first.maps.slice(0, 3).map(map => map.model.nodes.length), [8, 16, 32]);
  assert.equal(first.assets.length, 1);
  assert.equal(first.presentations.length, 1);
  assert.equal(first.loops.length, 4);
  assert.equal(first.maps.find(map => map.id === "ui-qa-16")?.model.nodes.length, 16);
  assert.deepEqual(first.maps.map(map => map.source_loop_id), first.loops.map(loop => loop.id));
  for (const map of first.maps) assert.equal(validateModel(map.model).valid, true, map.id);
  const flagship = first.maps.find(map => map.id === "flagship-growth");
  const flagshipViews = first.views.filter(view => view.map_id === flagship.id);
  assert.deepEqual(flagshipViews.map(view => view.settings["style-pack"]).sort(), ["boardroom-ink", "matcha-executive"]);
  assert.ok(flagshipViews.every(view => view.style_source && view.rules.length));
  assert.ok(first.assets.some(asset => asset.id === "flagship-cover"));
  const compiled = compilePresentation(first.presentations[0].presentation, { model: flagship.model });
  assert.equal(compiled.valid, true, compiled.errors.join("\n"));
  assert.ok(compiled.timeline.length > 20);
});

test("unified UI fixture round-trips through an isolated ProjectStore", () => {
  const dir = mkdtempSync(join(tmpdir(), "loopviewer-ui-fixture-"));
  const store = new ProjectStore(join(dir, "ui-qa.db"));
  try {
    const imported = store.importBundle(buildUnifiedUiFixture());
    assert.equal(imported.project.title, "LoopViewer UI QA");
    assert.equal(store.listMaps().length, 4);
    assert.equal(store.listLoops().length, 4);
    assert.equal(store.listViews("flagship-growth").length, 2);
    assert.equal(store.listPresentations().length, 1);
    assert.equal(store.listAssets().length, 1);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
