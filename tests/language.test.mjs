import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  compileLoopMarkdown,
  LoopLanguageError,
  serializeLoopMarkdown
} from "../src/language/loopMarkdown.js";
import {
  compileLoopStyle,
  LoopStyleError,
  serializeLoopStyle
} from "../src/language/styleLanguage.js";

const document = `---
id: hiring-friction
title: Hiring Friction
tags: [talent, scaling]
---

## Variables

- load: Hiring Load
- delay: Interview Delay
- experience: Candidate Experience

## Relations

load ++ delay: Load increases delay.
delay +- experience
experience -+ load

## Loops

- R1: Hiring Pressure
  edges:
    - load -> delay
    - delay -> experience
    - experience -> load
  description: Pressure returns to load.

`;

test("loop markdown compiles variables, signed relations and curated loops", () => {
  const model = compileLoopMarkdown(document);
  assert.equal(model.id, "hiring-friction");
  assert.deepEqual(model.tags, ["talent", "scaling"]);
  assert.equal(model.nodes.length, 3);
  assert.equal(model.edges[1].type, "balancing");
  assert.equal(model.loops[0].edgeIds.length, 3);
  assert.equal("story" in model, false);
});

test("loop markdown round-trips through stable authored text", () => {
  const first = compileLoopMarkdown(document);
  const serialized = serializeLoopMarkdown(first);
  const second = compileLoopMarkdown(serialized);
  assert.deepEqual(second.nodes, first.nodes);
  assert.deepEqual(second.edges, first.edges);
  assert.deepEqual(second.loops, first.loops);
});

test("loop markdown preserves multiline labels and descriptions with escapes", () => {
  const model = compileLoopMarkdown(document);
  model.nodes[0].label = "Hiring\nLoad";
  model.edges[0].description = "First line\nSecond line";
  const serialized = serializeLoopMarkdown(model);
  assert.match(serialized, /Hiring\\nLoad/);
  const restored = compileLoopMarkdown(serialized);
  assert.equal(restored.nodes[0].label, "Hiring\nLoad");
  assert.equal(restored.edges[0].description, "First line\nSecond line");
});

test("loop markdown preserves custom fields on variables and relations", () => {
  const model = compileLoopMarkdown(`# Fields

## Variables

- a: A :: {"status":"risk"}
- b: B

## Relations

a ++ b: Causal link :: {"confidence":"high"}
`);
  assert.equal(model.nodes[0].fields.status, "risk");
  assert.equal(model.edges[0].fields.confidence, "high");
  const restored = compileLoopMarkdown(serializeLoopMarkdown(model));
  assert.deepEqual(restored.nodes[0].fields, model.nodes[0].fields);
  assert.deepEqual(restored.edges[0].fields, model.edges[0].fields);
});

test("loop markdown reports actionable line errors", () => {
  assert.throws(
    () => compileLoopMarkdown("# Broken\n\n## Relations\nmissing ++ unknown"),
    error => error instanceof LoopLanguageError && error.errors.some(item => item.line === 4)
  );
});

test("loop markdown classifies -- as positive and -+ as negative relations", () => {
  const model = compileLoopMarkdown(`# Dual signs

## Variables

- a: A
- b: B
- c: C

## Relations

a -+ b
b -- c
c ++ a

## Loops

- B1: Dual-sign balance
  edges:
    - a -> b
    - b -> c
    - c -> a
`);
  assert.deepEqual(model.edges.map(edge => `${edge.sourceSign}${edge.targetSign}:${edge.type}`), ["−+:balancing", "−−:reinforcing", "++:reinforcing"]);
  assert.equal(model.loops[0].type, "balancing");
});

test("loop markdown rejects duplicate relations for the same ordered pair", () => {
  assert.throws(
    () => compileLoopMarkdown(`# Duplicates

## Variables

- a: A
- b: B

## Relations

a ++ b
b ++ a
a -- b

## Loops

- R1: Ambiguous
  edges:
    - a -> b
    - b -> a
`),
    error => error instanceof LoopLanguageError
      && error.errors.some(item => item.line === 12 && /Duplicate relation 'a -> b'.*line 10/.test(item.message))
  );
});

test("capitalismo seed loops classify as labelled", () => {
  const model = compileLoopMarkdown(readFileSync(new URL("./hosted/fixtures/capitalismo.loop.md", import.meta.url), "utf8"));
  assert.deepEqual(model.loops.map(loop => `${loop.id}:${loop.type}`), ["R1:reinforcing", "B1:balancing"]);
});

test("loop markdown remains map-only and does not serialize presentation data", () => {
  const source = `# Scenes

## Variables

- a: A

## Relations

`;
  const model = compileLoopMarkdown(source);
  const restored = compileLoopMarkdown(serializeLoopMarkdown(model));
  assert.equal("story" in model, false);
  assert.equal("story" in restored, false);
});

test("loop style compiles settings and filtered rules", () => {
  const style = compileLoopStyle(`
@view "Executive"
@settings {
  background: #f7f3e7;
  label-density: balanced;
}
variable { shape: ellipse; font-size: 14; }
relation[type="balancing"] { stroke-style: dashed; }
`);
  assert.equal(style.title, "Executive");
  assert.equal(style.settings.background, "#f7f3e7");
  assert.equal(style.rules[0].properties["font-size"], 14);
  assert.deepEqual(style.rules[1].selector, { type: "relation", attribute: "type", value: "balancing" });
});

test("loop style round-trips and rejects unknown syntax", () => {
  const first = compileLoopStyle("@view \"A\"\ncanvas { background: #fff; }\n");
  assert.deepEqual(compileLoopStyle(serializeLoopStyle(first)).rules, first.rules);
  assert.throws(() => compileLoopStyle("unknown { color: red; }"), LoopStyleError);
  assert.throws(() => compileLoopStyle('@view "A"\nvariable { unknown-property: nope; }'), LoopStyleError);
});

test("loop style accepts editorial edge and style-pack properties", () => {
  const style = compileLoopStyle(`
@view "Editorial"
@settings {
  style-pack: matcha-executive;
  loop-badges: true;
  show-polarities: false;
}
relation[type="balancing"] {
  line-cap: round;
  line-dash-pattern: 8 5;
  line-outline-width: 1;
  arrow-shape: chevron;
  arrow-fill: hollow;
  arrow-width: match-line;
}
loop[type="reinforcing"] {
  badge-fill: #234;
  badge-color: #fff;
}
`);
  assert.equal(style.settings["style-pack"], "matcha-executive");
  assert.equal(style.settings["show-polarities"], false);
  assert.equal(style.rules[0].properties["arrow-fill"], "hollow");
  assert.equal(style.rules[1].properties["badge-fill"], "#234");
  assert.deepEqual(compileLoopStyle(serializeLoopStyle(style)).rules, style.rules);
});
