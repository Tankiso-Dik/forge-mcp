# Forge MCP Server

Forge is a personal local-only MCP server for Codex CLI project continuity. It is designed for one machine, one developer, and low-latency stdio use against local project state instead of any remote service.

The server keeps continuity in local `.forge/` files, reads `~/.forge/global.json`, and favors fast local discovery and atomic writes over multi-user features. The current design is leaner than the original project plan: Forge acts as a local continuity shelf with typed notes, explicit phase progress, precise state mutation, and a separate Shape layer for structural project maps.

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

## Forge model

Forge is now a small agent-facing state system with a separate structural map.

Outside Shape, Forge is meant to act like:
- structured smart notes
- explicit session handoff
- explicit phase/step progress
- precise state mutation

It is not meant to act like:
- a second reasoning brain
- a planning cockpit
- a hidden routing engine
- a manager that tells the agent what to do

## Public tool surface

Forge currently exposes 6 public tools:
- `forge_init`
- `forge_load`
- `forge_checkpoint`
- `forge_update`
- `forge_shape`
- `forge_update_shape`

### `forge_init`

Explicitly creates `.forge/` and seeds:
- `memory.json`
- `plan.json`
- `phases.json`
- `shape.json`

Use it when you want a directory to become Forge-managed.

### `forge_load`

The passive read path.

`forge_load` defaults to `compact` mode and returns:
- `workingView.shelf`
- `workingView.session`
- minimal `shapeMeta`
- file status metadata
- managed/unmanaged project status

Use `mode: "full"` only when you intentionally want raw:
- `memory`
- `plan`
- `phases`

`forge_load` does not auto-initialize projects. If no Forge project exists, it reports an unmanaged directory and write tools will not proceed until you run `forge_init`.

### `forge_checkpoint`

The default milestone write.

It can combine:
- one milestone note
- one explicit typed note
- completed steps
- session handoff update
- optional lightweight Shape metadata (`summary`, `projectType`, `confidence`)

Use it when the project reached a meaningful progress point and you want one clean continuity write.

Do not use `forge_checkpoint` to add or rewrite Shape structure. If surfaces, capabilities, or parts changed, read with `forge_shape` and write with `forge_update_shape`.

Checkpoint note kinds are intentionally lightweight. They now include practical kinds such as:
- `milestone`
- `interpretation`
- `ambiguity`
- `superseded_read`
- `fact`
- `reference`
- `concern`

### `forge_update`

The precise mutation API.

Use it when you know exactly what structured state should change.

In practice, `forge_update` is the advanced precision path.
Reach for it when you want to:
- close or narrow an issue deliberately
- add or update a formal interpretation
- store a superseded conclusion directly
- set phase status explicitly

If the moment is mainly "we made progress and should leave the shelf cleaner", prefer `forge_checkpoint`.

It can update:
- notes
- decisions
- interpretations
- superseded conclusions
- issues
- session context
- plan fields
- phase status

### `forge_shape`

Reads the structural map from `shape.json`.

Use it when you need to understand:
- surfaces
- capabilities
- parts

without loading full project continuity.

### `forge_update_shape`

Precisely mutates the structural map.

Use it when the current project form changed in a durable way:
- new surface
- capability added or materially re-scoped
- part added or re-scoped
- meaningful change in how the project fits together

## State model

Forge reads `~/.forge/global.json` and stores project-local state in `.forge/`.

### `plan.json`

Stable project identity:
- stack
- design style
- core features
- planned features
- architecture decisions

### `memory.json`

Durable continuity:
- typed notes
- decisions
- interpretations
- superseded conclusions
- issues
- session handoff

### `phases.json`

Execution structure:
- phases
- steps
- step status
- optional step notes

### `shape.json`

Structural project map:
- surfaces
- capabilities
- parts

## Local file layout

Global read-only file:

- `~/.forge/global.json`

Project files inside `.forge/`:

- `memory.json`
- `plan.json`
- `phases.json`
- `shape.json`

## Agent workflow

The expected Forge workflow is intentionally narrow and ordered:

1. `forge_init` once for a new unmanaged project
2. `forge_load` at the start of a meaningful session
3. `forge_shape` only if the project has a durable map worth preserving
4. do the actual work in files
5. `forge_update` only when an exact structured correction is clearly needed
6. `forge_update_shape` only when the structural map changed materially after reading it with `forge_shape`
7. `forge_checkpoint` before stopping or after a meaningful milestone

Good default pattern:
- start with `forge_load`
- work normally
- use `forge_update` sparingly for exact fixes
- end with `forge_checkpoint`

That is the standard Forge loop. If an agent is using Forge in a managed project, this should be the default behavior rather than an improvisation.

## workingView

In `compact` mode, the main agent-facing read surface is:

- `workingView.shelf`
  - notes
  - decisions
  - features
  - issues
  - interpretations
  - phases

- `workingView.session`
  - summary
  - next step
  - timestamps

This is intentionally a shelf, not an advice layer.

## Operational behavior

- Forge discovers the nearest project `.forge/` directory by walking upward from the working directory or an optional tool-supplied `cwd`
- The exact home directory is intentionally excluded from managed-project behavior so `~/.forge` remains global state, not a managed project root
- write-oriented tools persist data with atomic writes
- `forge_init` refuses to overwrite existing Forge files unless `force` is explicitly set
- stored JSON is normalized through a migration layer before tool handlers use it

## Forge Shape

Forge Shape is the project's current structural mental model.

Use it for:
- what surfaces exist
- what capabilities the project currently provides
- what major parts support those capabilities
- how those parts fit together at a structural level

Shape is most useful when the project has multiple durable artifacts or flows whose roles should stay legible across sessions.

Good Shape fits:
- apps with multiple user-facing surfaces
- dashboards and multi-screen tools
- multi-document research or investigation workspaces
- projects where several outputs, workflows, or subsystems fit together and later sessions should recover that map quickly

For non-UI work, think of Shape as:
- `surfaces`: the major places the work is encountered or consumed
- `capabilities`: what the workspace or system can meaningfully do
- `parts`: the major built pieces or document groupings that support that work

Examples in a dossier-style workspace:
- surfaces: canon document, theory document, final verdict, state-only resume
- capabilities: timeline reconstruction, ambiguity tracking, verdict synthesis
- parts: source packet set, working investigation docs, stored project shelf

Do not use Shape for:
- generic notes
- issues
- phase progress
- symbol-level or function-level implementation detail
- raw architecture commentary with no structural consequence

Shape stays separate on purpose:
- `plan` is intended stable identity
- `shape` is current structural form
- `memory` is notes, history, issues, decisions, and unresolved pressure
- `phases` is execution progress

Natural Shape reads:
- resume a complex project
- understand how the project fits together before structural work
- inspect surfaces only, capabilities only, parts only, or the full map

Natural Shape writes:
- new surface
- capability added or materially re-scoped
- major part added or re-scoped
- meaningful change in the way the project fits together
