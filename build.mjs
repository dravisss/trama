import { build } from "esbuild";
import { spawn } from "node:child_process";

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["scripts/build-design-tokens.mjs"], { stdio: "inherit" });
  child.once("error", reject);
  child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Token generation failed with ${code}`)));
});

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["scripts/build-publication-fonts.mjs"], { stdio: "inherit" });
  child.once("error", reject);
  child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Publication font generation failed with ${code}`)));
});

await Promise.all([
  build({
    entryPoints: ["src/index.js"],
    outfile: "dist/cld-engine.iife.js",
    bundle: true,
    format: "iife",
    globalName: "CLD",
    footer: { js: "window.CLD = CLD;" },
    target: ["es2020"],
    sourcemap: true
  }),
  build({
    entryPoints: ["src/app.js"],
    outfile: "dist/app.iife.js",
    bundle: true,
    format: "iife",
    target: ["es2020"],
    sourcemap: true
  }),
  build({
    entryPoints: ["src/react/main.jsx"],
    outfile: "dist/react-app.iife.js",
    bundle: true,
    format: "iife",
    target: ["es2020"],
    sourcemap: true
  }),
  build({
    entryPoints: ["src/standalone.js"],
    outfile: "dist/standalone-runtime.iife.js",
    bundle: true,
    format: "iife",
    target: ["es2020"],
    minify: true
  }),
  build({
    entryPoints: ["src/atlasEmbed.js"],
    outfile: "dist/atlas-embed-runtime.iife.js",
    bundle: true,
    format: "iife",
    target: ["es2020"],
    minify: true
  })
]);

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["scripts/build-landing.mjs"], { stdio: "inherit" });
  child.once("error", reject);
  child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Landing build failed with ${code}`)));
});

console.log("Built CLD engine, app, standalone runtime and Trama landing.");
