# Operation Log Implementation Review

**Date:** 2025-12-08
**Branch:** `feat/operation-logs`
**Last Updated:** December 11, 2025 (code review and test improvements)

This document summarizes findings from a comprehensive review of the operation log implementation, covering bugs, redundancies, architecture issues, and test coverage gaps.

---

## December 11, 2025 Update: Security Review

A comprehensive security review was conducted on December 11, 2025. Several "critical" security issues were initially flagged but upon verification were found to be **already addressed**:

### Verified Security Measures ✅

| Issue                      | Status                 | Location                                                      |
| -------------------------- | ---------------------- | ------------------------------------------------------------- |
| **Timing attack on login** | ✅ Already mitigated   | `auth.ts:214-219` - Uses dummy hash comparison                |
| **Vector clock DoS**       | ✅ Already implemented | `sync.types.ts:66-110` - Limits to 100 entries, 255 char keys |
| **CSRF protection**        | ✅ Not needed          | JWT Bearer tokens in Authorization header, not cookies        |

### Verified Reliability Measures ✅

| Issue                          | Status                      | Location                                                                 |
| ------------------------------ | --------------------------- | ------------------------------------------------------------------------ |
| **Error handling in reducers** | ✅ Defensive checks present | `short-syntax-shared.reducer.ts:69-71` - Returns early if task not found |
| **ClientId recovery**          | ✅ Handled upstream         | `metaModel.loadClientId()` creates clientId if missing                   |

### Tests Added (December 11, 2025)

| Test                           | File                                  | Description                               |
| ------------------------------ | ------------------------------------- | ----------------------------------------- |
| 3-way conflict E2E             | `supersync-edge-cases.spec.ts`        | 3 clients editing same task concurrently  |
| Delete vs Update E2E           | `supersync-edge-cases.spec.ts`        | One client deletes while another updates  |
| Large conflict sets (100+ ops) | `conflict-resolution.service.spec.ts` | Stress test with 50 local + 50 remote ops |
| Multi-entity conflicts         | `conflict-resolution.service.spec.ts` | 10 entities with 10 ops each              |

---

## Executive Summary

The operation log implementation has a solid architectural foundation with event sourcing, vector clocks, and meta-reducers for atomic operations. However, several issues and test gaps were discovered that should be addressed before production use.

| Category  | Critical    | High | Medium | Total |
| --------- | ----------- | ---- | ------ | ----- |
| Bugs      | 0 (1 fixed) | 3    | 6      | 9     |
| Test Gaps | 3           | 4    | 3      | 10    |

---

## Corrected Analysis (False Positives Removed)

### ~~Repair Mutex Race Condition~~ - FALSE POSITIVE

**Status:** Not a bug in JavaScript's single-threaded model.

**Original Claim:** Between promise creation and mutex assignment, another call can pass the `if (!this._repairMutex)` check.

**Why It's Not a Bug:** JavaScript is single-threaded. The code at lines 700-722:

```typescript
const repairPromise = (async () => { ... })();  // Returns immediately
this._repairMutex = repairPromise;              // Assigned synchronously on next line
```

There is no `await` between these lines, so the event loop cannot yield. No other code can execute between promise creation and mutex assignment.

**Optional Improvement:** Setting the mutex before creating the promise is a valid defensive coding practice for clarity, but the current implementation is not buggy.

---

### ~~Cache Not Invalidated on Append~~ - FALSE POSITIVE

**Status:** Not a bug - cache self-invalidates.

**Original Claim:** `append()` doesn't invalidate `_appliedOpIdsCache`, causing stale data.

**Actual Implementation:**

```typescript
async getAppliedOpIds(): Promise<Set<string>> {
  const currentLastSeq = await this.getLastSeq();
  // Cache valid only if lastSeq hasn't changed
  if (this._appliedOpIdsCache && this._cacheLastSeq === currentLastSeq) {
    return new Set(this._appliedOpIdsCache);
  }
  // Rebuild cache if seq changed
  ...
}
```

When new ops are appended, `lastSeq` changes (auto-increment). The cache automatically invalidates because `currentLastSeq !== _cacheLastSeq`.

**Conclusion:** No bug - the sequence-based invalidation works correctly.

---

## Critical Issues (Fix Immediately)

### 1. ~~incrementCompactionCounter() Bug - Compaction Never Triggers~~ - FIXED

**File:** `src/app/core/persistence/operation-log/store/operation-log-store.service.ts:434-439`
**Status:** Fixed on 2025-12-08

**Original Issue:** When no cache exists, returned 1 without persisting. Compaction threshold was never reached.

**Fix Applied:**

```typescript
if (!cache) {
  // No state cache yet - create one with counter starting at 1
  await store.put({ id: 'current', compactionCounter: 1 });
  await tx.done;
  return 1;
}
```

---

## High Priority Issues

### 2. ~~Missing Subtask Cascade in Tag Deletion~~ - FALSE POSITIVE

**File:** `src/app/root-store/meta/task-shared-meta-reducers/tag-shared.reducer.ts:85-116`
**Status:** Re-evaluated on 2025-12-08 - NOT A BUG

**Original Claim:** Subtasks of surviving parents that lose all tags become orphaned.

**Why It's Not a Bug:** A subtask with a surviving parent is still accessible through the parent. The current logic correctly:

- Only marks tasks as orphaned if they have no tags, no project, AND no parent
- Deletes subtasks when their parent is orphaned

### 3. ~~Snapshot Saved Before Validation~~ - FIXED

**File:** `src/app/core/persistence/operation-log/store/operation-log-hydrator.service.ts:166-179`
**Status:** Fixed on 2025-12-08

**Original Issue:** Snapshot was saved before validation ran. If validation found corruption, the snapshot was stale.

**Fix Applied:** Moved validation (CHECKPOINT C) BEFORE saving snapshot in both tail replay and full replay code paths.

### 4. No Error Handling in applyShortSyntax Sub-Functions

**File:** `src/app/root-store/meta/task-shared-meta-reducers/short-syntax-shared.reducer.ts:53-126`

Multiple state mutations (`moveTaskToProject`, `handleScheduleWithTime`, `handlePlanForDay`) with no try-catch. If any throws mid-operation, state becomes partially updated.

### 5. Missing Recovery When clientId Load Fails

**File:** `src/app/core/persistence/operation-log/operation-log.effects.ts:70-76`

If `loadClientId()` fails or returns empty, operation is lost. No retry mechanism.

---

## Medium Priority Issues

### 6. TOCTOU Race in Compaction

**File:** `src/app/core/persistence/operation-log/store/operation-log-compaction.service.ts:66-93`

Time-of-check-time-of-use between `getLastSeq()` and `deleteOpsWhere()`. New ops written between these calls could theoretically cause issues.

### 7. Orphan Detection Doesn't Verify Project Exists

**File:** `src/app/root-store/meta/task-shared-meta-reducers/tag-shared.reducer.ts:105-108`

```typescript
if (newTagIds.length === 0 && !task.projectId && !task.parentId) {
```

Checks `!task.projectId` but doesn't verify project still exists (could be deleted in same batch).

### 8. State Capture ID Non-Deterministic

**File:** `src/app/core/persistence/operation-log/processing/state-change-capture.service.ts:354-360`

`JSON.stringify(action)` hash is non-deterministic for object property order. Could cause capture ID mismatch.

### 9. Stale Capture Cleanup Only on New Capture

**File:** `src/app/core/persistence/operation-log/processing/state-change-capture.service.ts:231`

`cleanupStaleCaptures()` only runs when new capture created. If operations are infrequent, stale captures accumulate.

### 10. TimeTracking Archive Not Cleaned Atomically

**File:** `src/app/root-store/meta/task-shared-meta-reducers/tag-shared.reducer.ts:188-210`

Current time tracking cleaned in meta-reducer, archives handled async in effect. Can cause sync inconsistency.

### 11. LOCAL_ACTIONS Filter Edge Case

**File:** `src/app/util/local-actions.token.ts:37`

```typescript
return actions$.pipe(filter((action: Action) => !(action as any).meta?.isRemote));
```

If action has no `meta` field, it passes (undefined !== true). Remote operations without explicit `isRemote: true` could trigger effects twice.

---

## Test Coverage Gaps

### Critical Missing Tests

| Gap                        | Scenario                       | Impact           | Status                                                          |
| -------------------------- | ------------------------------ | ---------------- | --------------------------------------------------------------- |
| ~~**Race conditions**~~    | Concurrent append + compaction | Data loss        | ✅ Tested (compaction.service.spec.ts - 6 race condition tests) |
| **Error recovery**         | Quota exceeded mid-write       | State corruption | ✅ Tested (8 tests in operation-log.effects.spec.ts)            |
| **Multi-tab coordination** | Tab A append + Tab B compact   | Lock deadlock    | Covered by lock service tests                                   |

### Missing Scenarios

1. ~~**Concurrent operations:** No test for append during compaction~~ → ✅ Added race condition tests
2. ~~**Quota exceeded:** Emergency compaction path never tested~~ → ✅ Extensively tested (8 test cases)
3. ~~**Schema migration:** Version mismatch during hydration~~ → ✅ Added 6 version mismatch tests (hydrator.service.spec.ts)
4. ~~**3-way conflicts:** Only 2-way conflict resolution tested~~ → ✅ Added E2E test (supersync-edge-cases.spec.ts)
5. ~~**Conflict on deleted entity:** Update for entity local deleted~~ → ✅ Added E2E test (supersync-edge-cases.spec.ts)
6. ~~**Very large conflict sets:** 100+ ops on same entity~~ → ✅ Added unit tests (conflict-resolution.service.spec.ts)
7. ~~**Download retry:** Network failure mid-pagination (2 tests skipped with `pending()`)~~ → ✅ Fixed (4 retry tests now passing)

### Test Infrastructure Issues

- ~~`sync-scenarios.integration.spec.ts:18-32`: All SimulatedClients share same IndexedDB (not true isolation)~~ → ✅ Documented as intentional design choice with clear explanation of logical isolation strategy (see `simulated-client.helper.ts`)
- ~~`operation-log-download.service.spec.ts:360-373`: 2 tests marked `pending()` due to timeout~~ → ✅ Fixed with proper retry testing (30s timeouts)
- Benchmark tests disabled (`xdescribe`) - intentional, for manual performance testing only

---

## Architecture Observations

### Well-Designed Aspects

1. **Event sourcing model** with vector clocks for conflict detection
2. **Meta-reducer pattern** for atomic multi-entity operations
3. **Snapshot + tail replay** for fast hydration
4. **LOCAL_ACTIONS token** for filtering remote operations from effects
5. **Sequence-based cache invalidation** for `_appliedOpIdsCache`

### Potential Redundancies

1. **Dual compaction triggers:** Both counter-based and time-based cleanup
2. **Multiple validation checkpoints:** A, B, C, D with similar logic
3. **Lock service fallback:** Both Web Locks API and localStorage locking maintained

### Known Limitations (Documented)

- Cross-version sync (A.7.11) not implemented
- Archive data bypasses operation log intentionally
- Schema version currently fixed at v1

---

## Implementation Plan

### Phase 1: Fix Critical Bug

#### 1.1 Fix incrementCompactionCounter() Bug

**File:** `src/app/core/persistence/operation-log/store/operation-log-store.service.ts`
**Lines:** 428-447

### Phase 2: Fix High Priority Issues

#### 2.1 Fix Snapshot Timing in Hydrator

**File:** `src/app/core/persistence/operation-log/store/operation-log-hydrator.service.ts`
**Lines:** 167-176

**Fix:** Move validation (Checkpoint C) BEFORE saving snapshot.

#### 2.2 Add Subtask Orphan Re-detection

**File:** `src/app/root-store/meta/task-shared-meta-reducers/tag-shared.reducer.ts`
**Lines:** After 116

**Fix:** After removing tags from tasks, run orphan detection on subtasks of surviving parents.

### Phase 3: Add Missing Tests

#### 3.1 Race Condition Tests

**File:** `src/app/core/persistence/operation-log/integration/race-conditions.integration.spec.ts` (new)

Tests to add:

- Concurrent append + compaction
- Concurrent upload + download
- Multi-tab lock acquisition
- Rapid local ops during sync

#### 3.2 Error Recovery Tests

**File:** `src/app/core/persistence/operation-log/integration/error-recovery.integration.spec.ts` (new)

Tests to add:

- Quota exceeded mid-write
- Network failure during download pagination
- Corrupted operation in log
- Schema mismatch during hydration

#### 3.3 Fix Pending Download Tests

**File:** `src/app/core/persistence/operation-log/sync/operation-log-download.service.spec.ts`
**Lines:** 360-373

**Fix:** Either mock timers properly or increase test timeout.

### Phase 4: Verify & Run Tests

1. Run `npm run checkFile` on all modified files
2. Run existing tests: `npm test`
3. Run new integration tests
4. Verify no regressions

---

## Files Reference

| Category          | Files                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Core effects**  | `operation-log.effects.ts`                                                                                            |
| **Store**         | `operation-log-store.service.ts`, `operation-log-hydrator.service.ts`, `operation-log-compaction.service.ts`          |
| **State capture** | `state-change-capture.service.ts`, `state-capture.meta-reducer.ts`                                                    |
| **Sync**          | `operation-log-sync.service.ts`, `conflict-resolution.service.ts`, `vector-clock.service.ts`                          |
| **Meta-reducers** | `planner-shared.reducer.ts`, `short-syntax-shared.reducer.ts`, `tag-shared.reducer.ts`, `task-shared-crud.reducer.ts` |
| **Filter**        | `local-actions.token.ts`                                                                                              |

---

## Files to Modify

| File                                        | Changes                      |
| ------------------------------------------- | ---------------------------- |
| `operation-log-store.service.ts`            | Fix compaction counter       |
| `operation-log-hydrator.service.ts`         | Fix snapshot timing          |
| `tag-shared.reducer.ts`                     | Add subtask orphan detection |
| `operation-log-download.service.spec.ts`    | Fix pending tests            |
| (new) `race-conditions.integration.spec.ts` | Add race condition tests     |
| (new) `error-recovery.integration.spec.ts`  | Add error recovery tests     |
