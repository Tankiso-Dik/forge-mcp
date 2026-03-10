import { randomUUID } from "node:crypto";

import type {
  DriftRecord,
  HabitRecord,
  IssueRecord,
  ObservationKind,
  ObservationRecord,
  ProjectContextItem,
  PromptRecord
} from "../types.js";

export function createEntityId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createContextItem(
  prefix: string,
  title: string,
  detail: string,
  relatedFiles: string[] = []
): ProjectContextItem {
  const timestamp = nowIso();

  return {
    id: createEntityId(prefix),
    title,
    detail,
    createdAt: timestamp,
    relatedFiles
  };
}

export function createPromptRecord(title: string, prompt: string, relatedFiles: string[] = []): PromptRecord {
  const timestamp = nowIso();

  return {
    id: createEntityId("prompt"),
    title,
    prompt,
    createdAt: timestamp,
    relatedFiles
  };
}

export function createObservationRecord(
  kind: ObservationKind,
  summary: string,
  detail?: string,
  relatedFiles: string[] = []
): ObservationRecord {
  return {
    id: createEntityId("obs"),
    kind,
    summary,
    detail,
    createdAt: nowIso(),
    relatedFiles
  };
}

export function createHabitRecord(
  description: string,
  status: HabitRecord["status"]
): HabitRecord {
  const timestamp = nowIso();

  return {
    id: createEntityId("habit"),
    description,
    status,
    createdAt: timestamp
  };
}

export function createIssueRecord(
  title: string,
  status: IssueRecord["status"],
  detail?: string,
  id?: string,
  relatedFiles: string[] = []
): IssueRecord {
  const timestamp = nowIso();

  const record: IssueRecord = {
    id: id ?? createEntityId("issue"),
    title,
    status,
    createdAt: timestamp,
    relatedFiles
  };

  if (detail) {
    record.detail = detail;
  }

  return record;
}

export function createDriftRecord(
  severity: DriftRecord["severity"],
  summary: string,
  recommendedAction: string,
  detail?: string,
  relatedFiles: string[] = []
): DriftRecord {
  const record: DriftRecord = {
    id: createEntityId("drift"),
    severity,
    status: "open",
    summary,
    recommendedAction,
    requiresAttention: severity === "high" || severity === "critical",
    createdAt: nowIso(),
    relatedFiles
  };

  if (detail) {
    record.detail = detail;
  }

  return record;
}
