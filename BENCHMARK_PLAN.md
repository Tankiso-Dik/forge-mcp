# Forge — Benchmark Plan

## Purpose

This document defines the benchmark strategy for Forge.

The benchmark system exists to answer three questions:

1. Does Forge work correctly as an MCP?
2. Does Forge improve agent workflow quality in realistic use?
3. Where should Forge be tightened, simplified, or strengthened over time?

The benchmark system is not just for pass/fail testing. It should help diagnose:
- correctness weaknesses
- workflow weaknesses
- continuity weaknesses
- drift-handling weaknesses
- performance weaknesses

## Benchmark Philosophy

Forge should not be benchmarked with only one giant scenario.

The benchmark system should use three layers:

1. Tool-level correctness tests
2. Workflow scenario tests
3. End-to-end stress runs

This makes regressions easier to localize and improvements easier to evaluate.

## Benchmark Layers

## 1. Tool-Level Correctness

These tests verify that individual Forge tools behave correctly.

Targets include:
- `forge_load`
- `forge_update`
- `forge_log`
- `forge_step_done`
- `forge_rebuild_phases`
- `forge_flag_drift`
- `forge_session_end`

Questions this layer answers:
- Did the tool return the correct shape?
- Did it mutate the correct file or section?
- Did it create the right IDs and metadata?
- Did it classify drift correctly?
- Did it handle non-Forge projects cleanly?
- Did it apply pruning rules correctly?

## 2. Workflow Scenarios

These tests simulate realistic project-agent use.

Examples:
- resume work from a prior session
- log a struggle during work
- resolve a tracked issue
- record an architectural decision
- detect and handle drift
- complete steps and phases
- initialize a new Forge-managed project

Questions this layer answers:
- Did Forge improve continuity?
- Did the agent use the correct Forge tools at the right moments?
- Did it distinguish logging from structured updates correctly?
- Did it surface meaningful events without over-narrating routine actions?

## 3. End-to-End Stress Runs

These are longer multi-step benchmark runs.

They should combine:
- multiple decisions
- multiple observations
- at least one contradiction
- tracked issue resolution
- phase progression
- session close and later resume

Questions this layer answers:
- Does Forge stay coherent over longer sessions?
- Does payload size remain reasonable?
- Does continuity hold under more complex interaction?
- Do the reports remain useful?

## Benchmark Categories

The benchmark suite should score Forge across five categories.

### 1. MCP Correctness
Checks:
- tool routing
- file mutation correctness
- project discovery
- pruning behavior
- severity classification

### 2. Agent Workflow Quality
Checks:
- correct tool choice
- correct event visibility
- proper respect for constraints
- appropriate use of Forge only when relevant

### 3. Continuity Quality
Checks:
- session resume quality
- use of `session.next`
- use of relevant tracked issues
- correct carry-forward of important decisions
- avoidance of stale context misuse

### 4. Drift Handling
Checks:
- contradiction detection
- severity assignment
- correct response pattern for low / medium / high drift

### 5. Performance
Checks:
- startup latency
- `forge_load` latency
- write latency
- report generation cost
- payload size
- basic behavior with larger fixture data

## Scoring Model

Use a 100-point scoring model.

- MCP correctness: 30
- agent workflow quality: 25
- continuity quality: 20
- drift handling: 15
- performance: 10

The benchmark runner should produce:
- category scores
- total score
- per-case results
- clear failure summaries

## Benchmark Structure

Suggested benchmark structure:

```text
benchmarks/
├── fixtures/
│   ├── project-small/
│   ├── project-medium/
│   ├── project-nested/
│   └── no-forge-project/
├── cases/
│   ├── tool-correctness/
│   ├── workflow-scenarios/
│   └── end-to-end/
├── reports/
├── logs/
└── src/