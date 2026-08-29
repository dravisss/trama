/**
 * Imperative boundary between the CLD engine and the application adapter.
 *
 * The engine is intentionally framework agnostic. This bridge translates its
 * domain/render events into injected application intents and owns the
 * subscription lifecycle so mounting the editor more than once cannot leak
 * listeners.
 */

function listen(cleanups, target, eventName, handler) {
  if (!target?.addEventListener) return;
  target.addEventListener(eventName, handler);
  cleanups.push(() => target.removeEventListener?.(eventName, handler));
}

export function createEngineBridge({ engine, elements = {}, actions = {} } = {}) {
  const cleanups = [];
  const on = (eventName, handler) => listen(cleanups, engine, eventName, handler);

  on("route", event => {
    const result = event.detail || {};
    if (elements.routePerformance) {
      elements.routePerformance.textContent =
        `${result.quality} · ${Number(result.durationMs || 0).toFixed(1)} ms · ${result.crossings || 0} cruzamentos` +
        (result.loopCrossings ? ` · ${result.loopCrossings} nos loops` : "") +
        (result.lockedCrossings ? ` · ${result.lockedCrossings} bloqueados` : "");
    }
    actions.onRoute?.(result);
  });

  on("viewchange", event => actions.onViewChange?.(event.detail?.view));

  on("edgeactivate", event => {
    const edge = event.detail?.edge;
    if (!edge) return;
    actions.onEdgeActivate?.(edge, event.detail);
  });

  on("selectionchange", event => {
    const detail = event.detail || {};
    actions.onSelectionChange?.(detail.nodeIds || [], detail.edgeIds || [], detail);
  });

  on("nodeactivate", event => {
    const node = event.detail?.node;
    if (!node) return;
    actions.onNodeActivate?.(node, event.detail);
  });

  on("backgroundactivate", event => actions.onBackgroundActivate?.(event.detail));

  on("positionchange", event => actions.onPositionChange?.(event.detail));
  on("routechange", event => actions.onRouteChange?.(event.detail));
  on("layoutend", event => actions.onLayoutEnd?.(event.detail));
  on("nodelockchange", event => actions.onNodeLockChange?.(event.detail));
  on("modelmutate", event => actions.onModelMutate?.(event.detail));

  return {
    destroy() {
      cleanups.splice(0).forEach(cleanup => cleanup());
    }
  };
}
