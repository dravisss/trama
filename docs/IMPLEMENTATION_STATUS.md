# Implementation Status

This document maps the product plan to the implementation that is currently available. It is a
handoff index, not a replacement for the product and language specifications.

## Delivered Capabilities

| Area | Status | Primary evidence |
| --- | --- | --- |
| Local-first workspace | Implemented | `src/platform/projectStore.js`, project backup/import and automatic versions |
| Map and view model | Implemented | `src/core/views.js`, inherited views, filters, highlights and generated legends |
| Direct manipulation | Implemented | `src/CLDEngine.js`, selection operations, nudging, alignment, duplication and connection handles |
| Adaptive routing | Implemented | `src/routing/optimizer.js`, draft/balanced/publish budgets and route timing metrics |
| Text authoring | Implemented | `.loop.md`, `.loop.css` and Mermaid import in `src/language/` |
| Presentation authoring | Implemented | typed chapters, scenes, beats, camera, reveal, duration, transition and autoplay |
| Story Mode V2 domain/runtime | Implemented | `src/presentation/`, migration, compiler, reducer, controller and `tests/presentation.test.mjs` |
| Story Mode V2 Studio | Implemented first complete authoring wave plus Markdown/director/structure/history slice | Simplified non-technical shell: one timeline for navigation, essential beat inspector as the default, Markdown as an optional right-sidebar tab, no Visual/Markdown/Split mode switcher, no advanced JSON in the primary path; validated `.story.md` apply/export, source persistence, collapsible and duplicable scenes, chapter create/duplicate/remove/reorder, scene cross-chapter drag/reorder, beat drag/reorder and keyboard-safe order controls, 60-step editorial undo/redo with Cmd/Ctrl shortcuts, guided path builder, comparison composer, Director intent/audience/template flow, project library and presenter rehearsal mode in `src/app.js`, `src/presentation/editorOperations.js` and `src/app/appShell.css` |
| Relational editing | Implemented | variables, relations, loops and presentation tabs in the bulk editor |
| Standalone publishing | Implemented V3 contract | export gate, compiled timeline, referenced assets, integrity digest, deep links, resume state, reduced motion, origin-checked postMessage control, clean presentation-only export and animation-preserving story runtime |
| Matcha editor shell | Implemented | dual sidebars, command dialogs, history, fields, responsive canvas, dedicated Explore loop panel and isolated `src/app/explorePanel.js` controller |
| Markdown preview workflow | Implemented | loop source draft/preview/apply/discard states with persistence guardrails in `src/app.js` |

## Quality Gates

- `npm test` covers model editing, languages, stories, views, persistence, backup and version restore.
- `npm run build` produces the engine, editor and standalone runtime bundles.
- `npm run check` runs both gates and is required before release commits.
- Route quality changes candidate and pass budgets without replacing the existing cost function.

## Deliberate Product Boundaries

- The editor is local-first and optimized for one active author, not real-time collaboration.
- Kumu is a UX benchmark, while LoopViewer keeps its own loop-oriented Markdown and standalone HTML export.
- Legacy loop records remain supported while maps and views are the canonical workspace direction.
- Generated files in `dist/` are committed but must only be changed through `npm run build`.

## Next Validation Layer

The V2 foundation and flagship complex-story scenario are ready for scenario-based acceptance testing against
`docs/STORY_MODE_V2_PRODUCT_AND_IMPLEMENTATION_SPEC.md` and
`docs/KUMU_BENCHMARK_AND_PRODUCT_SPEC.md`. Remaining work is the second implementation wave:
multi-user collaboration, richer quantitative intervention simulation, visual regression and
performance profiling on very dense diagrams remain deliberate follow-up work. The current export
surface now offers clean (presentation-only), guided (with sidebar) and exploratory variants.
