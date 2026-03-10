# Forge Benchmark Report

Generated: 2026-03-10T14:08:38.600Z
Total score: 100/100
Duration: 1441.05ms

## Category Scores

| Category | Score |
| --- | ---: |
| mcp_correctness | 30/30 |
| agent_workflow_quality | 25/25 |
| continuity_quality | 20/20 |
| drift_handling | 15/15 |
| performance | 10/10 |

## Case Results

### tool_compare_execution_classifies_alignment — Compare Execution Classifies Alignment
- Layer: tool-correctness
- Fixture: project-small
- Transport: in-process
- Status: passed
- Duration: 21.21ms
- Startup: 15.92ms
- Summary: forge_compare_execution classified the observed work against the active phase and open issue instead of forcing the caller to reconstruct that comparison manually.

Artifacts:
- compare execution output (json)
```text
{
  "status": "ok",
  "tool": "forge_compare_execution",
  "alignment": "needs_review",
  "summary": "Observed execution overlaps current project memory, but unresolved tension means it should be reviewed before continuing.",
  "rationale": "The execution path touches current project context, but there are unresolved issues or stale assumptions that could make the older state unsafe.",
  "matchingDecisions": [],
  "matchingArchitecture": [],
  "matchingPhases": [
    {
      "phaseId": "phase_small_1",
      "phaseTitle": "Benchmark Preparation",
      "via": "phase_and_step"
    }
  ],
  "...
```

### tool_session_end_writes_issues_and_niceties_file — Session End Writes Issues-And-Niceties File
- Layer: tool-correctness
- Fixture: project-small
- Transport: in-process
- Status: passed
- Duration: 32.27ms
- Startup: 2.70ms
- Summary: forge_session_end appended local Forge improvement feedback to the dedicated issues-and-niceties file without polluting the normal Forge load payload.

Artifacts:
- session end feedback output (json)
```text
{
  "status": "ok",
  "tool": "forge_session_end",
  "updatedFile": "memory",
  "message": "Saved session summary and next step, and appended 2 issues-and-niceties entry(s).",
  "feedbackFilePath": "/tmp/forge-benchmark-project-small-LqxSS4/.forge/issues-and-niceties-asked.json",
  "feedbackEntries": [
    {
      "id": "feedback_2f4aca2a-594a-4f5e-8fe3-33057277bca2",
      "kind": "friction",
      "summary": "The session still had to decide whether the observation belonged in an issue or a log.",
      "createdAt": "2026-03-10T14:08:37.251Z"
    },
    {
      "id": "feedback_9924da52-b56...
```
- issues-and-niceties file (json)
```text
{
  "version": 1,
  "entries": [
    {
      "id": "feedback_2f4aca2a-594a-4f5e-8fe3-33057277bca2",
      "kind": "friction",
      "summary": "The session still had to decide whether the observation belonged in an issue or a log.",
      "whatWouldHaveHelped": "A stronger update recommendation when uncertainty appears mid-task.",
      "createdAt": "2026-03-10T14:08:37.251Z",
      "sessionSummary": "Closed the benchmark session cleanly.",
      "nextStep": "Resume from the compact continuity summary."
    },
    {
      "id": "feedback_9924da52-b56e-48a4-a0ef-102a35aadd55",
      "kind": ...
```

### tool_load_non_project — Load Auto-Bootstraps A Directory
- Layer: tool-correctness
- Fixture: no-forge-project
- Transport: in-process
- Status: passed
- Duration: 22.02ms
- Startup: 2.41ms
- Summary: forge_load auto-bootstrapped the current directory into a managed Forge project.

Artifacts:
- forge_load output (json)
```text
{
  "managedProject": true,
  "cwd": "/tmp/forge-benchmark-no-forge-project-MqbRQZ",
  "projectRoot": "/tmp/forge-benchmark-no-forge-project-MqbRQZ",
  "forgeDirectory": "/tmp/forge-benchmark-no-forge-project-MqbRQZ/.forge",
  "global": {
    "version": 1,
    "constraints": [],
    "preferences": []
  },
  "memory": {
    "version": 1,
    "decisions": [],
    "triedAndAbandoned": [],
    "observations": [],
    "habits": [],
    "favouritePrompts": [],
    "issues": [],
    "driftLog": [],
    "concerns": [],
    "session": {}
  },
  "plan": {
    "version": 1,
    "stack": [],
    "desig...
```

### tool_write_non_project_error — Home Directory Stays Outside Auto-Bootstrap
- Layer: tool-correctness
- Fixture: no-forge-project
- Transport: in-process
- Status: passed
- Duration: 2.87ms
- Startup: 1.08ms
- Summary: The exact home directory stays excluded from auto-bootstrap, and write tools fail there with a clear explanation.

Artifacts:
- non-project write error (text)
```text
Forge auto-bootstrap is disabled for the home directory (/home/tankiso). Use a project subdirectory or initialize a different directory explicitly.
```

### tool_quiet_project_recommends_none — Quiet Project Recommends Minimal Forge Usage
- Layer: tool-correctness
- Fixture: project-quiet
- Transport: in-process
- Status: passed
- Duration: 5.58ms
- Startup: 1.97ms
- Summary: forge_load recommended no extra Forge ceremony for a quiet managed project.

Artifacts:
- quiet working view (json)
```text
{
  "constraints": [],
  "preferences": [],
  "projectScale": "small",
  "useForge": {
    "mode": "none",
    "confidence": "high",
    "reason": "The project is quiet enough that extra Forge writes would mostly be ceremony."
  },
  "reasonCodes": [
    "quiet_project"
  ],
  "doNow": "Work directly in project files and skip extra Forge bookkeeping.",
  "whyThisMattersNow": null,
  "watchOut": null,
  "notYet": [],
  "recommendedWriteStyle": "avoid",
  "avoidLoggingNoise": true,
  "session": null,
  "recentDecisions": [
    {
      "id": "decision_quiet_1",
      "title": "Keep the project...
```

### tool_small_project_recommends_light — Small Active Project Recommends Light Forge Usage
- Layer: tool-correctness
- Fixture: project-small
- Transport: in-process
- Status: passed
- Duration: 7.57ms
- Startup: 1.73ms
- Summary: forge_load recommended a light Forge posture with one active issue, one active phase, and a concrete next step.

Artifacts:
- small-project guidance (json)
```text
{
  "useForge": {
    "mode": "light",
    "confidence": "medium",
    "reason": "There is enough active continuity state to justify a light resume-and-handoff workflow."
  },
  "doNow": "Resume with the remaining open issue.",
  "whyThisMattersNow": "An open issue is already influencing later work, so resolving it stays higher value than starting new scope.",
  "recommendedWriteStyle": "normal"
}
```

### tool_invalid_input_rejected — Invalid Tool Input Is Rejected
- Layer: tool-correctness
- Fixture: project-small
- Transport: in-process
- Status: passed
- Duration: 4.25ms
- Startup: 1.58ms
- Summary: Malformed tool input is rejected by the benchmark adapter through the registered schemas.

Artifacts:
- schema validation error (text)
```text
[
  {
    "expected": "string",
    "code": "invalid_type",
    "path": [
      "stepId"
    ],
    "message": "Invalid input: expected string, received undefined"
  }
]
```

### tool_large_project_recommends_managed — Large Active Project Recommends Managed Forge Usage
- Layer: tool-correctness
- Fixture: project-large
- Transport: in-process
- Status: passed
- Duration: 46.12ms
- Startup: 1.59ms
- Summary: forge_load escalated to managed mode for a larger active project and surfaced density guardrails.

Artifacts:
- large-project guidance (json)
```text
{
  "projectScale": "large",
  "useForge": {
    "mode": "managed",
    "confidence": "high",
    "reason": "High-attention drift is open, so continuity needs explicit managed handling."
  },
  "doNow": "Triage drift: Open drift 04",
  "watchOut": "State is already dense; prefer issue progress, phase updates, and handoffs over extra routine notes.",
  "reasonCodes": [
    "session_handoff_present",
    "active_phase_present",
    "multiple_active_phases",
    "open_issue_present",
    "multiple_open_issues",
    "open_drift_present",
    "high_attention_drift",
    "project_large_state",
  ...
```

### tool_init_bootstrap — Init Seeds Forge Files Safely
- Layer: tool-correctness
- Fixture: no-forge-project
- Transport: in-process
- Status: passed
- Duration: 3.98ms
- Startup: 1.99ms
- Summary: forge_init created the expected seed files and guarded against accidental overwrite.

Artifacts:
- forge_init output (json)
```text
{
  "status": "ok",
  "tool": "forge_init",
  "projectRoot": "/tmp/forge-benchmark-no-forge-project-u2TtC0",
  "forgeDirectory": "/tmp/forge-benchmark-no-forge-project-u2TtC0/.forge",
  "forced": false,
  "files": {
    "memory": "/tmp/forge-benchmark-no-forge-project-u2TtC0/.forge/memory.json",
    "plan": "/tmp/forge-benchmark-no-forge-project-u2TtC0/.forge/plan.json",
    "phases": "/tmp/forge-benchmark-no-forge-project-u2TtC0/.forge/phases.json"
  },
  "message": "Initialized Forge project in /tmp/forge-benchmark-no-forge-project-u2TtC0/.forge."
}
```

### tool_partial_state_recovers_defaults — Partial Forge State Recovers Missing Files
- Layer: tool-correctness
- Fixture: project-partial
- Transport: in-process
- Status: passed
- Duration: 28.65ms
- Startup: 1.18ms
- Summary: Forge normalized the missing files to defaults and later writes materialized them on disk.

Artifacts:
- partial load working view (json)
```text
{
  "constraints": [],
  "preferences": [],
  "projectScale": "small",
  "useForge": {
    "mode": "light",
    "confidence": "medium",
    "reason": "There is enough active continuity state to justify a light resume-and-handoff workflow."
  },
  "reasonCodes": [
    "session_handoff_present"
  ],
  "doNow": "Recover the missing plan and phases files on demand.",
  "whyThisMattersNow": "A prior handoff already exists, so resuming from it is cheaper than re-planning from scratch.",
  "watchOut": null,
  "notYet": [],
  "recommendedWriteStyle": "normal",
  "avoidLoggingNoise": false,
  "sessi...
```

### tool_update_resolve_issue — Update Resolves Issue Metadata
- Layer: tool-correctness
- Fixture: project-small
- Transport: in-process
- Status: passed
- Duration: 13.72ms
- Startup: 1.46ms
- Summary: forge_update resolved the issue and the working view no longer reports it as open.

Artifacts:
- resolved issue snapshot (json)
```text
{
  "id": "issue_small_1",
  "title": "Need explicit issue resolution flow",
  "status": "resolved",
  "detail": "The benchmark fixture expects resolution metadata to be stored together.",
  "resolution": "Added the missing explicit resolution flow.",
  "createdAt": "2026-03-10T00:30:00.000Z",
  "resolvedAt": "2026-03-10T14:08:37.494Z",
  "updatedAt": "2026-03-10T14:08:37.494Z",
  "relatedFiles": []
}
```

### tool_large_fixture_performance — Large Fixture Load And Write Performance
- Layer: tool-correctness
- Fixture: project-large
- Transport: in-process
- Status: passed
- Duration: 25.10ms
- Startup: 1.27ms
- Summary: Large fixture benchmarking recorded load, write, startup, and payload characteristics against a heavier local state set.

Artifacts:
- large fixture metrics (json)
```text
{
  "startupDurationMs": 1.2730649999998604,
  "loadDurationMs": 14.010674000000108,
  "writeDurationMs": 10.12896099999989,
  "payloadBytes": 17804
}
```

### tool_stdio_transport_startup — Stdio Transport Startup Stays Viable
- Layer: tool-correctness
- Fixture: no-forge-project
- Transport: stdio
- Status: passed
- Duration: 359.02ms
- Startup: 424.22ms
- Summary: The benchmark harness connected to the real built stdio server and completed an auto-bootstrapped load.

Artifacts:
- stdio startup metrics (json)
```text
{
  "transport": "stdio",
  "startupDurationMs": 424.22187600000007
}
```

### tool_load_pruned_working_view — Load Returns A Pruned Working View
- Layer: tool-correctness
- Fixture: project-medium
- Transport: in-process
- Status: passed
- Duration: 9.59ms
- Startup: 1.00ms
- Summary: forge_load returned a bounded working view with recent decisions, active phases, and open issues only.

Artifacts:
- working view snapshot (json)
```text
{
  "constraints": [],
  "preferences": [],
  "projectScale": "large",
  "useForge": {
    "mode": "managed",
    "confidence": "high",
    "reason": "High-attention drift is open, so continuity needs explicit managed handling."
  },
  "reasonCodes": [
    "session_handoff_present",
    "active_phase_present",
    "multiple_active_phases",
    "open_issue_present",
    "multiple_open_issues",
    "open_drift_present",
    "high_attention_drift",
    "project_large_state"
  ],
  "doNow": "Triage drift: Active architecture contradiction",
  "whyThisMattersNow": "This contradiction affects cur...
```

### tool_suggest_update_routes_compact_milestone — Suggest Update Routes A Compact Milestone
- Layer: tool-correctness
- Fixture: project-small
- Transport: in-process
- Status: passed
- Duration: 8.28ms
- Startup: 1.13ms
- Summary: forge_suggest_update recommended a checkpoint instead of multiple smaller writes.

Artifacts:
- suggest update output (json)
```text
{
  "status": "ok",
  "tool": "forge_suggest_update",
  "recommendation": "forge_checkpoint",
  "confidence": "high",
  "rationale": "This looks like a compact milestone update, so one checkpoint is lower friction than chaining multiple Forge writes.",
  "draft": {
    "tool": "forge_checkpoint",
    "fields": {
      "completedSteps": [
        {
          "phaseId": "phase_small_1",
          "stepId": "step_small_2"
        }
      ],
      "session": {
        "summary": "Finished the remaining milestone and need to leave the next session a clean resume point.",
        "nextStep": "Res...
```

### tool_session_draft_builds_closeout_payload — Session Draft Builds A Closeout Payload
- Layer: tool-correctness
- Fixture: project-small
- Transport: in-process
- Status: passed
- Duration: 6.17ms
- Startup: 1.47ms
- Summary: forge_session_draft returned a concrete closeout draft instead of requiring the agent to invent one from scratch.

Artifacts:
- session draft output (json)
```text
{
  "status": "ok",
  "tool": "forge_session_draft",
  "recommendedCloseTool": "forge_session_end",
  "summary": "Reviewed the active issue and tightened the small-project milestone wording.",
  "nextStep": "Resolve or acknowledge drift: Working view phrasing might drift from the plan.",
  "warnings": [
    "There is open drift in the project state; avoid silently continuing if new work conflicts with prior decisions."
  ],
  "readiness": {
    "status": "needs_attention",
    "reason": "There is open drift in the project state; avoid silently continuing if new work conflicts with prior dec...
```

### workflow_resume_log_and_close — Resume Work, Log A Struggle, Resolve An Issue, Close Session
- Layer: workflow-scenarios
- Fixture: project-small
- Transport: in-process
- Status: passed
- Duration: 11.77ms
- Startup: 0.64ms
- Summary: The workflow used the right Forge tools for continuity work and produced a stronger next-step handoff.

Artifacts:
- final working view (json)
```text
{
  "constraints": [],
  "preferences": [],
  "projectScale": "medium",
  "useForge": {
    "mode": "light",
    "confidence": "medium",
    "reason": "There is enough active continuity state to justify a light resume-and-handoff workflow."
  },
  "reasonCodes": [
    "session_handoff_present",
    "active_phase_present",
    "open_drift_present",
    "project_medium_state"
  ],
  "doNow": "Use the updated handoff when work resumes.",
  "whyThisMattersNow": "The current phase still has unfinished work, so advancing it keeps continuity cleaner than branching into later deliverables.",
  "wat...
```

### workflow_nested_drift_handling — Nested Project Drift Handling
- Layer: workflow-scenarios
- Fixture: project-nested
- Transport: in-process
- Status: passed
- Duration: 12.88ms
- Startup: 0.71ms
- Summary: Nested discovery found the parent Forge project and the acknowledged high-severity drift stayed visible with action guidance.

Artifacts:
- acknowledged drift record (json)
```text
{
  "id": "drift_5ced9060-d1af-4466-b9f5-cbabf8d60d8b",
  "severity": "high",
  "status": "acknowledged",
  "summary": "Nested benchmark detected an architecture contradiction.",
  "detail": "Needs deliberate follow-up before continuing.",
  "recommendedAction": "Escalate the conflict and confirm whether the plan or architecture has changed.",
  "requiresAttention": true,
  "createdAt": "2026-03-10T14:08:38.430Z",
  "updatedAt": "2026-03-10T14:08:38.433Z",
  "relatedFiles": []
}
```

### workflow_scope_change_escalates_management — Scope Change Escalates Forge Guidance
- Layer: workflow-scenarios
- Fixture: project-small
- Transport: in-process
- Status: passed
- Duration: 13.20ms
- Startup: 0.77ms
- Summary: The scope change was handled explicitly and forge_load escalated the later guidance toward managed continuity with drift triage and future-phase boundaries.

Artifacts:
- scope-change working view (json)
```text
{
  "constraints": [],
  "preferences": [],
  "projectScale": "medium",
  "useForge": {
    "mode": "managed",
    "confidence": "high",
    "reason": "High-attention drift is open, so continuity needs explicit managed handling."
  },
  "reasonCodes": [
    "session_handoff_present",
    "active_phase_present",
    "multiple_active_phases",
    "open_issue_present",
    "open_drift_present",
    "high_attention_drift",
    "project_medium_state"
  ],
  "doNow": "Triage drift: A new deliverable changes the scope of the small active project.",
  "whyThisMattersNow": "This contradiction affect...
```

### workflow_light_checkpoint_flow — Light Mode Uses A Single Checkpoint
- Layer: workflow-scenarios
- Fixture: project-small
- Transport: in-process
- Status: passed
- Duration: 10.58ms
- Startup: 0.68ms
- Summary: The light-engagement project used forge_checkpoint to capture one note, one phase step, and one handoff update in a single call.

Artifacts:
- checkpoint output (json)
```text
{
  "status": "ok",
  "tool": "forge_checkpoint",
  "updatedFiles": [
    "memory",
    "phases"
  ],
  "message": "Logged note observation 'Checkpointed the remaining small-project milestone cleanly.'. Marked step 'Resolve the open benchmark issue' as done. Updated session handoff.",
  "loggedEntityId": "obs_18f7dc3c-7c95-45eb-9aff-5bb49fa217e1",
  "completedSteps": [
    {
      "phaseId": "phase_small_1",
      "stepId": "step_small_2"
    }
  ],
  "sessionUpdated": true
}
```

### workflow_resume_diff_and_file_links — Resume Diff And File Links Stay Actionable
- Layer: workflow-scenarios
- Fixture: project-small
- Transport: in-process
- Status: passed
- Duration: 17.07ms
- Startup: 0.71ms
- Summary: forge_load linked active continuity state back to the affected files, showed which records own each link, flagged missing files, and summarized what changed since the previous session boundary.

Artifacts:
- resume diff and linked files (json)
```text
{
  "resumeDiff": {
    "since": "2026-03-10T01:00:00.000Z",
    "summary": "1 decision or architecture item changed.",
    "changes": [
      "1 decision or architecture item changed.",
      "1 issue record changed.",
      "1 drift record changed.",
      "1 observation or note was logged."
    ],
    "changedFiles": [
      ".forge/memory.json",
      "docs/spec.md",
      "docs/architecture.md"
    ],
    "newOpenIssues": [
      {
        "id": "issue_ec0f12a9-b8d7-4cd5-8ef1-8730599a8fe0",
        "title": "Align architecture note with spec boundary"
      }
    ],
    "resolvedIssues...
```

### workflow_medium_partial_resume — Medium Fixture Partial Resume Flow
- Layer: workflow-scenarios
- Fixture: project-medium
- Transport: in-process
- Status: passed
- Duration: 35.36ms
- Startup: 1.21ms
- Summary: The medium fixture preserved a partial handoff, resumed from that handoff, then completed the active issue and phase without losing continuity.

Artifacts:
- medium resumed working view (json)
```text
{
  "constraints": [],
  "preferences": [],
  "projectScale": "large",
  "useForge": {
    "mode": "managed",
    "confidence": "high",
    "reason": "High-attention drift is open, so continuity needs explicit managed handling."
  },
  "reasonCodes": [
    "session_handoff_present",
    "active_phase_present",
    "multiple_active_phases",
    "open_issue_present",
    "multiple_open_issues",
    "open_drift_present",
    "high_attention_drift",
    "project_large_state"
  ],
  "doNow": "Triage drift: Active architecture contradiction",
  "whyThisMattersNow": "This contradiction affects cur...
```

### workflow_large_resume_after_partial_mutation — Large Fixture Resume After Partial Mutation
- Layer: workflow-scenarios
- Fixture: project-large
- Transport: in-process
- Status: passed
- Duration: 25.64ms
- Startup: 0.70ms
- Summary: The larger workflow survived a partial stop, then resumed into issue resolution, drift acknowledgement, and active-phase completion with the handoff intact.

Artifacts:
- large resume working view (json)
```text
{
  "constraints": [],
  "preferences": [],
  "projectScale": "large",
  "useForge": {
    "mode": "managed",
    "confidence": "high",
    "reason": "High-attention drift is open, so continuity needs explicit managed handling."
  },
  "reasonCodes": [
    "session_handoff_present",
    "active_phase_present",
    "multiple_active_phases",
    "open_issue_present",
    "multiple_open_issues",
    "open_drift_present",
    "high_attention_drift",
    "project_large_state",
    "dense_notes"
  ],
  "doNow": "Triage drift: Large resume flow found a contradiction before phase completion.",
  "w...
```

### stress_full_continuity_run — End-to-End Continuity Stress Run
- Layer: end-to-end
- Fixture: no-forge-project
- Transport: in-process
- Status: passed
- Duration: 19.84ms
- Startup: 1.28ms
- Summary: The end-to-end run stayed coherent across initialization, mutation, drift, phase progression, and session resume.

Artifacts:
- final stress working view (json)
```text
{
  "constraints": [],
  "preferences": [],
  "projectScale": "small",
  "useForge": {
    "mode": "light",
    "confidence": "medium",
    "reason": "There is enough active continuity state to justify a light resume-and-handoff workflow."
  },
  "reasonCodes": [
    "session_handoff_present",
    "open_drift_present"
  ],
  "doNow": "Resume from the compact continuity summary.",
  "whyThisMattersNow": "A prior handoff already exists, so resuming from it is cheaper than re-planning from scratch.",
  "watchOut": "There is open drift in the project state; avoid silently continuing if new work...
```
- stress run notes (markdown)
```text
Stress run covered:
- initialization
- decision recording
- observation logging
- issue creation and resolution
- phase rebuild and completion
- drift recording
- session close and resume
```

Live log: /home/tankiso/forge-mcp/benchmarks/logs/benchmark-2026-03-10T14-08-37-154Z.log
