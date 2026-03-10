# Technical Constraints

These are hard or semi-hard constraints for the workspace exercise.

## Hard constraints

- Release 1 should work fully offline after installation.
- No mandatory account system in Release 1.
- No paid third-party services.
- No background worker fleet or always-on server.
- Keep the system operable by one developer.

## Strong preferences

- Data should be inspectable and recoverable by a technical user.
- Keep storage model simple.
- Prefer deterministic local logic over remote orchestration.
- Avoid an architecture that requires complex conflict resolution in Release 1.

## Practical implications

- Cross-device live sync is risky for Release 1.
- Email reminders are possible only if treated as optional and non-core, and even then they create edge cases.
- Import/export may be more realistic than “real sync.”
- Calendar interoperability is safer than a full remote notification system.
