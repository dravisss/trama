import test from "node:test";
import assert from "node:assert/strict";
import { createBrowserPublicationAssets } from "../src/adapters/browser/publicationAssets.js";
import { createBrowserStandalonePublisher } from "../src/adapters/browser/standalonePublisher.js";
import { createExportStandalone } from "../src/application/publication/exportStandalone.js";

test("ExportStandalone compiles one snapshot with embedded resources and publishes it", async () => {
  const published = [];
  const service = createExportStandalone({
    assetProvider: { load: async () => ({ runtime: "runtime", styles: "styles", assets: [{ id: "cover" }] }) },
    publisher: { publish: async request => { published.push(request); return { delivered: true }; } },
    htmlFactory: snapshot => JSON.stringify(snapshot)
  });

  const result = await service.execute({
    filename: "map.html",
    project: { title: "Projeto" },
    model: { id: "map-a" },
    loops: [{ id: "map-a", model: { id: "map-a" } }],
    activeLoopId: "map-a",
    embed: { sidebar: false }
  });

  assert.equal(result.filename, "map.html");
  assert.equal(result.delivered, true);
  assert.deepEqual(published, [{
    filename: "map.html",
    html: JSON.stringify({
      project: { title: "Projeto" },
      model: { id: "map-a" },
      loops: [{ id: "map-a", model: { id: "map-a" } }],
      activeLoopId: "map-a",
      embed: { sidebar: false },
      runtime: "runtime",
      styles: "styles",
      assets: [{ id: "cover" }]
    }),
    mimeType: "text/html"
  }]);
});

test("ExportStandalone does not publish when resource loading fails and can be retried", async () => {
  let attempts = 0;
  let publications = 0;
  const service = createExportStandalone({
    assetProvider: { load: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("assets unavailable");
      return { runtime: "runtime", styles: "styles", assets: [] };
    } },
    publisher: { publish: async () => { publications += 1; } },
    htmlFactory: () => "<!doctype html>"
  });

  await assert.rejects(service.execute({ filename: "retry.html" }), /assets unavailable/);
  assert.equal(publications, 0);
  await service.execute({ filename: "retry.html" });
  assert.equal(attempts, 2);
  assert.equal(publications, 1);
});

test("browser publication assets preserve font/style order and local asset data URLs", async () => {
  const requests = [];
  const provider = createBrowserPublicationAssets({
    resourceFetcher: async path => ({ ok: true, text: async () => { requests.push(path); return path; } }),
    listAssets: async () => ({ assets: [{ id: "asset/1", filename: "cover.png", mime_type: "image/png" }] }),
    fetchAsset: async path => ({ ok: true, blob: async () => { requests.push(path); return "bytes"; } }),
    blobToDataUrl: async blob => `data:image/png;base64,${blob}`
  });

  assert.deepEqual(await provider.load(), {
    runtime: "dist/standalone-runtime.iife.js",
    styles: "dist/standalone-fonts.css\nstandalone.css",
    assets: [{ id: "asset/1", filename: "cover.png", mime_type: "image/png", data_url: "data:image/png;base64,bytes" }]
  });
  assert.deepEqual(requests, [
    "dist/standalone-runtime.iife.js",
    "standalone.css",
    "dist/standalone-fonts.css",
    "/api/assets/asset%2F1"
  ]);
});

test("browser publication assets skip API assets when the app is unavailable", async () => {
  let listCalls = 0;
  const provider = createBrowserPublicationAssets({
    resourceFetcher: async () => ({ ok: true, text: async () => "resource" }),
    listAssets: async () => { listCalls += 1; return { assets: [] }; },
    fetchAsset: async () => ({ ok: true, blob: async () => "bytes" }),
    isAvailable: () => false
  });

  assert.deepEqual((await provider.load()).assets, []);
  assert.equal(listCalls, 0);
});

test("browser standalone publisher delegates an HTML download with the correct MIME", () => {
  const calls = [];
  const publisher = createBrowserStandalonePublisher({ downloadText: (...args) => calls.push(args) });
  assert.deepEqual(publisher.publish({ filename: "story.html", html: "<html>", mimeType: "text/html" }), {
    filename: "story.html",
    mimeType: "text/html"
  });
  assert.deepEqual(calls, [["story.html", "<html>", "text/html"]]);
});
