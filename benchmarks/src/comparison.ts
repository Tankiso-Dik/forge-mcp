import { BENCHMARK_CATEGORY_MAX_SCORES } from "./constants.js";
import { readBenchmarkReport } from "./baselines.js";
import type {
  BenchmarkCaseComparison,
  BenchmarkCaseReport,
  BenchmarkCategory,
  BenchmarkComparison,
  BenchmarkSuiteReport
} from "./types.js";

function caseKey(caseReport: Pick<BenchmarkCaseReport, "id" | "transport">): string {
  return `${caseReport.id}::${caseReport.transport}`;
}

function compareCases(
  baselineCases: BenchmarkSuiteReport["cases"],
  currentCases: BenchmarkSuiteReport["cases"]
): BenchmarkCaseComparison[] {
  const baselineMap = new Map(baselineCases.map((entry) => [caseKey(entry), entry]));

  return currentCases.map((current) => {
    const baseline = baselineMap.get(caseKey(current));

    if (!baseline) {
      return {
        caseId: current.id,
        baselineTransport: "missing",
        currentTransport: current.transport,
        baselineStatus: "missing",
        currentStatus: current.status,
        currentDurationMs: current.durationMs
      };
    }

    return {
      caseId: current.id,
      baselineTransport: baseline.transport,
      currentTransport: current.transport,
      baselineStatus: baseline.status,
      currentStatus: current.status,
      baselineDurationMs: baseline.durationMs,
      currentDurationMs: current.durationMs,
      durationDeltaMs: current.durationMs - baseline.durationMs
    };
  });
}

function compareCategories(
  baselineScores: BenchmarkSuiteReport["categoryScores"],
  currentScores: BenchmarkSuiteReport["categoryScores"]
) {
  const baselineMap = new Map(baselineScores.map((entry) => [entry.category, entry]));

  return currentScores.map((current) => {
    const baseline = baselineMap.get(current.category);
    const baselineScore = baseline?.pointsAwarded ?? 0;

    return {
      category: current.category,
      baselineScore,
      currentScore: current.pointsAwarded,
      delta: current.pointsAwarded - baselineScore
    };
  });
}

function buildRegressions(
  baseline: BenchmarkSuiteReport,
  current: BenchmarkSuiteReport,
  caseComparisons: BenchmarkCaseComparison[],
  maxAllowedScoreDrop: number
): string[] {
  const regressions: string[] = [];
  const scoreDrop = baseline.totalScore - current.totalScore;

  if (scoreDrop > maxAllowedScoreDrop) {
    regressions.push(
      `Total score dropped by ${scoreDrop.toFixed(2)} points, exceeding the allowed drop of ${maxAllowedScoreDrop.toFixed(2)}.`
    );
  }

  for (const caseComparison of caseComparisons) {
    if (caseComparison.baselineStatus === "passed" && caseComparison.currentStatus === "failed") {
      regressions.push(`Case ${caseComparison.caseId} regressed from passed to failed.`);
    }
  }

  return regressions;
}

export async function compareReports(
  baselinePath: string,
  current: BenchmarkSuiteReport,
  maxAllowedScoreDrop: number
): Promise<BenchmarkComparison> {
  const baseline = await readBenchmarkReport(baselinePath);
  const categoryDeltas = compareCategories(baseline.categoryScores, current.categoryScores);
  const caseComparisons = compareCases(baseline.cases, current.cases);
  const regressions = buildRegressions(baseline, current, caseComparisons, maxAllowedScoreDrop);

  return {
    baselinePath,
    totalScoreDelta: current.totalScore - baseline.totalScore,
    maxAllowedScoreDrop,
    regressions,
    categoryDeltas,
    caseComparisons
  };
}

export function normalizeSuiteCategoryScores(
  cases: BenchmarkCaseReport[]
): BenchmarkSuiteReport["categoryScores"] {
  return (Object.keys(BENCHMARK_CATEGORY_MAX_SCORES) as BenchmarkCategory[]).map((category) => {
    let rawAwarded = 0;
    let rawMax = 0;

    for (const benchmarkCase of cases) {
      for (const check of benchmarkCase.checks) {
        if (check.category !== category) {
          continue;
        }

        rawAwarded += check.pointsAwarded;
        rawMax += check.maxPoints;
      }
    }

    const targetMax = BENCHMARK_CATEGORY_MAX_SCORES[category];
    const normalizedScore = rawMax === 0 ? 0 : Number(((rawAwarded / rawMax) * targetMax).toFixed(2));

    return {
      category,
      pointsAwarded: normalizedScore,
      maxPoints: targetMax
    };
  });
}
