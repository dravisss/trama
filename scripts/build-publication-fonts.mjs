import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = resolve(root, "dist");
const assets = [
  ["Noto Sans", 400, "noto-sans-latin-400-normal.woff2", "latin"],
  ["Noto Sans", 400, "noto-sans-latin-ext-400-normal.woff2", "latin-ext"],
  ["Noto Sans", 500, "noto-sans-latin-500-normal.woff2", "latin"],
  ["Noto Sans", 500, "noto-sans-latin-ext-500-normal.woff2", "latin-ext"],
  ["Noto Sans", 600, "noto-sans-latin-600-normal.woff2", "latin"],
  ["Noto Sans", 600, "noto-sans-latin-ext-600-normal.woff2", "latin-ext"],
  ["Noto Serif", 500, "noto-serif-latin-500-normal.woff2", "latin"],
  ["Noto Serif", 500, "noto-serif-latin-ext-500-normal.woff2", "latin-ext"],
  ["Noto Serif", 600, "noto-serif-latin-600-normal.woff2", "latin"],
  ["Noto Serif", 600, "noto-serif-latin-ext-600-normal.woff2", "latin-ext"]
];
const latinRange = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA-02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const latinExtRange = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

const css = [];
for (const [family, weight, filename, subset] of assets) {
  const packageName = family === "Noto Sans" ? "@fontsource/noto-sans" : "@fontsource/noto-serif";
  const source = resolve(root, "node_modules", packageName, "files", filename);
  const buffer = await readFile(source);
  const encoded = buffer.toString("base64");
  css.push(`@font-face{font-family:"${family}";font-style:normal;font-display:swap;font-weight:${weight};src:url(data:font/woff2;base64,${encoded}) format("woff2");unicode-range:${subset === "latin" ? latinRange : latinExtRange};}`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "standalone-fonts.css"), `${css.join("\n")}\n`);
console.log(`Generated ${assets.length} embedded publication font faces.`);
