import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  BENCHMARK_BASELINES_DIR,
  BENCHMARK_PINNED_BASELINE_MANIFEST
} from "./constants.js";
import type { BenchmarkSuiteReport, PinnedBaselineManifest } from "./types.js";

const BENCHMARK_BASELINE_VERSION = 1;

interface PinBaselineOptions {
  sourceJsonReportPath: string;
  sourceMarkdownReportPath?: string;
  note?: string;
}

function resolveBaselinePath(relativeOrAbsolutePath: string): string {
  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.resolve(relativeOrAbsolutePath);
}

export async function readBenchmarkReport(reportPath: string): Promise<BenchmarkSuiteReport> {
  const raw = await readFile(resolveBaselinePath(reportPath), "utf8");
  return JSON.parse(raw) as BenchmarkSuiteReport;
}

export async function pinBaseline(options: PinBaselineOptions): Promise<PinnedBaselineManifest> {
  await mkdir(BENCHMARK_BASELINES_DIR, { recursive: true });

  const sourceJsonReportPath = resolveBaselinePath(options.sourceJsonReportPath);
  const sourceMarkdownReportPath = options.sourceMarkdownReportPath
    ? resolveBaselinePath(options.sourceMarkdownReportPath)
    : sourceJsonReportPath.replace(/\.json$/u, ".md");
  const pinnedJsonPath = path.join(BENCHMARK_BASELINES_DIR, "pinned-report.json");
  const pinnedMarkdownPath = path.join(BENCHMARK_BASELINES_DIR, "pinned-report.md");

  await copyFile(sourceJsonReportPath, pinnedJsonPath);
  await copyFile(sourceMarkdownReportPath, pinnedMarkdownPath);

  const manifest: PinnedBaselineManifest = {
    pinnedAt: new Date().toISOString(),
    benchmarkVersion: BENCHMARK_BASELINE_VERSION,
    jsonReportPath: pinnedJsonPath,
    markdownReportPath: pinnedMarkdownPath,
    sourceJsonReportPath,
    sourceMarkdownReportPath
  };

  if (options.note) {
    manifest.note = options.note;
  }

  await writeFile(BENCHMARK_PINNED_BASELINE_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return manifest;
}

export async function getPinnedBaselineReportPath(): Promise<string> {
  const raw = await readFile(BENCHMARK_PINNED_BASELINE_MANIFEST, "utf8");
  const manifest = JSON.parse(raw) as PinnedBaselineManifest;
  return manifest.jsonReportPath;
}
