const SELECTORS = new Set(["variable", "relation", "loop", "scene", "canvas"]);
const SETTINGS_PROPERTIES = new Set([
  "background", "route-quality", "extends", "label-density", "node-media",
  "style-pack", "style-pack-version", "style-schema-version", "loop-badges", "show-polarities",
  "focus-fade", "publication-profile"
]);
const NODE_PROPERTIES = new Set([
  "shape", "size", "width", "height", "fill", "color", "border-color", "border-width",
  "font-size", "font-family", "font-weight", "text-color", "text-max-width", "opacity",
  "visible", "label-visible", "highlight", "legend"
]);
const EDGE_PROPERTIES = new Set([
  "color", "stroke-color", "width", "stroke-width", "stroke-style", "line-cap",
  "line-dash-pattern", "line-dash-offset", "line-outline-width", "line-outline-color",
  "arrow-shape", "arrow-fill", "arrow-width", "arrow-scale", "opacity", "visible",
  "label-visible", "highlight", "legend"
]);
const META_PROPERTIES = new Set([
  "fill", "background", "color", "opacity", "visible", "label-visible", "highlight",
  "legend", "badge-fill", "badge-color", "badge-stroke", "badge-opacity", "badge-size"
]);

export class LoopStyleError extends Error {
  constructor(errors) {
    super(`Invalid loop style:\n${errors.map(error => `- line ${error.line}: ${error.message}`).join("\n")}`);
    this.name = "LoopStyleError";
    this.errors = errors;
  }
}

export function compileLoopStyle(source) {
  const text = stripComments(String(source || ""));
  const errors = [];
  const viewMatch = text.match(/@view\s+["']([^"']+)["']/);
  const settings = {};
  const rules = [];
  const blockPattern = /(@settings|(?:variable|relation|loop|scene|canvas)(?:\s*\[[^\]]+\])?)\s*\{([^}]*)}/g;
  let match;
  while ((match = blockPattern.exec(text))) {
    const line = lineAt(text, match.index);
    const properties = parseProperties(match[2], line, errors);
    if (match[1] === "@settings") Object.assign(settings, properties);
    else {
      const selector = parseSelector(match[1], line, errors);
      if (selector) {
        validateProperties(selector.type, properties, line, errors);
        rules.push({ selector, properties });
      }
    }
  }
  const remainder = text.replace(/@view\s+["'][^"']+["']/g, "").replace(blockPattern, "").trim();
  if (remainder) errors.push({ line: lineAt(text, text.indexOf(remainder)), message: "Unrecognized style syntax." });
  validateProperties("@settings", settings, 1, errors);
  if (errors.length) throw new LoopStyleError(errors);
  return { title: viewMatch?.[1] || "Default", settings, rules, style_source: String(source || "") };
}

function validateProperties(type, properties, line, errors) {
  const allowed = type === "@settings" ? SETTINGS_PROPERTIES
    : type === "variable" ? NODE_PROPERTIES
      : type === "relation" ? EDGE_PROPERTIES
        : type === "canvas" ? new Set(["background", "visible", "opacity"])
          : META_PROPERTIES;
  for (const property of Object.keys(properties)) {
    if (!allowed.has(property)) errors.push({ line, message: `Unknown property '${property}' for ${type}.` });
  }
}

export function serializeLoopStyle(view = {}) {
  const lines = [`@view "${view.title || "Default"}"`, ""];
  if (Object.keys(view.settings || {}).length) {
    lines.push("@settings {");
    appendProperties(lines, view.settings);
    lines.push("}", "");
  }
  for (const rule of view.rules || []) {
    lines.push(`${selectorText(rule.selector)} {`);
    appendProperties(lines, rule.properties || {});
    lines.push("}", "");
  }
  return `${lines.join("\n").trim()}\n`;
}

function parseSelector(value, line, errors) {
  const match = value.match(/^(\w+)(?:\s*\[([\w-]+)\s*=\s*["']([^"']+)["']\])?$/);
  if (!match || !SELECTORS.has(match[1])) {
    errors.push({ line, message: `Unknown selector '${value}'.` });
    return null;
  }
  return { type: match[1], ...(match[2] ? { attribute: match[2], value: match[3] } : {}) };
}

function parseProperties(body, line, errors) {
  const properties = {};
  for (const declaration of body.split(";")) {
    if (!declaration.trim()) continue;
    const match = declaration.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/s);
    if (!match) errors.push({ line, message: `Invalid declaration '${declaration.trim()}'.` });
    else properties[match[1]] = parseValue(match[2]);
  }
  return properties;
}

function parseValue(value) {
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value === "true" || value === "false") return value === "true";
  return value.replace(/^["']|["']$/g, "");
}

function selectorText(selector) {
  if (typeof selector === "string") return selector;
  return `${selector.type}${selector.attribute ? `[${selector.attribute}="${selector.value}"]` : ""}`;
}

function appendProperties(lines, properties) {
  for (const [key, value] of Object.entries(properties)) lines.push(`  ${key}: ${value};`);
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function lineAt(source, index) {
  return source.slice(0, Math.max(0, index)).split("\n").length;
}
