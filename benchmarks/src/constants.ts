import path from "node:path";

import type { BenchmarkCategory, BenchmarkLayer } from "./types.js";

export const BENCHMARK_ROOT = path.resolve(process.cwd(), "benchmarks");
export const BENCHMARK_FIXTURES_DIR = path.join(BENCHMARK_ROOT, "fixtures");
export const BENCHMARK_REPORTS_DIR = path.join(BENCHMARK_ROOT, "reports");
export const BENCHMARK_LOGS_DIR = path.join(BENCHMARK_ROOT, "logs");
export const BENCHMARK_BASELINES_DIR = path.join(BENCHMARK_ROOT, "baselines");
export const BENCHMARK_PINNED_BASELINE_MANIFEST = path.join(
  BENCHMARK_BASELINES_DIR,
  "pinned.json"
);

export const BENCHMARK_CATEGORY_MAX_SCORES: Record<BenchmarkCategory, number> = {
  mcp_correctness: 30,
  agent_workflow_quality: 25,
  continuity_quality: 20,
  drift_handling: 15,
  performance: 10
};

export const BENCHMARK_LAYER_ORDER: BenchmarkLayer[] = [
  "tool-correctness",
  "workflow-scenarios",
  "end-to-end"
];

export const BENCHMARK_THRESHOLDS = {
  fastLoadMs: 250,
  fastWriteMs: 300,
  workflowMs: 800,
  stressRunMs: 1800,
  stdioStartupMs: 600,
  reasonablePayloadBytes: 20_000,
  largeFixtureLoadMs: 600,
  largeFixtureWriteMs: 700,
  largeFixturePayloadBytes: 80_000
} as const;
