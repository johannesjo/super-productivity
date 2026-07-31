# Implementation Plan: diagnose #9405's blocked multi-entity conflict

- **Date:** 2026-07-31
- **Status:** Proposed; implementation starts with Task 1
- **Tracking:** [GitHub issue #9405](https://github.com/super-productivity/super-productivity/issues/9405)
- **Baseline:** `1e4ae2a82b6ee9631464e3ee69eddbfa302fcd49`

## Decision

Ship the real-data characterization, a privacy-safe diagnostic, and the independent raw-log
cleanup. Do **not** add `TASK_SHARED_UPDATE_MULTIPLE` (`updateTasks`) reconciliation in this change.

The diagnostic does not self-heal the reporter's client, but the proposed state-backed fix is not
a small safe extension of the existing reconciler:

- The issue identifies a recurring-task occurrence, not the blocked action. `updateTasks` is a
  plausible producer, not a confirmed one.
- Archived tasks are outside NgRx state. A `TASK_ARCHIVE`-locked read stabilizes only the read, not
  the later operation-log append and archive application.
- Archive producers write IndexedDB before dispatching their persistent action. While sync holds
  `OPERATION_LOG`, another tab can therefore write a newer archive value whose operation is still
  waiting to be persisted. A replacement built from the earlier cut can overwrite that value.
- Holding `TASK_ARCHIVE` through apply would need a non-reentrant apply path and still would not
  account for a producer that already held the archive lock when sync acquired `OPERATION_LOG`.
- A synthetic local replacement has no recoverable archive-application status. A crash after a
  remote archive write but before the replacement archive write can leave the archive divergent.

Solving those invariants requires a cross-tab archive/op-log publication protocol, not a payload
validator in the 4,233-line resolver. That work needs its own reproduction and design review.

Keep #9405 open. The existing support reply remains the recovery guidance until a diagnostic names
the action or the reporter supplies equivalent non-sensitive evidence.

## Safety and scope

- Preserve `_assertMultiEntityPlansAreSafe()` as a pre-mutation, fail-closed guard.
- Do not reject or rewrite the blocked local operation, apply the remote operation, or advance the
  provider cursor.
- Report only a fixed diagnostic code plus bounded, allowlisted metadata: side, action type,
  entity type, and affected-entity count.
- Never report payloads, task content, client ids, clocks, provider details, URLs, or credentials.
- Map unrecognized action/entity values to `UNKNOWN`; do not echo untrusted metadata.
- Add no service, setting, UI page, discard-operation affordance, schema change, migration,
  dependency, wire shape, or generic multi-entity resolver.
- Do not claim that #9405 is fixed until its actual blocked action is identified and repaired.

## Task 1: Archive-backed characterization

**Description:** Reproduce the guard through the real archive producer, capture, operation-log
persistence, and conflict resolver. Seed synthetic `archiveYoung`/`archiveOld` state, call
`TaskArchiveService.updateTasks()`, persist the captured operation, add one concurrent remote
single-task edit, and run the resolver. Follow
`round-time-conflict-convergence.integration.spec.ts`; do not handcraft a payload that bypasses
production capture.

**Acceptance criteria:**

- [ ] Current code reaches the unsupported-local-multi-entity guard.
- [ ] The captured operation contains the producer's real `tasks` payload and entity ids, with
      `entityChanges: []`, after the archive write.
- [ ] The local operation remains pending and unrejected; no replacement, journal entry, or remote
      reducer/archive apply occurs.
- [ ] The test calls this a reproducible `updateTasks` defect, not proof that `updateTasks` caused
      #9405.

**Likely file:**

- `src/app/op-log/testing/integration/unsupported-multi-entity-conflict.integration.spec.ts`

**Verification:**

- [ ] `npm run test:file src/app/op-log/testing/integration/unsupported-multi-entity-conflict.integration.spec.ts`
- [ ] Keep the existing sync-service cursor regression; do not duplicate provider orchestration.
- [ ] `npm run checkFile src/app/op-log/testing/integration/unsupported-multi-entity-conflict.integration.spec.ts`

## Task 2: Sanitized diagnostic

**Description:** Replace identifier-bearing guard errors with a translated fixed-code message.
Build it in a pure sibling utility rather than growing `ConflictResolutionService`. Emit one
structured `OpLog.err` using the same sanitized fields.

Apply `docs/documentation-guide.md`. This changes a transient error, not the sync workflow or
recovery steps, so no wiki edit is expected unless implementation expands beyond this contract.

**Acceptance criteria:**

- [ ] The rendered diagnostic and its structured log entry contain only the code, side, at most
      three sorted action types from `ActionType`, an entity type from `ENTITY_TYPES`, and a clamped
      entity count.
- [ ] Unknown, HTML-shaped, control-character, duplicate, or oversized metadata cannot appear
      verbatim; it becomes `UNKNOWN` or is omitted.
- [ ] The real sync-wrapper path preserves the message through its second translation pass and
      400-character truncation.
- [ ] The operation still fails before mutation, and existing archive, independent-delete, and
      round-time paths behave unchanged.

**Likely files:**

- new `src/app/op-log/sync/conflict-guard-diagnostic.util.ts` (+ spec)
- `src/app/op-log/sync/conflict-resolution.service.ts` (+ existing spec)
- `src/app/imex/sync/sync-wrapper.service.spec.ts`
- `src/assets/i18n/en.json`, generated `src/app/t.const.ts`

**Verification:**

- [ ] Focused utility, resolver, sync-wrapper, and Task 1 specs
- [ ] `npm run int`
- [ ] `npm run checkFile` for every modified TypeScript file

**Dependencies:** Task 1

## Task 3: Separate privacy-cleanup commit

Delete the three raw `Log.log` calls in
`src/app/features/task-repeat-cfg/store/task-repeat-cfg.effects.ts` that expose repeat changes and
full task objects. Add no replacement log and no test scaffolding solely for deleted statements.

**Verification:**

- [ ] `npm run test:file src/app/features/task-repeat-cfg/store/task-repeat-cfg.effects.spec.ts`
- [ ] `npm run checkFile src/app/features/task-repeat-cfg/store/task-repeat-cfg.effects.ts`

**Dependencies:** None; keep this separate from the sync diagnostic.

## Self-healing follow-up gate

Start a separate fix only after the released diagnostic or equivalent evidence identifies the
blocked action. An archive-backed `updateTasks` fix must then begin with a RED self-healing test and
prove all of the following before production edits:

- one stable cross-tab cut of archive state and durable pending operations from planning through
  successful application; a one-shot locked archive read is insufficient;
- crash-recoverable archive application for every synthetic local replacement;
- complete field evidence for every affected local successor and remote operation, with the
  existing LWW plan remaining the sole winner decision;
- identical live, retry, and status-blind restart results, including remote-loser fields;
- atomic preservation of the original multi-entity intent without reviving `projectId` coupling,
  absent tasks, or mixed active/archive locations.

Do not add active-only `dueDay` support opportunistically; it does not address the archive-backed
candidate under investigation and needs its own RED reproduction. Remote `updateTasks`,
`MOVE_IN_TODAY`, `PLAN_FOR_TODAY`, `REMOVE_FROM_TODAY`, non-archive-win `MOVE_TO_ARCHIVE`, and
`TASK_SHARED_UPDATE` with `projectMoveSubTaskIds` remain fail-closed pending their own analysis.

## Final verification and scope

- [ ] Focused tests, `npm run lint`, and every required `checkFile` pass.
- [ ] Dispatch the scheduled SuperSync and WebDAV E2E suites for the branch.
- [ ] Confirm the documentation-guide conclusion still holds.
- [ ] Confirm no blocked operation, rejection state, provider cursor, or sync wire data changed.

The diagnostic uses one small pure utility plus thin resolver integration. The characterization
and tests may be larger than the production diff; no archive service or resolution machinery is
added in this change.
