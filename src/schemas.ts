import { z } from "zod";

import { FILE_SCHEMA_VERSION } from "./constants.js";

const TimestampSchema = z.iso.datetime();

export const EntityIdSchema = z.string().min(1);
export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export const IssueStatusSchema = z.enum(["open", "resolved"]);
export const DriftStatusSchema = z.enum(["open", "acknowledged", "resolved"]);

export const GlobalStateSchema = z.object({
  version: z.literal(FILE_SCHEMA_VERSION).default(FILE_SCHEMA_VERSION),
  constraints: z.array(z.string()).default([]),
  preferences: z.array(z.string()).default([])
});

const RelatedFilesSchema = z.array(z.string().min(1)).max(10).default([]);

export const ProjectContextItemSchema = z.object({
  id: EntityIdSchema,
  title: z.string().min(1),
  detail: z.string().min(1),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  relatedFiles: RelatedFilesSchema
});

export const HabitRecordSchema = z.object({
  id: EntityIdSchema,
  description: z.string().min(1),
  status: z.enum(["suggested", "confirmed", "declined"]),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional()
});

export const PromptRecordSchema = z.object({
  id: EntityIdSchema,
  title: z.string().min(1),
  prompt: z.string().min(1),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  relatedFiles: RelatedFilesSchema
});

export const ObservationKindSchema = z.enum([
  "bug",
  "ui_inconsistency",
  "tech_debt",
  "ambiguous_item",
  "struggle",
  "concern",
  "habit_suggestion",
  "note"
]);

export const ObservationRecordSchema = z.object({
  id: EntityIdSchema,
  kind: ObservationKindSchema,
  summary: z.string().min(1),
  detail: z.string().optional(),
  createdAt: TimestampSchema,
  relatedFiles: RelatedFilesSchema
});

export const IssueRecordSchema = z.object({
  id: EntityIdSchema,
  title: z.string().min(1),
  status: IssueStatusSchema,
  detail: z.string().optional(),
  resolution: z.string().optional(),
  createdAt: TimestampSchema,
  resolvedAt: TimestampSchema.optional(),
  updatedAt: TimestampSchema.optional(),
  relatedFiles: RelatedFilesSchema
});

export const DriftRecordSchema = z.object({
  id: EntityIdSchema,
  severity: SeveritySchema,
  status: DriftStatusSchema.default("open"),
  summary: z.string().min(1),
  detail: z.string().optional(),
  recommendedAction: z.string().optional(),
  requiresAttention: z.boolean().default(false),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  relatedFiles: RelatedFilesSchema
});

export const SessionStateSchema = z.object({
  summary: z.string().optional(),
  nextStep: z.string().optional(),
  updatedAt: TimestampSchema.optional(),
  previousUpdatedAt: TimestampSchema.optional()
});

export const MemoryStateSchema = z.object({
  version: z.literal(FILE_SCHEMA_VERSION).default(FILE_SCHEMA_VERSION),
  decisions: z.array(ProjectContextItemSchema).default([]),
  triedAndAbandoned: z.array(ProjectContextItemSchema).default([]),
  observations: z.array(ObservationRecordSchema).default([]),
  habits: z.array(HabitRecordSchema).default([]),
  favouritePrompts: z.array(PromptRecordSchema).default([]),
  issues: z.array(IssueRecordSchema).default([]),
  driftLog: z.array(DriftRecordSchema).default([]),
  concerns: z.array(ProjectContextItemSchema).default([]),
  session: SessionStateSchema.default({})
});

export const PlanStateSchema = z.object({
  version: z.literal(FILE_SCHEMA_VERSION).default(FILE_SCHEMA_VERSION),
  stack: z.array(z.string()).default([]),
  designStyle: z.array(z.string()).default([]),
  coreFeatures: z.array(z.string()).default([]),
  plannedFeatures: z.array(z.string()).default([]),
  architectureDecisions: z.array(ProjectContextItemSchema).default([]),
  acceptedSuggestions: z.array(ProjectContextItemSchema).default([])
});

export const StepStateSchema = z.object({
  id: EntityIdSchema,
  title: z.string().min(1),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  notes: z.string().optional(),
  relatedFiles: RelatedFilesSchema
});

export const PhaseStateSchema = z.object({
  id: EntityIdSchema,
  title: z.string().min(1),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  relatedFiles: RelatedFilesSchema,
  steps: z.array(StepStateSchema).default([])
});

export const PhasesStateSchema = z.object({
  version: z.literal(FILE_SCHEMA_VERSION).default(FILE_SCHEMA_VERSION),
  phases: z.array(PhaseStateSchema).default([])
});

export const ForgeLoadInputSchema = z.object({
  cwd: z.string().min(1).optional()
});

export const ForgeInitInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  force: z.boolean().default(false)
});

export const FileStatusSchema = z.object({
  path: z.string(),
  exists: z.boolean(),
  source: z.enum(["default", "disk"])
});

export const ForgeEngagementModeSchema = z.enum(["none", "light", "managed"]);
export const ForgeProjectScaleSchema = z.enum(["small", "medium", "large"]);
export const ForgeReasonCodeSchema = z.enum([
  "quiet_project",
  "session_handoff_present",
  "active_phase_present",
  "multiple_active_phases",
  "open_issue_present",
  "multiple_open_issues",
  "open_drift_present",
  "high_attention_drift",
  "project_medium_state",
  "project_large_state",
  "dense_notes"
]);
export const ForgeConfidenceSchema = z.enum(["low", "medium", "high"]);
export const ForgeWriteStyleSchema = z.enum(["avoid", "minimal", "normal", "managed"]);
export const ForgeUseForgeSchema = z.object({
  mode: ForgeEngagementModeSchema,
  confidence: ForgeConfidenceSchema,
  reason: z.string().min(1)
});
export const ForgeLinkedFileOwnerSchema = z.object({
  type: z.enum(["phase", "step", "issue", "drift", "decision", "architecture", "observation", "concern"]),
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.string().min(1).optional()
});
export const ForgeLinkedPhaseOwnerSchema = z.object({
  phaseId: z.string().min(1),
  phaseTitle: z.string().min(1),
  phaseStatus: z.enum(["todo", "in_progress", "done"]),
  via: z.enum(["phase", "step", "phase_and_step"]),
  stepId: z.string().min(1).optional(),
  stepTitle: z.string().min(1).optional()
});
export const ForgeLinkedFileSchema = z.object({
  path: z.string().min(1),
  exists: z.boolean(),
  reasons: z.array(z.string().min(1)).min(1),
  owners: z.array(ForgeLinkedFileOwnerSchema).min(1),
  currentPhaseOwners: z.array(ForgeLinkedPhaseOwnerSchema),
  primaryCurrentPhaseOwner: ForgeLinkedPhaseOwnerSchema.nullable()
});
export const ForgeResumeIssueSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1)
});
export const ForgeResumeDriftSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  severity: SeveritySchema,
  status: DriftStatusSchema
});
export const ForgeResumeDiffSchema = z.object({
  since: TimestampSchema,
  summary: z.string().min(1),
  changes: z.array(z.string().min(1)),
  changedFiles: z.array(z.string().min(1)),
  newOpenIssues: z.array(ForgeResumeIssueSchema),
  resolvedIssues: z.array(ForgeResumeIssueSchema),
  changedDrift: z.array(ForgeResumeDriftSchema),
  scopeShiftDetected: z.boolean()
});
export const IssuesAndNicetiesKindSchema = z.enum(["friction", "bug", "nicety", "wish"]);
export const IssuesAndNicetiesAskedInputItemSchema = z.object({
  kind: IssuesAndNicetiesKindSchema,
  summary: z.string().min(1),
  detail: z.string().optional(),
  whatWouldHaveHelped: z.string().optional()
});
export const IssuesAndNicetiesAskedEntrySchema = z.object({
  id: z.string().min(1),
  kind: IssuesAndNicetiesKindSchema,
  summary: z.string().min(1),
  detail: z.string().optional(),
  whatWouldHaveHelped: z.string().optional(),
  createdAt: TimestampSchema,
  sessionSummary: z.string().optional(),
  nextStep: z.string().optional()
});
export const IssuesAndNicetiesAskedFileSchema = z.object({
  version: z.literal(FILE_SCHEMA_VERSION).default(FILE_SCHEMA_VERSION),
  entries: z.array(IssuesAndNicetiesAskedEntrySchema).default([])
});
export const ForgeExecutionAlignmentSchema = z.enum(["aligned", "needs_review", "drift_risk"]);
export const ForgeCompareMatchSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1)
});
export const ForgeComparePhaseMatchSchema = z.object({
  phaseId: z.string().min(1),
  phaseTitle: z.string().min(1),
  via: z.enum(["phase", "step", "phase_and_step"])
});
export const ForgeCompareDriftSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  severity: SeveritySchema
});
export const ForgeSuggestUpdateRecommendationSchema = z.enum([
  "none",
  "forge_log",
  "forge_update",
  "forge_step_done",
  "forge_checkpoint",
  "forge_flag_drift",
  "forge_session_end"
]);
export const ForgeSuggestedUpdateShapeSchema = z.object({
  tool: ForgeSuggestUpdateRecommendationSchema,
  domain: z.enum(["memory", "plan", "phases"]).optional(),
  action: z.string().optional(),
  fields: z.record(z.string(), z.unknown()).optional()
});
export const PhaseStepRefSchema = z.object({
  phaseId: z.string().min(1),
  stepId: z.string().min(1),
  note: z.string().optional()
});
export const SessionDraftReadinessSchema = z.object({
  status: z.enum(["ready", "needs_attention", "blocked"]),
  reason: z.string().min(1)
});

export const WorkingViewSchema = z.object({
  constraints: z.array(z.string()),
  preferences: z.array(z.string()),
  projectScale: ForgeProjectScaleSchema,
  useForge: ForgeUseForgeSchema,
  reasonCodes: z.array(ForgeReasonCodeSchema),
  doNow: z.string().nullable(),
  whyThisMattersNow: z.string().nullable(),
  watchOut: z.string().nullable(),
  notYet: z.array(z.string()),
  recommendedWriteStyle: ForgeWriteStyleSchema,
  avoidLoggingNoise: z.boolean(),
  stateDensityWarning: z.string().optional(),
  session: z.object({
    summary: z.string().optional(),
    nextStep: z.string().optional(),
    updatedAt: TimestampSchema.optional()
  }).nullable(),
  recentDecisions: z.array(ProjectContextItemSchema),
  recentConcerns: z.array(ProjectContextItemSchema),
  recentObservations: z.array(ObservationRecordSchema),
  openIssues: z.array(IssueRecordSchema),
  activePhases: z.array(PhaseStateSchema),
  openDrift: z.array(DriftRecordSchema),
  architectureFocus: z.array(ProjectContextItemSchema),
  linkedFiles: z.array(ForgeLinkedFileSchema),
  resumeDiff: ForgeResumeDiffSchema.nullable()
});

export const ForgeInitOutputSchema = z.object({
  status: z.literal("ok"),
  tool: z.literal("forge_init"),
  projectRoot: z.string(),
  forgeDirectory: z.string(),
  forced: z.boolean(),
  files: z.object({
    memory: z.string(),
    plan: z.string(),
    phases: z.string()
  }),
  message: z.string()
});

export const ForgeLoadOutputSchema = z.object({
  managedProject: z.boolean(),
  cwd: z.string(),
  projectRoot: z.string().nullable(),
  forgeDirectory: z.string().nullable(),
  global: GlobalStateSchema.nullable(),
  memory: MemoryStateSchema.nullable(),
  plan: PlanStateSchema.nullable(),
  phases: PhasesStateSchema.nullable(),
  workingView: WorkingViewSchema.nullable(),
  files: z.object({
    global: FileStatusSchema,
    memory: FileStatusSchema.nullable(),
    plan: FileStatusSchema.nullable(),
    phases: FileStatusSchema.nullable()
  })
});

export const ForgeUpdateInputSchema = z.union([
  z.object({
    domain: z.literal("memory"),
    action: z.literal("add_decision"),
    cwd: z.string().min(1).optional(),
    title: z.string().min(1),
    detail: z.string().min(1),
    relatedFiles: RelatedFilesSchema.optional()
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("add_tried_and_abandoned"),
    cwd: z.string().min(1).optional(),
    title: z.string().min(1),
    detail: z.string().min(1),
    relatedFiles: RelatedFilesSchema.optional()
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("add_concern"),
    cwd: z.string().min(1).optional(),
    title: z.string().min(1),
    detail: z.string().min(1),
    relatedFiles: RelatedFilesSchema.optional()
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("add_favourite_prompt"),
    cwd: z.string().min(1).optional(),
    title: z.string().min(1),
    prompt: z.string().min(1),
    relatedFiles: RelatedFilesSchema.optional()
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("upsert_issue"),
    cwd: z.string().min(1).optional(),
    id: z.string().min(1).optional(),
    title: z.string().min(1),
    detail: z.string().optional(),
    status: IssueStatusSchema.default("open"),
    relatedFiles: RelatedFilesSchema.optional()
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("set_issue_status"),
    cwd: z.string().min(1).optional(),
    id: z.string().min(1),
    status: IssueStatusSchema,
    detail: z.string().optional()
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("resolve_issue"),
    cwd: z.string().min(1).optional(),
    id: z.string().min(1),
    resolution: z.string().min(1)
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("reopen_issue"),
    cwd: z.string().min(1).optional(),
    id: z.string().min(1),
    detail: z.string().optional()
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("add_habit"),
    cwd: z.string().min(1).optional(),
    description: z.string().min(1),
    status: z.enum(["suggested", "confirmed", "declined"]).default("suggested")
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("set_habit_status"),
    cwd: z.string().min(1).optional(),
    id: z.string().min(1),
    status: z.enum(["confirmed", "declined"])
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("set_session_context"),
    cwd: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
    nextStep: z.string().min(1).optional()
  }).refine((value) => Boolean(value.summary || value.nextStep), {
    message: "At least one of summary or nextStep is required."
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("set_drift_status"),
    cwd: z.string().min(1).optional(),
    id: z.string().min(1),
    status: z.enum(["acknowledged", "resolved"]),
    note: z.string().optional()
  }),
  z.object({
    domain: z.literal("plan"),
    action: z.literal("add_stack_item"),
    cwd: z.string().min(1).optional(),
    value: z.string().min(1)
  }),
  z.object({
    domain: z.literal("plan"),
    action: z.literal("add_design_style_item"),
    cwd: z.string().min(1).optional(),
    value: z.string().min(1)
  }),
  z.object({
    domain: z.literal("plan"),
    action: z.literal("add_core_feature"),
    cwd: z.string().min(1).optional(),
    value: z.string().min(1)
  }),
  z.object({
    domain: z.literal("plan"),
    action: z.literal("add_planned_feature"),
    cwd: z.string().min(1).optional(),
    value: z.string().min(1)
  }),
  z.object({
    domain: z.literal("plan"),
    action: z.literal("add_architecture_decision"),
    cwd: z.string().min(1).optional(),
    title: z.string().min(1),
    detail: z.string().min(1),
    relatedFiles: RelatedFilesSchema.optional()
  }),
  z.object({
    domain: z.literal("plan"),
    action: z.literal("add_accepted_suggestion"),
    cwd: z.string().min(1).optional(),
    title: z.string().min(1),
    detail: z.string().min(1),
    relatedFiles: RelatedFilesSchema.optional()
  }),
  z.object({
    domain: z.literal("phases"),
    action: z.literal("set_phase_status"),
    cwd: z.string().min(1).optional(),
    phaseId: z.string().min(1),
    status: z.enum(["todo", "in_progress", "done"])
  })
]);

export const ForgeLogInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  kind: ObservationKindSchema,
  summary: z.string().min(1),
  detail: z.string().optional(),
  relatedFiles: RelatedFilesSchema.optional()
});

export const ForgeStepDoneInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  phaseId: z.string().min(1),
  stepId: z.string().min(1),
  note: z.string().optional()
});

export const ForgeCheckpointInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  log: z.object({
    kind: ObservationKindSchema,
    summary: z.string().min(1),
    detail: z.string().optional(),
    relatedFiles: RelatedFilesSchema.optional()
  }).optional(),
  completedSteps: z.array(PhaseStepRefSchema).optional(),
  session: z.object({
    summary: z.string().min(1).optional(),
    nextStep: z.string().min(1).optional()
  }).refine((value) => Boolean(value.summary || value.nextStep), {
    message: "At least one of summary or nextStep is required."
  }).optional()
}).refine(
  (value) => Boolean(value.log || (value.completedSteps && value.completedSteps.length > 0) || value.session),
  {
    message: "At least one of log, completedSteps, or session is required."
  }
);

export const ForgeCheckpointPayloadSchema = z.object({
  log: z.object({
    kind: ObservationKindSchema,
    summary: z.string().min(1),
    detail: z.string().optional(),
    relatedFiles: RelatedFilesSchema.optional()
  }).optional(),
  completedSteps: z.array(PhaseStepRefSchema).optional(),
  session: z.object({
    summary: z.string().min(1).optional(),
    nextStep: z.string().min(1).optional()
  }).refine((value) => Boolean(value.summary || value.nextStep), {
    message: "At least one of summary or nextStep is required."
  }).optional()
}).refine(
  (value) => Boolean(value.log || (value.completedSteps && value.completedSteps.length > 0) || value.session),
  {
    message: "At least one of log, completedSteps, or session is required."
  }
);

export const ForgeRebuildPhasesInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  phases: z.array(PhaseStateSchema).min(1)
});

export const ForgeFlagDriftInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  severity: SeveritySchema,
  summary: z.string().min(1),
  detail: z.string().optional(),
  relatedFiles: RelatedFilesSchema.optional()
});

export const ForgeCompareExecutionInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  observedExecution: z.string().min(1),
  files: RelatedFilesSchema.optional()
});

export const ForgeSessionEndInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  summary: z.string().min(1),
  nextStep: z.string().min(1),
  issuesAndNicetiesAsked: z.array(IssuesAndNicetiesAskedInputItemSchema).max(5).optional()
});

export const ForgeSessionEndPayloadSchema = z.object({
  summary: z.string().min(1),
  nextStep: z.string().min(1),
  issuesAndNicetiesAsked: z.array(IssuesAndNicetiesAskedInputItemSchema).max(5).optional()
});

export const ForgeSuggestUpdateInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  summary: z.string().min(1),
  detail: z.string().optional(),
  completedSteps: z.array(PhaseStepRefSchema).optional(),
  closingSession: z.boolean().default(false)
});

export const ForgeSessionDraftInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  recentWork: z.string().min(1).optional(),
  log: z.object({
    kind: ObservationKindSchema,
    summary: z.string().min(1),
    detail: z.string().optional(),
    relatedFiles: RelatedFilesSchema.optional()
  }).optional(),
  completedSteps: z.array(PhaseStepRefSchema).optional()
});

export const ForgeCheckpointOutputSchema = z.object({
  status: z.literal("ok"),
  tool: z.literal("forge_checkpoint"),
  updatedFiles: z.array(z.enum(["memory", "phases"])).min(1),
  message: z.string(),
  loggedEntityId: z.string().optional(),
  completedSteps: z.array(z.object({
    phaseId: z.string(),
    stepId: z.string()
  })),
  sessionUpdated: z.boolean()
});

export const ForgeSuggestUpdateOutputSchema = z.object({
  status: z.literal("ok"),
  tool: z.literal("forge_suggest_update"),
  recommendation: ForgeSuggestUpdateRecommendationSchema,
  confidence: ForgeConfidenceSchema,
  rationale: z.string(),
  draft: ForgeSuggestedUpdateShapeSchema.optional()
});

export const ForgeCompareExecutionOutputSchema = z.object({
  status: z.literal("ok"),
  tool: z.literal("forge_compare_execution"),
  alignment: ForgeExecutionAlignmentSchema,
  summary: z.string().min(1),
  rationale: z.string().min(1),
  matchingDecisions: z.array(ForgeCompareMatchSchema),
  matchingArchitecture: z.array(ForgeCompareMatchSchema),
  matchingPhases: z.array(ForgeComparePhaseMatchSchema),
  relatedOpenIssues: z.array(ForgeCompareMatchSchema),
  relatedOpenDrift: z.array(ForgeCompareDriftSchema),
  impactedFiles: z.array(z.string().min(1)),
  staleAssumptions: z.array(z.string().min(1)),
  suggestedActions: z.array(z.string().min(1)),
  collaborationBrief: z.array(z.string().min(1)).max(3)
});

export const ForgeSessionDraftOutputSchema = z.object({
  status: z.literal("ok"),
  tool: z.literal("forge_session_draft"),
  recommendedCloseTool: z.enum(["forge_checkpoint", "forge_session_end"]),
  summary: z.string().min(1),
  nextStep: z.string().min(1),
  warnings: z.array(z.string()),
  readiness: SessionDraftReadinessSchema,
  likelyCompletedSteps: z.array(z.object({
    phaseId: z.string(),
    stepId: z.string(),
    title: z.string()
  })),
  unresolvedIssues: z.array(z.object({
    id: z.string(),
    title: z.string(),
    detail: z.string().optional()
  })),
  openDrift: z.array(z.object({
    id: z.string(),
    severity: SeveritySchema,
    status: DriftStatusSchema,
    summary: z.string()
  })),
  draftPayload: z.union([
    z.object({
      tool: z.literal("forge_checkpoint"),
      payload: ForgeCheckpointPayloadSchema
    }),
    z.object({
      tool: z.literal("forge_session_end"),
      payload: ForgeSessionEndPayloadSchema
    })
  ])
});

export const ForgeSessionEndOutputSchema = z.object({
  status: z.literal("ok"),
  tool: z.literal("forge_session_end"),
  updatedFile: z.literal("memory"),
  message: z.string(),
  feedbackFilePath: z.string().optional(),
  feedbackEntries: z.array(z.object({
    id: z.string().min(1),
    kind: IssuesAndNicetiesKindSchema,
    summary: z.string().min(1),
    createdAt: TimestampSchema
  })).default([])
});

export const WriteResultSchema = z.object({
  status: z.literal("ok"),
  tool: z.string(),
  updatedFile: z.enum(["memory", "plan", "phases"]),
  message: z.string(),
  entityId: z.string().optional(),
  phaseId: z.string().optional(),
  stepId: z.string().optional(),
  severity: SeveritySchema.optional(),
  recommendedAction: z.string().optional(),
  requiresAttention: z.boolean().optional()
});
