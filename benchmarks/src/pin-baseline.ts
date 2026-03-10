import { pinBaseline } from "./baselines.js";

function parseArgs(argv: string[]): {
  sourceJsonReportPath: string;
  sourceMarkdownReportPath?: string;
  note?: string;
} {
  const options: {
    sourceJsonReportPath: string;
    sourceMarkdownReportPath?: string;
    note?: string;
  } = {
    sourceJsonReportPath: "benchmarks/reports/latest.json"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--source-json" && next) {
      options.sourceJsonReportPath = next;
    }

    if (value === "--source-markdown" && next) {
      options.sourceMarkdownReportPath = next;
    }

    if (value === "--note" && next) {
      options.note = next;
    }
  }

  return options;
}

async function main(): Promise<void> {
  const manifest = await pinBaseline(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
