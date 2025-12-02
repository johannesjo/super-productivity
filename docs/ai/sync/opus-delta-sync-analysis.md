# Delta Sync Root-Cause Analysis

**Model:** Claude Opus 4.5
**Date:** December 2, 2025
**Branch Analyzed:** `feat/sync-server`

---

## 1. Executive Summary

The delta-sync implementation in Super Productivity's `feat/sync-server` branch represents an ambitious attempt to move from whole-file synchronization to granular entity-level synchronization. After deep analysis of the actual codebase, this document identifies the fundamental architectural issues causing instability.

**Key Finding:** The implementation conflates two distinct synchronization paradigms—**state-based delta sync** (comparing snapshots) and **operation-based sync** (exchanging changes)—without fully committing to either. This hybrid creates compounding complexity that manifests as data loss, false conflicts, and difficult-to-diagnose edge cases.

---

## 2. Architecture Overview

### 2.1 Current Implementation Structure

The delta-sync is implemented across several key components:

| Component                            | Location                      | Responsibility                                                                  |
| ------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------- |
| `SuperSyncProvider`                  | `super-sync.ts` (940 lines)   | IDB shadow state, watermarks, delta vs blob mode switching, granular encryption |
| `SyncService`                        | `sync.service.ts` (755 lines) | Orchestration, vector clock comparison, conflict detection, auto-merge attempts |
| `diff-utils.ts`                      | `diff-utils.ts`               | Entity-level diffing (`createDiff`) and merging (`mergeChanges`)                |
| `vector-clock.ts`                    | `vector-clock.ts` (403 lines) | Vector clock operations for causality tracking                                  |
| `get-sync-status-from-meta-files.ts` | Utility                       | Determines sync direction from metadata comparison                              |

### 2.2 Intended Data Flow

```
Upload:
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ Current     │───▶│ Load Shadow  │───▶│ createDiff()│───▶│ Push Changes│
│ NgRx State  │    │ from IDB     │    │             │    │ to Server   │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘

Download:
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Server      │───▶│ getChanges() │───▶│ mergeChanges()  │───▶│ Update      │
│ Changes     │    │ since=X      │    │ into local state│    │ Shadow+IDB  │
└─────────────┘    └──────────────┘    └─────────────────┘    └─────────────┘
```

---

## 3. Root Cause Analysis

### 3.1 The Shadow State Consistency Problem

**Where it originates:** `super-sync.ts:233-291`

The delta-sync model requires maintaining a "shadow state"—a cached copy of data as it existed after the last successful sync. This shadow state is stored in IndexedDB and used as the baseline for diff calculations.

```typescript
private async _loadShadowState(modelId: string, encryptionKey?: string): Promise<unknown> {
  if (!BLOB_MODELS.has(modelId) && this.lastSyncedState.has(modelId)) {
    return this.lastSyncedState.get(modelId);  // Memory cache
  }
  const db = await this._dbPromise;
  const state = await db.get('shadow_state', modelId);
  // ... encryption handling ...
}
```

**Why it causes problems:**

1. **Dual-Cache Inconsistency:** Shadow state exists both in-memory (`lastSyncedState` Map) and in IndexedDB. These can drift apart if:

   - App crashes after memory update but before IDB write
   - IDB write fails silently
   - Browser clears IDB but memory persists (unlikely but possible during dev)

2. **No Integrity Verification:** There's no checksum or validation that shadow state matches actual server state. If corruption occurs, the client generates incorrect diffs indefinitely.

3. **Encryption Mode Ambiguity:** Shadow state can be encrypted (`IDB_ENC__` prefix) or plaintext. The code at line 250 silently returns `null` if decryption fails, triggering a full sync—a silent data recovery that may mask underlying issues.

### 3.2 The Watermark Reliability Problem

**Where it originates:** `super-sync.ts:293-308`

Watermarks track the "last sync point" per model—a revision number from the server.

```typescript
private async _loadWatermark(modelId: string): Promise<number> {
  if (this.lastSyncs.has(modelId)) {
    return this.lastSyncs.get(modelId) || 0;
  }
  const db = await this._dbPromise;
  const watermark = await db.get('watermarks', modelId);
  const val = watermark || 0;
  this.lastSyncs.set(modelId, val);
  return val;
}
```

**Why it causes problems:**

1. **Watermark-Shadow Desynchronization:** Watermark and shadow state are updated separately. If one update succeeds and the other fails, the client enters an inconsistent state where it either:

   - Has a newer watermark than its shadow (misses changes)
   - Has an older watermark than its shadow (re-downloads changes)

2. **No Atomic Updates:** Lines 543-545 and 698-700 show watermark and shadow saved separately:

   ```typescript
   await this._saveShadowState(modelId, currentData, encryptionKey);
   await this._saveWatermark(modelId, result.lastSync);
   ```

   Any failure between these calls leaves state inconsistent.

3. **Watermark Interpretation Confusion:** The watermark is described as a "revision" in docs but treated as a timestamp in some code paths. The variable name `lastSync` (from server response) suggests time, but the architecture doc explicitly states it's a monotonic sequence number.

### 3.3 The Vector Clock Governance Gap

**Where it originates:** `vector-clock.ts:121-175` and `get-sync-status-from-meta-files.ts:116-190`

Vector clocks are used for causality tracking, but their governance is incomplete:

```typescript
// vector-clock.ts:126-137
if (isVectorClockEmpty(a) && isVectorClockEmpty(b)) {
  PFLog.err('BOTH VECTOR CLOCKS EMPTY!!!');
  return VectorClockComparison.CONCURRENT; // Treats empty as conflict!
}
```

**Why it causes problems:**

1. **Empty Clock = Conflict:** When both clocks are empty (fresh install, data migration), the system returns `CONCURRENT`, triggering conflict dialogs for what should be a clean state.

2. **Missing Client Detection Failure:** The `hasVectorClockChanges` function (lines 288-323) checks if a client is missing from the current clock, but this breaks when:

   - A client is legitimately removed (pruning at 50 clients)
   - Clock is corrupted and rebuilt
   - Migration from timestamp-based to vector clock system

3. **Pruning Causality Loss:** When the vector clock exceeds 50 entries (`MAX_VECTOR_CLOCK_SIZE`), older clients are pruned (lines 343-379). This loses causality information and can cause:
   - Legitimate changes from pruned clients to be detected as conflicts
   - Re-sync loops when pruned client reconnects

### 3.4 The Divergence Detection Timing Problem

**Where it originates:** `super-sync.ts:544-562` (upload path)

Divergence is detected reactively—only when the server rejects a push:

```typescript
if (result.rejected && result.rejected.length > 0) {
  const divergence = result.rejected.find((r) => r.reason === 'BASE_REV_BEHIND');
  if (divergence) {
    throw new Error('DIVERGENCE_DETECTED');
  }
}
```

**Why it causes problems:**

1. **No Pre-flight Validation:** The client doesn't check if its watermark is valid before pushing. It optimistically sends changes and only discovers divergence after the server rejects them.

2. **Recovery Path Risk:** When `DIVERGENCE_DETECTED` is thrown, `sync.service.ts` triggers `downloadAll()`, which:

   - Creates a fake `lastSyncedUpdate = 1` (line 363-364)
   - Downloads everything without preserving local uncommitted changes
   - Only creates emergency backup on critical errors, not on divergence

3. **Race Window:** Between checking watermark and receiving server response, another client could push changes, creating a race condition where:
   - Client A reads watermark=100
   - Client B pushes, watermark becomes 101
   - Client A pushes with baseRevision=100
   - Server rejects (BASE_REV_BEHIND)
   - Client A downloads all, potentially losing in-flight changes

### 3.5 The BLOB vs DELTA Mode Ambiguity

**Where it originates:** `super-sync.ts:69-77` and upload logic starting at line 400

```typescript
const BLOB_MODELS = new Set<string>([
  'globalConfig',
  'reminders',
  'planner',
  'boards',
  'menuTree',
  'timeTracking',
  'pluginUserData',
  'pluginMetadata',
  'archiveYoung',
  'archiveOld',
  '__meta_',
]);
```

**Why it causes problems:**

1. **Implicit Mode Detection:** The code tries to auto-detect mode at runtime:

   ```typescript
   try {
     currentData = JSON.parse(dataStr);
     if (!currentData || !Array.isArray(currentData.ids)) {
       isBlob = true; // Doesn't look like entity state
     }
   } catch (e) {
     isBlob = true; // Can't parse, must be blob
   }
   ```

   This heuristic fails when:

   - Entity state is corrupted (missing `ids` array)
   - JSON structure changes between versions
   - Encrypted content is double-encoded

2. **Different Merge Semantics:** BLOB models use last-write-wins (whole object replacement), while ENTITY models use field-level merging. If mode detection is wrong, data is either:
   - Over-merged (treating blob as entities, creating Frankenstein objects)
   - Under-merged (treating entities as blobs, losing field-level changes)

### 3.6 The Concurrency Control Gap

**Where it originates:** `super-sync.ts:175-205` (lock mechanism)

```typescript
private async _acquireLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  let release: () => void;
  const currentLock = this._locks.get(key) || Promise.resolve();
  const newLock = new Promise<void>((resolve) => { release = resolve; });
  // ... chaining logic ...
}
```

**Why it causes problems:**

1. **Per-Model Locking Only:** Locks are per-model (e.g., separate locks for `task` and `project`). Cross-model operations (like moving a task to a different project) aren't atomic.

2. **Meta File Lock Skipped for SuperSync:** Line 673 in `meta-sync.service.ts`:

   ```typescript
   if (syncProvider.id !== SyncProviderId.SuperSync) {
     // Lock meta file
   }
   ```

   SuperSync explicitly skips meta file locking, relying on server-side revision checks. But if two clients push simultaneously with the same base revision, both may pass the check.

3. **No Cross-Tab Coordination:** The lock is per-browser-tab (in-memory). If the user has multiple tabs open, they each have independent locks and can conflict.

---

## 4. Manifestation of Problems

### 4.1 Symptom: "Ghost" Changes

**User Experience:** User makes changes on Device A, syncs, then Device B shows old data even after syncing.

**Root Cause Chain:**

1. Device A pushes changes successfully
2. Device B has stale watermark (watermark-shadow desync)
3. Device B's `getChanges(since=staleWatermark)` returns empty (already has those changes in shadow, but shadow is corrupted)
4. Device B thinks it's in sync, doesn't download new changes

### 4.2 Symptom: Spurious Conflict Dialogs

**User Experience:** User gets conflict prompts even when only one device was used.

**Root Cause Chain:**

1. Vector clock is empty or corrupted after app update/reinstall
2. `compareVectorClocks` returns `CONCURRENT` for empty clocks
3. `getSyncStatusFromMetaFiles` returns `SyncStatus.Conflict`
4. User is prompted to choose between local/remote even though there's no real conflict

### 4.3 Symptom: Data Loss After Conflict Resolution

**User Experience:** User chooses "keep local" in conflict dialog but some local changes are lost.

**Root Cause Chain:**

1. Auto-merge fails (line 884-896 in sync.service.ts)
2. Fallback triggers `downloadAll()`
3. Emergency backup created, but user doesn't know where to find it
4. Local uncommitted changes (in shadow but not synced) are overwritten

---

## 5. Why Stabilization is Difficult

### 5.1 Architectural Coupling

The delta-sync implementation is deeply coupled to:

- NgRx state shape (assumes `ids` and `entities` structure)
- IDB schema (shadow_state, watermarks stores)
- Server API contract (`/api/sync/changes` request/response format)
- Encryption system (two modes: whole-file and granular)

Changing any one of these requires coordinated changes across all others.

### 5.2 State Space Explosion

The system has multiple independent states that must remain consistent:

- NgRx in-memory state
- IndexedDB persisted state
- Shadow state (memory + IDB)
- Watermarks (memory + IDB)
- Server state
- Vector clocks (local + remote)

The number of possible inconsistent states grows combinatorially.

### 5.3 Testing Complexity

The existing tests (`diff-utils.spec.ts`, `super-sync.spec.ts`) focus on happy paths. Edge cases like:

- Concurrent pushes from multiple devices
- Partial network failures mid-sync
- IDB corruption recovery
- Vector clock overflow/pruning

...are either untested or marked as disabled (`xdescribe` in sync-fixes.spec.ts).

---

## 6. Identified Technical Debt

| Location                                | Issue                                               | Risk                                                |
| --------------------------------------- | --------------------------------------------------- | --------------------------------------------------- |
| `super-sync.ts:805`                     | "TODO: This will likely fail if WebDAV is disabled" | WebDAV fallback removed but code path remains       |
| `super-sync.ts:911`                     | "TODO: Check expiry?"                               | JWT tokens never validated for expiry               |
| `get-sync-status-from-meta-files.ts:18` | "TODO unit test the hell out of this"               | Critical sync logic under-tested                    |
| `sync.service.ts:176`                   | "TODO check for problems"                           | Model version check has known issues                |
| `vector-clock.ts:210-215`               | Overflow reset to 1                                 | Loses history, comparison with old clocks incorrect |

---

## 7. Assumptions Made in This Analysis

1. **Server Implementation is Correct:** This analysis assumes the SuperSync server (`/api/sync/changes`) correctly implements the documented behavior. Server bugs could cause additional issues not covered here.

2. **IDB is Reliable:** IndexedDB is assumed to be functionally correct. Browser-specific IDB bugs (especially in Safari/WebKit) could cause additional failures.

3. **Network is Eventually Available:** The analysis assumes eventual connectivity. Prolonged offline operation followed by sync has additional edge cases.

4. **Single User Per Account:** The system is designed for personal use. Multi-user access to the same account would create additional conflict scenarios.

---

## 8. Conclusion

The delta-sync implementation in `feat/sync-server` suffers from **fundamental architectural issues** rather than simple bugs. The core problems are:

1. **No atomic state transitions** between shadow state, watermarks, and server state
2. **Vector clock governance gaps** that create false positives and lose causality
3. **Reactive divergence detection** that's too late to prevent data loss
4. **Implicit mode switching** between BLOB and DELTA that can misclassify data

These issues compound in production, creating hard-to-reproduce bugs that erode user trust in the sync system. Stabilization would require either:

- **Deep architectural changes** to make state transitions atomic and verifiable, OR
- **Switching to a different synchronization paradigm** (such as operation-log-based sync) that has better formal properties

The operation-log approach in `feat/operation-logs` attempts the latter, trading state-comparison complexity for operation-ordering complexity—a different set of tradeoffs analyzed in the companion document.
