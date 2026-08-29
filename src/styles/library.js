import { serializeLoopStyle } from "../language/styleLanguage.js";

export const STYLE_LIBRARY_SCHEMA_VERSION = 1;

const PRESETS = [
  {
    id: "matcha-executive",
    version: 1,
    title: "Matcha Executive",
    intent: "Ilustrado, editorial e adequado para narrativa estratégica.",
    tokens: {
      canvas: "#f7f3e7",
      text: "#2b3a2e",
      relationPrimary: "#2b3a2e",
      relationSecondary: "#7a8a72",
      accent: "#6f9a5b"
    },
    settings: {
      background: "#f7f3e7",
      "label-density": "balanced",
      "node-media": true,
      "loop-badges": false
    },
    rules: [
      {
        selector: { type: "variable" },
        properties: {
          "font-family": "Noto Sans, system-ui, sans-serif",
          "font-size": 11,
          "font-weight": 700,
          "text-color": "#2b3a2e",
          "text-max-width": 132
        }
      },
      {
        selector: { type: "relation", attribute: "type", value: "reinforcing" },
        properties: {
          color: "#2b3a2e",
          width: 2.2,
          "stroke-style": "solid",
          "line-cap": "round",
          "arrow-shape": "triangle-backcurve",
          "arrow-fill": "filled",
          "arrow-width": "match-line",
          "arrow-scale": 1.25,
          "line-outline-width": 0.8,
          "line-outline-color": "#f7f3e7"
        }
      },
      {
        selector: { type: "relation", attribute: "type", value: "balancing" },
        properties: {
          color: "#7a8a72",
          width: 1.7,
          "stroke-style": "dashed",
          "line-dash-pattern": "8 5",
          "line-cap": "round",
          "arrow-shape": "triangle-backcurve",
          "arrow-fill": "filled",
          "arrow-width": "match-line",
          "arrow-scale": 1.12,
          "line-outline-width": 0.6,
          "line-outline-color": "#f7f3e7"
        }
      },
      {
        selector: { type: "loop", attribute: "type", value: "reinforcing" },
        properties: {
          "badge-fill": "#2b3a2e",
          "badge-color": "#f7f3e7",
          "badge-stroke": "#6f9a5b",
          "badge-opacity": 0.96
        }
      }
    ]
  },
  {
    id: "boardroom-ink",
    version: 1,
    title: "Boardroom Ink",
    intent: "Minimalista, contrastado e pronto para relatório ou conselho.",
    tokens: {
      canvas: "#fbfaf7",
      text: "#20251f",
      relationPrimary: "#20251f",
      relationSecondary: "#687066",
      accent: "#3f6d50"
    },
    settings: {
      background: "#fbfaf7",
      "label-density": "balanced",
      "node-media": true,
      "loop-badges": false
    },
    rules: [
      {
        selector: { type: "variable" },
        properties: {
          "font-family": "IBM Plex Sans, Noto Sans, system-ui, sans-serif",
          "font-size": 11,
          "font-weight": 600,
          "text-color": "#20251f",
          "text-max-width": 132,
          "border-color": "#687066",
          "border-width": 1.3
        }
      },
      {
        selector: { type: "relation", attribute: "type", value: "reinforcing" },
        properties: {
          color: "#20251f",
          width: 2.15,
          "stroke-style": "solid",
          "line-cap": "round",
          "arrow-shape": "chevron",
          "arrow-fill": "hollow",
          "arrow-width": "match-line",
          "arrow-scale": 1.35,
          "line-outline-width": 0.8,
          "line-outline-color": "#fbfaf7"
        }
      },
      {
        selector: { type: "relation", attribute: "type", value: "balancing" },
        properties: {
          color: "#687066",
          width: 1.65,
          "stroke-style": "dashed",
          "line-dash-pattern": "7 5",
          "line-cap": "round",
          "arrow-shape": "chevron",
          "arrow-fill": "hollow",
          "arrow-width": "match-line",
          "arrow-scale": 1.2,
          "line-outline-width": 0.6,
          "line-outline-color": "#fbfaf7"
        }
      },
      {
        selector: { type: "loop", attribute: "type", value: "reinforcing" },
        properties: {
          "badge-fill": "#20251f",
          "badge-color": "#fbfaf7",
          "badge-stroke": "#3f6d50",
          "badge-opacity": 0.97
        }
      }
    ]
  },
  {
    id: "systems-atlas",
    version: 1,
    title: "Systems Atlas",
    intent: "Compacto e preciso para mapas densos e análise estrutural.",
    tokens: {
      canvas: "#eef2ee",
      text: "#26382d",
      relationPrimary: "#365643",
      relationSecondary: "#87978b",
      accent: "#587c62"
    },
    settings: {
      background: "#eef2ee",
      "label-density": "compact",
      "node-media": true,
      "loop-badges": false
    },
    rules: [
      {
        selector: { type: "variable" },
        properties: {
          "font-family": "IBM Plex Sans, Noto Sans, system-ui, sans-serif",
          "font-size": 10,
          "font-weight": 600,
          "text-color": "#26382d",
          "text-max-width": 118,
          "border-width": 1.2
        }
      },
      {
        selector: { type: "relation", attribute: "type", value: "reinforcing" },
        properties: {
          color: "#365643",
          width: 1.9,
          "stroke-style": "solid",
          "line-cap": "round",
          "arrow-shape": "vee",
          "arrow-fill": "filled",
          "arrow-width": "match-line",
          "arrow-scale": 1.05,
          "line-outline-width": 0.7,
          "line-outline-color": "#eef2ee"
        }
      },
      {
        selector: { type: "relation", attribute: "type", value: "balancing" },
        properties: {
          color: "#87978b",
          width: 1.45,
          "stroke-style": "dashed",
          "line-dash-pattern": "6 4",
          "line-cap": "round",
          "arrow-shape": "vee",
          "arrow-fill": "hollow",
          "arrow-width": "match-line",
          "arrow-scale": 1,
          "line-outline-width": 0.5,
          "line-outline-color": "#eef2ee"
        }
      },
      {
        selector: { type: "loop", attribute: "type", value: "reinforcing" },
        properties: {
          "badge-fill": "#365643",
          "badge-color": "#eef2ee",
          "badge-stroke": "#587c62",
          "badge-opacity": 0.94
        }
      }
    ]
  },
  {
    id: "narrative-spotlight",
    version: 1,
    title: "Narrative Spotlight",
    intent: "Direção de apresentação com foco progressivo e leitura por trajetória.",
    tokens: {
      canvas: "#f7f3e7",
      text: "#2b3a2e",
      relationPrimary: "#2b3a2e",
      relationSecondary: "#9aa89b",
      accent: "#6f9a5b"
    },
    settings: {
      background: "#f7f3e7",
      "label-density": "balanced",
      "node-media": true,
      "loop-badges": false,
      "focus-fade": 0.22
    },
    rules: [
      {
        selector: { type: "variable" },
        properties: {
          "font-family": "Noto Sans, system-ui, sans-serif",
          "font-size": 11,
          "font-weight": 700,
          "text-color": "#2b3a2e",
          "text-max-width": 132
        }
      },
      {
        selector: { type: "relation", attribute: "type", value: "reinforcing" },
        properties: {
          color: "#2b3a2e",
          width: 2.35,
          "stroke-style": "solid",
          "line-cap": "round",
          "arrow-shape": "triangle-backcurve",
          "arrow-fill": "filled",
          "arrow-width": "match-line",
          "arrow-scale": 1.3,
          "line-outline-width": 0.8,
          "line-outline-color": "#f7f3e7"
        }
      },
      {
        selector: { type: "relation", attribute: "type", value: "balancing" },
        properties: {
          color: "#9aa89b",
          width: 1.55,
          "stroke-style": "dashed",
          "line-dash-pattern": "7 6",
          "line-cap": "round",
          "arrow-shape": "triangle-backcurve",
          "arrow-fill": "filled",
          "arrow-width": "match-line",
          "arrow-scale": 1.1,
          "line-outline-width": 0.6,
          "line-outline-color": "#f7f3e7"
        }
      },
      {
        selector: { type: "loop", attribute: "type", value: "reinforcing" },
        properties: {
          "badge-fill": "#6f9a5b",
          "badge-color": "#f7f3e7",
          "badge-stroke": "#2b3a2e",
          "badge-opacity": 0.98
        }
      }
    ]
  }
];

export function listStylePresets() {
  return PRESETS.map(({ id, version, title, intent }) => ({ id, version, title, intent }));
}

export function getStylePreset(id = "matcha-executive") {
  return PRESETS.find(preset => preset.id === id) || PRESETS[0];
}

export function createViewFromStylePreset(id = "matcha-executive", { title, viewId } = {}) {
  const preset = getStylePreset(id);
  const view = {
    ...(viewId ? { id: viewId } : {}),
    title: title || preset.title,
    settings: {
      ...clone(preset.settings),
      "style-pack": preset.id,
      "style-pack-version": preset.version,
      "style-schema-version": STYLE_LIBRARY_SCHEMA_VERSION
    },
    rules: clone(preset.rules),
    tokens: clone(preset.tokens)
  };
  view.style_source = serializeLoopStyle(view);
  return view;
}

export function stylePresetOptions() {
  return listStylePresets().map(preset => ({
    value: preset.id,
    label: preset.title,
    description: preset.intent
  }));
}

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}
