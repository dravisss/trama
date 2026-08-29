import { test, expect } from "../support/qa-test.mjs";
import { activateCanvasEdge, activateCanvasNode } from "../support/canvas-interaction.mjs";

test("Editor preserva posição de variável e rota manual depois de recarregar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openEditor(page);

  await activateCanvasNode(page, "demand");
  const positionBefore = await modelSnapshot(page, "demand");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#save-status")).toContainText("Salvo");
  const positionAfter = await modelSnapshot(page, "demand");
  expect(positionAfter.x).toBeGreaterThan(positionBefore.x);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  const restoredPosition = await modelSnapshot(page, "demand");
  expect(restoredPosition.x).toBeCloseTo(positionAfter.x, 3);
  expect(restoredPosition.y).toBeCloseTo(positionAfter.y, 3);
  // Restore the shared QA fixture for the following specs in this worker.
  await activateCanvasNode(page, "demand");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#save-status")).toContainText("Salvo");
});

test("Editor preserva rota manual depois de recarregar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openEditor(page);
  await activateCanvasEdge(page, "demand-planning");
  await dragRouteHandle(page, "demand-planning");
  await expect(page.locator("#toast")).toContainText("Rota manual fixada");
  await expect(page.locator("#save-status")).toContainText("Salvo");
  const routeAfter = await modelSnapshot(page, "demand-planning", "edge");
  expect(routeAfter.locked).toBe(true);
  expect(Math.abs(routeAfter.controlPointDistance)).toBeGreaterThan(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  const restoredRoute = await modelSnapshot(page, "demand-planning", "edge");
  expect(restoredRoute.locked).toBe(true);
  // Export persists the Cytoscape curve distance, which is deliberately an
  // integer scalar. The live editing route retains the sub-pixel value only
  // until that serialization boundary is crossed.
  expect(restoredRoute.controlPointDistance).toBe(Math.round(routeAfter.controlPointDistance));
  // Re-select the persisted edge before invoking an action that operates on
  // the current edge selection. Reload intentionally clears transient UI
  // selection while retaining the model route state.
  await activateCanvasEdge(page, "demand-planning");
  await expect(page.locator("#route-handle")).toBeVisible();
  await page.locator(".edit-toolbar-more > summary").click();
  await page.locator("#unlock-route").click();
  await expect(page.locator("#toast")).toContainText("Rota liberada");
});

async function openEditor(page) {
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");
  await expect(page.locator("#edit-toolbar")).toBeVisible();
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-camera-stable", /^map:stable:/);
  await page.waitForFunction(() => {
    const cy = window.loopViewerDemo?.engine?.cy;
    return Boolean(cy) && !cy.animated() && !cy.elements().animated();
  });
}

async function modelSnapshot(page, id, kind = "node") {
  return page.evaluate(({ id, kind }) => {
    const element = window.loopViewerDemo.engine.cy.getElementById(id);
    if (kind === "edge") return element.data("route") || {};
    return element.position();
  }, { id, kind });
}

async function renderedPoint(page, id, kind = "node") {
  return page.evaluate(async ({ id, kind }) => {
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
        const rect = canvas.getBoundingClientRect();
        return { x: rect.left + direct.x, y: rect.top + direct.y };
      }
      if (kind === "edge" && Number.isFinite(direct?.x) && Number.isFinite(direct?.y)) {
        const renderer = cy.renderer();
        const rect = canvas.getBoundingClientRect();
        const pagePoint = { x: rect.left + direct.x, y: rect.top + direct.y };
        if (renderer.findNearestElement(direct.x, direct.y, true, false)?.id?.() === id && pagePointIsOnCanvas(pagePoint)) {
          return pagePoint;
        }
      }
      if (kind === "edge" && element) {
        const renderer = cy.renderer();
        const isTarget = point => {
          const rect = canvas.getBoundingClientRect();
          return renderer.findNearestElement(point.x, point.y, true, false)?.id?.() === id
            && pagePointIsOnCanvas({ x: rect.left + point.x, y: rect.top + point.y });
        };
        const bounds = element.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
        const source = element.source()?.renderedPosition?.();
        const target = element.target()?.renderedPosition?.();
        const controls = element.renderedControlPoints?.() || [];
        const renderedPath = element._private?.rscratch?.allpts || [];
        const candidates = [direct];
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
            for (let x = Math.ceil(bounds.x1); x <= Math.floor(bounds.x2); x += 1) {
              candidates.push({ x, y });
            }
          }
        }
        const point = candidates.find(candidate => Number.isFinite(candidate?.x) && Number.isFinite(candidate?.y) && isTarget(candidate));
        if (point) {
          const rect = canvas.getBoundingClientRect();
          return { x: rect.left + point.x, y: rect.top + point.y };
        }
      }
      await nextFrame();
    }
    throw new Error(`Could not resolve an interactive rendered point for ${kind} ${id}.`);
  }, { id, kind });
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
    const receivesPointer = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id === "route-handle", start);
    if (!receivesPointer) {
      await activateCanvasEdge(page, id);
      continue;
    }
    await page.mouse.down();
    await page.mouse.move(start.x + 42, start.y + 26, { steps: 4 });
    await page.mouse.up();
    const locked = await page.evaluate(edgeId => Boolean(window.loopViewerDemo.engine.cy.getElementById(edgeId).data("routeLocked")), id);
    if (locked) return;
    await activateCanvasEdge(page, id);
  }
  throw new Error(`Could not drag the route handle for ${id} through the canvas pointer.`);
}

function qaBaseURL() {
  const baseURL = process.env.LOOPVIEWER_UI_QA_URL;
  if (!baseURL) throw new Error("LOOPVIEWER_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}
