import React, { useEffect, useState } from "react";
import { Button } from "./ui/Button.jsx";
import { Input, Select, Textarea } from "./ui/Field.jsx";
import { Icon } from "./ui/Icon.jsx";
import { designSystemDefaults } from "../design-system/tokens.js";

function colorValue(value, fallback) {
  return /^#[0-9a-f]{3,8}$/i.test(String(value || "")) ? value : fallback;
}

function CustomFields({ fields = {} }) {
  const [rows, setRows] = useState(() => Object.entries(fields).map(([key, value], index) => ({ id: `${key}-${index}`, key, value })));

  useEffect(() => {
    setRows(Object.entries(fields || {}).map(([key, value], index) => ({ id: `${key}-${index}`, key, value })));
  }, [JSON.stringify(fields)]);

  const updateRow = (id, patch) => setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  const removeRow = id => setRows(current => current.filter(row => row.id !== id));
  const addRow = () => setRows(current => [...current, { id: `new-${Date.now()}-${current.length}`, key: "", value: "" }]);

  return <div className="custom-fields-editor" id="dock-custom-fields">
    <div className="sidebar-section-title">Campos personalizados</div>
    <div id="custom-field-rows">
      {rows.map(row => <div className="custom-field-row" data-field-row="true" key={row.id}>
        <Input unstyled placeholder="campo" aria-label="Nome do campo" name="field-key" data-field-key="true" value={row.key} onChange={event => updateRow(row.id, { key: event.target.value })} />
        <Input unstyled placeholder="valor" aria-label="Valor do campo" name="field-value" data-field-value="true" value={row.value} onChange={event => updateRow(row.id, { value: event.target.value })} />
        <Button unstyled type="button" aria-label={`Remover campo ${row.key || "sem nome"}`} onClick={() => removeRow(row.id)}><Icon name="close" size="sm" /></Button>
      </div>)}
    </div>
    <Button unstyled type="button" id="add-custom-field" onClick={addRow}><Icon name="plus" size="sm" /> Campo</Button>
  </div>;
}

/** React-owned map inspector. The adapter provides a serializable selection
 * view-model and a submit command; React owns form state and field lifecycle. */
export function EditorInspectorPanel({ inspector = {}, onSubmit } = {}) {
  const node = inspector.node;
  const edge = inspector.edge;
  const hasSelection = Boolean(node || edge);
  const nodeIds = inspector.nodeIds || [];
  const key = inspector.key || "empty";
  const selectedTitle = node?.label || edge?.description || inspector.selectionLabel || "Elemento do mapa";
  const selectedType = node ? `Variável${node.id ? ` · ${node.id}` : ""}` : edge ? "Relação causal" : "Detalhes";
  return <section data-dock-content="inspect" className="editor-inspector-panel" hidden={false} key={key}>
    <p className="dock-help" id="dock-inspect-help" hidden>{inspector.help || "Selecione uma variável ou relação no mapa."}</p>
    <div className="ui-empty-state editor-inspector-empty" hidden={hasSelection}>
      <span className="ui-empty-state-icon" aria-hidden="true"><Icon name="focus" /></span>
      <strong>Selecione uma variável ou uma relação</strong>
      <p>O mapa continua sendo o lugar mais rápido para editar. Escolha um elemento para abrir seus campos aqui.</p>
      <div className="editor-inspector-hints"><span><b>Nó</b> nome, forma e estilo</span><span><b>Relação</b> sinais e explicação causal</span></div>
    </div>
    <form id="dock-inspector-form" hidden={!hasSelection} onSubmit={event => { event.preventDefault(); onSubmit?.(event); }}>
      <header className="editor-inspector-heading">
        <span>{selectedType}</span>
        <h3>{selectedTitle}</h3>
        <p>As alterações ficam pendentes até serem aplicadas ao mapa.</p>
      </header>
      <div className="selection-pill" id="dock-selection-count">{inspector.selectionLabel || ""}</div>
      <label id="dock-label-field" hidden={!node || nodeIds.length > 1}>Nome<Input unstyled id="dock-element-label" name="label" autoComplete="off" defaultValue={node?.label || ""} /></label>
      <div id="dock-node-fields" hidden={!node}>
        <div className="dock-field-grid">
          <label>Forma<Select unstyled id="dock-node-shape" name="shape" defaultValue={node?.style?.shape || "ellipse"} onChange={event => inspector.onShapeChange?.(nodeIds, event.target.value)}><option value="ellipse">Círculo</option><option value="round-rectangle">Retângulo</option><option value="diamond">Losango</option><option value="hexagon">Hexágono</option></Select></label>
          <label>Tamanho<Input unstyled id="dock-node-size" name="size" type="number" min="28" max="240" step="2" defaultValue={node?.style?.size || 72} /></label>
        </div>
        <div className="dock-field-grid">
          <label>Preenchimento<Input unstyled id="dock-node-fill" name="fill" type="color" defaultValue={colorValue(node?.style?.fill, designSystemDefaults.editorNodeFill)} /></label>
          <label>Texto<Input unstyled id="dock-node-text-color" name="textColor" type="color" defaultValue={colorValue(node?.style?.textColor, designSystemDefaults.editorNodeText)} /></label>
        </div>
        <div className="dock-field-grid">
          <label>Fonte<Input unstyled id="dock-node-font-size" name="fontSize" type="number" min="7" max="48" defaultValue={node?.style?.fontSize || 11} /></label>
          <label>Posição<Select unstyled id="dock-node-lock" name="locked" defaultValue="keep"><option value="keep">Manter</option><option value="true">Fixar</option><option value="false">Liberar</option></Select></label>
        </div>
        <div className="node-media-editor" id="dock-node-media">
          <div className="sidebar-section-title">Imagem da variável</div>
          <label>Arquivo<Input unstyled id="dock-node-image" name="nodeImage" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={nodeIds.length !== 1} onChange={event => {
            const file = event.target.files?.[0];
            if (file) inspector.onMediaUpload?.(nodeIds[0], file);
            event.target.value = "";
          }} /></label>
          <small className="dock-help">{node?.media?.assetId ? `Ativa · ${inspector.mediaFilename || node.media.assetId}` : "Opcional · 112 px, crop circular e label abaixo."}</small>
          <div className="dock-field-grid">
            <label>Texto alternativo<Input unstyled name="altText" type="text" defaultValue={node?.media?.altText || ""} placeholder="Descreva a imagem" /></label>
            <label>Enquadramento<Select unstyled name="fit" defaultValue={node?.media?.fit || "cover"}><option value="cover">Preencher</option><option value="contain">Conter</option></Select></label>
          </div>
          {node?.media?.assetId ? <Button unstyled type="button" className="dock-secondary" onClick={() => inspector.onMediaRemove?.(nodeIds[0])}>Remover imagem</Button> : null}
        </div>
      </div>
      <div id="dock-edge-fields" hidden={!edge}>
        <div className="dock-field-grid">
          <label>Origem<Select unstyled id="dock-source-sign" name="sourceSign" defaultValue={edge?.sourceSign || "+"}><option value="+">+</option><option value="−">−</option></Select></label>
          <label>Destino<Select unstyled id="dock-target-sign" name="targetSign" defaultValue={edge?.targetSign || "+"}><option value="+">+</option><option value="−">−</option></Select></label>
        </div>
        <label>Descrição<Textarea unstyled id="dock-element-description" name="description" defaultValue={edge?.description || ""} /></label>
      </div>
      <CustomFields fields={node?.fields || edge?.fields || {}} />
      <Button unstyled type="submit" className="dock-primary">Aplicar alterações</Button>
    </form>
    <div className="inspector-body editor-relation-view" id="relation-view" hidden />
  </section>;
}
