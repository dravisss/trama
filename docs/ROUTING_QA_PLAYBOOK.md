# Routing QA Playbook

Status: active engineering contract

This playbook defines how Trama proves that a layout is readable, stable, fast enough to edit,
and safe to persist. A screenshot alone is evidence, not a pass condition.

## What Must Be Proven

Every map opening must satisfy these invariants:

- every node has a finite position after the first render;
- every automatic edge has a non-zero, provenance-tagged route;
- primary loop edges prefer the outward side unless a diagnostic explains the exception;
- node envelopes, edge paths, arrowheads, and polarity signs do not collide in publish mode;
- locked nodes and locked routes do not move;
- a saved layout has the same fingerprint after reload;
- an unchanged model with the same algorithm version and seed produces the same fingerprint;
- draft interaction does not invoke a full global layout search;
- balanced and publish quality may refine asynchronously, but never replace a better accepted
  candidate with a structurally worse one.

## Quality Dimensions

The quality vector is lexicographic. The first different value wins:

```text
[hardViolations, primaryLoopCrossings, edgeNodeHits, labelOverlaps,
 annotationCollisions, totalCrossings, ambiguousTangencies, portCongestion,
 excessiveCurvatureCount, excessiveCurvatureMagnitude, lockedCrossings,
 loopShapePenalty, totalRouteLength, aspectPenalty]
```

The vector is accompanied by route-level diagnostics: chord length, normalized curvature, route
class, minimum node clearance, blocking nodes, side, lock state, and reason. Locked conflicts are
reported as explicit exceptions and are never silently repaired.

## Test Layers

### 1. Pure geometry and model tests

Run `npm test`.

Cover curve math, cycle winding, deterministic seeds, node envelope repair, route ranking, quality
gate behavior, route metadata, model validation, layout snapshot round trips, and presentation
compilation. Add a fixture whenever a browser screenshot exposes a new geometric failure.

### 2. Scale fixtures

The QA runtime exposes deterministic 8, 16, and 32-variable fixtures. The corpus should also
include single cycles of 3, 4, 6, 8, and 12 nodes; shared-node and shared-edge cycles; hub and
spoke graphs; disconnected components; and locked-node/locked-route variants. For every fixture,
record node count, edge count, loop count, quality vector, route duration, and fingerprint.

### 3. Browser structural checks

Build and run the correct local server:

```bash
npm run check
PORT=4174 npm run serve
```

Open `http://localhost:4174/?qa=1`. The map root exposes these read-only attributes for browser
inspection:

- `data-qa-fingerprint`
- `data-qa-check`
- `data-qa-quality-reasons`
- `data-qa-quality-vector`
- `data-qa-algorithm-version`
- `data-qa-route-count`
- `data-qa-route-diagnostics`
- `data-qa-annotation-collisions`

Use the in-app browser to verify the following flow on at least one 8-variable, one 16-variable,
one 32-variable, and one persisted production map. The disposable scale fixtures are addressable
with `?qa=1&fixture=8`, `?qa=1&fixture=16`, and `?qa=1&fixture=32`:

1. load the map and wait for the canvas to settle;
2. record the fingerprint and quality attributes;
3. enter Editar and select a node;
4. drag one node by a small known offset;
5. confirm the map becomes pending and the route/annotation update completes;
6. click Salvar alteracoes and confirm the saved status;
7. reload the same URL;
8. confirm the fingerprint, node displacement, route metadata, and saved status persist;
9. enter and close each command menu by clicking outside it;
10. use Resetar automatico only in a disposable QA map, save, reload, and confirm a new stable
    fingerprint.

### 4. Visual checks

Capture screenshots before and after each major algorithm change at the same viewport and zoom.
Inspect:

- circularity and winding of primary loops;
- outward versus inward curve decisions;
- excessive arcs on long clear edges;
- near-touching node envelopes and shadow merging;
- arrowheads entering unrelated nodes;
- polarity signs colliding with nodes, arrows, or other signs;
- shared hub corridors and parallel paths;
- negative-space balance and accidental canvas stretching;
- dense-map readability at overview zoom and after focus.

### 5. Performance checks

Record `routePerformance` and the route metrics for 8, 16, 32, 50, and 100-node fixtures.
Targets:

- draft route during drag: under 100 ms after warm-up;
- balanced 8 to 25-node map: under 350 ms after warm-up;
- dense 32-node map: first render must remain responsive and expose a stable snapshot within 8 s;
- no full CoSE/fCoSE run from pointer move;
- no unrelated-node displacement outside two hops after a local edit;
- publish search may be asynchronous and must expose progress rather than blocking the editor.

### 6. Persistence and export

For every saved map, validate both the SQLite/API path and the browser recovery snapshot. Reload the
editor, reopen the project, duplicate the map, and restore a prior version. Export standalone HTML
with and without the sidebar, open each export in a fresh tab, and compare node/edge counts,
positions, route sides, story references, and visual screenshots.

## Failure Classification

- `P0`: data loss, locked geometry moved, invalid model, or export cannot open;
- `P1`: primary loop crossing, node or edge collision, route not persisted, or editor blocked for
  more than one second during a normal gesture;
- `P2`: excessive curvature, inward route without a reason, port congestion, visual tangency,
  unstable fingerprint, or visible annotation collision;
- `P3`: spacing, aspect ratio, negative-space, copy, or minor responsive polish issue.

Every finding should include map id, viewport, mode, before/after screenshot, fingerprint, quality
vector, route diagnostics for the affected edges, and whether the problem reproduces after reload.

## Current Implementation Coverage

Implemented in the current routing-v4 checkpoint:

- complete deterministic seed before force refinement;
- lexicographic local route candidate ranking;
- normalized curvature and route provenance;
- route diagnostics and quality gate;
- annotation collision metrics;
- deterministic 8/16/32-variable fixtures;
- browser QA runtime and `?qa=1` data attributes;
- persistence of layout metadata and route metadata;
- reload fingerprint verification.

The 32-variable fixture is intentionally allowed to report quality exceptions. Its purpose is to
prove that dense maps finish and expose actionable diagnostics instead of freezing the editor or
silently accepting unreadable geometry.

Still required for the full V2 target:

- explicit angular port assignment and durable lanes;
- region skeletons for overlapping cycle families;
- spatial indexing for large-map obstacle queries;
- joint local node and route refinement;
- worker-backed publish search;
- semantic clustering and progressive disclosure beyond 60 variables;
- automated screenshot baselines and a browser runner that records artifacts in CI.
