import type { GlobalState, MemoryState, PhaseState, PlanState, WorkingView } from "../types.js";

function buildShelf(input: {
  memory: MemoryState;
  plan: PlanState;
  phases: PhaseState[];
}): WorkingView["shelf"] {
  return {
    notes: input.memory.notes,
    decisions: input.memory.decisions,
    features: input.plan.coreFeatures,
    issues: input.memory.issues,
    interpretations: input.memory.interpretations,
    phases: input.phases
  };
}

export function buildWorkingView(
  _global: GlobalState,
  memory: MemoryState,
  plan: PlanState,
  phases: PhaseState[],
  _projectRoot: string
): WorkingView {
  return {
    shelf: buildShelf({
      memory,
      plan,
      phases
    }),
    session: memory.session
  };
}
