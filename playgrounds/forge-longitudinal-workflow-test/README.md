# Forge Longitudinal Workflow Test

This workspace is a longer Forge-managed testbed for observing how a fresh Codex session uses Forge across multiple sessions instead of a single short task.

It is designed to create natural opportunities for:
- early orientation with `forge_load`
- phase tracking across several resumptions
- durable updates to memory and plan
- quick observations and habit suggestions
- issue tracking when explanations or structure are weak
- possible drift or phase rebuild when the deliverable changes later

## Files

- `TASKS.md`: the reasoning work to perform over multiple sessions
- `WORKBOOK.md`: the main working artifact for solutions
- `HEURISTICS.md`: reusable solving patterns gathered over time
- `STUDY_GUIDE.md`: introduced later when the deliverable changes
- `SESSION1_PROMPT.md` to `SESSION4_PROMPT.md`: prompts for fresh Codex sessions
- `.forge/`: seeded continuity state

## Suggested flow

1. Start a fresh Codex session in this directory.
2. Use `SESSION1_PROMPT.md`.
3. End that session normally.
4. Start a second fresh Codex session in the same directory.
5. Use `SESSION2_PROMPT.md`.
6. Repeat for Sessions 3 and 4.

## What to watch for

- whether Codex uses `workingView` early instead of re-reading everything blindly
- whether progress is reflected in `.forge/phases.json` as the work advances
- whether observations, issues, or habits are logged only when they add value
- whether the session handoff becomes better over time
- whether the Session 3 deliverable change triggers explicit plan handling instead of silent drift

## Why this is a better Forge test

The short math test is good for proving basic continuity behavior. This workspace is better for seeing how Forge behaves over a longer period because it includes:
- multiple fresh-session resumes
- durable artifacts that evolve
- a midstream change in scope
- an explicit opportunity for review, issue handling, and final closure
