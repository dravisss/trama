import React from "react";
import { Button } from "./ui/Button.jsx";
import { Icon, IconButton } from "./ui/Icon.jsx";
import { Checkbox, ColorField, Input, Select, Textarea } from "./ui/Field.jsx";
import { LineNumberedTextarea } from "./ui/CodeEditor.jsx";
import { Tooltip } from "./ui/Overlay.jsx";
import { LoopMarkdownPanel } from "./loopMarkdown.jsx";
import { designSystemDefaults } from "../design-system/tokens.js";

const DEFAULT_STYLE_SOURCE = `@view "Matcha"

@settings {
  background: ${designSystemDefaults.editorCanvas};
}

variable {
  shape: ellipse;
  font-size: 11;
}`;

function TableCell({ column, value, row, onChange }) {
  if (column.kind === "signs") {
    return <Select unstyled aria-label={column.label} defaultValue={value} onChange={event => onChange?.(row.id, column.key, event.target.value)}>
      <option value="++">++</option><option value="+−">+−</option><option value="−+">−+</option><option value="−−">−−</option>
    </Select>;
  }
  if (column.kind === "text") return <span>{value}</span>;
  return <Input unstyled className={column.multiline ? "table-description" : ""} aria-label={column.label} defaultValue={value ?? ""} onChange={event => onChange?.(row.id, column.key, event.target.value)} />;
}

export function DataTablePanel({ table = {}, onTabChange, onChange }) {
  const tabs = [["nodes", "Variáveis"], ["edges", "Relações"], ["loops", "Loops"]];
  return <div className="react-data-table-panel">
    <div className="table-tabs" role="tablist" aria-label="Dados do mapa">
      {tabs.map(([value, label]) => <Button unstyled type="button" role="tab" aria-selected={table.activeTab === value} className={table.activeTab === value ? "active" : ""} data-table-tab={value} key={value} onClick={() => onTabChange?.(value)}>{label}</Button>)}
    </div>
    <div className="data-table-wrap" id="data-table-wrap">
      {table.rows?.length ? <table className="data-table">
        <thead><tr>{(table.columns || []).map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{table.rows.map(row => <tr key={row.id}>{(table.columns || []).map(column => <td key={column.key}><TableCell column={column} value={row[column.key]} row={row} onChange={onChange} /></td>)}</tr>)}</tbody>
      </table> : <p className="dock-help">Nenhum registro disponível.</p>}
    </div>
  </div>;
}

export function VersionHistoryPanel({ history = {}, onRestore }) {
  return <div id="version-list" className="version-list">
    {history.message ? <p className="dock-help">{history.message}</p> : null}
    {!history.message && !(history.versions || []).length ? <p className="dock-help">Nenhuma versão anterior ainda.</p> : null}
    {(history.versions || []).map((version, index) => <div className="version-item" key={version.id}>
      <strong>{history.kind === "presentation" ? `História · versão ${(history.versions || []).length - index}` : `Versão ${(history.versions || []).length - index}`}</strong>
      <small>{history.kind === "presentation" ? `${version.reason || "autosave"} · ` : ""}{new Date(version.created_at).toLocaleString("pt-BR")}</small>
      <Button unstyled type="button" onClick={() => onRestore?.(version.id)}>{history.kind === "presentation" ? "Restaurar história" : "Restaurar"}</Button>
    </div>)}
  </div>;
}

export function StyleBuilderPanel({ styleBuilder = {}, actions = {} }) {
  const values = styleBuilder.values || {};
  return <div className="react-style-builder">
    <header className="style-builder-heading">
      <span>Direção visual</span>
      <h3>Construa uma vista editorial</h3>
      <p>Defina a linguagem do mapa; as regras abaixo não alteram seus dados.</p>
    </header>
    <label>Direção visual<Select unstyled id="view-style-preset" value={values.presetId || "matcha-executive"} onChange={event => actions.onPresetChange?.(event.target.value)}>
      {(values.presetOptions || []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </Select></label>
    <small className="dock-help style-preset-intent">{(values.presetOptions || []).find(option => option.value === (values.presetId || "matcha-executive"))?.description || "Escolha uma direção editorial."}</small>
    <div className="code-file-actions"><Button unstyled type="button" id="export-loop-style" onClick={() => actions.onExport?.()}>Exportar .loop.css</Button><Button unstyled type="button" id="save-loop-style" onClick={() => actions.onSave?.()}>Salvar estilo</Button></div>
    <div className="view-builder">
      <div className="dock-field-grid">
        <ColorField id="view-canvas-color" label="Canvas" defaultValue={values.canvasColor || designSystemDefaults.editorCanvas} onInput={() => actions.onChange?.()} />
        <label>Forma<Select unstyled id="view-node-shape" defaultValue={values.nodeShape || "ellipse"} onChange={() => actions.onChange?.()}><option value="ellipse">Círculo</option><option value="round-rectangle">Retângulo</option><option value="diamond">Losango</option><option value="hexagon">Hexágono</option></Select></label>
      </div>
      <div className="dock-field-grid">
        <ColorField id="view-node-color" label="Nó" defaultValue={values.nodeColor || designSystemDefaults.editorNodeFill} onInput={() => actions.onChange?.()} />
        <label>Tamanho<Input unstyled id="view-node-size" type="number" defaultValue={values.nodeSize || 72} min="28" max="240" onInput={() => actions.onChange?.()} /></label>
      </div>
      <Checkbox id="view-node-media" label="Mostrar imagens anexadas nos nós" defaultChecked={values.nodeMedia !== false} onChange={() => actions.onChange?.()} />
      <Checkbox id="view-loop-badges" label="Mostrar badges dos loops (experimental)" defaultChecked={values.loopBadges === true} onChange={() => actions.onChange?.()} />
      <div className="sidebar-section-title">Anotações</div>
      <Checkbox id="view-show-polarities" label="Mostrar polaridades nas relações" defaultChecked={values.showPolarities !== false} onChange={() => actions.onChange?.()} />
      <div className="dock-field-grid">
        <label>Fonte<Input unstyled id="view-font-size" type="number" defaultValue={values.fontSize || 11} min="7" max="48" onInput={() => actions.onChange?.()} /></label>
        <ColorField id="view-edge-color" label="Relação" defaultValue={values.edgeColor || designSystemDefaults.editorRelation} onInput={() => actions.onChange?.()} />
      </div>
      <div className="dock-field-grid">
        <label>Espessura<Input unstyled id="view-edge-width" type="number" defaultValue={values.edgeWidth || 2} min="1" max="12" step="0.5" onInput={() => actions.onChange?.()} /></label>
        <label>Traço<Select unstyled id="view-edge-style" defaultValue={values.edgeStyle || "solid"} onChange={() => actions.onChange?.()}><option value="solid">Contínuo</option><option value="dashed">Tracejado</option><option value="dotted">Pontilhado</option></Select></label>
      </div>
      <label>Terminal<Select unstyled id="view-edge-arrow" defaultValue={values.edgeArrow || "triangle-backcurve"} onChange={() => actions.onChange?.()}><option value="triangle-backcurve">Triângulo editorial</option><option value="chevron">Chevron aberto</option><option value="vee">Vee técnico</option><option value="triangle">Triângulo clássico</option><option value="circle">Círculo</option></Select></label>
      <Button unstyled type="button" id="sync-view-builder" onClick={() => actions.onSync?.()}>Gerar regras visuais</Button>
    </div>
    <div className="rule-builder">
      <div className="sidebar-section-title">Filtro / destaque</div>
      <div className="dock-field-grid">
        <label>Objeto<Select unstyled id="rule-object" defaultValue="variable"><option value="variable">Variável</option><option value="relation">Relação</option></Select></label>
        <label>Campo<Select unstyled id="rule-attribute" defaultValue="tag"><option value="tag">Tag</option><option value="field">Campo customizado</option><option value="type">Tipo</option><option value="id">ID</option></Select></label>
      </div>
      <label>Valor<Input unstyled id="rule-value" placeholder="risk, balancing, id..." /></label>
      <div className="dock-field-grid">
        <label>Ação<Select unstyled id="rule-action" defaultValue="highlight"><option value="highlight">Destacar</option><option value="hide">Ocultar</option><option value="show">Mostrar</option></Select></label>
        <label>Legenda<Input unstyled id="rule-legend" placeholder="Riscos" /></label>
      </div>
      <Button unstyled type="button" id="add-view-rule" onClick={() => actions.onAddRule?.()}>Adicionar regra</Button>
    </div>
    <label className="sr-only" htmlFor="loop-style-editor">Código visual CSS-like</label>
    <div className={`dock-status${styleBuilder.error ? " error" : ""}`} id="loop-style-status" role="status" aria-live="polite">{styleBuilder.status || "Vista válida"}</div>
    <LineNumberedTextarea id="loop-style-editor" label="Código visual CSS-like" defaultValue={styleBuilder.editorValue || DEFAULT_STYLE_SOURCE} />
    <Button unstyled type="button" className="dock-primary" id="apply-loop-style" disabled={Boolean(styleBuilder.error)} onClick={() => actions.onApply?.()}>Aplicar prévia</Button>
  </div>;
}

function MapLoopBrowser({ loopBrowser = {} }) {
  const loops = loopBrowser.loops || [];
  return <section className="editor-map-loops" aria-labelledby="editor-cycles-title">
    <div className="editor-map-loops-heading">
      <div>
        <span className="dock-eyebrow">Estruturas encontradas</span>
        <h3 id="editor-cycles-title">Circuitos do mapa</h3>
      </div>
      <span className="editor-map-loop-count">{loops.length} {loops.length === 1 ? "ciclo" : "ciclos"}</span>
    </div>
    <p id="loop-summary" className="editor-map-loop-summary">{loopBrowser.summary || "Nenhum ciclo encontrado"}</p>
    <div className="editor-map-loop-list" id="loop-list">
      {loops.map(loop => <Button
        type="button"
        className={`editor-map-loop-card ${loop.type}${loop.active ? " active" : ""}${loop.visual?.highlight ? " view-highlight" : ""}`}
        unstyled
        data-loop-id={loop.id}
        key={loop.id}
        aria-pressed={Boolean(loop.active)}
        onClick={() => loopBrowser.onFocusLoop?.(loop.id)}
      >
        <strong className="loop-badge" style={{ ...(loop.visual?.badgeFill || loop.visual?.fill ? { background: loop.visual.badgeFill || loop.visual.fill } : {}), ...(loop.visual?.badgeColor || loop.visual?.color ? { color: loop.visual.badgeColor || loop.visual.color } : {}) }}>{loop.label}</strong>
        <span className="editor-map-loop-copy"><b title={loop.path}>{loop.title || loop.path || "Ciclo sem título editorial"}</b><small>{loop.edgeCount} {loop.edgeCount === 1 ? "relação" : "relações"} · {loop.type === "balancing" ? "balanceamento" : "reforço"} · {loop.published ? "curado" : "encontrado"}</small></span>
        <Icon name="chevronDown" size="sm" className="editor-map-loop-open" />
      </Button>)}
    </div>
    {!loops.length ? <p className="editor-map-loop-empty">O mapa ainda não contém ciclos dirigidos identificáveis.</p> : null}
  </section>;
}

export function EditorDockPanels({ loopBrowser = {}, dataTable = {}, versionHistory = {}, styleBuilder = {}, actions = {} } = {}) {
  return (
    <>
      <section data-dock-content="map" hidden>
        <section className="project-overview editor-map-overview">
          <div className="project-overview-head">
            <div>
              <div className="eyebrow" id="scenario-eyebrow" />
              <h2 id="scenario-title" />
            </div>
            <div className="loop-actions">
              <Tooltip label="Renomear mapa"><IconButton id="rename-loop" icon="edit" onClick={() => actions.map?.onRename?.()} type="button" className="icon-btn-tip" aria-label="Renomear mapa" /></Tooltip>
              <Tooltip label="Editar descrição"><IconButton id="edit-loop-description" icon="book" onClick={() => actions.map?.onEditDescription?.()} type="button" className="icon-btn-tip" aria-label="Editar descrição" /></Tooltip>
            </div>
          </div>
          <div className="markdown-view" id="scenario-description" tabIndex={0} />
        </section>
        <MapLoopBrowser loopBrowser={loopBrowser} />
        <div className="editor-map-tip"><Icon name="sparkles" /><p><strong>Organização do mapa</strong>Os ciclos ficam aqui para leitura e seleção; a autoria narrativa continua no Story Studio.</p></div>
      </section>

      <section data-dock-content="style" hidden>
        <div id="react-style-builder-root"><StyleBuilderPanel key={styleBuilder.key || "style-builder"} styleBuilder={styleBuilder} actions={actions.styleBuilder || {}} /></div>
      </section>

      <section data-dock-content="table" hidden>
        <p className="dock-help">Edite variáveis e relações em lote. Alterações são aplicadas diretamente ao mapa.</p>
        <div id="react-data-table-root"><DataTablePanel table={dataTable} onTabChange={tab => actions.dataTable?.onTabChange?.(tab)} onChange={(id, field, value) => actions.dataTable?.onChange?.(id, field, value)} /></div>
      </section>

      <section data-dock-content="code" hidden>
        <div id="react-loop-markdown-root"><LoopMarkdownPanel /></div>
      </section>

      <section data-dock-content="history" hidden>
        <p className="dock-help">Snapshots automáticos anteriores deste mapa. Restaurar cria primeiro uma versão do estado atual.</p>
        <div id="react-version-history-root"><VersionHistoryPanel history={versionHistory} onRestore={versionId => actions.versionHistory?.onRestore?.(versionId)} /></div>
      </section>
    </>
  );
}
