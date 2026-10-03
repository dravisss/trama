import React from "react";
import { Button } from "./ui/Button.jsx";
import { Input } from "./ui/Field.jsx";
import { LineNumberedTextarea } from "./ui/CodeEditor.jsx";
import { Icon } from "./ui/Icon.jsx";

/**
 * React-owned structure for the loop source panel. The editor runtime keeps
 * the existing public ids and attaches its transactional commands after this
 * surface mounts, so the source remains compatible with local persistence and
 * the standalone compiler during the migration.
 */
export function LoopMarkdownPanel() {
  return <>
    <p className="dock-help">Markdown do mapa com variáveis e relações causais. Aplicar atualiza o canvas preservando a fonte editável.</p>
    <div className="code-file-bar">
      <div className="code-file-identity"><Icon name="code" size="sm" /><span><strong>Mapa atual · .loop.md</strong><small>Markdown causal</small></span></div>
      <div className="code-file-actions">
        <Button type="button" id="import-loop-source" unstyled title="Importar .loop.md / Mermaid">Importar</Button>
        <Button type="button" id="export-loop-source" unstyled title="Exportar .loop.md">Exportar</Button>
      </div>
      <Input unstyled id="loop-source-file" type="file" accept=".md,.loop.md,text/markdown,text/plain" hidden />
    </div>
    <label className="sr-only" htmlFor="loop-source-editor">Código Markdown do mapa</label>
    <div className="dock-status" id="loop-source-status" role="status" aria-live="polite">Documento válido</div>
    <LineNumberedTextarea id="loop-source-editor" label="Código Markdown do mapa" defaultValue="" />
    <div className="code-draft-actions">
      <Button type="button" id="preview-loop-source" unstyled>Pré-visualizar</Button>
      <Button type="button" id="discard-loop-source" unstyled disabled>Descartar prévia</Button>
      <Button type="button" className="dock-primary" unstyled id="apply-loop-source">Aplicar ao canvas</Button>
    </div>
  </>;
}
