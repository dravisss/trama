import assert from "node:assert/strict";
import test from "node:test";
import { createEngineBridge } from "../src/app/engineBridge.js";

class FakeTarget extends EventTarget {
  emit(type, detail = {}) { this.dispatchEvent(new CustomEvent(type, { detail })); }
}

test("engine bridge translates events and disposes all subscriptions", () => {
  const engine = new FakeTarget();
  const routePerformance = { textContent: "" };
  const calls = [];
  const bridge = createEngineBridge({
    engine,
    elements: { routePerformance },
    actions: {
      onRoute: result => calls.push(["route", result.quality]),
      onViewChange: view => calls.push(["view", view]),
      onEdgeActivate: edge => calls.push(["edge", edge.id]),
      onSelectionChange: (nodes, edges) => calls.push(["selection", nodes, edges]),
      onNodeActivate: node => calls.push(["node", node.id]),
      onBackgroundActivate: () => calls.push(["background"]),
      onPositionChange: () => calls.push(["position"]),
      onRouteChange: () => calls.push(["routechange"]),
      onLayoutEnd: () => calls.push(["layout"]),
      onNodeLockChange: () => calls.push(["lock"]),
      onModelMutate: () => calls.push(["mutate"])
    }
  });

  engine.emit("route", { quality: "balanced", durationMs: 4.2, crossings: 1 });
  engine.emit("viewchange", { view: { id: "v1" } });
  engine.emit("edgeactivate", { edge: { id: "e1" } });
  engine.emit("selectionchange", { nodeIds: ["n1"], edgeIds: ["e1"] });
  engine.emit("nodeactivate", { node: { id: "n1" } });
  for (const type of ["backgroundactivate", "positionchange", "routechange", "layoutend", "nodelockchange", "modelmutate"]) engine.emit(type);

  assert.equal(routePerformance.textContent, "balanced · 4.2 ms · 1 cruzamentos");
  assert.deepEqual(calls, [
    ["route", "balanced"], ["view", { id: "v1" }], ["edge", "e1"],
    ["selection", ["n1"], ["e1"]], ["node", "n1"], ["background"],
    ["position"], ["routechange"], ["layout"], ["lock"], ["mutate"]
  ]);

  bridge.destroy();
  engine.emit("nodeactivate", { node: { id: "n2" } });
  assert.equal(calls.length, 11);
});
