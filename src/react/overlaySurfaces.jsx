import React from "react";
import { Button } from "./ui/Button.jsx";
import { Input, Select, Textarea } from "./ui/Field.jsx";

/** Transitional overlay markup owned by the single React composition root. */
function OverlaySurfacesMarkup() {
  return <>
    <div className="modal-backdrop" id="loop-description-modal" hidden>
      <form className="modal-card" id="loop-description-form">
        <div className="modal-header">
          <div>
            <div className="sidebar-section-title">Descrição do loop</div>
            <h2>Editar leitura</h2>
          </div>
          <Button unstyled type="button" id="close-loop-description">Fechar</Button>
        </div>
        <label>Resumo curto<Input unstyled id="loop-summary-input" type="text" maxLength="180" /></label>
        <label>Markdown<Textarea unstyled id="loop-description-input" /></label>
        <div className="modal-preview">
          <div className="sidebar-section-title">Preview</div>
          <div className="markdown-view" id="loop-description-preview" />
        </div>
        <div className="modal-actions">
          <Button unstyled type="button" id="cancel-loop-description">Cancelar</Button>
          <Button unstyled type="submit">Salvar descrição</Button>
        </div>
      </form>
    </div>

    <dialog className="command-dialog" id="command-dialog">
      <form method="dialog" id="command-dialog-form">
        <div className="modal-header">
          <div><div className="sidebar-section-title">Trama</div><h2 id="command-dialog-title" /></div>
          <Button unstyled type="button" id="command-dialog-close">Fechar</Button>
        </div>
        <p id="command-dialog-description" />
        <div id="command-dialog-fields" />
        <div className="modal-actions">
          <Button unstyled type="button" id="command-dialog-cancel">Cancelar</Button>
          <Button unstyled type="submit" id="command-dialog-submit">Continuar</Button>
        </div>
      </form>
    </dialog>

    <form className="edit-popover" id="edit-popover" hidden>
      <div className="node-editor" id="node-editor" hidden>
        <label>Nome da variável<Input unstyled id="node-label" name="node-label" autoComplete="off" /></label>
      </div>
      <div className="edge-editor" id="edge-editor" hidden>
        <div className="edge-sign-grid">
          <label>Origem<Select unstyled id="edge-source-sign" name="edge-source-sign"><option value="+">+</option><option value="−">−</option></Select></label>
          <label>Destino<Select unstyled id="edge-target-sign" name="edge-target-sign"><option value="+">+</option><option value="−">−</option></Select></label>
        </div>
        <label>Descrição<Textarea unstyled id="edge-description" name="edge-description" /></label>
      </div>
      <div className="popover-actions"><Button unstyled type="submit">Salvar</Button><Button unstyled type="button" id="delete-selection">Remover</Button></div>
    </form>
  </>;
}

// Command-dialog and editor-popover values are populated by transitional DOM
// controllers. They must survive unrelated composition renders until those
// controllers are replaced by stateful React consumers.
export const OverlaySurfaces = React.memo(OverlaySurfacesMarkup);
