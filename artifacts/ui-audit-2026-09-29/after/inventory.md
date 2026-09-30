# Trama / LoopViewer — after

The after capture reflects several in-flight build corrections. The latest final-build Story 360 evidence is recorded at build time **2026-09-30T03:19:38.907Z**.

- Screenshots: **107**
- Coverage: workspace/library, map/editor, Story Studio, player, panels, dialogs, menus, hosted sharing/settings, import/export
- Viewports: 1440×900, 390×844, 360×844
- Local fixture: http://127.0.0.1:58810
- Hosted fixture: http://127.0.0.1:4194 (temporary, secrets redacted)

## Final checks

- Import of `seeds/sobrecarga-filas.loop.md` added one map to the disposable QA project.
- Standalone export produced `flagship-growth-trama.html` (1,321,467 bytes) inside this evidence folder.
- Project control at 390/360: trigger height 44px; fixed menu; document width equals viewport; no console errors.
- Final hosted share/player: no `select-name`, no `/favicon.ico` 404, no console/HTTP errors, no document overflow.
- Story 360 final: header action buttons 44px tall; “+ Cena de loop” at x=134–237; “+ Cena manual” at x=241–343; bottom navigation buttons at x=39–321, all inside a 360px viewport.
- Expanded final axe suite: 3 tests passed at 1440px and 390px across library, map, project menu, more menu, Story Studio and catalogue; no violations were reported.

## Resolved historical findings

- Hosted read-only share/player originally lacked a name on the map selector; the final selector is labeled “Selecionar mapa”.
- Hosted public share originally returned 404 for `/favicon.ico`; the final process returns the brand SVG alias.
- Early Story 360 snapshots showed transition/cropped actions; the final build capture waits two animation frames plus 500 ms and records bounds.
- Earlier local findings for heading order and project-menu contrast were resolved by the expanded final suite.

## Limitations

- after contains screenshots from several build moments. The latest final-build Story 360 screenshot and layout measurements are hosted-timeline-layout-debug-360.png / hosted-timeline-layout-debug.json.
- Earlier local axe findings for heading order and project-menu contrast were resolved. The expanded final axe suite passed at 1440px and 390px for library, map, project menu, more menu, Story Studio and catalogue (3 tests).
- Hosted share/player select-name and /favicon.ico 404 findings from earlier builds were retested after server restart and are clean in the latest hosted-final-postfix-manifest.json.
- Manual physical-device and screen-reader checks were not performed.

## Runners and evidence

See `manifest.json`, `hosted-final-postfix-manifest.json`, `hosted-timeline-layout-debug.json`, `axe-project-menu-targets.json`, `flow-checks-manifest.json`, `corrected-interactions-manifest.json`, and the `.mjs` runners in this folder.
