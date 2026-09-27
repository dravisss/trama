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

/** The opening is an authored SVG view of the same real model, not a second model. */
export function renderAtlas(model, onSelect) {
  const svg = document.querySelector("#atlas");
  const points = [[392, 96], [628, 223], [620, 455], [392, 579], [164, 455], [156, 223]];
  const defs = svgElement("defs");
  const marker = svgElement("marker", { id: "atlas-arrow", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" });
  marker.append(svgElement("path", { d: "M1 1L9 5L1 9", fill: "none", stroke: "#617553", "stroke-width": 1.4 }));
  defs.append(marker); svg.append(defs);
  svg.append(svgElement("ellipse", { cx: 392, cy: 339, rx: 261, ry: 243, class: "atlas-orbit" }));
  // Ports deliberately avoid the text footprint below each illustration.
  // In particular e05 approaches coordination from its left, not its label.
  const routes = {
    e01: ["M466 116C506 110 539 129 565 173", 523, 119],
    e02: ["M692 270C741 308 739 373 684 409", 728, 346],
    e03: ["M550 491C508 482 478 497 450 525", 503, 494],
    e04: ["M337 524C302 478 278 440 241 454", 288, 477],
    e05: ["M101 405C43 375 42 319 96 279", 49, 351],
    e06: ["M219 174C251 132 275 97 314 96", 269, 117]
  };
  model.edges.forEach(edge => {
    const [d, x, y] = routes[edge.id];
    svg.append(svgElement("path", { d, class: "atlas-edge", "marker-end": "url(#atlas-arrow)" }));
    svg.append(svgElement("text", { x, y, class: "atlas-sign", "text-anchor": "middle" }, edge.sourceSign === edge.targetSign ? "+" : "−"));
  });
  svg.append(svgElement("path", { d: "M407 284a17 17 0 1 0 1 18m-1-30v13h-13", class: "atlas-center-icon" }));
  svg.append(svgElement("text", { x: 392, y: 347, class: "atlas-center-title" }, "O ciclo"));
  svg.append(svgElement("text", { x: 392, y: 379, class: "atlas-center-title" }, "dos atalhos"));
  svg.append(svgElement("text", { x: 392, y: 410, class: "atlas-center-note" }, "uma solução, novas consequências"));
  model.nodes.forEach((node, index) => {
    const [x, y] = points[index];
    const anchor = svgElement("a", { href: "#demo", class: "atlas-node", "aria-label": `Explorar: ${node.label}`, style: `--node-order:${index}` });
    anchor.append(svgElement("title", {}, node.description));
    anchor.append(svgElement("image", { href: assetUrl(node.media.assetId), x: x - 75, y: y - 75, width: 150, height: 150 }));
    anchor.append(svgElement("circle", { cx: x, cy: y, r: 75, class: "node-ring" }));
    for (const mobile of [false, true]) {
      const label = svgElement("text", { x, y: y + (mobile ? 92 : 99), class: `node-label ${mobile ? "node-label-mobile" : "node-label-desktop"}`, "aria-hidden": "true" });
      let line = "", lines = [];
      for (const word of node.label.split(" ")) {
        if (`${line} ${word}`.trim().length > (mobile ? 14 : 21) && line) { lines.push(line); line = word; }
        else line = `${line} ${word}`.trim();
      }
      lines.push(line);
      lines.forEach((line, i) => label.append(svgElement("tspan", { x, dy: i ? (mobile ? 23 : 20) : 0 }, line)));
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
  arrow(relation, "M216 132C287 59 357 59 425 132");
  relation.append(svgElement("text", { x: 320, y: 76, class: "study-sign" }, "+"));
  relation.append(svgElement("text", { x: 155, y: 337, class: "study-label" }, "Tempo de espera"));
  relation.append(svgElement("text", { x: 486, y: 337, class: "study-label" }, "Atalhos individuais"));
  const cycle = document.querySelector("#cycle-study");
  const points = [[320, 65], [489, 122], [489, 268], [320, 325], [151, 268], [151, 122]];
  model.edges.forEach(edge => {
    const a = points[model.nodes.findIndex(node => node.id === edge.source)];
    const b = points[model.nodes.findIndex(node => node.id === edge.target)];
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    const ux = dx / length, uy = dy / length;
    arrow(cycle, `M${a[0] + ux * 54} ${a[1] + uy * 54}Q${(a[0] + b[0]) / 2 + uy * 26} ${(a[1] + b[1]) / 2 - ux * 26} ${b[0] - ux * 55} ${b[1] - uy * 55}`);
  });
  model.nodes.forEach((node, index) => picture(cycle, node, ...points[index], 43));
  cycle.append(svgElement("text", { x: 320, y: 186, class: "study-title" }, "O problema"));
  cycle.append(svgElement("text", { x: 320, y: 220, class: "study-title" }, "se repete."));
  const narrative = document.querySelector("#narrative-study");
  picture(narrative, model.nodes[0], 165, 135, 86);
  picture(narrative, model.nodes[1], 474, 135, 86);
  arrow(narrative, "M244 87C291 42 351 42 396 87");
  narrative.append(svgElement("text", { x: 320, y: 58, class: "study-sign" }, "+"));
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
