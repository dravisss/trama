import { normalizeModel, normalizeSign, slugId, uniqueId } from "../core/model.js";

export class LoopLanguageError extends Error {
  constructor(errors) {
    super(`Invalid loop document:\n${errors.map(error => `- line ${error.line}: ${error.message}`).join("\n")}`);
    this.name = "LoopLanguageError";
    this.errors = errors;
  }
}

export function compileLoopMarkdown(source) {
  const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
  const errors = [];
  const metadata = {};
  const nodes = [];
  const relations = [];
  const loops = [];
  let section = "";
  let currentLoop = null;
  let inFrontmatter = lines[0]?.trim() === "---";

  for (let index = inFrontmatter ? 1 : 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trim();
    const lineNumber = index + 1;
    if (inFrontmatter) {
      if (line === "---") {
        inFrontmatter = false;
        continue;
      }
      const entry = parseKeyValue(line);
      if (entry) metadata[entry.key] = parseMetadataValue(entry.value);
      else if (line) errors.push({ line: lineNumber, message: "Invalid frontmatter entry." });
      continue;
    }
    if (!line || line.startsWith("<!--")) continue;
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase();
      currentLoop = null;
      if (section === "story") {
        errors.push({ line: lineNumber, message: "Story sections belong in a separate Presentation Markdown document." });
      }
      continue;
    }
    const titleMatch = line.match(/^#\s+(.+)$/);
    if (titleMatch && !metadata.title) {
      metadata.title = titleMatch[1].trim();
      continue;
    }

    if (section === "variables") {
      const match = line.match(/^-\s+([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
      if (!match) errors.push({ line: lineNumber, message: "Expected '- id: Label'." });
      else {
        const parsed = parseTextAndFields(match[2].trim(), lineNumber, errors);
        nodes.push({ id: match[1], label: unescapeText(parsed.text), ...(parsed.fields ? { fields: parsed.fields } : {}) });
      }
      continue;
    }
    if (section === "relations") {
      const match = line.match(/^([a-zA-Z][\w-]*)\s+(\+\+|\+-|-\+|--)\s+([a-zA-Z][\w-]*)(?:\s*:\s*(.+))?$/);
      if (!match) errors.push({ line: lineNumber, message: "Expected 'source SIGN target'." });
      else {
        const parsed = parseTextAndFields(match[4] || "", lineNumber, errors);
        relations.push({ source: match[1], sign: match[2], target: match[3], description: unescapeText(parsed.text), fields: parsed.fields, line: lineNumber });
      }
      continue;
    }
    if (section === "loops") {
      const heading = line.match(/^-\s+([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
      if (heading) {
        currentLoop = { id: heading[1], label: unescapeText(heading[2].trim()), edgeRefs: [], line: lineNumber };
        loops.push(currentLoop);
        continue;
      }
      if (!currentLoop) {
        errors.push({ line: lineNumber, message: "Loop property requires a loop heading." });
        continue;
      }
      const edgeRef = line.match(/^-\s+([\w-]+)\s*->\s*([\w-]+)$/);
      if (edgeRef) currentLoop.edgeRefs.push({ source: edgeRef[1], target: edgeRef[2], line: lineNumber });
      else if (!/^edges\s*:\s*$/.test(line)) {
        const entry = parseKeyValue(line);
        if (entry?.key === "description") currentLoop.description = unescapeText(entry.value);
        else if (entry?.key === "tags") currentLoop.tags = parseMetadataValue(entry.value);
        else if (entry?.key === "fields") {
          try { currentLoop.fields = JSON.parse(entry.value); }
          catch { errors.push({ line: lineNumber, message: "Loop fields must be valid inline JSON." }); }
        }
        else errors.push({ line: lineNumber, message: "Unknown loop property." });
      }
      continue;
    }
  }

  if (inFrontmatter) errors.push({ line: lines.length, message: "Frontmatter is not closed." });
  const nodeIds = new Set(nodes.map(node => node.id));
  const edgeIds = new Set();
  const relationLineByPair = new Map();
  const edges = relations.map(relation => {
    if (!nodeIds.has(relation.source)) errors.push({ line: relation.line, message: `Unknown source variable '${relation.source}'.` });
    if (!nodeIds.has(relation.target)) errors.push({ line: relation.line, message: `Unknown target variable '${relation.target}'.` });
    const pair = `${relation.source}->${relation.target}`;
    if (relationLineByPair.has(pair)) {
      errors.push({
        line: relation.line,
        message: `Duplicate relation '${relation.source} -> ${relation.target}' (first declared on line ${relationLineByPair.get(pair)}). Declare at most one relation per ordered pair.`
      });
    } else relationLineByPair.set(pair, relation.line);
    const id = uniqueId(`${relation.source}-${relation.target}`, edgeIds);
    edgeIds.add(id);
    return {
      id,
      source: relation.source,
      target: relation.target,
      sourceSign: normalizeSign(relation.sign[0]),
      targetSign: normalizeSign(relation.sign[1]),
      ...(relation.description ? { description: relation.description } : {}),
      ...(relation.fields ? { fields: relation.fields } : {})
    };
  });
  const edgeByPair = new Map(edges.map(edge => [`${edge.source}->${edge.target}`, edge]));
  const curatedLoops = loops.map(loop => ({
    id: loop.id,
    label: loop.label,
    edgeIds: loop.edgeRefs.map(ref => {
      const edge = edgeByPair.get(`${ref.source}->${ref.target}`);
      if (!edge) errors.push({ line: ref.line, message: `Unknown relation '${ref.source} -> ${ref.target}'.` });
      return edge?.id;
    }).filter(Boolean),
    ...(loop.description ? { description: loop.description } : {}),
    ...(loop.tags ? { tags: loop.tags } : {}),
    ...(loop.fields ? { fields: loop.fields } : {})
  }));
  if (errors.length) throw new LoopLanguageError(errors);

  try {
    return normalizeModel({
      id: metadata.id || slugId(metadata.title, "untitled-loop"),
      title: metadata.title || "Untitled Loop",
      description: metadata.summary || "",
      ...(metadata.tags ? { tags: metadata.tags } : {}),
      nodes,
      edges,
      loops: curatedLoops
    });
  } catch (error) {
    throw new LoopLanguageError((error.errors || [error.message]).map(message => ({ line: 1, message })));
  }
}

export function serializeLoopMarkdown(model) {
  const lines = [`# ${model.title || model.id}`, "", "## Variables", ""];
  for (const node of model.nodes) lines.push(`- ${node.id}: ${escapeText(node.label)}${fieldsSuffix(node.fields)}`);
  lines.push("", "## Relations", "");
  for (const edge of model.edges) {
    const sign = `${asciiSign(edge.sourceSign)}${asciiSign(edge.targetSign)}`;
    const detail = `${edge.description ? escapeText(edge.description) : ""}${fieldsSuffix(edge.fields)}`;
    lines.push(`${edge.source} ${sign} ${edge.target}${detail ? `: ${detail}` : ""}`);
  }
  if (model.loops?.length) {
    const edgeById = new Map(model.edges.map(edge => [edge.id, edge]));
    lines.push("", "## Loops", "");
    for (const loop of model.loops) {
      lines.push(`- ${loop.id}: ${escapeText(loop.label || loop.id)}`, "  edges:");
      for (const edgeId of loop.edgeIds) {
        const edge = edgeById.get(edgeId);
        if (edge) lines.push(`    - ${edge.source} -> ${edge.target}`);
      }
      if (loop.description) lines.push(`  description: ${escapeText(loop.description)}`);
      if (loop.fields && Object.keys(loop.fields).length) lines.push(`  fields: ${JSON.stringify(loop.fields)}`);
    }
  }
  return `${lines.join("\n").trim()}\n`;
}

function parseKeyValue(line) {
  const match = line.match(/^([\w-]+)\s*:\s*(.*)$/);
  return match ? { key: match[1].toLowerCase(), value: match[2].trim() } : null;
}

function parseMetadataValue(value) {
  const list = value.match(/^\[(.*)]$/);
  return list ? list[1].split(",").map(item => item.trim()).filter(Boolean) : value;
}

function asciiSign(sign) {
  return sign === "−" ? "-" : sign;
}

function escapeText(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

function unescapeText(value) {
  return String(value || "").replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
}

function parseTextAndFields(value, line, errors) {
  const separator = value.lastIndexOf(" :: ");
  if (separator < 0) return { text: value };
  const text = value.slice(0, separator);
  try {
    const fields = JSON.parse(value.slice(separator + 4));
    if (!fields || Array.isArray(fields) || typeof fields !== "object") throw new Error();
    return { text, fields };
  } catch {
    errors.push({ line, message: "Fields suffix must be a valid JSON object after '::'." });
    return { text };
  }
}

function fieldsSuffix(fields) {
  return fields && Object.keys(fields).length ? ` :: ${JSON.stringify(fields)}` : "";
}
