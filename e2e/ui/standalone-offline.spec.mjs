import { test, expect } from "../support/qa-test.mjs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createStandaloneHtml } from "../../src/export/standalone.js";
import { buildUnifiedUiFixture } from "../../qa/fixtures/unified-ui-fixture.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function writeStandaloneFiles({ presentationStyle = null } = {}) {
  const fixture = buildUnifiedUiFixture();
  const mapEntries = fixture.maps.map(map => ({
    id: map.id,
    title: map.title,
    summary: map.description_md,
    description_md: map.description_md,
    model: map.model,
    view: fixture.views.find(view => view.map_id === map.id)
  }));
  const runtime = await readFile(resolve(root, "dist/standalone-runtime.iife.js"), "utf8");
  const styles = await Promise.all([
    readFile(resolve(root, "dist/standalone-fonts.css"), "utf8"),
    readFile(resolve(root, "standalone.css"), "utf8")
  ]).then(parts => parts.join("\n"));
  const directory = await mkdtemp(resolve(tmpdir(), "trama-standalone-"));
  const files = [];
  const presentation = presentationStyle
    ? {
      ...fixture.presentations[0].presentation,
      settings: { ...fixture.presentations[0].presentation.settings, presentationStyle }
    }
    : fixture.presentations[0].presentation;
  for (const [name, embed] of [
    ["clean", { sidebar: false, presentationOnly: true }],
    ["guided", { sidebar: true, presentationOnly: true }],
    ["explore", { sidebar: true, presentationOnly: false }]
  ]) {
    const html = createStandaloneHtml({
      project: fixture.project,
      model: mapEntries.at(-1).model,
      loops: mapEntries,
      activeLoopId: mapEntries.at(-1).id,
      presentation,
      presentations: fixture.presentations,
      assets: fixture.assets.map(asset => ({
        ...asset,
        data_url: `data:${asset.mime_type};base64,${asset.content_base64}`
      })),
      runtime,
      styles,
      embed
    });
    const path = resolve(directory, `${name}.html`);
    await writeFile(path, html, "utf8");
    files.push({ name, path, embed });
  }
  return { directory, files };
}

test("standalone export abre por file:// sem rede nos três perfis", async ({ page }) => {
  const { directory, files } = await writeStandaloneFiles();
  try {
    for (const { name, path, embed } of files) {
      const externalRequests = [];
      page.on("request", request => {
        const protocol = new URL(request.url()).protocol;
        if (!["file:", "data:", "about:"].includes(protocol)) externalRequests.push(request.url());
      });
      await page.context().setOffline(true);
      await page.goto(pathToFileURL(path).href, { waitUntil: "load" });
      await expect(page.locator(".standalone-shell")).toBeVisible();
      await expect(page.locator("meta[name='trama-design-system']")).toHaveAttribute("content", "matcha@1.0.0");
      await expect(page.locator("meta[name='trama-design-system-hash']")).toHaveAttribute("content", /^[a-f0-9]{64}$/);
      await expect(page.locator("#standalone-graph")).toBeVisible();
      await expect.poll(() => page.locator("#standalone-graph canvas").count()).toBeGreaterThan(0);
      expect(externalRequests).toEqual([]);

      if (embed.presentationOnly) {
        await expect(page.locator(".standalone-story")).toBeVisible();
      } else {
        await page.locator('[data-action="present"]').click();
        await expect(page.locator(".standalone-story")).toBeVisible();
      }
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Escape");
      await expect(page.locator(".standalone-story")).toBeHidden();

      page.removeAllListeners("request");
      expect(name).toMatch(/clean|guided|explore/);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("standalone export honors the persisted Atlas editorial profile offline", async ({ page }) => {
  const { directory, files } = await writeStandaloneFiles({ presentationStyle: "atlas-editorial" });
  try {
    const clean = files.find(file => file.name === "clean");
    await page.context().setOffline(true);
    await page.goto(pathToFileURL(clean.path).href, { waitUntil: "load" });
    await expect(page.locator(".standalone-story")).toBeVisible();
    await expect(page.locator(".standalone-story")).toHaveAttribute("data-presentation-style", "atlas-editorial");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".standalone-story-connector-line")).toHaveCount(1);
    await expect(page.locator(".standalone-story-connector-halo")).toHaveCount(1);
    await expect(page.locator(".standalone-story")).toHaveAttribute("data-camera-mode", "fit-focus");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
