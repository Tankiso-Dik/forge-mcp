import {
  FileStatusSchema,
  ForgeLoadOutputSchema,
  MemoryStateSchema,
  PhasesStateSchema,
  PlanStateSchema,
  ShapeMetaSchema,
  ShapeStateSchema
} from "../schemas.js";
import type {
  FileStatus,
  ForgePaths,
  ForgeLoadOutput,
  ForgeProjectLocation,
  GlobalState,
  MemoryState,
  PhasesState,
  PlanState,
  ShapeMeta,
  ShapeState
} from "../types.js";
import {
  normalizeGlobalState,
  normalizeMemoryState,
  normalizePhasesState,
  normalizePlanState,
  normalizeShapeState
} from "./migrations.js";
import { buildForgePaths, discoverForgeProject, isHomeDirectory } from "./discovery.js";
import { readJsonFile, writeJsonAtomic } from "./filesystem.js";
import { buildShapeMeta } from "./shape.js";
import { buildWorkingView } from "./working-view.js";

function toFileStatus(pathValue: string, exists: boolean, source: "default" | "disk"): FileStatus {
  return FileStatusSchema.parse({
    path: pathValue,
    exists,
    source
  });
}

export interface ManagedForgeState {
  location: ForgeProjectLocation & {
    managedProject: true;
    projectRoot: string;
    forgeDirectory: string;
  };
  paths: ForgePaths & {
    memoryFilePath: string;
    planFilePath: string;
    phasesFilePath: string;
    shapeFilePath: string;
  };
  memory: MemoryState;
  plan: PlanState;
  phases: PhasesState;
  shape: ShapeState;
}

async function resolveActiveForgeLocation(startCwd: string): Promise<ForgeProjectLocation> {
  return discoverForgeProject(startCwd);
}

export async function loadForgeState(
  startCwd: string,
  mode: "compact" | "full" = "compact"
): Promise<ForgeLoadOutput> {
  const location = await resolveActiveForgeLocation(startCwd);
  const paths = buildForgePaths(location);

  const [globalResult, memoryResult, planResult, phasesResult, shapeResult] = await Promise.all([
    readJsonFile<GlobalState>(paths.globalFilePath, normalizeGlobalState, normalizeGlobalState({})),
    paths.memoryFilePath
      ? readJsonFile<MemoryState>(
          paths.memoryFilePath,
          normalizeMemoryState,
          normalizeMemoryState({})
        )
      : Promise.resolve(null),
    paths.planFilePath
      ? readJsonFile<PlanState>(paths.planFilePath, normalizePlanState, normalizePlanState({}))
      : Promise.resolve(null),
    paths.phasesFilePath
      ? readJsonFile<PhasesState>(
          paths.phasesFilePath,
          normalizePhasesState,
          normalizePhasesState({})
        )
      : Promise.resolve(null),
    paths.shapeFilePath
      ? readJsonFile<ShapeState>(
          paths.shapeFilePath,
          normalizeShapeState,
          normalizeShapeState({})
        )
      : Promise.resolve(null)
  ]);

  const workingView =
    memoryResult && planResult && phasesResult
      ? buildWorkingView(
          globalResult.value,
          memoryResult.value,
          planResult.value,
          phasesResult.value.phases,
          location.projectRoot ?? location.cwd
        )
      : null;

  return ForgeLoadOutputSchema.parse({
    managedProject: location.managedProject,
    cwd: location.cwd,
    projectRoot: location.projectRoot,
    forgeDirectory: location.forgeDirectory,
    mode,
    global: globalResult.value,
    memory: mode === "full" ? memoryResult?.value ?? null : null,
    plan: mode === "full" ? planResult?.value ?? null : null,
    phases: mode === "full" ? phasesResult?.value ?? null : null,
    shapeMeta: shapeResult
      ? ShapeMetaSchema.parse({
          ...buildShapeMeta(shapeResult.value),
          exists: shapeResult.exists
        })
      : null,
    workingView,
    files: {
      global: toFileStatus(paths.globalFilePath, globalResult.exists, globalResult.source),
      memory: paths.memoryFilePath && memoryResult
        ? toFileStatus(paths.memoryFilePath, memoryResult.exists, memoryResult.source)
        : null,
      plan: paths.planFilePath && planResult
        ? toFileStatus(paths.planFilePath, planResult.exists, planResult.source)
        : null,
      phases: paths.phasesFilePath && phasesResult
        ? toFileStatus(paths.phasesFilePath, phasesResult.exists, phasesResult.source)
        : null,
      shape: paths.shapeFilePath && shapeResult
        ? toFileStatus(paths.shapeFilePath, shapeResult.exists, shapeResult.source)
        : null
    }
  });
}

export async function saveMemoryState(filePath: string, value: MemoryState): Promise<void> {
  await writeJsonAtomic(filePath, MemoryStateSchema.parse(value));
}

export async function savePlanState(filePath: string, value: PlanState): Promise<void> {
  await writeJsonAtomic(filePath, PlanStateSchema.parse(value));
}

export async function savePhasesState(filePath: string, value: PhasesState): Promise<void> {
  await writeJsonAtomic(filePath, PhasesStateSchema.parse(value));
}

export async function saveShapeState(filePath: string, value: ShapeState): Promise<void> {
  await writeJsonAtomic(filePath, ShapeStateSchema.parse(value));
}

export async function loadManagedForgeState(startCwd: string): Promise<ManagedForgeState> {
  const location = await resolveActiveForgeLocation(startCwd);

  if (!location.managedProject || !location.projectRoot || !location.forgeDirectory) {
    if (isHomeDirectory(location.cwd)) {
      throw new Error(
        `Forge is not active in the home directory (${location.cwd}). Use a project subdirectory or initialize a different directory explicitly.`
      );
    }

    throw new Error(
      `No Forge project was found for '${location.cwd}'. Run forge_init first if you want this directory to be managed.`
    );
  }

  const paths = buildForgePaths(location);

  if (!paths.memoryFilePath || !paths.planFilePath || !paths.phasesFilePath || !paths.shapeFilePath) {
    throw new Error("Forge project paths could not be resolved.");
  }

  const [memoryResult, planResult, phasesResult, shapeResult] = await Promise.all([
    readJsonFile<MemoryState>(
      paths.memoryFilePath,
      normalizeMemoryState,
      normalizeMemoryState({})
    ),
    readJsonFile<PlanState>(
      paths.planFilePath,
      normalizePlanState,
      normalizePlanState({})
    ),
    readJsonFile<PhasesState>(
      paths.phasesFilePath,
      normalizePhasesState,
      normalizePhasesState({})
    ),
    readJsonFile<ShapeState>(
      paths.shapeFilePath,
      normalizeShapeState,
      normalizeShapeState({})
    )
  ]);

  return {
    location: {
      managedProject: true,
      cwd: location.cwd,
      projectRoot: location.projectRoot,
      forgeDirectory: location.forgeDirectory
    },
    paths: {
      globalFilePath: paths.globalFilePath,
      memoryFilePath: paths.memoryFilePath,
      planFilePath: paths.planFilePath,
      phasesFilePath: paths.phasesFilePath,
      shapeFilePath: paths.shapeFilePath
    },
    memory: memoryResult.value,
    plan: planResult.value,
    phases: phasesResult.value,
    shape: shapeResult.value
  };
}
