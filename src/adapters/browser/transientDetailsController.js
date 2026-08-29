/**
 * Browser adapter for short-lived details menus and modal backdrop dismissal.
 *
 * This owns only browser event lifecycle. It does not know application state,
 * React, Cytoscape, persistence, or domain rules.
 */
export function createTransientDetailsController({
  documentRef = globalThis.document,
  loopDescriptionModal = null,
  onCloseLoopDescription,
  transientDetailsSelector = [
    "details.command-menu",
    "details.editor-loop-selector",
    "details.edit-toolbar-more",
    "details.story-workbench-settings",
    "details.story-playback-options"
  ].join(",")
} = {}) {
  const cleanups = [];
  const listen = (target, eventName, handler, options) => {
    if (!target?.addEventListener) return;
    target.addEventListener(eventName, handler, options);
    cleanups.push(() => target.removeEventListener?.(eventName, handler, options));
  };
  const hasOpenModal = () => Boolean(documentRef?.querySelector?.("dialog[open]"));

  const closeTransientDetails = (except = null) => {
    documentRef?.querySelectorAll?.(`${transientDetailsSelector}[open]`).forEach(detail => {
      const belongsToExcept = except && (detail === except || detail.contains?.(except) || except.contains?.(detail));
      if (!belongsToExcept) detail.open = false;
    });
  };

  documentRef?.querySelectorAll?.(transientDetailsSelector).forEach(detail => {
    listen(detail, "toggle", () => {
      if (detail.open) closeTransientDetails(detail);
    });
  });

  documentRef?.querySelectorAll?.(".command-menu-panel button").forEach(button => {
    listen(button, "click", () => closeTransientDetails());
  });

  listen(documentRef, "pointerdown", event => {
    if (hasOpenModal()) return;
    if (!event.target?.closest?.(transientDetailsSelector)) closeTransientDetails();
  });
  listen(documentRef, "keydown", event => {
    if (event.key === "Escape" && !hasOpenModal()) closeTransientDetails();
  });
  listen(loopDescriptionModal, "click", event => {
    if (event.target === loopDescriptionModal) onCloseLoopDescription?.();
  });

  return {
    closeTransientDetails,
    destroy() {
      cleanups.splice(0).forEach(cleanup => cleanup());
    }
  };
}
