import React, { useEffect, useRef, useState } from "react";
import { StoryInspectorPanel } from "../storyInspector.jsx";
import { StoryMarkdownPanel } from "../storyMarkdown.jsx";
import { Button } from "../ui/Button.jsx";
import { Input, Select } from "../ui/Field.jsx";
import { Icon } from "../ui/Icon.jsx";

/**
 * Story Studio's presentation shell. It deliberately owns composition only:
 * persistence, selection, and command wiring continue to be provided by the
 * existing storyStudio bridge through the stable ids inside the child panels.
 */
export function StoryStudioV2Frame({ movementInspector = {} } = {}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const closeOnOutsidePointer = event => {
      if (!moreRef.current?.contains(event.target)) setMoreOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreOpen]);

  return (
    <section data-dock-content="story" data-story-ui="v2" className="story-studio-v2" hidden>
      <header className="story-v2-header">
        <div className="story-v2-heading">
          <span className="story-v2-kicker">História</span>
          <h2>Conte o sistema</h2>
          <p>Monte uma narrativa causal a partir dos movimentos do mapa.</p>
        </div>
        <div className="story-v2-primary-actions" aria-label="Ações da história">
          <Button unstyled type="button" className="story-v2-button story-v2-button-primary" id="generate-presentation">
            <span className="story-v2-button-icon" aria-hidden="true"><Icon name="sparkles" size="sm" /></span> Gerar rascunho
          </Button>
          <Button unstyled type="button" className="story-v2-button" id="save-presentation">Salvar</Button>
          <Button unstyled type="button" className="story-v2-button" id="dock-present">Pré-visualizar</Button>
          <Button unstyled type="button" className="story-v2-button story-v2-button-export" id="export-presentation-html">Exportar</Button>
          <div className="story-v2-more" ref={moreRef}>
            <Button
              unstyled
              type="button"
              id="story-v2-more-actions"
              className="story-v2-more-toggle"
              aria-label="Mais ações da história"
              aria-expanded={moreOpen}
              aria-controls="story-v2-more-menu"
              title="Mais ações"
              onClick={() => setMoreOpen(open => !open)}
            ><Icon name="more" size="sm" /></Button>
            {<div hidden={!moreOpen} id="story-v2-more-menu" className="story-v2-more-menu" role="menu" aria-label="Mais ações da história">
              <div className="story-v2-menu-label">Histórias deste projeto</div>
              <div className="presentation-library story-v2-library" id="presentation-library" />
              <div className="story-v2-menu-divider" />
              <Button unstyled type="button" id="validate-presentation">Validar história</Button>
              <Button unstyled type="button" id="apply-presentation-fixes" disabled>Aplicar correções seguras</Button>
              <Button unstyled type="button" id="export-presentation-source">Exportar .story.md</Button>
              <Button unstyled type="button" id="duplicate-presentation">Duplicar história</Button>
              <Button unstyled type="button" id="delete-presentation" className="story-v2-danger-action">Remover história</Button>
            </div>}
          </div>
        </div>
      </header>

      <div className="story-v2-status-row">
        <div className="story-v2-status" id="story-lint-status" role="status" aria-live="polite">Nenhuma validação executada.</div>
        <label className="story-v2-title-editor">Nome da história<Input unstyled id="presentation-title-input" autoComplete="off" /></label>
        <label className="story-v2-style-editor">Estilo da apresentação
          <Select unstyled id="presentation-style-input" aria-describedby="presentation-style-help">
            <option value="lower-third">Legenda cinematográfica</option>
            <option value="relation-tooltip">Explicação contextual</option>
            <option value="atlas-editorial">Atlas editorial</option>
          </Select>
          <small id="presentation-style-help">Muda a direção visual, não a história nem os focos.</small>
        </label>
      </div>

      <section className="story-v2-inspector-shell" aria-label="Editor da história">
        <header className="story-v2-inspector-header">
          <div className="story-v2-selection-copy">
            <span className="story-v2-kicker">Editando agora</span>
            <strong id="story-inspector-target">Nenhuma cena selecionada</strong>
          </div>
          <Button unstyled type="button" id="story-mobile-inspector-close" className="story-mobile-inspector-close" aria-label="Fechar editor do movimento" title="Fechar editor do movimento">Fechar</Button>
          <div className="story-v2-tabs" role="tablist" aria-label="Editor da apresentação">
            <Button unstyled type="button" id="story-sidebar-inspector" className="active" role="tab" aria-selected="true" aria-controls="story-inspector-basic">Detalhes</Button>
            <Button unstyled type="button" id="story-sidebar-markdown" role="tab" aria-selected="false" aria-controls="presentation-markdown-panel">Markdown</Button>
          </div>
        </header>

        <div id="story-inspector-basic" className="story-v2-panel story-inspector-panel" role="tabpanel" aria-labelledby="story-sidebar-inspector">
          <div id="react-story-inspector-root"><StoryInspectorPanel movementInspector={movementInspector} /></div>
        </div>
        <section id="presentation-markdown-panel" className="story-v2-panel story-markdown-panel" role="tabpanel" aria-labelledby="story-sidebar-markdown presentation-markdown-label" hidden>
          <div id="react-story-markdown-root"><StoryMarkdownPanel /></div>
        </section>
      </section>
    </section>
  );
}
