# Performance architecture for editor interactions

This document defines the performance boundary for the interactive editor. It
is deliberately separate from routing quality: interaction work may change
when computation happens, but it must not silently change the settled layout or
route result.

## Interaction contract

Every editable gesture has four phases:

1. `begin`: capture the current geometry and create one undo transaction;
2. `preview`: update only the visual state needed for immediate feedback;
3. `commit`: update the domain model once and schedule persistence;
4. `settled`: run the explicitly allowed route refinement and QA checks.

Preview work must not persist, create additional history entries, rebuild the
graph, rerender the whole inspector, or run global layout.

The current implementation exposes route preview/commit methods on
`CLDEngine`, while `src/performance/frameScheduler.js` coalesces pointer work
to one animation frame. `src/performance/interactionMetrics.js` records the
interaction lifecycle for the browser QA surface.

## Composition invariant

Adding or removing a node/edge preserves the current node positions, viewport,
locks, and unrelated routes. It must not call `setModel()` for a normal editor
mutation. Full reconstruction remains valid for loading another document,
import, version restore, and explicit recovery operations.

Automatic routing and layout remain the canonical algorithms. Preview routing is
allowed to be local and provisional; balanced/publish refinement must remain
deterministic for the same model, positions, locks, quality, and seed.

## Performance budgets

- label/metadata commit: p95 <= 50 ms;
- draft route: p95 <= 100 ms on maps with 25 edges;
- balanced route: p95 <= 350 ms on maps with 25 edges;
- preview: one scheduled update per animation frame;
- persistence: at most one queued write per committed gesture;
- normal node/edge insertion or removal: zero `setModel()` calls.

Budgets are measured on fixtures 8, 16, and 32. Larger fixtures are used to
observe graceful degradation and to decide when semantic disclosure or worker
refinement is needed.

## Verification

Node tests cover the frame scheduler, interaction transaction accounting,
routing determinism, and model invariants. Browser QA must additionally verify:

- node drag preview and commit;
- manual route drag preview and commit;
- connection creation without graph reconstruction;
- text editing without per-keystroke model/persistence work;
- undo/cancel behavior;
- reload fingerprint stability;
- standalone export geometry;
- console errors and long tasks.
