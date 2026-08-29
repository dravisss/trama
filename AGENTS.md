# LoopViewer Agent Guide

This file explains the project at a glance and shows how an agent should create causal-loop maps and their presentations from Markdown. The detailed Mermaid conversion skill lives in `.agents/skills/mermaid-to-loopviewer/SKILL.md`.

## What LoopViewer Is

LoopViewer is a reusable front-end engine for interactive causal loop diagrams.

The main public contract is `CLD.createCLD()`. The engine is built so that each concern stays separate:

- domain model;
- geometry;
- routing;
- annotations;
- rendering;
- application UI.

The product is not just the application shell. The reusable engine is the core deliverable.

## Main Project Areas

- `src/core/` holds the domain model, loops, and story helpers.
- `src/geometry/` holds pure math and should not touch the DOM.
- `src/routing/` computes routes and curve distances.
- `src/annotations/` places polarities and handles semantic zoom.
- `src/rendering/` adapts the model to Cytoscape.
- `src/app/` and `src/app.js` contain the local-first application shell.
- `src/platform/` contains local project storage and SQLite integration.
- `dist/` is generated output and should not be edited by hand.
- `reference.html` is the frozen visual reference and should normally stay untouched.

## Working Rules

- Keep domain logic out of render code.
- Keep geometry pure when possible.
- Preserve the existing visual and routing invariants.
- Use the README and architecture docs as the source of truth for public behavior.
- If docs and code disagree, trust the code and update the docs in the same work.

## Useful Commands

```bash
npm install
npm test
npm run build
npm run check
npm run serve
```

`npm run check` should be run after code changes.

## Agent Workflow: Map Markdown + Presentation Markdown

When an agent receives a causal-loop description, treat the map and the narrative as two related but separate authored artifacts:

- map Markdown defines variables, signed relations, descriptions, and curated cycles;
- presentation Markdown defines scenes, beats, copy, and the map elements highlighted at each moment;
- the official narrative entity is the persisted `Presentation`; do not create or revive `model.story`;
- every presentation scene must reference the real map with `mapRef: { mapId: loop.id }`.

### Understand the source first

Before writing either artifact, identify the phenomenon, the question the map answers, the variables, the direction of each influence, the candidate cycles, and the causal trajectory a reader should follow. Write that trajectory in plain language before copying labels into Mermaid. Include the point where a local response creates a system-level consequence.

### Create the map Markdown

Use `seeds/<slug>.loop.md` with a Mermaid `graph TD` block and the map's essential description. Give every variable a stable slug and every relation a stable edge id. The resulting model maps as follows:

- Mermaid node label -> `node.label`;
- stable slug -> `node.id`;
- explicit relation id -> `edge.id`;
- causal explanation -> `edge.description`;
- question, system story, and phenomenon -> `description_md`;
- valid directed cycles -> `model.loops`.

`edge.description` must be a clean causal sentence. `description_md` must contain the loop's own story. Never put evidence, provenance, conversion notes, or agent commentary in either field.

### Audit signs and cycles

Assign `sourceSign` and `targetSign` from the meaning of the causal sentence, not mechanically from labels such as `Aumenta` or `Reduz`:

```text
source ↑, target ↑ => ++
source ↑, target ↓ => +-
source ↓, target ↑ => -+
source ↓, target ↓ => --
```

For every curated loop, verify that edge ids form an ordered directed cycle, no edge repeats, adjacent signs support the intended movement, `validateModel(model)` accepts it, and `classifyLoop()` derives the intended reinforcing/balancing type. If a source section describes an important connection that is not a valid directed cycle, keep it as a presentation beat instead of forcing it into `model.loops`.

### Create the presentation Markdown

Use a separate `seeds/<slug>.story.md`. The presentation should tell one causal story, not list every edge. A reliable trajectory is: triggering condition; structural accumulation or gap; behavioral response; immediate relief or consequence; feedback that reinforces the original condition; secondary loop or deterioration; synthesis.

Use scenes for narrative turns and beats for individual causal moves:

```markdown
# Sobrecarga de Filas

Resumo da história em um parágrafo.

## Cena: A fila deixa de ser um problema isolado
focus: path e01, e08, e09

### O backlog cresce
focus: node BLD

O backlog concentra demandas que disputam a mesma capacidade.

### O backlog produz handoffs
focus: edge e08

Quando o backlog cresce, cada demanda atravessa mais áreas.

## Cena: A carteirada aparece como alívio
focus: set edge:e05, edge:e17, node:CAR

### O atalho reduz uma espera
focus: edge <exact-edge-id>

Para uma demanda específica, a exceção pode reduzir o tempo de ciclo.

## Cena: O alívio alimenta o problema
focus: loop r3

### O ciclo se fecha
focus: loop r3

O alívio individual amplia o canal paralelo e reforça a necessidade de novos atalhos.
```

Focus syntax must reference real map elements: `node <id>`, `edge <id>`, `loop <id>`, `path e1, e2, e3` for an ordered connected path, or `set node:X, edge:e1, loop:r1` for a deliberate composite focus. Prefer `edge` for local transitions, `path` for a continuous chain, `loop` for a complete feedback structure, and `set` for a scene-level overview. Never invent ids or use a disconnected path.

Each beat must explain the movement being highlighted and its consequence. Do not repeat the same sentence for every beat or narrate implementation metadata.

### Compile, persist, and verify

Compile with `compilePresentationMarkdown()`, normalize with `normalizePresentation()`, attach `mapRef` to every scene, then validate with `compilePresentation()` and `lintPresentation()` against the real map before saving through `ProjectStore`. Update the existing presentation for that map instead of creating duplicates, and preserve the Markdown source in the presentation record.

Run `npm test` and `npm run check`. With `npm run serve`, verify that the target map loads, `Apresentar` opens with the expected beat count, playback follows the causal trajectory, every focus highlights an existing element, the final beat explains the system feedback, and there are no console errors. If playback is incoherent, revise the presentation Markdown and causal ordering before changing the renderer.

### Camera contract

The persisted Presentation V2 camera contract is authoritative. Every scene must
declare a real map reference and an explicit camera intent whenever it has a
semantic focus:

- `fit-map` for the whole map or an intentional orientation/synthesis scene;
- `fit-focus` for a node, edge, loop, or focused semantic set;
- `follow-path` for an ordered causal path;
- `fit-set` for a deliberate composite set;
- `fixed` only for a captured zoom/pan viewport;
- `split` for a comparison composition.

Do not write `mode: focus`, implicit fit-map defaults, `model.story`, or a
parallel presentation step format. Existing records were migrated with
`node scripts/migrate-presentations-camera-v2.mjs data/loopviewer.db`; new
presentations must be authored directly in V2 and validated before persistence.
The editor and standalone player both resolve camera targets through
`src/presentation/camera.js`.

For a reusable authored loop, leave `seeds/<slug>.loop.md`, `seeds/<slug>.story.md`, and a small seed/update script when persistence is repeatable. Do not add `model.story`, maintain a parallel legacy narrative, or edit `dist/` and `reference.html` by hand.

## Mermaid To LoopViewer Skill

Path:

- `.agents/skills/mermaid-to-loopviewer/SKILL.md`

Use this skill when the input is a Markdown file with a Mermaid causal-loop diagram and you want to turn it into a LoopViewer model.

### When To Use It

- A Mermaid diagram needs to become a persisted LoopViewer loop.
- You need to audit causal polarities instead of copying labels literally.
- You want a clean `description_md`, `edge.description`, and Presentation mapping.
- You want the result saved into the local SQLite-backed project.

### Practical Workflow

1. Read the source story and the Mermaid `graph TD` block.
2. Map nodes, edges, and stable IDs into the LoopViewer model.
3. Audit signs for causality and continuity.
4. Curate only the loops that read as valid directed cycles.
5. Write a separate presentation Markdown with a coherent causal trajectory.
6. Compile, lint, and persist the Presentation against the real map.
7. Run `npm test`, `npm run build`, and `npm run check`.
8. Open the application and confirm the map and presentation render cleanly.

### What The Skill Protects

- It keeps provenance out of model text.
- It keeps loop polarity based on meaning, not string matching.
- It keeps the Presentation readable and connected to real model elements.
- It avoids dumping conversion notes into the final loop.

## Public API Snapshot

The most important entry points exported from `src/index.js` are:

- `CLD.createCLD()`
- `CLD.validateModel()`
- `CLD.discoverLoops()`
- `CLD.classifyLoop()`
- `CLD.compilePresentation()`
- `CLD.PresentationController`
- `CLD.suggestPresentation()`
- `CLD.lintPresentation()`
- `CLD.applyLintFixes()`
- `CLD.compilePresentationMarkdown()` / `CLD.serializePresentationMarkdown()`
- `CLD.compilePresentationExport()`
- `CLD.measurePresentationPerformance()`
- `CLD.matchaTheme`

That API is what external consumers should rely on.

## If You Are Editing The Project

Before changing the algorithm or model shape, check:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/EXTENDING.md`

Before touching the application shell or persistence, check:

- `src/app.js`
- `src/platform/projectStore.js`

This keeps the engine, application shell, and local project storage aligned.

## Extended Planning Docs

If the task is to evolve LoopViewer beyond the current demo into the intended product, read:

- `docs/KUMU_BENCHMARK_AND_PRODUCT_SPEC.md`
- `docs/STORY_MODE_V2_PRODUCT_AND_IMPLEMENTATION_SPEC.md`
- `docs/LOOP_LANGUAGE_SPEC.md`
- `docs/AGENT_IMPLEMENTATION_BRIEF.md`
- `docs/LAYOUT_ROUTING_ENGINE_V2_PLAN.md`
- `docs/SPEC_READINESS_GAPS.md`

These documents define the Kumu benchmark, the Story Mode V2 product and execution plan, the local
research corpus, the loop-language direction, the implementation phases, the Matcha design
continuity, and the deliberate differences from Kumu such as local-first standalone HTML export.
