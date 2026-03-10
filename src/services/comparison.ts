import type {
  ForgeCompareExecutionInput,
  ForgeCompareExecutionOutput,
  PhaseState,
  ProjectContextItem
} from "../types.js";
import { ForgeCompareExecutionOutputSchema } from "../schemas.js";
import type { ManagedForgeState } from "./state.js";
import { buildWorkingView } from "./working-view.js";

const STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "that",
  "this",
  "from",
  "into",
  "keep",
  "work",
  "file",
  "files",
  "phase",
  "step",
  "task",
  "project",
  "session",
  "current",
  "next"
]);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toTerms(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length >= 4 && !STOP_WORDS.has(term));
}

function hasOverlap(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return left.some((term) => rightSet.has(term));
}

function matchesFiles(targetFiles: string[], candidateFiles: string[]): boolean {
  return targetFiles.some((file) => candidateFiles.includes(file));
}

function matchContextItems(
  items: ProjectContextItem[],
  observedTerms: string[],
  files: string[]
): ProjectContextItem[] {
  return items.filter((item) => {
    const itemTerms = toTerms(`${item.title} ${item.detail}`);
    return hasOverlap(itemTerms, observedTerms) || matchesFiles(files, item.relatedFiles);
  });
}

function matchPhases(phases: PhaseState[], observedTerms: string[], files: string[]) {
  return phases.flatMap((phase) => {
    const phaseMatched =
      hasOverlap(toTerms(phase.title), observedTerms) || matchesFiles(files, phase.relatedFiles);

    const stepMatch = phase.steps.find((step) => {
      return hasOverlap(toTerms(step.title), observedTerms) || matchesFiles(files, step.relatedFiles);
    });

    if (!phaseMatched && !stepMatch) {
      return [];
    }

    return [{
      phaseId: phase.id,
      phaseTitle: phase.title,
      via: phaseMatched && stepMatch ? "phase_and_step" : phaseMatched ? "phase" : "step"
    }] as const;
  });
}

function buildStaleAssumptions(input: {
  matchingDecisions: ProjectContextItem[];
  matchingArchitecture: ProjectContextItem[];
  workingView: ReturnType<typeof buildWorkingView>;
  files: string[];
}): string[] {
  const stale: string[] = [];

  for (const item of [...input.matchingDecisions, ...input.matchingArchitecture]) {
    const linkedConflict = input.workingView.openIssues.find((issue) =>
      matchesFiles(item.relatedFiles, issue.relatedFiles)
    );
    if (linkedConflict) {
      stale.push(`'${item.title}' is under tension with open issue '${linkedConflict.title}'.`);
      continue;
    }

    const linkedDrift = input.workingView.openDrift.find((drift) =>
      matchesFiles(item.relatedFiles, drift.relatedFiles)
    );
    if (linkedDrift) {
      stale.push(`'${item.title}' is under tension with open drift '${linkedDrift.summary}'.`);
    }
  }

  if (
    input.files.length > 0 &&
    input.files.every(
      (file) => !input.workingView.linkedFiles.some((linked) => linked.path === file)
    )
  ) {
    stale.push("The observed files are not linked to the current continuity state yet.");
  }

  return stale.slice(0, 4);
}

export function compareExecutionAgainstForge(
  state: ManagedForgeState,
  input: ForgeCompareExecutionInput
): ForgeCompareExecutionOutput {
  const workingView = buildWorkingView(
    { version: 1, constraints: [], preferences: [] },
    state.memory,
    state.plan,
    state.phases.phases,
    state.location.projectRoot
  );

  const files = input.files ?? [];
  const observedTerms = toTerms(input.observedExecution);
  const matchingDecisions = matchContextItems(state.memory.decisions, observedTerms, files);
  const matchingArchitecture = matchContextItems(
    state.plan.architectureDecisions,
    observedTerms,
    files
  );
  const matchingPhases = matchPhases(workingView.activePhases, observedTerms, files);
  const relatedOpenIssues = state.memory.issues.filter((issue) => {
    return issue.status === "open" && (
      hasOverlap(toTerms(`${issue.title} ${issue.detail ?? ""}`), observedTerms) ||
      matchesFiles(files, issue.relatedFiles)
    );
  });
  const relatedOpenDrift = state.memory.driftLog.filter((drift) => {
    return drift.status !== "resolved" && (
      hasOverlap(toTerms(`${drift.summary} ${drift.detail ?? ""}`), observedTerms) ||
      matchesFiles(files, drift.relatedFiles)
    );
  });

  const staleAssumptions = buildStaleAssumptions({
    matchingDecisions,
    matchingArchitecture,
    workingView,
    files
  });

  let alignment: ForgeCompareExecutionOutput["alignment"] = "aligned";
  if (relatedOpenDrift.some((entry) => entry.requiresAttention || entry.severity === "high" || entry.severity === "critical")) {
    alignment = "drift_risk";
  } else if (
    relatedOpenIssues.length > 0 ||
    staleAssumptions.length > 0 ||
    (matchingDecisions.length === 0 && matchingArchitecture.length === 0 && matchingPhases.length === 0)
  ) {
    alignment = "needs_review";
  }

  if (
    matchingDecisions.length === 0 &&
    matchingArchitecture.length === 0 &&
    matchingPhases.length === 0 &&
    (workingView.activePhases.length > 0 || workingView.openDrift.length > 0)
  ) {
    alignment = "drift_risk";
  }

  const impactedFiles = [
    ...new Set([
      ...files,
      ...matchingDecisions.flatMap((item) => item.relatedFiles),
      ...matchingArchitecture.flatMap((item) => item.relatedFiles),
      ...relatedOpenIssues.flatMap((item) => item.relatedFiles),
      ...relatedOpenDrift.flatMap((item) => item.relatedFiles)
    ])
  ].slice(0, 8);

  const suggestedActions: string[] = [];
  if (alignment === "drift_risk") {
    suggestedActions.push("Compare this execution path against active drift and consider `forge_flag_drift` before continuing.");
  }
  if (relatedOpenIssues[0]) {
    suggestedActions.push(`Review open issue '${relatedOpenIssues[0].title}' before extending scope.`);
  }
  if (workingView.doNow) {
    suggestedActions.push(`Re-anchor on the current guidance: ${workingView.doNow}`);
  }
  if (workingView.notYet[0]) {
    suggestedActions.push(`Keep '${workingView.notYet[0]}' deferred until the current work is reconciled.`);
  }

  const collaborationBrief = [
    workingView.openIssues[0]
      ? `There is an open issue affecting current work: ${workingView.openIssues[0].title}.`
      : undefined,
    workingView.recentDecisions[0]
      ? `A prior decision still matters here: ${workingView.recentDecisions[0].title}.`
      : undefined,
    workingView.notYet[0]
      ? `This session should avoid starting: ${workingView.notYet[0]}.`
      : undefined
  ].filter((value): value is string => Boolean(value));

  const summary =
    alignment === "aligned"
      ? "Observed execution still aligns with the current Forge memory and active phases."
      : alignment === "needs_review"
        ? "Observed execution overlaps current project memory, but unresolved tension means it should be reviewed before continuing."
        : "Observed execution is moving ahead of the current aligned plan and should be treated as drift risk.";

  const rationale =
    alignment === "aligned"
      ? "The execution path maps cleanly to active phases or prior decisions without conflicting open tension."
      : alignment === "needs_review"
        ? "The execution path touches current project context, but there are unresolved issues or stale assumptions that could make the older state unsafe."
        : "The execution path does not map cleanly to the current aligned work, or it conflicts with open high-attention drift.";

  return ForgeCompareExecutionOutputSchema.parse({
    status: "ok",
    tool: "forge_compare_execution",
    alignment,
    summary,
    rationale,
    matchingDecisions: matchingDecisions.slice(0, 4).map((item) => ({ id: item.id, title: item.title })),
    matchingArchitecture: matchingArchitecture.slice(0, 4).map((item) => ({ id: item.id, title: item.title })),
    matchingPhases: matchingPhases.slice(0, 4),
    relatedOpenIssues: relatedOpenIssues.slice(0, 4).map((item) => ({ id: item.id, title: item.title })),
    relatedOpenDrift: relatedOpenDrift.slice(0, 4).map((item) => ({
      id: item.id,
      summary: item.summary,
      severity: item.severity
    })),
    impactedFiles,
    staleAssumptions,
    suggestedActions: suggestedActions.slice(0, 4),
    collaborationBrief: collaborationBrief.slice(0, 3)
  });
}
