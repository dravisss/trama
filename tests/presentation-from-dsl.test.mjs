import test from "node:test";
import assert from "node:assert/strict";
import { buildPresentationStepsFromDSL, parseDSL } from "../scripts/presentation-from-dsl.mjs";

test("presentation DSL parses relation steps and section headers", () => {
  const dsl = `# Apresentacao de teste

R2a — Cliente insatisfeito via carteirada:
  [Tempo de Ciclo da Demanda] → [Satisfacao do Cliente]: "Reduz — mais espera corrói a satisfação."
`;

  const parsed = parseDSL(dsl);
  assert.equal(parsed.title, "Apresentacao de teste");
  assert.equal(parsed.steps.length, 1);
  assert.deepEqual(parsed.steps[0], {
    type: "relation",
    label: "Tempo de Ciclo da Demanda",
    targetLabel: "Satisfacao do Cliente",
    body: "Reduz — mais espera corrói a satisfação.",
    loopRef: "R2a"
  });
});

test("presentation DSL resolves relation steps into edge-focused presentation steps", () => {
  const model = {
    nodes: [
      { id: "tcd", label: "Tempo de Ciclo da Demanda" },
      { id: "scl", label: "Satisfacao do Cliente" }
    ],
    edges: [
      {
        id: "e06",
        source: "tcd",
        target: "scl",
        sourceSign: "+",
        targetSign: "−",
        description: "Tempo de ciclo alto reduz a satisfacao do cliente."
      }
    ],
    loops: []
  };

  const parsed = parseDSL(`# Story

R2a:
  [Tempo de Ciclo da Demanda] → [Satisfacao do Cliente]:
`);
  const steps = buildPresentationStepsFromDSL(model, parsed.steps);

  assert.equal(steps.length, 1);
  assert.equal(steps[0].title, "Tempo de Ciclo da Demanda → Satisfacao do Cliente");
  assert.equal(steps[0].body, "Tempo de ciclo alto reduz a satisfacao do cliente.");
  assert.deepEqual(steps[0].focus, { edgeId: "e06" });
});
