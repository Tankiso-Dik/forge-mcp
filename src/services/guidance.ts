import { ForgeSessionDraftOutputSchema, ForgeSuggestUpdateOutputSchema } from "../schemas.js";
import type {
  ForgeCheckpointInput,
  ForgeSessionDraftInput,
  ForgeSessionDraftOutput,
  ForgeSuggestUpdateInput,
  ForgeSuggestUpdateOutput,
  ForgeSuggestUpdateRecommendation,
  ObservationKind,
  PhaseStepRef
} from "../types.js";
import type { ManagedForgeState } from "./state.js";
import { buildWorkingView } from "./working-view.js";

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function lower(value: string | undefined): string {
  return (value ?? "").toLowerCase();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function resolveStepRefs(state: ManagedForgeState, refs: PhaseStepRef[] | undefined) {
  return (refs ?? []).flatMap((ref) => {
    const phase = state.phases.phases.find((entry) => entry.id === ref.phaseId);
    const step = phase?.steps.find((entry) => entry.id === ref.stepId);

    if (!phase || !step) {
      return [];
    }

    return [{
      phaseId: phase.id,
      stepId: step.id,
      title: step.title,
      note: ref.note
    }];
  });
}

function detectObservationKind(text: string): ObservationKind {
  if (includesAny(text, ["ambigu", "unclear", "not sure", "unsure"])) {
    return "ambiguous_item";
  }

  if (includesAny(text, ["struggl", "stuck", "hard to"])) {
    return "struggle";
  }

  if (includesAny(text, ["debt", "cleanup", "refactor later"])) {
    return "tech_debt";
  }

  if (includesAny(text, ["ui", "copy", "label", "layout"])) {
    return "ui_inconsistency";
  }

  if (includesAny(text, ["bug", "broken", "error", "fail"])) {
    return "bug";
  }

  if (includesAny(text, ["habit", "pattern", "repeatable"])) {
    return "habit_suggestion";
  }

  if (includesAny(text, ["concern", "risk"])) {
    return "concern";
  }

  return "note";
}

function buildSuggestionRationale(
  recommendation: ForgeSuggestUpdateRecommendation,
  workingViewMode: string
): string {
  switch (recommendation) {
    case "forge_checkpoint":
      return "This looks like a compact milestone update, so one checkpoint is lower friction than chaining multiple Forge writes.";
    case "forge_flag_drift":
      return "The event reads like a contradiction or scope conflict, so drift handling is clearer than a generic note.";
    case "forge_update":
      return "This changes durable project state, so a structured update is a better fit than a lightweight log entry.";
    case "forge_step_done":
      return "The event is primarily progress on known phase work, so marking the step is the clearest update.";
    case "forge_log":
      return "This is best captured as a lightweight observation instead of durable project state.";
    case "forge_session_end":
      return "This is mainly a closeout handoff, so a session-end update is the simplest correct tool.";
    case "none":
    default:
      return workingViewMode === "none"
        ? "The project is quiet enough that this does not need extra Forge state right now."
        : "This does not clearly justify a new Forge write over continuing work in files.";
  }
}

export function suggestForgeUpdate(
  state: ManagedForgeState,
  input: ForgeSuggestUpdateInput
): ForgeSuggestUpdateOutput {
  const workingView = buildWorkingView(
    { version: 1, constraints: [], preferences: [] },
    state.memory,
    state.plan,
    state.phases.phases,
    state.location.projectRoot
  );
  const summary = normalizeText(input.summary);
  const detail = input.detail ? normalizeText(input.detail) : undefined;
  const haystack = `${lower(summary)} ${lower(detail)}`;
  const resolvedSteps = resolveStepRefs(state, input.completedSteps);

  let recommendation: ForgeSuggestUpdateRecommendation = "none";
  let draft: ForgeSuggestUpdateOutput["draft"];
  let confidence: ForgeSuggestUpdateOutput["confidence"] = "medium";

  if (resolvedSteps.length > 0 && input.closingSession) {
    recommendation = "forge_checkpoint";
    draft = {
      tool: "forge_checkpoint",
      fields: {
        completedSteps: resolvedSteps.map(({ phaseId, stepId, note }) => ({ phaseId, stepId, note })),
        session: {
          summary,
          nextStep: state.memory.session.nextStep ?? workingView.doNow ?? "Resume from the latest milestone."
        }
      }
    };
    confidence = "high";
  } else if (resolvedSteps.length > 0) {
    recommendation = "forge_step_done";
    draft = {
      tool: "forge_step_done",
      fields: resolvedSteps[0]
        ? {
            phaseId: resolvedSteps[0].phaseId,
            stepId: resolvedSteps[0].stepId,
            note: resolvedSteps[0].note
          }
        : undefined
    };
    confidence = "high";
  } else if (input.closingSession) {
    recommendation = "forge_session_end";
    draft = {
      tool: "forge_session_end",
      fields: {
        summary,
        nextStep: state.memory.session.nextStep ?? workingView.doNow ?? "Resume from the latest continuity state."
      }
    };
    confidence = "high";
  } else if (includesAny(haystack, ["drift", "contradict", "scope change", "reversed", "conflict"])) {
    recommendation = "forge_flag_drift";
    draft = {
      tool: "forge_flag_drift",
      fields: {
        severity: includesAny(haystack, ["critical", "blocker", "must stop"]) ? "critical" : "high",
        summary,
        detail
      }
    };
    confidence = "high";
  } else if (includesAny(haystack, ["decided", "decision", "architecture", "adopt", "switch to"])) {
    const planScoped = includesAny(haystack, ["architecture", "stack", "design style", "feature", "scope"]);
    recommendation = "forge_update";
    draft = {
      tool: "forge_update",
      domain: planScoped ? "plan" : "memory",
      action: planScoped ? "add_architecture_decision" : "add_decision",
      fields: {
        title: summary,
        detail: detail ?? summary
      }
    };
    confidence = "medium";
  } else if (includesAny(haystack, ["issue", "blocked", "follow-up", "needs resolution", "open question"])) {
    recommendation = "forge_update";
    draft = {
      tool: "forge_update",
      domain: "memory",
      action: "upsert_issue",
      fields: {
        title: summary,
        detail,
        status: "open"
      }
    };
    confidence = "medium";
  } else if (includesAny(haystack, ["resolved", "fixed", "closed"])) {
    const openIssue = state.memory.issues.find((issue) => issue.status === "open");
    recommendation = "forge_update";
    draft = openIssue
      ? {
          tool: "forge_update",
          domain: "memory",
          action: "resolve_issue",
          fields: {
            id: openIssue.id,
            resolution: detail ?? summary
          }
        }
      : {
          tool: "forge_log",
          fields: {
            kind: "note",
            summary,
            detail
          }
        };
    confidence = openIssue ? "medium" : "low";
  } else if (
    workingView.useForge.mode === "none" &&
    !includesAny(haystack, ["important", "decision", "issue", "drift", "handoff"])
  ) {
    recommendation = "none";
    confidence = "high";
  } else {
    recommendation = "forge_log";
    draft = {
      tool: "forge_log",
      fields: {
        kind: detectObservationKind(haystack),
        summary,
        detail
      }
    };
    confidence = workingView.useForge.mode === "managed" ? "medium" : "high";
  }

  return ForgeSuggestUpdateOutputSchema.parse({
    status: "ok",
    tool: "forge_suggest_update",
    recommendation,
    confidence,
    rationale: buildSuggestionRationale(recommendation, workingView.useForge.mode),
    draft
  });
}

function buildDraftSummary(
  workingView: ReturnType<typeof buildWorkingView>,
  input: ForgeSessionDraftInput,
  resolvedSteps: ReturnType<typeof resolveStepRefs>
): string {
  if (input.recentWork) {
    return normalizeText(input.recentWork);
  }

  if (resolvedSteps.length > 0) {
    const stepTitles = resolvedSteps.slice(0, 2).map((entry) => entry.title).join(" and ");
    return `Completed ${stepTitles} and left the workspace ready for the next continuity step.`;
  }

  if (workingView.doNow) {
    return `Worked through the current focus: ${workingView.doNow}`;
  }

  return "Updated the workspace and left a resumable Forge handoff.";
}

function buildDraftNextStep(workingView: ReturnType<typeof buildWorkingView>): string {
  if (workingView.openDrift[0]) {
    return `Resolve or acknowledge drift: ${workingView.openDrift[0].summary}`;
  }

  if (workingView.openIssues[0]) {
    return `Address issue: ${workingView.openIssues[0].title}`;
  }

  if (workingView.activePhases[0]) {
    const remainingStep = workingView.activePhases[0].steps.find((step) => step.status !== "done");
    if (remainingStep) {
      return `Advance ${workingView.activePhases[0].title} by completing '${remainingStep.title}'.`;
    }

    return `Advance phase: ${workingView.activePhases[0].title}`;
  }

  if (workingView.notYet[0]) {
    return `Resume with the next allowed phase and keep '${workingView.notYet[0]}' deferred until current work is explicit.`;
  }

  return workingView.doNow ?? "Resume from the latest continuity state.";
}

function buildReadiness(
  workingView: ReturnType<typeof buildWorkingView>,
  warnings: string[]
): ForgeSessionDraftOutput["readiness"] {
  if (workingView.openDrift.some((record) => record.requiresAttention)) {
    return {
      status: "blocked",
      reason: "High-attention drift is still open."
    };
  }

  if (warnings.length > 0) {
    return {
      status: "needs_attention",
      reason: warnings[0]!
    };
  }

  return {
    status: "ready",
    reason: "The workspace has a clear next step and no blocking continuity gaps."
  };
}

export function draftForgeSession(
  state: ManagedForgeState,
  input: ForgeSessionDraftInput
): ForgeSessionDraftOutput {
  const workingView = buildWorkingView(
    { version: 1, constraints: [], preferences: [] },
    state.memory,
    state.plan,
    state.phases.phases,
    state.location.projectRoot
  );
  const resolvedSteps = resolveStepRefs(state, input.completedSteps);
  const summary = buildDraftSummary(workingView, input, resolvedSteps);
  const nextStep = buildDraftNextStep(workingView);
  const warnings = [
    workingView.watchOut,
    workingView.notYet[0] ? `Keep '${workingView.notYet[0]}' deferred until the current work is explicit.` : undefined
  ].filter((value): value is string => Boolean(value));
  const recommendedCloseTool =
    resolvedSteps.length > 0 || input.log ? "forge_checkpoint" : "forge_session_end";

  const draftPayload: ForgeSessionDraftOutput["draftPayload"] =
    recommendedCloseTool === "forge_checkpoint"
      ? {
          tool: "forge_checkpoint",
          payload: {
            ...(input.log ? { log: input.log } : {}),
            ...(resolvedSteps.length > 0
              ? {
                  completedSteps: resolvedSteps.map(({ phaseId, stepId, note }) => ({
                    phaseId,
                    stepId,
                    note
                  }))
                }
              : {}),
            session: {
              summary,
              nextStep
            }
          } satisfies Omit<ForgeCheckpointInput, "cwd">
        }
      : {
          tool: "forge_session_end",
          payload: {
            summary,
            nextStep
          }
        };

  return ForgeSessionDraftOutputSchema.parse({
    status: "ok",
    tool: "forge_session_draft",
    recommendedCloseTool,
    summary,
    nextStep,
    warnings,
    readiness: buildReadiness(workingView, warnings),
    likelyCompletedSteps: resolvedSteps.map(({ phaseId, stepId, title }) => ({
      phaseId,
      stepId,
      title
    })),
    unresolvedIssues: workingView.openIssues.slice(0, 3).map((issue) => ({
      id: issue.id,
      title: issue.title,
      detail: issue.detail
    })),
    openDrift: workingView.openDrift.slice(0, 3).map((entry) => ({
      id: entry.id,
      severity: entry.severity,
      status: entry.status,
      summary: entry.summary
    })),
    draftPayload
  });
}
