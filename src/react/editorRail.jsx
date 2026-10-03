import React from "react";
import { Button } from "./ui/Button.jsx";
import { Select } from "./ui/Field.jsx";
import { Icon } from "./ui/Icon.jsx";

const RAIL_ITEMS = [
  ["map", "Mapa e descrição", <><path d="M4 5h6l2 2h8v12H4z" /><path d="M8 11h8M8 15h6" /></>],
  ["inspect", "Detalhes", <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" /></>],
  ["code", "Código Markdown", <><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></>],
  ["style", "Estilo da vista", <><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M12 3v9h9" /></>],
  ["table", "Tabela de dados", <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16M15 4v16" /></>],
  ["history", "Histórico de versões", <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>]
];

const RAIL_TAB_LABELS = {
  map: "Mapa",
  inspect: "Detalhes",
  code: "Markdown",
  style: "Estilo",
  table: "Dados",
  history: "Histórico"
};

export function EditorUtilityRail({ activePanel = "map", onOpenPanel, onClose } = {}) {
  return <nav className="utility-rail" aria-label="Painéis do editor">
    <label className="editor-panel-picker">Painel
      <Select aria-label="Painel do editor" value={activePanel} onChange={event => onOpenPanel?.(event.target.value)}>
        {RAIL_ITEMS.map(([panel, label]) => <option value={panel} key={panel}>{label}</option>)}
      </Select>
    </label>
    {RAIL_ITEMS.map(([panel, label, icon]) => <Button key={panel} data-dock-panel={panel} aria-label={label} title={label} aria-pressed={activePanel === panel} aria-current={activePanel === panel ? "page" : undefined} className={activePanel === panel ? "active" : ""} onClick={() => onOpenPanel?.(panel)} size="icon" variant="quiet">
      <span className="rail-glyph" aria-hidden="true"><svg viewBox="0 0 24 24">{icon}</svg></span>
      <span className="rail-label">{RAIL_TAB_LABELS[panel] || label}</span>
    </Button>)}
    <Button id="close-editor-dock" onClick={() => onClose?.()} className="dock-close" aria-label="Fechar painel" size="icon" variant="quiet"><Icon name="close" /></Button>
  </nav>;
}
