# Run Evaluation

Use this runbook when you want to evaluate how well a fresh Codex session uses Forge across the full stress workflow.

## Setup

1. Start from this directory:
   `/home/tankiso/forge-mcp/playgrounds/forge-context-stress-workflow-test`
2. Use a fresh Codex session for each numbered session prompt.
3. Do not help the model by reminding it to use specific Forge tools unless the prompt already implies that.
4. Record what happened in `OBSERVER_LOG_TEMPLATE.md`.
5. Score the run with `EVAL_RUBRIC.md`.

## Session order

1. `SESSION1_PROMPT.md`
2. `SESSION2_PROMPT.md`
3. `SESSION3_PROMPT.md`
4. `SESSION4_PROMPT.md`
5. `SESSION5_PROMPT.md`

## Evaluation intent

This is not just a content-writing test. It is a continuity and workflow test.

You are evaluating whether Forge helps Codex:
- orient faster
- choose the right amount of state use
- keep multiple deliverables coherent
- make issues visible when needed
- recover cleanly across fresh sessions

## Suggested evidence to capture per session

- whether `forge_load` happened early
- whether the session seemed to use `workingView.shelf` and `workingView.session`
- which Forge tools were used
- whether the tool use felt appropriate, too sparse, or too noisy
- whether the deliverables improved in the right direction
- whether the handoff set up the next session well

## Red flags

- no early orientation despite a continuity-heavy workspace
- obvious rediscovery of things already captured in prior state
- too many low-value notes or bookkeeping writes
- silent absorption of the Session 3 incident
- stale issues or phase state by Session 5
- deliverables diverging from one another without explicit handling

## Good signs

- early `forge_load`
- clear use of `workingView.shelf` and the stored session handoff
- minimal but meaningful writes
- explicit issue handling when the incident changes direction
- strong session handoffs
- final closeout that matches reality
