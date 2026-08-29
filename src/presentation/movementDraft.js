import { applyMovementToBeat, resolveCausalMovement } from "./causalEditing.js";

/**
 * Translate the visual movement composer into the existing Presentation V2
 * beat contract. This is intentionally pure: the modal can evolve without
 * coupling persistence, camera resolution, or the Story Studio DOM to it.
 */
export function createMovementBeat({ draft = {}, model = {}, loops = [], id = `beat-manual-${Date.now()}` } = {}) {
  const title = String(draft.title || "Novo movimento").trim() || "Novo movimento";
  const base = {
    id,
    type: draft.role || (draft.kind === "relation" || draft.kind === "path" ? "traverse" : "focus"),
    title,
    narrationMd: typeof draft.narration === "string" ? draft.narration : "",
    timing: {
      durationMs: positive(draft.durationMs, 5000),
      advance: draft.advance === "auto" ? "auto" : "manual"
    },
    transition: { type: validTransition(draft.transition), durationMs: 320 }
  };

  if (draft.kind === "map") {
    return {
      beat: {
        ...withCamera(base, "fit-map"),
        movement: { kind: "map" }
      },
      errors: []
    };
  }

  if (draft.kind === "loop") {
    const loopCatalog = [...(model.loops || []), ...(loops || [])].filter((loop, index, all) => loop?.id && all.findIndex(item => item.id === loop.id) === index);
    if (!draft.loopId || !loopCatalog.some(loop => loop.id === draft.loopId)) {
      return { beat: null, errors: ["Escolha um loop existente no mapa."] };
    }
    return {
      beat: {
        ...base,
        movement: { kind: "loop", loopId: draft.loopId },
        focus: { kind: "loop", loopId: draft.loopId },
        delta: { camera: { mode: "fit-focus" } }
      },
      errors: []
    };
  }

  if (draft.kind === "path") {
    const edgeIds = [...(draft.edgeIds || [])];
    const errors = validatePath(edgeIds, model.edges || []);
    if (errors.length) return { beat: null, errors };
    return {
      beat: {
        ...base,
        movement: { kind: "path", edgeIds },
        focus: { kind: "path", edgeIds },
        delta: { camera: { mode: "follow-path" } }
      },
      errors: []
    };
  }

  const movement = resolveCausalMovement(model, draft.sourceNodeId, draft.targetNodeId)
    || (draft.edgeId ? movementForEdge(model, draft.edgeId) : null);
  if (!movement) return { beat: null, errors: ["Escolha uma relação causal existente no mapa."] };
  const applied = applyMovementToBeat(base, movement);
  return {
    beat: { ...applied, type: base.type, delta: { ...(applied.delta || {}), camera: { mode: "follow-path" } } },
    errors: []
  };
}

export function validatePath(edgeIds = [], edges = []) {
  if (!edgeIds.length) return ["Selecione ao menos uma relação para formar o caminho."];
  const byId = new Map(edges.map(edge => [edge.id, edge]));
  const errors = [];
  edgeIds.forEach(edgeId => {
    if (!byId.has(edgeId)) errors.push(`A relação ${edgeId} não existe neste mapa.`);
  });
  for (let index = 1; index < edgeIds.length; index += 1) {
    const previous = byId.get(edgeIds[index - 1]);
    const next = byId.get(edgeIds[index]);
    if (previous && next && previous.target !== next.source) errors.push("As relações do caminho precisam ser contínuas.");
  }
  return [...new Set(errors)];
}

function movementForEdge(model, edgeId) {
  const edge = (model.edges || []).find(item => item.id === edgeId);
  return edge ? resolveCausalMovement(model, edge.source, edge.target) : null;
}

function withCamera(beat, mode) {
  return { ...beat, delta: { camera: { mode } } };
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function validTransition(value) {
  return new Set(["cut", "dissolve", "slide", "morph-stage"]).has(value) ? value : "dissolve";
}
