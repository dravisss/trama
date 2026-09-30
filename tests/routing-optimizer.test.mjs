import assert from "node:assert/strict";
import test from "node:test";
import cytoscape from "cytoscape";
import { optimizeRoutes } from "../src/routing/optimizer.js";
import { curvePolyline, curvesInteraction } from "../src/geometry/index.js";
import { createRoutingFixture } from "../src/qa/routingFixtures.js";

function placeNodes(cy, positions) {
  for (const [id, position] of Object.entries(positions)) {
    cy.getElementById(id).position(position);
  }
}

function buildDeterministicCycle() {
  return cytoscape({
    headless: true,
    elements: [
      { data: { id: "a" }, position: { x: 0, y: 0 } },
      { data: { id: "b" }, position: { x: 180, y: 24 } },
      { data: { id: "c" }, position: { x: 92, y: 155 } },
      { data: { id: "ab", source: "a", target: "b" } },
      { data: { id: "bc", source: "b", target: "c" } },
      { data: { id: "ca", source: "c", target: "a" } }
    ]
  });
}

test("automatic routing keeps a clear relation gently curved", () => {
  const cy = cytoscape({
    headless: true,
    elements: [
      { data: { id: "a" }, position: { x: 0, y: 0 } },
      { data: { id: "b" }, position: { x: 420, y: 0 } },
      { data: { id: "ab", source: "a", target: "b" } }
    ]
  });
  const result = optimizeRoutes(cy, { routingPasses: 2 }, { quality: "balanced" });
  const distance = Math.abs(result.distances.get("ab"));
  assert.ok(distance > 0);
  assert.ok(distance >= 7, "expected the minimum route to remain visibly curved");
  assert.ok(distance / 420 < 0.2);
  assert.equal(cy.getElementById("ab").data("route").algorithmVersion, "routing-v4");
  assert.ok(cy.getElementById("ab").data("route").reason);
  cy.destroy();
});

test("automatic routing prefers shallow curves before deep arcs", () => {
  const cy = cytoscape({
    headless: true,
    elements: [
      { data: { id: "a" }, position: { x: 0, y: 0 } },
      { data: { id: "b" }, position: { x: 240, y: 40 } },
      { data: { id: "c" }, position: { x: 120, y: 2 } },
      { data: { id: "ab", source: "a", target: "b" } }
    ]
  });
  const result = optimizeRoutes(cy, { routingPasses: 2 }, { quality: "balanced" });
  const distance = Math.abs(result.distances.get("ab"));
  const chord = Math.hypot(240, 40);
  assert.ok(distance / chord < 0.55);
  cy.destroy();
});

test("automatic routing keeps long clear relations visibly curved", () => {
  const cy = cytoscape({
    headless: true,
    elements: [
      { data: { id: "quality" } },
      { data: { id: "interventions" } },
      { data: { id: "quality-interventions", source: "quality", target: "interventions" } }
    ]
  });
  placeNodes(cy, {
    quality: { x: 0, y: 0 },
    interventions: { x: 472, y: 0 }
  });
  const result = optimizeRoutes(cy, { routingPasses: 2 }, { quality: "balanced" });
  const distance = Math.abs(result.distances.get("quality-interventions"));
  assert.ok(distance / 472 >= 0.085, "expected a visible curve on a long clear edge");
  cy.destroy();
});

test("automatic routing separates chained edge corridors at a shared node", () => {
  const cy = cytoscape({
    headless: true,
    elements: [
      { data: { id: "improvement" } },
      { data: { id: "workload" } },
      { data: { id: "escalations" } },
      { data: { id: "improvement-workload", source: "improvement", target: "workload" } },
      { data: { id: "workload-escalations", source: "workload", target: "escalations" } }
    ]
  });
  placeNodes(cy, {
    improvement: { x: 0, y: 280 },
    workload: { x: -220, y: 0 },
    escalations: { x: 220, y: 0 }
  });
  const result = optimizeRoutes(cy, { routingPasses: 3 }, { quality: "balanced" });
  const paths = ["improvement-workload", "workload-escalations"].map(edgeId => {
    const edge = cy.getElementById(edgeId);
    return curvePolyline(edge.source().position(), edge.target().position(), result.distances.get(edgeId));
  });
  const interaction = curvesInteraction(paths[0], paths[1], true);
  assert.equal(interaction.closeSegments, 0, "expected chained routes to leave a readable corridor");
  cy.destroy();
});

test("automatic loop routing keeps the outward side for every edge in a cycle", () => {
  const cy = cytoscape({
    headless: true,
    elements: [
      { data: { id: "a" }, position: { x: 0, y: 0 } },
      { data: { id: "b" }, position: { x: 100, y: 0 } },
      { data: { id: "c" }, position: { x: 50, y: 87 } },
      { data: { id: "ab", source: "a", target: "b" } },
      { data: { id: "bc", source: "b", target: "c" } },
      { data: { id: "ca", source: "c", target: "a" } }
    ]
  });
  const result = optimizeRoutes(cy, { routingPasses: 2 }, {
    quality: "balanced",
    loopEdgeIds: [["ab", "bc", "ca"]]
  });
  for (const edgeId of ["ab", "bc", "ca"]) {
    assert.ok(result.distances.get(edgeId) < 0, `expected outward route for ${edgeId}`);
  }
  cy.destroy();
});

test("shared loop edges keep the dominant outward winding", () => {
  const cy = cytoscape({
    headless: true,
    elements: [
      { data: { id: "a" }, position: { x: 0, y: 0 } },
      { data: { id: "b" }, position: { x: 100, y: 0 } },
      { data: { id: "c" }, position: { x: 35, y: 90 } },
      { data: { id: "e" }, position: { x: 65, y: 90 } },
      { data: { id: "d" }, position: { x: 1000, y: -300 } },
      { data: { id: "ab", source: "a", target: "b" } },
      { data: { id: "bc", source: "b", target: "c" } },
      { data: { id: "ca", source: "c", target: "a" } },
      { data: { id: "be", source: "b", target: "e" } },
      { data: { id: "ea", source: "e", target: "a" } },
      { data: { id: "ad", source: "a", target: "d" } },
      { data: { id: "db", source: "d", target: "b" } }
    ]
  });
  const result = optimizeRoutes(cy, { routingPasses: 2 }, {
    quality: "balanced",
    loopEdgeIds: [["ab", "bc", "ca"], ["ab", "be", "ea"], ["ab", "ad", "db"]]
  });
  assert.ok(result.distances.get("ab") < 0, "expected the shared edge to follow the two-loop winding");
  cy.destroy();
});

test("automatic routing is deterministic for the same positions and topology", () => {
  const firstCy = buildDeterministicCycle();
  const secondCy = buildDeterministicCycle();
  const options = { quality: "balanced", loopEdgeIds: [["ab", "bc", "ca"]] };
  const first = optimizeRoutes(firstCy, { routingPasses: 2 }, options);
  const second = optimizeRoutes(secondCy, { routingPasses: 2 }, options);
  assert.deepEqual([...first.distances.entries()], [...second.distances.entries()]);
  assert.equal(firstCy.getElementById("ab").data("route").algorithmVersion, "routing-v4");
  assert.equal(secondCy.getElementById("ab").data("route").reason, firstCy.getElementById("ab").data("route").reason);
  firstCy.destroy();
  secondCy.destroy();
});

test("dense routing keeps its balanced search bounded", () => {
  const model = createRoutingFixture({ id: "bounded-dense", nodeCount: 32 });
  const elements = [
    ...model.nodes.map((node, index) => ({
      data: { ...node },
      position: {
        x: 600 + 520 * Math.cos(index * 2 * Math.PI / model.nodes.length),
        y: 440 + 520 * Math.sin(index * 2 * Math.PI / model.nodes.length)
      }
    })),
    ...model.edges.map(edge => ({ data: { ...edge } }))
  ];
  const cy = cytoscape({ headless: true, elements });
  const started = performance.now();
  const result = optimizeRoutes(cy, { routingPasses: 7 }, {
    quality: "balanced",
    loopEdgeIds: model.loops.map(loop => loop.edgeIds)
  });
  const duration = performance.now() - started;
  assert.ok(duration < 2500, `expected bounded dense routing, got ${Math.round(duration)}ms`);
  assert.equal(result.distances.size, model.edges.length);
  cy.destroy();
});


test("editorial curvature range uses router scoring without changing default routing", () => {
  const cy = buildDeterministicCycle();
  placeNodes(cy, { a: { x: 0, y: 0 }, b: { x: 280, y: 0 }, c: { x: 140, y: 243 } });
  const result = optimizeRoutes(cy, { routingPasses: 2, routingCurvatureRange: [0.28, 0.32] }, { quality: "publish", loopEdgeIds: [["ab", "bc", "ca"]] });
  for (const edge of cy.edges()) {
    const a = edge.source().position(), b = edge.target().position();
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const curvature = Math.abs(result.distances.get(edge.id())) / length;
    assert.ok(curvature >= 0.28 - 0.5 / length && curvature <= 0.32 + 0.5 / length);
    assert.ok(result.distances.get(edge.id()) < 0, "clockwise cycle stays outward");
    assert.equal(edge.data("route").locked, false);
  }
  cy.destroy();
});
