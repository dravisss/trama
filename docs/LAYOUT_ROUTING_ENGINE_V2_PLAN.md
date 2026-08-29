# LoopViewer Layout and Routing Engine V2

Status: implementation plan

Purpose: define the algorithmic foundation required for LoopViewer to produce attractive,
readable causal-loop maps with minimal manual cleanup across small, medium, large, and very large
models.

This document is the implementation source of truth for automatic node placement, edge routing,
annotation clearance, layout scoring, scale behavior, and layout QA. It complements
`KUMU_BENCHMARK_AND_PRODUCT_SPEC.md`; it does not replace the product specification.

## 1. Product Outcome

An author should be able to create or import a causal model and receive a strong first composition
without manually fixing every node and curve.

The engine must:

- expose the causal loops as recognizable visual circuits;
- keep nodes, labels, arrows, polarities, and edges separated;
- use the smallest non-zero curvature that solves the routing problem;
- prefer outward loop edges without turning every route into an excessive arc;
- preserve manual locks and approved routes;
- respond locally and smoothly during editing;
- remain deterministic and stable when the model is reopened;
- degrade gracefully through clustering and semantic zoom as maps become too large to show in full.

The goal is not to remove editorial control. The goal is to make manual work exceptional and
intentional rather than mandatory cleanup after every automatic layout.

## 2. Evidence From Current Maps

### 2.1 QA Circuito da Autonomia, 8 variables

Observed strengths:

- the two main circuits are recognizable;
- most edges use the correct loop side;
- the upper circuit has a useful clockwise rhythm;
- there are no severe node-on-node overlaps.

Observed failures:

- `Capacidade de melhoria` and `Confiança da equipe` are too close;
- their shadows and visual envelopes almost merge;
- three relationships compete for a narrow corridor between `Autonomia da equipe`,
  `Capacidade de melhoria`, `Confiança da equipe`, and `Qualidade do processo`;
- polarity labels and arrowheads accumulate in the same region;
- several edges use a deep curve even though a shallow curve would remain collision-free;
- the composition is vertically stretched and leaves excessive negative space to the right.

Conclusion: absence of a literal overlap is not enough. The engine needs clearance envelopes,
port separation, curvature regularization, and composition balance.

### 2.2 QA Capacidade e Confiança, 16 variables

Observed failures:

- the center around `Fila de solicitações`, `Qualidade da entrega`, `Carga da equipe`,
  `Capacidade de atendimento`, and `Retrabalho` is congested;
- several curves cross or become tangent in the central region;
- very long edges receive very large control-point distances;
- large arcs dominate the visual hierarchy despite representing ordinary relationships;
- hubs do not reserve distinct incoming and outgoing angular sectors;
- nearby parallel paths are visually ambiguous;
- different loop groups are separated, but their connecting edges do not use explicit corridors;
- the map alternates between sparse outer space and a dense center.

Conclusion: the current optimizer chooses individual curves after node placement. It needs a
shared routing plan with ports, lanes, obstacle envelopes, and a global acceptance policy.

### 2.3 Stress 16 variables

Observed failures:

- the map is readable at overview scale, but the circuit shapes are uneven;
- some edges use large arcs where repositioning one or two nodes would be cheaper;
- multiple relationships converge on `Escalonamentos`, `Carga de trabalho`, and
  `Satisfação do usuário` without adequate angular separation;
- dashed and solid paths can share the same corridor;
- visual density is distributed unevenly across the canvas;
- the result is sensitive to the candidate selected by the force layout.

Conclusion: the engine needs joint node-and-route refinement and stability tests, not only a
larger collection of force-layout attempts.

## 3. Root Causes In The Current Engine

### RC-1: the loop language needs a non-zero curvature baseline

`src/routing/optimizer.js` should not behave like a generic straight-line graph renderer. Every
automatic relationship starts with a shallow, non-zero curve so the diagram retains the visual
language of a causal loop map. A straight route is reserved for an explicit authored direct policy
or a future special case, never for the normal automatic candidate set.

### RC-2: outward routing must survive shared-loop ambiguity

The router strongly penalizes the opposite sign of the preferred outward curve. This protects loop
identity, but shared edges can belong to multiple loops whose local centroids disagree. Falling back
to a generic graph centroid in that case can flip a route inward even when a loop-derived outward
side is available.

Outward is the default structural preference. An inward route is an exception that requires a hard
readability reason such as a crossing, node collision, severe port congestion, or an excessive arc.
For shared edges, the router should use the dominant loop winding; ties may use the local geometry
as a deterministic tie-breaker. For ordered simple cycles, signed polygon area is more stable than
recomputing the side from the global graph centroid on every edge.

### RC-3: the cost of curvature is too weak and mostly absolute

The current score penalizes `abs(controlPointDistance)`, but the visual effect depends on the chord
length. A distance of 120 px is excessive for a 180 px edge and modest for an 800 px edge.

Curvature must be normalized:

```text
normalizedCurvature = abs(controlPointDistance) / chordLength
```

For the current quadratic Bézier representation, the visible midpoint sagitta is approximately
half the control-point distance.

### RC-4: clearance uses centerlines instead of complete visual envelopes

Node avoidance samples distance to node centers, while the actual drawing also includes:

- variable node radius and stroke;
- node shadow;
- arrowhead length;
- polarity labels;
- label bounds;
- edge stroke and focus halo.

The engine must reason about expanded obstacle envelopes rather than a single center-distance
threshold.

### RC-5: overlap removal does not guarantee comfortable spacing

The post-layout overlap solver separates literal collisions. It does not guarantee editorial
breathing room or reserve space for incident edges. This is why the 8-variable map can pass the
overlap metric while two nodes still appear almost merged.

### RC-6: routes are optimized independently

The greedy router sees already selected paths, but it does not create a shared plan for:

- node ports;
- edge lanes;
- loop corridors;
- bundled entry and separated exit paths;
- source and target angular ordering.

This also affects chained edges. Two relations that meet at a node can leave that node through
the same narrow corridor even when a nearby lane is available. The router must inspect the first
few segments after a shared endpoint, not only the middle of the curves; otherwise the endpoint
guard used to avoid false-positive crossings hides the exact overlap users perceive.

### RC-7: weighted scoring allows the wrong tradeoffs

A single weighted sum can trade a serious readability defect for several cosmetic improvements.
The selection policy must become lexicographic: hard violations first, structural readability
second, visual polish third.

### RC-8: loop discovery produces topology, not a visual cycle basis

All discovered simple cycles are not equally useful for composition. Dense graphs can contain many
overlapping cycles. The layout needs a stable visual basis that prioritizes a small set of cycles
covering the graph and treats the remainder as secondary paths.

### RC-9: node placement and routing are only loosely coupled

The force layout positions nodes, then routing tries to repair the result. When an edge needs a huge
arc, the correct solution is often a small node movement followed by a shallow route.

### RC-10: scale behavior is not explicit

The same visual strategy cannot make 8, 80, and 800 fully labeled variables legible at once.
Large-scale quality requires decomposition, clustering, semantic zoom, and progressive disclosure.

## 4. Visual Invariants

The following invariants define whether a candidate may be accepted.

### 4.1 Hard constraints

A candidate is rejected when any unlocked automatic element violates these rules:

1. Node visual envelopes must not overlap.
2. Node-to-node clearance must include a configurable editorial gap.
3. An edge must not intersect another node's expanded obstacle envelope.
4. Arrowheads must not intersect unrelated nodes or labels.
5. Polarity labels must not intersect nodes, arrowheads, or other visible polarities.
6. A loop edge must not cross another edge from the same primary visual loop.
7. Automatic paths must remain inside the available canvas composition bounds.
8. Locked positions and locked routes must not be moved.

Recommended initial Matcha clearances at 100% semantic zoom:

```text
node visual gap:                 36 px minimum, 48 px preferred
edge to node boundary:          18 px minimum, 26 px preferred
edge to edge unrelated path:    10 px minimum, 16 px preferred
polarity to obstacle:            6 px minimum, 10 px preferred
arrowhead to obstacle:           8 px minimum
```

These values must be derived from rendered dimensions and theme scale, not hardcoded as universal
screen pixels inside pure geometry functions.

### 4.2 Structural preferences

After hard constraints pass, candidates are compared by:

1. crossings inside primary loops;
2. total crossings;
3. shared-path ambiguity and near tangencies;
4. port congestion at hubs;
5. edge direction consistency around each loop;
6. loop circularity and ordered node progression;
7. stability relative to the previous accepted layout.

### 4.3 Polish preferences

Only after structural criteria pass should the engine optimize:

- minimum necessary curvature;
- total route length;
- edge-length variance;
- balanced negative space;
- compactness;
- aspect ratio;
- symmetry where it clarifies the loop;
- proximity of related loop groups.

## 5. Curvature Policy

Curvature must solve a problem. It must not be the default decoration for every relationship.

### 5.1 Candidate order

For every automatic edge, candidates must be tested in this order:

1. shallow preferred-outward curve;
2. shallow opposite-side curve, only as an obstacle-avoidance fallback;
3. medium preferred-outward curves;
4. medium opposite-side curves;
5. deep curves only for obstacle avoidance or explicit loop envelopes;
6. waypoint or node-refinement candidate before an extreme curve.

The shallow baseline is non-zero. “Minimum curvature” means the least visible curve that preserves
the outward loop language, not a straight or nearly straight segment.

The first feasible candidate is not automatically the winner, but feasibility and curvature depth
must dominate cosmetic outward preference.

### 5.2 Relative curvature bands

Initial normalized bands for `abs(controlPointDistance) / chordLength`:

```text
0.00           reserved for explicit authored direct routes
0.04 - 0.10    shallow baseline
0.10 - 0.22    shallow/medium
0.22 - 0.38    medium

The automatic baseline should keep a minimum visible normalized curvature near `0.085` for a
clear, unlocked relation. This is a soft preference: node collisions, loop crossings, and shared
corridor conflicts may select a shallower route, but a long clear relation must not collapse into
a visually straight line merely because its absolute control-point distance is small.

### 5.3 Shared endpoint corridors

For every pair of incident automatic edges, compare their first few segments after the common
node. If their tangents are nearly parallel and the local corridor is too close, penalize the
candidate and choose another outward or inward lane. This is distinct from parallel-edge handling:
the edges may have different endpoints and still overlap visually on the way into or out of a hub.
The first endpoint segment is excluded from the distance test because both paths necessarily meet
at the node itself.
0.38 - 0.55    deep, exceptional
> 0.55          reject unless route is locked or no feasible alternative exists
```

Absolute caps are also required so very long edges do not create giant arcs. The cap should be a
function of viewport scale, node size, and routing quality.

### 5.3 Outward preference

Use this priority:

```text
collision-free
  > no loop crossing
  > no ambiguous tangent
  > minimum non-zero curvature
  > preferred outward side
  > total length
```

An outward route may lose to an inward route only when every feasible outward candidate introduces
a crossing, node collision, severe port congestion, or an excessive curve. Being merely longer is
not enough to turn a loop edge inward. Shared edges must preserve any valid outward side contributed
by their loop memberships instead of falling back to a generic graph centroid.

### 5.4 Long-edge policy

When a route exceeds the deep-curvature threshold, the engine must evaluate:

- moving one or both unlocked endpoint neighborhoods;
- assigning a shared outer corridor;
- using one or two semantic waypoints;
- routing the edge as a bridge between loop regions;
- keeping the route shallow and accepting a different side.

## 6. Target Architecture

```text
CLD model
  -> topology analysis
  -> visual cycle basis
  -> loop-region skeleton
  -> node-layout candidates
  -> clearance repair
  -> port assignment
  -> lane and corridor planning
  -> minimum-curvature routing
  -> polarity placement
  -> lexicographic quality gate
  -> accepted canonical layout
```

### 6.1 Topology analysis

Extend `loopTopology` with:

- strongly connected components;
- articulation nodes and bridge edges;
- cycle overlap graph;
- hub degree and loop membership;
- primary versus secondary cycle ranking;
- connected components and isolated chains;
- edge betweenness approximation for bridge detection.

### 6.2 Visual cycle basis

Build a deterministic subset of cycles that:

- covers as many loop edges as possible;
- minimizes repeated edges;
- prefers curated loops;
- prefers shorter causal explanations when discovery is automatic;
- remains stable when unrelated nodes are added;
- records secondary cycles without forcing every one into a separate ring.

### 6.3 Loop-region skeleton

Represent each primary cycle as a region with:

- center;
- radius or ellipse axes;
- orientation;
- ordered node slots;
- shared-hub slots;
- outer and inner routing corridors;
- reserved bridge directions.

Shared nodes sit on region boundaries or intersections instead of averaging unrelated circular
positions.

### 6.4 Constrained node refinement

Use the existing fCoSE/CoSE integration as a refinement candidate, with loop skeleton constraints.
Add a deterministic local solver that optimizes:

- exact node envelopes;
- preferred loop slots;
- hub angular separation;
- target edge lengths;
- composition bounds;
- movement stability;
- locked nodes.

The local solver must be able to move a small neighborhood when routing detects an extreme curve.

### 6.5 Port assignment

Before routing, assign source and target ports:

- divide each node circumference into angular sectors;
- reserve sectors for each primary loop;
- separate incoming and outgoing edges when possible;
- order parallel relationships consistently;
- keep polarity labels away from adjacent ports;
- preserve manually selected ports in authored layouts.

### 6.6 Lanes and corridors

Create explicit route channels:

- outer loop lane;
- optional inner short-edge lane;
- bridge lane between loop regions;
- hub fan-in and fan-out lanes;
- parallel-edge lanes;
- locked-route obstacle lanes.

Edges sharing a corridor may be visually related but must remain individually traceable. Avoid
generic edge bundling that hides causality.

### 6.7 Annotation-aware routing

Routing and annotation placement must share geometry. Route acceptance must reserve space for:

- source polarity;
- target polarity;
- arrowhead;
- optional edge label;
- focus halo.

The annotation renderer remains a separate module, but both modules consume the same route envelope
and port plan.

## 7. Candidate Selection

Replace the single weighted decision with a lexicographic quality vector:

```text
[
  hardViolationCount,
  primaryLoopCrossings,
  edgeNodeCollisions,
  annotationCollisions,
  totalCrossings,
  ambiguousTangencies,
  portCongestion,
  excessiveCurvatureCount,
  excessiveCurvatureMagnitude,
  layoutInstability,
  loopShapePenalty,
  totalRouteLength,
  whitespaceImbalance
]
```

The first differing field decides the winner. A weighted aesthetic score may break ties only after
all structural fields are equal.

### 7.1 Determinism

Given the same model, view, locks, viewport class, and algorithm version, the selected canonical
layout must be reproducible.

Randomized layout candidates must use recorded seeds. Candidate metadata should include:

- algorithm version;
- random seed;
- quality vector;
- duration;
- topology hash;
- viewport class;
- reason for rejection or acceptance.

## 8. Scale Strategy

"Works regardless of variable count" means graceful scale behavior, not unlimited full-detail
rendering.

### 8.1 Small maps: 2-10 nodes

- show all nodes and labels;
- strict zero-overlap and zero-primary-loop-crossing policy;
- prioritize recognizable circular loops;
- use shallow non-zero curves by default, preserving outward loop sides;
- target balanced layout under 150 ms after warm-up.

### 8.2 Medium maps: 11-25 nodes

- show all nodes;
- arrange primary loop regions and bridge corridors;
- allow multiple deterministic candidates;
- keep primary loops crossing-free;
- target balanced layout and routing within the existing 350 ms budget for approximately 25 edges.

### 8.3 Large maps: 26-60 nodes

- decompose strongly connected components into visual regions;
- use semantic zoom for secondary labels and polarities;
- route bridges between regions before internal edges;
- use a worker for publish-quality candidate search;
- keep interaction draft under 100 ms and complete balanced refinement asynchronously.

### 8.4 Very large maps: more than 60 nodes

- show region summaries at overview scale;
- expand selected loops or neighborhoods on demand;
- preserve a stable mental map during expansion;
- progressively reveal labels, polarities, and secondary edges;
- allow export of overview, selected regions, and story scenes;
- never claim that a fully expanded 500-node view is editorially readable.

## 9. Editing And Stability

### 9.1 Drag preview

During pointer move:

- move the selected node immediately;
- update connected paths with draft geometry only;
- do not run global candidate search;
- keep unaffected nodes and routes frozen;
- update annotations on animation frames.

### 9.2 Drag commit

On release:

- lock or strongly anchor the moved node according to editor mode;
- reroute the one-hop neighborhood first;
- expand to two hops only if hard constraints fail;
- run global refinement only on explicit `Reorganizar` or idle publish pass;
- persist node positions, route decisions, and algorithm version atomically.

### 9.3 Stability budget

Adding or moving one node must not move unrelated nodes without need.

Initial target:

```text
median displacement outside two hops: <= 12 px
95th percentile displacement outside two hops: <= 32 px
locked displacement: 0 px
```

## 10. Quality Modes

### Draft

- shallow preferred-outward candidates plus obstacle-aware opposite-side fallbacks;
- local obstacle checks;
- no global multi-start;
- optimized for drag and live typing.

### Balanced

- complete port assignment;
- primary cycle skeleton;
- several deterministic node candidates;
- full hard-constraint gate;
- default mode for opening and editing maps.

### Publish

- larger candidate search;
- annotation-aware route optimization;
- waypoint alternatives;
- screenshot and export validation;
- worker execution where available;
- never silently changes locked editorial geometry.

## 11. Implementation Phases

### Phase 0: Benchmark and instrumentation

Deliverables:

- canonical fixture corpus;
- quality-vector implementation;
- JSON diagnostic report per layout;
- deterministic seeds;
- baseline screenshots and metrics.

Corpus must include:

- QA 8 variables;
- QA 16 variables;
- Stress 16 variables;
- every current persisted production loop;
- synthetic single cycles of 3, 4, 6, 8, and 12 nodes;
- overlapping cycles sharing one node, one edge, and several nodes;
- hub-and-spoke plus cycles;
- disconnected components;
- 25, 50, and 100-node generated stress maps;
- locked-node and locked-route cases.

Exit criteria:

- every fixture produces machine-readable metrics;
- all current screenshots have a recorded baseline;
- repeated runs with the same seed are identical.

### Phase 1: Minimum-necessary curvature

Deliverables:

- exclude straight and near-zero routes from the automatic candidate set;
- normalize curvature by chord length;
- add relative and absolute curvature caps;
- reorder candidate search from shallow to deep;
- make outward direction the default structural preference after hard constraints;
- report excessive curvature count and magnitude.

Exit criteria:

- no automatic edge exceeds normalized curvature `0.55` when a feasible shallower route exists;
- unobstructed automatic edges retain a visible shallow curve;
- the QA 8 map no longer uses deep curves in its lower cluster;
- no regression in primary-loop crossings.

### Phase 2: Real clearance envelopes

Deliverables:

- theme-aware node envelopes;
- preferred node gap separate from literal overlap;
- edge, arrowhead, and polarity clearance checks;
- post-layout constrained spacing repair;
- spatial index for obstacle queries.

Exit criteria:

- QA 8 bottom nodes have at least the preferred Matcha gap;
- zero node-envelope overlaps across the fixture corpus;
- zero automatic edge-node intersections;
- no visible polarity-node collisions in publish mode.

### Phase 3: Lexicographic candidate gate

Deliverables:

- quality vector;
- hard rejection reasons;
- candidate diagnostics;
- stable tie-breaking;
- accepted-layout provenance.

Exit criteria:

- no reduction in edge length can compensate for a hard violation;
- the current authored layout always remains a candidate;
- `Reorganizar` cannot replace a layout with a structurally worse one.

### Phase 4: Ports, lanes, and hub routing

Deliverables:

- angular port allocator;
- incoming/outgoing separation;
- loop and bridge sectors;
- lane planner for parallel and shared corridors;
- annotation slots tied to ports.

Exit criteria:

- no two automatic incident edges leave a hub within the minimum angular gap unless explicitly
  assigned to parallel lanes;
- central clusters in both 16-variable maps remain traceable at default zoom;
- no arrowhead or polarity pileups at the QA 8 lower cluster.

### Phase 5: Visual cycle basis and region layout

Deliverables:

- strongly connected components;
- cycle overlap graph;
- ranked visual cycle basis;
- shared-hub placement;
- loop-region packing;
- bridge-corridor placement.

Exit criteria:

- primary cycles are visually recognizable without selecting them;
- overlapping cycles share deliberate junctions rather than averaged positions;
- unrelated loop regions do not interpenetrate;
- layout remains stable when a secondary relation is added.

### Phase 6: Joint node-route refinement

Deliverables:

- local node movement proposals triggered by extreme routes;
- reroute after neighborhood movement;
- global candidate search combining node and route alternatives;
- movement-stability penalty.

Exit criteria:

- a giant arc is not selected when moving an unlocked neighborhood slightly creates a shallow route;
- unrelated nodes stay within the stability budget;
- publish mode improves or preserves every structural metric relative to balanced mode.

### Phase 7: Large-map decomposition and workers

Deliverables:

- overview regions;
- semantic zoom rules by scale class;
- progressive edge and label disclosure;
- worker protocol for balanced and publish search;
- cancellable refinement jobs;
- cached topology and route geometry.

Exit criteria:

- 100-node fixtures remain interactive in overview mode;
- draft interaction stays responsive while publish refinement runs;
- expanding and collapsing a region preserves the mental map;
- standalone exports preserve the selected overview or region state.

### Phase 8: Product controls and diagnostics

Deliverables:

- `Curvatura: mínima | balanceada | expressiva` view setting;
- per-edge automatic/manual curvature state;
- `Refinar layout` with visible quality result;
- optional diagnostics overlay for collisions, crossings, ports, and route class;
- `Reverter refinamento` using layout history;
- `.loop.css` settings for route policy without exposing raw optimizer weights.

Exit criteria:

- common visual preferences require no raw numeric editing;
- manual overrides remain stable after reopen and export;
- users can understand why a route is deep or why a candidate was rejected.

## 12. Prioritized Engineering Backlog

### P0: correctness and immediate visual impact

1. `ROUTE-V2-001`: add zero and near-zero candidates.
2. `ROUTE-V2-002`: normalized curvature penalty and caps.
3. `LAYOUT-V2-001`: rendered node envelopes and preferred gap.
4. `QUALITY-V2-001`: lexicographic quality vector.
5. `QUALITY-V2-002`: excessive-curvature and tangency metrics.
6. `QA-V2-001`: fixture runner and baseline report.

### P1: hub and cycle composition

1. `ROUTE-V2-003`: angular ports.
2. `ROUTE-V2-004`: lane and corridor assignment.
3. `TOPOLOGY-V2-001`: SCC and visual cycle basis.
4. `LAYOUT-V2-002`: loop-region skeleton.
5. `LAYOUT-V2-003`: shared-hub placement.
6. `ANNOTATION-V2-001`: route-envelope integration.

### P2: scale and editing performance

1. `LAYOUT-V2-004`: local joint node-route repair.
2. `PERF-V2-001`: spatial obstacle index.
3. `PERF-V2-002`: workerized candidate evaluation.
4. `SCALE-V2-001`: region overview.
5. `SCALE-V2-002`: semantic disclosure profiles.
6. `UX-V2-001`: refinement and diagnostics UI.

## 13. Test Strategy

### 13.1 Unit tests

- curvature normalization and candidate ordering;
- obstacle-envelope intersection;
- node-gap repair;
- port-angle assignment;
- lane ordering;
- visual cycle basis stability;
- lexicographic comparison;
- deterministic random seeds;
- locked-element preservation.

### 13.2 Property tests

Generate deterministic graphs from 3 to 100 nodes and assert:

- finite positions and route geometry;
- no hard violations in accepted balanced/publish layouts;
- no locked displacement;
- bounded normalized curvature or an explicit exception reason;
- stable output for identical inputs;
- no quadratic explosion beyond declared scale budgets.

### 13.3 Visual regression

Capture each canonical fixture at:

- desktop with sidebar open;
- desktop with sidebar closed;
- focus mode;
- standalone export;
- default zoom and fit-to-view;
- balanced and publish quality.

Visual review must score:

- loop recognizability;
- traceability of every relation;
- node and annotation spacing;
- curvature restraint;
- negative-space balance;
- stability from the previous baseline.

### 13.4 Interaction tests

- drag a node and verify local preview latency;
- release and verify one-hop/two-hop repair;
- save, refresh, and compare exact geometry;
- add and remove a node without global layout collapse;
- lock a node and route, then reorganize;
- undo and restore the previous canonical layout;
- export and compare standalone geometry.

## 14. Definition Of Done

The V2 engine is not done because one screenshot looks good. It is done when:

- every canonical small and medium fixture passes hard constraints;
- QA 8 has comfortable lower-cluster spacing and restrained curves;
- both 16-variable fixtures have traceable central hubs and no excessive automatic arcs;
- publish quality never worsens the balanced quality vector;
- identical inputs produce identical accepted layouts;
- editing remains local and smooth;
- saved geometry survives refresh and standalone export;
- 100-node maps degrade into useful regions instead of unreadable full-detail hairballs;
- all failures return diagnostics rather than silently accepting a bad map.

## 15. Implementation Rules

- Preserve the current domain/geometry/routing/annotation/rendering boundaries.
- Do not replace the engine wholesale with a generic third-party graph editor.
- Use fCoSE/CoSE as candidate generators or refiners, not as the product's visual policy.
- Keep pure geometry independent of Cytoscape and DOM.
- Protect manual positions, ports, and route locks.
- Version automatic layout output so old projects remain reproducible.
- Never tune only against one fixture.
- Do not weaken hard constraints to hit a performance budget; switch quality mode or run async.

## 16. External Technical References

- fCoSE constraints and compound force-directed layout:
  <https://ivis-at-bilkent.github.io/cytoscape.js-fcose/>
- Eclipse Layout Kernel algorithms and routing options:
  <https://eclipse.dev/elk/reference.html>
- Graphviz circular layout reference:
  <https://graphviz.org/docs/layouts/circo/>
- WebCola constraint-based layout implementation:
  <https://github.com/tgdwyer/WebCola>

These are references and benchmark sources. They do not override the LoopViewer-specific causal-loop
semantics or the protected local-first architecture.
