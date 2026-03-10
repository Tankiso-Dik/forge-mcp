# Data Model Notes

Current candidate entities:

- `Task`
  - title
  - dueDate
  - courseOrContext
  - status
  - uncertaintyFlag
  - estimatedEffort

- `Routine`
  - title
  - cadence
  - lastCompletedAt

- `RecoveryPlan`
  - createdAt
  - horizonDays
  - prioritizedItems
  - notes

- `WeeklyReview`
  - weekStart
  - wins
  - slippedItems
  - nextFocus

## Open questions

- Should “uncertainty” be a task status, a separate flag, or an annotation?
- Should recovery planning be a derived workflow or a stored first-class object?
- How much history should be kept for completed items?
- Is calendar export generated from tasks only, or also routines and review checkpoints?

## Current modeling bias

Prefer a model that is easy to inspect and migrate locally.
