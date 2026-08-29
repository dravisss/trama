/**
 * Presentation style profiles are an additive rendering choice. They never
 * change the Presentation V2 timeline, semantic focus, or camera contract.
 */

export const DEFAULT_PRESENTATION_STYLE = "lower-third";

export const PRESENTATION_STYLE_PROFILES = Object.freeze({
  "lower-third": {
    id: "lower-third",
    label: "Legenda cinematográfica",
    cardMode: "lower-third",
    preserveMapContext: false,
    connector: "none"
  },
  "relation-tooltip": {
    id: "relation-tooltip",
    label: "Explicação contextual",
    cardMode: "tooltip",
    preserveMapContext: true,
    connector: "exact-focus",
    maxZoom: { edge: 1.55, "node-neighborhood": 1.7, loop: 1.2, path: 1.3, set: 1.3 }
  },
  "atlas-editorial": {
    id: "atlas-editorial",
    label: "Atlas editorial",
    cardMode: "atlas",
    preserveMapContext: true,
    connector: "exact-focus",
    maxZoom: { map: 1.16, edge: 1.62, "node-neighborhood": 1.72, loop: 1.24, path: 1.34, set: 1.34 },
    cameraMotion: {
      "fit-map": { duration: 960, easing: "ease-out-cubic" },
      "fit-focus": { duration: 820, easing: "ease-in-out-cubic" },
      "fit-set": { duration: 900, easing: "ease-in-out-cubic" },
      "follow-path": { duration: 1080, easing: "ease-in-out-cubic" },
      fixed: { duration: 700, easing: "ease-in-out-cubic" },
      split: { duration: 980, easing: "ease-in-out-cubic" }
    }
  }
});

export function normalizePresentationStyle(value) {
  return PRESENTATION_STYLE_PROFILES[value]?.id || DEFAULT_PRESENTATION_STYLE;
}

export function resolvePresentationStyle({ requested, presentation } = {}) {
  // An explicit URL is a reversible preview/QA override. Persisted settings
  // are otherwise the source of truth selected by the author in Story Studio.
  if (PRESENTATION_STYLE_PROFILES[requested]) return requested;
  return normalizePresentationStyle(presentation?.settings?.presentationStyle);
}

export function presentationStyleProfile(style) {
  return PRESENTATION_STYLE_PROFILES[normalizePresentationStyle(style)];
}

export function usesContextualPresentation(style) {
  return presentationStyleProfile(style).preserveMapContext;
}

export function isExactPresentationFocus(plan = {}) {
  const focus = plan.focus?.focus && typeof plan.focus.focus === "object" ? plan.focus.focus : plan.focus;
  const nodeIds = uniqueIds(plan.nodeIds || (focus?.nodeId ? [focus.nodeId] : focus?.nodeIds || []));
  const edgeIds = uniqueIds(plan.edgeIds || (focus?.edgeId ? [focus.edgeId] : focus?.edgeIds || []));
  const loopIds = uniqueIds(plan.loopIds || (focus?.loopId ? [focus.loopId] : focus?.loopIds || []));
  return (focus?.kind === "node" && nodeIds.length === 1 && edgeIds.length === 0 && loopIds.length === 0) ||
    (focus?.kind === "edge" && edgeIds.length === 1 && nodeIds.length === 0 && loopIds.length === 0);
}

export function presentationConnectorMode(style, plan = {}) {
  const profile = presentationStyleProfile(style);
  return profile.connector === "exact-focus" && isExactPresentationFocus(plan) ? "tethered" : "parked";
}

export function presentationCameraMaxZoom(style, plan = {}) {
  const profile = presentationStyleProfile(style);
  const cap = profile.maxZoom?.[plan.targetKind];
  return cap ? Math.min(plan.maxZoom || cap, cap) : plan.maxZoom;
}

export function presentationCameraMotion(style, plan = {}, { reduced = false } = {}) {
  if (reduced) return { duration: 0, easing: "linear" };
  const profile = presentationStyleProfile(style);
  return profile.cameraMotion?.[plan.mode] || { duration: 520, easing: "ease-in-out-cubic" };
}

function uniqueIds(ids = []) {
  return [...new Set((Array.isArray(ids) ? ids : []).filter(id => typeof id === "string" && id.length))];
}
