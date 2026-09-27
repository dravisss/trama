# Trama — the cycle becomes visible

Revision after Ravi's rejection of the restrained first candidate, 22 September 2026.

## Signature and world

An illustrated causal atlas, not a small interface screenshot. Six tactile paper illustrations already owned by the product identify six variables. The same subjects, labels, relation order and polarities persist between the opening SVG diagram and the real CLD demonstration. The opening is an editorial view of the actual example; clicking a variable opens its real explanation. The diagram is not fabricated product UI.

Warm paper, forest ink, sage objects and occasional terracotta remain invariant. Noto Serif provides large, closely set editorial headlines; Noto Sans handles explanatory content and controls. New ImageGen paper sculpture is a separate metaphorical still life, with an explicit editorial cut, not a claimed physical transformation of the map.

## Score

| Scene | Trigger / owner | Change and settled state | Reverse / mobile / reduced motion |
| --- | --- | --- | --- |
| Opening | CSS once, 900 ms ease-out | Headline and illustrated atlas enter with short vertical separation; directed paths draw; six illustrations remain still for reading | Never repeat ambient movement; reduced motion fully visible immediately |
| The question becomes a system | Native scroll + sticky scene; one scroll conductor | Five discrete states from the actual Presentation V2, about 420 px per beat on desktop. Text swaps, camera moves for 650 ms ease-out-cubic, real causal focus changes. Each state rests until next threshold | Exact scroll position selects index, reversible and jump-safe. No scroll interception. Buttons suspend scroll following until explicitly resumed |
| 1: waiting | V2 first beat | Orient in the whole system, emphasize waiting | Same map coordinates and illustrations throughout |
| 2: shortcut | V2 second beat | Focus the waiting-to-shortcut relation | Camera derives from real semantic focus |
| 3: parallel paths | V2 third beat | Expand from shortcut through channels to backlog | Zoom and attention follow the causal chain |
| 4: coordination | V2 fourth beat | Follow backlog through handoffs and coordination back to waiting | No unrelated objects or decorative scene swaps |
| 5: feedback | V2 final beat | Pull back to the complete reinforcing cycle | Final consequence stays readable; exploration always available |
| Touch story | Manual controls on <=760 px or reduced motion | No long pinned track; diagram above compact reading panel, five labeled controls | Static page flow and instant camera with reduced motion |
| Editing | User click | Release story pin, show all editing controls, preserve private draft | No scroll controller may override edits or exploration |
| Product explanation | IntersectionObserver + CSS, 550 ms | Three SVG studies: signed relation, closed cycle, presentation path; supporting text remains visible | One reveal, not an ambient animation. No-JS entirely readable |
| Thinking together | CSS/scroll bounded 24px image drift | Large paper-loop still life alongside audience-specific copy | One editorial cut to forest; image static on mobile/reduced motion |

## Tokens / ownership

Micro-feedback: 160 ms. Text transition: 380 ms. Semantic camera: 650 ms. Editorial entrance: 900 ms. CSS owns DOM transforms; CLD owns graph camera; native scroll owns page position. No smooth-scroll library. No autoplay or perpetual loop. Scroll work is requestAnimationFrame-throttled and only changes semantic state at a threshold. Observers/listeners are disposed at pagehide and animations do not run in a hidden tab.

## Budgets and proof

Two-dimensional SVG plus one real CLD engine; no WebGL introduced. Local fonts, six existing WebP assets, one optimized new still life; no CDN. Target under 1.5 MB transferred for all assets. Readable no-JS HTML and signed relations; touch and reduced motion have no compulsory pinned sequence. Verify forward, backward, scrollbar jumps, manual override/resume, mid-page reload, resize, editing, download, text alternative and page end. Capture first frame, transition midpoint, all settled beats, reverse, mobile and reduced-motion states against the exact built candidate. Physical mobile performance and public hosting remain unproven.
