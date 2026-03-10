import { BENCHMARK_LAYER_ORDER } from "../constants.js";
import type { BenchmarkCaseDefinition } from "../types.js";
import { endToEndCases } from "./end-to-end.js";
import { toolCorrectnessCases } from "./tool-correctness.js";
import { workflowScenarioCases } from "./workflow-scenarios.js";

const allCases = [...toolCorrectnessCases, ...workflowScenarioCases, ...endToEndCases];

export function getBenchmarkCases(): BenchmarkCaseDefinition[] {
  return [...allCases].sort(
    (left, right) =>
      BENCHMARK_LAYER_ORDER.indexOf(left.layer) - BENCHMARK_LAYER_ORDER.indexOf(right.layer)
  );
}
