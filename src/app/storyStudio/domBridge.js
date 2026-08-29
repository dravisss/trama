/**
 * Transitional DOM bridge for the React-owned Story Studio surface.
 *
 * React owns the markup; the imperative adapter owns domain services such as
 * compilation, persistence and Cytoscape. This module keeps the boundary
 * explicit and disposable: it only translates DOM intents into injected
 * commands and returns an unsubscribe function for tests or hot reload.
 */

function listen(cleanups, target, eventName, handler, options) {
  if (!target?.addEventListener) return;
  target.addEventListener(eventName, handler, options);
  cleanups.push(() => target.removeEventListener(eventName, handler, options));
}

function activateTab(tabs, tab, activate) {
  const index = tabs.indexOf(tab);
  if (index < 0) return;
  activate(tab);
  tab.focus?.();
}

function handleTablistKeydown(event, tabs, activate) {
  if (!tabs.includes(event.currentTarget)) return;
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const current = Math.max(0, tabs.indexOf(event.currentTarget));
  const next = event.key === "Home" ? 0
    : event.key === "End" ? tabs.length - 1
      : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  activateTab(tabs, tabs[next], activate);
}

export function createStoryStudioDomBridge({ elements = {}, actions = {}, documentRef = globalThis.document } = {}) {
  const cleanups = [];
  const on = (target, eventName, handler, options) => listen(cleanups, target, eventName, handler, options);

  const editorTabs = [elements.storySidebarInspector, elements.storySidebarMarkdown].filter(Boolean);
  const setEditorMode = mode => actions.setEditorMode?.(mode);

  on(documentRef, "click", event => {
    const tab = event.target?.closest?.("#story-sidebar-inspector, #story-sidebar-markdown");
    if (!tab) return;
    setEditorMode(tab.id === "story-sidebar-markdown" ? "markdown" : "visual");
  });
  editorTabs.forEach(tab => on(tab, "keydown", event => handleTablistKeydown(event, editorTabs, current => {
    setEditorMode(current.id === "story-sidebar-markdown" ? "markdown" : "visual");
  })));

  (elements.storyModeTabs || []).forEach(tab => {
    on(tab, "click", () => setEditorMode(tab.dataset.storyMode));
    on(tab, "keydown", event => handleTablistKeydown(event, elements.storyModeTabs, current => setEditorMode(current.dataset.storyMode)));
  });

  on(elements.dockPresent, "click", () => actions.present?.());
  on(elements.generatePresentation, "click", () => actions.generate?.());
  on(elements.validatePresentation, "click", () => actions.validate?.());
  on(elements.applyPresentationFixes, "click", () => actions.applyFixes?.());
  on(elements.savePresentation, "click", () => actions.save?.());
  on(elements.duplicatePresentation, "click", () => actions.duplicate?.());
  on(elements.deletePresentation, "click", () => actions.removePresentation?.());
  on(elements.addSelectionBeat, "click", () => actions.addSelectionBeat?.());
  on(elements.captureCanvasScene, "click", () => actions.captureCanvasScene?.());
  on(elements.addQueryBeat, "click", () => actions.addQueryBeat?.());
  on(elements.addLoopScene, "click", () => actions.addLoopScene?.());

  on(elements.storyRefocusCurrent, "click", () => {
    const frame = actions.currentFrame?.();
    if (frame) actions.focusBeat?.(frame.sceneId, frame.beatId);
  });
  on(elements.storyCanvasSelectionAction, "click", () => actions.addSelectionBeat?.());
  on(elements.storyCanvasFullscreen, "click", () => actions.toggleFullscreen?.());
  on(elements.storyTimelineScrubber, "input", event => actions.selectFrame?.(Number(event.currentTarget.value)));
  on(elements.storyTimelineAddScene, "click", () => actions.addLoopScene?.());
  on(elements.storyTimelineAddManualScene, "click", () => actions.addManualScene?.());
  on(elements.storyMobileInspectorToggle, "click", () => actions.toggleMobileInspector?.());
  on(elements.storyMobileInspectorClose, "click", () => actions.closeMobileInspector?.());
  on(documentRef, "keydown", event => {
    if (event.key !== "Escape") return;
    if (!documentRef.body?.classList.contains("story-inspector-mobile-open")) return;
    event.preventDefault();
    actions.closeMobileInspector?.();
  });
  on(elements.storyTimelineFirst, "click", () => actions.selectFrame?.(0));
  on(elements.storyTimelinePrevious, "click", () => actions.selectFrame?.((actions.currentIndex?.() || 0) - 1));
  on(elements.storyTimelineNext, "click", () => actions.selectFrame?.((actions.currentIndex?.() || 0) + 1));
  on(elements.storyTimelineLast, "click", () => actions.selectFrame?.(Math.max(0, (actions.timeline?.().length || 1) - 1)));
  on(elements.storyTimelinePreview, "click", () => {
    const frame = actions.currentFrame?.();
    if (frame) actions.previewFromBeat?.(frame.sceneId, frame.beatId);
  });
  on(elements.storySelectedNotes, "change", event => {
    const frame = actions.currentFrame?.();
    if (frame) actions.updateBeat?.(frame.sceneId, frame.beatId, { speakerNotesMd: event.currentTarget.value });
  });

  on(elements.validatePresentationSource, "click", () => actions.validateSource?.(false));
  on(elements.applyPresentationSource, "click", () => actions.applySource?.());
  on(elements.exportPresentationSource, "click", () => actions.exportSource?.());
  on(elements.exportPresentationHtml, "click", () => actions.exportHtml?.());
  on(elements.presentationSourceEditor, "input", event => actions.updateSourceDraft?.(event.currentTarget.value));
  on(elements.presentationTitleInput, "change", event => actions.updateTitle?.(event.currentTarget.value));
  on(elements.presentationStyleInput, "change", event => actions.updatePresentationStyle?.(event.currentTarget.value));

  on(elements.storyInspectorTitle, "change", event => actions.updateInspector?.({ title: event.currentTarget.value }));
  on(elements.storyInspectorTitle, "keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    actions.updateInspector?.({ title: event.currentTarget.value });
  });
  on(elements.storyInspectorType, "change", event => actions.updateInspector?.({ type: event.currentTarget.value }));
  on(elements.storyInspectorNarration, "change", event => actions.updateInspector?.({ narrationMd: event.currentTarget.value }));
  on(elements.storyInspectorDurationPreset, "change", event => actions.updateDurationPreset?.(event.currentTarget.value));
  on(elements.storyInspectorCustomDuration, "change", event => actions.updateCustomDuration?.(event.currentTarget.value));
  on(elements.storyInspectorAdvance, "change", event => actions.updateInspector?.({ advance: event.currentTarget.value }));
  on(elements.storyInspectorTransition, "change", event => actions.updateInspector?.({ transition: event.currentTarget.value }));
  on(elements.storyInspectorCamera, "change", event => actions.updateInspector?.({ cameraMode: event.currentTarget.value }));
  on(documentRef, "click", event => {
    if (event.target?.closest?.("#story-inspector-add-selection")) {
      actions.addSelectionBeat?.();
    }
    if (event.target?.closest?.("#story-selection-create")) actions.addSelectionBeat?.();
    if (event.target?.closest?.("#story-selection-clear")) actions.clearSelection?.();
  });
  on(elements.storyInspectorCameraInfo, "click", () => actions.toggleCameraInfo?.());
  on(documentRef, "keydown", event => {
    if (event.key === "Escape") actions.closeCameraInfo?.();
  });
  on(documentRef, "click", event => {
    if (event.target?.closest?.("#story-inspector-camera-section")) return;
    actions.closeCameraInfo?.();
  });
  on(elements.storyInspectorUseSelection, "click", () => actions.useCanvasSelection?.());
  on(elements.storyInspectorCaptureState, "click", () => actions.captureState?.());
  on(elements.storyInspectorClearFocus, "click", () => actions.clearFocus?.());
  on(elements.storyInspectorSource, "change", event => actions.renderMovementOptions?.(event.currentTarget.value));
  on(documentRef, "keydown", event => {
    const target = event.target?.closest?.(".story-causal-node, .story-causal-relation");
    if (!target || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    if (target.classList.contains("story-causal-source")) {
      const picker = elements.storyInspectorSourcePicker;
      if (picker) picker.hidden = !picker.hidden;
      return;
    }
    if (target.dataset.sourceNodeId && target.dataset.targetNodeId) {
      actions.selectMovement?.(target.dataset.sourceNodeId, target.dataset.targetNodeId);
    }
  });
  on(documentRef, "click", event => {
    const sourceOption = event.target?.closest?.(".story-movement-source-option[data-source-node-id]");
    if (sourceOption) {
      actions.renderMovementOptions?.(sourceOption.dataset.sourceNodeId);
      if (elements.storyInspectorSourcePicker) elements.storyInspectorSourcePicker.hidden = true;
      return;
    }
    const sourceNode = event.target?.closest?.(".story-causal-source[data-source-node-id]");
    if (sourceNode) {
      const picker = elements.storyInspectorSourcePicker;
      if (picker) picker.hidden = !picker.hidden;
      return;
    }
    const relation = event.target?.closest?.(".story-causal-relation[data-source-node-id][data-target-node-id], .story-causal-target[data-source-node-id][data-target-node-id]");
    if (relation) {
      actions.selectMovement?.(relation.dataset.sourceNodeId, relation.dataset.targetNodeId);
      return;
    }
    if (!event.target?.closest?.("#story-inspector-source-picker, .story-causal-source")) {
      if (elements.storyInspectorSourcePicker) elements.storyInspectorSourcePicker.hidden = true;
    }
  });
  on(elements.storyInspectorApplyMovement, "click", () => actions.applyMovement?.());
  on(documentRef, "click", event => {
    if (event.target?.closest?.("#story-inspector-edit-movement")) actions.editMovement?.();
  });
  on(elements.storyInspectorSuggestNext, "click", () => actions.suggestNextMovement?.());
  on(elements.storyInspectorDuplicate, "click", () => actions.duplicateBeat?.());
  on(elements.storyInspectorRemove, "click", () => actions.removeBeat?.());
  on(elements.storyInspectorRemoveScene, "click", () => actions.removeScene?.());

  on(elements.togglePresentationDiff, "click", () => actions.toggleDiff?.());

  return {
    destroy() {
      cleanups.splice(0).forEach(cleanup => cleanup());
    }
  };
}
