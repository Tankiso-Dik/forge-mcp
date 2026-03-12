# Forge Longitudinal Workflow Test

Legacy note: this playground targets an older Forge workflow. The workspace still works, but judge it through the current public surface:
- `forge_init`
- `forge_load`
- `forge_checkpoint`
- `forge_update`
- `forge_shape`
- `forge_update_shape`

This workspace is a longer Forge-managed testbed for observing how a fresh Codex session uses Forge across multiple sessions instead of a single short task.

It is designed to create natural opportunities for:
- early orientation with `forge_load`
- phase tracking across several resumptions
- durable updates to memory and plan
- quick milestone and fact capture
- issue tracking when explanations or structure are weak
- possible explicit phase updates when the deliverable changes later

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

- whether Codex uses `workingView.shelf` and `workingView.session` early instead of re-reading everything blindly
- whether progress is reflected in `.forge/phases.json` as the work advances
- whether notes or issues are written only when they add value
- whether the session handoff becomes better over time
- whether the Session 3 deliverable change triggers explicit plan or phase handling instead of silent confusion

## Why this is a better Forge test

The short math test is good for proving basic continuity behavior. This workspace is better for seeing how Forge behaves over a longer period because it includes:
- multiple fresh-session resumes
- durable artifacts that evolve
- a midstream change in scope
- an explicit opportunity for review, issue handling, and final closure
