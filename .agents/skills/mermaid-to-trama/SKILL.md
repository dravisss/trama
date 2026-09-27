---
name: mermaid-to-trama
description: Use when converting Markdown causal-loop documents with Mermaid diagrams inta Trama models, especially when you need to audit polarities, preserve story continuity, and persist the result into the local SQLite project.
---

# Mermaid Ta Trama

## Overview

Convert a Markdown causal-loop document into a Trama loop model. Treat the job as editorial translation: Mermaid gives structure, but the source narrative decides the polarities, story, and final coherence.

## Read First

Before editing anything in this repo, inspect the project contract:

- `README.md` for the public API and model shape.
- `docs/ARCHITECTURE.md` for module boundaries.
- `docs/EXTENDING.md` for demo and authoring workflows.
- `src/core/model.js` for validation and normalization rules.
- `src/core/loops.js` for loop classification.
- `src/core/story.js` for story structure.
- `src/platform/projectStore.js` for SQLite persistence.

If code and documentation diverge, trust the code and update the docs in the same change.

## Target

Prefer saving the converted loop into the local SQLite project through `ProjectStore` or the app API. Do not hardcode the result into demo fixtures unless the user explicitly asks for an example seed.

Typical shape:

```js
import { ProjectStore } from "./src/platform/projectStore.js";
import { normalizeModel, validateModel } from "./src/core/model.js";

const store = new ProjectStore("data/trama.db");
const existing = store.getLoop(id);
const payload = {
  title: model.title,
  summary: model.description,
  description_md,
  model: normalizeModel(model)
};
const saved = existing
  ? store.updateLoop(id, payload)
  : store.createLoop({ id, ...payload });
store.close();
```

## Source Material

From the Markdown file, extract:

- title/frontmatter for `id`, `title`, and `summary`;
- the main Mermaid `graph TD` block for nodes and edges;
- the question, system story, and phenomenon for `description_md`;
- loop sections and causal explanations for loop candidates;
- evidence and provenance only as reading support.

Never map provenance into `edge.description`. Never create variable tables in the model.

## Field Mapping

- Mermaid node label -> `node.label`.
- Stable slug -> `node.id`.
- Mermaid edge -> `model.edges[]`.
- Relation legend -> `edge.description`.
- Essential story content -> `description_md`.
- Guided presentation -> `model.story.steps[]`.
- Valid directed cycles -> `model.loops[]`.

`edge.description` should be a clean causal sentence, not evidence or commentary.

`description_md` should contain the loop's own story material: title, question, core story, and central phenomenon.

## Polarity Rule

Choose `sourceSign` and `targetSign` from the real causal story, not by copying Mermaid labels mechanically.

Use this convention:

```text
source ↑, target ↑ => ++
source ↑, target ↓ => +-
source ↓, target ↑ => -+
source ↓, target ↓ => --
```

Equal signs (`++`, `--`) are same-direction links and count as positive; different signs (`+-`, `-+`) are opposite-direction links and count as negative. `relationPolarity()` and `classifyLoop()` implement exactly this rule: a loop is reinforcing when it has an even number of opposite-direction links and balancing when the number is odd.

Mermaid labels are only clues:

- `Aumenta` means same direction, which can be `++` or `--`.
- `Reduz` means opposite direction, which can be `+-` or `-+`.

Pick the pair that best matches the system behavior being described.

## Continuity Audit

Every curated loop should read as a coherent chain of movements. The target sign of one relation should normally become the source sign of the next relation.

Good:

```text
Reforco do atalho ↑ -> Uso do rito formal ↓       (+-)
Uso do rito formal ↓ -> Feedback e melhoria ↓     (--)
Feedback e melhoria ↓ -> Capacidade do rito ↓     (--)
Capacidade do rito ↓ -> Gap urgencia/rito ↑       (-+)
```

Bad for that story:

```text
Uso do rito formal -> Feedback e melhoria         (++)
Feedback e melhoria -> Capacidade do rito         (++)
Capacidade do rito -> Gap urgencia/rito           (+-)
```

Those signs may be mathematically valid, but they do not tell the intended erosion story.

## Loop Curation

Add an item to `model.loops` only when:

- `edgeIds` form an ordered directed cycle;
- no edge repeats;
- `validateModel(model)` accepts it;
- `classifyLoop()` derives the intended type;
- the sign sequence passes continuity audit.

If a named source loop does not form a valid Trama cycle, represent it in `model.story.steps` instead.

If coherent polarities imply a different R/B type from the source text, use the coherent derived type.

## Writing Text

Write `edge.description` like this:

```text
Quando a legitimidade percebida do rito cai, o uso do rito formal tambem cai.
```

Avoid:

```text
Evidencia: ...
Fulano disse...
Nota editorial...
No contrato da Trama...
```

Write `description_md` from the original loop's essential story:

- title;
- question answered by the loop;
- system story;
- central phenomenon;
- short reading guide if useful.

Do not include conversion notes, source conflicts, or implementation notes.

## Story Mode

Build `model.story.steps` as a guided presentation. A practical order is:

1. Triggering condition.
2. Structural gap.
3. Behavioral choice.
4. Central loop.
5. Secondary loops.
6. Synthesis.

Each step should focus on one existing element:

```js
focus: { edgeId: "..." }
focus: { nodeId: "..." }
focus: { loopId: "..." }
```

Use edge focus for local causal moves, loop focus for complete cycles, and node focus for key variables.

## Validation

Run:

```bash
npm test
npm run check
npm run serve
```

Verify:

- all Mermaid nodes are represented;
- all intended Mermaid edges are represented;
- every edge has a clean causal legend;
- no provenance or conversion note appears in `edge.description`;
- no conversion note appears in `description_md`;
- every story focus references an existing element;
- every curated loop is valid and has the intended type;
- the saved loop is visible in the local project.

If the demo is available, open it and confirm the converted loop renders cleanly with the expected polarities and story progression.

## What Not To Do

- Do not mix source provenance into model text.
- Do not invent variables that are not in the source material.
- Do not let the story become a transcript of the conversion process.
- Do not edit `dist/` or `reference.html`.
- Do not bypass validation when a model change is involved.
