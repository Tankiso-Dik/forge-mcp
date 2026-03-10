import { existsSync } from "node:fs";
import path from "node:path";

import type {
  DriftRecord,
  ForgeConfidence,
  ForgeEngagementMode,
  ForgeProjectScale,
  ForgeReasonCode,
  ForgeWriteStyle,
  GlobalState,
  MemoryState,
  ObservationRecord,
  PhaseState,
  PlanState,
  ProjectContextItem,
  IssueRecord,
  WorkingView
} from "../types.js";

function sortNewestFirst<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function rankDrift(record: DriftRecord): number {
  switch (record.severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
}

function sortOpenDrift(records: DriftRecord[]): DriftRecord[] {
  return [...records].sort((left, right) => {
    const severityDelta = rankDrift(right) - rankDrift(left);
    if (severityDelta !== 0) {
      return severityDelta;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function determineProjectScale(memory: MemoryState, plan: PlanState, phases: PhaseState[]): ForgeProjectScale {
  const totalStateItems =
    memory.decisions.length +
    memory.triedAndAbandoned.length +
    memory.observations.length +
    memory.habits.length +
    memory.favouritePrompts.length +
    memory.issues.length +
    memory.driftLog.length +
    memory.concerns.length +
    plan.stack.length +
    plan.designStyle.length +
    plan.coreFeatures.length +
    plan.plannedFeatures.length +
    plan.architectureDecisions.length +
    plan.acceptedSuggestions.length +
    phases.length +
    phases.reduce((sum, phase) => sum + phase.steps.length, 0);

  if (totalStateItems >= 35) {
    return "large";
  }

  if (totalStateItems >= 15) {
    return "medium";
  }

  return "small";
}

function hasHighAttentionDrift(openDrift: DriftRecord[]): boolean {
  return openDrift.some((record) => record.requiresAttention || rankDrift(record) >= 3);
}

function determineEngagementMode(input: {
  projectScale: ForgeProjectScale;
  hasSession: boolean;
  activePhases: PhaseState[];
  openIssuesCount: number;
  openDrift: DriftRecord[];
}): ForgeEngagementMode {
  const highAttentionDrift = hasHighAttentionDrift(input.openDrift);
  const hasAnyActiveState =
    input.hasSession || input.activePhases.length > 0 || input.openIssuesCount > 0 || input.openDrift.length > 0;

  if (
    highAttentionDrift ||
    input.activePhases.length >= 2 ||
    input.openIssuesCount >= 2 ||
    (input.projectScale === "large" && hasAnyActiveState)
  ) {
    return "managed";
  }

  if (
    input.projectScale === "medium" ||
    input.hasSession ||
    input.activePhases.length > 0 ||
    input.openIssuesCount > 0 ||
    input.openDrift.length > 0
  ) {
    return "light";
  }

  return "none";
}

function buildReasonCodes(input: {
  projectScale: ForgeProjectScale;
  hasSession: boolean;
  activePhases: PhaseState[];
  openIssuesCount: number;
  openDrift: DriftRecord[];
  denseNotes: boolean;
}): ForgeReasonCode[] {
  const codes: ForgeReasonCode[] = [];

  if (input.hasSession) {
    codes.push("session_handoff_present");
  }
  if (input.activePhases.length > 0) {
    codes.push("active_phase_present");
  }
  if (input.activePhases.length >= 2) {
    codes.push("multiple_active_phases");
  }
  if (input.openIssuesCount > 0) {
    codes.push("open_issue_present");
  }
  if (input.openIssuesCount >= 2) {
    codes.push("multiple_open_issues");
  }
  if (input.openDrift.length > 0) {
    codes.push("open_drift_present");
  }
  if (hasHighAttentionDrift(input.openDrift)) {
    codes.push("high_attention_drift");
  }
  if (input.projectScale === "medium") {
    codes.push("project_medium_state");
  }
  if (input.projectScale === "large") {
    codes.push("project_large_state");
  }
  if (input.denseNotes) {
    codes.push("dense_notes");
  }
  if (codes.length === 0) {
    codes.push("quiet_project");
  }

  return codes;
}

function getNotYet(phases: PhaseState[]): string[] {
  const firstIncompleteIndex = phases.findIndex((phase) => phase.status !== "done");
  if (firstIncompleteIndex < 0) {
    return [];
  }

  return phases
    .slice(firstIncompleteIndex + 1)
    .filter((phase) => phase.status === "todo")
    .map((phase) => phase.title)
    .slice(0, 3);
}

function buildDoNow(input: {
  mode: ForgeEngagementMode;
  sessionNextStep: string | undefined;
  openDrift: DriftRecord[];
  openIssues: Array<{ title: string }>;
  activePhases: PhaseState[];
}): string | null {
  const highAttentionDrift = input.openDrift.find(
    (record) => record.requiresAttention || rankDrift(record) >= 3
  );
  if (highAttentionDrift) {
    return `Triage drift: ${highAttentionDrift.summary}`;
  }

  if (input.sessionNextStep) {
    return input.sessionNextStep;
  }

  if (input.openIssues[0]) {
    return `Address issue: ${input.openIssues[0].title}`;
  }

  if (input.activePhases[0]) {
    return `Advance phase: ${input.activePhases[0].title}`;
  }

  if (input.mode === "none") {
    return "Work directly in project files and skip extra Forge bookkeeping.";
  }

  return null;
}

function buildWhyThisMattersNow(input: {
  doNow: string | null;
  sessionPresent: boolean;
  openDrift: DriftRecord[];
  openIssues: Array<{ title: string }>;
  activePhases: PhaseState[];
}): string | null {
  if (!input.doNow) {
    return null;
  }

  const highAttentionDrift = input.openDrift.find(
    (record) => record.requiresAttention || rankDrift(record) >= 3
  );
  if (highAttentionDrift) {
    return "This contradiction affects current direction and should not be absorbed silently.";
  }

  if (input.openIssues[0]) {
    return "An open issue is already influencing later work, so resolving it stays higher value than starting new scope.";
  }

  if (input.activePhases[0]) {
    return "The current phase still has unfinished work, so advancing it keeps continuity cleaner than branching into later deliverables.";
  }

  if (input.sessionPresent) {
    return "A prior handoff already exists, so resuming from it is cheaper than re-planning from scratch.";
  }

  return null;
}

function buildWatchOut(input: {
  mode: ForgeEngagementMode;
  denseNotes: boolean;
  notYet: string[];
  openIssuesCount: number;
  openDrift: DriftRecord[];
  missingLinkedFilesCount: number;
}): string | null {
  if (input.missingLinkedFilesCount > 0) {
    return "Some continuity-linked files are missing locally; confirm whether the links are stale or the files still need to be created.";
  }

  if (input.denseNotes && input.mode === "managed" && input.openIssuesCount > 0) {
    return "State is already dense; prefer issue progress, phase updates, and handoffs over extra routine notes.";
  }

  if (input.denseNotes) {
    return "State is already dense; avoid logging low-value routine notes unless they change future work.";
  }

  if (input.openDrift.length > 0) {
    return "There is open drift in the project state; avoid silently continuing if new work conflicts with prior decisions.";
  }

  if (input.notYet.length > 0) {
    return "Do not start later-phase work until the current phase advances or the scope is explicitly rebuilt.";
  }

  return null;
}

function getUseForgeConfidence(input: {
  mode: ForgeEngagementMode;
  reasonCodes: ForgeReasonCode[];
}): ForgeConfidence {
  if (
    input.reasonCodes.includes("quiet_project") ||
    input.reasonCodes.includes("high_attention_drift") ||
    input.reasonCodes.includes("multiple_active_phases") ||
    input.reasonCodes.includes("multiple_open_issues")
  ) {
    return "high";
  }

  if (input.mode === "none") {
    return "medium";
  }

  return "medium";
}

function buildUseForgeReason(input: {
  mode: ForgeEngagementMode;
  projectScale: ForgeProjectScale;
  reasonCodes: ForgeReasonCode[];
}): string {
  if (input.reasonCodes.includes("quiet_project")) {
    return "The project is quiet enough that extra Forge writes would mostly be ceremony.";
  }

  if (input.reasonCodes.includes("high_attention_drift")) {
    return "High-attention drift is open, so continuity needs explicit managed handling.";
  }

  if (input.reasonCodes.includes("multiple_open_issues")) {
    return "Several open issues are already shaping the work, so Forge should stay actively engaged.";
  }

  if (input.reasonCodes.includes("multiple_active_phases")) {
    return "More than one incomplete phase is in play, so the project needs explicit continuity management.";
  }

  if (input.mode === "light") {
    return "There is enough active continuity state to justify a light resume-and-handoff workflow.";
  }

  return `The ${input.projectScale} project state benefits from explicit managed continuity.`;
}

function getRecommendedWriteStyle(
  mode: ForgeEngagementMode,
  denseNotes: boolean
): ForgeWriteStyle {
  if (mode === "none") {
    return "avoid";
  }

  if (mode === "light") {
    return denseNotes ? "minimal" : "normal";
  }

  return "managed";
}

function getTouchedAt(
  createdAt: string,
  updatedAt?: string,
  resolvedAt?: string
): string {
  return resolvedAt ?? updatedAt ?? createdAt;
}

function resolveLinkedFilePath(projectRoot: string, filePath: string): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRoot, filePath);
}

function buildLinkedFiles(input: {
  projectRoot: string;
  recentDecisions: ProjectContextItem[];
  recentConcerns: ProjectContextItem[];
  recentObservations: ObservationRecord[];
  openIssues: IssueRecord[];
  openDrift: DriftRecord[];
  architectureFocus: ProjectContextItem[];
  activePhases: PhaseState[];
}): WorkingView["linkedFiles"] {
  const linked = new Map<
    string,
    {
      reasons: Set<string>;
      owners: WorkingView["linkedFiles"][number]["owners"];
      currentPhaseOwners: WorkingView["linkedFiles"][number]["currentPhaseOwners"];
    }
  >();

  const add = (
    filePath: string,
    reason: string,
    owner: WorkingView["linkedFiles"][number]["owners"][number]
  ) => {
    if (!linked.has(filePath)) {
      linked.set(filePath, {
        reasons: new Set(),
        owners: [],
        currentPhaseOwners: []
      });
    }

    const entry = linked.get(filePath)!;
    entry.reasons.add(reason);
    if (!entry.owners.some((candidate) => candidate.type === owner.type && candidate.id === owner.id)) {
      entry.owners.push(owner);
    }
  };

  const addPhaseOwner = (
    filePath: string,
    owner: WorkingView["linkedFiles"][number]["currentPhaseOwners"][number]
  ) => {
    if (!linked.has(filePath)) {
      linked.set(filePath, {
        reasons: new Set(),
        owners: [],
        currentPhaseOwners: []
      });
    }

    const entry = linked.get(filePath)!;
    const existing = entry.currentPhaseOwners.find((candidate) => candidate.phaseId === owner.phaseId);
    if (!existing) {
      entry.currentPhaseOwners.push(owner);
      return;
    }

    if (existing.via === owner.via) {
      return;
    }

    if (existing.via !== "phase_and_step") {
      existing.via = "phase_and_step";
    }

    if (!existing.stepId && owner.stepId) {
      existing.stepId = owner.stepId;
    }
    if (!existing.stepTitle && owner.stepTitle) {
      existing.stepTitle = owner.stepTitle;
    }
  };

  for (const item of input.recentDecisions) {
    for (const filePath of item.relatedFiles) {
      add(filePath, `Decision: ${item.title}`, {
        type: "decision",
        id: item.id,
        title: item.title
      });
    }
  }

  for (const item of input.recentConcerns) {
    for (const filePath of item.relatedFiles) {
      add(filePath, `Concern: ${item.title}`, {
        type: "concern",
        id: item.id,
        title: item.title
      });
    }
  }

  for (const item of input.recentObservations) {
    for (const filePath of item.relatedFiles) {
      add(filePath, `Observation: ${item.summary}`, {
        type: "observation",
        id: item.id,
        title: item.summary
      });
    }
  }

  for (const item of input.openIssues) {
    for (const filePath of item.relatedFiles) {
      add(filePath, `Issue: ${item.title}`, {
        type: "issue",
        id: item.id,
        title: item.title,
        status: item.status
      });
    }
  }

  for (const item of input.openDrift) {
    for (const filePath of item.relatedFiles) {
      add(filePath, `Drift: ${item.summary}`, {
        type: "drift",
        id: item.id,
        title: item.summary,
        status: item.status
      });
    }
  }

  for (const item of input.architectureFocus) {
    for (const filePath of item.relatedFiles) {
      add(filePath, `Architecture: ${item.title}`, {
        type: "architecture",
        id: item.id,
        title: item.title
      });
    }
  }

  for (const phase of input.activePhases) {
    for (const filePath of phase.relatedFiles) {
      add(filePath, `Phase: ${phase.title}`, {
        type: "phase",
        id: phase.id,
        title: phase.title,
        status: phase.status
      });
      addPhaseOwner(filePath, {
        phaseId: phase.id,
        phaseTitle: phase.title,
        phaseStatus: phase.status,
        via: "phase"
      });
    }

    for (const step of phase.steps) {
      for (const filePath of step.relatedFiles) {
        add(filePath, `Step: ${phase.title} -> ${step.title}`, {
          type: "step",
          id: step.id,
          title: `${phase.title}: ${step.title}`,
          status: step.status
        });
        addPhaseOwner(filePath, {
          phaseId: phase.id,
          phaseTitle: phase.title,
          phaseStatus: phase.status,
          via: "step",
          stepId: step.id,
          stepTitle: step.title
        });
      }
    }
  }

  return [...linked.entries()]
    .map(([filePath, value]) => ({
      path: filePath,
      exists: existsSync(resolveLinkedFilePath(input.projectRoot, filePath)),
      reasons: [...value.reasons].slice(0, 4),
      owners: value.owners.slice(0, 4),
      currentPhaseOwners: value.currentPhaseOwners.slice(0, 4),
      primaryCurrentPhaseOwner: value.currentPhaseOwners[0] ?? null
    }))
    .sort((left, right) => right.owners.length - left.owners.length || left.path.localeCompare(right.path))
    .slice(0, 6);
}

function buildResumeDiff(input: {
  sessionUpdatedAt: string | undefined;
  sessionPreviousUpdatedAt: string | undefined;
  decisions: ProjectContextItem[];
  concerns: ProjectContextItem[];
  observations: ObservationRecord[];
  issues: IssueRecord[];
  drift: DriftRecord[];
  architectureDecisions: ProjectContextItem[];
}): WorkingView["resumeDiff"] {
  const since = input.sessionPreviousUpdatedAt ?? input.sessionUpdatedAt;
  if (!since) {
    return null;
  }
  const changedDecisions = [...input.decisions, ...input.architectureDecisions]
    .filter((item) => getTouchedAt(item.createdAt, item.updatedAt) > since);
  const changedConcerns = input.concerns.filter((item) => getTouchedAt(item.createdAt, item.updatedAt) > since);
  const changedObservations = input.observations.filter((item) => item.createdAt > since);
  const changedIssues = input.issues.filter((item) => getTouchedAt(item.createdAt, item.updatedAt, item.resolvedAt) > since);
  const changedDrift = input.drift.filter((item) => getTouchedAt(item.createdAt, item.updatedAt) > since);

  const changedFiles = new Set<string>();
  for (const entry of [
    ...changedDecisions,
    ...changedConcerns,
    ...changedObservations,
    ...changedIssues,
    ...changedDrift
  ]) {
    for (const path of entry.relatedFiles) {
      changedFiles.add(path);
    }
  }

  const changes: string[] = [];
  if (changedDecisions.length > 0) {
    changes.push(`${changedDecisions.length} decision or architecture item changed.`);
  }
  if (changedIssues.length > 0) {
    changes.push(`${changedIssues.length} issue record changed.`);
  }
  if (changedDrift.length > 0) {
    changes.push(`${changedDrift.length} drift record changed.`);
  }
  if (changedObservations.length > 0) {
    changes.push(`${changedObservations.length} observation or note was logged.`);
  }
  if (changedConcerns.length > 0) {
    changes.push(`${changedConcerns.length} concern was added or updated.`);
  }

  const newOpenIssues = changedIssues
    .filter((item) => item.status === "open")
    .slice(0, 3)
    .map((item) => ({ id: item.id, title: item.title }));
  const resolvedIssues = changedIssues
    .filter((item) => item.status === "resolved")
    .slice(0, 3)
    .map((item) => ({ id: item.id, title: item.title }));
  const changedDriftSummary = changedDrift
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      summary: item.summary,
      severity: item.severity,
      status: item.status
    }));
  const scopeShiftDetected =
    changedDrift.some((item) => rankDrift(item) >= 3) ||
    changedDecisions.length > 0;

  if (changes.length === 0 && changedFiles.size === 0) {
    return null;
  }

  return {
    since,
    summary:
      changes[0] ??
      "State changed since the last handoff.",
    changes: changes.slice(0, 5),
    changedFiles: [...changedFiles].slice(0, 6),
    newOpenIssues,
    resolvedIssues,
    changedDrift: changedDriftSummary,
    scopeShiftDetected
  };
}

export function buildWorkingView(
  global: GlobalState,
  memory: MemoryState,
  plan: PlanState,
  phases: PhaseState[],
  projectRoot: string
): WorkingView {
  const activePhases = phases.filter((phase) => phase.status !== "done");
  const openIssues = sortNewestFirst(memory.issues.filter((issue) => issue.status === "open")).slice(0, 5);
  const openDrift = sortOpenDrift(memory.driftLog.filter((record) => record.status !== "resolved")).slice(0, 5);
  const session =
    memory.session.summary || memory.session.nextStep || memory.session.updatedAt
      ? memory.session
      : null;
  const architectureFocus = sortNewestFirst(plan.architectureDecisions).slice(0, 5);
  const recentDecisions = sortNewestFirst(memory.decisions).slice(0, 5);
  const recentConcerns = sortNewestFirst(memory.concerns).slice(0, 5);
  const recentObservations = sortNewestFirst(memory.observations).slice(0, 5);
  const projectScale = determineProjectScale(memory, plan, phases);
  const denseNotes =
    memory.observations.length >= 10 ||
    memory.concerns.length >= 5 ||
    memory.habits.length >= 4;
  const notYet = getNotYet(phases);
  const mode = determineEngagementMode({
    projectScale,
    hasSession: session !== null,
    activePhases,
    openIssuesCount: openIssues.length,
    openDrift
  });
  const reasonCodes = buildReasonCodes({
    projectScale,
    hasSession: session !== null,
    activePhases,
    openIssuesCount: openIssues.length,
    openDrift,
    denseNotes
  });
  const doNow = buildDoNow({
    mode,
    sessionNextStep: session?.nextStep,
    openDrift,
    openIssues,
    activePhases
  });
  const linkedFiles = buildLinkedFiles({
    projectRoot,
    recentDecisions,
    recentConcerns,
    recentObservations,
    openIssues,
    openDrift,
    architectureFocus,
    activePhases
  });
  const missingLinkedFilesCount = linkedFiles.filter((entry) => !entry.exists).length;

  return {
    constraints: global.constraints,
    preferences: global.preferences,
    projectScale,
    useForge: {
      mode,
      confidence: getUseForgeConfidence({
        mode,
        reasonCodes
      }),
      reason: buildUseForgeReason({
        mode,
        projectScale,
        reasonCodes
      })
    },
    reasonCodes,
    doNow,
    whyThisMattersNow: buildWhyThisMattersNow({
      doNow,
      sessionPresent: session !== null,
      openDrift,
      openIssues,
      activePhases
    }),
    watchOut: buildWatchOut({
      mode,
      denseNotes,
      notYet,
      openIssuesCount: openIssues.length,
      openDrift,
      missingLinkedFilesCount
    }),
    notYet,
    recommendedWriteStyle: getRecommendedWriteStyle(mode, denseNotes),
    avoidLoggingNoise: mode === "none" || denseNotes,
    stateDensityWarning: denseNotes
      ? "Continuity state is already dense; prefer fewer high-value updates."
      : undefined,
    session,
    recentDecisions,
    recentConcerns,
    recentObservations,
    openIssues,
    activePhases: activePhases.slice(0, 5),
    openDrift,
    architectureFocus,
    linkedFiles,
    resumeDiff: buildResumeDiff({
      sessionUpdatedAt: session?.updatedAt,
      sessionPreviousUpdatedAt: session?.previousUpdatedAt,
      decisions: memory.decisions,
      concerns: memory.concerns,
      observations: memory.observations,
      issues: memory.issues,
      drift: memory.driftLog,
      architectureDecisions: plan.architectureDecisions
    })
  };
}
