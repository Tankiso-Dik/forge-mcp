import { z } from "zod";

import { FILE_SCHEMA_VERSION } from "./constants.js";

const TimestampSchema = z.iso.datetime();

export const EntityIdSchema = z.string().min(1);
export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export const IssueStatusSchema = z.enum(["open", "narrowed", "transformed", "resolved", "dormant"]);
export const InterpretationStatusSchema = z.enum(["tentative", "working", "leading", "superseded"]);
export const InterpretationConfidenceSchema = z.enum(["low", "medium", "medium_high", "high"]);
export const ShapeConfidenceSchema = z.enum(["low", "medium", "high"]);
export const ShapeStateSchemaEnum = z.enum(["active", "draft", "deprecated"]);
export const ShapeDomainSchema = z.enum(["surfaces", "capabilities", "parts"]);

export const GlobalStateSchema = z.object({
  version: z.literal(FILE_SCHEMA_VERSION).default(FILE_SCHEMA_VERSION),
  constraints: z.array(z.string()).default([]),
  preferences: z.array(z.string()).default([])
});

const RelatedFilesSchema = z.array(z.string().min(1)).max(10).default([]);

export const ShapeSurfaceSchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1),
  purpose: z.string().min(1),
  primaryUserGoal: z.string().min(1).optional(),
  entryConditions: z.array(z.string().min(1)).default([]),
  keyRegions: z.array(z.string().min(1)).default([]),
  connectedCapabilities: z.array(EntityIdSchema).default([]),
  connectedSurfaces: z.array(EntityIdSchema).default([]),
  flowNotes: z.array(z.string().min(1)).default([]),
  relatedFiles: RelatedFilesSchema,
  state: ShapeStateSchemaEnum.default("active"),
  confidence: ShapeConfidenceSchema.default("medium"),
  lastUpdated: TimestampSchema
});

export const ShapeCapabilitySchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1),
  purpose: z.string().min(1),
  solves: z.string().min(1),
  surfacedIn: z.array(EntityIdSchema).default([]),
  supportedBy: z.array(EntityIdSchema).default([]),
  dependsOn: z.array(EntityIdSchema).default([]),
  inputs: z.array(z.string().min(1)).default([]),
  outputs: z.array(z.string().min(1)).default([]),
  relatedFiles: RelatedFilesSchema,
  state: ShapeStateSchemaEnum.default("active"),
  confidence: ShapeConfidenceSchema.default("medium"),
  lastUpdated: TimestampSchema
});

export const ShapePartSchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1),
  role: z.string().min(1),
  boundary: z.string().min(1).optional(),
  supports: z.array(EntityIdSchema).default([]),
  dependsOn: z.array(EntityIdSchema).default([]),
  exposesTo: z.array(EntityIdSchema).default([]),
  relatedFiles: RelatedFilesSchema,
  state: ShapeStateSchemaEnum.default("active"),
  confidence: ShapeConfidenceSchema.default("medium"),
  lastUpdated: TimestampSchema
});

export const ShapeStateSchema = z.object({
  shape_version: z.literal(1).default(1),
  project_type: z.string().min(1).default("unknown"),
  summary: z.string().default(""),
  surfaces: z.array(ShapeSurfaceSchema).default([]),
  capabilities: z.array(ShapeCapabilitySchema).default([]),
  parts: z.array(ShapePartSchema).default([]),
  updated_at: TimestampSchema.optional(),
  confidence: ShapeConfidenceSchema.default("low")
});

export const ShapeMetaSchema = z.object({
  exists: z.boolean(),
  projectType: z.string().min(1),
  summary: z.string(),
  updatedAt: TimestampSchema.optional(),
  confidence: ShapeConfidenceSchema,
  counts: z.object({
    surfaces: z.number().int().nonnegative(),
    capabilities: z.number().int().nonnegative(),
    parts: z.number().int().nonnegative()
  })
});

export const ProjectContextItemSchema = z.object({
  id: EntityIdSchema,
  title: z.string().min(1),
  detail: z.string().min(1),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  relatedFiles: RelatedFilesSchema
});

export const SmartNoteKindSchema = z.enum([
  "milestone",
  "interpretation",
  "preference",
  "dislike",
  "work_style",
  "fact",
  "reference",
  "concern",
  "ambiguity",
  "revision_focus",
  "snippet",
  "superseded_read"
]);

const SmartNoteKindAliasMap: Record<string, z.infer<typeof SmartNoteKindSchema>> = {
  status: "fact",
  state: "fact",
  update: "fact",
  finding: "fact",
  observation: "fact",
  progress: "milestone",
  risk: "concern",
  warning: "concern",
  blocker: "concern",
  issue: "concern",
  question: "ambiguity",
  unknown: "ambiguity",
  hypothesis: "interpretation",
  theory: "interpretation",
  read: "interpretation",
  ref: "reference",
  link: "reference",
  doc: "reference",
  example: "snippet",
  revisit: "revision_focus",
  follow_up: "revision_focus",
  preferred: "preference",
  avoid: "dislike",
  workstyle: "work_style",
  superseded: "superseded_read"
};

const SmartNoteKindInputSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return SmartNoteKindAliasMap[normalized] ?? normalized;
}, SmartNoteKindSchema);

export const SmartNoteScopeSchema = z.enum(["project", "feature", "session"]);
export const SmartNoteStatusSchema = z.enum(["active", "retired"]);
export const SmartNoteSourceSchema = z.enum(["checkpoint", "update", "migration"]);

export const SmartNoteSchema = z.object({
  id: EntityIdSchema,
  kind: SmartNoteKindSchema,
  text: z.string().min(1),
  keywords: z.array(z.string().min(1)).default([]),
  scope: SmartNoteScopeSchema.default("project"),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  source: SmartNoteSourceSchema.default("update"),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  relatedFiles: RelatedFilesSchema,
  status: SmartNoteStatusSchema.default("active")
});

export const InterpretationRecordSchema = z.object({
  id: EntityIdSchema,
  title: z.string().min(1),
  status: InterpretationStatusSchema,
  confidence: InterpretationConfidenceSchema,
  detail: z.string().min(1),
  basis: z.array(z.string().min(1)).default([]),
  supersedes: z.array(EntityIdSchema).default([]),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  relatedFiles: RelatedFilesSchema
});

export const SupersededConclusionSchema = z.object({
  id: EntityIdSchema,
  title: z.string().min(1),
  oldStatus: z.string().min(1),
  newStatus: z.literal("superseded").default("superseded"),
  reason: z.string().min(1),
  replacement: EntityIdSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  relatedFiles: RelatedFilesSchema
});

export const IssueRecordSchema = z.object({
  id: EntityIdSchema,
  title: z.string().min(1),
  status: IssueStatusSchema,
  detail: z.string().optional(),
  resolution: z.string().optional(),
  resolutionNote: z.string().optional(),
  transformedInto: z.array(EntityIdSchema).default([]),
  createdAt: TimestampSchema,
  resolvedAt: TimestampSchema.optional(),
  updatedAt: TimestampSchema.optional(),
  lastReassessedAt: TimestampSchema.optional(),
  nextCheck: TimestampSchema.optional(),
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
  interpretations: z.array(InterpretationRecordSchema).default([]),
  supersededConclusions: z.array(SupersededConclusionSchema).default([]),
  notes: z.array(SmartNoteSchema).default([]),
  issues: z.array(IssueRecordSchema).default([]),
  session: SessionStateSchema.default({})
});

export const PlanStateSchema = z.object({
  version: z.literal(FILE_SCHEMA_VERSION).default(FILE_SCHEMA_VERSION),
  stack: z.array(z.string()).default([]),
  designStyle: z.array(z.string()).default([]),
  coreFeatures: z.array(z.string()).default([]),
  plannedFeatures: z.array(z.string()).default([]),
  architectureDecisions: z.array(ProjectContextItemSchema).default([])
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
  cwd: z.string().min(1).optional(),
  mode: z.enum(["compact", "full"]).default("compact")
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

export const ForgeShelfSchema = z.object({
  notes: z.array(SmartNoteSchema),
  decisions: z.array(ProjectContextItemSchema),
  features: z.array(z.string().min(1)),
  issues: z.array(IssueRecordSchema),
  interpretations: z.array(InterpretationRecordSchema),
  phases: z.array(PhaseStateSchema)
});
export const PhaseStepRefSchema = z.object({
  phaseId: z.string().min(1),
  stepId: z.string().min(1),
  note: z.string().optional()
});
export const WorkingViewSchema = z.object({
  shelf: ForgeShelfSchema,
  session: SessionStateSchema
});

export const ForgeShapeReadInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  domains: z.array(ShapeDomainSchema).min(1).max(3).optional(),
  mode: z.enum(["compact", "full"]).default("compact")
});

export const ForgeShapeReadOutputSchema = z.object({
  status: z.literal("ok"),
  tool: z.literal("forge_shape"),
  projectRoot: z.string(),
  domains: z.array(ShapeDomainSchema),
  mode: z.enum(["compact", "full"]),
  meta: ShapeMetaSchema,
  shape: z.object({
    surfaces: z.array(ShapeSurfaceSchema).optional(),
    capabilities: z.array(ShapeCapabilitySchema).optional(),
    parts: z.array(ShapePartSchema).optional()
  })
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
    phases: z.string(),
    shape: z.string()
  }),
  message: z.string()
});

const SmartNoteInputSchema = z.object({
  kind: SmartNoteKindInputSchema,
  text: z.string().min(1),
  keywords: z.array(z.string().min(1)).max(8).optional(),
  scope: SmartNoteScopeSchema.optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  relatedFiles: RelatedFilesSchema.optional(),
  status: SmartNoteStatusSchema.optional()
});

export const ForgeLoadOutputSchema = z.object({
  managedProject: z.boolean(),
  cwd: z.string(),
  projectRoot: z.string().nullable(),
  forgeDirectory: z.string().nullable(),
  mode: z.enum(["compact", "full"]),
  global: GlobalStateSchema.nullable(),
  memory: MemoryStateSchema.nullable(),
  plan: PlanStateSchema.nullable(),
  phases: PhasesStateSchema.nullable(),
  shapeMeta: ShapeMetaSchema.nullable(),
  workingView: WorkingViewSchema.nullable(),
  files: z.object({
    global: FileStatusSchema,
    memory: FileStatusSchema.nullable(),
    plan: FileStatusSchema.nullable(),
    phases: FileStatusSchema.nullable(),
    shape: FileStatusSchema.nullable()
  })
});

export const ForgeUpdateInputSchema = z.union([
  z.object({
    domain: z.literal("memory"),
    action: z.literal("add_note"),
    cwd: z.string().min(1).optional(),
    note: SmartNoteInputSchema
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("update_note"),
    cwd: z.string().min(1).optional(),
    id: z.string().min(1),
    text: z.string().min(1).optional(),
    keywords: z.array(z.string().min(1)).max(8).optional(),
    scope: SmartNoteScopeSchema.optional(),
    confidence: z.enum(["low", "medium", "high"]).optional(),
    status: SmartNoteStatusSchema.optional(),
    relatedFiles: RelatedFilesSchema.optional()
  }).refine(
    (value) =>
      Boolean(
        value.text ||
        value.keywords ||
        value.scope ||
        value.confidence ||
        value.status ||
        value.relatedFiles
      ),
    {
      message: "At least one note field must be updated."
    }
  ),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("set_note_status"),
    cwd: z.string().min(1).optional(),
    id: z.string().min(1),
    status: SmartNoteStatusSchema
  }),
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
    action: z.literal("add_interpretation"),
    cwd: z.string().min(1).optional(),
    title: z.string().min(1),
    detail: z.string().min(1),
    status: InterpretationStatusSchema.default("working"),
    confidence: InterpretationConfidenceSchema.default("medium"),
    basis: z.array(z.string().min(1)).optional(),
    supersedes: z.array(EntityIdSchema).optional(),
    relatedFiles: RelatedFilesSchema.optional()
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("set_interpretation_status"),
    cwd: z.string().min(1).optional(),
    id: z.string().min(1),
    status: InterpretationStatusSchema,
    confidence: InterpretationConfidenceSchema.optional(),
    detail: z.string().optional()
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("add_superseded_conclusion"),
    cwd: z.string().min(1).optional(),
    title: z.string().min(1),
    oldStatus: z.string().min(1),
    reason: z.string().min(1),
    replacement: z.string().min(1).optional(),
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
    transformedInto: z.array(EntityIdSchema).optional(),
    nextCheck: TimestampSchema.optional(),
    relatedFiles: RelatedFilesSchema.optional()
  }),
  z.object({
    domain: z.literal("memory"),
    action: z.literal("set_issue_status"),
    cwd: z.string().min(1).optional(),
    id: z.string().min(1),
    status: IssueStatusSchema,
    detail: z.string().optional()
    ,
    resolutionNote: z.string().optional(),
    transformedInto: z.array(EntityIdSchema).optional(),
    nextCheck: TimestampSchema.optional()
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
    domain: z.literal("phases"),
    action: z.literal("set_phase_status"),
    cwd: z.string().min(1).optional(),
    phaseId: z.string().min(1),
    status: z.enum(["todo", "in_progress", "done"])
  })
]);

const ShapeSurfaceInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  purpose: z.string().min(1),
  primaryUserGoal: z.string().min(1).optional(),
  entryConditions: z.array(z.string().min(1)).optional(),
  keyRegions: z.array(z.string().min(1)).optional(),
  connectedCapabilities: z.array(EntityIdSchema).optional(),
  connectedSurfaces: z.array(EntityIdSchema).optional(),
  flowNotes: z.array(z.string().min(1)).optional(),
  relatedFiles: RelatedFilesSchema.optional(),
  state: ShapeStateSchemaEnum.optional(),
  confidence: ShapeConfidenceSchema.optional()
});

const ShapeCapabilityInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  purpose: z.string().min(1),
  solves: z.string().min(1),
  surfacedIn: z.array(EntityIdSchema).optional(),
  supportedBy: z.array(EntityIdSchema).optional(),
  dependsOn: z.array(EntityIdSchema).optional(),
  inputs: z.array(z.string().min(1)).optional(),
  outputs: z.array(z.string().min(1)).optional(),
  relatedFiles: RelatedFilesSchema.optional(),
  state: ShapeStateSchemaEnum.optional(),
  confidence: ShapeConfidenceSchema.optional()
});

const ShapePartInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  role: z.string().min(1),
  boundary: z.string().min(1).optional(),
  supports: z.array(EntityIdSchema).optional(),
  dependsOn: z.array(EntityIdSchema).optional(),
  exposesTo: z.array(EntityIdSchema).optional(),
  relatedFiles: RelatedFilesSchema.optional(),
  state: ShapeStateSchemaEnum.optional(),
  confidence: ShapeConfidenceSchema.optional()
});

const ShapeDeltaSchema = z.object({
  summary: z.string().min(1).optional(),
  projectType: z.string().min(1).optional(),
  confidence: ShapeConfidenceSchema.optional(),
  surfaces: z.array(ShapeSurfaceInputSchema).max(6).optional(),
  capabilities: z.array(ShapeCapabilityInputSchema).max(6).optional(),
  parts: z.array(ShapePartInputSchema).max(6).optional(),
  remove: z.array(z.object({
    domain: ShapeDomainSchema,
    id: z.string().min(1)
  })).max(6).optional()
});

const CheckpointShapeInputSchema = z
  .object({
    summary: z.string().min(1).optional(),
    projectType: z.string().min(1).optional(),
    confidence: ShapeConfidenceSchema.optional(),
    surfaces: z.unknown().optional(),
    capabilities: z.unknown().optional(),
    parts: z.unknown().optional(),
    remove: z.unknown().optional()
  })
  .superRefine((value, ctx) => {
    const structuralKeys = ["surfaces", "capabilities", "parts", "remove"] as const;

    for (const key of structuralKeys) {
      if (value[key] !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message:
            "forge_checkpoint shape only accepts summary, projectType, and confidence. Use forge_shape and forge_update_shape for structural shape edits."
        });
      }
    }

    if (!value.summary && !value.projectType && !value.confidence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of summary, projectType, or confidence is required."
      });
    }
  })
  .transform(({ summary, projectType, confidence }) => ({
    ...(summary ? { summary } : {}),
    ...(projectType ? { projectType } : {}),
    ...(confidence ? { confidence } : {})
  }));

export const ForgeUpdateShapeInputSchema = z.union([
  z.object({
    cwd: z.string().min(1).optional(),
    action: z.literal("set_summary"),
    summary: z.string().min(1)
  }),
  z.object({
    cwd: z.string().min(1).optional(),
    action: z.literal("set_project_type"),
    projectType: z.string().min(1)
  }),
  z.object({
    cwd: z.string().min(1).optional(),
    action: z.literal("set_confidence"),
    confidence: ShapeConfidenceSchema
  }),
  z.object({
    cwd: z.string().min(1).optional(),
    action: z.literal("upsert_surface"),
    surface: ShapeSurfaceInputSchema
  }),
  z.object({
    cwd: z.string().min(1).optional(),
    action: z.literal("remove_surface"),
    id: z.string().min(1)
  }),
  z.object({
    cwd: z.string().min(1).optional(),
    action: z.literal("upsert_capability"),
    capability: ShapeCapabilityInputSchema
  }),
  z.object({
    cwd: z.string().min(1).optional(),
    action: z.literal("remove_capability"),
    id: z.string().min(1)
  }),
  z.object({
    cwd: z.string().min(1).optional(),
    action: z.literal("upsert_part"),
    part: ShapePartInputSchema
  }),
  z.object({
    cwd: z.string().min(1).optional(),
    action: z.literal("remove_part"),
    id: z.string().min(1)
  })
]);

export const ForgeCheckpointInputSchema = z.object({
  cwd: z.string().min(1).optional(),
  summary: z.object({
    summary: z.string().min(1),
    detail: z.string().optional(),
    relatedFiles: RelatedFilesSchema.optional()
  }).optional(),
  note: SmartNoteInputSchema.optional(),
  completedSteps: z.array(PhaseStepRefSchema).optional(),
  shape: CheckpointShapeInputSchema.optional(),
  session: z.object({
    summary: z.string().min(1).optional(),
    nextStep: z.string().min(1).optional()
  }).refine((value) => Boolean(value.summary || value.nextStep), {
    message: "At least one of summary or nextStep is required."
  }).optional(),
  closeSession: z.boolean().default(false)
}).refine(
  (value) =>
    Boolean(
        value.summary ||
        value.note ||
        (value.completedSteps && value.completedSteps.length > 0) ||
        value.shape ||
        value.session
    ),
  {
    message: "At least one of summary, note, completedSteps, shape, or session is required."
  }
);

export const ForgeCheckpointPayloadSchema = z.object({
  summary: z.object({
    summary: z.string().min(1),
    detail: z.string().optional(),
    relatedFiles: RelatedFilesSchema.optional()
  }).optional(),
  note: SmartNoteInputSchema.optional(),
  completedSteps: z.array(PhaseStepRefSchema).optional(),
  shape: CheckpointShapeInputSchema.optional(),
  session: z.object({
    summary: z.string().min(1).optional(),
    nextStep: z.string().min(1).optional()
  }).refine((value) => Boolean(value.summary || value.nextStep), {
    message: "At least one of summary or nextStep is required."
  }).optional(),
  closeSession: z.boolean().default(false)
}).refine(
  (value) =>
    Boolean(
        value.summary ||
        value.note ||
        (value.completedSteps && value.completedSteps.length > 0) ||
        value.shape ||
        value.session
    ),
  {
    message: "At least one of summary, note, completedSteps, shape, or session is required."
  }
);

export const ForgeCheckpointOutputSchema = z.object({
  status: z.literal("ok"),
  tool: z.literal("forge_checkpoint"),
  updatedFiles: z.array(z.enum(["memory", "plan", "phases", "shape"])).min(1),
  message: z.string(),
  entryId: z.string().optional(),
  noteId: z.string().optional(),
  completedSteps: z.array(z.object({
    phaseId: z.string(),
    stepId: z.string()
  })),
  sessionUpdated: z.boolean(),
  sessionClosed: z.boolean().default(false),
  shapeUpdated: z.boolean().default(false)
});

export const WriteResultSchema = z.object({
  status: z.literal("ok"),
  tool: z.string(),
  updatedFile: z.enum(["memory", "plan", "phases", "shape"]),
  message: z.string(),
  entityId: z.string().optional(),
  phaseId: z.string().optional(),
  stepId: z.string().optional()
});
