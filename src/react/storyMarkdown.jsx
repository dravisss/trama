import React from "react";
import { Button } from "./ui/Button.jsx";
import { LineNumberedTextarea } from "./ui/CodeEditor.jsx";

export function StoryMarkdownPanel() {
  return <>
    <div className="story-markdown-heading">
      <div>
        <span className="dock-eyebrow" id="presentation-markdown-label">Fonte da apresentação</span>
        <p>Escreva a história em linguagem simples. O mapa só muda depois de aplicar uma fonte válida.</p>
      </div>
      <span className="story-markdown-meta">Fonte editável</span>
    </div>
    <LineNumberedTextarea id="presentation-source-editor" className="presentation-code-editor" label="Código Markdown da apresentação" metaId="presentation-markdown-line-count" />
    <div className="dock-status" id="presentation-source-status" role="status" aria-live="polite">Fonte sincronizada</div>
    <div className="story-diff-header"><span>Revisão da fonte</span><Button type="button" id="toggle-presentation-diff" unstyled aria-expanded="false">Ver diff</Button></div>
    <pre id="presentation-source-diff" className="presentation-source-diff" hidden />
    <div className="story-markdown-actions">
      <Button type="button" id="validate-presentation-source" unstyled>Validar fonte</Button>
      <Button type="button" className="dock-primary" unstyled id="apply-presentation-source">Aplicar ao Storyboard</Button>
    </div>
  </>;
}
