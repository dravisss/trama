import { normalizePresentation } from "../presentation/schema.js";

export class PresentationLanguageError extends Error {
  constructor(errors = []) {
    super(`Invalid presentation document:\n${errors.map(error => `- line ${error.line}: ${error.message}`).join("\n")}`);
    this.name = "PresentationLanguageError";
    this.errors = errors;
  }
}

/**
 * Compile the deliberately small, stable `.story.md` representation. The
 * format is human-editable, keeps advanced state in inline JSON, and uses
 * headings for the presentation -> chapter -> scene -> beat hierarchy.
 */
export function compilePresentationMarkdown(source) {
  if (looksLikeEditorialMarkdown(source)) return compileEditorialMarkdown(source);
  const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
  const errors = [];
  const raw = { schemaVersion: 2, chapters: [] };
  let scope = "root";
  let chapter = null;
  let scene = null;
  let beat = null;
  let continuation = null;

  const finishContinuation = () => {
    if (!continuation) return;
    const { target, key, lines } = continuation;
    const text = lines.join("\n").replace(/\n+$/, "");
    if (target === scene && key === "bodyMd") {
      target.content = { ...(target.content || {}), bodyMd: text };
    } else if (target === scene && key === "speakerNotesMd") {
      target.content = { ...(target.content || {}), speakerNotesMd: text };
    } else {
      target[key] = text;
    }
    continuation = null;
  };
  const assign = (target, key, value, line) => {
    const normalizedKey = key.toLowerCase();
    const textKeys = new Set(["title", "summary", "intent", "theme", "themeid", "theme-id", "body", "narration", "speaker-notes", "speaker_notes", "caption", "alt", "alttext", "content-layout"]);
    const jsonKeys = new Set(["audience", "settings", "tags", "fields", "custom-fields", "map", "mapref", "view", "causal-frame", "causalframe", "stage", "transition", "timing", "delta", "intervention", "evidence", "flow", "visibility", "emphasis", "annotations", "interaction-policy"]);
    const keyMap = {
      "theme": "themeId", "themeid": "themeId", "theme-id": "themeId", "speaker-notes": "speakerNotesMd", "speaker_notes": "speakerNotesMd",
      "narration": "narrationMd", "alt": "altText", "alttext": "altText", "content-layout": "contentLayout",
      "causal-frame": "causalFrame", "causalframe": "causalFrame", "map": "mapRef", "view": "mapRef",
      "custom-fields": "customFields", "interaction-policy": "interactionPolicy"
    };
    const outputKey = keyMap[normalizedKey] || normalizedKey;
    if (textKeys.has(normalizedKey)) {
      target[outputKey] = unescapeText(value);
      if (normalizedKey === "body") target.content = { ...(target.content || {}), bodyMd: target[outputKey] };
      if (normalizedKey === "speaker-notes" || normalizedKey === "speaker_notes") {
        if (target === scene) target.content = { ...(target.content || {}), speakerNotesMd: target[outputKey] };
      }
      if (normalizedKey === "narration") target.narrationMd = target[outputKey];
      return;
    }
    if (normalizedKey === "schema-version" || normalizedKey === "schemaversion") {
      target.schemaVersion = Number(value);
      return;
    }
    if (normalizedKey === "role" || normalizedKey === "type" || normalizedKey === "id") {
      target[outputKey] = unescapeText(value);
      return;
    }
    if (normalizedKey === "focus") {
      target.focus = parseFocusValue(value, line, errors);
      return;
    }
    if (normalizedKey === "duration" || normalizedKey === "duration-ms" || normalizedKey === "default-duration") {
      target[normalizedKey === "default-duration" ? "defaultBeatDurationMs" : "durationMs"] = Number(value);
      if (normalizedKey === "default-duration" && target === raw) raw.settings = { ...(raw.settings || {}), defaultBeatDurationMs: Number(value) };
      if (target === raw.settings) target.defaultBeatDurationMs = Number(value);
      if (target === scene?.timing) target.durationMs = Number(value);
      if (target === beat?.timing) target.durationMs = Number(value);
      return;
    }
    if (normalizedKey === "advance") {
      target.advance = value;
      return;
    }
    if (jsonKeys.has(normalizedKey) || value.startsWith("{") || value.startsWith("[")) {
      const parsed = (normalizedKey === "map" || normalizedKey === "mapref") && !value.startsWith("{") && !value.startsWith("[")
        ? value
        : parseJson(value, line, errors);
      if (parsed !== undefined) {
        if (normalizedKey === "audience") raw.audience = parsed;
        else if (normalizedKey === "settings") raw.settings = parsed;
        else if (normalizedKey === "map" || normalizedKey === "mapref") target.mapRef = typeof parsed === "string" ? { mapId: parsed } : parsed;
        else if (normalizedKey === "view") target.mapRef = { ...(target.mapRef || {}), viewId: typeof parsed === "string" ? parsed : parsed?.viewId };
        else if (normalizedKey === "transition") target.transition = typeof parsed === "string" ? parsed : parsed;
        else if (normalizedKey === "timing") target.timing = parsed;
        else if (normalizedKey === "stage") target.stage = parsed;
        else if (normalizedKey === "delta") target.delta = parsed;
        else if (normalizedKey === "causal-frame" || normalizedKey === "causalframe") target.causalFrame = parsed;
        else if (normalizedKey === "intervention") target.intervention = parsed;
        else if (normalizedKey === "fields") target.fields = parsed;
        else target[outputKey] = parsed;
      }
      return;
    }
    if (normalizedKey === "autoplay") {
      raw.settings = { ...(raw.settings || {}), autoplay: value === "true" };
      return;
    }
    errors.push({ line, message: `Unknown ${scope} property '${key}'.` });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    const lineNumber = index + 1;
    if (!line) continue;
    if (/^\s+/.test(rawLine) && continuation) {
      continuation.lines.push(rawLine.replace(/^\s{2}/, ""));
      continue;
    }
    finishContinuation();
    if (line.startsWith("<!--")) continue;
    const title = line.match(/^#\s+(.+)$/);
    if (title) {
      raw.title = unescapeText(title[1]);
      continue;
    }
    const chapterHeading = line.match(/^##\s+Chapter\s+([\w-]+)(?:\s+(.+))?$/i);
    if (chapterHeading) {
      chapter = { id: chapterHeading[1], title: unescapeText(chapterHeading[2] || chapterHeading[1]), scenes: [] };
      raw.chapters.push(chapter);
      scene = null;
      beat = null;
      scope = "chapter";
      continue;
    }
    const sceneHeading = line.match(/^###\s+Scene\s+([\w-]+)(?:\s+(.+))?$/i);
    if (sceneHeading) {
      if (!chapter) errors.push({ line: lineNumber, message: "Scene requires a chapter heading." });
      else {
        scene = { id: sceneHeading[1], title: unescapeText(sceneHeading[2] || sceneHeading[1]), beats: [] };
        chapter.scenes.push(scene);
        beat = null;
        scope = "scene";
      }
      continue;
    }
    const beatHeading = line.match(/^####\s+Beat\s+([\w-]+)(?:\s+(.+))?$/i);
    if (beatHeading) {
      if (!scene) errors.push({ line: lineNumber, message: "Beat requires a scene heading." });
      else {
        beat = { id: beatHeading[1], title: unescapeText(beatHeading[2] || beatHeading[1]) };
        scene.beats.push(beat);
        scope = "beat";
      }
      continue;
    }
    const entry = rawLine.match(/^\s*([\w-]+)\s*:\s*(.*)$/);
    if (!entry) {
      errors.push({ line: lineNumber, message: "Expected a heading or key: value entry." });
      continue;
    }
    const [, key, value] = entry;
    const target = scope === "beat" ? beat : scope === "scene" ? scene : scope === "chapter" ? chapter : raw;
    if (!target) {
      errors.push({ line: lineNumber, message: "Property has no active presentation object." });
      continue;
    }
    if (value === "|") {
      const continuationKey = key.toLowerCase();
      continuation = {
        target,
        key: continuationKey === "narration" ? "narrationMd"
          : continuationKey === "body" ? "bodyMd"
            : continuationKey === "speaker-notes" || continuationKey === "speaker_notes" ? "speakerNotesMd" : key,
        lines: []
      };
      continue;
    }
    assign(target, key, value, lineNumber);
  }
  finishContinuation();
  if (errors.length) throw new PresentationLanguageError(errors);
  try {
    return normalizePresentation(raw);
  } catch (error) {
    throw new PresentationLanguageError((error.errors || [error.message]).map(message => ({ line: 1, message })));
  }
}

/**
 * Editorial Markdown intentionally hides implementation details. It is the
 * format shown to non-technical authors; the existing V2 format remains
 * supported for backwards compatibility and advanced round-tripping.
 */
export function serializePresentationMarkdown(input, { mode = "technical" } = {}) {
  if (mode === "editorial") return serializeEditorialMarkdown(input);
  const presentation = normalizePresentation(input);
  const lines = [
    `# ${escapeText(presentation.title)}`,
    "",
    `schemaVersion: ${presentation.schemaVersion}`,
    `summary: ${escapeText(presentation.summary)}`,
    `intent: ${escapeText(presentation.intent)}`,
    `audience: ${JSON.stringify(presentation.audience)}`,
    `settings: ${JSON.stringify(presentation.settings)}`,
    `themeId: ${escapeText(presentation.themeId)}`,
    ""
  ];
  for (const chapter of presentation.chapters) {
    lines.push(`## Chapter ${chapter.id} ${escapeText(chapter.title)}`, `role: ${chapter.role}`);
    if (chapter.summary) lines.push(`summary: ${escapeText(chapter.summary)}`);
    lines.push("");
    for (const scene of chapter.scenes) {
      lines.push(`### Scene ${scene.id} ${escapeText(scene.title)}`, `type: ${scene.type}`);
      if (scene.mapRef?.mapId) lines.push(`map: ${JSON.stringify(scene.mapRef)}`);
      if (scene.content.bodyMd) lines.push(...multiline("body", scene.content.bodyMd));
      if (scene.content.speakerNotesMd) lines.push(...multiline("speaker-notes", scene.content.speakerNotesMd));
      if (scene.content.caption) lines.push(`caption: ${escapeText(scene.content.caption)}`);
      if (scene.content.altText) lines.push(`altText: ${escapeText(scene.content.altText)}`);
      if (scene.stage && hasMeaningfulStage(scene.stage)) lines.push(`stage: ${JSON.stringify(scene.stage)}`);
      if (scene.causalFrame) lines.push(`causal-frame: ${JSON.stringify(scene.causalFrame)}`);
      if (scene.transition) lines.push(`transition: ${JSON.stringify(scene.transition)}`);
      if (scene.timing) lines.push(`timing: ${JSON.stringify(scene.timing)}`);
      lines.push("");
      for (const beat of scene.beats) {
        lines.push(`#### Beat ${beat.id} ${escapeText(beat.title)}`, `type: ${beat.type}`);
        if (beat.focus) lines.push(`focus: ${JSON.stringify(beat.focus)}`);
        if (beat.narrationMd) lines.push(...multiline("narration", beat.narrationMd));
        if (beat.speakerNotesMd) lines.push(...multiline("speaker-notes", beat.speakerNotesMd));
        if (beat.delta && Object.keys(beat.delta).length) lines.push(`delta: ${JSON.stringify(beat.delta)}`);
        if (beat.timing) lines.push(`timing: ${JSON.stringify(beat.timing)}`);
        if (beat.transition) lines.push(`transition: ${JSON.stringify(beat.transition)}`);
        if (beat.intervention) lines.push(`intervention: ${JSON.stringify(beat.intervention)}`);
        lines.push("");
      }
    }
  }
  return `${lines.join("\n").trim()}\n`;
}

function looksLikeEditorialMarkdown(source) {
  return /(^|\n)##\s+(?:Pr[óo]xima\s+)?Cena\s*:/i.test(String(source || ""));
}

function compileEditorialMarkdown(source) {
  const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
  const titleLine = lines.find(line => /^#\s+/.test(line.trim()));
  const title = unescapeText(titleLine ? titleLine.trim().replace(/^#\s+/, "") : "Nova apresentação");
  const titleIndex = titleLine ? lines.indexOf(titleLine) : -1;
  const raw = {
    schemaVersion: 2,
    title,
    summary: "",
    intent: "explain",
    chapters: [{ id: "chapter-1", title: "Apresentação", role: "custom", scenes: [] }]
  };
  let scene = null;
  let beat = null;
  let summaryLines = [];
  let beatLines = [];
  const finishBeat = () => {
    if (!beat) return;
    beat.narrationMd = beatLines.join("\n").trim();
    beatLines = [];
  };
  const finishScene = () => {
    finishBeat();
    if (scene) {
      scene.beats = scene.beats.map(beat => beat.focus ? beat : (scene.focus ? { ...beat, focus: scene.focus } : beat));
      delete scene.focus;
    }
    if (scene) raw.chapters[0].scenes.push(scene);
    scene = null;
    beat = null;
  };
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || trimmed === "---") continue;
    if (index === titleIndex) continue;
    const sceneHeading = trimmed.match(/^##\s+(?:Pr[óo]xima\s+)?Cena\s*:\s*(.+)$/i);
    if (sceneHeading) {
      finishScene();
      const sceneTitle = unescapeText(sceneHeading[1].trim());
      scene = {
        id: uniqueEditorialId("scene", sceneTitle, raw.chapters[0].scenes.map(item => item.id)),
        type: "stage",
        title: sceneTitle,
        content: { bodyMd: "", speakerNotesMd: "" },
        beats: []
      };
      continue;
    }
    const beatHeading = trimmed.match(/^###\s+(.+)$/);
    if (beatHeading && scene) {
      finishBeat();
      beat = {
        id: uniqueEditorialId("beat", beatHeading[1], scene.beats.map(item => item.id)),
        type: "focus",
        title: unescapeText(beatHeading[1].trim()),
        narrationMd: ""
      };
      scene.beats.push(beat);
      continue;
    }
    const focusLine = trimmed.match(/^focus\s*:\s*(.+)$/i);
    if (focusLine && (scene || beat)) {
      const target = beat || scene;
      target.focus = parseFocusValue(focusLine[1].trim(), index + 1, []);
      continue;
    }
    if (scene && beat) beatLines.push(lines[index].replace(/^\s{2}/, ""));
    else if (!scene) summaryLines.push(lines[index]);
    else if (scene && !beat) scene.content.bodyMd = `${scene.content.bodyMd || ""}${scene.content.bodyMd ? "\n" : ""}${lines[index]}`;
  }
  finishScene();
  raw.summary = summaryLines.join("\n").trim();
  return normalizePresentation(raw);
}

function serializeEditorialMarkdown(input) {
  const presentation = normalizePresentation(input);
  const lines = [`# ${escapeText(presentation.title)}`, ""];
  if (presentation.summary) lines.push(escapeText(presentation.summary), "");
  const scenes = presentation.chapters.flatMap(chapter => chapter.scenes || []);
  scenes.forEach((scene, sceneIndex) => {
    lines.push(`## Cena: ${escapeText(scene.title || `Cena ${sceneIndex + 1}`)}`);
    const sceneFocus = scene.beats?.find(beat => beat.focus)?.focus;
    if (sceneFocus) lines.push(`focus: ${serializeEditorialFocus(sceneFocus)}`);
    lines.push("");
    const firstBeatNarration = scene.beats?.[0]?.narrationMd;
    if (scene.content?.bodyMd && scene.content.bodyMd !== firstBeatNarration) {
      lines.push(escapeText(scene.content.bodyMd), "");
    }
    (scene.beats || []).forEach(beat => {
      lines.push(`### ${escapeText(beat.title)}`);
      if (beat.focus) lines.push(`focus: ${serializeEditorialFocus(beat.focus)}`);
      lines.push("");
      if (beat.narrationMd) lines.push(escapeText(beat.narrationMd), "");
      lines.push("");
    });
  });
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function serializeEditorialFocus(focus = {}) {
  if (focus.kind === "node") return `node ${focus.nodeId}`;
  if (focus.kind === "edge") return `edge ${focus.edgeId}`;
  if (focus.kind === "loop") return `loop ${focus.loopId}`;
  if (focus.kind === "path") return `path ${(focus.edgeIds || []).join(", ")}`;
  if (focus.kind === "set") {
    const entries = [
      ...(focus.nodeIds || []).map(id => `node:${id}`),
      ...(focus.edgeIds || []).map(id => `edge:${id}`),
      ...(focus.loopIds || []).map(id => `loop:${id}`)
    ];
    return `set ${entries.join(", ")}`;
  }
  if (focus.kind === "query") return `query ${focus.selector}`;
  if (focus.kind === "region") return `region ${focus.regionId}`;
  return JSON.stringify(focus);
}

function uniqueEditorialId(prefix, title, used = []) {
  const base = `${prefix}-${String(title || prefix).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || prefix}`;
  let id = base;
  let suffix = 2;
  while (used.includes(id)) id = `${base}-${suffix++}`;
  return id;
}

function parseFocusValue(value, line, errors) {
  if (value.startsWith("{") || value.startsWith("[")) return parseJson(value, line, errors);
  const match = value.match(/^(node|edge|loop|region|query)\s+(.+)$/i);
  if (match) {
    const kind = match[1].toLowerCase();
    const value = unescapeText(match[2]);
    if (kind === "query") return { kind, selector: value };
    return { kind, [`${kind}Id`]: value };
  }
  const path = value.match(/^path\s+(.+)$/i);
  if (path) return { kind: "path", edgeIds: path[1].split(/\s*,\s*/).filter(Boolean) };
  const set = value.match(/^set\s+(.+)$/i);
  if (set) {
    const entries = set[1].split(/\s*,\s*/).filter(Boolean);
    const result = { kind: "set", nodeIds: [], edgeIds: [], loopIds: [] };
    for (const entry of entries) {
      const typed = entry.match(/^(node|edge|loop):(.+)$/i);
      if (typed) result[{ node: "nodeIds", edge: "edgeIds", loop: "loopIds" }[typed[1].toLowerCase()]].push(typed[2]);
      else result.nodeIds.push(entry);
    }
    return result;
  }
  errors.push({ line, message: `Invalid focus '${value}'. Use JSON, node/edge/loop id, path e1,e2 or set id1,id2.` });
  return undefined;
}

function parseJson(value, line, errors) {
  try { return JSON.parse(value); }
  catch { errors.push({ line, message: "Value must be valid inline JSON." }); return undefined; }
}

function multiline(key, value) {
  return [`${key}: |`, ...String(value).split("\n").map(line => `  ${line}`)];
}

function hasMeaningfulStage(stage) {
  return Boolean(stage && (stage.camera?.mode && stage.camera.mode !== "fit-map" || stage.visibility?.focused?.length || stage.visibility?.ghost?.length || stage.emphasis?.length || stage.annotations?.length || stage.flow));
}

function escapeText(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

function unescapeText(value) {
  return String(value || "").replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
}
