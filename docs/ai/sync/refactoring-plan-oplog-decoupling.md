# Refactoring Plan: Decoupling Operation Log from Legacy Sync

**Based on:** `docs/ai/sync/operation-log-architecture.md`
**Status:** Draft
**Target Branch:** `feat/oplog-decoupling`

## 1. Executive Summary

We are refactoring the synchronization logic to strictly separate **Legacy Snapshot Sync** (WebDAV, Dropbox, LocalFile) from **Operation Log Sync** (Future Server).

The current "Hybrid" implementation in `SyncService` (running OpLog sync before Legacy sync) creates unnecessary complexity and potential data inconsistency.

## 2. Core Architectural Decisions

1.  **Mutually Exclusive Strategies**: A provider is either **Snapshot-based** OR **Event-based**. Never both.
2.  **LocalFileSync is Legacy**: It will use the Snapshot strategy (single `main.json`), avoiding the file system overhead of thousands of operation files.
3.  **Memory-Only Adapter for Legacy Reads**: When OpLog is primary:
    - `SUP_OPS` (IndexedDB) is the durable source of truth.
    - `pf` (Legacy IndexedDB) model tables are **NOT** written to during user actions.
    - `SaveToDbEffects` remains active but is configured to update **Memory Cache Only** (skipping disk writes).
    - Legacy Sync reads from this up-to-date Memory Cache to generate `main.json` for upload.

## 3. Proposed Changes

### 3.1. `SyncService` Refactoring (The Facade)

The `SyncService` will no longer contain sync logic. It will dispatch to a strategy.

```typescript
// Concept
async sync(): Promise<SyncStatus> {
  const provider = this.activeProvider;

  if (this.isOpLogProvider(provider)) {
    // Future Server Only
    return this.opLogStrategy.sync(provider);
  } else {
    // WebDAV, Dropbox, LocalFile
    return this.legacyStrategy.sync(provider);
  }
}
```

### 3.2. `LegacySnapshotStrategy` Extraction

Move the existing `SyncService` logic (lines ~110-end) into `LegacySnapshotSyncStrategy`.

- **Responsibilities**:
  - Manage `MetaModel` vector clocks.
  - Download `__meta` and `main.json`.
  - Merge logic (LWW).
  - Upload `main.json`.

### 3.3. `OpLogEventStrategy` Extraction

Encapsulate the logic currently in `SyncService` (lines ~100-108) and `OperationLogSyncService` interaction.

- **Responsibilities**:
  - Upload pending ops from `SUP_OPS`.
  - Download remote ops.
  - Detect & Resolve conflicts (Per-Entity).

### 3.4. "Memory-Only" Persistence Mode

We need to modify `SaveToDbEffects` and/or `ModelCtrl` to support a "Cache Only" write mode.

- **Current**: `modelCtrl.save(data)` -> Updates Memory Cache -> Writes to IndexedDB.
- **Required**: `modelCtrl.save(data, { skipDb: true })` -> Updates Memory Cache -> Skips IndexedDB.
- **Configuration**: `Pfapi` needs a flag (e.g., `persistenceMode: 'DISK' | 'MEMORY_ONLY'`) determined by the OpLog feature flag.

## 4. Implementation Steps

### Phase 1: Persistence Layer Preparation

1.  **Modify `ModelCtrl`**: Add support for `skipDb` option in `save()`.
2.  **Update `SaveToDbEffects`**: Inject global config. If OpLog is enabled, pass `skipDb: true` to `save()`.
3.  **Update `MetaModel`**: Ensure metadata (Vector Clocks) is **ALWAYS** written to disk (even in Memory-Only mode), as Legacy Sync needs persistent clocks.

### Phase 2: Strategy Extraction

4.  **Create `LegacySnapshotSyncStrategy`**: Copy logic from `SyncService`.
5.  **Create `OpLogEventStrategy`**: abstract `OperationLogSyncService` calls.

### Phase 3: Switchover

6.  **Update `SyncService`**: Implement the dispatch logic (Section 3.1).
7.  **Verify LocalFileSync**: Confirm it takes the Legacy path.

### Phase 4: Cleanup

8.  **Remove Dead Code**: Remove `_supportsOpLogSync` checks that tried to force OpLog on legacy providers.

## 5. Verification Plan

- **Test Case A (Legacy)**: Configure WebDAV. Create tasks. Sync.
  - _Expectation_: `main.json` updates on server. `ops/` folder is **NOT** created/touched.
- **Test Case B (Legacy)**: Configure LocalFileSync. Create tasks. Sync.
  - _Expectation_: Single JSON file updates. No `ops/` folder.
- **Test Case C (Future)**: (Mock) Server Provider.
  - _Expectation_: `ops/` uploads. `main.json` is untouched (or updated strictly as a backup if we decide to keep dual-write for safety, but architecture says "Legacy sync (optional backup)").

## 6. Open Questions / Risks

- **Legacy Downgrade**: If a user runs in "Memory-Only" mode for months, their `pf` IndexedDB is empty/stale. If they turn off OpLog, they lose data unless we implement a "Flush Memory to Disk" migration on switch-off.
  - _Mitigation_: Implement `MigrationService.flushMemoryToLegacyDb()` and run it when disabling OpLog.
