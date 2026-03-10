import { cp, mkdir, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { BENCHMARK_FIXTURES_DIR } from "./constants.js";
import type { FixtureManifest, MaterializedFixture } from "./types.js";

async function loadFixtureManifest(fixtureName: string): Promise<FixtureManifest> {
  const manifestPath = path.join(BENCHMARK_FIXTURES_DIR, fixtureName, "fixture.json");
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw) as FixtureManifest;
}

export async function materializeFixture(fixtureName: string): Promise<MaterializedFixture> {
  const sourceDir = path.join(BENCHMARK_FIXTURES_DIR, fixtureName);
  const manifest = await loadFixtureManifest(fixtureName);
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), `forge-benchmark-${fixtureName}-`));

  await mkdir(workspaceDir, { recursive: true });
  await cp(sourceDir, workspaceDir, { recursive: true });

  const entryRelative = manifest.entryCwd ?? ".";

  return {
    name: manifest.name,
    description: manifest.description,
    sourceDir,
    workspaceDir,
    entryCwd: path.resolve(workspaceDir, entryRelative),
    resolve(relativePath = ".") {
      return path.resolve(workspaceDir, relativePath);
    },
    async readJson<T>(relativePath: string): Promise<T> {
      const raw = await readFile(path.join(workspaceDir, relativePath), "utf8");
      return JSON.parse(raw) as T;
    },
    async readText(relativePath: string): Promise<string> {
      return readFile(path.join(workspaceDir, relativePath), "utf8");
    }
  };
}
