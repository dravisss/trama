import React from "react";
import { Button } from "./ui/Button.jsx";
import { Icon } from "./ui/Icon.jsx";
import { Input, Select, Textarea } from "./ui/Field.jsx";
import { InspectorMovementVisual } from "./movementVisuals.jsx";

/**
 * Visual relation picker for a causal beat. The Story Studio DOM bridge owns
 * its data and commands, while this component owns the accessible structure
 * and visual affordances.
 */
export function CausalMovementComposer({ movementInspector = {} } = {}) {
  return <div className="story-movement-composer">
    <div className="story-movement-composer-heading">
      <span id="story-movement-source-label" className="story-movement-source-label">Forma visual</span>
      <span id="story-movement-hint" className="story-movement-hint">Selecione uma forma na sequência da história</span>
    </div>
    <div id="story-inspector-causal-svg" className="story-movement-visual" aria-label="Visualização do movimento"><InspectorMovementVisual {...movementInspector} /></div>
    <div id="story-inspector-source-picker" className="story-movement-source-picker" role="listbox" aria-label="Escolher variável de origem" hidden />
    <Select unstyled id="story-inspector-source" className="story-movement-source-fallback" aria-label="Variável de origem" tabIndex="-1" />
    <Input unstyled id="story-inspector-target-node" type="hidden" />
    <div id="story-inspector-movement-options" className="story-movement-options-fallback" role="list" aria-label="Relações disponíveis a partir da origem" />
  </div>;
}

/**
 * React-owned Story Studio inspector structure. The existing presentation
 * controller still owns the values and commands through the stable ids below;
 * this keeps the migration transactional while the domain adapter is retired.
 */
export function StoryInspectorPanel({ movementInspector = {} } = {}) {
  return <>
    <p id="story-inspector-context" className="story-inspector-context">Escolha um movimento na sequência da história para editar o que será narrado.</p>
    <div className="story-v2-inspector-section story-v2-inspector-section-main">
      <div className="story-v2-section-label">Conteúdo do movimento</div>
      <div className="story-inspector-grid">
        <label className="story-inspector-wide">Título<Input unstyled id="story-inspector-title" autoComplete="off" placeholder="Dê um nome claro a este movimento" /></label>
        <label className="story-inspector-wide">Narração<Textarea unstyled id="story-inspector-narration" placeholder="Explique o que muda e por que isso importa…" /></label>
        <label>Tipo<Select unstyled id="story-inspector-type" /></label>
        <label>Duração<Select unstyled id="story-inspector-duration-preset">
        <option value="3000">Rápido · 3s</option>
        <option value="5000">Padrão · 5s</option>
        <option value="8000">Contemplativo · 8s</option>
        <option value="custom">Personalizado</option>
        </Select></label>
        <label id="story-inspector-custom-duration-field" className="story-inspector-wide story-custom-duration">Duração personalizada
          <span><Input unstyled id="story-inspector-custom-duration" inputMode="numeric" placeholder="01:10" aria-describedby="story-duration-help" /><small id="story-duration-help">mm:ss</small></span>
        </label>
      </div>
    </div>
    <div id="story-inspector-movement" className="story-v2-inspector-section story-inspector-movement">
      <div id="story-inspector-movement-label" className="story-v2-section-label">Movimento</div>
      <p id="story-inspector-movement-help" className="story-inspector-help">A forma visual mostra como este movimento orienta a leitura do mapa.</p>
      <CausalMovementComposer movementInspector={movementInspector} />
      <div id="story-inspector-movement-status" className="story-inspector-movement-status" role="status" />
      <div className="story-inspector-actions story-movement-actions">
        <Button unstyled type="button" className="story-v2-button story-v2-button-primary" id="story-inspector-apply-movement">Aplicar movimento</Button>
        <Button unstyled type="button" className="story-v2-button story-v2-button-primary" id="story-inspector-edit-movement" hidden>Editar movimento</Button>
        <Button unstyled type="button" className="story-v2-button" id="story-inspector-suggest-next">Sugerir próximo</Button>
      </div>
    </div>
    <div id="story-inspector-camera-section" className="story-v2-inspector-section story-inspector-camera-section">
      <div className="story-v2-section-label story-inspector-camera-heading">
        <span>Enquadramento do movimento</span>
        <Button unstyled type="button" id="story-inspector-camera-info" className="story-inspector-info-button" aria-label="Explicar os modos de câmera" aria-expanded="false" aria-controls="story-inspector-camera-info-popover">i</Button>
      </div>
      <p id="story-inspector-camera-help" className="story-inspector-help" aria-live="polite">Escolha como a câmera deve acompanhar este movimento.</p>
      <div id="story-inspector-camera-info-popover" className="story-inspector-camera-info-popover" role="note" hidden>
        <strong>Como funciona</strong>
        <p><b>Herdar da cena</b> usa o enquadramento definido na cena. O movimento não cria uma câmera própria.</p>
        <p><b>Foco semântico</b> aproxima o alvo deste movimento; <b>Mapa inteiro</b> mostra o sistema completo.</p>
        <p><b>Conjunto</b> enquadra vários elementos; <b>Seguir percurso</b> acompanha uma sequência; <b>Capturado</b> mantém zoom e posição exatos; <b>Comparação</b> prepara dois estados.</p>
      </div>
      <label className="story-inspector-wide">Intenção da câmera
        <Select unstyled id="story-inspector-camera">
          <option value="inherit">Herdar da cena</option>
          <option value="fit-map">Mapa inteiro</option>
          <option value="fit-focus">Foco semântico</option>
          <option value="fit-set">Conjunto de elementos</option>
          <option value="follow-path">Seguir percurso</option>
          <option value="fixed">Enquadramento capturado</option>
          <option value="split">Comparação</option>
        </Select>
      </label>
      <div id="story-inspector-camera-target" className="story-inspector-camera-target" role="status" />
      <div className="story-inspector-actions story-inspector-camera-actions">
        <Button unstyled type="button" id="story-inspector-add-selection" hidden>Criar movimento com seleção</Button>
        <Button unstyled type="button" id="story-inspector-use-selection">Usar seleção do canvas</Button>
        <Button unstyled type="button" id="story-inspector-capture-state">Capturar enquadramento atual</Button>
        <Button unstyled type="button" id="story-inspector-clear-focus">Limpar foco</Button>
      </div>
    </div>
    <details className="story-v2-advanced story-playback-options">
      <summary><span>Configurações avançadas</span><small>Reprodução, câmera e foco</small></summary>
      <div className="story-v2-advanced-content">
        <label className="story-inspector-wide">Foco semântico<Input unstyled id="story-inspector-focus" readOnly /></label>
        <div className="story-inspector-grid">
          <label>Avanço<Select unstyled id="story-inspector-advance"><option value="manual">Manual</option><option value="auto">Automático</option></Select></label>
          <label>Transição<Select unstyled id="story-inspector-transition"><option value="instant">Instantânea</option><option value="dissolve">Dissolver</option><option value="slide">Deslizar</option><option value="morph-stage">Transformar palco</option></Select></label>
        </div>
      </div>
    </details>
    <div className="story-v2-inspector-footer">
      <div className="story-inspector-actions story-inspector-edit-actions">
        <Button unstyled type="button" id="story-inspector-duplicate"><Icon name="copy" size="sm" />Duplicar movimento</Button>
      </div>
      <div className="story-inspector-actions story-inspector-destructive-actions">
        <Button unstyled type="button" id="story-inspector-remove"><svg className="story-action-svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 6l.5 7h5L11 6M7 7.5v4M9 7.5v4" /></svg>Remover movimento</Button>
        <Button unstyled type="button" id="story-inspector-remove-scene"><svg className="story-action-svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 6l.5 7h5L11 6M7 7.5v4M9 7.5v4" /></svg>Remover cena</Button>
      </div>
      <label className="story-notes-field">Notas do apresentador<Textarea unstyled id="story-selected-notes" placeholder="Notas privadas para apresentação e ensaio" /></label>
    </div>
  </>;
}
