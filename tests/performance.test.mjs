import test from "node:test";
import assert from "node:assert/strict";
import { createFrameScheduler } from "../src/performance/frameScheduler.js";
import { InteractionMetrics } from "../src/performance/interactionMetrics.js";

test("frame scheduler keeps only the latest preview per frame", () => {
  const callbacks = [];
  const previous = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = callback => {
    callbacks.push(callback);
    return callbacks.length;
  };
  try {
    const values = [];
    const scheduler = createFrameScheduler(value => values.push(value));
    scheduler.schedule(1);
    scheduler.schedule(2);
    assert.equal(callbacks.length, 1);
    callbacks[0]();
    assert.deepEqual(values, [2]);
    assert.equal(scheduler.pending, false);
  } finally {
    globalThis.requestAnimationFrame = previous;
  }
});

test("frame scheduler cancels a pending preview", () => {
  const previous = globalThis.requestAnimationFrame;
  const previousCancel = globalThis.cancelAnimationFrame;
  let cancelled = null;
  globalThis.requestAnimationFrame = () => 7;
  globalThis.cancelAnimationFrame = id => { cancelled = id; };
  try {
    const scheduler = createFrameScheduler(() => assert.fail("cancelled frame rendered"));
    scheduler.schedule("preview");
    scheduler.cancel();
    assert.equal(cancelled, 7);
    assert.equal(scheduler.pending, false);
  } finally {
    globalThis.requestAnimationFrame = previous;
    globalThis.cancelAnimationFrame = previousCancel;
  }
});

test("interaction metrics record one committed transaction", () => {
  const metrics = new InteractionMetrics();
  metrics.begin("route-drag", "edge-1");
  metrics.preview(0);
  metrics.preview(0);
  const result = metrics.finish("commit");
  assert.equal(result.type, "route-drag");
  assert.equal(result.targetId, "edge-1");
  assert.equal(result.previews, 2);
  assert.equal(result.commits, 1);
  assert.equal(metrics.snapshot().active, null);
});
