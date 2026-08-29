import { compilePresentation } from "./compiler.js";
import { normalizePresentation } from "./schema.js";
import { createReferenceContext } from "./references.js";

const SEVERITY_RANK = { error: 3, warning: 2, info: 1 };

/**
 * Structural, causal, narrative, visual and accessibility checks. Findings
 * always point to stable presentation locations so the Studio can navigate
 * directly to the offending scene or beat.
 */
export function lintPresentation(input, context = {}, options = {}) {
  const presentation = normalizePresentation(input);
  const findings = [];
  const compiled = compilePresentation(presentation, context, { allowEmpty: false });
  compiled.errors.forEach((message, index) => findings.push({
    id: `structural-${index + 1}`,
    category: "structural",
    severity: "error",
    message,
    location: locateByMessage(presentation, message)
  }));
  runCausalRules(presentation, context, findings);
  runNarrativeRules(presentation, findings);
  runVisualRules(presentation, findings, options);
  runAccessibilityRules(presentation, findings);
  const ordered = findings.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.id.localeCompare(b.id));
  const scores = scoreFindings(ordered);
  return {
    presentation,
    compiled,
    findings: ordered,
    errors: ordered.filter(item => item.severity === "error"),
    warnings: ordered.filter(item => item.severity === "warning"),
    valid: !ordered.some(item => item.severity === "error"),
    scores,
    safeFixes: ordered.filter(item => item.safeFix)
  };
}

export function hasBlockingLint(findings = []) {
  return findings.some(item => item.severity === "error");
}

/** Apply only explicitly declared, deterministic fixes; never mutate the input. */
export function applyLintFix(presentation, finding) {
  if (!finding?.safeFix) return normalizePresentation(presentation);
  const next = clone(presentation);
  const path = String(finding.safeFix.field || "").split(".").filter(Boolean);
  if (!path.length) return normalizePresentation(next);
  let target = findLocationTarget(next, finding.location);
  if (!target) return normalizePresentation(next);
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (!target[key] || typeof target[key] !== "object") target[key] = {};
    target = target[key];
  }
  target[path.at(-1)] = finding.safeFix.value;
  return normalizePresentation(next);
}

export function applyLintFixes(presentation, findings = []) {
  return findings.filter(item => item?.safeFix).reduce((current, finding) => applyLintFix(current, finding), presentation);
}

function runCausalRules(presentation, context, findings) {
  const model = createReferenceContext(context).model;
  const loopIds = new Set((model.loops || []).map(loop => loop.id));
  const edgeIds = new Set((model.edges || []).map(edge => edge.id));
  forEachBeat(presentation, (beat, scene, chapter) => {
    const focus = beat.focus;
    if (focus?.kind === "loop" && !loopIds.has(focus.loopId)) return;
    if (focus?.kind === "path") {
      for (let index = 1; index < focus.edgeIds.length; index += 1) {
        const previous = model.edges?.find(edge => edge.id === focus.edgeIds[index - 1]);
        const next = model.edges?.find(edge => edge.id === focus.edgeIds[index]);
        if (previous && next && previous.target !== next.source) findings.push(finding(
          "causal-path-disconnected", "causal", "error",
          `O caminho do beat “${beat.title}” salta de ${previous.target} para ${next.source}.`,
          chapter, scene, beat
        ));
      }
    }
    if (focus?.kind === "set" && !focus.loopIds?.length && !focus.nodeIds?.length && !focus.edgeIds?.length) {
      findings.push(finding("causal-empty-set", "causal", "error", "O conjunto focal precisa conter ao menos um elemento.", chapter, scene, beat));
    }
    if (focus?.kind === "path" && focus.edgeIds.some(id => !edgeIds.has(id))) {
      findings.push(finding("causal-stale-path", "causal", "error", "O caminho contém uma relação removida do mapa.", chapter, scene, beat));
    }
    if (beat.type === "intervention" && !beat.intervention && !beat.focus) {
      findings.push(finding("causal-intervention-target", "causal", "error", "Uma intervenção precisa declarar o alvo que será alterado.", chapter, scene, beat));
    }
  });
}

function runNarrativeRules(presentation, findings) {
  const scenes = allScenes(presentation);
  if (!scenes.length) return;
  const hasSetup = scenes.some(({ chapter }) => chapter.role === "setup" || chapter.role === "custom" && scenes[0]?.scene === scenes.find(item => item.scene.type === "title")?.scene);
  if (!hasSetup) findings.push({
    id: "narrative-no-setup", category: "narrative", severity: "warning",
    message: "A apresentação começa sem uma orientação clara do sistema.", location: { chapterId: scenes[0].chapter.id, sceneId: scenes[0].scene.id }
  });
  const hasSynthesis = scenes.some(({ chapter, scene }) => chapter.role === "synthesis" || scene.type === "comparison" || scene.beats.some(beat => beat.type === "consequence"));
  if (!hasSynthesis) findings.push({
    id: "narrative-no-synthesis", category: "narrative", severity: "warning",
    message: "Inclua uma síntese ou consequência para fechar a leitura.", location: { chapterId: scenes.at(-1).chapter.id, sceneId: scenes.at(-1).scene.id }
  });
  const introductions = new Set();
  forEachBeat(presentation, (beat, scene, chapter) => {
    if (!beat.focus) return;
    for (const id of [...(beat.focus.nodeIds || []), ...(beat.focus.edgeIds || []), ...(beat.focus.loopIds || [])]) {
      if (introductions.has(id)) continue;
      introductions.add(id);
      if (!beat.narrationMd?.trim() && scene.type !== "title") findings.push(finding(
        "narrative-empty-introduction", "narrative", "warning", "O primeiro beat que introduz este elemento não tem narração.", chapter, scene, beat
      ));
    }
  });
}

function runVisualRules(presentation, findings, options) {
  const maxFocus = options.maxFocusItems || 14;
  forEachBeat(presentation, (beat, scene, chapter) => {
    const count = (beat.focus?.nodeIds?.length || 0) + (beat.focus?.edgeIds?.length || 0) + (beat.focus?.loopIds?.length || 0);
    if (count > maxFocus) findings.push(finding(
      "visual-overloaded-focus", "visual", "warning", `Este beat enfatiza ${count} elementos; considere dividir a cena.`, chapter, scene, beat
    ));
    if ((beat.focus?.kind === "node" || beat.focus?.kind === "edge" || beat.focus?.kind === "loop") && scene.stage.camera?.mode === "fit-map") findings.push(finding(
      "visual-fit-focused-beat", "visual", "info", "Um foco específico pode ganhar legibilidade com uma câmera focada.", chapter, scene, beat
    ));
  });
}

function runAccessibilityRules(presentation, findings) {
  for (const { chapter, scene } of allScenes(presentation)) {
    if (scene.type === "media" && scene.content.assetId && !scene.content.altText?.trim()) findings.push({
      id: `accessibility-alt-${scene.id}`, category: "accessibility", severity: "error",
      message: "Imagem local precisa de texto alternativo.", location: { chapterId: chapter.id, sceneId: scene.id }, safeFix: { field: "content.altText", value: scene.title }
    });
    for (const beat of scene.beats) if (beat.type === "question" && !beat.narrationMd?.trim()) findings.push({
      id: `accessibility-question-${beat.id}`, category: "accessibility", severity: "warning",
      message: "Uma pergunta sem texto não é compreensível para leitores de tela.", location: { chapterId: chapter.id, sceneId: scene.id, beatId: beat.id }
    });
  }
}

function forEachBeat(presentation, callback) {
  for (const chapter of presentation.chapters) for (const scene of chapter.scenes) for (const beat of scene.beats) callback(beat, scene, chapter);
}

function allScenes(presentation) {
  return presentation.chapters.flatMap(chapter => chapter.scenes.map(scene => ({ chapter, scene })));
}

function finding(id, category, severity, message, chapter, scene, beat) {
  return { id: `${id}-${beat.id}`, category, severity, message, location: { chapterId: chapter.id, sceneId: scene.id, beatId: beat.id } };
}

function locateByMessage(presentation, message) {
  const match = /(?:Scene|Beat) ([^ :]+)/.exec(message);
  if (!match) return {};
  for (const { chapter, scene } of allScenes(presentation)) {
    if (scene.id === match[1]) return { chapterId: chapter.id, sceneId: scene.id };
    const beat = scene.beats.find(item => item.id === match[1]);
    if (beat) return { chapterId: chapter.id, sceneId: scene.id, beatId: beat.id };
  }
  return {};
}

function scoreFindings(findings) {
  const categories = ["structural", "causal", "narrative", "visual", "accessibility", "pacing"];
  const scores = Object.fromEntries(categories.map(category => [category, 100]));
  for (const finding of findings) {
    if (!(finding.category in scores)) scores[finding.category] = 100;
    scores[finding.category] -= finding.severity === "error" ? 25 : finding.severity === "warning" ? 8 : 2;
  }
  for (const key of Object.keys(scores)) scores[key] = Math.max(0, scores[key]);
  scores.overall = Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.keys(scores).length);
  return scores;
}

function clone(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function findLocationTarget(presentation, location = {}) {
  const chapter = (presentation.chapters || []).find(item => item.id === location.chapterId);
  const scene = chapter?.scenes?.find(item => item.id === location.sceneId);
  if (location.beatId) return scene?.beats?.find(item => item.id === location.beatId);
  return scene || chapter || presentation;
}
