import { discoverLoops } from "../core/loops.js";
import { normalizePresentation } from "./schema.js";

/**
 * Deterministic, offline story planning for causal-loop presentations.
 * The director never changes the source model: it only returns an authored
 * presentation draft plus evidence explaining why each section was chosen.
 */
export function analyzeTopology(model = {}, options = {}) {
  const loops = usableLoops(model, options);
  const selectedIds = options.loopIds?.length
    ? new Set(options.loopIds)
    : new Set(loops.map(loop => loop.id));
  const selected = loops.filter(loop => selectedIds.has(loop.id));
  const nodeToLoops = new Map();
  const edgeToLoops = new Map();
  for (const loop of selected) {
    for (const nodeId of loop.nodeIds || []) addToIndex(nodeToLoops, nodeId, loop.id);
    for (const edgeId of loop.edgeIds || []) addToIndex(edgeToLoops, edgeId, loop.id);
  }
  const handoffs = [];
  for (let leftIndex = 0; leftIndex < selected.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < selected.length; rightIndex += 1) {
      const left = selected[leftIndex];
      const right = selected[rightIndex];
      const sharedNodes = intersect(left.nodeIds, right.nodeIds);
      const sharedEdges = intersect(left.edgeIds, right.edgeIds);
      if (!sharedNodes.length && !sharedEdges.length) continue;
      handoffs.push({
        fromLoopId: left.id,
        toLoopId: right.id,
        sharedNodeIds: sharedNodes,
        sharedEdgeIds: sharedEdges,
        strength: sharedEdges.length ? 2 : 1,
        rationale: sharedEdges.length
          ? "Os loops compartilham uma relação causal; a transição pode seguir a mesma aresta."
          : "Os loops compartilham uma variável; ela funciona como ponte editorial."
      });
    }
  }
  const order = orderLoops(selected, handoffs, options.primaryLoopId);
  const path = options.pathEdgeIds?.length
    ? [...options.pathEdgeIds]
    : inferBridgePath(model, order, handoffs);
  return {
    loops: selected,
    order,
    handoffs,
    path,
    nodeToLoops: Object.fromEntries([...nodeToLoops].map(([id, ids]) => [id, [...ids]])),
    edgeToLoops: Object.fromEntries([...edgeToLoops].map(([id, ids]) => [id, [...ids]]))
  };
}

export function suggestPresentation(model = {}, options = {}) {
  const topology = analyzeTopology(model, options);
  const used = new Set();
  const chapters = [];
  const selected = topology.order;
  const title = options.title || `${model.title || "Mapa causal"} · uma história`;
  const setupScene = {
    id: unique("scene-setup", used),
    type: "title",
    title: options.setupTitle || "O sistema em movimento",
    content: {
      title: options.setupTitle || "O sistema em movimento",
      bodyMd: options.setupNarration || model.description || "Vamos seguir as forças que mantêm este sistema em movimento."
    },
    mapRef: model.id ? { mapId: model.id } : undefined,
    stage: { camera: { mode: "fit-map" } },
    beats: [{
      id: unique("beat-setup", used),
      type: "focus",
      title: options.setupTitle || "O sistema em movimento",
      narrationMd: options.setupNarration || model.description || "Vamos seguir as forças que mantêm este sistema em movimento.",
      timing: { durationMs: 5000, advance: "manual" }
    }]
  };
  const setup = { id: unique("chapter-setup", used), title: "Orientação", role: "setup", scenes: [setupScene] };
  chapters.push(setup);

  const mechanismScenes = [];
  selected.forEach((loop, index) => {
    const edgeIds = loop.edgeIds || [];
    const beats = edgeIds.map((edgeId, edgeIndex) => ({
      id: unique(`beat-${loop.id}-${edgeId}`, used),
      type: "traverse",
      title: edgeTitle(model, edgeId, edgeIndex),
      narrationMd: model.edges?.find(edge => edge.id === edgeId)?.description || "Siga esta relação para ver o mecanismo do loop.",
      focus: { kind: "edge", edgeId },
      movement: (() => {
        const edge = model.edges?.find(item => item.id === edgeId);
        return edge ? { kind: "relation", edgeId, sourceNodeId: edge.source, targetNodeId: edge.target } : undefined;
      })(),
      delta: { reveal: { edgeIds: [edgeId] } },
      timing: { durationMs: options.beatDurationMs || 4200, advance: "manual" }
    }));
    mechanismScenes.push({
      id: unique(`scene-loop-${loop.id}`, used),
      type: "stage",
      title: loop.label || `Loop ${index + 1}`,
      content: {
        title: loop.label || `Loop ${index + 1}`,
        bodyMd: loop.description || `Este loop é um feedback ${loop.type === "reinforcing" ? "positivo" : "negativo"}.`
      },
      mapRef: model.id ? { mapId: model.id } : undefined,
      causalFrame: { primaryLoopId: loop.id, loopRoles: [{ loopId: loop.id, role: index === 0 ? "motor" : "side-effect" }] },
      stage: { camera: { mode: "fit-focus" }, visibility: { focused: [loop.id, ...edgeIds] } },
      beats: beats.length ? beats : [{
        id: unique(`beat-${loop.id}-entry`, used),
        type: "focus",
        title: loop.label || `Loop ${index + 1}`,
        narrationMd: loop.description || "Observe como este ciclo se mantém.",
        focus: { kind: "loop", loopId: loop.id },
        timing: { durationMs: 5000, advance: "manual" }
      }]
    });
    if (options.includeHandoffScenes === true && index < selected.length - 1) {
      const handoff = topology.handoffs.find(item =>
        item.fromLoopId === loop.id && item.toLoopId === selected[index + 1].id);
      if (handoff) {
        const bridgeId = handoff.sharedEdgeIds[0] || handoff.sharedNodeIds[0];
        const focus = handoff.sharedEdgeIds.length
          ? { kind: "edge", edgeId: bridgeId }
          : { kind: "node", nodeId: bridgeId };
        mechanismScenes.push({
          id: unique(`scene-handoff-${loop.id}-${selected[index + 1].id}`, used),
          type: "stage",
          title: "A ponte entre os loops",
          content: {
            title: "A ponte entre os loops",
            bodyMd: handoff.rationale
          },
          mapRef: model.id ? { mapId: model.id } : undefined,
          stage: { camera: { mode: "fit-focus" } },
          beats: [{
            id: unique(`beat-handoff-${loop.id}-${selected[index + 1].id}`, used),
            type: "handoff",
            title: "A ponte entre os loops",
            narrationMd: handoff.rationale,
            focus,
            timing: { durationMs: 4200, advance: "manual" }
          }]
        });
      }
    }
  });
  chapters.push({ id: unique("chapter-mechanism", used), title: "O mecanismo", role: "mechanism", scenes: mechanismScenes });

  const synthesisFocus = selected.length > 1
    ? { kind: "set", loopIds: selected.map(loop => loop.id) }
    : selected[0] ? { kind: "loop", loopId: selected[0].id } : undefined;
  chapters.push({
    id: unique("chapter-synthesis", used),
    title: "O que fica",
    role: "synthesis",
    scenes: [{
      id: unique("scene-synthesis", used),
      type: "narrative",
      title: options.synthesisTitle || "A leitura do sistema",
      content: {
        title: options.synthesisTitle || "A leitura do sistema",
        bodyMd: options.synthesisNarration || "O resultado não está em uma relação isolada, mas no padrão que emerge quando os loops se alimentam.",
        speakerNotesMd: "Retome a ponte entre os loops e nomeie a alavanca mais promissora."
      },
      mapRef: model.id ? { mapId: model.id } : undefined,
      stage: { camera: { mode: "fit-map" } },
      beats: [{
        id: unique("beat-synthesis", used),
        type: "consequence",
        title: options.synthesisTitle || "A leitura do sistema",
        narrationMd: options.synthesisNarration || "O resultado não está em uma relação isolada, mas no padrão que emerge quando os loops se alimentam.",
        focus: synthesisFocus,
        timing: { durationMs: 6000, advance: "manual" }
      }]
    }]
  });
  return normalizePresentation({
    schemaVersion: 2,
    id: options.id || `${model.id || "map"}-presentation-draft`,
    title,
    summary: options.summary || "Rascunho criado a partir da topologia do mapa.",
    intent: options.intent || "explain",
    audience: options.audience,
    settings: { autoplay: false, allowExplore: true },
    chapters,
    director: {
      generated: true,
      version: 1,
      rationale: {
        loopOrder: selected.map(loop => ({ loopId: loop.id, reason: "Ordenado por conectividade e papel estrutural no grafo." })),
        handoffs: topology.handoffs,
        path: topology.path
      }
    }
  });
}

/**
 * Repairs drafts produced by older directors that serialized every loop
 * relation as its own scene. Generated stories use a loop as the narrative
 * unit, so adjacent single-beat scenes that resolve to the same loop are
 * folded back into one scene without touching authored/manual presentations.
 */
export function repairGeneratedPresentation(presentation, model = {}) {
  if (!presentation?.director?.generated) return presentation;
  const loops = usableLoops(model, {});
  const edgeToLoopIds = new Map();
  for (const loop of loops) for (const edgeId of loop.edgeIds || []) {
    if (!edgeToLoopIds.has(edgeId)) edgeToLoopIds.set(edgeId, []);
    edgeToLoopIds.get(edgeId).push(loop.id);
  }
  let changed = false;
  const chapters = (presentation.chapters || []).map(chapter => {
    if (chapter.role !== "mechanism") return chapter;
    const scenes = [];
    for (const scene of chapter.scenes || []) {
      const explicitLoopId = scene.causalFrame?.primaryLoopId;
      const beatEdgeId = scene.beats?.length === 1 ? scene.beats[0]?.focus?.edgeId : null;
      const inferredLoopId = explicitLoopId || (edgeToLoopIds.get(beatEdgeId)?.length === 1 ? edgeToLoopIds.get(beatEdgeId)[0] : null);
      const previous = scenes.at(-1);
      const previousLoopId = previous?.causalFrame?.primaryLoopId;
      if (inferredLoopId && previous && previousLoopId === inferredLoopId && scene.beats?.length === 1 && previous.beats?.length) {
        scenes[scenes.length - 1] = { ...previous, beats: [...previous.beats, ...scene.beats] };
        changed = true;
        continue;
      }
      scenes.push(inferredLoopId && !explicitLoopId
        ? { ...scene, causalFrame: { ...(scene.causalFrame || {}), primaryLoopId: inferredLoopId } }
        : scene);
    }
    return scenes.length === (chapter.scenes || []).length && !changed ? chapter : { ...chapter, scenes };
  });
  return changed ? normalizePresentation({
    ...presentation,
    chapters,
    director: { ...presentation.director, repaired: true, repairVersion: 1 }
  }) : presentation;
}

function usableLoops(model, options) {
  const curated = Array.isArray(model.loops)
    ? model.loops.filter(loop => loop?.id && (loop.edgeIds || []).length)
    : [];
  const loops = curated.length
    ? curated
    : discoverLoops(model, { maxLength: options.maxLength || 8, maxLoops: options.maxLoops || 24 });
  return loops.filter(loop => loop?.id && (loop.edgeIds || []).length);
}

function orderLoops(loops, handoffs, primaryLoopId) {
  if (!loops.length) return [];
  const byId = new Map(loops.map(loop => [loop.id, loop]));
  const scores = new Map(loops.map(loop => [loop.id, (loop.edgeIds || []).length + (loop.nodeIds || []).length * 0.2]));
  if (primaryLoopId && byId.has(primaryLoopId)) scores.set(primaryLoopId, scores.get(primaryLoopId) + 1000);
  const result = [];
  const remaining = new Set(loops.map(loop => loop.id));
  let next = [...remaining].sort((a, b) => scores.get(b) - scores.get(a) || a.localeCompare(b))[0];
  while (next) {
    result.push(byId.get(next));
    remaining.delete(next);
    const candidates = handoffs
      .filter(item => item.fromLoopId === next && remaining.has(item.toLoopId))
      .sort((a, b) => b.strength - a.strength || a.toLoopId.localeCompare(b.toLoopId));
    next = candidates[0]?.toLoopId || [...remaining].sort((a, b) => scores.get(b) - scores.get(a) || a.localeCompare(b))[0];
  }
  return result;
}

function inferBridgePath(model, order, handoffs) {
  const edges = [];
  for (const handoff of handoffs) {
    if (!order.some(loop => loop.id === handoff.fromLoopId) || !order.some(loop => loop.id === handoff.toLoopId)) continue;
    if (handoff.sharedEdgeIds[0]) edges.push(handoff.sharedEdgeIds[0]);
  }
  return edges.filter(id => model.edges?.some(edge => edge.id === id));
}

function edgeTitle(model, edgeId, index) {
  const edge = model.edges?.find(item => item.id === edgeId);
  const source = model.nodes?.find(node => node.id === edge?.source)?.label || edge?.source;
  const target = model.nodes?.find(node => node.id === edge?.target)?.label || edge?.target;
  return edge ? `${source} → ${target}` : `Relação ${index + 1}`;
}

function addToIndex(index, key, value) {
  if (!index.has(key)) index.set(key, new Set());
  index.get(key).add(value);
}

function intersect(left = [], right = []) {
  const other = new Set(right);
  return [...new Set(left)].filter(value => other.has(value));
}

function unique(base, used) {
  let id = base;
  let index = 2;
  while (used.has(id)) id = `${base}-${index++}`;
  used.add(id);
  return id;
}
