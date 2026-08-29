import assert from "node:assert/strict";
import test from "node:test";
import { deriveLoopTopology } from "../src/geometry/loopTopology.js";
import cytoscape from "cytoscape";
import {
  applyLoopAwareSeed,
  buildCompactPositionVariant,
  buildDeterministicSeed,
  buildLoopAwareSeed,
  buildSkeletonBlendVariant
} from "../src/geometry/loopSeed.js";

const model = {
  id: "topology",
  nodes: ["a", "b", "c", "d", "e"].map(id => ({ id, label: id.toUpperCase() })),
  edges: [
    { id: "ab", source: "a", target: "b", sourceSign: "+", targetSign: "+" },
    { id: "bc", source: "b", target: "c", sourceSign: "+", targetSign: "+" },
    { id: "ca", source: "c", target: "a", sourceSign: "+", targetSign: "+" },
    { id: "cd", source: "c", target: "d", sourceSign: "+", targetSign: "+" },
    { id: "de", source: "d", target: "e", sourceSign: "+", targetSign: "+" },
    { id: "ec", source: "e", target: "c", sourceSign: "+", targetSign: "+" }
  ],
  loops: []
};

test("derives generic loop membership and bridge edges without curated loops", () => {
  const topology = deriveLoopTopology(model);
  assert.equal(topology.source, "discovered");
  assert.equal(topology.loops.length, 2);
  assert.deepEqual(new Set(topology.nodeMembership.get("c")), new Set(["auto-r1", "auto-r2"]));
  assert.equal(topology.nodeRoles.get("c"), "hub");
  assert.deepEqual(topology.bridgeEdgeIds, []);
});

test("seed keeps shared loop nodes coherent and is deterministic", () => {
  const topology = deriveLoopTopology(model);
  const first = buildLoopAwareSeed(model, topology, { idealEdgeLength: 180 });
  const second = buildLoopAwareSeed(model, topology, { idealEdgeLength: 180 });
  assert.deepEqual(first, second);
  assert.equal(first.size, model.nodes.length);
  for (const position of first.values()) {
    assert.ok(Number.isFinite(position.x));
    assert.ok(Number.isFinite(position.y));
  }
});

test("complete deterministic seed covers bridge and disconnected nodes", () => {
  const topology = deriveLoopTopology({
    ...model,
    edges: model.edges.slice(0, 3),
    loops: []
  });
  const first = buildDeterministicSeed({ ...model, edges: model.edges.slice(0, 3), loops: [] }, topology, {
    idealEdgeLength: 180,
    seed: "qa-seed"
  });
  const second = buildDeterministicSeed({ ...model, edges: model.edges.slice(0, 3), loops: [] }, topology, {
    idealEdgeLength: 180,
    seed: "qa-seed"
  });
  assert.deepEqual(first, second);
  assert.equal(first.size, model.nodes.length);
});

test("applies the seed without moving locked or already positioned nodes", () => {
  const topology = deriveLoopTopology(model);
  const cy = cytoscape({
    headless: true,
    elements: [
      ...model.nodes.map(node => ({
        data: node.id === "a" ? { ...node, position: { x: 10, y: 20 } } : { ...node },
        position: node.id === "a"
          ? { x: 10, y: 20 }
          : node.id === "b"
            ? { x: 40, y: 50 }
            : undefined,
        locked: node.id === "b"
      })),
      ...model.edges.map(edge => ({ data: edge }))
    ]
  });
  const positionedBefore = { ...cy.getElementById("a").position() };
  const before = { ...cy.getElementById("b").position() };
  applyLoopAwareSeed(cy, topology, { idealEdgeLength: 180 });
  assert.deepEqual(cy.getElementById("a").position(), positionedBefore);
  assert.deepEqual(cy.getElementById("b").position(), before);
  assert.notDeepEqual(cy.getElementById("c").position(), { x: 0, y: 0 });
  cy.destroy();
});

test("curated loops remain authoritative when discovery is enabled", () => {
  const curated = {
    ...model,
    loops: [{ id: "curated", edgeIds: ["ab", "bc", "ca"], type: "reinforcing" }]
  };
  const topology = deriveLoopTopology(curated);
  assert.equal(topology.source, "curated");
  assert.deepEqual(topology.loops.map(loop => loop.id), ["curated"]);
  assert.deepEqual(topology.bridgeEdgeIds, ["cd", "de", "ec"]);
});

test("discovered topology selects a compact visual cycle basis", () => {
  const dense = {
    id: "dense-topology",
    nodes: ["a", "b", "c", "d", "e", "f"].map(id => ({ id, label: id })),
    edges: [
      ["ab", "a", "b"], ["bc", "b", "c"], ["ca", "c", "a"],
      ["cd", "c", "d"], ["da", "d", "a"], ["de", "d", "e"],
      ["ea", "e", "a"], ["ef", "e", "f"], ["fa", "f", "a"]
    ].map(([id, source, target]) => ({
      id, source, target, sourceSign: "+", targetSign: "+"
    })),
    loops: []
  };
  const topology = deriveLoopTopology(dense, { maxVisualLoops: 2 });
  assert.equal(topology.loops.length, 2);
  assert.ok(topology.allLoops.length >= topology.loops.length);
});

test("compact variants reduce elongated compositions without losing node ids", () => {
  const positions = new Map([
    ["a", { x: 0, y: 0 }],
    ["b", { x: 20, y: 900 }],
    ["c", { x: 40, y: 1800 }]
  ]);
  const compact = buildCompactPositionVariant(positions, { scale: 0.9, aspectTarget: 1.8 });
  assert.deepEqual([...compact.keys()], ["a", "b", "c"]);
  const height = Math.max(...[...compact.values()].map(point => point.y)) -
    Math.min(...[...compact.values()].map(point => point.y));
  const width = Math.max(...[...compact.values()].map(point => point.x)) -
    Math.min(...[...compact.values()].map(point => point.x));
  assert.ok(height / width <= 2);
});

test("skeleton blend pulls a candidate toward cycle anchors", () => {
  const blended = buildSkeletonBlendVariant(
    new Map([["a", { x: 100, y: 100 }]]),
    new Map([["a", { x: 0, y: 0 }]]),
    0.25
  );
  assert.deepEqual(blended.get("a"), { x: 75, y: 75 });
});
