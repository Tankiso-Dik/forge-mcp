import {
  FileStatusSchema,
  ForgeLoadOutputSchema,
  MemoryStateSchema,
  PhasesStateSchema,
  PlanStateSchema
} from "../schemas.js";
import type {
  FileStatus,
  ForgePaths,
  ForgeLoadOutput,
  ForgeProjectLocation,
  GlobalState,
  MemoryState,
  PhasesState,
  PlanState
} from "../types.js";
import {
  normalizeGlobalState,
  normalizeMemoryState,
  normalizePhasesState,
  normalizePlanState
} from "./migrations.js";
import { buildForgePaths, discoverForgeProject, isHomeDirectory } from "./discovery.js";
import { readJsonFile, writeJsonAtomic } from "./filesystem.js";
import { initializeForgeProject } from "./init.js";
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
  };
  memory: MemoryState;
  plan: PlanState;
  phases: PhasesState;
}

async function resolveActiveForgeLocation(startCwd: string): Promise<ForgeProjectLocation> {
  const initialLocation = await discoverForgeProject(startCwd);

  if (initialLocation.managedProject || isHomeDirectory(initialLocation.cwd)) {
    return initialLocation;
  }

  await initializeForgeProject(initialLocation.cwd, false);
  return discoverForgeProject(initialLocation.cwd);
}

export async function loadForgeState(startCwd: string): Promise<ForgeLoadOutput> {
  const location = await resolveActiveForgeLocation(startCwd);
  const paths = buildForgePaths(location);

  const [globalResult, memoryResult, planResult, phasesResult] = await Promise.all([
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
    global: globalResult.value,
    memory: memoryResult?.value ?? null,
    plan: planResult?.value ?? null,
    phases: phasesResult?.value ?? null,
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

export async function loadManagedForgeState(startCwd: string): Promise<ManagedForgeState> {
  const location = await resolveActiveForgeLocation(startCwd);

  if (!location.managedProject || !location.projectRoot || !location.forgeDirectory) {
    throw new Error(
      `Forge auto-bootstrap is disabled for the home directory (${location.cwd}). Use a project subdirectory or initialize a different directory explicitly.`
    );
  }

  const paths = buildForgePaths(location);

  if (!paths.memoryFilePath || !paths.planFilePath || !paths.phasesFilePath) {
    throw new Error("Forge project paths could not be resolved.");
  }

  const [memoryResult, planResult, phasesResult] = await Promise.all([
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
      phasesFilePath: paths.phasesFilePath
    },
    memory: memoryResult.value,
    plan: planResult.value,
    phases: phasesResult.value
  };
}
