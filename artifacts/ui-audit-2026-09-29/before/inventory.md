# Trama / LoopViewer — before

Captured on 2026-09-29 from the local checkout. This is a state inventory, not a visual acceptance verdict.

- Screenshots: **60**
- Viewports requested: 1440×900, 390×844, 360×844
- Targets: local QA fixture at :58810, landing at :4186, isolated hosted at :4194
- Git HEAD: `5ad557bf5a3a271a76bcc46654d40b2598a6b47a`

## States represented

- workspace/library
- map/editor
- Story Studio
- presentation player
- Editor panel: Detalhes/Inspector
- Editor panel: Estilo
- Editor panel: Dados
- Editor panel: Markdown
- Editor panel: Histórico
- Overlay: project menu
- Overlay: project metadata dialog
- Overlay: new map dialog
- Overlay: map description dialog
- Overlay: more actions/export menu
- Hosted: public/start landing
- Hosted: hosted map editor
- Hosted: hosted Story Studio
- Hosted: hosted player
- Hosted: read-only share
- Hosted: presentation embed
- Hosted: share without sidebar
- Hosted: share settings with secret inputs blurred

## Limitations

- before is a historical, mixed capture: early screenshots came from the prior dist, then later files may include builds updated during the capture window.
- Before dialog/menu variants are incomplete at compact widths; after contains corrected mobile captures.
- The initial before runner was interrupted, so its first attempt did not generate one consolidated local manifest. This final manifest inventories all retained screenshots.
- Hosted paths containing edit/share secrets are redacted. No real workspace/token was opened.

## Reproduction files

See `capture.mjs`, `capture-hosted.mjs`, `capture-local-remainder.mjs`, and `manifest.json`.
