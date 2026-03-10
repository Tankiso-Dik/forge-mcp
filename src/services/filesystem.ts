import path from "node:path";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import type { JsonLoadResult } from "../types.js";

export async function readJsonFile<T>(
  filePath: string,
  parse: (value: unknown) => T,
  fallback: T
): Promise<JsonLoadResult<T>> {
  try {
    const raw = await readFile(filePath, "utf8");
    const json = JSON.parse(raw) as unknown;

    return {
      exists: true,
      source: "disk",
      value: parse(json)
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return {
        exists: false,
        source: "default",
        value: fallback
      };
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }

    throw error;
  }
}

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const directory = path.dirname(filePath);
  const tempFilePath = path.join(
    directory,
    `.${path.basename(filePath)}.${randomUUID()}.tmp`
  );

  await mkdir(directory, { recursive: true });
  await writeFile(tempFilePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempFilePath, filePath);
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
