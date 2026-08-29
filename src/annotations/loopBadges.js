import { stylePropertiesForEntity } from "../core/views.js";

export function renderLoopBadges({
  cy,
  svg,
  view,
  nodeBoxes = [],
  labelBoxes = [],
  paths = [],
  obstacles = [],
  viewport = {}
} = {}) {
  // Loop identity belongs in the loop browser/legend by default. Canvas badges
  // are an explicit experimental layer because repeated chips quickly compete
  // with node media, labels and causal corridors in editorial compositions.
  if (!cy || !svg || view?.settings?.["loop-badges"] !== true) return [];
  const loops = cy.data("loopDefinitions") || [];
  const occupied = [];
  for (const loop of loops) {
    if (!loop?.id || !loop.edgeIds?.length) continue;
    const nodes = loopNodeElements(cy, loop);
    if (!nodes.length) continue;
    const points = nodes.map(node => node.renderedPosition());
    const bounds = boundsOf(points);
    const visual = stylePropertiesForEntity(view, "loop", loop);
    const prefix = loopPrefix(loop);
    const label = compactLabel(loop, prefix);
    const width = Math.max(58, Math.min(190, 26 + label.length * 5.6));
    const height = 24;
    const candidates = badgeCandidates(bounds, width, height)
      .map(point => clampBadgePoint(point, width, height, viewport));
    const position = candidates
      .map(point => ({ point, score: badgeScore(point, width, height, nodeBoxes, labelBoxes, paths, occupied, obstacles) }))
      .sort((a, b) => a.score - b.score)[0]?.point || { x: bounds.centerX, y: bounds.top - 22 };
    const box = {
      left: position.x - width / 2,
      right: position.x + width / 2,
      top: position.y - height / 2,
      bottom: position.y + height / 2
    };
    occupied.push(box);
    svg.appendChild(createBadge({ loop, label, prefix, position, width, height, visual }));
  }
  return occupied;
}

function loopNodeElements(cy, loop) {
  const ids = new Set();
  for (const edgeId of loop.edgeIds || []) {
    const edge = cy.getElementById(edgeId);
    if (!edge?.length) continue;
    ids.add(edge.source().id());
    ids.add(edge.target().id());
  }
  return [...ids].map(id => cy.getElementById(id)).filter(element => element?.length);
}

function boundsOf(points) {
  const left = Math.min(...points.map(point => point.x));
  const right = Math.max(...points.map(point => point.x));
  const top = Math.min(...points.map(point => point.y));
  const bottom = Math.max(...points.map(point => point.y));
  return {
    left, right, top, bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2
  };
}

function badgeCandidates(bounds, width, height) {
  const gap = 28;
  const { left, right, top, bottom, centerX, centerY } = bounds;
  return [
    { x: centerX, y: top - gap - height / 2 },
    { x: right + gap + width / 2, y: centerY },
    { x: left - gap - width / 2, y: centerY },
    { x: centerX, y: bottom + gap + height / 2 },
    { x: left - gap, y: top - gap },
    { x: right + gap, y: top - gap },
    { x: right + gap, y: bottom + gap },
    { x: left - gap, y: bottom + gap },
    { x: centerX, y: centerY }
  ];
}

function badgeScore(point, width, height, nodeBoxes, labelBoxes, paths, occupied, obstacles) {
  const box = { left: point.x - width / 2, right: point.x + width / 2, top: point.y - height / 2, bottom: point.y + height / 2 };
  let score = 0;
  for (const obstacle of [
    ...nodeBoxes.map(item => item.box),
    ...labelBoxes.map(item => item.box),
    ...occupied,
    ...obstacles
  ]) {
    if (rectanglesIntersect(box, obstacle)) score += 100000;
    else score += Math.max(0, 36 - rectangleDistance(box, obstacle));
  }
  for (const path of paths) {
    const minimum = Math.min(...path.map(item => Math.hypot(item.x - point.x, item.y - point.y)));
    if (minimum < 24) score += (24 - minimum) * 100;
  }
  return score;
}

export function clampBadgePoint(point, width, height, viewport) {
  const viewportWidth = Number(viewport.width);
  const viewportHeight = Number(viewport.height);
  if (!viewportWidth || !viewportHeight) return point;
  const margin = 8;
  return {
    x: Math.max(width / 2 + margin, Math.min(viewportWidth - width / 2 - margin, point.x)),
    y: Math.max(height / 2 + margin, Math.min(viewportHeight - height / 2 - margin, point.y))
  };
}

function createBadge({ loop, label, prefix, position, width, height, visual }) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.classList.add("loop-badge");
  group.setAttribute("data-loop-id", loop.id);
  group.setAttribute("role", "img");
  group.setAttribute("aria-label", loop.label || loop.id);
  group.setAttribute("transform", `translate(${position.x} ${position.y})`);
  group.style.pointerEvents = "none";

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", String(-width / 2));
  rect.setAttribute("y", String(-height / 2));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", "12");
  rect.setAttribute("fill", visual["badge-fill"] || "#2b3a2e");
  rect.setAttribute("fill-opacity", String(visual["badge-opacity"] ?? 0.96));
  rect.setAttribute("stroke", visual["badge-stroke"] || "#6f9a5b");
  rect.setAttribute("stroke-width", "1");

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", "0");
  text.setAttribute("y", "4");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-family", "Noto Sans, system-ui, sans-serif");
  text.setAttribute("font-size", "10");
  text.setAttribute("font-weight", "750");
  text.setAttribute("letter-spacing", "0.2");
  text.setAttribute("fill", visual["badge-color"] || "#f7f3e7");
  text.textContent = `${prefix}  ${label}`;

  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = loop.label || loop.id;
  group.append(rect, text, title);
  return group;
}

function loopPrefix(loop) {
  const label = String(loop.label || loop.id || "");
  const match = label.match(/\b([RB]\d+)\b/i);
  return match ? match[1].toUpperCase() : loop.type === "balancing" ? "B" : "R";
}

function compactLabel(loop, prefix) {
  const raw = String(loop.label || loop.title || loop.id || "").replace(/^[RB]\d+\s*[—:-]?\s*/i, "").trim();
  if (!raw || raw === loop.id) return "Loop";
  const words = raw.split(/\s+/).slice(0, 4).join(" ");
  return words.length > 22 ? `${words.slice(0, 21)}…` : words;
}

function rectanglesIntersect(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function rectangleDistance(a, b) {
  const dx = Math.max(b.left - a.right, a.left - b.right, 0);
  const dy = Math.max(b.top - a.bottom, a.top - b.bottom, 0);
  return Math.hypot(dx, dy);
}
