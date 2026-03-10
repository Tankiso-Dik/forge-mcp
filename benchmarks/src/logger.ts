import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { BENCHMARK_LOGS_DIR } from "./constants.js";

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export class LiveRunLogger {
  readonly filePath: string;

  private constructor(filePath: string) {
    this.filePath = filePath;
  }

  static async create(): Promise<LiveRunLogger> {
    await mkdir(BENCHMARK_LOGS_DIR, { recursive: true });
    const filePath = path.join(BENCHMARK_LOGS_DIR, `benchmark-${timestampForFile()}.log`);
    return new LiveRunLogger(filePath);
  }

  async log(message: string): Promise<void> {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    await appendFile(this.filePath, line, "utf8");
  }
}
