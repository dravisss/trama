export function extractLayout(model) {
  return {
    // A browser snapshot is an immediate recovery point while SQLite saves
    // asynchronously. Keep v1 readable so existing local projects survive.
    version: 2,
    modelId: model.id,
    savedAt: new Date().toISOString(),
    layoutState: model.layoutState || "generated",
    layoutMeta: model.layoutMeta ? { ...model.layoutMeta } : null,
    nodes: Object.fromEntries(model.nodes.map(node => [
      node.id,
      {
        position: node.position ? { ...node.position } : null,
        locked: Boolean(node.locked)
      }
    ])),
    edges: Object.fromEntries(model.edges.map(edge => [
      edge.id,
      edge.route ? { route: { ...edge.route } } : { route: null }
    ])),
    loops: (model.loops || []).map(loop => ({ ...loop, edgeIds: [...loop.edgeIds] }))
  };
}

export function applySavedLayout(model, layout) {
  if (!layout || ![1, 2].includes(layout.version) || layout.modelId !== model.id) return cloneModel(model);

  return {
    ...cloneModel(model),
    layoutState: layout.layoutState || model.layoutState || "generated",
    ...(layout.layoutMeta ? { layoutMeta: { ...layout.layoutMeta } } : {}),
    nodes: model.nodes.map(node => {
      const saved = layout.nodes?.[node.id];
      if (!saved?.position || !isPosition(saved.position)) return { ...node };
      return {
        ...node,
        position: { ...saved.position },
        locked: Boolean(saved.locked)
      };
    }),
    edges: model.edges.map(edge => {
      const saved = layout.edges?.[edge.id]?.route;
      return saved ? { ...edge, route: { ...saved } } : { ...edge };
    }),
    loops: (layout.loops || []).map(loop => ({ ...loop, edgeIds: [...loop.edgeIds] }))
  };
}

export function cloneModel(model) {
  return {
    ...model,
    nodes: model.nodes.map(node => ({
      ...node,
      ...(node.position ? { position: { ...node.position } } : {})
    })),
    edges: model.edges.map(edge => ({
      ...edge,
      ...(edge.route ? { route: { ...edge.route } } : {})
    })),
    loops: (model.loops || []).map(loop => ({ ...loop, edgeIds: [...loop.edgeIds] }))
  };
}

function isPosition(position) {
  return Number.isFinite(position.x) && Number.isFinite(position.y);
}
