import { compareReports, normalizeSuiteCategoryScores } from "./comparison.js";
import { getPinnedBaselineReportPath } from "./baselines.js";
import { materializeFixture } from "./fixtures.js";
import { createForgeBenchmarkClient } from "./forge-client.js";
import { LiveRunLogger } from "./logger.js";
import { writeReports } from "./reporters.js";
import type {
  BenchmarkCaseDefinition,
  BenchmarkCaseReport,
  BenchmarkCategoryScore,
  BenchmarkSuiteReport,
  BenchmarkTransport
} from "./types.js";
import { getBenchmarkCases } from "./cases/index.js";

function buildCaseCategoryScores(caseDefinition: BenchmarkCaseDefinition, checks: BenchmarkCaseReport["checks"]) {
  return checks.reduce<BenchmarkCategoryScore[]>((scores, check) => {
    const existing = scores.find((entry) => entry.category === check.category);
    if (existing) {
      existing.pointsAwarded += check.pointsAwarded;
      existing.maxPoints += check.maxPoints;
      return scores;
    }

    scores.push({
      category: check.category,
      pointsAwarded: check.pointsAwarded,
      maxPoints: check.maxPoints
    });
    return scores;
  }, []);
}

function normalizeFailureSummary(caseId: string, description: string, details?: string): string {
  return details ? `${caseId}: ${description} (${details})` : `${caseId}: ${description}`;
}

export async function runBenchmarkSuite(options?: {
  layer?: string;
  caseId?: string;
  comparePath?: string;
  comparePinned?: boolean;
  maxScoreDrop?: number;
  transport?: BenchmarkTransport;
}): Promise<BenchmarkSuiteReport> {
  const resolvedOptions = options ?? {};
  const logger = await LiveRunLogger.create();
  const started = performance.now();
  await logger.log("Benchmark suite started.");

  const cases = getBenchmarkCases().filter((entry) => {
    if (resolvedOptions.layer && entry.layer !== resolvedOptions.layer) {
      return false;
    }
    if (resolvedOptions.caseId && entry.id !== resolvedOptions.caseId) {
      return false;
    }
    return true;
  });

  const caseReports: BenchmarkCaseReport[] = [];

  for (const caseDefinition of cases) {
    await logger.log(`Starting case ${caseDefinition.id}.`);
    const fixture = await materializeFixture(caseDefinition.fixture);
    const transport = caseDefinition.transport ?? resolvedOptions.transport ?? "in-process";
    const client = await createForgeBenchmarkClient({
      transport,
      logger,
      caseId: caseDefinition.id
    });
    const caseStarted = performance.now();

    try {
      const outcome = await caseDefinition.run({
        fixture,
        client,
        log: (message) => logger.log(`[${caseDefinition.id}] ${message}`)
      });
      const durationMs = performance.now() - caseStarted;
      const failures = outcome.checks
        .filter((check) => !check.passed)
        .map((check) => normalizeFailureSummary(caseDefinition.id, check.description, check.details));
      const categoryScores = buildCaseCategoryScores(caseDefinition, outcome.checks);
      const caseReport: BenchmarkCaseReport = {
        id: caseDefinition.id,
        title: caseDefinition.title,
        description: caseDefinition.description,
        fixture: caseDefinition.fixture,
        layer: caseDefinition.layer,
        durationMs,
        summary: outcome.summary,
        checks: outcome.checks,
        toolCalls: client.getToolCalls(),
        categoryScores,
        artifacts: outcome.artifacts,
        recommendations: outcome.recommendations,
        failures,
        status: failures.length > 0 ? "failed" : "passed",
        startupDurationMs: client.startupDurationMs,
        transport: client.transport
      };
      caseReports.push(caseReport);
      await logger.log(
        `Finished case ${caseDefinition.id} status=${caseReport.status} durationMs=${durationMs.toFixed(2)}`
      );
    } catch (error) {
      const durationMs = performance.now() - caseStarted;
      const message = error instanceof Error ? error.message : String(error);
      caseReports.push({
        id: caseDefinition.id,
        title: caseDefinition.title,
        description: caseDefinition.description,
        fixture: caseDefinition.fixture,
        layer: caseDefinition.layer,
        durationMs,
        summary: "Case execution threw before deterministic checks completed.",
        checks: [],
        toolCalls: client.getToolCalls(),
        categoryScores: [],
        artifacts: [],
        recommendations: [`Fix the execution error for ${caseDefinition.id}: ${message}`],
        failures: [`${caseDefinition.id}: ${message}`],
        status: "failed",
        startupDurationMs: client.startupDurationMs,
        transport: client.transport
      });
      await logger.log(`Case ${caseDefinition.id} failed with error=${message}`);
    } finally {
      await client.close();
    }
  }

  const categoryScores = normalizeSuiteCategoryScores(caseReports);
  const totalScore = categoryScores.reduce((sum, entry) => sum + entry.pointsAwarded, 0);
  const maxScore = categoryScores.reduce((sum, entry) => sum + entry.maxPoints, 0);
  const failures = caseReports.flatMap((entry) => entry.failures);
  const recommendations = [...new Set(caseReports.flatMap((entry) => entry.recommendations))];
  let report: BenchmarkSuiteReport = {
    generatedAt: new Date().toISOString(),
    durationMs: performance.now() - started,
    categoryScores,
    totalScore,
    maxScore,
    cases: caseReports,
    failures,
    recommendations,
    logFilePath: logger.filePath
  };

  const comparePath = resolvedOptions.comparePinned
    ? await getPinnedBaselineReportPath()
    : resolvedOptions.comparePath;

  if (comparePath) {
    const comparison = await compareReports(
      comparePath,
      report,
      resolvedOptions.maxScoreDrop ?? 0
    );
    report = {
      ...report,
      comparison,
      failures: [...report.failures, ...comparison.regressions],
      recommendations: [...new Set([...report.recommendations, ...comparison.regressions])]
    };
    await logger.log(
      `Comparison complete baseline=${comparison.baselinePath} totalScoreDelta=${comparison.totalScoreDelta.toFixed(2)}`
    );
  }

  const { jsonReportPath, markdownReportPath } = await writeReports(report);
  await logger.log(`Benchmark suite finished. JSON=${jsonReportPath} Markdown=${markdownReportPath}`);

  return {
    ...report,
    jsonReportPath,
    markdownReportPath
  };
}
