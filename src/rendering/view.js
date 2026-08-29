import { applyMediaEdgeClearance, applyNodeOverrides, applyNodePresentation } from "./cytoscape.js";

const NODE_PROPERTIES = {
  shape: "shape",
  size: ["width", "height"],
  width: "width",
  height: "height",
  fill: "background-color",
  color: "background-color",
  "border-color": "border-color",
  "border-width": "border-width",
  "font-size": "font-size",
  "font-family": "font-family",
  "font-weight": "font-weight",
  "text-color": "color",
  "text-max-width": "text-max-width",
  opacity: "opacity"
};

const EDGE_PROPERTIES = {
  color: ["line-color", "target-arrow-color"],
  "stroke-color": ["line-color", "target-arrow-color"],
  width: "width",
  "stroke-width": "width",
  "stroke-style": "line-style",
  "line-cap": "line-cap",
  "line-dash-pattern": "line-dash-pattern",
  "line-dash-offset": "line-dash-offset",
  "line-outline-width": "line-outline-width",
  "line-outline-color": "line-outline-color",
  "arrow-shape": "target-arrow-shape",
  "arrow-fill": "target-arrow-fill",
  "arrow-width": "target-arrow-width",
  "arrow-scale": "arrow-scale",
  opacity: "opacity"
};

export function applyViewToCytoscape(cy, view, canvas, { assetResolver } = {}) {
  if (!cy) return;
  cy.elements().removeStyle();
  if (canvas) canvas.style.background = view?.settings?.background || "";
  // Media establishes the node geometry baseline. View rules are then applied
  // on top so a saved visual style can change typography and node treatment
  // without being silently overwritten by the image presentation pass.
  const mediaEnabled = view?.settings?.["node-media"] !== false;
  cy.nodes().forEach(node => applyNodePresentation(node, { assetResolver, mediaEnabled }));

  const rules = [...(view?.rules || [])]
    .filter(rule => ["canvas", "variable", "relation"].includes(rule.selector?.type))
    .sort((a, b) => selectorSpecificity(a.selector) - selectorSpecificity(b.selector));
  for (const rule of rules) {
    if (rule.selector?.type === "canvas") {
      if (canvas && rule.properties?.background) canvas.style.background = rule.properties.background;
      continue;
    }
    const collection = collectionForRule(cy, rule.selector);
    const mapping = rule.selector?.type === "variable" ? NODE_PROPERTIES : EDGE_PROPERTIES;
    collection.style(mapProperties(rule.properties || {}, mapping));
  }

  // A generic relation rule must not erase the causal distinction between
  // positive and negative relations. A type-specific rule may intentionally
  // replace these defaults; otherwise the balancing class remains dashed.
  cy.edges().forEach(edge => {
    const hasTypeRule = rules.some(rule => rule.selector?.type === "relation" &&
      rule.selector?.attribute === "type" && String(rule.selector.value) === String(edge.data("type")));
    if (!hasTypeRule && edge.data("type") === "balancing") {
      edge.style({ "line-style": "dashed", "line-dash-pattern": [8, 5] });
    }
    // Explicit element styles remain the final authored override.
    if (edge.data("style") && typeof edge.data("style") === "object") {
      edge.style(mapProperties(normalizeElementStyle(edge.data("style")), EDGE_PROPERTIES));
    }
  });
  cy.nodes().forEach(node => {
    if (node.data("style") && typeof node.data("style") === "object") {
      applyNodeOverrides(node, node.data("style"));
    }
  });
  applyMediaEdgeClearance(cy, { mediaEnabled });
}

function selectorSpecificity(selector = {}) {
  return selector?.attribute ? 10 : 0;
}

function collectionForRule(cy, selector = {}) {
  let collection;
  if (selector.type === "variable") collection = cy.nodes();
  else if (selector.type === "relation") collection = cy.edges();
  else return cy.collection();
  if (!selector.attribute) return collection;
  return collection.filter(element => {
    const value = element.data(selector.attribute);
    if (selector.attribute === "tag") {
      return Array.isArray(value) ? value.includes(selector.value) : String(value || "").split(/\s*,\s*/).includes(selector.value);
    }
    if (selector.attribute === "field") {
      const fields = element.data("fields") || {};
      const match = String(selector.value).match(/^([^:=]+)[:=](.+)$/);
      if (match) return String(fields[match[1]]) === match[2];
      return Object.prototype.hasOwnProperty.call(fields, selector.value) ||
        Object.values(fields).some(fieldValue => String(fieldValue) === String(selector.value));
    }
    return String(value) === String(selector.value);
  });
}

function mapProperties(properties, mapping) {
  const result = {};
  for (const [property, value] of Object.entries(properties)) {
    if (property === "visible") {
      result.display = value === false || value === "false" ? "none" : "element";
      continue;
    }
    if (property === "label-visible") {
      // Direct collection styles need concrete values. When labels are
      // visible, leave the stylesheet's `data(label)` mapping intact.
      if (value === false || value === "false") result.label = "";
      continue;
    }
    if (property === "highlight" && (value === true || value === "true")) {
      if (mapping === NODE_PROPERTIES) result["border-width"] = 4;
      else result.width = 4;
      result.opacity = 1;
      continue;
    }
    const targets = mapping[property];
    if (!targets) continue;
    const normalized = property === "line-dash-pattern" ? parseDashPattern(value) : value;
    for (const target of Array.isArray(targets) ? targets : [targets]) result[target] = normalized;
  }
  return result;
}

function parseDashPattern(value) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  return String(value || "")
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
}

function normalizeElementStyle(style = {}) {
  const aliases = {
    strokeColor: "stroke-color",
    strokeWidth: "stroke-width",
    strokeStyle: "stroke-style",
    lineCap: "line-cap",
    lineDashPattern: "line-dash-pattern",
    lineDashOffset: "line-dash-offset",
    lineOutlineWidth: "line-outline-width",
    lineOutlineColor: "line-outline-color",
    arrowShape: "arrow-shape",
    arrowFill: "arrow-fill",
    arrowWidth: "arrow-width",
    arrowScale: "arrow-scale"
  };
  return Object.fromEntries(Object.entries(style).map(([key, value]) => [aliases[key] || key, value]));
}
