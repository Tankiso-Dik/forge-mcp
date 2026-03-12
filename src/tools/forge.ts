import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  ForgeCheckpointInputSchema,
  ForgeCheckpointOutputSchema,
  ForgeInitInputSchema,
  ForgeInitOutputSchema,
  ForgeLoadInputSchema,
  ForgeLoadOutputSchema,
  ForgeShapeReadInputSchema,
  ForgeShapeReadOutputSchema,
  ForgeUpdateInputSchema,
  ForgeUpdateShapeInputSchema,
  WriteResultSchema
} from "../schemas.js";
import {
  createInterpretationRecord,
  createIssueRecord,
  createSmartNote,
  createSupersededConclusion,
  createContextItem,
  nowIso
} from "../services/records.js";
import { initializeForgeProject } from "../services/init.js";
import { applyShapeDelta, readShapeView } from "../services/shape.js";
import {
  loadForgeState,
  loadManagedForgeState,
  saveMemoryState,
  savePhasesState,
  savePlanState,
  saveShapeState
} from "../services/state.js";
import type {
  ForgeCheckpointInput,
  ForgeLoadOutput,
  ForgeShapeReadInput,
  ForgeUpdateShapeInput,
  IssueStatus,
  SmartNote,
  ForgeUpdateInput,
  PhaseState,
  WriteResult
} from "../types.js";

function toTextContent(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function textResult(value: unknown) {
  return [{ type: "text" as const, text: toTextContent(value) }];
}

function forgeLoadTextResult(value: ForgeLoadOutput) {
  const compact = {
    managedProject: value.managedProject,
    cwd: value.cwd,
    projectRoot: value.projectRoot,
    forgeDirectory: value.forgeDirectory,
    mode: value.mode,
    shelf: value.workingView?.shelf ?? null,
    session: value.workingView?.session ?? null,
    shape: value.shapeMeta ?? null,
    rawStateIncluded:
      value.mode === "full"
        ? {
            memory: value.memory !== null,
            plan: value.plan !== null,
            phases: value.phases !== null
          }
        : null
  };

  return [{ type: "text" as const, text: toTextContent(compact) }];
}

function forgeShapeTextResult(value: ReturnType<typeof readShapeView>) {
  const compact = {
    projectRoot: value.projectRoot,
    mode: value.mode,
    domains: value.domains,
    meta: value.meta,
    shape: value.shape
  };

  return [{ type: "text" as const, text: toTextContent(compact) }];
}

function createWriteResult(result: WriteResult): WriteResult {
  return WriteResultSchema.parse(result);
}

function addUniqueValue(values: string[], value: string): boolean {
  if (values.includes(value)) {
    return false;
  }

  values.push(value);
  return true;
}

function issueStatusMessage(status: IssueStatus): string {
  switch (status) {
    case "narrowed":
      return "narrowed";
    case "transformed":
      return "transformed";
    case "dormant":
      return "parked";
    default:
      return status;
  }
}

function createCheckpointNoteRecord(input: {
  kind: SmartNote["kind"];
  text: string;
  keywords: string[] | undefined;
  scope: SmartNote["scope"] | undefined;
  confidence: SmartNote["confidence"] | undefined;
  relatedFiles?: string[];
  status: SmartNote["status"] | undefined;
  source: SmartNote["source"] | undefined;
}): SmartNote {
  const payload = {
    kind: input.kind,
    text: input.text,
    relatedFiles: input.relatedFiles ?? [],
    ...(input.keywords ? { keywords: input.keywords } : {}),
    ...(input.scope ? { scope: input.scope } : {}),
    ...(input.confidence ? { confidence: input.confidence } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.source ? { source: input.source } : {})
  };

  return createSmartNote({
    ...payload,
    keywords: input.keywords ?? [],
    source: input.source ?? "checkpoint"
  });
}

interface ManagedForgeStateForMutation {
  memory: Awaited<ReturnType<typeof loadManagedForgeState>>["memory"];
  plan: Awaited<ReturnType<typeof loadManagedForgeState>>["plan"];
  phases: Awaited<ReturnType<typeof loadManagedForgeState>>["phases"];
  shape: Awaited<ReturnType<typeof loadManagedForgeState>>["shape"];
}

interface StepCompletionResult {
  phaseId: string;
  stepId: string;
  message: string;
}

function derivePhaseStatus(phase: PhaseState): PhaseState["status"] {
  if (phase.steps.length === 0) {
    return phase.status;
  }

  const doneCount = phase.steps.filter((entry) => entry.status === "done").length;
  if (doneCount === 0) {
    return "todo";
  }
  if (doneCount === phase.steps.length) {
    return "done";
  }
  return "in_progress";
}

function applyCheckpointSummaryMutation(
  state: ManagedForgeStateForMutation,
  summary: string,
  detail?: string,
  relatedFiles: string[] = []
): { message: string; entityId: string } {
  const note = createSmartNote({
    kind: "milestone",
    text: detail ? `${summary}\n\n${detail}` : summary,
    scope: "session",
    source: "checkpoint",
    relatedFiles
  });
  state.memory.notes.push(note);
  return {
    message: `Logged checkpoint summary '${summary}'.`,
    entityId: note.id
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
  phase.status = derivePhaseStatus(phase);

  return {
    phaseId: phase.id,
    stepId: step.id,
    message: `Marked step '${step.title}' as done and set phase '${phase.title}' to ${phase.status}.`
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
        case "add_note": {
          const note = createCheckpointNoteRecord({
            kind: input.note.kind,
            text: input.note.text,
            keywords: input.note.keywords,
            scope: input.note.scope,
            confidence: input.note.confidence,
            relatedFiles: input.note.relatedFiles ?? [],
            status: input.note.status,
            source: "update"
          });
          state.memory.notes.push(note);
          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Added ${note.kind} note.`,
            entityId: note.id
          });
        }
        case "update_note": {
          const note = state.memory.notes.find((entry) => entry.id === input.id);
          if (!note) {
            throw new Error(`Note '${input.id}' was not found.`);
          }

          if (input.text) {
            note.text = input.text;
          }
          if (input.keywords) {
            note.keywords = input.keywords;
          }
          if (input.scope) {
            note.scope = input.scope;
          }
          if (input.confidence) {
            note.confidence = input.confidence;
          }
          if (input.status) {
            note.status = input.status;
          }
          if (input.relatedFiles) {
            note.relatedFiles = input.relatedFiles;
          }
          note.updatedAt = nowIso();

          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Updated ${note.kind} note.`,
            entityId: note.id
          });
        }
        case "set_note_status": {
          const note = state.memory.notes.find((entry) => entry.id === input.id);
          if (!note) {
            throw new Error(`Note '${input.id}' was not found.`);
          }
          note.status = input.status;
          note.updatedAt = nowIso();
          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Set ${note.kind} note to ${input.status}.`,
            entityId: note.id
          });
        }
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
        case "add_interpretation": {
          const item = createInterpretationRecord({
            title: input.title,
            detail: input.detail,
            status: input.status,
            confidence: input.confidence,
            ...(input.basis ? { basis: input.basis } : {}),
            ...(input.supersedes ? { supersedes: input.supersedes } : {}),
            relatedFiles: input.relatedFiles ?? []
          });
          state.memory.interpretations.push(item);
          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Added interpretation '${input.title}'.`,
            entityId: item.id
          });
        }
        case "set_interpretation_status": {
          const interpretation = state.memory.interpretations.find((entry) => entry.id === input.id);
          if (!interpretation) {
            throw new Error(`Interpretation '${input.id}' was not found.`);
          }

          interpretation.status = input.status;
          interpretation.updatedAt = nowIso();
          if (input.confidence) {
            interpretation.confidence = input.confidence;
          }
          if (input.detail) {
            interpretation.detail = input.detail;
          }

          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Set interpretation '${interpretation.title}' to ${input.status}.`,
            entityId: interpretation.id
          });
        }
        case "add_superseded_conclusion": {
          const item = createSupersededConclusion({
            title: input.title,
            oldStatus: input.oldStatus,
            reason: input.reason,
            ...(input.replacement ? { replacement: input.replacement } : {}),
            relatedFiles: input.relatedFiles ?? []
          });
          state.memory.supersededConclusions.push(item);
          await saveMemoryState(state.paths.memoryFilePath, state.memory);
          return createWriteResult({
            status: "ok",
            tool: "forge_update",
            updatedFile: "memory",
            message: `Added superseded conclusion '${input.title}'.`,
            entityId: item.id
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
              transformedInto: existing.transformedInto ?? [],
              relatedFiles: input.relatedFiles ?? existing.relatedFiles ?? []
            };
            if (input.detail) {
              state.memory.issues[existingIndex]!.detail = input.detail;
            }
            if (input.transformedInto) {
              state.memory.issues[existingIndex]!.transformedInto = input.transformedInto;
            }
            if (input.nextCheck) {
              state.memory.issues[existingIndex]!.nextCheck = input.nextCheck;
            }
            state.memory.issues[existingIndex]!.lastReassessedAt = nowIso();

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
          if (input.transformedInto) {
            issue.transformedInto = input.transformedInto;
          }
          if (input.nextCheck) {
            issue.nextCheck = input.nextCheck;
          }
          issue.lastReassessedAt = nowIso();
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
          issue.lastReassessedAt = issue.updatedAt;
          if (input.detail) {
            issue.detail = input.detail;
          }
          if (input.resolutionNote) {
            issue.resolutionNote = input.resolutionNote;
          }
          if (input.transformedInto) {
            issue.transformedInto = input.transformedInto;
          }
          if (input.nextCheck) {
            issue.nextCheck = input.nextCheck;
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

async function handleForgeShapeRead(input: ForgeShapeReadInput) {
  const state = await loadManagedForgeState(input.cwd ?? process.cwd());
  return readShapeView({
    projectRoot: state.location.projectRoot,
    shape: state.shape,
    domains: input.domains ?? ["surfaces", "capabilities", "parts"],
    mode: input.mode
  });
}

async function handleForgeUpdateShape(input: ForgeUpdateShapeInput): Promise<WriteResult> {
  const state = await loadManagedForgeState(input.cwd ?? process.cwd());
  let messages: string[] = [];

  switch (input.action) {
    case "set_summary":
      messages = applyShapeDelta(state.shape, { summary: input.summary });
      break;
    case "set_project_type":
      messages = applyShapeDelta(state.shape, { projectType: input.projectType });
      break;
    case "set_confidence":
      messages = applyShapeDelta(state.shape, { confidence: input.confidence });
      break;
    case "upsert_surface":
      messages = applyShapeDelta(state.shape, { surfaces: [input.surface] });
      break;
    case "remove_surface":
      messages = applyShapeDelta(state.shape, { remove: [{ domain: "surfaces", id: input.id }] });
      break;
    case "upsert_capability":
      messages = applyShapeDelta(state.shape, { capabilities: [input.capability] });
      break;
    case "remove_capability":
      messages = applyShapeDelta(state.shape, { remove: [{ domain: "capabilities", id: input.id }] });
      break;
    case "upsert_part":
      messages = applyShapeDelta(state.shape, { parts: [input.part] });
      break;
    case "remove_part":
      messages = applyShapeDelta(state.shape, { remove: [{ domain: "parts", id: input.id }] });
      break;
  }

  await saveShapeState(state.paths.shapeFilePath, state.shape);

  return createWriteResult({
    status: "ok",
    tool: "forge_update_shape",
    updatedFile: "shape",
    message: messages.join(" ")
  });
}

async function handleForgeCheckpoint(input: ForgeCheckpointInput) {
  const state = await loadManagedForgeState(input.cwd ?? process.cwd());
  const updatedFiles = new Set<"memory" | "plan" | "phases" | "shape">();
  const completedSteps: Array<{ phaseId: string; stepId: string }> = [];
  const messageParts: string[] = [];
  let entryId: string | undefined;
  let noteId: string | undefined;
  let sessionUpdated = false;
  let sessionClosed = false;
  let shapeUpdated = false;

  if (input.summary) {
    const result = applyCheckpointSummaryMutation(
      state,
      input.summary.summary,
      input.summary.detail,
      input.summary.relatedFiles ?? []
    );
    updatedFiles.add("memory");
    entryId = result.entityId;
    messageParts.push(result.message);
  }

  if (input.note) {
    const note = createCheckpointNoteRecord({
      kind: input.note.kind,
      text: input.note.text,
      keywords: input.note.keywords,
      scope: input.note.scope,
      confidence: input.note.confidence,
      relatedFiles: input.note.relatedFiles ?? [],
      status: input.note.status,
      source: "checkpoint"
    });
    state.memory.notes.push(note);
    updatedFiles.add("memory");
    noteId = note.id;
    messageParts.push(`Stored ${note.kind} note.`);
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

  if (input.shape) {
    const messages = applyShapeDelta(state.shape, {
      ...(input.shape.summary ? { summary: input.shape.summary } : {}),
      ...(input.shape.projectType ? { projectType: input.shape.projectType } : {}),
      ...(input.shape.confidence ? { confidence: input.shape.confidence } : {})
    });
    if (messages.length > 0) {
      updatedFiles.add("shape");
      shapeUpdated = true;
      messageParts.push(...messages);
    }
  }

  if (input.session) {
    applySessionMutation(state, input.session.summary, input.session.nextStep);
    updatedFiles.add("memory");
    sessionUpdated = true;
    sessionClosed = input.closeSession;
    messageParts.push(input.closeSession ? "Updated session handoff and closed the current milestone." : "Updated session handoff.");
  }

  if (updatedFiles.has("memory")) {
    await saveMemoryState(state.paths.memoryFilePath, state.memory);
  }
  if (updatedFiles.has("plan")) {
    await savePlanState(state.paths.planFilePath, state.plan);
  }
  if (updatedFiles.has("phases")) {
    await savePhasesState(state.paths.phasesFilePath, state.phases);
  }
  if (updatedFiles.has("shape")) {
    await saveShapeState(state.paths.shapeFilePath, state.shape);
  }

  return ForgeCheckpointOutputSchema.parse({
    status: "ok",
    tool: "forge_checkpoint",
    updatedFiles: [...updatedFiles],
    message: messageParts.join(" "),
    ...(entryId ? { entryId } : {}),
    ...(noteId ? { noteId } : {}),
    completedSteps,
    sessionUpdated,
    sessionClosed,
    shapeUpdated
  });
}

export function registerForgeTools(server: McpServer): void {
  server.registerTool(
    "forge_init",
    {
      title: "Forge Init",
      description:
        "Initialize a Forge-managed project in the target directory by creating .forge and seeding the local state files. Use this once before the normal Forge loop when a project is not managed yet; after init, the expected flow is forge_load -> work -> forge_checkpoint, with forge_update only for exact corrections.",
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
        "Read the active Forge project and load its lean continuity shelf plus current handoff. This is the normal first Forge call in a managed project: start sessions here before broad file reading, use compact mode by default, and reach for full mode only when you explicitly need raw plan, memory, or phases.",
      inputSchema: ForgeLoadInputSchema,
      outputSchema: ForgeLoadOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ cwd, mode }) => {
      const output = await loadForgeState(cwd ?? process.cwd(), mode);

      return {
        content: forgeLoadTextResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_shape",
    {
      title: "Forge Shape",
      description:
        "Read the project's current structural map from .forge/shape.json. Use this after forge_load when the project has a real durable map worth preserving: major surfaces or outputs, capabilities, and parts that fit together across a larger app, multi-document workflow, or research workspace.",
      inputSchema: ForgeShapeReadInputSchema,
      outputSchema: ForgeShapeReadOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (input) => {
      const output = await handleForgeShapeRead(input);

      return {
        content: forgeShapeTextResult(output),
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "forge_update",
    {
      title: "Forge Update",
      description:
        "Apply a precise structured update to Forge memory, plan, or phases using typed domain actions. This is the exact-correction path, not the default session loop: use it after forge_load when you know exactly what state should change and forge_checkpoint would be too broad.",
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
    "forge_update_shape",
    {
      title: "Forge Update Shape",
      description:
        "Apply a precise structured mutation to the project's Shape file for surfaces, capabilities, parts, or top-level shape metadata when the project's current form changed in a durable way. Use it after forge_shape when the structural map needs an exact edit; do not use it for ordinary notes or session continuity.",
      inputSchema: ForgeUpdateShapeInputSchema,
      outputSchema: WriteResultSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (input) => {
      const output = await handleForgeUpdateShape(input);

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
        "Store one milestone update without ceremony: optional summary, optional typed note, completed steps, session handoff, and optional lightweight Shape metadata in one lean checkpoint write. Use this for closeout and continuity. For structural Shape edits to surfaces, capabilities, or parts, read with forge_shape and write with forge_update_shape instead of embedding structure in forge_checkpoint.",
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
}
