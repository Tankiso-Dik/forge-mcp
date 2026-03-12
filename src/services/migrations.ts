import { FILE_SCHEMA_VERSION } from "../constants.js";
import {
  GlobalStateSchema,
  MemoryStateSchema,
  PhasesStateSchema,
  PlanStateSchema,
  ShapeStateSchema
} from "../schemas.js";
import type {
  GlobalState,
  MemoryState,
  PhasesState,
  PlanState,
  ShapeState
} from "../types.js";

function assertSupportedVersion(value: unknown, label: string): void {
  if (!value || typeof value !== "object") {
    return;
  }

  const candidate = (value as { version?: unknown }).version;
  if (typeof candidate === "number" && candidate > FILE_SCHEMA_VERSION) {
    throw new Error(
      `${label} schema version ${candidate} is newer than supported version ${FILE_SCHEMA_VERSION}.`
    );
  }
}

export function normalizeGlobalState(value: unknown): GlobalState {
  assertSupportedVersion(value, "Global state");
  return GlobalStateSchema.parse(value ?? {});
}

export function normalizeMemoryState(value: unknown): MemoryState {
  assertSupportedVersion(value, "Memory state");
  return MemoryStateSchema.parse(value ?? {});
}

export function normalizePlanState(value: unknown): PlanState {
  assertSupportedVersion(value, "Plan state");
  return PlanStateSchema.parse(value ?? {});
}

export function normalizePhasesState(value: unknown): PhasesState {
  assertSupportedVersion(value, "Phases state");
  return PhasesStateSchema.parse(value ?? {});
}

export function normalizeShapeState(value: unknown): ShapeState {
  return ShapeStateSchema.parse(value ?? {});
}
