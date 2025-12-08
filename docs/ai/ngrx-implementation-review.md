# NgRx Implementation Review

**Date:** December 8, 2025
**Branch:** `feat/operation-logs`
**Reviewed by:** Claude (AI-assisted code review)
**Last Updated:** December 8, 2025 (corrected false positives)

---

## Executive Summary

A comprehensive review of the NgRx implementation identified **22 issues** across bugs, redundancies, architecture concerns, and testing gaps.

| Category     | Critical    | High | Medium | Total |
| ------------ | ----------- | ---- | ------ | ----- |
| Bugs         | 0 (1 fixed) | 4    | 8      | 12    |
| Testing Gaps | 3           | 4    | 2      | 9     |

### Testing Coverage

| Category      | Total | Tested | Coverage | Status           |
| ------------- | ----- | ------ | -------- | ---------------- |
| Reducers      | 35    | 28     | 80%      | Good             |
| Effects       | 39    | 20     | **51%**  | **Critical Gap** |
| Selectors     | 13    | 12     | 92%      | Excellent        |
| Meta-reducers | 10    | 8      | 80%      | Good             |

---

## Corrected Analysis (False Positives Removed)

### ~~TODAY_TAG Pattern Inconsistency~~ - FALSE POSITIVE

**Status:** Not a bug - code is correct.

**Original Claim:** Functions like `handleTransferTask` and `handlePlanTaskForDay` use "board-style" (adding TODAY_TAG to `task.tagIds`).

**Actual Code Behavior:** The code explicitly **REMOVES** TODAY_TAG from `task.tagIds`:

```typescript
// planner-shared.reducer.ts:102-114
// Remove TODAY from task.tagIds if present
if (hasTaskTodayTag) {
  state = {
    ...state,
    [TASK_FEATURE_NAME]: taskAdapter.updateOne(
      {
        id: task.id,
        changes: { tagIds: currentTagIds.filter((id) => id !== TODAY_TAG.id) },
      },
      state[TASK_FEATURE_NAME],
    ),
  };
}
```

The comments in the code confirm: "Ensure TODAY_TAG is NOT in task.tagIds (cleanup if present from legacy data)".

**Conclusion:** The code correctly enforces the virtual tag pattern by removing any legacy TODAY_TAG references from `task.tagIds`. No fix needed.

---

### ~~Repair Mutex Race Condition~~ - FALSE POSITIVE

**Status:** Not a bug in JavaScript's single-threaded model.

**Original Claim:** Between promise creation and mutex assignment, another call can pass the `if (!this._repairMutex)` check.

**Why It's Not a Bug:** JavaScript is single-threaded. The code:

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

## Critical Bugs (Fix Immediately)

### 1. ~~Compaction Counter Never Persists~~ - FIXED

**Severity:** Critical
**File:** `src/app/core/persistence/operation-log/store/operation-log-store.service.ts`
**Lines:** 434-439
**Status:** Fixed on 2025-12-08

**Original Issue:** When no state cache exists, `incrementCompactionCounter()` returned 1 without persisting the value.

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

### ~~Memory Leak in TaskElectronEffects~~ - FALSE POSITIVE

**Status:** Not a bug - `take(1)` ensures automatic cleanup.

**Original Claim:** Subscriptions accumulate without cleanup in the IPC handler.

**Why It's Not a Bug:** Looking at the actual code:

```typescript
this._store$.pipe(
  select(selectCurrentTask),
  withLatestFrom(...),
  take(1),  // <-- Completes after 1 emission, auto-unsubscribes
).subscribe(...)
```

The `take(1)` operator ensures the observable completes after receiving one value, which automatically triggers unsubscription. Each IPC event creates a short-lived subscription that self-destructs after emitting once.

---

## High Priority Issues

### 1. ~~Snapshot Saved Before Validation~~ - FIXED

**File:** `src/app/core/persistence/operation-log/store/operation-log-hydrator.service.ts`
**Lines:** 166-179
**Status:** Fixed on 2025-12-08

**Original Issue:** Snapshot was saved before validation ran. If validation found corruption and repaired it, the snapshot was stale.

**Fix Applied:** Moved validation (CHECKPOINT C) BEFORE saving snapshot in both tail replay and full replay code paths. Snapshot now contains validated/repaired state.

---

### 2. ~~Missing Subtask Cascade in Tag Deletion~~ - FALSE POSITIVE

**File:** `src/app/root-store/meta/task-shared-meta-reducers/tag-shared.reducer.ts`
**Lines:** 85-116
**Status:** Re-evaluated on 2025-12-08 - NOT A BUG

**Original Claim:** Subtasks of surviving parents that lose all tags become orphaned but aren't cleaned up.

**Why It's Not a Bug:** A subtask with a surviving parent is NOT orphaned - it's still accessible through its parent in the UI. The current logic is correct:

- A task is orphaned only if it has no tags, no project, AND no parent
- Subtasks always have a `parentId`, so they're never directly orphaned
- If a parent becomes orphaned, its subtasks ARE correctly deleted via `removeOrphanedTasks()`
- If a parent survives, its subtasks remain accessible through the parent

---

### 3. Race Conditions in TaskDueEffects

**File:** `src/app/features/tasks/store/task-due.effects.ts`
**Lines:** 40-65

Issues:

- Double sync wait (before AND after debounce)
- Multiple effects (`addTasksForTomorrow$`, `removeOverdueFormToday$`) compete on same signals
- Potential infinite loop if action triggers date change

**Fix:** Consolidate sync waits, ensure effects don't trigger each other.

---

### 4. Inconsistent Error Handling Across Effects

| File                       | Has Error Handling    |
| -------------------------- | --------------------- |
| `short-syntax.effects.ts`  | Yes (`catchError()`)  |
| `task-electron.effects.ts` | No                    |
| `idle.effects.ts`          | No                    |
| `tag.effects.ts`           | No (async operations) |

**Fix:** Standardize error handling pattern across all effects. Use `catchError()` with appropriate fallbacks.

---

## Medium Priority Issues

### 5. Missing Bounds Checking

**File:** `src/app/root-store/meta/task-shared-meta-reducers/planner-shared.reducer.ts`
**Line:** 247

```typescript
const targetIndex = taskIds.indexOf(toTaskId);
taskIds.splice(targetIndex, 0, fromTask.id); // What if indexOf returns -1?
```

If `toTaskId` not found, `targetIndex = -1`, and `splice(-1, 0, id)` inserts at wrong position.

---

### 6. TOCTOU Race in Compaction

**File:** `src/app/core/persistence/operation-log/store/operation-log-compaction.service.ts`
**Lines:** 66-93

Time-of-check-time-of-use between `getLastSeq()` and `deleteOpsWhere()`. New ops could be written between these calls.

---

### 7. State Capture ID Non-Deterministic

**File:** `src/app/core/persistence/operation-log/processing/state-change-capture.service.ts`
**Lines:** 354-360

`JSON.stringify(action)` hash is non-deterministic for object property order. Could cause capture ID mismatches.

---

### 8. LOCAL_ACTIONS Filter Edge Case

**File:** `src/app/util/local-actions.token.ts`
**Line:** 37

```typescript
return actions$.pipe(filter((action: Action) => !(action as any).meta?.isRemote));
```

Actions without `meta` field pass through (undefined !== true). Remote operations without explicit `isRemote: true` could trigger effects twice.

---

### 9. Duplicated TODAY_TAG Logic

**Locations:**

- `planner-shared.reducer.ts:158-234`
- `short-syntax-shared.reducer.ts:241-309`

Same logic for "moving to/from today" duplicated. Changes require updates in multiple places.

**Fix:** Extract to shared helper function.

---

### 10. getTag() Throws But Callers Don't Handle

**File:** `src/app/root-store/meta/task-shared-meta-reducers/task-shared-helpers.ts`
**Lines:** 51-80

Meta-reducers are synchronous and can't catch thrown errors. If `getTag()` throws, entire reducer chain fails.

**Fix:** Use `getTagOrUndefined()` pattern consistently, or add guards before calling `getTag()`.

---

### 11. Async Operations Without Error Handling

**File:** `src/app/features/tag/store/tag.effects.ts`
**Lines:** 101-118

```typescript
tap(async (tagIdsToRemove: string[]) => {
  await this._taskArchiveService.removeTagsFromAllTasks(tagIdsToRemove);
  // No error handling, effect completes before async finishes
});
```

**Fix:** Use proper async handling with `concatMap` and error boundaries.

---

### 12. Orphan Detection Doesn't Verify Project Exists

**File:** `src/app/root-store/meta/task-shared-meta-reducers/tag-shared.reducer.ts`
**Lines:** 105-108

Checks `!task.projectId` but doesn't verify project still exists (could be deleted in same batch).

---

## Testing Gaps

### Critical: Effects Coverage at 51%

**19 untested effect files:**

**Priority 1 (Core):**

- `src/app/imex/sync/sync.effects.ts` - Core sync engine
- `src/app/core-ui/layout/store/layout.effects.ts` - Navigation/panel management
- `src/app/features/tasks/store/task-related-model.effects.ts` - Task model sync
- `src/app/features/work-context/store/work-context.effects.ts` - Context switching

**Priority 2 (Features):**

- `src/app/features/project/store/project.effects.ts`
- `src/app/features/tag/store/tag.effects.ts`
- `src/app/features/tasks/store/short-syntax.effects.ts`
- `src/app/features/tasks/store/task-internal.effects.ts`
- `src/app/features/tasks/store/task-ui.effects.ts`
- Issue provider effects (caldav, gitlab, jira, open-project)

---

### Critical: Disabled Test Files

- `src/app/root-store/app-state/app-state.effects.spec.ts` - Completely commented out
- `src/app/features/note/store/note.effects.spec.ts` - Completely commented out
- `src/app/features/boards/store/boards.selectors.spec.ts` - Disabled

---

### Missing Meta-Reducer Tests

- `src/app/root-store/meta/task-shared-meta-reducers/issue-provider-shared.reducer.ts`
- `src/app/root-store/meta/task-shared-meta-reducers/task-repeat-cfg-shared.reducer.ts`

---

### Missing Integration Tests

- Race conditions (concurrent append + compaction)
- Error recovery (quota exceeded mid-write)
- Multi-tab coordination (lock deadlocks)
- 3-way conflict resolution
- Very large conflict sets (100+ ops on same entity)
- Network failure mid-pagination (2 tests marked `pending()`)

---

## Architecture Observations

### Well-Designed Aspects

1. **Meta-reducer pattern** - Atomic multi-entity operations ensure sync consistency
2. **Persistent action pattern** - Explicit `isPersistent: true` enables operation logging
3. **LOCAL_ACTIONS token** - Filters remote operations from side-effect triggers
4. **Entity adapters** - Normalized state with proper NgRx patterns
5. **Self-healing selectors** - `computeOrderedTaskIdsForTag()` dynamically computes membership
6. **TODAY_TAG virtual pattern** - Correctly implemented with cleanup for legacy data

### Concerns

1. **Meta-reducer ordering** - 10 ordered reducers create tight coupling; order changes break logic
2. **Action metadata duplication** - Easy to forget `isPersistent` or use incorrect `opType`
3. **Three-way relationships** - `task.tagIds`, `tag.taskIds`, `planner.days` require careful synchronization

---

## Prioritized Fix Recommendations

### Phase 1: Critical (Immediate) - COMPLETED

| #   | Issue              | Status                                 |
| --- | ------------------ | -------------------------------------- |
| 1   | Compaction counter | **FIXED** (2025-12-08)                 |
| 2   | ~~Memory leak~~    | FALSE POSITIVE - `take(1)` auto-cleans |

### Phase 2: High Priority (Current)

| #   | Issue                          | Status                      |
| --- | ------------------------------ | --------------------------- |
| 1   | Snapshot timing                | **FIXED** (2025-12-08)      |
| 2   | Subtask orphan detection       | FALSE POSITIVE (2025-12-08) |
| 3   | Race conditions                | task-due.effects.ts:40-65   |
| 4   | Error handling standardization | Multiple effects            |

### Phase 3: Add Tests

| #   | Test                                         | Priority |
| --- | -------------------------------------------- | -------- |
| 1   | Re-enable app-state.effects.spec.ts          | Critical |
| 2   | sync.effects.spec.ts (new)                   | Critical |
| 3   | issue-provider-shared.reducer.spec.ts (new)  | High     |
| 4   | task-repeat-cfg-shared.reducer.spec.ts (new) | High     |
| 5   | layout.effects.spec.ts (new)                 | High     |

### Phase 4: Medium Priority

- Bounds checking in planner-shared.reducer.ts
- Extract duplicated TODAY_TAG logic
- Fix getTag() error handling pattern
- Add async error handling in tag.effects.ts

---

## Related Documentation

- `docs/ai/sync/operation-log-implementation-review.md` - Detailed operation log review
- `docs/ai/operation-log-review-plan.md` - Original review plan
- `src/app/core/persistence/operation-log/docs/operation-log-architecture.md` - Architecture docs
- `docs/ai/today-tag-architecture.md` - TODAY_TAG virtual pattern
