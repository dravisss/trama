# Loop Language Spec

This document defines the first implementation target for Trama’s authored text layer.

It is intentionally different from Kumu’s table-first workflow.

Kumu is optimized around:

- relational/project data;
- fields and profiles;
- views authored on top of that data.

Trama should also support structured data and table editing, but its main authored source should be:

- a loop-native markdown/mermaid-like language for semantics and storytelling;
- a simplified CSS-like language for visual and interaction behavior.

## Design Goal

The language should feel like:

- easier than raw JSON;
- more loop-native than Mermaid;
- more author-friendly than a relational table;
- still compilable to the current Trama model and standalone HTML exports.

## Deliverables

The authored text system has two files:

1. `*.loop.md`
2. `*.loop.css` or embedded style blocks

## Core Principle

The markdown-like language is the semantic source of truth.

It should define:

- variables;
- relations;
- polarities;
- loops;
- loop descriptions;
- story/presentation steps;
- optional field values.

The CSS-like language is the visual and interaction source of truth.

It should define:

- canvas styling;
- variable/relation/loop styling;
- defaults;
- view rules;
- controls;
- presentation-specific visual behavior.

## Difference From Mermaid

Mermaid is a strong inspiration, but not enough by itself.

We want Mermaid-like brevity for declaring relations, but we also need:

- dual-sign polarity support;
- explicit loop curation;
- story scenes;
- loop metadata;
- view bindings;
- a clean bridge to local project persistence.

So the language should be:

- Mermaid-like in readability;
- Trama-native in semantics.

## Difference From Kumu

Kumu typically grows from:

- project records;
- fields;
- relational entries;
- view rules layered on top.

Trama should also support table mode and structured editing, but the authored text path is primary.

That means:

- an author can start from a text file and get a polished loop;
- the GUI editor and the text editor are peers;
- import from text is first-class, not a migration trick.

## v1 File Shape

Recommended v1 file:

```md
# Hiring Friction Loop

## Variables

- hiring_load: Hiring Load
- interview_delay: Interview Delay
- candidate_experience: Candidate Experience
- offer_acceptance: Offer Acceptance

## Relations

hiring_load ++ interview_delay
interview_delay +- candidate_experience
candidate_experience ++ offer_acceptance
offer_acceptance -- hiring_load

## Loops

- R1: Hiring Pressure Spiral
  edges:
    - hiring_load -> interview_delay
    - interview_delay -> candidate_experience
    - candidate_experience -> offer_acceptance
    - offer_acceptance -> hiring_load
  description: The more overloaded the hiring team gets, the worse the candidate experience becomes, reducing acceptance and increasing load again.

## Story

### Step 1
focus: loop R1
title: The loop closes
body: Delays erode candidate experience, which lowers acceptance and feeds load back into the system.
```

## v1 Shortform Relation Syntax

The relation line format should be:

```text
source SIGN target
```

Allowed signs:

- `++`
- `+-`
- `-+`
- `--`

Meaning: each sign is the direction of movement at that end of the relation
(source ↑/↓, target ↑/↓).

- `++` source ↑, target ↑: same direction, positive relation
- `--` source ↓, target ↓: same direction, positive relation
- `+-` source ↑, target ↓: opposite direction, negative relation
- `-+` source ↓, target ↑: opposite direction, negative relation

Loop type is the product of relation polarities: an even number of negative
relations is reinforcing, an odd number is balancing.

At most one relation may be declared per ordered `source -> target` pair.
Loops reference edges by pair, so a duplicate pair is a compile error.

Normalization:

- allow ASCII `-` in input;
- compile to typographic `−` internally where needed;
- preserve stable semantic meaning independent of typography.

## v1 Object Model Mapping

### Variables

Markdown source:

```text
- hiring_load: Hiring Load
```

Compiles to:

```js
{ id: "hiring_load", label: "Hiring Load" }
```

### Relations

Markdown source:

```text
hiring_load ++ interview_delay
```

Compiles to a model edge with:

- stable generated `id`;
- `source`;
- `target`;
- `sourceSign`;
- `targetSign`;
- derived `type`.

### Loops

Loops are curated, not merely discovered.

The authored language must allow:

- naming a loop;
- explicitly choosing ordered edges;
- adding description and tags.

### Story

Story steps should support at minimum:

- `focus: variable <id>`
- `focus: relation <source> -> <target>`
- `focus: loop <id>`
- `title: ...`
- `body: ...`

## v1 Extended Metadata

Optional frontmatter-like support:

```md
---
id: hiring-friction-loop
title: Hiring Friction Loop
summary: Reinforcing staffing pressure caused by declining acceptance.
tags: [talent, scaling]
---
```

This should map to project/loop metadata without requiring manual UI entry.

## v1 CSS-Like Language

The styling language should be selector-based, but smaller than CSS and smaller than Kumu’s full Advanced Editor.

Example:

```css
@view "Executive"

@settings {
  background: #f7f3e7;
  label-density: balanced;
  relation-curvature: balanced;
}

variable {
  shape: ellipse;
  font-size: 14;
}

relation[type="balancing"] {
  stroke-style: dashed;
}

loop[type="reinforcing"] {
  badge-fill: #2b3a2e;
}
```

## v1 Selector Vocabulary

Must support:

- `variable`
- `relation`
- `loop`
- `scene`
- `canvas`

Must support attribute filters for:

- `id`
- `type`
- `tag`
- `field`

May later support:

- `story-state`
- `focus-state`
- `view-state`

## GUI + Text Relationship

The editor must support both:

- text-first authoring;
- canvas-first authoring.

That means:

- a user can paste or load a `.loop.md` file and get a diagram;
- a user can edit on canvas and then export back to `.loop.md`;
- a user can edit style in GUI and export to `.loop.css`;
- a user can edit style text and see it reflected in the current view.

## Mermaid Compatibility Path

We already have a Mermaid-to-Trama pathway in the repo skill ecosystem.

The v1 plan should keep three paths:

1. Mermaid import
2. Native `.loop.md` authoring
3. JSON/project persistence

Recommended stance:

- Mermaid import is a compatibility bridge;
- native `.loop.md` is the long-term authoring language.

## Editor Requirements

The future text editor panel should support:

- syntax-highlighted `.loop.md`;
- syntax-highlighted `.loop.css`;
- parse/validate feedback;
- click-to-focus errors;
- compile preview;
- round-trip export.

## v1 Validation Rules

The parser should reject:

- duplicate variable IDs;
- relations pointing to unknown variables;
- invalid sign tokens;
- loops whose edge order does not close properly;
- story focus targets that do not exist.

## v1 Agent Guidance

If an implementation agent needs to make a choice, prefer:

- explicitness over magic;
- round-trippability over clever syntax;
- stable IDs over inferred labels;
- compile-time validation over silent fallback.

## What v1 Does Not Need Yet

- full Mermaid syntax compatibility;
- arbitrary nested selectors;
- free-form scripting;
- cloud sync;
- collaborative merge logic.
## Mídia de nós

A linguagem de loop permanece map-only e não embute bytes. Quando necessário, um agente/importer anexa `node.media` ao modelo persistido, com `assetId`, `altText`, `size`, `labelGap`, `labelPlacement`, `fit` e `focalPoint`. A vista pode desligar a exibição global com `@settings { node-media: false; }`; o asset continua parte do projeto local.
