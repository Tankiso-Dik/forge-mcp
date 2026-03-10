# Forge MCP Server

Forge is a personal local-only MCP server for Codex CLI project continuity. It is designed for one machine, one developer, and low-latency stdio use against local project state instead of any remote service.

The server keeps continuity in local `.forge/` files, reads `~/.forge/global.json`, and favors fast local discovery and atomic writes over multi-user features. This version implements the documented Forge architecture from [`project-plan.md`](./project-plan.md): typed file models, project discovery, safe local JSON persistence, and the Forge MCP tool surface over stdio.

## Requirements

- Node.js 20+
- npm

## Setup

```bash
npm install
```

## Run in development

```bash
npm run dev
```

## Build and run

```bash
npm run build
npm start
```

## Codex CLI use

Forge is meant to be configured as a local stdio MCP server in Codex CLI. Point Codex at the built entrypoint:

```bash
node /absolute/path/to/forge-mcp/dist/index.js
```

That keeps calls on this machine only, avoids network latency, and lets Forge read and write your local continuity files directly.

## Quick verification

```bash
npm run check
```

## Benchmark suite

Run the benchmark harness:

```bash
npm run bench
```

Run the full suite over the real stdio transport:

```bash
npm run bench:stdio
```

Pin the current latest benchmark artifacts as the committed CI baseline:

```bash
npm run bench:pin
```

Run the benchmark suite against the pinned baseline and fail on regressions beyond the configured score drop:

```bash
npm run bench:compare
```

Run the CI benchmark path locally. This builds the server, runs the default benchmark profile, and compares against the pinned baseline:

```bash
npm run bench:ci
```

Typecheck the benchmark harness:

```bash
npm run bench:check
```

The benchmark runner writes:

- a machine-readable JSON report in `benchmarks/reports/`
- a human-readable Markdown report in `benchmarks/reports/`
- a live append-only run log in `benchmarks/logs/`
- a pinned baseline manifest and copied baseline artifacts in `benchmarks/baselines/`

It also supports:

- `--layer <tool-correctness|workflow-scenarios|end-to-end>`
- `--case <case-id>`
- `--transport <in-process|stdio>`
- `--compare <report-path>`
- `--compare-pinned`
- `--max-score-drop <number>`
- `--fail-on-regression`

The default benchmark path still favors local speed with the in-process adapter, but the suite now includes a real stdio transport case and can run fully over stdio when you want dedicated transport-level coverage.

## Current status

- `forge_init` bootstraps a new local `.forge/` directory and seeds the three project state files when you want to initialize explicitly
- `forge_load` returns both full state and a pruned `workingView` for agent-facing context, and now auto-bootstraps the current directory on first use outside the exact home directory
- `workingView` now includes ranked guidance such as `useForge`, `doNow`, `whyThisMattersNow`, `watchOut`, `notYet`, `resumeDiff`, `linkedFiles`, and `recommendedWriteStyle`
- `forge_compare_execution` compares an observed execution path against current decisions, architecture, active phases, issues, and drift
- `forge_suggest_update` recommends whether new information belongs in no Forge write, a log, a structured update, a checkpoint, drift, or a session handoff
- `forge_session_draft` proposes closeout summaries, next steps, readiness, and a ready-to-send closeout payload
- `forge_checkpoint` provides a lightweight combined note/progress/handoff update path for light-mode work
- `forge_update`, `forge_log`, `forge_step_done`, `forge_rebuild_phases`, `forge_flag_drift`, and `forge_session_end` are implemented
- durable records can now carry `relatedFiles`, and `forge_load` surfaces those relationships back as linked file guidance with ownership, current phase ownership, and local file-existence checks
- `forge_session_end` can now append local Forge improvement feedback to `.forge/issues-and-niceties-asked.json` without loading that file back into routine Forge state
- Forge reads `~/.forge/global.json`
- Forge discovers the nearest project `.forge/` directory by walking upward from the working directory or an optional tool-supplied `cwd`
- If no Forge project exists, Forge auto-initializes the current directory as a managed project unless the current directory is exactly the home directory
- The exact home directory is intentionally excluded from auto-bootstrap so `~/.forge` remains global state, not a managed project root
- write-oriented tools persist data with atomic writes
- `forge_init` refuses to overwrite existing Forge files unless `force` is explicitly set
- stored JSON is normalized through a migration layer before tool handlers use it
- a local benchmark harness exists under `benchmarks/` with layered cases, fixtures, reports, pinned baselines, and live logs
- benchmark coverage includes tool correctness, workflow scenarios, one end-to-end stress run, and a real stdio transport startup path
- benchmark coverage now also checks quiet/light/managed guidance modes, explicit scope-change escalation, update-suggestion routing, session drafting, resume diffs, and linked-file guidance

## Local file layout

Global read-only file:

- `~/.forge/global.json`

Project files inside `.forge/`:

- `memory.json`
- `plan.json`
- `phases.json`
- `issues-and-niceties-asked.json` for local Forge friction, bug, and nicety reports written at session closeout
