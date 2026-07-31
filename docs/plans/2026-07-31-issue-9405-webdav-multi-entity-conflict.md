# Implementation Plan: #9405 blocked multi-entity sync conflict

- **Date:** 2026-07-31
- **Status:** Proposed; repro-gated. The fix is chosen after Task 1, not before.
- **Tracking:** [GitHub issue #9405](https://github.com/super-productivity/super-productivity/issues/9405)
- **Baseline:** `1e4ae2a82b6ee9631464e3ee69eddbfa302fcd49`

## Problem

A WebDAV/Android user is permanently blocked. Every sync attempt throws from
`ConflictResolutionService._assertMultiEntityPlansAreSafe()`
(`src/app/op-log/sync/conflict-resolution.service.ts:2297-2337`), the pending local operation
never clears, and the provider cursor never advances. The in-app "Review sync conflicts" list is
empty by design, because it only holds conflicts that were successfully auto-resolved.

The reported message is the **local** branch of that guard, surfaced through the generic sync error
snack (`src/app/imex/sync/sync-wrapper.service.ts:1066-1082` via `getSyncErrorStr`, truncated at
400 chars). It names `TASK:rpt_<cfgId>_2026-07-25`, which identifies a repeat-task occurrence but
not the action that produced the blocked operation.

The only recovery currently offered is Force Overwrite, which is lossy and also replaces the
WebDAV `.bak` file, or the existing **Only sync manually** setting (`isManualSyncOnly`,
`T.F.SYNC.L_MANUAL_SYNC_ONLY`), which stops the retries without fixing anything.

## Scope of the guard (verified)

This is not a rare path. Local multi-entity `TASK` operations that reach the throw, because they
are in neither `INDEPENDENT_MULTI_DELETE_ACTIONS` nor `DECOMPOSABLE_MULTI_ACTION_FIELDS` (which
holds only `TASK_ROUND_TIME_SPENT`):

- `TASK_SHARED_UPDATE_MULTIPLE` (`updateTasks`)
- `TASK_SHARED_MOVE_TO_ARCHIVE`, except when `winner === 'local' && localWinOperationKind === 'archive-win'`
- `TASK_SHARED_PLAN_FOR_TODAY`, `TASK_SHARED_REMOVE_FROM_TODAY`
- `TASK_SHARED_MOVE_IN_TODAY` (two ids, produced by an ordinary drag-reorder in Today)
- `TASK_SHARED_UPDATE` carrying `projectMoveSubTaskIds`

Any of these colliding with a concurrent remote edit on one participating task wedges sync for
that client. Severity is judged accordingly: this is live in shipped builds, and per the
sync-severity rules `master` reaches real users through the Play internal track and the
`supersync:latest` image.

## Findings that constrain the fix

Recorded here because they invalidate the obvious cheap fix, and a later reader will otherwise
propose it again.

1. **Capture stores no per-entity deltas.** `OperationCaptureService.extractEntityChanges` returns
   `[]` for everything except `TIME_TRACKING` and `syncTimeSpent`
   (`src/app/op-log/capture/operation-capture.service.ts:239-261`).
2. **The reconciler deliberately refuses to infer fields from a bulk action payload.**
   `src/app/op-log/sync/conflict-disjoint-merge.util.ts:80-95` returns `{}` for a multi-entity op
   rather than borrowing the primary entity's fields. So `capturedFields` is empty,
   `canUseStaticFields` is round-time-specific, `fields` is `[]`, and
   `conflict-resolution.service.ts:2244` throws.
3. **The reconciler is blind to the archive.** `getCurrentEntityState`
   (`conflict-resolution.service.ts:3674-3730`) reads NgRx selectors only. An archived task returns
   `undefined`, and the caller at line 2250 then takes a `continue` whose comment assumes a later
   local delete superseded the change. For an archived task that assumption is false, so the bulk
   op would be rejected with **no replacement operation and no error**: silent divergence. The same
   trap is already documented for `moveToArchive` at
   `src/app/op-log/sync/superseded-operation-resolver.service.ts:293`.
4. **The producer writes the archive before dispatching.** `TaskArchiveService._updateTasks`
   (`src/app/features/archive/task-archive.service.ts:355-404`) mutates `archiveYoung`/`archiveOld`,
   then dispatches. `ArchiveOperationHandlerService._handleUpdateTasks` correspondingly skips local
   application and only executes for remote ops, routing each id to whichever tier holds it.
5. **Action type does not establish decomposability.** `updateTasks` has two producers with
   opposite entity locations: `task-archive.service.ts:403` (archived tasks only) and
   `global-config.effects.ts:196` (active tasks only, `dueDay` migration). It also carries coupled
   parent-plus-subtask `projectId` moves from `src/app/features/tasks/task/task.component.ts:1353`,
   and the repeat-cfg producer can emit entries whose `changes` object is empty
   (`task-repeat-cfg.effects.ts:726-760`).
6. **The reducer itself is per-entity.** `task.reducer.ts:368-370` is `taskAdapter.updateMany`.
   Decomposition is semantically plausible; the blockers above are about _where the entities live_
   and _which fields are coupled_, not about the reducer.

## Guardrails

- Keep `_assertMultiEntityPlansAreSafe()` at the same pre-mutation point, fail-closed.
- Never emit a partial reconciliation. Either every affected entity is represented or the guard
  throws. A rejected bulk op with no replacement is the worst outcome available here.
- Remote multi-entity `updateTasks` stays fail-closed regardless of what happens on the local side.
- User-visible diagnostics report only: a fixed error code, the side (local/remote), sorted action
  type(s) drawn from `Object.values(ActionType)`
  (`src/app/op-log/core/action-types.enum.ts`), an entity type from `ENTITY_TYPES`
  (`packages/shared-schema/src/entity-types.ts`), and a bounded affected-entity count. Bound the
  action-type list too, so the whole string stays under the 400-char truncation.
- Map every unrecognized action or entity type to the literal `UNKNOWN`. Never interpolate raw
  operation metadata into a user-visible message.
- Never surface payloads, task content, client ids, vector clocks, provider details, URLs, or
  credentials. Entity ids stay out of the **UI** but belong in the **log**: rule 9 sanctions
  `Log.log({ id: task.id })` and forbids logging content, so the id is what makes the next report
  diagnosable.
- No new service, setting, UI page, schema change, migration, dependency, or wire shape.
- Do not add a "discard the blocked operation" UI. If a fix self-heals stuck clients on upgrade,
  that affordance is unearned, and it is destructive and hard to withdraw once shipped.

## Task 1: Archive-backed RED reproduction (decision gate)

**Description:** Reproduce the blocked state through real capture, persistence, and conflict
resolution, following the integration pattern in
`round-time-conflict-convergence.integration.spec.ts`. Seed real `archiveYoung`/`archiveOld` state,
drive the actual `TaskArchiveService.updateTasks` path so the archive is written before dispatch,
capture the resulting `TaskSharedActions.updateTasks` with `OperationCaptureService`, append it to
the real `OperationLogStoreService`, introduce a concurrent remote single-task edit on one
participating id, and exercise the real `ConflictResolutionService`.

An active-state-only repro is not sufficient. Finding 3 only appears when the participating tasks
are in the archive, which is exactly the reporter's shape.

**Acceptance criteria:**

- [ ] The test reaches the guard and fails today.
- [ ] The local operation remains pending and unrejected; no resolution op, journal entry, or
      remote apply occurs.
- [ ] Capture produces the real action payload with `entityChanges: []`, using synthetic content.
- [ ] A companion case asserts the finding-3 hazard directly: if the guard were lifted naively, the
      archived entity yields no replacement op. This is the regression that any future fix must
      keep red until it genuinely handles the archive.

**Verification:**

- [ ] `npm run test:file src/app/op-log/testing/integration/unsupported-multi-entity-conflict.integration.spec.ts`
- [ ] Keep the existing `operation-log-sync.service.spec.ts` regression proving a processing throw
      does not persist `lastServerSeq`; do not duplicate cursor orchestration here.
- [ ] `npm run checkFile` on the new spec.

**Dependencies:** None

**Files likely touched:**

- `src/app/op-log/testing/integration/unsupported-multi-entity-conflict.integration.spec.ts`

## Task 2: Sanitized diagnostic, id retained in the log

**Description:** Replace the two identifier-bearing throws in `_assertMultiEntityPlansAreSafe()`
with a sanitized message built by a pure formatter, and emit one `OpLog.err` carrying the full
`entityType:entityId` plus action type for support. Use the existing `TranslateService`/`T`
dependency and let the existing sync snack render the resulting `Error.message`.

Put the formatter in a sibling utility next to the existing `conflict-*.util.ts` files, not in
`conflict-resolution.service.ts`. That service is 4233 lines against the 1200-line cap and is
grandfathered on the condition that the list only shrinks. A pure utility is also unit-testable
without the service harness.

**Acceptance criteria:**

- [ ] Local and remote failures contain only the allowlisted diagnostic fields.
- [ ] Secret-looking ids and HTML-shaped unknown action/entity types do not appear; unknown values
      render as `UNKNOWN`; the operation still fails closed.
- [ ] The `OpLog.err` line carries the entity id and action type, and no task content.
- [ ] The message survives the snack's second pass through ngx-translate unchanged. A message that
      resembles a translation key would otherwise render blank, so assert the rendered string.
- [ ] Safe archive, independent-delete, and rounding paths remain unchanged, and Task 1's
      no-mutation assertions still pass.

**Verification:**

- [ ] Update one existing local/remote guard group in `conflict-resolution.service.spec.ts`; do not
      duplicate it in the disjoint-merge suite.
- [ ] `npm run test:file` for the new util spec, the service spec, and Task 1's spec.
- [ ] `npm run int`
- [ ] `npm run checkFile` for every modified TypeScript file.

**Dependencies:** Task 1

**Files likely touched:**

- new `src/app/op-log/sync/conflict-guard-diagnostic.util.ts` (+ spec)
- `src/app/op-log/sync/conflict-resolution.service.ts` (call sites only)
- `src/app/op-log/sync/conflict-resolution.service.spec.ts`
- `src/assets/i18n/en.json`, generated `src/app/t.const.ts`

## Task 3: Remove raw repeat-instance logs

**Description:** Delete the three `Log.log` calls in the "update all instances" effect
(`src/app/features/task-repeat-cfg/store/task-repeat-cfg.effects.ts:718,719,759`) that record the
repeat-configuration changes, the full live and archived task objects, and each per-archive update.
Add no replacement log. This is an unconditional rule 9 violation and is independent of the rest of
this plan.

**Acceptance criteria:**

- [ ] The path logs no user content or identifiers.
- [ ] Updating active and archived instances behaves as before.

**Verification:**

- [ ] `npm run test:file src/app/features/task-repeat-cfg/store/task-repeat-cfg.effects.spec.ts`
- [ ] `npm run checkFile src/app/features/task-repeat-cfg/store/task-repeat-cfg.effects.ts`
- [ ] Add a logging assertion only if the existing spec already has a `Log` spy. Do not add test
      scaffolding solely for deleted statements.

**Dependencies:** None; implement in parallel.

## Decision gate: choose the fix after Task 1

Task 1 tells us which action is actually blocking, and whether its entities are archived, active,
or mixed. Only then pick one of these. Do not pre-commit.

**Option A: payload rebatch (no archive read).** Follow the `moveToArchive` precedent at
`superseded-operation-resolver.service.ts:289-295`: re-create the operation preserving its original
payload with a dominating clock, instead of snapshotting current state. Strictly validate the
payload (unique ids, exact `entityIds` equality, plain `changes`, narrow field allowlist excluding
`projectId`, discard verified no-op entries), drop or field-strip only the conflict target when
remote wins, keep sibling entries verbatim, and emit exactly one replacement
`TASK_SHARED_UPDATE_MULTIPLE`. Finding 3 does not apply because no state is read, and remote
application already routes per tier via `_handleUpdateTasks`.
_Open risk to test, not to argue:_ re-emitting a stale intent can clobber a later local edit to the
same task depending on clock ordering.

**Option B: state-backed rebatch.** As Option A, but read current values from active state **and**
both archive tiers, skip tasks absent everywhere so later deletes are not undone, and preserve
uncontested siblings plus only the locally retained fields for conflict targets. Strictly more
correct against concurrent local edits, and strictly more expensive: it teaches the resolver about
archive storage, which is a new coupling in the highest-risk subsystem.

**Option C: diagnostic only.** If Task 1 does not pin local `updateTasks`, ship Tasks 2 and 3 alone
and wait for a released diagnostic to name the action. Do not generalize the resolver on a guess.

Whichever is chosen, it must prove: upgrade self-healing for an already-stuck client, correct
archive tier placement, mixed local/remote winners, restart and retry, replay on older clients, and
no entity resurrection.

## Checkpoint

- [ ] Focused tests pass; every modified `.ts` file passes `npm run checkFile`; `npm run lint` passes.
- [ ] Where no fix ships, the guard, pending operation, rejection state, provider cursor, and wire
      data are all unchanged.
- [ ] A screenshot of the new message supplies the action class and count with no identifiers or
      user content.
- [ ] Support points blocked users at the existing **Only sync manually** setting after one
      deliberate diagnostic retry, if they want to stop automatic provider attempts.
- [ ] #9405 is **not** reported as fixed until the action is actually identified.

The diagnostic-only path does not change the documented sync workflow, so no wiki update is
required. If a fix ships and changes behavior or adds recovery instructions, apply
`docs/documentation-guide.md` before expanding the PR.

## Follow-up gate

The residual blocked actions (`TASK_SHARED_MOVE_IN_TODAY`, `TASK_SHARED_PLAN_FOR_TODAY`,
`TASK_SHARED_REMOVE_FROM_TODAY`, and non-archive-win `TASK_SHARED_MOVE_TO_ARCHIVE`) encode ordering
and list invariants that a per-entity snapshot cannot reproduce. They need their own reproduction
and their own plan. Until then, do not build allowlists, archive locks, schema markers, or a
generic resolver for them.

## Scope budget

- Tasks 2 and 3: two manually edited production files plus one new utility, one translation entry,
  one generated constants file.
- A fix under Option A or B adds roughly two production surfaces: one pure validator/planner utility
  and thin resolver integration, with tests larger than the production change.
- Stop for scope review if implementation needs more than three non-generated production TypeScript
  files, or any new service or state machine.
