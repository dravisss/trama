# Matcha UI Redesign Architecture

Status: implemented foundation

This document records how the selected visual references map onto the real LoopViewer product. It
is deliberately about the application shell; it does not change the reusable engine contract.

## Reference-to-product mapping

| Reference surface | LoopViewer mode | Real source of truth |
| --- | --- | --- |
| Projects dashboard | `workspace` | SQLite project metadata, local project list and `workspace` map records |
| Split map editor | `map` | Active engine model, `.loop.md` source, view, inspector and data table |
| Guided loop explorer | `explore` | `engine.getLoops()`, curated loop metadata and real relation descriptions |
| Story authoring | `story` | Project presentation, Storyboard and `.story.md` source |
| Framed presentation | `present` | `PresentationController` and the compiled presentation timeline |

No mode owns a duplicate causal model. Switching modes only changes the shell around the active
project, map, view and presentation.

## Component boundaries

- `src/app/appShell.js` owns mode labels, the projects dashboard, real project/map cards and
  data-derived SVG thumbnails. Its exported projection functions are DOM-independent and tested.
- `src/app/explorePanel.js` owns the Explore detail surface. It receives model and loop callbacks;
  it does not know about SQLite or Cytoscape persistence.
- `src/app/appShell.css` owns the Matcha product framing, responsive mode layouts and presentation
  chrome. Engine and standalone compatibility styles stay in their existing files.
- `src/app.js` remains the composition root: it supplies canonical state and explicit user-intent
  callbacks to the components.

New mode-specific UI should follow the same callback pattern rather than importing the project
store or mutating the engine from a display component.

## Editor information architecture

The Editor follows a stable three-zone contract:

| Zone | Owns | Must not own |
| --- | --- | --- |
| Left context column | Active view and discovered reinforcing/balancing cycles | Relation properties, map prose or story authoring |
| Canvas and toolbar | Direct manipulation, active-map switcher, layout and connection commands | Long-form forms or duplicated navigation |
| Right property dock | Selection Inspector, map title/description, Markdown, view rules, data and history | A compressed copy of Story Studio |

The right dock uses compact icon tabs with accessible names and native tooltips. Selecting
`Story Studio` changes workspace mode instead of mounting its authoring UI inside the Editor dock.
That prevents the canvas, beat inspector and timeline from competing for a narrow property panel.

Relations are rendered inside the right Inspector because they describe the current canvas
selection. Cycles stay visible at left because they are map-level navigation. The active-map
selector sits in the canvas toolbar because changing it replaces the working surface.

## State and safety rules

1. SQLite/API records remain canonical when the local server is available.
2. Map Markdown preview may rebuild the rendered engine temporarily, but must not update the
   workspace record, save queue or dirty indicator.
3. Applying map Markdown is an explicit persistence-capable action.
4. Importing Markdown from Projects creates a new map; it never overwrites the active map.
5. Story Visual, Markdown and Split modes edit the same presentation.
6. Explore descriptions come only from authored loop/relation data. Missing copy is reported as
   missing instead of generated in the UI.
7. Presentation controls reuse the existing controller buttons; their visual relocation must not
   fork keyboard, presenter or explore/resume state.

## Design tokens and responsiveness

Application tokens use the generated `--lv-*` prefix from `src/design-system/tokens.js`. Matcha
keeps warm paper, forest green, moss accents and editorial serif headings. The reusable graph theme
remains `src/themes/matcha.js`; map Style Packs do not restyle the product shell.

- Desktop: persistent global navigation and mode-specific multi-column workspaces.
- Compact desktop/tablet: icon navigation, a collapsible cycle column and horizontally reachable
  canvas commands.
- Mobile: top mode switcher, canvas-first Editor with an icon rail, deliberate property overlays
  and single-column Story/Present playback.

## Verification

- Pure shell projections and thumbnail geometry: `tests/app-shell.test.mjs`.
- Full suite and bundles: `npm run check`.
- Browser smoke path: Projects → Editor/Markdown preview → Explore/loop selection → Story Split →
  Present → return to the originating mode.
- Visual review should compare each mode separately with its selected reference, not a collage of
  all screens.
