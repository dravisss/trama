import { build } from "esbuild";
import { mkdir, copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { createLandingDemo } from "../landing/demo.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "dist/landing");
const [map, story] = await Promise.all([
  readFile(resolve(root, "seeds/trama-atalhos.loop.md"), "utf8"),
  readFile(resolve(root, "seeds/trama-atalhos.story.md"), "utf8")
]);
const demo = createLandingDemo(map, story);
await mkdir(resolve(output, "assets/fonts"), { recursive: true });
await mkdir(resolve(output, "assets/images"), { recursive: true });
await Promise.all([
  ["landing/index.html", "index.html"],
  ["landing/landing.css", "assets/landing.css"],
  ["landing/favicon.svg", "assets/favicon.svg"],
  ["landing/assets/trama-paper-loop.webp", "assets/images/trama-paper-loop.webp"],
  ...["TCD", "CAR", "DCP", "BLD", "DRC", "CCD"].map(name => [`assets/demo/sobrecarga-filas/${name}.webp`, `assets/images/${name}.webp`]),
  ...["noto-serif-latin-500-normal.woff2", "noto-sans-latin-400-normal.woff2", "noto-sans-latin-500-normal.woff2", "noto-sans-latin-600-normal.woff2"]
    .map(font => [`assets/fonts/${font}`, `assets/fonts/${font}`])
].map(([source, target]) => copyFile(resolve(root, source), resolve(output, target))));
const result = await build({
  absWorkingDir: root, entryPoints: ["landing/main.js"], outfile: resolve(output, "assets/landing.js"),
  bundle: true, format: "iife", target: ["es2020"], minify: true, loader: { ".md": "text" }, metafile: true
});
const bytes = Object.values(result.metafile.outputs).reduce((sum, entry) => sum + entry.bytes, 0);
console.log(`Trama landing: ${demo.model.nodes.length} variáveis, ${demo.compiled.timeline.length} passos válidos; JS ${(bytes / 1024).toFixed(0)} KiB. ${output}`);
