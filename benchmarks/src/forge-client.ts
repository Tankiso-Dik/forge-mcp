import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerForgeTools } from "../../src/tools/forge.js";
import type {
  BenchmarkToolCallRecord,
  BenchmarkTransport,
  ForgeBenchmarkClient
} from "./types.js";
import type { LiveRunLogger } from "./logger.js";

interface RegisteredToolEntry {
  inputSchema?: {
    parse(value: unknown): unknown;
  };
  outputSchema?: {
    parse(value: unknown): unknown;
  };
  handler(args: unknown): Promise<{ structuredContent?: unknown }>;
}

interface RegisteredToolMap {
  _registeredTools: Record<string, RegisteredToolEntry>;
}

function buildStdioEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function previewInput(value: unknown): string {
  const json = JSON.stringify(value);
  if (!json) {
    return "";
  }

  return json.length > 160 ? `${json.slice(0, 157)}...` : json;
}

abstract class BaseForgeBenchmarkClient implements ForgeBenchmarkClient {
  readonly startupDurationMs: number;
  abstract readonly transport: BenchmarkTransport;
  protected readonly toolCalls: BenchmarkToolCallRecord[] = [];

  protected constructor(
    startupDurationMs: number,
    protected readonly logger: LiveRunLogger,
    protected readonly caseId: string
  ) {
    this.startupDurationMs = startupDurationMs;
  }

  protected async recordSuccess(tool: string, startedAt: string, started: number, input: unknown) {
    const durationMs = performance.now() - started;
    this.toolCalls.push({
      tool,
      startedAt,
      durationMs,
      success: true,
      inputPreview: previewInput(input)
    });
    await this.logger.log(
      `[${this.caseId}] transport=${this.transport} tool=${tool} success durationMs=${durationMs.toFixed(2)} input=${previewInput(
        input
      )}`
    );
  }

  protected async recordFailure(
    tool: string,
    startedAt: string,
    started: number,
    input: unknown,
    error: unknown
  ) {
    const durationMs = performance.now() - started;
    this.toolCalls.push({
      tool,
      startedAt,
      durationMs,
      success: false,
      inputPreview: previewInput(input)
    });
    await this.logger.log(
      `[${this.caseId}] transport=${this.transport} tool=${tool} failure durationMs=${durationMs.toFixed(2)} error=${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  getToolCalls(): BenchmarkToolCallRecord[] {
    return [...this.toolCalls];
  }

  abstract invoke(tool: string, input: unknown): Promise<unknown>;
  abstract close(): Promise<void>;
}

class InProcessForgeBenchmarkClient extends BaseForgeBenchmarkClient {
  readonly transport = "in-process" as const;
  private readonly tools: Record<string, RegisteredToolEntry>;

  private constructor(
    startupDurationMs: number,
    tools: Record<string, RegisteredToolEntry>,
    logger: LiveRunLogger,
    caseId: string
  ) {
    super(startupDurationMs, logger, caseId);
    this.tools = tools;
  }

  static async create(
    logger: LiveRunLogger,
    caseId: string
  ): Promise<InProcessForgeBenchmarkClient> {
    const started = performance.now();
    const server = new McpServer({ name: "forge-benchmark", version: "0.1.0" });
    registerForgeTools(server);
    const startupDurationMs = performance.now() - started;
    const tools = (server as unknown as RegisteredToolMap)._registeredTools;
    await logger.log(
      `[${caseId}] transport=in-process ready in ${startupDurationMs.toFixed(2)}ms.`
    );
    return new InProcessForgeBenchmarkClient(startupDurationMs, tools, logger, caseId);
  }

  async invoke(tool: string, input: unknown): Promise<unknown> {
    const entry = this.tools[tool];
    if (!entry) {
      throw new Error(`Benchmark attempted to call unknown Forge tool '${tool}'.`);
    }

    const started = performance.now();
    const startedAt = new Date().toISOString();

    try {
      const parsedInput = entry.inputSchema ? entry.inputSchema.parse(input) : input;
      const result = await entry.handler(parsedInput);
      const structuredContent = entry.outputSchema
        ? entry.outputSchema.parse(result.structuredContent)
        : result.structuredContent;
      await this.recordSuccess(tool, startedAt, started, input);
      return structuredContent;
    } catch (error) {
      await this.recordFailure(tool, startedAt, started, input, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await Promise.resolve();
  }
}

class StdioForgeBenchmarkClient extends BaseForgeBenchmarkClient {
  readonly transport = "stdio" as const;
  private toolsListed = false;

  private constructor(
    startupDurationMs: number,
    private readonly client: Client,
    private readonly transportClient: StdioClientTransport,
    logger: LiveRunLogger,
    caseId: string
  ) {
    super(startupDurationMs, logger, caseId);
  }

  static async create(logger: LiveRunLogger, caseId: string): Promise<StdioForgeBenchmarkClient> {
    const started = performance.now();
    const client = new Client({ name: "forge-benchmark", version: "0.1.0" });
    const transportClient = new StdioClientTransport({
      command: "node",
      args: [path.resolve(process.cwd(), "dist/index.js")],
      cwd: process.cwd(),
      stderr: "pipe",
      env: buildStdioEnv()
    });

    if (transportClient.stderr) {
      transportClient.stderr.on("data", (chunk) => {
        void logger.log(`[${caseId}] transport=stdio stderr=${String(chunk).trim()}`);
      });
    }

    await client.connect(transportClient);
    const startupDurationMs = performance.now() - started;
    await logger.log(`[${caseId}] transport=stdio ready in ${startupDurationMs.toFixed(2)}ms.`);
    return new StdioForgeBenchmarkClient(
      startupDurationMs,
      client,
      transportClient,
      logger,
      caseId
    );
  }

  async invoke(tool: string, input: unknown): Promise<unknown> {
    const started = performance.now();
    const startedAt = new Date().toISOString();

    try {
      if (!this.toolsListed) {
        await this.client.listTools();
        this.toolsListed = true;
      }
      const result = await this.client.callTool({
        name: tool,
        arguments: (input ?? {}) as Record<string, unknown>
      });
      await this.recordSuccess(tool, startedAt, started, input);
      return result.structuredContent ?? result;
    } catch (error) {
      await this.recordFailure(tool, startedAt, started, input, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export async function createForgeBenchmarkClient(options: {
  transport: BenchmarkTransport;
  logger: LiveRunLogger;
  caseId: string;
}): Promise<ForgeBenchmarkClient> {
  if (options.transport === "stdio") {
    return StdioForgeBenchmarkClient.create(options.logger, options.caseId);
  }

  return InProcessForgeBenchmarkClient.create(options.logger, options.caseId);
}
