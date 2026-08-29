import {
  alignedNormal, arcLengthTable, chordNormal, pointAtArcDistance,
  pointSegmentDistance, rectangleIntersects
} from "../geometry/index.js";
import { renderLoopBadges } from "./loopBadges.js";

export class AnnotationRenderer {
  constructor({ cy, svg, profile, theme }) {
    this.cy = cy;
    this.svg = svg;
    this.profile = profile;
    this.theme = theme;
    this.frame = null;
    this.timer = null;
    this.interacting = false;
    this.view = null;
    this.lastRender = 0;
    this.lastMetrics = { annotationCollisions: 0, hiddenSigns: 0, signCount: 0 };
  }

  getMetrics() {
    return { ...this.lastMetrics };
  }

  setView(view) {
    this.view = view || null;
    this.request();
  }

  setInteraction(active = false) {
    this.interacting = Boolean(active);
    this.request();
  }

  request() {
    // A single RAF is enough to coalesce Cytoscape render, drag and route
    // preview notifications. The previous 55ms timer capped annotations at
    // roughly 18fps, which made manual editing feel disconnected from the
    // canvas even when the underlying route preview was cheap.
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => this.render());
  }

  render() {
    this.frame = null;
    this.lastRender = Date.now();
    const { cy, svg } = this;
    if (!cy || cy.destroyed()) return;

    const container = cy.container();
    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.replaceChildren();

    const semantic = semanticProfile(cy, this.profile);
    svg.dataset.zoom = semantic.zoom.toFixed(3);
    svg.dataset.fontSize = semantic.fontSize.toFixed(2);

    const nodeBoxes = cy.nodes().map(node => {
      const box = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
      return {
        id: node.id(),
        box: { left: box.x1 - 3, right: box.x2 + 3, top: box.y1 - 3, bottom: box.y2 + 3 }
      };
    });
    const labelBoxes = cy.nodes().map(node => ({
      id: node.id(),
      box: renderedLabelBox(cy, node)
    })).filter(item => item.box);

    const paths = new Map();
    const arrows = [];
    cy.edges().forEach(edge => {
      paths.set(edge.id(), renderedCurve(edge, this.interacting ? 48 : 120));
      arrows.push({ ...edge.renderedTargetEndpoint(), edgeId: edge.id() });
    });

    const obstacles = overlayBoxes(container);

    const badgeBoxes = renderLoopBadges({
      cy,
      svg,
      view: this.view,
      nodeBoxes,
      labelBoxes,
      paths: [...paths.values()],
      obstacles,
      viewport: { width, height }
    });

    const specs = [];
    const showPolarities = this.view?.settings?.["show-polarities"] !== false;
    if (showPolarities) cy.edges().forEach(edge => {
      const table = arcLengthTable(paths.get(edge.id()));
      if (table.at(-1).length < 44) return;
      let annotationSide = Number(edge.data("annotationSide"));
      if (annotationSide !== -1 && annotationSide !== 1) {
        annotationSide = chooseSide(edge, table, nodeBoxes, labelBoxes, paths, arrows, semantic);
        edge.data("annotationSide", annotationSide);
      }

      for (const endpoint of ["source", "target"]) {
        const position = anchoredPosition(table, endpoint, semantic.fontSize, annotationSide);
        specs.push({
          edge,
          endpoint,
          sign: edge.data(endpoint === "source" ? "sourceSign" : "targetSign"),
          position,
          box: signBox(position, semantic.fontSize),
          focused: isFocused(edge),
          annotationSide
        });
      }
    });

    specs.sort((a, b) => Number(b.focused) - Number(a.focused));
    const visibleBoxes = [...badgeBoxes];
    let hiddenCount = 0;
    let collisionCount = 0;
    let reflowNeeded = false;

    for (const spec of specs) {
      const collision = collides(spec, visibleBoxes, nodeBoxes, labelBoxes, paths, arrows, semantic);
      // Polarity is semantic content, not decoration: keep both signs visible
      // even when semantic zoom detects a collision. The collision signal still
      // participates in side selection and remains available for diagnostics.
      const hidden = false;
      if (hidden) hiddenCount++;
      if (collision) collisionCount++;
      if (collision && spec.collisionReason === "other-sign" && !this.reflowed) {
        spec.edge.removeData("annotationSide");
        reflowNeeded = true;
      }
      visibleBoxes.push(spec.box);
      svg.appendChild(createText(spec, semantic, hidden, this.theme, collision));
    }
    svg.dataset.hiddenSigns = String(hiddenCount);
    svg.dataset.polaritiesVisible = String(showPolarities);
    svg.dataset.annotationCollisions = String(collisionCount);
    this.lastMetrics = {
      annotationCollisions: collisionCount,
      hiddenSigns: hiddenCount,
      signCount: specs.length
    };
    if (reflowNeeded) {
      this.reflowed = true;
      this.request();
    } else {
      this.reflowed = false;
    }
  }

  destroy() {
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.timer) clearTimeout(this.timer);
    this.frame = null;
    this.timer = null;
    this.svg.replaceChildren();
  }
}

function overlayBoxes(container) {
  const containerRect = container?.getBoundingClientRect?.();
  if (!containerRect) return [];
  return [".edit-toolbar", ".map-controls"]
    .map(selector => container.querySelector?.(selector) || document.querySelector(selector))
    .map(element => element?.getBoundingClientRect?.())
    .filter(rect => rect && rect.width > 0 && rect.height > 0)
    .map(rect => ({
      left: rect.left - containerRect.left,
      right: rect.right - containerRect.left,
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top
    }));
}

function semanticProfile(cy, profile) {
  const zoom = cy.zoom();
  const density = cy.edges().length / Math.max(1, cy.nodes().length);
  const storyMode = document.body.classList.contains("story-mode");
  const baseFontSize = Math.max(
    profile.minimumSignSize,
    Math.min(11.5, 11.5 * zoom / Math.sqrt(Math.max(1, density * 0.82)))
  );
  const fontSize = storyMode
    ? Math.max(10.5, Math.min(16, 9.5 + zoom * 3.4))
    : baseFontSize;
  return {
    zoom,
    fontSize,
    lineClearance: Math.max(4, fontSize * 0.52),
    hideAllUnfocused: zoom < 0.36,
    hideCollisions: !storyMode && (profile.hideCollisions || zoom < 0.72)
  };
}

function renderedCurve(edge, steps = 120) {
  const source = edge.renderedSourceEndpoint();
  const target = edge.renderedTargetEndpoint();
  const points = edge.renderedControlPoints();
  const control = points?.[0] || { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const mt = 1 - t;
    return {
      x: mt * mt * source.x + 2 * mt * t * control.x + t * t * target.x,
      y: mt * mt * source.y + 2 * mt * t * control.y + t * t * target.y
    };
  });
}

function renderedLabelBox(cy, node) {
  const rs = node?._private?.rscratch;
  const width = Number(rs?.labelWidth || 0);
  const height = Number(rs?.labelHeight || 0);
  if (!width || !height || !Number.isFinite(rs?.labelX) || !Number.isFinite(rs?.labelY)) return null;

  const zoom = Number(cy.zoom()) || 1;
  const pan = cy.pan();
  let x = Number(rs.labelX);
  let y = Number(rs.labelY);
  const valign = node.pstyle("text-valign").value;
  if (valign === "top") y -= height;
  else if (valign === "center") y -= height / 2;
  const padding = 3 / zoom;
  return {
    left: (x - width / 2 - padding) * zoom + pan.x,
    right: (x + width / 2 + padding) * zoom + pan.x,
    top: (y - padding) * zoom + pan.y,
    bottom: (y + height + padding) * zoom + pan.y
  };
}

function anchoredPosition(table, endpoint, fontSize, side) {
  const total = table.at(-1).length;
  const along = endpoint === "source"
    ? Math.max(8, Math.min(13, fontSize + 2))
    : Math.max(15, Math.min(21, fontSize + 9));
  const sample = pointAtArcDistance(table, endpoint === "source" ? along : total - along);
  const normal = alignedNormal(sample.tangent, chordNormal(table, side));
  const offset = Math.max(6, Math.min(12, fontSize * 0.9));
  return { x: sample.point.x + normal.x * offset, y: sample.point.y + normal.y * offset };
}

function chooseSide(edge, table, nodeBoxes, labelBoxes, paths, arrows, profile) {
  return [-1, 1].map(side => {
    const positions = ["source", "target"].map(endpoint =>
      anchoredPosition(table, endpoint, profile.fontSize, side)
    );
    const score = positions.reduce((sum, position, index) =>
      sum + staticPenalty(position, edge, index ? "target" : "source", nodeBoxes, labelBoxes, paths, arrows, profile), 0);
    return { side, score };
  }).sort((a, b) => a.score - b.score || b.side - a.side)[0].side;
}

function staticPenalty(position, edge, endpoint, nodeBoxes, labelBoxes, paths, arrows, profile) {
  const box = signBox(position, profile.fontSize);
  const ownNodeId = endpoint === "source" ? edge.source().id() : edge.target().id();
  let score = 0;
  nodeBoxes.forEach(node => {
    if (node.id !== ownNodeId && rectangleIntersects(box, node.box)) score += 10000;
  });
  labelBoxes.forEach(label => {
    if (rectangleIntersects(box, label.box)) score += label.id === ownNodeId ? 16000 : 10000;
  });
  for (const [otherId, path] of paths) {
    if (otherId === edge.id()) continue;
    const other = edge.cy().getElementById(otherId);
    if (other?.length && sharesEndpoint(edge, other)) continue;
    const minimum = minimumPathDistance(position, path);
    if (minimum < profile.lineClearance) score += 5000 + (profile.lineClearance - minimum) * 800;
    if (other?.length) {
      const otherTable = arcLengthTable(path);
      for (const otherEndpoint of ["source", "target"]) {
        const otherPosition = anchoredPosition(otherTable, otherEndpoint, profile.fontSize, sideForEdge(other));
        if (rectangleIntersects(box, signBox(otherPosition, profile.fontSize))) score += 9000;
      }
    }
  }
  arrows.forEach(arrow => {
    if (arrow.edgeId === edge.id() && endpoint === "target") return;
    const distance = Math.hypot(position.x - arrow.x, position.y - arrow.y);
    if (distance < profile.fontSize) score += 4000 + (profile.fontSize - distance) * 500;
  });
  return score;
}

function sideForEdge(edge) {
  const side = Number(edge.data("annotationSide"));
  return side === -1 || side === 1 ? side : 1;
}

function collides(spec, visibleBoxes, nodeBoxes, labelBoxes, paths, arrows, profile) {
  spec.collisionReason = "";
  if (visibleBoxes.some(box => rectangleIntersects(spec.box, box))) {
    spec.collisionReason = "other-sign";
    return true;
  }
  const ownNodeId = spec.endpoint === "source" ? spec.edge.source().id() : spec.edge.target().id();
  if (nodeBoxes.some(node => node.id !== ownNodeId && rectangleIntersects(spec.box, node.box))) {
    spec.collisionReason = "node";
    return true;
  }
  if (labelBoxes.some(label => rectangleIntersects(spec.box, label.box))) {
    spec.collisionReason = "label";
    return true;
  }
  for (const [otherId, path] of paths) {
    const other = spec.edge.cy().getElementById(otherId);
    if (other?.length && sharesEndpoint(spec.edge, other)) continue;
    if (other?.length && other.data("routeLocked")) continue;
    if (otherId !== spec.edge.id() && minimumPathDistance(spec.position, path) < profile.lineClearance) {
      spec.collisionReason = `edge:${otherId}`;
      return true;
    }
  }
  const arrowCollision = arrows.some(arrow =>
    !(arrow.edgeId === spec.edge.id() && spec.endpoint === "target") &&
    Math.hypot(spec.position.x - arrow.x, spec.position.y - arrow.y) < profile.fontSize * 0.9
  );
  if (arrowCollision) spec.collisionReason = "arrow";
  return arrowCollision;
}

function sharesEndpoint(a, b) {
  return a.source().id() === b.source().id() || a.source().id() === b.target().id() ||
    a.target().id() === b.source().id() || a.target().id() === b.target().id();
}

function createText(spec, profile, hidden, theme, collision = false) {
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", spec.position.x.toFixed(2));
  text.setAttribute("y", spec.position.y.toFixed(2));
  text.setAttribute("class", [
    "cld-edge-sign",
    spec.edge.hasClass("balancing-edge") ? "balancing" : "",
    spec.edge.hasClass("story-current") ? "story-current-sign" : ""
  ].filter(Boolean).join(" "));
  text.setAttribute("data-edge-id", spec.edge.id());
  text.setAttribute("data-side", spec.endpoint);
  text.setAttribute("data-annotation-side", String(spec.annotationSide));
  text.setAttribute("data-hidden-by-density", String(hidden));
  text.setAttribute("data-collision", String(collision));
  text.setAttribute("data-collision-reason", spec.collisionReason || "");
  text.setAttribute("font-size", profile.fontSize.toFixed(2));
  text.setAttribute("font-family", theme.annotationFontFamily);
  text.setAttribute("opacity", hidden ? "0" : spec.edge.hasClass("faded") && !spec.focused ? "0.3" : "1");
  text.textContent = spec.sign;
  return text;
}

function signBox(position, fontSize) {
  const halfWidth = Math.max(4, fontSize * 0.48);
  const halfHeight = Math.max(5, fontSize * 0.62);
  return {
    left: position.x - halfWidth, right: position.x + halfWidth,
    top: position.y - halfHeight, bottom: position.y + halfHeight
  };
}

function minimumPathDistance(position, path) {
  let minimum = Infinity;
  for (let index = 0; index < path.length - 1; index++) {
    minimum = Math.min(minimum, pointSegmentDistance(position, path[index], path[index + 1]));
  }
  return minimum;
}

function isFocused(edge) {
  return edge.selected() || edge.hasClass("focused") || edge.hasClass("annotation-focus") ||
    edge.hasClass("story-current") ||
    edge.source().selected() || edge.target().selected() ||
    edge.source().hasClass("hovered") || edge.target().hasClass("hovered");
}
