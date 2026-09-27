/**
 * Hosted (public, account-less) entry point. The local-first `server.mjs`
 * is unchanged; this process serves many isolated workspaces instead of one
 * active project file. See docs/HOSTING.md.
 */
import { fileURLToPath } from "node:url";
import { loadHostedConfig } from "./server/hosted/config.js";
import { createHostedApp } from "./server/hosted/app.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const config = loadHostedConfig(process.env, { root });
const app = createHostedApp(config);

app.server.listen(config.port, config.host, () => {
  console.log(`${config.productName} (hosted) listening on http://${config.host}:${config.port} — public URL ${config.publicUrl}`);
  console.log(`Data root: ${config.dataRoot}`);
});

let closing = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    if (closing) return;
    closing = true;
    console.log(`Received ${signal}, closing workspaces…`);
    const timer = setTimeout(() => process.exit(1), 10_000);
    timer.unref();
    await app.close();
    process.exit(0);
  });
}
