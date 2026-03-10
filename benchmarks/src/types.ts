export type BenchmarkLayer = "tool-correctness" | "workflow-scenarios" | "end-to-end";
export type BenchmarkTransport = "in-process" | "stdio";

export type BenchmarkCategory =
  | "mcp_correctness"
  | "agent_workflow_quality"
  | "continuity_quality"
  | "drift_handling"
  | "performance";

export type BenchmarkArtifactKind = "json" | "markdown" | "text";

export interface BenchmarkArtifact {
  label: string;
  kind: BenchmarkArtifactKind;
  content: string;
}

export interface BenchmarkCheckResult {
  id: string;
  description: string;
  category: BenchmarkCategory;
  passed: boolean;
  pointsAwarded: number;
  maxPoints: number;
  details?: string;
}

export interface BenchmarkCaseOutcome {
  summary: string;
  checks: BenchmarkCheckResult[];
  artifacts: BenchmarkArtifact[];
  recommendations: string[];
}

export interface BenchmarkToolCallRecord {
  tool: string;
  startedAt: string;
  durationMs: number;
  success: boolean;
  inputPreview: string;
}

export interface BenchmarkCategoryScore {
  category: BenchmarkCategory;
  pointsAwarded: number;
  maxPoints: number;
}

export interface BenchmarkCategoryComparison {
  category: BenchmarkCategory;
  baselineScore: number;
  currentScore: number;
  delta: number;
}

export interface BenchmarkCaseComparison {
  caseId: string;
  baselineTransport: BenchmarkTransport | "missing";
  currentTransport: BenchmarkTransport;
  baselineStatus: "passed" | "failed" | "missing";
  currentStatus: "passed" | "failed";
  baselineDurationMs?: number;
  currentDurationMs: number;
  durationDeltaMs?: number;
}

export interface BenchmarkComparison {
  baselinePath: string;
  totalScoreDelta: number;
  maxAllowedScoreDrop: number;
  regressions: string[];
  categoryDeltas: BenchmarkCategoryComparison[];
  caseComparisons: BenchmarkCaseComparison[];
}

export interface BenchmarkCaseReport {
  id: string;
  title: string;
  description: string;
  fixture: string;
  layer: BenchmarkLayer;
  durationMs: number;
  summary: string;
  checks: BenchmarkCheckResult[];
  toolCalls: BenchmarkToolCallRecord[];
  categoryScores: BenchmarkCategoryScore[];
  artifacts: BenchmarkArtifact[];
  recommendations: string[];
  failures: string[];
  status: "passed" | "failed";
  startupDurationMs: number;
  transport: BenchmarkTransport;
}

export interface BenchmarkSuiteReport {
  generatedAt: string;
  durationMs: number;
  categoryScores: BenchmarkCategoryScore[];
  totalScore: number;
  maxScore: number;
  cases: BenchmarkCaseReport[];
  failures: string[];
  recommendations: string[];
  logFilePath: string;
  comparison?: BenchmarkComparison;
  jsonReportPath?: string;
  markdownReportPath?: string;
}

export interface FixtureManifest {
  name: string;
  description: string;
  entryCwd?: string;
}

export interface PinnedBaselineManifest {
  pinnedAt: string;
  benchmarkVersion: number;
  jsonReportPath: string;
  markdownReportPath: string;
  sourceJsonReportPath?: string;
  sourceMarkdownReportPath?: string;
  note?: string;
}

export interface MaterializedFixture {
  name: string;
  description: string;
  sourceDir: string;
  workspaceDir: string;
  entryCwd: string;
  resolve(relativePath?: string): string;
  readJson<T>(relativePath: string): Promise<T>;
  readText(relativePath: string): Promise<string>;
}

export interface BenchmarkCaseContext {
  fixture: MaterializedFixture;
  client: ForgeBenchmarkClient;
  log(message: string): Promise<void>;
}

export interface BenchmarkCaseDefinition {
  id: string;
  title: string;
  description: string;
  fixture: string;
  layer: BenchmarkLayer;
  transport?: BenchmarkTransport;
  run(context: BenchmarkCaseContext): Promise<BenchmarkCaseOutcome>;
}

export interface ForgeBenchmarkClient {
  readonly transport: BenchmarkTransport;
  readonly startupDurationMs: number;
  invoke(tool: string, input: unknown): Promise<unknown>;
  getToolCalls(): BenchmarkToolCallRecord[];
  close(): Promise<void>;
}
