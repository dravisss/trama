# Trama: Kumu Benchmark, Documentation Inventory, and Product Spec

## Purpose

This document turns the Kumu benchmark into a product blueprint for Trama.

It has three goals:

1. Inventory the Kumu documentation that matters for the product direction we want.
2. Translate Kumu's UX and interaction patterns into reusable product principles.
3. Define a spec-driven target for Trama as a local-first causal loop authoring tool.

## Research boundary

The private benchmarking corpus used during early product research is intentionally not
distributed with the open-source application. This document preserves only product decisions and
does not serve as a mirror of Kumu documentation or assets.

This document does **not** propose replacing the current Trama routing and curve system.
The existing layout, curve, and annotation logic is a core strategic asset. The goal is to
preserve it, expose it better, and refine it incrementally.

## Foundational Constraint

The current Trama automatic positioning and curved-edge routing stack is one of the hardest
won parts of the project. It must be treated as a protected subsystem.

Protected assets:

- automatic layout and density profiling;
- curve routing and crossing minimization;
- anchored polarity placement;
- semantic zoom behavior;
- persistent manual route overrides.

Implication:

- We are not cloning Kumu's underlying rendering or layout model.
- We are cloning the **authoring experience**, **information architecture**, and **interaction
  patterns** around a stronger loop-specific engine.

## Current Trama Strengths To Preserve

- Clear separation between domain, geometry, routing, annotations, rendering, and demo.
- Local-first SQLite-backed persistence.
- Standalone export for sharing.
- Story mode as data, not UI-only state.
- Editable manual route overrides.
- Strong validation for nodes, edges, loops, and story references.

Relevant local implementation anchors:

- `src/core/model.js`
- `src/core/loops.js`
- `src/presentation/controller.js`
- `src/core/density.js`
- `src/routing/optimizer.js`
- `src/annotations/renderer.js`
- `src/rendering/cytoscape.js`
- `src/platform/projectStore.js`

## Part 1: Kumu Documentation Inventory

The following Kumu docs are the most relevant for reproducing the product feel. Most of these
pages include screenshots, UI examples, or step-by-step illustrated workflows.

### A. Architecture and Interface Model

1. Kumu's architecture
   Link: <https://docs.kumu.io/overview/kumus-architecture>
   Why it matters:
   Defines the product's core mental model: elements, connections, loops, fields, projects,
   maps, and views.

2. User interfaces
   Link: <https://docs.kumu.io/overview/user-interfaces>
   Why it matters:
   High-level entrypoint to the different authoring surfaces.

3. Map editor
   Link: <https://docs.kumu.io/overview/user-interfaces/map-editor>
   Why it matters:
   Describes the top toolbar, map switching, view switching, and authoring context.

4. View editors
   Link: <https://docs.kumu.io/overview/user-interfaces/view-editors>
   Why it matters:
   Explains the split between Basic Editor and Advanced Editor and shows major style/filter
   workflows.

5. Settings
   Link: <https://docs.kumu.io/overview/user-interfaces/settings>
   Why it matters:
   Shows how project-level administration, fields, members, embeds, and trash are grouped.

### B. Data Model and Editing Substrate

6. Profiles
   Link: <https://docs.kumu.io/guides/profiles>
   Why it matters:
   Profiles are the narrative/data substrate behind each element, connection, and loop.

7. Fields
   Link: <https://docs.kumu.io/guides/fields>
   Why it matters:
   Defines schema authoring for project data, including prompts, field types, ordering, and
   relevance.

8. Table
   Link: <https://docs.kumu.io/guides/table>
   Why it matters:
   Shows the tabular editing mode and reinforces that editing is autosaved and profile-driven.

9. Import
   Link: <https://docs.kumu.io/guides/import>
   Why it matters:
   Explains how external data enters the system.

10. Structure your data for Kumu
    Link: <https://docs.kumu.io/guides/import/import>
    Why it matters:
    Shows how Kumu thinks about normalized data, entities, and relationships.

### C. Styling and Authoring Logic

11. Decorations
    Link: <https://docs.kumu.io/guides/decorate>
    Why it matters:
    Top-level explanation of visual semantics.

12. Direct decorations
    Link: <https://docs.kumu.io/guides/decorate/direct-decorations>
    Why it matters:
    Core to the "touch the object and edit it" feel.

13. Data-driven decorations
    Link: <https://docs.kumu.io/guides/decorate/data-driven-decorations>
    Why it matters:
    Encodes the rule-based style system that scales as maps grow.

14. Popovers
    Link: <https://docs.kumu.io/guides/decorate/popovers>
    Why it matters:
    Reveals Kumu's layered information disclosure model.

15. Shapes
    Link: <https://docs.kumu.io/guides/shapes>
    Why it matters:
    Useful for designing a simplified but flexible Trama shape system.

16. Default view settings
    Link: <https://docs.kumu.io/guides/default-view-settings>
    Why it matters:
    Shows that defaults are part of the view language, not just ad hoc UI state.

17. Advanced Editor hub
    Link: <https://docs.kumu.io/overview/advanced-editor-hub>
    Why it matters:
    Central entrypoint to Kumu's CSS-like language.

18. @settings reference
    Link: <https://docs.kumu.io/overview/advanced-editor-hub/settings-reference>
    Why it matters:
    Demonstrates the breadth of view-level configuration and the idea of a map-level styling DSL.

19. @controls reference
    Link: <https://docs.kumu.io/overview/advanced-editor-hub/controls-reference>
    Why it matters:
    Shows that controls are authored, not hardcoded.

20. Property reference
    Link: <https://docs.kumu.io/overview/advanced-editor-hub/property-reference>
    Why it matters:
    Defines the full design vocabulary behind Kumu's style system.

### D. Interaction and Reader Experience

21. Controls
    Link: <https://docs.kumu.io/guides/controls>
    Why it matters:
    Controls are one of Kumu's biggest differentiators for exploration and presentation.

22. Filter control
    Link: <https://docs.kumu.io/guides/controls/filter-control>
    Why it matters:
    Shows the pattern for reader-side filtering with author-defined control surfaces.

23. Showcase
    Link: <https://docs.kumu.io/guides/showcase>
    Why it matters:
    Important because showcase is a softer, more editorial alternative to filtering.

24. Showcase control
    Link: <https://docs.kumu.io/guides/controls/showcase-control>
    Why it matters:
    Reinforces the control-builder pattern.

25. Views
    Link: <https://docs.kumu.io/guides/views>
    Why it matters:
    Shows how multiple visual interpretations sit on top of the same data.

26. Imported views
    Link: <https://docs.kumu.io/guides/imported-views>
    Why it matters:
    Important for reusable style systems and base/variant composition.

27. Partial views
    Link: <https://docs.kumu.io/guides/partial-views>
    Why it matters:
    Useful for designing stateful storytelling and view toggles in Trama.

### E. Presentation and Distribution

28. Presentations
    Link: <https://docs.kumu.io/guides/presentations>
    Why it matters:
    Confirms that presentation is a first-class authored output, not a separate export hack.

## Inventory Summary

What the Kumu docs make unusually clear:

- Kumu is built around a stable data core and many views.
- Profiles and fields are first-class authoring primitives.
- Visual styling is rule-based and can be data-driven.
- Controls are authored as part of the view.
- Presentation is a product surface, not just a share action.
- Many important product concepts are illustrated with screenshots and configuration examples.

## Part 2: UX Benchmark

### 1. Kumu's Core Product Pattern

Kumu separates authoring into three conceptual layers:

- **Data layer**: elements, connections, loops, fields, profiles.
- **Map layer**: composition, included items, positions.
- **View layer**: visibility, style, filtering, interaction rules, reader controls.

This is the single most important structural pattern to adopt.

### 2. Why Kumu Feels So Good To Edit

Kumu reduces friction through progressive disclosure:

- simple actions are direct and local;
- complex actions are available without leaving the current context;
- advanced customization exists, but only when needed.

The editor feels powerful because it supports both:

- immediate object manipulation;
- system-wide rule authoring.

### 3. Benchmark Findings By Area

#### 3.1 Navigation and IA

Kumu's top-level IA is extremely clean:

- workspace/project context is stable;
- map selection and view selection are always near the project title;
- editing context is clear from the current map + current view;
- settings are grouped by administrative scope.

Implication for Trama:

- the current `project -> active loop` model is too shallow;
- we need at least `project -> map -> view`.

#### 3.2 Editing Model

Kumu supports two complementary editing modes:

- direct decoration and contextual editing on the object;
- rule-based editing via Basic/Advanced Editor.

Implication for Trama:

- editing cannot stay toolbar-only;
- each node, relation, and loop needs contextual quick-edit affordances;
- a side inspector must coexist with in-canvas editing.

#### 3.3 Information Disclosure

Kumu layers information:

- map marks give the overview;
- popovers give lightweight context;
- profiles give the full narrative/data record;
- table view gives bulk editing.

Implication for Trama:

- a node/relation/loop needs both a short hover form and a full profile;
- the current sidebar should evolve into a real inspector/profile panel;
- a table/grid editing surface is important for scale.

#### 3.4 Styling System

Kumu's strongest differentiator is not just "many style options". It is the authorable style
system:

- defaults live in the view;
- direct overrides exist;
- data-driven rules scale;
- advanced users can express styling declaratively.

Implication for Trama:

- style cannot remain hardcoded in the Cytoscape style function;
- we need a first-class visual language and a simplified CSS-like DSL.

#### 3.5 Controls and Reader Experience

Kumu turns reader interaction into authored interface:

- filter;
- showcase;
- toggles;
- buttons;
- text;
- metrics overlays;
- partial view switching.

Implication for Trama:

- view-level controls should be part of authored output;
- standalone exports should preserve these controls;
- "presentation" and "exploration" should both be configurable modes.

#### 3.6 Presentation

Kumu presentations are not just guided zoom steps. They are structured outputs with slide types.

Implication for Trama:

- the current story model is a strong start, but too narrow;
- we need richer presentation primitives: title, map step, text step, image step, camera state,
  reveal state, autoplay, and pacing.

### 4. What We Should Copy Closely

- `project / map / view` structure;
- Basic Editor + Advanced Editor split;
- direct decorations / contextual toolbars;
- profile-first authoring;
- control builder concept;
- imported/base views pattern;
- presentation as a top-level product capability.

### 5. What We Should Adapt Rather Than Copy

- generic network semantics should become causal-loop semantics;
- Kumu's flexible everything-data-model should be narrowed where Trama benefits from stronger
  causal constraints;
- loop polarity, edge signs, route geometry, and story logic should remain domain-native to
  Trama.

### 6. What Trama Can Potentially Do Better Than Kumu

- better causal loop semantics and validation;
- stronger automatic routing for curved causal edges;
- polarity-aware annotations as a first-class visual primitive;
- story mode tightly bound to causal explanations;
- simpler local-first workflow for solo authors;
- cleaner markdown-based authoring for systems practitioners.

## Part 3: Product Spec

## Product Vision

Trama should become a local-first causal loop authoring environment that combines:

- the authoring fluency and view architecture of Kumu;
- a simpler, loop-native markdown syntax with mermaid-like brevity;
- a simplified CSS-like visual language;
- a strong automatic curve routing engine for causal diagrams;
- polished standalone exports for embedding and presentation.

## Product Thesis

Users do not just want to *view* loops.

They want to:

- build them quickly;
- explain them clearly;
- style them intentionally;
- present them convincingly;
- organize them locally as a portfolio of systems thinking work.

## Non-Negotiable Product Principles

1. Local-first by default.
2. Single-author optimized.
3. Strong causal semantics.
4. Preserve and evolve the current routing/layout engine.
5. Separate data, map composition, and visual views.
6. Progressive disclosure from novice to advanced author.
7. Export should not require the Trama app to remain running.
8. Standalone embeddable HTML export remains a first-class deliverable.

## Non-Goals

- multi-user real-time collaboration in the first major product version;
- generic network analysis feature parity with Kumu;
- replacing the routing engine with a generic third-party layout;
- heavy cloud dependency.

## Deliberate Differences From Kumu

We are using Kumu as a benchmark for editing architecture and UX quality, not as a product identity
to copy wholesale.

Trama should intentionally diverge in the following ways:

### 1. Standalone HTML export is a primary output

Kumu leans heavily on hosted URLs, publish flows, and remote embeds.

Trama should keep the current direction:

- export a loop or project as standalone HTML;
- support embeddable local packages;
- support offline preview;
- avoid requiring a hosted publish step for normal use.

### 2. Trama is loop-native, not generic-network-first

Kumu must serve many kinds of relational maps.

Trama should stay narrower and better:

- variable, relation, and loop are the semantic center;
- polarity, delay, balancing, reinforcing, and story explanation should be first-class;
- UI vocabulary should prefer causal clarity over general graph flexibility.

### 3. Local-first solo workflow matters more than workspace/platform features

Kumu includes many collaboration and hosted-platform patterns.

Trama should bias toward:

- one-person editing;
- reliable local saves;
- local assets;
- local project archives;
- fast reopen into the exact previous state.

### 4. The current routing engine is a strategic advantage

We are not trying to reproduce Kumu’s layout internals.

We are deliberately building a Kumu-like authoring experience around a different technical core:

- stronger curved-edge routing;
- polarity-aware annotations;
- better preservation of loop legibility during editing.

## Primary JTBD

### JTBD 1: Author a causal loop quickly

When I am thinking through a system,
I want to sketch variables and relationships fluidly in canvas form or in a mermaid-like text form,
so that I can externalize the system before I lose the insight.

### JTBD 2: Refine structure without fighting layout

When the map grows,
I want the system to keep the diagram legible automatically,
so that I can stay focused on causal logic rather than manual cleanup.

### JTBD 3: Explain the loop clearly

When I share an analysis,
I want each variable, relationship, loop, and story step to carry narrative context,
so that another person can understand the logic and not just the picture.

### JTBD 4: Create multiple editorial views

When I need different readings of the same model,
I want to create multiple views with different filters, emphasis, and styling,
so that I can adapt one system model to different audiences and purposes.

### JTBD 5: Style the diagram intentionally

When I want the map to look polished,
I want simple controls for common styling and a deeper CSS-like language for advanced cases,
so that I can move from default output to publication-quality output.

### JTBD 6: Present the model as a guided narrative

When I need to teach or persuade,
I want to build a storyboard or presentation on top of the model,
so that the audience experiences the loop in a sequence that makes sense.

### JTBD 7: Trust local persistence

When I work on a project over days or weeks,
I want my project, versions, views, and presentation assets to save reliably on my machine,
so that I can return without fear of losing work.

## Primary Personas

### Persona A: Systems thinker / consultant

Needs:

- speed of authoring;
- strong narrative support;
- presentable exports;
- multiple audience-specific views.

### Persona B: Researcher / analyst

Needs:

- semantic rigor;
- structured fields;
- import/export;
- searchable project archive;
- repeatable style/view rules.

### Persona C: Solo product strategist / operator

Needs:

- local-first convenience;
- lightweight setup;
- crisp diagrams;
- embed-ready outputs.

## Core User Stories

### Project and Navigation

- As an author, I can create a project that contains multiple maps.
- As an author, I can create multiple views per map.
- As an author, I can duplicate a view to explore an alternative reading.
- As an author, I can switch between maps and views without losing context.

### Canvas Editing

- As an author, I can add variables directly from the canvas.
- As an author, I can connect two variables with a causal relation in one fluid gesture.
- As an author, I can drag variables smoothly without waiting on expensive recalculation on every movement.
- As an author, I can lock positions and unlock them later.
- As an author, I can manually adjust a route while keeping the automatic system available.

### Profiles and Metadata

- As an author, every variable, relation, and loop has a profile.
- As an author, I can define custom fields for variables, relations, and loops.
- As an author, I can edit data in both profile view and table view.

### Views and Styling

- As an author, I can create a view that changes visibility and styling without duplicating the model.
- As an author, I can color, size, shape, and filter by field.
- As an advanced author, I can write a simplified CSS-like language to control styling and interaction.
- As an author, I can create reusable base views and derive variants from them.

### Text Authoring

- As an author, I can describe a loop in a markdown-like, mermaid-like language and compile it into a diagram.
- As an author, I can import Mermaid as a compatibility path but prefer a richer native Trama language for loops, polarities, and story scenes.
- As an author, I can export an edited loop back into a stable text representation.

### Story and Presentation

- As an author, I can create a storyboard from the model.
- As an author, a storyboard step can focus a variable, relation, loop, or named scene.
- As an author, each step can carry its own camera, visibility, narrative text, and pacing.
- As an author, I can export a guided presentation that runs locally and can be embedded.

### Persistence

- As an author, the project autosaves locally.
- As an author, I can recover from crashes or interrupted sessions.
- As an author, I can browse versions and restore earlier states.

## Information Architecture

### Top-Level Entities

- Project
- Map
- View
- Presentation
- Asset

### Data Entities

- Variable
- Relation
- Loop
- Story Step
- Field Definition
- Field Value

### Style Entities

- Style Rule
- Style Token
- Control Definition
- Partial View

## Proposed Domain Model

### Project

Contains:

- metadata;
- field definitions;
- maps;
- shared style tokens;
- presentations;
- local assets.

### Map

Contains:

- base variable/relation/loop graph;
- canonical layout state;
- optional map-scoped notes;
- default included items.

### View

Contains:

- visibility rules;
- styling rules;
- controls;
- popover config;
- inspector defaults;
- partial-view toggles;
- optional overrides of map composition.

### Presentation

Contains:

- slides or steps;
- references to map/view states;
- camera and reveal state;
- autoplay and pacing metadata.

## Editing Experience Spec

### Mode System

The app should expose four main modes:

1. Explore
2. Edit
3. Style
4. Present

### Shell Layout

Recommended shell:

- top bar: project, map, view, save state, presentation actions;
- left rail: project explorer, maps, views, presentations;
- center: canvas;
- right inspector: profile, style, controls, story, metadata;
- bottom-right utilities: fit, zoom, layout tools, snapping.

### Sidebar Strategy

The Kumu benchmark makes it clear that we should not think in terms of “one sidebar”.

We should design three coordinated sidebar patterns:

1. Left contextual sidebar inside the editor
2. Right utility rail plus right editor panel
3. Separate settings/admin navigation outside the main canvas

Recommended adaptation for Trama:

- the left editor sidebar should be stronger than Kumu’s for local loop authoring, because it must also
  support story, loop browser, and semantic editing;
- the right panel should become the home of Basic View Editing, route tuning, and the future style DSL bridge;
- the settings/admin sidebar should privilege exports, backups, local assets, and project organization over collaboration features.

### In-Canvas Editing

Required behaviors:

- double-click or quick-add to create a variable;
- drag-to-connect or quick connect from a selected variable;
- contextual quick actions on variable/relation/loop;
- multi-select;
- box select;
- alignment tools;
- keyboard nudge;
- duplicate;
- delete;
- copy/paste style;
- pin/unpin;
- route adjust handles.

### Inspector

Tabs:

- Profile
- Style
- Data
- Story
- View rules

### Table Mode

Need a bulk editor for:

- variables;
- relations;
- loops;
- fields;
- presentation steps.

## Routing and Layout Spec

### Protected Rule

The current routing subsystem remains the canonical source of automatic edge curvature.

### Future Improvement Rule

We may refactor the integration and performance model around routing, but not discard the
underlying heuristics without clear superiority on:

- crossing reduction;
- node avoidance;
- polarity readability;
- responsiveness in editing.

### Editing Performance Strategy

To preserve the current algorithm while improving UX:

1. Separate live-drag preview from final reroute.
2. Update only affected local geometry during drag.
3. Recompute full optimization on drag end or idle.
4. Cache path samples and annotation geometry.
5. Consider workerizing heavy routing passes.
6. Support route quality levels:
   - draft;
   - balanced;
   - publish.

## DSL Strategy

Trama should expose two authored text artifacts:

### 1. Loop Markdown

Purpose:

- declare variables;
- declare relations and polarities;
- declare loops;
- declare story/presentation structure;
- optionally embed notes and field values.

Suggested role:

- the semantic source format;
- import/export friendly;
- easier than raw JSON for systems practitioners.
- mermaid-like in readability, but richer than Mermaid in loop semantics.

Important product difference from Kumu:

- Kumu is comfortable starting from relational tables and fields;
- Trama must explicitly support a text-first authoring path as a first-class workflow.

### 2. Loop CSS-Like Language

Purpose:

- style canvas, variables, relations, loops, labels, annotations, controls, and presentations;
- define view behavior;
- define defaults and variants;
- optionally define controls and partial views.

Suggested inspirations:

- Kumu Advanced Editor;
- simplified CSS selectors;
- explicit loop-oriented selectors and fields.

### Example Conceptual Shape

```text
@view "Executive"
@settings {
  background-color: #f7f3e7;
  element-font-cutoff: 8;
}

variable[type="risk"] {
  shape: hexagon;
  fill: #f3d7c3;
}

relation[polarity="balancing"] {
  stroke-style: dashed;
}

loop[type="reinforcing"] {
  badge-fill: #2b3a2e;
}
```

## View System Spec

### Basic View Authoring

The Basic Editor should support:

- color by field;
- size by field;
- shape by field;
- label controls;
- filter;
- showcase;
- focus;
- loop emphasis;
- partial views;
- controls builder;
- legend config.

### Advanced View Authoring

The Advanced Editor should support:

- selectors for variable, relation, loop, field, tag, type, story state, focus state;
- defaults;
- control definitions;
- imported/base views;
- presentation-specific styling.

## Presentation Spec

### Presentation Types

Support at least:

- title slide;
- map scene;
- text scene;
- image/media scene.

### Map Scene

Should support:

- target map;
- target view;
- focus target;
- camera;
- reveal state;
- narration;
- autoplay delay;
- transition type.

### Presentation Compatibility

The V2 `Presentation` is the only runtime and persistence contract. Historical `story.steps`
documents are accepted only by the one-time migration utility.

## Persistence Spec

### Storage

Stay local-first and SQLite-backed.

### Additions Needed

- explicit projects, maps, views, presentations tables;
- version snapshots for more than the current loop JSON;
- autosave journal;
- asset registry;
- crash recovery state;
- export/import of full projects;
- backup and restore.

## Non-Functional Requirements

### UX Performance

- Dragging a variable should feel immediate.
- Selection should update without visible full-canvas teardown.
- Profile editing should not rebuild the whole graph.
- View switching should be fast and visually stable.

### Reliability

- Every meaningful edit is autosaved.
- Failed saves are visible and recoverable.
- The project can be reopened into the exact previous editing context.

### Portability

- Standalone exports must work without a server.
- Embeds should preserve controls and presentations where possible.

### Accessibility

- Keyboard-first editing support.
- Reduced motion mode.
- Sufficient contrast in default themes.

## Current Codebase Findings

This section captures the most important findings from the current local code audit.

### What is already strong

- The engine architecture is genuinely well separated across domain, geometry, routing, annotations,
  rendering, and demo glue.
- The current routing and annotation stack is already a product differentiator, not a throwaway demo trick.
- Local SQLite persistence already exists and includes basic history via `loop_versions`.
- A first lightweight presentation DSL already exists in `scripts/presentation-from-dsl.mjs`.

### What still keeps the product in "demo" territory

#### 1. Graph edits still rebuild too much state

In `src/CLDEngine.js`, methods such as `addNode`, `updateNode`, `removeNode`, `addEdge`, and
`updateEdge` all call `setModel()`, and `setModel()` destroys and recreates the Cytoscape graph.

Implication:

- object edits are structurally more expensive than they should be;
- inspector edits cannot become truly fluid while the graph is recreated for ordinary mutations;
- this is one of the main blockers to a Kumu-like editing feel.

#### 2. The demo shell is carrying too many responsibilities

`src/app.js` is doing editor shell work, canvas orchestration, persistence coordination,
presentation behavior, popovers, selection handling, and project navigation all in one place.

Implication:

- iteration speed on UX gets slower as the product grows;
- it is harder to evolve toward a professional editor shell with map/view/presentation surfaces;
- behavior becomes harder to reason about and test.

#### 3. The visual language is still hardcoded

`src/rendering/cytoscape.js` still hardcodes the visual vocabulary for nodes and edges.

Implication:

- there is no real path yet to a Basic Editor or Advanced Editor;
- shape, size, typography, defaults, and relation styling are still implementation detail instead of authored data;
- the future CSS-like language needs a compiler target that does not yet exist.

#### 4. Persistence is solid, but still loop-centric

`src/platform/projectStore.js` stores `projects`, `loops`, and `loop_versions`, which is a strong start.
But the schema does not yet represent maps, views, presentations, assets, or style definitions.

Implication:

- the current persistence model supports a local loop workspace;
- it does not yet support the Kumu-like `project -> map -> view` product structure;
- richer export/import and portfolio organization still need schema evolution.

#### 5. Presentation authoring is the canonical narrative surface

The current Presentation compiler and controller support guided beats. The presentation Markdown
source proves that text-authored storytelling is feasible, with explicit scene, beat, focus and
camera semantics.

Implication:

- it is a strong base for presentations;
- it is not yet a full slide/scene system with camera, reveal states, media, pacing, and reusable scenes.

#### 6. Drag smoothness is partially solved, not fully solved

There is already some good engineering here: `src/CLDEngine.js` throttles rerouting during drag and
recomputes the route on node release. That means the project is not naïvely rerouting on every pointer event.

But the remaining gap is architectural:

- graph mutations are still too coarse;
- annotations and route work still happen in the same main-thread interaction loop;
- there is no draft-versus-commit routing pipeline;
- there is no worker boundary for heavy route passes.

### What this means strategically

Trama does **not** need a new core algorithm to become excellent.

It needs:

- an editor architecture layered around the existing engine;
- incremental graph mutation instead of full graph recreation for common edits;
- a view system and style system above the renderer;
- a richer local persistence model;
- a better shell and inspector model;
- a true authored presentation layer.

## Roadmap

### Phase 1: Architecture Refactor

- Introduce `project / map / view / presentation` domain model.
- Split current demo into app modules.
- Preserve current engine API while reducing demo coupling.

### Phase 2: Incremental Editing Engine

- Move from full graph recreation to incremental mutations.
- Add local reroute previews and final reroute commit.
- Add undo/redo and selection model.

### Phase 3: Real Authoring UI

- Replace prompt-driven flows with proper inspector and dialogs.
- Add direct actions, contextual toolbars, table mode, and multi-select.

### Phase 4: View System

- Add Basic Editor for view authoring.
- Add simplified style rules and control builder.
- Add reusable base views and imported views.

### Phase 5: Text Authoring

- Define Loop Markdown.
- Define Loop CSS-like DSL.
- Build parser, validator, and compiler.

### Phase 6: Presentation System

- Expand story mode into full presentation authoring.
- Add camera persistence, reveal states, and autoplay.

### Phase 7: Publishing and Portfolio

- Improve standalone output.
- Add project browser and portfolio organization.
- Add richer export formats.

## Decision Summary

We should clone Kumu's **authoring architecture** and **editing experience** much more than its
rendering internals.

Trama's end state should be:

- Kumu-like in UX and product structure;
- more opinionated and stronger for causal loops;
- local-first;
- markdown-friendly;
- powered by the existing Trama routing and annotation engine rather than replacing it.
