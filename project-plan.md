# Forge — Project Plan

## Overview

Forge is a local MCP server that gives Codex persistent project continuity without relying on external services.

It is a local-first project brain for:
- session continuity
- project memory
- plan tracking
- phase tracking
- drift detection
- lightweight project observations

Forge is not a hosted service, not a collaborative SaaS, and not a Linear replacement clone. It is a local MCP tool designed to support agent workflows inside Codex.

## Core Product Direction

Forge should be:

- local-only
- fast to start
- simple to run
- single-binary friendly at runtime
- safe by default
- structured enough for reliable agent use
- small enough to reason about clearly

## Technical Direction

- Language: TypeScript
- Build target: local MCP server
- Primary purpose: work with Codex through MCP
- Network dependency: none for normal operation
- Data storage: local JSON files
- Runtime style: fast startup, low operational overhead

## Main Concepts

Forge is built around four state areas:

1. Global user defaults
2. Project memory
3. Project plan
4. Project phases

### 1. Global user defaults

A user-managed global file outside the project stores:

- hard constraints
- soft preferences

This is read by Forge but not written by Forge.

### 2. Project memory

Project memory stores runtime continuity and learned project context, including:

- decisions
- tried and abandoned approaches
- habits
- habit suggestions
- favourite prompts
- tracked issues
- drift log
- concerns
- session summary and next step

### 3. Project plan

Project plan stores more stable product and architecture context, including:

- stack
- design style
- core features
- planned features
- architecture decisions
- accepted suggestions

### 4. Project phases

Project phases track execution progress through structured phases and steps.

## Files

### Global file

`~/.forge/global.json`

Contains:
- `constraints`
- `preferences`

Forge reads this file but does not write to it.

### Project files

Inside project-local `.forge/`:

- `memory.json`
- `plan.json`
- `phases.json`

## Project Discovery

Forge should discover the active project by walking upward from the current working directory until it finds a `.forge/` folder.

Rules:
- nearest `.forge/` wins
- stop at home directory
- if none is found, Forge should return a clean non-project response rather than erroring noisily

## Core Tool Surface

Forge should expose these tools:

1. `forge_load`
2. `forge_update`
3. `forge_log`
4. `forge_step_done`
5. `forge_rebuild_phases`
6. `forge_flag_drift`
7. `forge_session_end`

## Tool Intent

### `forge_load`
Used at the start of relevant work to load active Forge state.

Responsibilities:
- discover the project
- return whether this is a Forge-managed project
- load global, memory, plan, and phases
- return a pruned, useful working view

### `forge_update`
Used for structured state changes.

Examples:
- decisions
- tried and abandoned entries
- plan updates
- issue resolution
- habit confirmation or decline

### `forge_log`
Used for quick in-progress observations.

Examples:
- bug
- ui inconsistency
- tech debt
- ambiguous item
- struggle
- concern
- habit suggestion

### `forge_step_done`
Used when a step completes.

### `forge_rebuild_phases`
Used when the overall execution sequence materially changes.

### `forge_flag_drift`
Used when current work contradicts:
- important prior decisions
- architecture
- constraints
- relevant plan direction

Should classify severity and guide handling.

### `forge_session_end`
Used to write a useful session close summary and next-step handoff.

This is best-effort and not correctness-critical.

## Data Model Principles

- stable IDs for mutable entities
- separate durable updates from quick observations
- constraints and preferences must not be treated equally
- architecture and permanent decisions carry more weight than session-level context
- critical state should be written incrementally
- session-end summaries improve continuity but should not be required for correctness
- file schemas should be versioned

## Safety Principles

- hard constraints override soft preferences
- risky domains should be treated conservatively
- high-severity drift should not be silently ignored
- Forge should not behave destructively or opaquely
- project data should remain local

## Write Strategy

File writes should be safe and predictable.

Requirements:
- use atomic write semantics
- avoid partial-write corruption
- design for simple, reliable local persistence

## Scope Boundaries

Forge does:
- maintain local project continuity
- record project memory
- track plan and phases
- surface drift
- support agent workflow

Forge does not:
- sync to external services
- replace ordinary code reading
- replace project files and source code as ground truth
- make product intent decisions on its own
- act like a remote PM platform

## Initial Build Goal

The first implementation should create a working local MCP server foundation with the full tool surface stubbed or implemented enough to validate the architecture.

The first milestone is not polishing every edge case. It is proving the full Forge shape works correctly.

## Phase 1 — Foundation

Build the minimum working foundation for:

- project discovery
- reading global file
- reading and writing project files
- atomic file writes
- initial tool registration
- base schemas and types
- clean project structure
- runnable local development flow

Deliverables:
- working TypeScript project scaffold
- MCP server entrypoint
- project discovery logic
- typed models for global, memory, plan, and phases
- safe local file read/write utilities
- initial README with setup/run instructions

## Phase 2 — Core Tools

Implement the main behavior of:

- `forge_load`
- `forge_update`
- `forge_log`
- `forge_step_done`
- `forge_rebuild_phases`
- `forge_flag_drift`
- `forge_session_end`

Deliverables:
- tools registered and callable
- type-safe input/output handling
- local state updates working correctly
- clean non-project handling
- clear structured responses

## Phase 3 — Initialization Flow

Implement `forge init` or equivalent project bootstrap flow.

Deliverables:
- create `.forge/`
- seed `memory.json`
- seed `plan.json`
- seed `phases.json`
- refuse destructive overwrite by default

## Phase 4 — Refinement

Refine:
- pruning behavior
- drift handling
- issue resolution flow
- session summary quality
- migration readiness
- README clarity
- developer ergonomics

## Suggested Project Structure

This is directional, not mandatory.

```text
forge/
├── src/
│   ├── index.ts
│   ├── server/
│   ├── discovery/
│   ├── store/
│   ├── global/
│   ├── memory/
│   ├── plan/
│   ├── phases/
│   ├── tools/
│   ├── types/
│   └── utils/
├── package.json
├── tsconfig.json
├── README.md
└── PROJECT_PLAN.md