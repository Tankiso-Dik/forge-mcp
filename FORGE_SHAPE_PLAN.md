# Forge Shape Plan

Forge Shape is the project's current structural mental model.

It exists to store a lean map of:
- what the project currently looks like from the outside
- what the project can do
- what major built parts support those capabilities
- how the current form fits together

Shape is not:
- memory
- issue tracking
- phase tracking
- code indexing
- implementation trivia
- another reasoning layer

## Separation

- `plan` = intended stable identity
- `shape` = current structural understanding
- `memory` = what happened, changed, or remains unresolved
- `phases` = execution progress

## Shape v1 domains

Use exactly these domains:
- `surfaces`
- `capabilities`
- `parts`

Do not add a separate relationships domain in v1.
Relationship facts live inside those entries.

## Tool surface

Shape has its own read/write tools:
- `forge_shape`
- `forge_update_shape`

`forge_load` stays lean and only exposes minimal shape awareness:
- shape exists
- project type
- shape summary
- last updated
- confidence

`forge_checkpoint` may accept optional shape-aware updates, but it is not the dedicated Shape read surface.

## Shape-worthy changes

Update Shape when:
- a new surface appears
- a major user flow changes
- a capability is added or materially re-scoped
- a part appears, disappears, or changes role
- the way the project fits together meaningfully changes

Do not update Shape for:
- tiny bug fixes
- styling tweaks with no structural effect
- routine refactors
- raw implementation changes with no project-form consequence
- ordinary session notes

## Design bias

Favor:
- lean entries
- structural truth
- readable maps
- durable orientation value

Avoid:
- freeform notes
- duplicated plan or memory content
- code-level detail
- advisory reasoning prose
