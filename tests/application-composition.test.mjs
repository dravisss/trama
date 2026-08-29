import test from "node:test";
import assert from "node:assert/strict";
import { createApplicationComposition } from "../src/app/applicationComposition.js";

test("application composition wires ports and adapters without UI globals", () => {
  const engine = {
    updateNode() {},
    updateNodes() {},
    updateEdge() {}
  };
  const composition = createApplicationComposition({
    engine,
    fetcher: async () => ({ assets: [] }),
    snapshotEntry: entry => entry,
    toEntry: entry => entry,
    isAvailable: () => false,
    resourceFetcher: async () => ({ ok: true, text: async () => "" }),
    downloadText() {}
  });

  assert.equal(typeof composition.editMapCommand.execute, "function");
  assert.equal(typeof composition.workspacePersistence.loadProject, "function");
  assert.equal(typeof composition.saveMap.execute, "function");
  assert.equal(typeof composition.saveView.execute, "function");
  assert.equal(typeof composition.createView.execute, "function");
  assert.equal(typeof composition.duplicateView.execute, "function");
  assert.equal(typeof composition.deriveView.execute, "function");
  assert.equal(typeof composition.deleteView.execute, "function");
  assert.equal(typeof composition.editPresentation.execute, "function");
  assert.equal(typeof composition.savePresentation.execute, "function");
  assert.equal(typeof composition.exportStandaloneApplication.execute, "function");
});
