# Trama landing

The public-facing Atlas vivo landing is a static site using the real CLD engine
and Presentation V2. It has no backend or shared persistence dependency.

```sh
npm run build:landing
npm run serve:landing
```

Preview: `http://127.0.0.1:4180/`. The server binds loopback and serves only
`dist/landing/`, not the repository or local project databases.

`npm run check:landing` compiles and validates the example, builds the site and
runs a bounded Chromium journey with desktop/tablet/mobile captures, axe,
five scroll-driven chapters, a camera midpoint, reverse and mid-scene reload,
real canvas interaction, editing, undo, reset, JSON download, reduced motion and
no-JavaScript reading. The QA server uses port 4181 and is closed in `finally`.
An existing server may be selected with `TRAMA_LANDING_QA_URL`.
Evidence is written to the ignored `printscreens/trama-landing/` directory.

## Authored content

- `seeds/trama-atalhos.loop.md`: causal account, Mermaid diagram, explicit edge
  IDs and clean relation descriptions.
- `seeds/trama-atalhos.story.md`: five V2 beats with map references and cameras.
- `landing/demo.js`: deterministic compilation, curated reinforcing cycle,
  validation, lint and initial editorial positions.
- `landing/main.js`: presentation/exploration/ephemeral editing adapter.
- `landing/cinema.js`: real-model SVG opening and native-scroll conductor.
- `production/motion-score.md`: signature sequence, motion ownership and fallbacks.
- `production/landing/`: brief, claim ledger and review evidence summary.

The copied page, stylesheet, bundle, favicon, local fonts and images in `dist/landing/`
are the future deployment artifact. Do not edit those outputs manually.
The regular `npm run build` also generates the landing.

## Boundaries

The guided story always uses its original map. Experiment edits survive mode
switching, and remain in memory until reset or reload. A downloaded JSON is a
valid CLD model and can be imported through the app's existing model import.

The user selected `trama.org-agents.work` for a later public deployment and plans
a hosted application and MCP server. This change does not deploy or implement
either service. In-page links lead to working demo modes, not speculative routes.

## Assets

Noto Serif/Noto Sans WOFF2 files come from the existing locally hosted project
fonts. The small SVG logomark is authored in the landing source. The diagram is
drawn at runtime from the real model, with real media attached to six variables.
The opening SVG is another view of those same variables, not an app screenshot.
Six paper-craft illustrations reuse existing project WebP assets. A new generated
paper-loop still life adds an editorial image in the audience section; its exact
prompt, built-in generation tool and saved file are recorded in
`landing/assets/README.md`. All files are local; no CDN is required.
