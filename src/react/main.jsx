import React from "react";
import { createRoot } from "react-dom/client";
import { createPortal, flushSync } from "react-dom";
import { LoopMarkdownPanel } from "./loopMarkdown.jsx";
import { EditorUtilityRail } from "./editorRail.jsx";
import { WorkspaceSidebar } from "./workspaceSidebar.jsx";
import { DataTablePanel, EditorDockPanels, StyleBuilderPanel, VersionHistoryPanel } from "./editorDockPanels.jsx";
import { EditorInspectorPanel } from "./editorInspector.jsx";
import { CanvasSurface } from "./canvasSurface.jsx";
import { PresentationCard } from "./presentationCard.jsx";
import { StoryFrame } from "./storyFrame.jsx";
import { StoryTimelineShell, mountReactStoryTimeline } from "./storyTimeline.jsx";
import { MovementComposerDialog } from "./movementComposer.jsx";
import { InspectorMovementVisual } from "./movementVisuals.jsx";
import { Button } from "./ui/Button.jsx";
import { Icon } from "./ui/Icon.jsx";
import { Input, Select } from "./ui/Field.jsx";
import { OverlaySurfaces } from "./overlaySurfaces.jsx";
import { WorkspaceView } from "./workspaceView.jsx";
import { deploymentCopy } from "../app/deploymentCopy.js";

const ICONS = {
  workspace: <Icon name="folder" />,
  map: <Icon name="map" />,
  story: <Icon name="book" />,
  present: <Icon name="presentation" />
};

const MODES = [
  ["workspace", "Projetos"],
  ["map", "Editor"],
  ["story", "História"],
  ["present", "Apresentar"]
];

function EditorViewControl({ viewSwitcher = {} }) {
  const options = [{ id: "", title: "Matcha padrão" }, ...(viewSwitcher.options || [])];
  return <div className="editor-title-view">
    <span>Vista do mapa</span>
    <Select id="active-view-select" aria-label="Vista do mapa" value={viewSwitcher.activeId || ""} onChange={event => viewSwitcher.onSelect?.(event.target.value)}>
      {options.map(option => <option value={option.id} key={option.id}>{option.title}</option>)}
    </Select>
    <details className="editor-title-view-actions">
      <summary aria-label="Gerenciar vistas"><Icon name="settings" size="sm" /></summary>
      <div>
        <Button type="button" id="new-view" onClick={() => viewSwitcher.onNew?.()} size="sm" variant="quiet">Nova vista</Button>
        <Button type="button" id="duplicate-view" disabled={!viewSwitcher.canManage} onClick={() => viewSwitcher.onDuplicate?.()} size="sm" variant="quiet">Duplicar</Button>
        <Button type="button" id="derive-view" disabled={!viewSwitcher.canManage} onClick={() => viewSwitcher.onDerive?.()} size="sm" variant="quiet">Derivar</Button>
        <Button type="button" id="delete-view" disabled={!viewSwitcher.canManage} onClick={() => viewSwitcher.onDelete?.()} size="sm" variant="danger">Remover</Button>
      </div>
    </details>
  </div>;
}

function EditorControlBar({ viewSwitcher, onAction, hydrating }) {
  return <div className="editor-control-bar" aria-label="Comandos do editor">
    <EditorViewControl viewSwitcher={viewSwitcher} />
    <div className="editor-control-actions">
      <Button className="icon-btn primary-action" id="present-toggle" disabled={hydrating} onClick={() => onAction?.("present")} size="sm" variant="primary">Apresentar</Button>
      <Button className="icon-btn" id="focus-toggle" disabled={hydrating} onClick={() => onAction?.("focus")} size="sm" variant="secondary" aria-pressed="false">Foco</Button>
      <Button className="icon-btn" id="edit-toggle" disabled={hydrating} onClick={() => onAction?.("edit")} size="sm" variant="secondary" aria-pressed="false">Concluir edição</Button>
      <Button className="icon-btn" id="fit" disabled={hydrating} onClick={() => onAction?.("fit")} size="sm" variant="secondary">Ajustar</Button>
    </div>
  </div>;
}

function ReactShell({ mode, view, callbacks, viewSwitcher, onModeChange, onAction }) {
  const projectTitle = view?.project?.title || "Trama Workspace";
  const activeMap = view?.maps?.find(item => item.active) || view?.maps?.[0];
  const workspaceHydrating = Boolean(view?.hydrating);
  return (
    <>
      <aside className="app-navigation react-app-navigation" aria-label="Navegação principal">
        <div className="app-navigation-brand">
          <span className="app-navigation-mark" aria-hidden="true" />
          <span>Trama</span>
        </div>
        <nav className="app-navigation-links" aria-label="Modos do aplicativo">
          {MODES.map(([value, label]) => (
            <Button
              key={value}
              data-react-ui-mode={value}
              className={mode === value ? "active" : ""}
              aria-pressed={mode === value}
              aria-label={label}
              disabled={workspaceHydrating && value !== "workspace"}
              onClick={() => onModeChange?.(value)}
              size="touch"
              variant="quiet"
            >
              <span className="app-nav-icon">{ICONS[value]}</span>
              <span>{label}</span>
            </Button>
          ))}
        </nav>
        <div className="app-navigation-foot">
          <span>{deploymentCopy().navFootTitle}</span>
          <small>{deploymentCopy().navFootText}</small>
        </div>
      </aside>
      <header className="topbar react-topbar">
        <div className="brand">
          <Button className="sidebar-toggle" id="sidebar-toggle" onClick={() => onAction?.("toggleSidebar")} aria-label="Fechar painel" aria-pressed="false" size="icon" variant="quiet"><Icon name="menu" /></Button>
          <Button className="story-exit-workspace" id="story-exit-workspace" onClick={() => onAction?.("exitStoryWorkspace")} aria-label="Voltar ao workspace" size="icon" variant="quiet"><Icon name="arrowLeft" /></Button>
          <div className="brand-mark" aria-hidden="true" />
          <div>
            {mode === "map" ? <><span className="mode-eyebrow">{deploymentCopy().editorEyebrow}</span><h1>Editor</h1><p>{modeSubtitle(mode)}</p></> : <><h1>{modeLabel(mode)}</h1><p>{modeSubtitle(mode)}</p></>}
          </div>
        </div>
        <div className="breadcrumb-shell">
          <details className="command-menu project-switcher" id="project-switcher">
            <summary aria-label={`Projeto ${projectTitle}: ações e arquivos`}><span id="active-project-label">Projeto: {projectTitle}</span><small id="active-loop-label">Mapa: {activeMap?.title || "Nenhum"}</small></summary>
            <div className="command-menu-panel project-menu-panel">
              <Button id="new-project-db" onClick={() => onAction?.("newProject")} size="sm" variant="quiet">Novo projeto</Button>
              <div className="local-projects" id="local-projects" />
              <Button id="open-project-db" onClick={() => onAction?.("openProject")} size="sm" variant="quiet">Abrir .db por caminho</Button>
              <Button id="edit-project-metadata" onClick={() => onAction?.("editProjectMetadata")} size="sm" variant="quiet">Editar projeto</Button>
              <Button id="export-project-backup" onClick={() => onAction?.("exportProjectBackup")} size="sm" variant="quiet">Backup completo .trama.json</Button>
              <Button id="import-project-backup" onClick={() => onAction?.("importProjectBackup")} size="sm" variant="quiet">Importar backup como novo projeto</Button>
              <Input unstyled id="project-backup-file" type="file" accept="application/json,.json,.trama.json,.loopviewer.json" hidden />
              <Button id="export-project-standalone" onClick={() => onAction?.("exportProjectStandalone")} size="sm" variant="quiet">Exportar projeto HTML</Button>
              <label className="export-option"><Input unstyled id="export-project-with-sidebar" type="checkbox" defaultChecked /> Incluir sidebar</label>
              <div className="recent-projects" id="recent-projects" />
            </div>
          </details>
          <Button className="save-status saved" id="save-status" aria-live="polite" size="sm" variant="quiet">Salvo</Button>
          <div className="save-popover" id="save-popover" hidden>
            <strong>Status do projeto</strong>
            <p id="save-popover-message">Tudo salvo.</p>
            <Button id="retry-save" size="sm" variant="secondary">Tentar novamente</Button>
          </div>
        </div>
        {mode === "map" ? null : <div className="actions command-bar">
          <Button className="icon-btn primary-action" id="present-toggle" disabled={workspaceHydrating} onClick={() => onAction?.("present")} size="sm" variant="primary">Apresentar</Button>
          <Button className="icon-btn" id="focus-toggle" disabled={workspaceHydrating} onClick={() => onAction?.("focus")} size="sm" variant="secondary" aria-pressed="false">Foco</Button>
          <Button className="icon-btn" id="edit-toggle" disabled={workspaceHydrating} onClick={() => onAction?.("edit")} size="sm" variant="secondary" aria-pressed="false">Editar</Button>
          <Button className="icon-btn" id="fit" disabled={workspaceHydrating} onClick={() => onAction?.("fit")} size="sm" variant="secondary">Ajustar</Button>
        </div>}
      </header>
      {mode === "map" ? <EditorControlBar viewSwitcher={viewSwitcher} onAction={onAction} hydrating={workspaceHydrating} /> : null}
    </>
  );
}

function modeLabel(mode) { return MODES.find(([value]) => value === mode)?.[1] || "Trama"; }
function modeSubtitle(mode) {
  return ({ workspace: "Organize os mapas sistêmicos do seu workspace local", map: "Edite o canvas, os dados e a fonte Markdown em um só lugar", story: "Transforme o mapa em uma narrativa causal editável", present: "Conduza a história sem perder o contexto do sistema" })[mode] || "";
}

function AppComposition({ state, targets, onModeChange, onAction }) {
  const portal = (target, child, key) => target ? createPortal(child, target, key) : null;
  return <>
    <ReactShell {...state.shell} onModeChange={onModeChange} onAction={onAction} />
    {portal(targets.workspace, <WorkspaceView view={state.shell.view} callbacks={state.shell.callbacks} />, "workspace")}
    {portal(targets.editorRail, <EditorUtilityRail activePanel={state.activeDockPanel} {...state.editorDockActions} />, "editor-rail")}
    {portal(targets.workspaceSidebar, <WorkspaceSidebar />, "workspace-sidebar")}
    {portal(targets.editorDockPanels, <EditorDockPanels
      loopBrowser={state.loopBrowser}
      dataTable={state.dataTable}
      versionHistory={state.versionHistory}
      styleBuilder={state.styleBuilder}
      actions={{ map: state.editorDockActions, dataTable: state.dataTable, versionHistory: state.versionHistory, styleBuilder: state.styleBuilder.actions }}
    />, "editor-dock-panels")}
    {portal(targets.editorInspector, <EditorInspectorPanel inspector={state.editorInspector} onSubmit={event => state.editorInspector.onSubmit?.(event)} />, "editor-inspector")}
    {portal(targets.canvasSurface, <CanvasSurface mapSelector={state.mapSelector} canvasActions={state.canvasActions} editorActions={state.editorActions} editorToolbar={state.editorToolbar} />, "canvas")}
    {portal(targets.presentation, <PresentationCard actions={state.presentationActions} />, "presentation")}
    {portal(targets.storyFrame, <StoryFrame movementInspector={state.movementInspector} />, "story-frame")}
    {portal(targets.storyTimeline, <StoryTimelineShell {...state.storyTimeline} />, "story-timeline")}
    {portal(targets.movementComposer, <MovementComposerDialog key={state.movementComposer.sessionId} {...state.movementComposer} onSubmit={draft => state.movementComposer.onSubmit?.(draft)} onCancel={() => state.movementComposer.onCancel?.()} />, "movement-composer")}
    {portal(targets.overlay, <OverlaySurfaces />, "overlays")}
  </>;
}

export function mountReactApp({ shellRoot, workspaceRoot, onModeChange, onAction, store } = {}) {
  if (!shellRoot || !workspaceRoot) return { render() {}, setMode() {} };
  let fallbackState = {
    mode: "workspace",
    // The shell mounts before app.js finishes loading the persisted project.
    // Keep that first composition explicitly non-actionable rather than
    // flashing an empty project card that looks ready to open.
    view: { hydrating: true },
    callbacks: {},
    composition: {
      loopBrowser: { summary: "", loops: [], editing: false, activeLoopId: null },
      mapSelector: { items: [] },
      canvasActions: {},
      editorActions: {},
      editorToolbar: { visible: false, selectionText: "Selecione um nó para mover ou fixar" },
      editorDockActions: {},
      presentationActions: {},
      viewSwitcher: { options: [], activeId: "", currentTitle: "Matcha padrão", canManage: false },
      editorInspector: { nodeIds: [], node: null, edge: null, help: "Selecione uma variável ou relação no canvas." },
      dataTable: { activeTab: "nodes", columns: [], rows: [] },
      versionHistory: { message: "Carregando versões...", versions: [], kind: "loop" },
      styleBuilder: { values: {}, editorValue: "", status: "Vista válida" },
      movementComposer: { open: false, sessionId: 0 },
      movementInspector: { kind: "generic", label: "Foco semântico", model: {} },
      storyTimeline: { status: "Nenhum movimento selecionado", time: "00:00", currentIndex: -1, totalFrames: 0, presentation: {}, timeline: [], getBeatTitle: () => "Sem título", actions: {} }
    }
  };
  // The workspace section used to be independently rendered. Clear only its
  // transitional children before the single root starts owning its portal.
  workspaceRoot.replaceChildren();
  const targets = {
    workspace: workspaceRoot,
    editorRail: document.querySelector("#react-editor-rail-root"),
    workspaceSidebar: document.querySelector("#react-workspace-sidebar-root"),
    editorDockPanels: document.querySelector("#react-editor-dock-panels-root"),
    editorInspector: document.querySelector("#react-editor-inspector-root"),
    canvasSurface: document.querySelector("#react-canvas-surface-root"),
    presentation: document.querySelector("#react-presentation-root"),
    storyFrame: document.querySelector("#react-story-frame-root"),
    storyTimeline: document.querySelector("#react-story-timeline-shell-root"),
    movementComposer: document.querySelector("#react-movement-composer-root"),
    overlay: document.querySelector("#react-overlay-root")
  };
  const rootController = createRoot(shellRoot);
  let firstRender = true;
  const renderComposition = () => {
    const snapshot = store?.getSnapshot?.() || store?.getState?.() || fallbackState;
    const composition = snapshot.composition || fallbackState.composition;
    const state = {
      activeDockPanel: snapshot.activeDockPanel || "map",
      shell: {
        mode: snapshot.mode || "workspace",
        view: snapshot.view || {},
        callbacks: snapshot.callbacks || {},
        viewSwitcher: composition.viewSwitcher
      },
      ...composition
    };
    const element = <AppComposition state={state} targets={targets} onModeChange={onModeChange} onAction={onAction} />;
    if (firstRender) {
      firstRender = false;
      // Bootstrap is the only synchronous render. app.js immediately queries
      // the compatibility IDs to install its disposable DOM bridges; every
      // subsequent composition update follows React's normal async path.
      flushSync(() => rootController.render(element));
    } else rootController.render(element);
  };
  const unsubscribe = store?.subscribe?.(() => renderComposition());
  const render = ({ view = {}, callbacks = {} } = {}) => {
    if (store?.setState) {
      store.setState({ view, callbacks }, { type: "SET_SHELL_VIEW" });
      return;
    }
    fallbackState = { ...fallbackState, view, callbacks };
    renderComposition();
  };
  const setMode = mode => {
    if (store?.dispatch) {
      store.dispatch({ type: "SET_MODE", payload: { mode } });
      return;
    }
    fallbackState = { ...fallbackState, mode };
    renderComposition();
  };
  document.body.classList.add("react-shell-ready");
  render();
  const updateComposition = (key, next = {}) => {
    const current = store?.getState?.().composition || fallbackState.composition;
    const value = { ...(current[key] || {}), ...next };
    if (store?.setState) {
      store.setState({ composition: { ...current, [key]: value } }, { type: "SET_COMPOSITION", payload: { key } });
      return;
    }
    fallbackState = { ...fallbackState, composition: { ...current, [key]: value } };
    renderComposition();
  };
  // These names remain as a narrow adapter contract for app.js. The state
  // they publish is now observable through AppStore; no panel owns a private
  // mutable render snapshot inside the React mount.
  const renderTimelineShell = next => updateComposition("storyTimeline", next);
  const renderLoopBrowser = next => updateComposition("loopBrowser", next);
  const renderMapSelector = next => updateComposition("mapSelector", next);
  const renderCanvasActions = next => updateComposition("canvasActions", next);
  const renderEditorActions = next => updateComposition("editorActions", next);
  const renderEditorToolbar = next => updateComposition("editorToolbar", next);
  const renderEditorDockActions = next => updateComposition("editorDockActions", next);
  const renderPresentationActions = next => updateComposition("presentationActions", next);
  const renderEditorInspector = next => updateComposition("editorInspector", next);
  const renderViewSwitcher = next => updateComposition("viewSwitcher", next);
  const renderDataTable = next => updateComposition("dataTable", next);
  const renderVersionHistory = next => updateComposition("versionHistory", next);
  const renderStyleBuilder = next => updateComposition("styleBuilder", next);
  const renderMovementComposer = next => updateComposition("movementComposer", next);
  const renderMovementInspector = next => updateComposition("movementInspector", next);
  return { render, setMode, renderTimelineShell, renderLoopBrowser, renderViewSwitcher, renderMapSelector, renderCanvasActions, renderEditorActions, renderEditorToolbar, renderEditorDockActions, renderPresentationActions, renderEditorInspector, renderDataTable, renderVersionHistory, renderStyleBuilder, renderMovementComposer, renderMovementInspector, destroy: () => { unsubscribe?.(); rootController.unmount(); } };
}

export { mountReactStoryTimeline };

if (typeof window !== "undefined") {
  const runtime = { mountReactApp, mountReactStoryTimeline };
  window.TramaReact = runtime;
  window.LoopViewerReact = runtime;
}
