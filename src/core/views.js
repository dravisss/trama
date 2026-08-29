export class ViewResolutionError extends Error {
  constructor(message) {
    super(message);
    this.name = "ViewResolutionError";
  }
}

export function resolveView(view, views = []) {
  if (!view) return null;
  const byId = new Map(views.map(item => [item.id, item]));
  const chain = [];
  const visited = new Set();
  let current = view;
  while (current) {
    if (visited.has(current.id)) throw new ViewResolutionError(`Circular base view reference at '${current.id}'.`);
    if (current.id) visited.add(current.id);
    chain.unshift(current);
    const baseId = current.base_view_id || current.settings?.extends;
    current = baseId ? byId.get(baseId) : null;
    if (baseId && !current) throw new ViewResolutionError(`Unknown base view '${baseId}'.`);
  }
  return chain.reduce((result, item) => ({
    ...result,
    ...item,
    id: view.id,
    title: view.title,
    settings: { ...(result.settings || {}), ...(item.settings || {}) },
    rules: [...(result.rules || []), ...(item.rules || [])],
    source_views: chain.map(source => source.id).filter(Boolean)
  }), { settings: {}, rules: [] });
}

export function buildViewLegend(view) {
  return (view?.rules || []).flatMap(rule => {
    const selector = rule.selector || {};
    if (!selector.attribute) return [];
    const properties = rule.properties || {};
    const visual = properties.fill || properties.color || properties["stroke-color"] || properties["badge-fill"];
    if (!visual && !properties.shape && !properties.highlight) return [];
    return [{
      id: `${selector.type}-${selector.attribute}-${selector.value}`,
      label: properties.legend || `${selector.attribute}: ${selector.value}`,
      type: selector.type,
      color: visual || "#7a8a72",
      shape: properties.shape || (selector.type === "relation" ? "line" : "ellipse")
    }];
  });
}

export function stylePropertiesForEntity(view, type, data = {}) {
  return (view?.rules || []).reduce((properties, rule) => {
    if (rule.selector?.type !== type || !matchesSelector(rule.selector, data)) return properties;
    return { ...properties, ...(rule.properties || {}) };
  }, {});
}

function matchesSelector(selector, data) {
  if (!selector.attribute) return true;
  if (selector.attribute === "tag") return (data.tags || []).includes(selector.value);
  if (selector.attribute === "field") {
    const fields = data.fields || {};
    const match = String(selector.value).match(/^([^:=]+)[:=](.+)$/);
    if (match) return String(fields[match[1]]) === match[2];
    return Object.prototype.hasOwnProperty.call(fields, selector.value) ||
      Object.values(fields).some(value => String(value) === String(selector.value));
  }
  return String(data[selector.attribute]) === String(selector.value);
}
