import React from "react";
import { Button } from "./ui/Button.jsx";

function ExploreDetailPanelMarkup({ actions = {} } = {}) {
  return (
    <aside className="explore-detail-panel" id="explore-detail-panel" aria-label="Detalhes do loop selecionado" hidden>
      <header className="explore-detail-header">
        <Button type="button" onClick={() => actions.onClose?.()} className="explore-detail-close" unstyled id="explore-detail-close" aria-label="Fechar detalhes do loop">Fechar</Button>
        <span className="dock-eyebrow">Loop selecionado</span>
        <div className="explore-detail-title-row"><h2 id="explore-loop-title">Explore um loop</h2><span className="explore-loop-type" id="explore-loop-type" /></div>
        <p id="explore-loop-path" className="explore-loop-path" />
        <span id="explore-loop-meta" className="explore-loop-meta" />
      </header>
      <nav className="explore-loop-choices" id="explore-loop-choices" aria-label="Loops encontrados no mapa" />
      <section className="explore-detail-section"><div className="explore-section-heading"><span className="explore-section-icon">↻</span><h3>Leitura do ciclo</h3></div><p id="explore-loop-description">Selecione um loop para ver sua descrição.</p></section>
      <section className="explore-detail-section"><div className="explore-section-heading"><span className="explore-section-icon">→</span><h3>Relações do ciclo</h3></div><ol id="explore-loop-edges" className="explore-loop-edges" /></section>
      <div className="explore-detail-actions"><Button type="button" className="primary-action" unstyled id="explore-walk-loop" onClick={() => actions.onWalkLoop?.()}>Percorrer loop</Button><Button type="button" unstyled id="explore-show-map" onClick={() => actions.onShowMap?.()}>Ver mapa inteiro</Button></div>
    </aside>
  );
}

// Explore is still populated by the imperative loop controller. Preserve its
// selected-loop DOM while unrelated composition state changes.
export const ExploreDetailPanel = React.memo(ExploreDetailPanelMarkup);
