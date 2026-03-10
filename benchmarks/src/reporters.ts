import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { BENCHMARK_REPORTS_DIR } from "./constants.js";
import type { BenchmarkSuiteReport } from "./types.js";

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function renderMarkdownReport(report: BenchmarkSuiteReport): string {
  const lines: string[] = [
    "# Forge Benchmark Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Total score: ${report.totalScore}/${report.maxScore}`,
    `Duration: ${report.durationMs.toFixed(2)}ms`,
    "",
    "## Category Scores",
    "",
    "| Category | Score |",
    "| --- | ---: |"
  ];

  for (const categoryScore of report.categoryScores) {
    lines.push(
      `| ${categoryScore.category} | ${categoryScore.pointsAwarded}/${categoryScore.maxPoints} |`
    );
  }

  if (report.comparison) {
    lines.push("", "## Comparison", "");
    lines.push(`Baseline: ${report.comparison.baselinePath}`);
    lines.push(`Total score delta: ${report.comparison.totalScoreDelta.toFixed(2)}`);
    lines.push(`Allowed score drop: ${report.comparison.maxAllowedScoreDrop.toFixed(2)}`);
    lines.push("");
    lines.push("| Category | Baseline | Current | Delta |");
    lines.push("| --- | ---: | ---: | ---: |");
    for (const delta of report.comparison.categoryDeltas) {
      lines.push(
        `| ${delta.category} | ${delta.baselineScore} | ${delta.currentScore} | ${delta.delta.toFixed(2)} |`
      );
    }
    lines.push("");

    lines.push("| Case | Baseline | Current | Duration Delta (ms) |");
    lines.push("| --- | --- | --- | ---: |");
    for (const caseComparison of report.comparison.caseComparisons) {
      lines.push(
        `| ${caseComparison.caseId} | ${caseComparison.baselineStatus} (${caseComparison.baselineTransport}) | ${caseComparison.currentStatus} (${caseComparison.currentTransport}) | ${
          caseComparison.durationDeltaMs?.toFixed(2) ?? "n/a"
        } |`
      );
    }
    lines.push("");

    if (report.comparison.regressions.length > 0) {
      lines.push("Regressions:");
      for (const regression of report.comparison.regressions) {
        lines.push(`- ${regression}`);
      }
      lines.push("");
    }
  }

  lines.push("", "## Case Results", "");

  for (const caseReport of report.cases) {
    lines.push(`### ${caseReport.id} — ${caseReport.title}`);
    lines.push(`- Layer: ${caseReport.layer}`);
    lines.push(`- Fixture: ${caseReport.fixture}`);
    lines.push(`- Transport: ${caseReport.transport}`);
    lines.push(`- Status: ${caseReport.status}`);
    lines.push(`- Duration: ${caseReport.durationMs.toFixed(2)}ms`);
    lines.push(`- Startup: ${caseReport.startupDurationMs.toFixed(2)}ms`);
    lines.push(`- Summary: ${caseReport.summary}`);
    if (caseReport.failures.length > 0) {
      lines.push(`- Failures: ${caseReport.failures.join("; ")}`);
    }
    if (caseReport.recommendations.length > 0) {
      lines.push(`- Recommendations: ${caseReport.recommendations.join("; ")}`);
    }
    lines.push("");

    if (caseReport.artifacts.length > 0) {
      lines.push("Artifacts:");
      for (const artifact of caseReport.artifacts) {
        lines.push(`- ${artifact.label} (${artifact.kind})`);
        lines.push("```text");
        lines.push(artifact.content.length > 600 ? `${artifact.content.slice(0, 597)}...` : artifact.content);
        lines.push("```");
      }
    }

    lines.push("");
  }

  if (report.failures.length > 0) {
    lines.push("## Failures", "");
    for (const failure of report.failures) {
      lines.push(`- ${failure}`);
    }
    lines.push("");
  }

  if (report.recommendations.length > 0) {
    lines.push("## Recommendations", "");
    for (const recommendation of report.recommendations) {
      lines.push(`- ${recommendation}`);
    }
    lines.push("");
  }

  lines.push(`Live log: ${report.logFilePath}`);

  return lines.join("\n");
}

export async function writeReports(
  report: BenchmarkSuiteReport
): Promise<{ jsonReportPath: string; markdownReportPath: string }> {
  await mkdir(BENCHMARK_REPORTS_DIR, { recursive: true });

  const timestamp = timestampForFile();
  const jsonReportPath = path.join(BENCHMARK_REPORTS_DIR, `benchmark-${timestamp}.json`);
  const markdownReportPath = path.join(BENCHMARK_REPORTS_DIR, `benchmark-${timestamp}.md`);
  const latestJsonPath = path.join(BENCHMARK_REPORTS_DIR, "latest.json");
  const latestMarkdownPath = path.join(BENCHMARK_REPORTS_DIR, "latest.md");

  const finalizedReport = {
    ...report,
    jsonReportPath,
    markdownReportPath
  } satisfies BenchmarkSuiteReport;

  await writeFile(jsonReportPath, `${JSON.stringify(finalizedReport, null, 2)}\n`, "utf8");
  await writeFile(markdownReportPath, `${renderMarkdownReport(finalizedReport)}\n`, "utf8");
  await writeFile(latestJsonPath, `${JSON.stringify(finalizedReport, null, 2)}\n`, "utf8");
  await writeFile(latestMarkdownPath, `${renderMarkdownReport(finalizedReport)}\n`, "utf8");

  return { jsonReportPath, markdownReportPath };
}
