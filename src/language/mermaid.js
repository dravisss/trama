import { normalizeModel, normalizeSign, slugId, uniqueId } from "../core/model.js";

export class MermaidImportError extends Error {
  constructor(errors) {
    super(`Invalid Mermaid diagram:\n${errors.map(error => `- line ${error.line}: ${error.message}`).join("\n")}`);
    this.name = "MermaidImportError";
    this.errors = errors;
  }
}

export function importMermaid(source, { id = "mermaid-import", title = "Mermaid import" } = {}) {
  const text = String(source || "").replace(/```(?:mermaid)?|```/gi, "");
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const nodes = new Map();
  const rawEdges = [];
  const errors = [];
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || /^(graph|flowchart)\s+(TD|TB|LR|RL|BT)/i.test(line) || line.startsWith("%%")) return;
    const edge = parseMermaidEdge(line);
    if (edge) {
      rememberNode(nodes, edge.source, edge.sourceLabel);
      rememberNode(nodes, edge.target, edge.targetLabel);
      rawEdges.push({ ...edge, line: index + 1 });
      return;
    }
    const node = parseNodeToken(line);
    if (node && node.rest === "") rememberNode(nodes, node.id, node.label);
    else errors.push({ line: index + 1, message: "Unsupported Mermaid statement." });
  });
  if (!nodes.size) errors.push({ line: 1, message: "No Mermaid nodes were found." });
  if (errors.length) throw new MermaidImportError(errors);
  const edgeIds = new Set();
  const edges = rawEdges.map(edge => {
    const edgeId = uniqueId(`${edge.source}-${edge.target}`, edgeIds);
    edgeIds.add(edgeId);
    return {
      id: edgeId,
      source: edge.source,
      target: edge.target,
      sourceSign: "+",
      targetSign: normalizeSign(edge.sign || "+"),
      ...(edge.label && edge.label !== edge.sign ? { description: edge.label } : {})
    };
  });
  return normalizeModel({
    id: slugId(id, "mermaid-import"),
    title,
    nodes: [...nodes.values()],
    edges,
    loops: []
  });
}

function parseMermaidEdge(line) {
  const source = parseNodeToken(line);
  if (!source) return null;
  const arrow = source.rest.match(/^\s*(?:--\s*["']?([^"']+?)["']?\s*-->|-->\|([^|]+)\||-->|-\.->)\s*(.+)$/);
  if (!arrow) return null;
  const target = parseNodeToken(arrow[3]);
  if (!target || target.rest) return null;
  const label = (arrow[1] || arrow[2] || "").trim();
  const signMatch = label.match(/(?:^|\s)([+−-])(?:$|\s)/);
  return {
    source: source.id,
    sourceLabel: source.label,
    target: target.id,
    targetLabel: target.label,
    label,
    sign: signMatch?.[1] || "+"
  };
}

function parseNodeToken(value) {
  const match = String(value).match(/^\s*([A-Za-z_][\w-]*)(?:\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})?(.*)$/);
  if (!match) return null;
  return {
    id: slugId(match[1], "node"),
    label: cleanLabel(match[2] || match[3] || match[4] || match[1]),
    rest: match[5].trim()
  };
}

function rememberNode(nodes, id, label) {
  const existing = nodes.get(id);
  const nextLabel = label && label !== id ? label : existing?.label || label || id;
  nodes.set(id, { id, label: nextLabel });
}

function cleanLabel(value) {
  return String(value).trim().replace(/^["']|["']$/g, "");
}
