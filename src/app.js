import { createCLD } from "./CLDEngine.js";
import { applySavedLayout, cloneModel, extractLayout } from "./app/layoutStorage.js";
import { createEmptyModel, normalizeModel, slugId, validateModel } from "./core/model.js";
import { discoverLoops } from "./core/loops.js";
import { examples } from "./models/examples.js";
import { matchaTheme } from "./themes/matcha.js";
import { PresentationController } from "./presentation/controller.js";
import { compilePresentation } from "./presentation/compiler.js";
import { normalizePresentation } from "./presentation/schema.js";
import { getCameraViewport, resolveCameraPlan } from "./presentation/camera.js";
import {
  createPresentationChapter,
  duplicatePresentationChapter as duplicateChapterOperation,
  duplicatePresentationBeats,
  duplicatePresentationScenes,
  duplicatePresentationScene as duplicateSceneOperation,
  movePresentationScenesToChapter,
  removePresentationChapter,
  removePresentationItems
} from "./presentation/editorOperations.js";
import { suggestPresentation, repairGeneratedPresentation } from "./presentation/director.js";
import { applyMovementToBeat, causalMovementOptions, movementFromBeat, resolveCausalMovement, suggestNextCausalMovements } from "./presentation/causalEditing.js";
import { createMovementBeat } from "./presentation/movementDraft.js";
import { describeMovement } from "./presentation/movementDescriptor.js";
import { lintPresentation, applyLintFixes } from "./presentation/lint.js";
import { buildViewLegend, resolveView, stylePropertiesForEntity } from "./core/views.js";
import { compileLoopMarkdown, serializeLoopMarkdown } from "./language/loopMarkdown.js";
import { compilePresentationMarkdown, serializePresentationMarkdown } from "./language/presentationMarkdown.js";
import { mergeEditorialPresentation } from "./presentation/editorial.js";
import { searchPresentationStoryboard } from "./presentation/search.js";
import { compileLoopStyle, serializeLoopStyle } from "./language/styleLanguage.js";
import { createViewFromStylePreset, stylePresetOptions } from "./styles/library.js";
import { importMermaid } from "./language/mermaid.js";
import { apiFetch } from "./app/api.js";
import { createAppShellController } from "./app/appShell.js";
import { createAppStore } from "./app/appStore.js";
import { createAppCommands } from "./app/appCommands.js";
import { createCommandDialogController } from "./app/commandDialog.js";
import { createExplorePanelController } from "./app/explorePanel.js";
import { normalizePresentationSelection, presentationSceneIds, resolvePresentationTarget, storyBeatTitle, timelineIndexForBeat } from "./app/storyStudio/selectors.js";
import { createStoryStudioState } from "./app/storyStudio/state.js";
import { createStoryStudioCommandBus } from "./app/storyStudio/commands.js";
import { createStoryInspectorViewModel } from "./app/storyStudio/inspector.js";
import { createStoryStudioDomBridge } from "./app/storyStudio/domBridge.js";
import { createWorkspaceDomBridge } from "./app/workspaceDomBridge.js";
import { createEngineBridge } from "./app/engineBridge.js";
import { createTransientDetailsController } from "./adapters/browser/transientDetailsController.js";
import { createApplicationComposition } from "./app/applicationComposition.js";
import { createQaRuntime } from "./qa/runtime.js";
import { createRoutingFixture } from "./qa/routingFixtures.js";
import { createFrameScheduler } from "./performance/frameScheduler.js";
import { measureCanvasSafeRect } from "./app/canvasViewport.js";
import { fitViewportToRect } from "./geometry/fitViewport.js";
import {
  chooseTooltipPlacement,
  createTooltipTrackingState,
  trackTooltipPlacement
} from "./presentation/tooltipLayout.js";
import { renderPresentationMarkdown } from "./presentation/markdown.js";
import {
  presentationCameraMotion as styleCameraMotion,
  presentationCameraMaxZoom as styleCameraMaxZoom,
  presentationConnectorMode,
  resolvePresentationStyle,
  usesContextualPresentation
} from "./presentation/styleProfiles.js";
import fcose from "cytoscape-fcose";

const reactRuntime = typeof window !== "undefined" ? window.TramaReact || window.LoopViewerReact || {} : {};
const appStore = createAppStore();
const appCommands = createAppCommands(appStore);

if (typeof cytoscapeCoseBilkent !== "undefined") cytoscape.use(cytoscapeCoseBilkent);
if (typeof cytoscape !== "undefined") {
  cytoscape.use(fcose);
  globalThis.__TRAMA_FCOSE__ = true;
}

const reactApp = reactRuntime.mountReactApp?.({
  shellRoot: document.querySelector("#react-root"),
  workspaceRoot: document.querySelector("#workspace-home"),
  store: appStore,
  onModeChange: mode => setWorkspaceMode(mode),
  onAction: action => {
    const actions = {
      present: () => startPresentation(),
      focus: () => setFocusMode(!focusMode),
      edit: () => setEditing(!editing),
      fit: () => fitCanvas(),
      newProject: createNewProjectDb,
      openProject: openProjectDb,
      exportProjectBackup,
      importProjectBackup: () => document.querySelector("#project-backup-file")?.click(),
      exportProjectStandalone,
      newDiagram: createNewDiagram,
      duplicateLoop: duplicateActiveLoop,
      renameLoop: renameActiveLoop,
      deleteLoop: deleteActiveLoop,
      importJson: () => document.querySelector("#import-json-file")?.click(),
      exportJson,
      exportStandalone,
      relayout: () => {
        engine.relayout();
        markLayoutDirty();
      },
      toggleSidebar: () => workspaceMode === "map"
        ? setEditorDockCollapsed(!elements.editorDock.classList.contains("collapsed"))
        : setSidebarCollapsed(!sidebarCollapsed),
      editProjectMetadata: () => editProjectMetadata({ restoreFocusTo: document.querySelector("#edit-project-metadata") }),
      exitStoryWorkspace: () => setWorkspaceMode(previousWorkspaceMode === "story" ? "map" : previousWorkspaceMode || "map")
    };
    actions[action]?.();
  }
});

const elements = {
  appModeTitle: document.querySelector("#app-mode-title"),
  appModeSubtitle: document.querySelector("#app-mode-subtitle"),
  workspaceHome: document.querySelector("#workspace-home"),
  workspaceHomeStatus: document.querySelector("#workspace-home-status"),
  workspaceProjectGrid: document.querySelector("#workspace-project-grid"),
  workspaceMapList: document.querySelector("#workspace-map-list"),
  workspaceNewProject: document.querySelector("#workspace-new-project"),
  workspaceOpenProject: document.querySelector("#workspace-open-project"),
  workspaceCreateMap: document.querySelector("#workspace-create-map"),
  workspaceImportMarkdown: document.querySelector("#workspace-import-markdown"),
  workspaceLoopSourceFile: document.querySelector("#workspace-loop-source-file"),
  projectSwitcher: document.querySelector("#project-switcher"),
  commandMenus: [...document.querySelectorAll(".command-menu")],
  activeProjectLabel: document.querySelector("#active-project-label"),
  activeLoopLabel: document.querySelector("#active-loop-label"),
  saveStatus: document.querySelector("#save-status"),
  savePopover: document.querySelector("#save-popover"),
  savePopoverMessage: document.querySelector("#save-popover-message"),
  retrySave: document.querySelector("#retry-save"),
  localProjects: document.querySelector("#local-projects"),
  recentProjects: document.querySelector("#recent-projects"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  storyExitWorkspace: document.querySelector("#story-exit-workspace"),
  workspaceSidebar: document.querySelector("#workspace-sidebar"),
  editToolbar: document.querySelector("#edit-toolbar"),
  mapControls: document.querySelector(".map-controls"),
  storyCanvasHeader: document.querySelector("#story-canvas-header"),
  storyCanvasSelectionTitle: document.querySelector("#story-canvas-selection-title"),
  storyCanvasSelectionMeta: document.querySelector("#story-canvas-selection-meta"),
  storySelectionBar: document.querySelector("#story-selection-bar"),
  storySelectionCount: document.querySelector("#story-selection-count"),
  storySelectionClear: document.querySelector("#story-selection-clear"),
  storySelectionCreate: document.querySelector("#story-selection-create"),
  storyRefocusCurrent: document.querySelector("#story-refocus-current"),
  storyCanvasFullscreen: document.querySelector("#story-canvas-fullscreen"),
  storyTimelineStatus: document.querySelector("#story-timeline-status"),
  storyTimelineAddScene: document.querySelector("#story-timeline-add-scene"),
  storyTimelineAddManualScene: document.querySelector("#story-timeline-add-manual-scene"),
  storyMobileInspectorToggle: document.querySelector("#story-mobile-inspector-toggle"),
  storyMobileInspectorClose: document.querySelector("#story-mobile-inspector-close"),
  storyTimelineTime: document.querySelector("#story-timeline-time"),
  storyTimelineScrubber: document.querySelector("#story-timeline-scrubber"),
  storyTimelineReactRoot: document.querySelector("#react-story-timeline-root"),
  storyTimelinePrevious: document.querySelector("#story-timeline-previous"),
  storyTimelinePreview: document.querySelector("#story-timeline-preview"),
  storyTimelineNext: document.querySelector("#story-timeline-next"),
  storyTimelineFirst: document.querySelector("#story-timeline-first"),
  storyTimelineLast: document.querySelector("#story-timeline-last"),
  storySelectedNotes: document.querySelector("#story-selected-notes"),

  relayout: document.querySelector("#relayout"),
  fit: document.querySelector("#fit"),
  newProjectDb: document.querySelector("#new-project-db"),
  openProjectDb: document.querySelector("#open-project-db"),
  exportProjectBackup: document.querySelector("#export-project-backup"),
  importProjectBackup: document.querySelector("#import-project-backup"),
  projectBackupFile: document.querySelector("#project-backup-file"),
  newDiagram: document.querySelector("#new-diagram"),
  renameLoopMenu: document.querySelector("#rename-loop-menu"),
  importJson: document.querySelector("#import-json"),
  importJsonFile: document.querySelector("#import-json-file"),
  exportJson: document.querySelector("#export-json"),
  duplicateLoop: document.querySelector("#duplicate-loop"),
  deleteLoop: document.querySelector("#delete-loop"),
  editToggle: document.querySelector("#edit-toggle"),
  focusToggle: document.querySelector("#focus-toggle"),
  exportStandalone: document.querySelector("#export-standalone"),
  exportWithSidebar: document.querySelector("#export-with-sidebar"),
  exportProjectStandalone: document.querySelector("#export-project-standalone"),
  exportProjectWithSidebar: document.querySelector("#export-project-with-sidebar"),
  presentToggle: document.querySelector("#present-toggle"),
  stageShell: document.querySelector(".stage"),
  stage: document.querySelector("#map-area"),
  loopSelect: document.querySelector("#loop-select"),
  activeLoopSelectLabel: document.querySelector("#active-loop-select-label"),
  activeLoopSelectMeta: document.querySelector("#active-loop-select-meta"),
  inspectorTabs: [...document.querySelectorAll("[data-inspector-tab]")],
  relationView: document.querySelector("#relation-view"),
  loopsView: document.querySelector("#loops-view"),
  loopSummary: document.querySelector("#loop-summary"),
  loopList: document.querySelector("#loop-list"),
  addNode: document.querySelector("#add-node"),
  routeHandle: document.querySelector("#route-handle"),
  connectionHandle: document.querySelector("#connection-handle"),
  connectionPreview: document.querySelector("#connection-preview"),
  resetLayout: document.querySelector("#reset-layout"),
  routeQuality: document.querySelector("#route-quality"),
  routePerformance: document.querySelector("#route-performance"),
  explorePanel: document.querySelector("#explore-detail-panel"),
  exploreLoopTitle: document.querySelector("#explore-loop-title"),
  exploreLoopType: document.querySelector("#explore-loop-type"),
  exploreLoopPath: document.querySelector("#explore-loop-path"),
  exploreLoopMeta: document.querySelector("#explore-loop-meta"),
  exploreLoopDescription: document.querySelector("#explore-loop-description"),
  exploreLoopEdges: document.querySelector("#explore-loop-edges"),
  exploreLoopChoices: document.querySelector("#explore-loop-choices"),
  exploreWalkLoop: document.querySelector("#explore-walk-loop"),
  toast: document.querySelector("#toast"),
  editPopover: document.querySelector("#edit-popover"),
  nodeEditor: document.querySelector("#node-editor"),
  nodeLabel: document.querySelector("#node-label"),
  edgeEditor: document.querySelector("#edge-editor"),
  edgeSourceSign: document.querySelector("#edge-source-sign"),
  edgeTargetSign: document.querySelector("#edge-target-sign"),
  edgeDescription: document.querySelector("#edge-description"),
  deleteSelection: document.querySelector("#delete-selection"),
  presentationCard: document.querySelector("#presentation-card"),
  presentationProgress: document.querySelector("#presentation-progress"),
  presentationStudyLabel: document.querySelector("#presentation-study-label"),
  presentationTitle: document.querySelector("#presentation-title"),
  presentationBody: document.querySelector("#presentation-body"),
  presentationRelationMeta: document.querySelector("#presentation-relation-meta"),
  presentationImage: document.querySelector("#presentation-image"),
  presentationPrevious: document.querySelector("#presentation-previous"),
  presentationNext: document.querySelector("#presentation-next"),
  presentationPresenterToggle: document.querySelector("#presentation-presenter-toggle"),
  presentationPresenterPanel: document.querySelector("#presentation-presenter-panel"),
  presentationPresenterTimer: document.querySelector("#presentation-presenter-timer"),
  presentationPresenterPosition: document.querySelector("#presentation-presenter-position"),
  presentationPresenterNotes: document.querySelector("#presentation-presenter-notes"),
  presentationPresenterNext: document.querySelector("#presentation-presenter-next"),
  presentationInlineLayer: document.querySelector("#presentation-inline-layer"),
  presentationInlineAnnotation: document.querySelector("#presentation-inline-annotation"),
  presentationInlineIndex: document.querySelector("#presentation-inline-index"),
  presentationInlineLabel: document.querySelector("#presentation-inline-label"),
  presentationInlineTitle: document.querySelector("#presentation-inline-title"),
  presentationInlineBody: document.querySelector("#presentation-inline-body"),
  presentationTooltipConnector: document.querySelector("#presentation-tooltip-connector"),
  presentationClose: document.querySelector("#presentation-close"),
  focusExit: document.querySelector("#focus-exit"),
  loopDescriptionModal: document.querySelector("#loop-description-modal"),
  loopDescriptionForm: document.querySelector("#loop-description-form"),
  loopSummaryInput: document.querySelector("#loop-summary-input"),
  loopDescriptionInput: document.querySelector("#loop-description-input"),
  loopDescriptionPreview: document.querySelector("#loop-description-preview"),
  closeLoopDescription: document.querySelector("#close-loop-description"),
  cancelLoopDescription: document.querySelector("#cancel-loop-description"),
  commandDialog: document.querySelector("#command-dialog"),
  commandDialogForm: document.querySelector("#command-dialog-form"),
  commandDialogTitle: document.querySelector("#command-dialog-title"),
  commandDialogDescription: document.querySelector("#command-dialog-description"),
  commandDialogFields: document.querySelector("#command-dialog-fields"),
  commandDialogSubmit: document.querySelector("#command-dialog-submit"),
  commandDialogClose: document.querySelector("#command-dialog-close"),
  commandDialogCancel: document.querySelector("#command-dialog-cancel"),
  editorDock: document.querySelector("#editor-dock"),
  dockPanel: document.querySelector("#dock-panel"),
  dockTitle: document.querySelector("#dock-title"),
  dockContents: [...document.querySelectorAll("[data-dock-content]")],
  dockInspectorForm: document.querySelector("#dock-inspector-form"),
  loopSourceEditor: document.querySelector("#loop-source-editor"),
  loopSourceStatus: document.querySelector("#loop-source-status"),
  previewLoopSource: document.querySelector("#preview-loop-source"),
  discardLoopSource: document.querySelector("#discard-loop-source"),
  applyLoopSource: document.querySelector("#apply-loop-source"),
  importLoopSource: document.querySelector("#import-loop-source"),
  exportLoopSource: document.querySelector("#export-loop-source"),
  loopSourceFile: document.querySelector("#loop-source-file"),
  viewLegend: document.querySelector("#view-legend"),
  dockPresent: document.querySelector("#dock-present"),
  generatePresentation: document.querySelector("#generate-presentation"),
  validatePresentation: document.querySelector("#validate-presentation"),
  applyPresentationFixes: document.querySelector("#apply-presentation-fixes"),
  savePresentation: document.querySelector("#save-presentation"),
  storyLintStatus: document.querySelector("#story-lint-status"),
  presentationTitleInput: document.querySelector("#presentation-title-input"),
  presentationStyleInput: document.querySelector("#presentation-style-input"),
  presentationLibrary: document.querySelector("#presentation-library"),
  duplicatePresentation: document.querySelector("#duplicate-presentation"),
  deletePresentation: document.querySelector("#delete-presentation"),
  addSelectionBeat: document.querySelector("#add-selection-beat"),
  captureCanvasScene: document.querySelector("#capture-canvas-scene"),
  presentationFocusQuery: document.querySelector("#presentation-focus-query"),
  addQueryBeat: document.querySelector("#add-query-beat"),
  storyModeTabs: [...document.querySelectorAll("[data-story-mode]")],
  storySidebarInspector: document.querySelector("#story-sidebar-inspector"),
  storySidebarMarkdown: document.querySelector("#story-sidebar-markdown"),
  presentationMarkdownPanel: document.querySelector("#presentation-markdown-panel"),
  presentationSourceEditor: document.querySelector("#presentation-source-editor"),
  presentationSourceStatus: document.querySelector("#presentation-source-status"),
  presentationSourceLineCount: document.querySelector("#presentation-markdown-line-count"),
  togglePresentationDiff: document.querySelector("#toggle-presentation-diff"),
  presentationSourceDiff: document.querySelector("#presentation-source-diff"),
  validatePresentationSource: document.querySelector("#validate-presentation-source"),
  applyPresentationSource: document.querySelector("#apply-presentation-source"),
  exportPresentationSource: document.querySelector("#export-presentation-source"),
  exportPresentationHtml: document.querySelector("#export-presentation-html"),
  storyInspectorTarget: document.querySelector("#story-inspector-target"),
  storyInspectorContext: document.querySelector("#story-inspector-context"),
  storyInspectorBasic: document.querySelector("#story-inspector-basic"),
  storyInspectorTitle: document.querySelector("#story-inspector-title"),
  storyInspectorType: document.querySelector("#story-inspector-type"),
  storyInspectorNarration: document.querySelector("#story-inspector-narration"),
  storyInspectorDurationPreset: document.querySelector("#story-inspector-duration-preset"),
  storyInspectorCustomDurationField: document.querySelector("#story-inspector-custom-duration-field"),
  storyInspectorCustomDuration: document.querySelector("#story-inspector-custom-duration"),
  storyInspectorAdvance: document.querySelector("#story-inspector-advance"),
  storyInspectorTransition: document.querySelector("#story-inspector-transition"),
  storyInspectorCamera: document.querySelector("#story-inspector-camera"),
  storyInspectorAddSelection: document.querySelector("#story-inspector-add-selection"),
  storyInspectorCameraTarget: document.querySelector("#story-inspector-camera-target"),
  storyInspectorCameraHelp: document.querySelector("#story-inspector-camera-help"),
  storyInspectorCameraInfo: document.querySelector("#story-inspector-camera-info"),
  storyInspectorCameraInfoPopover: document.querySelector("#story-inspector-camera-info-popover"),
  storyInspectorFocus: document.querySelector("#story-inspector-focus"),
  storyInspectorMovement: document.querySelector("#story-inspector-movement"),
  storyInspectorMovementLabel: document.querySelector("#story-inspector-movement-label"),
  storyInspectorMovementHelp: document.querySelector("#story-inspector-movement-help"),
  storyMovementSourceLabel: document.querySelector("#story-movement-source-label"),
  storyMovementHint: document.querySelector("#story-movement-hint"),
  storyInspectorCausalSvg: document.querySelector("#story-inspector-causal-svg"),
  storyInspectorSourcePicker: document.querySelector("#story-inspector-source-picker"),
  storyInspectorSource: document.querySelector("#story-inspector-source"),
  storyInspectorTargetNode: document.querySelector("#story-inspector-target-node"),
  storyInspectorMovementDestination: document.querySelector("#story-inspector-movement-destination"),
  storyInspectorMovementOptions: document.querySelector("#story-inspector-movement-options"),
  storyInspectorMovementStatus: document.querySelector("#story-inspector-movement-status"),
  storyInspectorApplyMovement: document.querySelector("#story-inspector-apply-movement"),
  storyInspectorEditMovement: document.querySelector("#story-inspector-edit-movement"),
  storyInspectorSuggestNext: document.querySelector("#story-inspector-suggest-next"),
  storyInspectorDuplicate: document.querySelector("#story-inspector-duplicate"),
  storyInspectorRemove: document.querySelector("#story-inspector-remove"),
  storyInspectorRemoveScene: document.querySelector("#story-inspector-remove-scene"),
  storyInspectorUseSelection: document.querySelector("#story-inspector-use-selection"),
  storyInspectorCaptureState: document.querySelector("#story-inspector-capture-state"),
  storyInspectorClearFocus: document.querySelector("#story-inspector-clear-focus"),
  storyInspectorStatus: document.querySelector("#story-inspector-status")
};

const openCommandDialog = createCommandDialogController({
  dialog: elements.commandDialog,
  form: elements.commandDialogForm,
  title: elements.commandDialogTitle,
  description: elements.commandDialogDescription,
  fields: elements.commandDialogFields,
  submit: elements.commandDialogSubmit,
  close: elements.commandDialogClose,
  cancel: elements.commandDialogCancel
});

// React owns the source-editor chrome while this application bridge remains
// the canonical writer for persisted Markdown and style source. Notify the
// chrome after imperative assignments so line counts never drift from source.
function syncCodeEditor(id) {
  document.dispatchEvent(new CustomEvent("trama:code-editor-sync", { detail: { id } }));
}

let movementComposerSession = 0;
function openMovementComposerDialog({ sceneTitle = "esta cena", model = {}, loops = [], initial = {} } = {}) {
  if (!reactApp?.renderMovementComposer) return Promise.resolve(null);
  return new Promise(resolve => {
    const sessionId = ++movementComposerSession;
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      reactApp.renderMovementComposer({ open: false, onSubmit: null, onCancel: null });
      resolve(value || null);
    };
    reactApp.renderMovementComposer({
      open: true,
      sessionId,
      sceneTitle,
      model,
      loops,
      initial,
      onSubmit: draft => finish(draft),
      onCancel: () => finish(null)
    });
  });
}

const fallbackWorkspace = examples.map((source, index) => {
  const { presentation, ...model } = source;
  return {
    id: `example:${model.id}`,
    kind: "example",
    label: projectDisplayName(model) || `Projeto ${index + 1}`,
    summary: model.description || "",
    description_md: model.description || "",
    model: cloneModel(model),
    presentation,
    persisted: false
  };
});

// Do not expose the bundled examples as an actionable workspace while the
// persisted project is still loading. Apart from producing a misleading first
// impression, that used to let a fast click open a presentation from the
// fallback map just before the real SQLite project replaced it.
let workspace = [];
let workspaceHydrating = true;
let project = { title: "Trama Workspace", description_md: "" };
let localProjectRecords = [];
let apiAvailable = false;
const saveTimers = new Map();
let activeIndex = 0;
let editing = false;
let focusMode = false;
let storyMode = false;
let workspaceMode = "workspace";
let previousWorkspaceMode = "map";
let sidebarCollapsed = false;
let activeLoopId = null;
let selectedNodeId = null;
let selectedEdgeId = null;
let selectedNodeIds = [];
let selectedEdgeIds = [];
let lastStorySelectionFocus = null;
let pendingConnectionSourceId = null;
let layoutDirty = false;
let styleDirty = false;
let loopFilterQuery = "";
let suppressLayoutDirty = false;
let hydratingEngine = false;
let toastTimer = null;
let curatedLoops = [];
let activePresentation = null;
let activePresentationRecord = null;
let projectPresentations = [];
let projectAssets = [];
let presentationController = null;
let presentationGeneration = 0;
let boundCy = null;
let fitFrame = null;
let fitTimer = null;
let cameraStableTimer = null;
let fitGeneration = 0;
let storyFlowTimer = null;
let storyFlowDirection = -1;
let lastSaveError = null;
let activePresentationReducedMotion = false;
let activeDockPanel = "map";
let activeTableTab = "nodes";
let copiedNodeStyle = null;
let storyEditorMode = "visual";
let presentationSourceDraft = "";
let loopSourcePreview = null;
let previewingLoopSource = false;
let collapsedPresentationScenes = new Set();
let selectedStorySceneId = null;
let selectedStoryBeatId = null;
let selectedStoryboardSceneIds = new Set();
let selectedStoryboardBeatIds = new Map();
let storyboardQuery = "";
let presenterMode = false;
let presenterStartedAt = 0;
let presenterTicker = null;
let currentPresentationFrame = null;
let explorePanelController = null;
let presentationUndoStack = [];
let presentationRedoStack = [];
const PRESENTATION_HISTORY_LIMIT = 60;
const storyStudioState = createStoryStudioState();

const engine = createCLD({
  container: "#cld-root",
  theme: matchaTheme,
  editable: false,
  assetResolver: assetId => apiAvailable && assetId
    ? `/api/assets/${encodeURIComponent(assetId)}`
    : ""
});
const {
  editMapCommand,
  workspacePersistence,
  saveMap,
  saveView,
  createView,
  duplicateView,
  deriveView,
  deleteView,
  editPresentation,
  savePresentation,
  exportStandaloneApplication,
  exportAtlasEmbedApplication
} = createApplicationComposition({
  engine,
  fetcher: apiFetch,
  snapshotEntry,
  toEntry: loop => loopRecordToEntry(loop),
  isAvailable: () => apiAvailable,
  resourceFetcher: path => fetch(path),
  downloadText
});

explorePanelController = createExplorePanelController({
  elements,
  getLoops: () => engine.getLoops({ discover: true, maxLength: 8, maxLoops: 24 })
    .map(loop => ({ ...loop, ...(findCuratedLoop(loop) || {}) })),
  getModel: () => engine.model,
  getActiveLoopId: () => activeLoopId,
  setActiveLoopId: id => {
    activeLoopId = id;
    appCommands.setActiveLoop(id);
  },
  onSelectLoop: loop => {
    document.body.classList.remove("explore-panel-closed");
    focusExploreLoop(loop);
  },
  renderMarkdown
});
function focusExploreLoop(loopOrId) {
  const loopId = typeof loopOrId === "string" ? loopOrId : loopOrId?.id;
  if (!loopId) return;
  activeLoopId = loopId;
  appCommands.setActiveLoop(loopId);
  engine.focusLoop(loopId);
  const applyFocusViewport = () => {
    const cy = engine.cy;
    if (!cy || typeof cy.zoom !== "function" || !document.body.classList.contains("explore-mode")) return;
    const loop = typeof loopOrId === "object" && loopOrId
      ? loopOrId
      : engine.getLoops({ discover: true, maxLength: 8, maxLoops: 24 }).find(item => item.id === loopId);
    if (!loop) return;
    let focused = cy.collection();
    (loop.nodeIds || []).forEach(id => { focused = focused.union(cy.getElementById(id)); });
    (loop.edgeIds || []).forEach(id => { focused = focused.union(cy.getElementById(id)); });
    if (!focused.length) return;
    const safeRect = measureCanvasSafeRect({
      canvas: engine.canvas,
      overlays: [elements.mapControls || ".map-controls", elements.explorePanel || "#explore-detail-panel"]
    });
    // Focus changes emphasis, not the map's physical extent. Use the full
    // visible graph for the safe fit so context nodes cannot be clipped by
    // the Explore panel while the selected loop remains highlighted.
    const fitTarget = safeRect ? cy.elements(":visible") : focused;
    const focusedBox = fitTarget.boundingBox({ includeLabels: true });
    const focusedViewport = safeRect
      ? fitViewportToRect({
        boundingBox: { x: focusedBox.x1, y: focusedBox.y1, width: focusedBox.w, height: focusedBox.h },
        rect: safeRect,
        padding: 120
      })
      : cy.getFitViewport(focused, 120);
    if (!focusedViewport || typeof focusedViewport.zoom !== "number") return;
    cancelScheduledFit();
    const targetZoom = Math.min(focusedViewport.zoom, 1.15);
    cy.zoom(targetZoom);
    if (safeRect) {
      const center = { x: (focusedBox.x1 + focusedBox.x2) / 2, y: (focusedBox.y1 + focusedBox.y2) / 2 };
      cy.pan({
        x: safeRect.x + safeRect.width / 2 - center.x * targetZoom,
        y: safeRect.y + safeRect.height / 2 - center.y * targetZoom
      });
    } else cy.center(focused);
    // Cytoscape may paint the focus classes on the next frame even when the
    // camera mutation itself is synchronous. Publish the QA markers only
    // after that paint opportunity so screenshots never observe a stale
    // pre-focus frame under reduced-motion emulation.
    requestAnimationFrame(() => {
      cy.forceRender?.();
      if (qaEnabled && qaRoot) {
        qaRoot.dataset.qaExploreCamera = `${loopId}:${cy.zoom().toFixed(4)}:${Math.round(cy.pan().x)}:${Math.round(cy.pan().y)}`;
        qaRoot.dataset.qaCameraStable = `explore:stable:${fitGeneration}:${cy.zoom().toFixed(4)}:${Math.round(cy.pan().x)}:${Math.round(cy.pan().y)}`;
      }
    });
  };
  // The Explore panel changes the grid columns and React commits its detail
  // surface asynchronously. Wait two layout frames, then resize Cytoscape,
  // so the camera is computed against the panel-aware canvas rather than a
  // transient map-sized viewport.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (document.body.classList.contains("explore-mode")) engine.cy?.resize();
    applyFocusViewport();
  }));
}

function closeExplorePanel() {
  if (!document.body.classList.contains("explore-mode")) return;
  document.body.classList.add("explore-panel-closed");
  fitCanvas({ padding: 48, duration: 220 });
  // The mobile detail sheet has no independent opener: its visible owner is
  // the Explore mode trigger. Restore focus on the next layout frame so the
  // browser never leaves keyboard users on the hidden close control.
  const restoreFocus = () => document.querySelector("[data-react-ui-mode='explore']")?.focus?.();
  if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(restoreFocus);
  else window.setTimeout(restoreFocus, 0);
}

function showExploreMap() {
  // Opening the full map is a camera action, not a change of reading
  // context. Keep the selected loop so a subsequent “Percorrer loop”
  // continues the cycle the reader just inspected.
  engine.clearFocus();
  fitCanvas({ padding: 70, duration: 220 });
  if (qaEnabled && qaRoot) qaRoot.dataset.qaExploreCamera = "fit-map";
}

const appShellController = createAppShellController({
  home: elements.workspaceHome,
  stage: elements.stageShell,
  modeTitle: elements.appModeTitle,
  modeSubtitle: elements.appModeSubtitle,
  projectGrid: elements.workspaceProjectGrid,
  mapList: elements.workspaceMapList,
  status: elements.workspaceHomeStatus,
  newProjectButton: elements.workspaceNewProject,
  openProjectButton: elements.workspaceOpenProject,
  createMapButton: elements.workspaceCreateMap,
  importMarkdownButton: elements.workspaceImportMarkdown,
  onNewProject: createNewProjectDb,
  onOpenProject: openProjectDb,
  onCreateMap: createNewDiagram,
  onImportMarkdown: () => elements.workspaceLoopSourceFile.click(),
  onOpenProjectPath: path => openProjectByPath(path, "Projeto aberto."),
  onOpenMap: index => {
    if (workspaceHydrating) return;
    if (workspace[index]) selectModel(index);
    setWorkspaceMode("map");
  },
  reactApp
});

function renderAppShell() {
  appShellController.render({
    project,
    workspace,
    presentations: projectPresentations,
    localProjects: localProjectRecords,
    activeIndex,
    hydrating: workspaceHydrating
  });
}

async function updateRouteQuality(event) {
  const quality = event?.currentTarget?.value;
  if (!quality) return;
  engine.setRouteQuality(quality);
  engine.route({ quality });
  const entry = workspace[activeIndex];
  if (entry?.view) {
    entry.view = { ...entry.view, settings: { ...(entry.view.settings || {}), "route-quality": quality } };
    entry.view.style_source = serializeLoopStyle(entry.view);
    entry.views = (entry.views || []).map(view => view.id === entry.view.id ? entry.view : view);
    await persistActiveView(entry.view);
    styleDirty = false;
  }
}

function activateWorkspaceChrome(mode) {
  workspaceMode = mode;
  appCommands.setMode(mode);
  appShellController.setMode(mode);
}

const qaRuntime = createQaRuntime({
  engine,
  getContext: () => ({
    activeIndex,
    activeLoopId,
    apiAvailable,
    layoutDirty,
    editing
  })
});
const qaRoot = document.querySelector("#cld-root");
const qaEnabled = new URLSearchParams(window.location.search).get("qa") === "1";
const requestedPresentationStudy = new URLSearchParams(window.location.search).get("presentation-style") ||
  new URLSearchParams(window.location.search).get("presentationStyle");
let presentationStudy = resolvePresentationStyle({ requested: requestedPresentationStudy });
const PRESENTATION_STUDY_LABELS = {
  "lower-third": "Legenda cinematográfica",
  "relation-tooltip": "Explicação contextual",
  "atlas-editorial": "Atlas editorial"
};
let presentationTooltipRaf = null;
let presentationTooltipPlacementState = null;
let presentationConnectorFrameKey = null;
let presentationAtlasCardSideState = null;
let presentationCameraRaf = null;
let presentationCameraGeneration = 0;

function fitCanvas(options = {}) {
  if (!engine?.cy) return;
  engine.cy.resize();
  const safeRect = measureCanvasSafeRect({
    canvas: engine.canvas,
    overlays: [
      elements.editToolbar || "#edit-toolbar",
      elements.mapControls || ".map-controls",
      // Story Studio's approved composition owns the global authoring bar;
      // it has no second canvas header to reserve. Keeping this retired
      // element in the safe rectangle shrinks the complete-map camera.
      ...(workspaceMode === "story" ? [] : [elements.storyCanvasHeader || "#story-canvas-header"]),
      elements.storySelectionBar || "#story-selection-bar",
      ...presentationCameraOverlays(),
      "#story-timeline-shell"
    ]
  });
  if (qaEnabled && qaRoot && safeRect) qaRoot.dataset.qaSafeRect = JSON.stringify(safeRect);
  engine.fit({ ...options, safeRect });
}

function presentationCameraOverlays() {
  // The current lower-third is a reserved camera zone. The experimental
  // relation tooltip follows the map and must not alter the existing V2
  // camera composition while it is being evaluated.
  return presentationStudy === "lower-third" ? [elements.presentationCard || "#presentation-card"] : [];
}

function presentationCameraSideOverlays() {
  // Atlas composes its narrative card beside the semantic target rather than
  // reserving a lower-third. The shared safe-viewport helper measures the
  // live card rectangle; no viewport offset is authored here.
  return presentationStudy === "atlas-editorial" ? [elements.presentationCard || "#presentation-card"] : [];
}

function updateQaAttributes() {
  if (!qaRoot || !qaEnabled) return;
  const snapshot = qaRuntime.snapshot();
  const check = qaRuntime.check();
  qaRoot.dataset.qaVersion = qaRuntime.version;
  qaRoot.dataset.qaAlgorithmVersion = qaRuntime.algorithmVersion;
  qaRoot.dataset.qaFingerprint = snapshot.fingerprint;
  qaRoot.dataset.qaQualityVector = JSON.stringify(snapshot.quality?.qualityVector || []);
  qaRoot.dataset.qaQualityReasons = JSON.stringify(check.qualityGate.reasons);
  qaRoot.dataset.qaCheck = check.ok ? "ok" : "issues";
  qaRoot.dataset.qaRouteCount = String(snapshot.model?.edges?.length || 0);
  qaRoot.dataset.qaAnnotationCollisions = String(snapshot.annotations?.annotationCollisions || 0);
  qaRoot.dataset.qaRouteDiagnostics = JSON.stringify(snapshot.diagnostics?.edges || {});
}

const workspaceDomBridge = createWorkspaceDomBridge({
  elements,
  actions: {
    openProjectPath: openProjectByPath,
    importProjectBackup,
    importLoopSourceAsNewMap,
    importJsonFile,
    setWorkspaceMode,
    toggleSavePopover,
    retrySave: () => persistActiveLoop(),
    startRouteDrag,
    startConnectionDrag,
    savePopoverChanges,
    deleteCurrentSelection,
    selectProjectPresentation: presentationId => {
      const record = projectPresentations.find(item => item.id === presentationId);
      if (record) selectProjectPresentation(record);
    },
    focusRelation: edgeId => {
      const edge = engine.model.edges.find(item => item.id === edgeId);
      if (!edge) return;
      selectedEdgeId = edge.id;
      selectedNodeId = null;
      engine.focusEdge(edge.id);
      renderRelation({
        edge,
        source: engine.model.nodes.find(node => node.id === edge.source),
        target: engine.model.nodes.find(node => node.id === edge.target)
      });
    },
    selectActiveView,
    createNewView,
    duplicateActiveView,
    deleteActiveView,
    deriveActiveView,
    saveLoopDescriptionForm,
    updateLoopDescriptionPreview,
    closeLoopDescriptionModal,
    selectInspectorTab,
    handleKeydown,
    handleStageClick,
    handleStageDoubleClick,
    saveDockInspector,
    updateLoopSourceDraft: () => {
      if (loopSourcePreview) {
        loopSourcePreview.stale = true;
        setDockStatus(elements.loopSourceStatus, "Rascunho alterado · pré-visualize novamente");
      } else {
        setDockStatus(elements.loopSourceStatus, "Rascunho não aplicado");
      }
      syncLoopSourceDraftControls();
    },
    previewLoopSource,
    discardLoopSource: discardLoopSourcePreview,
    applyLoopSource,
    exportLoopSource,
    importLoopSourceFile,
    applyLoopStyle,
    exportLoopStyle,
    syncViewBuilder,
    addViewRule
  }
});
reactApp?.renderCanvasActions?.({
  onFocusExit: () => setFocusMode(false),
  onCenter: () => fitCanvas({ padding: 90, duration: 220 }),
  onFit: () => fitCanvas({ padding: 45, duration: 220 }),
  onZoom: zoomCanvas
});
reactApp?.renderEditorActions?.({
  onAddNode: addNodeAtViewportCenter,
  onSaveLayout: saveCurrentLayout,
  onImportJson: () => document.querySelector("#import-json-file")?.click(),
  onExportJson: exportJson,
  onExportStandalone: exportStandalone,
  onRelayout: () => {
    engine.relayout();
    markLayoutDirty();
    invalidateMapViewport("relayout");
  },
  onRestoreLayout: restoreSavedLayout,
  onResetLayout: resetLayout,
  onRouteQuality: updateRouteQuality,
  onConnectSelection: startConnectionFromSelection,
  onToggleNodeLock: toggleSelectedNodeLock,
  onUnlockRoute: unlockSelectedRoute,
  onDuplicateSelection: duplicateSelectedNodes,
  onAlignHorizontal: () => alignSelectedNodes("center-y"),
  onAlignVertical: () => alignSelectedNodes("center-x"),
  onCopyStyle: copySelectedNodeStyle,
  onPasteStyle: pasteSelectedNodeStyle
});
reactApp?.renderEditorDockActions?.({
  onOpenPanel: openDockPanel,
  onRename: renameActiveLoop,
  onEditDescription: editActiveLoopDescription,
  onClose: () => {
    setEditorDockCollapsed(true);
    elements.editorDock.classList.remove("story-studio-open");
  }
});
reactApp?.renderPresentationActions?.({
  onPrevious: () => presentationController?.previous(),
  onNext: () => {
    const state = presentationController?.state;
    if (state && state.index >= state.total - 1) stopPresentation();
    else presentationController?.next();
  },
  onPresenterToggle: () => setPresenterMode(!presenterMode),
  onClose: stopPresentation
});
const transientDetailsController = createTransientDetailsController({
  documentRef: document,
  loopDescriptionModal: elements.loopDescriptionModal,
  onCloseLoopDescription: closeLoopDescriptionModal
});
const storyStudioDomBridge = createStoryStudioDomBridge({
  elements,
  actions: {
    setEditorMode: setStoryEditorMode,
    present: startPresentation,
    generate: generateDirectorPresentation,
    validate: validateActivePresentation,
    applyFixes: applyActivePresentationFixes,
    save: saveActivePresentation,
    duplicate: duplicateActivePresentation,
    removePresentation: deleteActivePresentation,
    addLoopScene: addPresentationLoopScene,
    addManualScene: addTimelineScene,
    addSelectionBeat: addSelectionBeatFromCanvas,
    clearSelection: clearStoryCanvasSelection,
    toggleMobileInspector: () => toggleStoryMobileInspector(),
    closeMobileInspector: () => setStoryMobileInspector(false),
    currentFrame: currentTimelineFrame,
    currentIndex: currentTimelineIndex,
    timeline: compiledStoryTimeline,
    focusBeat: focusPresentationBeat,
    toggleFullscreen: async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await elements.stage?.requestFullscreen?.();
      } catch (error) {
        showToast("Não foi possível expandir o canvas neste navegador.");
      }
    },
    selectFrame: selectTimelineFrame,
    previewFromBeat: startPresentationFromBeat,
    updateBeat: updatePresentationBeat,
    validateSource: validatePresentationSource,
    applySource: applyPresentationSource,
    exportSource: exportPresentationSource,
    exportHtml: exportPresentationHtml,
    updateSourceDraft: source => {
      presentationSourceDraft = source;
      renderPresentationSourceDiff(source);
      validatePresentationSource(true);
    },
    updateTitle: value => {
      if (!activePresentation) return;
      commitPresentationEdit(
        { ...presentationForEditing(), title: String(value).trim() || "Nova apresentação" },
        "Título da história alterado"
      );
    },
    updatePresentationStyle: value => {
      const current = presentationForEditing();
      if (!current) return;
      const presentationStyle = resolvePresentationStyle({ requested: value });
      commitPresentationEdit(
        { ...current, settings: { ...(current.settings || {}), presentationStyle } },
        "Estilo da apresentação alterado"
      );
    },
    updateInspector: updateStoryInspectorBasic,
    toggleCameraInfo: toggleStoryCameraInfo,
    closeCameraInfo: () => setStoryCameraInfoOpen(false),
    updateDurationPreset: value => {
      const custom = value === "custom";
      if (elements.storyInspectorCustomDurationField) elements.storyInspectorCustomDurationField.hidden = !custom;
      if (!custom) updateStoryInspectorBasic({ durationMs: Number(value) });
    },
    updateCustomDuration: value => {
      const durationMs = parseTimelineDuration(value);
      if (durationMs === null) {
        setStoryInspectorStatus("Use uma duração no formato mm:ss.", true);
        return;
      }
      updateStoryInspectorBasic({ durationMs });
      setStoryInspectorStatus("Duração personalizada aplicada.");
    },
    useCanvasSelection: useCanvasSelectionInStoryInspector,
    captureState: captureStoryInspectorState,
    clearFocus: clearStoryInspectorFocus,
    renderMovementOptions: renderStoryInspectorMovementOptions,
    selectMovement: selectStoryInspectorMovement,
    updateMovementPreview: updateStoryInspectorMovementPreview,
    applyMovement: applyStoryInspectorMovement,
    editMovement: editSelectedStoryMovement,
    suggestNextMovement: suggestNextStoryInspectorMovement,
    duplicateBeat: duplicateSelectedStoryBeat,
    removeBeat: removeSelectedStoryBeat,
    removeScene: removeSelectedStoryScene,
    toggleDiff: () => {
      const open = elements.presentationSourceDiff.hidden;
      elements.presentationSourceDiff.hidden = !open;
      elements.togglePresentationDiff.setAttribute("aria-expanded", String(open));
      elements.togglePresentationDiff.textContent = open ? "Ocultar diff" : "Ver diff";
      if (open) renderPresentationSourceDiff(elements.presentationSourceEditor?.value || presentationSourceDraft);
    }
  }
});
const engineBridge = createEngineBridge({
  engine,
  elements,
  actions: {
    onRoute: () => {
      if (!previewingLoopSource && !loopSourcePreview && workspace[activeIndex] && engine.model) syncWorkspaceFromEngine();
      updateQaAttributes();
    },
    onViewChange: view => renderViewLegend(view),
    onEdgeActivate: (edge, detail) => {
      if (workspaceMode === "story") {
        const additive = detail?.originalEvent?.shiftKey || detail?.originalEvent?.metaKey || detail?.originalEvent?.ctrlKey;
        if (!additive && !(engine.cy?.elements(":selected")?.length > 0)) engine.cy?.elements().unselect();
        engine.cy?.getElementById(edge.id).select();
        selectedEdgeId = edge.id;
        selectedNodeId = null;
        updateStoryCanvasSelectionAction();
        return;
      }
      selectedEdgeId = edge.id;
      selectedNodeId = null;
      renderRelation(detail);
      selectInspectorTab("relation");
      if (editing) {
        selectedNodeId = null;
        selectedEdgeId = edge.id;
        pendingConnectionSourceId = null;
        updateEditToolbar();
        showEdgePopover(selectedEdgeId);
      }
      renderDockInspector();
    },
    onSelectionChange: (nodeIds, edgeIds) => {
      selectedNodeIds = nodeIds;
      selectedEdgeIds = edgeIds;
      lastStorySelectionFocus = focusForCurrentSelection();
      if (selectedNodeIds.length > 1) {
        selectedNodeId = selectedNodeIds.at(-1);
        selectedEdgeId = null;
      }
      if (workspaceMode !== "story") renderDockInspector();
      updateStoryCanvasSelectionAction();
    },
    onNodeActivate: (node, detail) => {
      const nodeId = node.id;
      if (workspaceMode === "story") {
        const additive = detail?.originalEvent?.shiftKey || detail?.originalEvent?.metaKey || detail?.originalEvent?.ctrlKey;
        if (!additive && !(engine.cy?.elements(":selected")?.length > 0)) engine.cy?.elements().unselect();
        engine.cy?.getElementById(nodeId).select();
        selectedNodeId = nodeId;
        selectedEdgeId = null;
        updateStoryCanvasSelectionAction();
        return;
      }
      if (!editing) {
        selectedNodeId = nodeId;
        selectedEdgeId = null;
        renderNodeDetails(nodeId);
        selectInspectorTab("relation");
        renderDockInspector();
        return;
      }
      if (pendingConnectionSourceId && pendingConnectionSourceId !== nodeId) {
        createEdgeBetween(pendingConnectionSourceId, nodeId);
        return;
      }
      selectedNodeId = nodeId;
      selectedEdgeId = null;
      if (workspaceMode !== "story") renderDockInspector();
      updateEditToolbar();
      hidePopover();
    },
    onBackgroundActivate: () => {
      if (!editing) {
        selectedNodeId = null;
        selectedEdgeId = null;
        selectedNodeIds = [];
        selectedEdgeIds = [];
        lastStorySelectionFocus = null;
        renderRelationPlaceholder();
        if (workspaceMode !== "story") renderDockInspector();
        updateStoryCanvasSelectionAction();
        return;
      }
      selectedNodeId = null;
      selectedEdgeId = null;
      selectedNodeIds = [];
      selectedEdgeIds = [];
      lastStorySelectionFocus = null;
      pendingConnectionSourceId = null;
      hidePopover();
      updateEditToolbar();
      if (workspaceMode !== "story") renderDockInspector();
      updateStoryCanvasSelectionAction();
    },
    onPositionChange: () => {
      if (hydratingEngine || previewingLoopSource || loopSourcePreview) return;
      syncWorkspaceFromEngine();
      schedulePersistActiveLoop();
      markLayoutDirty();
      positionPopover();
      updateQaAttributes();
    },
    onRouteChange: () => {
      if (hydratingEngine || previewingLoopSource || loopSourcePreview) return;
      syncWorkspaceFromEngine();
      schedulePersistActiveLoop();
      markLayoutDirty();
      positionRouteHandle();
      positionPopover();
      updateQaAttributes();
    },
    onLayoutEnd: () => {
      if (suppressLayoutDirty) {
        suppressLayoutDirty = false;
        return;
      }
      if (hydratingEngine || previewingLoopSource || loopSourcePreview) {
        positionPopover();
        updateQaAttributes();
        return;
      }
      if (editing) {
        syncWorkspaceFromEngine();
        schedulePersistActiveLoop();
        markLayoutDirty();
      }
      positionPopover();
      updateQaAttributes();
    },
    onNodeLockChange: () => {
      if (hydratingEngine || previewingLoopSource || loopSourcePreview) return;
      syncWorkspaceFromEngine();
      schedulePersistActiveLoop();
      markLayoutDirty();
      updateQaAttributes();
    },
    onModelMutate: () => {
      if (hydratingEngine || previewingLoopSource || loopSourcePreview) return;
      syncWorkspaceFromEngine();
      schedulePersistActiveLoop();
      syncModelMetadata();
      bindCanvasEditing();
      renderWorkspaceTabs();
      refreshPanels();
      markLayoutDirty();
      if (activeDockPanel === "table") renderDataTable();
      updateQaAttributes();
    }
  }
});

initializeWorkspace();

async function initializeWorkspace() {
  await loadProjectFromApi();
  await loadLocalProjects();
  const fixtureSize = qaEnabled ? Number(new URLSearchParams(window.location.search).get("fixture")) : 0;
  if ([8, 16, 32].includes(fixtureSize)) {
    const fixture = createRoutingFixture({ id: `browser-qa-${fixtureSize}`, nodeCount: fixtureSize });
    workspace.unshift({
      id: `qa:${fixture.id}`,
      kind: "qa",
      label: fixture.title,
      summary: fixture.description,
      description_md: fixture.description,
      model: fixture,
      persisted: false
    });
  }
  renderRecentProjects();
  renderWorkspaceTabs();
  selectModel(0, { preserveCurrent: false });
  setWorkspaceMode("workspace");
}

async function loadProjectFromApi() {
  try {
    const data = await workspacePersistence.loadProject();
    project = data.project || project;
    projectPresentations = data.presentations || [];
    projectAssets = data.assets || [];
    engine.setAssetResolver(assetId => apiAvailable && assetId
      ? `/api/assets/${encodeURIComponent(assetId)}`
      : "");
    rememberRecentProject(project);
    if (Array.isArray(data.loops) && data.loops.length) {
      const mapsByLoop = new Map((data.maps || []).filter(map => map.source_loop_id)
        .map(map => [map.source_loop_id, map]));
      workspace = data.loops.map(loop => loopRecordToEntry(loop, mapsByLoop.get(loop.id)));
      apiAvailable = true;
    } else if (Array.isArray(data.maps) && data.maps.length) {
      // A project bundle may be map-first and legitimately contain no legacy
      // loop rows. Keep the workspace useful without rehydrating demo examples
      // just because the legacy collection is empty.
      workspace = data.maps.map(map => mapRecordToEntry(map));
      apiAvailable = true;
    }
  } catch {
    workspace = [...fallbackWorkspace];
    projectPresentations = [];
    projectAssets = [];
    apiAvailable = false;
  } finally {
    // From this point onward the workspace is either the persisted project,
    // an intentionally empty project, or the explicit offline fallback.
    // Rendering it is now safe and truthful.
    workspaceHydrating = false;
  }
}

async function loadLocalProjects() {
  if (!apiAvailable) {
    localProjectRecords = [];
    renderLocalProjects([]);
    renderAppShell();
    return;
  }
  try {
    localProjectRecords = await workspacePersistence.loadLocalProjects();
    renderLocalProjects(localProjectRecords);
    renderAppShell();
  } catch (error) {
    handleApiError(error);
    localProjectRecords = [];
    renderLocalProjects([]);
    renderAppShell();
  }
}

function loopRecordToEntry(loop, map = null) {
  const view = map?.views?.[0] || null;
  return {
    id: loop.id,
    kind: "loop",
    label: loop.title,
    summary: loop.summary || loop.model?.description || "",
    description_md: loop.description_md || loop.model?.description || "",
    model: loop.model,
    updatedAt: loop.updated_at || null,
    persisted: true,
    mapId: map?.id || null,
    viewId: view?.id || null,
    view,
    views: map?.views || []
  };
}

function mapRecordToEntry(map) {
  const view = map?.views?.[0] || null;
  return {
    id: map.id,
    kind: "map",
    label: map.title,
    summary: map.description_md || map.model?.description || "",
    description_md: map.description_md || map.model?.description || "",
    model: map.model,
    updatedAt: map.updated_at || null,
    persisted: true,
    mapId: map.id,
    viewId: view?.id || null,
    view,
    views: map.views || []
  };
}

function presentationTargetsEntry(record, entry) {
  const scenes = (record?.presentation?.chapters || []).flatMap(chapter => chapter.scenes || []);
  if (!scenes.length) return false;
  const ids = new Set([entry?.mapId, entry?.model?.id].filter(Boolean));
  return scenes.some(scene => ids.has(scene.mapRef?.mapId));
}

function emptyPresentationForModel(model = {}) {
  return normalizePresentation({
    id: `${model.id || "map"}-presentation`,
    title: model.title || "Apresentação",
    chapters: []
  });
}

function presentationForEntry(entry) {
  return projectPresentations.find(record => presentationTargetsEntry(record, entry))?.presentation || null;
}

function renderWorkspaceTabs(nextQuery = loopFilterQuery) {
  loopFilterQuery = String(nextQuery || "").trim().toLowerCase();
  const query = loopFilterQuery;
  const items = [];
  workspace.forEach((entry, index) => {
    const title = tabLabel(entry, index);
    const summary = entry.summary || entry.model.description || "Sem descrição";
    if (query && !`${title} ${summary}`.toLowerCase().includes(query)) return;
    const presentation = presentationForEntry(entry);
    const storyCount = presentation?.chapters?.reduce((total, chapter) => total + (chapter.scenes || []).reduce((sceneTotal, scene) => sceneTotal + (scene.beats?.length || 1), 0), 0) || 0;
    const loopCount = displayLoopCount(entry.model);
    items.push({
      id: entry.id || entry.model.id || `map-${index}`,
      index,
      active: index === activeIndex,
      title,
      summary,
      storyCount,
      loopCount,
      nodeCount: entry.model.nodes?.length || 0
    });
  });
  reactApp?.renderMapSelector?.({
    items,
    onSelect: index => {
      if (elements.loopSelect) elements.loopSelect.open = false;
      requestAnimationFrame(() => selectModel(index));
    },
    onFilter: event => renderWorkspaceTabs(event.currentTarget?.value),
    onCreate: createNewDiagram,
    onDuplicate: duplicateActiveLoop,
    onDelete: deleteActiveLoop
  });
  updateLoopSelectorSummary();
  renderAppShell();
}

function tabLabel(entry, index) {
  const title = entry.label || projectDisplayName(entry.model) || `Projeto ${index + 1}`;
  return `${title}`;
}

function updateLoopSelectorSummary() {
  const entry = workspace[activeIndex];
  if (!entry) {
    elements.activeLoopSelectLabel.textContent = "Nenhum loop";
    elements.activeLoopSelectMeta.textContent = project?.title || "Projeto local";
    return;
  }
  const presentation = presentationForEntry(entry);
  const storyCount = presentation?.chapters?.reduce((total, chapter) => total + (chapter.scenes || []).reduce((sceneTotal, scene) => sceneTotal + (scene.beats?.length || 1), 0), 0) || 0;
  const loopCount = displayLoopCount(entry.model);
  elements.activeLoopSelectLabel.textContent = tabLabel(entry, activeIndex);
  elements.activeLoopSelectMeta.textContent =
    `${entry.model.nodes?.length || 0} variáveis · ${loopCount} ciclos · ${storyCount} passos`;
}

function displayLoopCount(model) {
  if (Array.isArray(model?.loops) && model.loops.length) return model.loops.length;
  return discoverLoops(model, { maxLength: 8, maxLoops: 24 }).length;
}

function selectModel(index, { preserveCurrent = true } = {}) {
  if (!workspace[index]) return;
  if (loopSourcePreview) discardLoopSourcePreview({ silent: true });
  if (preserveCurrent && (layoutDirty || styleDirty)) {
    const previousIndex = activeIndex;
    syncWorkspaceFromEngine(previousIndex);
    schedulePersistActiveLoop(previousIndex, { delay: 80 });
  }
  activeIndex = index;
  appCommands.selectModel(index);
  selectedNodeId = null;
  selectedEdgeId = null;
  selectedNodeIds = [];
  selectedEdgeIds = [];
  pendingConnectionSourceId = null;
  activeLoopId = null;
  layoutDirty = false;
  styleDirty = false;
  hidePopover();
  if (editing) setEditing(false);
  renderWorkspaceTabs();
  renderViewSwitcher();
  const entry = workspace[activeIndex];
  // Local fallback projects have the same `loop` kind as API records, but
  // localStorage is their only durable layout source when the API is offline.
  // Keep SQLite positions authoritative when the server is available.
  const saved = preferredSavedLayout(entry);
  const model = saved ? applySavedLayout(entry.model, saved) : cloneModel(entry.model);
  activePresentationRecord = projectPresentations.find(item => presentationTargetsEntry(item, entry)) ||
    (entry.presentation ? { id: `${entry.id}-presentation`, title: entry.presentation.title, presentation: entry.presentation } : null);
  activePresentation = activePresentationRecord?.presentation
    ? repairGeneratedPresentation(normalizePresentation({ ...activePresentationRecord.presentation, title: activePresentationRecord.presentation.title || activePresentationRecord.title }), model)
    : emptyPresentationForModel(model);
  resetPresentationHistory();
  if (activePresentationRecord?.presentation?.chapters) {
    const compiled = compilePresentation(activePresentation, { model });
    if (compiled.errors.length) activePresentation = emptyPresentationForModel(model);
  }
  hydratingEngine = true;
  try {
    engine.setModel(model, { animate: false });
    engine.resetHistory();
    engine.setView(resolvedViewForEntry(entry), { reroute: !engine.hasCompleteRoutes() });
  } finally {
    hydratingEngine = false;
  }
  elements.routeQuality.value = engine.routeQuality;
  engine.setEditing(false);
  bindCanvasEditing();
  syncModelMetadata();
  refreshPanels();
  refreshDockEditors();
  if (activeDockPanel === "style") hydrateViewBuilder(entry.view);
  updateSavedLayoutControls();
  scheduleFit({ padding: 70, duration: 180 });
}

function syncWorkspaceFromEngine(index = activeIndex) {
  if (!engine.model || !workspace[index]) return;
  workspace[index].model = engine.getModel({ includePositions: true, includeRoutes: true });
  workspace[index].label = workspace[index].model.title || workspace[index].label;
}

function setEditorDockCollapsed(collapsed = false) {
  const next = Boolean(collapsed);
  elements.editorDock.classList.toggle("collapsed", next);
  document.body.classList.toggle("editor-dock-collapsed", next);
  if (next) document.body.classList.remove("editor-data-workspace");
  if (workspaceMode === "map") {
    elements.sidebarToggle?.setAttribute("aria-pressed", String(next));
    elements.sidebarToggle?.setAttribute("aria-label", next ? "Abrir painel do editor" : "Fechar painel do editor");
    // The dock changes the safe rectangle materially. Resize and refit only
    // after its CSS grid track has settled so Cytoscape never retains the
    // off-canvas pan from the wider inspector layout.
    requestAnimationFrame(() => scheduleFit({ padding: next ? 54 : 70, duration: 220 }, { delay: 240, options: { padding: next ? 54 : 70, duration: 0 } }));
  }
}

function openDockPanel(panel) {
  activeDockPanel = panel;
  appCommands.openDockPanel(panel);
  setEditorDockCollapsed(false);
  document.body.classList.toggle("editor-data-workspace", panel === "table");
  elements.editorDock.classList.toggle("story-studio-open", panel === "story");
  elements.dockContents.forEach(content => {
    content.hidden = content.dataset.dockContent !== panel;
  });
  elements.dockTitle.textContent = {
    inspect: "Inspector",
    map: "Mapa e descrição",
    code: "Código do loop",
    style: "Vista visual",
    story: "Storyboard",
    table: "Tabela de dados",
    history: "Histórico"
  }[panel] || "Editor";
  if (panel === "inspect") renderDockInspector();
  if (panel === "code" && !loopSourcePreview) {
    elements.loopSourceEditor.value = serializeLoopMarkdown(engine.getModel() || workspace[activeIndex].model);
    syncCodeEditor("loop-source-editor");
  }
  if (panel === "code") syncLoopSourceDraftControls();
  if (panel === "style") {
    hydrateViewBuilder(workspace[activeIndex]?.view);
    // The dock composition is committed by React after the imperative bridge
    // publishes the panel intent. Rehydrate once after that commit so an old
    // uncontrolled/default snapshot cannot replace the persisted view preset.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (activeDockPanel === "style") hydrateViewBuilder(workspace[activeIndex]?.view);
    }));
  }
  if (panel === "story") renderDockStory();
  if (panel === "table") renderDataTable();
  if (panel === "history") renderVersionHistory();
  scheduleFit({ padding: 65, duration: 180 });
}

function refreshDockEditors() {
  const model = engine.getModel() || workspace[activeIndex]?.model;
  if (!model) return;
  if (!loopSourcePreview) {
    elements.loopSourceEditor.value = serializeLoopMarkdown(model);
    syncCodeEditor("loop-source-editor");
    setDockStatus(elements.loopSourceStatus, "Documento válido");
  }
  syncLoopSourceDraftControls();
  renderDockInspector();
  renderDockStory();
}

function renderDockInspector() {
  // The React inspector owns the empty and selected states. Keep the legacy
  // relation surface mounted for compatibility, but never let it reappear as
  // a second empty state underneath the React panel.
  if (elements.relationView) elements.relationView.hidden = true;
  const activeNodeIds = selectedNodeIds.length ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
  const nodes = activeNodeIds.map(id => engine.model?.nodes.find(item => item.id === id)).filter(Boolean);
  const node = nodes[0];
  const edge = selectedEdgeId && engine.model?.edges.find(item => item.id === selectedEdgeId);
  reactApp?.renderEditorInspector?.({
    key: node ? `node:${activeNodeIds.join(",")}` : edge ? `edge:${edge.id}` : "empty",
    nodeIds: activeNodeIds,
    node: node ? { ...node, style: { ...(node.style || {}) }, fields: { ...(node.fields || {}) } } : null,
    edge: edge ? { ...edge, fields: { ...(edge.fields || {}) } } : null,
    selectionLabel: node
      ? (nodes.length > 1 ? `${nodes.length} variáveis selecionadas` : `Variável ${node.id}`)
      : edge ? `Relação ${edge.source} → ${edge.target}` : "",
    help: edge ? `Relação ${edge.source} → ${edge.target}` : "Selecione uma variável ou relação no canvas.",
    onShapeChange: (nodeIds, shape) => {
      engine.updateNodes(nodeIds, { style: { shape } });
      syncWorkspaceFromEngine();
      markLayoutDirty();
    },
    mediaFilename: node?.media?.assetId
      ? projectAssets.find(asset => asset.id === node.media.assetId)?.filename
      : "",
    onMediaUpload: uploadNodeImage,
    onMediaRemove: removeNodeImage,
    onSubmit: saveDockInspector
  });
}

function saveDockInspector(event) {
  event.preventDefault();
  const form = event.currentTarget || elements.dockInspectorForm;
  const formData = typeof FormData === "function" ? new FormData(form) : null;
  const value = name => formData?.get(name) ?? form?.elements?.namedItem(name)?.value ?? "";
  const customKeys = formData?.getAll("field-key") || [];
  const customValues = formData?.getAll("field-value") || [];
  const fields = {};
  customKeys.forEach((key, index) => {
    const normalized = String(key || "").trim();
    if (normalized) fields[normalized] = String(customValues[index] || "").trim();
  });
  const nodeIds = selectedNodeIds.length ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
  if (nodeIds.length) {
    const changes = {
      style: {
        shape: value("shape"),
        size: Number(value("size")),
        fill: value("fill"),
        textColor: value("textColor"),
        fontSize: Number(value("fontSize"))
      }
    };
    if (nodeIds.length === 1 && (value("altText") !== "" || engine.model.nodes.find(item => item.id === nodeIds[0])?.media)) {
      const currentMedia = engine.model.nodes.find(item => item.id === nodeIds[0])?.media;
      if (currentMedia) changes.media = {
        ...currentMedia,
        altText: value("altText"),
        fit: value("fit") || currentMedia.fit
      };
    }
    if (nodeIds.length === 1) changes.label = value("label");
    if (nodeIds.length === 1) changes.fields = fields;
    if (value("locked") !== "keep") changes.locked = value("locked") === "true";
    editMapCommand.execute({ target: { type: "node", ids: nodeIds }, changes });
  } else if (selectedEdgeId) {
    editMapCommand.execute({
      target: { type: "edge", id: selectedEdgeId },
      changes: {
        sourceSign: value("sourceSign"),
        targetSign: value("targetSign"),
        description: value("description"),
        fields
      }
    });
  }
  renderDockInspector();
  showToast("Alterações aplicadas sem recarregar o canvas.");
}

async function uploadNodeImage(nodeId, file) {
  if (!apiAvailable) {
    showToast("Imagens nos nós exigem um projeto SQLite aberto.");
    return;
  }
  if (!file.type.startsWith("image/")) {
    showToast("Escolha um arquivo de imagem.");
    return;
  }
  try {
    const dataUrl = await blobToDataUrl(file);
    const [, contentBase64 = ""] = String(dataUrl).split(",");
    const data = await apiFetch("/api/assets", {
      method: "POST",
      body: {
        filename: file.name,
        mime_type: file.type,
        kind: "image",
        alt_text: "",
        content_base64: contentBase64
      }
    });
    if (data.asset) projectAssets = [data.asset, ...projectAssets.filter(item => item.id !== data.asset.id)];
    const current = engine.model.nodes.find(item => item.id === nodeId);
    engine.updateNode(nodeId, {
      media: {
        ...(current?.media || {}),
        assetId: data.asset.id,
        altText: current?.media?.altText || "",
        size: current?.media?.size || 112,
        labelGap: current?.media?.labelGap ?? 14,
        labelPlacement: current?.media?.labelPlacement || "below",
        fit: current?.media?.fit || "cover",
        focalPoint: current?.media?.focalPoint || { x: 0.5, y: 0.5 }
      }
    });
    syncWorkspaceFromEngine();
    await persistActiveLoop();
    renderDockInspector();
    showToast("Imagem anexada ao nó.");
  } catch (error) {
    handleApiError(error);
    showToast("Não foi possível anexar a imagem.");
  }
}

async function removeNodeImage(nodeId) {
  const node = engine.model.nodes.find(item => item.id === nodeId);
  if (!node?.media) return;
  engine.updateNode(nodeId, { media: undefined });
  syncWorkspaceFromEngine();
  await persistActiveLoop();
  renderDockInspector();
  showToast("Imagem removida do nó. O asset foi preservado no projeto.");
}

function syncViewBuilder() {
  const entry = workspace[activeIndex];
  const currentView = entry?.view || createViewFromStylePreset(styleControlValue("view-style-preset", "matcha-executive"));
  const rules = (currentView.rules || []).map(rule => ({
    selector: { ...(rule.selector || {}) },
    properties: { ...(rule.properties || {}) }
  }));
  const upsert = (selector, properties) => {
    const index = rules.findIndex(rule => JSON.stringify(rule.selector) === JSON.stringify(selector));
    if (index >= 0) rules[index] = { selector, properties };
    else rules.push({ selector, properties });
  };
  const view = {
    id: currentView.id,
    title: currentView.title || "Matcha Executive",
    settings: {
      ...(currentView.settings || {}),
        background: styleControlValue("view-canvas-color", "#fffdf5"),
      "node-media": Boolean(document.querySelector("#view-node-media")?.checked),
      "loop-badges": Boolean(document.querySelector("#view-loop-badges")?.checked),
      "show-polarities": Boolean(document.querySelector("#view-show-polarities")?.checked)
    },
    rules
  };
  const arrowShape = styleControlValue("view-edge-arrow", "triangle-backcurve");
  rules.forEach(rule => {
    if (rule.selector?.type === "relation") rule.properties["arrow-shape"] = arrowShape;
  });
  upsert({ type: "variable" }, {
    shape: styleControlValue("view-node-shape", "ellipse"),
    fill: styleControlValue("view-node-color", "#e8ecdf"),
    size: Number(styleControlValue("view-node-size", 72)),
    "font-size": Number(styleControlValue("view-font-size", 11))
  });
  upsert({ type: "relation" }, {
    color: styleControlValue("view-edge-color", "#7a8a72"),
    width: Number(styleControlValue("view-edge-width", 2)),
    "stroke-style": styleControlValue("view-edge-style", "solid"),
    "arrow-shape": arrowShape
  });
  view.style_source = serializeLoopStyle(view);
  const editor = styleControl("loop-style-editor");
  if (editor) editor.value = serializeLoopStyle(view);
  syncCodeEditor("loop-style-editor");
  applyLoopStyle();
}

function hydrateViewBuilder(view) {
  const actions = {
    onApply: applyLoopStyle,
    onSave: saveStyleBuilderView,
    onExport: exportLoopStyle,
    onSync: syncViewBuilder,
    onChange: syncViewBuilder,
    onPresetChange: previewStylePreset,
    onAddRule: addViewRule
  };
  if (!view) {
    reactApp?.renderStyleBuilder?.({
      key: "empty",
      values: { presetId: "matcha-executive", presetOptions: stylePresetOptions(), nodeMedia: true, loopBadges: false, showPolarities: true },
      editorValue: "",
      status: "Escolha uma direção visual para começar",
      error: false, actions });
    return;
  }
  const variable = view.rules?.find(rule => rule.selector?.type === "variable")?.properties || {};
  const relation = view.rules?.find(rule => rule.selector?.type === "relation" && rule.selector?.attribute === "type" && rule.selector?.value === "reinforcing")?.properties ||
    view.rules?.find(rule => rule.selector?.type === "relation")?.properties || {};
  reactApp?.renderStyleBuilder?.({
    key: view.id || view.title || "matcha",
    values: {
      canvasColor: safeColor(view.settings?.background, "#fffdf5"),
      presetId: stylePackForView(view),
      presetOptions: stylePresetOptions(),
      nodeMedia: view.settings?.["node-media"] !== false,
      loopBadges: view.settings?.["loop-badges"] === true,
      showPolarities: view.settings?.["show-polarities"] !== false,
      nodeShape: variable.shape || "ellipse",
      nodeColor: safeColor(variable.fill || variable.color, "#e8ecdf"),
      nodeSize: variable.size || variable.width || 72,
      fontSize: variable["font-size"] || 11,
      edgeColor: safeColor(relation.color || relation["stroke-color"], "#7a8a72"),
      edgeWidth: relation.width || relation["stroke-width"] || 2,
      edgeStyle: relation["stroke-style"] || "solid",
      edgeArrow: relation["arrow-shape"] || "triangle-backcurve"
    },
    editorValue: view.style_source || serializeLoopStyle(view),
    status: "Vista válida",
    error: false,
    actions
  });
}

function stylePackForView(view = {}) {
  if (view.settings?.["style-pack"]) return view.settings["style-pack"];
  // Older persisted views can carry the authored @settings block only in
  // style_source. Treat it as the migration-compatible provenance record,
  // rather than showing a misleading Matcha default in the Style Builder.
  try {
    return compileLoopStyle(view.style_source).settings?.["style-pack"] || "matcha-executive";
  } catch {
    return "matcha-executive";
  }
}

function onlyPolarityVisibilityChanged(previous = {}, next = {}) {
  if (previous.settings?.["show-polarities"] === next.settings?.["show-polarities"]) return false;
  const comparable = value => {
    const copy = {
      ...value,
      settings: { ...(value.settings || {}) }
    };
    delete copy.settings["show-polarities"];
    delete copy.style_source;
    return copy;
  };
  return JSON.stringify(comparable(previous)) === JSON.stringify(comparable(next));
}

function previewStylePreset(presetId = "matcha-executive") {
  const entry = workspace[activeIndex];
  if (!entry) return;
  const current = entry.view;
  const preset = createViewFromStylePreset(presetId, {
    viewId: current?.id || `local-preview-${Date.now()}`
  });
  if (current?.settings?.extends) preset.settings.extends = current.settings.extends;
  entry.view = preset;
  entry.viewId = preset.id;
  entry.views = (entry.views || []).some(view => view.id === preset.id)
    ? entry.views.map(view => view.id === preset.id ? preset : view)
    : [...(entry.views || []), preset];
  const editor = styleControl("loop-style-editor");
  if (editor) editor.value = preset.style_source;
  syncCodeEditor("loop-style-editor");
  engine.setView(resolvedViewForEntry(entry));
  styleDirty = true;
  hydrateViewBuilder(preset);
  setStyleStatus(`Prévia aplicada: ${preset.title}. Salve o projeto para persistir.`, false);
}

function renderViewSwitcher() {
  const entry = workspace[activeIndex];
  const options = (entry?.views || []).map(view => ({ id: view.id, title: view.title || view.id }));
  const activeId = entry?.viewId || "";
  const currentTitle = options.find(view => view.id === activeId)?.title || "Matcha padrão";
  reactApp?.renderViewSwitcher?.({
    options,
    activeId,
    currentTitle,
    canManage: Boolean(entry?.view),
    onSelect: selectActiveView,
    onNew: createNewView,
    onDuplicate: duplicateActiveView,
    onDerive: deriveActiveView,
    onDelete: deleteActiveView
  });
}

function selectActiveView(id) {
  const entry = workspace[activeIndex];
  const view = (entry?.views || []).find(item => item.id === id) || null;
  entry.view = view;
  entry.viewId = view?.id || null;
  engine.setView(resolvedViewForEntry(entry));
  elements.routeQuality.value = engine.routeQuality;
  if (activeDockPanel === "style") hydrateViewBuilder(view);
  renderViewSwitcher();
}

function resolvedViewForEntry(entry) {
  if (!entry?.view) return null;
  try {
    return resolveView(entry.view, entry.views || []);
  } catch (error) {
    console.error(error);
    showToast("A view base não pôde ser resolvida.");
    return entry.view;
  }
}

async function createNewView() {
  const entry = workspace[activeIndex];
  if (!entry) return;
  const number = (entry.views?.length || 0) + 1;
  const view = compileLoopStyle(`@view "View ${number}"\n\nvariable { shape: ellipse; }\n`);
  await createPersistedView(entry, { ...view, map_id: entry.mapId || entry.id });
}

async function createPersistedView(entry, view) {
  await persistCreatedView(entry, view, () => createView.execute({ view }), "Nova view criada sem duplicar o mapa.");
}

async function persistCreatedView(entry, view, persist, successMessage) {
  try {
    let saved = { ...view, id: `local-${Date.now()}` };
    if (apiAvailable && entry.persisted) {
      const result = await persist();
      if (!result?.view) throw new Error("View creation returned no persisted view.");
      saved = result.view;
      entry.mapId = saved.map_id || entry.mapId;
    }
    entry.views = [...(entry.views || []), saved];
    entry.view = saved;
    entry.viewId = saved.id;
    engine.setView(resolvedViewForEntry(entry));
    renderViewSwitcher();
    hydrateViewBuilder(saved);
    showToast(successMessage);
  } catch (error) {
    handleApiError(error);
    showToast("Não foi possível criar a view.");
  }
}

async function duplicateActiveView() {
  const entry = workspace[activeIndex];
  if (!entry?.view) return;
  const source = { ...entry.view, map_id: entry.mapId || entry.id };
  const view = duplicateView.draft({ view: source });
  await persistCreatedView(entry, view, () => duplicateView.execute({ view: source }), "View duplicada sem duplicar o mapa.");
}

async function deriveActiveView() {
  const entry = workspace[activeIndex];
  if (!entry?.view) {
    showToast("Selecione uma view para criar uma derivação.");
    return;
  }
  const source = { ...entry.view, map_id: entry.mapId || entry.id };
  const view = deriveView.draft({ view: source });
  await persistCreatedView(entry, view, () => deriveView.execute({ view: source }), "View derivada sem duplicar o mapa.");
}

async function deleteActiveView() {
  const entry = workspace[activeIndex];
  const view = entry?.view;
  if (!view) return;
  try {
    if (apiAvailable && entry.persisted && !view.id.startsWith("local-")) {
      const result = await deleteView.execute({ view: { ...view, map_id: entry.mapId || entry.id } });
      if (!result) throw new Error("View deletion returned no result.");
    }
    entry.views = (entry.views || []).filter(item => item.id !== view.id);
    const nextView = entry.views[0] || null;
    entry.view = nextView;
    entry.viewId = nextView?.id || null;
    engine.setView(resolvedViewForEntry(entry), {
      reroute: !onlyPolarityVisibilityChanged(view, nextView || {})
    });
    renderViewSwitcher();
    showToast("View removida. O mapa foi preservado.");
  } catch (error) {
    handleApiError(error);
    showToast("Não foi possível remover a view.");
  }
}

function renderDataTable() {
  const model = engine.model;
  if (!model) {
    reactApp?.renderDataTable?.({ activeTab: activeTableTab, columns: [], rows: [] });
    return;
  }
  const labels = new Map(model.nodes.map(node => [node.id, node.label]));
  let columns = [];
  let rows = [];
  if (activeTableTab === "nodes") {
    columns = [
      { key: "id", label: "ID", kind: "text" },
      { key: "label", label: "Nome" },
      { key: "tags", label: "Tags" },
      { key: "fieldsJson", label: "Campos JSON", multiline: true }
    ];
    rows = model.nodes.map(node => ({ id: node.id, label: node.label || "", tags: (node.tags || []).join(", "), fieldsJson: JSON.stringify(node.fields || {}) }));
  } else if (activeTableTab === "edges") {
    columns = [
      { key: "id", label: "ID", kind: "text" },
      { key: "sourceLabel", label: "Origem", kind: "text" },
      { key: "signs", label: "Sinais", kind: "signs" },
      { key: "targetLabel", label: "Destino", kind: "text" },
      { key: "description", label: "Descrição", multiline: true },
      { key: "fieldsJson", label: "Campos JSON", multiline: true }
    ];
    rows = model.edges.map(edge => ({ id: edge.id, sourceLabel: labels.get(edge.source) || edge.source, signs: `${edge.sourceSign}${edge.targetSign}`, targetLabel: labels.get(edge.target) || edge.target, description: edge.description || "", fieldsJson: JSON.stringify(edge.fields || {}) }));
  } else {
    columns = [
      { key: "id", label: "ID", kind: "text" },
      { key: "label", label: "Nome" },
      { key: "type", label: "Tipo", kind: "text" },
      { key: "description", label: "Descrição", multiline: true },
      { key: "tags", label: "Tags" },
      { key: "fieldsJson", label: "Campos JSON", multiline: true }
    ];
    rows = engine.getLoops().map(loop => ({ id: loop.id, label: loop.label || loop.id, type: loop.type, description: loop.description || "", tags: (loop.tags || []).join(", "), fieldsJson: JSON.stringify(loop.fields || {}) }));
  }
  reactApp?.renderDataTable?.({
    key: workspace[activeIndex]?.id || model.id || "map",
    activeTab: activeTableTab,
    columns,
    rows,
    onTabChange: tab => {
      activeTableTab = tab;
      renderDataTable();
    },
    onChange: (id, field, value) => {
      if (activeTableTab === "nodes") {
        if (field === "label") engine.updateNode(id, { label: value });
        else if (field === "tags") engine.updateNode(id, { tags: value.split(",").map(item => item.trim()).filter(Boolean) });
        else if (field === "fieldsJson") updateFieldsFromTable("node", id, value);
      } else if (activeTableTab === "edges") {
        if (field === "signs") engine.updateEdge(id, { sourceSign: value[0], targetSign: value[1] });
        else if (field === "description") engine.updateEdge(id, { description: value });
        else if (field === "fieldsJson") updateFieldsFromTable("edge", id, value);
      } else if (activeTableTab === "loops") {
        if (field === "label" || field === "description" || field === "tags") {
          updateLoopFromTable(id, field === "tags" ? { tags: value.split(",").map(item => item.trim()).filter(Boolean) } : { [field]: value });
        } else if (field === "fieldsJson") {
          try { updateLoopFromTable(id, { fields: JSON.parse(value || "{}") }); }
          catch { showToast("Campos JSON inválidos."); renderDataTable(); }
        }
      }
    }
  });
}


function updateLoopFromTable(id, changes) {
  curatedLoops = engine.getLoops().map(loop => loop.id === id ? { ...loop, ...changes } : loop);
  engine.setLoops(curatedLoops);
  syncWorkspaceFromEngine();
  schedulePersistActiveLoop();
  renderLoopBrowser();
}

function updateFieldsFromTable(type, id, value) {
  try {
    const fields = JSON.parse(value || "{}");
    if (!fields || Array.isArray(fields) || typeof fields !== "object") throw new Error("Fields must be an object.");
    if (type === "node") engine.updateNode(id, { fields });
    else engine.updateEdge(id, { fields });
  } catch {
    showToast("Campos JSON inválidos; a alteração não foi aplicada.");
    renderDataTable();
  }
}

async function renderVersionHistory() {
  const render = (next = {}) => reactApp?.renderVersionHistory?.({
    kind: activePresentationRecord ? "presentation" : "loop",
    key: activePresentationRecord?.id || workspace[activeIndex]?.id || "history",
    message: "",
    versions: [],
    onRestore: versionId => activePresentationRecord ? restorePresentationVersion(versionId) : restoreVersion(versionId),
    ...next
  });
  render({ message: "Carregando versões..." });
  if (activePresentationRecord) {
    if (!apiAvailable) {
      render({ message: "O histórico de histórias fica disponível em projetos SQLite." });
      return;
    }
    try {
      const data = await apiFetch(`/api/presentations/${encodeURIComponent(activePresentationRecord.id)}/versions`);
      render({ versions: data.versions || [], message: "" });
    } catch (error) {
      handleApiError(error);
      render({ message: "Não foi possível carregar o histórico da história." });
    }
    return;
  }
  const entry = workspace[activeIndex];
  if (!apiAvailable || !entry?.persisted) {
    render({ message: "O histórico fica disponível em projetos SQLite." });
    return;
  }
  try {
    const data = await apiFetch(`/api/loops/${encodeURIComponent(entry.id)}/versions`);
    render({ versions: data.versions || [], message: "" });
  } catch (error) {
    handleApiError(error);
    render({ message: "Não foi possível carregar o histórico." });
  }
}

async function restorePresentationVersion(versionId) {
  if (!activePresentationRecord) return;
  try {
    const data = await apiFetch(`/api/presentations/${encodeURIComponent(activePresentationRecord.id)}/versions/${versionId}/restore`, { method: "POST" });
    activePresentationRecord = data.presentation;
    activePresentation = repairGeneratedPresentation(data.presentation.presentation, engine.model);
    resetPresentationHistory();
    projectPresentations = projectPresentations.map(item => item.id === data.presentation.id ? data.presentation : item);
    renderDockStory();
    await renderVersionHistory();
    showToast("Versão da história restaurada; o estado atual foi preservado.");
  } catch (error) {
    handleApiError(error);
    showToast("Não foi possível restaurar esta versão da história.");
  }
}

async function restoreVersion(versionId) {
  const entry = workspace[activeIndex];
  try {
    const data = await apiFetch(`/api/loops/${encodeURIComponent(entry.id)}/versions/${versionId}/restore`, {
      method: "POST"
    });
    entry.label = data.loop.title;
    entry.summary = data.loop.summary;
    entry.description_md = data.loop.description_md;
    entry.model = data.loop.model;
    engine.setModel(entry.model, { animate: false });
    engine.resetHistory();
    engine.setView(resolvedViewForEntry(entry));
    syncModelMetadata();
    refreshPanels();
    refreshDockEditors();
    renderWorkspaceTabs();
    await renderVersionHistory();
    showToast("Versão restaurada. O estado anterior também foi preservado.");
  } catch (error) {
    handleApiError(error);
    showToast("Não foi possível restaurar esta versão.");
  }
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
}

function styleControl(id) {
  return document.querySelector(`#${id}`);
}

function styleControlValue(id, fallback = "") {
  return styleControl(id)?.value ?? fallback;
}

function setStyleStatus(message, error = false) {
  if (reactApp?.renderStyleBuilder) {
    reactApp.renderStyleBuilder({ status: message, error });
    return;
  }
  const status = styleControl("loop-style-status");
  if (status) setDockStatus(status, message, error);
}

function addViewRule() {
  const value = styleControlValue("rule-value").trim();
  if (!value) {
    setStyleStatus("Informe o valor do filtro.", true);
    return;
  }
  try {
    const view = compileLoopStyle(styleControlValue("loop-style-editor"));
    const action = styleControlValue("rule-action");
    const properties = action === "highlight"
      ? { highlight: true, legend: styleControlValue("rule-legend").trim() || value }
      : { visible: action === "show" };
    view.rules.push({
      selector: {
        type: styleControlValue("rule-object"),
        attribute: styleControlValue("rule-attribute"),
        value
      },
      properties
    });
    const baseId = workspace[activeIndex]?.view?.settings?.extends;
    if (baseId) view.settings.extends = baseId;
    const editor = styleControl("loop-style-editor");
    if (editor) editor.value = serializeLoopStyle(view);
    syncCodeEditor("loop-style-editor");
    const valueControl = styleControl("rule-value");
    if (valueControl) valueControl.value = "";
    applyLoopStyle();
  } catch (error) {
    setStyleStatus(error.message, true);
  }
}

function renderViewLegend(view) {
  if (!elements.viewLegend) return;
  elements.viewLegend.replaceChildren();
  const reinforcing = element("span", "", "Feedback positivo ++ / −+");
  reinforcing.prepend(element("i", "legend-line"));
  const balancing = element("span", "", "Feedback negativo −− / +−");
  balancing.prepend(element("i", "legend-line dashed"));
  elements.viewLegend.append(reinforcing, balancing);
  for (const entry of buildViewLegend(view)) {
    const item = element("span", "legend-item", entry.label);
    const swatch = element("i", `legend-swatch ${entry.shape}`);
    swatch.style.setProperty("--legend-color", entry.color);
    swatch.style.color = entry.color;
    item.prepend(swatch);
    elements.viewLegend.append(item);
  }
}

function cloneJson(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function compileLoopSourceModel(source) {
  const compiled = compileLoopMarkdown(source);
  const current = engine.getModel({ includePositions: true, includeRoutes: true });
  const nodesById = new Map((current?.nodes || []).map(node => [node.id, node]));
  const edgesById = new Map((current?.edges || []).map(edge => [edge.id, edge]));
  const model = {
    ...compiled,
    nodes: compiled.nodes.map(node => {
      const previous = nodesById.get(node.id);
      return previous ? {
        ...node,
        position: previous.position,
        locked: previous.locked,
        ...(previous.media ? { media: cloneJson(previous.media) } : {})
      } : node;
    }),
    edges: compiled.edges.map(edge => {
      const previous = edgesById.get(edge.id);
      return previous?.route ? { ...edge, route: previous.route } : edge;
    })
  };
  return { compiled, model };
}

function syncLoopSourceDraftControls() {
  if (!elements.discardLoopSource) return;
  elements.discardLoopSource.disabled = !loopSourcePreview;
  elements.applyLoopSource.textContent = loopSourcePreview
    ? "Aplicar prévia ao mapa"
    : "Aplicar ao canvas";
}

function previewLoopSource() {
  try {
    const entry = workspace[activeIndex];
    if (!loopSourcePreview) {
      loopSourcePreview = {
        source: elements.loopSourceEditor.value,
        model: cloneModel(engine.getModel({ includePositions: true, includeRoutes: true })),
        view: cloneJson(engine.view),
        entry: entry ? {
          model: cloneModel(entry.model),
          label: entry.label,
          summary: entry.summary,
          description_md: entry.description_md,
          source: entry.source,
          view: cloneJson(entry.view),
          views: cloneJson(entry.views)
        } : null
      };
    }
    const { model } = compileLoopSourceModel(elements.loopSourceEditor.value);
    previewingLoopSource = true;
    engine.setModel(model, { animate: false, history: false });
    engine.setView(resolvedViewForEntry(entry));
    previewingLoopSource = false;
    refreshPanels();
    renderDockStory();
    syncLoopSourceDraftControls();
    setDockStatus(elements.loopSourceStatus, "Prévia ativa · nada foi salvo");
  } catch (error) {
    previewingLoopSource = false;
    const first = error.errors?.[0];
    setDockStatus(elements.loopSourceStatus,
      first ? `Linha ${first.line}: ${first.message}` : error.message, true);
  }
}

function discardLoopSourcePreview({ silent = false } = {}) {
  if (!loopSourcePreview) return;
  const snapshot = loopSourcePreview;
  const entry = workspace[activeIndex];
  previewingLoopSource = true;
  engine.setModel(snapshot.model, { animate: false, history: false });
  engine.setView(snapshot.view);
  previewingLoopSource = false;
  if (entry && snapshot.entry) {
    entry.model = snapshot.entry.model;
    entry.label = snapshot.entry.label;
    entry.summary = snapshot.entry.summary;
    entry.description_md = snapshot.entry.description_md;
    entry.source = snapshot.entry.source;
    entry.view = snapshot.entry.view;
    entry.views = snapshot.entry.views;
  }
  loopSourcePreview = null;
  elements.loopSourceEditor.value = snapshot.source;
  syncCodeEditor("loop-source-editor");
  refreshPanels();
  renderDockStory();
  syncLoopSourceDraftControls();
  if (!silent) setDockStatus(elements.loopSourceStatus, "Prévia descartada; estado salvo restaurado");
}

function applyLoopSource() {
  try {
    const source = elements.loopSourceEditor.value;
    const { compiled, model } = compileLoopSourceModel(source);
    const entry = workspace[activeIndex];
    const previousTitle = entry?.model?.title || entry?.label || "";
    const previousDescription = entry?.description_md || "";
    const generatedDescription = !previousDescription ||
      previousDescription.trim() === `## ${previousTitle}\n\nDescreva aqui a história e o recorte deste loop.`;
    previewingLoopSource = false;
    loopSourcePreview = null;
    syncLoopSourceDraftControls();
    engine.setModel(model, { animate: false, history: true });
    engine.setView(resolvedViewForEntry(entry));
    syncWorkspaceFromEngine();
    entry.label = model.title;
    entry.summary = compiled.description || (generatedDescription ? "" : entry.summary);
    entry.description_md = compiled.description || (generatedDescription
      ? `## ${model.title}\n\nDescreva aqui a história e o recorte deste loop.`
      : entry.description_md);
    entry.source = source;
    renderWorkspaceTabs();
    refreshPanels();
    renderDockStory();
    schedulePersistActiveLoop();
    setDockStatus(elements.loopSourceStatus, "Documento válido e aplicado");
  } catch (error) {
    const first = error.errors?.[0];
    setDockStatus(elements.loopSourceStatus,
      first ? `Linha ${first.line}: ${first.message}` : error.message, true);
  }
}

async function importLoopSourceFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const source = await file.text();
    if (/```mermaid|^\s*(?:graph|flowchart)\s+(?:TD|TB|LR|RL|BT)/im.test(source)) {
      const model = importMermaid(source, {
        id: slugId(file.name.replace(/\.[^.]+$/, ""), "mermaid-import"),
        title: file.name.replace(/\.[^.]+$/, "")
      });
      elements.loopSourceEditor.value = serializeLoopMarkdown(model);
      syncCodeEditor("loop-source-editor");
    } else {
      elements.loopSourceEditor.value = source;
      syncCodeEditor("loop-source-editor");
    }
    applyLoopSource();
  } catch (error) {
    const first = error.errors?.[0];
    setDockStatus(elements.loopSourceStatus,
      first ? `Linha ${first.line}: ${first.message}` : error.message, true);
  }
}

async function importLoopSourceAsNewMap(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const source = await file.text();
    const fallbackTitle = file.name.replace(/\.(?:loop\.)?md$/i, "") || "Mapa importado";
    const isMermaid = /```mermaid|^\s*(?:graph|flowchart)\s+(?:TD|TB|LR|RL|BT)/im.test(source);
    let model = isMermaid
      ? importMermaid(source, { id: slugId(fallbackTitle, "mermaid-import"), title: fallbackTitle })
      : compileLoopMarkdown(source);
    const existingIds = new Set(workspace.map(entry => entry.model?.id));
    const baseId = slugId(model.id || model.title || fallbackTitle, "mapa-importado");
    let id = baseId;
    let suffix = 2;
    while (existingIds.has(id)) id = `${baseId}-${suffix++}`;
    model = { ...model, id, title: model.title || fallbackTitle };
    const authoredSource = isMermaid ? serializeLoopMarkdown(model) : source;
    const created = await createLoopEntry({
      id: `import:${id}`,
      kind: "import",
      label: model.title,
      summary: model.description || "",
      description_md: model.description || `## ${model.title}\n\nMapa importado de ${file.name}.`,
      source: authoredSource,
      model
    });
    created.source = authoredSource;
    workspace.push(created);
    renderWorkspaceTabs();
    selectModel(workspace.length - 1);
    setWorkspaceMode("map");
    elements.loopSourceEditor.value = authoredSource;
    syncCodeEditor("loop-source-editor");
    setDockStatus(elements.loopSourceStatus, "Mapa importado como novo documento");
    showToast("Markdown importado como um novo mapa; o mapa anterior foi preservado.");
  } catch (error) {
    const first = error.errors?.[0];
    showToast(first ? `Linha ${first.line}: ${first.message}` : error.message);
  }
}

function exportLoopSource() {
  const model = engine.getModel({ includePositions: false, includeRoutes: false });
  downloadText(`${slugId(model.title || model.id, "loop")}.loop.md`,
    serializeLoopMarkdown(model), "text/markdown");
}

function exportLoopStyle() {
  const entry = workspace[activeIndex];
  const source = styleControlValue("loop-style-editor") || serializeLoopStyle(entry?.view || { title: "Matcha" });
  downloadText(`${slugId(entry?.view?.title || "matcha", "view")}.loop.css`, source, "text/css");
}

async function applyLoopStyle() {
  try {
    const compiled = compileLoopStyle(styleControlValue("loop-style-editor"));
    const entry = workspace[activeIndex];
    const previous = entry.view || {};
    // A .loop.css source describes the editable rules. Its omission of a
    // library provenance field must not silently turn a Style Pack view into
    // the default Matcha preset on its next reload.
    const view = {
      ...previous,
      ...compiled,
      id: previous.id,
      settings: { ...(previous.settings || {}), ...(compiled.settings || {}) },
      rules: compiled.rules,
      style_source: compiled.style_source,
      ...(previous.tokens ? { tokens: { ...previous.tokens } } : {})
    };
    entry.view = view;
    entry.views = (entry.views || []).map(item => item.id === view.id ? view : item);
    engine.setView(resolvedViewForEntry(entry), {
      reroute: !onlyPolarityVisibilityChanged(previous, view)
    });
    styleDirty = true;
    setStyleStatus("Vista válida e aplicada");
    return true;
  } catch (error) {
    const first = error.errors?.[0];
    setStyleStatus(
      first ? `Linha ${first.line}: ${first.message}` : error.message, true);
    return false;
  }
}

async function saveStyleBuilderView() {
  const applied = await applyLoopStyle();
  if (!applied) return;
  const entry = workspace[activeIndex];
  if (!entry?.view) return;
  const saved = await persistActiveView(entry.view);
  if (saved) {
    styleDirty = false;
    setSaveStatus("saved", "Salvo");
    setStyleStatus(`Estilo salvo: ${entry.view.title}.`);
  } else {
    setStyleStatus("Prévia aplicada; o servidor não está disponível para persistir este estilo.", true);
  }
}

async function persistActiveView(view) {
  const entry = workspace[activeIndex];
  if (!apiAvailable || !entry?.persisted) return null;
  try {
    const result = await saveView.execute({
      view: { ...view, map_id: view.map_id || entry.mapId }
    });
    if (!result?.view) return null;
    entry.mapId = result.view.map_id || entry.mapId;
    entry.viewId = result.view.id;
    entry.view = result.view;
    entry.views = (entry.views || []).some(view => view.id === result.view.id)
      ? entry.views.map(view => view.id === result.view.id ? result.view : view)
      : [...(entry.views || []), result.view];
    renderViewSwitcher();
    return result.view;
  } catch (error) {
    handleApiError(error);
    setStyleStatus("Vista aplicada, mas não foi possível salvá-la no projeto.", true);
  }
}

function clonePresentation(value) {
  if (!value) return null;
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function updatePresentationHistoryControls() {
  if (elements.presentationUndo) {
    elements.presentationUndo.disabled = presentationUndoStack.length === 0;
    elements.presentationUndo.title = presentationUndoStack.length
      ? `Desfazer (${presentationUndoStack.length} alteração(ões))`
      : "Nada para desfazer";
  }
  if (elements.presentationRedo) {
    elements.presentationRedo.disabled = presentationRedoStack.length === 0;
    elements.presentationRedo.title = presentationRedoStack.length
      ? `Refazer (${presentationRedoStack.length} alteração(ões))`
      : "Nada para refazer";
  }
}

function resetPresentationHistory() {
  presentationUndoStack = [];
  presentationRedoStack = [];
  appCommands.setStoryDirty(false);
  selectedStoryboardSceneIds = new Set();
  selectedStoryboardBeatIds = new Map();
  updatePresentationHistoryControls();
}

function commitPresentationEdit(next, message = "História alterada", { record = true } = {}) {
  const result = editPresentation.execute({ current: presentationForEditing(), next });
  if (!result.changed) return false;
  if (record) {
    presentationUndoStack.push(clonePresentation(result.previous));
    if (presentationUndoStack.length > PRESENTATION_HISTORY_LIMIT) presentationUndoStack.shift();
    presentationRedoStack = [];
  }
  activePresentation = result.presentation;
  appCommands.setStoryDirty(true);
  syncStoryboardSelection(activePresentation);
  renderDockStory();
  renderPresentationLint(lintPresentation(activePresentation, presentationContext()));
  setSaveStatus("saving", message);
  updatePresentationHistoryControls();
  return true;
}

function undoPresentationEdit() {
  if (!presentationUndoStack.length) return false;
  const current = presentationForEditing();
  const previous = presentationUndoStack.pop();
  presentationRedoStack.push(clonePresentation(current));
  activePresentation = normalizePresentation(previous);
  syncStoryboardSelection(activePresentation);
  renderDockStory();
  renderPresentationLint(lintPresentation(activePresentation, presentationContext()));
  setSaveStatus("saving", "Alteração desfeita");
  updatePresentationHistoryControls();
  showToast("Alteração da história desfeita.");
  return true;
}

function redoPresentationEdit() {
  if (!presentationRedoStack.length) return false;
  const current = presentationForEditing();
  const next = presentationRedoStack.pop();
  presentationUndoStack.push(clonePresentation(current));
  activePresentation = normalizePresentation(next);
  syncStoryboardSelection(activePresentation);
  renderDockStory();
  renderPresentationLint(lintPresentation(activePresentation, presentationContext()));
  setSaveStatus("saving", "Alteração refeita");
  updatePresentationHistoryControls();
  showToast("Alteração da história refeita.");
  return true;
}

function presentationForEditing() {
  return normalizePresentation(activePresentation || emptyPresentationForModel(engine.model));
}

function syncStoryboardSelection(presentation) {
  const sceneIds = presentationSceneIds(presentation);
  selectedStoryboardSceneIds = new Set([...selectedStoryboardSceneIds].filter(id => sceneIds.has(id)));
  const beatIdsByScene = new Map();
  for (const chapter of presentation?.chapters || []) {
    for (const scene of chapter.scenes || []) {
      const selected = selectedStoryboardBeatIds.get(scene.id);
      if (!selected?.size) continue;
      const valid = new Set((scene.beats || []).map(beat => beat.id));
      const next = new Set([...selected].filter(id => valid.has(id)));
      if (next.size) beatIdsByScene.set(scene.id, next);
    }
  }
  selectedStoryboardBeatIds = beatIdsByScene;
}

function presentationMarkdownForEditing() {
  return serializePresentationMarkdown(presentationForEditing(), { mode: "editorial" });
}

function setStoryEditorMode(mode = "visual") {
  storyEditorMode = mode === "markdown" ? "markdown" : "visual";
  appCommands.setStoryEditorMode(storyEditorMode);
  storyStudioState.setEditorMode(storyEditorMode);
  document.body.dataset.storyEditorMode = storyEditorMode;
  elements.storyModeTabs.forEach(button => {
    const selected = button.dataset.storyMode === storyEditorMode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  elements.storySidebarInspector?.classList.toggle("active", storyEditorMode === "visual");
  elements.storySidebarMarkdown?.classList.toggle("active", storyEditorMode === "markdown");
  elements.storySidebarInspector?.setAttribute("aria-selected", String(storyEditorMode === "visual"));
  elements.storySidebarMarkdown?.setAttribute("aria-selected", String(storyEditorMode === "markdown"));
  if (elements.presentationVisualPanel) elements.presentationVisualPanel.hidden = true;
  if (elements.presentationMarkdownPanel) elements.presentationMarkdownPanel.hidden = storyEditorMode !== "markdown";
  if (elements.storyInspectorBasic) elements.storyInspectorBasic.hidden = storyEditorMode !== "visual";
  if (storyEditorMode === "markdown" && elements.presentationSourceEditor) {
    const source = presentationSourceDraft || presentationMarkdownForEditing();
    if (elements.presentationSourceEditor.value !== source) {
      elements.presentationSourceEditor.value = source;
      syncCodeEditor("presentation-source-editor");
    }
    presentationSourceDraft = source;
    updatePresentationSourceMeta(source);
    renderPresentationSourceDiff(source);
  }
  if (window.innerWidth <= 780 && elements.stageShell) {
    requestAnimationFrame(() => { elements.stageShell.scrollTop = 0; });
  }
}

function selectedPresentationTarget() {
  const presentation = presentationForEditing();
  const selection = normalizePresentationSelection(presentation, {
    sceneId: selectedStorySceneId,
    beatId: selectedStoryBeatId
  });
  const target = resolvePresentationTarget(presentation, selection.sceneId, selection.beatId);
  return { presentation, ...target };
}

function syncStoryStudioSelection(sceneId = null, beatId = null) {
  selectedStorySceneId = sceneId || null;
  selectedStoryBeatId = beatId || null;
  appCommands.selectStoryTarget(selectedStorySceneId, selectedStoryBeatId);
  storyStudioState.select(selectedStorySceneId, selectedStoryBeatId);
}

function storyInspectorFocusLabel(focus) {
  if (!focus) return "Sem foco semântico";
  const nodes = new Map((engine.model?.nodes || []).map(node => [node.id, node]));
  const edges = new Map((engine.model?.edges || []).map(edge => [edge.id, edge]));
  const nodeLabel = id => nodes.get(id)?.label || "Variável";
  const edgeLabel = id => {
    const edge = edges.get(id);
    return edge ? `${nodeLabel(edge.source)} → ${nodeLabel(edge.target)}` : "Relação causal";
  };
  if (focus.kind === "node") return nodeLabel(focus.nodeId);
  if (focus.kind === "edge") return edgeLabel(focus.edgeId);
  if (focus.kind === "loop") return findLoopById(focus.loopId)?.label || "Ciclo selecionado";
  if (focus.kind === "path") {
    const labels = (focus.edgeIds || []).map(edgeLabel);
    return labels.length <= 2 ? labels.join(" · ") : `${labels[0]} · mais ${labels.length - 1} relações`;
  }
  if (focus.kind === "set") {
    const labels = (focus.nodeIds || []).slice(0, 3).map(nodeLabel);
    return labels.length ? `${labels.join(", ")}${(focus.nodeIds || []).length > 3 ? "…" : ""}` : "Conjunto selecionado";
  }
  if (focus.kind === "query") return "Seleção por regra";
  if (focus.kind === "region") return "Região selecionada";
  return "Foco personalizado";
}

function storyBeatDisplayTitle(beat, scene) {
  return storyBeatTitle(beat, scene, storyInspectorFocusLabel);
}

function setStoryInspectorStatus(message = "", isError = false) {
  if (!elements.storyInspectorStatus) return;
  elements.storyInspectorStatus.textContent = message;
  elements.storyInspectorStatus.classList.toggle("error", isError);
}

function populateSelect(select, options, value) {
  if (!select) return;
  select.replaceChildren(...options.map(([optionValue, label]) => new Option(label, optionValue)));
  select.value = options.some(([optionValue]) => optionValue === value) ? value : options[0]?.[0] || "";
}

function renderStoryInspector() {
  if (!elements.storyInspectorBasic) return;
  const view = createStoryInspectorViewModel({
    target: selectedPresentationTarget(),
    findLoop: findLoopById,
    focusLabel: storyInspectorFocusLabel,
    displayTitle: storyBeatDisplayTitle,
    formatDuration: formatTimelineDuration
  });
  const { scene, beat, chapter, hasTarget, isBeat, primaryLoop, loopLabel, beatCount, beatIndex, title, narration, timing, transition, camera, cameraInherited, cameraTarget, focus } = view;
  if (elements.storyInspectorTarget) elements.storyInspectorTarget.textContent = hasTarget
    ? `${isBeat ? `Beat ${beatIndex} de ${beatCount}` : (primaryLoop ? "Cena do loop" : "Cena")} · ${title || "Sem título"}`
    : "Nenhuma cena selecionada";
  if (elements.storyCanvasSelectionTitle) elements.storyCanvasSelectionTitle.textContent = hasTarget
    ? `${isBeat ? "Beat" : "Cena"} · ${title || "Sem título"}`
    : "Nenhum movimento selecionado";
  if (elements.storyCanvasSelectionMeta) elements.storyCanvasSelectionMeta.textContent = hasTarget
    ? `${chapter?.title || "Apresentação"} · ${scene.title}`
    : "Selecione um beat na estrutura ou na timeline";
  updateStoryCanvasSelectionAction();
  if (elements.storyInspectorContext) elements.storyInspectorContext.textContent = hasTarget
    ? `${loopLabel ? `Loop · ${loopLabel} · ${beatCount} beats` : `${chapter?.title || "Apresentação"} · ${scene.title}`}${isBeat ? ` · Beat ${beatIndex}` : ""}`
    : "Selecione uma cena ou beat no storyboard para dirigir o palco.";
  populateSelect(elements.storyInspectorType, isBeat
    ? [["focus", "Foco"], ["reveal", "Revelar"], ["traverse", "Percurso"], ["handoff", "Handoff"], ["compare", "Comparar"], ["intervention", "Intervenção"], ["consequence", "Consequência"], ["question", "Pergunta"], ["custom", "Custom"]]
    : [["title", "Título"], ["stage", "Mapa"], ["narrative", "Narrativa"], ["comparison", "Comparação"], ["media", "Imagem"], ["choice", "Escolha"]],
  isBeat ? beat?.type : scene?.type);
  if (elements.storyInspectorTitle) elements.storyInspectorTitle.value = title || "";
  if (elements.storyInspectorNarration) elements.storyInspectorNarration.value = narration || "";
  if (elements.storyInspectorAdvance) elements.storyInspectorAdvance.value = timing?.advance === "auto" ? "auto" : "manual";
  if (elements.storyInspectorTransition) elements.storyInspectorTransition.value = transition || "instant";
  const cameraMode = cameraInherited ? "inherit" : (["fit-map", "fit-focus", "fit-set", "follow-path", "fixed", "split"].includes(camera) ? camera : "fit-map");
  if (elements.storyInspectorCamera) elements.storyInspectorCamera.value = cameraMode;
  if (elements.storyInspectorCameraTarget) elements.storyInspectorCameraTarget.textContent = cameraTarget || "";
  if (elements.storyInspectorCameraHelp) elements.storyInspectorCameraHelp.textContent = cameraHelpText(cameraMode, cameraInherited);
  if (elements.storyInspectorFocus) elements.storyInspectorFocus.value = storyInspectorFocusLabel(focus);
  renderStoryInspectorMovementOptions();
  const duration = Number(timing?.durationMs || 5000);
  if (elements.storyInspectorDurationPreset) {
    const preset = [3000, 5000, 8000].includes(duration) ? String(duration) : "custom";
    elements.storyInspectorDurationPreset.value = preset;
    if (elements.storyInspectorCustomDurationField) elements.storyInspectorCustomDurationField.hidden = preset !== "custom";
    if (elements.storyInspectorCustomDuration) elements.storyInspectorCustomDuration.value = formatTimelineDuration(duration);
  }
  const controls = [elements.storyInspectorTitle, elements.storyInspectorType, elements.storyInspectorNarration, elements.storyInspectorDurationPreset, elements.storyInspectorCustomDuration, elements.storyInspectorAdvance, elements.storyInspectorTransition, elements.storyInspectorCamera, elements.storyInspectorUseSelection, elements.storyInspectorCaptureState, elements.storyInspectorClearFocus, elements.storyInspectorDuplicate, elements.storyInspectorRemove, elements.storyInspectorRemoveScene];
  controls.forEach(control => { if (control) control.disabled = !hasTarget; });
  if (elements.storyInspectorRemove) elements.storyInspectorRemove.disabled = !isBeat;
  if (elements.storyInspectorDuplicate) elements.storyInspectorDuplicate.disabled = !isBeat;
  if (elements.storyInspectorRemoveScene) elements.storyInspectorRemoveScene.disabled = !hasTarget;
  if (!hasTarget) setStoryInspectorStatus("");
}

function loopEdgesForScene(scene) {
  const loopId = scene?.causalFrame?.primaryLoopId;
  const loop = loopId ? findLoopById(loopId) : null;
  return { loopId: loopId || "", loopEdgeIds: loop?.edgeIds || [] };
}

function orderSelectedEdges(edgeIds = []) {
  const selected = edgeIds
    .map(id => engine.model?.edges?.find(edge => edge.id === id))
    .filter(Boolean);
  if (!selected.length || selected.length !== edgeIds.length) return null;
  const starts = selected.filter(edge => !selected.some(other => other.target === edge.source));
  if (starts.length !== 1) return null;
  const ordered = [starts[0]];
  while (ordered.length < selected.length) {
    const previous = ordered.at(-1);
    const next = selected.find(edge => edge.source === previous.target && !ordered.includes(edge));
    if (!next) return null;
    ordered.push(next);
  }
  return ordered.map(edge => edge.id);
}

function focusForCurrentSelection() {
  const nodeIds = selectedNodeIds.length ? [...selectedNodeIds] : (selectedNodeId ? [selectedNodeId] : []);
  const edgeIds = selectedEdgeIds.length ? [...selectedEdgeIds] : (selectedEdgeId ? [selectedEdgeId] : []);
  if (edgeIds.length > 1) {
    const ordered = orderSelectedEdges(edgeIds);
    if (ordered) return { kind: "path", edgeIds: ordered };
  }
  if (nodeIds.length || edgeIds.length) {
    return {
      kind: "set",
      ...(nodeIds.length ? { nodeIds } : {}),
      ...(edgeIds.length ? { edgeIds } : {})
    };
  }
  if (activeLoopId) return { kind: "loop", loopId: activeLoopId };
  return null;
}

function updateStoryCanvasSelectionAction() {
  const focus = focusForCurrentSelection();
  const count = (focus?.nodeIds?.length || 0) + (focus?.edgeIds?.length || 0);
  const canCreate = count > 0 && Boolean(selectedPresentationTarget().scene);
  const label = count > 1 ? `Criar movimento · ${count} elementos` : "Criar movimento com seleção";
  const title = count > 1
    ? "Criar um beat usando os elementos selecionados como foco"
    : "Criar um beat usando o elemento selecionado como foco";
  const bar = elements.storySelectionBar || document.querySelector("#story-selection-bar");
  const countLabel = elements.storySelectionCount || document.querySelector("#story-selection-count");
  const clear = elements.storySelectionClear || document.querySelector("#story-selection-clear");
  const create = elements.storySelectionCreate || document.querySelector("#story-selection-create");
  if (bar) bar.hidden = workspaceMode !== "story";
  if (countLabel) countLabel.textContent = count
    ? `${count} elemento${count === 1 ? "" : "s"} selecionado${count === 1 ? "" : "s"}`
    : "Clique nos elementos ou arraste uma caixa para compor o foco.";
  if (clear) clear.hidden = count === 0;
  if (create) {
    create.hidden = !canCreate;
    create.disabled = !canCreate;
    create.textContent = label;
    create.title = title;
  }
  [elements.storyInspectorAddSelection].forEach(control => {
    if (!control) return;
    control.hidden = !canCreate;
    control.disabled = !canCreate;
    control.textContent = label;
    control.title = title;
  });
}

function clearStoryCanvasSelection() {
  engine.cy?.elements().unselect();
  engine.clearFocus();
  selectedNodeId = null;
  selectedEdgeId = null;
  selectedNodeIds = [];
  selectedEdgeIds = [];
  lastStorySelectionFocus = null;
  updateStoryCanvasSelectionAction();
}

function addSelectionBeatFromCanvas() {
  const current = presentationForEditing();
  const focus = focusForCurrentSelection() || lastStorySelectionFocus;
  const scene = current.chapters.flatMap(chapter => chapter.scenes || []).find(item => item.id === selectedStorySceneId)
    || current.chapters.flatMap(chapter => chapter.scenes || [])[0];
  if (!focus) {
    showToast("Selecione um ou mais elementos no canvas primeiro.");
    return;
  }
  if (!scene) {
    showToast("Crie ou selecione uma cena antes de criar um beat.");
    return;
  }
  const kind = focus.kind === "path" ? "path" : focus.kind === "set" ? "set" : focus.kind;
  const cameraMode = kind === "path" ? "follow-path" : kind === "set" ? "fit-set" : "fit-focus";
  const title = kind === "path"
    ? "Percurso selecionado"
    : kind === "set"
      ? `Conjunto · ${(focus.nodeIds?.length || 0) + (focus.edgeIds?.length || 0)} elementos`
      : storyInspectorFocusLabel(focus);
  const beat = {
    id: `beat-selection-${Date.now()}`,
    type: kind === "path" ? "traverse" : "focus",
    title,
    narrationMd: "",
    focus,
    ...(focus.kind === "loop"
      ? { movement: { kind: "loop", loopId: focus.loopId } }
      : focus.kind === "path"
        ? { movement: { kind: "path", edgeIds: [...(focus.edgeIds || [])] } }
        : {}),
    delta: { camera: { mode: cameraMode } },
    timing: { durationMs: 5000, advance: "manual" }
  };
  const next = {
    ...current,
    chapters: current.chapters.map(chapter => ({
      ...chapter,
      scenes: chapter.scenes.map(item => item.id === scene.id
        ? { ...item, beats: [...(item.beats || []), beat] }
        : item)
    }))
  };
  selectedStorySceneId = scene.id;
  selectedStoryBeatId = beat.id;
  collapsedPresentationScenes.delete(scene.id);
  applyPresentationStructureEdit(next, "Beat criado a partir da seleção");
  focusPresentationBeat(scene.id, beat.id);
  showToast(kind === "set" ? "Beat criado com conjunto de elementos." : "Beat criado a partir da seleção.");
}

function renderStoryInspectorMovementOptions(sourceNodeId = null, targetNodeId = null) {
  const target = selectedPresentationTarget();
  const isBeat = Boolean(target.beat);
  const movementVisible = Boolean(elements.storyInspectorMovement && isBeat);
  if (elements.storyInspectorMovement) elements.storyInspectorMovement.hidden = !movementVisible;
  if (!movementVisible) {
    updateStoryInspectorMovementCopy({ kind: "generic" });
    if (elements.storyInspectorEditMovement) elements.storyInspectorEditMovement.hidden = true;
    return;
  }
  const descriptor = describeMovement(target.beat, engine.model, availableStoryLoops());
  updateStoryInspectorMovementCopy(descriptor);
  if (descriptor.kind !== "relation") {
    if (elements.storyInspectorSourcePicker) elements.storyInspectorSourcePicker.hidden = true;
    if (elements.storyInspectorSource) elements.storyInspectorSource.hidden = true;
    if (elements.storyInspectorMovementOptions) elements.storyInspectorMovementOptions.hidden = true;
    if (elements.storyInspectorMovementOptions) elements.storyInspectorMovementOptions.replaceChildren();
    if (elements.storyInspectorTargetNode) elements.storyInspectorTargetNode.value = "";
    renderStoryInspectorMovementSvg({ descriptor, model: engine.model });
    if (elements.storyInspectorMovementStatus) elements.storyInspectorMovementStatus.textContent = descriptor.valid
      ? `${descriptor.label}: ${descriptor.title}`
      : `${descriptor.label} indisponível neste mapa.`;
    if (elements.storyInspectorApplyMovement) elements.storyInspectorApplyMovement.hidden = true;
    if (elements.storyInspectorSuggestNext) {
      elements.storyInspectorSuggestNext.hidden = true;
      elements.storyInspectorSuggestNext.disabled = true;
    }
    if (elements.storyInspectorEditMovement) {
      const canEdit = ["loop", "path", "map"].includes(descriptor.kind) && descriptor.valid;
      elements.storyInspectorEditMovement.hidden = !canEdit;
      elements.storyInspectorEditMovement.disabled = !canEdit;
    }
    return;
  }
  if (elements.storyInspectorApplyMovement) elements.storyInspectorApplyMovement.hidden = false;
  if (elements.storyInspectorSource) elements.storyInspectorSource.hidden = false;
  if (elements.storyInspectorMovementOptions) elements.storyInspectorMovementOptions.hidden = false;
  if (elements.storyInspectorEditMovement) elements.storyInspectorEditMovement.hidden = true;
  const movement = movementFromBeat(target.beat, engine.model);
  let source = sourceNodeId || movement?.sourceNodeId || focusForCurrentSelection()?.nodeIds?.[0] || "";
  const currentTarget = targetNodeId || movement?.targetNodeId || "";
  const nodes = [...(engine.model?.nodes || [])].sort((left, right) => (left.label || left.id).localeCompare(right.label || right.id));
  if (elements.storyInspectorSource) {
    populateSelect(elements.storyInspectorSource, nodes.map(node => [node.id, node.label || node.id]), source);
    source = elements.storyInspectorSource.value;
  }
  const { loopId, loopEdgeIds } = loopEdgesForScene(target.scene);
  const options = causalMovementOptions(engine.model, { sourceNodeId: source, loopId, loopEdgeIds });
  const selectedOption = options.find(item => item.targetNodeId === currentTarget) || null;
  if (elements.storyInspectorTargetNode) elements.storyInspectorTargetNode.value = selectedOption?.targetNodeId || "";
  if (elements.storyInspectorMovementDestination) elements.storyInspectorMovementDestination.textContent = selectedOption?.targetLabel || "Escolha uma relação";
  renderStoryInspectorMovementSvg({ descriptor, model: engine.model, nodes, source, options, selectedTargetNodeId: selectedOption?.targetNodeId || "" });
  updateStoryInspectorMovementPreview();
  const suggestions = suggestNextStoryMovementsForTarget(target);
  if (elements.storyInspectorSuggestNext) {
    elements.storyInspectorSuggestNext.hidden = !suggestions.length;
    elements.storyInspectorSuggestNext.textContent = suggestions.length
      ? `Usar próximo: ${suggestions[0].label}`
      : "Nenhum próximo movimento sugerido";
    elements.storyInspectorSuggestNext.disabled = !suggestions.length;
  }
}

function renderStoryInspectorMovementSvg({ descriptor = {}, model = {}, nodes = [], source = "", options = [], selectedTargetNodeId = "" } = {}) {
  if (!elements.storyInspectorCausalSvg || !reactApp?.renderMovementInspector) return;
  const sourceNode = nodes.find(node => node.id === source);
  const pathNodes = descriptor.nodes || [];
  reactApp.renderMovementInspector({
    kind: descriptor.kind || "generic",
    label: descriptor.kind === "relation" ? "Trajetória causal" : descriptor.title || descriptor.label,
    source: sourceNode?.label || source || descriptor.sourceLabel || "Escolha a origem",
    options,
    selectedTargetNodeId,
    model,
    loop: descriptor.loop,
    pathNodes,
    valid: descriptor.valid !== false
  });
  if (descriptor.kind === "relation") {
    renderStoryInspectorSourcePicker(nodes, source);
    if (elements.storyInspectorMovementOptions) {
      elements.storyInspectorMovementOptions.innerHTML = options.length
        ? options.map(option => `<div role="listitem">${escapeHtml(option.label)}</div>`).join("")
        : "<div role=\"listitem\">Nenhuma relação de saída</div>";
    }
  }
}

function updateStoryInspectorMovementCopy(descriptor = {}) {
  const copy = {
    relation: ["Movimento · Relação", "Trajetória causal", "Selecione um destino ou altere a origem", "Um movimento conta a passagem de uma variável para outra."],
    loop: ["Movimento · Loop", "Loop destacado", "O mapa reaproveita o loop calculado", "Este movimento deixa o retorno do ciclo visível para a leitura."],
    path: ["Movimento · Caminho", "Caminho causal", "A sequência ordena a leitura das relações", "Este movimento acompanha uma trajetória contínua entre variáveis."],
    map: ["Movimento · Mapa inteiro", "Visão geral", "O enquadramento devolve o sistema completo", "Este movimento reabre o mapa para orientar a leitura do conjunto."],
    generic: ["Foco semântico", "Foco no mapa", "A forma depende do foco escolhido", "Este item orienta a leitura sem representar uma passagem causal específica."]
  }[descriptor.kind] || [];
  if (elements.storyInspectorMovementLabel) elements.storyInspectorMovementLabel.textContent = copy[0] || "Movimento";
  if (elements.storyMovementSourceLabel) elements.storyMovementSourceLabel.textContent = copy[1] || "Forma visual";
  if (elements.storyMovementHint) elements.storyMovementHint.textContent = copy[2] || "";
  if (elements.storyInspectorMovementHelp) elements.storyInspectorMovementHelp.textContent = copy[3] || "";
}

function renderStoryInspectorSourcePicker(nodes = [], source = "") {
  if (!elements.storyInspectorSourcePicker) return;
  elements.storyInspectorSourcePicker.innerHTML = nodes.map(node => `<button type="button" role="option" aria-selected="${node.id === source}" class="story-movement-source-option${node.id === source ? " is-selected" : ""}" data-source-node-id="${escapeHtml(node.id)}">${escapeHtml(node.label || node.id)}</button>`).join("");
}

function selectStoryInspectorMovement(sourceNodeId, targetNodeId) {
  if (!elements.storyInspectorSource || !elements.storyInspectorTargetNode) return;
  elements.storyInspectorSource.value = sourceNodeId;
  elements.storyInspectorTargetNode.value = targetNodeId;
  renderStoryInspectorMovementOptions(sourceNodeId, targetNodeId);
}

function suggestNextStoryMovementsForTarget(target = selectedPresentationTarget()) {
  if (!target.beat) return [];
  const movement = movementFromBeat(target.beat, engine.model);
  const { loopId, loopEdgeIds } = loopEdgesForScene(target.scene);
  if (movement?.edgeId) return suggestNextCausalMovements(engine.model, { lastEdgeId: movement.edgeId, loopId, loopEdgeIds });
  const focus = target.beat.focus;
  const sourceNodeId = focus?.kind === "node" ? focus.nodeId : focus?.kind === "set" ? focus.nodeIds?.at(-1) : "";
  return sourceNodeId ? causalMovementOptions(engine.model, { sourceNodeId, loopId, loopEdgeIds }) : [];
}

function updateStoryInspectorMovementPreview() {
  if (!elements.storyInspectorMovementStatus) return;
  const targetSelection = selectedPresentationTarget();
  const descriptor = targetSelection.beat ? describeMovement(targetSelection.beat, engine.model, availableStoryLoops()) : null;
  if (descriptor && descriptor.kind !== "relation") return;
  const source = elements.storyInspectorSource?.value || "";
  const target = elements.storyInspectorTargetNode?.value || "";
  const movement = resolveCausalMovement(engine.model, source, target);
  elements.storyInspectorMovementStatus.textContent = movement
    ? `Movimento: ${movement.label}`
    : "Escolha uma relação existente no mapa.";
  if (elements.storyInspectorApplyMovement) elements.storyInspectorApplyMovement.disabled = !movement;
}

function applyStoryInspectorMovement() {
  const target = selectedPresentationTarget();
  if (!target.beat) return;
  const movement = resolveCausalMovement(engine.model, elements.storyInspectorSource?.value, elements.storyInspectorTargetNode?.value);
  if (!movement) {
    setStoryInspectorStatus("Escolha duas variáveis conectadas por uma relação.", true);
    return;
  }
  replaceSelectedPresentation((current, selected) => ({
    ...current,
    chapters: current.chapters.map(chapter => chapter.id !== selected.chapter.id ? chapter : {
      ...chapter,
      scenes: chapter.scenes.map(scene => scene.id !== selected.scene.id ? scene : {
        ...scene,
        beats: scene.beats.map(beat => {
          if (beat.id !== selected.beat.id) return beat;
          const previous = movementFromBeat(beat, engine.model);
          const automaticTitle = !beat.title || previous && [previous.label, `${previous.sourceNodeId} → ${previous.targetNodeId}`].includes(beat.title);
          return applyMovementToBeat(automaticTitle ? { ...beat, title: movement.label } : beat, movement);
        })
      })
    })
  }), "Movimento causal alterado");
  focusPresentationBeat(target.scene.id, target.beat.id);
  showToast(`Movimento atualizado: ${movement.label}.`);
}

function suggestNextStoryInspectorMovement() {
  const suggestion = suggestNextStoryMovementsForTarget()[0];
  if (!suggestion || !elements.storyInspectorSource || !elements.storyInspectorTargetNode) return;
  elements.storyInspectorSource.value = suggestion.sourceNodeId;
  renderStoryInspectorMovementOptions(suggestion.sourceNodeId, suggestion.targetNodeId);
  applyStoryInspectorMovement();
}

async function editSelectedStoryMovement() {
  const target = selectedPresentationTarget();
  if (!target.beat) return;
  const loops = availableStoryLoops();
  const descriptor = describeMovement(target.beat, engine.model, loops);
  const explicitKind = target.beat.movement?.kind;
  const focusKind = target.beat.focus?.kind;
  const editKind = ["map", "loop", "path"].includes(explicitKind)
    ? explicitKind
    : ["loop", "path"].includes(focusKind)
      ? focusKind
      : descriptor.kind;
  if (!["map", "loop", "path"].includes(editKind) || !descriptor.valid) return;
  const draft = await openMovementComposerDialog({
    sceneTitle: target.scene?.title || "esta cena",
    model: engine.model,
    loops,
    initial: {
      kind: editKind,
      sourceNodeId: descriptor.sourceNodeId || "",
      targetNodeId: descriptor.targetNodeId || "",
      loopId: target.beat.movement?.loopId || target.beat.focus?.loopId || descriptor.loopId || "",
      edgeIds: target.beat.movement?.edgeIds || target.beat.focus?.edgeIds || descriptor.edgeIds || [],
      title: target.beat.title || descriptor.title,
      narration: target.beat.narrationMd || "",
      durationMs: target.beat.timing?.durationMs || 5000,
      advance: target.beat.timing?.advance || "manual",
      transition: target.beat.transition?.type || "dissolve",
      role: target.beat.type === "traverse" ? "traverse" : "focus"
    }
  });
  if (!draft) return;
  const result = createMovementBeat({ draft, model: engine.model, loops, id: target.beat.id });
  if (result.errors.length || !result.beat) {
    showToast(result.errors[0] || "Não foi possível atualizar este movimento.");
    return;
  }
  const replacement = { ...target.beat, ...result.beat, id: target.beat.id, speakerNotesMd: target.beat.speakerNotesMd || "" };
  replaceSelectedPresentation((current, selected) => ({
    ...current,
    chapters: current.chapters.map(chapter => chapter.id !== selected.chapter.id ? chapter : {
      ...chapter,
      scenes: chapter.scenes.map(scene => scene.id !== selected.scene.id ? scene : {
        ...scene,
        beats: scene.beats.map(beat => beat.id === selected.beat.id ? replacement : beat)
      })
    })
  }), "Movimento atualizado no compositor");
  focusPresentationBeat(target.scene.id, target.beat.id);
  showToast("Movimento atualizado.");
}

function duplicateSelectedStoryBeat() {
  const target = selectedPresentationTarget();
  if (!target.beat) return;
  const current = presentationForEditing();
  const next = duplicatePresentationBeats(current, { [target.scene.id]: [target.beat.id] });
  const nextScene = next.chapters.flatMap(chapter => chapter.scenes).find(scene => scene.id === target.scene.id);
  const newBeat = nextScene?.beats?.find(beat => beat.id !== target.beat.id && beat.title === `${target.beat.title} · cópia`);
  if (newBeat) {
    selectedStorySceneId = target.scene.id;
    selectedStoryBeatId = newBeat.id;
  }
  applyPresentationStructureEdit(next, "Beat duplicado");
  showToast("Beat duplicado.");
}

function removeSelectedStoryBeat() {
  const target = selectedPresentationTarget();
  if (!target.beat) return;
  if (!window.confirm(`Remover o movimento “${target.beat.title}” da cena?`)) return;
  const next = removePresentationItems(presentationForEditing(), { beatsByScene: { [target.scene.id]: [target.beat.id] } });
  const remaining = next.chapters.flatMap(chapter => chapter.scenes).find(scene => scene.id === target.scene.id)?.beats || [];
  selectedStorySceneId = target.scene.id;
  selectedStoryBeatId = remaining[0]?.id || null;
  applyPresentationStructureEdit(next, "Beat removido");
  showToast("Movimento removido. O mapa causal permaneceu intacto.");
}

function removeSelectedStoryScene() {
  const target = selectedPresentationTarget();
  if (!target.scene || !target.chapter) return;
  const count = target.scene.beats?.length || 0;
  if (!window.confirm(`Remover a cena “${target.scene.title}” e seus ${count} movimentos da história? O mapa permanecerá intacto.`)) return;
  const next = removePresentationItems(presentationForEditing(), { sceneIds: [target.scene.id] });
  const fallback = next.chapters.flatMap(chapter => chapter.scenes)[0];
  selectedStorySceneId = fallback?.id || null;
  selectedStoryBeatId = fallback?.beats?.[0]?.id || null;
  applyPresentationStructureEdit(next, "Cena removida");
  showToast("Cena removida. O loop e as variáveis permaneceram intactos.");
}

function removeTimelineBeat(sceneId, beatId) {
  if (!sceneId || !beatId) return;
  const previousSceneId = selectedStorySceneId;
  const previousBeatId = selectedStoryBeatId;
  selectedStorySceneId = sceneId;
  selectedStoryBeatId = beatId;
  removeSelectedStoryBeat();
  if (selectedStorySceneId === sceneId && selectedStoryBeatId === beatId) {
    selectedStorySceneId = previousSceneId;
    selectedStoryBeatId = previousBeatId;
  }
}

function removeTimelineScene(sceneId) {
  if (!sceneId) return;
  const previousSceneId = selectedStorySceneId;
  const previousBeatId = selectedStoryBeatId;
  selectedStorySceneId = sceneId;
  selectedStoryBeatId = null;
  removeSelectedStoryScene();
  if (selectedStorySceneId === sceneId) {
    selectedStorySceneId = previousSceneId;
    selectedStoryBeatId = previousBeatId;
  }
}

function replaceSelectedPresentation(mutator, message = "História alterada") {
  const current = presentationForEditing();
  const target = selectedPresentationTarget();
  if (!target.scene) return false;
  const next = mutator(current, target);
  return commitPresentationEdit(next, message);
}

function updateStoryInspectorBasic(changes = {}) {
  const target = selectedPresentationTarget();
  if (!target.scene) return;
  const changed = replaceSelectedPresentation((current, selected) => ({
    ...current,
    chapters: current.chapters.map(chapter => chapter.id !== selected.chapter.id ? chapter : {
      ...chapter,
      scenes: chapter.scenes.map(scene => scene.id !== selected.scene.id ? scene : {
        ...scene,
        ...(selected.beat ? {
          beats: scene.beats.map(beat => beat.id !== selected.beat.id ? beat : {
            ...beat,
            ...(changes.title !== undefined ? { title: changes.title } : {}),
            ...(changes.type !== undefined ? { type: changes.type } : {}),
            ...(changes.narrationMd !== undefined ? { narrationMd: changes.narrationMd } : {}),
            ...(changes.durationMs !== undefined || changes.advance !== undefined ? { timing: { ...(beat.timing || {}), ...(changes.durationMs !== undefined ? { durationMs: changes.durationMs } : {}), ...(changes.advance !== undefined ? { advance: changes.advance } : {}) } } : {}),
            ...(changes.transition !== undefined ? { transition: { type: changes.transition } } : {}),
            ...(changes.cameraMode !== undefined ? { delta: changes.cameraMode === "inherit" ? { ...(beat.delta || {}), camera: undefined } : { ...(beat.delta || {}), camera: { ...(beat.delta?.camera || {}), mode: changes.cameraMode } } } : {})
          })
        } : {
          ...(changes.title !== undefined ? { title: changes.title, content: { ...(scene.content || {}), title: changes.title } } : {}),
          ...(changes.type !== undefined ? { type: changes.type } : {}),
          ...(changes.narrationMd !== undefined ? { content: { ...(scene.content || {}), bodyMd: changes.narrationMd } } : {}),
          ...(changes.durationMs !== undefined || changes.advance !== undefined ? { timing: { ...(scene.timing || {}), ...(changes.durationMs !== undefined ? { durationMs: changes.durationMs } : {}), ...(changes.advance !== undefined ? { advance: changes.advance } : {}) } } : {}),
          ...(changes.transition !== undefined ? { transition: { ...(scene.transition || {}), type: changes.transition } } : {}),
          ...(changes.cameraMode !== undefined ? { stage: { ...(scene.stage || {}), camera: { ...(scene.stage?.camera || {}), mode: changes.cameraMode } } } : {})
        })
      })
    })
  }), "Direção alterada");
  if (changed && changes.cameraMode !== undefined && target.beat) {
    requestAnimationFrame(() => focusPresentationBeat(target.scene.id, target.beat.id));
  }
}

function cameraHelpText(mode, inherited = false) {
  if (mode === "inherit" || inherited) return "Herdar da cena usa o enquadramento definido no início da cena; este beat não cria um override.";
  return {
    "fit-map": "Mostra o mapa completo para orientar a leitura do sistema.",
    "fit-focus": "Centraliza e aproxima o nó, aresta, caminho ou loop deste beat.",
    "fit-set": "Enquadra o conjunto de elementos selecionado para este momento.",
    "follow-path": "Acompanha a sequência causal na ordem em que ela foi definida.",
    fixed: "Mantém exatamente o zoom e a posição capturados no canvas.",
    split: "Prepara uma composição para comparar dois estados ou focos."
  }[mode] || "Escolha como a câmera deve acompanhar este movimento.";
}

function toggleStoryCameraInfo() {
  setStoryCameraInfoOpen(elements.storyInspectorCameraInfoPopover?.hidden);
}

function setStoryCameraInfoOpen(open) {
  if (!elements.storyInspectorCameraInfoPopover || !elements.storyInspectorCameraInfo) return;
  elements.storyInspectorCameraInfoPopover.hidden = !open;
  elements.storyInspectorCameraInfo.setAttribute("aria-expanded", String(Boolean(open)));
}

function useCanvasSelectionInStoryInspector() {
  const focus = focusForCurrentSelection();
  if (!focus) {
    showToast("Selecione uma variável, relação, loop ou caminho no canvas primeiro.");
    return;
  }
  const target = selectedPresentationTarget();
  if (!target.beat) {
    showToast("Esta cena ainda não possui um beat para receber foco.");
    return;
  }
  replaceSelectedPresentation((current, selected) => ({
    ...current,
    chapters: current.chapters.map(chapter => chapter.id !== selected.chapter.id ? chapter : {
      ...chapter,
      scenes: chapter.scenes.map(scene => scene.id !== selected.scene.id ? scene : {
        ...scene,
          beats: scene.beats.map(beat => beat.id === selected.beat.id ? { ...beat, focus, type: focus.kind === "path" ? "traverse" : beat.type, delta: { ...(beat.delta || {}), camera: { ...(beat.delta?.camera || {}), mode: "fit-focus" } } } : beat)
      })
    })
  }), "Foco capturado do canvas");
  focusPresentationBeat(target.scene.id, target.beat.id);
}

function clearStoryInspectorFocus() {
  const target = selectedPresentationTarget();
  if (!target.scene) return;
  replaceSelectedPresentation((current, selected) => ({
    ...current,
    chapters: current.chapters.map(chapter => chapter.id !== selected.chapter.id ? chapter : {
      ...chapter,
      scenes: chapter.scenes.map(scene => scene.id !== selected.scene.id ? scene : {
        ...scene,
        beats: selected.beat ? scene.beats.map(beat => beat.id === selected.beat.id ? { ...beat, focus: undefined } : beat) : scene.beats
      })
    })
  }), "Foco removido");
}

function captureStoryInspectorState() {
  const target = selectedPresentationTarget();
  if (!target.scene) return;
  const focus = focusForCurrentSelection();
  const camera = engine.cy ? { mode: "fixed", zoom: engine.cy.zoom(), pan: { ...engine.cy.pan() } } : { mode: "fit-map" };
  replaceSelectedPresentation((current, selected) => ({
    ...current,
    chapters: current.chapters.map(chapter => chapter.id !== selected.chapter.id ? chapter : {
      ...chapter,
      scenes: chapter.scenes.map(scene => scene.id !== selected.scene.id ? scene : {
        ...scene,
        stage: { ...(scene.stage || {}), camera, ...(focus ? { visibility: { ...(scene.stage?.visibility || {}), focused: [...new Set([...(focus.nodeIds || []), ...(focus.edgeIds || []), ...(focus.loopIds || [])])] } } : {}) },
        beats: selected.beat ? scene.beats.map(beat => beat.id === selected.beat.id ? { ...beat, ...(focus ? { focus } : {}), delta: { ...(beat.delta || {}), camera } } : beat) : scene.beats
      })
    })
  }), "Estado do canvas capturado");
  if (selected.beat) focusPresentationBeat(selected.scene.id, selected.beat.id);
}

function selectStoryInspectorTarget(sceneId, beatId = null) {
  syncStoryStudioSelection(sceneId, beatId);
  if (sceneId) collapsedPresentationScenes.delete(sceneId);
  renderDockStory();
}

function compiledStoryTimeline() {
  const result = compilePresentation(presentationForEditing(), presentationContext());
  return result.valid ? result.timeline : [];
}

function currentTimelineIndex() {
  const timeline = compiledStoryTimeline();
  return timelineIndexForBeat(timeline, selectedStoryBeatId);
}

function currentTimelineFrame() {
  const timeline = compiledStoryTimeline();
  const index = currentTimelineIndex();
  return index >= 0 ? timeline[index] : null;
}

function formatTimelineDuration(durationMs = 0) {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function parseTimelineDuration(value = "") {
  const match = String(value).trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if (!match) return null;
  const durationMs = (Number(match[1]) * 60 + Number(match[2])) * 1000;
  return durationMs > 0 ? durationMs : null;
}

const storyStudioCommands = createStoryStudioCommandBus({
  getPresentation: presentationForEditing,
  commit: (next, message) => applyPresentationStructureEdit(next, message),
  select: syncStoryStudioSelection
});

function renderStoryTimeline() {
  if (!reactApp?.renderTimelineShell) return;
  const presentation = presentationForEditing();
  const timeline = compiledStoryTimeline();
  const currentIndex = currentTimelineIndex();
  const currentFrame = currentIndex >= 0 ? timeline[currentIndex] : null;
  const elapsedMs = currentIndex > 0 ? timeline.slice(0, currentIndex).reduce((sum, frame) => sum + Number(frame.durationMs || 0), 0) : 0;
  reactApp.renderTimelineShell({
    status: currentFrame ? `${currentIndex + 1}/${timeline.length} · ${storyBeatDisplayTitle(currentFrame.beat, currentFrame.scene)}` : "Nenhum movimento selecionado",
    time: formatTimelineDuration(elapsedMs),
    presentation,
    timeline,
    currentIndex,
    getBeatTitle: storyBeatDisplayTitle,
    actions: {
      selectScene: sceneId => selectStoryInspectorTarget(sceneId, null),
      addScene: addTimelineScene,
      addBeat: sceneId => addTimelineBeat(sceneId),
      removeScene: removeTimelineScene,
      removeBeat: removeTimelineBeat,
      focusBeat: focusPresentationBeat,
      moveBeatToScene: (...args) => storyStudioCommands.moveBeatToScene(...args),
      moveScene: (...args) => storyStudioCommands.moveScene(...args)
    }
  });
  return undefined;
}

function selectTimelineFrame(index) {
  const timeline = compiledStoryTimeline();
  if (!timeline.length) return;
  const safeIndex = Math.max(0, Math.min(timeline.length - 1, Number(index) || 0));
  const frame = timeline[safeIndex];
  syncStoryStudioSelection(frame.sceneId, frame.beatId);
  focusPresentationBeat(frame.sceneId, frame.beatId);
  renderStoryTimeline();
}

function updatePresentationSourceMeta(source = "") {
  if (elements.presentationSourceLineCount) {
    const lines = String(source).split("\n").length;
    elements.presentationSourceLineCount.textContent = `${lines} linhas · Markdown V2`;
  }
}

function renderPresentationSourceDiff(source = "") {
  if (!elements.presentationSourceDiff) return;
  const current = presentationMarkdownForEditing().split("\n");
  const draft = String(source).replace(/\r\n?/g, "\n").split("\n");
  let prefix = 0;
  while (prefix < current.length && prefix < draft.length && current[prefix] === draft[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < current.length - prefix && suffix < draft.length - prefix && current[current.length - 1 - suffix] === draft[draft.length - 1 - suffix]) suffix += 1;
  const removed = current.slice(prefix, current.length - suffix);
  const added = draft.slice(prefix, draft.length - suffix);
  const lines = [];
  if (!removed.length && !added.length) lines.push("Fonte sincronizada — nenhuma alteração pendente.");
  else {
    lines.push(`@@ linhas ${prefix + 1}–${Math.max(prefix + removed.length, prefix + added.length)} @@`);
    removed.forEach(line => lines.push(`− ${line}`));
    added.forEach(line => lines.push(`+ ${line}`));
  }
  elements.presentationSourceDiff.textContent = lines.join("\n");
  elements.presentationSourceDiff.classList.toggle("has-changes", Boolean(removed.length || added.length));
}

function renderPresentationSourceStatus(message, isError = false, isWarning = false) {
  if (!elements.presentationSourceStatus) return;
  elements.presentationSourceStatus.textContent = message;
  elements.presentationSourceStatus.classList.toggle("error", isError);
  elements.presentationSourceStatus.classList.toggle("warning", isWarning);
}

function validatePresentationSource(silent = false) {
  const source = elements.presentationSourceEditor?.value || presentationMarkdownForEditing();
  presentationSourceDraft = source;
  updatePresentationSourceMeta(source);
  try {
    const parsed = compilePresentationMarkdown(source);
    const lint = lintPresentation(parsed, presentationContext());
    const first = lint.errors[0] || lint.warnings[0];
    renderPresentationSourceStatus(
      first ? `${first.severity === "error" ? "Erro" : "Aviso"}: ${first.message}` : `Documento válido · score ${lint.scores?.overall ?? 100}`,
      Boolean(lint.errors.length),
      !lint.errors.length && Boolean(lint.warnings.length)
    );
    if (!silent) showToast(lint.errors.length ? "A fonte precisa de correções antes de aplicar." : "Fonte Markdown válida.");
    return { valid: lint.errors.length === 0, presentation: parsed, lint };
  } catch (error) {
    const first = error.errors?.[0];
    renderPresentationSourceStatus(first ? `Linha ${first.line}: ${first.message}` : error.message, true);
    if (!silent) showToast("A fonte Markdown contém erros.");
    return { valid: false, error };
  }
}

function applyPresentationSource() {
  const result = validatePresentationSource(false);
  if (!result.valid) return;
  const merged = mergeEditorialPresentation(presentationForEditing(), result.presentation);
  commitPresentationEdit({ ...merged, source_md: presentationSourceDraft }, "História Markdown alterada");
  showToast("Markdown aplicado ao Storyboard.");
  setStoryEditorMode("split");
}

function exportPresentationSource() {
  const presentation = presentationForEditing();
  downloadText(`${slugId(presentation.title || "historia", "historia")}.story.md`, serializePresentationMarkdown(presentation, { mode: "editorial" }), "text/markdown");
  showToast("Fonte .story.md exportada.");
}

async function exportPresentationHtml() {
  const presentation = presentationForEditing();
  const lint = lintPresentation(presentation, presentationContext());
  renderPresentationLint(lint);
  if (!lint.valid) {
    showToast("Corrija os erros bloqueadores antes de exportar a apresentação.");
    return;
  }
  const options = await openCommandDialog({
    title: "Exportar apresentação",
    description: "Escolha uma experiência guiada, um mapa explorável ou o player Atlas autônomo. Atlas prepara o primeiro quadro em alta definição antes de liberar Play.",
    submitLabel: "Gerar HTML offline",
    fields: [
      { name: "mode", label: "Formato de saída", type: "select", value: "clean", options: [
        { value: "clean", label: "Apresentação limpa · sem sidebar" },
        { value: "guided", label: "Apresentação guiada · com sidebar" },
        { value: "explore", label: "Mapa explorável · apresentação opcional" },
        { value: "atlas-embed", label: "Atlas Editorial · player autônomo" }
      ] }
    ]
  });
  if (!options) return;
  const mode = options.mode || "clean";
  elements.exportPresentationHtml.disabled = true;
  elements.exportPresentationHtml.textContent = "Gerando...";
  try {
    syncWorkspaceFromEngine();
    const entry = standaloneEntryForIndex(activeIndex);
    if (mode === "atlas-embed") {
      await exportAtlasEmbedApplication.execute({
        filename: `${slugId(presentation.title || entry.model.id || "historia", "historia")}-atlas-embed.html`,
        project,
        model: entry.model,
        presentation,
        views: entry.view ? [entry.view] : []
      });
      showToast("Atlas Editorial exportado: Play será liberado após o primeiro quadro HD.");
    } else {
      await exportStandaloneApplication.execute({
        filename: `${slugId(presentation.title || entry.model.id || "historia", "historia")}-apresentacao.html`,
        project,
        model: entry.model,
        loops: [entry],
        activeLoopId: entry.id,
        presentation,
        presentations: projectPresentations,
        embed: {
          sidebar: mode !== "clean",
          presentationOnly: mode !== "explore"
        }
      });
      showToast(mode === "clean" ? "Apresentação limpa exportada: abre direto no modo apresentação." : "Apresentação HTML offline exportada.");
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || "Não foi possível exportar a apresentação.");
  } finally {
    elements.exportPresentationHtml.disabled = false;
    elements.exportPresentationHtml.textContent = "Exportar apresentação";
  }
}

function renderDockStory() {
  updatePresentationHistoryControls();
  if (elements.presentationTitleInput) elements.presentationTitleInput.value = activePresentation?.title || "Nova apresentação";
  if (elements.presentationStyleInput) elements.presentationStyleInput.value = resolvePresentationStyle({ presentation: activePresentation });
  setStoryEditorMode(storyEditorMode);
  if (elements.presentationSourceEditor && storyEditorMode !== "visual") {
    const source = presentationMarkdownForEditing();
    presentationSourceDraft = source;
    elements.presentationSourceEditor.value = source;
    syncCodeEditor("presentation-source-editor");
    updatePresentationSourceMeta(source);
    renderPresentationSourceStatus("Fonte sincronizada");
    renderPresentationSourceDiff(source);
  }
  renderPresentationLibrary();
  if (activePresentation?.schemaVersion === 2 || activePresentation?.chapters) {
    const selection = selectedPresentationTarget();
    if (!selectedStorySceneId && selection.scene) selectedStorySceneId = selection.scene.id;
    if (!selectedStoryBeatId && selection.beat) selectedStoryBeatId = selection.beat.id;
    renderStoryTimeline();
    renderStoryInspector();
    return;
  }
  renderStoryTimeline();
  renderStoryInspector();
}

function renderPresentationLibrary() {
  if (!elements.presentationLibrary) return;
  elements.presentationLibrary.replaceChildren();
  if (!projectPresentations.length) {
    elements.presentationLibrary.append(element("small", "dock-help", "Nenhuma apresentação salva ainda."));
    elements.duplicatePresentation.disabled = true;
    elements.deletePresentation.disabled = true;
    return;
  }
  elements.duplicatePresentation.disabled = !activePresentationRecord;
  elements.deletePresentation.disabled = !activePresentationRecord;
  projectPresentations.forEach(record => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.presentationId = record.id;
    button.classList.toggle("active", record.id === activePresentationRecord?.id);
    button.append(
      element("span", "", record.title || record.id),
      element("small", "", `v${record.revision || 1}`)
    );
    elements.presentationLibrary.append(button);
  });
}

function selectProjectPresentation(record) {
  if (!record?.presentation) return;
  const targetMapId = (record.presentation.chapters || [])
    .flatMap(chapter => chapter.scenes || [])
    .map(scene => scene.mapRef?.mapId)
    .find(Boolean);
  const targetIndex = workspace.findIndex(entry => [entry.mapId, entry.model?.id].includes(targetMapId));
  if (targetIndex >= 0 && targetIndex !== activeIndex) selectModel(targetIndex);
  activePresentationRecord = record;
  activePresentation = repairGeneratedPresentation(normalizePresentation({ ...record.presentation, title: record.presentation.title || record.title }), engine.model);
  resetPresentationHistory();
  renderDockStory();
  const result = lintPresentation(activePresentation, presentationContext());
  renderPresentationLint(result);
  showToast(`História “${record.title || record.id}” aberta.`);
}

async function duplicateActivePresentation() {
  if (!activePresentationRecord || !apiAvailable) {
    showToast("Salve uma história no projeto antes de duplicar.");
    return;
  }
  try {
    const result = await apiFetch(`/api/presentations/${encodeURIComponent(activePresentationRecord.id)}/duplicate`, {
      method: "POST",
      body: { title: `${activePresentationRecord.title} · cópia` }
    });
    projectPresentations = [result.presentation, ...projectPresentations];
    selectProjectPresentation(result.presentation);
    showToast("História duplicada.");
  } catch (error) {
    handleApiError(error);
    showToast("Não foi possível duplicar a história.");
  }
}

async function deleteActivePresentation() {
  if (!activePresentationRecord || !apiAvailable) return;
  if (!window.confirm(`Remover “${activePresentationRecord.title || activePresentationRecord.id}”?`)) return;
  try {
    await apiFetch(`/api/presentations/${encodeURIComponent(activePresentationRecord.id)}`, { method: "DELETE" });
    projectPresentations = projectPresentations.filter(item => item.id !== activePresentationRecord.id);
    activePresentationRecord = null;
    activePresentation = emptyPresentationForModel(engine.model);
    renderDockStory();
    showToast("História removida do projeto.");
  } catch (error) {
    handleApiError(error);
    showToast("Não foi possível remover a história.");
  }
}

function applyPresentationStructureEdit(next, message = "Estrutura da história alterada") {
  commitPresentationEdit(next, message);
}

function storyEditingChapterForScene(sceneId = null) {
  const current = presentationForEditing();
  const containing = current.chapters.find(chapter => chapter.scenes.some(scene => scene.id === sceneId));
  return containing || current.chapters.find(chapter => chapter.role === "mechanism") || current.chapters[0] || null;
}

async function addPresentationLoopScene() {
  const loops = availableStoryLoops();
  if (!loops.length) {
    showToast("Este mapa ainda não tem loops disponíveis.");
    return;
  }
  const defaultLoop = loops.find(loop => loop.id === activeLoopId) || loops[0];
  const options = await openCommandDialog({
    title: "Adicionar loop à história",
    description: "Cada loop entra como uma única cena; as relações do loop viram beats dentro dela.",
    submitLabel: "Adicionar loop",
    fields: [{ name: "loopId", label: "Loop", type: "select", value: defaultLoop.id,
      options: loops.map(loop => ({ value: loop.id, label: loop.label || loop.title || loop.id })) }]
  });
  if (!options) return;
  const loop = loops.find(item => item.id === options.loopId) || defaultLoop;
  const nodes = new Map((engine.model.nodes || []).map(node => [node.id, node]));
  const edges = new Map((engine.model.edges || []).map(edge => [edge.id, edge]));
  const sceneId = `scene-loop-${slugId(loop.id || "loop", "loop")}-${Date.now()}`;
  const beats = (loop.edgeIds || []).map((edgeId, index) => {
    const edge = edges.get(edgeId);
    const source = nodes.get(edge?.source)?.label || edge?.source || "Origem";
    const target = nodes.get(edge?.target)?.label || edge?.target || "Destino";
    return applyMovementToBeat({ id: `${sceneId}-beat-${index + 1}`, title: `${source} → ${target}`,
      narrationMd: edge?.description || `${source} influencia ${target}.`, causalFrame: { loopId: loop.id },
      timing: { durationMs: 5000, advance: "manual" } },
      { edgeId, sourceNodeId: edge?.source, targetNodeId: edge?.target, sourceLabel: source, targetLabel: target, label: `${source} → ${target}` });
  });
  const scene = { id: sceneId, type: "stage", title: loop.label || loop.title || loop.id,
    content: { title: loop.label || loop.title || loop.id, bodyMd: loop.description || "" },
    mapRef: engine.model.id ? { mapId: engine.model.id } : undefined,
    causalFrame: { primaryLoopId: loop.id }, stage: { camera: { mode: "fit-focus", padding: 180 } }, beats };
  const current = presentationForEditing();
  const chapter = storyEditingChapterForScene(selectedStorySceneId) || current.chapters[0];
  const chapters = current.chapters.map(item => item.id === chapter.id ? { ...item, scenes: [...item.scenes, scene] } : item);
  selectedStorySceneId = sceneId; selectedStoryBeatId = beats[0]?.id || null;
  applyPresentationStructureEdit({ ...current, chapters }, "Loop adicionado à timeline");
  showToast(`Loop adicionado como uma cena com ${beats.length} beats.`);
}

function availableStoryLoops() {
  const curated = engine.getLoops().filter(loop => loop?.id && loop.edgeIds?.length);
  return curated.length
    ? curated
    : engine.getLoops({ discover: true, maxLength: 8, maxLoops: 24 }).filter(loop => loop?.id && loop.edgeIds?.length);
}

function storyMapFocusOptions({ includeNone = true } = {}) {
  const nodes = engine.model?.nodes || [];
  const edges = engine.model?.edges || [];
  const loops = availableStoryLoops();
  const options = includeNone ? [{ value: "none", label: "Mapa inteiro · sem foco inicial" }] : [];
  nodes.forEach(node => options.push({ value: `node:${node.id}`, label: `Variável · ${node.label || node.id}` }));
  edges.forEach(edge => {
    const source = nodes.find(node => node.id === edge.source)?.label || edge.source;
    const target = nodes.find(node => node.id === edge.target)?.label || edge.target;
    options.push({ value: `edge:${edge.id}`, label: `Relação · ${source} → ${target}` });
  });
  loops.forEach(loop => options.push({ value: `loop:${loop.id}`, label: `Loop · ${loop.label || loop.title || loop.id}` }));
  return options;
}

function storyFocusFromMapChoice(choice = "none") {
  const [kind, id] = String(choice).split(":");
  if (!id || !["node", "edge", "loop"].includes(kind)) return null;
  return kind === "node" ? { kind, nodeId: id }
    : kind === "edge" ? { kind, edgeId: id }
      : { kind, loopId: id };
}

function storyMapChoiceForFocus(focus = null) {
  if (!focus) return "none";
  if (focus.kind === "node" && focus.nodeId) return `node:${focus.nodeId}`;
  if (focus.kind === "edge" && focus.edgeId) return `edge:${focus.edgeId}`;
  if (focus.kind === "loop" && focus.loopId) return `loop:${focus.loopId}`;
  if (focus.kind === "set" && focus.nodeIds?.length === 1 && !focus.edgeIds?.length) return `node:${focus.nodeIds[0]}`;
  if (focus.kind === "set" && focus.edgeIds?.length === 1 && !focus.nodeIds?.length) return `edge:${focus.edgeIds[0]}`;
  return "none";
}

async function addTimelineScene() {
  const current = presentationForEditing();
  const chapter = storyEditingChapterForScene(selectedStorySceneId) || { id: "chapter-1", title: "Apresentação", role: "custom", scenes: [] };
  const selectedFocus = focusForCurrentSelection();
  const selectedScene = current.chapters.flatMap(item => item.scenes || []).find(item => item.id === selectedStorySceneId);
  const loops = availableStoryLoops();
  const selectedLoop = selectedScene?.causalFrame?.primaryLoopId || activeLoopId || loops[0]?.id || "";
  const options = await openCommandDialog({
    title: "Nova cena",
    description: "Uma cena conta uma parte do mapa. Escolha o loop e, opcionalmente, o elemento que abre a cena; o primeiro beat será criado junto para manter história e mapa conectados.",
    submitLabel: "Criar cena",
    fields: [
      { name: "title", label: "Nome da cena", value: "Nova cena", required: true, placeholder: "Ex.: Loop de confiança" },
      { name: "loopId", label: "Loop contado nesta cena (opcional)", type: "select", value: selectedLoop, options: [
        { value: "", label: "Nenhum loop específico" },
        ...loops.map(loop => ({ value: loop.id, label: `Loop · ${loop.label || loop.title || loop.id}` }))
      ] },
      { name: "entryFocus", label: "Como a cena começa no mapa", type: "select", value: storyMapChoiceForFocus(selectedFocus), options: storyMapFocusOptions() },
      { name: "narration", label: "Texto de abertura", type: "textarea", value: "", placeholder: "O que o público deve entender antes do primeiro movimento?" }
    ]
  });
  if (!options) return;
  const sceneId = `scene-manual-${Date.now()}`;
  const entryFocus = storyFocusFromMapChoice(options.entryFocus);
  const entryTitle = entryFocus ? storyInspectorFocusLabel(entryFocus) : "Entrada da cena";
  const entryBeat = entryFocus ? {
    id: `${sceneId}-entry`,
    type: entryFocus.kind === "edge" ? "traverse" : "focus",
    title: `Entrada · ${entryTitle}`,
    narrationMd: options.narration || `Começamos em ${entryTitle}.`,
    focus: entryFocus,
    timing: { durationMs: 5000, advance: "manual" },
    ...(entryFocus.kind === "edge" ? { delta: { camera: { mode: "follow-path" } } } : {})
  } : null;
  const scene = {
    id: sceneId,
    type: "stage",
    title: options.title || "Nova cena",
    content: { title: options.title || "Nova cena", bodyMd: options.narration || "" },
    mapRef: engine.model?.id ? { mapId: engine.model.id } : undefined,
    ...(options.loopId ? { causalFrame: { primaryLoopId: options.loopId } } : {}),
    stage: { camera: { mode: entryFocus ? "fit-focus" : "fit-map" } },
    beats: entryBeat ? [entryBeat] : []
  };
  const chapters = current.chapters.length
    ? current.chapters.map(item => item.id === chapter.id ? { ...item, scenes: [...item.scenes, scene] } : item)
    : [{ ...chapter, scenes: [scene] }];
  selectedStorySceneId = sceneId;
  selectedStoryBeatId = entryBeat?.id || null;
  collapsedPresentationScenes.delete(sceneId);
  applyPresentationStructureEdit({ ...current, chapters }, "Cena criada na timeline");
  showToast(entryBeat ? "Cena criada com uma entrada ligada ao mapa." : "Cena criada. Adicione o primeiro beat para conectá-la ao mapa.");
}

async function addTimelineBeat(sceneId = selectedStorySceneId) {
  const current = presentationForEditing();
  const scene = current.chapters.flatMap(chapter => chapter.scenes || []).find(item => item.id === sceneId);
  if (!scene) {
    showToast("Crie ou selecione uma cena antes de adicionar um beat.");
    return;
  }
  const nodes = [...(engine.model?.nodes || [])].sort((left, right) => (left.label || left.id).localeCompare(right.label || right.id));
  const { loopId, loopEdgeIds } = loopEdgesForScene(scene);
  const loops = availableStoryLoops();
  const previousMovement = [...(scene.beats || [])].reverse().map(beat => movementFromBeat(beat, engine.model)).find(Boolean);
  const selectedFocus = focusForCurrentSelection();
  const selectedEdge = selectedFocus?.kind === "edge"
    ? selectedFocus
    : selectedFocus?.kind === "set" && selectedFocus.edgeIds?.length === 1 && !selectedFocus.nodeIds?.length
      ? { kind: "edge", edgeId: selectedFocus.edgeIds[0] }
      : null;
  const selectedNodeId = selectedFocus?.kind === "node"
    ? selectedFocus.nodeId
    : selectedFocus?.kind === "set" && selectedFocus.nodeIds?.length === 1 && !selectedFocus.edgeIds?.length
      ? selectedFocus.nodeIds[0]
      : "";
  const selectedMovement = selectedEdge
    ? movementFromBeat({ focus: selectedEdge }, engine.model)
    : selectedNodeId
      ? causalMovementOptions(engine.model, { sourceNodeId: selectedNodeId, loopId, loopEdgeIds })[0]
      : null;
  const suggestions = previousMovement
    ? suggestNextCausalMovements(engine.model, { lastEdgeId: previousMovement.edgeId, loopId, loopEdgeIds })
    : selectedMovement ? [selectedMovement] : [];
  const defaultMovement = suggestions[0] || previousMovement || selectedMovement || null;
  const selectedLoopId = selectedFocus?.kind === "loop" ? selectedFocus.loopId : loopId;
  const selectedPath = selectedFocus?.kind === "path" ? selectedFocus.edgeIds : [];
  const kind = selectedFocus?.kind === "path" ? "path" : selectedFocus?.kind === "loop" ? "loop" : "relation";
  const draft = await openMovementComposerDialog({
    sceneTitle: scene.title,
    model: engine.model,
    loops,
    initial: {
      kind,
      sourceNodeId: defaultMovement?.sourceNodeId || nodes[0]?.id || "",
      targetNodeId: defaultMovement?.targetNodeId || "",
      loopId: selectedLoopId,
      loopEdgeIds,
      edgeIds: selectedPath,
      // The composer derives a fresh editorial title from the selected form;
      // do not freeze a legacy beat label while the author changes type.
      title: "",
      role: kind === "relation" || kind === "path" ? "traverse" : "focus"
    }
  });
  if (!draft) return;
  const beatId = `beat-manual-${Date.now()}`;
  const result = createMovementBeat({ draft, model: engine.model, loops, id: beatId });
  if (result.errors.length || !result.beat) {
    showToast(result.errors[0] || "Não foi possível criar este movimento.");
    return;
  }
  const beat = result.beat;
  const next = {
    ...current,
    chapters: current.chapters.map(chapter => ({
      ...chapter,
      scenes: chapter.scenes.map(item => item.id === sceneId ? { ...item, beats: [...(item.beats || []), beat] } : item)
    }))
  };
  selectedStorySceneId = sceneId;
  selectedStoryBeatId = beatId;
  collapsedPresentationScenes.delete(sceneId);
  applyPresentationStructureEdit(next, "Movimento criado na timeline");
  showToast(`Movimento criado: ${draft.title || "Novo movimento"}.`);
}

function movePresentationBeatToSceneInStudio(fromSceneId, beatId, toSceneId, targetIndex) {
  const changed = storyStudioCommands.moveBeatToScene(fromSceneId, beatId, toSceneId, targetIndex);
  if (changed) showToast("Beat movido para a nova cena.");
  return changed;
}

function movePresentationChapterInStudio(chapterId, delta) {
  return storyStudioCommands.moveChapter(chapterId, delta);
}

function movePresentationSceneInStudio(sceneId, fromChapterId, toChapterId, targetIndex) {
  return storyStudioCommands.moveScene(sceneId, fromChapterId, toChapterId, targetIndex);
}

function movePresentationBeatInStudio(sceneId, beatId, targetIndex) {
  return storyStudioCommands.moveBeat(sceneId, beatId, targetIndex);
}

async function addPresentationChapter() {
  const options = await openCommandDialog({
    title: "Adicionar capítulo",
    description: "Crie uma nova seção narrativa sem alterar o mapa causal. Você poderá reorganizar cenas e beats depois.",
    submitLabel: "Criar capítulo",
    fields: [
      { name: "title", label: "Nome do capítulo", value: "Novo capítulo" },
      { name: "role", label: "Função narrativa", type: "select", value: "custom", options: [
        { value: "setup", label: "Orientação" },
        { value: "mechanism", label: "Mecanismo" },
        { value: "tension", label: "Tensão" },
        { value: "intervention", label: "Intervenção" },
        { value: "consequence", label: "Consequência" },
        { value: "synthesis", label: "Síntese" },
        { value: "custom", label: "Personalizado" }
      ] },
      { name: "summary", label: "Resumo curto", type: "textarea", value: "" }
    ]
  });
  if (!options) return;
  const current = presentationForEditing();
  const next = createPresentationChapter(current, {
    title: options.title,
    role: options.role,
    summary: options.summary
  });
  const created = next.chapters.at(-1);
  selectedStorySceneId = null;
  selectedStoryBeatId = null;
  applyPresentationStructureEdit(next, "Capítulo criado");
  showToast(`Capítulo “${created.title}” criado.`);
}

function duplicatePresentationChapterInStudio(chapterId) {
  const next = duplicateChapterOperation(presentationForEditing(), chapterId);
  if (next === activePresentation) return;
  const source = presentationForEditing().chapters.find(chapter => chapter.id === chapterId);
  const clone = next.chapters[next.chapters.findIndex(chapter => chapter.id === chapterId) + 1];
  selectedStorySceneId = clone?.scenes?.[0]?.id || null;
  selectedStoryBeatId = null;
  applyPresentationStructureEdit(next, "Capítulo duplicado");
  showToast(`Capítulo “${source?.title || ""}” duplicado.`);
}

function removePresentationChapterInStudio(chapterId) {
  const current = presentationForEditing();
  const source = current.chapters.find(chapter => chapter.id === chapterId);
  if (!source || current.chapters.length <= 1) return;
  if (!window.confirm(`Remover o capítulo “${source.title}” e suas ${source.scenes.length} cenas?`)) return;
  const next = removePresentationChapter(current, chapterId);
  selectedStorySceneId = next.chapters.find(chapter => chapter.scenes.length)?.scenes?.[0]?.id || null;
  selectedStoryBeatId = null;
  applyPresentationStructureEdit(next, "Capítulo removido");
  showToast("Capítulo removido da história.");
}

function duplicatePresentationScene(chapterId, sceneId) {
  const current = presentationForEditing();
  const next = duplicateSceneOperation(current, chapterId, sceneId);
  if (next === activePresentation) return;
  const source = current.chapters.find(chapter => chapter.id === chapterId)?.scenes.find(scene => scene.id === sceneId);
  const chapter = next.chapters.find(item => item.id === chapterId);
  const clone = chapter?.scenes[chapter.scenes.findIndex(scene => scene.id === sceneId) + 1];
  selectedStorySceneId = clone?.id || null;
  selectedStoryBeatId = null;
  if (clone?.id) collapsedPresentationScenes.delete(clone.id);
  applyPresentationStructureEdit(next, "Cena duplicada");
  showToast(`Cena “${source?.title || ""}” duplicada.`);
}

function focusPresentationBeat(sceneId, beatId) {
  syncStoryStudioSelection(sceneId, beatId);
  const compiled = compilePresentation(presentationForEditing(), presentationContext());
  const frame = compiled.timeline.find(item => item.sceneId === sceneId && item.beatId === beatId);
  renderStoryInspector();
  if (!frame) return;
  markStoryFocus(frame);
  applyStoryReveal(frame);
  focusStoryCamera(frame);
  // Keep the timeline selection in lockstep with the inspector and canvas.
  // Without this refresh, clicking a card updated the map but left the old
  // card highlighted until another timeline control was used.
  renderStoryTimeline();
  showToast("Canvas focado no beat selecionado.");
}

function startPresentationFromBeat(sceneId, beatId) {
  const compiled = compilePresentation(presentationForEditing(), presentationContext());
  const index = compiled.timeline.findIndex(frame => frame.sceneId === sceneId && frame.beatId === beatId);
  if (index < 0) {
    showToast("Este beat ainda não pode ser reproduzido.");
    return;
  }
  startPresentation(null, index);
}

function focusPresentationScene(sceneId, beatId = null) {
  selectedStorySceneId = sceneId;
  selectedStoryBeatId = beatId;
  if (beatId) {
    focusPresentationBeat(sceneId, beatId);
    return;
  }
  const scene = presentationForEditing().chapters.flatMap(chapter => chapter.scenes).find(item => item.id === sceneId);
  if (!scene) return;
  const focus = scene.beats.find(beat => beat.focus)?.focus;
  if (focus) focusPresentationBeat(scene.id, scene.beats.find(beat => beat.focus).id);
}

function updatePresentationChapter(id, changes) {
  const current = presentationForEditing();
  commitPresentationEdit({
    ...current,
    chapters: current.chapters.map(chapter => chapter.id === id ? { ...chapter, ...changes } : chapter)
  }, "Capítulo alterado");
}

function updatePresentationScene(id, changes) {
  const current = presentationForEditing();
  commitPresentationEdit({
    ...current,
    chapters: current.chapters.map(chapter => ({
      ...chapter,
      scenes: chapter.scenes.map(scene => scene.id === id ? { ...scene, ...changes } : scene)
    }))
  }, "Cena alterada");
}

function updatePresentationBeat(sceneId, beatId, changes) {
  const current = presentationForEditing();
  commitPresentationEdit({
    ...current,
    chapters: current.chapters.map(chapter => ({
      ...chapter,
      scenes: chapter.scenes.map(scene => scene.id !== sceneId ? scene : {
        ...scene,
        beats: scene.beats.map(beat => beat.id === beatId ? { ...beat, ...changes } : beat)
      })
    }))
  }, "Beat alterado");
}

function removePresentationScene(chapterId, sceneId) {
  const current = presentationForEditing();
  commitPresentationEdit({
    ...current,
    chapters: current.chapters.map(chapter => chapter.id !== chapterId ? chapter : {
      ...chapter,
      scenes: chapter.scenes.filter(scene => scene.id !== sceneId)
    })
  }, "Cena removida");
}

async function generateDirectorPresentation() {
  const loops = availableStoryLoops();
  if (!loops.length) {
    showToast("Crie ou descubra ao menos um loop antes de gerar a história.");
    return;
  }
  const hasExistingStory = activePresentation?.chapters?.some(chapter => (chapter.scenes || []).length);
  if (hasExistingStory && !window.confirm("Isto substituirá apenas o rascunho atual em memória. A versão salva continuará disponível no histórico. Continuar?")) return;
  activePresentationRecord = null;
  activePresentation = suggestPresentation(engine.model, {
    loopIds: loops.map(loop => loop.id),
    primaryLoopId: activeLoopId || loops[0].id,
    intent: "explain",
    audience: { type: "general", knowledge: "introductory", expectedOutcome: "" },
    beatDurationMs: 4200,
    includeHandoffScenes: false,
    title: `${engine.model.title || "Mapa"} · história dos loops`
  });
  resetPresentationHistory();
  renderDockStory();
  openDockPanel("story");
  const result = lintPresentation(activePresentation, presentationContext());
  renderPresentationLint(result);
  setStoryEditorMode("split");
  setSaveStatus("saving", "Rascunho criado");
  const loopSceneCount = activePresentation.chapters.flatMap(chapter => chapter.scenes).filter(scene => scene.causalFrame?.primaryLoopId).length;
  showToast(`Rascunho criado com ${loopSceneCount} cenas de loop. Revise os movimentos e a narração antes de salvar.`);
}

function validateActivePresentation() {
  const result = lintPresentation(activePresentation || emptyPresentationForModel(engine.model), presentationContext());
  renderPresentationLint(result);
  showToast(result.valid ? "Story Lint passou sem erros bloqueadores." : "Story Lint encontrou erros que precisam de correção.");
  return result;
}

function applyActivePresentationFixes() {
  const current = activePresentation || emptyPresentationForModel(engine.model);
  const lint = lintPresentation(current, presentationContext());
  if (!lint.safeFixes.length) {
    showToast("Não há correções automáticas seguras disponíveis.");
    return;
  }
  commitPresentationEdit(
    applyLintFixes(current, lint.safeFixes),
    `${lint.safeFixes.length} correção(ões) aplicada(s)`
  );
}

function renderPresentationLint(result) {
  if (!elements.storyLintStatus) return;
  const errors = result.errors.length;
  const warnings = result.warnings.length;
  elements.storyLintStatus.textContent = errors
    ? `${errors} erro(s) bloqueador(es) · ${warnings} aviso(s) · score ${result.scores?.overall ?? "—"}`
    : warnings ? `Pronto para revisar · ${warnings} aviso(s) · score ${result.scores?.overall ?? "—"}` : `Story Lint: pronto para apresentar · score ${result.scores?.overall ?? "—"}`;
  elements.storyLintStatus.classList.toggle("error", errors > 0);
  if (elements.applyPresentationFixes) {
    elements.applyPresentationFixes.disabled = !result.safeFixes?.length;
    elements.applyPresentationFixes.textContent = result.safeFixes?.length
      ? `Aplicar ${result.safeFixes.length} correção(ões) seguras`
      : "Aplicar correções seguras";
  }
}

async function saveActivePresentation() {
  let basePresentation = activePresentation || emptyPresentationForModel(engine.model);
  const sourceValue = elements.presentationSourceEditor?.value || presentationSourceDraft;
  const canonicalSource = serializePresentationMarkdown(basePresentation, { mode: "editorial" });
  if (storyEditorMode !== "visual" && sourceValue && sourceValue !== canonicalSource) {
    const sourceResult = validatePresentationSource(true);
    if (!sourceResult.valid) {
      showToast("Corrija o Markdown ou aplique uma versão válida antes de salvar.");
      return;
    }
    basePresentation = sourceResult.presentation;
    activePresentation = normalizePresentation({ ...sourceResult.presentation, source_md: sourceValue });
  }
  const presentation = {
    ...basePresentation,
    source_md: sourceValue && storyEditorMode !== "visual" ? sourceValue : serializePresentationMarkdown(basePresentation, { mode: "editorial" })
  };
  const lint = lintPresentation(presentation, presentationContext());
  renderPresentationLint(lint);
  if (!lint.valid) {
    showToast("Corrija os erros bloqueadores antes de salvar a história.");
    return;
  }
  if (!apiAvailable) {
    activePresentation = presentation;
    presentationSourceDraft = presentation.source_md;
    showToast("História mantida nesta sessão (servidor offline).");
    return;
  }
  try {
    const result = await savePresentation.execute({
      id: activePresentationRecord?.id,
      expectedRevision: activePresentationRecord?.revision,
      presentation
    });
    if (!result?.presentation) throw new Error("SavePresentation returned no persisted presentation.");
    activePresentationRecord = result.presentation;
    activePresentation = result.presentation.presentation;
    appCommands.setStoryDirty(false);
    projectPresentations = [
      ...projectPresentations.filter(item => item.id !== result.presentation.id),
      result.presentation
    ];
    setSaveStatus("saved", "História salva");
    renderDockStory();
    showToast("História salva no projeto SQLite.");
  } catch (error) {
    handleApiError(error);
    if (error.status === 409 && error.current) {
      activePresentationRecord = error.current;
      activePresentation = error.current.presentation;
      renderDockStory();
    }
    showToast(error.status === 409 ? "Conflito de revisão: a versão mais nova foi carregada." : "Não foi possível salvar a história.");
  }
}

function setDockStatus(target, message, error = false) {
  target.textContent = message;
  target.classList.toggle("error", error);
}

function schedulePersistActiveLoop(index = activeIndex, { delay = 350 } = {}) {
  const entry = workspace[index];
  if (!entry) return;
  const key = entry.id || String(index);
  window.clearTimeout(saveTimers.get(key));
  setSaveStatus("saving", "Salvando...");
  const timer = window.setTimeout(() => {
    saveTimers.delete(key);
    persistActiveLoop(index);
  }, delay);
  saveTimers.set(key, timer);
}

async function persistActiveLoop(index = activeIndex) {
  const entry = workspace[index];
  if (!entry) return null;
  if (!apiAvailable || !entry.persisted) {
    setSaveStatus("saved", "Salvo localmente");
    return null;
  }
  // SQLite accepts last-write-wins updates. Serialize writes per loop so a
  // delayed autosave can never arrive after a newer explicit save.
  const revision = (entry.saveRevision || 0) + 1;
  entry.saveRevision = revision;
  const snapshot = snapshotEntry(entry);
  const saveTask = entry.kind === "map"
    ? saveMap.execute({ map: snapshot })
    : workspacePersistence.saveLoop({ entry });
  const task = saveTask.then(data => {
      const current = workspace[index];
      // Ignore stale responses in the UI; a queued, newer snapshot is the one
      // that represents the editor state the user can still see.
      if (current?.id === snapshot.id && current.saveRevision === revision) {
        const previousEntry = current || entry;
        const persistedEntry = entry.kind === "map"
          ? preserveSelectedMapView(mapRecordToEntry({ ...data.map, views: previousEntry.views }), previousEntry)
          : preserveEntryMapContext(loopRecordToEntry(data.loop), previousEntry);
        workspace[index] = { ...persistedEntry, saveRevision: revision };
    }
    if (index === activeIndex && workspace[index]?.id === snapshot.id) {
      renderWorkspaceTabs();
      updateSavedLayoutControls();
    }
    lastSaveError = null;
    setSaveStatus("saved", "Salvo");
    return data.map || data.loop;
  }).catch(error => {
    handleApiError(error);
    lastSaveError = error;
    setSaveStatus("error", apiAvailable ? "Erro ao salvar" : "Servidor offline");
    showToast(apiAvailable ? "Não foi possível salvar no SQLite." : "Servidor local offline. Alterações ficaram só nesta sessão.");
    return null;
  });
  return task;
}

function preserveSelectedMapView(persistedEntry, previousEntry) {
  const selected = (previousEntry?.views || []).find(view => view.id === previousEntry.viewId);
  if (!selected) return persistedEntry;
  return {
    ...persistedEntry,
    viewId: selected.id,
    view: selected
  };
}

function preserveEntryMapContext(persistedEntry, previousEntry) {
  if (!previousEntry?.views?.length) return persistedEntry;
  const selected = previousEntry.views.find(view => view.id === previousEntry.viewId) || previousEntry.view;
  return {
    ...persistedEntry,
    mapId: previousEntry.mapId || persistedEntry.mapId || null,
    viewId: selected?.id || null,
    view: selected || null,
    views: previousEntry.views
  };
}

function snapshotEntry(entry) {
  return {
    id: entry.id,
    label: entry.label,
    summary: entry.summary,
    description_md: entry.description_md,
    model: cloneModel(entry.model)
  };
}

function syncModelMetadata() {
  curatedLoops = engine.getLoops();
}

function refreshPanels() {
  updateScenarioPanel(engine.model);
  renderLoopBrowser();
  if (selectedEdgeId) {
    const edge = engine.model.edges.find(item => item.id === selectedEdgeId);
    if (edge) {
      const source = engine.model.nodes.find(node => node.id === edge.source);
      const target = engine.model.nodes.find(node => node.id === edge.target);
      renderRelation({ edge, source, target });
    } else renderRelationPlaceholder();
  } else if (selectedNodeId) {
    renderNodeDetails(selectedNodeId);
  } else renderRelationPlaceholder();
  updateEditToolbar();
}

function bindCanvasEditing() {
  if (!engine.cy || boundCy === engine.cy) return;
  boundCy = engine.cy;
  const dragStarts = new Map();
  engine.cy.on("render", () => {
    positionRouteHandle();
    positionConnectionHandle();
    positionPopover();
    // Cytoscape has already applied the current pan/zoom when it emits this
    // event. Keep the relation tooltip in the same render cycle so it does
    // not trail the camera by an extra RAF.
    if (isContextualPresentationActive()) positionPresentationTooltip(currentPresentationFrame);
    else schedulePresentationTooltipPosition();
  });
  engine.cy.on("grab", "node", event => {
    dragStarts.set(event.target.id(), { ...event.target.position() });
    elements.stage.classList.add("node-dragging");
  });
  engine.cy.on("free", "node", event => {
    const start = dragStarts.get(event.target.id());
    dragStarts.delete(event.target.id());
    elements.stage.classList.remove("node-dragging");
    const end = event.target.position();
    // Cytoscape emits grab/free for a simple node tap as well. Treat the
    // gesture as a move only when its position actually changed, otherwise a
    // selection or connection confirmation is immediately overwritten by a
    // misleading "Posição atualizada" toast.
    if (!start || Math.hypot(end.x - start.x, end.y - start.y) > 0.5) {
      showToast("Posição atualizada.");
    }
  });
  engine.cy.on("dbltap", event => {
    if (!editing || event.target !== engine.cy) return;
    const node = engine.addNode({
      label: nextNodeLabel()
    }, {
      position: event.position
    });
    selectedNodeId = node.id;
    selectedEdgeId = null;
    pendingConnectionSourceId = null;
    bindCanvasEditing();
    updateEditToolbar();
    showNodePopover(node.id, { focusInput: true });
    showToast("Nó criado no diagrama.");
  });
  engine.cy.on("dbltap", "node", event => {
    if (!editing) return;
    const node = event.target;
    selectedNodeId = node.id();
    selectedEdgeId = null;
    pendingConnectionSourceId = null;
    engine.cy.elements().unselect();
    node.select();
    updateEditToolbar();
    showNodePopover(node.id(), { focusInput: true });
  });
}

function handleStageClick(event) {
  if (!editing || !engine.cy || event.detail > 1) return;
  if (!event.target.closest("#cld-root")) return;
  // Cytoscape already emits the semantic node, edge and background intents
  // consumed by `engineBridge`. Inferring a nearest node from the bubbling DOM
  // click races that event and can clear a legitimate edge selection whenever
  // its rendered midpoint is close to a node. Keep this bridge hook only as
  // the DOM boundary; interaction ownership remains with the canvas engine.
}

function handleStageDoubleClick(event) {
  if (!editing || focusMode || !engine.cy) return;
  if (!event.target.closest("#cld-root")) return;
  const rendered = renderedPointFromEvent(event);
  const existingNode = nearestRenderedNode(rendered);
  if (existingNode) {
    selectedNodeId = existingNode.id();
    selectedEdgeId = null;
    pendingConnectionSourceId = null;
    engine.cy.elements().unselect();
    existingNode.select();
    updateEditToolbar();
    showNodePopover(existingNode.id(), { focusInput: true });
    return;
  }
  const pan = engine.cy.pan();
  const zoom = engine.cy.zoom();
  const node = engine.addNode({
    label: nextNodeLabel()
  }, {
    position: {
      x: (rendered.x - pan.x) / zoom,
      y: (rendered.y - pan.y) / zoom
    }
  });
  selectedNodeId = node.id;
  selectedEdgeId = null;
  pendingConnectionSourceId = null;
  bindCanvasEditing();
  updateEditToolbar();
  showNodePopover(node.id, { focusInput: true });
  showToast("Nó criado no diagrama.");
}

function renderedPointFromEvent(event) {
  const rect = document.querySelector("#cld-root").getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function isNearRenderedNode(point) {
  return Boolean(nearestRenderedNode(point));
}

function nearestRenderedNode(point) {
  let best = null;
  let bestDistance = Infinity;
  engine.cy.nodes().forEach(node => {
    const position = node.renderedPosition();
    const distance = Math.hypot(position.x - point.x, position.y - point.y);
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  });
  return bestDistance < 58 ? best : null;
}

function nextNodeLabel() {
  return `Nova variável ${engine.model.nodes.length + 1}`;
}

function addNodeAtViewportCenter() {
  if (!editing || !engine.cy) return;
  const pan = engine.cy.pan();
  const zoom = engine.cy.zoom();
  const node = engine.addNode({
    label: nextNodeLabel()
  }, {
    position: {
      x: (elements.stage.clientWidth / 2 - pan.x) / zoom,
      y: (elements.stage.clientHeight / 2 - pan.y) / zoom
    }
  });
  selectedNodeId = node.id;
  selectedEdgeId = null;
  pendingConnectionSourceId = null;
  bindCanvasEditing();
  updateEditToolbar();
  showNodePopover(node.id, { focusInput: true });
  showToast("Variável adicionada.");
}

async function createNewDiagram() {
  syncWorkspaceFromEngine();
  const values = await openCommandDialog({
    title: "Novo mapa",
    description: "Crie um mapa vazio e comece pelo canvas, tabela ou código.",
    submitLabel: "Criar mapa",
    fields: [{ name: "title", label: "Nome", value: "Novo mapa", required: true }]
  });
  if (!values) return;
  const title = values.title;
  const existingIds = new Set(workspace.map(entry => entry.model.id));
  let id = slugId(title, "diagrama");
  let suffix = 2;
  while (existingIds.has(id)) id = `${slugId(title, "diagrama")}-${suffix++}`;
  const model = createEmptyModel({ id, title });
  const entry = {
    id: `draft:${id}`,
    kind: "draft",
    label: title,
    summary: "",
    description_md: `## ${title}\n\nDescreva aqui a história e o recorte deste loop.`,
    model
  };
  const created = await createLoopEntry(entry);
  workspace.push(created);
  renderWorkspaceTabs();
  selectModel(workspace.length - 1);
  setEditing(true);
  showToast("Mapa vazio criado. Dê duplo clique no canvas para adicionar variáveis.");
}

async function createLoopEntry(entry) {
  if (!apiAvailable) return entry;
  try {
    return await workspacePersistence.createLoop(entry);
  } catch (error) {
    handleApiError(error);
    showToast(apiAvailable
      ? "Não foi possível salvar no SQLite; usando loop local."
      : "Servidor local offline; usando loop local.");
    return entry;
  }
}

async function importJsonFile(event) {
  const [file] = event.target.files || [];
  event.target.value = "";
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const result = validateModel(parsed);
    if (!result.valid) {
      showToast(`JSON inválido: ${result.errors[0]}`);
      return;
    }
    const model = normalizeModel(parsed);
    syncWorkspaceFromEngine();
    const entry = {
      id: `import:${model.id}:${Date.now()}`,
      kind: "import",
      label: model.title || model.id,
      summary: model.description || "",
      description_md: model.description || "",
      model
    };
    workspace.push(await createLoopEntry(entry));
    renderWorkspaceTabs();
    selectModel(workspace.length - 1);
    showToast("Diagrama importado.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível importar o JSON.");
  }
}

async function createNewProjectDb() {
  const values = await openCommandDialog({
    title: "Novo projeto",
    description: "Um novo arquivo SQLite será criado localmente.",
    submitLabel: "Criar projeto",
    fields: [
      { name: "title", label: "Nome", value: "Novo projeto", required: true },
      { name: "description", label: "Descrição", type: "textarea", value: "" }
    ]
  });
  if (!values) return;
  const title = values.title;
  try {
    const data = await apiFetch("/api/project/new", {
      method: "POST",
      body: {
        title,
        description_md: values.description || `# ${title}\n\nDescreva o objetivo deste projeto.`
      }
    });
    await activateProjectData(data);
    await loadLocalProjects();
    showToast("Projeto criado com um mapa vazio.");
  } catch (error) {
    handleApiError(error);
    showToast(apiAvailable ? "Não foi possível criar o projeto." : "Servidor local offline. Rode npm run serve.");
  }
}

async function openProjectDb() {
  const values = await openCommandDialog({
    title: "Abrir projeto SQLite",
    description: "Informe o caminho local do arquivo .db.",
    submitLabel: "Abrir projeto",
    fields: [{ name: "path", label: "Caminho", value: "data/trama.db", required: true }]
  });
  if (!values) return;
  const path = values.path;
  try {
    const data = await apiFetch("/api/project/open", {
      method: "POST",
      body: { path }
    });
    await activateProjectData(data);
    await loadLocalProjects();
    showToast("Projeto SQLite aberto.");
  } catch (error) {
    handleApiError(error);
    showToast(error.message.includes("does not exist")
      ? "Esse arquivo .db ainda não existe."
      : apiAvailable ? "Não foi possível abrir o projeto SQLite." : "Servidor local offline. Rode npm run serve.");
  }
}

async function activateProjectData(data) {
  project = data.project || project;
  projectPresentations = data.presentations || [];
  projectAssets = (await apiFetch("/api/assets").catch(() => ({ assets: [] }))).assets || [];
  engine.setAssetResolver(assetId => apiAvailable && assetId
    ? `/api/assets/${encodeURIComponent(assetId)}`
    : "");
  const mapsByLoop = new Map((data.maps || []).filter(map => map.source_loop_id)
    .map(map => [map.source_loop_id, map]));
  workspace = (data.loops || []).map(loop => loopRecordToEntry(loop, mapsByLoop.get(loop.id)));
  apiAvailable = true;
  rememberRecentProject(project);
  renderRecentProjects();
  if (!workspace.length) {
    const created = await createLoopEntry({
      id: "draft:novo-loop",
      kind: "draft",
      label: "Novo mapa",
      summary: "",
      description_md: "## Novo mapa\n\nDescreva aqui a leitura central deste mapa.",
      model: createEmptyModel({ id: "novo-mapa", title: "Novo mapa" })
    });
    workspace = [created];
  }
  activeIndex = 0;
  renderWorkspaceTabs();
  selectModel(0, { preserveCurrent: false });
}

async function exportProjectBackup() {
  try {
    await persistActiveLoop();
    const bundle = await apiFetch("/api/project/backup");
    downloadText(`${slugId(project?.title || "projeto", "projeto")}.trama.json`,
      JSON.stringify(bundle, null, 2), "application/json");
    showToast("Backup completo do projeto gerado.");
  } catch (error) {
    handleApiError(error);
    showToast("Não foi possível gerar o backup completo.");
  }
}

async function importProjectBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const bundle = JSON.parse(await file.text());
    const data = await apiFetch("/api/project/import", { method: "POST", body: { bundle } });
    await activateProjectData(data);
    await loadLocalProjects();
    showToast("Backup importado em um novo projeto SQLite.");
  } catch (error) {
    handleApiError(error);
    showToast("O arquivo não é um backup Trama válido.");
  }
}

async function editProjectMetadata({ restoreFocusTo } = {}) {
  const values = await openCommandDialog({
    title: "Editar projeto",
    submitLabel: "Salvar projeto",
    restoreFocusTo: () => {
      const menu = document.querySelector("#project-switcher");
      const summary = menu?.querySelector("summary");
      if (menu && summary) menu.open = false;
      return summary || restoreFocusTo;
    },
    fields: [
      { name: "title", label: "Nome", value: project?.title || "Projeto local", required: true },
      { name: "description", label: "Descrição em Markdown", type: "textarea", value: project?.description_md || "" }
    ]
  });
  if (!values) return;
  const { title, description } = values;
  try {
    const data = await apiFetch("/api/project", {
      method: "PUT",
      body: { title, description_md: description }
    });
    project = data.project || project;
    rememberRecentProject(project);
    await loadLocalProjects();
    renderRecentProjects();
    updateScenarioPanel(engine.model);
    showToast("Projeto atualizado.");
  } catch (error) {
    handleApiError(error);
    showToast(apiAvailable ? "Não foi possível atualizar o projeto." : "Servidor local offline. Rode npm run serve.");
  }
}

async function renameActiveLoop() {
  const entry = workspace[activeIndex];
  if (!entry) return;
  const values = await openCommandDialog({
    title: "Renomear mapa",
    submitLabel: "Renomear",
    fields: [{ name: "title", label: "Nome", value: entry.label || entry.model.title, required: true }]
  });
  if (!values) return;
  const title = values.title;
  entry.label = title;
  entry.model = { ...entry.model, title };
  engine.setModel(entry.model, { animate: false });
  await persistActiveLoop();
  renderWorkspaceTabs();
  updateScenarioPanel(engine.model);
  showToast("Loop renomeado.");
}

async function editActiveLoopDescription() {
  const entry = workspace[activeIndex];
  if (!entry) return;
  elements.loopSummaryInput.value = entry.summary || entry.model.description || "";
  elements.loopDescriptionInput.value =
    entry.description_md || entry.model.description || `## ${entry.label || entry.model.title}\n\n`;
  updateLoopDescriptionPreview();
  elements.loopDescriptionModal.hidden = false;
  elements.loopDescriptionInput.focus();
}

async function saveLoopDescriptionForm(event) {
  event.preventDefault();
  const entry = workspace[activeIndex];
  if (!entry) return;
  const summary = elements.loopSummaryInput.value.trim() ||
    firstPlainLine(elements.loopDescriptionInput.value);
  const description = elements.loopDescriptionInput.value.trim();
  entry.summary = summary;
  entry.description_md = description;
  entry.model = { ...entry.model, description: summary };
  engine.model.description = summary;
  await persistActiveLoop();
  closeLoopDescriptionModal();
  renderWorkspaceTabs();
  updateScenarioPanel(engine.model);
  showToast("Descrição atualizada.");
}

function updateLoopDescriptionPreview() {
  const summary = elements.loopSummaryInput.value.trim();
  const description = elements.loopDescriptionInput.value.trim();
  elements.loopDescriptionPreview.innerHTML = renderMarkdown(
    `${summary ? `${summary}\n\n` : ""}${description || "Sem descrição."}`
  );
}

function closeLoopDescriptionModal() {
  elements.loopDescriptionModal.hidden = true;
}

async function duplicateActiveLoop() {
  const entry = workspace[activeIndex];
  if (!entry) return;
  if (apiAvailable && entry.persisted) {
    try {
      const data = await apiFetch(`/api/loops/${encodeURIComponent(entry.id)}/duplicate`, { method: "POST" });
      workspace.unshift(loopRecordToEntry(data.loop));
      renderWorkspaceTabs();
      selectModel(0, { preserveCurrent: false });
      showToast("Loop duplicado.");
      return;
    } catch (error) {
      handleApiError(error);
      if (!apiAvailable) {
        showToast("Servidor offline. Duplicata criada só nesta sessão.");
      }
    }
  }
  const copy = {
    ...entry,
    id: `copy:${entry.id}:${Date.now()}`,
    label: `${entry.label} cópia`,
    model: { ...cloneModel(entry.model), id: `${entry.model.id}-copy`, title: `${entry.label} cópia` },
    persisted: false
  };
  workspace.splice(activeIndex + 1, 0, copy);
  renderWorkspaceTabs();
  selectModel(activeIndex + 1);
}

async function deleteActiveLoop() {
  if (workspace.length <= 1) {
    showToast("O projeto precisa manter pelo menos um loop.");
    return;
  }
  const entry = workspace[activeIndex];
  if (!entry) return;
  const confirmed = await openCommandDialog({
    title: "Remover mapa",
    description: `O mapa “${entry.label}” e suas views serão removidos deste projeto.`,
    submitLabel: "Remover mapa",
    danger: true
  });
  if (!confirmed) return;
  if (apiAvailable && entry.persisted) {
    try {
      await apiFetch(`/api/loops/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
    } catch (error) {
      handleApiError(error);
      showToast(apiAvailable
        ? "Não foi possível remover o loop."
        : "Servidor local offline. O loop não foi removido do projeto.");
      return;
    }
  }
  workspace.splice(activeIndex, 1);
  renderWorkspaceTabs();
  selectModel(Math.max(0, activeIndex - 1), { preserveCurrent: false });
  showToast("Loop removido.");
}

function exportJson() {
  const model = engine.getModel({ includePositions: true, includeRoutes: true });
  downloadText(`${model.id || "trama"}-model.json`, JSON.stringify(model, null, 2), "application/json");
  showToast("JSON exportado.");
}

function setEditing(enabled) {
  editing = enabled;
  appCommands.setEditing(editing);
  if (editing && storyMode) stopPresentation();
  selectedNodeId = null;
  selectedEdgeId = null;
  pendingConnectionSourceId = null;
  hidePopover();
  engine.clearFocus();
  engine.setEditing(editing);
  elements.stageShell.classList.toggle("editing", editing);
  elements.routeHandle.hidden = true;
  elements.editToggle.classList.toggle("active", editing);
  elements.editToggle.textContent = editing ? "Concluir edição" : "Editar";
  elements.editToggle.setAttribute("aria-pressed", String(editing));
  renderLoopBrowser();
  updateEditToolbar();
  if (editing) scheduleFit({ padding: 45, duration: 180 });
  showToast(editing
    ? "Modo edição ativo: duplo clique cria nó; selecione um nó para editar ou conectar."
    : layoutDirty ? "Edição encerrada. Exporte JSON para preservar tudo." : "Modo edição encerrado.");
}

function setWorkspaceMode(mode = "map") {
  // Explore was retired as a user-facing route. Unknown or legacy requests
  // deliberately land in the Editor, where the full map remains available.
  const nextMode = ["workspace", "map", "story", "present"].includes(mode) ? mode : "map";
  // A mode change invalidates every deferred fit scheduled by the previous
  // chrome layout. Without this generation bump, a delayed Map fit can run
  // after Explore has installed its loop-focused camera and produce a
  // timing-dependent viewport.
  cancelScheduledFit();
  // `engine.fit()` uses Cytoscape animations. Cancelling the scheduler alone
  // cannot stop an animation already in flight; without this stop, a settled
  // Editor fit can finish after Explore installs its focused camera.
  engine.cy?.stop?.(true);
  engine.setSelectionMode?.(nextMode === "story");
  if (nextMode !== "story") {
    document.body.classList.remove("story-inspector-mobile-open");
    elements.storyMobileInspectorToggle?.setAttribute("aria-expanded", "false");
    storyMobileInspectorOpener = null;
  }

  if (nextMode === "present") {
    if (workspaceMode !== "present") previousWorkspaceMode = workspaceMode;
    startPresentation();
    return;
  }
  if (storyMode) stopPresentation();
  activateWorkspaceChrome(nextMode);
  engine.cy?.nodes().removeClass("editor-workbench-node explore-workbench-node");
  if (nextMode === "map") engine.cy?.nodes().addClass("editor-workbench-node");
  if (nextMode === "explore") engine.cy?.nodes().addClass("explore-workbench-node");
  if (elements.storyCanvasHeader) elements.storyCanvasHeader.hidden = nextMode !== "story";
  document.body.classList.toggle("explore-mode", nextMode === "explore");
  if (focusMode) setFocusMode(false);

  if (nextMode === "workspace") {
    if (editing) setEditing(false);
    setEditorDockCollapsed(true);
    elements.editorDock.classList.remove("story-studio-open");
    renderAppShell();
    return;
  } else if (nextMode === "explore") {
    document.body.classList.remove("explore-panel-closed");
    if (editing) setEditing(false);
    if (sidebarCollapsed) setSidebarCollapsed(false);
    selectInspectorTab("loops");
    setEditorDockCollapsed(true);
    elements.editorDock.classList.remove("story-studio-open");
    renderExplorePanel();
    const loop = explorePanelController?.activeLoop();
    if (loop) focusExploreLoop(loop);
  } else if (nextMode === "story") {
    if (editing) setEditing(false);
    clearStoryCanvasSelection();
    // The canvas selection is cleared above, but the React inspector owns a
    // separate view-model. Refresh it before Story Studio takes over the dock
    // so a node/edge edited in Map cannot remain visually mounted underneath
    // the story surface.
    renderDockInspector();
    // Story Studio starts from the complete system context. A loop selected
    // in Explore is a prior navigation state, not the story's first frame.
    activeLoopId = null;
    appCommands.clearActiveLoop();
    engine.clearFocus();
    openDockPanel("story");
    transientDetailsController.closeTransientDetails();
    setStoryEditorMode(storyEditorMode === "markdown" ? "markdown" : "visual");
    // Keep the canvas in additive-selection mode for the entire Story Studio
    // session. This is intentionally reasserted after the mode chrome and
    // inspector are mounted, since those surfaces can trigger a re-render
    // while the user is entering Story Studio.
    engine.setSelectionMode?.(true);
    updateStoryCanvasSelectionAction();
    requestAnimationFrame(() => { if (elements.stageShell) elements.stageShell.scrollTop = 0; });
    // The Story Studio dock and timeline are React-owned and commit after the
    // route switches. Refit after that settled composition so the opening
    // "map inteiro" frame starts at the intended readable overview rather
    // than carrying the narrower Editor safe rectangle into the Studio.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (workspaceMode !== "story" || storyMode || !engine.cy) return;
      engine.cy.resize();
      fitCanvas({ padding: 34, duration: 0 });
      engine.cy.forceRender?.();
    }));
  } else {
    if (!editing) setEditing(true);
    // A leitura do mapa vem antes do Inspector. A edição de elementos segue
    // disponível no segundo item do dock, mas a entrada padrão preserva o
    // contexto causal, os ciclos e a descrição editorial.
    openDockPanel("map");
    elements.editorDock.classList.remove("story-studio-open");
    if (window.matchMedia("(max-width: 720px)").matches) setEditorDockCollapsed(true);
    selectInspectorTab("relation");
    renderExplorePanel();
  }
  if (nextMode !== "explore" && nextMode !== "story") {
    const settledFit = nextMode === "story" || nextMode === "map"
      ? {
          delay: 260,
          options: { padding: nextMode === "story" ? 58 : 52, duration: 180 }
        }
      : null;
    scheduleFit({ padding: nextMode === "story" ? 48 : 45, duration: 180 }, settledFit);
  }
}

let storyMobileInspectorOpener = null;

function setStoryMobileInspector(open) {
  const next = Boolean(open);
  if (next) {
    const active = document.activeElement;
    storyMobileInspectorOpener = active instanceof HTMLElement && active !== document.body
      ? active
      : elements.storyMobileInspectorToggle;
    document.body.classList.add("story-inspector-mobile-open");
    elements.storyMobileInspectorToggle?.setAttribute("aria-expanded", "true");
    openDockPanel("story");
    window.requestAnimationFrame?.(() => elements.storyMobileInspectorClose?.focus?.());
    showToast("Editor do beat aberto.");
    return;
  }
  if (!document.body.classList.contains("story-inspector-mobile-open")) return;
  document.body.classList.remove("story-inspector-mobile-open");
  elements.storyMobileInspectorToggle?.setAttribute("aria-expanded", "false");
  const restore = storyMobileInspectorOpener || elements.storyMobileInspectorToggle;
  storyMobileInspectorOpener = null;
  window.requestAnimationFrame?.(() => restore?.focus?.());
  showToast("Editor do beat fechado.");
}

function toggleStoryMobileInspector() {
  setStoryMobileInspector(!document.body.classList.contains("story-inspector-mobile-open"));
}

function setFocusMode(enabled) {
  focusMode = enabled;
  appCommands.setFocusMode(focusMode);
  if (focusMode && editing) setEditing(false);
  if (focusMode && storyMode) stopPresentation();
  document.body.classList.toggle("focus-mode", focusMode);
  elements.focusToggle.classList.toggle("active", focusMode);
  elements.focusToggle.setAttribute("aria-pressed", String(focusMode));
  elements.focusToggle.textContent = focusMode ? "Sair do foco" : "Foco";
  elements.focusExit.hidden = !focusMode;
  hidePopover();
  updateEditToolbar();
  scheduleFit({ padding: focusMode ? 45 : 85, duration: 240 });
}

function setSidebarCollapsed(collapsed) {
  sidebarCollapsed = collapsed;
  appCommands.setSidebarCollapsed(sidebarCollapsed);
  document.body.classList.toggle("sidebar-collapsed", sidebarCollapsed);
  elements.sidebarToggle.setAttribute("aria-pressed", String(sidebarCollapsed));
  elements.sidebarToggle.setAttribute(
    "aria-label",
    sidebarCollapsed ? "Abrir painel" : "Fechar painel"
  );
  elements.sidebarToggle.textContent = sidebarCollapsed ? "Abrir painel" : "Fechar painel";
  scheduleFit({ padding: sidebarCollapsed ? 55 : 80, duration: 220 });
}

function renderRelation({ edge, source, target }) {
  const sameDirection = edge.sourceSign === edge.targetSign;
  elements.relationView.replaceChildren(
    element("div", "inspector-eyebrow", "Relação selecionada"),
    element("h3", "relation-title", `${source?.label || edge.source} → ${target?.label || edge.target}`),
    relationSigns(edge, source || { label: edge.source }, target || { label: edge.target }),
    element("p", "relation-description",
      edge.description || "Esta relação ainda não possui uma descrição editorial."),
    element("div", `relation-kind ${sameDirection ? "same" : "opposite"}`,
      sameDirection ? "Mesmo sentido" : "Sentidos opostos")
  );
  selectedEdgeId = edge.id;
  selectedNodeId = null;
}

function renderNodeDetails(id) {
  const node = engine.model.nodes.find(item => item.id === id);
  if (!node) return;
  const connected = engine.model.edges.filter(edge => edge.source === id || edge.target === id);
  const list = element("div", "connected-list");
  connected.forEach(edge => {
    const otherId = edge.source === id ? edge.target : edge.source;
    const other = engine.model.nodes.find(item => item.id === otherId);
    const item = element("button", "connected-item", `${edge.source === id ? "→" : "←"} ${other?.label || otherId}`);
    item.type = "button";
    item.dataset.edgeId = edge.id;
    list.append(item);
  });
  elements.relationView.replaceChildren(
    element("div", "inspector-eyebrow", "Variável selecionada"),
    element("h3", "relation-title", node.label),
    element("p", "relation-description", node.description || "Esta variável ainda não possui descrição."),
    element("div", "sidebar-section-title", "Relações conectadas"),
    list
  );
  selectedNodeId = id;
  selectedEdgeId = null;
}

function renderRelationPlaceholder() {
  elements.relationView.replaceChildren(
    element("div", "inspector-eyebrow", "Relações"),
    element("h3", "relation-title", "Clique em uma aresta"),
    element("p", "relation-description",
      "Você verá as variáveis conectadas, os sinais nas duas pontas e a explicação causal da relação.")
  );
}

function relationSigns(edge, source, target) {
  const row = element("div", "relation-signs");
  row.append(
    signPill(source.label, edge.sourceSign),
    element("span", "relation-arrow", "→"),
    signPill(target.label, edge.targetSign)
  );
  return row;
}

function signPill(label, sign) {
  const pill = element("div", "sign-pill");
  pill.append(element("strong", "", sign), element("span", "", label));
  return pill;
}

function renderLoopBrowser() {
  const loops = engine.getLoops({ discover: true, maxLength: 8, maxLoops: 24 });
  const reinforcing = loops.filter(loop => loop.type === "reinforcing").length;
  const balancing = loops.filter(loop => loop.type === "balancing").length;
  const nodeLabels = new Map((engine.model?.nodes || []).map(node => [node.id, node.label]));
  const summary = `${loops.length} ciclos encontrados · ${reinforcing} de reforço · ${balancing} de balanceamento`;
  const items = [];
  loops.forEach(loop => {
    const loopData = { ...loop, ...(findCuratedLoop(loop) || {}) };
    const visual = stylePropertiesForEntity(engine.view, "loop", loopData);
    if (visual.visible === false || visual.visible === "false") return;
    const curated = findCuratedLoop(loop);
    items.push({
      id: loop.id,
      label: loop.label,
      path: loop.nodeIds.map(id => nodeLabels.get(id)).join(" → "),
      edgeCount: loop.edgeIds.length,
      type: loop.type,
      active: activeLoopId === loop.id,
      published: Boolean(curated),
      visual: {
        highlight: visual.highlight === true || visual.highlight === "true",
        badgeFill: visual["badge-fill"] || visual.fill || "",
        badgeColor: visual["badge-color"] || visual.color || ""
      }
    });
  });
  reactApp?.renderLoopBrowser?.({
    summary,
    loops: items,
    editing,
    activeLoopId,
    onFocusLoop: loopId => {
      activeLoopId = loopId;
      appCommands.setActiveLoop(loopId);
      engine.focusLoop(loopId);
      renderExplorePanel();
      renderLoopBrowser();
    },
    onWalkLoop: loopId => {
      const loop = loops.find(item => item.id === loopId);
      if (!loop) return;
      activeLoopId = loopId;
      appCommands.setActiveLoop(loopId);
      startPresentation(loop);
    },
    onTogglePublish: loopId => {
      const loop = loops.find(item => item.id === loopId);
      if (loop) togglePublishedLoop(loop, nodeLabels);
    }
  });
  renderExplorePanel();
}

function renderExplorePanel() {
  explorePanelController?.render();
}

function selectInspectorTab(name) {
  if (!elements.inspectorTabs.length) {
    if (elements.relationView) elements.relationView.hidden = true;
    if (elements.loopsView) elements.loopsView.hidden = false;
    return;
  }
  elements.inspectorTabs.forEach(button => {
    const active = button.dataset.inspectorTab === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  // The React editor no longer mounts the retired left context rail. The
  // canonical map panel owns these views now, so a mode transition must not
  // assume the compatibility mounts still exist.
  if (elements.relationView) elements.relationView.hidden = name !== "relation";
  if (elements.loopsView) elements.loopsView.hidden = name !== "loops";
}

function findCuratedLoop(loop) {
  const key = [...loop.edgeIds].sort().join("|");
  return curatedLoops.find(item => [...item.edgeIds].sort().join("|") === key);
}

function togglePublishedLoop(loop, nodeLabels) {
  const existing = findCuratedLoop(loop);
  if (existing) {
    curatedLoops = curatedLoops.filter(item => item.id !== existing.id);
  } else {
    const id = uniqueLoopId(loop.label.toLowerCase());
    const title = `${loop.label} · ${loop.type === "reinforcing" ? "Reforço" : "Balanceamento"}`;
    const description = loop.nodeIds.map(nodeId => nodeLabels.get(nodeId)).join(" → ");
    curatedLoops.push({
      id,
      label: loop.label,
      title,
      description,
      type: loop.type,
      edgeIds: [...loop.edgeIds]
    });
  }
  engine.setLoops(curatedLoops);
  syncWorkspaceFromEngine();
  schedulePersistActiveLoop();
  markLayoutDirty();
  renderLoopBrowser();
}

function uniqueLoopId(base) {
  let id = base;
  let suffix = 2;
  while (curatedLoops.some(loop => loop.id === id)) id = `${base}-${suffix++}`;
  return id;
}

function setPresentationButtonLabel(button, label) {
  if (!button) return;
  const labelNode = button.querySelector(".presentation-action-label");
  if (labelNode) labelNode.textContent = label;
  else button.textContent = label;
}

function startPresentation(loopOverride = null, initialIndex = 0) {
  const session = ++presentationGeneration;
  const presentation = loopOverride?.edgeIds?.length
    ? normalizePresentation({
      id: `walk-${loopOverride.id}-presentation`,
      title: loopOverride.label || loopOverride.title || "Percurso do loop",
      chapters: [{ id: "chapter-1", title: "Percurso", role: "custom", scenes: [{
        id: `scene-${loopOverride.id}`,
        type: "stage",
        title: loopOverride.label || loopOverride.title || "Percurso do loop",
        mapRef: { mapId: engine.model.id },
        beats: [{ id: `beat-${loopOverride.id}`, type: "traverse", title: loopOverride.label || loopOverride.title || "Percurso do loop", narrationMd: loopOverride.description || `Percorra o loop ${loopOverride.label || loopOverride.id}.`, focus: { kind: "loop", loopId: loopOverride.id } }]
      }]}]
    })
    : activePresentation || emptyPresentationForModel(engine.model);
  presentationStudy = resolvePresentationStyle({
    requested: requestedPresentationStudy,
    presentation
  });
  const compiled = compilePresentation(presentation, presentationContext());
  if (!compiled.timeline.length || compiled.errors.length) {
    activateWorkspaceChrome(workspaceMode === "present" ? previousWorkspaceMode : workspaceMode);
    showToast("Este loop ainda não tem apresentação.");
    return;
  }
  if (editing) setEditing(false);
  if (focusMode) setFocusMode(false);
  setPresenterMode(false);
  presenterStartedAt = Date.now();
  currentPresentationFrame = null;
  activePresentationReducedMotion = presentation.settings?.reducedMotion === "always" ||
    (presentation.settings?.reducedMotion !== "never" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  cancelScheduledFit();
  presentationController?.stop();
  const resolvedInitialIndex = Math.max(0, Math.min(Number(initialIndex) || 0, compiled.timeline.length - 1));
  const controller = new PresentationController({
    presentation,
    context: presentationContext(),
    initialIndex: resolvedInitialIndex,
    // The same compiled timeline that passed the entry gate owns the player.
    // Recompiling here can let a concurrent authoring refresh disagree with
    // the validated first frame during a mode transition.
    compiled
  });
  presentationController = controller;
  let awaitingInitialFrame = true;
  controller.addEventListener("beatchange", event => {
    if (presentationController !== controller || session !== presentationGeneration) return;
    const detail = event.detail;
    // Pin the initial render to the validated timeline. This is especially
    // important while React is replacing the Editor chrome: the card must not
    // reveal a neighbouring beat before the controller's first frame settles.
    const frame = awaitingInitialFrame && detail.state.index === resolvedInitialIndex
      ? compiled.timeline[resolvedInitialIndex] || detail.frame
      : detail.frame;
    awaitingInitialFrame = false;
    renderPresentationStep({ ...detail, frame });
  });
  controller.addEventListener("stop", () => {
    // A replacement player can stop the preceding controller while a new
    // session is already being composed. That retired listener must never
    // clear or reveal the current player's card.
    if (presentationController !== controller || session !== presentationGeneration) return;
    cancelPresentationCameraMotion();
    setPresenterMode(false);
    presenterStartedAt = 0;
    currentPresentationFrame = null;
    elements.presentationCard.hidden = true;
    clearPresentationTooltip();
    elements.presentToggle.classList.remove("active");
    engine.cy?.elements().removeClass("faded focused story-hidden story-ghost");
    document.body.classList.remove("story-mode");
    document.body.classList.remove("explore-mode");
    delete document.body.dataset.presentationStudy;
    elements.presentationInlineLayer.hidden = true;
    storyMode = false;
  });
  storyMode = true;
  engine.cy?.nodes().removeClass("editor-workbench-node explore-workbench-node");
  if (workspaceMode !== "present") previousWorkspaceMode = workspaceMode;
  activateWorkspaceChrome("present");
  document.body.classList.remove("explore-mode");
  document.body.classList.add("story-mode");
  document.body.dataset.presentationStudy = presentationStudy;
  // Do not expose the portal before the controller publishes its first
  // compiled frame. Otherwise a fast re-entry can briefly show the previous
  // beat's copy and focus while the two-RAF canvas resize is pending.
  elements.presentationCard.hidden = true;
  elements.presentationInlineLayer.hidden = true;
  elements.presentToggle.classList.add("active");
  requestAnimationFrame(() => {
    // The single React composition may still be committing portal layout on
    // the first frame. Start camera playback on the settled Present viewport,
    // otherwise Cytoscape fits the editor-sized canvas and carries that zoom
    // into the full-screen player.
    requestAnimationFrame(() => {
      if (presentationController !== controller || session !== presentationGeneration) return;
      engine.cy?.resize();
      controller.start(resolvedInitialIndex);
    });
  });
}

function presentationContext() {
  const maps = workspace.map(entry => ({
    id: entry.mapId || entry.model?.id,
    model: entry.model,
    views: entry.views || []
  })).filter(item => item.id && item.model);
  const views = maps.flatMap(map => map.views || []);
  return { model: engine.model, maps, views, assets: projectAssets, regions: engine.model.regions || [] };
}

function scheduleFit(options, settledFit = null) {
  cancelScheduledFit();
  const generation = fitGeneration;
  markQaCameraPending(generation);
  fitFrame = requestAnimationFrame(() => {
    fitFrame = null;
    if (generation !== fitGeneration) return;
    if (storyMode || !engine.cy) return;
    fitCanvas(options);
    engine.cy.resize();
    engine.cy.forceRender?.();
    if (settledFit?.delay) {
      fitTimer = window.setTimeout(() => {
        fitTimer = null;
        if (generation !== fitGeneration || storyMode || !engine.cy) return;
        engine.cy.resize();
        fitCanvas(settledFit.options || options);
        engine.cy.forceRender?.();
        scheduleCameraStable(settledFit.options || options, generation);
      }, settledFit.delay);
      return;
    }
    requestAnimationFrame(() => {
      if (generation !== fitGeneration || storyMode || !engine.cy) return;
      engine.cy.resize();
      fitCanvas(options);
      engine.cy.forceRender?.();
      scheduleCameraStable(options, generation);
    });
  });
}

function cancelScheduledFit() {
  fitGeneration += 1;
  if (fitFrame) cancelAnimationFrame(fitFrame);
  if (fitTimer) window.clearTimeout(fitTimer);
  if (cameraStableTimer) window.clearTimeout(cameraStableTimer);
  fitFrame = null;
  fitTimer = null;
  cameraStableTimer = null;
  if (qaEnabled && qaRoot) delete qaRoot.dataset.qaCameraStable;
}

function markQaCameraPending(generation) {
  if (!qaEnabled || !qaRoot) return;
  qaRoot.dataset.qaCameraStable = `${workspaceMode}:pending:${generation}`;
}

function scheduleCameraStable(options, generation) {
  if (!qaEnabled || !qaRoot) return;
  if (cameraStableTimer) window.clearTimeout(cameraStableTimer);
  const duration = Math.max(0, Number(options?.duration) || 0);
  cameraStableTimer = window.setTimeout(() => {
    cameraStableTimer = null;
    requestAnimationFrame(() => {
      if (generation !== fitGeneration || storyMode || !engine.cy) return;
      qaRoot.dataset.qaCameraStable = `${workspaceMode}:stable:${generation}:${engine.cy.zoom().toFixed(4)}:${Math.round(engine.cy.pan().x)}:${Math.round(engine.cy.pan().y)}`;
    });
  }, duration + 32);
}

function zoomCanvas(factor) {
  if (!engine.cy) return;
  const current = engine.cy.zoom();
  const next = Math.max(engine.cy.minZoom(), Math.min(engine.cy.maxZoom(), current * factor));
  engine.cy.animate({
    zoom: {
      level: next,
      renderedPosition: {
        x: elements.stage.clientWidth / 2,
        y: elements.stage.clientHeight / 2
      }
    }
  }, {
    duration: 180,
    easing: "ease-in-out-cubic"
  });
}

function formatPresenterElapsed() {
  const elapsed = presenterStartedAt ? Math.max(0, Math.floor((Date.now() - presenterStartedAt) / 1000)) : 0;
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function renderPresenterPanel(frame = currentPresentationFrame, state = presentationController?.state) {
  if (!elements.presentationPresenterPanel || !elements.presentationPresenterToggle) return;
  const visible = Boolean(presenterMode && frame && state);
  elements.presentationPresenterPanel.hidden = !visible;
  elements.presentationPresenterToggle.setAttribute("aria-pressed", String(presenterMode));
  setPresentationButtonLabel(elements.presentationPresenterToggle, presenterMode ? "Ocultar notas" : "Ensaiar");
  elements.presentationPresenterToggle.setAttribute("aria-label", presenterMode ? "Ocultar notas do apresentador" : "Abrir notas do apresentador");
  elements.presentationPresenterToggle.title = presenterMode ? "Ocultar notas" : "Ensaiar";
  if (!visible) return;
  const notes = frame.beat?.speakerNotesMd || frame.scene?.content?.speakerNotesMd || "Sem notas privadas para este beat.";
  const nextFrame = presentationController?.compiled?.timeline?.[state.index + 1];
  elements.presentationPresenterTimer.textContent = formatPresenterElapsed();
  elements.presentationPresenterPosition.textContent = `${state.index + 1}/${state.total} · ${frame.beat?.title || frame.scene?.title || "Beat atual"}`;
  elements.presentationPresenterNotes.innerHTML = renderMarkdown(notes);
  elements.presentationPresenterNext.textContent = nextFrame
    ? (nextFrame.beat?.title || nextFrame.scene?.title || "Próximo beat")
    : "Fim da história";
}

function setPresenterMode(enabled) {
  presenterMode = Boolean(enabled) && storyMode;
  appCommands.setPresenterMode(presenterMode);
  if (presenterMode && !presenterStartedAt) presenterStartedAt = Date.now();
  if (presenterTicker) {
    clearInterval(presenterTicker);
    presenterTicker = null;
  }
  if (presenterMode) {
    presenterTicker = window.setInterval(() => {
      if (!presenterMode) return;
      if (elements.presentationPresenterTimer) elements.presentationPresenterTimer.textContent = formatPresenterElapsed();
    }, 1000);
  }
  renderPresenterPanel();
}

function renderPresentationStep({ frame, state }) {
  currentPresentationFrame = frame;
  // A frame may replace an exact node/edge focus with a parked map, loop or
  // path. Remove the prior connector before laying out the next frame so an
  // old tether cannot survive the two-RAF transition into the player.
  if (usesContextualPresentation(presentationStudy)) clearPresentationTooltip();
  selectedStorySceneId = frame.sceneId || selectedStorySceneId;
  selectedStoryBeatId = frame.beatId || selectedStoryBeatId;
  markStoryboardPlayback(frame);
  const index = state.index;
  const total = state.total;
  const hasPrevious = index > 0;
  const hasNext = index < total - 1;
  markStoryFocus(frame);
  applyStoryReveal(frame);
  elements.presentationTitle.textContent = frame.beat.title || frame.scene.title;
  elements.presentationBody.innerHTML = renderMarkdown(frame.beat.narrationMd || frame.scene.content.bodyMd || "");
  renderPresentationRelationMeta(frame);
  elements.presentationCard.dataset.sceneType = presentationSceneType(frame.scene.type);
  elements.presentationCard.dataset.transition = presentationTransitionType(frame.transition?.type || frame.scene.transition?.type);
  elements.presentationCard.dataset.study = presentationStudy;
  const presentationPlan = resolveCameraPlan(frame, engine.model);
  elements.presentationCard.dataset.focusKind = presentationPlan.focus?.kind || (presentationPlan.isMap ? "map" : "set");
  elements.presentationCard.dataset.cameraMode = presentationPlan.mode || "fit-map";
  elements.presentationCard.dataset.cameraDuration = String(presentationCameraMotion(presentationPlan).duration);
  elements.presentationCard.dataset.sceneChange = String(index === 0 || presentationController?.compiled?.timeline?.[index - 1]?.sceneId !== frame.sceneId);
  elements.presentationStudyLabel.textContent = PRESENTATION_STUDY_LABELS[presentationStudy];
  applySceneViewStyle(elements.presentationCard, frame.scene, engine.view);
  if (!activePresentationReducedMotion) {
    elements.presentationCard.style.animation = "none";
    elements.presentationBody.style.animation = "none";
    requestAnimationFrame(() => {
      elements.presentationCard.style.animation = "";
      elements.presentationBody.style.animation = "";
    });
  }
  const imageSource = frame.scene.content.src ||
    (frame.scene.content.assetId && apiAvailable ? `/api/assets/${encodeURIComponent(frame.scene.content.assetId)}` : "");
  elements.presentationImage.hidden = !imageSource;
  if (imageSource) {
    elements.presentationImage.src = imageSource;
    elements.presentationImage.alt = frame.scene.content.altText || frame.beat.title || "Imagem da apresentação";
  } else {
    elements.presentationImage.removeAttribute("src");
  }
  elements.presentationPrevious.disabled = !hasPrevious;
  elements.presentationPrevious.setAttribute("aria-label", hasPrevious ? "Voltar para o passo anterior" : "Primeiro passo");
  elements.presentationPrevious.title = hasPrevious ? "Passo anterior" : "Primeiro passo";
  elements.presentationNext.disabled = false;
  setPresentationButtonLabel(elements.presentationNext, hasNext ? "Próximo" : "Concluir");
  elements.presentationNext.setAttribute("aria-label", hasNext ? "Avançar para o próximo passo" : "Concluir apresentação");
  elements.presentationNext.title = hasNext ? "Próximo passo" : "Concluir apresentação";
  renderPresenterPanel(frame, state);
  renderStoryTimeline();
  elements.presentationProgress.style.setProperty("--progress", `${((index + 1) / total) * 100}%`);
  elements.presentationProgress.dataset.progress = `${index + 1}/${total}`;
  elements.presentationProgress.setAttribute("aria-label", `Passo ${index + 1} de ${total}`);
  elements.presentationProgress.setAttribute("role", "progressbar");
  elements.presentationProgress.setAttribute("aria-valuemin", "1");
  elements.presentationProgress.setAttribute("aria-valuemax", String(total));
  elements.presentationProgress.setAttribute("aria-valuenow", String(index + 1));
  // The canonical player renders from the compiled frame. `step` belonged to
  // the removed legacy adapter; referencing it here aborts the render before
  // the progress/card state and camera are applied.
  renderPresentationStudy(frame, state);
  updateLowerThirdSafeArea();
  focusStoryCamera(frame);
}

function updateLowerThirdSafeArea() {
  if (presentationStudy !== "lower-third" || !storyMode || !elements.stage || !elements.presentationCard) return;
  const cardHeight = Math.ceil(elements.presentationCard.getBoundingClientRect().height || 0);
  if (!cardHeight) return;
  elements.stage.style.setProperty("--presentation-lower-third-zone", `${cardHeight + 28}px`);
}

function renderPresentationRelationMeta(frame = {}) {
  const meta = elements.presentationRelationMeta;
  if (!meta) return;
  meta.replaceChildren();
  meta.hidden = true;
  if (!usesContextualPresentation(presentationStudy)) return;
  const plan = resolveCameraPlan(frame, engine.model);
  const focusKind = plan.focus?.kind || "";
  if (focusKind !== "edge" || plan.edgeIds.length !== 1) return;
  const edge = engine.model.edges?.find(item => item.id === plan.edgeIds[0]);
  const source = engine.model.nodes?.find(item => item.id === edge?.source);
  const target = engine.model.nodes?.find(item => item.id === edge?.target);
  if (!edge || !source || !target) return;

  const positive = edge.targetSign === "+" || edge.targetSign === "＋" || (!edge.targetSign && edge.sourceSign !== "−");
  const polarity = positive ? { symbol: "↑", label: "Aumenta" } : { symbol: "↓", label: "Diminui" };
  const sign = document.createElement("b");
  sign.className = "presentation-relation-sign";
  sign.textContent = polarity.symbol;
  sign.setAttribute("aria-label", polarity.label);
  sign.title = polarity.label;
  const label = document.createElement("span");
  label.textContent = `${singleLineLabel(source.label)} → ${singleLineLabel(target.label)}`;
  meta.setAttribute("aria-label", `${polarity.label}: ${label.textContent}`);
  meta.append(sign, label);
  meta.hidden = false;
}

function singleLineLabel(label = "") {
  return String(label).replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
}

function isContextualPresentationActive() {
  return usesContextualPresentation(presentationStudy) && storyMode && currentPresentationFrame && elements.presentationCard && !elements.presentationCard.hidden;
}

function schedulePresentationTooltipPosition({ immediate = false } = {}) {
  if (!isContextualPresentationActive()) return;
  if (immediate) {
    if (presentationTooltipRaf) cancelAnimationFrame(presentationTooltipRaf);
    presentationTooltipRaf = null;
    positionPresentationTooltip(currentPresentationFrame);
    return;
  }
  if (presentationTooltipRaf) return;
  presentationTooltipRaf = requestAnimationFrame(() => {
    presentationTooltipRaf = null;
    positionPresentationTooltip(currentPresentationFrame);
  });
}

function reflowPresentationTooltipAfterCamera() {
  if (!isContextualPresentationActive()) return;
  // Atlas keeps the editorial card still while the camera moves. Re-running
  // the discrete grid search here made the card jump to a second "better"
  // cell at the exact moment the zoom finished.
  if (presentationStudy === "atlas-editorial") {
    schedulePresentationTooltipPosition({ immediate: true });
    return;
  }
  // The focused elements have their final screen coordinates only after the
  // Cytoscape animation has committed its last frame. Re-select the discrete
  // placement once then; tracking remains continuous during the animation.
  presentationTooltipPlacementState = null;
  schedulePresentationTooltipPosition({ immediate: true });
}

function clearPresentationTooltip() {
  if (presentationTooltipRaf) cancelAnimationFrame(presentationTooltipRaf);
  presentationTooltipRaf = null;
  presentationTooltipPlacementState = null;
  presentationConnectorFrameKey = null;
  presentationAtlasCardSideState = null;
  elements.presentationTooltipConnector?.replaceChildren();
  elements.presentationCard?.removeAttribute("data-anchor");
  elements.presentationCard?.style.removeProperty("--story-card-left");
  elements.presentationCard?.style.removeProperty("--story-card-top");
  elements.presentationCard?.style.removeProperty("right");
}

function positionPresentationTooltip(frame) {
  if (!isContextualPresentationActive() || !elements.stage || !elements.presentationCard) return;
  const stageRect = elements.stage.getBoundingClientRect();
  const card = elements.presentationCard;
  // Placement needs the rendered fractional dimensions. `offsetHeight`
  // rounds down, which can park a card a fraction of a pixel beyond the
  // stage on a font/layout boundary and makes the safe-area guarantee false.
  const cardRect = card.getBoundingClientRect();
  const width = cardRect.width || card.offsetWidth || 360;
  const height = cardRect.height || card.offsetHeight || 180;
  if (stageRect.width <= 0 || stageRect.height <= 0 || width <= 0 || height <= 0) return;

  const plan = resolveCameraPlan(frame, engine.model);
  const mode = presentationConnectorMode(presentationStudy, plan);
  const anchor = mode === "tethered" ? presentationTooltipAnchor(plan, stageRect) : null;
  const bounds = { x: 0, y: 0, width: stageRect.width, height: stageRect.height };
  const frameKey = `${frame.sceneId || "scene"}:${frame.beatId || "beat"}`;
  if (presentationConnectorFrameKey !== frameKey) {
    presentationConnectorFrameKey = frameKey;
    elements.presentationTooltipConnector?.replaceChildren();
  }
  if (presentationStudy === "atlas-editorial" && presentationAtlasCardSideState?.frameKey !== frameKey) {
    presentationAtlasCardSideState = { frameKey, side: presentationAtlasCardSide(plan) };
  }
  const cardSide = presentationStudy === "atlas-editorial" ? presentationAtlasCardSideState?.side : null;
  const layoutKey = [
    frame.sceneId || "scene",
    frame.beatId || "beat",
    mode,
    anchor ? "anchor" : "no-anchor",
    cardSide || "free",
    Math.round(width * 10) / 10,
    Math.round(height * 10) / 10,
    Math.round(stageRect.width * 10) / 10,
    Math.round(stageRect.height * 10) / 10
  ].join(":");
  if (presentationTooltipPlacementState?.key !== layoutKey) {
    const placement = chooseTooltipPlacement({
      mode,
      bounds,
      width,
      height,
      anchor,
      obstacles: presentationTooltipObstacles(plan, stageRect),
      chrome: [
        ...presentationTooltipChrome(stageRect),
        ...presentationAtlasSideChrome(stageRect, cardSide)
      ],
      margin: 20,
      grid: 26,
      gap: 28
    });
    presentationTooltipPlacementState = createTooltipTrackingState({
      key: layoutKey,
      mode,
      placement,
      anchor,
      width,
      height,
      bounds,
      margin: 20
    });
  }
  const placement = trackTooltipPlacement({
    state: presentationTooltipPlacementState,
    bounds,
    width,
    height,
    anchor,
    margin: 20,
    followAnchor: presentationStudy !== "atlas-editorial"
  });
  if (!placement) return;
  card.style.setProperty("--story-card-left", `${placement.x}px`);
  card.style.setProperty("--story-card-top", `${placement.y}px`);
  card.style.left = `${placement.x}px`;
  card.style.right = "auto";
  card.style.top = `${placement.y}px`;
  card.style.bottom = "auto";
  card.dataset.anchor = placement.connector ? placement.connector.from.x < placement.x ? "left" : "right" : "parked";
  card.dataset.cardSide = cardSide || "free";
  renderPresentationTooltipConnector(placement.connector, stageRect);
}

function presentationAtlasCardSide(plan) {
  if (plan.mode === "fit-map") return "left";
  if (plan.mode === "split") return "right";
  if (!engine.cy) return "right";
  const focusedIds = [...new Set([...(plan.nodeIds || []), ...(plan.edgeIds || [])])];
  const focused = focusedIds.reduce((collection, id) => collection.union(engine.cy.getElementById(id)), engine.cy.collection());
  if (!focused.length) return "right";
  const mapBox = engine.cy.elements(":visible").renderedBoundingBox({ includeLabels: true });
  const focusBox = focused.renderedBoundingBox({ includeLabels: true });
  return focusBox.x1 + focusBox.w / 2 <= mapBox.x1 + mapBox.w / 2 ? "right" : "left";
}

function presentationAtlasSideChrome(stageRect, cardSide) {
  if (presentationStudy !== "atlas-editorial" || !cardSide || stageRect.width < 980) return [];
  const reserved = Math.min(470, stageRect.width * 0.44);
  return cardSide === "right"
    ? [{ type: "rect", x: 0, y: 0, width: stageRect.width - reserved, height: stageRect.height }]
    : [{ type: "rect", x: reserved, y: 0, width: stageRect.width - reserved, height: stageRect.height }];
}

function presentationTooltipAnchor(plan, stageRect) {
  if (plan.focus?.kind === "edge" && plan.edgeIds.length === 1) {
    const point = presentationEdgeMidpoint(plan.edgeIds[0]);
    return point ? canvasPointToStage(point, stageRect) : null;
  }
  if (plan.focus?.kind === "node" && plan.nodeIds.length === 1) {
    const point = renderedNodePoint(plan.nodeIds[0]);
    return point ? canvasPointToStage(point, stageRect) : null;
  }
  return null;
}

function presentationTooltipObstacles(plan, stageRect) {
  const nodeIds = new Set(plan.nodeIds || []);
  const edgeIds = new Set(plan.edgeIds || []);
  for (const edgeId of edgeIds) {
    const edge = engine.cy?.getElementById(edgeId);
    if (!edge?.length) continue;
    nodeIds.add(edge.source().id());
    nodeIds.add(edge.target().id());
  }
  const obstacles = [];
  for (const nodeId of nodeIds) {
    const node = engine.cy?.getElementById(nodeId);
    if (!node?.length) continue;
    const point = canvasPointToStage(node.renderedPosition(), stageRect);
    const box = node.renderedBoundingBox?.();
    const boxWidth = Number(box?.w || 0);
    const boxHeight = Number(box?.h || 0);
    const nodeMargin = 18;
    if (boxWidth > 0 && boxHeight > 0) {
      obstacles.push({
        type: "rect",
        x: point.x - boxWidth / 2 - nodeMargin,
        y: point.y - boxHeight / 2 - nodeMargin,
        width: boxWidth + nodeMargin * 2,
        height: boxHeight + nodeMargin * 2
      });
    }
    const radius = Math.max(48, Math.max(boxWidth, boxHeight || 120) / 2 + nodeMargin);
    obstacles.push({ type: "circle", x: point.x, y: point.y, r: radius });
    obstacles.push({ type: "rect", x: point.x - 88, y: point.y + radius - 4, width: 176, height: 60 });
  }
  for (const edgeId of edgeIds) {
    for (const point of presentationEdgeSamples(edgeId)) {
      obstacles.push({ type: "circle", x: point.x, y: point.y, r: 10 });
    }
  }
  return obstacles;
}

function presentationTooltipChrome(stageRect) {
  return [elements.mapControls, elements.storyCanvasHeader, elements.storySelectionBar, elements.presentationClose]
    .map(element => element?.getBoundingClientRect?.())
    .filter(rect => rect && rect.width > 0 && rect.height > 0)
    .map(rect => ({
      type: "rect",
      x: Math.max(0, rect.left - stageRect.left),
      y: Math.max(0, rect.top - stageRect.top),
      width: Math.min(stageRect.width, rect.width),
      height: Math.min(stageRect.height, rect.height)
    }));
}

function canvasPointToStage(point, stageRect) {
  const canvasRect = engine.canvas?.getBoundingClientRect?.();
  return {
    x: Number(point?.x || 0) + (canvasRect?.left || stageRect.left) - stageRect.left,
    y: Number(point?.y || 0) + (canvasRect?.top || stageRect.top) - stageRect.top
  };
}

function presentationEdgeMidpoint(edgeId) {
  const edge = engine.cy?.getElementById(edgeId);
  if (!edge?.length) return null;
  // Cytoscape owns the final route after endpoint clipping, curve style,
  // control-point weights and renderer-specific geometry are applied. Its
  // rendered midpoint is therefore the only pixel-exact anchor.
  const renderedMidpoint = edge.renderedMidpoint?.();
  if (Number.isFinite(renderedMidpoint?.x) && Number.isFinite(renderedMidpoint?.y)) {
    return renderedMidpoint;
  }
  const sourceModel = edge.source().position?.();
  const targetModel = edge.target().position?.();
  const distance = Number(edge.data("curveDistance") ?? edge.data("route")?.controlPointDistance);
  if (sourceModel && targetModel && Number.isFinite(distance)) {
    const dx = Number(targetModel.x) - Number(sourceModel.x);
    const dy = Number(targetModel.y) - Number(sourceModel.y);
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      const midpoint = {
        x: (Number(sourceModel.x) + Number(targetModel.x)) / 2,
        y: (Number(sourceModel.y) + Number(targetModel.y)) / 2
      };
      // The route is authored in model space. Projecting its midpoint with
      // the current camera avoids endpoint recalculation as Cytoscape zooms
      // against node shapes and labels.
      const control = {
        x: midpoint.x + (-dy / length) * distance,
        y: midpoint.y + (dx / length) * distance
      };
      const modelPoint = {
        x: 0.25 * Number(sourceModel.x) + 0.5 * control.x + 0.25 * Number(targetModel.x),
        y: 0.25 * Number(sourceModel.y) + 0.5 * control.y + 0.25 * Number(targetModel.y)
      };
      const zoom = Number(engine.cy.zoom()) || 1;
      const pan = engine.cy.pan();
      return {
        x: modelPoint.x * zoom + Number(pan.x || 0),
        y: modelPoint.y * zoom + Number(pan.y || 0)
      };
    }
  }
  const source = edge.renderedSourceEndpoint?.() || edge.source().renderedPosition();
  const target = edge.renderedTargetEndpoint?.() || edge.target().renderedPosition();
  const control = edge.renderedControlPoints?.()?.[0] || { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  const t = 0.5;
  const u = 1 - t;
  return {
    x: u * u * source.x + 2 * u * t * control.x + t * t * target.x,
    y: u * u * source.y + 2 * u * t * control.y + t * t * target.y
  };
}

function presentationEdgeSamples(edgeId) {
  const edge = engine.cy?.getElementById(edgeId);
  if (!edge?.length) return [];
  const source = edge.renderedSourceEndpoint?.() || edge.source().renderedPosition();
  const target = edge.renderedTargetEndpoint?.() || edge.target().renderedPosition();
  const control = edge.renderedControlPoints?.()?.[0] || { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  const points = [];
  for (let index = 0; index <= 10; index += 1) {
    const t = index / 10;
    const u = 1 - t;
    points.push(canvasPointToStage({
      x: u * u * source.x + 2 * u * t * control.x + t * t * target.x,
      y: u * u * source.y + 2 * u * t * control.y + t * t * target.y
    }, elements.stage.getBoundingClientRect()));
  }
  return points;
}

function renderPresentationTooltipConnector(connector, stageRect) {
  const svg = elements.presentationTooltipConnector;
  if (!svg) return;
  svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
  svg.setAttribute("width", String(stageRect.width));
  svg.setAttribute("height", String(stageRect.height));
  if (!connector) {
    svg.replaceChildren();
    return;
  }
  const ns = "http://www.w3.org/2000/svg";
  let halo = svg.querySelector(".presentation-tooltip-halo");
  let line = svg.querySelector(".presentation-tooltip-line");
  let dot = svg.querySelector(".presentation-tooltip-dot");
  if (!halo || !line || !dot) {
    halo = document.createElementNS(ns, "path");
    halo.setAttribute("class", "presentation-tooltip-halo");
    line = document.createElementNS(ns, "path");
    line.setAttribute("class", "presentation-tooltip-line");
    dot = document.createElementNS(ns, "circle");
    dot.setAttribute("class", "presentation-tooltip-dot");
    dot.setAttribute("r", "4.5");
    svg.replaceChildren(halo, line, dot);
  }
  const dx = connector.to.x - connector.from.x;
  const dy = connector.to.y - connector.from.y;
  const bend = Math.min(34, Math.hypot(dx, dy) * 0.16);
  const normalX = Math.hypot(dx, dy) ? -dy / Math.hypot(dx, dy) : 0;
  const normalY = Math.hypot(dx, dy) ? dx / Math.hypot(dx, dy) : 0;
  const controlX = connector.from.x + dx * 0.52 + normalX * bend;
  const controlY = connector.from.y + dy * 0.52 + normalY * bend;
  const path = `M ${connector.from.x} ${connector.from.y} Q ${controlX} ${controlY} ${connector.to.x} ${connector.to.y}`;
  halo.setAttribute("d", path);
  line.setAttribute("d", path);
  dot.setAttribute("cx", String(connector.from.x));
  dot.setAttribute("cy", String(connector.from.y));
}

function renderPresentationStudy(frame, state) {
  elements.presentationCard.hidden = false;
  elements.presentationInlineLayer.hidden = true;
  elements.presentationCard.style.left = "";
  elements.presentationCard.style.top = "";
  elements.presentationCard.style.bottom = "";
  if (usesContextualPresentation(presentationStudy)) {
    elements.presentationCard.dataset.study = presentationStudy;
    schedulePresentationTooltipPosition({ immediate: true });
  } else clearPresentationTooltip();
}

function firstNarrativeSentence(markdown = "") {
  const plain = markdown.replace(/[*_`>#]/g, "").replace(/\s+/g, " ").trim();
  if (!plain) return "A relação destacada muda o comportamento do sistema.";
  const sentence = plain.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  return sentence || plain;
}

function markStoryboardPlayback(frame = null) {
  // Playback highlighting is rendered by the canonical timeline.
  return frame;
}

function applySceneViewStyle(card, step, view) {
  const visual = stylePropertiesForEntity(view, "scene", step);
  card.style.background = visual.fill || visual.background || "";
  card.style.color = visual.color || "";
  if (visual.width) card.style.width = typeof visual.width === "number" ? `${visual.width}px` : visual.width;
}

function stopPresentation() {
  const returnMode = previousWorkspaceMode || "map";
  cancelPresentationCameraMotion();
  // Let the live controller publish its normal stop cleanup while it still
  // owns the active session. Incrementing first makes the session guard skip
  // that cleanup and can leave the presentation card visible after Escape.
  presentationController?.stop();
  presentationGeneration += 1;
  presentationController = null;
  storyMode = false;
  setPresenterMode(false);
  presenterStartedAt = 0;
  currentPresentationFrame = null;
  clearPresentationTooltip();
  elements.stage?.style.removeProperty("--presentation-lower-third-zone");
  clearStoryFocusMarks();
  stopStoryFlow();
  document.body.classList.remove("story-mode");
  document.body.classList.remove("explore-mode");
  delete document.body.dataset.presentationStudy;
  elements.presentationInlineLayer.hidden = true;
  setWorkspaceMode(returnMode);
}

function buildStorySteps(loopOverride = null) {
  if (loopOverride?.edgeIds?.length) return loopToStorySteps(loopOverride);
  return [];
}

function expandStoryToRelationSteps(steps = []) {
  return steps.flatMap(step => {
    if (step.focus?.edgeId) return [edgeToStoryStep(step.focus.edgeId, step)];
    if (step.focus?.loopId) {
      const loop = findLoopById(step.focus.loopId);
      return loop ? loopToStorySteps(loop, step) : [];
    }
    if (step.focus?.nodeId) {
      const connected = relationStepsAroundNode(step.focus.nodeId, step);
      return connected.length ? connected : [{ ...step, focus: { nodeId: step.focus.nodeId } }];
    }
    return [step];
  });
}

function loopToStorySteps(loop, parentStep = null) {
  return loop.edgeIds.map((edgeId, index) =>
    edgeToStoryStep(edgeId, {
      id: parentStep ? `${parentStep.id}-${edgeId}` : `story-${loop.id}-${edgeId}`,
      title: parentStep?.title || loop.title || loop.label || "Loop",
      body: parentStep?.body || `Relação ${index + 1} do loop ${loop.label || loop.id}.`
    }, { preferEdgeDescription: true })
  );
}

function edgeToStoryStep(edgeId, sourceStep = {}, { preferEdgeDescription = false } = {}) {
  const nodes = new Map(engine.model.nodes.map(node => [node.id, node]));
  const edge = engine.model.edges.find(item => item.id === edgeId);
  const source = nodes.get(edge?.source);
  const target = nodes.get(edge?.target);
  const title = edge && source && target
    ? `${source.label} → ${target.label}`
    : sourceStep.title || `Relação ${edgeId}`;
  return {
    id: sourceStep.id || `story-${edgeId}`,
    title,
    body: preferEdgeDescription
      ? edge?.description || sourceStep.body || "Descreva esta relação causal."
      : sourceStep.body || edge?.description || "Descreva esta relação causal.",
    focus: { edgeId },
    parentTitle: sourceStep.title || undefined
  };
}

function relationStepsAroundNode(nodeId, parentStep = null) {
  const node = engine.model.nodes.find(item => item.id === nodeId);
  const edges = engine.model.edges.filter(edge => edge.source === nodeId || edge.target === nodeId);
  if (!node || !edges.length) return [];
  const nodes = new Map(engine.model.nodes.map(item => [item.id, item]));
  return edges.map(edge => ({
    id: `${parentStep?.id || `story-${nodeId}`}-${edge.id}`,
    title: `${nodes.get(edge.source)?.label || edge.source} → ${nodes.get(edge.target)?.label || edge.target}`,
    body: edge.description || parentStep?.body || `Esta relação mostra como ${node.label} participa do sistema.`,
    focus: { edgeId: edge.id },
    parentTitle: parentStep?.title || node.label
  }));
}

function findLoopById(id) {
  return engine.getLoops().find(item => item.id === id) ||
    engine.getLoops({ discover: true, maxLength: 8, maxLoops: 24 }).find(item => item.id === id);
}

function markStoryFocus(frame) {
  stopStoryFlow();
  clearStoryFocusMarks();
  if (!engine.cy) return;
  const plan = resolveCameraPlan(frame, engine.model);
  engine.cy.elements().removeClass("faded focused");
  const allEdgeIds = [...new Set(plan.edgeIds || [])];
  const nodeIds = [...new Set(plan.nodeIds || [])];
  const edges = allEdgeIds.map(id => engine.cy.getElementById(id)).filter(edge => edge.length);
  const nodes = nodeIds.map(id => engine.cy.getElementById(id)).filter(node => node.length);
  if (!edges.length && !nodes.length) return;
  const atlasEditorial = presentationStudy === "atlas-editorial";
  if (usesContextualPresentation(presentationStudy)) engine.cy.elements().addClass("story-background");
  if (atlasEditorial) engine.cy.elements().addClass("atlas-context");
  edges.forEach(edge => {
    edge.addClass("story-current");
    edge.removeClass("story-background atlas-context");
    if (atlasEditorial) {
      edge.addClass("atlas-focus-edge");
      const sourceSign = ["-", "−", "–"].includes(String(edge.data("sourceSign") || "+").trim()) ? -1 : 1;
      const targetSign = ["-", "−", "–"].includes(String(edge.data("targetSign") || "+").trim()) ? -1 : 1;
      if (sourceSign !== targetSign) edge.addClass("atlas-negative");
    }
    edge.source().removeClass("story-background atlas-context").addClass(`story-current-node story-source-node${atlasEditorial ? " atlas-focus-node atlas-focus-source" : ""}`);
    edge.target().removeClass("story-background atlas-context").addClass(`story-current-node story-target-node${atlasEditorial ? " atlas-focus-node atlas-focus-target" : ""}`);
  });
  nodes.forEach(node => {
    node.removeClass("story-background atlas-context").addClass(`story-current-node story-current${atlasEditorial ? " atlas-focus-node" : ""}`);
    node.connectedEdges().removeClass("story-background atlas-context").addClass(`story-context${atlasEditorial ? " atlas-near-context" : ""}`);
    if (atlasEditorial) node.neighborhood().filter(".atlas-context").addClass("atlas-near-context");
  });
  if (storyMode) startStoryFlow(frame.flow || frame.stage?.flow || {});
  else stopStoryFlow();
}

function clearStoryFocusMarks() {
  engine.cy?.elements().removeClass("story-current story-current-node story-source-node story-target-node story-context story-background story-hidden story-ghost atlas-context atlas-near-context atlas-focus-node atlas-focus-source atlas-focus-target atlas-focus-edge atlas-negative");
}

function cancelPresentationCameraMotion() {
  presentationCameraGeneration += 1;
  if (presentationCameraRaf) cancelAnimationFrame(presentationCameraRaf);
  presentationCameraRaf = null;
  // Cancelling app-level RAFs does not stop an animation already owned by
  // Cytoscape. Clear its queue before starting the latest beat's camera.
  engine.cy?.stop?.(true, false);
}

function focusStoryCamera(frame) {
  if (!engine.cy) return;
  cancelPresentationCameraMotion();
  const generation = presentationCameraGeneration;
  const plan = resolveCameraPlan(frame, engine.model);
  if (qaEnabled && qaRoot) delete qaRoot.dataset.qaPresentationCamera;
  const motion = presentationCameraMotion(plan, { reduced: activePresentationReducedMotion || qaEnabled });
  const finish = () => {
    if (generation !== presentationCameraGeneration || !engine.cy) return;
    requestAnimationFrame(() => {
      if (generation !== presentationCameraGeneration || !engine.cy) return;
      requestAnimationFrame(() => {
        if (generation !== presentationCameraGeneration || !engine.cy) return;
        reflowPresentationTooltipAfterCamera();
        if (qaEnabled && qaRoot) {
          qaRoot.dataset.qaPresentationCamera = `${frame.sceneId || "scene"}:${frame.beatId || "beat"}:${engine.cy.zoom().toFixed(4)}`;
        }
      });
    });
  };
  const animate = (properties, localMotion = motion, complete = finish) => engine.cy.animate(properties, {
    duration: localMotion.duration,
    easing: localMotion.easing,
    complete
  });
  if (plan.mode === "fixed" && Number.isFinite(plan.camera.zoom) && plan.camera.pan) {
    engine.cy.resize();
    animate({ zoom: plan.camera.zoom, pan: plan.camera.pan });
    return;
  }
  engine.cy.resize();
  const safeRect = measureCanvasSafeRect({
    canvas: engine.canvas,
    overlays: [
      elements.editToolbar || "#edit-toolbar",
      elements.mapControls || ".map-controls",
      elements.storyCanvasHeader || "#story-canvas-header",
      elements.storySelectionBar || "#story-selection-bar",
      ...presentationCameraOverlays(),
      "#story-timeline-shell"
    ],
    sideOverlays: presentationCameraSideOverlays()
  });
  presentationCameraRaf = requestAnimationFrame(() => {
    presentationCameraRaf = null;
    if (generation !== presentationCameraGeneration || !engine.cy || (!storyMode && workspaceMode !== "story")) return;
    engine.cy.resize();
    if (plan.isMap) {
      const mapViewport = safeRect ? getCameraViewport(engine.cy, plan, { padding: plan.camera.padding || 70, rect: safeRect }) : null;
      if (mapViewport?.viewport) animate({ zoom: mapViewport.viewport.zoom, pan: mapViewport.viewport.pan });
      else animate({ fit: { eles: engine.cy.elements(":visible"), padding: plan.camera.padding || 70 } });
      return;
    }
    const result = getCameraViewport(engine.cy, plan, {
      padding: 68,
      rect: safeRect,
      maxZoom: presentationCameraMaxZoom(plan)
    });
    if (!result?.viewport || !result.collection?.length) {
      animate({ fit: { eles: engine.cy.elements(":visible"), padding: plan.camera.padding || 70 } });
      return;
    }
    if (presentationStudy === "atlas-editorial" && plan.mode === "follow-path" && !activePresentationReducedMotion && !qaEnabled && plan.edgeIds.length > 1) {
      const firstPlan = resolveCameraPlan({
        focus: { kind: "edge", edgeId: plan.edgeIds[0] },
        stage: { camera: { mode: "fit-focus", maxZoom: 1.5 } }
      }, engine.model);
      const first = getCameraViewport(engine.cy, firstPlan, {
        padding: 132,
        rect: safeRect,
        maxZoom: 1.5
      });
      if (first?.viewport) {
        animate(
          { zoom: first.viewport.zoom, pan: first.viewport.pan },
          { duration: 280, easing: "ease-out-cubic" },
          () => {
            if (generation !== presentationCameraGeneration || !engine.cy) return;
            animate(
              { zoom: result.viewport.zoom, pan: result.viewport.pan },
              { duration: 800, easing: "ease-in-out-cubic" }
            );
          }
        );
        return;
      }
    }
    animate({
      zoom: result.viewport.zoom,
      pan: result.viewport.pan
    });
    if (activePresentationReducedMotion) return;
  });
}

function presentationCameraMaxZoom(plan = {}) {
  return styleCameraMaxZoom(presentationStudy, plan);
}

function presentationCameraMotion(plan = {}, options = {}) {
  return styleCameraMotion(presentationStudy, plan, options);
}

function applyStoryReveal(frame) {
  if (!engine.cy) return;
  const plan = resolveCameraPlan(frame, engine.model);
  const visibility = frame.stage?.visibility || {};
  const ids = [...new Set([
    ...(visibility.focused || []),
    ...(visibility.emphasized || []),
    ...(visibility.context || []),
    ...(plan.nodeIds || []),
    ...(plan.edgeIds || [])
  ])];
  const ghostIds = [...new Set(visibility.ghost || [])];
  const hiddenIds = [...new Set(visibility.hidden || [])];
  engine.cy.elements().removeClass("story-hidden story-ghost");
  if (!ids.length && !ghostIds.length && !hiddenIds.length) {
    engine.cy.elements().removeClass("faded focused");
    return;
  }
  const revealed = ids
    .map(id => engine.cy.getElementById(id))
    .reduce((collection, item) => collection.union(item), engine.cy.collection());
  // A stale presentation focus must never make the entire map disappear.
  // This can happen when a saved presentation references IDs from an older
  // version of the map. Keep the map readable and let camera fitting use its
  // visible-map fallback instead.
  if (ids.length && !revealed.length) {
    engine.cy.elements().removeClass("faded focused");
    return;
  }
  const preserveMapContext = usesContextualPresentation(presentationStudy);
  engine.cy.elements().removeClass("faded");
  if (!preserveMapContext) engine.cy.elements().addClass("faded");
  revealed.union(revealed.connectedNodes()).removeClass("faded").addClass("focused");
  const ghost = ghostIds
    .map(id => engine.cy.getElementById(id))
    .reduce((collection, item) => collection.union(item), engine.cy.collection());
  ghost.removeClass("faded").addClass("story-ghost");
  // Relation tooltips are contextual annotations over the map. They may
  // emphasize the current relation, but must not inherit authored hidden
  // elements that can leave the entire canvas empty on a later beat.
  if (!preserveMapContext) {
    hiddenIds.map(id => engine.cy.getElementById(id)).forEach(item => item.addClass("story-hidden"));
  }
}

function presentationSceneType(type) {
  return type === "title" ? "title" : type === "narrative" ? "text" : type === "media" ? "image" : "map";
}

function presentationTransitionType(type) {
  return type === "cut" ? "cut" : type === "slide" ? "slide" : "fade";
}

function startStoryFlow(flow = {}) {
  storyFlowDirection = flow?.direction === "reverse" || flow?.direction === "backward" ? 1 : -1;
  if (storyFlowTimer || !engine.cy || activePresentationReducedMotion) return;
  const startedAt = performance.now();
  const tick = now => {
    const elapsed = now - startedAt;
    const offset = storyFlowDirection * ((elapsed / 18) % 32);
    const pulse = (Math.sin(elapsed / 300) + 1) / 2;
    engine.cy?.edges(".story-current").style("line-dash-offset", offset);
    engine.cy?.nodes(".story-current-node").style({
      "underlay-opacity": 0.2 + pulse * 0.1,
      "underlay-padding": 16 + pulse * 6
    });
    storyFlowTimer = requestAnimationFrame(tick);
  };
  storyFlowTimer = requestAnimationFrame(tick);
}

function stopStoryFlow() {
  if (storyFlowTimer) cancelAnimationFrame(storyFlowTimer);
  storyFlowTimer = null;
  engine.cy?.edges().removeStyle("line-dash-offset");
  engine.cy?.nodes().removeStyle("underlay-opacity underlay-padding");
}

function positionStoryTooltip(step) {
  const focusBounds = boundsForFocus(step.focus);
  const point = focusBounds ? centerOfBounds(focusBounds) : pointForFocus(step.focus);
  const width = elements.presentationCard.offsetWidth || 360;
  const height = elements.presentationCard.offsetHeight || 180;
  const margin = 22;
  const candidates = [
    { left: margin, top: margin },
    { left: elements.stage.clientWidth - width - margin, top: margin },
    { left: margin, top: elements.stage.clientHeight - height - margin },
    { left: elements.stage.clientWidth - width - margin, top: elements.stage.clientHeight - height - margin },
    { left: margin, top: Math.max(margin, Math.min(elements.stage.clientHeight - height - margin, point.y - height / 2)) },
    { left: elements.stage.clientWidth - width - margin, top: Math.max(margin, Math.min(elements.stage.clientHeight - height - margin, point.y - height / 2)) }
  ].map(candidate => ({
    left: Math.max(margin, Math.min(elements.stage.clientWidth - width - margin, candidate.left)),
    top: Math.max(margin, Math.min(elements.stage.clientHeight - height - margin, candidate.top))
  }));
  const expandedFocus = focusBounds ? expandBounds(focusBounds, 120) : null;
  const best = candidates
    .map(candidate => ({
      ...candidate,
      score: storyTooltipScore(candidate, { width, height }, point, expandedFocus)
    }))
    .sort((a, b) => b.score - a.score)[0] || { left: margin, top: margin };
  elements.presentationCard.style.setProperty("--story-card-left", `${best.left}px`);
  elements.presentationCard.style.setProperty("--story-card-top", `${best.top}px`);
  elements.presentationCard.dataset.anchor = best.left + width / 2 < point.x ? "right" : "left";
  elements.presentationCard.style.left = `${best.left}px`;
  elements.presentationCard.style.top = `${best.top}px`;
  elements.presentationCard.style.bottom = "auto";
}

function positionInlineAnnotation(step) {
  const bounds = boundsForFocus(step.focus);
  const point = bounds ? centerOfBounds(bounds) : pointForFocus(step.focus);
  const annotation = elements.presentationInlineAnnotation;
  if (!annotation || !point) return;
  const width = annotation.offsetWidth || 330;
  const height = annotation.offsetHeight || 120;
  const margin = 28;
  const canvasWidth = elements.stage.clientWidth;
  const canvasHeight = elements.stage.clientHeight;
  const focusBox = bounds || {
    x1: point.x - 60,
    y1: point.y - 60,
    x2: point.x + 60,
    y2: point.y + 60
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const candidates = [
    { left: focusBox.x2 + 42, top: point.y - height / 2, anchor: "left" },
    { left: focusBox.x1 - width - 42, top: point.y - height / 2, anchor: "right" },
    { left: point.x - width / 2, top: focusBox.y1 - height - 42, anchor: "bottom" },
    { left: point.x - width / 2, top: focusBox.y2 + 42, anchor: "top" }
  ].map(candidate => ({
    ...candidate,
    left: clamp(candidate.left, margin, canvasWidth - width - margin),
    top: clamp(candidate.top, margin + 18, canvasHeight - height - margin)
  }));
  const best = candidates
    .map(candidate => {
      const rect = { x1: candidate.left, y1: candidate.top, x2: candidate.left + width, y2: candidate.top + height };
      return { ...candidate, overlap: overlapArea(rect, expandBounds(focusBox, 12)), distance: Math.hypot(centerOfBounds(rect).x - point.x, centerOfBounds(rect).y - point.y) };
    })
    .sort((a, b) => (a.overlap - b.overlap) || (a.distance - b.distance))[0];
  annotation.dataset.anchor = best.anchor;
  annotation.style.left = `${best.left}px`;
  annotation.style.top = `${best.top}px`;
}

function storyTooltipScore(candidate, size, point, avoidBounds) {
  const rect = {
    x1: candidate.left,
    y1: candidate.top,
    x2: candidate.left + size.width,
    y2: candidate.top + size.height
  };
  const center = centerOfBounds(rect);
  const distance = Math.hypot(center.x - point.x, center.y - point.y);
  const overlapPenalty = avoidBounds ? overlapArea(rect, avoidBounds) * 4 : 0;
  const edgePenalty = candidate.top < 40 ? 20 : 0;
  // The best candidate should stay close to the narrated element. The
  // previous positive distance score selected the farthest corner, which
  // made the floating study feel detached from the active path.
  return -distance - overlapPenalty - edgePenalty;
}

function boundsForFocus(focus = {}) {
  if (!engine.cy) return null;
  if (focus.edgeId) {
    const edge = engine.cy.getElementById(focus.edgeId);
    if (!edge.length) return null;
    return boundsFromPoints([
      edge.source().renderedPosition(),
      edge.target().renderedPosition(),
      renderedEdgePoint(focus.edgeId)
    ].filter(Boolean));
  }
  if (focus.nodeId) {
    const point = renderedNodePoint(focus.nodeId);
    return point ? { x1: point.x - 60, y1: point.y - 60, x2: point.x + 60, y2: point.y + 60 } : null;
  }
  if (focus.loopId) {
    const loop = findLoopById(focus.loopId);
    const points = (loop?.edgeIds || []).flatMap(edgeId => {
      const edge = engine.cy.getElementById(edgeId);
      return edge.length ? [edge.source().renderedPosition(), edge.target().renderedPosition(), renderedEdgePoint(edgeId)] : [];
    }).filter(Boolean);
    return boundsFromPoints(points);
  }
  return null;
}

function boundsFromPoints(points = []) {
  if (!points.length) return null;
  return points.reduce((bounds, point) => ({
    x1: Math.min(bounds.x1, point.x),
    y1: Math.min(bounds.y1, point.y),
    x2: Math.max(bounds.x2, point.x),
    y2: Math.max(bounds.y2, point.y)
  }), { x1: points[0].x, y1: points[0].y, x2: points[0].x, y2: points[0].y });
}

function centerOfBounds(bounds) {
  return {
    x: (bounds.x1 + bounds.x2) / 2,
    y: (bounds.y1 + bounds.y2) / 2
  };
}

function expandBounds(bounds, amount) {
  return {
    x1: bounds.x1 - amount,
    y1: bounds.y1 - amount,
    x2: bounds.x2 + amount,
    y2: bounds.y2 + amount
  };
}

function overlapArea(a, b) {
  const width = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const height = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  return width * height;
}

function pointForFocus(focus = {}) {
  if (focus.edgeId) return renderedEdgePoint(focus.edgeId);
  if (focus.nodeId) return renderedNodePoint(focus.nodeId);
  if (focus.loopId) {
    const loop = engine.getLoops().find(item => item.id === focus.loopId) ||
      engine.getLoops({ discover: true, maxLength: 8, maxLoops: 24 }).find(item => item.id === focus.loopId);
    const points = (loop?.edgeIds || []).map(renderedEdgePoint).filter(Boolean);
    if (points.length) {
      const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
      return { x: total.x / points.length, y: total.y / points.length };
    }
  }
  return { x: elements.stage.clientWidth / 2, y: elements.stage.clientHeight / 2 };
}

async function exportStandalone() {
  elements.exportStandalone.disabled = true;
  elements.exportStandalone.textContent = "Gerando...";
  try {
    syncWorkspaceFromEngine();
    const entry = standaloneEntryForIndex(activeIndex);
    await exportStandaloneApplication.execute({
      filename: `${entry.model.id || entry.id}-trama.html`,
      project,
      model: entry.model,
      loops: [entry],
      activeLoopId: entry.id,
      presentation: activePresentation,
      presentations: projectPresentations,
      embed: { sidebar: elements.exportWithSidebar?.checked !== false }
    });
    showToast("HTML standalone do mapa gerado.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível gerar o HTML standalone.");
  } finally {
    elements.exportStandalone.disabled = false;
    elements.exportStandalone.textContent = "Exportar HTML";
  }
}

async function exportProjectStandalone() {
  elements.exportProjectStandalone.disabled = true;
  elements.exportProjectStandalone.textContent = "Gerando...";
  try {
    syncWorkspaceFromEngine();
    const entries = workspace.map((_entry, index) => standaloneEntryForIndex(index));
    const active = entries[activeIndex] || entries[0];
    await exportStandaloneApplication.execute({
      filename: `${slugId(project?.title || "trama-projeto", "projeto")}-trama.html`,
      project,
      model: active.model,
      loops: entries.map(item => ({
        ...item,
        presentation: projectPresentations.find(record => presentationTargetsEntry(record, item))?.presentation ||
          (item.id === active.id ? activePresentation : null)
      })),
      activeLoopId: active.id,
      presentation: activePresentation,
      presentations: projectPresentations,
      embed: { sidebar: elements.exportProjectWithSidebar?.checked !== false }
    });
    showToast("HTML standalone do projeto gerado.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível gerar o HTML do projeto.");
  } finally {
    elements.exportProjectStandalone.disabled = false;
    elements.exportProjectStandalone.textContent = "Exportar projeto HTML";
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
}

function standaloneEntryForIndex(index) {
  const entry = workspace[index];
  const model = index === activeIndex
    ? engine.getModel({ includePositions: true, includeRoutes: true })
    : cloneModel(entry.model);
  if (index === activeIndex) {
    model.loops = curatedLoops.map(loop => ({ ...loop, edgeIds: [...loop.edgeIds] }));
  }
  return {
    id: entry.id || model.id,
    title: entry.label || model.title || model.id,
    summary: entry.summary || model.description || "",
    description_md: entry.description_md || model.description || "",
    model,
    view: resolvedViewForEntry(entry)
  };
}

function startConnectionFromSelection() {
  if (!selectedNodeId) return;
  pendingConnectionSourceId = selectedNodeId;
  // The map target is the next step in this gesture. Do not leave the action
  // menu covering part of the canvas after its command was chosen.
  document.querySelector(".edit-toolbar-more")?.removeAttribute("open");
  updateEditToolbar();
  hidePopover();
  showToast("Conectando: clique no destino ou pressione Escape para cancelar.");
}

function createEdgeBetween(source, target) {
  if (source === target) {
    showToast("Escolha dois nós diferentes para conectar.");
    return;
  }
  try {
    const edge = engine.addEdge({
      source,
      target,
      sourceSign: "+",
      targetSign: "+",
      description: ""
    });
    selectedNodeId = null;
    selectedEdgeId = edge.id;
    pendingConnectionSourceId = null;
    bindCanvasEditing();
    updateEditToolbar();
    showEdgePopover(edge.id);
    showToast("Aresta criada.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível criar a aresta.");
  }
}

function toggleSelectedNodeLock() {
  if (!selectedNodeId) return;
  const node = engine.cy.getElementById(selectedNodeId);
  const locked = !node.locked();
  engine.updateNode(selectedNodeId, { locked });
  showToast(locked ? "Nó fixado." : "Nó liberado para movimento.");
}

function unlockSelectedRoute() {
  if (!selectedEdgeId) return;
  engine.unlockEdgeRoute(selectedEdgeId);
  syncWorkspaceFromEngine();
  markLayoutDirty();
  updateEditToolbar();
  showToast("Rota liberada para otimização automática.");
}

async function saveCurrentLayout() {
  engine.model.layoutState = "authored";
  const model = engine.getModel({ includePositions: true, includeRoutes: true });
  localStorage.setItem(storageKey(model.id), JSON.stringify(extractLayout(model)));
  syncWorkspaceFromEngine();
  // Do not leave a debounced older snapshot waiting behind this explicit save.
  const entry = workspace[activeIndex];
  if (entry) {
    window.clearTimeout(saveTimers.get(entry.id));
    saveTimers.delete(entry.id);
  }
  const savedLoop = await persistActiveLoop();
  if (workspace[activeIndex]?.view) await persistActiveView(workspace[activeIndex].view);
  layoutDirty = false;
  updateEditToolbar();
  updateSavedLayoutControls();
  if (apiAvailable && workspace[activeIndex]?.persisted && !savedLoop) {
    showToast("Layout protegido neste navegador, mas o SQLite não confirmou o salvamento.");
    return;
  }
  showToast(apiAvailable ? "Layout salvo no projeto SQLite." : "Layout salvo neste navegador.");
}

function restoreSavedLayout() {
  const saved = readLayout(engine.model.id);
  if (!saved) return;
  selectedNodeId = null;
  selectedEdgeId = null;
  pendingConnectionSourceId = null;
  hidePopover();
  layoutDirty = false;
  suppressLayoutDirty = true;
  engine.setModel(applySavedLayout(engine.model, saved), { animate: false });
  engine.setEditing(editing);
  bindCanvasEditing();
  syncWorkspaceFromEngine();
  syncModelMetadata();
  refreshPanels();
  schedulePersistActiveLoop(activeIndex, { delay: 80 });
  showToast("Layout salvo restaurado.");
}

function resetLayout() {
  const entry = workspace[activeIndex];
  localStorage.removeItem(storageKey(engine.model.id));
  selectedNodeId = null;
  selectedEdgeId = null;
  pendingConnectionSourceId = null;
  hidePopover();
  layoutDirty = false;
  suppressLayoutDirty = true;
  const model = entry.kind === "example"
    ? cloneModel(examples.find(example => example.id === entry.model.id) || entry.model)
    : stripLayout(engine.model);
  engine.setModel(model, { animate: false });
  engine.setEditing(editing);
  bindCanvasEditing();
  syncWorkspaceFromEngine();
  syncModelMetadata();
  refreshPanels();
  updateSavedLayoutControls();
  schedulePersistActiveLoop(activeIndex, { delay: 80 });
  showToast("Organização automática restaurada.");
}

function stripLayout(model) {
  return {
    ...cloneModel(model),
    nodes: model.nodes.map(({ position: _position, locked: _locked, ...node }) => node),
    edges: model.edges.map(({ route: _route, ...edge }) => edge)
  };
}

function savePopoverChanges(event) {
  event.preventDefault();
  try {
    if (selectedNodeId) {
      const nextLabel = elements.nodeLabel.value.trim() || "Variável";
      const { result: node } = editMapCommand.execute({
        target: { type: "node", id: selectedNodeId },
        changes: { label: nextLabel }
      });
      selectedNodeId = node.id;
      selectedEdgeId = null;
      bindCanvasEditing();
      showNodePopover(node.id);
    } else if (selectedEdgeId) {
      const { result: edge } = editMapCommand.execute({
        target: { type: "edge", id: selectedEdgeId },
        changes: {
          sourceSign: elements.edgeSourceSign.value,
          targetSign: elements.edgeTargetSign.value,
          description: elements.edgeDescription.value.trim()
        }
      });
      selectedEdgeId = edge.id;
      selectedNodeId = null;
      bindCanvasEditing();
      showEdgePopover(edge.id);
      renderRelation({
        edge,
        source: engine.model.nodes.find(node => node.id === edge.source),
        target: engine.model.nodes.find(node => node.id === edge.target)
      });
    }
    syncWorkspaceFromEngine();
    schedulePersistActiveLoop();
    markLayoutDirty();
    showToast("Alteração salva.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível salvar a alteração.");
  }
}

function deleteCurrentSelection() {
  const nodeIds = selectedNodeIds.length ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
  if (nodeIds.length) {
    if (nodeIds.length > 1) engine.removeNodes(nodeIds);
    else engine.removeNode(nodeIds[0]);
    selectedNodeId = null;
    selectedNodeIds = [];
    selectedEdgeId = null;
    hidePopover();
    showToast("Nó removido.");
  } else if (selectedEdgeId) {
    engine.removeEdge(selectedEdgeId);
    selectedEdgeId = null;
    hidePopover();
    showToast("Aresta removida.");
  }
  bindCanvasEditing();
  syncWorkspaceFromEngine();
  refreshPanels();
  markLayoutDirty();
}

function handleKeydown(event) {
  if (event.key === "Escape" && document.body.classList.contains("explore-mode") && !document.body.classList.contains("explore-panel-closed")) {
    event.preventDefault();
    closeExplorePanel();
    return;
  }
  if (event.key === "Escape" && focusMode) {
    event.preventDefault();
    setFocusMode(false);
    return;
  }
  if (event.key === "Escape" && storyMode) {
    event.preventDefault();
    stopPresentation();
    return;
  }
  if (storyMode && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
    event.preventDefault();
    if (event.key === "ArrowRight") presentationController?.next();
    else presentationController?.previous();
    return;
  }
  if (storyMode && event.key.toLowerCase() === "p") {
    event.preventDefault();
    setPresenterMode(!presenterMode);
    return;
  }
  const target = event.target;
  const editingText = target instanceof HTMLElement &&
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
  const historyShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z";
  const redoShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y";
  if ((historyShortcut || redoShortcut) && !editingText) {
    event.preventDefault();
    const isRedo = redoShortcut || (historyShortcut && event.shiftKey);
    if (elements.editorDock.classList.contains("story-studio-open") && activePresentation?.chapters?.length) {
      const changed = isRedo ? redoPresentationEdit() : undoPresentationEdit();
      if (!changed) showToast(isRedo ? "Nada para refazer." : "Nada para desfazer.");
      return;
    }
    const changed = isRedo ? engine.redo() : engine.undo();
    if (changed) {
      syncWorkspaceFromEngine();
      refreshPanels();
      refreshDockEditors();
      schedulePersistActiveLoop();
      showToast(event.shiftKey ? "Alteração refeita." : "Alteração desfeita.");
    }
    return;
  }
  if (!editing || editingText) return;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    const ids = selectedNodeIds.length ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
    if (ids.length) {
      event.preventDefault();
      const amount = event.shiftKey ? 20 : 4;
      engine.moveNodes(ids, {
        dx: event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0,
        dy: event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0
      });
      syncWorkspaceFromEngine();
      schedulePersistActiveLoop();
    }
    return;
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteCurrentSelection();
  } else if (event.key === "Escape") {
    pendingConnectionSourceId = null;
    hidePopover();
    updateEditToolbar();
  }
}

function showNodePopover(id, { focusInput = false } = {}) {
  const node = engine.cy?.getElementById(id);
  if (!node?.length) return;
  elements.nodeEditor.hidden = false;
  elements.edgeEditor.hidden = true;
  elements.nodeLabel.value = node.data("label") || "";
  elements.editPopover.hidden = false;
  positionPopover();
  if (focusInput) {
    elements.nodeLabel.focus();
    elements.nodeLabel.select();
  }
}

function showEdgePopover(id) {
  const edge = engine.cy?.getElementById(id);
  if (!edge?.length) return;
  elements.nodeEditor.hidden = true;
  elements.edgeEditor.hidden = false;
  elements.edgeSourceSign.value = edge.data("sourceSign") || "+";
  elements.edgeTargetSign.value = edge.data("targetSign") || "+";
  elements.edgeDescription.value = edge.data("description") || "";
  elements.editPopover.hidden = false;
  positionPopover();
}

function hidePopover() {
  elements.editPopover.hidden = true;
}

function positionPopover() {
  if (elements.editPopover.hidden || !editing) return;
  const point = selectedNodeId ? renderedNodePoint(selectedNodeId) : renderedEdgePoint(selectedEdgeId);
  if (!point) {
    elements.editPopover.hidden = true;
    return;
  }
  const bounds = elements.stage.getBoundingClientRect();
  const width = elements.editPopover.offsetWidth || 260;
  const height = elements.editPopover.offsetHeight || 130;
  const left = Math.max(12, Math.min(bounds.width - width - 12, point.x + 18));
  const top = Math.max(12, Math.min(bounds.height - height - 12, point.y + 18));
  elements.editPopover.style.left = `${left}px`;
  elements.editPopover.style.top = `${top}px`;
}

function renderedNodePoint(id) {
  const node = engine.cy?.getElementById(id);
  return node?.length ? node.renderedPosition() : null;
}

function renderedEdgePoint(id) {
  const edge = engine.cy?.getElementById(id);
  if (!edge?.length) return null;
  const control = edge.renderedControlPoints()?.[0];
  if (control) return control;
  const source = edge.source().renderedPosition();
  const target = edge.target().renderedPosition();
  return { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
}

function markLayoutDirty() {
  if (!editing) return;
  layoutDirty = true;
  setSaveStatus("dirty", "Alterações pendentes");
  updateEditToolbar();
}

function updateEditToolbar() {
  const node = selectedNodeId ? engine.cy?.getElementById(selectedNodeId) : null;
  const edge = selectedEdgeId ? engine.cy?.getElementById(selectedEdgeId) : null;
  let selectionText = "Duplo clique cria nó; selecione para editar";
  let connectDisabled = true;
  let connectLabel = "Conectar";
  let lockDisabled = true;
  let lockLabel = "Fixar nó";
  let unlockRouteDisabled = true;
  document.body.classList.toggle("editing-connecting", Boolean(pendingConnectionSourceId));
  engine.cy?.nodes().removeClass("connection-source");
  if (pendingConnectionSourceId) engine.cy?.getElementById(pendingConnectionSourceId).addClass("connection-source");
  if (node?.length) {
    const connecting = pendingConnectionSourceId === selectedNodeId;
    selectionText = connecting
      ? `${node.data("label")} · escolha o destino`
      : `${node.data("label")} · ${node.locked() ? "fixado" : "livre"}`;
    connectDisabled = false;
    connectLabel = connecting ? "Conectando..." : "Conectar";
    lockDisabled = false;
    lockLabel = node.locked() ? "Desafixar nó" : "Fixar nó";
    elements.routeHandle.hidden = true;
    positionConnectionHandle();
  } else if (edge?.length) {
    const locked = Boolean(edge.data("routeLocked"));
    selectionText =
      `${edge.source().data("label")} → ${edge.target().data("label")} · ${locked ? "rota manual" : "rota automática"}`;
    unlockRouteDisabled = !locked;
    positionRouteHandle();
    elements.connectionHandle.hidden = true;
  } else {
    elements.routeHandle.hidden = true;
    elements.connectionHandle.hidden = true;
  }
  const nodeIds = selectedNodeIds.length ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
  reactApp?.renderEditorToolbar?.({
    visible: editing && !focusMode,
    selectionText,
    connectDisabled,
    connectLabel,
    lockDisabled,
    lockLabel,
    unlockRouteDisabled,
    saveAttention: layoutDirty,
    saveLabel: layoutDirty ? "Salvar alterações" : "Salvar layout",
    restoreDisabled: !engine.model || !readLayout(engine.model.id),
    duplicateDisabled: nodeIds.length === 0,
    alignHorizontalDisabled: nodeIds.length < 2,
    alignVerticalDisabled: nodeIds.length < 2,
    copyStyleDisabled: nodeIds.length !== 1,
    pasteStyleDisabled: nodeIds.length === 0 || !copiedNodeStyle
  });
}

function duplicateSelectedNodes() {
  const ids = selectedNodeIds.length ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
  const created = engine.duplicateSelection(ids);
  if (!created.length) return;
  selectedNodeIds = created;
  selectedNodeId = created.at(-1);
  selectedEdgeId = null;
  engine.cy.elements().unselect();
  created.forEach(id => engine.cy.getElementById(id).select());
  bindCanvasEditing();
  updateEditToolbar();
  showToast(`${created.length} variável(is) duplicada(s).`);
}

function alignSelectedNodes(mode) {
  const ids = selectedNodeIds.length ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
  if (engine.alignNodes(ids, mode)) {
    syncWorkspaceFromEngine();
    schedulePersistActiveLoop();
    showToast("Seleção alinhada.");
  }
}

function copySelectedNodeStyle() {
  const id = selectedNodeIds.length === 1 ? selectedNodeIds[0] : selectedNodeId;
  const node = engine.model.nodes.find(item => item.id === id);
  copiedNodeStyle = node?.style ? { ...node.style } : {};
  updateEditToolbar();
  showToast("Estilo copiado.");
}

function pasteSelectedNodeStyle() {
  if (!copiedNodeStyle) return;
  const ids = selectedNodeIds.length ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
  engine.updateNodes(ids, { style: { ...copiedNodeStyle } });
  showToast("Estilo aplicado à seleção.");
}

function positionRouteHandle() {
  if (!editing || !selectedEdgeId) {
    elements.routeHandle.hidden = true;
    return;
  }
  const control = renderedEdgePoint(selectedEdgeId);
  if (!control) {
    elements.routeHandle.hidden = true;
    return;
  }
  elements.routeHandle.hidden = false;
  elements.routeHandle.style.left = `${control.x}px`;
  elements.routeHandle.style.top = `${control.y}px`;
}

function positionConnectionHandle() {
  const ids = selectedNodeIds.length ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
  if (!editing || ids.length !== 1) {
    elements.connectionHandle.hidden = true;
    return;
  }
  const node = engine.cy?.getElementById(ids[0]);
  if (!node?.length) {
    elements.connectionHandle.hidden = true;
    return;
  }
  const point = node.renderedPosition();
  const radius = Math.max(node.renderedWidth(), node.renderedHeight()) / 2 + 9;
  elements.connectionHandle.hidden = false;
  elements.connectionHandle.style.left = `${point.x + radius}px`;
  elements.connectionHandle.style.top = `${point.y}px`;
}

function startConnectionDrag(event) {
  const sourceId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : selectedNodeId;
  const source = engine.cy?.getElementById(sourceId);
  if (!editing || !source?.length) return;
  event.preventDefault();
  event.stopPropagation();
  document.body.classList.add("connection-dragging");
  const start = source.renderedPosition();
  elements.connectionPreview.hidden = false;
  elements.connectionPreview.style.left = `${start.x}px`;
  elements.connectionPreview.style.top = `${start.y}px`;
  const move = moveEvent => {
    const rect = elements.stage.querySelector(".map-area").getBoundingClientRect();
    const end = { x: moveEvent.clientX - rect.left, y: moveEvent.clientY - rect.top };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    elements.connectionPreview.style.width = `${Math.hypot(dx, dy)}px`;
    elements.connectionPreview.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  };
  const finish = upEvent => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    elements.connectionPreview.hidden = true;
    document.body.classList.remove("connection-dragging");
    const rect = document.querySelector("#cld-root").getBoundingClientRect();
    const target = nearestRenderedNode({ x: upEvent.clientX - rect.left, y: upEvent.clientY - rect.top });
    if (target && target.id() !== sourceId) createEdgeBetween(sourceId, target.id());
    else showToast("Arraste o conector até outra variável.");
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", finish, { once: true });
}

function startRouteDrag(event) {
  if (!editing || !selectedEdgeId) return;
  event.preventDefault();
  const edgeId = selectedEdgeId;
  if (!engine.beginRouteInteraction(edgeId)) return;
  let latestDistance = null;
  const preview = createFrameScheduler(distance => {
    if (Number.isFinite(distance)) engine.previewEdgeRoute(edgeId, distance);
  });
  const move = moveEvent => {
    const edge = engine.cy.getElementById(edgeId);
    if (!edge.length) return;
    const rect = elements.stage.getBoundingClientRect();
    const rendered = { x: moveEvent.clientX - rect.left, y: moveEvent.clientY - rect.top };
    const pan = engine.cy.pan();
    const zoom = engine.cy.zoom();
    const point = { x: (rendered.x - pan.x) / zoom, y: (rendered.y - pan.y) / zoom };
    const source = edge.source().position();
    const target = edge.target().position();
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.hypot(dx, dy) || 1;
    const midpoint = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
    const normal = { x: -dy / length, y: dx / length };
    const distance = (point.x - midpoint.x) * normal.x + (point.y - midpoint.y) * normal.y;
    latestDistance = Math.max(-420, Math.min(420, distance));
    preview.schedule(latestDistance);
  };
  const end = () => {
    document.removeEventListener("pointermove", move);
    preview.cancel();
    if (Number.isFinite(latestDistance)) engine.commitEdgeRoute(edgeId, latestDistance);
    else engine.cancelRouteInteraction();
    syncWorkspaceFromEngine();
    schedulePersistActiveLoop();
    updateEditToolbar();
    showToast("Rota manual fixada.");
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", end, { once: true });
}

function updateSavedLayoutControls() {
  updateEditToolbar();
}

function updateScenarioPanel(model) {
  if (!model) return;
  const storyCount = activePresentation?.chapters?.reduce((total, chapter) => total + (chapter.scenes || []).reduce((sceneTotal, scene) => sceneTotal + (scene.beats?.length || 1), 0), 0) || 0;
  elements.activeProjectLabel.textContent = `Projeto: ${project?.title || "Projeto local"}`;
  elements.activeLoopLabel.textContent = `Mapa: ${projectDisplayName(model) || model.id}`;
  elements.presentToggle.classList.toggle("primary-action", storyMode || storyCount > 0);
  elements.presentToggle.title = storyCount
    ? `${storyCount} passos disponíveis`
    : "Este loop ainda não tem apresentação";
  updateLoopSelectorSummary();
  document.querySelector("#scenario-eyebrow").textContent =
    model.eyebrow || project?.title || "Mapa ativo";
  document.querySelector("#scenario-title").textContent = projectHeading(model) || model.id;
  document.querySelector("#scenario-description").innerHTML = renderMarkdown(
    workspace[activeIndex]?.description_md ||
    model.description ||
    "Este loop ainda não possui descrição. Use **Editar descrição** para registrar o contexto."
  );

}

function projectDisplayName(model) {
  if (!model) return "";
  if (model.eyebrow && /^Loop\s+\d+\s+·\s+/.test(model.title || "")) {
    return `${model.eyebrow} · ${(model.title || "").replace(/^Loop\s+\d+\s+·\s+/, "")}`;
  }
  return model.title || model.id;
}

function projectHeading(model) {
  if (!model) return "";
  return (model.title || "").replace(/^Loop\s+\d+\s+·\s+/, "") || model.id;
}

function recentProjectsKey() {
  return "trama:recent-projects";
}

function readRecentProjects() {
  try {
    const value = localStorage.getItem(recentProjectsKey()) || localStorage.getItem("loopviewer:recent-projects");
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function rememberRecentProject(item) {
  if (!item?.path) return;
  const current = {
    path: item.path,
    title: item.title || fileNameFromPath(item.path),
    lastOpenedAt: new Date().toISOString()
  };
  const recent = readRecentProjects()
    .filter(project => project.path !== current.path)
    .slice(0, 5);
  localStorage.setItem(recentProjectsKey(), JSON.stringify([current, ...recent]));
}

function renderLocalProjects(projects = []) {
  elements.localProjects.replaceChildren();
  if (!projects.length) {
    elements.localProjects.append(element("p", "recent-empty", apiAvailable
      ? "Nenhum projeto local encontrado em data/."
      : "Servidor local offline."));
    return;
  }
  elements.localProjects.append(element("div", "command-section-title", "Projetos locais"));
  projects.forEach(item => {
    const button = element("button", `recent-project${item.active ? " active" : ""}`, item.title || fileNameFromPath(item.path));
    button.type = "button";
    button.title = item.path;
    button.dataset.projectPath = item.path;
    button.dataset.projectMessage = "Projeto aberto.";
    const metrics = item.metrics
      ? `${item.metrics.maps} mapas · ${item.metrics.views} views · ${item.metrics.presentations} apresentações`
      : item.file || item.path;
    button.append(
      element("small", "", item.active ? "Aberto agora" : metrics),
      element("small", "project-file", item.file || item.path)
    );
    elements.localProjects.append(button);
  });
}

function renderRecentProjects() {
  elements.recentProjects.replaceChildren();
  const recent = readRecentProjects();
  if (!recent.length) {
    elements.recentProjects.append(element("p", "recent-empty", "Nenhum projeto recente."));
    return;
  }
  elements.recentProjects.append(element("div", "command-section-title", "Recentes"));
  recent.forEach(item => {
    const button = element("button", "recent-project", item.title || fileNameFromPath(item.path));
    button.type = "button";
    button.title = item.path;
    button.dataset.projectPath = item.path;
    button.dataset.projectMessage = "Projeto recente aberto.";
    elements.recentProjects.append(button);
  });
}

async function openProjectByPath(path, message = "Projeto aberto.") {
  elements.projectSwitcher.open = false;
  try {
    const data = await apiFetch("/api/project/open", {
      method: "POST",
      body: { path }
    });
    await activateProjectData(data);
    await loadLocalProjects();
    showToast(message);
  } catch (error) {
    handleApiError(error);
    showToast(apiAvailable ? "Não foi possível abrir o projeto." : "Servidor local offline. Rode npm run serve.");
  }
}

function fileNameFromPath(path) {
  return String(path || "Projeto").split(/[\\/]/).pop() || "Projeto";
}

function readLayout(modelId) {
  try {
    const value = localStorage.getItem(storageKey(modelId)) || localStorage.getItem(`loopviewer:layout:v2:${modelId}`);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function preferredSavedLayout(entry) {
  const saved = readLayout(entry?.model?.id);
  if (!saved) return null;
  if (!apiAvailable) return saved;
  // Local-first recovery wins only when it is a deliberate authored save made
  // after the latest SQLite version. This prevents stale browser storage from
  // overriding a newer project while still protecting against network races.
  if (saved.layoutState !== "authored") return null;
  const localTime = Date.parse(saved.savedAt || "");
  const remoteTime = Date.parse(entry.updatedAt || "");
  return Number.isFinite(localTime) && (!Number.isFinite(remoteTime) || localTime >= remoteTime)
    ? saved
    : null;
}

function storageKey(modelId) {
  // v2 discards pre-metadata snapshots that cannot distinguish generated
  // geometry from an authored layout.
  return `trama:layout:v2:${modelId}`;
}

function showToast(message) {
  if (focusMode) return;
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 1600);
}

function setSaveStatus(state, message) {
  appCommands.setSaveStatus(state, message);
  if (!elements.saveStatus) return;
  elements.saveStatus.textContent = message;
  elements.saveStatus.classList.remove("saving", "saved", "error", "dirty");
  elements.saveStatus.classList.add(state);
  const path = project?.path ? ` em ${project.path}` : "";
  const detail = state === "error"
    ? `${lastSaveError?.message || "Falha desconhecida"}${path}`
    : `${message}${path}`;
  elements.savePopoverMessage.textContent = detail;
  elements.retrySave.hidden = state !== "error";
}

function toggleSavePopover(open) {
  const nextOpen = typeof open === "boolean" ? open : elements.savePopover.hidden;
  elements.savePopover.hidden = !nextOpen;
  return nextOpen;
}

function handleApiError(error) {
  if (isNetworkError(error)) {
    apiAvailable = false;
    lastSaveError = error;
    setSaveStatus("error", "Servidor offline");
    renderLocalProjects([]);
    return;
  }
  console.error(error);
}

function isNetworkError(error) {
  return error instanceof TypeError ||
    /Failed to fetch|NetworkError|Load failed/i.test(error?.message || "");
}

function downloadText(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderMarkdown(value = "") {
  return renderPresentationMarkdown(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function firstPlainLine(value = "") {
  return String(value)
    .replace(/[#*_>`-]/g, "")
    .split("\n")
    .map(line => line.trim())
    .find(Boolean) || "";
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let responsiveFitTimer = null;
window.addEventListener("resize", () => {
  window.clearTimeout(responsiveFitTimer);
  responsiveFitTimer = window.setTimeout(() => {
    if (storyMode && isContextualPresentationActive()) {
      engine.cy?.resize();
      schedulePresentationTooltipPosition({ immediate: true });
      return;
    }
    if (storyMode || !engine.cy || !["map", "explore", "story"].includes(workspaceMode)) return;
    engine.cy.resize();
    fitCanvas({ padding: workspaceMode === "story" ? 34 : 42, duration: 180 });
    engine.cy.forceRender?.();
  }, 180);
});

const tramaDemo = {
  engine,
  qa: qaRuntime,
  examples,
  selectModel,
  setEditing,
  setFocusMode,
  saveCurrentLayout,
  get workspace() { return workspace; },
  get activeIndex() { return activeIndex; }
};
window.tramaDemo = tramaDemo;
window.loopViewerDemo = tramaDemo;
window.__TRAMA_QA__ = qaRuntime;
window.__LOOPVIEWER_QA__ = qaRuntime;
