import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cssFiles = [
  "styles.css",
  "src/app/appShell.css",
  "src/app/storyStudio/storyStudio.css",
  "src/react/reactApp.css",
  "src/react/storyStudioV2/storyStudioV2.css",
  "src/react/applicationRoutes.css",
  "src/react/ui/ui.css"
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (/\.(html|jsx?|mjs)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const [cssTexts, sourceFiles] = await Promise.all([
  Promise.all(cssFiles.filter(file => existsSync(resolve(root, file))).map(async file => ({ file, text: await readFile(resolve(root, file), "utf8") }))),
  filesUnder(resolve(root, "src")).then(files => files.concat(resolve(root, "index.html"))).then(async files => Promise.all(files.map(async file => ({ file, text: await readFile(file, "utf8") }))))
]);

const sourceText = sourceFiles.map(item => item.text).join("\n");
const ids = new Set([...sourceText.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
const classes = new Set();
for (const match of sourceText.matchAll(/\bclass(?:Name)?=["']([^"']+)["']/g)) {
  match[1].split(/\s+/).filter(Boolean).forEach(value => classes.add(value));
}

const cssIds = new Map();
const cssClasses = new Map();
for (const { file, text } of cssTexts) {
  const relative = file.replace(`${root}/`, "");
  for (const match of text.matchAll(/#([A-Za-z][\w-]*)/g)) {
    const id = match[1];
    if (!cssIds.has(id)) cssIds.set(id, []);
    cssIds.get(id).push(relative);
  }
  for (const match of text.matchAll(/\.([A-Za-z][\w-]*)/g)) {
    const className = match[1];
    if (!cssClasses.has(className)) cssClasses.set(className, []);
    cssClasses.get(className).push(relative);
  }
}

const orphanIds = [...cssIds.keys()]
  .filter(id => !/^[0-9a-f]{6}$/i.test(id) && !ids.has(id))
  .sort();
const orphanClasses = [...cssClasses.keys()]
  .filter(className => !classes.has(className) && !["hover", "focus", "focus-visible", "active", "disabled", "checked", "selected", "open", "hidden", "empty", "before", "after", "is", "not", "root", "first-child", "last-child", "nth-child", "only-child", "has"].includes(className))
  .sort();

const report = {
  cssFiles,
  cssIds: cssIds.size,
  cssClasses: cssClasses.size,
  orphanIds,
  orphanClasses,
  note: "Class usage is reported for review because classes may be emitted dynamically by the imperative engine bridge; IDs are strict because they are compatibility contract points."
};
console.log(JSON.stringify(report, null, 2));
if (orphanIds.length) {
  console.error(`FAIL orphan CSS IDs: ${orphanIds.join(", ")}`);
  process.exitCode = 1;
}
