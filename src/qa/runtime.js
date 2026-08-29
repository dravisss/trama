import { evaluateLayoutQuality, evaluateQualityGate } from "../geometry/layoutQuality.js";
import { ROUTING_ALGORITHM_VERSION } from "../geometry/routeDiagnostics.js";
import { routingFixtures } from "./routingFixtures.js";

export const QA_RUNTIME_VERSION = "qa-runtime-v1";

export function createQaRuntime({ engine, getContext = () => ({}) }) {
  if (!engine) throw new Error("QA runtime requires a CLDEngine instance.");

  return {
    version: QA_RUNTIME_VERSION,
    algorithmVersion: ROUTING_ALGORITHM_VERSION,
    fixtures: routingFixtures.map(fixture => ({
      id: fixture.id,
      nodeCount: fixture.nodes.length,
      edgeCount: fixture.edges.length,
      loopCount: fixture.loops.length
    })),
    snapshot() {
      const model = engine.getModel({ includePositions: true, includeRoutes: true });
      const routing = engine.lastRouting || null;
      const quality = routing?.layoutQuality || (engine.cy && routing
        ? evaluateLayoutQuality(engine.cy, routing, {
          loopEdgeIds: engine.layoutTopology?.loopEdgeIds || []
        })
        : null);
      return {
        context: sanitizeContext(getContext()),
        model,
        routing: routing ? summarizeRouting(routing) : null,
        quality,
        diagnostics: routing?.routeDiagnostics || quality?.routeDiagnostics || null,
        annotations: engine.annotations?.getMetrics?.() || null,
        interactions: engine.getState?.().metrics?.interactions || null,
        fingerprint: fingerprint(model),
        dom: domSnapshot()
      };
    },
    check() {
      const snapshot = this.snapshot();
      return checkSnapshot(snapshot);
    },
    fingerprint() {
      return fingerprint(engine.getModel({ includePositions: true, includeRoutes: true }));
    },
    waitForIdle(timeoutMs = 1200) {
      return waitForIdle(timeoutMs);
    }
  };
}

export function fingerprint(model) {
  if (!model) return "empty";
  const compact = {
    id: model.id,
    nodes: [...(model.nodes || [])]
      .map(node => ({
        id: node.id,
        position: node.position ? roundPoint(node.position) : null,
        locked: Boolean(node.locked)
      }))
      .sort(byId),
    edges: [...(model.edges || [])]
      .map(edge => ({
        id: edge.id,
        route: edge.route ? {
          controlPointDistance: round(edge.route.controlPointDistance),
          locked: Boolean(edge.route.locked),
          side: Number(edge.route.side || 0),
          algorithmVersion: edge.route.algorithmVersion || null
        } : null
      }))
      .sort(byId)
  };
  return hash(stableStringify(compact));
}

export function checkSnapshot(snapshot) {
  const issues = [];
  const model = snapshot?.model;
  if (!model) issues.push("model-missing");
  for (const node of model?.nodes || []) {
    if (!node.position || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) {
      issues.push(`node-position:${node.id}`);
    }
  }
  for (const edge of model?.edges || []) {
    if (!edge.route || !Number.isFinite(edge.route.controlPointDistance)) {
      issues.push(`edge-route:${edge.id}`);
    }
    if (edge.route && edge.route.algorithmVersion !== ROUTING_ALGORITHM_VERSION) {
      issues.push(`route-version:${edge.id}`);
    }
  }
  const qualityGate = evaluateQualityGate({
    ...(snapshot?.quality || {}),
    annotationCollisions: snapshot?.annotations?.annotationCollisions || 0
  }, {
    nodeCount: model?.nodes?.length || 0,
    edgeCount: model?.edges?.length || 0
  });
  if (!qualityGate.accepted) issues.push(...qualityGate.reasons.map(reason => `quality:${reason}`));
  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
    qualityGate,
    fingerprint: snapshot?.fingerprint || null
  };
}

function summarizeRouting(routing) {
  return {
    quality: routing.quality || null,
    durationMs: routing.durationMs || 0,
    crossings: routing.crossings || 0,
    closeSegments: routing.closeSegments || 0,
    loopCrossings: routing.loopCrossings || 0,
    lockedCrossings: routing.lockedCrossings || 0,
    diverted: routing.diverted || 0,
    algorithmVersion: routing.algorithmVersion || ROUTING_ALGORITHM_VERSION
  };
}

function domSnapshot() {
  if (typeof document === "undefined") return null;
  return {
    editing: document.body.classList.contains("editing"),
    focus: document.body.classList.contains("focus-mode"),
    visibleButtons: [...document.querySelectorAll("button:not([hidden])")]
      .map(button => button.id || button.textContent?.trim())
      .filter(Boolean),
    canvasSize: (() => {
      const canvas = document.querySelector("#cld-root");
      if (!canvas) return null;
      return { width: canvas.clientWidth, height: canvas.clientHeight };
    })()
  };
}

function sanitizeContext(context) {
  if (!context || typeof context !== "object") return {};
  return {
    activeIndex: context.activeIndex ?? null,
    activeLoopId: context.activeLoopId ?? null,
    apiAvailable: Boolean(context.apiAvailable),
    layoutDirty: Boolean(context.layoutDirty),
    editing: Boolean(context.editing)
  };
}

function waitForIdle(timeoutMs) {
  const startedAt = Date.now();
  return new Promise(resolve => {
    const check = () => {
      if (Date.now() - startedAt >= Math.min(120, timeoutMs)) return resolve(true);
      if (typeof requestAnimationFrame === "function") return requestAnimationFrame(check);
      return setTimeout(check, 16);
    };
    check();
  });
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}

function roundPoint(point) {
  return { x: round(point.x), y: round(point.y) };
}

function round(value) {
  return Number(Number(value).toFixed(2));
}

function byId(a, b) {
  return String(a.id).localeCompare(String(b.id));
}
