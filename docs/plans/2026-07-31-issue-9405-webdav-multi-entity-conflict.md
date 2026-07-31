# Implementation Plan: #9405 safe multi-entity conflict diagnostics

- **Date:** 2026-07-31
- **Status:** Proposed; diagnostic-only
- **Tracking:** [GitHub issue #9405](https://github.com/super-productivity/super-productivity/issues/9405)
- **Baseline:** `1e4ae2a82b6ee9631464e3ee69eddbfa302fcd49`

## Outcome

Ship the smallest safe change that makes this blocked WebDAV report diagnosable:

1. Reproduce the unsupported operation through real capture, persistence, and conflict resolution.
2. Replace the identifier-bearing error with a translated, privacy-safe diagnostic through the
   existing notification path.
3. Remove known user-content logging from the likely recurring-task producer.

The operation stays pending, the cursor stays unchanged, and the generic multi-entity guard stays
fail-closed. Semantic resolution is outside this plan because #9405 has not identified the
originating action.

## Guardrails

- Keep `_assertMultiEntityPlansAreSafe()` at the same pre-mutation point.
- Reuse `ConflictResolutionService` translation and the existing `SyncWrapperService` error path.
- Report only a fixed error code, side, sorted validated action type(s), entity type, and bounded
  affected-entity count.
- Never report operation/entity IDs, payloads, task content, client IDs, vector clocks, provider
  details, URLs, or credentials.
- Do not add a service, retry blocker, clipboard workflow, UI page, setting, schema change,
  migration, dependency, wire shape, archive API, reducer behavior, or journal entry.

## Task 1: Add one production-shaped failing reproduction

**Description:** Follow the capture/store/resolver integration pattern in
`round-time-conflict-convergence.integration.spec.ts`: capture a real
`TaskSharedActions.updateTasks` action with `OperationCaptureService`, append it to the real
`OperationLogStoreService`, introduce a concurrent remote single-task edit, and exercise the real
`ConflictResolutionService`. This action is a known unsupported fixture, not an assumption about
the reporter. The guard is below provider transport, so the adapter-only file-sync harness would
add no relevant coverage.

**Acceptance criteria:**

- [ ] Before Task 2, the test reaches the current guard and fails its safe-diagnostic assertion.
- [ ] The local operation remains pending and unrejected; no resolution op, journal entry, or
      remote apply occurs.
- [ ] Capture produces the real action payload and `entityChanges: []`, using synthetic content.

**Verification:**

- [ ] `npm run test:file src/app/op-log/testing/integration/unsupported-multi-entity-conflict.integration.spec.ts`
- [ ] Keep the existing `operation-log-sync.service.spec.ts` regression proving that a processing
      throw does not persist `lastServerSeq`; do not duplicate cursor orchestration in this spec.
- [ ] `npm run checkFile src/app/op-log/testing/integration/unsupported-multi-entity-conflict.integration.spec.ts`

**Dependencies:** None

**Files likely touched:**

- `src/app/op-log/testing/integration/unsupported-multi-entity-conflict.integration.spec.ts`

**Estimated scope:** Medium, one integration file

## Task 2: Emit a minimal privacy-safe diagnostic

**Description:** Replace the two identifier-bearing throws in
`ConflictResolutionService._assertMultiEntityPlansAreSafe()` with one small local formatter. Use
the existing `TranslateService`/`T` dependency and let the existing sync wrapper display the
resulting `Error.message`.

**Acceptance criteria:**

- [ ] Local and remote failures contain only the allowlisted diagnostic fields.
- [ ] Secret-looking fixture values and IDs do not appear; unknown actions still fail closed.
- [ ] Safe archive, independent-delete, and rounding paths remain unchanged, and Task 1's
      no-mutation assertions pass.

**Verification:**

- [ ] Update one existing local/remote guard group in
      `src/app/op-log/sync/conflict-resolution.service.spec.ts`; do not duplicate it in the
      disjoint-merge suite.
- [ ] `npm run test:file src/app/op-log/sync/conflict-resolution.service.spec.ts`
- [ ] `npm run test:file src/app/op-log/testing/integration/unsupported-multi-entity-conflict.integration.spec.ts`
- [ ] `npm run int`
- [ ] `npm run checkFile` for every modified/generated TypeScript file

**Dependencies:** Task 1

**Files likely touched:**

- `src/app/op-log/sync/conflict-resolution.service.ts`
- `src/app/op-log/sync/conflict-resolution.service.spec.ts`
- `src/assets/i18n/en.json`
- generated `src/app/t.const.ts`

**Estimated scope:** Medium, three manually edited files plus one generated file

**Stop condition:** If the existing error path cannot preserve the diagnostic, pause for scope
review before adding a cross-layer error type. Do not grow `SyncWrapperService` or add diagnostic
state silently.

## Task 3: Remove raw repeat-instance logs

**Description:** Delete the three `Log.log` calls that record repeat-configuration changes, full
live/archive task objects, and per-archive updates in the “update all instances” effect. Add no
replacement log.

**Acceptance criteria:**

- [ ] The path logs no user content or identifiers.
- [ ] Updating active and archived instances behaves as before.

**Verification:**

- [ ] `npm run test:file src/app/features/task-repeat-cfg/store/task-repeat-cfg.effects.spec.ts`
- [ ] `npm run checkFile src/app/features/task-repeat-cfg/store/task-repeat-cfg.effects.ts`
- [ ] Add a logging spec only if the existing test already exposes a `Log` spy; add no new test
      scaffolding solely for deleted statements.

**Dependencies:** None; safe to implement after Task 1 fails and in parallel with Task 2

**Files likely touched:**

- `src/app/features/task-repeat-cfg/store/task-repeat-cfg.effects.ts`

**Estimated scope:** Extra small, one production file

## Checkpoint: Diagnostic release

- [ ] Focused tests pass; every modified `.ts` file passes `npm run checkFile`; `npm run lint`
      passes.
- [ ] The guard, pending operation, rejection state, provider cursor, and wire data are unchanged.
- [ ] A screenshot supplies the action class and count without identifiers or user content.
- [ ] No new service, state machine, setting, page, schema, migration, or wire shape exists.
- [ ] Support points blocked users to the existing **Only sync manually** setting after one
      deliberate diagnostic retry if they want to stop automatic provider attempts.

The diagnostic-only message does not change the documented sync workflow, so no wiki update is
required. If implementation adds recovery instructions or changes behavior, stop and apply
`docs/documentation-guide.md` before expanding the PR.

## Follow-up gate

After a released diagnostic identifies the real action, first capture and reproduce that exact
action and side through persistence and two-client replay. Then write and review a separate plan
that proves atomicity and compatibility across active tasks, both archive tiers, deletes/restores,
older clients, retries, and restart. Until then, do not design or implement rebatching,
compensation, allowlists, archive locks, schema markers, or a generic resolver.

## Scope budget

- Expected production change: two manually edited TypeScript files, one translation entry, and one
  generated constants file.
- Expected tests: one new integration spec and focused edits to one existing unit spec.
- Stop for scope review if implementation needs more than three non-generated production
  TypeScript files or any new service/state.
