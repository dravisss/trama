import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizePresentation, validatePresentation } from "../src/presentation/schema.js";
import { movePresentationBeat, movePresentationBeatToScene } from "../src/presentation/editorOperations.js";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

function storyFixture() {
  return normalizePresentation({
    id: "qa-story",
    title: "QA Story",
    chapters: [{
      id: "chapter-1",
      title: "Apresentação",
      scenes: [
        {
          id: "scene-one",
          title: "Loop 1",
          beats: [
            { id: "beat-one", title: "Primeiro beat", type: "stage" },
            { id: "beat-two", title: "Segundo beat", type: "stage" }
          ]
        },
        {
          id: "scene-two",
          title: "Loop 2",
          beats: [{ id: "beat-three", title: "Terceiro beat", type: "stage" }]
        }
      ]
    }]
  });
}

test("Story Studio preserves the critical authoring surfaces", () => {
  const html = read("index.html");
  const app = read("src/app.js");
  const reactMain = read("src/react/main.jsx");
  const reactTimeline = read("src/react/storyTimeline.jsx");
  const reactMarkdown = read("src/react/loopMarkdown.jsx");
  const reactInspector = read("src/react/storyInspector.jsx");
  const reactStoryMarkdown = read("src/react/storyMarkdown.jsx");
  const reactRail = read("src/react/editorRail.jsx");
  const reactSidebar = read("src/react/workspaceSidebar.jsx");
  const reactDockPanels = read("src/react/editorDockPanels.jsx");
  const reactEditorInspector = read("src/react/editorInspector.jsx");
  const reactCanvasSurface = read("src/react/canvasSurface.jsx");
  const reactPresentation = read("src/react/presentationCard.jsx");
  const reactStoryFrame = read("src/react/storyStudioV2/storyStudioV2.jsx");
  const reactOverlays = read("src/react/overlaySurfaces.jsx");
  const storyStudioV2Css = read("src/react/storyStudioV2/storyStudioV2.css");
  const appStore = read("src/app/appStore.js");
  const appCommands = read("src/app/appCommands.js");
  const css = read("src/app/appShell.css");
  const director = read("src/presentation/director.js");
  const state = read("src/app/storyStudio/state.js");
  const commands = read("src/app/storyStudio/commands.js");
  const inspector = read("src/app/storyStudio/inspector.js");
  const domBridge = read("src/app/storyStudio/domBridge.js");
  const workspaceDomBridge = read("src/app/workspaceDomBridge.js");
  const explorePanel = read("src/app/explorePanel.js");
  const workspacePersistence = read("src/app/workspacePersistence.js");
  const applicationComposition = read("src/app/applicationComposition.js");

  assert.match(html, /id="react-story-timeline-shell-root"/);
  assert.match(html, /src\/react\/storyStudioV2\/storyStudioV2\.css/);
  const stageStart = html.indexOf('<section class="stage"');
  const overlayRoot = html.indexOf('id="react-overlay-root"');
  assert.ok(stageStart >= 0 && overlayRoot > stageStart, "React overlay root must live outside the hidden legacy stage");
  for (const transientId of ['loop-description-modal', 'command-dialog', 'edit-popover']) {
    assert.match(reactOverlays, new RegExp(`id="${transientId}"`), `${transientId} must be owned by the React overlay surface`);
  }
  assert.doesNotMatch(html, /id="story-outline-panel"/);
  assert.doesNotMatch(html, /id="story-view"|data-table-tab="story"/);
  assert.doesNotMatch(html, /story-inspector-advanced|story-inspector-focus-json|story-inspector-apply-advanced/);
  assert.doesNotMatch(html, /story-advanced-tools|dock-story-list|add-presentation-chapter/);
  assert.doesNotMatch(app, /renderStoryOutline|storyStudioFocus|story-outline/);
  assert.doesNotMatch(app, /renderStoryEditor|renderStoryEmptyState|storyView/);
  assert.doesNotMatch(app, /applyStoryInspectorAdvanced|storyInspectorMode/);
  assert.match(reactTimeline, /id="story-timeline-add-scene"/);
  assert.match(reactTimeline, /id="story-timeline-add-manual-scene"/);
  assert.doesNotMatch(html, /id="story-inspector-title"/);
  assert.doesNotMatch(html, /id="presentation-source-editor"/);

  assert.match(app, /focusPresentationBeat\(/);
  assert.match(app, /movePresentationBeatToSceneInStudio\(/);
  assert.match(app, /suggestNextCausalMovements\(/);
  assert.match(app, /applyMovementToBeat\(/);
  assert.match(app, /function focusForCurrentSelection/);
  assert.match(app, /const focusedViewport = safeRect[\s\S]*fitViewportToRect[\s\S]*focusedViewport/);
  assert.match(app, /function orderSelectedEdges/);
  assert.match(app, /movePresentationSceneInStudio\(/);
  assert.match(state, /createStoryStudioState/);
  assert.match(commands, /createStoryStudioCommandBus/);
  assert.match(inspector, /createStoryInspectorViewModel/);
  assert.match(app, /createStoryStudioCommandBus/);
  assert.match(app, /createStoryStudioDomBridge/);
  assert.match(domBridge, /export function createStoryStudioDomBridge/);
  assert.match(domBridge, /storyInspectorRemoveScene/);
  assert.match(domBridge, /storyTimelineAddManualScene/);
  assert.match(workspaceDomBridge, /export function createWorkspaceDomBridge/);
  assert.match(workspaceDomBridge, /importProjectBackup/);
  assert.match(workspaceDomBridge, /presentationLibrary/);
  assert.match(workspaceDomBridge, /selectProjectPresentation/);
  assert.match(workspaceDomBridge, /focusRelation/);
  assert.match(workspaceDomBridge, /openProjectPath/);
  assert.match(workspaceDomBridge, /startRouteDrag/);
  assert.doesNotMatch(workspaceDomBridge, /inspectorTabs/);
  assert.doesNotMatch(workspaceDomBridge, /openStoryStudio/);
  assert.doesNotMatch(workspaceDomBridge, /connectSelection/);
  assert.doesNotMatch(workspaceDomBridge, /duplicateSelectedNodes/);
  assert.doesNotMatch(workspaceDomBridge, /copySelectedNodeStyle/);
  assert.doesNotMatch(workspaceDomBridge, /editProjectMetadata/);
  assert.doesNotMatch(workspaceDomBridge, /modeButtons/);
  assert.doesNotMatch(explorePanel, /exploreWalkLoop\?\.addEventListener/);
  assert.doesNotMatch(explorePanel, /exploreShowMap\?\.addEventListener/);
  assert.match(app, /createApplicationComposition/);
  assert.match(applicationComposition, /createWorkspacePersistence/);
  assert.match(workspacePersistence, /saveQueues/);
  assert.match(workspacePersistence, /loadProject/);
  assert.doesNotMatch(app, /storyInspectorTitle\?\.addEventListener/);
  assert.doesNotMatch(app, /storyTimelineAddScene\?\.addEventListener/);
  assert.doesNotMatch(app, /elements\.loopList\.appendChild/);
  assert.doesNotMatch(app, /elements\.tabs\.appendChild/);
  assert.doesNotMatch(app, /newProjectDb\.addEventListener/);
  assert.doesNotMatch(app, /exploreDetailClose\?\.addEventListener/);
  assert.doesNotMatch(app, /presentationLibrary[\s\S]{0,300}button\.addEventListener/);
  assert.doesNotMatch(app, /connected-item[\s\S]{0,400}addEventListener/);
  assert.doesNotMatch(app, /localProjects[\s\S]{0,700}button\.addEventListener/);
  assert.doesNotMatch(app, /recentProjects[\s\S]{0,500}button\.addEventListener/);
  assert.doesNotMatch(app, /loopSourceEditor\.addEventListener/);
  assert.doesNotMatch(app, /src\/demo/);
  assert.match(app, /renderStoryTimeline\(\);\n  showToast\("Canvas focado no beat selecionado/);

  // React is the composition layer for the migrated shell/timeline. The
  // legacy bundle remains a domain adapter, so load order and mount points
  // are part of the public integration contract.
  assert.match(html, /id="react-root"/);
  assert.match(html, /id="react-story-timeline-shell-root"/);
  assert.match(reactDockPanels, /id="react-loop-markdown-root"/);
  assert.match(html, /id="react-editor-rail-root"/);
  assert.match(html, /id="react-workspace-sidebar-root"/);
  assert.match(html, /id="react-editor-dock-panels-root"/);
  assert.match(html, /id="react-editor-inspector-root"/);
  assert.match(html, /id="react-canvas-surface-root"/);
  assert.match(html, /id="react-presentation-root"/);
  assert.doesNotMatch(html, /id="react-explore-root"/);
  assert.match(html, /id="react-story-frame-root"/);
  assert.doesNotMatch(html, /data-dock-content="(?:inspect|map|code|style|table|history)"/);
  assert.match(reactDockPanels, /data-dock-content="map"/);
  assert.match(reactDockPanels, /data-dock-content="code"/);
  assert.match(reactEditorInspector, /data-dock-content="inspect"/);
  assert.doesNotMatch(html, /id="story-timeline-track"/);
  assert.match(html, /dist\/react-app\.iife\.js[\s\S]*dist\/app\.iife\.js/);
  assert.doesNotMatch(app, /from ["']\.\/react\/main\.jsx/);
  assert.match(app, /window\.TramaReact/);
  assert.match(app, /renderLoopBrowser/);
  assert.match(app, /renderMapSelector/);
  assert.match(app, /renderEditorInspector/);
  assert.match(app, /renderDataTable/);
  assert.match(app, /renderVersionHistory/);
  assert.match(app, /renderStyleBuilder/);
  assert.match(app, /function hydrateViewBuilder\(view\)[\s\S]*const actions = \{/);
  assert.match(app, /key: "empty"[\s\S]*actions \}\);/);
  assert.match(app, /renderViewSwitcher/);
  assert.doesNotMatch(app, /elements\.loopStyleEditor\.value/);
  assert.doesNotMatch(app, /elements\.loopStyleStatus/);
  assert.match(app, /createAppStore/);
  assert.match(app, /store: appStore/);
  assert.match(appStore, /export function createAppStore/);
  assert.match(appStore, /subscribe\(listener\)/);
  assert.match(appCommands, /export function createAppCommands/);
  assert.match(reactMain, /window\.TramaReact\s*=\s*runtime/);
  assert.match(reactTimeline, /data-beat-id=\{beat\.id\}/);
  assert.match(reactTimeline, /moveBeatToScene\(payload\.sceneId/);
  assert.match(reactTimeline, /export function StoryTimelineShell/);
  assert.match(reactTimeline, /iconButton\("Remover beat"/);
  assert.match(reactTimeline, /aria-current=\{active \? "step"/);
  assert.match(reactTimeline, /function usePointerDrag/);
  assert.match(reactTimeline, /document\.addEventListener\("pointermove"/);
  assert.match(css, /\.story-timeline-card-main\s*\{[\s\S]*position:\s*absolute[\s\S]*inset:\s*0/);
  assert.match(css, /\.story-timeline-card-handle\s*\{[\s\S]*position:\s*absolute/);
  assert.match(css, /min-height:\s*250px[\s\S]*story-timeline-track/);
  assert.match(css, /story-inspector-custom-duration-field\[hidden\][\s\S]*display:\s*none/);
  assert.match(director, /export function repairGeneratedPresentation/);
  assert.match(reactMarkdown, /id="loop-source-editor"/);
  assert.match(reactMarkdown, /id="apply-loop-source"/);
  assert.match(reactInspector, /id="story-inspector-source"/);
  assert.match(reactInspector, /id="story-inspector-remove-scene"/);
  assert.match(reactStoryMarkdown, /id="presentation-source-editor"/);
  assert.match(reactStoryMarkdown, /id="apply-presentation-source"/);
  assert.match(reactRail, /data-dock-panel=\{panel\}/);
  assert.match(reactRail, /id="close-editor-dock"/);
  assert.match(reactMain, /id="active-view-select"/);
  assert.match(reactSidebar, /export function WorkspaceSidebar\(\) \{ return null; \}/);
  assert.match(reactDockPanels, /function MapLoopBrowser/);
  assert.match(reactDockPanels, /id="loop-list"/);
  assert.match(reactDockPanels, /data-dock-content="style"/);
  assert.match(reactDockPanels, /id="react-style-builder-root"/);
  assert.match(reactDockPanels, /id="react-data-table-root"/);
  assert.match(reactDockPanels, /id="react-version-history-root"/);
  assert.match(reactDockPanels, /export function DataTablePanel/);
  assert.match(reactDockPanels, /export function VersionHistoryPanel/);
  assert.match(reactDockPanels, /export function StyleBuilderPanel/);
  assert.match(reactDockPanels, /id="data-table-wrap"/);
  assert.match(reactEditorInspector, /id="dock-inspector-form"/);
  assert.match(reactEditorInspector, /onSubmit/);
  assert.match(reactCanvasSurface, /id="cld-root"/);
  assert.match(reactCanvasSurface, /id="scenario-tabs"/);
  assert.match(reactCanvasSurface, /id="edit-toolbar"/);
  assert.match(reactPresentation, /id="presentation-card"/);
  assert.doesNotMatch(reactPresentation, /presentation-(?:explore|resume)/);
  assert.doesNotMatch(reactMain, /ExploreDetailPanel/);
  assert.match(reactStoryFrame, /id="generate-presentation"/);
  assert.match(reactStoryFrame, /id="story-inspector-basic"/);
  assert.match(reactStoryFrame, /id="react-story-inspector-root"/);
  assert.match(reactStoryFrame, /id="react-story-markdown-root"/);
  assert.match(reactStoryFrame, /role="tablist" aria-label="Editor da apresentação"/);
  assert.match(reactStoryFrame, /id="presentation-markdown-panel"/);
  assert.match(reactStoryFrame, /data-story-ui="v2"/);
  assert.match(storyStudioV2Css, /body:not\(\[data-ui-mode="story"\]\) #react-story-timeline-shell-root\s*\{[^}]*display:\s*none/);
  assert.match(storyStudioV2Css, /body\[data-ui-mode="story"\] #react-story-timeline-shell-root\s*\{[^}]*display:\s*block/);
  assert.match(storyStudioV2Css, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(storyStudioV2Css, /#presentation-markdown-panel > #react-story-markdown-root/);
  assert.match(storyStudioV2Css, /\.story-v2-header\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(storyStudioV2Css, /@media \(max-height:\s*800px\)/);

  // The timeline must remain a horizontal authoring surface and preserve the
  // visual affordance that cards can be dragged.
  assert.match(css, /\.story-timeline-track[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /\.story-timeline-card\s*\{[^}]*cursor:\s*grab/);
  assert.match(css, /\.story-timeline-scene\.is-drop-target/);
  assert.match(css, /\.story-timeline-card\.active[\s\S]*box-shadow/);
  assert.match(css, /\.story-timeline-title[\s\S]*-webkit-line-clamp:\s*2/);
  assert.match(css, /\.story-timeline-icon-button/);
  assert.match(css, /data-ui-mode="story"\]\[data-story-editor-mode="visual"\][\s\S]*grid-template-rows:\s*minmax\(0, 1fr\) 218px/);
  assert.match(css, /#story-timeline-shell\s*\{\s*display:\s*none/);
  assert.match(css, /#story-timeline-shell\s*\{\s*display:\s*grid/);
});

test("cross-scene beat movement is immutable, ordered and valid", () => {
  const original = storyFixture();
  const moved = movePresentationBeatToScene(original, "scene-one", "beat-one", "scene-two", 1);

  assert.notEqual(moved, original);
  assert.deepEqual(original.chapters[0].scenes[0].beats.map(beat => beat.id), ["beat-one", "beat-two"]);
  assert.deepEqual(original.chapters[0].scenes[1].beats.map(beat => beat.id), ["beat-three"]);
  assert.deepEqual(moved.chapters[0].scenes[0].beats.map(beat => beat.id), ["beat-two"]);
  assert.deepEqual(moved.chapters[0].scenes[1].beats.map(beat => beat.id), ["beat-three", "beat-one"]);
  assert.deepEqual(validatePresentation(moved), []);
});

test("same-scene beat reordering keeps the existing timeline semantics", () => {
  const original = storyFixture();
  const moved = movePresentationBeat(original, "scene-one", "beat-two", -1);

  assert.deepEqual(moved.chapters[0].scenes[0].beats.map(beat => beat.id), ["beat-two", "beat-one"]);
  assert.deepEqual(original.chapters[0].scenes[0].beats.map(beat => beat.id), ["beat-one", "beat-two"]);
  assert.deepEqual(validatePresentation(moved), []);
});

test("invalid cross-scene moves are safe no-ops", () => {
  const original = storyFixture();
  assert.equal(movePresentationBeatToScene(original, "missing", "beat-one", "scene-two"), original);
  assert.equal(movePresentationBeatToScene(original, "scene-one", "missing", "scene-two"), original);
  assert.equal(movePresentationBeatToScene(original, "scene-one", "beat-one", "missing"), original);
  assert.equal(movePresentationBeatToScene(original, "scene-one", "beat-one", "scene-one"), original);
});
