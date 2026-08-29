import assert from "node:assert/strict";
import test from "node:test";
import { createEngineMapEditor } from "../src/adapters/engine/mapEditor.js";
import { createEditMap } from "../src/application/map/editMap.js";

test("EditMap updates one node through the map editor port", () => {
  const calls = [];
  const editMap = createEditMap({
    mapEditor: {
      updateNode: (id, changes) => {
        calls.push(["updateNode", id, changes]);
        return { id, ...changes };
      },
      updateNodes() {},
      updateEdge() {}
    }
  });

  const result = editMap.execute({
    target: { type: "node", id: "demand" },
    changes: { label: "Demanda revisada" }
  });

  assert.deepEqual(calls, [["updateNode", "demand", { label: "Demanda revisada" }]]);
  assert.deepEqual(result, {
    target: { type: "node", ids: ["demand"] },
    result: { id: "demand", label: "Demanda revisada" }
  });
});

test("EditMap preserves a multi-node Inspector change as one operation", () => {
  const calls = [];
  const editMap = createEditMap({
    mapEditor: {
      updateNode() {},
      updateNodes: (ids, changes) => {
        calls.push([ids, changes]);
        return ids.map(id => ({ id, ...changes }));
      },
      updateEdge() {}
    }
  });

  editMap.execute({
    target: { type: "node", ids: ["a", "b", "a"] },
    changes: { style: { shape: "pill" } }
  });

  assert.deepEqual(calls, [[["a", "b"], { style: { shape: "pill" } }]]);
});

test("EditMap updates a relation through the edge operation", () => {
  const calls = [];
  const editMap = createEditMap({
    mapEditor: {
      updateNode() {},
      updateNodes() {},
      updateEdge: (id, changes) => {
        calls.push([id, changes]);
        return { id, ...changes };
      }
    }
  });

  editMap.execute({
    target: { type: "edge", id: "demand-planning" },
    changes: { description: "Descrição causal revisada." }
  });

  assert.deepEqual(calls, [["demand-planning", { description: "Descrição causal revisada." }]]);
});

test("EditMap rejects incomplete commands and invalid adapters", () => {
  assert.throws(
    () => createEditMap({ mapEditor: { updateNode() {} } }),
    /MapEditorPort/
  );
  const editMap = createEditMap({
    mapEditor: { updateNode() {}, updateNodes() {}, updateEdge() {} }
  });
  assert.throws(() => editMap.execute(), /target/);
  assert.throws(() => editMap.execute({ target: { type: "node", id: "a" }, changes: [] }), /changes/);
});

test("engine map editor adapter forwards only the explicit map-editing port", () => {
  const calls = [];
  const adapter = createEngineMapEditor({
    engine: {
      updateNode: (...args) => calls.push(["node", ...args]),
      updateNodes: (...args) => calls.push(["nodes", ...args]),
      updateEdge: (...args) => calls.push(["edge", ...args])
    }
  });

  adapter.updateNode("a", { label: "A" });
  adapter.updateNodes(["a", "b"], { locked: true });
  adapter.updateEdge("a-b", { description: "A -> B" });

  assert.deepEqual(calls, [
    ["node", "a", { label: "A" }],
    ["nodes", ["a", "b"], { locked: true }],
    ["edge", "a-b", { description: "A -> B" }]
  ]);
});
