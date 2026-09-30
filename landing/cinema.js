import cytoscape from "cytoscape";
import { bezierPoint } from "../src/geometry/index.js";
import { optimizeRoutes } from "../src/routing/optimizer.js";
import { resolveDensityProfile } from "../src/core/density.js";

const svgNS = "http://www.w3.org/2000/svg";
const clamp = value => Math.max(0, Math.min(1, value));

export function assetUrl(assetId) {
  return `./assets/images/${assetId.replace(/^trama-/, "")}.webp`;
}

function svgElement(tag, attributes = {}, text) {
  const element = document.createElementNS(svgNS, tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Trim the shared engine's quadratic without moving its control point off-curve. */
export function outwardCurve(a, b, centre, { start, end, bow, signOffset }) {
  const source = { x: a[0], y: a[1] }, target = { x: b[0], y: b[1] };
  const dx = target.x - source.x, dy = target.y - source.y, length = Math.hypot(dx, dy);
  let nx = -dy / length, ny = dx / length;
  if ((centre[0] - (a[0] + b[0]) / 2) * nx + (centre[1] - (a[1] + b[1]) / 2) * ny > 0) { nx = -nx; ny = -ny; }
  const distance = ((-dy / length) * nx + (dx / length) * ny) * bow * 2;
  const point = t => bezierPoint(source, target, distance, t);
  const findPort = (origin, gap, reverse) => {
    let low = 0, high = 1;
    for (let iteration = 0; iteration < 40; iteration++) {
      const t = (low + high) / 2, p = point(reverse ? 1 - t : t);
      if (Math.hypot(p.x - origin.x, p.y - origin.y) < gap) low = t; else high = t;
    }
    return reverse ? 1 - high : high;
  };
  const t0 = findPort(source, start, false), t1 = findPort(target, end, true);
  const p0 = point(t0), p2 = point(t1);
  const control = { x: (source.x + target.x) / 2 - dy / length * distance, y: (source.y + target.y) / 2 + dx / length * distance };
  const c = { x: p0.x + (t1 - t0) * ((1 - t0) * (control.x - source.x) + t0 * (target.x - control.x)), y: p0.y + (t1 - t0) * ((1 - t0) * (control.y - source.y) + t0 * (target.y - control.y)) };
  const at = point((t0 + t1) / 2);
  const round = value => Math.round(value * 100) / 100;
  return { d: `M${round(p0.x)} ${round(p0.y)}Q${round(c.x)} ${round(c.y)} ${round(p2.x)} ${round(p2.y)}`, sign: [at.x + nx * signOffset, at.y + ny * signOffset] };
}

/** The SVG adapter delegates route selection to the application's real router. */
export function routeDiagram(model, points, radius) {
  const cy = cytoscape({ headless: true, styleEnabled: true, elements: [
    ...model.nodes.map((node, index) => ({ data: { id: node.id, style: { size: radius * 2 }, visualEnvelope: { width: radius * 2, height: radius * 2 } }, position: { x: points[index][0], y: points[index][1] } })),
    ...model.edges.map(edge => ({ data: { id: edge.id, source: edge.source, target: edge.target } }))
  ], layout: { name: "preset" } });
  const result = optimizeRoutes(cy, resolveDensityProfile(model, { routingCurvatureRange: [0.28, 0.32] }), { quality: "publish", loopEdgeIds: model.loops.map(loop => loop.edgeIds) });
  cy.destroy();
  return result;
}

/** The opening is an authored SVG view of the same real model, not a second model. */
export function renderAtlas(model, onSelect) {
  const svg = document.querySelector("#atlas");
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    return [392 + Math.cos(angle) * 260, 339 + Math.sin(angle) * 260];
  });
  const routing = routeDiagram(model, points, 70);
  const defs = svgElement("defs");
  const marker = svgElement("marker", { id: "atlas-arrow", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" });
  marker.append(svgElement("path", { d: "M1 1L9 5L1 9", fill: "none", stroke: "#617553", "stroke-width": 1.4 }));
  defs.append(marker); svg.append(defs);
  svg.append(svgElement("ellipse", { cx: 392, cy: 339, rx: 260, ry: 260, class: "atlas-orbit" }));
  // Every relation bows away from the centre, following the outside of the cycle.
  // Endpoints stop short of the ring of each illustration, clear of the labels below.
  const centre = [392, 339];
  model.edges.forEach(edge => {
    const a = points[model.nodes.findIndex(node => node.id === edge.source)];
    const b = points[model.nodes.findIndex(node => node.id === edge.target)];
    const { d, sign } = outwardCurve(a, b, centre, { start: 80, end: 86, bow: Math.abs(routing.distances.get(edge.id)) / 2, signOffset: 23 });
    svg.append(svgElement("path", { d, class: "atlas-edge", "marker-end": "url(#atlas-arrow)" }));
    svg.append(svgElement("text", { x: sign[0], y: sign[1] + 5, class: "atlas-sign", "text-anchor": "middle" }, edge.sourceSign === edge.targetSign ? "+" : "−"));
  });
  svg.append(svgElement("path", { d: "M407 284a17 17 0 1 0 1 18m-1-30v13h-13", class: "atlas-center-icon" }));
  svg.append(svgElement("text", { x: 392, y: 347, class: "atlas-center-title" }, "O ciclo"));
  svg.append(svgElement("text", { x: 392, y: 379, class: "atlas-center-title" }, "dos atalhos"));
  svg.append(svgElement("text", { x: 392, y: 426, class: "atlas-center-note" }, "uma solução, novas consequências"));
  model.nodes.forEach((node, index) => {
    const [x, y] = points[index];
    const anchor = svgElement("a", { href: "#demo", class: "atlas-node", "aria-label": `Explorar: ${node.label}`, style: `--node-order:${index}` });
    anchor.append(svgElement("title", {}, node.description));
    anchor.append(svgElement("image", { href: assetUrl(node.media.assetId), x: x - 70, y: y - 70, width: 140, height: 140 }));
    anchor.append(svgElement("circle", { cx: x, cy: y, r: 70, class: "node-ring" }));
    // Side labels occupy reserved space inside the ring, away from all edge corridors.
    const side = index % 3 !== 0;
    const labelOffset = -145;
    const labelX = x + (side ? (x > 392 ? labelOffset : -labelOffset) : 0);
    for (const mobile of [false, true]) {
      const label = svgElement("text", { x: labelX, y: side ? y + (index === 1 || index === 5 ? 26 : -5) : y + 97, class: `node-label ${mobile ? "node-label-mobile" : "node-label-desktop"}`, "aria-hidden": "true" });
      let line = "", lines = [];
      for (const word of node.label.split(" ")) {
        if (`${line} ${word}`.trim().length > (mobile || side ? 14 : 21) && line) { lines.push(line); line = word; }
        else line = `${line} ${word}`.trim();
      }
      lines.push(line);
      lines.forEach((line, i) => label.append(svgElement("tspan", { x: labelX, dy: i ? (mobile ? 23 : 20) : 0 }, line)));
      anchor.append(label);
    }
    anchor.addEventListener("click", event => { event.preventDefault(); onSelect(node.id); });
    svg.append(anchor);
  });
}

/** Editorial studies use the same images and directed relations as the demo. */
export function renderProductStudies(model) {
  function picture(svg, node, x, y, radius, opacity = 1) {
    const clipId = `${svg.id}-${node.id}`;
    const defs = svgElement("defs");
    const clip = svgElement("clipPath", { id: clipId });
    clip.append(svgElement("circle", { cx: x, cy: y, r: radius })); defs.append(clip); svg.append(defs);
    svg.append(svgElement("image", { href: assetUrl(node.media.assetId), x: x - radius, y: y - radius, width: radius * 2, height: radius * 2, "clip-path": `url(#${clipId})`, opacity }));
    svg.append(svgElement("circle", { cx: x, cy: y, r: radius, class: "study-ring", opacity }));
  }
  function arrow(svg, d, opacity = 1) {
    const id = `${svg.id}-arrow`;
    if (!svg.querySelector("marker")) {
      const defs = svgElement("defs");
      const marker = svgElement("marker", { id, viewBox: "0 0 12 12", refX: 10, refY: 6, markerWidth: 7, markerHeight: 7, orient: "auto", markerUnits: "userSpaceOnUse" });
      marker.append(svgElement("path", { d: "M2 1L10 6L2 11", fill: "none", stroke: "#56714d", "stroke-width": 1.5, "stroke-linejoin": "round" }));
      defs.append(marker); svg.append(defs);
    }
    svg.append(svgElement("path", { d, class: "study-edge", "marker-end": `url(#${id})`, opacity }));
  }
  const relation = document.querySelector("#relation-study");
  picture(relation, model.nodes[0], 155, 207, 94);
  picture(relation, model.nodes[1], 486, 207, 94);
  const relationRoute = outwardCurve([155, 207], [486, 207], [320, 390], { start: 104, end: 110, bow: 110, signOffset: 25 });
  arrow(relation, relationRoute.d);
  relation.append(svgElement("text", { x: relationRoute.sign[0], y: relationRoute.sign[1] + 5, class: "study-sign" }, "+"));
  relation.append(svgElement("text", { x: 155, y: 337, class: "study-label" }, "Tempo de espera"));
  relation.append(svgElement("text", { x: 486, y: 337, class: "study-label" }, "Atalhos individuais"));
  const cycle = document.querySelector("#cycle-study");
  const points = [[320, 65], [489, 122], [489, 268], [320, 325], [151, 268], [151, 122]];
  const routing = routeDiagram(model, points, 43);
  model.edges.forEach(edge => {
    const a = points[model.nodes.findIndex(node => node.id === edge.source)];
    const b = points[model.nodes.findIndex(node => node.id === edge.target)];
    const { d } = outwardCurve(a, b, [320, 195], { start: 54, end: 55, bow: Math.abs(routing.distances.get(edge.id)) / 2, signOffset: 0 });
    arrow(cycle, d);
  });
  model.nodes.forEach((node, index) => picture(cycle, node, ...points[index], 43));
  cycle.append(svgElement("text", { x: 320, y: 186, class: "study-title" }, "O problema"));
  cycle.append(svgElement("text", { x: 320, y: 220, class: "study-title" }, "se repete."));
  const narrative = document.querySelector("#narrative-study");
  picture(narrative, model.nodes[0], 165, 135, 86);
  picture(narrative, model.nodes[1], 474, 135, 86);
  const narrativeRoute = outwardCurve([165, 135], [474, 135], [320, 270], { start: 96, end: 102, bow: 65, signOffset: 25 });
  arrow(narrative, narrativeRoute.d);
  narrative.append(svgElement("text", { x: narrativeRoute.sign[0], y: narrativeRoute.sign[1] + 5, class: "study-sign" }, "+"));
}

/** Native scroll selects authored V2 beats; manual interaction always wins. */
export function mountChoreography({ controller, reduceMotion, onStoryEnter }) {
  const root = document.querySelector(".journey");
  const demo = document.querySelector("#demo");
  const followButton = document.querySelector("#scroll-follow");
  const accessible = document.querySelector(".accessible-map");
  const media = matchMedia("(min-width: 761px)");
  const scope = new AbortController();
  let following = true;
  let frameRequest = 0;
  let destroyed = false;
  const eligible = () => following && media.matches && !reduceMotion.matches && demo.dataset.mode === "story" && !accessible.open;

  function refresh() {
    if (destroyed) return;
    const wasPinned = root.classList.contains("is-cinematic");
    const shouldPin = eligible();
    const before = demo.getBoundingClientRect().top;
    const visible = before < innerHeight && demo.getBoundingClientRect().bottom > 0;
    root.classList.toggle("is-cinematic", shouldPin);
    // Releasing a pinned scene must not throw its controls away from the pointer.
    if (wasPinned && !shouldPin && visible) {
      const after = demo.getBoundingClientRect().top;
      window.scrollBy({ top: after - before, behavior: "instant" });
    }
    followButton.dataset.paused = String(!following);
    followButton.firstChild.textContent = following ? "A história avança com a rolagem " : "Retomar a história com a rolagem ";
  }

  function sync() {
    frameRequest = 0;
    if (!eligible() || document.hidden) return;
    const rect = root.getBoundingClientRect();
    const span = root.offsetHeight - root.firstElementChild.offsetHeight;
    if (span <= 0 || rect.top > 60 || rect.bottom < innerHeight - 60) return;
    const progress = clamp(-rect.top / span);
    root.style.setProperty("--story-progress", progress);
    const count = controller.compiled.timeline.length;
    const index = Math.min(count - 1, Math.floor(progress * count));
    if (controller.state.index !== index) controller.goTo(index);
  }
  function requestSync() { if (!frameRequest && !destroyed) frameRequest = requestAnimationFrame(sync); }
  function manual() { following = false; refresh(); }
  function resume() {
    following = true; refresh();
    if (eligible()) {
      const span = root.offsetHeight - root.firstElementChild.offsetHeight;
      window.scrollTo({ top: scrollY + root.getBoundingClientRect().top + span * (controller.state.index / 5 + .02), behavior: "instant" });
    }
    requestSync();
  }
  followButton.addEventListener("click", resume, { signal: scope.signal });
  accessible.addEventListener("toggle", refresh, { signal: scope.signal });
  window.addEventListener("scroll", requestSync, { passive: true, signal: scope.signal });
  window.addEventListener("resize", () => { refresh(); requestSync(); }, { passive: true, signal: scope.signal });
  media.addEventListener("change", refresh, { signal: scope.signal });
  reduceMotion.addEventListener("change", refresh, { signal: scope.signal });
  document.querySelector("[data-story-enter]").addEventListener("click", event => {
    event.preventDefault(); onStoryEnter(); following = true; refresh();
    root.scrollIntoView({ behavior: reduceMotion.matches ? "instant" : "smooth", block: "start" });
    document.querySelector(".demo-tabs button[data-mode='story']").focus({ preventScroll: true });
  }, { signal: scope.signal });
  const reveals = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.remove("is-before"); entry.target.classList.add("is-visible"); reveals.unobserve(entry.target);
    }
  }, { threshold: .12 });
  document.querySelectorAll(".process article,.contexts-head,.context-list article,.closing").forEach(element => {
    element.classList.add("reveal");
    // Content is never hidden. Only the supporting artwork starts below its rest.
    if (element.getBoundingClientRect().top > innerHeight && !reduceMotion.matches) element.classList.add("is-before");
    reveals.observe(element);
  });
  refresh(); requestSync();
  return { manual, refresh, destroy() { destroyed = true; cancelAnimationFrame(frameRequest); scope.abort(); reveals.disconnect(); } };
}
