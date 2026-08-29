import assert from "node:assert/strict";
import test from "node:test";
import { normalizeModel, validateModel } from "../src/core/model.js";
import { createRoutingFixture, routingFixtures } from "../src/qa/routingFixtures.js";
import { checkSnapshot, fingerprint } from "../src/qa/runtime.js";

test("routing fixtures are valid and cover the planned scale bands", () => {
  assert.deepEqual(routingFixtures.map(fixture => fixture.nodes.length), [8, 16, 32]);
  for (const fixture of routingFixtures) assert.equal(validateModel(fixture).valid, true);
});

test("QA fingerprint is stable when model collection order changes", () => {
  const model = normalizeModel(createRoutingFixture({ id: "fingerprint", nodeCount: 8 }));
  const reversed = {
    ...model,
    nodes: [...model.nodes].reverse(),
    edges: [...model.edges].reverse()
  };
  assert.equal(fingerprint(model), fingerprint(reversed));
});

test("QA snapshot check identifies missing route provenance", () => {
  const model = normalizeModel(createRoutingFixture({ id: "check", nodeCount: 8 }));
  model.nodes = model.nodes.map((node, index) => ({ ...node, position: { x: index * 120, y: 0 } }));
  model.edges = model.edges.map(edge => ({
    ...edge,
    route: { controlPointDistance: 24, locked: false, algorithmVersion: "routing-v4" }
  }));
  model.edges[0].route.algorithmVersion = "routing-v2";
  const result = checkSnapshot({ model, quality: {}, annotations: null, fingerprint: fingerprint(model) });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.startsWith("route-version:")));
});
