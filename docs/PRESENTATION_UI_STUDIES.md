# Presentation UI

The official presenter uses the lower-third editorial rail as its only narrative surface.

The diagram remains the dominant visual surface. The story card is rendered in a reserved
bottom zone, so its title and narration never overlap nodes or relations. The card contains:

- the cinematic label, title, narration and progress indicator;
- centered previous/next icon controls;
- a globe button in the upper-right corner for entering map exploration;
- the same globe control becomes a resume control while exploration is active.

Presentation is selected through the normal `Apresentar` flow. The former experimental
`presentationStudy` query parameter is ignored; there are no longer separate floating-card
or inline-path runtime modes.

## Verification contract

The presenter must:

- use the persisted `Presentation` and canonical beat controller;
- keep the active causal focus inside the visible diagram;
- reserve enough canvas height for the story card at every beat;
- preserve the current beat across exploration and resume;
- keep controls keyboard accessible and understandable to assistive technology;
- avoid horizontal overflow and preserve readable copy at narrow widths.
