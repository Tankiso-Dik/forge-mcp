import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  ForgeCheckpointInputSchema,
  ForgeCheckpointOutputSchema,
  ForgeCompareExecutionInputSchema,
  ForgeCompareExecutionOutputSchema,
  ForgeFlagDriftInputSchema,
  ForgeInitInputSchema,
  ForgeInitOutputSchema,
  ForgeLoadInputSchema,
  ForgeLoadOutputSchema,
  ForgeLogInputSchema,
  ForgeRebuildPhasesInputSchema,
  ForgeSessionDraftInputSchema,
  ForgeSessionDraftOutputSchema,
  ForgeSessionEndInputSchema,
  ForgeSessionEndOutputSchema,
  ForgeSuggestUpdateInputSchema,
  ForgeSuggestUpdateOutputSchema,
  ForgeStepDoneInputSchema,
  ForgeUpdateInputSchema,
  WriteResultSchema
} from "../schemas.js";
import {
  createEntityId,
  createContextItem,
  createDriftRecord,
  createHabitRecord,
  createIssueRecord,
  createObservationRecord,
  createPromptRecord,
  nowIso
} from "../services/records.js";
import { initializeForgeProject } from "../services/init.js";
import { compareExecutionAgainstForge } from "../services/comparison.js";
import { draftForgeSession, suggestForgeUpdate } from "../services/guidance.js";
import { appendIssuesAndNicetiesAsked } from "../services/issues-and-niceties.js";
import {
  loadForgeState,
  loadManagedForgeState,
  saveMemoryState,
  savePhasesState,
  savePlanState
} from "../services/state.js";
import type {
  ForgeCheckpointInput,
  ForgeCompareExecutionInput,
  ForgeCompareExecutionOutput,
  ForgeSessionDraftInput,
  ForgeSessionEndOutput,
  ForgeSuggestUpdateInput,
  ForgeUpdateInput,
  PhaseState,
  PhasesState,
  WriteResult
} from "../types.js";

function toTextContent(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function textResult(value: unknown) {
  return [{ type: "text" as const, text: toTextContent(value) }];
}

function createWriteResult(result: WriteResult): WriteResult {
  return WriteResultSchema.parse(result);
}

function createSessionEndResult(result: ForgeSessionEndOutput): ForgeSessionEndOutput {
  return ForgeSessionEndOutputSchema.parse(result);
}

function addUniqueValue(values: string[], value: string): boolean {
  if (values.includes(value)) {
    return false;
  }

  values.push(value);
  return true;
}

function getDriftRecommendation(severity: WriteResult["severity"]): string {
  switch (severity) {
    case "critical":
      return "Stop and resolve the contradiction before continuing implementation.";
    case "high":
      return "Escalate the conflict and confirm whether the plan or architecture has changed.";
    case "medium":
      return "Record the conflict and revisit the relevant plan or decision before the next major change.";
    case "low":
    default:
      return "Track the drift and monitor whether it becomes a repeated pattern.";
  }
}

function issueStatusMessage(status: "open" | "resolved"): string {
  return status === "resolved" ? "resolved" : "reopened";
}

function validatePhaseIds(phases: PhaseState[]): void {
  const phaseIds = new Set<string>();

  for (const phase of phases) {
    if (phaseIds.has(phase.id)) {
      throw new Error(`Duplicate phase ID detected: ${phase.id}`);
    }
    phaseIds.add(phase.id);

    const stepIds = new Set<string>();
    for (const step of phase.steps) {
      if (stepIds.has(step.id)) {
        throw new Error(`Duplicate step ID detected in phase ${phase.id}: ${step.id}`);
      }
      stepIds.add(step.id);
    }
  }
}

function recalculatePhaseStatus(phase: PhaseState): PhaseState["status"] {
  if (phase.steps.length === 0) {
    return phase.status;
  }

  if (phase.steps.every((step) => step.status === "done")) {
    return "done";
  }

  if (phase.steps.some((step) => step.status === "in_progress" || step.status === "done")) {
    return "in_progress";
  }

  return "todo";
}

interface ManagedForgeStateForMutation {
  memory: Awaited<ReturnType<typeof loadManagedForgeState>>["memory"];
  phases: Awaited<ReturnType<typeof loadManagedForgeState>>["phases"];
}

interface StepCompletionResult {
  phaseId: string;
  stepId: string;
  message: string;
}

function applyForgeLogMutation(
  state: ManagedForgeStateForMutation,
  kind: ForgeCheckpointInput["log"] extends infer T
    ? T extends { kind: infer K }
      ? K
      : never
    : never,
  summary: string,
  detail?: string,
  relatedFiles: string[] = []
): { message: string; entityId: string } {
  if (kind === "habit_suggestion") {
    const habit = createHabitRecord(detail ?? summary, "suggested");
    state.memory.habits.push(habit);
    return {
      message: `Logged habit suggestion '${detail ?? summary}'.`,
      entityId: habit.id
    };
  }

  if (kind === "concern") {
    const concern = createContextItem("concern", summary, detail ?? summary, relatedFiles);
    state.memory.concerns.push(concern);
    return {
      message: `Logged concern '${summary}'.`,
      entityId: concern.id
    };
  }

  const observation = createObservationRecord(kind, summary, detail, relatedFiles);
  state.memory.observations.push(observation);
  return {
    message: `Logged ${kind} observation '${summary}'.`,
    entityId: observation.id
  };
}

function applyStepDoneMutation(
  state: ManagedForgeStateForMutation,
  phaseId: string,
  stepId: string,
  note?: string
): StepCompletionResult {
  const phase = state.phases.phases.find((entry) => entry.id === phaseId);
  if (!phase) {
    throw new Error(`Phase '${phaseId}' was not found.`);
  }

  const step = phase.steps.find((entry) => entry.id === stepId);
  if (!step) {
    throw new Error(`Step '${stepId}' was not found in phase '${phaseId}'.`);
  }

  step.status = "done";
  if (note) {
    step.notes = note;
  }
  phase.status = recalculatePhaseStatus(phase);

  return {
    phaseId: phase.id,
    stepId: step.id,
    message: `Marked step '${step.title}' as done.`
  };
}

function applySessionMutation(
  state: ManagedForgeStateForMutation,
  summary?: string,
  nextStep?: string
): void {
  state.memory.session = {
    summary: summary ?? state.memory.session.summary,
    nextStep: nextStep ?? state.memory.session.nextStep,
    previousUpdatedAt: state.memory.session.updatedAt,
    updatedAt: nowIso()
  };
}

async function handleForgeUpdate(input: ForgeUpdateInput): Promise<WriteResult> {
  const state = await loadManagedForgeState(input.cwd ?? process.cwd());

  switch (input.domain) {
    case "memory": {
      switch (input.action) {
        case "add_decision": {
          const item = createContextItem("decision", input.title, input.detail, input.relatedFiles ?? []);
          state.memory.decisions.push(item);
          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Added decision '${input.title}'.`,
            entityId: item.id
          });
        }
        case "add_tried_and_abandoned": {
          const item = createContextItem("tried", input.title, input.detail, input.relatedFiles ?? []);
          state.memory.triedAndAbandoned.push(item);
          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Added tried-and-abandoned entry '${input.title}'.`,
            entityId: item.id
          });
        }
        case "add_concern": {
          const item = createContextItem("concern", input.title, input.detail, input.relatedFiles ?? []);
          state.memory.concerns.push(item);
          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Added concern '${input.title}'.`,
            entityId: item.id
          });
        }
        case "add_favourite_prompt": {
          const record = createPromptRecord(input.title, input.prompt, input.relatedFiles ?? []);
          state.memory.favouritePrompts.push(record);
          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Added favourite prompt '${input.title}'.`,
            entityId: record.id
          });
        }
        case "upsert_issue": {
          const existingIndex = input.id
            ? state.memory.issues.findIndex((issue) => issue.id === input.id)
            : -1;

          if (existingIndex >= 0) {
            const existing = state.memory.issues[existingIndex]!;
            state.memory.issues[existingIndex] = {
              id: existing.id,
              createdAt: existing.createdAt,
              title: input.title,
              status: input.status,
              updatedAt: nowIso(),
              relatedFiles: input.relatedFiles ?? existing.relatedFiles ?? []
            };
            if (input.detail) {
              state.memory.issues[existingIndex]!.detail = input.detail;
            }

            await saveMemoryState(state.paths.memoryFilePath, state.memory);
            return createWriteResult({
              status: "ok",
              tool: "forge_update",
              updatedFile: "memory",
              message: `Updated issue '${input.title}'.`,
              entityId: existing.id
            });
          }

          const issue = createIssueRecord(
            input.title,
            input.status,
            input.detail,
            input.id,
            input.relatedFiles ?? []
          );
          state.memory.issues.push(issue);
          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Created issue '${input.title}'.`,
            entityId: issue.id
          });
        }
        case "set_issue_status": {
          const issue = state.memory.issues.find((entry) => entry.id === input.id);
          if (!issue) {
            throw new Error(`Issue '${input.id}' was not found.`);
          }

          issue.status = input.status;
          issue.updatedAt = nowIso();
          if (input.detail) {
            issue.detail = input.detail;
          }
          if (input.status === "resolved") {
            issue.resolvedAt = nowIso();
          } else {
            delete issue.resolution;
            delete issue.resolvedAt;
          }

          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Issue '${issue.title}' is now ${issueStatusMessage(input.status)}.`,
            entityId: issue.id
          });
        }
        case "resolve_issue": {
          const issue = state.memory.issues.find((entry) => entry.id === input.id);
          if (!issue) {
            throw new Error(`Issue '${input.id}' was not found.`);
          }

          issue.status = "resolved";
          issue.resolution = input.resolution;
          issue.resolvedAt = nowIso();
          issue.updatedAt = issue.resolvedAt;

          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Resolved issue '${issue.title}'.`,
            entityId: issue.id
          });
        }
        case "reopen_issue": {
          const issue = state.memory.issues.find((entry) => entry.id === input.id);
          if (!issue) {
            throw new Error(`Issue '${input.id}' was not found.`);
          }

          issue.status = "open";
          issue.updatedAt = nowIso();
          if (input.detail) {
            issue.detail = input.detail;
          }
          delete issue.resolution;
          delete issue.resolvedAt;

          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Reopened issue '${issue.title}'.`,
            entityId: issue.id
          });
        }
        case "add_habit": {
          const habit = createHabitRecord(input.description, input.status);
          state.memory.habits.push(habit);
          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Added habit record '${input.description}'.`,
            entityId: habit.id
          });
        }
        case "set_habit_status": {
          const habit = state.memory.habits.find((entry) => entry.id === input.id);
          if (!habit) {
            throw new Error(`Habit '${input.id}' was not found.`);
          }

          habit.status = input.status;
          habit.updatedAt = nowIso();

          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Set habit '${habit.description}' to ${input.status}.`,
            entityId: habit.id
          });
        }
        case "set_session_context": {
          state.memory.session = {
            summary: input.summary ?? state.memory.session.summary,
            nextStep: input.nextStep ?? state.memory.session.nextStep,
            previousUpdatedAt: state.memory.session.updatedAt,
            updatedAt: nowIso()
          };

          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: "Updated session context."
          });
        }
        case "set_drift_status": {
          const drift = state.memory.driftLog.find((entry) => entry.id === input.id);
          if (!drift) {
            throw new Error(`Drift record '${input.id}' was not found.`);
          }

          drift.status = input.status;
          drift.updatedAt = nowIso();
          if (input.note) {
            drift.detail = input.note;
          }

          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Set drift '${drift.summary}' to ${input.status}.`,
            entityId: drift.id,
            severity: drift.severity,
            recommendedAction: drift.recommendedAction,
            requiresAttention: drift.requiresAttention && input.status !== "resolved"
          });
        }
      }

      break;
    }
    case "plan": {
      switch (input.action) {
        case "add_stack_item": {
          const added = addUniqueValue(state.plan.stack, input.value);
          await savePlanState(state.paths.planFilePath, state.plan);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "plan",
            message: added
              ? `Added stack item '${input.value}'.`
              : `Stack item '${input.value}' was already present.`
          });
        }
        case "add_design_style_item": {
          const added = addUniqueValue(state.plan.designStyle, input.value);
          await savePlanState(state.paths.planFilePath, state.plan);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "plan",
            message: added
              ? `Added design style item '${input.value}'.`
              : `Design style item '${input.value}' was already present.`
          });
        }
        case "add_core_feature": {
          const added = addUniqueValue(state.plan.coreFeatures, input.value);
          await savePlanState(state.paths.planFilePath, state.plan);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "plan",
            message: added
              ? `Added core feature '${input.value}'.`
              : `Core feature '${input.value}' was already present.`
          });
        }
        case "add_planned_feature": {
          const added = addUniqueValue(state.plan.plannedFeatures, input.value);
          await savePlanState(state.paths.planFilePath, state.plan);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "plan",
            message: added
              ? `Added planned feature '${input.value}'.`
              : `Planned feature '${input.value}' was already present.`
          });
        }
        case "add_architecture_decision": {
          const item = createContextItem("arch", input.title, input.detail, input.relatedFiles ?? []);
          state.plan.architectureDecisions.push(item);
          await savePlanState(state.paths.planFilePath, state.plan);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "plan",
            message: `Added architecture decision '${input.title}'.`,
            entityId: item.id
          });
        }
        case "add_accepted_suggestion": {
          const item = createContextItem("suggestion", input.title, input.detail, input.relatedFiles ?? []);
          state.plan.acceptedSuggestions.push(item);
          await savePlanState(state.paths.planFilePath, state.plan);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "plan",
            message: `Added accepted suggestion '${input.title}'.`,
            entityId: item.id
          });
        }
      }

      break;
    }
    case "phases": {
      switch (input.action) {
        case "set_phase_status": {
          const phase = state.phases.phases.find((entry) => entry.id === input.phaseId);
          if (!phase) {
            throw new Error(`Phase '${input.phaseId}' was not found.`);
          }

          phase.status = input.status;
          await savePhasesState(state.paths.phasesFilePath, state.phases);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "phases",
            message: `Set phase '${phase.title}' to ${input.status}.`,
            phaseId: phase.id
          });
        }
      }

      break;
    }
  }

  throw new Error("Unsupported forge_update action.");
}

async function handleForgeCheckpoint(input: ForgeCheckpointInput) {
  const state = await loadManagedForgeState(input.cwd ?? process.cwd());
  const updatedFiles = new Set<"memory" | "phases">();
  const completedSteps: Array<{ phaseId: string; stepId: string }> = [];
  const messageParts: string[] = [];
  let loggedEntityId: string | undefined;
  let sessionUpdated = false;

  if (input.log) {
    const result = applyForgeLogMutation(
      state,
      input.log.kind,
      input.log.summary,
      input.log.detail,
      input.log.relatedFiles ?? []
    );
    updatedFiles.add("memory");
    loggedEntityId = result.entityId;
    messageParts.push(result.message);
  }

  if (input.completedSteps) {
    for (const item of input.completedSteps) {
      const result = applyStepDoneMutation(state, item.phaseId, item.stepId, item.note);
      updatedFiles.add("phases");
      completedSteps.push({
        phaseId: result.phaseId,
        stepId: result.stepId
      });
      messageParts.push(result.message);
    }
  }

  if (input.session) {
    applySessionMutation(state, input.session.summary, input.session.nextStep);
    updatedFiles.add("memory");
    sessionUpdated = true;
    messageParts.push("Updated session handoff.");
  }

  if (updatedFiles.has("memory")) {
    await saveMemoryState(state.paths.memoryFilePath, state.memory);
  }
  if (updatedFiles.has("phases")) {
    await savePhasesState(state.paths.phasesFilePath, state.phases);
  }

  return ForgeCheckpointOutputSchema.parse({
    status: "ok",
    tool: "forge_checkpoint",
    updatedFiles: [...updatedFiles],
    message: messageParts.join(" "),
    loggedEntityId,
    completedSteps,
    sessionUpdated
  });
}

async function handleForgeSuggestUpdate(input: ForgeSuggestUpdateInput) {
  const state = await loadManagedForgeState(input.cwd ?? process.cwd());
  return ForgeSuggestUpdateOutputSchema.parse(suggestForgeUpdate(state, input));
}

async function handleForgeSessionDraft(input: ForgeSessionDraftInput) {
  const state = await loadManagedForgeState(input.cwd ?? process.cwd());
  return ForgeSessionDraftOutputSchema.parse(draftForgeSession(state, input));
}

async function handleForgeCompareExecution(input: ForgeCompareExecutionInput) {
  const state = await loadManagedForgeState(input.cwd ?? process.cwd());
  return ForgeCompareExecutionOutputSchema.parse(compareExecutionAgainstForge(state, input));
}

export function registerForgeTools(server: McpServer): void {
  server.registerTool(
    "forge_init",
    {
      title: "Forge Init",
      description:
        "Initialize a Forge-managed project in the target directory by creating .forge and seeding the local state files.",
      inputSchema: ForgeInitInputSchema,
      outputSchema: ForgeInitOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ cwd, force }) => {
      const output = await initializeForgeProject(cwd ?? process.cwd(), force);

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_load",
    {
      title: "Forge Load",
      description:
        "Discover the active Forge project and load the current global, memory, plan, and phases state, auto-bootstrapping the current directory when needed outside the exact home directory.",
      inputSchema: ForgeLoadInputSchema,
      outputSchema: ForgeLoadOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ cwd }) => {
      const output = await loadForgeState(cwd ?? process.cwd());

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_compare_execution",
    {
      title: "Forge Compare Execution",
      description:
        "Compare the observed execution path against Forge decisions, architecture, active phases, issues, and drift.",
      inputSchema: ForgeCompareExecutionInputSchema,
      outputSchema: ForgeCompareExecutionOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (input) => {
      const output = await handleForgeCompareExecution(input);

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_suggest_update",
    {
      title: "Forge Suggest Update",
      description:
        "Recommend whether a new event should become a log, structured update, drift record, checkpoint, or no Forge write at all.",
      inputSchema: ForgeSuggestUpdateInputSchema,
      outputSchema: ForgeSuggestUpdateOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (input) => {
      const output = await handleForgeSuggestUpdate(input);

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_session_draft",
    {
      title: "Forge Session Draft",
      description:
        "Draft a closeout summary, next step, and recommended closeout payload from the current Forge state.",
      inputSchema: ForgeSessionDraftInputSchema,
      outputSchema: ForgeSessionDraftOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (input) => {
      const output = await handleForgeSessionDraft(input);

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_update",
    {
      title: "Forge Update",
      description:
        "Apply a structured update to Forge memory, plan, or phases using typed domain actions.",
      inputSchema: ForgeUpdateInputSchema,
      outputSchema: WriteResultSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (input) => {
      const output = await handleForgeUpdate(input);

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_log",
    {
      title: "Forge Log",
      description:
        "Record a quick project observation, concern, or habit suggestion in project memory.",
      inputSchema: ForgeLogInputSchema,
      outputSchema: WriteResultSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ cwd, kind, summary, detail, relatedFiles }) => {
      const state = await loadManagedForgeState(cwd ?? process.cwd());
      const result = applyForgeLogMutation(state, kind, summary, detail, relatedFiles ?? []);
      await saveMemoryState(state.paths.memoryFilePath, state.memory);

      const output = createWriteResult({
        status: "ok",
        tool: "forge_log",
        updatedFile: "memory",
        message: result.message,
        entityId: result.entityId
      });

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_step_done",
    {
      title: "Forge Step Done",
      description: "Mark a phase step as done and roll up the parent phase status.",
      inputSchema: ForgeStepDoneInputSchema,
      outputSchema: WriteResultSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ cwd, phaseId, stepId, note }) => {
      const state = await loadManagedForgeState(cwd ?? process.cwd());
      const result = applyStepDoneMutation(state, phaseId, stepId, note);
      await savePhasesState(state.paths.phasesFilePath, state.phases);

      const output = createWriteResult({
        status: "ok",
        tool: "forge_step_done",
        updatedFile: "phases",
        message: result.message,
        phaseId: result.phaseId,
        stepId: result.stepId
      });

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_checkpoint",
    {
      title: "Forge Checkpoint",
      description:
        "Apply a lightweight continuity checkpoint by optionally logging one note, completing one or more steps, and updating the session handoff in a single call.",
      inputSchema: ForgeCheckpointInputSchema,
      outputSchema: ForgeCheckpointOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (input) => {
      const output = await handleForgeCheckpoint(input);

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_rebuild_phases",
    {
      title: "Forge Rebuild Phases",
      description: "Replace the current project phases with a new validated phase sequence.",
      inputSchema: ForgeRebuildPhasesInputSchema,
      outputSchema: WriteResultSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ cwd, phases }) => {
      validatePhaseIds(phases);

      const state = await loadManagedForgeState(cwd ?? process.cwd());
      const nextState: PhasesState = {
        ...state.phases,
        phases: phases.map((phase) => ({
          ...phase,
          status: recalculatePhaseStatus(phase)
        }))
      };

      await savePhasesState(state.paths.phasesFilePath, nextState);

      const output = createWriteResult({
        status: "ok",
        tool: "forge_rebuild_phases",
        updatedFile: "phases",
        message: `Rebuilt phases with ${nextState.phases.length} phase(s).`
      });

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_flag_drift",
    {
      title: "Forge Flag Drift",
      description:
        "Record project drift when current work conflicts with architecture, prior decisions, or constraints.",
      inputSchema: ForgeFlagDriftInputSchema,
      outputSchema: WriteResultSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ cwd, severity, summary, detail, relatedFiles }) => {
      const state = await loadManagedForgeState(cwd ?? process.cwd());
      const recommendedAction = getDriftRecommendation(severity);
      const record = createDriftRecord(
        severity,
        summary,
        recommendedAction,
        detail,
        relatedFiles ?? []
      );

      state.memory.driftLog.push(record);
      await saveMemoryState(state.paths.memoryFilePath, state.memory);

      const output = createWriteResult({
        status: "ok",
        tool: "forge_flag_drift",
        updatedFile: "memory",
        message: `Logged ${severity} drift: ${summary}`,
        entityId: record.id,
        severity,
        recommendedAction,
        requiresAttention: record.requiresAttention
      });

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_session_end",
    {
      title: "Forge Session End",
      description:
        "Persist a best-effort session summary and next-step handoff, and optionally append project-local Forge improvement feedback.",
      inputSchema: ForgeSessionEndInputSchema,
      outputSchema: ForgeSessionEndOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ cwd, summary, nextStep, issuesAndNicetiesAsked }) => {
      const state = await loadManagedForgeState(cwd ?? process.cwd());
      applySessionMutation(state, summary, nextStep);
      await saveMemoryState(state.paths.memoryFilePath, state.memory);

      const feedbackResult =
        issuesAndNicetiesAsked && issuesAndNicetiesAsked.length > 0
          ? await appendIssuesAndNicetiesAsked(state.location.forgeDirectory, issuesAndNicetiesAsked, {
              summary,
              nextStep
            })
          : null;

      const output = createSessionEndResult({
        status: "ok",
        tool: "forge_session_end",
        updatedFile: "memory",
        message: feedbackResult
          ? `Saved session summary and next step, and appended ${feedbackResult.entries.length} issues-and-niceties entry(s).`
          : "Saved session summary and next step.",
        feedbackFilePath: feedbackResult?.filePath,
        feedbackEntries: feedbackResult
          ? feedbackResult.entries.map((entry) => ({
              id: entry.id,
              kind: entry.kind,
              summary: entry.summary,
              createdAt: entry.createdAt
            }))
          : []
      });

      return {
        content: textResult(output),
        structuredContent: output
      };
    }
  );
}
