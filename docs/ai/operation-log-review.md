# Operation Log Implementation Review

## Overview

This document outlines suggestions for improving the robustness, data integrity, and performance of the Operation Log implementation (`src/app/core/persistence/operation-log/`). These findings are based on a static analysis of the current codebase.

## 1. Conflict Detection & Stale Operations

**Location:** `OperationLogSyncService.detectConflicts`

**Current Behavior:**
The code currently checks if the relationship between the local frontier and the remote operation is `CONCURRENT`. If it is, it flags a conflict. If it is _not_ concurrent, it assumes the remote operation is safe to apply.

**Issue:**
This logic fails to account for cases where the local state "dominates" the remote operation (Comparison result: `GREATER_THAN`) or is identical (`EQUAL`). In these scenarios, the remote operation is stale (already applied or obsolete). By treating it as "non-conflicting," the system will re-apply this old operation, effectively overwriting newer local changes with older data.

**Suggestion:**
Modify `detectConflicts` to explicitly check for `GREATER_THAN` and `EQUAL`.

- If **Local > Remote** (Local dominates): Ignore the remote operation. It is obsolete.
- If **Local == Remote**: Ignore the remote operation. It is a duplicate.
- If **Local < Remote** (Remote dominates): Apply the operation (Fast-forward).
- If **Concurrent**: Flag as conflict.

## 2. Compaction Consistency & Race Conditions

**Location:** `OperationLogEffects` and `OperationLogCompactionService`

**Current Behavior:**
Compaction is triggered asynchronously via `this.triggerCompaction()` inside `OperationLogEffects`. It runs independently of the operation write lock.

**Issue:**
There is a potential race condition. `OperationLogCompactionService.compact()` captures the current NgRx state and the current `lastSeq`. However, because this runs in parallel with the main thread processing new actions, it is possible for:

1. The State to include changes from operation `N+1`.
2. The `lastSeq` to be recorded as `N`.
   This mismatch invalidates the snapshot invariant (State = Apply(Snapshot, Ops > lastSeq)).

**Suggestion:**
Serialize the compaction process with the operation writing process.

- Use the `LockService` to ensure that no new operations are written to the log or applied to the store while the snapshot is being generated.
- Ensure `lastSeq` and the `state` capture happen atomically relative to the operation stream.

## 3. Optimistic UI Rollback

**Location:** `OperationLogEffects.writeOperation`

**Current Behavior:**
The code wraps the persistence logic in a `try/catch` block. However, the error handling logic is currently commented out:

```typescript
// this.notifyUserAndTriggerRollback(action);
```

**Issue:**
If writing to IndexedDB fails (e.g., quota exceeded, disk error), the UI has already updated optimistically. The user sees the change, but it is not saved. If the app is reloaded, the data effectively "disappears."

**Suggestion:**
Implement the `notifyUserAndTriggerRollback` method. This should:

1. Notify the user via a global error toast.
2. Dispatch an undo/rollback action to the NgRx store to revert the UI state to match the persistent state.

## 4. Vector Clock & Frontier Management

**Location:** `OperationLogStoreService`

**Current Behavior:**
`getCurrentVectorClock` and `getEntityFrontier` reconstruct the vector clock by merging the snapshot's clock with all subsequent operations in the log.

**Issue:**
As the number of operations between snapshots grows (up to `COMPACTION_THRESHOLD` or more if compaction fails), this calculation becomes more expensive, potentially impacting sync performance.

**Suggestion:**

- Explicitly store the "Frontier Vector Clock" in the `state_cache` alongside the state snapshot.
- Maintain an in-memory cache of the current Vector Clock in `OperationLogStoreService` that is updated on every `append`, avoiding the need to re-scan the log for every check.

## 5. Hard Dependency Retry Logic

**Location:** `OperationApplierService`

**Current Behavior:**
Operations with missing hard dependencies are retried `MAX_RETRY_ATTEMPTS` (3) times.

**Suggestion:**
Consider scenarios where dependencies arrive strictly out of order (e.g., during a bulk sync). A fixed retry count of 3 might be insufficient if the dependency is the 10th operation in the queue.

- **Improvement:** Instead of a fixed count, use a "pass" system. Retry pending operations every time a _new_ operation is successfully applied (which might resolve the dependency). Only fail permanently if no progress is made after a full cycle of processing available operations.
