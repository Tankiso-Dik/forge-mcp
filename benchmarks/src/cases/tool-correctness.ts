import os from "node:os";

import {
  ForgeCompareExecutionOutputSchema,
  ForgeInitOutputSchema,
  ForgeLoadOutputSchema,
  ForgeSessionDraftOutputSchema,
  ForgeSessionEndOutputSchema,
  ForgeSuggestUpdateOutputSchema,
  WriteResultSchema
} from "../../../src/schemas.js";
import { BENCHMARK_THRESHOLDS } from "../constants.js";
import { createCheck, createLatencyCheck } from "../checks.js";
import type { BenchmarkCaseDefinition } from "../types.js";

export const toolCorrectnessCases: BenchmarkCaseDefinition[] = [
  {
    id: "tool_compare_execution_classifies_alignment",
    title: "Compare Execution Classifies Alignment",
    description:
      "Verify forge_compare_execution can compare an observed execution path against current Forge memory and active work.",
    fixture: "project-small",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const output = ForgeCompareExecutionOutputSchema.parse(
        await client.invoke("forge_compare_execution", {
          cwd: fixture.entryCwd,
          observedExecution: "Resolve the open benchmark issue in Benchmark Preparation and keep the current scope tight."
        })
      );

      return {
        summary:
          "forge_compare_execution classified the observed work against the active phase and open issue instead of forcing the caller to reconstruct that comparison manually.",
        checks: [
          createCheck(
            "compare_execution_returns_review_signal",
            "the comparison helper returns a nontrivial alignment signal when open continuity tension is involved",
            "continuity_quality",
            output.alignment === "needs_review" || output.alignment === "drift_risk",
            3
          ),
          createCheck(
            "compare_execution_matches_phase_context",
            "the comparison helper can map the observed execution back to the active phase context",
            "agent_workflow_quality",
            output.matchingPhases.some((entry) => entry.phaseId === "phase_small_1"),
            3
          ),
          createCheck(
            "compare_execution_returns_actions_and_brief",
            "the comparison helper returns suggested actions and a concise collaboration brief",
            "agent_workflow_quality",
            output.suggestedActions.length > 0 && output.collaborationBrief.length > 0,
            3
          )
        ],
        artifacts: [
          {
            label: "compare execution output",
            kind: "json",
            content: JSON.stringify(output, null, 2)
          }
        ],
        recommendations:
          output.collaborationBrief.length > 0
            ? []
            : ["Execution comparison should return a concise brief that helps explain the current continuity risk to the user."]
      };
    }
  },
  {
    id: "tool_session_end_writes_issues_and_niceties_file",
    title: "Session End Writes Issues-And-Niceties File",
    description:
      "Verify forge_session_end can append project-local Forge feedback without surfacing that file through forge_load.",
    fixture: "project-small",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const output = ForgeSessionEndOutputSchema.parse(
        await client.invoke("forge_session_end", {
          cwd: fixture.entryCwd,
          summary: "Closed the benchmark session cleanly.",
          nextStep: "Resume from the compact continuity summary.",
          issuesAndNicetiesAsked: [
            {
              kind: "friction",
              summary: "The session still had to decide whether the observation belonged in an issue or a log.",
              whatWouldHaveHelped: "A stronger update recommendation when uncertainty appears mid-task."
            },
            {
              kind: "nicety",
              summary: "A plain-language collaboration brief would help explain the current continuity state back to the user.",
              whatWouldHaveHelped: "One concise user-facing summary in forge_load or compare output."
            }
          ]
        })
      );
      const feedbackFile = await fixture.readJson<{
        version: number;
        entries: Array<{
          kind: string;
          summary: string;
          createdAt: string;
          sessionSummary?: string;
          nextStep?: string;
        }>;
      }>(".forge/issues-and-niceties-asked.json");
      const loadOutput = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );

      return {
        summary:
          "forge_session_end appended local Forge improvement feedback to the dedicated issues-and-niceties file without polluting the normal Forge load payload.",
        checks: [
          createCheck(
            "session_end_feedback_file_reported",
            "forge_session_end returns the feedback file path and the appended feedback entries",
            "mcp_correctness",
            Boolean(output.feedbackFilePath) && output.feedbackEntries.length === 2,
            3
          ),
          createCheck(
            "session_end_feedback_file_written",
            "the issues-and-niceties file is materialized on disk with the new session-linked feedback entries",
            "continuity_quality",
            feedbackFile.entries.length >= 2 &&
              feedbackFile.entries.slice(-2).every((entry) => entry.sessionSummary === "Closed the benchmark session cleanly."),
            4
          ),
          createCheck(
            "session_end_feedback_stays_out_of_load",
            "forge_load does not start returning the dedicated improvement-log file as routine continuity state",
            "agent_workflow_quality",
            loadOutput.workingView !== null &&
              !JSON.stringify(loadOutput).includes("issues-and-niceties-asked"),
            3
          )
        ],
        artifacts: [
          {
            label: "session end feedback output",
            kind: "json",
            content: JSON.stringify(output, null, 2)
          },
          {
            label: "issues-and-niceties file",
            kind: "json",
            content: JSON.stringify(feedbackFile, null, 2)
          }
        ],
        recommendations:
          output.feedbackEntries.length === 2
            ? []
            : ["Session-end Forge feedback should be appended to the local improvement file and reported back to the caller."]
      };
    }
  },
  {
    id: "tool_load_non_project",
    title: "Load Auto-Bootstraps A Directory",
    description: "Verify forge_load auto-initializes a per-directory Forge project outside the exact home directory.",
    fixture: "no-forge-project",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const started = performance.now();
      const output = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const loadDurationMs = performance.now() - started;

      return {
        summary: "forge_load auto-bootstrapped the current directory into a managed Forge project.",
        checks: [
          createCheck(
            "managed_project_true_after_load",
            "forge_load auto-bootstraps the current directory outside the home directory",
            "mcp_correctness",
            output.managedProject === true,
            3,
            `Observed managedProject=${String(output.managedProject)}`
          ),
          createCheck(
            "auto_bootstrap_state_present",
            "forge_load returns initialized project state and a workingView after auto-bootstrap",
            "mcp_correctness",
            output.memory !== null &&
              output.plan !== null &&
              output.phases !== null &&
              output.workingView !== null,
            2
          ),
          createCheck(
            "auto_bootstrap_project_root",
            "forge_load anchors the new managed project at the current directory",
            "mcp_correctness",
            output.projectRoot === fixture.resolve(".") &&
              output.forgeDirectory === fixture.resolve(".forge"),
            1
          ),
          createLatencyCheck(
            "load_latency_fast",
            "forge_load remains fast even when it has to auto-bootstrap a local project",
            "performance",
            loadDurationMs,
            BENCHMARK_THRESHOLDS.fastLoadMs,
            2
          )
        ],
        artifacts: [
          {
            label: "forge_load output",
            kind: "json",
            content: JSON.stringify(output, null, 2)
          }
        ],
        recommendations: output.managedProject
          ? []
          : ["Directories outside the exact home directory should auto-bootstrap into managed Forge projects."]
      };
    }
  },
  {
    id: "tool_write_non_project_error",
    title: "Home Directory Stays Outside Auto-Bootstrap",
    description:
      "Verify the exact home directory stays outside per-directory auto-bootstrap and write tools fail clearly there.",
    fixture: "no-forge-project",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const homeCwd = os.homedir();
      const loadOutput = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: homeCwd })
      );
      let message = "";

      try {
        await client.invoke("forge_log", {
          cwd: homeCwd,
          kind: "bug",
          summary: "Should not auto-bootstrap the exact home directory."
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      return {
        summary: "The exact home directory stays excluded from auto-bootstrap, and write tools fail there with a clear explanation.",
        checks: [
          createCheck(
            "home_load_stays_unmanaged",
            "forge_load does not auto-bootstrap the exact home directory",
            "mcp_correctness",
            loadOutput.managedProject === false &&
              loadOutput.projectRoot === null &&
              loadOutput.workingView === null,
            3
          ),
          createCheck(
            "home_write_rejected",
            "write tools reject the exact home directory instead of auto-bootstrapping it",
            "mcp_correctness",
            message.includes("auto-bootstrap is disabled for the home directory"),
            3,
            message
          ),
          createCheck(
            "home_error_is_actionable",
            "the home-directory error tells the caller how to proceed",
            "agent_workflow_quality",
            message.includes("Use a project subdirectory"),
            2,
            message
          )
        ],
        artifacts: [
          {
            label: "non-project write error",
            kind: "text",
            content: message
          }
        ],
        recommendations: message.includes("Use a project subdirectory")
          ? []
          : ["The home-directory exclusion should stay explicit and actionable."]
      };
    }
  },
  {
    id: "tool_quiet_project_recommends_none",
    title: "Quiet Project Recommends Minimal Forge Usage",
    description:
      "Verify forge_load recommends a minimal continuity posture when the project is managed but quiet enough that extra bookkeeping would be noise.",
    fixture: "project-quiet",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const output = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const view = output.workingView;

      return {
        summary: "forge_load recommended no extra Forge ceremony for a quiet managed project.",
        checks: [
          createCheck(
            "quiet_mode_none",
            "quiet managed projects recommend useForge.mode=none",
            "agent_workflow_quality",
            view?.useForge.mode === "none",
            3
          ),
          createCheck(
            "quiet_mode_guidance_is_ranked",
            "quiet projects steer the agent toward ordinary file work and away from extra bookkeeping",
            "agent_workflow_quality",
            view?.doNow === "Work directly in project files and skip extra Forge bookkeeping." &&
              view?.recommendedWriteStyle === "avoid",
            3
          ),
          createCheck(
            "quiet_mode_suppresses_noise",
            "quiet projects discourage low-value logging noise",
            "continuity_quality",
            view?.avoidLoggingNoise === true &&
              view?.useForge.reason.includes("ceremony") === true,
            4
          )
        ],
        artifacts: [
          {
            label: "quiet working view",
            kind: "json",
            content: JSON.stringify(view, null, 2)
          }
        ],
        recommendations:
          view?.useForge.mode === "none"
            ? []
            : ["Quiet projects should default to minimal Forge usage instead of encouraging ceremony."]
      };
    }
  },
  {
    id: "tool_small_project_recommends_light",
    title: "Small Active Project Recommends Light Forge Usage",
    description:
      "Verify forge_load recommends a light continuity mode when there is one active issue/phase but not enough complexity to justify fully managed flow.",
    fixture: "project-small",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const output = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const view = output.workingView;

      return {
        summary: "forge_load recommended a light Forge posture with one active issue, one active phase, and a concrete next step.",
        checks: [
          createCheck(
            "small_mode_light",
            "small active projects recommend useForge.mode=light",
            "agent_workflow_quality",
            view?.useForge.mode === "light",
            3
          ),
          createCheck(
            "small_mode_do_now_present",
            "light mode surfaces one dominant next action so the session can resume without re-planning",
            "continuity_quality",
            Boolean(view?.doNow) &&
              (view?.doNow?.includes("issue") === true || view?.doNow?.includes("Resume") === true),
            3
          ),
          createCheck(
            "small_mode_why_present",
            "light mode explains why the dominant next action matters now",
            "continuity_quality",
            Boolean(view?.whyThisMattersNow),
            2
          ),
          createCheck(
            "small_mode_write_style_stays_bounded",
            "light mode stays lean instead of encouraging full bookkeeping",
            "agent_workflow_quality",
            view?.recommendedWriteStyle === "normal" && view?.avoidLoggingNoise === false,
            2
          )
        ],
        artifacts: [
          {
            label: "small-project guidance",
            kind: "json",
            content: JSON.stringify(
              {
                useForge: view?.useForge,
                doNow: view?.doNow,
                whyThisMattersNow: view?.whyThisMattersNow,
                recommendedWriteStyle: view?.recommendedWriteStyle
              },
              null,
              2
            )
          }
        ],
        recommendations:
          view?.useForge.mode === "light"
            ? []
            : ["Small active projects should recommend light Forge usage rather than none or fully managed ceremony."]
      };
    }
  },
  {
    id: "tool_invalid_input_rejected",
    title: "Invalid Tool Input Is Rejected",
    description:
      "Verify schema validation rejects malformed tool calls before they mutate project state.",
    fixture: "project-small",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      let message = "";

      try {
        await client.invoke("forge_step_done", {
          cwd: fixture.entryCwd,
          phaseId: "phase_small_1"
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      return {
        summary: "Malformed tool input is rejected by the benchmark adapter through the registered schemas.",
        checks: [
          createCheck(
            "invalid_input_rejected",
            "forge_step_done rejects malformed input before mutation",
            "mcp_correctness",
            message.length > 0,
            3,
            message
          ),
          createCheck(
            "invalid_input_mentions_stepId",
            "validation error points at the missing required field",
            "mcp_correctness",
            message.includes("stepId"),
            2,
            message
          )
        ],
        artifacts: [
          {
            label: "schema validation error",
            kind: "text",
            content: message
          }
        ],
        recommendations: message.includes("stepId")
          ? []
          : ["Malformed benchmark inputs should fail through the registered Zod schemas with field-level context."]
      };
    }
  },
  {
    id: "tool_large_project_recommends_managed",
    title: "Large Active Project Recommends Managed Forge Usage",
    description:
      "Verify forge_load escalates to managed mode for a larger active project and warns against extra note spam when state is already dense.",
    fixture: "project-large",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const output = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const view = output.workingView;

      return {
        summary: "forge_load escalated to managed mode for a larger active project and surfaced density guardrails.",
        checks: [
          createCheck(
            "large_mode_managed",
            "large active projects recommend useForge.mode=managed",
            "agent_workflow_quality",
            view?.useForge.mode === "managed",
            4
          ),
          createCheck(
            "large_mode_has_ranked_guidance",
            "managed mode surfaces one dominant action plus a caution instead of a flat action list",
            "agent_workflow_quality",
            Boolean(view?.doNow) &&
              Boolean(view?.watchOut) &&
              view?.doNow?.includes("drift") === true,
            3
          ),
          createCheck(
            "large_mode_density_guardrail",
            "dense larger projects tell the agent to avoid low-value logging noise",
            "continuity_quality",
            view?.avoidLoggingNoise === true &&
              Boolean(view?.stateDensityWarning) &&
              (view?.reasonCodes.includes("dense_notes") ?? false),
            4
          )
        ],
        artifacts: [
          {
            label: "large-project guidance",
            kind: "json",
            content: JSON.stringify(
              {
                projectScale: view?.projectScale,
                useForge: view?.useForge,
                doNow: view?.doNow,
                watchOut: view?.watchOut,
                reasonCodes: view?.reasonCodes,
                stateDensityWarning: view?.stateDensityWarning
              },
              null,
              2
            )
          }
        ],
        recommendations:
          view?.useForge.mode === "managed"
            ? []
            : ["Larger active projects should escalate into managed continuity guidance."]
      };
    }
  },
  {
    id: "tool_init_bootstrap",
    title: "Init Seeds Forge Files Safely",
    description:
      "Verify forge_init creates a new .forge directory, writes the seed files, and refuses overwrite by default.",
    fixture: "no-forge-project",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const started = performance.now();
      const initOutput = ForgeInitOutputSchema.parse(
        await client.invoke("forge_init", { cwd: fixture.entryCwd, force: false })
      );
      const initDurationMs = performance.now() - started;

      const memory = await fixture.readJson<{ version: number }>(".forge/memory.json");
      const plan = await fixture.readJson<{ version: number }>(".forge/plan.json");
      const phases = await fixture.readJson<{ version: number }>(".forge/phases.json");

      let refusedOverwrite = false;
      try {
        await client.invoke("forge_init", { cwd: fixture.entryCwd, force: false });
      } catch {
        refusedOverwrite = true;
      }

      return {
        summary: "forge_init created the expected seed files and guarded against accidental overwrite.",
        checks: [
          createCheck(
            "seeded_files_exist",
            "forge_init writes all three Forge project files",
            "mcp_correctness",
            Boolean(initOutput.files.memory && initOutput.files.plan && initOutput.files.phases),
            2
          ),
          createCheck(
            "seeded_versions",
            "seeded Forge files use the current schema version",
            "mcp_correctness",
            memory.version === 1 && plan.version === 1 && phases.version === 1,
            2
          ),
          createCheck(
            "refuses_overwrite_without_force",
            "forge_init refuses to overwrite existing Forge files without force=true",
            "mcp_correctness",
            refusedOverwrite,
            2
          ),
          createLatencyCheck(
            "init_latency_fast",
            "forge_init remains fast for a clean project bootstrap",
            "performance",
            initDurationMs,
            BENCHMARK_THRESHOLDS.fastWriteMs,
            2
          )
        ],
        artifacts: [
          {
            label: "forge_init output",
            kind: "json",
            content: JSON.stringify(initOutput, null, 2)
          }
        ],
        recommendations: refusedOverwrite
          ? []
          : ["Keep forge_init conservative so existing Forge files are never overwritten silently."]
      };
    }
  },
  {
    id: "tool_partial_state_recovers_defaults",
    title: "Partial Forge State Recovers Missing Files",
    description:
      "Verify Forge loads a project with missing plan/phases files, normalizes defaults, and can write those missing files later.",
    fixture: "project-partial",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const initialLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const planUpdate = WriteResultSchema.parse(
        await client.invoke("forge_update", {
          cwd: fixture.entryCwd,
          domain: "plan",
          action: "add_stack_item",
          value: "benchmark-partial-stack"
        })
      );
      const rebuild = WriteResultSchema.parse(
        await client.invoke("forge_rebuild_phases", {
          cwd: fixture.entryCwd,
          phases: [
            {
              id: "phase_partial_1",
              title: "Recover Missing Files",
              status: "todo",
              steps: [
                {
                  id: "step_partial_1",
                  title: "Create missing phases state",
                  status: "todo"
                }
              ]
            }
          ]
        })
      );
      const plan = await fixture.readJson<{ stack: string[] }>(".forge/plan.json");
      const phases = await fixture.readJson<{ phases: Array<{ id: string }> }>(".forge/phases.json");

      return {
        summary: "Forge normalized the missing files to defaults and later writes materialized them on disk.",
        checks: [
          createCheck(
            "partial_load_defaults",
            "forge_load returns normalized default plan and phases state for missing files",
            "mcp_correctness",
            initialLoad.plan !== null &&
              initialLoad.phases !== null &&
              Array.isArray(initialLoad.plan.stack) &&
              Array.isArray(initialLoad.phases.phases),
            4
          ),
          createCheck(
            "partial_plan_write_materializes_file",
            "forge_update writes a previously missing plan.json file",
            "mcp_correctness",
            planUpdate.updatedFile === "plan" && plan.stack.includes("benchmark-partial-stack"),
            3
          ),
          createCheck(
            "partial_phase_write_materializes_file",
            "forge_rebuild_phases writes a previously missing phases.json file",
            "mcp_correctness",
            rebuild.updatedFile === "phases" && phases.phases[0]?.id === "phase_partial_1",
            3
          ),
          createCheck(
            "partial_session_survives_normalization",
            "workingView still surfaces the existing session handoff from partial state",
            "continuity_quality",
            initialLoad.workingView?.session?.nextStep ===
              "Recover the missing plan and phases files on demand.",
            2
          )
        ],
        artifacts: [
          {
            label: "partial load working view",
            kind: "json",
            content: JSON.stringify(initialLoad.workingView, null, 2)
          }
        ],
        recommendations: plan.stack.includes("benchmark-partial-stack")
          ? []
          : ["Missing Forge files should normalize safely and materialize only when a write actually needs them."]
      };
    }
  },
  {
    id: "tool_update_resolve_issue",
    title: "Update Resolves Issue Metadata",
    description:
      "Verify forge_update resolves a tracked issue with explicit resolution metadata and removes it from the open working view.",
    fixture: "project-small",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const result = WriteResultSchema.parse(
        await client.invoke("forge_update", {
          cwd: fixture.entryCwd,
          domain: "memory",
          action: "resolve_issue",
          id: "issue_small_1",
          resolution: "Added the missing explicit resolution flow."
        })
      );

      const memory = await fixture.readJson<{
        issues: Array<{
          id: string;
          status: string;
          resolution?: string;
          resolvedAt?: string;
        }>;
      }>(".forge/memory.json");
      const loadOutput = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const issue = memory.issues.find((entry) => entry.id === "issue_small_1");

      return {
        summary: "forge_update resolved the issue and the working view no longer reports it as open.",
        checks: [
          createCheck(
            "resolve_output_shape",
            "forge_update returns the standard write result shape when resolving an issue",
            "mcp_correctness",
            result.status === "ok" && result.updatedFile === "memory" && result.entityId === "issue_small_1",
            2
          ),
          createCheck(
            "issue_mutation_correct",
            "memory.json stores resolution text and resolvedAt metadata",
            "mcp_correctness",
            issue?.status === "resolved" &&
              issue.resolution === "Added the missing explicit resolution flow." &&
              Boolean(issue.resolvedAt),
            4
          ),
          createCheck(
            "resolved_issue_removed_from_open_working_view",
            "workingView excludes resolved issues from openIssues",
            "continuity_quality",
            loadOutput.workingView?.openIssues.every((entry) => entry.id !== "issue_small_1") ?? false,
            4
          )
        ],
        artifacts: [
          {
            label: "resolved issue snapshot",
            kind: "json",
            content: JSON.stringify(issue, null, 2)
          }
        ],
        recommendations: issue?.status === "resolved"
          ? []
          : ["Issue resolution should always write status, resolution text, and resolvedAt together."]
      };
    }
  },
  {
    id: "tool_large_fixture_performance",
    title: "Large Fixture Load And Write Performance",
    description:
      "Exercise a larger Forge fixture to capture startup, load, write, and payload behavior under heavier local state.",
    fixture: "project-large",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const loadStarted = performance.now();
      const output = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const loadDurationMs = performance.now() - loadStarted;

      const writeStarted = performance.now();
      const writeResult = WriteResultSchema.parse(
        await client.invoke("forge_log", {
          cwd: fixture.entryCwd,
          kind: "note",
          summary: "Large fixture benchmark append."
        })
      );
      const writeDurationMs = performance.now() - writeStarted;
      const payloadBytes = Buffer.byteLength(JSON.stringify(output));

      return {
        summary: "Large fixture benchmarking recorded load, write, startup, and payload characteristics against a heavier local state set.",
        checks: [
          createCheck(
            "large_fixture_managed",
            "forge_load still returns a managed project for the larger fixture",
            "mcp_correctness",
            output.managedProject === true,
            2
          ),
          createLatencyCheck(
            "large_fixture_load_latency",
            "forge_load stays within the large-fixture latency budget",
            "performance",
            loadDurationMs,
            BENCHMARK_THRESHOLDS.largeFixtureLoadMs,
            4
          ),
          createLatencyCheck(
            "large_fixture_write_latency",
            "forge_log stays within the large-fixture write latency budget",
            "performance",
            writeDurationMs,
            BENCHMARK_THRESHOLDS.largeFixtureWriteMs,
            3
          ),
          createCheck(
            "large_fixture_payload_budget",
            "forge_load payload stays within the large-fixture payload budget",
            "performance",
            payloadBytes <= BENCHMARK_THRESHOLDS.largeFixturePayloadBytes,
            3,
            `Payload size ${payloadBytes} bytes.`
          ),
          createCheck(
            "large_fixture_working_view_stays_pruned",
            "workingView remains bounded even with the larger backing state",
            "continuity_quality",
            (output.workingView?.recentDecisions.length ?? 0) <= 5 &&
              (output.workingView?.recentObservations.length ?? 0) <= 5 &&
              (output.workingView?.openIssues.length ?? 0) <= 5,
            3
          ),
          createCheck(
            "large_fixture_write_shape",
            "write results stay standard under a heavier fixture",
            "mcp_correctness",
            writeResult.status === "ok" && writeResult.updatedFile === "memory",
            1
          )
        ],
        artifacts: [
          {
            label: "large fixture metrics",
            kind: "json",
            content: JSON.stringify(
              {
                startupDurationMs: client.startupDurationMs,
                loadDurationMs,
                writeDurationMs,
                payloadBytes
              },
              null,
              2
            )
          }
        ],
        recommendations:
          payloadBytes <= BENCHMARK_THRESHOLDS.largeFixturePayloadBytes
            ? []
            : ["Large-state forge_load payloads may need tighter pruning or optional raw-state suppression."]
      };
    }
  },
  {
    id: "tool_stdio_transport_startup",
    title: "Stdio Transport Startup Stays Viable",
    description:
      "Verify the real stdio MCP transport can start the built Forge server locally and complete a basic load call within a reasonable startup budget.",
    fixture: "no-forge-project",
    layer: "tool-correctness",
    transport: "stdio",
    async run({ fixture, client }) {
      const output = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );

      return {
        summary:
          "The benchmark harness connected to the real built stdio server and completed an auto-bootstrapped load.",
        checks: [
          createCheck(
            "stdio_transport_uses_real_client",
            "the case ran over the stdio MCP transport instead of the in-process adapter",
            "mcp_correctness",
            client.transport === "stdio",
            2
          ),
          createCheck(
            "stdio_transport_load_shape",
            "the stdio transport returns the same managed auto-bootstrap shape",
            "mcp_correctness",
            output.managedProject === true && output.workingView !== null,
            2
          ),
          createLatencyCheck(
            "stdio_transport_startup_budget",
            "the local stdio server starts quickly enough for interactive Codex use",
            "performance",
            client.startupDurationMs,
            BENCHMARK_THRESHOLDS.stdioStartupMs,
            2
          )
        ],
        artifacts: [
          {
            label: "stdio startup metrics",
            kind: "json",
            content: JSON.stringify(
              {
                transport: client.transport,
                startupDurationMs: client.startupDurationMs
              },
              null,
              2
            )
          }
        ],
        recommendations:
          client.startupDurationMs <= BENCHMARK_THRESHOLDS.stdioStartupMs
            ? []
            : ["Keep the built stdio server lean so Codex can attach quickly on a single machine."]
      };
    }
  },
  {
    id: "tool_load_pruned_working_view",
    title: "Load Returns A Pruned Working View",
    description:
      "Verify forge_load surfaces recent, relevant continuity context instead of only dumping raw file state.",
    fixture: "project-medium",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const output = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const view = output.workingView;

      return {
        summary: "forge_load returned a bounded working view with recent decisions, active phases, and open issues only.",
        checks: [
          createCheck(
            "working_view_present",
            "forge_load returns a workingView for managed projects",
            "mcp_correctness",
            view !== null,
            2
          ),
          createCheck(
            "working_view_recent_decisions_pruned",
            "workingView limits recent decisions to a bounded list",
            "mcp_correctness",
            (view?.recentDecisions.length ?? 0) <= 5,
            2
          ),
          createCheck(
            "working_view_active_phases_only",
            "workingView only includes phases that still need attention",
            "mcp_correctness",
            view?.activePhases.every((phase) => phase.status !== "done") ?? false,
            2
          ),
          createCheck(
            "working_view_open_issues_only",
            "workingView only surfaces issues that remain open",
            "continuity_quality",
            view?.openIssues.every((issue) => issue.status === "open") ?? false,
            3
          ),
          createCheck(
            "working_view_session_handoff_available",
            "workingView includes the current session handoff when one exists",
            "continuity_quality",
            Boolean(view?.session?.nextStep),
            3
          )
        ],
        artifacts: [
          {
            label: "working view snapshot",
            kind: "json",
            content: JSON.stringify(view, null, 2)
          }
        ],
        recommendations: view ? [] : ["forge_load should keep a dedicated pruned workingView for agent-facing context."]
      };
    }
  },
  {
    id: "tool_suggest_update_routes_compact_milestone",
    title: "Suggest Update Routes A Compact Milestone",
    description:
      "Verify forge_suggest_update recommends a single checkpoint when a light project needs progress, a handoff, and no extra state ceremony.",
    fixture: "project-small",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const output = ForgeSuggestUpdateOutputSchema.parse(
        await client.invoke("forge_suggest_update", {
          cwd: fixture.entryCwd,
          summary: "Finished the remaining milestone and need to leave the next session a clean resume point.",
          completedSteps: [
            {
              phaseId: "phase_small_1",
              stepId: "step_small_2"
            }
          ],
          closingSession: true
        })
      );

      return {
        summary: "forge_suggest_update recommended a checkpoint instead of multiple smaller writes.",
        checks: [
          createCheck(
            "suggest_update_checkpoint",
            "compact milestone updates route to forge_checkpoint",
            "agent_workflow_quality",
            output.recommendation === "forge_checkpoint",
            3
          ),
          createCheck(
            "suggest_update_confident",
            "the recommendation is confident enough to reduce decision friction",
            "agent_workflow_quality",
            output.confidence === "high",
            2
          ),
          createCheck(
            "suggest_update_includes_draft",
            "the suggestion includes a usable draft payload shape",
            "mcp_correctness",
            output.draft?.tool === "forge_checkpoint" &&
              Array.isArray(output.draft.fields?.completedSteps),
            3
          )
        ],
        artifacts: [
          {
            label: "suggest update output",
            kind: "json",
            content: JSON.stringify(output, null, 2)
          }
        ],
        recommendations:
          output.recommendation === "forge_checkpoint"
            ? []
            : ["Compact milestone updates should collapse toward forge_checkpoint when that avoids multi-call ceremony."]
      };
    }
  },
  {
    id: "tool_session_draft_builds_closeout_payload",
    title: "Session Draft Builds A Closeout Payload",
    description:
      "Verify forge_session_draft proposes a usable summary, next step, and closeout payload from the current project state.",
    fixture: "project-small",
    layer: "tool-correctness",
    async run({ fixture, client }) {
      const output = ForgeSessionDraftOutputSchema.parse(
        await client.invoke("forge_session_draft", {
          cwd: fixture.entryCwd,
          recentWork: "Reviewed the active issue and tightened the small-project milestone wording."
        })
      );

      return {
        summary: "forge_session_draft returned a concrete closeout draft instead of requiring the agent to invent one from scratch.",
        checks: [
          createCheck(
            "session_draft_has_summary",
            "the draft always includes a usable summary",
            "agent_workflow_quality",
            output.summary.length > 0,
            2
          ),
          createCheck(
            "session_draft_has_next_step",
            "the draft always includes a usable next step",
            "continuity_quality",
            output.nextStep.length > 0,
            2
          ),
          createCheck(
            "session_draft_payload_matches_tool",
            "the suggested payload matches the recommended closeout tool",
            "mcp_correctness",
            output.draftPayload.tool === output.recommendedCloseTool,
            3
          ),
          createCheck(
            "session_draft_readiness_present",
            "the draft includes a readiness verdict for closing the session",
            "agent_workflow_quality",
            ["ready", "needs_attention", "blocked"].includes(output.readiness.status),
            2
          )
        ],
        artifacts: [
          {
            label: "session draft output",
            kind: "json",
            content: JSON.stringify(output, null, 2)
          }
        ],
        recommendations:
          output.nextStep.length > 0
            ? []
            : ["Session drafting should always leave a concrete next step for the next resume."]
      };
    }
  }
];
