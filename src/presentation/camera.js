/**
 * Shared camera intent and target resolution for the presentation players.
 *
 * Camera intent is presentation state. It must be resolved from the compiled
 * frame, so editor preview and standalone playback make the same composition
 * decision.
 */

import { clampFitPadding, fitViewportToRect } from "../geometry/fitViewport.js";

export const CAMERA_MODES = new Set([
  "fit-map",
  "fit-focus",
  "fit-set",
  "fixed",
  "follow-path",
  "split"
]);

// Presentation focus needs to privilege legibility over overview. The map
// remains available through the globe control, while focused beats can use
// the full readable scale of the canvas.
export const DEFAULT_CAMERA_MAX_ZOOM = 3.6;

export function normalizeCameraMode(mode) {
  return CAMERA_MODES.has(mode) ? mode : "fit-map";
}

export function normalizeCamera(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return {
    ...source,
    mode: normalizeCameraMode(source.mode),
    ...(positiveNumber(source.padding) ? { padding: Number(source.padding) } : {}),
    ...(positiveNumber(source.maxZoom) ? { maxZoom: Number(source.maxZoom) } : {}),
    ...(positiveNumber(source.zoom) ? { zoom: Number(source.zoom) } : {}),
    ...(source.pan && Number.isFinite(Number(source.pan.x)) && Number.isFinite(Number(source.pan.y))
      ? { pan: { x: Number(source.pan.x), y: Number(source.pan.y) } }
      : {})
  };
}

/**
 * Resolve the semantic focus into a camera composition. IDs are explicit and
 * deterministic; Cytoscape collections are assembled by collectCameraElements.
 */
export function resolveCameraPlan(frame = {}, model = {}) {
  const rawCamera = frame.stage?.camera || {};
  const camera = normalizeCamera(rawCamera);
  const resolvedFocus = frame.focus || null;
  // compilePresentation wraps the authored focus as { focus, nodeIds, ... }.
  // Accept both that resolved shape and the direct semantic shape used by
  // callers/tests so the camera boundary stays independent of the compiler.
  const focus = resolvedFocus?.focus && typeof resolvedFocus.focus === "object"
    ? {
      ...resolvedFocus.focus,
      ...(resolvedFocus.nodeIds ? { nodeIds: resolvedFocus.nodeIds } : {}),
      ...(resolvedFocus.edgeIds ? { edgeIds: resolvedFocus.edgeIds } : {}),
      ...(resolvedFocus.loopIds ? { loopIds: resolvedFocus.loopIds } : {})
    }
    : resolvedFocus;
  const loopsById = new Map((model.loops || []).map(loop => [loop.id, loop]));
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
  const mode = camera.mode === "fixed"
    ? "fixed"
    : hasAuthoredMode
      ? camera.mode
      : hasFocus ? "fit-focus" : "fit-map";
  const kind = focus?.kind || inferKind({ nodeIds, edgeIds, loopIds });
  const targetKind = mode === "follow-path" || kind === "path"
    ? "path"
    : mode === "fit-set" || kind === "set"
      ? "set"
      : kind === "node"
        ? "node-neighborhood"
        : kind === "edge"
          ? "edge"
          : kind === "loop"
            ? "loop"
            : hasFocus ? "set" : "map";

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

/**
 * Return the semantic element IDs needed by the target. This is useful for
 * tests, accessibility snapshots and non-Cytoscape integrations.
 */
export function cameraTargetIds(plan = {}) {
  if (plan.isMap || plan.mode === "fixed") return { nodeIds: [], edgeIds: [] };
  return {
    nodeIds: uniqueIds(plan.nodeIds || []),
    edgeIds: uniqueIds(plan.edgeIds || [])
  };
}

/**
 * Build one collection for both the editor and standalone Cytoscape players.
 * An edge means edge + its two endpoints. A node means its closed
 * neighbourhood, matching the requested node-with-adjacent-connections view.
 */
export function collectCameraElements(cy, plan = {}) {
  if (!cy || !plan || plan.mode === "fixed") return null;
  const visible = item => item?.length && (typeof item.visible !== "function" || item.visible());
  const add = (collection, item) => visible(item) ? collection.union(item) : collection;
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

/**
 * Compute and cap a fit viewport without changing its semantic centre.
 */
export function getCameraViewport(cy, plan, { padding = 68, maxZoom, rect = null } = {}) {
  const collection = collectCameraElements(cy, plan);
  if (!collection?.length || typeof cy.getFitViewport !== "function") return null;
  const requestedPadding = plan.camera.padding || padding;
  // Presentation V2 stores a screen-space padding intent. A lower-third or
  // Story Studio dock can narrow the live safe rectangle, so cap that intent
  // relative to the actual geometry instead of shrinking the map to a sliver.
  const effectivePadding = rect ? clampFitPadding(requestedPadding, rect) : requestedPadding;
  const box = collection.boundingBox({ includeLabels: true });
  const viewport = rect
    ? fitViewportToRect({
      boundingBox: { x: box.x1, y: box.y1, width: box.w, height: box.h },
      rect,
      padding: effectivePadding
    })
    : cy.getFitViewport(collection, effectivePadding);
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
  return [...new Set(ids.filter(id => typeof id === "string" && id.length))];
}

function positiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}
