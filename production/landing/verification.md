# Local verification — Trama cinematic revision

The initial restrained candidate was rejected by the user. The evidence below
now concerns the illustrated cinematic replacement, not approval of that first
candidate. The user's visual acceptance is still separate from these checks.

## Candidate and scope

Preview: http://127.0.0.1:4180/ . The process serves `dist/landing/` from this
checkout and listens only on loopback. This is not the future public deployment.
The initial checkout was `codex/public-release`, HEAD
`5ea53908762fdb3eca5491c3ea3eb28bc4273d21`, with an in-progress brand migration.
Those pre-existing changes were preserved. The landing's runtime is isolated
from the application server and SQLite store.

At final verification the branch remained `codex/public-release`, with HEAD
`36813b55bcfd1be654e6f4fbb75f920c982ca2fa` after the parallel Trama rename. The
preview process was verified on `127.0.0.1:4180` and kept available for the user.

The live candidate is bound by SHA-256 values in
`printscreens/trama-landing/report.json`, including source HTML, CSS, runtime,
model compiler and the generated bundle. Git may advance through parallel work;
the content hashes identify this review's actual candidate.

## Automated and visual evidence

- `npm run check`: 239 engine/application tests, 4 Story Studio tests, build.
- `node scripts/qa-landing.mjs`: PASS, Chromium; 1440×1000, 1280×720,
  1024×900, 830×863 (current in-app viewport) and 390×844, plus a touch-enabled mobile context.
- No horizontal overflow in those viewports.
- No detected axe WCAG A/AA violations on initial and editing states. This is
  an automated check, not a full accessibility certification.
- No recorded runtime console errors or failed HTTP responses.
- Five compiled V2 steps, reverse navigation, full-loop focus, relation selector
  and a pointer click on a real canvas node.
- Native scroll selects every authored beat. Captured camera midpoint, final
  settled states, reverse, and reload mid-scene; manual navigation releases pin.
- Six real node media assets load in both SVG opening and CLD engine. The lower
  still life is captured after exercising its actual lazy loading, not forcing
  visibility in CSS or substituting an asset in the capture.
- Label/description editing, temporary draft retained across presentation mode,
  undo, variable plus signed edge creation, valid JSON download, atomic undo of
  the created pair, reset confirmation and cancellation.
- No write requests, localStorage or sessionStorage. Reload discards the draft.
- Keyboard step activation and immediate camera with reduced motion enabled.
- Touch editing, undo and story navigation in mobile emulation.
- The explanatory document and six causal relations remain readable without JS.
- `git diff --check`: clean at verification time.

Capture directory: `printscreens/trama-landing/`. First viewports:
`desktop-first.png`, `user-1280-first.png`, `tablet-first.png`,
`user-830-first.png`, `mobile-first.png`. Signature: `story-1.png` through
`story-5.png`, `story-transition.png`, `story-reverse.png`. Other sections:
`thinking-together.png`, `mobile-thinking-together.png`, `product-studies.png`,
`closing.png`. Supplemental `mobile.png`, `feedback.png`, `experiment.png`,
`no-javascript.png`. All are real renderer captures. Desktop full-page captures
include the natural empty track of a sticky scene; they are not evidence of its
cinematic progression. Per-beat captures are the evidence for that sequence.

## Finish observations and limits

The replacement gives the diagram a dedicated editorial opening, six illustrated
variables, a full-width five-beat native-scroll chapter, three SVG product
studies and an ImageGen paper sculpture. The first responsive pass found and
corrected SVG overflow, entrance-state contrast and status-copy contrast. Desktop
and touch reading use distinct layouts; reduced motion removes the pinned track.

The user selected the visual direction in conversation. No separately approved
image composition was produced before implementation; fidelity is reviewed
against that brief, incumbent identity and the rendered desktop/mobile frames.
There is no image-to-build pixel-parity claim.

Impeccable's context launcher could not execute directly (permission denied).
Its references were read directly. A detector invocation through `sh` ran once
but could not resolve the source HTML's build-relative CSS URL; its 16px-everywhere
hierarchy warning is inconclusive and contradicted by the actual render. It is
not reported as a clean detector pass.

The generated JS is approximately 600 KiB uncompressed. All local resource
transfers total approximately 0.95 MB in the recorded browser run (including
duplicate image requests from the SVG and canvas and HTTP headers). Timings are
local desktop navigation measurements, not field Core Web Vitals or a low-end
mobile performance guarantee. Safari/Firefox, physical touch devices, HTTP
compression, hosting cache policy and public deployment remain unverified.

VPS, DNS, public multi-user storage and MCP are deliberately deferred per the
user's latest instruction. The current page makes no availability promise for
those services. Independent visual-review disposition is recorded separately.
See `finish-review.md`: all four visual/code corrections were resolved in the
verdict pass; the reviewer retained `fix` solely for the missing historical
concept-seed evidence. This is not an unqualified process approval.
