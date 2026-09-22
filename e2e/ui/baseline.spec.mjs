import { test, expect } from "../support/qa-test.mjs";

const compatibility = await readJson("../../docs/UI_COMPATIBILITY_MANIFEST.json");
const knownExceptions = await readJson("../../qa/known-baseline-exceptions.json");
const knownConsoleWarnings = knownExceptions.exceptions
  .filter(item => item.classification === "known")
  .map(item => item.id === "cytoscape-label-data-warning" ? "label: data(label)" : item.description);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 }
];

const MODES = ["workspace", "map", "story", "present"];

test.describe.configure({ mode: "serial" });

for (const viewport of VIEWPORTS) {
  for (const mode of MODES) {
    test(`${mode} baseline at ${viewport.name}`, async ({ page }) => {
      const consoleEvents = watchConsole(page);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openMode(page, mode, viewport.name);
      // Toasts are transient interaction feedback, not part of a visual
      // baseline. Wait for the owning bridge to dismiss one before capture.
      await expect(page.locator("#toast")).toBeHidden();
      await assertUiContracts(page, mode);
      // The responsive shell can finish its final grid commit after the
      // semantic camera marker; capture only after that composition settles.
      await page.waitForTimeout(350);
      await expect(page).toHaveScreenshot(`${mode}-${viewport.name}.png`, {
        animations: "disabled",
        caret: "hide",
        fullPage: true,
        maxDiffPixelRatio: 0.002
      });
      expect(consoleEvents.errors, consoleEvents.errors.join("\n")).toEqual([]);
      expect(consoleEvents.warnings, consoleEvents.warnings.join("\n")).toEqual([]);
    });
  }
}

test("fixture API exposes only the deterministic QA project", async ({ request }) => {
  const response = await request.get(`${qaBaseURL()}/api/project`);
  expect(response.ok()).toBe(true);
  const project = await response.json();
  expect(project.project.title).toBe("Trama UI QA");
  expect(project.maps).toHaveLength(4);
  expect(project.maps.map(map => map.id).sort()).toEqual(["ui-qa-8", "ui-qa-16", "ui-qa-32", "flagship-growth"].sort());
});

async function openMode(page, mode, viewportName) {
  await page.goto(`${qaBaseURL()}/?qa=1`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#react-root")).toBeAttached();
  await expect(page.locator("[data-react-ui-mode='workspace']")).toBeVisible();
  await expect(page.locator("#workspace-map-list")).toContainText("Flagship — Crescimento sob pressão");

  if (mode === "workspace") {
    await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "workspace");
    return;
  }

  await page.getByRole("button", { name: /Flagship — Crescimento sob pressão/ }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ui-mode", "map");
  await expect(page.locator("#cld-root")).toBeVisible();
  await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-fingerprint", /.+/);
  // React mode changes are asynchronous. Capture only after the shell still
  // reflects the real project and map, preventing a transient empty breadcrumb
  // from becoming a visual baseline failure.
  await expect(page.locator("#active-project-label")).toContainText("Trama UI QA");
  await expect(page.locator("#active-loop-label")).toContainText("Flagship — Crescimento sob pressão");

  if (mode !== "map") {
    await page.locator(`[data-react-ui-mode='${mode}']`).click();
    await expect(page.locator("body")).toHaveAttribute("data-ui-mode", mode);
  }

  if (mode === "present") {
    await expect(page.locator("#presentation-card")).toBeVisible();
    await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-presentation-camera", /.+/);
    if (viewportName === "mobile") {
      await expect(page.locator(".react-app-navigation")).toBeHidden();
      await expect(page.locator("#presentation-close")).toBeVisible();
    }
  }
  if (["map", "story"].includes(mode)) {
    await expect(page.locator("#cld-root")).toHaveAttribute("data-qa-camera-stable", new RegExp(`^${mode}:stable:`));
  }
  if (mode === "story") {
    // On compact screens Story Studio intentionally foregrounds the timeline;
    // the Inspector is available through the timeline's mobile sheet control.
    await expect(page.locator("#story-timeline-shell[data-story-ui='v2']")).toBeVisible();
  }
}

function qaBaseURL() {
  const baseURL = process.env.TRAMA_UI_QA_URL;
  if (!baseURL) throw new Error("TRAMA_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

async function readJson(relativePath) {
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

async function assertUiContracts(page, mode) {
  const ids = await page.locator("[id]").evaluateAll(nodes => {
    const counts = new Map();
    nodes.forEach(node => counts.set(node.id, (counts.get(node.id) || 0) + 1));
    return [...counts].filter(([, count]) => count > 1).map(([id]) => id);
  });
  expect(ids).toEqual([]);

  for (const id of [...compatibility.mountPoints, ...compatibility.bridgeIds]) {
    await expect(page.locator(`#${id}`), `compatibility contract #${id}`).toHaveCount(1);
  }
  await expect(page.locator("[data-react-ui-mode]"), "four application modes").toHaveCount(4);
  await expect(page.locator(`[data-react-ui-mode='${mode}']`)).toHaveAttribute("aria-pressed", "true");
}

function watchConsole(page) {
  const events = { errors: [], warnings: [] };
  page.on("pageerror", error => events.errors.push(`pageerror: ${error.message}`));
  page.on("console", message => {
    const text = message.text();
    if (message.type() === "error") events.errors.push(text);
    if (message.type() === "warning" && !knownConsoleWarnings.some(known => text.includes(known))) {
      events.warnings.push(text);
    }
  });
  return events;
}
