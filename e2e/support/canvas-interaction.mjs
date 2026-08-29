/**
 * Pointer helpers for thin Cytoscape edges. A numeric midpoint is not always
 * a hit-test point after a fit or when another node crosses the curve, so the
 * helper samples the renderer's actual path and validates the hover target.
 */
export async function activateCanvasNode(page, id) {
  await page.waitForFunction(() => /:stable:/.test(document.querySelector("#cld-root")?.dataset.qaCameraStable || ""));
  const offsets = [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.keyboard.press("Escape");
    const point = await renderedCanvasPoint(page, id, "node", attempt);
    for (const [dx, dy] of offsets) {
      await page.mouse.move(point.x + dx, point.y + dy);
      await page.mouse.click(point.x + dx, point.y + dy);
      const selected = await page.evaluate(nodeId =>
        window.loopViewerDemo.engine.cy.getElementById(nodeId).selected(), id);
      if (selected) return;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(260);
    }
    await page.waitForTimeout(120);
  }
  throw new Error(`Could not activate node ${id} through the canvas pointer.`);
}

export async function activateCanvasEdge(page, id) {
  await page.waitForFunction(() => /:stable:/.test(document.querySelector("#cld-root")?.dataset.qaCameraStable || ""));
  const offsets = [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2]];
  for (let attempt = 0; attempt < 18; attempt += 1) {
    await page.keyboard.press("Escape");
    const point = await renderedCanvasPoint(page, id, "edge", attempt);
    for (const [dx, dy] of offsets) {
      await page.mouse.move(point.x + dx, point.y + dy);
      const hovered = await page.evaluate(edgeId =>
        window.loopViewerDemo.engine.cy.getElementById(edgeId).hasClass("annotation-focus"), id);
      if (!hovered) continue;
      await page.mouse.click(point.x + dx, point.y + dy);
      const selected = await page.evaluate(edgeId =>
        window.loopViewerDemo.engine.cy.getElementById(edgeId).selected(), id);
      if (selected) return;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(260);
    }
    await page.waitForTimeout(120);
  }
  throw new Error(`Could not activate edge ${id} through the canvas pointer.`);
}

export async function renderedCanvasPoint(page, id, kind = "node", sampleIndex = 0) {
  return page.evaluate(async ({ id, kind, sampleIndex }) => {
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const canvas = document.querySelector("#cld-root");
    const pagePointIsOnCanvas = point => {
      if (!canvas || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return false;
      const hit = document.elementFromPoint(point.x, point.y);
      return hit === canvas || canvas.contains(hit);
    };
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const cy = window.loopViewerDemo?.engine?.cy;
      const element = cy?.getElementById(id);
      const direct = kind === "edge"
        ? (element?.renderedMidpoint?.() || element?.renderedControlPoints?.()[0])
        : element?.renderedPosition?.();
      const rect = canvas?.getBoundingClientRect();
      if (kind !== "edge" && rect && Number.isFinite(direct?.x) && Number.isFinite(direct?.y)) {
        const pagePoint = { x: rect.left + direct.x, y: rect.top + direct.y };
        if (pagePointIsOnCanvas(pagePoint)) return pagePoint;
      }
      if (kind !== "edge" || !element || !rect) {
        await nextFrame();
        continue;
      }

      const renderer = cy.renderer();
      const isTarget = point => renderer.findNearestElement(point.x, point.y, true, false)?.id?.() === id &&
        pagePointIsOnCanvas({ x: rect.left + point.x, y: rect.top + point.y });
      const bounds = element.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
      const source = element.source()?.renderedPosition?.();
      const target = element.target()?.renderedPosition?.();
      const controls = element.renderedControlPoints?.() || [];
      const renderedPath = element._private?.rscratch?.allpts || [];
      const candidates = Number.isFinite(direct?.x) && Number.isFinite(direct?.y) ? [direct] : [];

      if (renderedPath.length === 6) {
        const start = { x: renderedPath[0], y: renderedPath[1] };
        const control = { x: renderedPath[2], y: renderedPath[3] };
        const end = { x: renderedPath[4], y: renderedPath[5] };
        for (let step = 1; step < 10; step += 1) {
          const t = step / 10;
          const inverse = 1 - t;
          candidates.push({
            x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
            y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y
          });
        }
      }
      if (Number.isFinite(source?.x) && Number.isFinite(source?.y) && Number.isFinite(target?.x) && Number.isFinite(target?.y)) {
        for (let step = 1; step < 10; step += 1) {
          const t = step / 10;
          const control = controls[0];
          if (Number.isFinite(control?.x) && Number.isFinite(control?.y)) {
            const inverse = 1 - t;
            candidates.push({
              x: inverse * inverse * source.x + 2 * inverse * t * control.x + t * t * target.x,
              y: inverse * inverse * source.y + 2 * inverse * t * control.y + t * t * target.y
            });
          } else {
            candidates.push({
              x: source.x + (target.x - source.x) * t,
              y: source.y + (target.y - source.y) * t
            });
          }
        }
      }
      if (bounds) {
        for (let y = Math.ceil(bounds.y1); y <= Math.floor(bounds.y2); y += 1) {
          for (let x = Math.ceil(bounds.x1); x <= Math.floor(bounds.x2); x += 1) candidates.push({ x, y });
        }
      }

      const targetCandidates = candidates.filter(candidate =>
        Number.isFinite(candidate?.x) && Number.isFinite(candidate?.y) && isTarget(candidate));
      const point = sampleIndex === 0
        ? targetCandidates[0]
        : candidates[sampleIndex % Math.max(1, candidates.length)];
      if (point) return { x: rect.left + point.x, y: rect.top + point.y };

      const canvasCandidates = candidates.filter(candidate =>
        Number.isFinite(candidate?.x) && Number.isFinite(candidate?.y) &&
        pagePointIsOnCanvas({ x: rect.left + candidate.x, y: rect.top + candidate.y }));
      const fallback = canvasCandidates[sampleIndex % Math.max(1, canvasCandidates.length)];
      if (fallback) return { x: rect.left + fallback.x, y: rect.top + fallback.y };
      await nextFrame();
    }
    throw new Error(`Could not resolve an interactive rendered point for ${kind} ${id}.`);
  }, { id, kind, sampleIndex });
}
