# Operation Log Architecture

**Status:** Part A/B Complete (100%), Part C Not Started
**Branch:** `feat/operation-logs`
**Last Updated:** December 2, 2025

---

## Overview

The Operation Log serves **three distinct purposes**:

| Purpose                   | Description                                   | Status |
| ------------------------- | --------------------------------------------- | ------ |
| **A. Local Persistence**  | Fast writes, crash recovery, event sourcing   | Active |
| **B. Legacy Sync Bridge** | Vector clock updates for PFAPI sync detection | Active |
| **C. Server Sync**        | Upload/download individual operations         | Future |

This document is structured around these three purposes. Most complexity lives in **Part A** (local persistence). **Part B** is a thin bridge to PFAPI. **Part C** is future work.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Action                                   │
└────────────────────────────┬────────────────────────────────────────┘
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
  syncedAt?: number; // For future server sync (Part C)
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
              ├──► Filter: Is action blacklisted? → Skip
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

### Action Blacklist

UI-only actions are excluded from persistence:

```typescript
// action-blacklist.ts
export const BLACKLISTED_ACTION_TYPES: Set<string> = new Set([
  '[Layout] Toggle Sidebar',
  '[Task] SetCurrentTask',
  '[Task] SetSelectedTask',
  '[Task] UnsetCurrentTask',
  '[Task] Update Task Ui',
  // ... other transient UI actions
]);
```

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
  await this.lockService.acquireCompactionLock();

  // 2. Read current state from NgRx
  const currentState = await this.storeDelegateService.getAllSyncModelDataFromStore();

  // 3. Save new snapshot
  const lastSeq = await this.opLogStore.getLastSeq();
  await this.opLogStore.saveStateCache({
    state: currentState,
    lastAppliedOpSeq: lastSeq,
    savedAt: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION
  });

  // 4. Delete old ops
  // For local-only: delete all ops before snapshot
  // For server sync (Part C): keep unsynced ops
  await this.opLogStore.deleteOpsBefore(lastSeq - RETENTION_BUFFER);

  // 5. Release lock
  this.lockService.releaseCompactionLock();
}
```

### Configuration

| Setting            | Value   | Description                |
| ------------------ | ------- | -------------------------- |
| Compaction trigger | 500 ops | Ops before snapshot        |
| Retention buffer   | 100 ops | Keep recent ops for safety |

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
this.broadcastChannel.postMessage({ type: 'OP_WRITTEN', op });

// Tab B receives
this.broadcastChannel.onmessage = (event) => {
  if (event.data.type === 'OP_WRITTEN') {
    this.applyOperation(event.data.op, { isRemote: true });
  }
};
```

## A.6 Disaster Recovery

### SUP_OPS Corruption

```
1. Detect: Hydration fails or returns empty/invalid state
2. Check remote sync for data
3. If remote has data: Force sync download
4. If all else fails: User must restore from backup
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
  const legacyData = await this.pfapi.getAllSyncModelData();
  if (legacyData && this.hasData(legacyData)) {
    await this.runGenesisMigration(legacyData);
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
  {
    fromVersion: 1,
    toVersion: 2,
    migrate: (state) => ({
      ...state,
      task: migrateTasksV1ToV2(state.task),
    }),
  },
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
  await this.pfapiService.pf.metaModel.incrementVectorClock(this.clientId);

  // 3. Broadcast to other tabs (Part A)
  this.multiTabCoordinator.broadcastOperation(op);
}
```

This ensures:

- PFAPI can detect "there are local changes to sync"
- Legacy sync providers work unchanged
- No changes needed to PFAPI sync protocol

## B.3 Sync Download Persistence

When PFAPI downloads remote data, it dispatches `loadAllData`. The op-log must persist this:

```typescript
// In OperationLogEffects
handleLoadAllData$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(loadAllData),
      filter((action) => action.meta?.isRemoteSync || action.meta?.isBackupImport),
      tap(async (action) => {
        // Create SYNC_IMPORT operation
        const op: Operation = {
          id: uuidv7(),
          opType: 'SYNC_IMPORT',
          entityType: 'ALL',
          payload: action.appDataComplete,
          // ...
        };
        await this.opLogStore.appendOperation(op);

        // Force snapshot for crash safety
        await this.compactionService.forceSnapshot();
      }),
    ),
  { dispatch: false },
);
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
  async getAllSyncModelDataFromStore(): Promise<AllSyncModels> {
    // Read NgRx state for models already in store
    const ngrxData = await firstValueFrom(
      combineLatest([
        this._store.select(selectTaskFeatureState),
        this._store.select(selectProjectFeatureState),
        this._store.select(selectTagFeatureState),
        // ... all NgRx models
      ]),
    );

    // For models not yet in NgRx, load from pf database
    // (These need migration - see "Models Requiring Migration")
    const nonNgrxData = await Promise.all([
      this._modelCtrls.reminders.load(),
      this._modelCtrls.archiveYoung.load(),
      // ...
    ]);

    return { ...ngrxData, ...nonNgrxData };
  }
}
```

## B.5 Models Requiring NgRx Migration

These models bypass NgRx and must be migrated before the op-log system is complete:

| Model            | Current State             | Migration Required |
| ---------------- | ------------------------- | ------------------ |
| `reminders`      | Direct `ModelCtrl.save()` | Add to NgRx        |
| `archiveYoung`   | Direct `ModelCtrl.save()` | Add to NgRx        |
| `archiveOld`     | Direct `ModelCtrl.save()` | Add to NgRx        |
| `pluginUserData` | Direct `ModelCtrl.save()` | Add to NgRx        |
| `pluginMetadata` | Direct `ModelCtrl.save()` | Add to NgRx        |
| `improvement`    | Direct `ModelCtrl.save()` | Add to NgRx        |
| `obstruction`    | Direct `ModelCtrl.save()` | Add to NgRx        |

**This is a BLOCKER** - No hybrid persistence modes allowed.

---

# Part C: Server Sync (Future)

For future server-based sync, the operation log becomes the sync mechanism itself.

## C.1 How Server Sync Differs

| Aspect              | Legacy Sync (Part B) | Server Sync (Part C)  |
| ------------------- | -------------------- | --------------------- |
| What syncs          | Full state snapshot  | Individual operations |
| Conflict detection  | File-level LWW       | Entity-level          |
| Op-log role         | Not involved         | IS the sync           |
| `syncedAt` tracking | Not needed           | Required              |

## C.2 Additional Infrastructure Needed

### Per-Op Sync Tracking

```typescript
interface OperationLogEntry {
  // ... existing fields
  syncedAt?: number; // When uploaded to server (null if pending)
}
```

### Sync-Aware Compaction

```typescript
// Part A (local-only): Delete all ops before snapshot
// Part C (server sync): Never delete unsynced ops
async compact(): Promise<void> {
  if (this.isServerSyncEnabled) {
    // Only delete ops where syncedAt IS NOT NULL
    await this.opLogStore.deleteOpsWhere({
      syncedAt: { $ne: null },
      appliedAt: { $lt: Date.now() - RETENTION_WINDOW }
    });
  } else {
    // Aggressive compaction for local-only
    await this.opLogStore.deleteOpsBefore(lastSeq - RETENTION_BUFFER);
  }
}
```

### Operation Upload/Download

```typescript
// Upload unsynced ops to server
async uploadPendingOps(): Promise<void> {
  const unsyncedOps = await this.opLogStore.getUnsyncedOps();
  for (const op of unsyncedOps) {
    await this.serverApi.uploadOperation(op);
    await this.opLogStore.markSynced(op.id);
  }
}

// Download remote ops
async downloadRemoteOps(sinceSeq: number): Promise<void> {
  const remoteOps = await this.serverApi.getOperations(sinceSeq);
  for (const op of remoteOps) {
    await this.applyOperation(op, { isRemote: true });
  }
}
```

### Entity-Level Conflict Detection

```typescript
// Using per-op vector clocks
function detectConflict(localOp: Operation, remoteOp: Operation): boolean {
  if (localOp.entityId !== remoteOp.entityId) return false;

  const comparison = compareVectorClocks(localOp.vectorClock, remoteOp.vectorClock);
  return comparison === VectorClockComparison.CONCURRENT;
}
```

## C.3 Detailed Architecture

Server sync is **future work**. For the complete server sync architecture including:

- REST API and WebSocket protocol design
- Conflict detection algorithms (vector clock comparison)
- Entity-level merge strategies per model type
- Sync-aware compaction rules
- Offline handling and recovery
- Migration path from legacy sync

See: **[Server Sync Architecture](./server-sync-architecture.md)**

---

# Implementation Status

## Complete ✅

- SUP_OPS IndexedDB store (ops + state_cache)
- NgRx effect capture with vector clock
- Snapshot + tail replay hydration
- Multi-tab BroadcastChannel coordination
- Web Locks + localStorage fallback
- Genesis migration from legacy data
- `PfapiStoreDelegateService` (reads NgRx for sync)
- META_MODEL vector clock update (B.1) - ops now update META_MODEL
- Sync download persistence (B.2) - downloads written to SUP_OPS via `hydrateFromRemoteSync()`
- Non-NgRx model migration (B.4) - all models (reminders, archives, plugins) now in NgRx
- Compaction triggers (A.2) - triggered every 500 operations
- Action blacklist audit (A.3) - expanded to 39 UI-only actions
- Disaster recovery (A.6) - recovery from legacy 'pf' database on corruption
- Schema migration service (A.7) - infrastructure for state migrations

## Needs Implementation 🚧

| Component                  | Part | Issue | Priority |
| -------------------------- | ---- | ----- | -------- |
| (None - Part A/B complete) |      |       |          |

## Not Started ❌

| Component              | Part | Description                        |
| ---------------------- | ---- | ---------------------------------- |
| Server API             | C    | Backend for op-log sync            |
| Per-op sync tracking   | C    | `syncedAt` field usage             |
| Entity-level conflicts | C    | Conflict detection + resolution UI |

---

# File Reference

```
src/app/core/persistence/operation-log/
├── operation.types.ts               # Type definitions
├── operation-log-store.service.ts   # SUP_OPS IndexedDB
├── operation-log.effects.ts         # Action capture + META_MODEL bridge
├── operation-log-hydrator.service.ts# Startup hydration
├── operation-log-compaction.service.ts
├── operation-applier.service.ts     # Apply ops to store
├── operation-converter.util.ts      # Op ↔ Action conversion
├── action-blacklist.ts              # UI action filtering
├── lock.service.ts                  # Cross-tab locking
└── multi-tab-coordinator.service.ts # BroadcastChannel

src/app/pfapi/
├── pfapi-store-delegate.service.ts  # Reads NgRx for sync (Part B)
└── pfapi.service.ts                 # Sync orchestration
```

---

# References

- [Execution Plan](./operation-log-execution-plan.md) - Implementation tasks
- [PFAPI Architecture](./pfapi-sync-persistence-architecture.md) - Legacy sync system
- [Server Sync Architecture](./server-sync-architecture.md) - Future server-based sync (Part C)
