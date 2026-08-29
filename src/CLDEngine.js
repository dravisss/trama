import {
  addEdgeToModel,
  addNodeToModel,
  normalizeModel,
  removeEdgeFromModel,
  removeNodeFromModel,
  updateEdgeInModel,
  updateNodeInModel
} from "./core/model.js";
import { resolveDensityProfile } from "./core/density.js";
import { discoverLoops } from "./core/loops.js";
import { matchaTheme } from "./themes/matcha.js";
import { applyMediaEdgeClearance, applyNodePresentation, createCytoscape } from "./rendering/cytoscape.js";
import { applyViewToCytoscape } from "./rendering/view.js";
import { optimizeRoutes } from "./routing/optimizer.js";
import { AnnotationRenderer } from "./annotations/renderer.js";
import {
  compareLayoutQuality,
  evaluateLayoutQuality,
  evaluateQualityGate
} from "./geometry/layoutQuality.js";
import { diagnoseRoutes, ROUTING_ALGORITHM_VERSION } from "./geometry/routeDiagnostics.js";
import { removeNodeOverlaps } from "./geometry/overlapRemoval.js";
import { InteractionMetrics } from "./performance/interactionMetrics.js";
import { deriveLoopTopology } from "./geometry/loopTopology.js";
import {
  applyLoopAwareSeed,
  applyDeterministicSeed,
  buildCompactPositionVariant,
  buildSkeletonBlendVariant
} from "./geometry/loopSeed.js";
import { fitViewportToRect } from "./geometry/fitViewport.js";

export class CLDEngine extends EventTarget {
  constructor(options) {
    super();
    if (!options?.container) throw new Error("CLDEngine requires a container.");
    this.container = typeof options.container === "string"
      ? document.querySelector(options.container)
      : options.container;
    if (!this.container) throw new Error("CLDEngine container was not found.");
    this.theme = options.theme || matchaTheme;
    this.options = options;
    this.layoutSeed = options.layoutSeed || "loopviewer";
    this.cy = null;
    this.annotations = null;
    this.model = null;
    this.profile = null;
    this.dragFrame = null;
    this.lastCurveCompute = 0;
    this.history = [];
    // The application explicitly selects additive mode when Story Studio is
    // active. Keep the reusable engine's default single-select contract for
    // maps, standalone embeds, and consumers that do not have an app shell.
    this.selectionMode = false;
    this.future = [];
    this.historyLimit = options.historyLimit || 100;
    this.routeQuality = options.routeQuality || "balanced";
    this.routeIdleTimer = null;
    this.routeRenderFrame = null;
    this.routeRenderTimer = null;
    this.resizeObserver = null;
    this.lastRouting = null;
    this.metrics = { modelSetMs: 0, routes: [] };
    this.loopDiscoveryCache = new Map();
    this.interactionMetrics = new InteractionMetrics();
    this.editing = options.editable !== false;
    this.view = options.view || null;
    this.assetResolver = options.assetResolver || (() => null);
    this.mountSurface();
    if (options.model) this.setModel(options.model, { animate: false });
  }

  setModel(input, { animate = false, history = false } = {}) {
    const startedAt = now();
    if (history && this.model) this.pushHistory(this.currentEditableModel());
    this.model = normalizeModel(input);
    this.loopDiscoveryCache.clear();
    this.layoutSeed = this.options.layoutSeed || this.model.layoutMeta?.seed || this.model.id || "loopviewer";
    this.profile = resolveDensityProfile(this.model, this.options.densityProfile);
    this.layoutTopology = deriveLoopTopology(this.model, {
      maxVisualLoops: this.profile.maxVisualLoops
    });
    this.lastRouting = null;
    this.destroyGraph();

    this.cy = createCytoscape({
      container: this.canvas,
      model: this.model,
      theme: this.theme,
      assetResolver: this.assetResolver,
      rendererOptions: this.options.rendererOptions
    });
    this.annotations = new AnnotationRenderer({
      cy: this.cy,
      svg: this.svg,
      profile: this.profile,
      theme: this.theme
    });
    this.annotations.setView(this.view);
    this.observeCanvasSize();
    this.bindInteractions();
    applyViewToCytoscape(this.cy, this.view, this.canvas, { assetResolver: this.assetResolver });
    this.applyEditingState();
    if (!this.model.nodes.length) this.applyEmptyLayout();
    else if (hasCompletePositions(this.model)) {
      this.applyPresetLayout({ animate, reroute: !this.hasCompleteRoutes() });
    }
    else this.relayout({ animate });
    this.emit("modelchange", { model: this.model, profile: this.profile });
    this.metrics.modelSetMs = roundDuration(now() - startedAt);
    return this;
  }

  refreshDerivedState() {
    this.loopDiscoveryCache.clear();
    this.profile = resolveDensityProfile(this.model, this.options.densityProfile);
    this.layoutTopology = deriveLoopTopology(this.model, {
      maxVisualLoops: this.profile.maxVisualLoops
    });
  }

  addNode(data = {}, options = {}) {
    const previous = this.currentEditableModel();
    const model = addNodeToModel(previous, data, options);
    this.pushHistory(previous);
    if (!this.cy) {
      this.setModel(model, { animate: false });
    } else {
      this.model = model;
      this.refreshDerivedState();
      const node = model.nodes.at(-1);
      const element = this.cy.add({
        data: { ...node },
        ...(node.position ? { position: { ...node.position } } : {})
      });
      if (node.locked !== undefined) this.setNodeLocked(node.id, node.locked);
      applyNodePresentation(element, { assetResolver: this.assetResolver });
      this.annotations?.request();
      this.emit("modelchange", { model: this.model, profile: this.profile, incremental: true });
    }
    const node = model.nodes.at(-1);
    this.emit("modelmutate", { action: "addNode", node, model: this.model });
    return node;
  }

  updateNode(id, changes = {}) {
    const previous = this.currentEditableModel();
    const model = updateNodeInModel(previous, id, changes);
    this.pushHistory(previous);
    if (this.canUpdateNodeIncrementally(id, changes)) {
      this.model = model;
      this.profile = resolveDensityProfile(this.model, this.options.densityProfile);
      const node = this.cy.getElementById(id);
      const next = model.nodes.find(item => item.id === id);
      node.data({ ...node.data(), ...next });
      if (next.position) node.position(next.position);
      if (next.locked !== undefined) this.setNodeLocked(id, next.locked);
      applyNodePresentation(node, { assetResolver: this.assetResolver });
      this.annotations?.request();
      this.emit("modelchange", { model: this.model, profile: this.profile, incremental: true });
    } else {
      this.setModel(model, { animate: false });
    }
    const node = this.model.nodes.find(item => item.id === (changes.id || id));
    this.emit("modelmutate", { action: "updateNode", id, node, model: this.model });
    return node || null;
  }

  removeNode(id) {
    const existed = this.model?.nodes.some(node => node.id === id);
    if (!existed) return false;
    const previous = this.currentEditableModel();
    const model = removeNodeFromModel(previous, id);
    this.pushHistory(previous);
    if (!this.cy) this.setModel(model, { animate: false });
    else {
      this.cy.remove(this.cy.getElementById(id));
      this.model = model;
      this.refreshDerivedState();
      this.annotations?.request();
      this.emit("modelchange", { model: this.model, profile: this.profile, incremental: true });
    }
    this.emit("modelmutate", { action: "removeNode", id, model: this.model });
    return true;
  }

  removeNodes(ids = []) {
    const uniqueIds = [...new Set(ids)].filter(id => this.model?.nodes.some(node => node.id === id));
    if (!uniqueIds.length) return false;
    const previous = this.currentEditableModel();
    let model = previous;
    for (const id of uniqueIds) model = removeNodeFromModel(model, id);
    this.pushHistory(previous);
    if (!this.cy) this.setModel(model, { animate: false });
    else {
      this.cy.batch(() => uniqueIds.forEach(id => this.cy.remove(this.cy.getElementById(id))));
      this.model = model;
      this.refreshDerivedState();
      this.annotations?.request();
      this.emit("modelchange", { model: this.model, profile: this.profile, incremental: true });
    }
    this.emit("modelmutate", { action: "removeNodes", ids: uniqueIds, model: this.model });
    return true;
  }

  addEdge(data = {}) {
    const previous = this.currentEditableModel();
    const model = addEdgeToModel(previous, data);
    this.pushHistory(previous);
    if (!this.cy) this.setModel(model, { animate: false });
    else {
      this.model = model;
      this.refreshDerivedState();
      const edge = model.edges.at(-1);
      const element = this.cy.add({
        data: {
          ...edge,
          route: edge.route ? { ...edge.route } : undefined
        },
        classes: edge.type === "balancing" ? "balancing-edge" : "reinforcing-edge"
      });
      this.setEdgeRoute(edge.id, Number(edge.route?.controlPointDistance) || 0, {
        locked: Boolean(edge.route?.locked),
        reason: edge.route?.reason || (edge.route?.locked ? "manual" : "automatic"),
        preview: true
      });
      element.data("routeLocked", Boolean(edge.route?.locked));
      this.annotations?.request();
      this.emit("modelchange", { model: this.model, profile: this.profile, incremental: true });
      this.routeAfterIdle(220);
    }
    const edge = model.edges.at(-1);
    this.emit("modelmutate", { action: "addEdge", edge, model: this.model });
    return edge;
  }

  updateEdge(id, changes = {}, { history = true } = {}) {
    const previous = this.currentEditableModel();
    const model = updateEdgeInModel(previous, id, changes);
    if (history) this.pushHistory(previous);
    if (this.canUpdateEdgeIncrementally(id, changes)) {
      this.model = model;
      if (changes.sourceSign !== undefined || changes.targetSign !== undefined) {
        this.loopDiscoveryCache.clear();
      }
      this.profile = resolveDensityProfile(this.model, this.options.densityProfile);
      const edge = this.cy.getElementById(id);
      const next = model.edges.find(item => item.id === id);
      edge.data({ ...edge.data(), ...next });
      edge.toggleClass("balancing-edge", next.type === "balancing");
      edge.toggleClass("reinforcing-edge", next.type !== "balancing");
      if (next.route && Number.isFinite(next.route.controlPointDistance)) {
        this.setEdgeRoute(id, next.route.controlPointDistance, {
          locked: next.route.locked,
          reason: next.route.reason || (next.route.locked ? "manual" : "automatic"),
          algorithmVersion: next.route.algorithmVersion || ROUTING_ALGORITHM_VERSION,
          normalizedCurvature: next.route.normalizedCurvature,
          side: next.route.side
        });
      }
      this.annotations?.request();
      this.emit("modelchange", { model: this.model, profile: this.profile, incremental: true });
    } else {
      this.setModel(model, { animate: false });
    }
    const edge = this.model.edges.find(item => item.id === (changes.id || id));
    this.emit("modelmutate", { action: "updateEdge", id, edge, model: this.model });
    return edge || null;
  }

  removeEdge(id) {
    const existed = this.model?.edges.some(edge => edge.id === id);
    if (!existed) return false;
    const previous = this.currentEditableModel();
    const model = removeEdgeFromModel(previous, id);
    this.pushHistory(previous);
    if (!this.cy) this.setModel(model, { animate: false });
    else {
      this.cy.remove(this.cy.getElementById(id));
      this.model = model;
      this.refreshDerivedState();
      this.annotations?.request();
      this.emit("modelchange", { model: this.model, profile: this.profile, incremental: true });
    }
    this.emit("modelmutate", { action: "removeEdge", id, model: this.model });
    return true;
  }

  relayout({ animate = true, thorough = false } = {}) {
    if (!this.cy) return;
    this.emit("layoutstart", {});
    const candidates = [];
    const engine = this;
    const nodeCount = engine.cy.nodes().length;
    const attempts = thorough
      ? Math.max(4, this.profile.layoutAttempts + 1)
      : this.routeQuality === "draft" ? 0 : Math.min(
        this.profile.layoutAttempts,
        nodeCount > 30 ? 1 : nodeCount > 20 ? 2 : this.profile.layoutAttempts
    );
    const loopEdgeIds = this.layoutTopology?.loopEdgeIds || [];
    let skeletonPositions = null;
    if (!hasCompletePositions(engine.model)) {
      skeletonPositions = applyDeterministicSeed(engine.cy, engine.layoutTopology, {
        seed: engine.layoutSeed,
        idealEdgeLength: engine.profile.idealEdgeLength
      });
    }
    evaluateCurrentComposition();
    const initialBest = candidates.sort((a, b) => compareLayoutQuality(a.quality, b.quality))[0];
    if (attempts === 0 || isEditoriallyAcceptable(
      initialBest.quality,
      engine.cy.nodes().length,
      engine.cy.edges().length
    )) finish();
    else runAttempt(0);
    function runAttempt(index) {
      if (index === 0 && attempts === 0) return finish();
      const layout = engine.cy.layout({
        name: thorough && globalThis.__LOOPVIEWER_FCOSE__ ? "fcose" : "cose-bilkent",
        quality: thorough ? "proof" : "default",
        // The graph is seeded before entering CoSE. Letting the layout plugin
        // randomize again is the main source of first-load/reload drift.
        randomize: false,
        animate: false,
        fit: false,
        nodeDimensionsIncludeLabels: true,
        ...(thorough && globalThis.__LOOPVIEWER_FCOSE__ ? {
          fixedNodeConstraint: engine.cy.nodes().filter(node => node.locked()).map(node => ({
            nodeId: node.id(),
            position: { ...node.position() }
          })),
          nodeSeparation: 75
        } : {}),
        idealEdgeLength: engine.profile.idealEdgeLength,
        nodeRepulsion: engine.profile.nodeRepulsion,
        edgeElasticity: 0.35,
        nestingFactor: 0.12,
        gravity: 0.12,
        numIter: thorough
          ? (index === attempts - 1 ? 2400 : 1400)
          : interactiveIterations(engine.cy.nodes().length),
        tile: true
      });
      layout.one("layoutstop", () => {
        removeNodeOverlaps(engine.cy, {
          iterations: thorough ? 8 : 3,
          gap: engine.profile.preferredNodeGap
        });
        evaluateCurrentComposition({ quality: thorough ? engine.routeQuality : "draft" });
        const best = candidates.sort((a, b) => compareLayoutQuality(a.quality, b.quality))[0];
        if (isEditoriallyAcceptable(
          best.quality,
          engine.cy.nodes().length,
          engine.cy.edges().length
        )) return finish();
        if (index + 1 < attempts) runAttempt(index + 1);
        else finish();
      });
      layout.run();
    }

    function evaluateCurrentComposition({ quality = engine.routeQuality } = {}) {
      const basePositions = snapshotPositions(engine.cy);
      const baseRouting = engine.route({ quality });
      candidates.push(captureCandidate(engine.cy, baseRouting, loopEdgeIds));

      const variants = [];
      const allowExpensiveVariants = quality === "publish" || engine.cy.nodes().length <= 25;
      if (skeletonPositions?.size && allowExpensiveVariants) {
        variants.push(buildSkeletonBlendVariant(basePositions, skeletonPositions));
      }
      if (allowExpensiveVariants && !engine.cy.nodes().some(node => node.locked())) {
        variants.push(buildCompactPositionVariant(basePositions, { scale: 0.9, aspectTarget: 1.9 }));
        variants.push(buildCompactPositionVariant(basePositions, { scale: 0.82, aspectTarget: 1.7 }));
      }

      for (const positions of variants) {
        applyPositions(engine.cy, positions);
        removeNodeOverlaps(engine.cy, {
          iterations: quality === "publish" ? 8 : 3,
          gap: engine.profile.preferredNodeGap
        });
        const routing = engine.route({ quality });
        candidates.push(captureCandidate(engine.cy, routing, loopEdgeIds));
      }
      applyPositions(engine.cy, basePositions);
      engine.route({ quality });
    }

    function finish() {
      const best = candidates.sort((a, b) => compareLayoutQuality(a.quality, b.quality))[0];
      engine.cy.batch(() => {
        for (const node of engine.cy.nodes()) node.position(best.positions.get(node.id()));
        for (const edge of engine.cy.edges()) {
          const distance = best.routes.get(edge.id());
          edge.style({ "control-point-distances": distance, "control-point-weights": 0.5 });
          edge.data("curveDistance", distance);
          edge.data("route", {
            ...(edge.data("route") || {}),
            controlPointDistance: distance,
            locked: Boolean(edge.data("routeLocked")),
            ...(best.routeMeta.get(edge.id()) || {})
          });
          edge.removeData("annotationSide");
        }
      });
      const routing = { ...best.routing, layoutQuality: best.quality };
      engine.lastRouting = routing;
      engine.annotations?.request();
      engine.emit("route", routing);
      engine.fit({ duration: animate ? 420 : 0 });
      engine.scheduleRouteRendering();
      engine.emit("layoutend", { routing, candidates: candidates.map(item => item.quality) });
    }
  }

  route({ quality = this.routeQuality, respectLocks = true } = {}) {
    if (!this.cy) return null;
    const startedAt = now();
    const result = optimizeRoutes(this.cy, this.profile, {
      quality,
      respectLocks,
      loopEdgeIds: this.layoutTopology?.loopEdgeIds || []
    });
    result.routeDiagnostics = diagnoseRoutes(this.cy, result);
    result.quality = quality;
    result.durationMs = roundDuration(now() - startedAt);
    result.annotationMetrics = this.annotations?.getMetrics?.() || null;
    result.annotationCollisions = Number(result.annotationMetrics?.annotationCollisions || 0);
    this.metrics.routes.push({ quality, durationMs: result.durationMs, edgeCount: this.cy.edges().length });
    if (this.metrics.routes.length > 30) this.metrics.routes.shift();
    this.lastRouting = result;
    this.annotations.request();
    this.emit("route", result);
    return result;
  }

  refreshRouteRendering() {
    if (!this.cy) return;
    this.cy.batch(() => {
      for (const edge of this.cy.edges()) {
        const distance = Number(edge.data("curveDistance") ?? edge.data("route")?.controlPointDistance);
        if (!Number.isFinite(distance)) continue;
        edge.style({ "control-point-distances": distance, "control-point-weights": 0.5 });
      }
    });
    this.cy.forceRender?.();
    this.annotations?.request();
  }

  observeCanvasSize() {
    if (typeof ResizeObserver === "undefined" || !this.canvas) return;
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.cy) return;
      this.cy.resize();
      this.scheduleRouteRendering();
    });
    this.resizeObserver.observe(this.canvas);
  }

  fit({ padding = 85, duration = 420, safeRect = null } = {}) {
    if (!this.cy) return;
    if (safeRect && this.cy.elements().length) {
      const boundingBox = this.cy.elements().boundingBox({ includeLabels: true });
      const viewport = fitViewportToRect({
        boundingBox: {
          x: boundingBox.x1,
          y: boundingBox.y1,
          width: boundingBox.w,
          height: boundingBox.h
        },
        rect: safeRect,
        padding
      });
      if (viewport) {
        this.cy.animate({ zoom: viewport.zoom, pan: viewport.pan }, { duration });
        return;
      }
    }
    this.cy.animate({ fit: { eles: this.cy.elements(), padding }, duration });
  }

  focusNode(id) {
    if (!this.cy) return;
    const node = this.cy.getElementById(id);
    if (!node.length) return;
    this.applyFocus(node.closedNeighborhood());
  }

  focusEdge(id) {
    if (!this.cy) return false;
    const edge = this.cy.getElementById(id);
    if (!edge.length) return false;
    this.applyFocus(edge.union(edge.connectedNodes()));
    return true;
  }

  focusLoop(id) {
    if (!this.cy || !this.model) return false;
    const loop = this.getLoops().find(item => item.id === id) ||
      this.getLoops({ discover: true }).find(item => item.id === id);
    if (!loop) return false;
    const edges = loop.edgeIds
      .map(edgeId => this.cy.getElementById(edgeId))
      .reduce((collection, edge) => collection.union(edge), this.cy.collection());
    this.applyFocus(edges.union(edges.connectedNodes()));
    return true;
  }

  getLoops({ discover = false, maxLength = 8, maxLoops = 100 } = {}) {
    if (!this.model) return [];
    if (!discover) return this.model.loops.map(loop => ({
        ...loop,
        edgeIds: [...loop.edgeIds]
      }));
    const key = `${maxLength}:${maxLoops}`;
    const cached = this.loopDiscoveryCache.get(key);
    if (cached) return cached.map(loop => ({ ...loop, edgeIds: [...loop.edgeIds] }));
    const discovered = discoverLoops(this.model, { maxLength, maxLoops });
    this.loopDiscoveryCache.set(key, discovered);
    return discovered.map(loop => ({ ...loop, edgeIds: [...loop.edgeIds] }));
  }

  setLoops(loops = []) {
    if (!this.model) return this;
    this.loopDiscoveryCache.clear();
    this.model.loops = loops.map(loop => ({ ...loop, edgeIds: [...loop.edgeIds] }));
    this.layoutTopology = deriveLoopTopology(this.model, {
      maxVisualLoops: this.profile.maxVisualLoops
    });
    this.emit("loopschange", { loops: this.getLoops() });
    return this;
  }

  setView(view, { reroute = true } = {}) {
    this.view = view || null;
    if (["draft", "balanced", "publish"].includes(view?.settings?.["route-quality"])) {
      this.routeQuality = view.settings["route-quality"];
    }
    applyViewToCytoscape(this.cy, this.view, this.canvas, { assetResolver: this.assetResolver });
    this.annotations?.setView(this.view);
    this.annotations?.request();
    if (reroute) this.routeAfterIdle(80);
    else clearTimeout(this.routeIdleTimer);
    this.emit("viewchange", { view: this.view });
    return this;
  }

  setAssetResolver(resolver) {
    this.assetResolver = typeof resolver === "function" ? resolver : (() => null);
    const mediaEnabled = this.view?.settings?.["node-media"] !== false;
    this.cy?.nodes().forEach(node => applyNodePresentation(node, { assetResolver: this.assetResolver, mediaEnabled }));
    applyMediaEdgeClearance(this.cy, { mediaEnabled });
    this.annotations?.request();
    this.routeAfterIdle(80);
    return this;
  }

  hasCompleteRoutes() {
    return Boolean(this.cy) && this.cy.edges().every(edge =>
      Number.isFinite(Number(edge.data("route")?.controlPointDistance ?? edge.data("curveDistance")))
    );
  }

  setRouteQuality(quality = "balanced") {
    if (!["draft", "balanced", "publish"].includes(quality)) return false;
    this.routeQuality = quality;
    this.emit("routequalitychange", { quality });
    return true;
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) return false;
    this.future.push(this.currentEditableModel());
    this.setModel(previous, { animate: false });
    this.emit("historychange", { canUndo: this.history.length > 0, canRedo: true });
    return true;
  }

  redo() {
    const next = this.future.pop();
    if (!next) return false;
    this.history.push(this.currentEditableModel());
    this.setModel(next, { animate: false });
    this.emit("historychange", { canUndo: true, canRedo: this.future.length > 0 });
    return true;
  }

  resetHistory() {
    this.history.length = 0;
    this.future.length = 0;
    this.emit("historychange", { canUndo: false, canRedo: false });
    return this;
  }

  pushHistory(model) {
    if (!model) return;
    this.history.push(cloneModel(model));
    if (this.history.length > this.historyLimit) this.history.shift();
    this.future.length = 0;
    this.emit("historychange", { canUndo: true, canRedo: false });
  }

  getModel({ includePositions = false, includeRoutes = false } = {}) {
    if (!this.model) return null;
    const model = cloneModel(this.model);
    if (!this.cy) return model;
    model.layoutMeta = {
      ...(model.layoutMeta || {}),
      algorithmVersion: ROUTING_ALGORITHM_VERSION,
      seed: this.layoutSeed
    };
    if (includePositions) {
      model.nodes = model.nodes.map(node => {
        const element = this.cy.getElementById(node.id);
        return {
          ...node,
          position: { ...element.position() },
          locked: element.locked()
        };
      });
    }
    if (includeRoutes) {
      model.edges = model.edges.map(edge => {
        const element = this.cy.getElementById(edge.id);
        return {
          ...edge,
          route: {
            ...(element.data("route") || {}),
            controlPointDistance: Number(element.data("curveDistance")) || 0,
            locked: Boolean(element.data("routeLocked"))
          }
        };
      });
    }
    return model;
  }

  setEdgeRoute(id, controlPointDistance, {
    locked = true,
    reason = locked ? "manual" : "automatic",
    algorithmVersion = ROUTING_ALGORITHM_VERSION,
    preview = false,
    ...metadata
  } = {}) {
    const edge = this.cy?.getElementById(id);
    if (!edge?.length || !Number.isFinite(controlPointDistance)) return false;
    const distance = Math.round(controlPointDistance * 100) / 100;
    edge.data("route", {
      ...(edge.data("route") || {}),
      ...metadata,
      controlPointDistance: distance,
      locked: Boolean(locked),
      algorithmVersion,
      reason
    });
    edge.data("routeLocked", Boolean(locked));
    edge.data("curveDistance", Math.round(distance));
    edge.removeData("annotationSide");
    edge.style({
      "control-point-distances": distance,
      "control-point-weights": 0.5
    });
    this.annotations?.request();
    if (preview) this.emit("routepreview", { id, controlPointDistance: distance, locked: Boolean(locked) });
    else this.emit("routechange", { id, controlPointDistance: distance, locked: Boolean(locked) });
    return true;
  }

  beginRouteInteraction(id) {
    const edge = this.cy?.getElementById(id);
    if (!edge?.length) return false;
    this.pushHistory(this.currentEditableModel());
    this.annotations?.setInteraction(true);
    this.interactionMetrics.begin("route-drag", id);
    return true;
  }

  previewEdgeRoute(id, controlPointDistance) {
    const startedAt = now();
    const result = this.setEdgeRoute(id, controlPointDistance, {
      locked: true,
      reason: "manual",
      preview: true
    });
    if (result) this.interactionMetrics.preview(startedAt);
    return result;
  }

  commitEdgeRoute(id, controlPointDistance) {
    const edge = this.cy?.getElementById(id);
    if (!edge?.length || !Number.isFinite(controlPointDistance)) return false;
    const route = {
      ...(edge.data("route") || {}),
      controlPointDistance,
      locked: true,
      reason: "manual",
      algorithmVersion: ROUTING_ALGORITHM_VERSION
    };
    const result = this.updateEdge(id, { route }, { history: false });
    this.annotations?.setInteraction(false);
    this.interactionMetrics.finish("commit");
    return Boolean(result);
  }

  cancelRouteInteraction() {
    this.annotations?.setInteraction(false);
    this.interactionMetrics.finish("cancel");
  }

  unlockEdgeRoute(id) {
    const edge = this.cy?.getElementById(id);
    if (!edge?.length) return false;
    const distance = Number(edge.data("curveDistance")) || 0;
    edge.data("route", {
      ...(edge.data("route") || {}),
      controlPointDistance: distance,
      locked: false,
      algorithmVersion: ROUTING_ALGORITHM_VERSION,
      reason: "automatic"
    });
    edge.data("routeLocked", false);
    this.route();
    this.emit("routechange", {
      id,
      controlPointDistance: Number(edge.data("curveDistance")) || 0,
      locked: false
    });
    return true;
  }

  setNodeLocked(id, locked = true) {
    const node = this.cy?.getElementById(id);
    if (!node?.length) return false;
    if (locked) {
      node.lock();
      node.ungrabify();
    } else {
      node.unlock();
      if (this.editing) node.grabify();
    }
    this.emit("nodelockchange", { id, locked });
    return true;
  }

  setEditing(editing = true) {
    this.editing = Boolean(editing);
    this.applyEditingState();
    this.emit("editmodechange", { editing: this.editing });
    return this;
  }

  setSelectionMode(enabled = false) {
    this.selectionMode = Boolean(enabled);
    // Cytoscape's native tap policy is the last participant in a gesture. Keep
    // it aligned with the canvas contract so Story Studio can accumulate
    // elements while the regular editor remains single-select.
    this.cy?.selectionType?.(this.selectionMode ? "additive" : "single");
    return this;
  }

  clearFocus() {
    this.cy?.elements().removeClass("faded focused");
    this.annotations?.request();
  }

  getState() {
    return {
      model: this.model,
      density: this.profile?.density,
      zoom: this.cy?.zoom(),
      pan: this.cy?.pan(),
      metrics: {
        modelSetMs: this.metrics.modelSetMs,
        routes: this.metrics.routes.map(item => ({ ...item })),
        annotations: this.annotations?.getMetrics?.() || null,
        interactions: this.interactionMetrics.snapshot()
      }
    };
  }

  currentEditableModel() {
    return this.getModel({ includePositions: true, includeRoutes: true }) || {
      id: "untitled-diagram",
      title: "Novo diagrama",
      nodes: [],
      edges: [],
      loops: []
    };
  }

  canUpdateNodeIncrementally(id, changes) {
    return Boolean(this.cy?.getElementById(id)?.length) &&
      (changes.id === undefined || changes.id === id);
  }

  canUpdateEdgeIncrementally(id, changes) {
    const current = this.model?.edges.find(edge => edge.id === id);
    return Boolean(this.cy?.getElementById(id)?.length && current) &&
      (changes.id === undefined || changes.id === id) &&
      (changes.source === undefined || changes.source === current.source) &&
      (changes.target === undefined || changes.target === current.target);
  }

  updateNodes(ids = [], changes = {}) {
    const uniqueIds = [...new Set(ids)].filter(id => this.model?.nodes.some(node => node.id === id));
    if (!uniqueIds.length) return [];
    const previous = this.currentEditableModel();
    let model = previous;
    for (const id of uniqueIds) model = updateNodeInModel(model, id, changes);
    this.pushHistory(previous);
    this.model = model;
    this.profile = resolveDensityProfile(this.model, this.options.densityProfile);
    for (const id of uniqueIds) {
      const element = this.cy.getElementById(id);
      const next = model.nodes.find(node => node.id === id);
      element.data({ ...element.data(), ...next });
      if (next.locked !== undefined) this.setNodeLocked(id, next.locked);
      applyNodePresentation(element, { assetResolver: this.assetResolver });
    }
    this.annotations?.request();
    this.emit("modelchange", { model: this.model, profile: this.profile, incremental: true });
    this.emit("modelmutate", { action: "updateNodes", ids: uniqueIds, nodes: model.nodes.filter(node => uniqueIds.includes(node.id)), model });
    return model.nodes.filter(node => uniqueIds.includes(node.id));
  }

  commitNodePosition(id, position) {
    const node = this.cy?.getElementById(id);
    if (!node?.length || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return false;
    const current = this.currentEditableModel();
    this.model = updateNodeInModel(current, id, { position });
    this.refreshDerivedState();
    this.emit("positioncommit", {
      id,
      position: { ...position },
      model: this.model
    });
    return true;
  }

  moveNodes(ids = [], { dx = 0, dy = 0 } = {}) {
    const uniqueIds = [...new Set(ids)].filter(id => this.cy?.getElementById(id)?.length);
    if (!uniqueIds.length || (!dx && !dy)) return false;
    const previous = this.currentEditableModel();
    const positions = new Map(uniqueIds.map(id => {
      const position = this.cy.getElementById(id).position();
      return [id, { x: position.x + dx, y: position.y + dy }];
    }));
    this.pushHistory(previous);
    this.model = normalizeModel({
      ...previous,
      nodes: previous.nodes.map(node => positions.has(node.id)
        ? { ...node, position: positions.get(node.id) }
        : node)
    });
    this.cy.batch(() => positions.forEach((position, id) => this.cy.getElementById(id).position(position)));
    this.annotations?.request();
    this.route({ quality: "draft" });
    this.routeAfterIdle(220);
    this.emit("modelmutate", { action: "moveNodes", ids: uniqueIds, model: this.model });
    return true;
  }

  alignNodes(ids = [], mode = "left") {
    const nodes = [...new Set(ids)].map(id => this.cy?.getElementById(id)).filter(node => node?.length);
    if (nodes.length < 2) return false;
    const xs = nodes.map(node => node.position("x"));
    const ys = nodes.map(node => node.position("y"));
    const target = mode === "left" ? Math.min(...xs)
      : mode === "right" ? Math.max(...xs)
        : mode === "top" ? Math.min(...ys)
          : mode === "bottom" ? Math.max(...ys)
            : mode === "center-x" ? xs.reduce((sum, value) => sum + value, 0) / xs.length
              : ys.reduce((sum, value) => sum + value, 0) / ys.length;
    const previous = this.currentEditableModel();
    this.pushHistory(previous);
    this.cy.batch(() => nodes.forEach(node => {
      if (["left", "right", "center-x"].includes(mode)) node.position("x", target);
      else node.position("y", target);
    }));
    this.model = this.currentEditableModel();
    this.annotations?.request();
    this.route({ quality: "draft" });
    this.routeAfterIdle(220);
    this.emit("modelmutate", { action: "alignNodes", ids, mode, model: this.model });
    return true;
  }

  duplicateSelection(ids = [], { offset = 32 } = {}) {
    const selected = new Set(ids);
    if (!selected.size) return [];
    const previous = this.currentEditableModel();
    let model = previous;
    const idMap = new Map();
    for (const node of previous.nodes.filter(item => selected.has(item.id))) {
      const duplicate = addNodeToModel(model, {
        ...node,
        id: `${node.id}-copy`,
        label: `${node.label} cópia`,
        position: node.position ? { x: node.position.x + offset, y: node.position.y + offset } : undefined,
        locked: false
      });
      const added = duplicate.nodes.at(-1);
      idMap.set(node.id, added.id);
      model = duplicate;
    }
    for (const edge of previous.edges.filter(item => selected.has(item.source) && selected.has(item.target))) {
      model = addEdgeToModel(model, {
        ...edge,
        id: `${edge.id}-copy`,
        source: idMap.get(edge.source),
        target: idMap.get(edge.target),
        route: undefined
      });
    }
    this.pushHistory(previous);
    this.setModel(model, { animate: false });
    const createdIds = [...idMap.values()];
    this.emit("modelmutate", { action: "duplicateSelection", ids: createdIds, model: this.model });
    return createdIds;
  }

  routeAfterIdle(delay = 160) {
    clearTimeout(this.routeIdleTimer);
    this.routeIdleTimer = setTimeout(() => this.route(), delay);
  }

  destroy() {
    this.destroyGraph();
    this.container.replaceChildren();
  }

  mountSurface() {
    this.container.classList.add("cld-engine");
    this.canvas = document.createElement("div");
    this.canvas.className = "cld-canvas";
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.classList.add("cld-annotations");
    this.svg.setAttribute("aria-hidden", "true");
    this.container.replaceChildren(this.canvas, this.svg);
  }

  bindInteractions() {
    const cy = this.cy;
    // Cytoscape applies its own tap-selection after the `tap` callback. Keep
    // a snapshot at tapstart so additive Story Studio clicks can restore the
    // selection that existed immediately before the current element was hit.
    // Without this, the second click has already replaced the first selection
    // by the time our mode-aware handler runs, making Shift/Cmd appear broken.
    let selectionBeforeTap = null;
    cy.selectionType?.(this.selectionMode ? "additive" : "single");
    const snapshotSelection = event => {
      const originalEvent = event.originalEvent;
      const additive = originalEvent?.shiftKey || originalEvent?.metaKey || originalEvent?.ctrlKey;
      if (!this.selectionMode && !additive) {
        selectionBeforeTap = null;
        return;
      }
      selectionBeforeTap = cy.elements(":selected").map(element => element.id());
    };
    cy.on("tapstart", "node, edge", snapshotSelection);
    cy.on("render", () => this.annotations.request());
    cy.on("drag", "node", () => {
      this.annotations.request();
    });
    cy.on("grab", "node", () => {
      if (this.editing) {
        this.pushHistory(this.currentEditableModel());
        this.annotations?.setInteraction(true);
        this.interactionMetrics.begin("node-drag");
      }
    });
    cy.on("drag", "node", () => this.interactionMetrics.preview());
    cy.on("free", "node", event => {
      // Keep the release responsive. Balanced global refinement is scheduled
      // after the gesture rather than blocking the pointer-up frame.
      const routing = this.route({ quality: "draft" });
      this.routeAfterIdle(220);
      this.commitNodePosition(event.target.id(), { ...event.target.position() });
      this.annotations?.setInteraction(false);
      this.interactionMetrics.finish("commit");
      this.emit("positionchange", {
        id: event.target.id(),
        position: { ...event.target.position() },
        routing
      });
    });
    cy.on("mouseover", "node", event => {
      event.target.addClass("hovered");
      this.annotations.request();
    });
    cy.on("mouseout", "node", event => {
      event.target.removeClass("hovered");
      this.annotations.request();
    });
    cy.on("mouseover", "edge", event => {
      event.target.addClass("annotation-focus");
      this.annotations.request();
    });
    cy.on("mouseout", "edge", event => {
      event.target.removeClass("annotation-focus");
      this.annotations.request();
    });
    cy.on("tap", "node", event => {
      const node = event.target;
      const additive = event.originalEvent?.shiftKey || event.originalEvent?.metaKey || event.originalEvent?.ctrlKey;
      const priorSelection = selectionBeforeTap;
      selectionBeforeTap = null;
      if (this.editing || additive || this.selectionMode) {
        if (this.selectionMode || additive) {
          // The app-level activate handler also participates in selection.
          // Reconcile once Cytoscape finishes its native tap-selection and the
          // app handler has run; doing it synchronously lets Cytoscape toggle
          // the just-selected element back off on pointer-up.
          queueMicrotask(() => {
            if (!this.cy) return;
            cy.batch(() => {
              priorSelection?.forEach(id => cy.getElementById(id).select());
              node.select();
            });
          });
        } else {
          cy.elements().not(node).unselect();
          node.select();
        }
      } else {
        this.applyFocus(node.closedNeighborhood());
      }
      this.emit("nodeactivate", {
        node: { ...node.data() },
        position: { ...node.position() },
        locked: node.locked(),
        editing: this.editing,
        originalEvent: event.originalEvent
      });
    });
    cy.on("select unselect", "node, edge", () => {
      this.emit("selectionchange", {
        nodeIds: cy.nodes(":selected").map(node => node.id()),
        edgeIds: cy.edges(":selected").map(edge => edge.id())
      });
    });
    cy.on("tap", "edge", event => {
      const edge = event.target;
      const additive = event.originalEvent?.shiftKey || event.originalEvent?.metaKey || event.originalEvent?.ctrlKey;
      const priorSelection = selectionBeforeTap;
      selectionBeforeTap = null;
      if (this.editing || additive || this.selectionMode) {
        if (this.selectionMode || additive) {
          queueMicrotask(() => {
            if (!this.cy) return;
            cy.batch(() => {
              priorSelection?.forEach(id => cy.getElementById(id).select());
              edge.select();
            });
          });
        } else {
          cy.elements().not(edge).unselect();
          edge.select();
        }
      } else {
        this.applyFocus(edge.union(edge.connectedNodes()));
      }
      this.emit("edgeactivate", {
        edge: { ...edge.data() },
        source: { ...edge.source().data() },
        target: { ...edge.target().data() },
        originalEvent: event.originalEvent
      });
    });
    cy.on("tap", event => {
      if (event.target === cy) {
        cy.elements().unselect();
        this.clearFocus();
        this.emit("backgroundactivate", {});
      }
    });
  }

  applyFocus(collection) {
    this.cy.elements().addClass("faded").removeClass("focused");
    collection.removeClass("faded").addClass("focused");
    this.annotations.request();
  }

  destroyGraph() {
    if (this.dragFrame) cancelAnimationFrame(this.dragFrame);
    clearTimeout(this.routeIdleTimer);
    if (this.routeRenderFrame) cancelAnimationFrame(this.routeRenderFrame);
    clearTimeout(this.routeRenderTimer);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.routeRenderFrame = null;
    this.routeRenderTimer = null;
    this.annotations?.destroy();
    this.annotations = null;
    this.cy?.destroy();
    this.cy = null;
    this.svg?.replaceChildren();
  }

  emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }

  applyEditingState() {
    if (!this.cy) return;
    if (!this.editing) {
      this.cy.nodes().ungrabify();
      return;
    }
    this.cy.nodes().forEach(node => {
      if (node.locked()) node.ungrabify();
      else node.grabify();
    });
  }

  applyPresetLayout({ animate = false, reroute = true } = {}) {
    if (!this.cy) return;
    this.emit("layoutstart", {});
    const layout = this.cy.layout({
      name: "preset",
      animate,
      animationDuration: animate ? 420 : 0,
      fit: true,
      padding: 100
    });
    layout.one("layoutstop", () => {
      const routing = reroute ? this.route() : null;
      this.fit();
      this.scheduleRouteRendering();
      this.emit("layoutend", { routing });
    });
    layout.run();
  }

  applyEmptyLayout() {
    this.emit("layoutstart", {});
    const routing = this.route();
    this.emit("layoutend", { routing });
  }

  scheduleRouteRendering() {
    // Cytoscape can paint the stylesheet default curve during its first
    // layout frame, particularly while the surrounding sidebars resize. Reuse
    // the already-computed route data after both the next paint and the panel
    // transition, without rerunning the optimizer or mutating the model.
    if (this.routeRenderFrame) cancelAnimationFrame(this.routeRenderFrame);
    clearTimeout(this.routeRenderTimer);
    this.routeRenderFrame = requestAnimationFrame(() => {
      this.routeRenderFrame = null;
      this.refreshRouteRendering();
    });
    this.routeRenderTimer = setTimeout(() => {
      this.routeRenderTimer = null;
      this.refreshRouteRendering();
    }, 260);
  }
}

export function createCLD(options) {
  return new CLDEngine(options);
}

function hasCompletePositions(model) {
  return model.nodes.every(node =>
    node.position && Number.isFinite(node.position.x) && Number.isFinite(node.position.y)
  );
}

function snapshotPositions(cy) {
  return new Map(cy.nodes().toArray().map(node => [node.id(), { ...node.position() }]));
}

function applyPositions(cy, positions) {
  cy.batch(() => {
    for (const node of cy.nodes()) {
      const position = positions.get(node.id());
      if (position && !node.locked()) node.position(position);
    }
  });
}

function captureCandidate(cy, routing, loopEdgeIds) {
  return {
    positions: new Map(cy.nodes().toArray().map(node => [node.id(), { ...node.position() }])),
    routes: new Map(cy.edges().toArray().map(edge => [edge.id(), Number(edge.data("curveDistance") || 0)])),
    routeMeta: new Map(cy.edges().toArray().map(edge => [edge.id(), { ...(edge.data("route") || {}) }])),
    routing,
    quality: evaluateLayoutQuality(cy, routing, { loopEdgeIds })
  };
}

function isEditoriallyAcceptable(quality, nodeCount, edgeCount) {
  return evaluateQualityGate(quality, { nodeCount, edgeCount }).accepted;
}

function interactiveIterations(nodeCount) {
  if (nodeCount > 15) return 420;
  if (nodeCount > 10) return 620;
  return 850;
}

function cloneModel(model) {
  return {
    ...model,
    nodes: model.nodes.map(node => ({
      ...node,
      ...(node.position ? { position: { ...node.position } } : {})
    })),
    edges: model.edges.map(edge => ({
      ...edge,
      ...(edge.route ? { route: { ...edge.route } } : {})
    })),
    loops: model.loops.map(loop => ({ ...loop, edgeIds: [...loop.edgeIds] }))
  };
}

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function roundDuration(value) {
  return Math.round(value * 100) / 100;
}
