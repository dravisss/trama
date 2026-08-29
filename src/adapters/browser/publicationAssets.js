/**
 * Browser adapter for the resources embedded in standalone HTML.
 *
 * JSON/API access and binary reads are injected so the adapter remains easy
 * to characterize without a browser or a database.
 */
export function createBrowserPublicationAssets({
  resourceFetcher,
  listAssets,
  fetchAsset,
  isAvailable = () => true,
  blobToDataUrl = defaultBlobToDataUrl,
  createRendition = defaultCreateRendition,
  runtimePath = "dist/standalone-runtime.iife.js",
  stylePath = "standalone.css"
} = {}) {
  if (typeof resourceFetcher !== "function" || typeof listAssets !== "function" || typeof fetchAsset !== "function") {
    throw new TypeError("createBrowserPublicationAssets requires resourceFetcher, listAssets, and fetchAsset.");
  }

  return {
    async load({ assetIds = null } = {}) {
      const [runtime, styles, fonts] = await Promise.all([
        readText(resourceFetcher, runtimePath),
        readText(resourceFetcher, stylePath),
        readText(resourceFetcher, "dist/standalone-fonts.css")
      ]);
      const assets = isAvailable() ? await loadProjectAssets(assetIds) : [];
      return { runtime, styles: `${fonts}\n${styles}`, assets };
    },
    async createRenditions({ assets = [], plan = [] } = {}) {
      const requested = new Map((plan || []).map(entry => [entry.assetId, entry.renditions || []]));
      return mapWithConcurrency(assets || [], 2, async asset => {
        const renditions = requested.get(asset.id) || [];
        if (!renditions.length || !String(asset.mime_type || "").startsWith("image/")) return asset;
        const output = {};
        for (const rendition of renditions) {
          try {
            const derived = await createRendition({ asset, rendition, blobToDataUrl });
            if (derived) output[rendition.id] = derived;
          } catch (error) {
            // A source image can be valid for the legacy renderer yet rejected
            // by ImageBitmap. Keep the original only for that asset instead of
            // aborting the entire autonomous publication.
            console.warn("Atlas rendition fallback", asset.id, rendition.id, error);
          }
        }
        return Object.keys(output).length ? { ...asset, renditions: output } : asset;
      });
    }
  };

  async function loadProjectAssets(assetIds) {
    const requested = Array.isArray(assetIds) ? new Set(assetIds) : null;
    const listed = await listAssets("/api/assets");
    const candidates = (listed?.assets || []).filter(asset => !requested || requested.has(asset.id));
    return Promise.all(candidates.map(async asset => {
      const response = await fetchAsset(`/api/assets/${encodeURIComponent(asset.id)}`);
      if (!response?.ok) throw new Error(`Could not read asset ${asset.id}.`);
      return { ...asset, data_url: await blobToDataUrl(await response.blob()) };
    }));
  }
}

async function defaultCreateRendition({ asset, rendition, blobToDataUrl }) {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return null;
  const source = await dataUrlToBlob(asset.data_url);
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, Number(rendition.maxSide || 0) / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" });
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const hasAlpha = detectAlpha(context, width, height);
  const blob = await canvasToBlob(canvas, "image/webp", Number(rendition.quality || 0.9));
  if (!blob || blob.type !== "image/webp") return null;
  return {
    data_url: await blobToDataUrl(blob),
    mime_type: "image/webp",
    width,
    height,
    hasAlpha
  };
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(String(dataUrl || ""));
  if (!response.ok) throw new Error("Could not decode publication source asset.");
  return response.blob();
}

function canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

function detectAlpha(context, width, height) {
  const pixels = context.getImageData(0, 0, width, height).data;
  for (let index = 3; index < pixels.length; index += 4) if (pixels[index] !== 255) return true;
  return false;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function readText(fetcher, path) {
  const response = await fetcher(path);
  if (!response?.ok) throw new Error(`Could not read publication resource ${path}.`);
  return response.text();
}

function defaultBlobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
}
