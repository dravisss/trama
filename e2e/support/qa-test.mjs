import { test as base, expect } from "@playwright/test";

function qaBaseURL() {
  const baseURL = process.env.TRAMA_UI_QA_URL;
  if (!baseURL) throw new Error("TRAMA_UI_QA_URL was not initialized by Playwright global setup.");
  return baseURL;
}

/**
 * The UI server deliberately uses one local SQLite process per Playwright run.
 * Reset its explicitly QA-only fixture before every test so a persistence test
 * cannot change the starting state of a visual or interaction proof.
 */
const test = base.extend({
  // `test.beforeEach()` declared from an imported helper belongs only to the
  // spec file that first evaluates that helper. Keep the QA boundary as an
  // automatic fixture instead: every spec importing this `test` gets its own
  // reset, browser-local cleanup and generation stamp.
  qaFixture: [async ({ page }, use) => {
    const response = await fetch(`${qaBaseURL()}/api/qa/reset-fixture`, { method: "POST" });
    if (!response.ok) {
      throw new Error(`Could not reset the Trama UI QA fixture (${response.status}).`);
    }
    // Consume the reset response and confirm the canonical presentation order
    // before a browser can hydrate it. A previous persistence scenario may have
    // queued its final write while its page is being torn down; without this
    // barrier a later visual proof can accidentally begin from that author's
    // reordered opening beat instead of from the deterministic fixture.
    const resetData = await response.json();
    const fixtureGeneration = Number(resetData?.qa_generation);
    if (!Number.isInteger(fixtureGeneration) || fixtureGeneration < 1) {
      throw new Error("QA fixture reset did not return a valid generation.");
    }
    const projectResponse = await fetch(`${qaBaseURL()}/api/project`);
    if (!projectResponse.ok) throw new Error(`Could not verify the Trama UI QA fixture (${projectResponse.status}).`);
    const projectData = await projectResponse.json();
    const flagship = (projectData.presentations || []).find(item => item.id === "flagship-growth-story")?.presentation;
    const openingBeatId = flagship?.chapters?.[0]?.scenes?.[0]?.beats?.[0]?.id;
    if (openingBeatId !== "opening-context") {
      throw new Error(`QA fixture reset did not restore the canonical opening beat (received ${openingBeatId || "none"}).`);
    }
    // Stamp every browser request from this proof. Page-level extra headers
    // survive a test's own `page.goto()` calls and let the QA server distinguish
    // a delayed request from a previous page without changing application code.
    const qaGenerationHeaders = {
      "X-Trama-QA-Generation": String(fixtureGeneration)
    };
    await page.context().setExtraHTTPHeaders(qaGenerationHeaders);
    await page.setExtraHTTPHeaders(qaGenerationHeaders);
    const headerViolations = [];
    page.on("request", request => {
      if (["GET", "HEAD", "OPTIONS"].includes(request.method())) return;
      if (!new URL(request.url()).pathname.startsWith("/api/")) return;
      if (request.headers()["x-trama-qa-generation"] !== String(fixtureGeneration)) {
        headerViolations.push(`${request.method()} ${new URL(request.url()).pathname}`);
      }
    });
    qaRequestViolations.set(page, headerViolations);
    // The app deliberately persists local layout/route state under trama:*
    // keys when the API is offline. Resetting the QA SQLite fixture alone does
    // not reset that browser-local state, so one test can leak positions, routes
    // or stale selection into the next test. Install this before navigation so
    // the app cannot read stale state during its first render. Persistence
    // within a single test (including reload checks) remains untouched.
    await page.addInitScript(() => {
      Object.keys(localStorage)
        .filter(key => key.startsWith("trama:"))
        .forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
    });
    const initialProjectRequest = page.waitForRequest(request => {
      const pathname = new URL(request.url()).pathname;
      return pathname === "/api/project";
    });
    await page.goto(`${qaBaseURL()}/?qa=1&qa-reset=1`, { waitUntil: "domcontentloaded" });
    const initialProjectHeaders = (await initialProjectRequest).headers();
    if (initialProjectHeaders["x-trama-qa-generation"] !== String(fixtureGeneration)) {
      throw new Error("QA page did not stamp its initial project request with the fixture generation.");
    }
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter(key => key.startsWith("trama:"))
        .forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
    });

    try {
      await use();
    } finally {
      // Let short client-side persistence timers finish while this test still
      // owns the page. The next test starts from a reset database, not from a
      // write that escaped a just-closed page.
      if (!page.isClosed()) await page.waitForTimeout(420);
      const violations = qaRequestViolations.get(page) || [];
      if (violations.length) {
        throw new Error(`QA generation header was missing from: ${violations.join(", ")}`);
      }
    }
  }, { auto: true }]
});
const qaRequestViolations = new WeakMap();

export { test, expect, qaBaseURL };
