import {
  ForgeLoadOutputSchema,
  WriteResultSchema
} from "../../../src/schemas.js";
import { BENCHMARK_THRESHOLDS } from "../constants.js";
import { createCheck, createLatencyCheck } from "../checks.js";
import type { BenchmarkCaseDefinition } from "../types.js";

export const endToEndCases: BenchmarkCaseDefinition[] = [
  {
    id: "stress_full_continuity_run",
    title: "End-to-End Continuity Stress Run",
    description:
      "Initialize a fresh project, record multiple events, resolve an issue, progress phases, close the session, and verify the resumed continuity view.",
    fixture: "no-forge-project",
    layer: "end-to-end",
    async run({ fixture, client }) {
      const started = performance.now();

      await client.invoke("forge_init", { cwd: fixture.entryCwd, force: false });
      await client.invoke("forge_update", {
        cwd: fixture.entryCwd,
        domain: "memory",
        action: "add_decision",
        title: "Keep Forge local-only",
        detail: "The benchmark harness should remain local and deterministic."
      });
      await client.invoke("forge_log", {
        cwd: fixture.entryCwd,
        kind: "tech_debt",
        summary: "Stress flow should keep the report readable."
      });
      await client.invoke("forge_update", {
        cwd: fixture.entryCwd,
        domain: "memory",
        action: "upsert_issue",
        title: "Need a longer scenario coverage report",
        detail: "Track issue through the stress run."
      });
      const memoryAfterIssue = await fixture.readJson<{
        issues: Array<{ id: string; title: string }>;
      }>(".forge/memory.json");
      const createdIssue = memoryAfterIssue.issues.find(
        (issue) => issue.title === "Need a longer scenario coverage report"
      );
      await client.invoke("forge_update", {
        cwd: fixture.entryCwd,
        domain: "memory",
        action: "resolve_issue",
        id: createdIssue?.id,
        resolution: "Stress benchmark now covers the longer scenario."
      });
      await client.invoke("forge_rebuild_phases", {
        cwd: fixture.entryCwd,
        phases: [
          {
            id: "phase_stress_1",
            title: "Stress Phase",
            status: "todo",
            steps: [
              { id: "step_stress_1", title: "Create state", status: "done" },
              { id: "step_stress_2", title: "Close session", status: "todo" }
            ]
          }
        ]
      });
      await client.invoke("forge_step_done", {
        cwd: fixture.entryCwd,
        phaseId: "phase_stress_1",
        stepId: "step_stress_2",
        note: "Stress benchmark completed all planned steps."
      });
      const driftResult = WriteResultSchema.parse(
        await client.invoke("forge_flag_drift", {
          cwd: fixture.entryCwd,
          severity: "medium",
          summary: "Stress run found a continuity wording mismatch."
        })
      );
      await client.invoke("forge_session_end", {
        cwd: fixture.entryCwd,
        summary: "Stress run complete",
        nextStep: "Resume from the compact continuity summary."
      });
      const finalLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const durationMs = performance.now() - started;
      const payloadBytes = Buffer.byteLength(JSON.stringify(finalLoad));

      return {
        summary:
          "The end-to-end run stayed coherent across initialization, mutation, drift, phase progression, and session resume.",
        checks: [
          createCheck(
            "stress_load_managed_project",
            "final forge_load confirms the project is now Forge-managed",
            "mcp_correctness",
            finalLoad.managedProject === true,
            2
          ),
          createCheck(
            "stress_continuity_handoff",
            "the final working view carries forward the session handoff",
            "continuity_quality",
            finalLoad.workingView?.session?.nextStep === "Resume from the compact continuity summary.",
            5
          ),
          createCheck(
            "stress_drift_visible",
            "the contradiction remains visible in openDrift after the stress run",
            "drift_handling",
            finalLoad.workingView?.openDrift.some((entry) => entry.id === driftResult.entityId) ?? false,
            5
          ),
          createCheck(
            "stress_phase_progression",
            "the rebuilt phase is fully completed by the end of the run",
            "agent_workflow_quality",
            finalLoad.phases?.phases[0]?.status === "done",
            4
          ),
          createCheck(
            "stress_history_is_relevant",
            "the final working view still carries a recent decision and observation",
            "agent_workflow_quality",
            (finalLoad.workingView?.recentDecisions.length ?? 0) > 0 &&
              (finalLoad.workingView?.recentObservations.length ?? 0) > 0,
            3
          ),
          createCheck(
            "stress_issue_resolution_holds",
            "resolved issues remain out of the final open issue list",
            "continuity_quality",
            finalLoad.workingView?.openIssues.length === 0,
            0
          ),
          createLatencyCheck(
            "stress_total_latency",
            "the end-to-end stress run completes within a reasonable local duration",
            "performance",
            durationMs,
            BENCHMARK_THRESHOLDS.stressRunMs,
            3
          ),
          createCheck(
            "stress_payload_reasonable",
            "the final forge_load payload stays within a reasonable benchmark size",
            "performance",
            payloadBytes <= BENCHMARK_THRESHOLDS.reasonablePayloadBytes,
            2,
            `Payload size ${payloadBytes} bytes.`
          )
        ],
        artifacts: [
          {
            label: "final stress working view",
            kind: "json",
            content: JSON.stringify(finalLoad.workingView, null, 2)
          },
          {
            label: "stress run notes",
            kind: "markdown",
            content: [
              "Stress run covered:",
              "- initialization",
              "- decision recording",
              "- observation logging",
              "- issue creation and resolution",
              "- phase rebuild and completion",
              "- drift recording",
              "- session close and resume"
            ].join("\n")
          }
        ],
        recommendations:
          payloadBytes <= BENCHMARK_THRESHOLDS.reasonablePayloadBytes
            ? []
            : ["Keep forge_load payloads bounded so longer continuity runs stay readable."]
      };
    }
  }
];
