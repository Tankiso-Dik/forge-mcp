import path from "node:path";

import { ISSUES_AND_NICETIES_ASKED_FILE_NAME } from "../constants.js";
import { IssuesAndNicetiesAskedFileSchema } from "../schemas.js";
import type {
  ForgeSessionEndInput,
  IssuesAndNicetiesAskedEntry,
  IssuesAndNicetiesAskedFile,
  IssuesAndNicetiesAskedInputItem
} from "../types.js";
import { readJsonFile, writeJsonAtomic } from "./filesystem.js";
import { createEntityId, nowIso } from "./records.js";

export function getIssuesAndNicetiesAskedFilePath(forgeDirectory: string): string {
  return path.join(forgeDirectory, ISSUES_AND_NICETIES_ASKED_FILE_NAME);
}

export async function appendIssuesAndNicetiesAsked(
  forgeDirectory: string,
  entries: IssuesAndNicetiesAskedInputItem[],
  session: Pick<ForgeSessionEndInput, "summary" | "nextStep">
): Promise<{
  filePath: string;
  entries: IssuesAndNicetiesAskedEntry[];
}> {
  const filePath = getIssuesAndNicetiesAskedFilePath(forgeDirectory);
  const loaded = await readJsonFile<IssuesAndNicetiesAskedFile>(
    filePath,
    (value) => IssuesAndNicetiesAskedFileSchema.parse(value),
    IssuesAndNicetiesAskedFileSchema.parse({})
  );

  const createdEntries = entries.map((entry) => ({
    id: createEntityId("feedback"),
    kind: entry.kind,
    summary: entry.summary,
    detail: entry.detail,
    whatWouldHaveHelped: entry.whatWouldHaveHelped,
    createdAt: nowIso(),
    sessionSummary: session.summary,
    nextStep: session.nextStep
  }));

  const nextFile = IssuesAndNicetiesAskedFileSchema.parse({
    ...loaded.value,
    entries: [...loaded.value.entries, ...createdEntries]
  });

  await writeJsonAtomic(filePath, nextFile);

  return {
    filePath,
    entries: createdEntries
  };
}
