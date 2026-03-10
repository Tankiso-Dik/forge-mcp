# Product Specification

## Product Summary

Northstar Desk is a local-first planning assistant for a single student who needs to
see what matters this week, recover quickly after interruptions, and keep planning
light enough that the tool does not become another source of stress.

Release 1 is intentionally narrow. It should feel calm, compact, trustworthy, and
interruption-friendly rather than feature-rich or “school-admin heavy.”

## Release 1 Posture

Release 1 is a single-user, offline-capable product centered on one primary device.
Its value comes from clear weekly focus, easy recovery after a bad week, and local
control over planning data.

Release 1 should be described as:
- local-first planning
- weekly recovery centered
- low-friction to maintain
- explicit about portability limits

Release 1 should not be described as:
- seamless sync
- smart automation beyond deterministic local logic
- a collaboration tool
- a heavy reminder or notification system

## Primary User And Core Jobs

The primary user is a student managing assignments, reading tasks, deadlines, weekly
routines, and lightweight self-check reviews.

The main jobs to support are:
1. See what matters this week without digging through many views.
2. Recover quickly after missing a few days or a busy week.
3. Track both commitments and uncertainty without being forced into overly rigid
   statuses.
4. Maintain a useful plan without constant manual cleanup or re-entry.

## Product Principles

1. Recovery over optimization.
   The product should help users get back on track after interruption before it tries
   to optimize schedules or generate more structure.

2. Trust through clear boundaries.
   The product should avoid promising capabilities that are not reliable in a local,
   offline-first release.

3. Compact experience over dashboard sprawl.
   One strong weekly view and one supporting detail flow is better than many parallel
   views in Release 1.

4. Calm language over judgment.
   The interface and copy should support recovery and next steps without making missed
   work feel like failure.

## In-Scope Release 1 Capabilities

### 1. Weekly Focus View

A primary weekly view that helps the user answer:
- what matters next
- what is slipping
- what is uncertain
- what is most worth recovering first

This view should be the center of the product, not one tab among many.

### 2. Task And Routine Capture

Users can create and manage:
- assignment or reading tasks
- routine items with a cadence
- due dates and context such as course or area
- estimated effort when helpful

Capture should stay lightweight and local.

### 3. Uncertainty Marking

Users should be able to mark “not sure yet” or otherwise indicate uncertainty without
pretending a task is either fully planned or fully blocked.

### 4. Recovery Flow

Release 1 should include an explicit recovery-oriented workflow for users returning
after a missed period. The flow should help them re-prioritize slipped work, choose a
shorter planning horizon, and regain confidence quickly.

### 5. Weekly Review Support

The product should support a lightweight weekly review or self-check so users can note
what slipped, what went well, and what to focus on next.

### 6. Local Data Transparency

User data should remain local, inspectable, and recoverable enough that a technical
user is not trapped by the tool.

## Explicit Release 1 Non-Goals

The following are out of scope for Release 1:
- multi-user collaboration
- mandatory accounts
- cloud-only operation
- live cross-device sync
- shareable weekly summaries
- heavy or noisy notification systems
- advanced analytics

The following are intentionally deferred unless later sessions make a narrower case:
- automatic deadline import
- calendar export as a core promise
- import/export for device portability
- email reminders

## Release 1 Scope Decision On Portability

Release 1 assumes one primary device. Portability should not be treated as a core
capability in the initial spec.

If later sessions retain any portability work, it should be framed narrowly and
explicitly, such as optional manual transfer or backup behavior, not as dependable
sync. The product language must not imply otherwise.

## Experience And Trust Requirements

- The product should feel recovery-friendly, not judgmental.
- Optionality should be clear when a capability is not central or not guaranteed.
- Messaging should preserve phrases close to user language such as “what matters next”
  and “recover fast after a bad week.”
- The product should avoid claiming intelligence where the behavior is mainly clear
  local logic.

## Important Open Questions And Contradictions

1. Portability tension
   Stakeholder and growth pressure pulls toward cross-device continuity, but the hard
   constraints and trust guidance point away from sync in Release 1. The current spec
   resolves this only at the posture level: no core portability promise in Release 1.

2. Deadline import tension
   Some users want low-friction import, but external integrations can add setup,
   reliability, and trust complexity. It is still unresolved whether any import belongs
   in Release 1 or should stay deferred.

3. Uncertainty modeling
   The product clearly needs uncertainty marking, but it is still open whether that
   belongs in status, as a separate flag, or as a looser annotation.

4. Recovery data shape
   Recovery planning appears central to the product, but it is not yet settled whether
   recovery should be stored as a first-class object or treated as a derived workflow.

## Release 1 Summary

Release 1 should be a calm, local-first student planning tool built around one strong
weekly view, lightweight capture, and a clear recovery flow. It should win by helping
users recover from interruption without requiring accounts, sync, heavy reminders, or a
high-maintenance setup.
