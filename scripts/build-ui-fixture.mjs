import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildUnifiedUiFixture } from "../qa/fixtures/unified-ui-fixture.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = resolve(root, "qa/fixtures/unified-ui-project.json");
const source = `${JSON.stringify(buildUnifiedUiFixture(), null, 2)}\n`;
const check = process.argv.includes("--check");

if (check) {
  const existing = readFileSync(output, "utf8");
  if (existing !== source) {
    throw new Error("UI fixture is stale. Run node scripts/build-ui-fixture.mjs and commit the result.");
  }
  console.log(`UI fixture is current: ${output}`);
} else {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, source);
  console.log(`Wrote deterministic UI fixture: ${output}`);
}
