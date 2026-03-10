import type { z } from "zod";

import type {
  DriftRecordSchema,
  FileStatusSchema,
  ForgeCompareExecutionInputSchema,
  ForgeCompareExecutionOutputSchema,
  ForgeFlagDriftInputSchema,
  ForgeCheckpointInputSchema,
  ForgeCheckpointOutputSchema,
  ForgeConfidenceSchema,
  ForgeInitInputSchema,
  ForgeInitOutputSchema,
  ForgeLoadInputSchema,
  ForgeLoadOutputSchema,
  ForgeEngagementModeSchema,
  ForgeProjectScaleSchema,
  ForgeLogInputSchema,
  ForgeReasonCodeSchema,
  ForgeSessionDraftInputSchema,
  ForgeSessionDraftOutputSchema,
  ForgeSuggestUpdateInputSchema,
  ForgeSuggestUpdateOutputSchema,
  ForgeSuggestUpdateRecommendationSchema,
  ForgeSuggestedUpdateShapeSchema,
  ForgeUseForgeSchema,
  ForgeWriteStyleSchema,
  IssuesAndNicetiesAskedFileSchema,
  IssuesAndNicetiesAskedInputItemSchema,
  IssuesAndNicetiesAskedEntrySchema,
  IssuesAndNicetiesKindSchema,
  ForgeRebuildPhasesInputSchema,
  ForgeSessionEndInputSchema,
  ForgeSessionEndOutputSchema,
  ForgeStepDoneInputSchema,
  ForgeUpdateInputSchema,
  GlobalStateSchema,
  HabitRecordSchema,
  IssueRecordSchema,
  IssueStatusSchema,
  MemoryStateSchema,
  DriftStatusSchema,
  ObservationKindSchema,
  ObservationRecordSchema,
  PhaseStateSchema,
  PhasesStateSchema,
  PlanStateSchema,
  ProjectContextItemSchema,
  PromptRecordSchema,
  SessionDraftReadinessSchema,
  SessionStateSchema,
  StepStateSchema,
  PhaseStepRefSchema,
  WorkingViewSchema,
  SeveritySchema,
  WriteResultSchema
} from "./schemas.js";

export type GlobalState = z.infer<typeof GlobalStateSchema>;
export type ProjectContextItem = z.infer<typeof ProjectContextItemSchema>;
export type HabitRecord = z.infer<typeof HabitRecordSchema>;
export type PromptRecord = z.infer<typeof PromptRecordSchema>;
export type ObservationKind = z.infer<typeof ObservationKindSchema>;
export type ObservationRecord = z.infer<typeof ObservationRecordSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type IssueStatus = z.infer<typeof IssueStatusSchema>;
export type DriftStatus = z.infer<typeof DriftStatusSchema>;
export type IssueRecord = z.infer<typeof IssueRecordSchema>;
export type DriftRecord = z.infer<typeof DriftRecordSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;
export type MemoryState = z.infer<typeof MemoryStateSchema>;
export type PlanState = z.infer<typeof PlanStateSchema>;
export type StepState = z.infer<typeof StepStateSchema>;
export type PhaseState = z.infer<typeof PhaseStateSchema>;
export type PhasesState = z.infer<typeof PhasesStateSchema>;
export type WorkingView = z.infer<typeof WorkingViewSchema>;
export type ForgeEngagementMode = z.infer<typeof ForgeEngagementModeSchema>;
export type ForgeProjectScale = z.infer<typeof ForgeProjectScaleSchema>;
export type ForgeReasonCode = z.infer<typeof ForgeReasonCodeSchema>;
export type ForgeConfidence = z.infer<typeof ForgeConfidenceSchema>;
export type ForgeWriteStyle = z.infer<typeof ForgeWriteStyleSchema>;
export type ForgeUseForge = z.infer<typeof ForgeUseForgeSchema>;
export type ForgeSuggestUpdateRecommendation = z.infer<typeof ForgeSuggestUpdateRecommendationSchema>;
export type ForgeSuggestedUpdateShape = z.infer<typeof ForgeSuggestedUpdateShapeSchema>;
export type PhaseStepRef = z.infer<typeof PhaseStepRefSchema>;
export type SessionDraftReadiness = z.infer<typeof SessionDraftReadinessSchema>;
export type IssuesAndNicetiesKind = z.infer<typeof IssuesAndNicetiesKindSchema>;
export type IssuesAndNicetiesAskedInputItem = z.infer<typeof IssuesAndNicetiesAskedInputItemSchema>;
export type IssuesAndNicetiesAskedEntry = z.infer<typeof IssuesAndNicetiesAskedEntrySchema>;
export type IssuesAndNicetiesAskedFile = z.infer<typeof IssuesAndNicetiesAskedFileSchema>;
export type ForgeLoadInput = z.infer<typeof ForgeLoadInputSchema>;
export type ForgeInitInput = z.infer<typeof ForgeInitInputSchema>;
export type ForgeInitOutput = z.infer<typeof ForgeInitOutputSchema>;
export type ForgeLoadOutput = z.infer<typeof ForgeLoadOutputSchema>;
export type ForgeUpdateInput = z.infer<typeof ForgeUpdateInputSchema>;
export type ForgeLogInput = z.infer<typeof ForgeLogInputSchema>;
export type ForgeStepDoneInput = z.infer<typeof ForgeStepDoneInputSchema>;
export type ForgeCheckpointInput = z.infer<typeof ForgeCheckpointInputSchema>;
export type ForgeCheckpointOutput = z.infer<typeof ForgeCheckpointOutputSchema>;
export type ForgeCompareExecutionInput = z.infer<typeof ForgeCompareExecutionInputSchema>;
export type ForgeCompareExecutionOutput = z.infer<typeof ForgeCompareExecutionOutputSchema>;
export type ForgeSuggestUpdateInput = z.infer<typeof ForgeSuggestUpdateInputSchema>;
export type ForgeSuggestUpdateOutput = z.infer<typeof ForgeSuggestUpdateOutputSchema>;
export type ForgeSessionDraftInput = z.infer<typeof ForgeSessionDraftInputSchema>;
export type ForgeSessionDraftOutput = z.infer<typeof ForgeSessionDraftOutputSchema>;
export type ForgeRebuildPhasesInput = z.infer<typeof ForgeRebuildPhasesInputSchema>;
export type ForgeFlagDriftInput = z.infer<typeof ForgeFlagDriftInputSchema>;
export type ForgeSessionEndInput = z.infer<typeof ForgeSessionEndInputSchema>;
export type ForgeSessionEndOutput = z.infer<typeof ForgeSessionEndOutputSchema>;
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
}

export interface JsonLoadResult<T> {
  exists: boolean;
  source: "default" | "disk";
  value: T;
}
