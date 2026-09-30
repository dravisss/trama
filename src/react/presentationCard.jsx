import React from "react";
import { Button } from "./ui/Button.jsx";
import { Icon } from "./ui/Icon.jsx";

function PresentationCardMarkup({ actions = {} } = {}) {
  return (
    <>
      <aside className="presentation-card story-tooltip" id="presentation-card" hidden>
        <div className="presentation-progress" id="presentation-progress" />
        <div className="inspector-eyebrow" id="presentation-study-label">Apresentação guiada</div>
        <h3 id="presentation-title" aria-level="2" />
        <div id="presentation-body" className="presentation-body" />
        <div id="presentation-relation-meta" className="presentation-relation-meta" hidden />
        <img id="presentation-image" alt="" hidden />
        <div className="presentation-actions">
          <Button id="presentation-previous" onClick={() => actions.onPrevious?.()} title="Passo anterior" size="sm" variant="quiet">
            <Icon name="arrowLeft" className="presentation-action-icon" />
            <span className="presentation-action-label">Anterior</span>
          </Button>
          <Button id="presentation-next" onClick={() => actions.onNext?.()} title="Próximo passo" size="sm" variant="quiet">
            <Icon name="arrowRight" className="presentation-action-icon" />
            <span className="presentation-action-label">Próximo</span>
          </Button>
          <Button id="presentation-presenter-toggle" onClick={() => actions.onPresenterToggle?.()} aria-pressed="false" title="Ensaiar" size="sm" variant="quiet">
            <Icon name="edit" className="presentation-action-icon" />
            <span className="presentation-action-label">Ensaiar</span>
          </Button>
        </div>
        <section className="presentation-presenter-panel" id="presentation-presenter-panel" hidden aria-label="Notas do apresentador">
          <div className="presentation-presenter-heading"><span className="inspector-eyebrow">Modo do apresentador</span><span className="presentation-presenter-timer" id="presentation-presenter-timer">00:00</span></div>
          <div className="presentation-presenter-meta"><span id="presentation-presenter-position">Beat atual</span><span id="presentation-presenter-next-label">Próximo</span></div>
          <p className="presentation-presenter-notes" id="presentation-presenter-notes">Sem notas privadas para este beat.</p>
          <div className="presentation-presenter-next"><span>Próximo beat</span><strong id="presentation-presenter-next" /></div>
        </section>
      </aside>
      <svg className="presentation-tooltip-connector" id="presentation-tooltip-connector" aria-hidden="true" />
      <section className="presentation-inline-layer" id="presentation-inline-layer" hidden aria-live="polite" aria-label="Anotação causal">
        <div className="presentation-inline-annotation" id="presentation-inline-annotation">
          <span className="presentation-inline-index" id="presentation-inline-index">01</span>
          <div>
            <div className="inspector-eyebrow" id="presentation-inline-label">Caminho causal</div>
            <h2 id="presentation-inline-title" />
            <p id="presentation-inline-body" />
          </div>
        </div>
      </section>
      <Button id="presentation-close" onClick={() => actions.onClose?.()} size="sm" variant="secondary">Fechar</Button>
    </>
  );
}

// The presentation controller owns the live beat copy and visibility through
// its compatibility IDs. Keep this portal leaf stable when the surrounding
// composition re-renders for an unrelated shell/store update.
export const PresentationCard = React.memo(PresentationCardMarkup);
