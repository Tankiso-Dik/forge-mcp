import {
  ForgeCheckpointOutputSchema,
  ForgeLoadOutputSchema,
  WriteResultSchema
} from "../../../src/schemas.js";
import { BENCHMARK_THRESHOLDS } from "../constants.js";
import { createCheck, createLatencyCheck } from "../checks.js";
import type { BenchmarkCaseDefinition } from "../types.js";

export const workflowScenarioCases: BenchmarkCaseDefinition[] = [
  {
    id: "workflow_resume_log_and_close",
    title: "Resume Work, Log A Struggle, Resolve An Issue, Close Session",
    description:
      "Simulate a realistic resume flow where the agent loads continuity, logs a struggle, resolves an issue, and writes a new handoff.",
    fixture: "project-small",
    layer: "workflow-scenarios",
    async run({ fixture, client }) {
      const started = performance.now();

      const initialLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const logResult = WriteResultSchema.parse(
        await client.invoke("forge_log", {
          cwd: fixture.entryCwd,
          kind: "struggle",
          summary: "Benchmark runner needed a clearer continuity handoff."
        })
      );
      const resolveResult = WriteResultSchema.parse(
        await client.invoke("forge_update", {
          cwd: fixture.entryCwd,
          domain: "memory",
          action: "resolve_issue",
          id: "issue_small_1",
          resolution: "Benchmark flow now validates resolution metadata."
        })
      );
      const sessionEndResult = WriteResultSchema.parse(
        await client.invoke("forge_session_end", {
          cwd: fixture.entryCwd,
          summary: "Workflow scenario complete",
          nextStep: "Use the updated handoff when work resumes."
        })
      );
      const finalLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const durationMs = performance.now() - started;
      const memory = await fixture.readJson<{
        observations: Array<{ kind: string; summary: string }>;
      }>(".forge/memory.json");

      return {
        summary:
          "The workflow used the right Forge tools for continuity work and produced a stronger next-step handoff.",
        checks: [
          createCheck(
            "resume_handoff_present",
            "resume flow starts from an existing session handoff",
            "agent_workflow_quality",
            Boolean(initialLoad.workingView?.session?.nextStep),
            4
          ),
          createCheck(
            "struggle_logged_as_observation",
            "forge_log records the struggle as a lightweight observation instead of a structured issue mutation",
            "agent_workflow_quality",
            logResult.updatedFile === "memory" &&
              memory.observations.some((entry) => entry.kind === "struggle"),
            3
          ),
          createCheck(
            "session_end_updates_handoff",
            "forge_session_end writes the new summary and next step for later resume",
            "agent_workflow_quality",
            sessionEndResult.updatedFile === "memory" &&
              finalLoad.workingView?.session?.nextStep === "Use the updated handoff when work resumes.",
            3
          ),
          createCheck(
            "resolved_issue_stays_out_of_open_context",
            "resolved issues do not pollute the later continuity view",
            "continuity_quality",
            finalLoad.workingView?.openIssues.every((issue) => issue.id !== "issue_small_1") ?? false,
            5
          ),
          createCheck(
            "workflow_resolution_shape",
            "issue resolution still returns the standard Forge write result shape",
            "mcp_correctness",
            resolveResult.status === "ok" && resolveResult.entityId === "issue_small_1",
            2
          ),
          createLatencyCheck(
            "workflow_total_latency",
            "the resume workflow remains responsive as a local benchmark run",
            "performance",
            durationMs,
            BENCHMARK_THRESHOLDS.workflowMs,
            1
          )
        ],
        artifacts: [
          {
            label: "final working view",
            kind: "json",
            content: JSON.stringify(finalLoad.workingView, null, 2)
          }
        ],
        recommendations:
          finalLoad.workingView?.session?.nextStep === "Use the updated handoff when work resumes."
            ? []
            : ["Session handoffs should remain crisp enough that the next resume starts from a concrete nextStep."]
      };
    }
  },
  {
    id: "workflow_nested_drift_handling",
    title: "Nested Project Drift Handling",
    description:
      "Start from a nested working directory, detect a high-severity contradiction, acknowledge it, and confirm the drift remains visible until resolved.",
    fixture: "project-nested",
    layer: "workflow-scenarios",
    async run({ fixture, client }) {
      const initialLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const driftResult = WriteResultSchema.parse(
        await client.invoke("forge_flag_drift", {
          cwd: fixture.entryCwd,
          severity: "high",
          summary: "Nested benchmark detected an architecture contradiction."
        })
      );
      const acknowledgedResult = WriteResultSchema.parse(
        await client.invoke("forge_update", {
          cwd: fixture.entryCwd,
          domain: "memory",
          action: "set_drift_status",
          id: driftResult.entityId,
          status: "acknowledged",
          note: "Needs deliberate follow-up before continuing."
        })
      );
      const finalLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const driftId = driftResult.entityId;
      if (!driftId) {
        throw new Error("Expected forge_flag_drift to return an entityId.");
      }
      const driftEntry = finalLoad.memory?.driftLog.find((entry) => entry.id === driftId);

      return {
        summary:
          "Nested discovery found the parent Forge project and the acknowledged high-severity drift stayed visible with action guidance.",
        checks: [
          createCheck(
            "nested_project_discovery",
            "forge_load discovers the nearest parent .forge directory from a nested cwd",
            "mcp_correctness",
            initialLoad.managedProject && initialLoad.projectRoot === fixture.resolve("."),
            2
          ),
          createCheck(
            "drift_tool_returns_guidance",
            "forge_flag_drift returns recommended handling guidance for high severity contradictions",
            "agent_workflow_quality",
            Boolean(driftResult.recommendedAction) && driftResult.requiresAttention === true,
            4
          ),
          createCheck(
            "acknowledged_drift_still_visible",
            "acknowledged drift remains visible in workingView until it is fully resolved",
            "agent_workflow_quality",
            finalLoad.workingView?.openDrift.some((entry) => entry.id === driftId) ?? false,
            4
          ),
          createCheck(
            "drift_status_progression",
            "drift handling records both severity and acknowledgement state",
            "drift_handling",
            driftEntry?.severity === "high" &&
              driftEntry.status === "acknowledged" &&
              driftEntry.requiresAttention === true,
            5
          ),
          createCheck(
            "drift_recommendation_persists",
            "drift records persist the recommended action for later review",
            "drift_handling",
            Boolean(driftEntry?.recommendedAction),
            5
          ),
          createCheck(
            "acknowledge_result_shape",
            "drift acknowledgement returns the standard write result shape",
            "agent_workflow_quality",
            acknowledgedResult.status === "ok" && acknowledgedResult.entityId === driftId,
            0
          )
        ],
        artifacts: [
          {
            label: "acknowledged drift record",
            kind: "json",
            content: JSON.stringify(driftEntry, null, 2)
          }
        ],
        recommendations:
          driftEntry?.status === "acknowledged"
            ? []
            : ["High-severity drift should stay visible with an explicit status until it is resolved."]
      };
    }
  },
  {
    id: "workflow_scope_change_escalates_management",
    title: "Scope Change Escalates Forge Guidance",
    description:
      "Simulate a requirement change that should be handled explicitly through plan, drift, and phase updates instead of silently continuing with the old workflow.",
    fixture: "project-small",
    layer: "workflow-scenarios",
    async run({ fixture, client }) {
      const initialLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const planUpdate = WriteResultSchema.parse(
        await client.invoke("forge_update", {
          cwd: fixture.entryCwd,
          domain: "plan",
          action: "add_planned_feature",
          value: "scope-change deliverable"
        })
      );
      const driftResult = WriteResultSchema.parse(
        await client.invoke("forge_flag_drift", {
          cwd: fixture.entryCwd,
          severity: "high",
          summary: "A new deliverable changes the scope of the small active project."
        })
      );
      await client.invoke("forge_rebuild_phases", {
        cwd: fixture.entryCwd,
        phases: [
          {
            id: "phase_scope_1",
            title: "Stabilize Existing Work",
            status: "in_progress",
            steps: [
              { id: "step_scope_1", title: "Resolve the original issue", status: "todo" }
            ]
          },
          {
            id: "phase_scope_2",
            title: "Handle The New Deliverable",
            status: "todo",
            steps: [
              { id: "step_scope_2", title: "Plan the changed scope", status: "todo" }
            ]
          }
        ]
      });
      const finalLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const view = finalLoad.workingView;
      const driftId = driftResult.entityId;
      if (!driftId) {
        throw new Error("Expected forge_flag_drift to return an entityId.");
      }

      return {
        summary:
          "The scope change was handled explicitly and forge_load escalated the later guidance toward managed continuity with drift triage and future-phase boundaries.",
        checks: [
          createCheck(
            "scope_change_starts_light",
            "the original small project starts from light guidance before the change",
            "agent_workflow_quality",
            initialLoad.workingView?.useForge.mode === "light",
            2
          ),
          createCheck(
            "scope_change_plan_updated",
            "the changed deliverable is recorded in plan state instead of being handled implicitly",
            "mcp_correctness",
            planUpdate.updatedFile === "plan" &&
              finalLoad.plan?.plannedFeatures.includes("scope-change deliverable") === true,
            3
          ),
          createCheck(
            "scope_change_escalates_to_managed",
            "the later forge_load guidance escalates to managed mode after the explicit scope change",
            "drift_handling",
            view?.useForge.mode === "managed",
            5
          ),
          createCheck(
            "scope_change_surfaces_drift_action",
            "managed guidance explicitly prioritizes drift after the scope change",
            "drift_handling",
            view?.doNow?.includes("drift") === true &&
              finalLoad.memory?.driftLog.some((entry) => entry.id === driftId) === true,
            5
          ),
          createCheck(
            "scope_change_preserves_do_not_start_yet",
            "the rebuilt phase sequence tells the agent not to start the later deliverable phase too early",
            "continuity_quality",
            view?.notYet.includes("Handle The New Deliverable") === true,
            4
          )
        ],
        artifacts: [
          {
            label: "scope-change working view",
            kind: "json",
            content: JSON.stringify(view, null, 2)
          }
        ],
        recommendations:
          view?.useForge.mode === "managed"
            ? []
            : ["Scope changes should escalate Forge guidance instead of being absorbed silently."]
      };
    }
  },
  {
    id: "workflow_light_checkpoint_flow",
    title: "Light Mode Uses A Single Checkpoint",
    description:
      "Verify a light-engagement project can record a meaningful note, step completion, and handoff in one checkpoint call instead of multiple small writes.",
    fixture: "project-small",
    layer: "workflow-scenarios",
    async run({ fixture, client }) {
      const initialLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const checkpoint = ForgeCheckpointOutputSchema.parse(
        await client.invoke("forge_checkpoint", {
          cwd: fixture.entryCwd,
          log: {
            kind: "note",
            summary: "Checkpointed the remaining small-project milestone cleanly."
          },
          completedSteps: [
            {
              phaseId: "phase_small_1",
              stepId: "step_small_2",
              note: "Used forge_checkpoint instead of separate log, step, and session calls."
            }
          ],
          session: {
            summary: "Checkpoint complete for the small project.",
            nextStep: "Resume with the remaining issue and confirm no extra bookkeeping is needed."
          }
        })
      );
      const finalLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const latestObservation = finalLoad.memory?.observations.at(-1);
      const phase = finalLoad.phases?.phases.find((entry) => entry.id === "phase_small_1");

      return {
        summary:
          "The light-engagement project used forge_checkpoint to capture one note, one phase step, and one handoff update in a single call.",
        checks: [
          createCheck(
            "checkpoint_starts_from_light_guidance",
            "the small project starts in light mode before the checkpoint runs",
            "agent_workflow_quality",
            initialLoad.workingView?.useForge.mode === "light",
            2
          ),
          createCheck(
            "checkpoint_updates_both_files",
            "forge_checkpoint can update both memory and phases in one call",
            "mcp_correctness",
            checkpoint.updatedFiles.includes("memory") && checkpoint.updatedFiles.includes("phases"),
            4
          ),
          createCheck(
            "checkpoint_records_note_and_step",
            "the checkpoint result reports both the logged note and completed step",
            "agent_workflow_quality",
            Boolean(checkpoint.loggedEntityId) &&
              checkpoint.completedSteps.some(
                (item) => item.phaseId === "phase_small_1" && item.stepId === "step_small_2"
              ),
            4
          ),
          createCheck(
            "checkpoint_persists_session_handoff",
            "the checkpoint writes the updated handoff without needing a separate session-end call",
            "continuity_quality",
            checkpoint.sessionUpdated === true &&
              finalLoad.workingView?.session?.nextStep ===
                "Resume with the remaining issue and confirm no extra bookkeeping is needed.",
            4
          ),
          createCheck(
            "checkpoint_keeps_light_mode_lean",
            "the resulting state shows a real checkpoint note and a completed phase step rather than scattered small writes",
            "continuity_quality",
            latestObservation?.summary === "Checkpointed the remaining small-project milestone cleanly." &&
              phase?.steps.find((step) => step.id === "step_small_2")?.status === "done",
            3
          )
        ],
        artifacts: [
          {
            label: "checkpoint output",
            kind: "json",
            content: JSON.stringify(checkpoint, null, 2)
          }
        ],
        recommendations:
          checkpoint.updatedFiles.length >= 2
            ? []
            : ["Light-mode projects should be able to checkpoint progress without multiple separate Forge calls."]
      };
    }
  },
  {
    id: "workflow_resume_diff_and_file_links",
    title: "Resume Diff And File Links Stay Actionable",
    description:
      "Simulate a small continuity-heavy session that links state to files, then verify forge_load surfaces both the changed-since-last-session summary and the linked-file map.",
    fixture: "project-small",
    layer: "workflow-scenarios",
    async run({ fixture, client }) {
      await client.invoke("forge_update", {
        cwd: fixture.entryCwd,
        domain: "memory",
        action: "add_decision",
        title: "Clarify deliverable boundary",
        detail: "The spec and risk notes need to stay aligned.",
        relatedFiles: [".forge/memory.json", "docs/spec.md"]
      });
      await client.invoke("forge_log", {
        cwd: fixture.entryCwd,
        kind: "ambiguous_item",
        summary: "Spec wording is still ambiguous around portability.",
        relatedFiles: [".forge/memory.json", "docs/spec.md"]
      });
      const issueResult = WriteResultSchema.parse(
        await client.invoke("forge_update", {
          cwd: fixture.entryCwd,
          domain: "memory",
          action: "upsert_issue",
          title: "Align architecture note with spec boundary",
          detail: "The architecture note still implies a wider portability promise.",
          relatedFiles: [".forge/memory.json", "docs/architecture.md", "docs/spec.md"]
        })
      );
      await client.invoke("forge_flag_drift", {
        cwd: fixture.entryCwd,
        severity: "high",
        summary: "Recent wording changes risk drifting past the intended portability boundary.",
        relatedFiles: ["docs/spec.md", "docs/architecture.md"]
      });
      await client.invoke("forge_rebuild_phases", {
        cwd: fixture.entryCwd,
        phases: [
          {
            id: "phase_linked_1",
            title: "Align Release Boundary",
            status: "in_progress",
            relatedFiles: [".forge/memory.json", "docs/spec.md"],
            steps: [
              {
                id: "step_linked_1",
                title: "Resolve portability wording",
                status: "todo",
                relatedFiles: ["docs/spec.md", "docs/architecture.md"]
              }
            ]
          },
          {
            id: "phase_linked_2",
            title: "Document Architecture Follow-up",
            status: "todo",
            relatedFiles: ["docs/architecture.md"],
            steps: [
              {
                id: "step_linked_2",
                title: "Create architecture note",
                status: "todo",
                relatedFiles: ["docs/architecture.md"]
              }
            ]
          }
        ]
      });

      const finalLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const linkedSpec = finalLoad.workingView?.linkedFiles.find((entry) => entry.path === "docs/spec.md");
      const linkedMemory = finalLoad.workingView?.linkedFiles.find(
        (entry) => entry.path === ".forge/memory.json"
      );
      const linkedArchitecture = finalLoad.workingView?.linkedFiles.find(
        (entry) => entry.path === "docs/architecture.md"
      );

      return {
        summary:
          "forge_load linked active continuity state back to the affected files, showed which records own each link, flagged missing files, and summarized what changed since the previous session boundary.",
        checks: [
          createCheck(
            "resume_diff_present",
            "workingView exposes a changed-since-last-session summary when new state has been written",
            "continuity_quality",
            finalLoad.workingView?.resumeDiff !== null,
            3
          ),
          createCheck(
            "resume_diff_tracks_issue_and_drift",
            "resumeDiff highlights new issues and drift since the previous session boundary",
            "continuity_quality",
            finalLoad.workingView?.resumeDiff?.newOpenIssues.some((issue) => issue.id === issueResult.entityId) === true &&
              (finalLoad.workingView?.resumeDiff?.changedDrift.length ?? 0) > 0,
            4
          ),
          createCheck(
            "resume_diff_tracks_changed_files",
            "resumeDiff includes the files touched by the changed continuity records",
            "agent_workflow_quality",
            finalLoad.workingView?.resumeDiff?.changedFiles.includes(".forge/memory.json") === true &&
              finalLoad.workingView?.resumeDiff?.changedFiles.includes("docs/spec.md") === true &&
              finalLoad.workingView?.resumeDiff?.changedFiles.includes("docs/architecture.md") === true,
            3
          ),
          createCheck(
            "linked_files_aggregate_reasons",
            "workingView aggregates multiple reasons against the same linked file",
            "agent_workflow_quality",
            Boolean(linkedSpec) && (linkedSpec?.reasons.length ?? 0) >= 3,
            3
          ),
          createCheck(
            "linked_files_report_owners",
            "linkedFiles include owner metadata so the agent can see which issue, phase, or step points at a file",
            "continuity_quality",
            finalLoad.workingView?.linkedFiles.some((entry) =>
              entry.owners.some((owner) => owner.type === "issue")
            ) === true &&
              finalLoad.workingView?.linkedFiles.some((entry) =>
                entry.owners.some((owner) => owner.type === "phase" || owner.type === "step")
              ) === true,
            3
          ),
          createCheck(
            "linked_files_report_primary_phase_owner",
            "linkedFiles expose the primary active phase owner so the agent can tell which incomplete phase owns a file right now",
            "continuity_quality",
            linkedSpec?.primaryCurrentPhaseOwner?.phaseId === "phase_linked_1" &&
              linkedSpec?.primaryCurrentPhaseOwner?.phaseTitle === "Align Release Boundary",
            3
          ),
          createCheck(
            "linked_files_report_multi_phase_ownership",
            "linkedFiles preserve multiple active phase owners when a file spans the current phase and a later incomplete phase",
            "continuity_quality",
            linkedArchitecture?.currentPhaseOwners.some((owner) => owner.phaseId === "phase_linked_1") === true &&
              linkedArchitecture?.currentPhaseOwners.some((owner) => owner.phaseId === "phase_linked_2") === true,
            3
          ),
          createCheck(
            "linked_files_validate_existence",
            "linkedFiles distinguish real local files from stale or not-yet-created file links",
            "continuity_quality",
            linkedMemory?.exists === true &&
              linkedSpec?.exists === false &&
              linkedArchitecture?.exists === false,
            3
          ),
          createCheck(
            "scope_shift_detected",
            "high-severity linked drift can surface as a scope-shift signal in the resume diff",
            "drift_handling",
            finalLoad.workingView?.resumeDiff?.scopeShiftDetected === true,
            2
          ),
          createCheck(
            "missing_links_warn_in_watch_out",
            "workingView warns when continuity-linked files are missing locally",
            "agent_workflow_quality",
            finalLoad.workingView?.watchOut?.includes("missing locally") === true,
            2
          )
        ],
        artifacts: [
          {
            label: "resume diff and linked files",
            kind: "json",
            content: JSON.stringify(
              {
                resumeDiff: finalLoad.workingView?.resumeDiff,
                linkedFiles: finalLoad.workingView?.linkedFiles
              },
              null,
              2
            )
          }
        ],
        recommendations:
          finalLoad.workingView?.resumeDiff?.changedFiles.includes("docs/spec.md")
            ? []
            : ["Resume guidance should connect changed continuity state back to the affected files."]
      };
    }
  },
  {
    id: "workflow_medium_partial_resume",
    title: "Medium Fixture Partial Resume Flow",
    description:
      "Leave a medium-sized project in a partially progressed state, close the session, reload continuity, and resume from the saved handoff.",
    fixture: "project-medium",
    layer: "workflow-scenarios",
    async run({ fixture, client }) {
      const started = performance.now();

      const initialLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      await client.invoke("forge_update", {
        cwd: fixture.entryCwd,
        domain: "memory",
        action: "upsert_issue",
        id: "issue_medium_3",
        title: "Open issue 3",
        detail: "Resume flow should confirm the queued phase is promoted deliberately."
      });
      await client.invoke("forge_update", {
        cwd: fixture.entryCwd,
        domain: "phases",
        action: "set_phase_status",
        phaseId: "phase_medium_3",
        status: "in_progress"
      });
      await client.invoke("forge_session_end", {
        cwd: fixture.entryCwd,
        summary: "Paused after promoting the queued phase for follow-up.",
        nextStep: "Resolve issue_medium_3 and finish the active medium phase."
      });

      const resumedLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const resumeResolution = WriteResultSchema.parse(
        await client.invoke("forge_update", {
          cwd: fixture.entryCwd,
          domain: "memory",
          action: "resolve_issue",
          id: "issue_medium_3",
          resolution: "Queued phase promotion is now part of the active plan."
        })
      );
      await client.invoke("forge_step_done", {
        cwd: fixture.entryCwd,
        phaseId: "phase_medium_2",
        stepId: "step_medium_2",
        note: "Medium resume flow completed the in-progress work."
      });
      const finalLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const durationMs = performance.now() - started;

      return {
        summary:
          "The medium fixture preserved a partial handoff, resumed from that handoff, then completed the active issue and phase without losing continuity.",
        checks: [
          createCheck(
            "medium_resume_initial_context",
            "the medium fixture starts with a usable session handoff",
            "continuity_quality",
            Boolean(initialLoad.workingView?.session?.nextStep),
            3
          ),
          createCheck(
            "medium_resume_handoff_updates",
            "session_end writes the new partial-progress next step before the resume load",
            "continuity_quality",
            resumedLoad.workingView?.session?.nextStep ===
              "Resolve issue_medium_3 and finish the active medium phase.",
            4
          ),
          createCheck(
            "medium_resume_partial_phase_visible",
            "the newly promoted medium phase stays visible when work resumes",
            "agent_workflow_quality",
            resumedLoad.workingView?.activePhases.some((phase) => phase.id === "phase_medium_3") ?? false,
            3
          ),
          createCheck(
            "medium_resume_issue_closes_cleanly",
            "resuming the workflow resolves the open issue and removes it from openIssues",
            "agent_workflow_quality",
            resumeResolution.status === "ok" &&
              (finalLoad.workingView?.openIssues.some((issue) => issue.id === "issue_medium_3") ?? false) === false,
            4
          ),
          createCheck(
            "medium_resume_active_phase_finishes",
            "the original active phase completes after the resumed step is marked done",
            "continuity_quality",
            finalLoad.phases?.phases.find((phase) => phase.id === "phase_medium_2")?.status === "done",
            4
          ),
          createLatencyCheck(
            "medium_resume_latency",
            "the medium resume scenario remains fast enough for local iterative work",
            "performance",
            durationMs,
            BENCHMARK_THRESHOLDS.workflowMs,
            1
          )
        ],
        artifacts: [
          {
            label: "medium resumed working view",
            kind: "json",
            content: JSON.stringify(resumedLoad.workingView, null, 2)
          }
        ],
        recommendations:
          finalLoad.phases?.phases.find((phase) => phase.id === "phase_medium_2")?.status === "done"
            ? []
            : ["Resume flows should make it obvious which active medium-phase work still needs to be closed."]
      };
    }
  },
  {
    id: "workflow_large_resume_after_partial_mutation",
    title: "Large Fixture Resume After Partial Mutation",
    description:
      "Mutate a larger project across issues, drift, and phases, persist a handoff midstream, then resume and finish the remaining critical work.",
    fixture: "project-large",
    layer: "workflow-scenarios",
    async run({ fixture, client }) {
      const started = performance.now();

      await client.invoke("forge_update", {
        cwd: fixture.entryCwd,
        domain: "memory",
        action: "reopen_issue",
        id: "issue_large_03",
        detail: "Large resume benchmark reopened this to validate follow-up continuity."
      });
      const newDrift = WriteResultSchema.parse(
        await client.invoke("forge_flag_drift", {
          cwd: fixture.entryCwd,
          severity: "critical",
          summary: "Large resume flow found a contradiction before phase completion."
        })
      );
      await client.invoke("forge_session_end", {
        cwd: fixture.entryCwd,
        summary: "Paused after reopening a resolved issue and flagging critical drift.",
        nextStep: "Resolve the reopened large issue, acknowledge the new drift, and complete phase_large_04."
      });

      const resumedLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const newDriftId = newDrift.entityId;
      if (!newDriftId) {
        throw new Error("Expected forge_flag_drift to return an entityId.");
      }
      await client.invoke("forge_update", {
        cwd: fixture.entryCwd,
        domain: "memory",
        action: "resolve_issue",
        id: "issue_large_03",
        resolution: "Large resume benchmark validated the reopen-and-resolve cycle."
      });
      const acknowledgedDrift = WriteResultSchema.parse(
        await client.invoke("forge_update", {
          cwd: fixture.entryCwd,
          domain: "memory",
          action: "set_drift_status",
          id: newDriftId,
          status: "acknowledged",
          note: "Explicit follow-up is queued after phase completion."
        })
      );
      await client.invoke("forge_step_done", {
        cwd: fixture.entryCwd,
        phaseId: "phase_large_04",
        stepId: "step_large_04_2",
        note: "Large resume flow completed the remaining active step."
      });
      const finalLoad = ForgeLoadOutputSchema.parse(
        await client.invoke("forge_load", { cwd: fixture.entryCwd })
      );
      const durationMs = performance.now() - started;
      const openDriftIds = new Set(finalLoad.workingView?.openDrift.map((entry) => entry.id) ?? []);

      return {
        summary:
          "The larger workflow survived a partial stop, then resumed into issue resolution, drift acknowledgement, and active-phase completion with the handoff intact.",
        checks: [
          createCheck(
            "large_resume_handoff_persists",
            "the large fixture resumes from the new saved next step instead of the old one",
            "continuity_quality",
            resumedLoad.workingView?.session?.nextStep ===
              "Resolve the reopened large issue, acknowledge the new drift, and complete phase_large_04.",
            4
          ),
          createCheck(
            "large_resume_reopened_issue_visible",
            "the reopened issue re-enters the open issue list during the partial-progress resume",
            "agent_workflow_quality",
            resumedLoad.workingView?.openIssues.some((issue) => issue.id === "issue_large_03") ?? false,
            3
          ),
          createCheck(
            "large_resume_issue_resolves_again",
            "the large resume flow can close the reopened issue cleanly on the second pass",
            "continuity_quality",
            (finalLoad.workingView?.openIssues.some((issue) => issue.id === "issue_large_03") ?? false) === false,
            4
          ),
          createCheck(
            "large_resume_drift_stays_visible",
            "acknowledged critical drift remains visible and attention-worthy after the resume pass",
            "drift_handling",
            openDriftIds.has(newDriftId) &&
              finalLoad.memory?.driftLog.find((entry) => entry.id === newDriftId)?.status === "acknowledged" &&
              acknowledgedDrift.requiresAttention === true,
            5
          ),
          createCheck(
            "large_resume_phase_closes",
            "the partially active large phase completes after the resumed mutation sequence",
            "agent_workflow_quality",
            finalLoad.phases?.phases.find((phase) => phase.id === "phase_large_04")?.status === "done",
            4
          ),
          createLatencyCheck(
            "large_resume_latency",
            "the larger resume scenario stays within a reasonable local stress budget",
            "performance",
            durationMs,
            BENCHMARK_THRESHOLDS.stressRunMs,
            1
          )
        ],
        artifacts: [
          {
            label: "large resume working view",
            kind: "json",
            content: JSON.stringify(finalLoad.workingView, null, 2)
          }
        ],
        recommendations:
          openDriftIds.has(newDriftId)
            ? []
            : ["Critical drift introduced mid-run should remain prominent after the large resume flow."]
      };
    }
  }
];
