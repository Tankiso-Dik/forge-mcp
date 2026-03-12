import { randomUUID } from "node:crypto";

import type {
  InterpretationConfidence,
  InterpretationRecord,
  InterpretationStatus,
  IssueRecord,
  ProjectContextItem,
  SmartNote
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

export function createSmartNote(input: {
  kind: SmartNote["kind"];
  text: string;
  keywords?: string[];
  scope?: SmartNote["scope"];
  confidence?: SmartNote["confidence"];
  source?: SmartNote["source"];
  relatedFiles?: string[];
  status?: SmartNote["status"];
}): SmartNote {
  const timestamp = nowIso();

  return {
    id: createEntityId("note"),
    kind: input.kind,
    text: input.text,
    keywords: input.keywords ?? [],
    scope: input.scope ?? "project",
    confidence: input.confidence ?? "medium",
    source: input.source ?? "update",
    createdAt: timestamp,
    relatedFiles: input.relatedFiles ?? [],
    status: input.status ?? "active"
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
    transformedInto: [],
    relatedFiles
  };

  if (detail) {
    record.detail = detail;
  }

  return record;
}

export function createInterpretationRecord(input: {
  title: string;
  detail: string;
  status: InterpretationStatus;
  confidence: InterpretationConfidence;
  basis?: string[];
  supersedes?: string[];
  relatedFiles?: string[];
}): InterpretationRecord {
  const timestamp = nowIso();

  const record: InterpretationRecord = {
    id: createEntityId("interp"),
    title: input.title,
    status: input.status,
    confidence: input.confidence,
    detail: input.detail,
    basis: input.basis ?? [],
    supersedes: input.supersedes ?? [],
    createdAt: timestamp,
    relatedFiles: input.relatedFiles ?? []
  };

  return record;
}

export function createSupersededConclusion(input: {
  title: string;
  oldStatus: string;
  reason: string;
  replacement?: string;
  relatedFiles?: string[];
}) {
  return {
    id: createEntityId("sup"),
    title: input.title,
    oldStatus: input.oldStatus,
    newStatus: "superseded" as const,
    reason: input.reason,
    replacement: input.replacement,
    createdAt: nowIso(),
    relatedFiles: input.relatedFiles ?? []
  };
}
