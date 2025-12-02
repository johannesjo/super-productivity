# Operation Log Sync: Execution Plan

**Created:** December 2, 2025
**Branch:** `feat/operation-logs`
**Status:** Implementation in Progress (~70% complete)
**Last Updated:** December 2, 2025

---

## 1. Executive Summary

The Operation Log system is now **always enabled** with a simplified architecture:

- **SUP_OPS** = Single persistence source of truth
- **NgRx** = Single runtime source of truth
- **PFAPI** = Sync protocol only (reads from NgRx via adapter)
- **No feature flags** = One implementation that always works

### 1.1 What's Done

| Component                   | Status | Notes                             |
| --------------------------- | ------ | --------------------------------- |
| SUP_OPS IndexedDB store     | ✅     | ops + state_cache tables          |
| NgRx effect capture         | ✅     | Converts actions to operations    |
| Vector clock tracking       | ✅     | Per-operation causality           |
| Snapshot + tail hydration   | ✅     | Fast startup from state_cache     |
| Genesis migration           | ✅     | Legacy pf → SUP_OPS on first run  |
| Multi-tab coordination      | ✅     | BroadcastChannel + Web Locks      |
| `PfapiStoreDelegateService` | ✅     | Reads NgRx state (Needs renaming) |

### 1.2 What's Left

| Task                      | Priority | Effort |
| ------------------------- | -------- | ------ |
| Create SyncStateAdapter   | HIGH     | Small  |
| Implement Sync Strategies | HIGH     | Medium |
| Refactor SyncService      | HIGH     | Medium |
| Disable SaveToDbEffects   | HIGH     | Small  |
| Add compaction triggers   | HIGH     | Small  |
| Audit action blacklist    | MEDIUM   | Medium |

---

## 2. Implementation Tasks

### 2.1 Create SyncStateAdapterService

**Status:** 🔲 Not Started

**Files to modify:**

- Rename `src/app/pfapi/pfapi-store-delegate.service.ts` to `src/app/core/persistence/sync-state-adapter.service.ts`
- Update `src/app/pfapi/pfapi.service.ts` references.

**Requirements:**

1.  **Load State:** Consolidate `getAllSyncModelDataFromStore` logic.
    - Reads NgRx state for active models.
    - Reads `pf` DB for non-NgRx models (archives, etc.).
2.  **Save State:** Implement `saveLocalState(data)`.
    - **OpLog Mode:** Saves snapshot to `SUP_OPS`, hydrates NgRx, updates `pf` DB metadata only.
    - **Legacy Mode (Fallback):** Updates `pf` DB model tables (if we ever need to support raw legacy mode again, though architecture says OpLog is always on).
    - _Note:_ Since OpLog is always on, `saveLocalState` basically means "Handle incoming sync data".

**Acceptance criteria:**

- [ ] Service handles both Read (for upload) and Write (from download) state access.
- [ ] Correctly combines NgRx state + Legacy DB non-NgRx models.

---

### 2.2 Implement Sync Strategies

**Status:** 🔲 Not Started

**Files to create:**

- `src/app/pfapi/api/sync/strategies/sync-strategy.interface.ts`
- `src/app/pfapi/api/sync/strategies/legacy-snapshot-sync.strategy.ts`
- `src/app/pfapi/api/sync/strategies/op-log-event-sync.strategy.ts`

**LegacySnapshotSyncStrategy:**

- Moves logic from `SyncService.sync()` (lines 110+).
- Handles `__meta` file check, vector clocks (from `MetaModel`), download/merge/upload of `main.json`.
- Uses `SyncStateAdapterService` to get/set local state.

**OpLogEventSyncStrategy:**

- Moves logic from `SyncService` (lines 100-108).
- Calls `OperationLogSyncService.uploadPendingOps` / `downloadRemoteOps`.
- Handles conflict resolution flow.

**Acceptance criteria:**

- [ ] Strategies implement common interface.
- [ ] Legacy strategy preserves exact existing behavior for WebDAV/Dropbox.

---

### 2.3 Refactor SyncService

**Status:** 🔲 Not Started

**Files to modify:**

- `src/app/pfapi/api/sync/sync.service.ts`

**Required change:**

- Inject strategies.
- `sync()` method becomes a simple dispatcher.

```typescript
async sync(): Promise<SyncStatus> {
  const provider = this._currentSyncProvider$.value;
  if (!provider) return { status: SyncStatus.NotConfigured };

  if (this.isOpLogProvider(provider)) {
    return this.opLogStrategy.sync(provider);
  } else {
    return this.legacyStrategy.sync(provider);
  }
}
```

**Acceptance criteria:**

- [ ] No hybrid sync logic (running OpLog then Legacy).
- [ ] LocalFileSync uses Legacy Strategy.
- [ ] Future Server uses OpLog Strategy.

---

### 2.4 Disable SaveToDbEffects

**Status:** 🔲 Not Started

**Files to modify:**

- `src/app/root-store/shared/save-to-db.effects.ts`

**Required change:**

- Disable/Remove effects that write **Model Data** (task, project, tag, etc.) to `pf` DB.
- **KEEP:** Effects that might update UI state or other non-persisted things if any (likely none).
- **KEEP:** Persistence for non-NgRx models if they are handled there (they are not, they are manual).

**Acceptance criteria:**

- [ ] `pf` database model tables do NOT update on user actions.
- [ ] App state persists solely via `OperationLogEffects` -> `SUP_OPS`.

---

### 2.5 Add Compaction Triggers

**Status:** 🔲 Not Started

**Files to modify:**

- `src/app/core/persistence/operation-log/operation-log.effects.ts`
- `src/app/core/persistence/operation-log/operation-log-compaction.service.ts`

**Required change:**

- Trigger compaction after N ops (e.g., 500).
- Ensure compaction reads state from `SyncStateAdapterService` (NgRx), NOT from stale `pf` DB.

**Acceptance criteria:**

- [ ] Compaction runs periodically.
- [ ] Snapshots are accurate to runtime state.

---

### 2.6 Audit Action Blacklist

**Status:** 🔲 Not Started

**File to modify:**

- `src/app/core/persistence/operation-log/action-whitelist.ts` (Rename to `action-blacklist.ts`)

**Required change:**

- Audit all actions.
- Blacklist transient UI actions.

**Acceptance criteria:**

- [ ] UI actions do not spam the Op Log.

---

## 3. Testing Checklist

### 3.1 Legacy Sync Verification

- [ ] **WebDAV:** Connect, Sync. Ensure `main.json` updates. Ensure `ops/` is NOT created.
- [ ] **Dropbox:** Connect, Sync. Ensure correct behavior.
- [ ] **LocalFile:** Connect, Sync. Ensure single file updates.

### 3.2 Op Log Persistence Verification

- [ ] Create Task -> Reload App -> Task exists (loaded from SUP_OPS).
- [ ] Check `pf` DB (Task table should be empty/stale).

---

## 4. References

- [Architecture](./operation-log-architecture.md)
- [Decoupling Plan](./refactoring-plan-oplog-decoupling.md)
