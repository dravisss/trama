export function normalizeViewSnapshot(view, { requireId = true } = {}) {
  if (!view || typeof view !== "object") {
    throw new TypeError("View persistence requires a view snapshot.");
  }
  if (requireId && !view.id) {
    throw new TypeError("View persistence requires a view id.");
  }
  if (!view.map_id) {
    throw new TypeError("View persistence requires a map id.");
  }

  return {
    ...(view.id ? { id: view.id } : {}),
    map_id: view.map_id,
    title: view.title || view.id || "Vista padrão",
    settings: view.settings && typeof view.settings === "object" ? view.settings : {},
    rules: Array.isArray(view.rules) ? view.rules : [],
    style_source: typeof view.style_source === "string" ? view.style_source : ""
  };
}
