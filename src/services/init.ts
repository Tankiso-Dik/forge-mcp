import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

import {
  FORGE_DIRECTORY_NAME,
  MEMORY_FILE_NAME,
  PHASES_FILE_NAME,
  PLAN_FILE_NAME,
  SHAPE_FILE_NAME
} from "../constants.js";
import {
  ForgeInitOutputSchema,
  MemoryStateSchema,
  PhasesStateSchema,
  PlanStateSchema,
  ShapeStateSchema
} from "../schemas.js";
import { writeJsonAtomic } from "./filesystem.js";
import type { ForgeInitOutput } from "../types.js";

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function initializeForgeProject(
  startCwd: string,
  force: boolean
): Promise<ForgeInitOutput> {
  const projectRoot = path.resolve(startCwd);

  if (!(await pathExists(projectRoot))) {
    throw new Error(`Target directory does not exist: ${projectRoot}`);
  }

  const forgeDirectory = path.join(projectRoot, FORGE_DIRECTORY_NAME);
  const memoryFilePath = path.join(forgeDirectory, MEMORY_FILE_NAME);
  const planFilePath = path.join(forgeDirectory, PLAN_FILE_NAME);
  const phasesFilePath = path.join(forgeDirectory, PHASES_FILE_NAME);
  const shapeFilePath = path.join(forgeDirectory, SHAPE_FILE_NAME);

  const existingForgeFiles = (
    await Promise.all([
      pathExists(memoryFilePath),
      pathExists(planFilePath),
      pathExists(phasesFilePath),
      pathExists(shapeFilePath)
    ])
  )
    .map((exists, index) =>
      exists ? [MEMORY_FILE_NAME, PLAN_FILE_NAME, PHASES_FILE_NAME, SHAPE_FILE_NAME][index] : null
    )
    .filter((value): value is string => value !== null);

  if (existingForgeFiles.length > 0 && !force) {
    throw new Error(
      `Forge project already exists at ${forgeDirectory}. Refusing to overwrite ${existingForgeFiles.join(
        ", "
      )} without force=true.`
    );
  }

  await Promise.all([
    writeJsonAtomic(memoryFilePath, MemoryStateSchema.parse({})),
    writeJsonAtomic(planFilePath, PlanStateSchema.parse({})),
    writeJsonAtomic(phasesFilePath, PhasesStateSchema.parse({})),
    writeJsonAtomic(shapeFilePath, ShapeStateSchema.parse({}))
  ]);

  return ForgeInitOutputSchema.parse({
    status: "ok",
    tool: "forge_init",
    projectRoot,
    forgeDirectory,
    forced: force,
    files: {
      memory: memoryFilePath,
      plan: planFilePath,
      phases: phasesFilePath,
      shape: shapeFilePath
    },
    message:
      existingForgeFiles.length > 0 && force
        ? `Reinitialized Forge files in ${forgeDirectory}.`
        : `Initialized Forge project in ${forgeDirectory}.`
  });
}
