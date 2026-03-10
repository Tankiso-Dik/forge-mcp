import os from "node:os";
import path from "node:path";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";

import {
  FORGE_DIRECTORY_NAME,
  GLOBAL_DIRECTORY_NAME,
  GLOBAL_FILE_NAME,
  MEMORY_FILE_NAME,
  PHASES_FILE_NAME,
  PLAN_FILE_NAME
} from "../constants.js";
import type { ForgePaths, ForgeProjectLocation } from "../types.js";

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveHomeDirectory(): string {
  return path.resolve(os.homedir());
}

export function isHomeDirectory(targetPath: string): boolean {
  return path.resolve(targetPath) === resolveHomeDirectory();
}

export async function discoverForgeProject(startCwd: string): Promise<ForgeProjectLocation> {
  const cwd = path.resolve(startCwd);
  const homeDirectory = resolveHomeDirectory();

  let currentDirectory = cwd;

  while (true) {
    const forgeDirectory = path.join(currentDirectory, FORGE_DIRECTORY_NAME);

    if (currentDirectory !== homeDirectory && await pathExists(forgeDirectory)) {
      return {
        managedProject: true,
        cwd,
        projectRoot: currentDirectory,
        forgeDirectory
      };
    }

    if (currentDirectory === homeDirectory) {
      break;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      break;
    }

    currentDirectory = parentDirectory;
  }

  return {
    managedProject: false,
    cwd,
    projectRoot: null,
    forgeDirectory: null
  };
}

export function buildForgePaths(location: ForgeProjectLocation): ForgePaths {
  const globalFilePath = path.join(os.homedir(), GLOBAL_DIRECTORY_NAME, GLOBAL_FILE_NAME);

  if (!location.forgeDirectory) {
    return {
      globalFilePath,
      memoryFilePath: null,
      planFilePath: null,
      phasesFilePath: null
    };
  }

  return {
    globalFilePath,
    memoryFilePath: path.join(location.forgeDirectory, MEMORY_FILE_NAME),
    planFilePath: path.join(location.forgeDirectory, PLAN_FILE_NAME),
    phasesFilePath: path.join(location.forgeDirectory, PHASES_FILE_NAME)
  };
}
