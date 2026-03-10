import { runBenchmarkSuite } from "./runner.js";

function parseArgs(argv: string[]): {
  caseId?: string;
  layer?: string;
  comparePath?: string;
  comparePinned: boolean;
  maxScoreDrop?: number;
  failOnRegression: boolean;
  transport?: "in-process" | "stdio";
} {
  const options: {
    caseId?: string;
    layer?: string;
    comparePath?: string;
    comparePinned: boolean;
    maxScoreDrop?: number;
    failOnRegression: boolean;
    transport?: "in-process" | "stdio";
  } = {
    comparePinned: false,
    failOnRegression: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--case" && next) {
      options.caseId = next;
    }

    if (value === "--layer" && next) {
      options.layer = next;
    }

    if (value === "--compare" && next) {
      options.comparePath = next;
    }

    if (value === "--compare-pinned") {
      options.comparePinned = true;
    }

    if (value === "--max-score-drop" && next) {
      options.maxScoreDrop = Number(next);
    }

    if (value === "--transport" && next && (next === "in-process" || next === "stdio")) {
      options.transport = next;
    }

    if (value === "--fail-on-regression") {
      options.failOnRegression = true;
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const report = await runBenchmarkSuite(options);
  console.log(
    JSON.stringify(
      {
        totalScore: report.totalScore,
        maxScore: report.maxScore,
        caseCount: report.cases.length,
        transports: [...new Set(report.cases.map((entry) => entry.transport))],
        comparison: report.comparison
          ? {
              baselinePath: report.comparison.baselinePath,
              totalScoreDelta: report.comparison.totalScoreDelta,
              regressions: report.comparison.regressions
            }
          : null,
        jsonReportPath: report.jsonReportPath,
        markdownReportPath: report.markdownReportPath,
        logFilePath: report.logFilePath
      },
      null,
      2
    )
  );

  if (options.failOnRegression && report.comparison && report.comparison.regressions.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
