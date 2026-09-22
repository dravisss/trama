# Agent Implementation Brief

This is the document a fresh implementation agent should read after the architecture and product spec.

Its job is to translate product direction into safe execution inside this repo.

## Mission

Turn Trama from a strong demo/editor prototype into a real local-first loop authoring environment with:

- Kumu-grade editing ergonomics;
- Trama-native causal semantics;
- local SQLite project persistence;
- embeddable standalone HTML exports;
- a mermaid-like markdown authoring path;
- a simplified CSS-like styling path.

## Non-Negotiable Constraints

For any work on automatic node placement, curve routing, route quality, scale behavior, or layout
QA, read `docs/LAYOUT_ROUTING_ENGINE_V2_PLAN.md` before editing the engine. It defines the current
failure inventory, implementation sequence, quality gates, and definition of done.

### 1. Preserve the routing core

Do not replace or discard:

- `src/routing/optimizer.js`
- `src/annotations/renderer.js`
- the curved-edge routing assumptions in `src/CLDEngine.js`

The product should be built around this routing stack, not by flattening it into a generic graph editor.

### 2. Preserve local-first standalone export

Do not regress:

- `src/export/standalone.js`
- `src/standalone.js`
- current loop/project HTML export flows in `src/app.js`

The target product must still export:

- standalone local HTML;
- embeddable HTML packages;
- project-level standalone output.

### 3. Preserve Matcha as the default visual identity

The current visual language is anchored in:

- `src/themes/matcha.js`

Do not replace it with generic SaaS defaults.

Acceptable evolution:

- refine spacing;
- improve typography while staying compatible with the current palette and tone;
- add tokens and component states;
- keep the warm Matcha direction.

### 4. Respect the separation of concerns

The project is already structured well.

Keep these boundaries:

- domain logic in `src/core/`
- geometry in `src/geometry/`
- routing in `src/routing/`
- annotations in `src/annotations/`
- rendering adaptation in `src/rendering/`
- app/editor shell in `src/app.js` or future app modules
- persistence in `src/platform/`

## Key Existing Assets

### Product assets

- `docs/KUMU_BENCHMARK_AND_PRODUCT_SPEC.md`
- `docs/LOOP_LANGUAGE_SPEC.md`

### Code assets

- `src/CLDEngine.js`
- `src/rendering/cytoscape.js`
- `src/routing/optimizer.js`
- `src/annotations/renderer.js`
- `src/platform/projectStore.js`
- `src/export/standalone.js`
- `src/language/presentationMarkdown.js` and the Presentation Markdown workflow

## Big Architectural Truth

The current project is already good at:

- rendering loops;
- routing curved relations;
- placing polarity annotations;
- persisting local loop JSON;
- exporting standalone HTML.

The project is still weak at:

- incremental editing;
- professional editor shell structure;
- view/style architecture;
- project/map/view/presentation persistence model;
- text-first loop authoring;
- GUI-to-text round-tripping.

That means:

- build around the current strengths;
- do not restart from scratch;
- refactor the shell and persistence model before piling on feature UI.

## Fresh-Agent Reading Order

1. `AGENTS.md`
2. `README.md`
3. `docs/ARCHITECTURE.md`
4. `docs/EXTENDING.md`
5. `docs/KUMU_BENCHMARK_AND_PRODUCT_SPEC.md`
6. `docs/LOOP_LANGUAGE_SPEC.md`
8. this file

## Implementation Phases

## Phase 1: App Shell And Persistence Refactor

Goal:

- introduce the real product skeleton without breaking the engine.

Tasks:

- evolve persistence from `project + loops` to `project + maps + views + presentations + assets`;
- split current `src/app.js` responsibilities into smaller app modules;
- establish left sidebar, right utility rail, right editor panel, and settings surface architecture;
- keep current demo usable during the refactor.

Acceptance:

- project opens locally;
- current loop editing still works;
- no regression in standalone export;
- shell architecture can host future view/style/story panels cleanly.

## Phase 2: Incremental Editing

Goal:

- remove the “full graph recreation for common edits” bottleneck.

Tasks:

- stop using full `setModel()` teardown for ordinary node/edge label/property changes where possible;
- add incremental mutation pathways;
- preserve route recompute correctness on commit;
- keep drag fluid while deferring heavy work.

Acceptance:

- editing a label or metadata field does not rebuild the whole graph;
- dragging feels immediate;
- final route quality remains consistent.

## Phase 3: Sidebar And Editor Experience

Goal:

- reproduce Kumu-grade editing ergonomics in Trama’s own language.

Tasks:

- implement contextual left sidebar states;
- implement multi-selection editing;
- implement right utility rail and right Basic View Editor;
- add direct object toolbar affordances;
- replace prompt-style flows with proper panels/dialogs.

Acceptance:

- selected variable/relation/loop always has a clear editing home;
- batch edits are possible;
- view editing no longer feels buried or improvised.

## Phase 4: View System

Goal:

- move style and filtering out of hardcoded renderer logic into authored view state.

Tasks:

- add `project -> map -> view`;
- add Basic Editor operations such as color by, shape by, filter, highlight, legend behavior;
- add rules inventory;
- keep view state exportable to standalone HTML.

Acceptance:

- one map can have multiple views without duplicating the graph;
- views preserve authored controls and styles in export.

## Phase 5: Loop Language

Goal:

- enable mermaid-like text-first loop authoring.

Tasks:

- implement `.loop.md` parser and validator;
- compile to current model shape;
- support loop curation and story steps;
- support import/export round-trip.

Acceptance:

- a fresh `.loop.md` file can produce a valid visual loop;
- parse errors are readable;
- exported text remains stable enough for version control.

## Phase 6: CSS-Like Style Language

Goal:

- add the text counterpart to the Basic View Editor.

Tasks:

- implement a small selector/property language;
- map it onto view defaults and style rules;
- surface parser errors in-editor;
- keep precedence deterministic.

Acceptance:

- users can write style rules that affect variables, relations, loops, and canvas;
- GUI and text editing can coexist without hidden conflicts.

## Phase 7: Presentation And Export System

Goal:

- expand current story mode into a real presentation system while preserving standalone export.

Tasks:

- move from simple story steps to scenes/slides;
- support title, map, text, and image scenes;
- persist camera and reveal state;
- package all assets into local standalone output.

Acceptance:

- presentation can run entirely from local exported HTML;
- embeds remain possible without a server dependency.

## Matcha Design Rules

Keep and extend:

- warm neutral surfaces;
- subdued greens and earthy accents;
- high readability over glossy novelty;
- editorial feel over dashboard feel.

Avoid:

- purple startup gradients;
- generic dark-mode-first defaults;
- overcompressed dense panels with no breathing room;
- purely utilitarian enterprise UI styling.

## Redesign Shell Rules

The current application shell is intentionally layered over the existing engine rather than
rewriting the demo in place:

- `body.redesigned-ui` scopes the Matcha visual layer so standalone and embed surfaces keep their
  compatibility styles;
- `Mapa`, `Explorar`, `Story Studio` and `Apresentar` are workspace modes, not separate data models;
- mode-specific surfaces must consume the canonical model, presentation, and SQLite/API callbacks;
- contextual panels belong in small controllers under `src/app/` (for example,
  `src/app/explorePanel.js`) instead of adding more rendering branches to the engine;
- Markdown authoring must expose explicit `draft`, `preview`, `discard`, and `apply` states;
  preview must never call persistence APIs;
- every new mode needs a browser smoke path that enters it, exercises one real action, and returns to
  `Mapa` without leaving stale body classes or hidden panels in the grid.

## Sidebar Rules

### Left editor sidebar

Must support:

- overview when nothing is selected;
- profile editing when something is selected;
- multi-selection editing;
- story/view/data tabs as needed.

### Right rail and right panel

Must support:

- zoom and canvas utilities in the thin rail;
- view/style/routing controls in the expanded panel;
- future bridge to CSS-like DSL.

### Settings surface

Must support:

- exports;
- presentations;
- fields/schema;
- assets;
- backups/restore;
- project metadata.

## Mermaid-Like Language Rules

The product must explicitly support a text-first authoring path.

This is not optional and should not be deprioritized into a future “maybe”.

Expected sources:

- Mermaid import as compatibility bridge;
- native `.loop.md` as primary long-term format.

## Testing Rules

After each substantial change, run:

```bash
rtk npm test
rtk npm run build
rtk npm run check
```

Add tests for:

- parser and validation logic;
- persistence migrations;
- export behavior;
- any refactor that changes route/state serialization.

## What A Fresh Agent Should Not Do

- do not replace the engine with a new renderer stack;
- do not regress standalone exports;
- do not hardcode all new UI inside one giant file again;
- do not introduce cloud-first assumptions;
- do not break the Matcha baseline unless explicitly asked.

## Definition Of A Good First Delivery

A good first major implementation pass should deliver:

- a cleaner app shell;
- better sidebars;
- persistence evolution;
- incremental editing groundwork;
- v1 loop markdown import/export scaffolding;
- no regression in current export and routing strengths.

It does not need to deliver the final perfect DSL, every panel, and every presentation feature at once.
## Workflow de imagens nos nós

Agentes que produzirem imagens para diagramas devem usar `.agents/skills/node-images-for-trama/SKILL.md`. O fluxo lê o mapa canônico, gera/revisa um lote, importa assets com SHA-256, anexa apenas `node.media`, executa `npm run check` e verifica editor/standalone no navegador. Não gerar imagens no app, não inventar IDs, não inserir proveniência em texto causal e não mover polaridades para acomodar o label.
