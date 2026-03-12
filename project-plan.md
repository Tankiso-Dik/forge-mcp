# Forge — Current Project Plan

## Overview

Forge is a local MCP server for Codex CLI that provides:
- structured project notes
- lightweight continuity
- explicit phase progress
- explicit session handoff
- a separate structural map through Shape

Forge is local-first and file-backed. It is designed for one machine, one developer, and low-latency stdio use against local project state.

Forge is not:
- a second reasoning brain
- a planning cockpit
- a hosted service
- a collaborative PM platform
- a replacement for source files or project docs

## Product Direction

Outside Shape, Forge should behave like a passive project shelf:
- easy to read
- explicit to update
- small enough to stay understandable
- useful across sessions

The product should favor:
- explicit read/write behavior
- durable structured notes
- lightweight handoff continuity
- explicit phase/step tracking
- separate structural mapping

The product should avoid:
- hidden project bootstrapping on read
- advisory manager behavior
- broad inference/routing layers
- duplicated write surfaces
- trying to out-reason Codex

## Core State Areas

Forge is built around five state areas:

1. global defaults
2. plan
3. memory
4. phases
5. shape

### 1. Global defaults

Global user state lives outside the project in:

`~/.forge/global.json`

It stores:
- constraints
- preferences

Forge reads this file but does not write to it.

### 2. Plan

`plan.json` holds stable project identity:
- stack
- design style
- core features
- planned features
- architecture decisions

This is the "what this project is" layer.

### 3. Memory

`memory.json` holds durable continuity:
- typed notes
- decisions
- interpretations
- superseded conclusions
- issues
- session handoff

This is the "what we learned / what matters / what changed" layer.

### 4. Phases

`phases.json` holds execution structure:
- phases
- steps
- statuses
- optional step notes

This is the explicit execution-progress layer.

### 5. Shape

`shape.json` holds the current structural mental model:
- surfaces
- capabilities
- parts

Shape is separate on purpose:
- `plan` is intended stable identity
- `memory` is durable continuity
- `phases` is execution progress
- `shape` is current structural form

## Files

### Global file

`~/.forge/global.json`

### Project files

Inside project-local `.forge/`:
- `memory.json`
- `plan.json`
- `phases.json`
- `shape.json`

## Project Discovery

Forge discovers the active project by walking upward from the current working directory until it finds a `.forge/` folder.

Rules:
- nearest `.forge/` wins
- stop at the exact home directory
- `forge_load` does not auto-initialize projects
- if none is found, Forge should return an unmanaged-project response rather than silently creating one
- explicit initialization goes through `forge_init`

## Public Tool Surface

Forge currently exposes these tools:

1. `forge_init`
2. `forge_load`
3. `forge_checkpoint`
4. `forge_update`
5. `forge_shape`
6. `forge_update_shape`

## Tool Intent

### `forge_init`

Creates `.forge/` and seeds:
- `memory.json`
- `plan.json`
- `phases.json`
- `shape.json`

This is the explicit project bootstrap path.

### `forge_load`

The passive read path.

Responsibilities:
- discover whether a directory is Forge-managed
- read global, plan, memory, phases, and Shape metadata
- return a compact shelf-oriented working view
- optionally return full raw state when explicitly requested

`forge_load` should stay lean. It should expose state, not tell Codex what to do.

### `forge_checkpoint`

The default milestone write path.

Responsibilities:
- store a milestone note
- optionally store a typed note
- mark completed steps
- update session handoff
- optionally carry a Shape delta

This is the normal "we made meaningful progress" tool.

Checkpoint note kinds should stay practical and low-friction. They are not meant to enforce a taxonomy beyond what helps later sessions recover the important state.

### `forge_update`

The precise mutation API.

Responsibilities:
- explicit updates to memory
- explicit updates to plan
- explicit updates to phases

Use it when the caller knows exactly which structured state should change.

`forge_update` is an advanced precision path, not the normal write loop.
The normal path should still be:
- load
- work
- checkpoint

Use `forge_update` when exact structured hygiene matters more than milestone capture.

### `forge_shape`

The dedicated Shape read tool.

Responsibilities:
- read the structural map selectively
- return compact or full Shape data

Shape is most useful when the project has multiple durable surfaces, capabilities, or parts whose fit matters across sessions.
This includes:
- applications with multiple screens or panels
- multi-document workspaces
- research or investigation projects with distinct outputs and working areas
- systems where later sessions benefit from recovering the map before rereading everything

### `forge_update_shape`

The dedicated Shape mutation tool.

Responsibilities:
- precise updates to surfaces
- precise updates to capabilities
- precise updates to parts
- top-level Shape metadata changes

Shape should be updated when the structural map changed in a durable way, not for every small implementation or content edit.

## workingView

`forge_load` in compact mode should expose:
- `workingView.shelf`
- `workingView.session`

`workingView.shelf` is the main agent-facing read surface and should contain:
- notes
- decisions
- features
- issues
- interpretations
- phases

`workingView.session` should contain:
- summary
- next step
- timestamps

This is intentionally a shelf projection, not an advice layer.

## Data Model Principles

- keep note storage explicit
- keep plan stable and lightweight
- keep memory durable but not bloated
- keep phases as the explicit progress structure
- keep Shape separate from notes/history/progress
- use stable IDs for mutable records
- prefer explicit writes over hidden inference
- keep file schemas versioned

## Safety Principles

- project data remains local
- writes should be atomic
- initialization should be explicit
- Forge should not silently invent project state during normal reads
- Forge should expose state clearly without trying to manage Codex

## Scope Boundaries

Forge does:
- keep local continuity
- store structured project notes
- preserve session handoff
- track phase progress
- store explicit issues and interpretations
- store the structural map separately through Shape

Forge does not:
- replace source code as ground truth
- replace project docs
- plan work on Codex's behalf
- act like a reasoning assistant
- act like a remote PM system

## Current Build Goal

Keep Forge small, explicit, and reliable.

The current implementation goal is not to expand the surface area again. It is to keep the existing read/write model coherent:
- one explicit init path
- one lean read path
- one bundled milestone write path
- one precise mutation path
- one separate structural map

## Current Focus Areas

1. Keep `forge_load` passive and shelf-oriented
2. Keep `forge_checkpoint` lean and milestone-focused
3. Keep `forge_update` precise and explicit
4. Keep Shape independent and structural
5. Prevent product drift back toward advisory / hidden-logic behavior

## Suggested Project Structure

This is descriptive of the current codebase, not a redesign target.

```text
forge-mcp/
├── src/
│   ├── index.ts
│   ├── constants.ts
│   ├── schemas.ts
│   ├── types.ts
│   ├── services/
│   ├── tools/
│   └── ...
├── package.json
├── tsconfig.json
├── README.md
└── project-plan.md
```
