# SQLite Migration Follow-up (Compatibility Pointer)

This path is retained because implementation comments and historical links
refer to it. The former branch-specific backlog duplicated status and is no
longer maintained independently.

Use [`sqlite-migration.md`](./sqlite-migration.md) for the current rationale,
landed foundation, storage/migration invariants, and remaining rollout gates.
Runtime behavior and test owners remain authoritative.

## B3 — Native backend wiring

The old B3 plan is now
[`sqlite-migration.md#remaining-rollout-gates`](./sqlite-migration.md#remaining-rollout-gates).
IndexedDB remains the default on every platform; native provider selection is
not wired.

## C1 — One-time backend migration

The old C1 plan is now
[`sqlite-migration.md#migration-safety-contract`](./sqlite-migration.md#migration-safety-contract).
`migrateOpLogBackend()` implements the copy and verify-before-commit core, but
startup detection, quiescence, marker/fallback policy, and on-device validation
remain rollout work.
