import { test, expect } from "../support/qa-test.mjs";
import { activateCanvasNode } from "../support/canvas-interaction.mjs";

function qaBaseURL() {
  const baseURL = process.env.LOOPVIEWER_UI_QA_URL;
  if (!baseURL) throw new Error("LOOPVIEWER_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

async function openEditor(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#edit-toolbar")).toBeVisible();
  await page.waitForFunction(() => {
    const cy = window.loopViewerDemo?.engine?.cy;
    // The project-card click swaps the active map asynchronously. The toolbar
    // survives that transition, so it is not by itself proof that the flagship
    // graph has become the live Cytoscape model.
    return Boolean(cy?.getElementById("demand")?.length) &&
      Boolean(cy?.getElementById("capacity")?.length) &&
      !cy.animated() && !cy.elements().animated();
  });
}

async function renderedPoint(page, id, kind = "node", sampleIndex = 0) {
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
      if (kind !== "edge" && Number.isFinite(direct?.x) && Number.isFinite(direct?.y)) {
        const rect = document.querySelector("#cld-root").getBoundingClientRect();
        const pagePoint = { x: rect.left + direct.x, y: rect.top + direct.y };
        if (pagePointIsOnCanvas(pagePoint)) return pagePoint;
      }
      if (kind === "edge" && Number.isFinite(direct?.x) && Number.isFinite(direct?.y)) {
        const renderer = cy.renderer();
        const hit = renderer.findNearestElement(direct.x, direct.y, true, false);
        const rect = canvas?.getBoundingClientRect();
        const pagePoint = rect ? { x: rect.left + direct.x, y: rect.top + direct.y } : null;
        if (hit?.id?.() === id && pagePointIsOnCanvas(pagePoint)) {
          return { x: rect.left + direct.x, y: rect.top + direct.y };
        }
      }
      if (kind === "edge" && element) {
        const renderer = cy.renderer();
        const isTarget = point => {
          const rect = canvas?.getBoundingClientRect();
          const pagePoint = rect ? { x: rect.left + point.x, y: rect.top + point.y } : null;
          return renderer.findNearestElement(point.x, point.y, true, false)?.id?.() === id && pagePointIsOnCanvas(pagePoint);
        };
        const bounds = element.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
        const source = element.source()?.renderedPosition?.();
        const target = element.target()?.renderedPosition?.();
        const controls = element.renderedControlPoints?.() || [];
        const renderedPath = element._private?.rscratch?.allpts || [];
        const candidates = [direct];
        if (renderedPath.length === 6) {
          // `allpts` is the renderer's actual post-layout path, including
          // clipped node endpoints. Sampling it avoids reconstructing a
          // slightly different curve from node centers and control points.
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
          // Cytoscape exposes the control point, not a guaranteed hit-test
          // point on the curve. Sample the rendered quadratic path so a
          // crossing edge or node cannot steal the click from the target.
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
            for (let x = Math.ceil(bounds.x1); x <= Math.floor(bounds.x2); x += 1) {
              candidates.push({ x, y });
            }
          }
        }
        const targetCandidates = candidates.filter(candidate => Number.isFinite(candidate?.x) && Number.isFinite(candidate?.y) && isTarget(candidate));
        // On later attempts deliberately walk the renderer's sampled path.
        // A renderer hit can be stale for one frame even when the coordinate
        // is numerically plausible; the real hover check in activateEdge is
        // the final authority before a click is sent.
        const point = sampleIndex === 0
          ? targetCandidates[0]
          : candidates[sampleIndex % Math.max(1, candidates.length)];
        if (point) {
          const rect = canvas.getBoundingClientRect();
          return { x: rect.left + point.x, y: rect.top + point.y };
        }
        // The renderer can temporarily miss its own thin edge during a
        // post-fit frame. Return a sampled path point on the canvas and let
        // activateEdge validate the actual selection with small offsets.
        const canvasCandidates = candidates.filter(candidate => Number.isFinite(candidate?.x) && Number.isFinite(candidate?.y) && pagePointIsOnCanvas({
          x: canvas.getBoundingClientRect().left + candidate.x,
          y: canvas.getBoundingClientRect().top + candidate.y
        }));
        const fallback = canvasCandidates[sampleIndex % Math.max(1, canvasCandidates.length)];
        if (fallback) {
          const rect = canvas.getBoundingClientRect();
          return { x: rect.left + fallback.x, y: rect.top + fallback.y };
        }
      }
      await nextFrame();
    }
    const finalCy = window.loopViewerDemo?.engine?.cy;
    const finalElement = finalCy?.getElementById(id);
    const diagnostics = kind === "edge" && finalElement
      ? {
          rendered: finalElement.renderedBoundingBox?.({ includeLabels: false, includeOverlays: false }),
          source: finalElement.source()?.renderedPosition?.(),
          target: finalElement.target()?.renderedPosition?.(),
          controls: finalElement.renderedControlPoints?.()
        }
      : {
          activeNodeIds: finalCy?.nodes?.().map(node => node.id()) || [],
          activeMap: window.loopViewerDemo?.appStore?.getState?.().activeMapId || null
        };
    throw new Error(`Could not resolve an interactive rendered point for ${kind} ${id}: ${JSON.stringify(diagnostics)}`);
  }, { id, kind, sampleIndex });
}

async function activateEdge(page, id) {
  const offsets = [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2]];
  for (let attempt = 0; attempt < 18; attempt += 1) {
    await page.keyboard.press("Escape");
    const point = await renderedPoint(page, id, "edge", attempt);
    for (const [dx, dy] of offsets) {
      await page.mouse.move(point.x + dx, point.y + dy);
      const hovered = await page.evaluate(edgeId => window.loopViewerDemo.engine.cy.getElementById(edgeId).hasClass("annotation-focus"), id);
      if (!hovered) continue;
      await page.mouse.click(point.x + dx, point.y + dy);
      const selected = await page.evaluate(edgeId => window.loopViewerDemo.engine.cy.getElementById(edgeId).selected(), id);
      if (selected) return;
      // A near miss can legitimately select a node and open its edit popover;
      // dismiss that real UI surface before trying the next curve sample.
      await page.keyboard.press("Escape");
      // Keep the retry sequence below Cytoscape's double-tap window. Two
      // fast misses on the background are interpreted as the editor's
      // intentional "create node" gesture, which contaminates the fixture
      // instead of merely trying another edge pixel.
      await page.waitForTimeout(260);
    }
    // The editor performs a post-layout fit after the dock settles. Recompute
    // the real pointer target rather than selecting through an internal API.
    await page.waitForTimeout(120);
  }
  throw new Error(`Could not activate edge ${id} through the canvas pointer.`);
}

async function expectCanvasHandleContract(page, selector, size) {
  await expect(page.locator(selector)).toBeVisible();
  const details = await page.locator(selector).evaluate(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      className: String(element.className),
      width: rect.width,
      height: rect.height,
      borderRadius: style.borderRadius,
      animationName: style.animationName,
      backgroundColor: style.backgroundColor
    };
  });
  expect(details.className).not.toContain("ui-button");
  expect(details.width).toBe(size);
  expect(details.height).toBe(size);
  expect(details.borderRadius).toBe("50%");
  expect(details.animationName).toBe("none");
  expect(details.backgroundColor).not.toBe("rgb(255, 255, 255)");
}

async function dragConnectionHandle(page, targetId) {
  const handle = page.locator("#connection-handle");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await expect(handle).toBeVisible();
    // Force Playwright to resolve the current box after the last Cytoscape
    // render. The affordance is repositioned from the rendered node position
    // and can otherwise leave one stale geometry frame between visibility and
    // pointerdown.
    await handle.hover();
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    const target = await renderedPoint(page, targetId);
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const startHit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id || "", start);
    if (startHit !== "connection-handle") {
      await page.waitForTimeout(100);
      continue;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const created = await page.locator("#toast").textContent();
    if (created?.includes("Aresta criada")) return;
  }
  throw new Error(`Could not connect to ${targetId} through the canvas affordance.`);
}

async function dragRouteHandle(page, id) {
  const handle = page.locator("#route-handle");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(handle).toBeVisible();
    await handle.hover();
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 42, start.y + 26, { steps: 4 });
    await page.mouse.up();
    const locked = await page.evaluate(edgeId => Boolean(window.loopViewerDemo.engine.cy.getElementById(edgeId).data("routeLocked")), id);
    if (locked) return;
    // Keep the current edge selection while the handle settles. Re-selecting
    // through the canvas here can race the route redraw and turn a recoverable
    // drag miss into a false "edge not hittable" failure.
    await page.waitForTimeout(120);
  }
  throw new Error(`Could not drag the route handle for ${id} through the canvas pointer.`);
}

test("conectar variáveis permanece disponível dentro de Mais ações", async ({ page }) => {
  await openEditor(page);
  const writes = [];
  page.on("request", request => {
    if (request.method() !== "GET" && request.url().includes("/api/")) writes.push(`${request.method()} ${request.url()}`);
  });

  await activateCanvasNode(page, "demand");
  await expectCanvasHandleContract(page, "#connection-handle", 22);
  await page.locator(".edit-toolbar-more > summary").click();
  const connect = page.locator("#connect-selection");
  await expect(connect).toBeEnabled();
  await connect.click();
  await expect(page.locator("#toast")).toContainText("Conectando");

  await page.waitForTimeout(120);
  // Capacity is a non-adjacent node in the middle of the real Flagship map.
  // It keeps this pointer proof clear of the dock and map-control chrome;
  // the test is about drawing a new edge, not a particular narrative target.
  await dragConnectionHandle(page, "capacity");
  await expect(page.locator("#toast")).toContainText("Aresta criada");
  await expect.poll(() => writes.length).toBeGreaterThan(0);
});

test("route handle fixa e libera uma rota manual", async ({ page }) => {
  await openEditor(page);
  await activateEdge(page, "demand-planning");
  await expectCanvasHandleContract(page, "#route-handle", 20);
  await dragRouteHandle(page, "demand-planning");
  await expect(page.locator("#toast")).toContainText("Rota manual fixada");

  await page.locator(".edit-toolbar-more > summary").click();
  const unlock = page.locator("#unlock-route");
  await expect(unlock).toBeEnabled();
  await unlock.click();
  await expect(page.locator("#toast")).toContainText("Rota liberada");
});
