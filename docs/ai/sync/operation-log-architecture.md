# Operation Log Architecture

**Status:** Parts A, B, C Implemented
**Branch:** `feat/operation-logs`
**Last Updated:** December 3, 2025 (rollback + rejected ops)

---

## Overview

The Operation Log serves **three distinct purposes**:

| Purpose                   | Description                                   | Status      |
| ------------------------- | --------------------------------------------- | ----------- |
| **A. Local Persistence**  | Fast writes, crash recovery, event sourcing   | Complete ✅ |
| **B. Legacy Sync Bridge** | Vector clock updates for PFAPI sync detection | Complete ✅ |
| **C. Server Sync**        | Upload/download individual operations         | Complete ✅ |

This document is structured around these three purposes. Most complexity lives in **Part A** (local persistence). **Part B** is a thin bridge to PFAPI. **Part C** handles operation-based sync with servers.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Action                                   │
└────────────────────────────────────────────────────────────────────┘
                             ▼
                        NgRx Store
                  (Runtime Source of Truth)
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   │                   ▼
   OpLogEffects              │             Other Effects
         │                   │
         ├──► SUP_OPS ◄──────┘
         │    (Local Persistence - Part A)
         │
         └──► META_MODEL vector clock
              (Legacy Sync Bridge - Part B)

         PFAPI reads from NgRx for sync (not from op-log)
```

---

# Part A: Local Persistence

The operation log is primarily a **Write-Ahead Log (WAL)** for local persistence. It provides:

1. **Fast writes** - Small ops are instant vs. serializing 5MB on every change
2. **Crash recovery** - Replay uncommitted ops from log
3. **Event sourcing** - Full history of user actions for debugging/undo

## A.1 Database Architecture

### SUP_OPS Database

```typescript
// ops table - the event log
interface OperationLogEntry {
  seq: number; // Auto-increment primary key
  op: Operation; // The operation
  appliedAt: number; // When applied locally
  source: 'local' | 'remote';
  syncedAt?: number; // For server sync (Part C)
  rejectedAt?: number; // When rejected during conflict resolution
}

// state_cache table - periodic snapshots
interface StateCache {
  state: AllSyncModels; // Full snapshot
  lastAppliedOpSeq: number;
  savedAt: number;
  schemaVersion: number;
}
```

### Relationship to 'pf' Database

```
┌─────────────────────────────────────────────────────────────────────┐
│                         IndexedDB                                    │
├────────────────────────────────┬────────────────────────────────────┤
│      'pf' database             │      'SUP_OPS' database            │
│      (PFAPI Metadata)          │      (Operation Log)               │
│                                │                                    │
│  ┌──────────────────────┐      │  ┌──────────────────────┐          │
│  │ META_MODEL           │◄─────┼──│ ops (event log)      │          │
│  │ - vectorClock        │      │  │ state_cache          │          │
│  │ - revMap             │      │  └──────────────────────┘          │
│  │ - lastSyncedUpdate   │      │                                    │
│  └──────────────────────┘      │  ALL model data persisted here     │
│                                │                                    │
│  Model tables NOT used         │                                    │
└────────────────────────────────┴────────────────────────────────────┘
```

**Key insight:** The `pf` database is only for PFAPI sync metadata. All model data (task, project, tag, etc.) is persisted in SUP_OPS.

## A.2 Write Path

```
User Action
    │
    ▼
NgRx Dispatch (action)
    │
    ├──► Reducer updates state (optimistic, in-memory)
    │
    └──► OperationLogEffects
              │
              ├──► Filter: action.meta.isPersistent === true?
              │         └──► Skip if false or missing
              │
              ├──► Filter: action.meta.isRemote === true?
              │         └──► Skip (prevents re-logging sync/replay)
              │
              ├──► Convert action to Operation
              │
              ├──► Append to SUP_OPS.ops (disk)
              │
              ├──► Increment META_MODEL.vectorClock (Part B bridge)
              │
              └──► Broadcast to other tabs
```

### Operation Structure

```typescript
interface Operation {
  id: string; // UUID v7 (time-ordered)
  actionType: string; // NgRx action type
  opType: OpType; // CRT | UPD | DEL | MOV | BATCH
  entityType: EntityType; // TASK | PROJECT | TAG | NOTE | ...
  entityId?: string; // Affected entity ID
  entityIds?: string[]; // For batch operations
  payload: unknown; // Action payload
  clientId: string; // Device ID
  vectorClock: VectorClock; // Per-op causality (for Part C)
  timestamp: number; // Wall clock (epoch ms)
  schemaVersion: number; // For migrations
}

type OpType = 'CRT' | 'UPD' | 'DEL' | 'MOV' | 'BATCH' | 'SYNC_IMPORT' | 'BACKUP_IMPORT';
```

### Persistent Action Pattern

Actions are persisted based on explicit `meta.isPersistent: true`:

```typescript
// persistent-action.interface.ts
export interface PersistentActionMeta {
  isPersistent?: boolean; // When true, action is persisted
  entityType: EntityType;
  entityId?: string;
  entityIds?: string[]; // For batch operations
  opType: OpType;
  isRemote?: boolean; // TRUE if from Sync (prevents re-logging)
  isBulk?: boolean; // TRUE for batch operations
}

// Type guard - only actions with explicit isPersistent: true are persisted
export const isPersistentAction = (action: Action): action is PersistentAction => {
  const a = action as PersistentAction;
  return !!a.meta && a.meta.isPersistent === true;
};
```

Actions that should NOT be persisted:

- UI-only actions (selectedTaskId, currentTaskId, toggle sidebar, etc.)
- Load/hydration actions (data already in log)
- Upsert actions (typically from sync/import)
- Internal cleanup actions

## A.3 Read Path (Hydration)

```
App Startup
    │
    ▼
OperationLogHydratorService
    │
    ├──► Load snapshot from SUP_OPS.state_cache
    │         │
    │         └──► If no snapshot: Genesis migration from 'pf'
    │
    ├──► Run schema migration if needed
    │
    ├──► Dispatch loadAllData(snapshot, { isHydration: true })
    │
    └──► Load tail ops (seq > snapshot.lastAppliedOpSeq)
              │
              └──► Replay ops (prevents re-logging via isRemote flag)
```

### Genesis Migration

On first startup (SUP_OPS empty):

```typescript
async createGenesisSnapshot(): Promise<void> {
  // Load ALL models from legacy pf database
  const allModels = await this.pfapiService.pf.getAllSyncModelData();

  // Create initial snapshot
  await this.opLogStore.saveStateCache({
    state: allModels,
    lastAppliedOpSeq: 0,
    savedAt: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION
  });
}
```

## A.4 Compaction

### Purpose

Without compaction, the op log grows unbounded. Compaction:

1. Creates a fresh snapshot from current NgRx state
2. Deletes old ops that are "baked into" the snapshot

### Triggers

- Every **500 operations**
- After sync download (safety)
- On app close (optional)

### Process

```typescript
async compact(): Promise<void> {
  // 1. Acquire lock
  await this.lockService.request('sp_op_log_compact', async () => {
    // 2. Read current state from NgRx (via delegate)
    const currentState = await this.storeDelegate.getAllSyncModelDataFromStore();

    // 3. Save new snapshot
    const lastSeq = await this.opLogStore.getLastSeq();
    await this.opLogStore.saveStateCache({
      state: currentState,
      lastAppliedOpSeq: lastSeq,
      vectorClock: await this.opLogStore.getCurrentVectorClock(),
      compactedAt: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION
    });

    // 4. Delete old ops (sync-aware)
    // Only delete ops that have been synced AND are older than retention window
    const retentionWindowMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoff = Date.now() - retentionWindowMs;

    await this.opLogStore.deleteOpsWhere(
      (entry) =>
        !!entry.syncedAt && // never drop unsynced ops
        entry.appliedAt < cutoff &&
        entry.seq <= lastSeq
    );
  });
}
```

### Configuration

| Setting            | Value   | Description               |
| ------------------ | ------- | ------------------------- |
| Compaction trigger | 500 ops | Ops before snapshot       |
| Retention window   | 7 days  | Keep recent synced ops    |
| Unsynced ops       | ∞       | Never delete unsynced ops |

## A.5 Multi-Tab Coordination

### Write Locking

```typescript
// Primary: Web Locks API
await navigator.locks.request('sp_op_log_write', async () => {
  await this.writeOperation(op);
});

// Fallback: localStorage mutex (for older WebViews)
```

### State Broadcast

When one tab writes an operation:

1. Write to SUP_OPS
2. Broadcast via BroadcastChannel
3. Other tabs receive and apply (with `isRemote=true` to prevent re-logging)

```typescript
// Tab A writes
this.broadcastChannel.postMessage({ type: 'NEW_OP', op });

// Tab B receives
this.broadcastChannel.onmessage = (event) => {
  if (event.data.type === 'NEW_OP') {
    const action = convertOpToAction(event.data.op); // Sets isRemote: true
    this.store.dispatch(action);
  }
};
```

## A.6 Disaster Recovery

### SUP_OPS Corruption

```
1. Detect: Hydration fails or returns empty/invalid state
2. Check legacy 'pf' database for data
3. If found: Run recovery migration with that data
4. If not: Check remote sync for data
5. If remote has data: Force sync download
6. If all else fails: User must restore from backup
```

### Implementation

```typescript
async hydrateStore(): Promise<void> {
  try {
    const snapshot = await this.opLogStore.loadStateCache();
    if (!snapshot || !this.isValidSnapshot(snapshot)) {
      await this.attemptRecovery();
      return;
    }
    // Normal hydration...
  } catch (e) {
    await this.attemptRecovery();
  }
}

private async attemptRecovery(): Promise<void> {
  // 1. Try legacy database
  const legacyData = await this.pfapi.getAllSyncModelDataFromModelCtrls();
  if (legacyData && this.hasData(legacyData)) {
    await this.recoverFromLegacyData(legacyData);
    return;
  }
  // 2. Try remote sync
  // 3. Show error to user
}
```

## A.7 Schema Migrations

### Strategy: Migrate at Snapshot Boundaries

```
App Update (schema v1 → v2)
    │
    ▼
Load state_cache (v1 snapshot)
    │
    ▼
Run migration: migrateV1ToV2(snapshot)
    │
    ▼
Dispatch loadAllData(migratedSnapshot)
    │
    ▼
Force new snapshot (now v2)
    │
    ▼
Delete old ops (baked into v2 snapshot)
```

### Implementation

```typescript
const MIGRATIONS: SchemaMigration[] = [
  // No migrations yet - schema version 1 is initial
  // Add migrations here as needed:
  // {
  //   fromVersion: 1,
  //   toVersion: 2,
  //   description: 'Add new field to tasks',
  //   migrate: (state) => ({
  //     ...state,
  //     task: migrateTasksV1ToV2(state.task),
  //   }),
  // },
];

async migrateIfNeeded(snapshot: StateCache): Promise<StateCache> {
  let { state, schemaVersion } = snapshot;

  while (schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS.find(m => m.fromVersion === schemaVersion);
    if (!migration) throw new Error(`No migration path from v${schemaVersion}`);
    state = migration.migrate(state);
    schemaVersion = migration.toVersion;
  }

  return { ...snapshot, state, schemaVersion };
}
```

---

# Part B: Legacy Sync Bridge

The operation log does **NOT** participate in legacy sync protocol. PFAPI handles all sync logic for WebDAV, Dropbox, and LocalFile providers.

However, the op-log must **bridge** to PFAPI by updating `META_MODEL.vectorClock` so PFAPI can detect local changes.

## B.1 How Legacy Sync Works

```
Sync Triggered (WebDAV/Dropbox/LocalFile)
    │
    ▼
PFAPI compares local vs remote vector clocks
    │
    └──► META_MODEL.vectorClock vs remote __meta.vectorClock
              │
              └──► If different: local changes exist
                        │
                        ▼
                   PFAPI.getAllSyncModelData()
                        │
                        ▼
                   PfapiStoreDelegateService
                        │
                        └──► Read ALL models from NgRx via selectors
                                  │
                                  ▼
                             Upload to provider
```

**Key point:** PFAPI reads current state from NgRx, NOT from the operation log. The op-log is invisible to sync.

## B.2 Vector Clock Bridge

When `OperationLogEffects` writes an operation, it must also update META_MODEL:

```typescript
private async writeOperation(op: Operation): Promise<void> {
  // 1. Write to SUP_OPS (Part A)
  await this.opLogStore.appendOperation(op);

  // 2. Bridge to PFAPI (Part B)
  await this.pfapiService.pf.metaModel.incrementVectorClockForLocalChange(this.clientId);

  // 3. Broadcast to other tabs (Part A)
  this.multiTabCoordinator.broadcastOperation(op);
}
```

This ensures:

- PFAPI can detect "there are local changes to sync"
- Legacy sync providers work unchanged
- No changes needed to PFAPI sync protocol

## B.3 Sync Download Persistence

When PFAPI downloads remote data, the hydrator persists it to SUP_OPS:

```typescript
async hydrateFromRemoteSync(): Promise<void> {
  // 1. Read synced data from 'pf' database
  const syncedData = await this.pfapiService.pf.getAllSyncModelDataFromModelCtrls();

  // 2. Create SYNC_IMPORT operation
  const op: Operation = {
    id: uuidv7(),
    opType: 'SYNC_IMPORT',
    entityType: 'ALL',
    payload: syncedData,
    // ...
  };
  await this.opLogStore.append(op, 'remote');

  // 3. Force snapshot for crash safety
  await this.opLogStore.saveStateCache({
    state: syncedData,
    lastAppliedOpSeq: lastSeq,
    // ...
  });

  // 4. Dispatch to NgRx
  this.store.dispatch(loadAllData({ appDataComplete: syncedData }));
}
```

### loadAllData Variants

```typescript
interface LoadAllDataMeta {
  isHydration?: boolean; // From SUP_OPS startup - skip logging
  isRemoteSync?: boolean; // From sync download - create import op
  isBackupImport?: boolean; // From file import - create import op
}
```

| Source               | Create Op?          | Force Snapshot? |
| -------------------- | ------------------- | --------------- |
| Hydration (startup)  | No                  | No              |
| Remote sync download | Yes (SYNC_IMPORT)   | Yes             |
| Backup file import   | Yes (BACKUP_IMPORT) | Yes             |

## B.4 PfapiStoreDelegateService

This service reads ALL sync models from NgRx for PFAPI:

```typescript
@Injectable({ providedIn: 'root' })
export class PfapiStoreDelegateService {
  getAllSyncModelDataFromStore(): Promise<AllSyncModels> {
    return firstValueFrom(
      combineLatest([
        this._store.select(selectTaskFeatureState),
        this._store.select(selectProjectFeatureState),
        this._store.select(selectTagFeatureState),
        this._store.select(selectConfigFeatureState),
        this._store.select(selectNoteFeatureState),
        this._store.select(selectIssueProviderState),
        this._store.select(selectPlannerState),
        this._store.select(selectBoardsState),
        this._store.select(selectMetricFeatureState),
        this._store.select(selectSimpleCounterFeatureState),
        this._store.select(selectTaskRepeatCfgFeatureState),
        this._store.select(selectMenuTreeState),
        this._store.select(selectTimeTrackingState),
        this._store.select(selectImprovementFeatureState),
        this._store.select(selectObstructionFeatureState),
        this._store.select(selectPluginUserDataFeatureState),
        this._store.select(selectPluginMetadataFeatureState),
        this._store.select(selectReminderFeatureState),
        this._store.select(selectArchiveYoungFeatureState),
        this._store.select(selectArchiveOldFeatureState),
      ]).pipe(first(), map(/* combine into AllSyncModels */)),
    );
  }
}
```

All sync models are now in NgRx - no hybrid persistence.

---

# Part C: Server Sync

For server-based sync, the operation log IS the sync mechanism. Individual operations are uploaded/downloaded rather than full state snapshots.

## C.1 How Server Sync Differs

| Aspect              | Legacy Sync (Part B) | Server Sync (Part C)  |
| ------------------- | -------------------- | --------------------- |
| What syncs          | Full state snapshot  | Individual operations |
| Conflict detection  | File-level LWW       | Entity-level          |
| Op-log role         | Not involved         | IS the sync           |
| `syncedAt` tracking | Not needed           | Required              |

## C.2 Operation Sync Protocol

Providers that support operation sync implement `OperationSyncCapable`:

```typescript
interface OperationSyncCapable {
  supportsOperationSync: true;
  uploadOps(
    ops: SyncOperation[],
    clientId: string,
    lastKnownSeq: number,
  ): Promise<UploadResponse>;
  downloadOps(
    sinceSeq: number,
    clientId?: string,
    limit?: number,
  ): Promise<DownloadResponse>;
  acknowledgeOps(clientId: string, upToSeq: number): Promise<void>;
  getLastServerSeq(): Promise<number>;
  setLastServerSeq(seq: number): Promise<void>;
}
```

### Upload Flow

```typescript
async uploadPendingOps(syncProvider: OperationSyncCapable): Promise<void> {
  const pendingOps = await this.opLogStore.getUnsynced();

  // Upload in batches (up to 100 ops per request)
  for (const chunk of chunkArray(pendingOps, 100)) {
    const response = await syncProvider.uploadOps(
      chunk.map(entry => toSyncOperation(entry.op)),
      clientId,
      lastKnownServerSeq
    );

    // Mark accepted ops as synced
    const acceptedSeqs = response.results
      .filter(r => r.accepted)
      .map(r => findEntry(r.opId).seq);
    await this.opLogStore.markSynced(acceptedSeqs);

    // Process piggybacked new ops from other clients
    if (response.newOps?.length > 0) {
      await this.processRemoteOps(response.newOps);
    }
  }
}
```

### Download Flow

```typescript
async downloadRemoteOps(syncProvider: OperationSyncCapable): Promise<void> {
  let sinceSeq = await syncProvider.getLastServerSeq();
  let hasMore = true;

  while (hasMore) {
    const response = await syncProvider.downloadOps(sinceSeq, undefined, 500);

    // Filter already-applied ops
    const newOps = response.ops.filter(op => !appliedOpIds.has(op.id));
    await this.processRemoteOps(newOps);

    sinceSeq = response.ops[response.ops.length - 1].serverSeq;
    hasMore = response.hasMore;
    await syncProvider.setLastServerSeq(response.latestSeq);
  }
}
```

## C.3 File-Based Sync Fallback

For providers without API support (WebDAV/Dropbox), operations are synced via files:

```
ops/
├── manifest.json
├── ops_CLIENT1_1701234567890.json
├── ops_CLIENT1_1701234599999.json
└── ops_CLIENT2_1701234600000.json
```

The manifest tracks which operation files exist. Each file contains a batch of operations.

## C.4 Conflict Detection

Conflicts are detected using vector clocks at the entity level:

```typescript
async detectConflicts(remoteOps: Operation[]): Promise<ConflictResult> {
  const localPendingByEntity = await this.opLogStore.getUnsyncedByEntity();
  const appliedFrontierByEntity = await this.opLogStore.getEntityFrontier();

  for (const remoteOp of remoteOps) {
    const entityKey = `${remoteOp.entityType}:${remoteOp.entityId}`;
    const localFrontier = mergeClocks(
      appliedFrontierByEntity.get(entityKey),
      ...localPendingByEntity.get(entityKey)?.map(op => op.vectorClock) || []
    );

    const comparison = compareVectorClocks(localFrontier, remoteOp.vectorClock);
    if (comparison === VectorClockComparison.CONCURRENT) {
      conflicts.push({
        entityType: remoteOp.entityType,
        entityId: remoteOp.entityId,
        localOps: localPendingByEntity.get(entityKey) || [],
        remoteOps: [remoteOp],
        suggestedResolution: 'manual'
      });
    } else {
      nonConflicting.push(remoteOp);
    }
  }

  return { nonConflicting, conflicts };
}
```

## C.5 Conflict Resolution

Conflicts are presented to the user via `ConflictResolutionService`:

```typescript
async presentConflicts(conflicts: EntityConflict[]): Promise<void> {
  const dialogRef = this.dialog.open(DialogConflictResolutionComponent, {
    data: { conflicts },
    disableClose: true
  });

  const result = await firstValueFrom(dialogRef.afterClosed());

  if (result.resolution === 'remote') {
    // Apply remote ops, overwrite local state
    for (const conflict of conflicts) {
      await this.operationApplier.applyOperations(conflict.remoteOps);
    }
    // Mark local ops as rejected so they won't be re-synced
    const localOpIds = conflict.localOps.map(op => op.id);
    await this.opLogStore.markRejected(localOpIds);
  } else {
    // Keep local ops, ignore remote
  }
}
```

### Rejected Operations

When the user chooses "remote" resolution, local conflicting operations are marked with `rejectedAt` timestamp:

- Rejected ops remain in the log for history/debugging
- `getUnsynced()` excludes rejected ops (won't re-upload)
- Compaction may eventually delete old rejected ops

## C.6 Dependency Resolution

Operations may have dependencies (e.g., subtask requires parent task):

```typescript
interface OperationDependency {
  entityType: EntityType;
  entityId: string;
  mustExist: boolean; // Hard dependency
  relation: 'parent' | 'reference';
}

// Operations with missing hard dependencies are queued for retry
// After MAX_RETRY_ATTEMPTS (3), they're marked as permanently failed
```

---

# Implementation Status

## Complete ✅

- SUP_OPS IndexedDB store (ops + state_cache)
- NgRx effect capture with isPersistent pattern
- Snapshot + tail replay hydration
- Multi-tab BroadcastChannel coordination
- Web Locks + localStorage fallback
- Genesis migration from legacy data
- `PfapiStoreDelegateService` (reads all NgRx models for sync)
- META_MODEL vector clock update (B.2)
- Sync download persistence via `hydrateFromRemoteSync()` (B.3)
- All models in NgRx (no hybrid persistence)
- Compaction with 7-day retention window
- Disaster recovery from legacy 'pf' database
- Schema migration service infrastructure
- Server sync upload/download (C.2)
- File-based sync fallback (C.3)
- Entity-level conflict detection (C.4)
- Conflict resolution dialog (C.5)
- Dependency resolution with retry queue (C.6)
- Persistent action metadata on all model actions
- **Rollback notification on persistence failure** (shows snackbar with reload action)
- **Rejected operation tracking** (`rejectedAt` field, excluded from sync)

## Future Enhancements 🔮

| Component             | Description                                  | Priority |
| --------------------- | -------------------------------------------- | -------- |
| Auto-merge            | Automatic merge for non-conflicting fields   | Low      |
| Undo/Redo             | Leverage op-log for undo history             | Low      |
| Offline queue UI      | Show pending sync operations to user         | Low      |
| Op-log viewer         | Debug panel for viewing operation history    | Medium   |
| IndexedDB index       | Index on `syncedAt` for faster getUnsynced() | Low      |
| Persistent compaction | Track ops since compaction across restarts   | Low      |
| Diff-based storage    | Store diffs for large text fields (notes)    | Defer    |

---

# File Reference

```
src/app/core/persistence/operation-log/
├── operation.types.ts                    # Type definitions (Operation, OpType, EntityType)
├── operation-log-store.service.ts        # SUP_OPS IndexedDB wrapper
├── operation-log.effects.ts              # Action capture + META_MODEL bridge
├── operation-log-hydrator.service.ts     # Startup hydration
├── operation-log-compaction.service.ts   # Snapshot + cleanup
├── operation-log-migration.service.ts    # Genesis migration from legacy
├── operation-log-sync.service.ts         # Upload/download operations (Part C)
├── operation-applier.service.ts          # Apply ops to store with dependency handling
├── operation-converter.util.ts           # Op ↔ Action conversion
├── persistent-action.interface.ts        # PersistentAction type + isPersistentAction guard
├── lock.service.ts                       # Cross-tab locking (Web Locks + fallback)
├── multi-tab-coordinator.service.ts      # BroadcastChannel coordination
├── schema-migration.service.ts           # State schema migrations
├── dependency-resolver.service.ts        # Extract/check operation dependencies
└── conflict-resolution.service.ts        # Conflict UI presentation

src/app/pfapi/
├── pfapi-store-delegate.service.ts       # Reads NgRx for sync (Part B)
└── pfapi.service.ts                      # Sync orchestration
```

---

# References

- [Execution Plan](./operation-log-execution-plan.md) - Implementation tasks
- [PFAPI Architecture](./pfapi-sync-persistence-architecture.md) - Legacy sync system
- [Server Sync Architecture](./server-sync-architecture.md) - Server-based sync details
