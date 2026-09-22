import { startQaServer } from "./qa-server.mjs";

export default async function globalSetup() {
  const runtime = await startQaServer();
  process.env.TRAMA_UI_QA_URL = runtime.baseURL;
  console.log(`Trama UI QA server ready at ${runtime.baseURL}`);
  const shutdown = () => runtime.stop();
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return async () => {
    process.removeListener("SIGINT", shutdown);
    process.removeListener("SIGTERM", shutdown);
    await runtime.stop();
  };
}
