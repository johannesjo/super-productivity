# Operation Log Architecture Review & Plan

**Date:** Monday, December 8, 2025
**Status:** Planning
**Module:** `src/app/core/persistence/operation-log/`
**Last Updated:** December 8, 2025 (added compaction counter bug, validated findings)

## Executive Summary

A comprehensive architectural analysis of the `operation-log` module has identified **one remaining critical issue**: a data loss risk in the file-based synchronization mechanism (WebDAV/Dropbox/etc.). The compaction counter bug has been fixed. This document outlines the findings and the proposed implementation plan to address remaining issues.

## 1. Critical Findings

### ✅ ~~Critical Bug: Compaction Counter Never Persists~~ - FIXED

**Severity:** Critical
**Location:** `OperationLogStoreService.incrementCompactionCounter` (lines 434-439)
**Status:** Fixed on 2025-12-08

**Original Issue:** When no state cache existed, the function returned `1` without persisting that value. The compaction threshold was never reached.

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

### 🚨 Data Loss Risk in Manifest Sync (File-Based Providers)

**Severity:** Critical
**Location:** `OperationLogManifestService.uploadRemoteManifest` & `OperationLogUploadService`

**The Issue:**
When uploading the list of operation files (`manifest.json`), the service explicitly forces an overwrite (`revToMatch: null`, `force: true`). This creates a "Lost Update" race condition.

**Scenario:**

1.  **Client A** reads manifest: `['file1']`.
2.  **Client B** reads manifest: `['file1']`.
3.  **Client A** uploads `file2`, writes manifest: `['file1', 'file2']`.
4.  **Client B** uploads `file3`, writes manifest: `['file1', 'file3']`.

**Outcome:**
`file2` (Client A's data) is orphaned. **Client C** will never see Client A's operations. If `file3` depends on `file2` (e.g., Update Task vs Create Task), Client C will crash or have corrupted state.

**Recommendation:**
Implement Optimistic Locking.

- `loadRemoteManifest` must return the file's `rev` (revision ID).
- `uploadRemoteManifest` must accept `revToMatch`.
- Implement a retry loop: if upload fails due to conflict (412), re-download, merge file lists (union), and retry.

---

### ⚠️ Performance Bottleneck in Compaction

**Severity:** High
**Location:** `OperationLogStoreService.deleteOpsWhere`

**The Issue:**
Compaction deletes old operations based on the `appliedAt` timestamp. However, the IndexedDB store only has indexes for `byId` and `bySyncedAt`.

**Impact:**
Compaction performs a full table scan of the `ops` store. As the log grows (the very problem compaction solves), this operation becomes slower ($O(N)$), potentially causing UI jank or locking timeouts during the critical compaction phase.

**Recommendation:**
Update `DB_VERSION` and add an index for `appliedAt` in `OperationLogStoreService.init()`.

---

### ⚠️ UX Deadlock in Conflict Resolution

**Severity:** Medium
**Location:** `ConflictResolutionService`

**The Issue:**
If the user cancels the Conflict Resolution dialog (e.g., clicks outside or presses Escape), the service returns without applying any changes or advancing the sync state.

**Impact:**
The sync cycle aborts. The next sync attempt will likely hit the exact same conflict, prompting the user again. This creates a "stuck" state where the user is pestered indefinitely until they resolve it.

**Recommendation:**
Treat "Cancel" as "Defer" (pause sync temporarily) or provide a "Skip/Ignore" option that allows other non-conflicting ops to proceed (with strict dependency checks). At minimum, log a clear warning that sync is stalled.

## 2. Architectural Observations

- **Redundant Logic:** `ConflictResolutionService` (Step 3) duplicates the logic of applying operations found in `OperationApplierService` (error handling, snackbars, etc.). This violates DRY and risks inconsistent behavior.
  - _Plan:_ Refactor `ConflictResolutionService` to delegate fully to `OperationApplier`.
- **Locking Integrity:** `OperationLogEffects` (writer) and `OperationLogCompactionService` (cleaner) correctly use the `sp_op_log` lock, preventing race conditions during snapshot creation.
- **Fresh Client Safety:** The `isWhollyFreshClient` check in `OperationLogSyncService` correctly safeguards against accidental remote overwrites by empty clients.
- **Cache Self-Invalidation:** The `_appliedOpIdsCache` uses sequence-based invalidation which works correctly (not a bug as previously thought).

## 3. Missing Test Coverage

The current test suite lacks coverage for distributed system edge cases:

1.  **Manifest Concurrency:** No tests simulate two clients updating the manifest simultaneously to reproduce the lost update scenario.
2.  **Compaction Race:** No tests verify that `append` waits for `compact` (locking verification).
3.  **Partial Sync:** No tests for scenarios where a client downloads `file1` but fails to download `file2` (network error).
4.  **Compaction Counter Persistence:** No test verifies counter is persisted when cache doesn't exist.

## 4. Implementation Plan

### Phase 1: Fix Critical Bugs (High Priority)

1.  **Fix Compaction Counter Bug:**

    - **File:** `src/app/core/persistence/operation-log/store/operation-log-store.service.ts`
    - **Lines:** 428-447
    - **Change:** Persist counter=1 when no cache exists.

2.  **Modify `OperationLogManifestService`:**

    - Update `loadRemoteManifest` to return `{ manifest, rev }`.
    - Update `uploadRemoteManifest` to accept `revToMatch`.

3.  **Update `OperationLogUploadService`:**
    - Implement the read-modify-write loop with retries for `_uploadPendingOpsViaFiles`.
    - Logic: `while (retries < max) { load(rev) -> merge -> upload(rev) }`

### Phase 2: Optimize Store Indexes

1.  **Update `OperationLogStoreService`:**
    - Increment `DB_VERSION`.
    - Add `opStore.createIndex('byAppliedAt', 'appliedAt')` in the upgrade callback.
    - Optimize `deleteOpsWhere` to use `IDBKeyRange.upperBound` on the new index.

### Phase 3: Refactor Conflict Resolution

1.  **Refactor `ConflictResolutionService`:**
    - Remove custom batch application logic.
    - Use `OperationApplierService.applyOperations` directly.

### Phase 4: Enhance Test Suite

1.  Create `manifest-concurrency.spec.ts` to reproduce the lost update scenario and verify the fix.
2.  Create `compaction-counter.spec.ts` to verify counter persistence.
3.  Add performance benchmarks for compaction with large datasets.
