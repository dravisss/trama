import React, { useEffect } from "react";
import { Button } from "./ui/Button.jsx";
import { Icon, IconButton } from "./ui/Icon.jsx";
import { Input, Select } from "./ui/Field.jsx";
import { Tooltip } from "./ui/Overlay.jsx";

function MapSelector({ mapSelector = {} }) {
  return <nav className="loop-options" id="scenario-tabs" aria-label="Selecionar mapa">
    {(mapSelector.items || []).map(item => <Button
      className={`loop-option${item.active ? " active" : ""}`}
      title={item.title}
      aria-current={item.active ? "page" : "false"}
      key={item.id}
      onClick={() => mapSelector.onSelect?.(item.index)}
    >
      <span className="tab-title">{item.title}</span>
      <span className="tab-summary">{item.summary}</span>
      <span className={`tab-story ${item.storyCount ? "ready" : "empty"}`}>{item.storyCount ? `${item.storyCount} passos` : "sem story"}</span>
      <span className="tab-meta">{item.nodeCount} vars · {item.loopCount} ciclos</span>
    </Button>)}
  </nav>;
}

function CanvasSurfaceMarkup({ mapSelector = {}, canvasActions = {}, editorActions = {}, editorToolbar = {} }) {
  useEffect(() => {
    const host = document.querySelector("#cld-root");
    if (!host) return undefined;
    const mounts = Number(host.dataset.qaCanvasMounts || 0) + 1;
    host.dataset.qaCanvasMounts = String(mounts);
    return undefined;
  }, []);
  return (
    <>
      <div id="cld-root" />
      <div className="story-canvas-header" id="story-canvas-header" hidden>
        <span>Beat selecionado: <strong id="story-canvas-selection-title">Nenhum beat selecionado</strong></span>
        <small id="story-canvas-selection-meta">Selecione um beat na estrutura ou na timeline</small>
        <div className="story-canvas-actions">
          <Button id="story-refocus-current" size="sm" variant="quiet">Foco no beat</Button>
          <Button id="story-canvas-fullscreen" aria-label="Expandir canvas" title="Expandir canvas" size="icon" variant="quiet"><Icon name="external" /></Button>
        </div>
      </div>
      {/* These are imperative canvas affordances. They intentionally bypass
          the product Button primitive: Cytoscape positions them as empty
          overlay controls and their visual contract lives in styles.css. */}
      <Button unstyled className="route-handle" id="route-handle" aria-label="Arrastar curvatura da aresta" hidden />
      <Button unstyled className="connection-handle" id="connection-handle" aria-label="Arrastar para conectar variável" hidden />
      <div className="connection-preview" id="connection-preview" hidden />
      <Button className="focus-exit" id="focus-exit" onClick={() => canvasActions.onFocusExit?.()} hidden size="sm" variant="secondary">Sair do foco</Button>
      <div className="map-controls" aria-label="Controles do mapa">
        <Button id="canvas-center" onClick={() => canvasActions.onCenter?.()} size="sm" variant="quiet">Centralizar</Button>
        <Button id="canvas-zoom-out" onClick={() => canvasActions.onZoom?.(0.85)} size="icon" variant="quiet"><Icon name="minus" /></Button>
        <Button id="canvas-zoom-in" onClick={() => canvasActions.onZoom?.(1.18)} size="icon" variant="quiet"><Icon name="plus" /></Button>
        <Button id="canvas-fit" onClick={() => canvasActions.onFit?.()} size="sm" variant="quiet">Ver tudo</Button>
      </div>
      <div id="story-selection-bar" className="story-selection-bar" hidden aria-live="polite">
        <strong>Seleção narrativa</strong>
        <span id="story-selection-count">Clique nos elementos para compor o foco.</span>
        <Button id="story-selection-clear" hidden size="sm" variant="quiet">Limpar</Button>
        <Button id="story-selection-create" hidden size="sm" variant="primary">Criar beat com seleção</Button>
      </div>
      <div className="edit-toolbar" id="edit-toolbar" hidden={editorToolbar.visible !== true}>
        <div><strong>Modo edição</strong><span id="edit-selection">{editorToolbar.selectionText || "Selecione um nó para mover ou fixar"}</span></div>
        <details className="loop-select editor-loop-selector" id="loop-select">
          <summary><span id="active-loop-select-label">Selecionar mapa</span><small id="active-loop-select-meta">Projeto local</small></summary>
          <div className="loop-select-panel">
            <Input
              unstyled
              id="loop-filter"
              type="search"
              placeholder="Buscar mapa"
              aria-label="Buscar mapa"
              onInput={event => mapSelector.onFilter?.(event)}
            />
            <MapSelector mapSelector={mapSelector} />
            <div className="loop-select-actions">
              <Button className="sidebar-action compact" id="sidebar-new-loop" onClick={() => mapSelector.onCreate?.()} size="sm" variant="quiet">Novo mapa</Button>
              <Button className="sidebar-action compact" id="sidebar-duplicate-loop" onClick={() => mapSelector.onDuplicate?.()} size="sm" variant="quiet">Duplicar</Button>
              <Button className="sidebar-action compact danger" id="sidebar-delete-loop" onClick={() => mapSelector.onDelete?.()} size="sm" variant="danger">Remover</Button>
            </div>
          </div>
        </details>
        <Tooltip label="Adicionar variável"><IconButton id="add-node" className="edit-tool-icon" icon="plus" onClick={() => editorActions.onAddNode?.()} label="Adicionar variável" /></Tooltip>
        <details className="edit-toolbar-more"><summary aria-label="Mais ações de edição" title="Mais ações de edição"><Icon name="more" /><span className="toolbar-icon-tooltip" role="tooltip">Mais ações</span></summary><div className="edit-toolbar-more-panel">
          <Button id="connect-selection" onClick={() => editorActions.onConnectSelection?.()} size="sm" variant="quiet" disabled={editorToolbar.connectDisabled !== false}>{editorToolbar.connectLabel || "Conectar"}</Button>
          <Button id="save-layout" className={editorToolbar.saveAttention ? "attention" : ""} onClick={() => editorActions.onSaveLayout?.()} size="sm" variant="primary">{editorToolbar.saveLabel || "Salvar layout"}</Button>
          <Button id="lock-node" onClick={() => editorActions.onToggleNodeLock?.()} size="sm" variant="quiet" disabled={editorToolbar.lockDisabled !== false}>{editorToolbar.lockLabel || "Fixar nó"}</Button>
          <Button id="unlock-route" onClick={() => editorActions.onUnlockRoute?.()} size="sm" variant="quiet" disabled={editorToolbar.unlockRouteDisabled !== false}>Liberar rota</Button>
          <Button id="restore-layout" onClick={() => editorActions.onRestoreLayout?.()} size="sm" variant="quiet" disabled={editorToolbar.restoreDisabled !== false}>Restaurar salvo</Button>
          <Button id="reset-layout" onClick={() => editorActions.onResetLayout?.()} size="sm" variant="quiet">Resetar automático</Button>
          <Button id="duplicate-selection" onClick={() => editorActions.onDuplicateSelection?.()} size="sm" variant="quiet" disabled={editorToolbar.duplicateDisabled !== false}>Duplicar seleção</Button>
          <Button id="align-horizontal" onClick={() => editorActions.onAlignHorizontal?.()} size="sm" variant="quiet" disabled={editorToolbar.alignHorizontalDisabled !== false}>Alinhar horizontal</Button>
          <Button id="align-vertical" onClick={() => editorActions.onAlignVertical?.()} size="sm" variant="quiet" disabled={editorToolbar.alignVerticalDisabled !== false}>Alinhar vertical</Button>
          <Button id="copy-style" onClick={() => editorActions.onCopyStyle?.()} size="sm" variant="quiet" disabled={editorToolbar.copyStyleDisabled !== false}>Copiar estilo</Button>
          <Button id="paste-style" onClick={() => editorActions.onPasteStyle?.()} size="sm" variant="quiet" disabled={editorToolbar.pasteStyleDisabled !== false}>Colar estilo</Button>
          <div className="edit-toolbar-more-section" role="group" aria-label="Arquivo do mapa">
            <span>Arquivo do mapa</span>
            <Input unstyled id="import-json-file" type="file" accept="application/json,.json" hidden />
            <Button id="import-json" onClick={() => editorActions.onImportJson?.()} size="sm" variant="quiet">Importar JSON</Button>
            <Button id="export-json" onClick={() => editorActions.onExportJson?.()} size="sm" variant="quiet">Exportar JSON</Button>
            <Button id="export-standalone" onClick={() => editorActions.onExportStandalone?.()} size="sm" variant="quiet">Exportar HTML</Button>
            <label className="export-option"><Input unstyled id="export-with-sidebar" type="checkbox" defaultChecked /> Incluir sidebar</label>
            <Button id="relayout" onClick={() => editorActions.onRelayout?.()} size="sm" variant="quiet">Reorganizar</Button>
          </div>
          <label className="route-quality-label">Qualidade das rotas<Select unstyled id="route-quality" defaultValue="balanced" onChange={event => editorActions.onRouteQuality?.(event)}><option value="draft">Rascunho</option><option value="balanced">Equilibrado</option><option value="publish">Publicação</option></Select></label>
          <span className="route-performance" id="route-performance">Rota aguardando medição</span>
        </div></details>
      </div>
      <div className="legend" id="view-legend" aria-label="Legenda da view"><span><i className="legend-line" />Feedback positivo ++ / −−</span><span><i className="legend-line dashed" />Feedback negativo +− / −+</span></div>
      <div className="hint">Clique numa aresta para ler · explore loops R/B · use Editar para reorganizar</div>
      <div className="toast" id="toast" role="status" hidden />
    </>
  );
}

// Cytoscape and the workspace bridge own the mutable descendants of this
// surface (camera, toolbar state and handles). React owns the map selector's
// authored items and actions; unrelated composition updates must not reapply
// JSX defaults such as `hidden` while an imperative canvas command is active.
export const CanvasSurface = React.memo(CanvasSurfaceMarkup, (previous, next) => previous.mapSelector === next.mapSelector && previous.canvasActions === next.canvasActions && previous.editorActions === next.editorActions && previous.editorToolbar === next.editorToolbar);
