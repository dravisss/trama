import { compilePresentation } from "./compiler.js";

/** Small deterministic harness used by CI and dense-map QA, without a browser. */
export function measurePresentationPerformance(presentation, context = {}, { budgetMs = 120 } = {}) {
  const start = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  const compiled = compilePresentation(presentation, context);
  const end = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  const compileMs = end - start;
  return {
    compileMs,
    timelineLength: compiled.timeline.length,
    valid: compiled.valid,
    withinBudget: compileMs <= budgetMs,
    compiled
  };
}

