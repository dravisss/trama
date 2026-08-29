export const INITIAL_PRESENTATION_STATE = Object.freeze({
  status: "idle",
  index: -1,
  exploring: false,
  savedIndex: -1,
  error: null
});

export function createPresentationState(compiled, initialIndex = 0) {
  const total = compiled?.timeline?.length || 0;
  if (!total) return { ...INITIAL_PRESENTATION_STATE, status: "empty" };
  const index = clamp(initialIndex, 0, total - 1);
  return { ...INITIAL_PRESENTATION_STATE, status: "ready", index, total };
}

export function reducePresentationState(state, event = {}) {
  const total = state.total || 0;
  if (event.type === "START") return total ? { ...state, status: "playing", index: clamp(event.index ?? state.index, 0, total - 1), error: null } : state;
  if (event.type === "PAUSE") return state.status === "playing" ? { ...state, status: "paused" } : state;
  if (event.type === "RESUME") return state.status === "paused" ? { ...state, status: "playing" } : state;
  if (event.type === "NEXT") return move(state, 1);
  if (event.type === "PREVIOUS") return move(state, -1);
  if (event.type === "GOTO") return total ? { ...state, index: clamp(event.index, 0, total - 1), status: state.status === "idle" ? "ready" : state.status } : state;
  if (event.type === "EXPLORE") return state.status === "playing" || state.status === "paused"
    ? { ...state, status: "exploring", exploring: true, savedIndex: state.index }
    : state;
  if (event.type === "RESUME_STORY") return { ...state, status: "playing", exploring: false, index: state.savedIndex >= 0 ? state.savedIndex : state.index };
  if (event.type === "COMPLETE") return { ...state, status: "complete", index: Math.max(0, total - 1) };
  if (event.type === "ERROR") return { ...state, status: "error", error: event.error || "Presentation error." };
  if (event.type === "CLOSE") return { ...INITIAL_PRESENTATION_STATE };
  return state;
}

function move(state, direction) {
  if (!state.total || state.status === "exploring") return state;
  const next = state.index + direction;
  if (next < 0 || next >= state.total) return direction > 0 ? { ...state, status: "complete" } : state;
  return { ...state, index: next, status: "playing" };
}

function clamp(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
}
