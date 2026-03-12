import type { z } from "zod";

import type {
  FileStatusSchema,
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
  GlobalStateSchema,
  IssueRecordSchema,
  IssueStatusSchema,
  MemoryStateSchema,
  InterpretationStatusSchema,
  InterpretationConfidenceSchema,
  InterpretationRecordSchema,
  PhaseStateSchema,
  PhasesStateSchema,
  PlanStateSchema,
  ProjectContextItemSchema,
  SmartNoteKindSchema,
  SmartNoteSchema,
  SmartNoteScopeSchema,
  SmartNoteSourceSchema,
  SmartNoteStatusSchema,
  SupersededConclusionSchema,
  SessionStateSchema,
  StepStateSchema,
  PhaseStepRefSchema,
  ShapeCapabilitySchema,
  ShapeConfidenceSchema,
  ShapeDomainSchema,
  ShapeMetaSchema,
  ShapePartSchema,
  ShapeStateSchema,
  ShapeSurfaceSchema,
  WorkingViewSchema,
  SeveritySchema,
  WriteResultSchema
} from "./schemas.js";

export type GlobalState = z.infer<typeof GlobalStateSchema>;
export type ProjectContextItem = z.infer<typeof ProjectContextItemSchema>;
export type SmartNoteKind = z.infer<typeof SmartNoteKindSchema>;
export type SmartNoteScope = z.infer<typeof SmartNoteScopeSchema>;
export type SmartNoteStatus = z.infer<typeof SmartNoteStatusSchema>;
export type SmartNoteSource = z.infer<typeof SmartNoteSourceSchema>;
export type SmartNote = z.infer<typeof SmartNoteSchema>;
export type InterpretationStatus = z.infer<typeof InterpretationStatusSchema>;
export type InterpretationConfidence = z.infer<typeof InterpretationConfidenceSchema>;
export type InterpretationRecord = z.infer<typeof InterpretationRecordSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type IssueStatus = z.infer<typeof IssueStatusSchema>;
export type IssueRecord = z.infer<typeof IssueRecordSchema>;
export type SupersededConclusion = z.infer<typeof SupersededConclusionSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;
export type MemoryState = z.infer<typeof MemoryStateSchema>;
export type PlanState = z.infer<typeof PlanStateSchema>;
export type StepState = z.infer<typeof StepStateSchema>;
export type PhaseState = z.infer<typeof PhaseStateSchema>;
export type PhasesState = z.infer<typeof PhasesStateSchema>;
export type WorkingView = z.infer<typeof WorkingViewSchema>;
export type ShapeConfidence = z.infer<typeof ShapeConfidenceSchema>;
export type ShapeDomain = z.infer<typeof ShapeDomainSchema>;
export type ShapeSurface = z.infer<typeof ShapeSurfaceSchema>;
export type ShapeCapability = z.infer<typeof ShapeCapabilitySchema>;
export type ShapePart = z.infer<typeof ShapePartSchema>;
export type ShapeState = z.infer<typeof ShapeStateSchema>;
export type ShapeMeta = z.infer<typeof ShapeMetaSchema>;
export type PhaseStepRef = z.infer<typeof PhaseStepRefSchema>;
export type ForgeLoadInput = z.infer<typeof ForgeLoadInputSchema>;
export type ForgeInitInput = z.infer<typeof ForgeInitInputSchema>;
export type ForgeInitOutput = z.infer<typeof ForgeInitOutputSchema>;
export type ForgeShapeReadInput = z.infer<typeof ForgeShapeReadInputSchema>;
export type ForgeShapeReadOutput = z.infer<typeof ForgeShapeReadOutputSchema>;
export type ForgeLoadOutput = z.infer<typeof ForgeLoadOutputSchema>;
export type ForgeUpdateInput = z.infer<typeof ForgeUpdateInputSchema>;
export type ForgeUpdateShapeInput = z.infer<typeof ForgeUpdateShapeInputSchema>;
export type ForgeCheckpointInput = z.infer<typeof ForgeCheckpointInputSchema>;
export type ForgeCheckpointOutput = z.infer<typeof ForgeCheckpointOutputSchema>;
export type FileStatus = z.infer<typeof FileStatusSchema>;
export type WriteResult = z.infer<typeof WriteResultSchema>;

export interface ForgeProjectLocation {
  managedProject: boolean;
  cwd: string;
  projectRoot: string | null;
  forgeDirectory: string | null;
}

export interface ForgePaths {
  globalFilePath: string;
  memoryFilePath: string | null;
  planFilePath: string | null;
  phasesFilePath: string | null;
  shapeFilePath: string | null;
}

export interface JsonLoadResult<T> {
  exists: boolean;
  source: "default" | "disk";
  value: T;
}
