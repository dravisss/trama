import { nodeMediaEnvelope, normalizeNodeMedia } from "../core/nodeMedia.js";

export function createCytoscape({ container, model, theme, assetResolver, rendererOptions = {} }) {
  const elements = [
    ...model.nodes.map((node, index) => {
      const [border, fill] = theme.nodePalette[index % theme.nodePalette.length];
      return {
        data: {
          ...node,
          color: border,
          fill,
          mediaImage: resolveMediaImage(node, assetResolver),
          visualEnvelope: nodeMediaEnvelope(node)
        },
        ...(node.position ? { position: { ...node.position } } : {}),
        ...(node.locked !== undefined ? { locked: node.locked } : {})
      };
    }),
    ...model.edges.map(edge => ({
      data: {
        ...edge,
        ...(edge.route ? { route: { ...edge.route } } : {})
      },
      classes: edge.type === "balancing" ? "balancing-edge" : "reinforcing-edge"
    }))
  ];

  const cy = cytoscape({
    container,
    elements,
    layout: { name: "preset" },
    minZoom: 0.18,
    maxZoom: 2.4,
    selectionType: "additive",
    boxSelectionEnabled: true,
    ...rendererOptions,
    style: cytoscapeStyles(theme)
  });
  cy.data("loopDefinitions", (model.loops || []).map(loop => ({
    ...loop,
    edgeIds: [...(loop.edgeIds || [])]
  })));

  cy.edges().forEach(edge => {
    const route = edge.data("route");
    if (!route || !Number.isFinite(route.controlPointDistance)) return;
    edge.style({
      "control-point-distances": route.controlPointDistance,
      "control-point-weights": 0.5
    });
    edge.data("curveDistance", Math.round(route.controlPointDistance));
    edge.data("routeLocked", Boolean(route.locked));
  });

  cy.nodes().forEach(node => applyNodePresentation(node, { assetResolver }));

  return cy;
}

export function applyNodeOverrides(node, style = {}) {
  if (!node?.length || !style || typeof style !== "object") return;
  const overrides = {};
  if (style.shape) overrides.shape = style.shape;
  if (style.size) overrides.width = overrides.height = style.size;
  if (style.width) overrides.width = style.width;
  if (style.height) overrides.height = style.height;
  if (style.fill) overrides["background-color"] = style.fill;
  if (style.borderColor) overrides["border-color"] = style.borderColor;
  if (style.fontSize) overrides["font-size"] = style.fontSize;
  if (style.fontFamily) overrides["font-family"] = style.fontFamily;
  if (style.textColor) overrides.color = style.textColor;
  if (style.textMaxWidth) overrides["text-max-width"] = style.textMaxWidth;
  node.style(overrides);
}

export function applyNodePresentation(node, { assetResolver, mediaEnabled = true } = {}) {
  if (!node?.length) return;
  const data = node.data() || {};
  const label = String(data.label ?? "");
  const media = normalizeNodeMedia(data.media);
  const nextImage = resolveMediaImage(data, assetResolver);
  node.data("mediaImage", nextImage || null);
  node.data("visualEnvelope", nodeMediaEnvelope(data));
  applyNodeOverrides(node, data.style || {});
  if (!mediaEnabled || !media?.assetId || !nextImage) {
    node.style({
      "background-image": "none",
      "background-opacity": 1,
      "text-valign": "center",
      "text-margin-y": 0,
      "text-max-width": data.style?.textMaxWidth || 74,
      // `node.style()` receives concrete values. The `data(label)` mapping
      // belongs in the Cytoscape stylesheet below, not in a direct override.
      label
    });
    return;
  }
  const size = media.size;
  const labelBelow = media.labelPlacement === "below";
  const labelHidden = media.labelPlacement === "hidden";
  node.style({
    width: size,
    height: size,
    shape: data.style?.shape || "ellipse",
    "background-image": nextImage,
    "background-fit": media.fit,
    "background-clip": "node",
    "background-opacity": 1,
    "background-position-x": `${Math.round(media.focalPoint.x * 100)}%`,
    "background-position-y": `${Math.round(media.focalPoint.y * 100)}%`,
    "text-valign": labelBelow ? "bottom" : "center",
    "text-margin-y": labelBelow ? media.labelGap : 0,
    label: labelHidden ? "" : label,
    "text-max-width": Math.min(148, size + 24),
    "border-width": data.style?.borderWidth || 1.5,
    "underlay-shape": data.style?.shape || "ellipse",
    "underlay-padding": 7
  });
}

export function applyNodeMediaImage(node, { assetResolver, mediaEnabled = true } = {}) {
  if (!node?.length) return;
  const data = node.data() || {};
  const media = normalizeNodeMedia(data.media);
  const nextImage = resolveMediaImage(data, assetResolver);
  node.data("mediaImage", nextImage || null);
  if (!mediaEnabled || !media?.assetId || !nextImage) {
    node.style("background-image", "none");
    return;
  }
  // Rendition promotion is a paint-only operation. Reapplying the complete
  // node presentation here would write the master's base size as a direct
  // Cytoscape override and win over Atlas' 28/48px contextual classes.
  node.style({
    "background-image": nextImage,
    "background-fit": media.fit,
    "background-clip": "node",
    "background-position-x": `${Math.round(media.focalPoint.x * 100)}%`,
    "background-position-y": `${Math.round(media.focalPoint.y * 100)}%`
  });
}

export function applyMediaEdgeClearance(cy, { mediaEnabled = true } = {}) {
  if (!cy) return;
  cy.edges().forEach(edge => {
    const sourceMedia = mediaEnabled && normalizeNodeMedia(edge.source().data("media"));
    const targetMedia = mediaEnabled && normalizeNodeMedia(edge.target().data("media"));
    edge.style({
      // Keep the endpoint close by default. The routing optimizer already
      // sees the full image+label envelope and only needs this small local
      // breathing room at the node boundary.
      "source-distance-from-node": sourceMedia?.assetId ? 16 : 5,
      "target-distance-from-node": targetMedia?.assetId ? 22 : 9
    });
  });
}

function resolveMediaImage(node, assetResolver) {
  const assetId = node?.media?.assetId;
  if (!assetId || typeof assetResolver !== "function") return null;
  try {
    const result = assetResolver(assetId, node);
    return typeof result === "string" && result ? result : null;
  } catch {
    return null;
  }
}

export function cytoscapeStyles(theme) {
  const colors = theme.colors;
  return [
    {
      selector: "node",
      style: {
        width: theme.nodeSize,
        height: theme.nodeSize,
        shape: "ellipse",
        "background-color": "data(fill)",
        "border-width": 1.5,
        "border-color": "data(color)",
        label: "data(label)",
        color: colors.primary,
        "font-size": 11,
        "font-family": theme.fontFamily,
        "font-weight": "bold",
        "text-wrap": "wrap",
        "text-max-width": 74,
        "text-valign": "center",
        "text-halign": "center",
        "overlay-opacity": 0,
        "underlay-color": "data(color)",
        "underlay-padding": 7,
        "underlay-opacity": 0.06,
        "underlay-shape": "ellipse",
        "transition-property": "border-width, underlay-opacity, underlay-padding, opacity",
        "transition-duration": "180ms"
      }
    },
    {
      selector: "node.hovered, node:selected",
      style: {
        "border-width": 3,
        "border-color": colors.tertiary,
        "underlay-color": colors.tertiary,
        "underlay-opacity": 0.18,
        "underlay-padding": 13
      }
    },
    {
      selector: "node.connection-source",
      style: {
        "border-width": 4,
        "border-color": colors.tertiary,
        "underlay-color": colors.tertiary,
        "underlay-opacity": 0.3,
        "underlay-padding": 18
      }
    },
    {
      selector: "node.editor-workbench-node, node.explore-workbench-node",
      style: {
        "font-size": 12,
        "text-max-width": 96,
        "underlay-padding": 8
      }
    },
    {
      selector: "node:locked",
      style: {
        "border-style": "double",
        "border-width": 4,
        "underlay-opacity": 0.12
      }
    },
    {
      selector: "edge",
      style: {
        width: 1.8,
        "curve-style": "unbundled-bezier",
        "control-point-distances": 80,
        "control-point-weights": 0.5,
        "line-color": colors.secondary,
        "target-arrow-color": colors.secondary,
        "target-arrow-shape": "triangle",
        "arrow-scale": 1.35,
        // Treat an external node label as part of the node's visual boundary.
        // Cytoscape then intersects the edge with the nearest of the node
        // shape and its label instead of letting the line/arrow pass through
        // a label rendered below an image node.
        "source-endpoint": "outside-to-node-or-label",
        "target-endpoint": "outside-to-node-or-label",
        "source-distance-from-node": 5,
        "target-distance-from-node": 9,
        "overlay-opacity": 0,
        // Keep a generous invisible hit target without changing the visual
        // stroke. Thin causal paths remain selectable at notebook scale.
        "overlay-padding": 12,
        opacity: 0.76,
        "transition-property": "opacity, width",
        "transition-duration": "160ms"
      }
    },
    {
      selector: "edge.reinforcing-edge",
      style: { "line-color": colors.primary, "target-arrow-color": colors.primary }
    },
    {
      selector: "edge.balancing-edge",
      style: {
        "line-color": colors.secondary,
        "target-arrow-color": colors.secondary,
        "line-style": "dashed",
        "line-dash-pattern": [8, 5]
      }
    },
    { selector: "edge:selected", style: { width: 4, opacity: 1 } },
    {
      selector: "edge.annotation-focus",
      style: {
        width: 3,
        opacity: 1,
        "line-color": colors.tertiary,
        "target-arrow-color": colors.tertiary
      }
    },
    {
      selector: "edge.story-context",
      style: { width: 2.4, opacity: 1 }
    },
    {
      selector: "node.story-context",
      style: {
        "border-width": 2,
        opacity: 1
      }
    },
    {
      selector: "edge.story-current",
      style: {
        width: 3.8,
        opacity: 1,
        "line-color": colors.primary,
        "target-arrow-color": colors.primary,
        "arrow-scale": 1.55,
        "line-style": "dashed",
        "line-dash-pattern": [18, 7]
      }
    },
    {
      selector: "node.story-current-node",
      style: {
        "border-width": 4,
        "border-color": colors.tertiary,
        "underlay-color": colors.tertiary,
        "underlay-opacity": 0.24,
        "underlay-padding": 18
      }
    },
    {
      selector: "node.story-source-node",
      style: {
        "border-width": 3,
        "border-color": colors.secondary,
        "underlay-color": colors.secondary,
        "underlay-opacity": 0.14,
        "underlay-padding": 13
      }
    },
    {
      selector: "node.story-target-node",
      style: {
        "border-width": 5,
        "border-color": colors.primary,
        "underlay-color": colors.primary,
        "underlay-opacity": 0.28,
        "underlay-padding": 20
      }
    },
    {
      selector: "node.story-background",
      style: { opacity: 0.68 }
    },
    {
      selector: "edge.story-background",
      style: { opacity: 0.22 }
    },
    {
      selector: "node.atlas-context",
      style: {
        width: 28,
        height: 28,
        label: "",
        opacity: 0.22,
        "background-image-opacity": 0.72,
        "border-width": 2,
        "underlay-opacity": 0,
        "transition-property": "opacity, width, height, border-width, border-color, underlay-opacity, underlay-padding",
        "transition-duration": "420ms"
      }
    },
    {
      selector: "edge.atlas-context",
      style: {
        opacity: 0.14,
        width: 0.8,
        "arrow-scale": 0.68,
        "transition-property": "opacity, width, line-color, target-arrow-color",
        "transition-duration": "420ms"
      }
    },
    {
      selector: "node.atlas-context.atlas-poster-loop",
      style: {
        width: 46,
        height: 46,
        label: "data(label)",
        opacity: 0.7,
        "text-opacity": 0.8,
        "font-size": 9,
        "background-image-opacity": 0.9,
        "border-color": "#91a98d",
        "border-width": 2.5,
        "underlay-color": "#c8d8c1",
        "underlay-opacity": 0.16,
        "underlay-padding": 11,
        "z-index": 8
      }
    },
    {
      selector: "edge.atlas-context.atlas-poster-loop",
      style: {
        opacity: 0.64,
        width: 1.8,
        "arrow-scale": 0.96,
        "line-color": "#728a70",
        "target-arrow-color": "#728a70",
        "underlay-color": "#d6e2cf",
        "underlay-opacity": 0.28,
        "underlay-padding": 4,
        "z-index": 7
      }
    },
    {
      selector: "node.atlas-near-context",
      style: {
        width: 48,
        height: 48,
        label: "data(label)",
        opacity: 0.62,
        "text-opacity": 0.72,
        "font-size": 8.4,
        "text-max-width": 82,
        "border-color": "#9baa98"
      }
    },
    {
      selector: "edge.atlas-near-context",
      style: { opacity: 0.34, width: 1 }
    },
    {
      selector: "node.atlas-focus-node",
      style: {
        width: 116,
        height: 116,
        label: "data(label)",
        opacity: 1,
        "text-opacity": 1,
        "font-family": "Noto Serif, Georgia, serif",
        "font-size": 14.5,
        "font-weight": 600,
        "text-max-width": 126,
        "text-valign": "bottom",
        "text-margin-y": 12,
        color: "#203a2c",
        "text-background-color": "#fffef8",
        "text-background-opacity": 0.94,
        "text-background-padding": 3,
        "background-image-opacity": 1,
        "border-color": "#6f9f5f",
        "border-width": 3,
        "underlay-color": "#cfe1c5",
        "underlay-opacity": 0.28,
        "underlay-padding": 20,
        "z-index": 12
      }
    },
    {
      selector: "node.atlas-context.atlas-embed-compositor-motion",
      style: {
        // Blob-backed editorial renditions are cheap enough to retain the
        // official Atlas choreography: the focused nodes grow while the
        // surrounding system recedes continuously instead of snapping.
        "transition-property": "opacity, width, height, border-width, border-color, underlay-opacity, underlay-padding"
      }
    },
    {
      selector: "node.atlas-near-context.atlas-embed-compositor-motion",
      style: {
        "transition-property": "opacity, width, height, border-width, border-color"
      }
    },
    {
      selector: "node.atlas-focus-node.atlas-embed-compositor-motion",
      style: {
        // Flow pulses underlay padding on every RAF. Including it in this
        // transition creates a perpetually restarting animation queue.
        "transition-property": "opacity, width, height, border-width, border-color",
        "transition-duration": "420ms"
      }
    },
    {
      selector: "node.atlas-focus-source",
      style: { "border-color": "#bd9960", "underlay-color": "#ead9b8" }
    },
    {
      selector: "node.atlas-focus-target",
      style: { "border-color": "#609852", "underlay-color": "#c8dfbb" }
    },
    {
      selector: "edge.atlas-focus-edge",
      style: {
        opacity: 1,
        width: 4.1,
        "line-style": "dashed",
        "line-dash-pattern": [3, 8],
        "line-color": "#4f8745",
        "target-arrow-color": "#4f8745",
        "target-arrow-shape": "triangle-backcurve",
        "arrow-scale": 1.38,
        "underlay-color": "#fffef8",
        "underlay-opacity": 0.96,
        "underlay-padding": 4.5,
        "z-index": 10
      }
    },
    {
      selector: "edge.atlas-focus-edge.atlas-negative",
      style: { "line-color": "#8f7450", "target-arrow-color": "#8f7450" }
    },
    { selector: ".faded", style: { opacity: 0.3 } },
    { selector: ".focused", style: { opacity: 1 } },
    {
      selector: "edge.focused",
      style: {
        width: 3,
        "line-color": colors.tertiary,
        "target-arrow-color": colors.tertiary
      }
    },
    {
      selector: "node.focused",
      style: {
        "border-width": 3,
        "border-color": colors.tertiary,
        "underlay-color": colors.tertiary,
        "underlay-opacity": 0.12,
        "underlay-padding": 9
      }
    },
    { selector: ".story-ghost", style: { opacity: 0.34 } },
    { selector: ".story-hidden", style: { display: "none" } }
  ];
}
