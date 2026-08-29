# Spec Readiness Gaps

This document answers one question:

`Would a fresh coding agent, without the context of our conversation, have enough material to start implementing the full LoopViewer target product?`

Before this document set, the answer was:

- `enough to understand direction`
- `not enough to execute safely end-to-end`

This gap audit makes the missing pieces explicit and points to the documents that now close them.

## Readiness Verdict

Current state after this update:

- product direction: `ready`
- UX benchmark: `ready`
- Kumu reverse-engineering corpus: `ready`
- sidebar strategy: `ready`
- local-first/export stance: `ready`
- implementation handoff for a fresh agent: `ready`
- loop markdown / mermaid-like authoring spec: `ready for v1`
- phased execution plan: `ready`
- acceptance criteria by phase: `ready`
- exact UI copy and pixel-perfect mocks for every screen: `not fully specified`
- Story Mode V2 product, domain, UX and implementation plan: `ready`
- final parser grammar with zero ambiguity for every edge case: `not fully specified`

That means:

- a strong implementation agent can now begin;
- the first implementation pass should still expect iterative clarification on some detailed UI and DSL edge cases;
- the repo is no longer dependent on remembering this chat.

## Gaps That Existed

### 1. No explicit agent handoff document

Problem:

- the benchmark/spec existed, but a fresh agent still had to infer the implementation order, constraints, and repo anchors.

Now covered by:

- `docs/AGENT_IMPLEMENTATION_BRIEF.md`

### 2. The mermaid-like authoring goal was implied, not concretely specified

Problem:

- the spec talked about `Loop Markdown`, but it did not yet state clearly enough how this differs from Kumu’s relational-table-first model or what an MVP syntax should look like.

Now covered by:

- `docs/LOOP_LANGUAGE_SPEC.md`
- `docs/KUMU_BENCHMARK_AND_PRODUCT_SPEC.md`

### 3. Matcha theme continuity was not turned into an implementation rule

Problem:

- we knew the current visual language should be preserved, but this was not written as an execution constraint for an agent.

Now covered by:

- `docs/AGENT_IMPLEMENTATION_BRIEF.md`
- `src/themes/matcha.js`

### 4. The current repo strengths and invariants were not framed as “do not break” rules

Problem:

- a new agent might accidentally replace or regress the routing and export systems while trying to reach feature parity with Kumu.

Now covered by:

- `docs/AGENT_IMPLEMENTATION_BRIEF.md`
- `docs/KUMU_BENCHMARK_AND_PRODUCT_SPEC.md`

### 5. The difference between raw benchmark material and implementable product requirements was still fuzzy

Problem:

- we had research, but not a fully operational translation layer from research to engineering steps.

Now covered by:

- `docs/AGENT_IMPLEMENTATION_BRIEF.md`

### 6. The sidebar architecture was not explicitly consolidated

Problem:

- the Kumu sidebars were understood informally, but not documented as an architectural pattern.

Now covered by:

- `docs/KUMU_BENCHMARK_AND_PRODUCT_SPEC.md`

## Remaining Soft Spots

These do not block implementation start, but they are still areas where iteration will likely be needed.

### 1. Final DSL edge-case grammar

Still open:

- multiline bodies;
- escaping rules;
- aliasing for long labels;
- nested metadata blocks;
- merge behavior between authored text and GUI edits.

Expected handling:

- begin with the v1 grammar in `docs/LOOP_LANGUAGE_SPEC.md`;
- keep parser implementation modular so grammar can evolve.

### 2. Exact screen-by-screen UX spec

Still open:

- final nav labels;
- final onboarding flow;
- exact empty states for every panel;
- exact keyboard shortcut map for the full editor.

Expected handling:

- implement the structural shell first;
- iterate on content polish later.

### 3. Performance budget thresholds by interaction

Still open:

- hard target numbers for drag latency, route recompute times, and export build durations.

Expected handling:

- start with the architecture constraints and add profiling checkpoints during implementation.

## Minimum Document Set For A Fresh Agent

If an agent starts from zero, the minimum recommended reading order is:

1. `AGENTS.md`
2. `README.md`
3. `docs/ARCHITECTURE.md`
4. `docs/EXTENDING.md`
5. `docs/KUMU_BENCHMARK_AND_PRODUCT_SPEC.md`
6. `docs/AGENT_IMPLEMENTATION_BRIEF.md`
7. `docs/STORY_MODE_V2_PRODUCT_AND_IMPLEMENTATION_SPEC.md` when working on presentations
8. `docs/LOOP_LANGUAGE_SPEC.md`

## Practical Conclusion

Before this update, the project had:

- good research;
- good direction;
- insufficient handoff packaging.

After this update, the project has:

- benchmark research;
- local doc corpus;
- textual image analysis;
- product spec;
- language spec;
- implementation brief;
- gap audit.

This is enough for a competent agent to start implementing in a disciplined way without relying on this conversation.
