/**
 * Authoring service used by the agent API, the MCP server and the CLI.
 *
 * It encodes the workflow from AGENTS.md so every agent gets the same
 * guarantees as the in-repo seed scripts:
 *   map Markdown / Mermaid / JSON -> validated model -> classified loops;
 *   story Markdown -> Presentation V2 bound to the real map (mapRef + camera)
 *   -> lint against the map -> persisted Presentation (one per map).
 */
import { compileLoopMarkdown, serializeLoopMarkdown } from "../../src/language/loopMarkdown.js";
import { importMermaid } from "../../src/language/mermaid.js";
import {
  compilePresentationMarkdown,
  serializePresentationMarkdown
} from "../../src/language/presentationMarkdown.js";
import { normalizeModel, slugId, validateModel } from "../../src/core/model.js";
import { classifyLoop, discoverLoops } from "../../src/core/loops.js";
import { normalizeFocus, normalizePresentation } from "../../src/presentation/schema.js";
import { lintPresentation } from "../../src/presentation/lint.js";
import { HttpError } from "../http.js";
import { STARTER_MAP_ID } from "./registry.js";

const MAX_SOURCE_CHARS = 400_000;

export class AuthoringError extends HttpError {
  constructor(message, details) {
    super(422, message, details);
    this.name = "AuthoringError";
  }
}

/** Compile any supported map source into a validated model + report. */
export function compileMapSource({ markdown, mermaid, model, id, title, description } = {}) {
  let compiled;
  let format;
  try {
    if (typeof markdown === "string" && markdown.trim()) {
      guardSize(markdown, "markdown");
      compiled = compileLoopMarkdown(markdown);
      format = "loop-markdown";
      // A Markdown note with an embedded ```mermaid block (and no
      // "## Variables" section) is a common agent input: read the diagram.
      const embedded = markdown.match(/```mermaid\s*\n([\s\S]*?)```/)?.[1];
      if (!(compiled.nodes || []).length && embedded) {
        const mapTitle = title || markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Mapa importado";
        compiled = importMermaid(embedded, { id: id || slugId(mapTitle, "mapa"), title: mapTitle });
        format = "markdown-mermaid";
      }
    } else if (typeof mermaid === "string" && mermaid.trim()) {
      guardSize(mermaid, "mermaid");
      const mapTitle = title || "Mapa importado";
      compiled = importMermaid(mermaid, { id: id || slugId(mapTitle, "mapa"), title: mapTitle });
      format = "mermaid";
    } else if (model && typeof model === "object") {
      compiled = normalizeModel(model);
      format = "model-json";
    } else {
      throw new AuthoringError("Provide one of: markdown (.loop.md), mermaid, or model.");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new AuthoringError(error.message, error.errors ? { errors: error.errors } : undefined);
  }

  const next = normalizeModel({
    ...compiled,
    ...(id ? { id: slugId(id, "mapa") } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {})
  });
  const report = analyzeModel(next);
  if (format !== "model-json" && !(next.nodes || []).length) {
    throw new AuthoringError("The map has no variables. Use a \"## Variables\" section (see get_authoring_guide) or a Mermaid graph.");
  }
  if (!report.valid) throw new AuthoringError("The map is not valid.", { errors: report.errors, report });
  return { model: next, format, report };
}

/** Structural report an agent can use to audit polarity and cycles. */
export function analyzeModel(model) {
  const validation = validateModel(model);
  const edgesById = new Map((model.edges || []).map(edge => [edge.id, edge]));
  const errors = [...validation.errors];
  const warnings = [];
  const curatedLoops = (model.loops || []).map(loop => {
    const edges = (loop.edgeIds || []).map(edgeId => edgesById.get(edgeId));
    const missing = (loop.edgeIds || []).filter(edgeId => !edgesById.has(edgeId));
    if (missing.length) errors.push(`Loop ${loop.id} references unknown edges: ${missing.join(", ")}.`);
    const derived = missing.length ? null : classifyLoop(edges);
    const declared = declaredLoopType(loop);
    if (derived && declared && declared !== derived) {
      warnings.push(`Loop ${loop.id} is labelled ${declared} but its signs make it ${derived}. Review the relation signs.`);
    }
    if (!missing.length && !isClosedCycle(edges)) {
      warnings.push(`Loop ${loop.id} is not an ordered directed cycle; keep it as a presentation path instead.`);
    }
    return {
      id: loop.id,
      label: loop.label || loop.title || loop.id,
      type: derived,
      declared_type: declared,
      edge_ids: loop.edgeIds || []
    };
  });
  let discovered = [];
  try {
    discovered = discoverLoops(model, { maxLength: 8, maxLoops: 50 }).map(loop => ({
      edge_ids: loop.edgeIds,
      type: loop.type || classifyLoop(loop.edgeIds.map(edgeId => edgesById.get(edgeId)))
    }));
  } catch {
    discovered = [];
  }
  const curatedKeys = new Set(curatedLoops.map(loop => [...loop.edge_ids].sort().join("|")));
  const uncurated = discovered.filter(loop => !curatedKeys.has([...loop.edge_ids].sort().join("|")));
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      nodes: (model.nodes || []).length,
      edges: (model.edges || []).length,
      curated_loops: curatedLoops.length,
      discovered_cycles: discovered.length
    },
    loops: curatedLoops,
    uncurated_cycles: uncurated.slice(0, 20)
  };
}

/**
 * Create or update a map (backed by the loop + map records the application
 * edits). Returns the persisted loop record and whether it was created.
 */
export function upsertMap(store, { model, title, description_md, summary }) {
  const mapTitle = title || model.title || model.id;
  const description = description_md ?? model.description ?? "";
  const existing = store.getLoop(model.id);
  if (existing) {
    const loop = store.updateLoop(model.id, {
      title: mapTitle,
      summary: summary ?? model.description ?? existing.summary,
      description_md: description || existing.description_md,
      model
    });
    store.promoteLoopToMap(loop.id);
    return { loop, created: false };
  }
  removeUntouchedStarter(store, model.id);
  const loop = store.createLoop({
    id: model.id,
    title: mapTitle,
    summary: summary ?? model.description ?? "",
    description_md: description,
    model
  });
  store.promoteLoopToMap(loop.id);
  return { loop, created: true };
}

/** A fresh workspace carries an empty starter map; drop it once real content arrives. */
function removeUntouchedStarter(store, incomingId) {
  if (incomingId === STARTER_MAP_ID) return;
  const loops = store.listLoops();
  if (loops.length !== 1 || loops[0].id !== STARTER_MAP_ID) return;
  const starter = loops[0];
  if ((starter.model?.nodes || []).length || (starter.model?.edges || []).length) return;
  store.deleteLoop(STARTER_MAP_ID);
  store.deleteMap(STARTER_MAP_ID);
}

/** Compile story Markdown (or a presentation object) against a real map. */
export function compileStorySource({ markdown, presentation, title }, { model }) {
  let parsed;
  try {
    if (typeof markdown === "string" && markdown.trim()) {
      guardSize(markdown, "markdown");
      parsed = compilePresentationMarkdown(markdown);
    } else if (presentation && typeof presentation === "object") {
      parsed = presentation;
    } else {
      throw new AuthoringError("Provide story markdown (.story.md) or a presentation object.");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new AuthoringError(error.message, error.errors ? { errors: error.errors } : undefined);
  }
  const bound = bindPresentation({ ...parsed, ...(title ? { title } : {}) }, model.id);
  const lint = lintPresentation(bound, { model, maps: [{ id: model.id, model }], views: [], assets: [] });
  const summary = {
    valid: lint.valid,
    errors: lint.errors.map(simplifyFinding),
    warnings: lint.warnings.map(simplifyFinding),
    scenes: bound.chapters.flatMap(chapter => chapter.scenes).length,
    beats: bound.chapters.flatMap(chapter => chapter.scenes).flatMap(scene => scene.beats || []).length
  };
  if (!lint.valid) throw new AuthoringError("The presentation does not match the map.", { lint: summary });
  const source_md = typeof markdown === "string" && markdown.trim()
    ? markdown
    : serializePresentationMarkdown(bound, { mode: "editorial" });
  return { presentation: { ...bound, source_md }, lint: summary };
}

/**
 * Presentation V2 camera contract: every scene references the real map and
 * declares an explicit camera intent derived from its focus.
 */
export function bindPresentation(presentation, mapId) {
  // Read the camera intent from the authored input: normalization fills an
  // implicit fit-map default that must not be mistaken for an explicit one.
  return normalizePresentation({
    ...presentation,
    chapters: (presentation.chapters || []).map(chapter => ({
      ...chapter,
      scenes: (chapter.scenes || []).map(scene => {
        const explicit = scene.stage?.camera?.mode;
        const mode = explicit && explicit !== "focus" ? explicit : cameraForBeats(scene.beats || []);
        return {
          ...scene,
          mapRef: { ...(scene.mapRef || {}), mapId },
          stage: { ...(scene.stage || {}), camera: { ...(scene.stage?.camera || {}), mode } }
        };
      })
    }))
  });
}

function cameraForBeats(beats) {
  const kinds = beats.map(beat => beat.focus ? normalizeFocus(beat.focus).kind : null)
    .filter(kind => kind && kind !== "custom");
  if (!kinds.length) return "fit-map";
  if (kinds.every(kind => kind === "path")) return "follow-path";
  if (kinds.every(kind => kind === "set")) return "fit-set";
  return "fit-focus";
}

/** One presentation per map: update the existing one instead of duplicating. */
export function upsertPresentationForMap(store, { mapId, presentation, id, title }) {
  const existing = (id && store.getPresentation(id)) ||
    store.listPresentations().find(record => presentationMapIds(record).includes(mapId));
  const nextTitle = title || presentation.title || store.getLoop(mapId)?.title || "Apresentação";
  if (existing) {
    return {
      presentation: store.updatePresentation(existing.id, { title: nextTitle, presentation }),
      created: false
    };
  }
  return {
    presentation: store.createPresentation({ id: id || `${mapId}-apresentacao`, title: nextTitle, presentation }),
    created: true
  };
}

export function presentationMapIds(record) {
  return [...new Set((record?.presentation?.chapters || [])
    .flatMap(chapter => chapter.scenes || [])
    .map(scene => scene.mapRef?.mapId)
    .filter(Boolean))];
}

export function mapToMarkdown(loop) {
  try {
    return serializeLoopMarkdown({ ...loop.model, title: loop.title, description: loop.summary || loop.model.description });
  } catch {
    return null;
  }
}

export function summarizeWorkspace(store) {
  const project = store.getProject();
  const presentations = store.listPresentations();
  return {
    project: { title: project?.title, description_md: project?.description_md, updated_at: project?.updated_at },
    maps: store.listLoops().map(loop => ({
      id: loop.id,
      title: loop.title,
      summary: loop.summary,
      nodes: (loop.model?.nodes || []).length,
      edges: (loop.model?.edges || []).length,
      loops: (loop.model?.loops || []).map(item => ({ id: item.id, label: item.label || item.id })),
      presentation_ids: presentations.filter(record => presentationMapIds(record).includes(loop.id)).map(record => record.id),
      updated_at: loop.updated_at
    })),
    presentations: presentations.map(record => ({
      id: record.id,
      title: record.title,
      map_ids: presentationMapIds(record),
      revision: record.revision,
      updated_at: record.updated_at
    }))
  };
}

/**
 * The compiler always derives `loop.type` from signs, so the author's intent
 * is read from the conventional R/B tag in the loop id or label.
 */
function declaredLoopType(loop) {
  for (const value of [loop.id, loop.label, loop.title]) {
    const tag = String(value || "").trim();
    if (/^R\d*(?:$|[^a-z])/i.test(tag)) return "reinforcing";
    if (/^B\d*(?:$|[^a-z])/i.test(tag)) return "balancing";
  }
  return null;
}

function isClosedCycle(edges) {
  if (!edges.length) return false;
  for (let index = 0; index < edges.length; index += 1) {
    const next = edges[(index + 1) % edges.length];
    if (edges[index].target !== next.source) return false;
  }
  return new Set(edges.map(edge => edge.id)).size === edges.length;
}

function simplifyFinding(finding) {
  return { id: finding.id, category: finding.category, message: finding.message, location: finding.location };
}

function guardSize(text, label) {
  if (text.length > MAX_SOURCE_CHARS) throw new AuthoringError(`The ${label} source exceeds ${MAX_SOURCE_CHARS} characters.`);
}
