import type { BenchmarkCategory, BenchmarkCheckResult } from "./types.js";

export function createCheck(
  id: string,
  description: string,
  category: BenchmarkCategory,
  passed: boolean,
  maxPoints: number,
  details?: string
): BenchmarkCheckResult {
  const result: BenchmarkCheckResult = {
    id,
    description,
    category,
    passed,
    pointsAwarded: passed ? maxPoints : 0,
    maxPoints
  };

  if (details !== undefined) {
    result.details = details;
  }

  return result;
}

export function createLatencyCheck(
  id: string,
  description: string,
  category: BenchmarkCategory,
  durationMs: number,
  thresholdMs: number,
  maxPoints: number
): BenchmarkCheckResult {
  return createCheck(
    id,
    description,
    category,
    durationMs <= thresholdMs,
    maxPoints,
    `Observed ${durationMs.toFixed(2)}ms against threshold ${thresholdMs}ms.`
  );
}
