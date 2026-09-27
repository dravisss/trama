var CLD = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    BEAT_TYPES: () => BEAT_TYPES,
    CAMERA_MODES: () => CAMERA_MODES,
    CLDEngine: () => CLDEngine,
    CLDValidationError: () => CLDValidationError,
    DEFAULT_CAMERA_MAX_ZOOM: () => DEFAULT_CAMERA_MAX_ZOOM,
    DESIGN_SYSTEM_MANIFEST: () => DESIGN_SYSTEM_MANIFEST,
    LOOP_TYPES: () => LOOP_TYPES,
    LoopLanguageError: () => LoopLanguageError,
    LoopStyleError: () => LoopStyleError,
    MermaidImportError: () => MermaidImportError,
    NODE_MEDIA_DEFAULTS: () => NODE_MEDIA_DEFAULTS,
    PRESENTATION_SCHEMA_VERSION: () => PRESENTATION_SCHEMA_VERSION,
    PresentationController: () => PresentationController,
    PresentationExportError: () => PresentationExportError,
    PresentationLanguageError: () => PresentationLanguageError,
    QA_RUNTIME_VERSION: () => QA_RUNTIME_VERSION,
    ROUTING_ALGORITHM_VERSION: () => ROUTING_ALGORITHM_VERSION,
    SCENE_TYPES: () => SCENE_TYPES,
    ViewResolutionError: () => ViewResolutionError,
    addEdgeToModel: () => addEdgeToModel,
    addNodeToModel: () => addNodeToModel,
    analyzeDensity: () => analyzeDensity,
    analyzeTopology: () => analyzeTopology,
    applyDeterministicSeed: () => applyDeterministicSeed,
    applyLintFix: () => applyLintFix,
    applyLintFixes: () => applyLintFixes,
    applyLoopAwareSeed: () => applyLoopAwareSeed,
    buildDeterministicSeed: () => buildDeterministicSeed,
    buildLoopAwareSeed: () => buildLoopAwareSeed,
    buildViewLegend: () => buildViewLegend,
    cameraTargetIds: () => cameraTargetIds,
    canonicalCycleKey: () => canonicalCycleKey,
    checkSnapshot: () => checkSnapshot,
    classifyLoop: () => classifyLoop,
    collectCameraElements: () => collectCameraElements,
    compileLoopMarkdown: () => compileLoopMarkdown,
    compileLoopStyle: () => compileLoopStyle,
    compilePresentation: () => compilePresentation,
    compilePresentationExport: () => compilePresentationExport,
    compilePresentationMarkdown: () => compilePresentationMarkdown,
    createCLD: () => createCLD,
    createEmptyModel: () => createEmptyModel,
    createPresentationState: () => createPresentationState,
    createQaRuntime: () => createQaRuntime,
    createReferenceContext: () => createReferenceContext,
    createRoutingFixture: () => createRoutingFixture,
    densityProfiles: () => densityProfiles,
    deriveLoopTopology: () => deriveLoopTopology,
    diagnoseRoutes: () => diagnoseRoutes,
    discoverLoops: () => discoverLoops,
    fingerprint: () => fingerprint,
    geometry: () => geometry_exports,
    getCameraViewport: () => getCameraViewport,
    hasBlockingLint: () => hasBlockingLint,
    importMermaid: () => importMermaid,
    lintPresentation: () => lintPresentation,
    matchaTheme: () => matchaTheme,
    measurePresentationPerformance: () => measurePresentationPerformance,
    mergeStage: () => mergeStage,
    migrateStoryToPresentation: () => migrateStoryToPresentation,
    nodeMediaEnvelope: () => nodeMediaEnvelope,
    normalizeBeat: () => normalizeBeat,
    normalizeCamera: () => normalizeCamera,
    normalizeCameraMode: () => normalizeCameraMode,
    normalizeChapter: () => normalizeChapter,
    normalizeFocus: () => normalizeFocus,
    normalizeModel: () => normalizeModel,
    normalizeNodeMedia: () => normalizeNodeMedia,
    normalizePresentation: () => normalizePresentation,
    normalizeScene: () => normalizeScene,
    normalizeSign: () => normalizeSign2,
    promoteLegacyModel: () => promoteLegacyModel,
    reducePresentationState: () => reducePresentationState,
    relationPolarity: () => relationPolarity,
    removeEdgeFromModel: () => removeEdgeFromModel,
    removeNodeFromModel: () => removeNodeFromModel,
    repairGeneratedPresentation: () => repairGeneratedPresentation,
    resolveCameraPlan: () => resolveCameraPlan,
    resolveDensityProfile: () => resolveDensityProfile,
    resolveFocus: () => resolveFocus,
    resolvePresentationReferences: () => resolvePresentationReferences,
    resolveView: () => resolveView,
    routeClass: () => routeClass,
    routingFixtures: () => routingFixtures,
    serializeLoopMarkdown: () => serializeLoopMarkdown,
    serializeLoopStyle: () => serializeLoopStyle,
    serializePresentationMarkdown: () => serializePresentationMarkdown,
    slugId: () => slugId,
    stylePropertiesForEntity: () => stylePropertiesForEntity,
    suggestPresentation: () => suggestPresentation,
    uniqueId: () => uniqueId,
    updateEdgeInModel: () => updateEdgeInModel,
    updateNodeInModel: () => updateNodeInModel,
    validateModel: () => validateModel,
    validateNodeMedia: () => validateNodeMedia,
    validatePresentation: () => validatePresentation
  });

  // src/core/loops.js
  var LOOP_TYPES = /* @__PURE__ */ new Set(["reinforcing", "balancing"]);
  var discoveryCache = /* @__PURE__ */ new WeakMap();
  function relationPolarity(edge) {
    return normalizeSign(edge.sourceSign) === normalizeSign(edge.targetSign) ? 1 : -1;
  }
  function classifyLoop(edges) {
    const polarity = edges.reduce((product, edge) => product * relationPolarity(edge), 1);
    return polarity > 0 ? "reinforcing" : "balancing";
  }
  function discoverLoops(model, { maxLength = 8, maxLoops = 100 } = {}) {
    if (!model || typeof model !== "object") return [];
    const cacheKey = `${maxLength}:${maxLoops}:${model.nodes.map((node) => node.id).join(",")}:${model.edges.map((edge) => `${edge.id}:${edge.source}:${edge.target}:${edge.sourceSign}:${edge.targetSign}`).join(",")}`;
    let modelCache = discoveryCache.get(model);
    if (!modelCache) {
      modelCache = /* @__PURE__ */ new Map();
      discoveryCache.set(model, modelCache);
    }
    const cached = modelCache.get(cacheKey);
    if (cached) return cloneDiscoveredLoops(cached);
    const adjacency = new Map(model.nodes.map((node) => [node.id, []]));
    const discovered = /* @__PURE__ */ new Map();
    for (const edge of model.edges) adjacency.get(edge.source)?.push(edge);
    for (const edges of adjacency.values()) edges.sort((a, b) => a.id.localeCompare(b.id));
    for (const node of model.nodes) {
      visit(node.id, node.id, [], /* @__PURE__ */ new Set([node.id]));
      if (discovered.size >= maxLoops) break;
    }
    const cycles = [...discovered.values()].sort((a, b) => a.edgeIds.length - b.edgeIds.length || a.key.localeCompare(b.key)).slice(0, maxLoops);
    const counters = { reinforcing: 0, balancing: 0 };
    const result = cycles.map(({ key: _key, ...cycle }) => {
      counters[cycle.type]++;
      const prefix = cycle.type === "reinforcing" ? "R" : "B";
      return {
        id: `auto-${prefix.toLowerCase()}${counters[cycle.type]}`,
        label: `${prefix}${counters[cycle.type]}`,
        ...cycle
      };
    });
    modelCache.set(cacheKey, result);
    return cloneDiscoveredLoops(result);
    function visit(startId, nodeId, edgePath, visitedNodes) {
      if (edgePath.length >= maxLength || discovered.size >= maxLoops) return;
      for (const edge of adjacency.get(nodeId) || []) {
        if (edge.target === startId && edgePath.length > 0) {
          const cycleEdges = [...edgePath, edge];
          const key = canonicalCycleKey(cycleEdges.map((item) => item.id));
          if (!discovered.has(key)) {
            discovered.set(key, {
              key,
              type: classifyLoop(cycleEdges),
              edgeIds: cycleEdges.map((item) => item.id),
              nodeIds: cycleEdges.map((item) => item.source)
            });
          }
          continue;
        }
        if (visitedNodes.has(edge.target)) continue;
        visitedNodes.add(edge.target);
        visit(startId, edge.target, [...edgePath, edge], visitedNodes);
        visitedNodes.delete(edge.target);
      }
    }
  }
  function cloneDiscoveredLoops(loops) {
    return loops.map((loop) => ({ ...loop, edgeIds: [...loop.edgeIds], nodeIds: [...loop.nodeIds] }));
  }
  function canonicalCycleKey(edgeIds) {
    return edgeIds.map((_, index) => [...edgeIds.slice(index), ...edgeIds.slice(0, index)].join(">")).sort()[0];
  }
  function normalizeSign(sign) {
    return sign === "-" ? "\u2212" : sign;
  }

  // src/core/nodeMedia.js
  var NODE_MEDIA_DEFAULTS = Object.freeze({
    size: 112,
    labelGap: 14,
    labelPlacement: "below",
    fit: "cover",
    focalPoint: Object.freeze({ x: 0.5, y: 0.5 })
  });
  var FITS = /* @__PURE__ */ new Set(["cover", "contain"]);
  var LABEL_PLACEMENTS = /* @__PURE__ */ new Set(["below", "inside", "hidden"]);
  function normalizeNodeMedia(input) {
    if (input === void 0 || input === null || input === false) return void 0;
    if (!input || typeof input !== "object" || Array.isArray(input)) return input;
    const focalPoint = input.focalPoint || {};
    return {
      ...input,
      assetId: String(input.assetId || "").trim(),
      ...input.altText !== void 0 ? { altText: String(input.altText || "").trim() } : {},
      size: finiteRange(input.size, NODE_MEDIA_DEFAULTS.size, 32, 256),
      labelGap: finiteRange(input.labelGap, NODE_MEDIA_DEFAULTS.labelGap, 0, 64),
      labelPlacement: LABEL_PLACEMENTS.has(input.labelPlacement) ? input.labelPlacement : NODE_MEDIA_DEFAULTS.labelPlacement,
      fit: FITS.has(input.fit) ? input.fit : NODE_MEDIA_DEFAULTS.fit,
      focalPoint: {
        x: finiteRange(focalPoint.x, NODE_MEDIA_DEFAULTS.focalPoint.x, 0, 1),
        y: finiteRange(focalPoint.y, NODE_MEDIA_DEFAULTS.focalPoint.y, 0, 1)
      }
    };
  }
  function validateNodeMedia(media, nodeId = "(unknown)") {
    const errors = [];
    if (media === void 0 || media === null || media === false) return errors;
    if (!media || typeof media !== "object" || Array.isArray(media)) {
      return [`Node ${nodeId} media must be an object.`];
    }
    if (!String(media.assetId || "").trim()) errors.push(`Node ${nodeId} media requires assetId.`);
    if (media.altText !== void 0 && typeof media.altText !== "string") errors.push(`Node ${nodeId} media altText must be a string.`);
    if (media.size !== void 0 && !inRange(media.size, 32, 256)) errors.push(`Node ${nodeId} media size must be between 32 and 256.`);
    if (media.labelGap !== void 0 && !inRange(media.labelGap, 0, 64)) errors.push(`Node ${nodeId} media labelGap must be between 0 and 64.`);
    if (media.fit !== void 0 && !FITS.has(media.fit)) errors.push(`Node ${nodeId} media fit must be cover or contain.`);
    if (media.labelPlacement !== void 0 && !LABEL_PLACEMENTS.has(media.labelPlacement)) errors.push(`Node ${nodeId} media labelPlacement is invalid.`);
    const point = media.focalPoint;
    if (point !== void 0 && (!point || typeof point !== "object" || !inRange(point.x, 0, 1) || !inRange(point.y, 0, 1))) {
      errors.push(`Node ${nodeId} media focalPoint must contain x and y between 0 and 1.`);
    }
    return errors;
  }
  function nodeMediaEnvelope(node, { fontSize = 11, maxLabelWidth = 128 } = {}) {
    const media = normalizeNodeMedia(node?.media);
    if (!media?.assetId || media.labelPlacement === "inside" || media.labelPlacement === "hidden") {
      const style = node?.style || {};
      const width = positive(style.width) || positive(style.size) || 90;
      const height = positive(style.height) || positive(style.size) || 90;
      return { width, height, image: false, labelHeight: 0, labelWidth: width };
    }
    const size = media.size;
    const label = String(node?.label || "");
    const lineWidth = Math.max(40, Math.min(maxLabelWidth, size + 22));
    const estimatedCharsPerLine = Math.max(7, Math.floor(lineWidth / Math.max(5, fontSize * 0.56)));
    const lines = Math.max(1, label.split(/\s+/).reduce((count, word) => {
      const current = count.at(-1) || "";
      if (!current || `${current} ${word}`.length > estimatedCharsPerLine) count.push(word);
      else count[count.length - 1] = `${current} ${word}`;
      return count;
    }, []).length);
    const labelHeight = lines * Math.max(12, fontSize * 1.16);
    return {
      width: size,
      height: size + media.labelGap + labelHeight,
      image: true,
      imageSize: size,
      labelHeight,
      labelWidth: lineWidth,
      labelGap: media.labelGap
    };
  }
  function finiteRange(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }
  function inRange(value, min, max) {
    const number = Number(value);
    return Number.isFinite(number) && number >= min && number <= max;
  }
  function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  // src/core/model.js
  var VALID_SIGNS = /* @__PURE__ */ new Set(["+", "\u2212", "-"]);
  var CLDValidationError = class extends Error {
    constructor(errors) {
      super(`Invalid CLD model:
${errors.map((error) => `- ${error}`).join("\n")}`);
      this.name = "CLDValidationError";
      this.errors = errors;
    }
  };
  function validateModel(model) {
    const errors = [];
    if (!model || typeof model !== "object") return { valid: false, errors: ["Model must be an object."] };
    if (!model.id) errors.push("Model requires an id.");
    if (!Array.isArray(model.nodes)) errors.push("Model nodes must be an array.");
    if (!Array.isArray(model.edges)) errors.push("Model edges must be an array.");
    const nodes = Array.isArray(model.nodes) ? model.nodes : [];
    const edges = Array.isArray(model.edges) ? model.edges : [];
    const nodeIds = /* @__PURE__ */ new Set();
    for (const node of nodes) {
      if (!node.id) errors.push("Every node requires an id.");
      else if (nodeIds.has(node.id)) errors.push(`Duplicate node id: ${node.id}.`);
      else nodeIds.add(node.id);
      if (!node.label) errors.push(`Node ${node.id || "(unknown)"} requires a label.`);
      if (node.position !== void 0 && !isPosition(node.position)) {
        errors.push(`Node ${node.id || "(unknown)"} has an invalid position.`);
      }
      if (node.locked !== void 0 && typeof node.locked !== "boolean") {
        errors.push(`Node ${node.id || "(unknown)"} locked must be a boolean.`);
      }
      if (node.fields !== void 0 && (!node.fields || Array.isArray(node.fields) || typeof node.fields !== "object")) {
        errors.push(`Node ${node.id || "(unknown)"} fields must be an object.`);
      }
      errors.push(...validateNodeMedia(node.media, node.id || "(unknown)"));
    }
    const edgeIds = /* @__PURE__ */ new Set();
    const edgesById = /* @__PURE__ */ new Map();
    for (const edge of edges) {
      if (!edge.id) errors.push("Every edge requires an id.");
      else if (edgeIds.has(edge.id)) errors.push(`Duplicate edge id: ${edge.id}.`);
      else edgeIds.add(edge.id);
      if (!nodeIds.has(edge.source)) errors.push(`Edge ${edge.id} has unknown source: ${edge.source}.`);
      if (!nodeIds.has(edge.target)) errors.push(`Edge ${edge.id} has unknown target: ${edge.target}.`);
      if (!VALID_SIGNS.has(edge.sourceSign)) errors.push(`Edge ${edge.id} has invalid sourceSign.`);
      if (!VALID_SIGNS.has(edge.targetSign)) errors.push(`Edge ${edge.id} has invalid targetSign.`);
      if (edge.description !== void 0 && typeof edge.description !== "string") {
        errors.push(`Edge ${edge.id} description must be a string.`);
      }
      if (edge.route !== void 0 && !isRoute(edge.route)) {
        errors.push(`Edge ${edge.id} has an invalid route.`);
      }
      if (edge.fields !== void 0 && (!edge.fields || Array.isArray(edge.fields) || typeof edge.fields !== "object")) {
        errors.push(`Edge ${edge.id || "(unknown)"} fields must be an object.`);
      }
      if (edge.id) edgesById.set(edge.id, edge);
    }
    const loopIds = /* @__PURE__ */ new Set();
    if (model.loops !== void 0 && !Array.isArray(model.loops)) {
      errors.push("Model loops must be an array.");
    }
    const loops = Array.isArray(model.loops) ? model.loops : [];
    for (const loop of loops) {
      if (!loop.id) errors.push("Every loop requires an id.");
      else if (loopIds.has(loop.id)) errors.push(`Duplicate loop id: ${loop.id}.`);
      else loopIds.add(loop.id);
      if (!Array.isArray(loop.edgeIds) || loop.edgeIds.length < 2) {
        errors.push(`Loop ${loop.id || "(unknown)"} requires at least two edgeIds.`);
        continue;
      }
      if (new Set(loop.edgeIds).size !== loop.edgeIds.length) {
        errors.push(`Loop ${loop.id} cannot repeat edges.`);
      }
      const loopEdges = loop.edgeIds.map((id) => edgesById.get(id));
      const missingId = loop.edgeIds.find((id, index) => !loopEdges[index]);
      if (missingId) {
        errors.push(`Loop ${loop.id} has unknown edge: ${missingId}.`);
        continue;
      }
      if (!formsDirectedCycle(loopEdges)) {
        errors.push(`Loop ${loop.id} edgeIds must form an ordered directed cycle.`);
      }
      if (loop.type !== void 0 && !LOOP_TYPES.has(loop.type)) {
        errors.push(`Loop ${loop.id} has invalid type.`);
      } else if (loop.type && loop.type !== classifyLoop(loopEdges)) {
        errors.push(`Loop ${loop.id} type does not match its edge polarities.`);
      }
      if (loop.description !== void 0 && typeof loop.description !== "string") {
        errors.push(`Loop ${loop.id} description must be a string.`);
      }
    }
    return { valid: errors.length === 0, errors };
  }
  function normalizeModel(input) {
    const result = validateModel(input);
    if (!result.valid) throw new CLDValidationError(result.errors);
    const edges = input.edges.map(normalizeEdge);
    const edgesById = new Map(edges.map((edge) => [edge.id, edge]));
    return {
      ...input,
      nodes: input.nodes.map((node) => ({
        ...node,
        ...node.media ? { media: normalizeNodeMedia(node.media) } : {},
        ...node.position ? { position: { ...node.position } } : {}
      })),
      edges: edges.map((edge) => ({
        ...edge,
        ...edge.route ? { route: { ...edge.route } } : {}
      })),
      loops: (input.loops || []).map((loop) => ({
        ...loop,
        edgeIds: [...loop.edgeIds],
        type: loop.type || classifyLoop(loop.edgeIds.map((id) => edgesById.get(id)))
      }))
    };
  }
  function createEmptyModel({
    id = "untitled-diagram",
    title = "Novo diagrama",
    description = ""
  } = {}) {
    return normalizeModel({
      id: uniqueId(slugId(id || title || "diagram"), /* @__PURE__ */ new Set()),
      title,
      description,
      nodes: [],
      edges: [],
      loops: []
    });
  }
  function addNodeToModel(model, data = {}, { position } = {}) {
    const normalized = normalizeModel(model);
    const existingIds = new Set(normalized.nodes.map((node) => node.id));
    const label = String(data.label || "Nova vari\xE1vel").trim() || "Nova vari\xE1vel";
    const id = uniqueId(data.id || slugId(label, "node"), existingIds);
    return normalizeModel({
      ...normalized,
      nodes: [
        ...normalized.nodes,
        {
          ...data,
          id,
          label,
          ...data.position || position ? { position: { ...data.position || position } } : {},
          ...data.locked !== void 0 ? { locked: Boolean(data.locked) } : {}
        }
      ]
    });
  }
  function updateNodeInModel(model, id, changes = {}) {
    const normalized = normalizeModel(model);
    const node = normalized.nodes.find((item) => item.id === id);
    if (!node) throw new CLDValidationError([`Unknown node id: ${id}.`]);
    const nextId = changes.id && changes.id !== id ? uniqueId(changes.id, new Set(normalized.nodes.filter((item) => item.id !== id).map((item) => item.id))) : id;
    const next = {
      ...normalized,
      nodes: normalized.nodes.map((item) => item.id === id ? normalizeNodeChanges({ ...item, ...changes, id: nextId }) : item),
      edges: normalized.edges.map((edge) => ({
        ...edge,
        source: edge.source === id ? nextId : edge.source,
        target: edge.target === id ? nextId : edge.target
      }))
    };
    return normalizeModel(next);
  }
  function removeNodeFromModel(model, id) {
    const normalized = normalizeModel(model);
    const removedEdgeIds = new Set(normalized.edges.filter((edge) => edge.source === id || edge.target === id).map((edge) => edge.id));
    return normalizeModel(pruneReferences({
      ...normalized,
      nodes: normalized.nodes.filter((node) => node.id !== id),
      edges: normalized.edges.filter((edge) => !removedEdgeIds.has(edge.id)),
      loops: normalized.loops.filter((loop) => !loop.edgeIds.some((edgeId) => removedEdgeIds.has(edgeId)))
    }, { removedNodeIds: /* @__PURE__ */ new Set([id]), removedEdgeIds }));
  }
  function addEdgeToModel(model, data = {}) {
    const normalized = normalizeModel(model);
    const source = data.source;
    const target = data.target;
    const sourceLabel = normalized.nodes.find((node) => node.id === source)?.label || source || "source";
    const targetLabel = normalized.nodes.find((node) => node.id === target)?.label || target || "target";
    const existingIds = new Set(normalized.edges.map((edge) => edge.id));
    const id = uniqueId(data.id || `${slugId(sourceLabel, "source")}-${slugId(targetLabel, "target")}`, existingIds);
    return normalizeModel({
      ...normalized,
      edges: [
        ...normalized.edges,
        {
          sourceSign: "+",
          targetSign: "+",
          ...data,
          id
        }
      ]
    });
  }
  function updateEdgeInModel(model, id, changes = {}) {
    const normalized = normalizeModel(model);
    const edge = normalized.edges.find((item) => item.id === id);
    if (!edge) throw new CLDValidationError([`Unknown edge id: ${id}.`]);
    const nextId = changes.id && changes.id !== id ? uniqueId(changes.id, new Set(normalized.edges.filter((item) => item.id !== id).map((item) => item.id))) : id;
    const changesPolarity = changes.sourceSign !== void 0 || changes.targetSign !== void 0;
    const next = {
      ...normalized,
      edges: normalized.edges.map((item) => item.id === id ? normalizeEdgeChanges(item, changes, nextId) : item),
      loops: normalized.loops.map(
        (loop) => normalizeLoopAfterEdgeChange(loop, id, nextId, changesPolarity)
      )
    };
    return normalizeModel(pruneReferences(next));
  }
  function normalizeLoopAfterEdgeChange(loop, previousId, nextId, changesPolarity) {
    const nextLoop = {
      ...loop,
      edgeIds: loop.edgeIds.map((edgeId) => edgeId === previousId ? nextId : edgeId)
    };
    if (changesPolarity && nextLoop.edgeIds.includes(nextId)) {
      delete nextLoop.type;
    }
    return nextLoop;
  }
  function normalizeEdgeChanges(edge, changes, nextId) {
    const merged = { ...edge, ...changes, id: nextId };
    if (changes.type === void 0 && (changes.sourceSign !== void 0 || changes.targetSign !== void 0)) {
      delete merged.type;
    }
    return merged;
  }
  function removeEdgeFromModel(model, id) {
    const normalized = normalizeModel(model);
    return normalizeModel(pruneReferences({
      ...normalized,
      edges: normalized.edges.filter((edge) => edge.id !== id),
      loops: normalized.loops.filter((loop) => !loop.edgeIds.includes(id))
    }, { removedEdgeIds: /* @__PURE__ */ new Set([id]) }));
  }
  function slugId(value, fallback = "item") {
    const slug = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return slug || fallback;
  }
  function uniqueId(base, existingIds) {
    const clean = slugId(base, "item");
    let id = clean;
    let suffix = 2;
    while (existingIds.has(id)) id = `${clean}-${suffix++}`;
    return id;
  }
  function normalizeEdge(edge) {
    const sourceSign = normalizeSign2(edge.sourceSign);
    const targetSign = normalizeSign2(edge.targetSign);
    const feedbackType = sourceSign === targetSign ? "reinforcing" : "balancing";
    return {
      ...edge,
      sourceSign,
      targetSign,
      type: feedbackType
    };
  }
  function normalizeSign2(sign) {
    return sign === "-" ? "\u2212" : sign;
  }
  function normalizeNodeChanges(node) {
    return {
      ...node,
      label: String(node.label || "").trim(),
      ...node.position ? { position: { ...node.position } } : {},
      ...node.media ? { media: normalizeNodeMedia(node.media) } : {},
      ...node.locked !== void 0 ? { locked: Boolean(node.locked) } : {}
    };
  }
  function isPosition(position) {
    return position && Number.isFinite(position.x) && Number.isFinite(position.y);
  }
  function isRoute(route) {
    return route && Number.isFinite(route.controlPointDistance) && (route.locked === void 0 || typeof route.locked === "boolean");
  }
  function formsDirectedCycle(edges) {
    return edges.every(
      (edge, index) => edge.target === edges[(index + 1) % edges.length].source
    );
  }
  function pruneReferences(model, {
    removedNodeIds = /* @__PURE__ */ new Set(),
    removedEdgeIds = /* @__PURE__ */ new Set()
  } = {}) {
    const edgeIds = new Set(model.edges.map((edge) => edge.id));
    const loopIdsToRemove = /* @__PURE__ */ new Set();
    const loops = (model.loops || []).filter((loop) => {
      if (loop.edgeIds.some((edgeId) => removedEdgeIds.has(edgeId) || !edgeIds.has(edgeId))) {
        loopIdsToRemove.add(loop.id);
        return false;
      }
      const loopEdges = loop.edgeIds.map((edgeId) => model.edges.find((edge) => edge.id === edgeId));
      const valid = new Set(loop.edgeIds).size === loop.edgeIds.length && formsDirectedCycle(loopEdges);
      if (!valid) loopIdsToRemove.add(loop.id);
      return valid;
    });
    return { ...model, loops };
  }

  // src/core/density.js
  function analyzeDensity(model) {
    const nodeCount = model.nodes.length;
    const edgeCount = model.edges.length;
    const ratio = edgeCount / Math.max(1, nodeCount);
    if (nodeCount <= 8 && ratio < 1.7) return { name: "sparse", nodeCount, edgeCount, ratio };
    if (nodeCount <= 14 && ratio < 2.25) return { name: "medium", nodeCount, edgeCount, ratio };
    return { name: "dense", nodeCount, edgeCount, ratio };
  }
  var densityProfiles = {
    sparse: {
      scaleClass: "small",
      idealEdgeLength: 180,
      nodeRepulsion: 6e4,
      routingPasses: 4,
      layoutAttempts: 2,
      preferredNodeGap: 34,
      maxVisualLoops: 8,
      minimumSignSize: 8,
      hideCollisions: false
    },
    medium: {
      scaleClass: "medium",
      idealEdgeLength: 240,
      nodeRepulsion: 9e4,
      routingPasses: 5,
      layoutAttempts: 3,
      preferredNodeGap: 30,
      maxVisualLoops: 12,
      minimumSignSize: 6.5,
      hideCollisions: true
    },
    dense: {
      scaleClass: "large",
      idealEdgeLength: 300,
      nodeRepulsion: 135e3,
      routingPasses: 7,
      layoutAttempts: 4,
      preferredNodeGap: 26,
      maxVisualLoops: 12,
      minimumSignSize: 6,
      hideCollisions: true
    }
  };
  function resolveDensityProfile(model, overrides = {}) {
    const density = analyzeDensity(model);
    return { density, ...densityProfiles[density.name], ...overrides };
  }

  // src/design-system/tokens.js
  var designTokens = Object.freeze({
    foundation: {
      color: {
        forest950: "#183326",
        forest900: "#203D2D",
        forest800: "#2F5037",
        productPrimary: "#2B3A2E",
        forestMuted: "#7A8A72",
        moss600: "#6F9A5B",
        moss500: "#83A96C",
        accent: "#3F6F78",
        accentStrong: "#315A62",
        sage200: "#DFE8D3",
        sage100: "#EDF1E5",
        neutral: "#ECE8DB",
        paper: "#FFFDF5",
        paperWarm: "#F8F5EB",
        paperEditorial: "#F7F3E7",
        canvas: "#FBFAF4",
        ink: "#20382A",
        muted: "#637065",
        line: "#DED9CA",
        lineStrong: "#C9C4B5",
        canvasLine: "#D8D4C7",
        editorialLineStrong: "#C8C5B8",
        editorialTones: {
          tone122a20: "#122a20",
          tone193527: "#193527",
          tone1d3828: "#1d3828",
          tone24452f: "#24452f",
          tone25352a: "#25352a",
          tone28422f: "#28422f",
          tone29342b: "#29342b",
          tone2f4435: "#2f4435",
          tone2f4736: "#2f4736",
          tone2f5137: "#2f5137",
          tone314a38: "#314a38",
          tone31583b: "#31583b",
          tone334b38: "#334b38",
          tone335d3e: "#335d3e",
          tone35513b: "#35513b",
          tone38503e: "#38503e",
          tone395640: "#395640",
          tone3d5d42: "#3d5d42",
          tone416f49: "#416f49",
          tone45604a: "#45604a",
          tone45614b: "#45614b",
          tone46613f: "#46613f",
          tone4b624f: "#4b624f",
          tone4f7c49: "#4f7c49",
          tone507d4e: "#507d4e",
          tone526257: "#526257",
          tone536256: "#536256",
          tone596452: "#596452",
          tone5d8b51: "#5d8b51",
          tone5d9250: "#5d9250",
          tone5f785f: "#5f785f",
          tone5f9755: "#5f9755",
          tone628b54: "#628b54",
          tone638b51: "#638b51",
          tone657266: "#657266",
          tone679258: "#679258",
          tone69776c: "#69776c",
          tone6c7d6e: "#6c7d6e",
          tone6c9a5b: "#6c9a5b",
          tone6d8f5d: "#6d8f5d",
          tone6e7e70: "#6e7e70",
          tone6f7568: "#6f7568",
          tone6f9d5e: "#6f9d5e",
          tone709c62: "#709c62",
          tone718070: "#718070",
          tone718071: "#718071",
          tone718072: "#718072",
          tone738274: "#738274",
          tone748274: "#748274",
          tone778575: "#778575",
          tone7a8a72: "#7a8a72",
          tone7a8979: "#7a8979",
          tone7b382f: "#7b382f",
          tone7b8779: "#7b8779",
          tone819080: "#819080",
          tone81a573: "#81a573",
          tone83a277: "#83a277",
          tone83a773: "#83a773",
          tone8a5149: "#8a5149",
          tone8d3d35: "#8d3d35",
          tone9b5b4d: "#9b5b4d",
          tone9ca69a: "#9ca69a",
          tone9cb896: "#9cb896",
          tonea04e44: "#a04e44",
          tonea06b49: "#a06b49",
          tonea8bea0: "#a8bea0",
          toneaab9a3: "#aab9a3",
          toneaac19f: "#aac19f",
          toneb5c7ac: "#b5c7ac",
          toneb9b7aa: "#b9b7aa",
          tonec6d0b9: "#c6d0b9",
          tonec7867e: "#c7867e",
          toned6dfca: "#d6dfca",
          tonee8ecdf: "#e8ecdf",
          tonee0eed9: "#e0eed9",
          tonee1edd8: "#e1edd8",
          tonee1eedb: "#e1eedb",
          tonee2edd9: "#e2edd9",
          tonee2efdc: "#e2efdc",
          tonee3eedc: "#e3eedc",
          tonee5efde: "#e5efde",
          tonee6f0df: "#e6f0df",
          tonee9f1e3: "#e9f1e3",
          toneedf3e6: "#edf3e6",
          toneedf4e7: "#edf4e7",
          toneeef3e7: "#eef3e7",
          toneeff5e9: "#eff5e9",
          tonef0f4e8: "#f0f4e8",
          tonef0f4e9: "#f0f4e9",
          tonef0f5e9: "#f0f5e9",
          tonef1efe4: "#f1efe4",
          tonef1f6ea: "#f1f6ea",
          tonef3f0e5: "#f3f0e5",
          tonef3f1e7: "#f3f1e7",
          tonef5f2e8: "#f5f2e8",
          tonef6f2e7: "#f6f2e7",
          tonef6f4eb: "#f6f4eb",
          tonef7f4e9: "#f7f4e9",
          tonef8f5e9: "#f8f5e9",
          tonef8f6eb: "#f8f6eb",
          tonef8f7ef: "#f8f7ef",
          tonef8f8ef: "#f8f8ef",
          tonefaf7ed: "#faf7ed",
          tonefaf8f0: "#faf8f0",
          tonefaf9f2: "#faf9f2",
          tonefbefeb: "#fbefeb",
          tonefbf8ef: "#fbf8ef",
          tonefbf9f1: "#fbf9f1",
          tonefbfaf2: "#fbfaf2",
          tonefffdf6: "#fffdf6",
          tonefffef9: "#fffef9",
          tonefffefb: "#fffefb"
        },
        blue: "#26789B",
        danger: "#99594B",
        dangerAccessible: "#8C4F43",
        white: "#FFFFFF",
        black: "#162019",
        presentBackground: "#15241B",
        presentSurface: "#20382A"
      },
      spacing: {
        1: "4px",
        2: "6px",
        3: "8px",
        4: "10px",
        5: "12px",
        6: "14px",
        7: "16px",
        8: "20px",
        9: "24px",
        10: "30px",
        11: "36px",
        12: "48px"
      },
      radius: {
        sm: "9px",
        md: "14px",
        lg: "20px",
        pill: "999px"
      },
      shadow: {
        sm: "0 7px 20px rgba(29, 53, 38, .07)",
        md: "0 12px 28px rgba(29, 53, 38, .10)",
        lg: "0 24px 64px rgba(29, 53, 38, .14)"
      },
      typography: {
        displayFamily: '"Noto Serif", Georgia, serif',
        bodyFamily: '"Noto Sans", system-ui, sans-serif',
        codeFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        bodySize: "13px",
        bodyLineHeight: "1.5",
        labelSize: "11px",
        metaSize: "9px"
      },
      motion: {
        fast: "120ms",
        normal: "220ms",
        slow: "380ms",
        easeStandard: "cubic-bezier(.22, .8, .28, 1)"
      },
      zIndex: {
        base: 0,
        canvas: 1,
        panel: 10,
        sticky: 20,
        navigation: 25,
        overlay: 50,
        dialog: 70,
        tooltip: 80
      },
      breakpoint: {
        compact: "1180px",
        tablet: "820px",
        mobile: "720px"
      }
    },
    semantic: {
      color: {
        bg: {
          app: "$foundation.color.paperWarm",
          surface: "$foundation.color.paper",
          subtle: "$foundation.color.sage100",
          canvas: "$foundation.color.canvas",
          present: "$foundation.color.presentBackground"
        },
        text: {
          primary: "$foundation.color.ink",
          strong: "$foundation.color.forest950",
          muted: "$foundation.color.muted",
          inverse: "$foundation.color.paper",
          link: "$foundation.color.blue",
          danger: "$foundation.color.dangerAccessible",
          success: "$foundation.color.forest800"
        },
        border: {
          default: "$foundation.color.line",
          strong: "$foundation.color.lineStrong",
          focus: "$foundation.color.moss600"
        },
        action: {
          primary: "$foundation.color.forest900",
          primaryHover: "$foundation.color.forest800",
          accent: "$foundation.color.moss600",
          danger: "$foundation.color.danger"
        },
        focus: {
          ring: "rgba(111, 154, 91, .52)"
        }
      },
      density: {
        comfortable: {
          controlHeight: "44px",
          panelPadding: "$foundation.spacing.9",
          controlGap: "$foundation.spacing.5"
        },
        compact: {
          controlHeight: "36px",
          panelPadding: "$foundation.spacing.7",
          controlGap: "$foundation.spacing.3"
        },
        immersive: {
          controlHeight: "40px",
          panelPadding: "$foundation.spacing.8",
          controlGap: "$foundation.spacing.4"
        }
      }
    },
    component: {
      button: {
        heightSm: "32px",
        heightMd: "36px",
        heightTouch: "44px",
        radius: "$foundation.radius.sm",
        paddingInline: "$foundation.spacing.6"
      },
      field: {
        height: "36px",
        heightTouch: "44px",
        radius: "$foundation.radius.sm"
      },
      panel: {
        radius: "$foundation.radius.md",
        paddingCompact: "$foundation.spacing.7",
        paddingComfortable: "$foundation.spacing.9"
      },
      toolbar: {
        gap: "$foundation.spacing.3",
        radius: "$foundation.radius.md"
      },
      tooltip: {
        maxWidth: "260px"
      },
      dialog: {
        maxWidth: "560px"
      },
      story: {
        ink: "#20382a",
        muted: "#6a756b",
        line: "#ded9ca",
        lineStrong: "#c8c3b4",
        paper: "#fffdf5",
        wash: "#f5f3e9",
        sage: "#e9efdf",
        moss: "#6f9a5b",
        forest: "#274936",
        danger: "#a25248",
        shadow: "0 12px 28px rgba(31, 56, 41, .08)"
      }
    }
  });
  function getToken(path) {
    return path.split(".").reduce((value, key) => value?.[key], designTokens);
  }
  function resolveToken(value, seen = /* @__PURE__ */ new Set()) {
    if (typeof value !== "string" || !value.startsWith("$")) return value;
    const path = value.slice(1);
    if (seen.has(path)) throw new Error(`Circular design token reference: ${path}`);
    const next = getToken(path);
    if (next === void 0) throw new Error(`Unknown design token reference: ${path}`);
    return resolveToken(next, /* @__PURE__ */ new Set([...seen, path]));
  }
  function resolveFoundationColor(name) {
    return resolveToken(designTokens.foundation.color[name]);
  }
  var designSystemDefaults = Object.freeze({
    editorCanvas: resolveToken("$foundation.color.paper"),
    editorNodeFill: resolveToken("$foundation.color.editorialTones.tonee8ecdf"),
    editorNodeText: resolveToken("$foundation.color.productPrimary"),
    editorRelation: resolveToken("$foundation.color.editorialTones.tone7a8a72")
  });

  // src/themes/matcha.js
  var colors = designTokens.foundation.color;
  var matchaTheme = {
    colors: {
      primary: resolveFoundationColor("productPrimary"),
      secondary: resolveFoundationColor("muted"),
      tertiary: resolveFoundationColor("moss600"),
      neutral: resolveFoundationColor("neutral"),
      surface: resolveFoundationColor("paperEditorial"),
      line: resolveFoundationColor("canvasLine")
    },
    nodePalette: [
      ["#526653", "#F2F0E6"],
      ["#667762", "#E8ECDF"],
      ["#76836F", "#F5F1E5"],
      ["#596B57", "#E4EADB"],
      [colors.muted, "#F1EEE3"],
      ["#485C4C", "#E9E7DC"],
      ["#6A7865", "#EEF0E7"],
      ["#5D705A", "#F4F0E4"],
      ["#71806A", "#E5E9DF"]
    ],
    nodeSize: 90,
    fontFamily: "Noto Sans, system-ui, sans-serif",
    annotationFontFamily: "Noto Sans, system-ui, sans-serif"
  };

  // src/rendering/cytoscape.js
  function createCytoscape({ container, model, theme, assetResolver, rendererOptions = {} }) {
    const elements = [
      ...model.nodes.map((node, index) => {
        const [border, fill] = theme.nodePalette[index % theme.nodePalette.length];
        return {
          data: {
            ...node,
            color: border,
            fill,
            mediaImage: resolveMediaImage(node, assetResolver),
            visualEnvelope: nodeMediaEnvelope(node)
          },
          ...node.position ? { position: { ...node.position } } : {},
          ...node.locked !== void 0 ? { locked: node.locked } : {}
        };
      }),
      ...model.edges.map((edge) => ({
        data: {
          ...edge,
          ...edge.route ? { route: { ...edge.route } } : {}
        },
        classes: edge.type === "balancing" ? "balancing-edge" : "reinforcing-edge"
      }))
    ];
    const cy = cytoscape({
      container,
      elements,
      layout: { name: "preset" },
      minZoom: 0.18,
      maxZoom: 2.4,
      selectionType: "additive",
      boxSelectionEnabled: true,
      ...rendererOptions,
      style: cytoscapeStyles(theme)
    });
    cy.data("loopDefinitions", (model.loops || []).map((loop) => ({
      ...loop,
      edgeIds: [...loop.edgeIds || []]
    })));
    cy.edges().forEach((edge) => {
      const route = edge.data("route");
      if (!route || !Number.isFinite(route.controlPointDistance)) return;
      edge.style({
        "control-point-distances": route.controlPointDistance,
        "control-point-weights": 0.5
      });
      edge.data("curveDistance", Math.round(route.controlPointDistance));
      edge.data("routeLocked", Boolean(route.locked));
    });
    cy.nodes().forEach((node) => applyNodePresentation(node, { assetResolver }));
    return cy;
  }
  function applyNodeOverrides(node, style = {}) {
    if (!node?.length || !style || typeof style !== "object") return;
    const overrides = {};
    if (style.shape) overrides.shape = style.shape;
    if (style.size) overrides.width = overrides.height = style.size;
    if (style.width) overrides.width = style.width;
    if (style.height) overrides.height = style.height;
    if (style.fill) overrides["background-color"] = style.fill;
    if (style.borderColor) overrides["border-color"] = style.borderColor;
    if (style.fontSize) overrides["font-size"] = style.fontSize;
    if (style.fontFamily) overrides["font-family"] = style.fontFamily;
    if (style.textColor) overrides.color = style.textColor;
    if (style.textMaxWidth) overrides["text-max-width"] = style.textMaxWidth;
    node.style(overrides);
  }
  function applyNodePresentation(node, { assetResolver, mediaEnabled = true } = {}) {
    if (!node?.length) return;
    const data = node.data() || {};
    const label = String(data.label ?? "");
    const media = normalizeNodeMedia(data.media);
    const nextImage = resolveMediaImage(data, assetResolver);
    node.data("mediaImage", nextImage || null);
    node.data("visualEnvelope", nodeMediaEnvelope(data));
    applyNodeOverrides(node, data.style || {});
    if (!mediaEnabled || !media?.assetId || !nextImage) {
      node.style({
        "background-image": "none",
        "background-opacity": 1,
        "text-valign": "center",
        "text-margin-y": 0,
        "text-max-width": data.style?.textMaxWidth || 74,
        // `node.style()` receives concrete values. The `data(label)` mapping
        // belongs in the Cytoscape stylesheet below, not in a direct override.
        label
      });
      return;
    }
    const size = media.size;
    const labelBelow = media.labelPlacement === "below";
    const labelHidden = media.labelPlacement === "hidden";
    node.style({
      width: size,
      height: size,
      shape: data.style?.shape || "ellipse",
      "background-image": nextImage,
      "background-fit": media.fit,
      "background-clip": "node",
      "background-opacity": 1,
      "background-position-x": `${Math.round(media.focalPoint.x * 100)}%`,
      "background-position-y": `${Math.round(media.focalPoint.y * 100)}%`,
      "text-valign": labelBelow ? "bottom" : "center",
      "text-margin-y": labelBelow ? media.labelGap : 0,
      label: labelHidden ? "" : label,
      "text-max-width": Math.min(148, size + 24),
      "border-width": data.style?.borderWidth || 1.5,
      "underlay-shape": data.style?.shape || "ellipse",
      "underlay-padding": 7
    });
  }
  function applyMediaEdgeClearance(cy, { mediaEnabled = true } = {}) {
    if (!cy) return;
    cy.edges().forEach((edge) => {
      const sourceMedia = mediaEnabled && normalizeNodeMedia(edge.source().data("media"));
      const targetMedia = mediaEnabled && normalizeNodeMedia(edge.target().data("media"));
      edge.style({
        // Keep the endpoint close by default. The routing optimizer already
        // sees the full image+label envelope and only needs this small local
        // breathing room at the node boundary.
        "source-distance-from-node": sourceMedia?.assetId ? 16 : 5,
        "target-distance-from-node": targetMedia?.assetId ? 22 : 9
      });
    });
  }
  function resolveMediaImage(node, assetResolver) {
    const assetId = node?.media?.assetId;
    if (!assetId || typeof assetResolver !== "function") return null;
    try {
      const result = assetResolver(assetId, node);
      return typeof result === "string" && result ? result : null;
    } catch {
      return null;
    }
  }
  function cytoscapeStyles(theme) {
    const colors2 = theme.colors;
    return [
      {
        selector: "node",
        style: {
          width: theme.nodeSize,
          height: theme.nodeSize,
          shape: "ellipse",
          "background-color": "data(fill)",
          "border-width": 1.5,
          "border-color": "data(color)",
          label: "data(label)",
          color: colors2.primary,
          "font-size": 11,
          "font-family": theme.fontFamily,
          "font-weight": "bold",
          "text-wrap": "wrap",
          "text-max-width": 74,
          "text-valign": "center",
          "text-halign": "center",
          "overlay-opacity": 0,
          "underlay-color": "data(color)",
          "underlay-padding": 7,
          "underlay-opacity": 0.06,
          "underlay-shape": "ellipse",
          "transition-property": "border-width, underlay-opacity, underlay-padding, opacity",
          "transition-duration": "180ms"
        }
      },
      {
        selector: "node.hovered, node:selected",
        style: {
          "border-width": 3,
          "border-color": colors2.tertiary,
          "underlay-color": colors2.tertiary,
          "underlay-opacity": 0.18,
          "underlay-padding": 13
        }
      },
      {
        selector: "node.connection-source",
        style: {
          "border-width": 4,
          "border-color": colors2.tertiary,
          "underlay-color": colors2.tertiary,
          "underlay-opacity": 0.3,
          "underlay-padding": 18
        }
      },
      {
        selector: "node.editor-workbench-node, node.explore-workbench-node",
        style: {
          "font-size": 12,
          "text-max-width": 96,
          "underlay-padding": 8
        }
      },
      {
        selector: "node:locked",
        style: {
          "border-style": "double",
          "border-width": 4,
          "underlay-opacity": 0.12
        }
      },
      {
        selector: "edge",
        style: {
          width: 1.8,
          "curve-style": "unbundled-bezier",
          "control-point-distances": 80,
          "control-point-weights": 0.5,
          "line-color": colors2.secondary,
          "target-arrow-color": colors2.secondary,
          "target-arrow-shape": "triangle",
          "arrow-scale": 1.35,
          // Treat an external node label as part of the node's visual boundary.
          // Cytoscape then intersects the edge with the nearest of the node
          // shape and its label instead of letting the line/arrow pass through
          // a label rendered below an image node.
          "source-endpoint": "outside-to-node-or-label",
          "target-endpoint": "outside-to-node-or-label",
          "source-distance-from-node": 5,
          "target-distance-from-node": 9,
          "overlay-opacity": 0,
          // Keep a generous invisible hit target without changing the visual
          // stroke. Thin causal paths remain selectable at notebook scale.
          "overlay-padding": 12,
          opacity: 0.76,
          "transition-property": "opacity, width",
          "transition-duration": "160ms"
        }
      },
      {
        selector: "edge.reinforcing-edge",
        style: { "line-color": colors2.primary, "target-arrow-color": colors2.primary }
      },
      {
        selector: "edge.balancing-edge",
        style: {
          "line-color": colors2.secondary,
          "target-arrow-color": colors2.secondary,
          "line-style": "dashed",
          "line-dash-pattern": [8, 5]
        }
      },
      { selector: "edge:selected", style: { width: 4, opacity: 1 } },
      {
        selector: "edge.annotation-focus",
        style: {
          width: 3,
          opacity: 1,
          "line-color": colors2.tertiary,
          "target-arrow-color": colors2.tertiary
        }
      },
      {
        selector: "edge.story-context",
        style: { width: 2.4, opacity: 1 }
      },
      {
        selector: "node.story-context",
        style: {
          "border-width": 2,
          opacity: 1
        }
      },
      {
        selector: "edge.story-current",
        style: {
          width: 3.8,
          opacity: 1,
          "line-color": colors2.primary,
          "target-arrow-color": colors2.primary,
          "arrow-scale": 1.55,
          "line-style": "dashed",
          "line-dash-pattern": [18, 7]
        }
      },
      {
        selector: "node.story-current-node",
        style: {
          "border-width": 4,
          "border-color": colors2.tertiary,
          "underlay-color": colors2.tertiary,
          "underlay-opacity": 0.24,
          "underlay-padding": 18
        }
      },
      {
        selector: "node.story-source-node",
        style: {
          "border-width": 3,
          "border-color": colors2.secondary,
          "underlay-color": colors2.secondary,
          "underlay-opacity": 0.14,
          "underlay-padding": 13
        }
      },
      {
        selector: "node.story-target-node",
        style: {
          "border-width": 5,
          "border-color": colors2.primary,
          "underlay-color": colors2.primary,
          "underlay-opacity": 0.28,
          "underlay-padding": 20
        }
      },
      {
        selector: "node.story-background",
        style: { opacity: 0.68 }
      },
      {
        selector: "edge.story-background",
        style: { opacity: 0.22 }
      },
      {
        selector: "node.atlas-context",
        style: {
          width: 28,
          height: 28,
          label: "",
          opacity: 0.22,
          "background-image-opacity": 0.72,
          "border-width": 2,
          "underlay-opacity": 0,
          "transition-property": "opacity, width, height, border-width, border-color, underlay-opacity, underlay-padding",
          "transition-duration": "420ms"
        }
      },
      {
        selector: "edge.atlas-context",
        style: {
          opacity: 0.14,
          width: 0.8,
          "arrow-scale": 0.68,
          "transition-property": "opacity, width, line-color, target-arrow-color",
          "transition-duration": "420ms"
        }
      },
      {
        selector: "node.atlas-context.atlas-poster-loop",
        style: {
          width: 46,
          height: 46,
          label: "data(label)",
          opacity: 0.7,
          "text-opacity": 0.8,
          "font-size": 9,
          "background-image-opacity": 0.9,
          "border-color": "#91a98d",
          "border-width": 2.5,
          "underlay-color": "#c8d8c1",
          "underlay-opacity": 0.16,
          "underlay-padding": 11,
          "z-index": 8
        }
      },
      {
        selector: "edge.atlas-context.atlas-poster-loop",
        style: {
          opacity: 0.64,
          width: 1.8,
          "arrow-scale": 0.96,
          "line-color": "#728a70",
          "target-arrow-color": "#728a70",
          "underlay-color": "#d6e2cf",
          "underlay-opacity": 0.28,
          "underlay-padding": 4,
          "z-index": 7
        }
      },
      {
        selector: "node.atlas-near-context",
        style: {
          width: 48,
          height: 48,
          label: "data(label)",
          opacity: 0.62,
          "text-opacity": 0.72,
          "font-size": 8.4,
          "text-max-width": 82,
          "border-color": "#9baa98"
        }
      },
      {
        selector: "edge.atlas-near-context",
        style: { opacity: 0.34, width: 1 }
      },
      {
        selector: "node.atlas-focus-node",
        style: {
          width: 116,
          height: 116,
          label: "data(label)",
          opacity: 1,
          "text-opacity": 1,
          "font-family": "Noto Serif, Georgia, serif",
          "font-size": 14.5,
          "font-weight": 600,
          "text-max-width": 126,
          "text-valign": "bottom",
          "text-margin-y": 12,
          color: "#203a2c",
          "text-background-color": "#fffef8",
          "text-background-opacity": 0.94,
          "text-background-padding": 3,
          "background-image-opacity": 1,
          "border-color": "#6f9f5f",
          "border-width": 3,
          "underlay-color": "#cfe1c5",
          "underlay-opacity": 0.28,
          "underlay-padding": 20,
          "z-index": 12
        }
      },
      {
        selector: "node.atlas-context.atlas-embed-compositor-motion",
        style: {
          // Blob-backed editorial renditions are cheap enough to retain the
          // official Atlas choreography: the focused nodes grow while the
          // surrounding system recedes continuously instead of snapping.
          "transition-property": "opacity, width, height, border-width, border-color, underlay-opacity, underlay-padding"
        }
      },
      {
        selector: "node.atlas-near-context.atlas-embed-compositor-motion",
        style: {
          "transition-property": "opacity, width, height, border-width, border-color"
        }
      },
      {
        selector: "node.atlas-focus-node.atlas-embed-compositor-motion",
        style: {
          // Flow pulses underlay padding on every RAF. Including it in this
          // transition creates a perpetually restarting animation queue.
          "transition-property": "opacity, width, height, border-width, border-color",
          "transition-duration": "420ms"
        }
      },
      {
        selector: "node.atlas-focus-source",
        style: { "border-color": "#bd9960", "underlay-color": "#ead9b8" }
      },
      {
        selector: "node.atlas-focus-target",
        style: { "border-color": "#609852", "underlay-color": "#c8dfbb" }
      },
      {
        selector: "edge.atlas-focus-edge",
        style: {
          opacity: 1,
          width: 4.1,
          "line-style": "dashed",
          "line-dash-pattern": [3, 8],
          "line-color": "#4f8745",
          "target-arrow-color": "#4f8745",
          "target-arrow-shape": "triangle-backcurve",
          "arrow-scale": 1.38,
          "underlay-color": "#fffef8",
          "underlay-opacity": 0.96,
          "underlay-padding": 4.5,
          "z-index": 10
        }
      },
      {
        selector: "edge.atlas-focus-edge.atlas-negative",
        style: { "line-color": "#8f7450", "target-arrow-color": "#8f7450" }
      },
      { selector: ".faded", style: { opacity: 0.3 } },
      { selector: ".focused", style: { opacity: 1 } },
      {
        selector: "edge.focused",
        style: {
          width: 3,
          "line-color": colors2.tertiary,
          "target-arrow-color": colors2.tertiary
        }
      },
      {
        selector: "node.focused",
        style: {
          "border-width": 3,
          "border-color": colors2.tertiary,
          "underlay-color": colors2.tertiary,
          "underlay-opacity": 0.12,
          "underlay-padding": 9
        }
      },
      { selector: ".story-ghost", style: { opacity: 0.34 } },
      { selector: ".story-hidden", style: { display: "none" } }
    ];
  }

  // src/rendering/view.js
  var NODE_PROPERTIES = {
    shape: "shape",
    size: ["width", "height"],
    width: "width",
    height: "height",
    fill: "background-color",
    color: "background-color",
    "border-color": "border-color",
    "border-width": "border-width",
    "font-size": "font-size",
    "font-family": "font-family",
    "font-weight": "font-weight",
    "text-color": "color",
    "text-max-width": "text-max-width",
    opacity: "opacity"
  };
  var EDGE_PROPERTIES = {
    color: ["line-color", "target-arrow-color"],
    "stroke-color": ["line-color", "target-arrow-color"],
    width: "width",
    "stroke-width": "width",
    "stroke-style": "line-style",
    "line-cap": "line-cap",
    "line-dash-pattern": "line-dash-pattern",
    "line-dash-offset": "line-dash-offset",
    "line-outline-width": "line-outline-width",
    "line-outline-color": "line-outline-color",
    "arrow-shape": "target-arrow-shape",
    "arrow-fill": "target-arrow-fill",
    "arrow-width": "target-arrow-width",
    "arrow-scale": "arrow-scale",
    opacity: "opacity"
  };
  function applyViewToCytoscape(cy, view, canvas, { assetResolver } = {}) {
    if (!cy) return;
    cy.elements().removeStyle();
    if (canvas) canvas.style.background = view?.settings?.background || "";
    const mediaEnabled = view?.settings?.["node-media"] !== false;
    cy.nodes().forEach((node) => applyNodePresentation(node, { assetResolver, mediaEnabled }));
    const rules = [...view?.rules || []].filter((rule) => ["canvas", "variable", "relation"].includes(rule.selector?.type)).sort((a, b) => selectorSpecificity(a.selector) - selectorSpecificity(b.selector));
    for (const rule of rules) {
      if (rule.selector?.type === "canvas") {
        if (canvas && rule.properties?.background) canvas.style.background = rule.properties.background;
        continue;
      }
      const collection = collectionForRule(cy, rule.selector);
      const mapping = rule.selector?.type === "variable" ? NODE_PROPERTIES : EDGE_PROPERTIES;
      collection.style(mapProperties(rule.properties || {}, mapping));
    }
    cy.edges().forEach((edge) => {
      const hasTypeRule = rules.some((rule) => rule.selector?.type === "relation" && rule.selector?.attribute === "type" && String(rule.selector.value) === String(edge.data("type")));
      if (!hasTypeRule && edge.data("type") === "balancing") {
        edge.style({ "line-style": "dashed", "line-dash-pattern": [8, 5] });
      }
      if (edge.data("style") && typeof edge.data("style") === "object") {
        edge.style(mapProperties(normalizeElementStyle(edge.data("style")), EDGE_PROPERTIES));
      }
    });
    cy.nodes().forEach((node) => {
      if (node.data("style") && typeof node.data("style") === "object") {
        applyNodeOverrides(node, node.data("style"));
      }
    });
    applyMediaEdgeClearance(cy, { mediaEnabled });
  }
  function selectorSpecificity(selector = {}) {
    return selector?.attribute ? 10 : 0;
  }
  function collectionForRule(cy, selector = {}) {
    let collection;
    if (selector.type === "variable") collection = cy.nodes();
    else if (selector.type === "relation") collection = cy.edges();
    else return cy.collection();
    if (!selector.attribute) return collection;
    return collection.filter((element) => {
      const value = element.data(selector.attribute);
      if (selector.attribute === "tag") {
        return Array.isArray(value) ? value.includes(selector.value) : String(value || "").split(/\s*,\s*/).includes(selector.value);
      }
      if (selector.attribute === "field") {
        const fields = element.data("fields") || {};
        const match = String(selector.value).match(/^([^:=]+)[:=](.+)$/);
        if (match) return String(fields[match[1]]) === match[2];
        return Object.prototype.hasOwnProperty.call(fields, selector.value) || Object.values(fields).some((fieldValue) => String(fieldValue) === String(selector.value));
      }
      return String(value) === String(selector.value);
    });
  }
  function mapProperties(properties, mapping) {
    const result = {};
    for (const [property, value] of Object.entries(properties)) {
      if (property === "visible") {
        result.display = value === false || value === "false" ? "none" : "element";
        continue;
      }
      if (property === "label-visible") {
        if (value === false || value === "false") result.label = "";
        continue;
      }
      if (property === "highlight" && (value === true || value === "true")) {
        if (mapping === NODE_PROPERTIES) result["border-width"] = 4;
        else result.width = 4;
        result.opacity = 1;
        continue;
      }
      const targets = mapping[property];
      if (!targets) continue;
      const normalized = property === "line-dash-pattern" ? parseDashPattern(value) : value;
      for (const target of Array.isArray(targets) ? targets : [targets]) result[target] = normalized;
    }
    return result;
  }
  function parseDashPattern(value) {
    if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
    return String(value || "").split(/[\s,]+/).map(Number).filter(Number.isFinite);
  }
  function normalizeElementStyle(style = {}) {
    const aliases = {
      strokeColor: "stroke-color",
      strokeWidth: "stroke-width",
      strokeStyle: "stroke-style",
      lineCap: "line-cap",
      lineDashPattern: "line-dash-pattern",
      lineDashOffset: "line-dash-offset",
      lineOutlineWidth: "line-outline-width",
      lineOutlineColor: "line-outline-color",
      arrowShape: "arrow-shape",
      arrowFill: "arrow-fill",
      arrowWidth: "arrow-width",
      arrowScale: "arrow-scale"
    };
    return Object.fromEntries(Object.entries(style).map(([key, value]) => [aliases[key] || key, value]));
  }

  // src/geometry/index.js
  var geometry_exports = {};
  __export(geometry_exports, {
    ROUTING_ALGORITHM_VERSION: () => ROUTING_ALGORITHM_VERSION,
    alignedNormal: () => alignedNormal,
    applyDeterministicSeed: () => applyDeterministicSeed,
    applyLoopAwareSeed: () => applyLoopAwareSeed,
    arcLengthTable: () => arcLengthTable,
    bezierPoint: () => bezierPoint,
    buildCompactPositionVariant: () => buildCompactPositionVariant,
    buildDeterministicSeed: () => buildDeterministicSeed,
    buildLoopAwareSeed: () => buildLoopAwareSeed,
    buildSkeletonBlendVariant: () => buildSkeletonBlendVariant,
    chordNormal: () => chordNormal,
    curvePolyline: () => curvePolyline,
    curvesInteraction: () => curvesInteraction,
    deriveLoopTopology: () => deriveLoopTopology,
    diagnoseRoutes: () => diagnoseRoutes,
    pointAtArcDistance: () => pointAtArcDistance,
    pointSegmentDistance: () => pointSegmentDistance,
    rectangleIntersects: () => rectangleIntersects,
    routeClass: () => routeClass,
    segmentDistance: () => segmentDistance
  });

  // src/geometry/loopTopology.js
  function deriveLoopTopology(model, {
    discoverMissing = true,
    maxLength = 8,
    maxLoops = 48,
    maxVisualLoops = 12
  } = {}) {
    const edgesById = new Map((model?.edges || []).map((edge) => [edge.id, edge]));
    const curatedLoops = Array.isArray(model?.loops) ? model.loops : [];
    const discoveredLoops = curatedLoops.length || !discoverMissing ? curatedLoops : discoverLoops(model, { maxLength, maxLoops });
    const sourceLoops = curatedLoops.length ? discoveredLoops : selectVisualLoops(discoveredLoops, maxVisualLoops);
    const loops = sourceLoops.map((loop) => normalizeLoop(loop, edgesById)).filter((loop) => loop.edgeIds.length >= 2 && loop.nodeIds.length >= 2);
    const nodeMembership = /* @__PURE__ */ new Map();
    const edgeMembership = /* @__PURE__ */ new Map();
    for (const loop of loops) {
      for (const nodeId of loop.nodeIds) addMembership(nodeMembership, nodeId, loop.id);
      for (const edgeId of loop.edgeIds) addMembership(edgeMembership, edgeId, loop.id);
    }
    const degree = new Map((model?.nodes || []).map((node) => [node.id, 0]));
    for (const edge of model?.edges || []) {
      degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
    }
    const nodeRoles = /* @__PURE__ */ new Map();
    for (const node of model?.nodes || []) {
      const memberships = nodeMembership.get(node.id)?.length || 0;
      const connections = degree.get(node.id) || 0;
      nodeRoles.set(node.id, memberships > 1 || connections >= 4 ? "hub" : memberships > 0 ? "loop-member" : connections > 0 ? "bridge" : "isolated");
    }
    return {
      source: curatedLoops.length ? "curated" : loops.length ? "discovered" : "none",
      allLoops: discoveredLoops.map((loop) => normalizeLoop(loop, edgesById)).filter((loop) => loop.edgeIds.length >= 2 && loop.nodeIds.length >= 2),
      loops,
      loopEdgeIds: loops.map((loop) => [...loop.edgeIds]),
      loopNodeIds: loops.map((loop) => [...loop.nodeIds]),
      nodeMembership,
      edgeMembership,
      nodeRoles,
      bridgeEdgeIds: (model?.edges || []).filter((edge) => !edgeMembership.has(edge.id)).map((edge) => edge.id),
      hasLoops: loops.length > 0
    };
  }
  function selectVisualLoops(loops, maxVisualLoops) {
    if (loops.length <= maxVisualLoops) return loops;
    const remaining = loops.map((loop) => ({
      loop,
      edgeIds: new Set(loop.edgeIds || []),
      nodeIds: new Set(loop.nodeIds || [])
    }));
    const selected = [];
    const coveredEdges = /* @__PURE__ */ new Set();
    const coveredNodes = /* @__PURE__ */ new Set();
    while (remaining.length && selected.length < maxVisualLoops) {
      remaining.sort((a, b) => score(b) - score(a) || String(a.loop.id).localeCompare(String(b.loop.id)));
      const best = remaining.shift();
      if (!best) break;
      selected.push(best.loop);
      best.edgeIds.forEach((id) => coveredEdges.add(id));
      best.nodeIds.forEach((id) => coveredNodes.add(id));
    }
    return selected;
    function score(candidate) {
      const newEdges = [...candidate.edgeIds].filter((id) => !coveredEdges.has(id)).length;
      const newNodes = [...candidate.nodeIds].filter((id) => !coveredNodes.has(id)).length;
      const length = candidate.edgeIds.size || 1;
      return newEdges * 8 + newNodes * 1.5 + 1 / length;
    }
  }
  function normalizeLoop(loop, edgesById) {
    const edgeIds = [...new Set((loop?.edgeIds || []).filter((edgeId) => edgesById.has(edgeId)))];
    const nodeIds = [];
    for (const edgeId of edgeIds) {
      const edge = edgesById.get(edgeId);
      if (!nodeIds.includes(edge.source)) nodeIds.push(edge.source);
      if (!nodeIds.includes(edge.target)) nodeIds.push(edge.target);
    }
    return {
      id: loop.id,
      type: loop.type,
      edgeIds,
      nodeIds
    };
  }
  function addMembership(map, id, value) {
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(value);
  }

  // src/geometry/loopSeed.js
  function buildLoopAwareSeed(model, topology, {
    idealEdgeLength = 220,
    center = { x: 0, y: 0 },
    seed = "trama"
  } = {}) {
    const positions = /* @__PURE__ */ new Map();
    if (!topology?.hasLoops) return positions;
    const loops = topology.loops || [];
    const loopCenters = /* @__PURE__ */ new Map();
    const centerRadius = loops.length <= 1 ? 0 : Math.max(idealEdgeLength * 1.65, idealEdgeLength * loops.length / 1.7);
    const loopRadius = Math.max(idealEdgeLength * 0.72, 110);
    loops.forEach((loop, loopIndex) => {
      const angle = loops.length === 1 ? -Math.PI / 2 : -Math.PI / 2 + Math.PI * 2 * loopIndex / loops.length;
      loopCenters.set(loop.id, {
        x: center.x + Math.cos(angle) * centerRadius,
        y: center.y + Math.sin(angle) * centerRadius
      });
    });
    const candidatesByNode = /* @__PURE__ */ new Map();
    for (const loop of loops) {
      const loopCenter = loopCenters.get(loop.id);
      const nodeCount = Math.max(3, loop.nodeIds.length);
      const radius = Math.max(loopRadius, idealEdgeLength * nodeCount / (Math.PI * 2) * 1.25);
      const rotation = stableUnit(`${seed}:loop:${loop.id}`) * Math.PI * 2 - Math.PI / 2;
      loop.nodeIds.forEach((nodeId, nodeIndex) => {
        const angle = rotation + Math.PI * 2 * nodeIndex / nodeCount;
        const candidate = {
          x: loopCenter.x + Math.cos(angle) * radius,
          y: loopCenter.y + Math.sin(angle) * radius
        };
        if (!candidatesByNode.has(nodeId)) candidatesByNode.set(nodeId, []);
        candidatesByNode.get(nodeId).push(candidate);
      });
    }
    const nodes = model?.nodes || [];
    for (const node of nodes) {
      const candidates2 = candidatesByNode.get(node.id);
      if (candidates2?.length) {
        positions.set(node.id, average(candidates2));
        continue;
      }
      const neighborPositions = (model.edges || []).filter((edge) => edge.source === node.id || edge.target === node.id).map((edge) => positions.get(edge.source === node.id ? edge.target : edge.source)).filter(Boolean);
      if (neighborPositions.length) {
        const neighborCenter = average(neighborPositions);
        const angle = stableUnit(`${seed}:neighbor:${node.id}`) * Math.PI * 2;
        positions.set(node.id, {
          x: neighborCenter.x + Math.cos(angle) * idealEdgeLength * 1.35,
          y: neighborCenter.y + Math.sin(angle) * idealEdgeLength * 1.35
        });
      }
    }
    const remaining = nodes.filter((node) => !positions.has(node.id));
    remaining.forEach((node, index) => {
      const angle = stableUnit(`${seed}:node:${node.id}`) * Math.PI * 2 + index * 0.23;
      const radius = Math.max(idealEdgeLength * 2.6, centerRadius + idealEdgeLength * 1.6);
      positions.set(node.id, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      });
    });
    return positions;
  }
  function buildDeterministicSeed(model, topology, options = {}) {
    const positions = buildLoopAwareSeed(model, topology, options);
    const nodes = [...model?.nodes || []].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const idealEdgeLength = Number(options.idealEdgeLength) || 220;
    const center = options.center || { x: 0, y: 0 };
    const seed = options.seed || "trama";
    const remaining = nodes.filter((node) => !positions.has(node.id));
    if (!remaining.length) return positions;
    const radius = Math.max(
      idealEdgeLength * 2.4,
      idealEdgeLength * Math.sqrt(Math.max(1, nodes.length)) * 1.35
    );
    remaining.forEach((node, index) => {
      const angle = stableUnit(`${seed}:fallback:${node.id}`) * Math.PI * 2 + index * 0.19;
      positions.set(node.id, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      });
    });
    return positions;
  }
  function applyLoopAwareSeed(cy, topology, options = {}) {
    const positions = buildLoopAwareSeed(
      {
        nodes: cy.nodes().map((node) => node.data()),
        edges: cy.edges().map((edge) => edge.data())
      },
      topology,
      options
    );
    cy.batch(() => {
      for (const node of cy.nodes()) {
        if (node.locked() || node.data("position")) continue;
        const position = positions.get(node.id());
        if (position) node.position(position);
      }
    });
    return positions;
  }
  function applyDeterministicSeed(cy, topology, options = {}) {
    const positions = buildDeterministicSeed(
      {
        nodes: cy.nodes().map((node) => node.data()),
        edges: cy.edges().map((edge) => edge.data())
      },
      topology,
      options
    );
    cy.batch(() => {
      for (const node of cy.nodes()) {
        if (node.locked() || node.data("position")) continue;
        const position = positions.get(node.id());
        if (position) node.position(position);
      }
    });
    return positions;
  }
  function buildCompactPositionVariant(positions, {
    scale = 0.9,
    aspectTarget = 1.9,
    center = null
  } = {}) {
    const entries = [...positions.entries()];
    if (!entries.length) return /* @__PURE__ */ new Map();
    const bounds = entries.reduce((result, [, point]) => ({
      left: Math.min(result.left, point.x),
      right: Math.max(result.right, point.x),
      top: Math.min(result.top, point.y),
      bottom: Math.max(result.bottom, point.y)
    }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
    const width = Math.max(1, bounds.right - bounds.left);
    const height = Math.max(1, bounds.bottom - bounds.top);
    const anchor = center || {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2
    };
    let xScale = scale;
    let yScale = scale;
    if (width / height > aspectTarget) xScale *= aspectTarget / (width / height);
    if (height / width > aspectTarget) yScale *= aspectTarget / (height / width);
    return new Map(entries.map(([id, point]) => [id, {
      x: anchor.x + (point.x - anchor.x) * xScale,
      y: anchor.y + (point.y - anchor.y) * yScale
    }]));
  }
  function buildSkeletonBlendVariant(positions, skeleton, amount = 0.22) {
    if (!skeleton?.size) return new Map(positions);
    return new Map([...positions.entries()].map(([id, point]) => {
      const anchor = skeleton.get(id);
      if (!anchor) return [id, { ...point }];
      return [id, {
        x: point.x * (1 - amount) + anchor.x * amount,
        y: point.y * (1 - amount) + anchor.y * amount
      }];
    }));
  }
  function average(points) {
    return points.reduce((sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length
    }), { x: 0, y: 0 });
  }
  function stableUnit(value) {
    let hash2 = 2166136261;
    for (const character of String(value)) {
      hash2 ^= character.charCodeAt(0);
      hash2 = Math.imul(hash2, 16777619);
    }
    return (hash2 >>> 0) / 4294967296;
  }

  // src/geometry/routeDiagnostics.js
  var ROUTING_ALGORITHM_VERSION = "routing-v4";
  function diagnoseRoutes(cy, routing = {}) {
    const edges = cy?.edges?.().toArray?.() || [];
    const nodes = cy?.nodes?.().toArray?.() || [];
    const paths = /* @__PURE__ */ new Map();
    const edgeDiagnostics = {};
    let minimumEdgeNodeClearance = Infinity;
    let excessiveCurvatureCount = 0;
    let excessiveCurvatureMagnitude = 0;
    let shallowCurvatureCount = 0;
    let routeExceptionCount = 0;
    let closeEdgePairs = 0;
    let crossingPairs = 0;
    for (const edge of edges) {
      const source = edge.source().position();
      const target = edge.target().position();
      const distance = Number(edge.data("curveDistance") || edge.data("route")?.controlPointDistance || 0);
      const chordLength = Math.hypot(target.x - source.x, target.y - source.y) || 1;
      const normalizedCurvature2 = Math.abs(distance) / chordLength;
      const path = curvePolyline(source, target, distance);
      paths.set(edge.id(), path);
      let minimumNodeClearance = Infinity;
      const blockingNodes = [];
      for (const node of nodes) {
        if (node.id() === edge.source().id() || node.id() === edge.target().id()) continue;
        const clearance = minimumPathClearance(path, node);
        minimumNodeClearance = Math.min(minimumNodeClearance, clearance);
        if (clearance < 18) blockingNodes.push(node.id());
      }
      if (!Number.isFinite(minimumNodeClearance)) minimumNodeClearance = null;
      if (minimumNodeClearance !== null) {
        minimumEdgeNodeClearance = Math.min(minimumEdgeNodeClearance, minimumNodeClearance);
      }
      const excessive = normalizedCurvature2 > 0.38;
      const shallow = normalizedCurvature2 < 0.05;
      if (excessive) {
        excessiveCurvatureCount++;
        excessiveCurvatureMagnitude += normalizedCurvature2 - 0.38;
      }
      if (shallow) shallowCurvatureCount++;
      if (blockingNodes.length) routeExceptionCount++;
      const persisted = edge.data("route") || {};
      edgeDiagnostics[edge.id()] = {
        edgeId: edge.id(),
        locked: Boolean(edge.data("routeLocked") || persisted.locked),
        controlPointDistance: round(distance),
        chordLength: round(chordLength),
        normalizedCurvature: round(normalizedCurvature2),
        routeClass: routeClass(normalizedCurvature2),
        minimumNodeClearance: minimumNodeClearance === null ? null : round(minimumNodeClearance),
        blockingNodes,
        side: Math.sign(distance) || 0,
        reason: persisted.reason || edge.data("routeReason") || "automatic"
      };
    }
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const a = edges[i];
        const b = edges[j];
        const interaction = curvesInteraction(
          paths.get(a.id()),
          paths.get(b.id()),
          sharesEndpoint(a, b)
        );
        if (interaction.crossings) crossingPairs++;
        if (interaction.closeSegments || interaction.minimum < 18) closeEdgePairs++;
      }
    }
    const metrics = {
      algorithmVersion: ROUTING_ALGORITHM_VERSION,
      minimumEdgeNodeClearance: Number.isFinite(minimumEdgeNodeClearance) ? round(minimumEdgeNodeClearance) : null,
      excessiveCurvatureCount,
      excessiveCurvatureMagnitude: round(excessiveCurvatureMagnitude),
      shallowCurvatureCount,
      routeExceptionCount,
      closeEdgePairs,
      crossingPairs,
      lockedRouteCount: edges.filter((edge) => Boolean(edge.data("routeLocked") || edge.data("route")?.locked)).length,
      crossings: Number(routing.crossings || 0),
      closeSegments: Number(routing.closeSegments || 0),
      loopCrossings: Number(routing.loopCrossings || 0),
      lockedCrossings: Number(routing.lockedCrossings || 0)
    };
    return { algorithmVersion: ROUTING_ALGORITHM_VERSION, metrics, edges: edgeDiagnostics, paths };
  }
  function routeClass(normalizedCurvature2) {
    if (normalizedCurvature2 < 0.05) return "straight";
    if (normalizedCurvature2 < 0.16) return "gentle";
    if (normalizedCurvature2 < 0.38) return "moderate";
    return "deep";
  }
  function minimumPathClearance(path, node) {
    const position = node.position();
    const dimensions = nodeDimensions(node);
    const radius = Math.max(dimensions.width, dimensions.height) / 2;
    return Math.min(...path.map((point) => Math.hypot(point.x - position.x, point.y - position.y))) - radius;
  }
  function nodeDimensions(node) {
    const style = node.data("style") || {};
    const width = finitePositive(style.width) || finitePositive(style.size) || 90;
    const height = finitePositive(style.height) || finitePositive(style.size) || 90;
    return { width, height };
  }
  function finitePositive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }
  function sharesEndpoint(a, b) {
    return a.source().id() === b.source().id() || a.source().id() === b.target().id() || a.target().id() === b.source().id() || a.target().id() === b.target().id();
  }
  function round(value) {
    return Number(Number(value).toFixed(3));
  }

  // src/geometry/index.js
  function bezierPoint(source, target, cpDistance, t) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.hypot(dx, dy) || 1;
    const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
    const control = {
      x: midpoint.x + -dy / length * cpDistance,
      y: midpoint.y + dx / length * cpDistance
    };
    const mt = 1 - t;
    return {
      x: mt * mt * source.x + 2 * mt * t * control.x + t * t * target.x,
      y: mt * mt * source.y + 2 * mt * t * control.y + t * t * target.y
    };
  }
  function curvePolyline(source, target, cpDistance, steps = 28) {
    return Array.from(
      { length: steps + 1 },
      (_, index) => bezierPoint(source, target, cpDistance, index / steps)
    );
  }
  function pointSegmentDistance(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) return Math.hypot(point.x - a.x, point.y - a.y);
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
    return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
  }
  function segmentDistance(a, b, c, d) {
    if (segmentsCross(a, b, c, d)) return 0;
    return Math.min(
      pointSegmentDistance(a, c, d),
      pointSegmentDistance(b, c, d),
      pointSegmentDistance(c, a, b),
      pointSegmentDistance(d, a, b)
    );
  }
  function curvesInteraction(pathA, pathB, sharesEndpoint4) {
    const crossingPoints = [];
    const closePoints = [];
    let minimum = Infinity;
    const guard = sharesEndpoint4 ? 4 : 0;
    for (let i = guard; i < pathA.length - 1 - guard; i++) {
      for (let j = guard; j < pathB.length - 1 - guard; j++) {
        const distance = segmentDistance(pathA[i], pathA[i + 1], pathB[j], pathB[j + 1]);
        minimum = Math.min(minimum, distance);
        const point = segmentPairCenter(pathA[i], pathA[i + 1], pathB[j], pathB[j + 1]);
        if (distance === 0) {
          if (!crossingPoints.some((existing) => Math.hypot(existing.x - point.x, existing.y - point.y) < 12)) {
            crossingPoints.push(point);
          }
        } else if (distance < 18) {
          if (!closePoints.some((existing) => Math.hypot(existing.x - point.x, existing.y - point.y) < 14)) {
            closePoints.push(point);
          }
        }
      }
    }
    return {
      crossings: crossingPoints.length,
      closeSegments: Math.min(6, closePoints.length),
      minimum
    };
  }
  function segmentPairCenter(a, b, c, d) {
    return {
      x: (a.x + b.x + c.x + d.x) / 4,
      y: (a.y + b.y + c.y + d.y) / 4
    };
  }
  function arcLengthTable(points) {
    let total = 0;
    return points.map((point, index) => {
      if (index) total += Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y);
      return { ...point, length: total };
    });
  }
  function pointAtArcDistance(table, distance) {
    const total = table.at(-1).length;
    const wanted = Math.max(0, Math.min(total, distance));
    let upperIndex = table.findIndex((point) => point.length >= wanted);
    if (upperIndex <= 0) upperIndex = 1;
    const upper = table[upperIndex];
    const lower = table[upperIndex - 1];
    const ratio = (wanted - lower.length) / (upper.length - lower.length || 1);
    const tangent = { x: upper.x - lower.x, y: upper.y - lower.y };
    const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
    return {
      point: {
        x: lower.x + (upper.x - lower.x) * ratio,
        y: lower.y + (upper.y - lower.y) * ratio
      },
      tangent: { x: tangent.x / tangentLength, y: tangent.y / tangentLength },
      total
    };
  }
  function alignedNormal(tangent, referenceNormal) {
    const a = { x: -tangent.y, y: tangent.x };
    const b = { x: tangent.y, y: -tangent.x };
    const dotA = a.x * referenceNormal.x + a.y * referenceNormal.y;
    const dotB = b.x * referenceNormal.x + b.y * referenceNormal.y;
    return dotA >= dotB ? a : b;
  }
  function chordNormal(table, side) {
    const source = table[0];
    const target = table.at(-1);
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: -dy / length * side, y: dx / length * side };
  }
  function rectangleIntersects(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }
  function orientation(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }
  function segmentsCross(a, b, c, d) {
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    return o1 * o2 < 0 && o3 * o4 < 0;
  }

  // src/routing/optimizer.js
  function optimizeRoutes(cy, profile, { quality = "balanced", respectLocks = true, loopEdgeIds = [] } = {}) {
    const center = graphCenter(cy);
    const edges = cy.edges().toArray().sort((a, b) => directLength(b) - directLength(a));
    const budget = routingBudget(edges.length, quality, profile);
    const paths = /* @__PURE__ */ new Map();
    const distances = /* @__PURE__ */ new Map();
    const routeMeta = /* @__PURE__ */ new Map();
    const loopSignsByEdge = loopOutwardSigns(cy, loopEdgeIds);
    const loopPairs = loopEdgePairs(loopEdgeIds);
    const fixedEdges = edges.filter((edge) => respectLocks && hasLockedRoute(edge));
    const automaticEdges = edges.filter((edge) => !hasLockedRoute(edge));
    for (const edge of fixedEdges) {
      const distance = Number(edge.data("route")?.controlPointDistance ?? edge.data("curveDistance"));
      distances.set(edge.id(), distance);
      paths.set(edge.id(), curvePolyline(edge.source().position(), edge.target().position(), distance, budget.interactionSteps));
      routeMeta.set(edge.id(), {
        algorithmVersion: edge.data("route")?.algorithmVersion || ROUTING_ALGORITHM_VERSION,
        normalizedCurvature: normalizedCurvature(edge, distance),
        side: Math.sign(distance) || 0,
        reason: "locked"
      });
    }
    for (const edge of automaticEdges) {
      chooseBest(edge, candidates(edge, center, quality, loopSignsByEdge.get(edge.id()), budget), paths, distances, loopPairs, routeMeta, budget);
    }
    const routingPasses = budget.routingPasses;
    for (let pass = 0; pass < routingPasses; pass++) {
      const ordered = pass % 2 ? [...automaticEdges].reverse() : automaticEdges;
      for (const edge of ordered) {
        chooseBest(edge, candidates(edge, center, quality, loopSignsByEdge.get(edge.id()), budget), paths, distances, loopPairs, routeMeta, budget);
      }
    }
    cy.batch(() => {
      for (const edge of edges) {
        const distance = distances.get(edge.id());
        edge.style({ "control-point-distances": distance, "control-point-weights": 0.5 });
        edge.data("curveDistance", Math.round(distance));
        edge.data("routeLocked", hasLockedRoute(edge));
        const meta = routeMeta.get(edge.id()) || {};
        edge.data("route", {
          ...edge.data("route") || {},
          controlPointDistance: distance,
          locked: hasLockedRoute(edge),
          algorithmVersion: meta.algorithmVersion || ROUTING_ALGORITHM_VERSION,
          normalizedCurvature: meta.normalizedCurvature ?? normalizedCurvature(edge, distance),
          side: meta.side ?? (Math.sign(distance) || 0),
          reason: meta.reason || (hasLockedRoute(edge) ? "locked" : "automatic")
        });
        edge.removeData("annotationSide");
      }
    });
    let crossings = 0;
    let closeSegments = 0;
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const interaction = curvesInteraction(
          paths.get(edges[i].id()),
          paths.get(edges[j].id()),
          sharesEndpoint2(edges[i], edges[j])
        );
        crossings += interaction.crossings;
        closeSegments += interaction.closeSegments;
      }
    }
    let loopCrossings = 0;
    let lockedCrossings = 0;
    for (const pair of loopPairs) {
      const [aId, bId] = pair.split("|");
      const a = cy.getElementById(aId);
      const b = cy.getElementById(bId);
      if (!a.length || !b.length) continue;
      const crossingsForPair = curvesInteraction(paths.get(aId), paths.get(bId), true).crossings;
      loopCrossings += crossingsForPair;
      if (hasLockedRoute(a) && hasLockedRoute(b)) lockedCrossings += crossingsForPair;
    }
    return {
      crossings,
      closeSegments,
      loopCrossings,
      lockedCrossings,
      diverted: [...distances.values()].filter((value) => Math.abs(value) > 120).length,
      distances,
      algorithmVersion: ROUTING_ALGORITHM_VERSION
    };
    function chooseBest(edge, edgeCandidates, pathCache, distanceCache, loopPairSet, metadataCache, routeBudget) {
      let best = { score: Infinity, rank: null };
      const preferred = edgeCandidates[0];
      for (const distance of edgeCandidates) {
        const path = curvePolyline(edge.source().position(), edge.target().position(), distance, routeBudget.interactionSteps);
        const candidate = scoreCandidate(cy, edge, path, distance, preferred, pathCache, distanceCache, loopPairSet);
        if (compareCandidate(candidate, best) < 0) {
          best = { ...candidate, distance, path };
        }
      }
      pathCache.set(edge.id(), best.path);
      distanceCache.set(edge.id(), best.distance);
      metadataCache.set(edge.id(), {
        algorithmVersion: ROUTING_ALGORITHM_VERSION,
        normalizedCurvature: normalizedCurvature(edge, best.distance),
        side: Math.sign(best.distance) || 0,
        reason: inferRouteReason(edge, best.distance, preferred)
      });
    }
  }
  function hasLockedRoute(edge) {
    const route = edge.data("route");
    return Boolean(route?.locked && Number.isFinite(route.controlPointDistance));
  }
  function normalizedCurvature(edge, distance) {
    return Number((Math.abs(Number(distance) || 0) / (directLength(edge) || 1)).toFixed(3));
  }
  function inferRouteReason(edge, distance, preferred) {
    const curvature = normalizedCurvature(edge, distance);
    if (preferred && Math.sign(distance) !== Math.sign(preferred)) return "conflict-avoidance";
    if (curvature > 0.55) return "obstacle-detour";
    if (preferred) return "loop-outward";
    if (curvature < 0.05) return "short-clearance";
    return "local-outward";
  }
  function scoreCandidate(cy, edge, path, distance, preferred, pathCache, distanceCache, loopPairSet = /* @__PURE__ */ new Set()) {
    let score = nodePenalty(cy, edge, path) + portPenalty(cy, edge, path, pathCache) + parallelLanePenalty(cy, edge, distance, pathCache, distanceCache) + terminalCorridorPenalty(cy, edge, path, pathCache);
    const chordLength = directLength(edge) || 1;
    const normalizedCurvature2 = Math.abs(distance) / chordLength;
    const edgeNodeHits = countNodeHits(cy, edge, path);
    let crossings = 0;
    let closeSegments = 0;
    let loopCrossings = 0;
    const interactionRecords = [];
    for (const [otherId, otherPath] of pathCache) {
      if (otherId === edge.id()) continue;
      const other = cy.getElementById(otherId);
      const interaction = curvesInteraction(path, otherPath, sharesEndpoint2(edge, other));
      interactionRecords.push({ otherId, otherPath, other, interaction });
      crossings += interaction.crossings;
      closeSegments += interaction.closeSegments;
      if (loopPairSet.has([edge.id(), otherId].sort().join("|"))) loopCrossings += interaction.crossings;
    }
    const portConflicts = countPortConflicts(cy, edge, path, pathCache);
    const curvatureDebt = normalizedCurvature2 < 0.085 ? 0.085 - normalizedCurvature2 : Math.max(0, normalizedCurvature2 - 0.22);
    const excessiveCurvature = normalizedCurvature2 > 0.38 ? 1 : 0;
    const extremeCurvature = normalizedCurvature2 > 0.55 ? 1 : 0;
    const outwardMismatch = preferred !== 0 && Math.sign(distance) !== Math.sign(preferred) ? 1 : 0;
    if (preferred !== 0 && Math.sign(distance) !== Math.sign(preferred)) {
      score += 12e4;
    }
    const minimumVisibleCurvature = 0.085;
    if (normalizedCurvature2 < minimumVisibleCurvature) {
      score += (minimumVisibleCurvature - normalizedCurvature2) * 1e5;
    }
    score += normalizedCurvature2 * 2200;
    if (normalizedCurvature2 > 0.22) score += (normalizedCurvature2 - 0.22) * 45e3;
    if (normalizedCurvature2 > 0.55) score += (normalizedCurvature2 - 0.55) * 18e4;
    for (const { otherId, otherPath, other, interaction } of interactionRecords) {
      if (otherId === edge.id()) continue;
      const pair = [edge.id(), otherId].sort().join("|");
      const crossingPenalty = loopPairSet.has(pair) ? 22e4 : 5e4;
      score += interaction.crossings * crossingPenalty + interaction.closeSegments * 900;
      if (!sharesEndpoint2(edge, other) && interaction.minimum < 10) score += (10 - interaction.minimum) * 600;
    }
    return {
      score: score + Math.abs(distance) * 0.7 + Math.abs(distance - preferred) * 0.3,
      rank: [
        edgeNodeHits,
        loopCrossings,
        crossings,
        closeSegments,
        portConflicts,
        extremeCurvature,
        excessiveCurvature,
        Number(curvatureDebt.toFixed(4)),
        outwardMismatch,
        Math.abs(distance)
      ]
    };
  }
  function compareCandidate(a, b) {
    if (!b?.rank) return -1;
    for (let index = 0; index < Math.max(a.rank.length, b.rank.length); index++) {
      const difference = Number(a.rank[index] || 0) - Number(b.rank[index] || 0);
      if (difference !== 0) return difference;
    }
    return Number(a.score || 0) - Number(b.score || 0);
  }
  function countNodeHits(cy, edge, path) {
    let hits = 0;
    for (const node of cy.nodes()) {
      if (node.id() === edge.source().id() || node.id() === edge.target().id()) continue;
      const position = node.position();
      const envelope = node.data("visualEnvelope") || {};
      const style = node.data("style") || {};
      const width = Number(envelope.width || style.width || style.size || 90);
      const height = Number(envelope.height || style.height || style.size || 90);
      const clearance = Math.max(width, height) / 2 + 18;
      const minimum = Math.min(...path.map((point) => Math.hypot(point.x - position.x, point.y - position.y)));
      if (minimum < clearance) hits++;
    }
    return hits;
  }
  function countPortConflicts(cy, edge, path, cache) {
    let conflicts = 0;
    for (const nodeId of [edge.source().id(), edge.target().id()]) {
      const direction = outward(path, edge, nodeId);
      for (const [otherId, otherPath] of cache) {
        if (otherId === edge.id()) continue;
        const other = cy.getElementById(otherId);
        if (other.source().id() !== nodeId && other.target().id() !== nodeId) continue;
        if (angleBetween(direction, outward(otherPath, other, nodeId)) < 0.18) conflicts++;
      }
    }
    return conflicts;
  }
  function terminalCorridorPenalty(cy, edge, path, pathCache) {
    let penalty = 0;
    for (const [otherId, otherPath] of pathCache) {
      const other = cy.getElementById(otherId);
      if (!other.length || other.id() === edge.id()) continue;
      const sharedNodeIds = [edge.source().id(), edge.target().id()].filter((nodeId) => nodeId === other.source().id() || nodeId === other.target().id());
      for (const nodeId of sharedNodeIds) {
        const localPath = pathFromEndpoint(path, edge, nodeId);
        const otherLocalPath = pathFromEndpoint(otherPath, other, nodeId);
        const tangentAngle = angleBetween(
          directionAtStart(localPath),
          directionAtStart(otherLocalPath)
        );
        if (tangentAngle > 0.72) continue;
        const interaction = corridorInteraction(localPath, otherLocalPath);
        if (interaction.minimum < 28 || interaction.closeSegments > 0) {
          penalty += 18e3 + Math.max(0, 28 - interaction.minimum) * 1800;
          penalty += interaction.closeSegments * 2600;
        }
      }
    }
    return penalty;
  }
  function pathFromEndpoint(path, edge, nodeId) {
    const startsAtNode = edge.source().id() === nodeId;
    const endsAtNode = edge.target().id() === nodeId;
    if (startsAtNode) return path;
    if (endsAtNode) return [...path].reverse();
    return [];
  }
  function directionAtStart(path) {
    if (path.length < 2) return { x: 1, y: 0 };
    const dx = path[1].x - path[0].x;
    const dy = path[1].y - path[0].y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
  }
  function corridorInteraction(pathA, pathB) {
    const limitA = Math.min(pathA.length - 1, 7);
    const limitB = Math.min(pathB.length - 1, 7);
    let closeSegments = 0;
    let minimum = Infinity;
    for (let i = 1; i < limitA; i++) {
      for (let j = 1; j < limitB; j++) {
        const distance = segmentDistance(pathA[i], pathA[i + 1], pathB[j], pathB[j + 1]);
        minimum = Math.min(minimum, distance);
        if (distance < 18) closeSegments++;
      }
    }
    return { closeSegments, minimum };
  }
  function parallelLanePenalty(cy, edge, distance, pathCache, distanceCache) {
    let penalty = 0;
    for (const [otherId] of pathCache) {
      const other = cy.getElementById(otherId);
      if (!other.length || other.id() === edge.id()) continue;
      const sameDirection = edge.source().id() === other.source().id() && edge.target().id() === other.target().id();
      const reverseDirection = edge.source().id() === other.target().id() && edge.target().id() === other.source().id();
      if (!sameDirection && !reverseDirection) continue;
      const otherDistance = Number(distanceCache.get(otherId) ?? other.data("curveDistance") ?? 0);
      const separation = Math.abs(distance - otherDistance);
      if (separation < 24) penalty += (24 - separation) * 4200;
    }
    return penalty;
  }
  function nodePenalty(cy, edge, path) {
    let penalty = 0;
    cy.nodes().forEach((node) => {
      if (node.id() === edge.source().id() || node.id() === edge.target().id()) return;
      const position = node.position();
      const envelope = node.data("visualEnvelope") || {};
      const style = node.data("style") || {};
      const width = Number(envelope.width || style.width || style.size || 90);
      const height = Number(envelope.height || style.height || style.size || 90);
      const clearance = Math.max(width, height) / 2 + 18;
      const minimum = Math.min(...path.map((point) => Math.hypot(point.x - position.x, point.y - position.y)));
      if (minimum < clearance) penalty += 24e3 + (clearance - minimum) * 1200;
      else if (minimum < clearance + 22) penalty += (clearance + 22 - minimum) * 240;
    });
    return penalty;
  }
  function portPenalty(cy, edge, path, cache) {
    let penalty = 0;
    for (const nodeId of [edge.source().id(), edge.target().id()]) {
      const direction = outward(path, edge, nodeId);
      for (const [otherId, otherPath] of cache) {
        const other = cy.getElementById(otherId);
        if (otherId === edge.id()) continue;
        if (other.source().id() !== nodeId && other.target().id() !== nodeId) continue;
        const angle = angleBetween(direction, outward(otherPath, other, nodeId));
        if (angle < 0.18) penalty += 7e4;
        else if (angle < 0.32) penalty += (0.32 - angle) * 7e4;
        else if (angle < 0.48) penalty += (0.48 - angle) * 11e3;
      }
    }
    return penalty;
  }
  function routingBudget(edgeCount, quality, profile) {
    const dense = edgeCount > 40;
    const veryDense = edgeCount > 70;
    const boundedBalanced = edgeCount > 48 && quality === "balanced";
    if (quality === "draft") {
      return {
        interactionSteps: veryDense ? 6 : dense ? 8 : 12,
        candidateFactors: dense ? [0.2, 0.34, 0.5, 0.7] : null,
        routingPasses: 1
      };
    }
    if (quality === "publish") {
      return {
        interactionSteps: veryDense ? 12 : dense ? 16 : 20,
        candidateFactors: dense ? [0.18, 0.26, 0.36, 0.48, 0.62, 0.8, 1, 1.24, 1.52] : null,
        routingPasses: Math.max(2, profile.routingPasses + (dense ? 1 : 3))
      };
    }
    return {
      interactionSteps: veryDense ? 8 : dense ? 10 : 16,
      candidateFactors: boundedBalanced ? [0.24, 0.42, 0.68, 0.96] : dense ? [0.2, 0.3, 0.42, 0.56, 0.72, 0.92, 1.16] : null,
      routingPasses: boundedBalanced ? 1 : Math.min(profile.routingPasses, veryDense ? 2 : dense ? 3 : profile.routingPasses)
    };
  }
  function candidates(edge, center, quality, loopSigns = null, budget = {}) {
    const source = edge.source().position();
    const target = edge.target().position();
    const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
    const vector = { x: target.x - source.x, y: target.y - source.y };
    const local = localCentroid(edge, center);
    const toward = { x: local.x - midpoint.x, y: local.y - midpoint.y };
    const naturalSign = vector.x * toward.y - vector.y * toward.x >= 0 ? -1 : 1;
    const loopSignList = preferredLoopSigns(loopSigns, naturalSign);
    const outwardSign = loopSignList.length ? loopSignList[0] : naturalSign;
    const scale = Math.max(45, Math.min(190, Math.hypot(vector.x, vector.y) * 0.38));
    const factors = budget.candidateFactors || (quality === "draft" ? [0.18, 0.25, 0.34, 0.44, 0.56, 0.7] : quality === "publish" ? [0.18, 0.25, 0.34, 0.44, 0.56, 0.7, 0.84, 1.02, 1.2, 1.4, 1.64, 1.86] : [0.18, 0.25, 0.34, 0.44, 0.56, 0.7, 0.84, 1.04, 1.3, 1.58]);
    return [...new Set(factors.flatMap((factor) => {
      const value = Math.round(scale * factor);
      return [outwardSign * value, -outwardSign * value];
    }))];
  }
  function loopOutwardSigns(cy, loopEdgeIds) {
    const signsByEdge = /* @__PURE__ */ new Map();
    for (const edgeIds of loopEdgeIds) {
      const loopNodes = /* @__PURE__ */ new Map();
      for (const edgeId of edgeIds) {
        const edge = cy.getElementById(edgeId);
        if (!edge.length) continue;
        loopNodes.set(edge.source().id(), edge.source());
        loopNodes.set(edge.target().id(), edge.target());
      }
      if (loopNodes.size < 3) continue;
      const center = [...loopNodes.values()].reduce((sum, node) => {
        const point = node.position();
        return { x: sum.x + point.x / loopNodes.size, y: sum.y + point.y / loopNodes.size };
      }, { x: 0, y: 0 });
      const windingSign = loopWindingSign(cy, edgeIds);
      for (const edgeId of edgeIds) {
        const edge = cy.getElementById(edgeId);
        if (!edge.length) continue;
        const source = edge.source().position();
        const target = edge.target().position();
        const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
        const vector = { x: target.x - source.x, y: target.y - source.y };
        const toward = { x: center.x - midpoint.x, y: center.y - midpoint.y };
        const centroidSign = vector.x * toward.y - vector.y * toward.x >= 0 ? -1 : 1;
        const sign = windingSign ?? centroidSign;
        if (!signsByEdge.has(edgeId)) signsByEdge.set(edgeId, /* @__PURE__ */ new Map());
        const signCounts = signsByEdge.get(edgeId);
        signCounts.set(sign, (signCounts.get(sign) || 0) + 1);
      }
    }
    return signsByEdge;
  }
  function preferredLoopSigns(loopSigns, naturalSign) {
    if (!loopSigns) return [];
    if (loopSigns instanceof Map) {
      const ranked = [...loopSigns.entries()].sort((a, b) => {
        const countDelta = b[1] - a[1];
        if (countDelta !== 0) return countDelta;
        return a[0] === naturalSign ? -1 : 1;
      });
      return ranked.map(([sign]) => sign);
    }
    return [...loopSigns];
  }
  function loopWindingSign(cy, edgeIds) {
    const edges = edgeIds.map((edgeId) => cy.getElementById(edgeId)).filter((edge) => edge.length);
    if (edges.length < 3) return null;
    const orderedNodes = [edges[0].source()];
    let current = edges[0].target();
    const remaining = edges.slice(1);
    while (remaining.length && current.id() !== orderedNodes[0].id()) {
      const index = remaining.findIndex((edge2) => edge2.source().id() === current.id());
      if (index < 0) return null;
      const edge = remaining.splice(index, 1)[0];
      orderedNodes.push(current);
      current = edge.target();
    }
    if (current.id() !== orderedNodes[0].id() || orderedNodes.length < 3) return null;
    let areaTwice = 0;
    for (let index = 0; index < orderedNodes.length; index++) {
      const a = orderedNodes[index].position();
      const b = orderedNodes[(index + 1) % orderedNodes.length].position();
      areaTwice += a.x * b.y - b.x * a.y;
    }
    if (Math.abs(areaTwice) < 1e-6) return null;
    return areaTwice >= 0 ? -1 : 1;
  }
  function loopEdgePairs(loopEdgeIds) {
    const pairs = /* @__PURE__ */ new Set();
    for (const edgeIds of loopEdgeIds) {
      for (let i = 0; i < edgeIds.length; i++) {
        for (let j = i + 1; j < edgeIds.length; j++) {
          pairs.add([edgeIds[i], edgeIds[j]].sort().join("|"));
        }
      }
    }
    return pairs;
  }
  function graphCenter(cy) {
    const nodes = cy.nodes();
    const total = nodes.reduce((sum, node) => {
      const p = node.position();
      return { x: sum.x + p.x, y: sum.y + p.y };
    }, { x: 0, y: 0 });
    return { x: total.x / nodes.length, y: total.y / nodes.length };
  }
  function localCentroid(edge, fallback) {
    const excluded = /* @__PURE__ */ new Set([edge.source().id(), edge.target().id()]);
    const neighbors = edge.source().neighborhood("node").union(edge.target().neighborhood("node")).filter((node) => !excluded.has(node.id()));
    if (!neighbors.length) return fallback;
    const total = neighbors.reduce((sum, node) => {
      const p = node.position();
      return { x: sum.x + p.x, y: sum.y + p.y };
    }, { x: 0, y: 0 });
    return { x: total.x / neighbors.length, y: total.y / neighbors.length };
  }
  function sharesEndpoint2(a, b) {
    return a.source().id() === b.source().id() || a.source().id() === b.target().id() || a.target().id() === b.source().id() || a.target().id() === b.target().id();
  }
  function directLength(edge) {
    const a = edge.source().position();
    const b = edge.target().position();
    return Math.hypot(b.x - a.x, b.y - a.y);
  }
  function outward(path, edge, nodeId) {
    if (edge.source().id() === nodeId) return { x: path[2].x - path[0].x, y: path[2].y - path[0].y };
    const last = path.length - 1;
    return { x: path[last - 2].x - path[last].x, y: path[last - 2].y - path[last].y };
  }
  function angleBetween(a, b) {
    const denominator = (Math.hypot(a.x, a.y) || 1) * (Math.hypot(b.x, b.y) || 1);
    return Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / denominator)));
  }

  // src/core/views.js
  var ViewResolutionError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "ViewResolutionError";
    }
  };
  function resolveView(view, views = []) {
    if (!view) return null;
    const byId2 = new Map(views.map((item) => [item.id, item]));
    const chain = [];
    const visited = /* @__PURE__ */ new Set();
    let current = view;
    while (current) {
      if (visited.has(current.id)) throw new ViewResolutionError(`Circular base view reference at '${current.id}'.`);
      if (current.id) visited.add(current.id);
      chain.unshift(current);
      const baseId = current.base_view_id || current.settings?.extends;
      current = baseId ? byId2.get(baseId) : null;
      if (baseId && !current) throw new ViewResolutionError(`Unknown base view '${baseId}'.`);
    }
    return chain.reduce((result, item) => ({
      ...result,
      ...item,
      id: view.id,
      title: view.title,
      settings: { ...result.settings || {}, ...item.settings || {} },
      rules: [...result.rules || [], ...item.rules || []],
      source_views: chain.map((source) => source.id).filter(Boolean)
    }), { settings: {}, rules: [] });
  }
  function buildViewLegend(view) {
    return (view?.rules || []).flatMap((rule) => {
      const selector = rule.selector || {};
      if (!selector.attribute) return [];
      const properties = rule.properties || {};
      const visual = properties.fill || properties.color || properties["stroke-color"] || properties["badge-fill"];
      if (!visual && !properties.shape && !properties.highlight) return [];
      return [{
        id: `${selector.type}-${selector.attribute}-${selector.value}`,
        label: properties.legend || `${selector.attribute}: ${selector.value}`,
        type: selector.type,
        color: visual || "#7a8a72",
        shape: properties.shape || (selector.type === "relation" ? "line" : "ellipse")
      }];
    });
  }
  function stylePropertiesForEntity(view, type, data = {}) {
    return (view?.rules || []).reduce((properties, rule) => {
      if (rule.selector?.type !== type || !matchesSelector(rule.selector, data)) return properties;
      return { ...properties, ...rule.properties || {} };
    }, {});
  }
  function matchesSelector(selector, data) {
    if (!selector.attribute) return true;
    if (selector.attribute === "tag") return (data.tags || []).includes(selector.value);
    if (selector.attribute === "field") {
      const fields = data.fields || {};
      const match = String(selector.value).match(/^([^:=]+)[:=](.+)$/);
      if (match) return String(fields[match[1]]) === match[2];
      return Object.prototype.hasOwnProperty.call(fields, selector.value) || Object.values(fields).some((value) => String(value) === String(selector.value));
    }
    return String(data[selector.attribute]) === String(selector.value);
  }

  // src/annotations/loopBadges.js
  function renderLoopBadges({
    cy,
    svg,
    view,
    nodeBoxes = [],
    labelBoxes = [],
    paths = [],
    obstacles = [],
    viewport = {}
  } = {}) {
    if (!cy || !svg || view?.settings?.["loop-badges"] !== true) return [];
    const loops = cy.data("loopDefinitions") || [];
    const occupied = [];
    for (const loop of loops) {
      if (!loop?.id || !loop.edgeIds?.length) continue;
      const nodes = loopNodeElements(cy, loop);
      if (!nodes.length) continue;
      const points = nodes.map((node) => node.renderedPosition());
      const bounds = boundsOf(points);
      const visual = stylePropertiesForEntity(view, "loop", loop);
      const prefix = loopPrefix(loop);
      const label = compactLabel(loop, prefix);
      const width = Math.max(58, Math.min(190, 26 + label.length * 5.6));
      const height = 24;
      const candidates2 = badgeCandidates(bounds, width, height).map((point) => clampBadgePoint(point, width, height, viewport));
      const position = candidates2.map((point) => ({ point, score: badgeScore(point, width, height, nodeBoxes, labelBoxes, paths, occupied, obstacles) })).sort((a, b) => a.score - b.score)[0]?.point || { x: bounds.centerX, y: bounds.top - 22 };
      const box = {
        left: position.x - width / 2,
        right: position.x + width / 2,
        top: position.y - height / 2,
        bottom: position.y + height / 2
      };
      occupied.push(box);
      svg.appendChild(createBadge({ loop, label, prefix, position, width, height, visual }));
    }
    return occupied;
  }
  function loopNodeElements(cy, loop) {
    const ids = /* @__PURE__ */ new Set();
    for (const edgeId of loop.edgeIds || []) {
      const edge = cy.getElementById(edgeId);
      if (!edge?.length) continue;
      ids.add(edge.source().id());
      ids.add(edge.target().id());
    }
    return [...ids].map((id) => cy.getElementById(id)).filter((element) => element?.length);
  }
  function boundsOf(points) {
    const left = Math.min(...points.map((point) => point.x));
    const right = Math.max(...points.map((point) => point.x));
    const top = Math.min(...points.map((point) => point.y));
    const bottom = Math.max(...points.map((point) => point.y));
    return {
      left,
      right,
      top,
      bottom,
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2
    };
  }
  function badgeCandidates(bounds, width, height) {
    const gap = 28;
    const { left, right, top, bottom, centerX, centerY } = bounds;
    return [
      { x: centerX, y: top - gap - height / 2 },
      { x: right + gap + width / 2, y: centerY },
      { x: left - gap - width / 2, y: centerY },
      { x: centerX, y: bottom + gap + height / 2 },
      { x: left - gap, y: top - gap },
      { x: right + gap, y: top - gap },
      { x: right + gap, y: bottom + gap },
      { x: left - gap, y: bottom + gap },
      { x: centerX, y: centerY }
    ];
  }
  function badgeScore(point, width, height, nodeBoxes, labelBoxes, paths, occupied, obstacles) {
    const box = { left: point.x - width / 2, right: point.x + width / 2, top: point.y - height / 2, bottom: point.y + height / 2 };
    let score = 0;
    for (const obstacle of [
      ...nodeBoxes.map((item) => item.box),
      ...labelBoxes.map((item) => item.box),
      ...occupied,
      ...obstacles
    ]) {
      if (rectanglesIntersect(box, obstacle)) score += 1e5;
      else score += Math.max(0, 36 - rectangleDistance(box, obstacle));
    }
    for (const path of paths) {
      const minimum = Math.min(...path.map((item) => Math.hypot(item.x - point.x, item.y - point.y)));
      if (minimum < 24) score += (24 - minimum) * 100;
    }
    return score;
  }
  function clampBadgePoint(point, width, height, viewport) {
    const viewportWidth = Number(viewport.width);
    const viewportHeight = Number(viewport.height);
    if (!viewportWidth || !viewportHeight) return point;
    const margin = 8;
    return {
      x: Math.max(width / 2 + margin, Math.min(viewportWidth - width / 2 - margin, point.x)),
      y: Math.max(height / 2 + margin, Math.min(viewportHeight - height / 2 - margin, point.y))
    };
  }
  function createBadge({ loop, label, prefix, position, width, height, visual }) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("loop-badge");
    group.setAttribute("data-loop-id", loop.id);
    group.setAttribute("role", "img");
    group.setAttribute("aria-label", loop.label || loop.id);
    group.setAttribute("transform", `translate(${position.x} ${position.y})`);
    group.style.pointerEvents = "none";
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(-width / 2));
    rect.setAttribute("y", String(-height / 2));
    rect.setAttribute("width", String(width));
    rect.setAttribute("height", String(height));
    rect.setAttribute("rx", "12");
    rect.setAttribute("fill", visual["badge-fill"] || "#2b3a2e");
    rect.setAttribute("fill-opacity", String(visual["badge-opacity"] ?? 0.96));
    rect.setAttribute("stroke", visual["badge-stroke"] || "#6f9a5b");
    rect.setAttribute("stroke-width", "1");
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "0");
    text.setAttribute("y", "4");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-family", "Noto Sans, system-ui, sans-serif");
    text.setAttribute("font-size", "10");
    text.setAttribute("font-weight", "750");
    text.setAttribute("letter-spacing", "0.2");
    text.setAttribute("fill", visual["badge-color"] || "#f7f3e7");
    text.textContent = `${prefix}  ${label}`;
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = loop.label || loop.id;
    group.append(rect, text, title);
    return group;
  }
  function loopPrefix(loop) {
    const label = String(loop.label || loop.id || "");
    const match = label.match(/\b([RB]\d+)\b/i);
    return match ? match[1].toUpperCase() : loop.type === "balancing" ? "B" : "R";
  }
  function compactLabel(loop, prefix) {
    const raw = String(loop.label || loop.title || loop.id || "").replace(/^[RB]\d+\s*[—:-]?\s*/i, "").trim();
    if (!raw || raw === loop.id) return "Loop";
    const words = raw.split(/\s+/).slice(0, 4).join(" ");
    return words.length > 22 ? `${words.slice(0, 21)}\u2026` : words;
  }
  function rectanglesIntersect(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }
  function rectangleDistance(a, b) {
    const dx = Math.max(b.left - a.right, a.left - b.right, 0);
    const dy = Math.max(b.top - a.bottom, a.top - b.bottom, 0);
    return Math.hypot(dx, dy);
  }

  // src/annotations/renderer.js
  var AnnotationRenderer = class {
    constructor({ cy, svg, profile, theme }) {
      this.cy = cy;
      this.svg = svg;
      this.profile = profile;
      this.theme = theme;
      this.frame = null;
      this.timer = null;
      this.interacting = false;
      this.view = null;
      this.lastRender = 0;
      this.lastMetrics = { annotationCollisions: 0, hiddenSigns: 0, signCount: 0 };
    }
    getMetrics() {
      return { ...this.lastMetrics };
    }
    setView(view) {
      this.view = view || null;
      this.request();
    }
    setInteraction(active = false) {
      this.interacting = Boolean(active);
      this.request();
    }
    request() {
      if (this.frame) return;
      this.frame = requestAnimationFrame(() => this.render());
    }
    render() {
      this.frame = null;
      this.lastRender = Date.now();
      const { cy, svg } = this;
      if (!cy || cy.destroyed()) return;
      const container = cy.container();
      const width = container.clientWidth;
      const height = container.clientHeight;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.replaceChildren();
      const semantic = semanticProfile(cy, this.profile);
      svg.dataset.zoom = semantic.zoom.toFixed(3);
      svg.dataset.fontSize = semantic.fontSize.toFixed(2);
      const nodeBoxes = cy.nodes().map((node) => {
        const box = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
        return {
          id: node.id(),
          box: { left: box.x1 - 3, right: box.x2 + 3, top: box.y1 - 3, bottom: box.y2 + 3 }
        };
      });
      const labelBoxes = cy.nodes().map((node) => ({
        id: node.id(),
        box: renderedLabelBox(cy, node)
      })).filter((item) => item.box);
      const paths = /* @__PURE__ */ new Map();
      const arrows = [];
      cy.edges().forEach((edge) => {
        paths.set(edge.id(), renderedCurve(edge, this.interacting ? 48 : 120));
        arrows.push({ ...edge.renderedTargetEndpoint(), edgeId: edge.id() });
      });
      const obstacles = overlayBoxes(container);
      const badgeBoxes = renderLoopBadges({
        cy,
        svg,
        view: this.view,
        nodeBoxes,
        labelBoxes,
        paths: [...paths.values()],
        obstacles,
        viewport: { width, height }
      });
      const specs = [];
      const showPolarities = this.view?.settings?.["show-polarities"] !== false;
      if (showPolarities) cy.edges().forEach((edge) => {
        const table = arcLengthTable(paths.get(edge.id()));
        if (table.at(-1).length < 44) return;
        let annotationSide = Number(edge.data("annotationSide"));
        if (annotationSide !== -1 && annotationSide !== 1) {
          annotationSide = chooseSide(edge, table, nodeBoxes, labelBoxes, paths, arrows, semantic);
          edge.data("annotationSide", annotationSide);
        }
        for (const endpoint of ["source", "target"]) {
          const position = anchoredPosition(table, endpoint, semantic.fontSize, annotationSide);
          specs.push({
            edge,
            endpoint,
            sign: edge.data(endpoint === "source" ? "sourceSign" : "targetSign"),
            position,
            box: signBox(position, semantic.fontSize),
            focused: isFocused(edge),
            annotationSide
          });
        }
      });
      specs.sort((a, b) => Number(b.focused) - Number(a.focused));
      const visibleBoxes = [...badgeBoxes];
      let hiddenCount = 0;
      let collisionCount = 0;
      let reflowNeeded = false;
      for (const spec of specs) {
        const collision = collides(spec, visibleBoxes, nodeBoxes, labelBoxes, paths, arrows, semantic);
        const hidden = false;
        if (hidden) hiddenCount++;
        if (collision) collisionCount++;
        if (collision && spec.collisionReason === "other-sign" && !this.reflowed) {
          spec.edge.removeData("annotationSide");
          reflowNeeded = true;
        }
        visibleBoxes.push(spec.box);
        svg.appendChild(createText(spec, semantic, hidden, this.theme, collision));
      }
      svg.dataset.hiddenSigns = String(hiddenCount);
      svg.dataset.polaritiesVisible = String(showPolarities);
      svg.dataset.annotationCollisions = String(collisionCount);
      this.lastMetrics = {
        annotationCollisions: collisionCount,
        hiddenSigns: hiddenCount,
        signCount: specs.length
      };
      if (reflowNeeded) {
        this.reflowed = true;
        this.request();
      } else {
        this.reflowed = false;
      }
    }
    destroy() {
      if (this.frame) cancelAnimationFrame(this.frame);
      if (this.timer) clearTimeout(this.timer);
      this.frame = null;
      this.timer = null;
      this.svg.replaceChildren();
    }
  };
  function overlayBoxes(container) {
    const containerRect = container?.getBoundingClientRect?.();
    if (!containerRect) return [];
    return [".edit-toolbar", ".map-controls"].map((selector) => container.querySelector?.(selector) || document.querySelector(selector)).map((element) => element?.getBoundingClientRect?.()).filter((rect) => rect && rect.width > 0 && rect.height > 0).map((rect) => ({
      left: rect.left - containerRect.left,
      right: rect.right - containerRect.left,
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top
    }));
  }
  function semanticProfile(cy, profile) {
    const zoom = cy.zoom();
    const density = cy.edges().length / Math.max(1, cy.nodes().length);
    const storyMode = document.body.classList.contains("story-mode");
    const baseFontSize = Math.max(
      profile.minimumSignSize,
      Math.min(11.5, 11.5 * zoom / Math.sqrt(Math.max(1, density * 0.82)))
    );
    const fontSize = storyMode ? Math.max(10.5, Math.min(16, 9.5 + zoom * 3.4)) : baseFontSize;
    return {
      zoom,
      fontSize,
      lineClearance: Math.max(4, fontSize * 0.52),
      hideAllUnfocused: zoom < 0.36,
      hideCollisions: !storyMode && (profile.hideCollisions || zoom < 0.72)
    };
  }
  function renderedCurve(edge, steps = 120) {
    const source = edge.renderedSourceEndpoint();
    const target = edge.renderedTargetEndpoint();
    const points = edge.renderedControlPoints();
    const control = points?.[0] || { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
    return Array.from({ length: steps + 1 }, (_, index) => {
      const t = index / steps;
      const mt = 1 - t;
      return {
        x: mt * mt * source.x + 2 * mt * t * control.x + t * t * target.x,
        y: mt * mt * source.y + 2 * mt * t * control.y + t * t * target.y
      };
    });
  }
  function renderedLabelBox(cy, node) {
    const rs = node?._private?.rscratch;
    const width = Number(rs?.labelWidth || 0);
    const height = Number(rs?.labelHeight || 0);
    if (!width || !height || !Number.isFinite(rs?.labelX) || !Number.isFinite(rs?.labelY)) return null;
    const zoom = Number(cy.zoom()) || 1;
    const pan = cy.pan();
    let x = Number(rs.labelX);
    let y = Number(rs.labelY);
    const valign = node.pstyle("text-valign").value;
    if (valign === "top") y -= height;
    else if (valign === "center") y -= height / 2;
    const padding = 3 / zoom;
    return {
      left: (x - width / 2 - padding) * zoom + pan.x,
      right: (x + width / 2 + padding) * zoom + pan.x,
      top: (y - padding) * zoom + pan.y,
      bottom: (y + height + padding) * zoom + pan.y
    };
  }
  function anchoredPosition(table, endpoint, fontSize, side) {
    const total = table.at(-1).length;
    const along = endpoint === "source" ? Math.max(8, Math.min(13, fontSize + 2)) : Math.max(15, Math.min(21, fontSize + 9));
    const sample = pointAtArcDistance(table, endpoint === "source" ? along : total - along);
    const normal = alignedNormal(sample.tangent, chordNormal(table, side));
    const offset = Math.max(6, Math.min(12, fontSize * 0.9));
    return { x: sample.point.x + normal.x * offset, y: sample.point.y + normal.y * offset };
  }
  function chooseSide(edge, table, nodeBoxes, labelBoxes, paths, arrows, profile) {
    return [-1, 1].map((side) => {
      const positions = ["source", "target"].map(
        (endpoint) => anchoredPosition(table, endpoint, profile.fontSize, side)
      );
      const score = positions.reduce((sum, position, index) => sum + staticPenalty(position, edge, index ? "target" : "source", nodeBoxes, labelBoxes, paths, arrows, profile), 0);
      return { side, score };
    }).sort((a, b) => a.score - b.score || b.side - a.side)[0].side;
  }
  function staticPenalty(position, edge, endpoint, nodeBoxes, labelBoxes, paths, arrows, profile) {
    const box = signBox(position, profile.fontSize);
    const ownNodeId = endpoint === "source" ? edge.source().id() : edge.target().id();
    let score = 0;
    nodeBoxes.forEach((node) => {
      if (node.id !== ownNodeId && rectangleIntersects(box, node.box)) score += 1e4;
    });
    labelBoxes.forEach((label) => {
      if (rectangleIntersects(box, label.box)) score += label.id === ownNodeId ? 16e3 : 1e4;
    });
    for (const [otherId, path] of paths) {
      if (otherId === edge.id()) continue;
      const other = edge.cy().getElementById(otherId);
      if (other?.length && sharesEndpoint3(edge, other)) continue;
      const minimum = minimumPathDistance(position, path);
      if (minimum < profile.lineClearance) score += 5e3 + (profile.lineClearance - minimum) * 800;
      if (other?.length) {
        const otherTable = arcLengthTable(path);
        for (const otherEndpoint of ["source", "target"]) {
          const otherPosition = anchoredPosition(otherTable, otherEndpoint, profile.fontSize, sideForEdge(other));
          if (rectangleIntersects(box, signBox(otherPosition, profile.fontSize))) score += 9e3;
        }
      }
    }
    arrows.forEach((arrow) => {
      if (arrow.edgeId === edge.id() && endpoint === "target") return;
      const distance = Math.hypot(position.x - arrow.x, position.y - arrow.y);
      if (distance < profile.fontSize) score += 4e3 + (profile.fontSize - distance) * 500;
    });
    return score;
  }
  function sideForEdge(edge) {
    const side = Number(edge.data("annotationSide"));
    return side === -1 || side === 1 ? side : 1;
  }
  function collides(spec, visibleBoxes, nodeBoxes, labelBoxes, paths, arrows, profile) {
    spec.collisionReason = "";
    if (visibleBoxes.some((box) => rectangleIntersects(spec.box, box))) {
      spec.collisionReason = "other-sign";
      return true;
    }
    const ownNodeId = spec.endpoint === "source" ? spec.edge.source().id() : spec.edge.target().id();
    if (nodeBoxes.some((node) => node.id !== ownNodeId && rectangleIntersects(spec.box, node.box))) {
      spec.collisionReason = "node";
      return true;
    }
    if (labelBoxes.some((label) => rectangleIntersects(spec.box, label.box))) {
      spec.collisionReason = "label";
      return true;
    }
    for (const [otherId, path] of paths) {
      const other = spec.edge.cy().getElementById(otherId);
      if (other?.length && sharesEndpoint3(spec.edge, other)) continue;
      if (other?.length && other.data("routeLocked")) continue;
      if (otherId !== spec.edge.id() && minimumPathDistance(spec.position, path) < profile.lineClearance) {
        spec.collisionReason = `edge:${otherId}`;
        return true;
      }
    }
    const arrowCollision = arrows.some(
      (arrow) => !(arrow.edgeId === spec.edge.id() && spec.endpoint === "target") && Math.hypot(spec.position.x - arrow.x, spec.position.y - arrow.y) < profile.fontSize * 0.9
    );
    if (arrowCollision) spec.collisionReason = "arrow";
    return arrowCollision;
  }
  function sharesEndpoint3(a, b) {
    return a.source().id() === b.source().id() || a.source().id() === b.target().id() || a.target().id() === b.source().id() || a.target().id() === b.target().id();
  }
  function createText(spec, profile, hidden, theme, collision = false) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", spec.position.x.toFixed(2));
    text.setAttribute("y", spec.position.y.toFixed(2));
    text.setAttribute("class", [
      "cld-edge-sign",
      spec.edge.hasClass("balancing-edge") ? "balancing" : "",
      spec.edge.hasClass("story-current") ? "story-current-sign" : ""
    ].filter(Boolean).join(" "));
    text.setAttribute("data-edge-id", spec.edge.id());
    text.setAttribute("data-side", spec.endpoint);
    text.setAttribute("data-annotation-side", String(spec.annotationSide));
    text.setAttribute("data-hidden-by-density", String(hidden));
    text.setAttribute("data-collision", String(collision));
    text.setAttribute("data-collision-reason", spec.collisionReason || "");
    text.setAttribute("font-size", profile.fontSize.toFixed(2));
    text.setAttribute("font-family", theme.annotationFontFamily);
    text.setAttribute("opacity", hidden ? "0" : spec.edge.hasClass("faded") && !spec.focused ? "0.3" : "1");
    text.textContent = spec.sign;
    return text;
  }
  function signBox(position, fontSize) {
    const halfWidth = Math.max(4, fontSize * 0.48);
    const halfHeight = Math.max(5, fontSize * 0.62);
    return {
      left: position.x - halfWidth,
      right: position.x + halfWidth,
      top: position.y - halfHeight,
      bottom: position.y + halfHeight
    };
  }
  function minimumPathDistance(position, path) {
    let minimum = Infinity;
    for (let index = 0; index < path.length - 1; index++) {
      minimum = Math.min(minimum, pointSegmentDistance(position, path[index], path[index + 1]));
    }
    return minimum;
  }
  function isFocused(edge) {
    return edge.selected() || edge.hasClass("focused") || edge.hasClass("annotation-focus") || edge.hasClass("story-current") || edge.source().selected() || edge.target().selected() || edge.source().hasClass("hovered") || edge.target().hasClass("hovered");
  }

  // src/geometry/layoutQuality.js
  function evaluateLayoutQuality(cy, routing = {}, { loopEdgeIds = [] } = {}) {
    const nodes = cy.nodes().toArray();
    const edges = cy.edges().toArray();
    let nodeOverlaps = 0;
    let labelOverlaps = 0;
    let edgeNodeHits = 0;
    let edgeLength = 0;
    let excessiveCurvatureCount = 0;
    let excessiveCurvatureMagnitude = 0;
    const paths = /* @__PURE__ */ new Map();
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].position();
        const b = nodes[j].position();
        const aSize = nodeDimensions2(nodes[i]);
        const bSize = nodeDimensions2(nodes[j]);
        const distance = Math.hypot(b.x - a.x, b.y - a.y);
        const nodeGap = Math.max(92, (aSize.width + bSize.width + aSize.height + bSize.height) / 4 + 16);
        if (distance < nodeGap) nodeOverlaps++;
        if (distance < nodeGap + 10) labelOverlaps++;
      }
    }
    for (const edge of edges) {
      const source = edge.source().position();
      const target = edge.target().position();
      edgeLength += Math.hypot(target.x - source.x, target.y - source.y);
      const distance = Number(edge.data("curveDistance") || 0);
      const chordLength = Math.hypot(target.x - source.x, target.y - source.y) || 1;
      const normalizedCurvature2 = Math.abs(distance) / chordLength;
      if (normalizedCurvature2 > 0.38) {
        excessiveCurvatureCount++;
        excessiveCurvatureMagnitude += normalizedCurvature2 - 0.38;
      }
      const path = curvePolyline(source, target, distance);
      paths.set(edge.id(), path);
      for (const node of nodes) {
        if (node.id() === edge.source().id() || node.id() === edge.target().id()) continue;
        const position = node.position();
        const minimum = Math.min(...path.map((point) => Math.hypot(point.x - position.x, point.y - position.y)));
        const dimensions = nodeDimensions2(node);
        const clearance = Math.max(dimensions.width, dimensions.height) / 2 + 18;
        if (minimum < clearance) edgeNodeHits++;
      }
    }
    const bounds = cy.nodes().boundingBox();
    const shortSide = Math.max(1, Math.min(bounds.w, bounds.h));
    const aspectRatio = Math.max(bounds.w, bounds.h) / shortSide;
    const aspectPenalty = Math.max(0, aspectRatio - 2.1);
    const crossings = Number(routing.crossings || 0);
    const loopCrossings = Number(routing.loopCrossings || 0);
    const lockedCrossings = Number(routing.lockedCrossings || 0);
    const innerLoopCurves = countInnerLoopCurves(cy, loopEdgeIds);
    const loopShapePenalty = measureLoopShape(cy, loopEdgeIds);
    const portMetrics = countPortCongestion(cy, paths);
    const routeDiagnostics = diagnoseRoutes(cy, routing);
    const annotationCollisions = Number(routing.annotationCollisions || 0);
    const metrics = {
      crossings,
      loopCrossings,
      lockedCrossings,
      nodeOverlaps,
      labelOverlaps,
      edgeNodeHits,
      annotationCollisions,
      ambiguousTangencies: Number(routing.closeSegments || 0),
      excessiveCurvatureCount,
      excessiveCurvatureMagnitude: Number(excessiveCurvatureMagnitude.toFixed(3)),
      innerLoopCurves,
      loopShapePenalty,
      portCongestion: portMetrics.portCongestion,
      lockedPortCongestion: portMetrics.lockedPortCongestion,
      minimumEdgeNodeClearance: routeDiagnostics.metrics.minimumEdgeNodeClearance,
      routeExceptionCount: routeDiagnostics.metrics.routeExceptionCount,
      shallowCurvatureCount: routeDiagnostics.metrics.shallowCurvatureCount,
      edgeLength: Math.round(edgeLength),
      aspectRatio: Number(aspectRatio.toFixed(2))
    };
    const scored = { ...metrics, aspectPenalty };
    return {
      ...metrics,
      qualityVector: layoutQualityVector(scored),
      score: scoreLayoutMetrics(scored),
      routeDiagnostics
    };
  }
  function layoutQualityVector(metrics = {}) {
    const hardViolations = Number(metrics.nodeOverlaps || 0) + Number(metrics.edgeNodeHits || 0) + Number(metrics.labelOverlaps || 0) + Number(metrics.annotationCollisions || 0);
    return [
      hardViolations,
      Number(metrics.loopCrossings || 0),
      Number(metrics.edgeNodeHits || 0),
      Number(metrics.labelOverlaps || 0),
      Number(metrics.annotationCollisions || 0),
      Number(metrics.crossings || 0),
      Number(metrics.ambiguousTangencies || metrics.closeSegments || 0),
      Number(metrics.portCongestion || 0),
      Number(metrics.excessiveCurvatureCount || 0),
      Number(metrics.excessiveCurvatureMagnitude || 0),
      Number(metrics.lockedCrossings || 0),
      Number(metrics.loopShapePenalty || 0),
      Number(metrics.edgeLength || 0),
      Number(metrics.aspectPenalty || Math.max(0, Number(metrics.aspectRatio || 1) - 2.1))
    ];
  }
  function compareLayoutQuality(a = {}, b = {}) {
    const left = a.qualityVector || layoutQualityVector(a);
    const right = b.qualityVector || layoutQualityVector(b);
    for (let index = 0; index < Math.max(left.length, right.length); index++) {
      const difference = Number(left[index] || 0) - Number(right[index] || 0);
      if (difference !== 0) return difference;
    }
    return Number(a.score || 0) - Number(b.score || 0);
  }
  function evaluateQualityGate(metrics = {}, { nodeCount = 0, edgeCount = 0, mode = "balanced" } = {}) {
    const reasons = [];
    const hardViolations = Number(metrics.nodeOverlaps || 0) + Number(metrics.edgeNodeHits || 0) + Number(metrics.labelOverlaps || 0) + Number(metrics.annotationCollisions || 0);
    if (hardViolations) reasons.push("hard-collision");
    if (Number(metrics.loopCrossings || 0)) reasons.push("loop-crossing");
    const automaticCrossings = Math.max(
      0,
      Number(metrics.crossings || 0) - Number(metrics.lockedCrossings || 0)
    );
    const crossingBudget = edgeCount <= 12 ? 0 : Math.floor(edgeCount / 24);
    if (automaticCrossings > crossingBudget) reasons.push("edge-crossing");
    const innerLoopBudget = nodeCount > 15 ? 1 : 0;
    if (Number(metrics.innerLoopCurves || 0) > innerLoopBudget) reasons.push("inner-loop-curve");
    if (mode === "publish" && Number(metrics.excessiveCurvatureCount || 0)) {
      reasons.push("excessive-curvature");
    }
    if (nodeCount <= 25 && Number(metrics.portCongestion || 0)) reasons.push("port-congestion");
    return {
      accepted: reasons.length === 0,
      reasons,
      hardViolations,
      automaticCrossings,
      crossingBudget,
      innerLoopBudget
    };
  }
  function scoreLayoutMetrics(metrics) {
    return Number(metrics.loopCrossings || 0) * 35e4 + Number(metrics.crossings || 0) * 1e5 + Number(metrics.edgeNodeHits || 0) * 6e4 + Number(metrics.nodeOverlaps || 0) * 8e4 + Number(metrics.labelOverlaps || 0) * 7e4 + Number(metrics.annotationCollisions || 0) * 65e3 + Number(metrics.innerLoopCurves || 0) * 14e4 + Number(metrics.loopShapePenalty || 0) * 18e3 + Number(metrics.ambiguousTangencies || metrics.closeSegments || 0) * 1400 + Number(metrics.excessiveCurvatureCount || 0) * 42e3 + Number(metrics.excessiveCurvatureMagnitude || 0) * 36e3 + Number(metrics.portCongestion || 0) * 3e4 + Number(metrics.lockedCrossings || 0) * 5e4 + Number(metrics.edgeLength || 0) * 0.35 + Number(metrics.aspectPenalty || Math.max(0, Number(metrics.aspectRatio || 1) - 2.1)) * 25e3;
  }
  function measureLoopShape(cy, loopEdgeIds) {
    let penalty = 0;
    for (const edgeIds of loopEdgeIds) {
      const nodes = /* @__PURE__ */ new Map();
      for (const edgeId of edgeIds) {
        const edge = cy.getElementById(edgeId);
        if (!edge.length) continue;
        nodes.set(edge.source().id(), edge.source());
        nodes.set(edge.target().id(), edge.target());
      }
      if (nodes.size < 3) continue;
      const points = [...nodes.values()].map((node) => node.position());
      const center = points.reduce((sum, point) => ({
        x: sum.x + point.x / points.length,
        y: sum.y + point.y / points.length
      }), { x: 0, y: 0 });
      const radii = points.map((point) => Math.hypot(point.x - center.x, point.y - center.y));
      const meanRadius = radii.reduce((sum, value) => sum + value, 0) / radii.length || 1;
      const radialVariance = radii.reduce((sum, value) => sum + Math.abs(value - meanRadius) / meanRadius, 0) / radii.length;
      const lengths = [...nodes.values()].map((node) => {
        const outgoing = node.outgoers("node").filter((other) => nodes.has(other.id())).first();
        if (!outgoing?.length) return null;
        const a = node.position();
        const b = outgoing.position();
        return Math.hypot(b.x - a.x, b.y - a.y);
      }).filter((value) => Number.isFinite(value));
      const meanLength = lengths.reduce((sum, value) => sum + value, 0) / (lengths.length || 1) || 1;
      const lengthVariance = lengths.reduce((sum, value) => sum + Math.abs(value - meanLength) / meanLength, 0) / (lengths.length || 1);
      penalty += Math.min(8, radialVariance * 2.4 + lengthVariance * 1.6);
    }
    return Number(penalty.toFixed(3));
  }
  function countPortCongestion(cy, paths) {
    let portCongestion = 0;
    let lockedPortCongestion = 0;
    for (const node of cy.nodes()) {
      const directions = node.connectedEdges().map((edge) => {
        const path = paths.get(edge.id());
        if (!path?.length) return null;
        const angle = edge.source().id() === node.id() ? Math.atan2(path[2].y - path[0].y, path[2].x - path[0].x) : (() => {
          const last = path.length - 1;
          return Math.atan2(path[last - 2].y - path[last].y, path[last - 2].x - path[last].x);
        })();
        return { angle, locked: Boolean(edge.data("routeLocked")) };
      }).filter((value) => value !== null).sort((a, b) => a.angle - b.angle);
      if (directions.length < 2) continue;
      const gaps = directions.slice(1).map((entry, index) => ({
        gap: entry.angle - directions[index].angle,
        edges: [entry, directions[index]]
      }));
      gaps.push({ gap: directions[0].angle + Math.PI * 2 - directions.at(-1).angle, edges: [directions[0], directions.at(-1)] });
      for (const { gap, edges } of gaps) {
        if (gap >= 0.18) continue;
        if (edges.every((edge) => edge.locked)) lockedPortCongestion++;
        else portCongestion++;
      }
    }
    return { portCongestion, lockedPortCongestion };
  }
  function countInnerLoopCurves(cy, loopEdgeIds) {
    const allowedSigns = /* @__PURE__ */ new Map();
    for (const edgeIds of loopEdgeIds) {
      const nodes = /* @__PURE__ */ new Map();
      for (const edgeId of edgeIds) {
        const edge = cy.getElementById(edgeId);
        if (!edge.length) continue;
        nodes.set(edge.source().id(), edge.source());
        nodes.set(edge.target().id(), edge.target());
      }
      if (nodes.size < 3) continue;
      const center = [...nodes.values()].reduce((sum, node) => {
        const point = node.position();
        return { x: sum.x + point.x / nodes.size, y: sum.y + point.y / nodes.size };
      }, { x: 0, y: 0 });
      for (const edgeId of edgeIds) {
        const edge = cy.getElementById(edgeId);
        if (!edge.length) continue;
        const source = edge.source().position();
        const target = edge.target().position();
        const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
        const vector = { x: target.x - source.x, y: target.y - source.y };
        const toward = { x: center.x - midpoint.x, y: center.y - midpoint.y };
        const outwardSign = vector.x * toward.y - vector.y * toward.x >= 0 ? -1 : 1;
        if (!allowedSigns.has(edgeId)) allowedSigns.set(edgeId, /* @__PURE__ */ new Set());
        allowedSigns.get(edgeId).add(outwardSign);
      }
    }
    let count = 0;
    for (const [edgeId, signs] of allowedSigns) {
      const edge = cy.getElementById(edgeId);
      const sign = Math.sign(Number(edge.data("curveDistance") || 0));
      if (sign && !signs.has(sign)) count++;
    }
    return count;
  }
  function nodeDimensions2(node) {
    const envelope = node.data("visualEnvelope") || {};
    if (Number(envelope.width) > 0 || Number(envelope.height) > 0) {
      return {
        width: Number(envelope.width) || 90,
        height: Number(envelope.height) || 90
      };
    }
    const style = node.data("style") || {};
    const width = finitePositive2(style.width) || finitePositive2(style.size) || 90;
    const height = finitePositive2(style.height) || finitePositive2(style.size) || 90;
    return { width, height };
  }
  function finitePositive2(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  // src/geometry/overlapRemoval.js
  function removeNodeOverlaps(cy, { iterations = 4, gap = 26 } = {}) {
    let moved = false;
    const nodes = cy.nodes().toArray();
    for (let pass = 0; pass < iterations; pass++) {
      let changed = false;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const aSize = nodeDimensions3(a);
          const bSize = nodeDimensions3(b);
          const overlapX = (aSize.width + bSize.width) / 2 + gap - Math.abs(a.position().x - b.position().x);
          const overlapY = (aSize.height + bSize.height) / 2 + gap - Math.abs(a.position().y - b.position().y);
          if (overlapX <= 0 || overlapY <= 0) continue;
          const aLocked = a.locked();
          const bLocked = b.locked();
          if (aLocked && bLocked) continue;
          const horizontal = overlapX < overlapY;
          const direction = horizontal ? Math.sign(a.position().x - b.position().x) || 1 : Math.sign(a.position().y - b.position().y) || 1;
          const displacement = horizontal ? { x: overlapX / 2 * direction, y: 0 } : { x: 0, y: overlapY / 2 * direction };
          if (!aLocked && !bLocked) {
            a.position({ x: a.position().x + displacement.x, y: a.position().y + displacement.y });
            b.position({ x: b.position().x - displacement.x, y: b.position().y - displacement.y });
          } else if (!aLocked) {
            a.position({ x: a.position().x + displacement.x * 2, y: a.position().y + displacement.y * 2 });
          } else {
            b.position({ x: b.position().x - displacement.x * 2, y: b.position().y - displacement.y * 2 });
          }
          changed = moved = true;
        }
      }
      if (!changed) break;
    }
    return moved;
  }
  function nodeDimensions3(node) {
    const style = node.data("style") || {};
    const width = finitePositive3(style.width) || finitePositive3(style.size) || 90;
    const height = finitePositive3(style.height) || finitePositive3(style.size) || 90;
    return { width, height };
  }
  function finitePositive3(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  // src/performance/interactionMetrics.js
  var InteractionMetrics = class {
    constructor(limit = 120) {
      this.limit = limit;
      this.active = null;
      this.completed = [];
    }
    begin(type, targetId = null) {
      this.active = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        targetId,
        startedAt: now(),
        previews: 0,
        commits: 0,
        cancels: 0,
        frames: 0,
        maxPreviewMs: 0
      };
      return this.active.id;
    }
    preview(startedAt = now()) {
      if (!this.active) return;
      this.active.previews += 1;
      this.active.frames += 1;
      this.active.maxPreviewMs = Math.max(this.active.maxPreviewMs, now() - startedAt);
    }
    finish(status = "commit") {
      if (!this.active) return null;
      if (status === "commit") this.active.commits += 1;
      if (status === "cancel") this.active.cancels += 1;
      const result = {
        ...this.active,
        status,
        durationMs: now() - this.active.startedAt
      };
      this.completed.push(result);
      if (this.completed.length > this.limit) this.completed.shift();
      this.active = null;
      return result;
    }
    snapshot() {
      return {
        active: this.active ? { ...this.active } : null,
        completed: this.completed.map((item) => ({ ...item }))
      };
    }
  };
  function now() {
    return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  }

  // src/geometry/fitViewport.js
  function fitViewportToRect({ boundingBox, rect, padding = 0 } = {}) {
    const source = normalizeBox(boundingBox);
    const target = normalizeRect(rect);
    if (!source || !target) return null;
    const inset = Math.max(0, finiteNumber(padding, 0));
    const width = Math.max(1, target.width - inset * 2);
    const height = Math.max(1, target.height - inset * 2);
    const zoom = Math.min(width / source.width, height / source.height);
    const contentWidth = source.width * zoom;
    const contentHeight = source.height * zoom;
    return {
      zoom,
      pan: {
        x: target.x + inset + (width - contentWidth) / 2 - source.x * zoom,
        y: target.y + inset + (height - contentHeight) / 2 - source.y * zoom
      }
    };
  }
  function clampFitPadding(padding = 0, rect, { minimum = 24, maximumRatio = 0.18 } = {}) {
    const target = normalizeRect(rect);
    const requested = Math.max(0, finiteNumber(padding, 0));
    if (!target || requested === 0) return requested;
    const shortestSide = Math.min(target.width, target.height);
    const readableCap = Math.max(0, Math.min(
      shortestSide / 2 - 1,
      Math.max(minimum, shortestSide * maximumRatio)
    ));
    return Math.min(requested, readableCap);
  }
  function normalizeBox(value) {
    if (!value || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) return null;
    const width = Number(value.width);
    const height = Number(value.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    return { x: Number(value.x), y: Number(value.y), width, height };
  }
  function normalizeRect(value) {
    if (!value || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) return null;
    const width = Number(value.width);
    const height = Number(value.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    return { x: Number(value.x), y: Number(value.y), width, height };
  }
  function finiteNumber(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  // src/CLDEngine.js
  var CLDEngine = class extends EventTarget {
    constructor(options) {
      super();
      if (!options?.container) throw new Error("CLDEngine requires a container.");
      this.container = typeof options.container === "string" ? document.querySelector(options.container) : options.container;
      if (!this.container) throw new Error("CLDEngine container was not found.");
      this.theme = options.theme || matchaTheme;
      this.options = options;
      this.layoutSeed = options.layoutSeed || "trama";
      this.cy = null;
      this.annotations = null;
      this.model = null;
      this.profile = null;
      this.dragFrame = null;
      this.lastCurveCompute = 0;
      this.history = [];
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
      this.loopDiscoveryCache = /* @__PURE__ */ new Map();
      this.interactionMetrics = new InteractionMetrics();
      this.editing = options.editable !== false;
      this.view = options.view || null;
      this.assetResolver = options.assetResolver || (() => null);
      this.mountSurface();
      if (options.model) this.setModel(options.model, { animate: false });
    }
    setModel(input, { animate = false, history = false } = {}) {
      const startedAt = now2();
      if (history && this.model) this.pushHistory(this.currentEditableModel());
      this.model = normalizeModel(input);
      this.loopDiscoveryCache.clear();
      this.layoutSeed = this.options.layoutSeed || this.model.layoutMeta?.seed || this.model.id || "trama";
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
      } else this.relayout({ animate });
      this.emit("modelchange", { model: this.model, profile: this.profile });
      this.metrics.modelSetMs = roundDuration(now2() - startedAt);
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
        const node2 = model.nodes.at(-1);
        const element = this.cy.add({
          data: { ...node2 },
          ...node2.position ? { position: { ...node2.position } } : {}
        });
        if (node2.locked !== void 0) this.setNodeLocked(node2.id, node2.locked);
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
        const node2 = this.cy.getElementById(id);
        const next = model.nodes.find((item) => item.id === id);
        node2.data({ ...node2.data(), ...next });
        if (next.position) node2.position(next.position);
        if (next.locked !== void 0) this.setNodeLocked(id, next.locked);
        applyNodePresentation(node2, { assetResolver: this.assetResolver });
        this.annotations?.request();
        this.emit("modelchange", { model: this.model, profile: this.profile, incremental: true });
      } else {
        this.setModel(model, { animate: false });
      }
      const node = this.model.nodes.find((item) => item.id === (changes.id || id));
      this.emit("modelmutate", { action: "updateNode", id, node, model: this.model });
      return node || null;
    }
    removeNode(id) {
      const existed = this.model?.nodes.some((node) => node.id === id);
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
      const uniqueIds2 = [...new Set(ids)].filter((id) => this.model?.nodes.some((node) => node.id === id));
      if (!uniqueIds2.length) return false;
      const previous = this.currentEditableModel();
      let model = previous;
      for (const id of uniqueIds2) model = removeNodeFromModel(model, id);
      this.pushHistory(previous);
      if (!this.cy) this.setModel(model, { animate: false });
      else {
        this.cy.batch(() => uniqueIds2.forEach((id) => this.cy.remove(this.cy.getElementById(id))));
        this.model = model;
        this.refreshDerivedState();
        this.annotations?.request();
        this.emit("modelchange", { model: this.model, profile: this.profile, incremental: true });
      }
      this.emit("modelmutate", { action: "removeNodes", ids: uniqueIds2, model: this.model });
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
        const edge2 = model.edges.at(-1);
        const element = this.cy.add({
          data: {
            ...edge2,
            route: edge2.route ? { ...edge2.route } : void 0
          },
          classes: edge2.type === "balancing" ? "balancing-edge" : "reinforcing-edge"
        });
        this.setEdgeRoute(edge2.id, Number(edge2.route?.controlPointDistance) || 0, {
          locked: Boolean(edge2.route?.locked),
          reason: edge2.route?.reason || (edge2.route?.locked ? "manual" : "automatic"),
          preview: true
        });
        element.data("routeLocked", Boolean(edge2.route?.locked));
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
        if (changes.sourceSign !== void 0 || changes.targetSign !== void 0) {
          this.loopDiscoveryCache.clear();
        }
        this.profile = resolveDensityProfile(this.model, this.options.densityProfile);
        const edge2 = this.cy.getElementById(id);
        const next = model.edges.find((item) => item.id === id);
        edge2.data({ ...edge2.data(), ...next });
        edge2.toggleClass("balancing-edge", next.type === "balancing");
        edge2.toggleClass("reinforcing-edge", next.type !== "balancing");
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
      const edge = this.model.edges.find((item) => item.id === (changes.id || id));
      this.emit("modelmutate", { action: "updateEdge", id, edge, model: this.model });
      return edge || null;
    }
    removeEdge(id) {
      const existed = this.model?.edges.some((edge) => edge.id === id);
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
      const candidates2 = [];
      const engine = this;
      const nodeCount = engine.cy.nodes().length;
      const attempts = thorough ? Math.max(4, this.profile.layoutAttempts + 1) : this.routeQuality === "draft" ? 0 : Math.min(
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
      const initialBest = candidates2.sort((a, b) => compareLayoutQuality(a.quality, b.quality))[0];
      if (attempts === 0 || isEditoriallyAcceptable(
        initialBest.quality,
        engine.cy.nodes().length,
        engine.cy.edges().length
      )) finish();
      else runAttempt(0);
      function runAttempt(index) {
        if (index === 0 && attempts === 0) return finish();
        const layout = engine.cy.layout({
          name: thorough && (globalThis.__TRAMA_FCOSE__ || globalThis.__LOOPVIEWER_FCOSE__) ? "fcose" : "cose-bilkent",
          quality: thorough ? "proof" : "default",
          // The graph is seeded before entering CoSE. Letting the layout plugin
          // randomize again is the main source of first-load/reload drift.
          randomize: false,
          animate: false,
          fit: false,
          nodeDimensionsIncludeLabels: true,
          ...thorough && (globalThis.__TRAMA_FCOSE__ || globalThis.__LOOPVIEWER_FCOSE__) ? {
            fixedNodeConstraint: engine.cy.nodes().filter((node) => node.locked()).map((node) => ({
              nodeId: node.id(),
              position: { ...node.position() }
            })),
            nodeSeparation: 75
          } : {},
          idealEdgeLength: engine.profile.idealEdgeLength,
          nodeRepulsion: engine.profile.nodeRepulsion,
          edgeElasticity: 0.35,
          nestingFactor: 0.12,
          gravity: 0.12,
          numIter: thorough ? index === attempts - 1 ? 2400 : 1400 : interactiveIterations(engine.cy.nodes().length),
          tile: true
        });
        layout.one("layoutstop", () => {
          removeNodeOverlaps(engine.cy, {
            iterations: thorough ? 8 : 3,
            gap: engine.profile.preferredNodeGap
          });
          evaluateCurrentComposition({ quality: thorough ? engine.routeQuality : "draft" });
          const best = candidates2.sort((a, b) => compareLayoutQuality(a.quality, b.quality))[0];
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
        candidates2.push(captureCandidate(engine.cy, baseRouting, loopEdgeIds));
        const variants = [];
        const allowExpensiveVariants = quality === "publish" || engine.cy.nodes().length <= 25;
        if (skeletonPositions?.size && allowExpensiveVariants) {
          variants.push(buildSkeletonBlendVariant(basePositions, skeletonPositions));
        }
        if (allowExpensiveVariants && !engine.cy.nodes().some((node) => node.locked())) {
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
          candidates2.push(captureCandidate(engine.cy, routing, loopEdgeIds));
        }
        applyPositions(engine.cy, basePositions);
        engine.route({ quality });
      }
      function finish() {
        const best = candidates2.sort((a, b) => compareLayoutQuality(a.quality, b.quality))[0];
        engine.cy.batch(() => {
          for (const node of engine.cy.nodes()) node.position(best.positions.get(node.id()));
          for (const edge of engine.cy.edges()) {
            const distance = best.routes.get(edge.id());
            edge.style({ "control-point-distances": distance, "control-point-weights": 0.5 });
            edge.data("curveDistance", distance);
            edge.data("route", {
              ...edge.data("route") || {},
              controlPointDistance: distance,
              locked: Boolean(edge.data("routeLocked")),
              ...best.routeMeta.get(edge.id()) || {}
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
        engine.emit("layoutend", { routing, candidates: candidates2.map((item) => item.quality) });
      }
    }
    route({ quality = this.routeQuality, respectLocks = true } = {}) {
      if (!this.cy) return null;
      const startedAt = now2();
      const result = optimizeRoutes(this.cy, this.profile, {
        quality,
        respectLocks,
        loopEdgeIds: this.layoutTopology?.loopEdgeIds || []
      });
      result.routeDiagnostics = diagnoseRoutes(this.cy, result);
      result.quality = quality;
      result.durationMs = roundDuration(now2() - startedAt);
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
      const loop = this.getLoops().find((item) => item.id === id) || this.getLoops({ discover: true }).find((item) => item.id === id);
      if (!loop) return false;
      const edges = loop.edgeIds.map((edgeId) => this.cy.getElementById(edgeId)).reduce((collection, edge) => collection.union(edge), this.cy.collection());
      this.applyFocus(edges.union(edges.connectedNodes()));
      return true;
    }
    getLoops({ discover = false, maxLength = 8, maxLoops = 100 } = {}) {
      if (!this.model) return [];
      if (!discover) return this.model.loops.map((loop) => ({
        ...loop,
        edgeIds: [...loop.edgeIds]
      }));
      const key = `${maxLength}:${maxLoops}`;
      const cached = this.loopDiscoveryCache.get(key);
      if (cached) return cached.map((loop) => ({ ...loop, edgeIds: [...loop.edgeIds] }));
      const discovered = discoverLoops(this.model, { maxLength, maxLoops });
      this.loopDiscoveryCache.set(key, discovered);
      return discovered.map((loop) => ({ ...loop, edgeIds: [...loop.edgeIds] }));
    }
    setLoops(loops = []) {
      if (!this.model) return this;
      this.loopDiscoveryCache.clear();
      this.model.loops = loops.map((loop) => ({ ...loop, edgeIds: [...loop.edgeIds] }));
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
      this.cy?.nodes().forEach((node) => applyNodePresentation(node, { assetResolver: this.assetResolver, mediaEnabled }));
      applyMediaEdgeClearance(this.cy, { mediaEnabled });
      this.annotations?.request();
      this.routeAfterIdle(80);
      return this;
    }
    hasCompleteRoutes() {
      return Boolean(this.cy) && this.cy.edges().every(
        (edge) => Number.isFinite(Number(edge.data("route")?.controlPointDistance ?? edge.data("curveDistance")))
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
        ...model.layoutMeta || {},
        algorithmVersion: ROUTING_ALGORITHM_VERSION,
        seed: this.layoutSeed
      };
      if (includePositions) {
        model.nodes = model.nodes.map((node) => {
          const element = this.cy.getElementById(node.id);
          return {
            ...node,
            position: { ...element.position() },
            locked: element.locked()
          };
        });
      }
      if (includeRoutes) {
        model.edges = model.edges.map((edge) => {
          const element = this.cy.getElementById(edge.id);
          return {
            ...edge,
            route: {
              ...element.data("route") || {},
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
        ...edge.data("route") || {},
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
      const startedAt = now2();
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
        ...edge.data("route") || {},
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
        ...edge.data("route") || {},
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
          routes: this.metrics.routes.map((item) => ({ ...item })),
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
      return Boolean(this.cy?.getElementById(id)?.length) && (changes.id === void 0 || changes.id === id);
    }
    canUpdateEdgeIncrementally(id, changes) {
      const current = this.model?.edges.find((edge) => edge.id === id);
      return Boolean(this.cy?.getElementById(id)?.length && current) && (changes.id === void 0 || changes.id === id) && (changes.source === void 0 || changes.source === current.source) && (changes.target === void 0 || changes.target === current.target);
    }
    updateNodes(ids = [], changes = {}) {
      const uniqueIds2 = [...new Set(ids)].filter((id) => this.model?.nodes.some((node) => node.id === id));
      if (!uniqueIds2.length) return [];
      const previous = this.currentEditableModel();
      let model = previous;
      for (const id of uniqueIds2) model = updateNodeInModel(model, id, changes);
      this.pushHistory(previous);
      this.model = model;
      this.profile = resolveDensityProfile(this.model, this.options.densityProfile);
      for (const id of uniqueIds2) {
        const element = this.cy.getElementById(id);
        const next = model.nodes.find((node) => node.id === id);
        element.data({ ...element.data(), ...next });
        if (next.locked !== void 0) this.setNodeLocked(id, next.locked);
        applyNodePresentation(element, { assetResolver: this.assetResolver });
      }
      this.annotations?.request();
      this.emit("modelchange", { model: this.model, profile: this.profile, incremental: true });
      this.emit("modelmutate", { action: "updateNodes", ids: uniqueIds2, nodes: model.nodes.filter((node) => uniqueIds2.includes(node.id)), model });
      return model.nodes.filter((node) => uniqueIds2.includes(node.id));
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
      const uniqueIds2 = [...new Set(ids)].filter((id) => this.cy?.getElementById(id)?.length);
      if (!uniqueIds2.length || !dx && !dy) return false;
      const previous = this.currentEditableModel();
      const positions = new Map(uniqueIds2.map((id) => {
        const position = this.cy.getElementById(id).position();
        return [id, { x: position.x + dx, y: position.y + dy }];
      }));
      this.pushHistory(previous);
      this.model = normalizeModel({
        ...previous,
        nodes: previous.nodes.map((node) => positions.has(node.id) ? { ...node, position: positions.get(node.id) } : node)
      });
      this.cy.batch(() => positions.forEach((position, id) => this.cy.getElementById(id).position(position)));
      this.annotations?.request();
      this.route({ quality: "draft" });
      this.routeAfterIdle(220);
      this.emit("modelmutate", { action: "moveNodes", ids: uniqueIds2, model: this.model });
      return true;
    }
    alignNodes(ids = [], mode = "left") {
      const nodes = [...new Set(ids)].map((id) => this.cy?.getElementById(id)).filter((node) => node?.length);
      if (nodes.length < 2) return false;
      const xs = nodes.map((node) => node.position("x"));
      const ys = nodes.map((node) => node.position("y"));
      const target = mode === "left" ? Math.min(...xs) : mode === "right" ? Math.max(...xs) : mode === "top" ? Math.min(...ys) : mode === "bottom" ? Math.max(...ys) : mode === "center-x" ? xs.reduce((sum, value) => sum + value, 0) / xs.length : ys.reduce((sum, value) => sum + value, 0) / ys.length;
      const previous = this.currentEditableModel();
      this.pushHistory(previous);
      this.cy.batch(() => nodes.forEach((node) => {
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
      const idMap = /* @__PURE__ */ new Map();
      for (const node of previous.nodes.filter((item) => selected.has(item.id))) {
        const duplicate = addNodeToModel(model, {
          ...node,
          id: `${node.id}-copy`,
          label: `${node.label} c\xF3pia`,
          position: node.position ? { x: node.position.x + offset, y: node.position.y + offset } : void 0,
          locked: false
        });
        const added = duplicate.nodes.at(-1);
        idMap.set(node.id, added.id);
        model = duplicate;
      }
      for (const edge of previous.edges.filter((item) => selected.has(item.source) && selected.has(item.target))) {
        model = addEdgeToModel(model, {
          ...edge,
          id: `${edge.id}-copy`,
          source: idMap.get(edge.source),
          target: idMap.get(edge.target),
          route: void 0
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
      let selectionBeforeTap = null;
      cy.selectionType?.(this.selectionMode ? "additive" : "single");
      const snapshotSelection = (event) => {
        const originalEvent = event.originalEvent;
        const additive = originalEvent?.shiftKey || originalEvent?.metaKey || originalEvent?.ctrlKey;
        if (!this.selectionMode && !additive) {
          selectionBeforeTap = null;
          return;
        }
        selectionBeforeTap = cy.elements(":selected").map((element) => element.id());
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
      cy.on("free", "node", (event) => {
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
      cy.on("mouseover", "node", (event) => {
        event.target.addClass("hovered");
        this.annotations.request();
      });
      cy.on("mouseout", "node", (event) => {
        event.target.removeClass("hovered");
        this.annotations.request();
      });
      cy.on("mouseover", "edge", (event) => {
        event.target.addClass("annotation-focus");
        this.annotations.request();
      });
      cy.on("mouseout", "edge", (event) => {
        event.target.removeClass("annotation-focus");
        this.annotations.request();
      });
      cy.on("tap", "node", (event) => {
        const node = event.target;
        const additive = event.originalEvent?.shiftKey || event.originalEvent?.metaKey || event.originalEvent?.ctrlKey;
        const priorSelection = selectionBeforeTap;
        selectionBeforeTap = null;
        if (this.editing || additive || this.selectionMode) {
          if (this.selectionMode || additive) {
            queueMicrotask(() => {
              if (!this.cy) return;
              cy.batch(() => {
                priorSelection?.forEach((id) => cy.getElementById(id).select());
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
          nodeIds: cy.nodes(":selected").map((node) => node.id()),
          edgeIds: cy.edges(":selected").map((edge) => edge.id())
        });
      });
      cy.on("tap", "edge", (event) => {
        const edge = event.target;
        const additive = event.originalEvent?.shiftKey || event.originalEvent?.metaKey || event.originalEvent?.ctrlKey;
        const priorSelection = selectionBeforeTap;
        selectionBeforeTap = null;
        if (this.editing || additive || this.selectionMode) {
          if (this.selectionMode || additive) {
            queueMicrotask(() => {
              if (!this.cy) return;
              cy.batch(() => {
                priorSelection?.forEach((id) => cy.getElementById(id).select());
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
      cy.on("tap", (event) => {
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
      this.cy.nodes().forEach((node) => {
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
  };
  function createCLD(options) {
    return new CLDEngine(options);
  }
  function hasCompletePositions(model) {
    return model.nodes.every(
      (node) => node.position && Number.isFinite(node.position.x) && Number.isFinite(node.position.y)
    );
  }
  function snapshotPositions(cy) {
    return new Map(cy.nodes().toArray().map((node) => [node.id(), { ...node.position() }]));
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
      positions: new Map(cy.nodes().toArray().map((node) => [node.id(), { ...node.position() }])),
      routes: new Map(cy.edges().toArray().map((edge) => [edge.id(), Number(edge.data("curveDistance") || 0)])),
      routeMeta: new Map(cy.edges().toArray().map((edge) => [edge.id(), { ...edge.data("route") || {} }])),
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
      nodes: model.nodes.map((node) => ({
        ...node,
        ...node.position ? { position: { ...node.position } } : {}
      })),
      edges: model.edges.map((edge) => ({
        ...edge,
        ...edge.route ? { route: { ...edge.route } } : {}
      })),
      loops: model.loops.map((loop) => ({ ...loop, edgeIds: [...loop.edgeIds] }))
    };
  }
  function now2() {
    return globalThis.performance?.now?.() ?? Date.now();
  }
  function roundDuration(value) {
    return Math.round(value * 100) / 100;
  }

  // src/presentation/camera.js
  var CAMERA_MODES = /* @__PURE__ */ new Set([
    "fit-map",
    "fit-focus",
    "fit-set",
    "fixed",
    "follow-path",
    "split"
  ]);
  var DEFAULT_CAMERA_MAX_ZOOM = 3.6;
  function normalizeCameraMode(mode) {
    return CAMERA_MODES.has(mode) ? mode : "fit-map";
  }
  function normalizeCamera(input = {}) {
    const source = input && typeof input === "object" ? input : {};
    return {
      ...source,
      mode: normalizeCameraMode(source.mode),
      ...positiveNumber(source.padding) ? { padding: Number(source.padding) } : {},
      ...positiveNumber(source.maxZoom) ? { maxZoom: Number(source.maxZoom) } : {},
      ...positiveNumber(source.zoom) ? { zoom: Number(source.zoom) } : {},
      ...source.pan && Number.isFinite(Number(source.pan.x)) && Number.isFinite(Number(source.pan.y)) ? { pan: { x: Number(source.pan.x), y: Number(source.pan.y) } } : {}
    };
  }
  function resolveCameraPlan(frame = {}, model = {}) {
    const rawCamera = frame.stage?.camera || {};
    const camera = normalizeCamera(rawCamera);
    const resolvedFocus = frame.focus || null;
    const focus = resolvedFocus?.focus && typeof resolvedFocus.focus === "object" ? {
      ...resolvedFocus.focus,
      ...resolvedFocus.nodeIds ? { nodeIds: resolvedFocus.nodeIds } : {},
      ...resolvedFocus.edgeIds ? { edgeIds: resolvedFocus.edgeIds } : {},
      ...resolvedFocus.loopIds ? { loopIds: resolvedFocus.loopIds } : {}
    } : resolvedFocus;
    const loopsById = new Map((model.loops || []).map((loop) => [loop.id, loop]));
    const nodeIds = uniqueIds(focus?.nodeIds || (focus?.nodeId ? [focus.nodeId] : []));
    const edgeIds = uniqueIds(focus?.edgeIds || (focus?.edgeId ? [focus.edgeId] : []));
    const loopIds = uniqueIds(focus?.loopIds || (focus?.loopId ? [focus.loopId] : []));
    for (const loopId of loopIds) {
      for (const edgeId of loopsById.get(loopId)?.edgeIds || []) {
        if (!edgeIds.includes(edgeId)) edgeIds.push(edgeId);
      }
    }
    const hasFocus = nodeIds.length > 0 || edgeIds.length > 0 || loopIds.length > 0;
    const hasAuthoredMode = Object.prototype.hasOwnProperty.call(rawCamera, "mode");
    const mode = camera.mode === "fixed" ? "fixed" : hasAuthoredMode ? camera.mode : hasFocus ? "fit-focus" : "fit-map";
    const kind = focus?.kind || inferKind({ nodeIds, edgeIds, loopIds });
    const targetKind = mode === "follow-path" || kind === "path" ? "path" : mode === "fit-set" || kind === "set" ? "set" : kind === "node" ? "node-neighborhood" : kind === "edge" ? "edge" : kind === "loop" ? "loop" : hasFocus ? "set" : "map";
    return {
      mode,
      targetKind,
      camera,
      focus,
      nodeIds,
      edgeIds,
      loopIds,
      hasFocus,
      isMap: mode === "fit-map" || targetKind === "map",
      maxZoom: camera.maxZoom || DEFAULT_CAMERA_MAX_ZOOM
    };
  }
  function cameraTargetIds(plan = {}) {
    if (plan.isMap || plan.mode === "fixed") return { nodeIds: [], edgeIds: [] };
    return {
      nodeIds: uniqueIds(plan.nodeIds || []),
      edgeIds: uniqueIds(plan.edgeIds || [])
    };
  }
  function collectCameraElements(cy, plan = {}) {
    if (!cy || !plan || plan.mode === "fixed") return null;
    const visible = (item) => item?.length && (typeof item.visible !== "function" || item.visible());
    const add = (collection2, item) => visible(item) ? collection2.union(item) : collection2;
    if (plan.isMap) return cy.elements(":visible");
    let collection = cy.collection();
    if (plan.targetKind === "node-neighborhood") {
      for (const id of plan.nodeIds || []) {
        const node = cy.getElementById(id);
        if (visible(node)) collection = collection.union(node.closedNeighborhood());
      }
      return collection;
    }
    for (const id of plan.edgeIds || []) {
      const edge = cy.getElementById(id);
      if (!visible(edge)) continue;
      collection = add(collection, edge);
      collection = collection.union(edge.connectedNodes().filter(":visible"));
    }
    for (const id of plan.nodeIds || []) {
      const node = cy.getElementById(id);
      collection = add(collection, node);
    }
    return collection;
  }
  function getCameraViewport(cy, plan, { padding = 68, maxZoom, rect = null } = {}) {
    const collection = collectCameraElements(cy, plan);
    if (!collection?.length || typeof cy.getFitViewport !== "function") return null;
    const requestedPadding = plan.camera.padding || padding;
    const effectivePadding = rect ? clampFitPadding(requestedPadding, rect) : requestedPadding;
    const box = collection.boundingBox({ includeLabels: true });
    const viewport = rect ? fitViewportToRect({
      boundingBox: { x: box.x1, y: box.y1, width: box.w, height: box.h },
      rect,
      padding: effectivePadding
    }) : cy.getFitViewport(collection, effectivePadding);
    const cap = maxZoom || plan.maxZoom || DEFAULT_CAMERA_MAX_ZOOM;
    if (!Number.isFinite(viewport?.zoom) || viewport.zoom <= cap) return { viewport, collection };
    const center = { x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2 };
    const targetRect = rect || cy.container?.()?.getBoundingClientRect?.();
    const width = targetRect?.width || (typeof cy.width === "function" ? cy.width() : cy.container()?.clientWidth) || 800;
    const height = targetRect?.height || (typeof cy.height === "function" ? cy.height() : cy.container()?.clientHeight) || 500;
    const offsetX = rect?.x || 0;
    const offsetY = rect?.y || 0;
    return {
      collection,
      viewport: {
        zoom: cap,
        pan: { x: offsetX + width / 2 - center.x * cap, y: offsetY + height / 2 - center.y * cap }
      }
    };
  }
  function inferKind({ nodeIds, edgeIds, loopIds }) {
    if (nodeIds.length) return "node";
    if (edgeIds.length) return "edge";
    if (loopIds.length) return "loop";
    return "custom";
  }
  function uniqueIds(ids = []) {
    return [...new Set(ids.filter((id) => typeof id === "string" && id.length))];
  }
  function positiveNumber(value) {
    return Number.isFinite(Number(value)) && Number(value) > 0;
  }

  // src/presentation/schema.js
  var PRESENTATION_SCHEMA_VERSION = 2;
  var SCENE_TYPES = /* @__PURE__ */ new Set([
    "title",
    "stage",
    "narrative",
    "media",
    "comparison",
    "choice"
  ]);
  var BEAT_TYPES = /* @__PURE__ */ new Set([
    "focus",
    "reveal",
    "traverse",
    "handoff",
    "compare",
    "intervention",
    "consequence",
    "question",
    "custom"
  ]);
  var CHAPTER_ROLES = /* @__PURE__ */ new Set([
    "setup",
    "mechanism",
    "tension",
    "intervention",
    "consequence",
    "synthesis",
    "custom"
  ]);
  var TRANSITIONS = /* @__PURE__ */ new Set(["cut", "dissolve", "slide", "morph-stage"]);
  function normalizePresentation(input = {}) {
    const source = input && typeof input === "object" ? input : {};
    const chapters = Array.isArray(source.chapters) ? source.chapters : legacyScenesToChapters(source.scenes);
    return {
      ...source,
      schemaVersion: PRESENTATION_SCHEMA_VERSION,
      id: source.id || "presentation",
      title: typeof source.title === "string" && source.title.trim() ? source.title : "Nova apresenta\xE7\xE3o",
      summary: typeof source.summary === "string" ? source.summary : "",
      intent: typeof source.intent === "string" ? source.intent : "explain",
      audience: normalizeAudience(source.audience),
      themeId: source.themeId || "matcha-editorial",
      settings: normalizeSettings(source.settings),
      chapters: chapters.map((chapter, chapterIndex) => normalizeChapter(chapter, chapterIndex))
    };
  }
  function normalizeChapter(input = {}, index = 0) {
    const chapter = input && typeof input === "object" ? input : {};
    const role = CHAPTER_ROLES.has(chapter.role) ? chapter.role : "custom";
    return {
      ...chapter,
      id: chapter.id || `chapter-${index + 1}`,
      title: nonEmpty(chapter.title, `Cap\xEDtulo ${index + 1}`),
      role,
      summary: typeof chapter.summary === "string" ? chapter.summary : "",
      scenes: Array.isArray(chapter.scenes) ? chapter.scenes.map((scene, sceneIndex) => normalizeScene(scene, sceneIndex)) : []
    };
  }
  function normalizeScene(input = {}, index = 0) {
    const scene = input && typeof input === "object" ? input : {};
    const type = normalizeSceneType(scene.type);
    return {
      ...scene,
      id: scene.id || `scene-${index + 1}`,
      type,
      title: nonEmpty(scene.title || scene.content?.title, `Cena ${index + 1}`),
      content: normalizeContent(scene.content, scene),
      mapRef: normalizeMapRef(scene.mapRef),
      causalFrame: normalizeCausalFrame(scene.causalFrame),
      stage: normalizeStage(scene.stage),
      transition: normalizeTransition(scene.transition),
      timing: normalizeTiming(scene.timing),
      beats: Array.isArray(scene.beats) ? scene.beats.map((beat, beatIndex) => normalizeBeat(beat, beatIndex)) : []
    };
  }
  function normalizeBeat(input = {}, index = 0) {
    const beat = input && typeof input === "object" ? input : {};
    return {
      ...beat,
      id: beat.id || `beat-${index + 1}`,
      type: BEAT_TYPES.has(beat.type) ? beat.type : "focus",
      title: nonEmpty(beat.title, `Beat ${index + 1}`),
      narrationMd: typeof beat.narrationMd === "string" ? beat.narrationMd : typeof beat.body === "string" ? beat.body : "",
      speakerNotesMd: typeof beat.speakerNotesMd === "string" ? beat.speakerNotesMd : "",
      focus: beat.focus ? normalizeFocus(beat.focus) : void 0,
      delta: normalizeDelta(beat.delta),
      timing: normalizeTiming(beat.timing),
      transition: normalizeBeatTransition(beat.transition)
    };
  }
  function normalizeFocus(input = {}) {
    const focus = input && typeof input === "object" ? input : {};
    const kind = focus.kind || inferFocusKind(focus);
    if (kind === "node") return { kind, nodeId: focus.nodeId };
    if (kind === "edge") return { kind, edgeId: focus.edgeId };
    if (kind === "loop") return { kind, loopId: focus.loopId };
    if (kind === "path") return { kind, edgeIds: [...focus.edgeIds || []] };
    if (kind === "set") return {
      kind,
      nodeIds: [...focus.nodeIds || []],
      edgeIds: [...focus.edgeIds || []],
      loopIds: [...focus.loopIds || []]
    };
    if (kind === "region") return { kind, regionId: focus.regionId };
    if (kind === "query") return { kind, selector: focus.selector || "" };
    return { kind: "custom", ...focus };
  }
  function normalizeStage(input = {}) {
    const stage = input && typeof input === "object" ? input : {};
    return {
      ...stage,
      camera: stage.camera && typeof stage.camera === "object" ? normalizeCamera(stage.camera) : {},
      visibility: normalizeVisibility(stage.visibility),
      emphasis: Array.isArray(stage.emphasis) ? stage.emphasis.map((item) => ({ ...item })) : [],
      annotations: Array.isArray(stage.annotations) ? stage.annotations.map((item) => ({ ...item })) : [],
      flow: stage.flow && typeof stage.flow === "object" ? { ...stage.flow } : void 0,
      contentLayout: stage.contentLayout || void 0,
      themeOverride: stage.themeOverride && typeof stage.themeOverride === "object" ? { ...stage.themeOverride } : void 0,
      interactionPolicy: stage.interactionPolicy && typeof stage.interactionPolicy === "object" ? { ...stage.interactionPolicy } : void 0
    };
  }
  function normalizeDelta(input = {}) {
    const delta = input && typeof input === "object" ? input : {};
    return {
      ...delta,
      reveal: delta.reveal && typeof delta.reveal === "object" ? {
        ...delta.reveal,
        nodeIds: [...delta.reveal.nodeIds || []],
        edgeIds: [...delta.reveal.edgeIds || []],
        loopIds: [...delta.reveal.loopIds || []]
      } : void 0,
      visibility: delta.visibility ? normalizeVisibility(delta.visibility) : void 0,
      emphasis: Array.isArray(delta.emphasis) ? delta.emphasis.map((item) => ({ ...item })) : void 0,
      annotations: Array.isArray(delta.annotations) ? delta.annotations.map((item) => ({ ...item })) : void 0,
      camera: delta.camera && typeof delta.camera === "object" ? normalizeDeltaCamera(delta.camera) : void 0,
      flow: delta.flow && typeof delta.flow === "object" ? { ...delta.flow } : void 0
    };
  }
  function validatePresentation(input, { allowEmpty = true } = {}) {
    const presentation = normalizePresentation(input);
    const errors = [];
    if (!presentation.id) errors.push("Presentation requires an id.");
    if (!presentation.title.trim()) errors.push("Presentation requires a title.");
    if (!Array.isArray(presentation.chapters)) errors.push("Presentation chapters must be an array.");
    const ids = { chapters: /* @__PURE__ */ new Set(), scenes: /* @__PURE__ */ new Set(), beats: /* @__PURE__ */ new Set() };
    for (const chapter of presentation.chapters) {
      if (ids.chapters.has(chapter.id)) errors.push(`Duplicate chapter id: ${chapter.id}.`);
      ids.chapters.add(chapter.id);
      if (!chapter.title.trim()) errors.push(`Chapter ${chapter.id} requires a title.`);
      if (!Array.isArray(chapter.scenes)) errors.push(`Chapter ${chapter.id} scenes must be an array.`);
      for (const scene of chapter.scenes || []) {
        if (ids.scenes.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}.`);
        ids.scenes.add(scene.id);
        if (!SCENE_TYPES.has(scene.type)) errors.push(`Scene ${scene.id} has invalid type.`);
        if (!TRANSITIONS.has(scene.transition.type)) errors.push(`Scene ${scene.id} has invalid transition.`);
        if (!Number.isFinite(scene.timing.durationMs) || scene.timing.durationMs <= 0) {
          errors.push(`Scene ${scene.id} duration must be positive.`);
        }
        for (const beat of scene.beats || []) {
          if (ids.beats.has(beat.id)) errors.push(`Duplicate beat id: ${beat.id}.`);
          ids.beats.add(beat.id);
          if (!BEAT_TYPES.has(beat.type)) errors.push(`Beat ${beat.id} has invalid type.`);
          if (!Number.isFinite(beat.timing.durationMs) || beat.timing.durationMs <= 0) {
            errors.push(`Beat ${beat.id} duration must be positive.`);
          }
          errors.push(...validateFocusShape(beat.focus, beat.id));
        }
      }
    }
    if (!allowEmpty && !presentation.chapters.some((chapter) => chapter.scenes.length)) {
      errors.push("Presentation requires at least one scene.");
    }
    return errors;
  }
  function validateFocusShape(focus, id) {
    if (!focus) return [];
    const errors = [];
    const values = {
      node: Boolean(focus.nodeId),
      edge: Boolean(focus.edgeId),
      loop: Boolean(focus.loopId),
      path: Array.isArray(focus.edgeIds) && focus.edgeIds.length > 0,
      set: Boolean(focus.nodeIds?.length || focus.edgeIds?.length || focus.loopIds?.length),
      region: Boolean(focus.regionId),
      query: Boolean(focus.selector)
    };
    if (!values[focus.kind]) errors.push(`Beat ${id} has an incomplete ${focus.kind} focus.`);
    if (focus.kind === "path" && new Set(focus.edgeIds).size !== focus.edgeIds.length) {
      errors.push(`Beat ${id} path cannot repeat an edge.`);
    }
    return errors;
  }
  function normalizeSettings(settings = {}) {
    const source = settings && typeof settings === "object" ? settings : {};
    return {
      ...source,
      autoplay: Boolean(source.autoplay),
      defaultBeatDurationMs: positive2(source.defaultBeatDurationMs ?? source.default_duration_ms, 5e3),
      allowExplore: source.allowExplore !== false,
      resumeAfterExplore: source.resumeAfterExplore !== false,
      showChapterProgress: source.showChapterProgress !== false,
      reducedMotion: source.reducedMotion || "respect-system",
      // Kept in settings so one authored Presentation V2 can choose a visual
      // player profile without affecting its semantic timeline.
      ...typeof source.presentationStyle === "string" ? { presentationStyle: source.presentationStyle } : {}
    };
  }
  function normalizeAudience(audience = {}) {
    const source = audience && typeof audience === "object" ? audience : {};
    return {
      type: source.type || "general",
      knowledge: source.knowledge || "introductory",
      expectedOutcome: source.expectedOutcome || ""
    };
  }
  function normalizeContent(content = {}, scene = {}) {
    const source = content && typeof content === "object" ? content : {};
    return {
      ...source,
      title: nonEmpty(source.title || scene.title, ""),
      bodyMd: typeof source.bodyMd === "string" ? source.bodyMd : typeof scene.body === "string" ? scene.body : "",
      speakerNotesMd: typeof source.speakerNotesMd === "string" ? source.speakerNotesMd : "",
      caption: typeof source.caption === "string" ? source.caption : "",
      altText: typeof source.altText === "string" ? source.altText : "",
      assetId: source.assetId || scene.assetId || void 0,
      src: source.src || scene.src || void 0
    };
  }
  function normalizeMapRef(ref) {
    if (!ref || typeof ref !== "object") return void 0;
    return { ...ref, mapId: ref.mapId || ref.id, viewId: ref.viewId || void 0 };
  }
  function normalizeCausalFrame(frame) {
    if (!frame || typeof frame !== "object") return void 0;
    return {
      ...frame,
      primaryLoopId: frame.primaryLoopId,
      loopRoles: Array.isArray(frame.loopRoles) ? frame.loopRoles.map((item) => ({ ...item })) : []
    };
  }
  function normalizeVisibility(visibility = {}) {
    const source = visibility && typeof visibility === "object" ? visibility : {};
    return {
      hidden: [...source.hidden || []],
      ghost: [...source.ghost || []],
      context: [...source.context || []],
      focused: [...source.focused || []],
      emphasized: [...source.emphasized || []]
    };
  }
  function normalizeDeltaCamera(camera) {
    const normalized = normalizeCamera(camera);
    if (!Object.prototype.hasOwnProperty.call(camera, "mode")) delete normalized.mode;
    return normalized;
  }
  function normalizeTransition(transition = {}) {
    if (typeof transition === "string") return { type: TRANSITIONS.has(transition) ? transition : "dissolve", durationMs: 320 };
    const source = transition && typeof transition === "object" ? transition : {};
    return { type: TRANSITIONS.has(source.type) ? source.type : "dissolve", durationMs: positive2(source.durationMs, 320) };
  }
  function normalizeBeatTransition(transition = {}) {
    if (typeof transition === "string") return { type: transition };
    return transition && typeof transition === "object" ? { ...transition } : { type: "instant" };
  }
  function normalizeTiming(timing = {}) {
    const source = timing && typeof timing === "object" ? timing : {};
    return {
      durationMs: positive2(source.durationMs ?? source.duration_ms, 5e3),
      advance: source.advance || "manual"
    };
  }
  function normalizeSceneType(type) {
    if (type === "map") return "stage";
    if (type === "text") return "narrative";
    if (type === "image") return "media";
    return SCENE_TYPES.has(type) ? type : "stage";
  }
  function inferFocusKind(focus) {
    if (focus.nodeId) return "node";
    if (focus.edgeId) return "edge";
    if (focus.loopId) return "loop";
    if (focus.edgeIds) return "path";
    if (focus.nodeIds || focus.loopIds) return "set";
    if (focus.regionId) return "region";
    if (focus.selector) return "query";
    return "custom";
  }
  function legacyScenesToChapters(scenes = []) {
    if (!Array.isArray(scenes)) return [];
    return [{ id: "chapter-1", title: "Apresenta\xE7\xE3o", role: "custom", scenes }];
  }
  function nonEmpty(value, fallback) {
    return typeof value === "string" && value.trim() ? value : fallback;
  }
  function positive2(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  // src/presentation/references.js
  function createReferenceContext({ model, maps = [], views = [], assets = [], regions = [], queryResolver } = {}) {
    const rawModel = model || { nodes: [], edges: [], loops: [] };
    const currentModel = withResolvedLoops(rawModel);
    const models = /* @__PURE__ */ new Map();
    if (currentModel.id) models.set(currentModel.id, currentModel);
    for (const map of maps || []) if (map?.id && map.model) models.set(map.id, withResolvedLoops(map.model));
    const viewsById = new Map((views || []).filter(Boolean).map((view) => [view.id, view]));
    const assetsById = new Map((assets || []).filter(Boolean).map((asset) => [asset.id, asset]));
    const suppliedRegions = Array.isArray(regions) ? regions : Object.entries(regions || {}).map(([id, region]) => ({ id, ...region }));
    const modelRegions = Array.isArray(currentModel.regions) ? currentModel.regions : Object.entries(currentModel.regions || {}).map(([id, region]) => ({ id, ...region }));
    const regionsById = new Map([...modelRegions, ...suppliedRegions].filter((region) => region?.id).map((region) => [region.id, region]));
    return { model: currentModel, models, viewsById, assetsById, regionsById, queryResolver };
  }
  function withResolvedLoops(model) {
    if (Array.isArray(model.loops) && model.loops.length) return model;
    const loops = discoverLoops(model, { maxLength: 8, maxLoops: 32 });
    return loops.length ? { ...model, loops } : model;
  }
  function resolveFocus(focusInput, context = {}) {
    const focus = normalizeFocus(focusInput);
    const model = context.model || { nodes: [], edges: [], loops: [] };
    const nodes = new Set((model.nodes || []).map((item) => item.id));
    const edgesById = new Map((model.edges || []).map((item) => [item.id, item]));
    const loopsById = new Map((model.loops || []).map((item) => [item.id, item]));
    const errors = [];
    const nodeIds = [];
    const edgeIds = [];
    const loopIds = [];
    if (focus.kind === "node") {
      if (!nodes.has(focus.nodeId)) errors.push(`Unknown focus node: ${focus.nodeId}.`);
      else nodeIds.push(focus.nodeId);
    } else if (focus.kind === "edge") {
      if (!edgesById.has(focus.edgeId)) errors.push(`Unknown focus edge: ${focus.edgeId}.`);
      else edgeIds.push(focus.edgeId);
    } else if (focus.kind === "loop") {
      const loop = loopsById.get(focus.loopId);
      if (!loop) errors.push(`Unknown focus loop: ${focus.loopId}.`);
      else {
        loopIds.push(loop.id);
        for (const edgeId of loop.edgeIds || []) {
          if (!edgesById.has(edgeId)) errors.push(`Loop ${loop.id} references unknown edge: ${edgeId}.`);
          else edgeIds.push(edgeId);
        }
      }
    } else if (focus.kind === "path") {
      for (const edgeId of focus.edgeIds || []) {
        if (!edgesById.has(edgeId)) errors.push(`Unknown path edge: ${edgeId}.`);
        else edgeIds.push(edgeId);
      }
      errors.push(...validateDirectedPath(edgeIds, edgesById));
    } else if (focus.kind === "set") {
      for (const id of focus.nodeIds || []) {
        if (!nodes.has(id)) errors.push(`Unknown focus node: ${id}.`);
        else nodeIds.push(id);
      }
      for (const id of focus.edgeIds || []) {
        if (!edgesById.has(id)) errors.push(`Unknown focus edge: ${id}.`);
        else edgeIds.push(id);
      }
      for (const id of focus.loopIds || []) {
        if (!loopsById.has(id)) errors.push(`Unknown focus loop: ${id}.`);
        else loopIds.push(id);
      }
    } else if (focus.kind === "query") {
      const result = resolveQuery(focus.selector, model, context);
      errors.push(...result.errors);
      nodeIds.push(...result.nodeIds);
      edgeIds.push(...result.edgeIds);
      loopIds.push(...result.loopIds);
    } else if (focus.kind === "region") {
      const region = context.regionsById?.get(focus.regionId) || (Array.isArray(context.regions) ? context.regions.find((item) => item?.id === focus.regionId) : context.regions?.[focus.regionId]);
      if (!region) errors.push(`Unknown focus region: ${focus.regionId}.`);
      else {
        const result = resolveSetFocus({ kind: "set", ...region }, { nodes, edgesById, loopsById });
        errors.push(...result.errors);
        nodeIds.push(...result.nodeIds);
        edgeIds.push(...result.edgeIds);
        loopIds.push(...result.loopIds);
      }
    }
    return {
      focus,
      nodeIds: [...new Set(nodeIds)],
      edgeIds: [...new Set(edgeIds)],
      loopIds: [...new Set(loopIds)],
      errors
    };
  }
  function resolvePresentationReferences(input, context = {}) {
    const presentation = normalizePresentation(input);
    const errors = [];
    const resolved = [];
    for (const chapter of presentation.chapters) {
      for (const scene of chapter.scenes) {
        if (scene.mapRef?.mapId && context.models?.size && !context.models.has(scene.mapRef.mapId)) {
          errors.push(`Scene ${scene.id} references unknown map: ${scene.mapRef.mapId}.`);
        }
        if (scene.mapRef?.viewId && context.viewsById?.size && !context.viewsById.has(scene.mapRef.viewId)) {
          errors.push(`Scene ${scene.id} references unknown view: ${scene.mapRef.viewId}.`);
        }
        if (scene.content.assetId && context.assetsById?.size && !context.assetsById.has(scene.content.assetId)) {
          errors.push(`Scene ${scene.id} references unknown asset: ${scene.content.assetId}.`);
        }
        const beats = [];
        const sceneContext = scene.mapRef?.mapId && context.models?.get(scene.mapRef.mapId) ? { ...context, model: context.models.get(scene.mapRef.mapId) } : context;
        for (const beat of scene.beats) {
          const focus = beat.focus ? resolveFocus(beat.focus, sceneContext) : null;
          if (focus?.errors?.length) errors.push(...focus.errors.map((error) => `${beat.id}: ${error}`));
          beats.push({ ...beat, resolvedFocus: focus });
        }
        resolved.push({ chapterId: chapter.id, scene: { ...scene, beats } });
      }
    }
    return { presentation, scenes: resolved, errors };
  }
  function resolveSetFocus(focus, { nodes, edgesById, loopsById }) {
    const errors = [];
    const nodeIds = [];
    const edgeIds = [];
    const loopIds = [];
    for (const id of focus.nodeIds || []) {
      if (!nodes.has(id)) errors.push(`Unknown focus node: ${id}.`);
      else nodeIds.push(id);
    }
    for (const id of focus.edgeIds || []) {
      if (!edgesById.has(id)) errors.push(`Unknown focus edge: ${id}.`);
      else edgeIds.push(id);
    }
    for (const id of focus.loopIds || []) {
      if (!loopsById.has(id)) errors.push(`Unknown focus loop: ${id}.`);
      else loopIds.push(id);
    }
    return { errors, nodeIds, edgeIds, loopIds };
  }
  function resolveQuery(selector, model, context) {
    if (typeof context.queryResolver === "function") {
      const custom = context.queryResolver(selector, model);
      if (custom) return normalizeQueryResult(custom);
    }
    const match = String(selector || "").trim().match(/^(node|edge|loop)\s*(?:\[([^\]]+)\])?$/i);
    if (!match) return { errors: [`Unsupported focus query: ${selector}.`], nodeIds: [], edgeIds: [], loopIds: [] };
    const kind = match[1].toLowerCase();
    const predicate = parsePredicate(match[2]);
    if (match[2] && !predicate) return { errors: [`Invalid focus query predicate: ${match[2]}.`], nodeIds: [], edgeIds: [], loopIds: [] };
    const values = kind === "node" ? model.nodes || [] : kind === "edge" ? model.edges || [] : model.loops || [];
    const matching = values.filter((item) => !predicate || predicate(item));
    if (!matching.length) return { errors: [`Focus query matched no ${kind}s: ${selector}.`], nodeIds: [], edgeIds: [], loopIds: [] };
    return {
      errors: [],
      nodeIds: kind === "node" ? matching.map((item) => item.id) : [],
      edgeIds: kind === "edge" ? matching.map((item) => item.id) : [],
      loopIds: kind === "loop" ? matching.map((item) => item.id) : []
    };
  }
  function normalizeQueryResult(result) {
    return {
      errors: result.errors || [],
      nodeIds: [...result.nodeIds || []],
      edgeIds: [...result.edgeIds || []],
      loopIds: [...result.loopIds || []]
    };
  }
  function parsePredicate(source) {
    if (!source) return null;
    const match = String(source).trim().match(/^([\w.-]+)\s*(=|!=|~=)\s*["']?([^"']+?)["']?$/);
    if (!match) return null;
    const [, field, operator, expected] = match;
    return (item) => {
      const actual = readSemanticField(item, field);
      if (operator === "=") return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? "") === expected;
      if (operator === "!=") return String(actual ?? "") !== expected;
      return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? "").toLowerCase().includes(expected.toLowerCase());
    };
  }
  function readSemanticField(item, field) {
    if (field in (item || {})) return item[field];
    if (field in (item?.fields || {})) return item.fields[field];
    if (field === "tag") return item?.tags || [];
    if (field === "type") return item?.type;
    return void 0;
  }
  function validateDirectedPath(edgeIds, edgesById) {
    const errors = [];
    for (let index = 1; index < edgeIds.length; index += 1) {
      const previous = edgesById.get(edgeIds[index - 1]);
      const next = edgesById.get(edgeIds[index]);
      if (previous && next && previous.target !== next.source) {
        errors.push(`Path is not continuous between ${previous.id} and ${next.id}.`);
      }
    }
    return errors;
  }

  // src/presentation/compiler.js
  function compilePresentation(input, context = {}, options = {}) {
    const presentation = normalizePresentation(input);
    const errors = validatePresentation(presentation, { allowEmpty: options.allowEmpty !== false });
    const referenceContext = createReferenceContext(context);
    const references = resolvePresentationReferences(presentation, referenceContext);
    errors.push(...references.errors);
    if (errors.length && options.throwOnError) {
      const error = new Error(`Invalid presentation:
${errors.map((item) => `- ${item}`).join("\n")}`);
      error.name = "PresentationValidationError";
      error.errors = errors;
      throw error;
    }
    const timeline = [];
    let index = 0;
    for (const chapter of presentation.chapters) {
      const chapterScenes = references.scenes.filter((item) => item.chapterId === chapter.id);
      for (const item of chapterScenes) {
        const scene = item.scene;
        const beats = scene.beats.length ? scene.beats : [{
          id: `${scene.id}-entry`,
          type: "focus",
          title: scene.title,
          narrationMd: scene.content.bodyMd,
          focus: void 0,
          delta: {},
          timing: scene.timing,
          transition: { type: "instant" }
        }];
        let stage = cloneStage(scene.stage);
        for (const beat of beats) {
          stage = mergeStage(stage, beat.delta);
          timeline.push({
            index,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            sceneId: scene.id,
            sceneType: scene.type,
            beatId: beat.id,
            scene,
            beat,
            focus: beat.resolvedFocus || (beat.focus ? resolveFocusForCompile(beat.focus, referenceContext) : null),
            stage: cloneStage(stage),
            transition: beat.transition?.type === "instant" ? scene.transition : beat.transition,
            durationMs: beat.timing?.durationMs || scene.timing.durationMs,
            isSceneEntry: beats.length === 1 && beat.id === `${scene.id}-entry`
          });
          index += 1;
        }
      }
    }
    return {
      version: 1,
      presentation,
      timeline,
      errors,
      valid: errors.length === 0
    };
  }
  function mergeStage(base = {}, delta = {}) {
    const next = cloneStage(base);
    if (!delta || typeof delta !== "object") return next;
    if (delta.camera) next.camera = { ...next.camera, ...delta.camera };
    if (delta.visibility) next.visibility = mergeVisibility(next.visibility, delta.visibility);
    if (delta.emphasis) next.emphasis = delta.emphasis.map((item) => ({ ...item }));
    if (delta.annotations) next.annotations = delta.annotations.map((item) => ({ ...item }));
    if (delta.flow) next.flow = { ...next.flow, ...delta.flow };
    if (delta.contentLayout) next.contentLayout = delta.contentLayout;
    if (delta.themeOverride) next.themeOverride = { ...next.themeOverride, ...delta.themeOverride };
    if (delta.interactionPolicy) next.interactionPolicy = { ...next.interactionPolicy, ...delta.interactionPolicy };
    if (delta.reveal) {
      const ids = [
        ...delta.reveal.nodeIds || [],
        ...delta.reveal.edgeIds || [],
        ...delta.reveal.loopIds || []
      ];
      next.visibility.focused = [.../* @__PURE__ */ new Set([...next.visibility.focused || [], ...ids])];
    }
    return next;
  }
  function mergeVisibility(base = {}, delta = {}) {
    const next = { ...base };
    for (const level of ["hidden", "ghost", "context", "focused", "emphasized"]) {
      if (delta[level]) next[level] = [...new Set(delta[level])];
    }
    return next;
  }
  function cloneStage(stage = {}) {
    return {
      ...stage,
      camera: { ...stage.camera || {} },
      visibility: {
        hidden: [...stage.visibility?.hidden || []],
        ghost: [...stage.visibility?.ghost || []],
        context: [...stage.visibility?.context || []],
        focused: [...stage.visibility?.focused || []],
        emphasized: [...stage.visibility?.emphasized || []]
      },
      emphasis: (stage.emphasis || []).map((item) => ({ ...item })),
      annotations: (stage.annotations || []).map((item) => ({ ...item })),
      ...stage.flow ? { flow: { ...stage.flow } } : {},
      ...stage.themeOverride ? { themeOverride: { ...stage.themeOverride } } : {}
    };
  }
  function resolveFocusForCompile(focus, context) {
    return resolvePresentationReferences({ chapters: [{ scenes: [{ id: "compile", beats: [{ id: "focus", focus }] }] }] }, context).scenes[0]?.scene.beats[0]?.resolvedFocus || null;
  }

  // src/presentation/reducer.js
  var INITIAL_PRESENTATION_STATE = Object.freeze({
    status: "idle",
    index: -1,
    exploring: false,
    savedIndex: -1,
    error: null
  });
  function createPresentationState(compiled, initialIndex = 0) {
    const total = compiled?.timeline?.length || 0;
    if (!total) return { ...INITIAL_PRESENTATION_STATE, status: "empty" };
    const index = clamp(initialIndex, 0, total - 1);
    return { ...INITIAL_PRESENTATION_STATE, status: "ready", index, total };
  }
  function reducePresentationState(state, event = {}) {
    const total = state.total || 0;
    if (event.type === "START") return total ? { ...state, status: "playing", index: clamp(event.index ?? state.index, 0, total - 1), error: null } : state;
    if (event.type === "PAUSE") return state.status === "playing" ? { ...state, status: "paused" } : state;
    if (event.type === "RESUME") return state.status === "paused" ? { ...state, status: "playing" } : state;
    if (event.type === "NEXT") return move(state, 1);
    if (event.type === "PREVIOUS") return move(state, -1);
    if (event.type === "GOTO") return total ? { ...state, index: clamp(event.index, 0, total - 1), status: state.status === "idle" ? "ready" : state.status } : state;
    if (event.type === "EXPLORE") return state.status === "playing" || state.status === "paused" ? { ...state, status: "exploring", exploring: true, savedIndex: state.index } : state;
    if (event.type === "RESUME_STORY") return { ...state, status: "playing", exploring: false, index: state.savedIndex >= 0 ? state.savedIndex : state.index };
    if (event.type === "COMPLETE") return { ...state, status: "complete", index: Math.max(0, total - 1) };
    if (event.type === "ERROR") return { ...state, status: "error", error: event.error || "Presentation error." };
    if (event.type === "CLOSE") return { ...INITIAL_PRESENTATION_STATE };
    return state;
  }
  function move(state, direction) {
    if (!state.total || state.status === "exploring") return state;
    const next = state.index + direction;
    if (next < 0 || next >= state.total) return direction > 0 ? { ...state, status: "complete" } : state;
    return { ...state, index: next, status: "playing" };
  }
  function clamp(value, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
  }

  // src/presentation/controller.js
  var PresentationController = class extends EventTarget {
    constructor({ presentation, context = {}, initialIndex = 0, autoplay = false, compiled = null } = {}) {
      super();
      this.context = context;
      this.compiled = compiled?.timeline ? compiled : compilePresentation(presentation, context);
      this.state = createPresentationState(this.compiled, initialIndex);
      this.autoplay = Boolean(autoplay || this.compiled.presentation.settings.autoplay);
      this.continuousPlay = false;
      this.timer = null;
    }
    start(index = this.state.index < 0 ? 0 : this.state.index) {
      this.dispatch({ type: "START", index });
      return this.current();
    }
    next() {
      this.dispatch({ type: "NEXT" });
      return this.current();
    }
    previous() {
      this.dispatch({ type: "PREVIOUS" });
      return this.current();
    }
    goTo(index) {
      this.dispatch({ type: "GOTO", index });
      return this.current();
    }
    pause() {
      this.dispatch({ type: "PAUSE" });
    }
    resume() {
      this.dispatch({ type: "RESUME" });
      if (this.state.status === "playing") this.scheduleAutoplay(this.current());
    }
    toggleContinuousPlay() {
      this.setContinuousPlay(!this.continuousPlay);
    }
    setContinuousPlay(enabled) {
      this.continuousPlay = Boolean(enabled);
      if (this.continuousPlay) {
        if (this.state.status === "paused") this.resume();
        else if (this.state.status === "ready") this.start();
        else if (this.state.status === "complete") this.start(0);
        else this.scheduleAutoplay(this.current());
      } else if (this.state.status === "playing") {
        this.pause();
      }
      this.dispatchEvent(new CustomEvent("playbackchange", {
        detail: { playing: this.continuousPlay && this.state.status === "playing" }
      }));
    }
    explore() {
      this.dispatch({ type: "EXPLORE" });
    }
    resumeStory() {
      this.dispatch({ type: "RESUME_STORY" });
    }
    stop() {
      clearTimeout(this.timer);
      this.dispatch({ type: "CLOSE" });
    }
    current() {
      return this.state.index >= 0 ? this.compiled.timeline[this.state.index] || null : null;
    }
    dispatch(event) {
      clearTimeout(this.timer);
      const previous = this.state;
      this.state = reducePresentationState(this.state, event);
      const current = this.current();
      if (this.state.status === "complete" && previous.status !== "complete") {
        this.dispatchEvent(new CustomEvent("complete", { detail: { state: this.state } }));
      }
      if (current && (previous.index !== this.state.index || event.type === "START" || event.type === "RESUME_STORY")) {
        this.dispatchEvent(new CustomEvent("beatchange", { detail: { state: this.state, frame: current } }));
        this.scheduleAutoplay(current);
      }
      this.dispatchEvent(new CustomEvent("statechange", { detail: { state: this.state, frame: current, event } }));
      if (event.type === "CLOSE") this.dispatchEvent(new CustomEvent("stop", { detail: { state: this.state } }));
    }
    scheduleAutoplay(frame) {
      if (!this.autoplay && !this.continuousPlay || this.state.status !== "playing" || this.state.index >= this.state.total - 1) return;
      const duration = this.continuousPlay ? frame.durationMs : frame.beat.timing?.advance === "auto" ? frame.durationMs : frame.beat.timing?.advance === "manual" ? null : frame.durationMs;
      if (!duration) return;
      this.timer = setTimeout(() => this.next(), duration);
    }
  };

  // src/presentation/migration.js
  function migrateStoryToPresentation(story = {}, model = {}, options = {}) {
    const nodes = new Map((model.nodes || []).map((node) => [node.id, node]));
    const edges = new Map((model.edges || []).map((edge) => [edge.id, edge]));
    const loops = new Map((model.loops || []).map((loop) => [loop.id, loop]));
    const usedIds = /* @__PURE__ */ new Set();
    const scenes = [];
    const sceneByLoop = /* @__PURE__ */ new Map();
    for (const [index, step] of (story.steps || []).entries()) {
      const loopId = loopIdForStep(step, loops, edges);
      let scene = loopId ? sceneByLoop.get(loopId) : null;
      if (!scene) {
        const loop = loopId ? loops.get(loopId) : null;
        const sceneId = uniqueId2(loopId ? `scene-loop-${loopId}` : step.id || `scene-${index + 1}`, usedIds);
        usedIds.add(sceneId);
        scene = {
          id: sceneId,
          type: migrateSceneType(step.type),
          title: loop?.title || step.title || `Cena ${index + 1}`,
          content: {
            title: loop?.title || step.title || `Cena ${index + 1}`,
            bodyMd: step.body || "",
            speakerNotesMd: step.speakerNotesMd || "",
            ...step.src ? { src: step.src } : {},
            ...step.assetId ? { assetId: step.assetId } : {}
          },
          mapRef: model.id ? { mapId: model.id } : void 0,
          stage: {
            ...step.camera ? { camera: { ...step.camera, mode: "fixed" } } : {},
            ...step.reveal ? { visibility: {
              hidden: [],
              ghost: [],
              context: [],
              focused: [
                ...step.reveal.nodeIds || [],
                ...step.reveal.edgeIds || []
              ],
              emphasized: []
            } } : {}
          },
          transition: step.transition || "dissolve",
          timing: { durationMs: step.duration_ms || story.default_duration_ms || 5e3, advance: story.autoplay ? "auto" : "manual" },
          beats: []
        };
        if (loopId) {
          scene.causalFrame = { primaryLoopId: loopId };
          sceneByLoop.set(loopId, scene);
        }
        scenes.push(scene);
      }
      const alreadyExpandedLoop = loopId && scene.beats.some((beat) => beat.causalFrame?.loopId === loopId);
      if (!alreadyExpandedLoop || !step.focus?.loopId) {
        scene.beats.push(...migrateBeats(step, { nodes, edges, loops, usedIds, preserveLegacyExpansion: options.preserveLegacyExpansion !== false }));
      }
    }
    return normalizePresentation({
      schemaVersion: 2,
      id: options.id || `${model.id || "diagram"}-presentation`,
      title: story.title || model.title || "Apresenta\xE7\xE3o",
      summary: options.summary || model.description || "",
      intent: options.intent || "explain",
      settings: {
        autoplay: Boolean(story.autoplay),
        defaultBeatDurationMs: story.default_duration_ms || 5e3
      },
      chapters: [{
        id: "chapter-1",
        title: options.chapterTitle || "Apresenta\xE7\xE3o",
        role: "custom",
        scenes
      }]
    });
  }
  function loopIdForStep(step, loops, edges) {
    if (step.focus?.loopId && loops.has(step.focus.loopId)) return step.focus.loopId;
    if (!step.focus?.edgeId) return null;
    const matches = [...loops.values()].filter((loop) => (loop.edgeIds || []).includes(step.focus.edgeId));
    return matches.length === 1 ? matches[0].id : null;
  }
  function promoteLegacyModel(model, options = {}) {
    return migrateStoryToPresentation(model?.story || {}, model, options);
  }
  function migrateBeats(step, { nodes, edges, loops, usedIds, preserveLegacyExpansion }) {
    const focus = step.focus;
    if (!focus) return [];
    if (focus.edgeId) {
      return [createBeat(step, {
        id: uniqueId2(`${step.id || "scene"}-${focus.edgeId}`, usedIds),
        type: "focus",
        focus: { kind: "edge", edgeId: focus.edgeId },
        edge: edges.get(focus.edgeId)
      }, usedIds)];
    }
    if (focus.loopId) {
      const loop = loops.get(focus.loopId);
      if (!loop || !preserveLegacyExpansion) {
        return [createBeat(step, {
          id: uniqueId2(`${step.id || "scene"}-loop`, usedIds),
          type: "focus",
          focus: { kind: "loop", loopId: focus.loopId }
        }, usedIds)];
      }
      return loop.edgeIds.map((edgeId, index) => createBeat({ ...step, body: "" }, {
        id: uniqueId2(`${step.id || "scene"}-${edgeId}`, usedIds),
        type: "traverse",
        title: edgeTitle(edges.get(edgeId), index),
        focus: { kind: "edge", edgeId },
        edge: edges.get(edgeId),
        loopId: focus.loopId
      }, usedIds));
    }
    if (focus.nodeId) {
      const connected = modelEdges(nodes, edges, focus.nodeId);
      if (!connected.length || !preserveLegacyExpansion) {
        return [createBeat(step, {
          id: uniqueId2(`${step.id || "scene"}-${focus.nodeId}`, usedIds),
          type: "focus",
          focus: { kind: "node", nodeId: focus.nodeId }
        }, usedIds)];
      }
      return connected.map((edge, index) => createBeat(step, {
        id: uniqueId2(`${step.id || "scene"}-${edge.id}`, usedIds),
        type: "focus",
        title: edgeTitle(edge, index),
        focus: { kind: "edge", edgeId: edge.id },
        edge
      }, usedIds));
    }
    return [];
  }
  function createBeat(step, data, usedIds) {
    const edgeDescription = data.edge?.description || "";
    const id = data.id;
    usedIds.add(id);
    return {
      id,
      type: data.type || "focus",
      title: data.title || step.title || "Foco",
      narrationMd: step.body || edgeDescription,
      focus: data.focus,
      ...data.loopId ? { causalFrame: { loopId: data.loopId } } : {},
      timing: { durationMs: step.duration_ms || 5e3, advance: "manual" },
      transition: { type: step.transition || "fade" }
    };
  }
  function modelEdges(nodes, edges, nodeId) {
    return [...edges.values()].filter((edge) => edge.source === nodeId || edge.target === nodeId);
  }
  function edgeTitle(edge, index) {
    if (!edge) return `Rela\xE7\xE3o ${index + 1}`;
    return `${edge.source} \u2192 ${edge.target}`;
  }
  function migrateSceneType(type) {
    if (type === "title") return "title";
    if (type === "text") return "narrative";
    if (type === "image") return "media";
    return "stage";
  }
  function uniqueId2(base, used) {
    const root = String(base || "item").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "item";
    let id = root;
    let suffix = 2;
    while (used.has(id)) id = `${root}-${suffix++}`;
    return id;
  }

  // src/presentation/director.js
  function analyzeTopology(model = {}, options = {}) {
    const loops = usableLoops(model, options);
    const selectedIds = options.loopIds?.length ? new Set(options.loopIds) : new Set(loops.map((loop) => loop.id));
    const selected = loops.filter((loop) => selectedIds.has(loop.id));
    const nodeToLoops = /* @__PURE__ */ new Map();
    const edgeToLoops = /* @__PURE__ */ new Map();
    for (const loop of selected) {
      for (const nodeId of loop.nodeIds || []) addToIndex(nodeToLoops, nodeId, loop.id);
      for (const edgeId of loop.edgeIds || []) addToIndex(edgeToLoops, edgeId, loop.id);
    }
    const handoffs = [];
    for (let leftIndex = 0; leftIndex < selected.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < selected.length; rightIndex += 1) {
        const left = selected[leftIndex];
        const right = selected[rightIndex];
        const sharedNodes = intersect(left.nodeIds, right.nodeIds);
        const sharedEdges = intersect(left.edgeIds, right.edgeIds);
        if (!sharedNodes.length && !sharedEdges.length) continue;
        handoffs.push({
          fromLoopId: left.id,
          toLoopId: right.id,
          sharedNodeIds: sharedNodes,
          sharedEdgeIds: sharedEdges,
          strength: sharedEdges.length ? 2 : 1,
          rationale: sharedEdges.length ? "Os loops compartilham uma rela\xE7\xE3o causal; a transi\xE7\xE3o pode seguir a mesma aresta." : "Os loops compartilham uma vari\xE1vel; ela funciona como ponte editorial."
        });
      }
    }
    const order = orderLoops(selected, handoffs, options.primaryLoopId);
    const path = options.pathEdgeIds?.length ? [...options.pathEdgeIds] : inferBridgePath(model, order, handoffs);
    return {
      loops: selected,
      order,
      handoffs,
      path,
      nodeToLoops: Object.fromEntries([...nodeToLoops].map(([id, ids]) => [id, [...ids]])),
      edgeToLoops: Object.fromEntries([...edgeToLoops].map(([id, ids]) => [id, [...ids]]))
    };
  }
  function suggestPresentation(model = {}, options = {}) {
    const topology = analyzeTopology(model, options);
    const used = /* @__PURE__ */ new Set();
    const chapters = [];
    const selected = topology.order;
    const title = options.title || `${model.title || "Mapa causal"} \xB7 uma hist\xF3ria`;
    const setupScene = {
      id: unique("scene-setup", used),
      type: "title",
      title: options.setupTitle || "O sistema em movimento",
      content: {
        title: options.setupTitle || "O sistema em movimento",
        bodyMd: options.setupNarration || model.description || "Vamos seguir as for\xE7as que mant\xEAm este sistema em movimento."
      },
      mapRef: model.id ? { mapId: model.id } : void 0,
      stage: { camera: { mode: "fit-map" } },
      beats: [{
        id: unique("beat-setup", used),
        type: "focus",
        title: options.setupTitle || "O sistema em movimento",
        narrationMd: options.setupNarration || model.description || "Vamos seguir as for\xE7as que mant\xEAm este sistema em movimento.",
        timing: { durationMs: 5e3, advance: "manual" }
      }]
    };
    const setup = { id: unique("chapter-setup", used), title: "Orienta\xE7\xE3o", role: "setup", scenes: [setupScene] };
    chapters.push(setup);
    const mechanismScenes = [];
    selected.forEach((loop, index) => {
      const edgeIds = loop.edgeIds || [];
      const beats = edgeIds.map((edgeId, edgeIndex) => ({
        id: unique(`beat-${loop.id}-${edgeId}`, used),
        type: "traverse",
        title: edgeTitle2(model, edgeId, edgeIndex),
        narrationMd: model.edges?.find((edge) => edge.id === edgeId)?.description || "Siga esta rela\xE7\xE3o para ver o mecanismo do loop.",
        focus: { kind: "edge", edgeId },
        movement: (() => {
          const edge = model.edges?.find((item) => item.id === edgeId);
          return edge ? { kind: "relation", edgeId, sourceNodeId: edge.source, targetNodeId: edge.target } : void 0;
        })(),
        delta: { reveal: { edgeIds: [edgeId] } },
        timing: { durationMs: options.beatDurationMs || 4200, advance: "manual" }
      }));
      mechanismScenes.push({
        id: unique(`scene-loop-${loop.id}`, used),
        type: "stage",
        title: loop.label || `Loop ${index + 1}`,
        content: {
          title: loop.label || `Loop ${index + 1}`,
          bodyMd: loop.description || `Este loop \xE9 um feedback ${loop.type === "reinforcing" ? "positivo" : "negativo"}.`
        },
        mapRef: model.id ? { mapId: model.id } : void 0,
        causalFrame: { primaryLoopId: loop.id, loopRoles: [{ loopId: loop.id, role: index === 0 ? "motor" : "side-effect" }] },
        stage: { camera: { mode: "fit-focus" }, visibility: { focused: [loop.id, ...edgeIds] } },
        beats: beats.length ? beats : [{
          id: unique(`beat-${loop.id}-entry`, used),
          type: "focus",
          title: loop.label || `Loop ${index + 1}`,
          narrationMd: loop.description || "Observe como este ciclo se mant\xE9m.",
          focus: { kind: "loop", loopId: loop.id },
          timing: { durationMs: 5e3, advance: "manual" }
        }]
      });
      if (options.includeHandoffScenes === true && index < selected.length - 1) {
        const handoff = topology.handoffs.find((item) => item.fromLoopId === loop.id && item.toLoopId === selected[index + 1].id);
        if (handoff) {
          const bridgeId = handoff.sharedEdgeIds[0] || handoff.sharedNodeIds[0];
          const focus = handoff.sharedEdgeIds.length ? { kind: "edge", edgeId: bridgeId } : { kind: "node", nodeId: bridgeId };
          mechanismScenes.push({
            id: unique(`scene-handoff-${loop.id}-${selected[index + 1].id}`, used),
            type: "stage",
            title: "A ponte entre os loops",
            content: {
              title: "A ponte entre os loops",
              bodyMd: handoff.rationale
            },
            mapRef: model.id ? { mapId: model.id } : void 0,
            stage: { camera: { mode: "fit-focus" } },
            beats: [{
              id: unique(`beat-handoff-${loop.id}-${selected[index + 1].id}`, used),
              type: "handoff",
              title: "A ponte entre os loops",
              narrationMd: handoff.rationale,
              focus,
              timing: { durationMs: 4200, advance: "manual" }
            }]
          });
        }
      }
    });
    chapters.push({ id: unique("chapter-mechanism", used), title: "O mecanismo", role: "mechanism", scenes: mechanismScenes });
    const synthesisFocus = selected.length > 1 ? { kind: "set", loopIds: selected.map((loop) => loop.id) } : selected[0] ? { kind: "loop", loopId: selected[0].id } : void 0;
    chapters.push({
      id: unique("chapter-synthesis", used),
      title: "O que fica",
      role: "synthesis",
      scenes: [{
        id: unique("scene-synthesis", used),
        type: "narrative",
        title: options.synthesisTitle || "A leitura do sistema",
        content: {
          title: options.synthesisTitle || "A leitura do sistema",
          bodyMd: options.synthesisNarration || "O resultado n\xE3o est\xE1 em uma rela\xE7\xE3o isolada, mas no padr\xE3o que emerge quando os loops se alimentam.",
          speakerNotesMd: "Retome a ponte entre os loops e nomeie a alavanca mais promissora."
        },
        mapRef: model.id ? { mapId: model.id } : void 0,
        stage: { camera: { mode: "fit-map" } },
        beats: [{
          id: unique("beat-synthesis", used),
          type: "consequence",
          title: options.synthesisTitle || "A leitura do sistema",
          narrationMd: options.synthesisNarration || "O resultado n\xE3o est\xE1 em uma rela\xE7\xE3o isolada, mas no padr\xE3o que emerge quando os loops se alimentam.",
          focus: synthesisFocus,
          timing: { durationMs: 6e3, advance: "manual" }
        }]
      }]
    });
    return normalizePresentation({
      schemaVersion: 2,
      id: options.id || `${model.id || "map"}-presentation-draft`,
      title,
      summary: options.summary || "Rascunho criado a partir da topologia do mapa.",
      intent: options.intent || "explain",
      audience: options.audience,
      settings: { autoplay: false, allowExplore: true },
      chapters,
      director: {
        generated: true,
        version: 1,
        rationale: {
          loopOrder: selected.map((loop) => ({ loopId: loop.id, reason: "Ordenado por conectividade e papel estrutural no grafo." })),
          handoffs: topology.handoffs,
          path: topology.path
        }
      }
    });
  }
  function repairGeneratedPresentation(presentation, model = {}) {
    if (!presentation?.director?.generated) return presentation;
    const loops = usableLoops(model, {});
    const edgeToLoopIds = /* @__PURE__ */ new Map();
    for (const loop of loops) for (const edgeId of loop.edgeIds || []) {
      if (!edgeToLoopIds.has(edgeId)) edgeToLoopIds.set(edgeId, []);
      edgeToLoopIds.get(edgeId).push(loop.id);
    }
    let changed = false;
    const chapters = (presentation.chapters || []).map((chapter) => {
      if (chapter.role !== "mechanism") return chapter;
      const scenes = [];
      for (const scene of chapter.scenes || []) {
        const explicitLoopId = scene.causalFrame?.primaryLoopId;
        const beatEdgeId = scene.beats?.length === 1 ? scene.beats[0]?.focus?.edgeId : null;
        const inferredLoopId = explicitLoopId || (edgeToLoopIds.get(beatEdgeId)?.length === 1 ? edgeToLoopIds.get(beatEdgeId)[0] : null);
        const previous = scenes.at(-1);
        const previousLoopId = previous?.causalFrame?.primaryLoopId;
        if (inferredLoopId && previous && previousLoopId === inferredLoopId && scene.beats?.length === 1 && previous.beats?.length) {
          scenes[scenes.length - 1] = { ...previous, beats: [...previous.beats, ...scene.beats] };
          changed = true;
          continue;
        }
        scenes.push(inferredLoopId && !explicitLoopId ? { ...scene, causalFrame: { ...scene.causalFrame || {}, primaryLoopId: inferredLoopId } } : scene);
      }
      return scenes.length === (chapter.scenes || []).length && !changed ? chapter : { ...chapter, scenes };
    });
    return changed ? normalizePresentation({
      ...presentation,
      chapters,
      director: { ...presentation.director, repaired: true, repairVersion: 1 }
    }) : presentation;
  }
  function usableLoops(model, options) {
    const curated = Array.isArray(model.loops) ? model.loops.filter((loop) => loop?.id && (loop.edgeIds || []).length) : [];
    const loops = curated.length ? curated : discoverLoops(model, { maxLength: options.maxLength || 8, maxLoops: options.maxLoops || 24 });
    return loops.filter((loop) => loop?.id && (loop.edgeIds || []).length);
  }
  function orderLoops(loops, handoffs, primaryLoopId) {
    if (!loops.length) return [];
    const byId2 = new Map(loops.map((loop) => [loop.id, loop]));
    const scores = new Map(loops.map((loop) => [loop.id, (loop.edgeIds || []).length + (loop.nodeIds || []).length * 0.2]));
    if (primaryLoopId && byId2.has(primaryLoopId)) scores.set(primaryLoopId, scores.get(primaryLoopId) + 1e3);
    const result = [];
    const remaining = new Set(loops.map((loop) => loop.id));
    let next = [...remaining].sort((a, b) => scores.get(b) - scores.get(a) || a.localeCompare(b))[0];
    while (next) {
      result.push(byId2.get(next));
      remaining.delete(next);
      const candidates2 = handoffs.filter((item) => item.fromLoopId === next && remaining.has(item.toLoopId)).sort((a, b) => b.strength - a.strength || a.toLoopId.localeCompare(b.toLoopId));
      next = candidates2[0]?.toLoopId || [...remaining].sort((a, b) => scores.get(b) - scores.get(a) || a.localeCompare(b))[0];
    }
    return result;
  }
  function inferBridgePath(model, order, handoffs) {
    const edges = [];
    for (const handoff of handoffs) {
      if (!order.some((loop) => loop.id === handoff.fromLoopId) || !order.some((loop) => loop.id === handoff.toLoopId)) continue;
      if (handoff.sharedEdgeIds[0]) edges.push(handoff.sharedEdgeIds[0]);
    }
    return edges.filter((id) => model.edges?.some((edge) => edge.id === id));
  }
  function edgeTitle2(model, edgeId, index) {
    const edge = model.edges?.find((item) => item.id === edgeId);
    const source = model.nodes?.find((node) => node.id === edge?.source)?.label || edge?.source;
    const target = model.nodes?.find((node) => node.id === edge?.target)?.label || edge?.target;
    return edge ? `${source} \u2192 ${target}` : `Rela\xE7\xE3o ${index + 1}`;
  }
  function addToIndex(index, key, value) {
    if (!index.has(key)) index.set(key, /* @__PURE__ */ new Set());
    index.get(key).add(value);
  }
  function intersect(left = [], right = []) {
    const other = new Set(right);
    return [...new Set(left)].filter((value) => other.has(value));
  }
  function unique(base, used) {
    let id = base;
    let index = 2;
    while (used.has(id)) id = `${base}-${index++}`;
    used.add(id);
    return id;
  }

  // src/presentation/lint.js
  var SEVERITY_RANK = { error: 3, warning: 2, info: 1 };
  function lintPresentation(input, context = {}, options = {}) {
    const presentation = normalizePresentation(input);
    const findings = [];
    const compiled = compilePresentation(presentation, context, { allowEmpty: false });
    compiled.errors.forEach((message, index) => findings.push({
      id: `structural-${index + 1}`,
      category: "structural",
      severity: "error",
      message,
      location: locateByMessage(presentation, message)
    }));
    runCausalRules(presentation, context, findings);
    runNarrativeRules(presentation, findings);
    runVisualRules(presentation, findings, options);
    runAccessibilityRules(presentation, findings);
    const ordered = findings.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.id.localeCompare(b.id));
    const scores = scoreFindings(ordered);
    return {
      presentation,
      compiled,
      findings: ordered,
      errors: ordered.filter((item) => item.severity === "error"),
      warnings: ordered.filter((item) => item.severity === "warning"),
      valid: !ordered.some((item) => item.severity === "error"),
      scores,
      safeFixes: ordered.filter((item) => item.safeFix)
    };
  }
  function hasBlockingLint(findings = []) {
    return findings.some((item) => item.severity === "error");
  }
  function applyLintFix(presentation, finding2) {
    if (!finding2?.safeFix) return normalizePresentation(presentation);
    const next = clone(presentation);
    const path = String(finding2.safeFix.field || "").split(".").filter(Boolean);
    if (!path.length) return normalizePresentation(next);
    let target = findLocationTarget(next, finding2.location);
    if (!target) return normalizePresentation(next);
    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      target = target[key];
    }
    target[path.at(-1)] = finding2.safeFix.value;
    return normalizePresentation(next);
  }
  function applyLintFixes(presentation, findings = []) {
    return findings.filter((item) => item?.safeFix).reduce((current, finding2) => applyLintFix(current, finding2), presentation);
  }
  function runCausalRules(presentation, context, findings) {
    const model = createReferenceContext(context).model;
    const loopIds = new Set((model.loops || []).map((loop) => loop.id));
    const edgeIds = new Set((model.edges || []).map((edge) => edge.id));
    forEachBeat(presentation, (beat, scene, chapter) => {
      const focus = beat.focus;
      if (focus?.kind === "loop" && !loopIds.has(focus.loopId)) return;
      if (focus?.kind === "path") {
        for (let index = 1; index < focus.edgeIds.length; index += 1) {
          const previous = model.edges?.find((edge) => edge.id === focus.edgeIds[index - 1]);
          const next = model.edges?.find((edge) => edge.id === focus.edgeIds[index]);
          if (previous && next && previous.target !== next.source) findings.push(finding(
            "causal-path-disconnected",
            "causal",
            "error",
            `O caminho do beat \u201C${beat.title}\u201D salta de ${previous.target} para ${next.source}.`,
            chapter,
            scene,
            beat
          ));
        }
      }
      if (focus?.kind === "set" && !focus.loopIds?.length && !focus.nodeIds?.length && !focus.edgeIds?.length) {
        findings.push(finding("causal-empty-set", "causal", "error", "O conjunto focal precisa conter ao menos um elemento.", chapter, scene, beat));
      }
      if (focus?.kind === "path" && focus.edgeIds.some((id) => !edgeIds.has(id))) {
        findings.push(finding("causal-stale-path", "causal", "error", "O caminho cont\xE9m uma rela\xE7\xE3o removida do mapa.", chapter, scene, beat));
      }
      if (beat.type === "intervention" && !beat.intervention && !beat.focus) {
        findings.push(finding("causal-intervention-target", "causal", "error", "Uma interven\xE7\xE3o precisa declarar o alvo que ser\xE1 alterado.", chapter, scene, beat));
      }
    });
  }
  function runNarrativeRules(presentation, findings) {
    const scenes = allScenes(presentation);
    if (!scenes.length) return;
    const hasSetup = scenes.some(({ chapter }) => chapter.role === "setup" || chapter.role === "custom" && scenes[0]?.scene === scenes.find((item) => item.scene.type === "title")?.scene);
    if (!hasSetup) findings.push({
      id: "narrative-no-setup",
      category: "narrative",
      severity: "warning",
      message: "A apresenta\xE7\xE3o come\xE7a sem uma orienta\xE7\xE3o clara do sistema.",
      location: { chapterId: scenes[0].chapter.id, sceneId: scenes[0].scene.id }
    });
    const hasSynthesis = scenes.some(({ chapter, scene }) => chapter.role === "synthesis" || scene.type === "comparison" || scene.beats.some((beat) => beat.type === "consequence"));
    if (!hasSynthesis) findings.push({
      id: "narrative-no-synthesis",
      category: "narrative",
      severity: "warning",
      message: "Inclua uma s\xEDntese ou consequ\xEAncia para fechar a leitura.",
      location: { chapterId: scenes.at(-1).chapter.id, sceneId: scenes.at(-1).scene.id }
    });
    const introductions = /* @__PURE__ */ new Set();
    forEachBeat(presentation, (beat, scene, chapter) => {
      if (!beat.focus) return;
      for (const id of [...beat.focus.nodeIds || [], ...beat.focus.edgeIds || [], ...beat.focus.loopIds || []]) {
        if (introductions.has(id)) continue;
        introductions.add(id);
        if (!beat.narrationMd?.trim() && scene.type !== "title") findings.push(finding(
          "narrative-empty-introduction",
          "narrative",
          "warning",
          "O primeiro beat que introduz este elemento n\xE3o tem narra\xE7\xE3o.",
          chapter,
          scene,
          beat
        ));
      }
    });
  }
  function runVisualRules(presentation, findings, options) {
    const maxFocus = options.maxFocusItems || 14;
    forEachBeat(presentation, (beat, scene, chapter) => {
      const count = (beat.focus?.nodeIds?.length || 0) + (beat.focus?.edgeIds?.length || 0) + (beat.focus?.loopIds?.length || 0);
      if (count > maxFocus) findings.push(finding(
        "visual-overloaded-focus",
        "visual",
        "warning",
        `Este beat enfatiza ${count} elementos; considere dividir a cena.`,
        chapter,
        scene,
        beat
      ));
      if ((beat.focus?.kind === "node" || beat.focus?.kind === "edge" || beat.focus?.kind === "loop") && scene.stage.camera?.mode === "fit-map") findings.push(finding(
        "visual-fit-focused-beat",
        "visual",
        "info",
        "Um foco espec\xEDfico pode ganhar legibilidade com uma c\xE2mera focada.",
        chapter,
        scene,
        beat
      ));
    });
  }
  function runAccessibilityRules(presentation, findings) {
    for (const { chapter, scene } of allScenes(presentation)) {
      if (scene.type === "media" && scene.content.assetId && !scene.content.altText?.trim()) findings.push({
        id: `accessibility-alt-${scene.id}`,
        category: "accessibility",
        severity: "error",
        message: "Imagem local precisa de texto alternativo.",
        location: { chapterId: chapter.id, sceneId: scene.id },
        safeFix: { field: "content.altText", value: scene.title }
      });
      for (const beat of scene.beats) if (beat.type === "question" && !beat.narrationMd?.trim()) findings.push({
        id: `accessibility-question-${beat.id}`,
        category: "accessibility",
        severity: "warning",
        message: "Uma pergunta sem texto n\xE3o \xE9 compreens\xEDvel para leitores de tela.",
        location: { chapterId: chapter.id, sceneId: scene.id, beatId: beat.id }
      });
    }
  }
  function forEachBeat(presentation, callback) {
    for (const chapter of presentation.chapters) for (const scene of chapter.scenes) for (const beat of scene.beats) callback(beat, scene, chapter);
  }
  function allScenes(presentation) {
    return presentation.chapters.flatMap((chapter) => chapter.scenes.map((scene) => ({ chapter, scene })));
  }
  function finding(id, category, severity, message, chapter, scene, beat) {
    return { id: `${id}-${beat.id}`, category, severity, message, location: { chapterId: chapter.id, sceneId: scene.id, beatId: beat.id } };
  }
  function locateByMessage(presentation, message) {
    const match = /(?:Scene|Beat) ([^ :]+)/.exec(message);
    if (!match) return {};
    for (const { chapter, scene } of allScenes(presentation)) {
      if (scene.id === match[1]) return { chapterId: chapter.id, sceneId: scene.id };
      const beat = scene.beats.find((item) => item.id === match[1]);
      if (beat) return { chapterId: chapter.id, sceneId: scene.id, beatId: beat.id };
    }
    return {};
  }
  function scoreFindings(findings) {
    const categories = ["structural", "causal", "narrative", "visual", "accessibility", "pacing"];
    const scores = Object.fromEntries(categories.map((category) => [category, 100]));
    for (const finding2 of findings) {
      if (!(finding2.category in scores)) scores[finding2.category] = 100;
      scores[finding2.category] -= finding2.severity === "error" ? 25 : finding2.severity === "warning" ? 8 : 2;
    }
    for (const key of Object.keys(scores)) scores[key] = Math.max(0, scores[key]);
    scores.overall = Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.keys(scores).length);
    return scores;
  }
  function clone(value) {
    return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }
  function findLocationTarget(presentation, location = {}) {
    const chapter = (presentation.chapters || []).find((item) => item.id === location.chapterId);
    const scene = chapter?.scenes?.find((item) => item.id === location.sceneId);
    if (location.beatId) return scene?.beats?.find((item) => item.id === location.beatId);
    return scene || chapter || presentation;
  }

  // src/presentation/export.js
  var PresentationExportError = class extends Error {
    constructor(errors = [], lint = null) {
      super(`Presentation export blocked:
${errors.map((error) => `- ${error}`).join("\n")}`);
      this.name = "PresentationExportError";
      this.errors = errors;
      this.lint = lint;
    }
  };
  function compilePresentationExport({
    project = { title: "Trama" },
    model,
    loops = [],
    presentation,
    presentations = [],
    maps = [],
    views = [],
    assets = [],
    activeLoopId,
    embed = {}
  } = {}) {
    const normalized = presentation ? normalizePresentation(presentation) : null;
    const context = {
      model,
      maps: [{ id: model?.id, model }, ...maps].filter((item) => item?.id && item.model),
      views,
      assets
    };
    let compiled = null;
    let lint = null;
    const errors = [];
    if (normalized && normalized.chapters.some((chapter) => chapter.scenes.length)) {
      lint = lintPresentation(normalized, context);
      compiled = lint.compiled;
      errors.push(...lint.errors.map((item) => item.message));
      errors.push(...collectMissingAssets(normalized, assets, [model, ...maps.map((item) => item.model)]));
    }
    errors.push(...collectMissingNodeAssets([model, ...maps.map((item) => item.model), ...loops.map((item) => item.model || item)], assets));
    if (errors.length) throw new PresentationExportError([...new Set(errors)], lint);
    const entries = (Array.isArray(presentations) ? presentations : []).map((item) => item?.presentation ? { ...item, presentation: normalizePresentation(item.presentation) } : item).filter(Boolean);
    const referencedAssets = /* @__PURE__ */ new Set([
      ...normalized ? referencedAssetIds(normalized) : [],
      ...referencedNodeAssetIds([model, ...maps.map((item) => item.model), ...loops.map((item) => item.model || item)])
    ]);
    const exportAssets = assets.filter((asset) => !referencedAssets.size || referencedAssets.has(asset.id));
    const payload = {
      version: 3,
      format: "trama-presentation",
      project,
      model,
      loops: loops.length ? loops : model?.loops || [],
      maps: context.maps,
      views,
      activeLoopId: activeLoopId || model?.id,
      presentation: normalized,
      presentations: entries,
      compiled,
      assets: exportAssets,
      embed: normalizeEmbed(embed),
      integrity: { algorithm: "fnv1a32", digest: "" }
    };
    payload.integrity.digest = fnv1a32(stableStringify({ ...payload, integrity: void 0 }));
    return { payload, compiled, lint };
  }
  function collectMissingAssets(presentation, assets, models = []) {
    const available = new Set((assets || []).map((asset) => asset.id));
    return [.../* @__PURE__ */ new Set([
      ...referencedAssetIds(presentation),
      ...referencedNodeAssetIds(models)
    ])].filter((id) => !available.has(id)).map((id) => `Export references missing asset: ${id}.`);
  }
  function referencedAssetIds(presentation) {
    const ids = /* @__PURE__ */ new Set();
    for (const chapter of presentation.chapters || []) for (const scene of chapter.scenes || []) {
      if (scene.content?.assetId) ids.add(scene.content.assetId);
    }
    return ids;
  }
  function referencedNodeAssetIds(models = []) {
    const ids = /* @__PURE__ */ new Set();
    for (const model of models || []) for (const node of model?.nodes || []) {
      if (node.media?.assetId) ids.add(node.media.assetId);
    }
    return ids;
  }
  function collectMissingNodeAssets(models, assets) {
    const available = new Set((assets || []).map((asset) => asset.id));
    return [...referencedNodeAssetIds(models)].filter((id) => !available.has(id)).map((id) => `Node image references missing asset: ${id}.`);
  }
  function normalizeEmbed(embed) {
    const source = embed && typeof embed === "object" ? embed : {};
    return {
      allowedOrigins: Array.isArray(source.allowedOrigins) ? [...new Set(source.allowedOrigins)] : [],
      sidebar: source.sidebar !== false,
      presentationOnly: Boolean(source.presentationOnly),
      commands: ["start", "pause", "resume", "next", "previous", "goTo", "explore", "resumeStory"]
    };
  }
  function stableStringify(value) {
    if (value === void 0) return "null";
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    return `{${Object.keys(value).sort().filter((key) => value[key] !== void 0).map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  function fnv1a32(value) {
    let hash2 = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash2 ^= value.charCodeAt(index);
      hash2 = Math.imul(hash2, 16777619);
    }
    return (hash2 >>> 0).toString(16).padStart(8, "0");
  }

  // src/presentation/performance.js
  function measurePresentationPerformance(presentation, context = {}, { budgetMs = 120 } = {}) {
    const start = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const compiled = compilePresentation(presentation, context);
    const end = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const compileMs = end - start;
    return {
      compileMs,
      timelineLength: compiled.timeline.length,
      valid: compiled.valid,
      withinBudget: compileMs <= budgetMs,
      compiled
    };
  }

  // src/design-system/generatedManifest.js
  var DESIGN_SYSTEM_MANIFEST = Object.freeze({
    "schemaVersion": "1.0.0",
    "theme": "matcha",
    "hash": "52ec92400717f6fbf71b5ebc379cd32cfc0d0f71decf2bf38231ca862abf79a9",
    "tokenCount": 237
  });

  // src/language/loopMarkdown.js
  var LoopLanguageError = class extends Error {
    constructor(errors) {
      super(`Invalid loop document:
${errors.map((error) => `- line ${error.line}: ${error.message}`).join("\n")}`);
      this.name = "LoopLanguageError";
      this.errors = errors;
    }
  };
  function compileLoopMarkdown(source) {
    const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
    const errors = [];
    const metadata = {};
    const nodes = [];
    const relations = [];
    const loops = [];
    let section = "";
    let currentLoop = null;
    let inFrontmatter = lines[0]?.trim() === "---";
    for (let index = inFrontmatter ? 1 : 0; index < lines.length; index += 1) {
      const raw = lines[index];
      const line = raw.trim();
      const lineNumber = index + 1;
      if (inFrontmatter) {
        if (line === "---") {
          inFrontmatter = false;
          continue;
        }
        const entry = parseKeyValue(line);
        if (entry) metadata[entry.key] = parseMetadataValue(entry.value);
        else if (line) errors.push({ line: lineNumber, message: "Invalid frontmatter entry." });
        continue;
      }
      if (!line || line.startsWith("<!--")) continue;
      const sectionMatch = line.match(/^##\s+(.+)$/);
      if (sectionMatch) {
        section = sectionMatch[1].toLowerCase();
        currentLoop = null;
        if (section === "story") {
          errors.push({ line: lineNumber, message: "Story sections belong in a separate Presentation Markdown document." });
        }
        continue;
      }
      const titleMatch = line.match(/^#\s+(.+)$/);
      if (titleMatch && !metadata.title) {
        metadata.title = titleMatch[1].trim();
        continue;
      }
      if (section === "variables") {
        const match = line.match(/^-\s+([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
        if (!match) errors.push({ line: lineNumber, message: "Expected '- id: Label'." });
        else {
          const parsed = parseTextAndFields(match[2].trim(), lineNumber, errors);
          nodes.push({ id: match[1], label: unescapeText(parsed.text), ...parsed.fields ? { fields: parsed.fields } : {} });
        }
        continue;
      }
      if (section === "relations") {
        const match = line.match(/^([a-zA-Z][\w-]*)\s+(\+\+|\+-|-\+|--)\s+([a-zA-Z][\w-]*)(?:\s*:\s*(.+))?$/);
        if (!match) errors.push({ line: lineNumber, message: "Expected 'source SIGN target'." });
        else {
          const parsed = parseTextAndFields(match[4] || "", lineNumber, errors);
          relations.push({ source: match[1], sign: match[2], target: match[3], description: unescapeText(parsed.text), fields: parsed.fields, line: lineNumber });
        }
        continue;
      }
      if (section === "loops") {
        const heading = line.match(/^-\s+([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
        if (heading) {
          currentLoop = { id: heading[1], label: unescapeText(heading[2].trim()), edgeRefs: [], line: lineNumber };
          loops.push(currentLoop);
          continue;
        }
        if (!currentLoop) {
          errors.push({ line: lineNumber, message: "Loop property requires a loop heading." });
          continue;
        }
        const edgeRef = line.match(/^-\s+([\w-]+)\s*->\s*([\w-]+)$/);
        if (edgeRef) currentLoop.edgeRefs.push({ source: edgeRef[1], target: edgeRef[2], line: lineNumber });
        else if (!/^edges\s*:\s*$/.test(line)) {
          const entry = parseKeyValue(line);
          if (entry?.key === "description") currentLoop.description = unescapeText(entry.value);
          else if (entry?.key === "tags") currentLoop.tags = parseMetadataValue(entry.value);
          else if (entry?.key === "fields") {
            try {
              currentLoop.fields = JSON.parse(entry.value);
            } catch {
              errors.push({ line: lineNumber, message: "Loop fields must be valid inline JSON." });
            }
          } else errors.push({ line: lineNumber, message: "Unknown loop property." });
        }
        continue;
      }
    }
    if (inFrontmatter) errors.push({ line: lines.length, message: "Frontmatter is not closed." });
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edgeIds = /* @__PURE__ */ new Set();
    const relationLineByPair = /* @__PURE__ */ new Map();
    const edges = relations.map((relation) => {
      if (!nodeIds.has(relation.source)) errors.push({ line: relation.line, message: `Unknown source variable '${relation.source}'.` });
      if (!nodeIds.has(relation.target)) errors.push({ line: relation.line, message: `Unknown target variable '${relation.target}'.` });
      const pair = `${relation.source}->${relation.target}`;
      if (relationLineByPair.has(pair)) {
        errors.push({
          line: relation.line,
          message: `Duplicate relation '${relation.source} -> ${relation.target}' (first declared on line ${relationLineByPair.get(pair)}). Declare at most one relation per ordered pair.`
        });
      } else relationLineByPair.set(pair, relation.line);
      const id = uniqueId(`${relation.source}-${relation.target}`, edgeIds);
      edgeIds.add(id);
      return {
        id,
        source: relation.source,
        target: relation.target,
        sourceSign: normalizeSign2(relation.sign[0]),
        targetSign: normalizeSign2(relation.sign[1]),
        ...relation.description ? { description: relation.description } : {},
        ...relation.fields ? { fields: relation.fields } : {}
      };
    });
    const edgeByPair = new Map(edges.map((edge) => [`${edge.source}->${edge.target}`, edge]));
    const curatedLoops = loops.map((loop) => ({
      id: loop.id,
      label: loop.label,
      edgeIds: loop.edgeRefs.map((ref) => {
        const edge = edgeByPair.get(`${ref.source}->${ref.target}`);
        if (!edge) errors.push({ line: ref.line, message: `Unknown relation '${ref.source} -> ${ref.target}'.` });
        return edge?.id;
      }).filter(Boolean),
      ...loop.description ? { description: loop.description } : {},
      ...loop.tags ? { tags: loop.tags } : {},
      ...loop.fields ? { fields: loop.fields } : {}
    }));
    if (errors.length) throw new LoopLanguageError(errors);
    try {
      return normalizeModel({
        id: metadata.id || slugId(metadata.title, "untitled-loop"),
        title: metadata.title || "Untitled Loop",
        description: metadata.summary || "",
        ...metadata.tags ? { tags: metadata.tags } : {},
        nodes,
        edges,
        loops: curatedLoops
      });
    } catch (error) {
      throw new LoopLanguageError((error.errors || [error.message]).map((message) => ({ line: 1, message })));
    }
  }
  function serializeLoopMarkdown(model) {
    const lines = [`# ${model.title || model.id}`, "", "## Variables", ""];
    for (const node of model.nodes) lines.push(`- ${node.id}: ${escapeText(node.label)}${fieldsSuffix(node.fields)}`);
    lines.push("", "## Relations", "");
    for (const edge of model.edges) {
      const sign = `${asciiSign(edge.sourceSign)}${asciiSign(edge.targetSign)}`;
      const detail = `${edge.description ? escapeText(edge.description) : ""}${fieldsSuffix(edge.fields)}`;
      lines.push(`${edge.source} ${sign} ${edge.target}${detail ? `: ${detail}` : ""}`);
    }
    if (model.loops?.length) {
      const edgeById = new Map(model.edges.map((edge) => [edge.id, edge]));
      lines.push("", "## Loops", "");
      for (const loop of model.loops) {
        lines.push(`- ${loop.id}: ${escapeText(loop.label || loop.id)}`, "  edges:");
        for (const edgeId of loop.edgeIds) {
          const edge = edgeById.get(edgeId);
          if (edge) lines.push(`    - ${edge.source} -> ${edge.target}`);
        }
        if (loop.description) lines.push(`  description: ${escapeText(loop.description)}`);
        if (loop.fields && Object.keys(loop.fields).length) lines.push(`  fields: ${JSON.stringify(loop.fields)}`);
      }
    }
    return `${lines.join("\n").trim()}
`;
  }
  function parseKeyValue(line) {
    const match = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    return match ? { key: match[1].toLowerCase(), value: match[2].trim() } : null;
  }
  function parseMetadataValue(value) {
    const list = value.match(/^\[(.*)]$/);
    return list ? list[1].split(",").map((item) => item.trim()).filter(Boolean) : value;
  }
  function asciiSign(sign) {
    return sign === "\u2212" ? "-" : sign;
  }
  function escapeText(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
  }
  function unescapeText(value) {
    return String(value || "").replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
  }
  function parseTextAndFields(value, line, errors) {
    const separator = value.lastIndexOf(" :: ");
    if (separator < 0) return { text: value };
    const text = value.slice(0, separator);
    try {
      const fields = JSON.parse(value.slice(separator + 4));
      if (!fields || Array.isArray(fields) || typeof fields !== "object") throw new Error();
      return { text, fields };
    } catch {
      errors.push({ line, message: "Fields suffix must be a valid JSON object after '::'." });
      return { text };
    }
  }
  function fieldsSuffix(fields) {
    return fields && Object.keys(fields).length ? ` :: ${JSON.stringify(fields)}` : "";
  }

  // src/language/presentationMarkdown.js
  var PresentationLanguageError = class extends Error {
    constructor(errors = []) {
      super(`Invalid presentation document:
${errors.map((error) => `- line ${error.line}: ${error.message}`).join("\n")}`);
      this.name = "PresentationLanguageError";
      this.errors = errors;
    }
  };
  function compilePresentationMarkdown(source) {
    if (looksLikeEditorialMarkdown(source)) return compileEditorialMarkdown(source);
    const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
    const errors = [];
    const raw = { schemaVersion: 2, chapters: [] };
    let scope = "root";
    let chapter = null;
    let scene = null;
    let beat = null;
    let continuation = null;
    const finishContinuation = () => {
      if (!continuation) return;
      const { target, key, lines: lines2 } = continuation;
      const text = lines2.join("\n").replace(/\n+$/, "");
      if (target === scene && key === "bodyMd") {
        target.content = { ...target.content || {}, bodyMd: text };
      } else if (target === scene && key === "speakerNotesMd") {
        target.content = { ...target.content || {}, speakerNotesMd: text };
      } else {
        target[key] = text;
      }
      continuation = null;
    };
    const assign = (target, key, value, line) => {
      const normalizedKey = key.toLowerCase();
      const textKeys = /* @__PURE__ */ new Set(["title", "summary", "intent", "theme", "themeid", "theme-id", "body", "narration", "speaker-notes", "speaker_notes", "caption", "alt", "alttext", "content-layout"]);
      const jsonKeys = /* @__PURE__ */ new Set(["audience", "settings", "tags", "fields", "custom-fields", "map", "mapref", "view", "causal-frame", "causalframe", "stage", "transition", "timing", "delta", "intervention", "evidence", "flow", "visibility", "emphasis", "annotations", "interaction-policy"]);
      const keyMap = {
        "theme": "themeId",
        "themeid": "themeId",
        "theme-id": "themeId",
        "speaker-notes": "speakerNotesMd",
        "speaker_notes": "speakerNotesMd",
        "narration": "narrationMd",
        "alt": "altText",
        "alttext": "altText",
        "content-layout": "contentLayout",
        "causal-frame": "causalFrame",
        "causalframe": "causalFrame",
        "map": "mapRef",
        "view": "mapRef",
        "custom-fields": "customFields",
        "interaction-policy": "interactionPolicy"
      };
      const outputKey = keyMap[normalizedKey] || normalizedKey;
      if (textKeys.has(normalizedKey)) {
        target[outputKey] = unescapeText2(value);
        if (normalizedKey === "body") target.content = { ...target.content || {}, bodyMd: target[outputKey] };
        if (normalizedKey === "speaker-notes" || normalizedKey === "speaker_notes") {
          if (target === scene) target.content = { ...target.content || {}, speakerNotesMd: target[outputKey] };
        }
        if (normalizedKey === "narration") target.narrationMd = target[outputKey];
        return;
      }
      if (normalizedKey === "schema-version" || normalizedKey === "schemaversion") {
        target.schemaVersion = Number(value);
        return;
      }
      if (normalizedKey === "role" || normalizedKey === "type" || normalizedKey === "id") {
        target[outputKey] = unescapeText2(value);
        return;
      }
      if (normalizedKey === "focus") {
        target.focus = parseFocusValue(value, line, errors);
        return;
      }
      if (normalizedKey === "duration" || normalizedKey === "duration-ms" || normalizedKey === "default-duration") {
        target[normalizedKey === "default-duration" ? "defaultBeatDurationMs" : "durationMs"] = Number(value);
        if (normalizedKey === "default-duration" && target === raw) raw.settings = { ...raw.settings || {}, defaultBeatDurationMs: Number(value) };
        if (target === raw.settings) target.defaultBeatDurationMs = Number(value);
        if (target === scene?.timing) target.durationMs = Number(value);
        if (target === beat?.timing) target.durationMs = Number(value);
        return;
      }
      if (normalizedKey === "advance") {
        target.advance = value;
        return;
      }
      if (jsonKeys.has(normalizedKey) || value.startsWith("{") || value.startsWith("[")) {
        const parsed = (normalizedKey === "map" || normalizedKey === "mapref") && !value.startsWith("{") && !value.startsWith("[") ? value : parseJson(value, line, errors);
        if (parsed !== void 0) {
          if (normalizedKey === "audience") raw.audience = parsed;
          else if (normalizedKey === "settings") raw.settings = parsed;
          else if (normalizedKey === "map" || normalizedKey === "mapref") target.mapRef = typeof parsed === "string" ? { mapId: parsed } : parsed;
          else if (normalizedKey === "view") target.mapRef = { ...target.mapRef || {}, viewId: typeof parsed === "string" ? parsed : parsed?.viewId };
          else if (normalizedKey === "transition") target.transition = typeof parsed === "string" ? parsed : parsed;
          else if (normalizedKey === "timing") target.timing = parsed;
          else if (normalizedKey === "stage") target.stage = parsed;
          else if (normalizedKey === "delta") target.delta = parsed;
          else if (normalizedKey === "causal-frame" || normalizedKey === "causalframe") target.causalFrame = parsed;
          else if (normalizedKey === "intervention") target.intervention = parsed;
          else if (normalizedKey === "fields") target.fields = parsed;
          else target[outputKey] = parsed;
        }
        return;
      }
      if (normalizedKey === "autoplay") {
        raw.settings = { ...raw.settings || {}, autoplay: value === "true" };
        return;
      }
      errors.push({ line, message: `Unknown ${scope} property '${key}'.` });
    };
    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index];
      const line = rawLine.trim();
      const lineNumber = index + 1;
      if (!line) continue;
      if (/^\s+/.test(rawLine) && continuation) {
        continuation.lines.push(rawLine.replace(/^\s{2}/, ""));
        continue;
      }
      finishContinuation();
      if (line.startsWith("<!--")) continue;
      const title = line.match(/^#\s+(.+)$/);
      if (title) {
        raw.title = unescapeText2(title[1]);
        continue;
      }
      const chapterHeading = line.match(/^##\s+Chapter\s+([\w-]+)(?:\s+(.+))?$/i);
      if (chapterHeading) {
        chapter = { id: chapterHeading[1], title: unescapeText2(chapterHeading[2] || chapterHeading[1]), scenes: [] };
        raw.chapters.push(chapter);
        scene = null;
        beat = null;
        scope = "chapter";
        continue;
      }
      const sceneHeading = line.match(/^###\s+Scene\s+([\w-]+)(?:\s+(.+))?$/i);
      if (sceneHeading) {
        if (!chapter) errors.push({ line: lineNumber, message: "Scene requires a chapter heading." });
        else {
          scene = { id: sceneHeading[1], title: unescapeText2(sceneHeading[2] || sceneHeading[1]), beats: [] };
          chapter.scenes.push(scene);
          beat = null;
          scope = "scene";
        }
        continue;
      }
      const beatHeading = line.match(/^####\s+Beat\s+([\w-]+)(?:\s+(.+))?$/i);
      if (beatHeading) {
        if (!scene) errors.push({ line: lineNumber, message: "Beat requires a scene heading." });
        else {
          beat = { id: beatHeading[1], title: unescapeText2(beatHeading[2] || beatHeading[1]) };
          scene.beats.push(beat);
          scope = "beat";
        }
        continue;
      }
      const entry = rawLine.match(/^\s*([\w-]+)\s*:\s*(.*)$/);
      if (!entry) {
        errors.push({ line: lineNumber, message: "Expected a heading or key: value entry." });
        continue;
      }
      const [, key, value] = entry;
      const target = scope === "beat" ? beat : scope === "scene" ? scene : scope === "chapter" ? chapter : raw;
      if (!target) {
        errors.push({ line: lineNumber, message: "Property has no active presentation object." });
        continue;
      }
      if (value === "|") {
        const continuationKey = key.toLowerCase();
        continuation = {
          target,
          key: continuationKey === "narration" ? "narrationMd" : continuationKey === "body" ? "bodyMd" : continuationKey === "speaker-notes" || continuationKey === "speaker_notes" ? "speakerNotesMd" : key,
          lines: []
        };
        continue;
      }
      assign(target, key, value, lineNumber);
    }
    finishContinuation();
    if (errors.length) throw new PresentationLanguageError(errors);
    try {
      return normalizePresentation(raw);
    } catch (error) {
      throw new PresentationLanguageError((error.errors || [error.message]).map((message) => ({ line: 1, message })));
    }
  }
  function serializePresentationMarkdown(input, { mode = "technical" } = {}) {
    if (mode === "editorial") return serializeEditorialMarkdown(input);
    const presentation = normalizePresentation(input);
    const lines = [
      `# ${escapeText2(presentation.title)}`,
      "",
      `schemaVersion: ${presentation.schemaVersion}`,
      `summary: ${escapeText2(presentation.summary)}`,
      `intent: ${escapeText2(presentation.intent)}`,
      `audience: ${JSON.stringify(presentation.audience)}`,
      `settings: ${JSON.stringify(presentation.settings)}`,
      `themeId: ${escapeText2(presentation.themeId)}`,
      ""
    ];
    for (const chapter of presentation.chapters) {
      lines.push(`## Chapter ${chapter.id} ${escapeText2(chapter.title)}`, `role: ${chapter.role}`);
      if (chapter.summary) lines.push(`summary: ${escapeText2(chapter.summary)}`);
      lines.push("");
      for (const scene of chapter.scenes) {
        lines.push(`### Scene ${scene.id} ${escapeText2(scene.title)}`, `type: ${scene.type}`);
        if (scene.mapRef?.mapId) lines.push(`map: ${JSON.stringify(scene.mapRef)}`);
        if (scene.content.bodyMd) lines.push(...multiline("body", scene.content.bodyMd));
        if (scene.content.speakerNotesMd) lines.push(...multiline("speaker-notes", scene.content.speakerNotesMd));
        if (scene.content.caption) lines.push(`caption: ${escapeText2(scene.content.caption)}`);
        if (scene.content.altText) lines.push(`altText: ${escapeText2(scene.content.altText)}`);
        if (scene.stage && hasMeaningfulStage(scene.stage)) lines.push(`stage: ${JSON.stringify(scene.stage)}`);
        if (scene.causalFrame) lines.push(`causal-frame: ${JSON.stringify(scene.causalFrame)}`);
        if (scene.transition) lines.push(`transition: ${JSON.stringify(scene.transition)}`);
        if (scene.timing) lines.push(`timing: ${JSON.stringify(scene.timing)}`);
        lines.push("");
        for (const beat of scene.beats) {
          lines.push(`#### Beat ${beat.id} ${escapeText2(beat.title)}`, `type: ${beat.type}`);
          if (beat.focus) lines.push(`focus: ${JSON.stringify(beat.focus)}`);
          if (beat.narrationMd) lines.push(...multiline("narration", beat.narrationMd));
          if (beat.speakerNotesMd) lines.push(...multiline("speaker-notes", beat.speakerNotesMd));
          if (beat.delta && Object.keys(beat.delta).length) lines.push(`delta: ${JSON.stringify(beat.delta)}`);
          if (beat.timing) lines.push(`timing: ${JSON.stringify(beat.timing)}`);
          if (beat.transition) lines.push(`transition: ${JSON.stringify(beat.transition)}`);
          if (beat.intervention) lines.push(`intervention: ${JSON.stringify(beat.intervention)}`);
          lines.push("");
        }
      }
    }
    return `${lines.join("\n").trim()}
`;
  }
  function looksLikeEditorialMarkdown(source) {
    return /(^|\n)##\s+(?:Pr[óo]xima\s+)?Cena\s*:/i.test(String(source || ""));
  }
  function compileEditorialMarkdown(source) {
    const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
    const titleLine = lines.find((line) => /^#\s+/.test(line.trim()));
    const title = unescapeText2(titleLine ? titleLine.trim().replace(/^#\s+/, "") : "Nova apresenta\xE7\xE3o");
    const titleIndex = titleLine ? lines.indexOf(titleLine) : -1;
    const raw = {
      schemaVersion: 2,
      title,
      summary: "",
      intent: "explain",
      chapters: [{ id: "chapter-1", title: "Apresenta\xE7\xE3o", role: "custom", scenes: [] }]
    };
    let scene = null;
    let beat = null;
    let summaryLines = [];
    let beatLines = [];
    const finishBeat = () => {
      if (!beat) return;
      beat.narrationMd = beatLines.join("\n").trim();
      beatLines = [];
    };
    const finishScene = () => {
      finishBeat();
      if (scene) {
        scene.beats = scene.beats.map((beat2) => beat2.focus ? beat2 : scene.focus ? { ...beat2, focus: scene.focus } : beat2);
        delete scene.focus;
      }
      if (scene) raw.chapters[0].scenes.push(scene);
      scene = null;
      beat = null;
    };
    for (let index = 0; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      if (!trimmed || trimmed === "---") continue;
      if (index === titleIndex) continue;
      const sceneHeading = trimmed.match(/^##\s+(?:Pr[óo]xima\s+)?Cena\s*:\s*(.+)$/i);
      if (sceneHeading) {
        finishScene();
        const sceneTitle = unescapeText2(sceneHeading[1].trim());
        scene = {
          id: uniqueEditorialId("scene", sceneTitle, raw.chapters[0].scenes.map((item) => item.id)),
          type: "stage",
          title: sceneTitle,
          content: { bodyMd: "", speakerNotesMd: "" },
          beats: []
        };
        continue;
      }
      const beatHeading = trimmed.match(/^###\s+(.+)$/);
      if (beatHeading && scene) {
        finishBeat();
        beat = {
          id: uniqueEditorialId("beat", beatHeading[1], scene.beats.map((item) => item.id)),
          type: "focus",
          title: unescapeText2(beatHeading[1].trim()),
          narrationMd: ""
        };
        scene.beats.push(beat);
        continue;
      }
      const focusLine = trimmed.match(/^focus\s*:\s*(.+)$/i);
      if (focusLine && (scene || beat)) {
        const target = beat || scene;
        target.focus = parseFocusValue(focusLine[1].trim(), index + 1, []);
        continue;
      }
      if (scene && beat) beatLines.push(lines[index].replace(/^\s{2}/, ""));
      else if (!scene) summaryLines.push(lines[index]);
      else if (scene && !beat) scene.content.bodyMd = `${scene.content.bodyMd || ""}${scene.content.bodyMd ? "\n" : ""}${lines[index]}`;
    }
    finishScene();
    raw.summary = summaryLines.join("\n").trim();
    return normalizePresentation(raw);
  }
  function serializeEditorialMarkdown(input) {
    const presentation = normalizePresentation(input);
    const lines = [`# ${escapeText2(presentation.title)}`, ""];
    if (presentation.summary) lines.push(escapeText2(presentation.summary), "");
    const scenes = presentation.chapters.flatMap((chapter) => chapter.scenes || []);
    scenes.forEach((scene, sceneIndex) => {
      lines.push(`## Cena: ${escapeText2(scene.title || `Cena ${sceneIndex + 1}`)}`);
      const sceneFocus = scene.beats?.find((beat) => beat.focus)?.focus;
      if (sceneFocus) lines.push(`focus: ${serializeEditorialFocus(sceneFocus)}`);
      lines.push("");
      const firstBeatNarration = scene.beats?.[0]?.narrationMd;
      if (scene.content?.bodyMd && scene.content.bodyMd !== firstBeatNarration) {
        lines.push(escapeText2(scene.content.bodyMd), "");
      }
      (scene.beats || []).forEach((beat) => {
        lines.push(`### ${escapeText2(beat.title)}`);
        if (beat.focus) lines.push(`focus: ${serializeEditorialFocus(beat.focus)}`);
        lines.push("");
        if (beat.narrationMd) lines.push(escapeText2(beat.narrationMd), "");
        lines.push("");
      });
    });
    return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}
`;
  }
  function serializeEditorialFocus(focus = {}) {
    if (focus.kind === "node") return `node ${focus.nodeId}`;
    if (focus.kind === "edge") return `edge ${focus.edgeId}`;
    if (focus.kind === "loop") return `loop ${focus.loopId}`;
    if (focus.kind === "path") return `path ${(focus.edgeIds || []).join(", ")}`;
    if (focus.kind === "set") {
      const entries = [
        ...(focus.nodeIds || []).map((id) => `node:${id}`),
        ...(focus.edgeIds || []).map((id) => `edge:${id}`),
        ...(focus.loopIds || []).map((id) => `loop:${id}`)
      ];
      return `set ${entries.join(", ")}`;
    }
    if (focus.kind === "query") return `query ${focus.selector}`;
    if (focus.kind === "region") return `region ${focus.regionId}`;
    return JSON.stringify(focus);
  }
  function uniqueEditorialId(prefix, title, used = []) {
    const base = `${prefix}-${String(title || prefix).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || prefix}`;
    let id = base;
    let suffix = 2;
    while (used.includes(id)) id = `${base}-${suffix++}`;
    return id;
  }
  function parseFocusValue(value, line, errors) {
    if (value.startsWith("{") || value.startsWith("[")) return parseJson(value, line, errors);
    const match = value.match(/^(node|edge|loop|region|query)\s+(.+)$/i);
    if (match) {
      const kind = match[1].toLowerCase();
      const value2 = unescapeText2(match[2]);
      if (kind === "query") return { kind, selector: value2 };
      return { kind, [`${kind}Id`]: value2 };
    }
    const path = value.match(/^path\s+(.+)$/i);
    if (path) return { kind: "path", edgeIds: path[1].split(/\s*,\s*/).filter(Boolean) };
    const set = value.match(/^set\s+(.+)$/i);
    if (set) {
      const entries = set[1].split(/\s*,\s*/).filter(Boolean);
      const result = { kind: "set", nodeIds: [], edgeIds: [], loopIds: [] };
      for (const entry of entries) {
        const typed = entry.match(/^(node|edge|loop):(.+)$/i);
        if (typed) result[{ node: "nodeIds", edge: "edgeIds", loop: "loopIds" }[typed[1].toLowerCase()]].push(typed[2]);
        else result.nodeIds.push(entry);
      }
      return result;
    }
    errors.push({ line, message: `Invalid focus '${value}'. Use JSON, node/edge/loop id, path e1,e2 or set id1,id2.` });
    return void 0;
  }
  function parseJson(value, line, errors) {
    try {
      return JSON.parse(value);
    } catch {
      errors.push({ line, message: "Value must be valid inline JSON." });
      return void 0;
    }
  }
  function multiline(key, value) {
    return [`${key}: |`, ...String(value).split("\n").map((line) => `  ${line}`)];
  }
  function hasMeaningfulStage(stage) {
    return Boolean(stage && (stage.camera?.mode && stage.camera.mode !== "fit-map" || stage.visibility?.focused?.length || stage.visibility?.ghost?.length || stage.emphasis?.length || stage.annotations?.length || stage.flow));
  }
  function escapeText2(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
  }
  function unescapeText2(value) {
    return String(value || "").replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
  }

  // src/language/styleLanguage.js
  var SELECTORS = /* @__PURE__ */ new Set(["variable", "relation", "loop", "scene", "canvas"]);
  var SETTINGS_PROPERTIES = /* @__PURE__ */ new Set([
    "background",
    "route-quality",
    "extends",
    "label-density",
    "node-media",
    "style-pack",
    "style-pack-version",
    "style-schema-version",
    "loop-badges",
    "show-polarities",
    "focus-fade",
    "publication-profile"
  ]);
  var NODE_PROPERTIES2 = /* @__PURE__ */ new Set([
    "shape",
    "size",
    "width",
    "height",
    "fill",
    "color",
    "border-color",
    "border-width",
    "font-size",
    "font-family",
    "font-weight",
    "text-color",
    "text-max-width",
    "opacity",
    "visible",
    "label-visible",
    "highlight",
    "legend"
  ]);
  var EDGE_PROPERTIES2 = /* @__PURE__ */ new Set([
    "color",
    "stroke-color",
    "width",
    "stroke-width",
    "stroke-style",
    "line-cap",
    "line-dash-pattern",
    "line-dash-offset",
    "line-outline-width",
    "line-outline-color",
    "arrow-shape",
    "arrow-fill",
    "arrow-width",
    "arrow-scale",
    "opacity",
    "visible",
    "label-visible",
    "highlight",
    "legend"
  ]);
  var META_PROPERTIES = /* @__PURE__ */ new Set([
    "fill",
    "background",
    "color",
    "opacity",
    "visible",
    "label-visible",
    "highlight",
    "legend",
    "badge-fill",
    "badge-color",
    "badge-stroke",
    "badge-opacity",
    "badge-size"
  ]);
  var LoopStyleError = class extends Error {
    constructor(errors) {
      super(`Invalid loop style:
${errors.map((error) => `- line ${error.line}: ${error.message}`).join("\n")}`);
      this.name = "LoopStyleError";
      this.errors = errors;
    }
  };
  function compileLoopStyle(source) {
    const text = stripComments(String(source || ""));
    const errors = [];
    const viewMatch = text.match(/@view\s+["']([^"']+)["']/);
    const settings = {};
    const rules = [];
    const blockPattern = /(@settings|(?:variable|relation|loop|scene|canvas)(?:\s*\[[^\]]+\])?)\s*\{([^}]*)}/g;
    let match;
    while (match = blockPattern.exec(text)) {
      const line = lineAt(text, match.index);
      const properties = parseProperties(match[2], line, errors);
      if (match[1] === "@settings") Object.assign(settings, properties);
      else {
        const selector = parseSelector(match[1], line, errors);
        if (selector) {
          validateProperties(selector.type, properties, line, errors);
          rules.push({ selector, properties });
        }
      }
    }
    const remainder = text.replace(/@view\s+["'][^"']+["']/g, "").replace(blockPattern, "").trim();
    if (remainder) errors.push({ line: lineAt(text, text.indexOf(remainder)), message: "Unrecognized style syntax." });
    validateProperties("@settings", settings, 1, errors);
    if (errors.length) throw new LoopStyleError(errors);
    return { title: viewMatch?.[1] || "Default", settings, rules, style_source: String(source || "") };
  }
  function validateProperties(type, properties, line, errors) {
    const allowed = type === "@settings" ? SETTINGS_PROPERTIES : type === "variable" ? NODE_PROPERTIES2 : type === "relation" ? EDGE_PROPERTIES2 : type === "canvas" ? /* @__PURE__ */ new Set(["background", "visible", "opacity"]) : META_PROPERTIES;
    for (const property of Object.keys(properties)) {
      if (!allowed.has(property)) errors.push({ line, message: `Unknown property '${property}' for ${type}.` });
    }
  }
  function serializeLoopStyle(view = {}) {
    const lines = [`@view "${view.title || "Default"}"`, ""];
    if (Object.keys(view.settings || {}).length) {
      lines.push("@settings {");
      appendProperties(lines, view.settings);
      lines.push("}", "");
    }
    for (const rule of view.rules || []) {
      lines.push(`${selectorText(rule.selector)} {`);
      appendProperties(lines, rule.properties || {});
      lines.push("}", "");
    }
    return `${lines.join("\n").trim()}
`;
  }
  function parseSelector(value, line, errors) {
    const match = value.match(/^(\w+)(?:\s*\[([\w-]+)\s*=\s*["']([^"']+)["']\])?$/);
    if (!match || !SELECTORS.has(match[1])) {
      errors.push({ line, message: `Unknown selector '${value}'.` });
      return null;
    }
    return { type: match[1], ...match[2] ? { attribute: match[2], value: match[3] } : {} };
  }
  function parseProperties(body, line, errors) {
    const properties = {};
    for (const declaration of body.split(";")) {
      if (!declaration.trim()) continue;
      const match = declaration.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/s);
      if (!match) errors.push({ line, message: `Invalid declaration '${declaration.trim()}'.` });
      else properties[match[1]] = parseValue(match[2]);
    }
    return properties;
  }
  function parseValue(value) {
    if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
    if (value === "true" || value === "false") return value === "true";
    return value.replace(/^["']|["']$/g, "");
  }
  function selectorText(selector) {
    if (typeof selector === "string") return selector;
    return `${selector.type}${selector.attribute ? `[${selector.attribute}="${selector.value}"]` : ""}`;
  }
  function appendProperties(lines, properties) {
    for (const [key, value] of Object.entries(properties)) lines.push(`  ${key}: ${value};`);
  }
  function stripComments(source) {
    return source.replace(/\/\*[\s\S]*?\*\//g, "");
  }
  function lineAt(source, index) {
    return source.slice(0, Math.max(0, index)).split("\n").length;
  }

  // src/language/mermaid.js
  var MermaidImportError = class extends Error {
    constructor(errors) {
      super(`Invalid Mermaid diagram:
${errors.map((error) => `- line ${error.line}: ${error.message}`).join("\n")}`);
      this.name = "MermaidImportError";
      this.errors = errors;
    }
  };
  function importMermaid(source, { id = "mermaid-import", title = "Mermaid import" } = {}) {
    const text = String(source || "").replace(/```(?:mermaid)?|```/gi, "");
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    const nodes = /* @__PURE__ */ new Map();
    const rawEdges = [];
    const errors = [];
    lines.forEach((raw, index) => {
      const line = raw.trim();
      if (!line || /^(graph|flowchart)\s+(TD|TB|LR|RL|BT)/i.test(line) || line.startsWith("%%")) return;
      const edge = parseMermaidEdge(line);
      if (edge) {
        rememberNode(nodes, edge.source, edge.sourceLabel);
        rememberNode(nodes, edge.target, edge.targetLabel);
        rawEdges.push({ ...edge, line: index + 1 });
        return;
      }
      const node = parseNodeToken(line);
      if (node && node.rest === "") rememberNode(nodes, node.id, node.label);
      else errors.push({ line: index + 1, message: "Unsupported Mermaid statement." });
    });
    if (!nodes.size) errors.push({ line: 1, message: "No Mermaid nodes were found." });
    if (errors.length) throw new MermaidImportError(errors);
    const edgeIds = /* @__PURE__ */ new Set();
    const edges = rawEdges.map((edge) => {
      const edgeId = uniqueId(`${edge.source}-${edge.target}`, edgeIds);
      edgeIds.add(edgeId);
      return {
        id: edgeId,
        source: edge.source,
        target: edge.target,
        sourceSign: "+",
        targetSign: normalizeSign2(edge.sign || "+"),
        ...edge.label && edge.label !== edge.sign ? { description: edge.label } : {}
      };
    });
    return normalizeModel({
      id: slugId(id, "mermaid-import"),
      title,
      nodes: [...nodes.values()],
      edges,
      loops: []
    });
  }
  function parseMermaidEdge(line) {
    const source = parseNodeToken(line);
    if (!source) return null;
    const arrow = source.rest.match(/^\s*(?:--\s*["']?([^"']+?)["']?\s*-->|-->\|([^|]+)\||-->|-\.->)\s*(.+)$/);
    if (!arrow) return null;
    const target = parseNodeToken(arrow[3]);
    if (!target || target.rest) return null;
    const label = (arrow[1] || arrow[2] || "").trim();
    const signMatch = label.match(/(?:^|\s)([+−-])(?:$|\s)/);
    return {
      source: source.id,
      sourceLabel: source.label,
      target: target.id,
      targetLabel: target.label,
      label,
      sign: signMatch?.[1] || "+"
    };
  }
  function parseNodeToken(value) {
    const match = String(value).match(/^\s*([A-Za-z_][\w-]*)(?:\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})?(.*)$/);
    if (!match) return null;
    return {
      id: slugId(match[1], "node"),
      label: cleanLabel(match[2] || match[3] || match[4] || match[1]),
      rest: match[5].trim()
    };
  }
  function rememberNode(nodes, id, label) {
    const existing = nodes.get(id);
    const nextLabel = label && label !== id ? label : existing?.label || label || id;
    nodes.set(id, { id, label: nextLabel });
  }
  function cleanLabel(value) {
    return String(value).trim().replace(/^["']|["']$/g, "");
  }

  // src/qa/routingFixtures.js
  function createRoutingFixture({ id = "qa-fixture", nodeCount = 8 } = {}) {
    const count = Math.max(3, Math.floor(Number(nodeCount) || 8));
    const nodes = Array.from({ length: count }, (_, index) => ({
      id: `factor-${String(index + 1).padStart(2, "0")}`,
      label: `Fator ${String(index + 1).padStart(2, "0")}`
    }));
    const edges = [];
    const addEdge = (sourceIndex, targetIndex, type = "reinforcing") => {
      const source = nodes[sourceIndex % count].id;
      const target = nodes[targetIndex % count].id;
      const id2 = `${source}-${target}`;
      if (edges.some((edge) => edge.id === id2)) return id2;
      edges.push({
        id: id2,
        source,
        target,
        sourceSign: "+",
        targetSign: type === "balancing" ? "-" : "+",
        type,
        description: `${source} influencia ${target}.`
      });
      return id2;
    };
    const ring = [];
    for (let index = 0; index < count; index++) ring.push(addEdge(index, (index + 1) % count));
    const loops = [{
      id: `${id}-main-loop`,
      edgeIds: ring,
      type: "reinforcing",
      label: "Ciclo principal"
    }];
    const chordStep = count > 10 ? 3 : 2;
    for (let index = 0; index < count; index += 2) {
      addEdge(index, (index + chordStep) % count, "balancing");
    }
    if (count >= 8) {
      addEdge(0, Math.floor(count / 2), "balancing");
      addEdge(Math.floor(count / 2), 1, "reinforcing");
    }
    return {
      id,
      title: `${count} vari\xE1veis QA`,
      description: "Fixture determin\xEDstica para validar posicionamento, curvatura, cruzamentos e persist\xEAncia.",
      nodes,
      edges,
      loops
    };
  }
  var routingFixtures = [8, 16, 32].map(
    (nodeCount) => createRoutingFixture({ id: `qa-${nodeCount}`, nodeCount })
  );

  // src/qa/runtime.js
  var QA_RUNTIME_VERSION = "qa-runtime-v1";
  function createQaRuntime({ engine, getContext = () => ({}) }) {
    if (!engine) throw new Error("QA runtime requires a CLDEngine instance.");
    return {
      version: QA_RUNTIME_VERSION,
      algorithmVersion: ROUTING_ALGORITHM_VERSION,
      fixtures: routingFixtures.map((fixture) => ({
        id: fixture.id,
        nodeCount: fixture.nodes.length,
        edgeCount: fixture.edges.length,
        loopCount: fixture.loops.length
      })),
      snapshot() {
        const model = engine.getModel({ includePositions: true, includeRoutes: true });
        const routing = engine.lastRouting || null;
        const quality = routing?.layoutQuality || (engine.cy && routing ? evaluateLayoutQuality(engine.cy, routing, {
          loopEdgeIds: engine.layoutTopology?.loopEdgeIds || []
        }) : null);
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
  function fingerprint(model) {
    if (!model) return "empty";
    const compact = {
      id: model.id,
      nodes: [...model.nodes || []].map((node) => ({
        id: node.id,
        position: node.position ? roundPoint(node.position) : null,
        locked: Boolean(node.locked)
      })).sort(byId),
      edges: [...model.edges || []].map((edge) => ({
        id: edge.id,
        route: edge.route ? {
          controlPointDistance: round2(edge.route.controlPointDistance),
          locked: Boolean(edge.route.locked),
          side: Number(edge.route.side || 0),
          algorithmVersion: edge.route.algorithmVersion || null
        } : null
      })).sort(byId)
    };
    return hash(stableStringify2(compact));
  }
  function checkSnapshot(snapshot) {
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
      ...snapshot?.quality || {},
      annotationCollisions: snapshot?.annotations?.annotationCollisions || 0
    }, {
      nodeCount: model?.nodes?.length || 0,
      edgeCount: model?.edges?.length || 0
    });
    if (!qualityGate.accepted) issues.push(...qualityGate.reasons.map((reason) => `quality:${reason}`));
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
      visibleButtons: [...document.querySelectorAll("button:not([hidden])")].map((button) => button.id || button.textContent?.trim()).filter(Boolean),
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
    return new Promise((resolve) => {
      const check = () => {
        if (Date.now() - startedAt >= Math.min(120, timeoutMs)) return resolve(true);
        if (typeof requestAnimationFrame === "function") return requestAnimationFrame(check);
        return setTimeout(check, 16);
      };
      check();
    });
  }
  function stableStringify2(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify2).join(",")}]`;
    if (!value || typeof value !== "object") return JSON.stringify(value);
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify2(value[key])}`).join(",")}}`;
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
    return { x: round2(point.x), y: round2(point.y) };
  }
  function round2(value) {
    return Number(Number(value).toFixed(2));
  }
  function byId(a, b) {
    return String(a.id).localeCompare(String(b.id));
  }
  return __toCommonJS(index_exports);
})();
window.CLD = CLD;
//# sourceMappingURL=cld-engine.iife.js.map
