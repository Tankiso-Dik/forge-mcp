import type {
  ForgeShapeReadOutput,
  ShapeCapability,
  ShapeConfidence,
  ShapeDomain,
  ShapeMeta,
  ShapePart,
  ShapeState,
  ShapeSurface
} from "../types.js";
import { createEntityId, nowIso } from "./records.js";

type ShapeSurfaceInput = {
  id?: string | undefined;
  name: string;
  purpose: string;
  primaryUserGoal?: string | undefined;
  entryConditions?: string[] | undefined;
  keyRegions?: string[] | undefined;
  connectedCapabilities?: string[] | undefined;
  connectedSurfaces?: string[] | undefined;
  flowNotes?: string[] | undefined;
  relatedFiles?: string[] | undefined;
  state?: ShapeSurface["state"] | undefined;
  confidence?: ShapeSurface["confidence"] | undefined;
};

type ShapeCapabilityInput = {
  id?: string | undefined;
  name: string;
  purpose: string;
  solves: string;
  surfacedIn?: string[] | undefined;
  supportedBy?: string[] | undefined;
  dependsOn?: string[] | undefined;
  inputs?: string[] | undefined;
  outputs?: string[] | undefined;
  relatedFiles?: string[] | undefined;
  state?: ShapeCapability["state"] | undefined;
  confidence?: ShapeCapability["confidence"] | undefined;
};

type ShapePartInput = {
  id?: string | undefined;
  name: string;
  role: string;
  boundary?: string | undefined;
  supports?: string[] | undefined;
  dependsOn?: string[] | undefined;
  exposesTo?: string[] | undefined;
  relatedFiles?: string[] | undefined;
  state?: ShapePart["state"] | undefined;
  confidence?: ShapePart["confidence"] | undefined;
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function mergeStringArrays(existing: string[], incoming?: string[]): string[] {
  return unique([...(existing ?? []), ...(incoming ?? [])]);
}

export function buildShapeMeta(shape: ShapeState): ShapeMeta {
  return {
    exists:
      Boolean(shape.summary.trim()) ||
      shape.surfaces.length > 0 ||
      shape.capabilities.length > 0 ||
      shape.parts.length > 0,
    projectType: shape.project_type,
    summary: shape.summary,
    updatedAt: shape.updated_at,
    confidence: shape.confidence,
    counts: {
      surfaces: shape.surfaces.length,
      capabilities: shape.capabilities.length,
      parts: shape.parts.length
    }
  };
}

function compactSurface(surface: ShapeSurface): ShapeSurface {
  return {
    ...surface,
    entryConditions: surface.entryConditions.slice(0, 3),
    keyRegions: surface.keyRegions.slice(0, 5),
    connectedCapabilities: surface.connectedCapabilities.slice(0, 4),
    connectedSurfaces: surface.connectedSurfaces.slice(0, 4),
    flowNotes: surface.flowNotes.slice(0, 3),
    relatedFiles: surface.relatedFiles.slice(0, 4)
  };
}

function compactCapability(capability: ShapeCapability): ShapeCapability {
  return {
    ...capability,
    surfacedIn: capability.surfacedIn.slice(0, 4),
    supportedBy: capability.supportedBy.slice(0, 4),
    dependsOn: capability.dependsOn.slice(0, 4),
    inputs: capability.inputs.slice(0, 4),
    outputs: capability.outputs.slice(0, 4),
    relatedFiles: capability.relatedFiles.slice(0, 4)
  };
}

function compactPart(part: ShapePart): ShapePart {
  return {
    ...part,
    supports: part.supports.slice(0, 4),
    dependsOn: part.dependsOn.slice(0, 4),
    exposesTo: part.exposesTo.slice(0, 4),
    relatedFiles: part.relatedFiles.slice(0, 4)
  };
}

export function readShapeView(input: {
  projectRoot: string;
  shape: ShapeState;
  domains: ShapeDomain[];
  mode: "compact" | "full";
}): ForgeShapeReadOutput {
  const domains: ShapeDomain[] = input.domains.length
    ? input.domains
    : ["surfaces", "capabilities", "parts"];
  const meta = buildShapeMeta(input.shape);

  return {
    status: "ok",
    tool: "forge_shape",
    projectRoot: input.projectRoot,
    domains,
    mode: input.mode,
    meta,
    shape: {
      ...(domains.includes("surfaces")
        ? {
            surfaces:
              input.mode === "compact"
                ? input.shape.surfaces.map(compactSurface)
                : input.shape.surfaces
          }
        : {}),
      ...(domains.includes("capabilities")
        ? {
            capabilities:
              input.mode === "compact"
                ? input.shape.capabilities.map(compactCapability)
                : input.shape.capabilities
          }
        : {}),
      ...(domains.includes("parts")
        ? {
            parts:
              input.mode === "compact"
                ? input.shape.parts.map(compactPart)
                : input.shape.parts
          }
        : {})
    }
  };
}

function upsertSurface(state: ShapeState, input: ShapeSurfaceInput) {
  const timestamp = nowIso();
  const existing = state.surfaces.find((entry) => entry.id === input.id || entry.name === input.name);
  if (existing) {
    existing.name = input.name;
    existing.purpose = input.purpose;
    existing.primaryUserGoal = input.primaryUserGoal ?? existing.primaryUserGoal;
    existing.entryConditions = mergeStringArrays(existing.entryConditions, input.entryConditions);
    existing.keyRegions = mergeStringArrays(existing.keyRegions, input.keyRegions);
    existing.connectedCapabilities = mergeStringArrays(existing.connectedCapabilities, input.connectedCapabilities);
    existing.connectedSurfaces = mergeStringArrays(existing.connectedSurfaces, input.connectedSurfaces);
    existing.flowNotes = mergeStringArrays(existing.flowNotes, input.flowNotes);
    existing.relatedFiles = mergeStringArrays(existing.relatedFiles, input.relatedFiles).slice(0, 10);
    existing.state = input.state ?? existing.state;
    existing.confidence = input.confidence ?? existing.confidence;
    existing.lastUpdated = timestamp;
    return { id: existing.id, message: `Updated surface '${existing.name}'.` };
  }

  const created: ShapeSurface = {
    id: input.id ?? createEntityId("surface"),
    name: input.name,
    purpose: input.purpose,
    ...(input.primaryUserGoal ? { primaryUserGoal: input.primaryUserGoal } : {}),
    entryConditions: input.entryConditions ?? [],
    keyRegions: input.keyRegions ?? [],
    connectedCapabilities: input.connectedCapabilities ?? [],
    connectedSurfaces: input.connectedSurfaces ?? [],
    flowNotes: input.flowNotes ?? [],
    relatedFiles: (input.relatedFiles ?? []).slice(0, 10),
    state: input.state ?? "active",
    confidence: input.confidence ?? "medium",
    lastUpdated: timestamp
  };
  state.surfaces.push(created);
  return { id: created.id, message: `Added surface '${created.name}'.` };
}

function upsertCapability(
  state: ShapeState,
  input: ShapeCapabilityInput
) {
  const timestamp = nowIso();
  const existing = state.capabilities.find((entry) => entry.id === input.id || entry.name === input.name);
  if (existing) {
    existing.name = input.name;
    existing.purpose = input.purpose;
    existing.solves = input.solves;
    existing.surfacedIn = mergeStringArrays(existing.surfacedIn, input.surfacedIn);
    existing.supportedBy = mergeStringArrays(existing.supportedBy, input.supportedBy);
    existing.dependsOn = mergeStringArrays(existing.dependsOn, input.dependsOn);
    existing.inputs = mergeStringArrays(existing.inputs, input.inputs);
    existing.outputs = mergeStringArrays(existing.outputs, input.outputs);
    existing.relatedFiles = mergeStringArrays(existing.relatedFiles, input.relatedFiles).slice(0, 10);
    existing.state = input.state ?? existing.state;
    existing.confidence = input.confidence ?? existing.confidence;
    existing.lastUpdated = timestamp;
    return { id: existing.id, message: `Updated capability '${existing.name}'.` };
  }

  const created: ShapeCapability = {
    id: input.id ?? createEntityId("capability"),
    name: input.name,
    purpose: input.purpose,
    solves: input.solves,
    surfacedIn: input.surfacedIn ?? [],
    supportedBy: input.supportedBy ?? [],
    dependsOn: input.dependsOn ?? [],
    inputs: input.inputs ?? [],
    outputs: input.outputs ?? [],
    relatedFiles: (input.relatedFiles ?? []).slice(0, 10),
    state: input.state ?? "active",
    confidence: input.confidence ?? "medium",
    lastUpdated: timestamp
  };
  state.capabilities.push(created);
  return { id: created.id, message: `Added capability '${created.name}'.` };
}

function upsertPart(state: ShapeState, input: ShapePartInput) {
  const timestamp = nowIso();
  const existing = state.parts.find((entry) => entry.id === input.id || entry.name === input.name);
  if (existing) {
    existing.name = input.name;
    existing.role = input.role;
    existing.boundary = input.boundary ?? existing.boundary;
    existing.supports = mergeStringArrays(existing.supports, input.supports);
    existing.dependsOn = mergeStringArrays(existing.dependsOn, input.dependsOn);
    existing.exposesTo = mergeStringArrays(existing.exposesTo, input.exposesTo);
    existing.relatedFiles = mergeStringArrays(existing.relatedFiles, input.relatedFiles).slice(0, 10);
    existing.state = input.state ?? existing.state;
    existing.confidence = input.confidence ?? existing.confidence;
    existing.lastUpdated = timestamp;
    return { id: existing.id, message: `Updated part '${existing.name}'.` };
  }

  const created: ShapePart = {
    id: input.id ?? createEntityId("part"),
    name: input.name,
    role: input.role,
    ...(input.boundary ? { boundary: input.boundary } : {}),
    supports: input.supports ?? [],
    dependsOn: input.dependsOn ?? [],
    exposesTo: input.exposesTo ?? [],
    relatedFiles: (input.relatedFiles ?? []).slice(0, 10),
    state: input.state ?? "active",
    confidence: input.confidence ?? "medium",
    lastUpdated: timestamp
  };
  state.parts.push(created);
  return { id: created.id, message: `Added part '${created.name}'.` };
}

function removeById<T extends { id: string; name: string }>(items: T[], id: string, label: string) {
  const index = items.findIndex((entry) => entry.id === id);
  if (index === -1) {
    throw new Error(`${label} '${id}' was not found.`);
  }
  const [removed] = items.splice(index, 1);
  return `Removed ${label.toLowerCase()} '${removed!.name}'.`;
}

export function applyShapeDelta(
  state: ShapeState,
  delta: {
    summary?: string | undefined;
    projectType?: string | undefined;
    confidence?: ShapeConfidence | undefined;
    surfaces?: ShapeSurfaceInput[] | undefined;
    capabilities?: ShapeCapabilityInput[] | undefined;
    parts?: ShapePartInput[] | undefined;
    remove?: Array<{ domain: ShapeDomain; id: string }> | undefined;
  }
): string[] {
  const messages: string[] = [];

  if (delta.summary) {
    state.summary = delta.summary;
    messages.push("Updated shape summary.");
  }
  if (delta.projectType) {
    state.project_type = delta.projectType;
    messages.push(`Set shape project type to '${delta.projectType}'.`);
  }
  if (delta.confidence) {
    state.confidence = delta.confidence;
    messages.push(`Set shape confidence to '${delta.confidence}'.`);
  }
  for (const surface of delta.surfaces ?? []) {
    messages.push(upsertSurface(state, surface).message);
  }
  for (const capability of delta.capabilities ?? []) {
    messages.push(upsertCapability(state, capability).message);
  }
  for (const part of delta.parts ?? []) {
    messages.push(upsertPart(state, part).message);
  }
  for (const item of delta.remove ?? []) {
    if (item.domain === "surfaces") {
      messages.push(removeById(state.surfaces, item.id, "Surface"));
    } else if (item.domain === "capabilities") {
      messages.push(removeById(state.capabilities, item.id, "Capability"));
    } else {
      messages.push(removeById(state.parts, item.id, "Part"));
    }
  }

  if (messages.length > 0) {
    state.updated_at = nowIso();
  }

  return messages;
}
