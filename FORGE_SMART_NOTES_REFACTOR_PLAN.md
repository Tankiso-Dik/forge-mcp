Absolutely — here’s a **refactor prompt** and a **plan document** you can hand to your AI software.

I’m baking in all the decisions we settled on:

* outside Shape, Forge should become **structured smart notes + lightweight continuity**
* stop treating **keywords** as the product
* make **typed notes** the core unit
* narrow `forge_checkpoint`
* make `forge_update` the precise mutation API
* keep `forge_load` lean and shelf-like
* do **not** add tasks yet
* keep Shape separate and untouched except where normal Forge reads mention it lightly

---

# Prompt for your AI software

```md
Use the `mcp-builder` skill to refactor Forge **outside the Shape system** toward a leaner
“smart notes + lightweight continuity” model.

Read these first and treat them as the source of truth for this refactor:
- `FORGE_SMART_NOTES_REFACTOR_PLAN.md`
- `FORGE_SHAPE_PLAN.md`
- the current Forge implementation
- any current audit/review docs in the repo that describe the existing behavior drift

## Goal

Refactor Forge outside Shape so it stops behaving like a partially hidden logic / guidance engine
and becomes a clearer structured-notes system with lightweight continuity.

This refactor is **not** about redesigning Shape.
Shape remains its own separate layer and tool surface.

This refactor is about:
- simplifying non-Shape Forge
- making stored understanding cleaner
- reducing advisory logic
- reducing overlap between `forge_load`, `forge_checkpoint`, and `forge_update`
- replacing keyword-thinking with typed smart-note thinking
- keeping continuity without keeping “manager mode”

## Product direction

Outside Shape, Forge should become:

- structured smart notes
- session handoff
- phase progress
- issue / drift / interpretation state where still needed
- a lean shelf-oriented read model

It should **not** remain:

- a soft planning cockpit
- an advisory engine
- a vague keyword parser product
- a second reasoning assistant layered on top of Codex
- a hidden routing/inference system

## Keep / preserve

Keep:
- `forge_load`
- `forge_checkpoint`
- `forge_update`
- Shape as its own separate system and tools
- phases as the explicit execution structure
- handoff continuity
- structured issues / drift / interpretations where still useful

Preserve the product strengths:
- session continuity
- phase progression
- resumability
- explicit state mutation
- structural note usefulness

## Change / refactor

### 1. Replace “keywords as product” with typed smart notes
The core unit of saved understanding should become a **typed note entry**, not loose keywords /
phrases / snippets / concern fragments / shelf heuristics.

Keywords can still exist as metadata on a note, but they should no longer be the main design
primitive.

### 2. Narrow `forge_checkpoint`
`forge_checkpoint` should become mainly:
- progress write
- step completion update
- handoff/session update
- optional explicit note capture

It should stop being a broad inference-heavy promotion engine by default.

### 3. Make `forge_update` the precise mutation API
If a caller knows exactly what structured state should change, that should go through
`forge_update`.

This includes precise changes to:
- note entries
- issue lifecycle
- drift lifecycle
- interpretations
- supersession
- session state
- plan state where still relevant

### 4. Make `forge_load` lean and shelf-oriented
`forge_load` should remain useful for fast orientation, but should reduce synthesis and advisory
behavior.

It should move toward:
- current shelf
- active/open state
- latest handoff
- active phase summary
- stale-state flags only where genuinely useful

It should move away from:
- generic “next” logic
- managerial narration
- broad inferred action suggestions
- oversized continuity dashboards

### 5. Do not add tasks in this pass
Do not introduce a new tasks feature in this refactor.

First clean up:
- phases
- handoff
- note model
- update surface

Only after that should task pressure be reassessed.

## Important architecture question to resolve in code

The current product has a mixed “keyword / phrase / snippet / concern / shelf item” layer.
This refactor should unify that into a cleaner model.

Use the plan doc to choose and implement a coherent note-centered state model.

## Deliverables

Implement the refactor and update:
- schemas
- services
- tool handlers
- docs
- tests / behavior checks where appropriate

Then summarize:
1. what changed conceptually
2. what changed in the schemas
3. how `forge_load` got leaner
4. how `forge_checkpoint` got narrower
5. how `forge_update` became the precise mutation API
6. how smart notes now work
7. what was intentionally **not** changed yet

## Constraints

- Keep the design lean.
- Do not reintroduce removed reasoning-heavy tools.
- Do not add a new tasks feature in this pass.
- Do not bloat Shape or fold Shape into normal Forge state.
- Prefer explicit structured storage over heuristic inference.
- Reduce overlap and hidden behavior.

## Implementation style

- Be honest if parts of the current design need migration.
- Prefer small clear state families over many overlapping buckets.
- If you need to keep backward compatibility temporarily, make that explicit and document it.
- If you can simplify old legacy fields safely, do it.

Start by:
1. reading `FORGE_SMART_NOTES_REFACTOR_PLAN.md`
2. auditing the current non-Shape schemas and tool handlers against that plan
3. implementing the smart-notes refactor in phases
4. updating tests/docs
5. summarizing the final result and any migration caveats
```

---

# `FORGE_SMART_NOTES_REFACTOR_PLAN.md`

````md
# Forge Smart Notes Refactor Plan

## Overview

This document defines the refactor direction for Forge **outside the Shape system**.

The goal is to turn non-Shape Forge into a **structured smart-notes + lightweight continuity**
system.

This refactor does **not** redesign Shape.
Shape remains separate and continues to model current project structure through:
- `forge_shape`
- `forge_update_shape`
- `.forge/shape.json`

This document is only about the non-Shape Forge surface.

---

## Why this refactor is needed

The current non-Shape Forge still behaves like a hybrid of:

- continuity engine
- shelf
- advisory working view
- heuristic keyword/phrase capture
- checkpoint-time promotion engine
- fragmented task-like state

That creates too much weight and overlap.

The biggest current problems are:

1. The “keyword system” is not actually one clean system.
   It is a muddled mix of:
   - keywords
   - phrases
   - snippets
   - concerns
   - shelf groupings
   - reference file pointers
   - derived topics

2. `forge_load` is still too synthesized and too heavy.
   It is not yet a truly lean shelf-oriented read surface.

3. `forge_checkpoint` still does too much.
   It acts as:
   - progress tool
   - handoff tool
   - context capture entrypoint
   - promotion engine
   - broad bundled mutation surface

4. `forge_update` and `forge_checkpoint` still overlap too much.

5. There is fragmented task-like pressure, but not a clean enough base yet to justify adding
   a tasks feature.

---

## Product direction

Outside Shape, Forge should become:

- a cleaner shelf
- typed smart notes
- explicit handoff continuity
- explicit phase progress
- explicit structured mutation
- limited, concrete state hygiene support

Outside Shape, Forge should stop trying to be:

- a second reasoning assistant
- a manager-like next-step engine
- a quasi-alignment engine
- a soft planning cockpit
- a fuzzy keyword parser product

---

## Design principles

### 1. Notes are the product, not keywords
Keywords may remain useful as metadata, but they should not be the primary stored unit.

The primary unit should be a **typed note**.

### 2. Store understanding explicitly
Prefer explicit structured note storage over hidden extraction and inference.

### 3. Keep continuity, lose manager mode
Session handoff and active/open pressure still matter.
Generic advice and broad “next” synthesis should shrink.

### 4. One tool for progress, one tool for precise mutation
The distinction should become clearer:
- `forge_checkpoint` = progress moment
- `forge_update` = exact structured mutation

### 5. Do not add tasks yet
Tasks should not be added until the basic note / continuity / phase model is cleaner.

---

## Current tool surface to preserve

Public non-Shape tool surface remains:

- `forge_load`
- `forge_checkpoint`
- `forge_update`

Shape remains separate.

---

## Target product model outside Shape

Non-Shape Forge should have four main ideas:

### 1. Plan
Stable intended identity and project posture.

### 2. Notes
Typed project understanding and reusable context.

### 3. Phases
Execution progress and bounded milestones.

### 4. Session handoff
Where work resumes next.

Everything else should be justified carefully.

---

## Plan after refactor

`plan` should remain for relatively stable project identity.

Use it for:
- stack
- design posture
- architectural principles
- core features
- planned features
- stable constraints / preferences if they are truly project-level

`plan` should no longer be cluttered by loose keyword capture logic.

---

## Smart Notes: the new core unit

### Goal

Replace the current muddled keyword / phrase / snippet / concern mix with a more coherent,
typed note model.

### Core idea

A note should be a small structured record that says:
- what kind of thing this is
- what it says
- what scope it applies to
- how confident it is
- what files or sources support it
- what keywords help future retrieval

### Suggested note shape

```json
{
  "id": "note_x",
  "kind": "preference | dislike | work_style | concern | ambiguity | revision_focus | snippet | fact | reference",
  "text": "The product should stay local-first and avoid cloud assumptions.",
  "keywords": ["local-first", "deployment", "offline"],
  "scope": "project",
  "confidence": "high",
  "source": "checkpoint",
  "related_files": ["README.md", "DEPLOYMENT_CONSTRAINTS.md"],
  "last_updated": "2026-03-11T12:00:00Z",
  "status": "active"
}
````

### Why this is better

This makes the stored unit clear.

Instead of asking:

* is this a keyword?
* a phrase?
* a snippet?
* a concern?
* a shelf topic?

the system asks:

* what kind of note is this?

That is much cleaner.

---

## Recommended note families

### Stable-ish project notes

These are durable and often project-wide.

Suggested kinds:

* `preference`
* `dislike`
* `work_style`
* `fact`
* `reference`

### Evolving pressure / uncertainty notes

These are active but may change.

Suggested kinds:

* `concern`
* `ambiguity`
* `revision_focus`

### Reusable compressed notes

These are helpful fragments worth surfacing later.

Suggested kinds:

* `snippet`

You may decide to keep notes in one array with a `kind` field, or in a few grouped arrays.
But the unit should still be the same typed-note structure.

### Recommendation

Prefer one coherent notes collection over many overlapping special-purpose mini-systems.

---

## Suggested state direction

### Option A — strongest cleanup

Introduce:

* `memory.notes[]`

and gradually replace:

* loose keyword arrays
* reference snippets
* some current concern capture
* some current ambiguity/revision focus buckets

with typed notes.

### Option B — transitional cleanup

Keep some current fields temporarily, but move the product model and docs toward typed notes
as the main concept.

### Recommendation

Prefer Option B if migration risk is high, but design toward Option A.

---

## What keywords become after refactor

Keywords should become **metadata on notes**, not the primary product surface.

Use keywords for:

* retrieval
* grouping
* compact shelf display
* overlap detection if still needed lightly

Do not use keywords as the main thing users or agents are conceptually managing.

---

## `forge_load` after refactor

### Role

Lean read surface for orientation.

### Should include

* compact shelf
* active phase summary
* latest session handoff
* important open issues / drift / interpretations if still relevant
* typed note highlights
* maybe light stale-state flags where clearly useful

### Should reduce

* generic “next” narration
* over-synthesized guidance
* oversized workingView structure
* advisory language that competes with Codex judgment

### Key design choice

`workingView` should become closer to a **passive shelf** than a continuity cockpit.

---

## `forge_checkpoint` after refactor

### Role

Main progress write path.

### Should do

* record a checkpoint note
* mark completed steps
* update session handoff / next step
* optionally attach explicit note captures

### Should stop doing by default

* broad inference over prose
* automatic promotion into many structured state families
* silent “smart” mutation across interpretations / drift / issues unless made explicitly narrow

### Design goal

Checkpoint should feel like:

> progress happened, here is what changed, here is what next

not:

> I wrote progress, and Forge also interpreted half the project state behind the scenes

---

## `forge_update` after refactor

### Role

Precise mutation API.

### Use it for

* explicit note updates
* issue lifecycle updates
* drift lifecycle updates
* interpretation updates
* supersession updates
* plan mutation
* exact session-state mutation when needed

### Design goal

If the caller knows what structured state should change, `forge_update` should be the clear tool.

---

## Notes vs checkpoint vs update

### `forge_checkpoint`

Use when:

* work progressed
* a phase step completed
* the session handoff should move
* a compact checkpoint note should be recorded

### `forge_update`

Use when:

* exact structured state should change
* a note should be added or edited precisely
* issue/drift/interpretation state should mutate explicitly
* the caller is not just logging progress but shaping stored project state deliberately

### Notes

Notes are the main way lightweight understanding should be stored and surfaced.

---

## Phases after refactor

Keep phases as the execution structure.

Do not redesign phases into tasks in this pass.

Phases should remain:

* bounded execution progress
* milestone-oriented
* session-friendly

This refactor is not the right moment to add a new tasks layer.

---

## Session handoff after refactor

Keep session handoff.

It remains one of Forge’s strongest features.

Session state should still support:

* summary
* next step
* updated timestamps

But it should work in service of continuity, not as part of a broader advisory cockpit.

---

## Issues / drift / interpretations

Do not remove them blindly.

They still matter for continuity and revision-heavy projects.

But:

* avoid broad hidden mutation logic
* avoid generic manager-like advisory narration
* keep them explicit and precise

If mutation happens here, it should increasingly happen through `forge_update`, not hidden checkpoint inference.

---

## What not to build in this refactor

Do not:

* add a tasks feature
* redesign Shape
* add new reasoning-heavy tools
* rebuild Forge into a new planning engine
* overexpand workingView
* create another fuzzy note-extraction subsystem

---

## Migration expectations

This refactor may require:

* schema migration
* deprecation of older keyword-centric fields
* a transitional mapping layer
* docs clarifying old vs new note storage

If migration is needed, be explicit and keep the design honest.

---

## Behavioral priorities

The most important behavior changes are:

1. `forge_load` feels lighter
2. the stored unit of lightweight context becomes clearer
3. `forge_checkpoint` feels less magical
4. `forge_update` becomes the obvious precision path
5. notes become more structured and less muddled than the old keyword/phrase approach

---

## Success criteria

This refactor is successful when:

* the non-Shape core feels simpler
* the shelf is clearer and lighter
* smart notes are more coherent than the previous keyword/phrase mix
* checkpoint no longer feels like a hidden reasoning engine
* update is the clear exact mutation path
* task pressure is not made worse by introducing another overlapping concept
* docs match implementation more honestly

---

## Final product direction

Outside Shape, Forge should feel like:

> a clean continuity shelf with typed smart notes, explicit phases, and precise state mutation

not:

> a second, softer project manager layered on top of Codex

```

If you want, next I can also make a **second sharper prompt** that tells your AI software to decide between **transitional migration** vs **full notes-model cleanup now**, because that’s probably the next real fork.
```
