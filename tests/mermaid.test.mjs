import test from "node:test";
import assert from "node:assert/strict";
import { importMermaid, MermaidImportError } from "../src/language/mermaid.js";

test("imports Mermaid flowcharts with labels and causal signs", () => {
  const model = importMermaid(`flowchart LR
    demand[Demand] -->|+| capacity[Capacity]
    capacity -- "-" --> delay[Delay]
    delay --> demand
  `, { id: "capacity-loop", title: "Capacity loop" });
  assert.equal(model.nodes.find(node => node.id === "demand").label, "Demand");
  assert.equal(model.edges[0].targetSign, "+");
  assert.equal(model.edges[1].targetSign, "−");
  assert.equal(model.title, "Capacity loop");
});

test("reports unsupported Mermaid statements with line numbers", () => {
  assert.throws(() => importMermaid("graph TD\nclassDef risk fill:red"), error =>
    error instanceof MermaidImportError && error.errors[0].line === 2);
});
