import assert from "node:assert/strict";
import test from "node:test";
import {
  compareLayoutQuality,
  evaluateQualityGate,
  layoutQualityVector,
  scoreLayoutMetrics
} from "../src/geometry/layoutQuality.js";

test("layout quality prioritizes loop crossings over cosmetic compactness", () => {
  const readable = scoreLayoutMetrics({ crossings: 1, loopCrossings: 0, edgeLength: 8000 });
  const brokenLoop = scoreLayoutMetrics({ crossings: 0, loopCrossings: 1, edgeLength: 1000 });
  assert.ok(readable < brokenLoop);
});

test("layout quality rejects edge-node collisions and node overlaps", () => {
  const clear = scoreLayoutMetrics({ edgeLength: 5000 });
  const edgeHit = scoreLayoutMetrics({ edgeLength: 1000, edgeNodeHits: 1 });
  const overlap = scoreLayoutMetrics({ edgeLength: 1000, nodeOverlaps: 1 });
  assert.ok(clear < edgeHit);
  assert.ok(clear < overlap);
});

test("layout quality strongly penalizes curves routed through loop interiors", () => {
  const outward = scoreLayoutMetrics({ edgeLength: 5000 });
  const inward = scoreLayoutMetrics({ edgeLength: 1000, innerLoopCurves: 1 });
  assert.ok(outward < inward);
});

test("layout quality penalizes excessively elongated compositions", () => {
  const balanced = scoreLayoutMetrics({ edgeLength: 4000, aspectRatio: 1.4 });
  const elongated = scoreLayoutMetrics({ edgeLength: 4000, aspectRatio: 4.2 });
  assert.ok(balanced < elongated);
});

test("quality vectors never trade a hard collision for shorter routes", () => {
  const hardCollision = { nodeOverlaps: 1, edgeLength: 100 };
  const longButClear = { edgeLength: 10000 };
  assert.ok(compareLayoutQuality(hardCollision, longButClear) > 0);
  assert.equal(layoutQualityVector(hardCollision)[0], 1);
});

test("quality vectors rank excessive curvature after structural readability", () => {
  const shallow = { excessiveCurvatureCount: 0, excessiveCurvatureMagnitude: 0.1, edgeLength: 5000 };
  const deep = { excessiveCurvatureCount: 2, excessiveCurvatureMagnitude: 0.8, edgeLength: 1000 };
  assert.ok(compareLayoutQuality(shallow, deep) < 0);
});

test("quality gate reports automatic exceptions without hiding locked routes", () => {
  const accepted = evaluateQualityGate({ crossings: 1, lockedCrossings: 1 }, {
    nodeCount: 8,
    edgeCount: 8
  });
  assert.equal(accepted.accepted, true);
  const rejected = evaluateQualityGate({ crossings: 1 }, {
    nodeCount: 8,
    edgeCount: 8
  });
  assert.equal(rejected.accepted, false);
  assert.ok(rejected.reasons.includes("edge-crossing"));
});

test("quality gate treats annotation collisions as hard violations", () => {
  const result = evaluateQualityGate({ annotationCollisions: 1 }, {
    nodeCount: 8,
    edgeCount: 8
  });
  assert.equal(result.accepted, false);
  assert.ok(result.reasons.includes("hard-collision"));
});
