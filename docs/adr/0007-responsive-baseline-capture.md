# ADR 0007 — Captura determinística dos baselines responsivos

- Status: accepted
- Date: 2026-07-21
- Scope: QA visual / Playwright

## Context

The post-R9 application shell publishes a semantic camera-stable marker before
the final responsive grid commit is always observable by a full-page screenshot.
The existing tablet Explore and mobile Map references could therefore capture
two different composition states in the same test: a transient canvas-only
state or the completed React shell. This made `check:ui` fail on unrelated
visual pixels even when the application state, console, and camera contract
were valid.

## Decision

Keep the product DOM, CSS, tokens, camera contract, and runtime behavior
unchanged. The baseline harness waits 350 ms after its semantic assertions and
camera marker before taking the screenshot. Regenerate only the two references
whose captured state was proven to be transient: `explore-tablet` and
`map-mobile`.

The wait is a test synchronization boundary, not a visual tolerance or a
permission to update snapshots on arbitrary diffs. Any future reference
change still requires visual inspection and an explicit rationale.

The Explore focus path also cancels a deferred generic fit when applying the
semantic loop camera, so a shell resize cannot overwrite the focused viewport
after the marker is published.

## Dependencies and acceptance criteria

- `data-qa-camera-stable` remains required for map, Explore, and Story.
- A focused Explore camera remains authoritative over a pending generic fit.
- Existing UI contracts, console checks, axe checks, and responsive journeys
  remain unchanged.
- `map-mobile` and `explore-tablet` pass in three repetitions.
- Full `npm run check:ui` passes, including axe.
- No production stylesheet, token, schema, Presentation V2, or standalone
  export contract changes are introduced by this ADR.

## Rollback

Remove the wait and restore the two prior PNG references. This affects only
visual QA capture; it does not alter application behavior or persisted data.
