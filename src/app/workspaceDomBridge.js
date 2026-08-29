/**
 * Transitional DOM bridge for the non-Story Studio workspace shell.
 *
 * React owns the new Story Studio surface. The remaining workspace/editor
 * chrome is still rendered by the legacy adapter, but its DOM events live in
 * one disposable boundary so the app entrypoint does not accumulate another
 * layer of anonymous listeners.
 */

function listen(cleanups, target, eventName, handler, options) {
  if (!target?.addEventListener) return;
  target.addEventListener(eventName, handler, options);
  cleanups.push(() => target.removeEventListener?.(eventName, handler, options));
}

export function createWorkspaceDomBridge({
  elements = {},
  actions = {},
  documentRef = globalThis.document
} = {}) {
  const cleanups = [];
  const on = (target, eventName, handler, options) => listen(cleanups, target, eventName, handler, options);
  const isCommandDialogOpen = () => Boolean(elements.commandDialog?.open);
  const isSavePopoverOpen = () => Boolean(elements.savePopover && !elements.savePopover.hidden);
  const setSavePopoverOpen = open => actions.toggleSavePopover?.(Boolean(open));
  const openCommandMenu = () => (elements.commandMenus || []).find(menu => menu?.open) || null;
  const closeCommandMenu = ({ restoreFocus = false } = {}) => {
    const menu = openCommandMenu();
    if (!menu) return false;
    menu.open = false;
    if (restoreFocus) menu.querySelector?.("summary")?.focus?.();
    return true;
  };
  const closeSavePopover = ({ restoreFocus = false } = {}) => {
    if (!isSavePopoverOpen()) return false;
    setSavePopoverOpen(false);
    if (restoreFocus) elements.saveStatus?.focus?.();
    return true;
  };

  on(elements.projectBackupFile, "change", event => actions.importProjectBackup?.(event));

  on(elements.workspaceLoopSourceFile, "change", event => actions.importLoopSourceAsNewMap?.(event));
  on(elements.importJsonFile, "change", event => actions.importJsonFile?.(event));

  on(elements.saveStatus, "click", () => setSavePopoverOpen(!isSavePopoverOpen()));
  on(elements.retrySave, "click", () => actions.retrySave?.());

  on(elements.routeHandle, "pointerdown", event => actions.startRouteDrag?.(event));
  on(elements.connectionHandle, "pointerdown", event => actions.startConnectionDrag?.(event));
  on(elements.editPopover, "submit", event => actions.savePopoverChanges?.(event));
  on(elements.deleteSelection, "click", () => actions.deleteCurrentSelection?.());

  on(elements.presentationLibrary, "click", event => {
    const trigger = event.target?.closest?.("[data-presentation-id]");
    if (trigger) actions.selectProjectPresentation?.(trigger.dataset.presentationId);
  });
  on(elements.relationView, "click", event => {
    const trigger = event.target?.closest?.("[data-edge-id]");
    if (trigger) actions.focusRelation?.(trigger.dataset.edgeId);
  });
  const openProjectFromList = event => {
    const trigger = event.target?.closest?.("[data-project-path]");
    if (trigger) actions.openProjectPath?.(trigger.dataset.projectPath, trigger.dataset.projectMessage);
  };
  on(elements.localProjects, "click", openProjectFromList);
  on(elements.recentProjects, "click", openProjectFromList);
  on(elements.loopDescriptionForm, "submit", event => actions.saveLoopDescriptionForm?.(event));
  on(elements.loopDescriptionInput, "input", () => actions.updateLoopDescriptionPreview?.());
  on(elements.loopSummaryInput, "input", () => actions.updateLoopDescriptionPreview?.());
  on(elements.closeLoopDescription, "click", () => actions.closeLoopDescriptionModal?.());
  on(elements.cancelLoopDescription, "click", () => actions.closeLoopDescriptionModal?.());
  on(documentRef, "keydown", event => {
    // A native modal owns Escape and focus restoration. Background menus and
    // editor shortcuts must not react to the same keystroke.
    if (isCommandDialogOpen()) return;
    if (event.key === "Escape" && closeSavePopover({ restoreFocus: true })) {
      event.preventDefault?.();
      return;
    }
    if (event.key === "Escape" && closeCommandMenu({ restoreFocus: true })) {
      event.preventDefault?.();
      return;
    }
    actions.handleKeydown?.(event);
  });
  on(documentRef, "pointerdown", event => {
    if (isCommandDialogOpen()) return;
    const target = event.target;
    if (isSavePopoverOpen() && !elements.saveStatus?.contains?.(target) && !elements.savePopover?.contains?.(target)) {
      closeSavePopover();
    }
    const menu = openCommandMenu();
    if (menu && !menu.contains?.(target)) closeCommandMenu();
  });
  on(elements.stage, "click", event => actions.handleStageClick?.(event));
  on(elements.stage, "dblclick", event => actions.handleStageDoubleClick?.(event));
  on(elements.loopSourceEditor, "input", event => actions.updateLoopSourceDraft?.(event));
  on(elements.previewLoopSource, "click", () => actions.previewLoopSource?.());
  on(elements.discardLoopSource, "click", () => actions.discardLoopSource?.());
  on(elements.applyLoopSource, "click", () => actions.applyLoopSource?.());
  on(elements.importLoopSource, "click", () => elements.loopSourceFile?.click?.());
  on(elements.exportLoopSource, "click", () => actions.exportLoopSource?.());
  on(elements.loopSourceFile, "change", event => actions.importLoopSourceFile?.(event));

  return {
    destroy() {
      cleanups.splice(0).forEach(cleanup => cleanup());
    }
  };
}
