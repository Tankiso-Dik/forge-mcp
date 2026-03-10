# Forge Context Stress Workflow Test

This workspace is a harder Forge-managed test designed to make context management genuinely difficult across multiple fresh sessions.

It is meant to expose the gaps that ordinary file-reading and short chat memory do not close well:
- scattered source material
- partially conflicting stakeholder input
- packaging and trust pressures that point in different directions
- evolving deliverables
- explicit open issues and unresolved tradeoffs
- a later incident and scope change that should not be absorbed silently

## Goal

Observe whether a fresh Codex session uses Forge to stay coherent over a longer period of work where:
- no single file is enough
- the task shape changes over time
- multiple deliverables have to stay aligned
- earlier choices need to remain visible later

## Main source files

- `PROJECT_BRIEF.md`
- `USER_RESEARCH.md`
- `STAKEHOLDER_NOTES.md`
- `TECH_CONSTRAINTS.md`
- `DATA_MODEL.md`
- `PORTABILITY_OPTIONS.md`
- `TRUST_AND_LANGUAGE.md`
- `ROLL_OUT_NOTES.md`
- `INCIDENT_REPORT.md`
- `REVIEW_FEEDBACK.md`

## Main deliverables

- `PRODUCT_SPEC.md`
- `ARCHITECTURE_PLAN.md`
- `RISK_REGISTER.md`
- `EXEC_SUMMARY.md`
- `EVAL_RUBRIC.md`
- `OBSERVER_LOG_TEMPLATE.md`
- `RUN_EVAL.md`

## Session flow

1. Session 1: synthesize the product and identify contradictions
2. Session 2: produce architecture and risk material
3. Session 3: handle incident-driven scope change
4. Session 4: process review feedback and tighten the package
5. Session 5: final executive review and closeout

## What to watch for

- early `forge_load`
- use of `workingView.primaryFocus`, `recommendedActions`, and `doNotStartYet`
- whether Codex logs only meaningful continuity items instead of every observation
- whether scope changes are handled explicitly instead of silently drifting
- whether the handoff quality improves over time
- whether the final session resumes from tracked state instead of rediscovering everything

For a structured review, use:
- `RUN_EVAL.md` to run the test consistently
- `EVAL_RUBRIC.md` to score the sessions
- `OBSERVER_LOG_TEMPLATE.md` to record what actually happened

## Why this test is harder

- There are many more source files than the math tests.
- Some inputs conflict with each other.
- Several files contain compatible-sounding but strategically different directions.
- The agent must produce multiple evolving artifacts, not one answer file.
- Session 3 introduces a non-trivial incident and direction change.
- Session 4 adds review feedback that cuts across prior work.
- Session 5 requires consistency checking across everything, which punishes weak continuity.
