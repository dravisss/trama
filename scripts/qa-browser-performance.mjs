import { execFileSync } from "node:child_process";

const browser = process.env.LOOPVIEWER_BROWSER_BIN || "agent-browser";
const url = process.env.LOOPVIEWER_QA_URL || "http://127.0.0.1:4173/?qa=1&fixture=8";

run(["open", url]);
run(["wait", "1800"]);
evaluate("(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === 'Editor'); if (!button) throw new Error('Editor navigation button is unavailable'); button.click(); return true; })()");
run(["wait", "1400"]);

const result = evaluate(`
(() => {
  const source = window.loopViewerDemo?.engine;
  const qa = window.loopViewerDemo?.qa;
  if (!source || !qa || !window.CLD) throw new Error("LoopViewer QA runtime is unavailable");
  const baselineFingerprint = qa.fingerprint();
  const canvas = document.querySelector("#cld-root");
  if (!canvas || canvas.clientWidth < 100 || canvas.clientHeight < 100) {
    throw new Error("Editor canvas did not stabilize");
  }

  const model = structuredClone(source.getModel({ includePositions: true, includeRoutes: true }));
  const host = document.createElement("div");
  host.style.cssText = "width:700px;height:500px;position:absolute;left:-10000px;top:-10000px";
  document.body.append(host);
  const probe = window.CLD.createCLD({ container: host, model, editable: true, routeQuality: "draft" });
  const originalCy = probe.cy;
  const positions = new Map(probe.cy.nodes().map(node => [node.id(), { ...node.position() }]));
  const node = probe.addNode({ label: "Browser probe" }, { position: { x: 1200, y: 900 } });
  const incrementalNode = probe.cy === originalCy;
  const edge = probe.addEdge({ source: model.nodes[0].id, target: node.id, sourceSign: "+", targetSign: "+", description: "" });
  const incrementalEdge = probe.cy === originalCy;
  const positionsStable = model.nodes.every(item => {
    const actual = probe.cy.getElementById(item.id).position();
    const expected = positions.get(item.id);
    return Math.abs(actual.x - expected.x) < 0.01 && Math.abs(actual.y - expected.y) < 0.01;
  });
  const routeStarted = probe.beginRouteInteraction(edge.id);
  const routePreviewed = probe.previewEdgeRoute(edge.id, 64);
  const routeCommitted = probe.commitEdgeRoute(edge.id, 64);
  const interaction = probe.getState().metrics.interactions.completed.at(-1);
  probe.removeEdge(edge.id);
  probe.removeNode(node.id);
  const incrementalRemoval = probe.cy === originalCy &&
    probe.cy.nodes().length === model.nodes.length &&
    probe.cy.edges().length === model.edges.length;
  probe.destroy();
  host.remove();

  return JSON.stringify({
    baselineFingerprint,
    canvas: { width: canvas.clientWidth, height: canvas.clientHeight },
    incrementalNode,
    incrementalEdge,
    positionsStable,
    routeStarted,
    routePreviewed,
    routeCommitted,
    incrementalRemoval,
    interaction,
    qualityIssues: qa.check().issues
  });
})()
`);

const required = [
  "incrementalNode",
  "incrementalEdge",
  "positionsStable",
  "routeStarted",
  "routePreviewed",
  "routeCommitted",
  "incrementalRemoval"
];
for (const key of required) {
  if (!result[key]) throw new Error(`Browser QA failed: ${key}`);
}
if (result.interaction?.commits !== 1 || result.interaction?.previews < 1) {
  throw new Error("Browser QA failed: interaction transaction accounting");
}

console.log(JSON.stringify({ ok: true, ...result }, null, 2));

function run(args) {
  return execFileSync(browser, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function evaluate(expression) {
  const output = execFileSync(browser, ["eval", "--stdin"], {
    input: expression,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });
  const line = output.trim().split("\n").at(-1);
  const first = JSON.parse(line);
  return typeof first === "string" ? JSON.parse(first) : first;
}
