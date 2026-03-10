# Forge Reasoning Workflow Test

This workspace is a small Forge-managed testbed for observing how a fresh Codex session uses Forge during a short reasoning task.

It is intentionally not a product project. The goal is to watch whether Codex:
- loads Forge state up front
- uses the existing phase structure instead of inventing its own from scratch
- records meaningful continuity state while working
- leaves a clean handoff for a later resume

## Files

- `PROBLEMS.md`: grouped math tasks
- `answers.md`: working artifact Codex should update
- `PROMPT.md`: first-session prompt
- `RESUME_PROMPT.md`: second-session prompt
- `.forge/`: pre-seeded Forge state

## Suggested test flow

1. Start a fresh Codex session in this directory.
2. Paste the prompt from `PROMPT.md`.
3. Watch whether Codex naturally uses Forge to orient, track progress, and close the session.
4. Start a second fresh Codex session in the same directory.
5. Paste the prompt from `RESUME_PROMPT.md`.
6. Watch whether Codex resumes from Forge state instead of re-deriving everything manually.

## What to look for

- early use of `forge_load`
- use of `workingView` for orientation
- phase progress updates instead of only editing `answers.md`
- useful observations or habits when a pattern emerges
- a concrete `forge_session_end` handoff after the first run

This is a local-only workflow test. It is meant to show how Forge complements ordinary reasoning work, not replace it.
