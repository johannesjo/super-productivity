# Operation Log Sync: Architecture

**Status:** Implementation in Progress (~70% complete)
**Branch:** `feat/operation-logs`
**Last Updated:** December 2, 2025

---

## 1. Overview

The Operation Log system provides:

1. **Local persistence** via event sourcing (all user actions stored as operations)
2. **Legacy sync compatibility** (WebDAV/Dropbox/LocalFile continue to work unchanged)
3. **Future per-entity conflict detection** for server-based sync providers

### 1.1 Core Paradigm (Simplified)

```
┌─────────────────────────────────────────────────────────────┐
│                     User Action                             │
└────────────────────────┬────────────────────────────────────┘
                         ▼
                    NgRx Store
              (Runtime Source of Truth)
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
   OpLogEffects                    Other Effects
         │                         (notifications, etc.)
         ▼
      SUP_OPS
  (Persistence Source of Truth)

   Legacy Sync reads directly from NgRx via delegate
```

**Key principles:**

- **NgRx Store** = Single runtime source of truth
- **SUP_OPS (IndexedDB)** = Single persistence source of truth for model data
- **PFAPI** = Sync protocol only (no local persistence for model data)
- **No feature flags** = One implementation that always works

### 1.2 Key Benefits

| Problem (Old)                | Solution (New)                        |
| ---------------------------- | ------------------------------------- |
| Dual persistence (pf + NgRx) | Single persistence (SUP_OPS only)     |
| Stale cache bugs             | PFAPI reads directly from NgRx        |
| Feature flag complexity      | One path, always enabled              |
| Future: LWW conflicts        | Future: Per-entity conflict detection |

---

## 2. Database Architecture

### 2.1 SUP_OPS Database (Primary)

The operation log database stores:

- **ops** - All user operations (event log)
- **state_cache** - Periodic snapshots for fast startup

```typescript
interface OperationLogEntry {
  seq: number; // Auto-increment primary key
  op: Operation; // The operation
  appliedAt: number; // When applied locally
  source: 'local' | 'remote';
  syncedAt?: number; // When synced (null if pending)
}

interface StateCache {
  state: AllSyncModels; // Full snapshot
  lastAppliedOpSeq: number;
  savedAt: number;
}
```

### 2.2 'pf' Database (Metadata Only)

The legacy `pf` database is used **ONLY** for:

- **META_MODEL** - Vector clocks, revision tracking (needed by sync protocol)

**ALL sync model data goes through NgRx → SUP_OPS. The `pf` database model tables are NOT used.**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         IndexedDB                                   │
├────────────────────────────────┬────────────────────────────────────┤
│      'pf' database             │      'SUP_OPS' database            │
│      (Metadata ONLY)           │      (Operation Log)               │
│                                │                                    │
│  ┌──────────────────────┐      │  ┌──────────────────────┐          │
│  │ META_MODEL (metadata)│◄─────┼──│ ops (event log)      │          │
│  └──────────────────────┘      │  │ state_cache (snapshot)│         │
│                                │  └──────────────────────┘          │
│  NOT used for model data:      │                                    │
│  - task, project, tag          │  ALL sync models persisted here:   │
│  - reminders, archives         │  - task, project, tag, note        │
│  - plugins, etc.               │  - reminders, archives             │
│                                │  - plugins, config, etc.           │
└────────────────────────────────┴────────────────────────────────────┘
```

### 2.3 Models Requiring NgRx Migration

The following models are part of the sync model but currently NOT in NgRx state. They need to be migrated:

| Model            | Current State             | Migration Required          |
| ---------------- | ------------------------- | --------------------------- |
| `reminders`      | Direct `ModelCtrl.save()` | Add to NgRx, create effects |
| `archiveYoung`   | Direct `ModelCtrl.save()` | Add to NgRx, create effects |
| `archiveOld`     | Direct `ModelCtrl.save()` | Add to NgRx, create effects |
| `pluginUserData` | Direct `ModelCtrl.save()` | Add to NgRx, create effects |
| `pluginMetadata` | Direct `ModelCtrl.save()` | Add to NgRx, create effects |
| `improvement`    | Direct `ModelCtrl.save()` | Add to NgRx, create effects |
| `obstruction`    | Direct `ModelCtrl.save()` | Add to NgRx, create effects |

**This is a BLOCKER** - All sync models must be migrated to NgRx before the op-log system is complete. No hybrid persistence modes.

**Migration steps:**

1. Create NgRx feature state for each model (reducer, actions, selectors)
2. Update services to dispatch actions instead of direct `ModelCtrl.save()`
3. Add selectors to `PfapiStoreDelegateService`
4. Operation log effects will automatically capture the actions
5. Genesis migration loads these models from `pf` database into the initial snapshot

**One-time data migration (genesis):**

```typescript
// In genesis migration - load ALL models from legacy pf database
async createGenesisSnapshot(): Promise<void> {
  // Load NgRx models (already in pf)
  const [task, project, tag, ...] = await Promise.all([
    this.pfapiService.m.task.load(),
    this.pfapiService.m.project.load(),
    // ...
  ]);

  // Load non-NgRx models (also in pf)
  const [reminders, archiveYoung, archiveOld, ...] = await Promise.all([
    this.pfapiService.m.reminders.load(),
    this.pfapiService.m.archiveYoung.load(),
    this.pfapiService.m.archiveOld.load(),
    // ...
  ]);

  // Create snapshot with ALL models
  const fullState = { task, project, tag, reminders, archiveYoung, archiveOld, ... };
  await this.opLogStore.saveStateCache({ state: fullState, ... });
}
```

**After migration:**

- ALL sync models persist via NgRx → OperationLogEffects → SUP_OPS
- `pf` database only holds META_MODEL (sync protocol metadata)
- `PfapiStoreDelegateService` reads ALL models from NgRx selectors
- No dual persistence paths

---

## 3. Data Flow

### 3.1 Write Path (User Action)

```
User Action
    │
    ▼
NgRx Dispatch (action)
    │
    ├──► Reducer updates state (optimistic)
    │
    └──► OperationLogEffects
              │
              ├──► Convert action to Operation
              ├──► Increment vector clock (per-op)
              ├──► Append to SUP_OPS (disk)
              └──► Broadcast to other tabs
```

**Note:** Legacy sync uses **vector clocks** (not timestamps) to detect changes. The vector clock comparison happens when sync compares local vs remote state.

### 3.2 Read Path (Startup / Hydration)

```
App Startup
    │
    ▼
OperationLogHydratorService
    │
    ├──► Load snapshot from SUP_OPS.state_cache
    │         │
    │         └──► If no snapshot: Genesis migration from 'pf' database
    │
    ├──► Dispatch loadAllData(snapshot, { isHydration: true }) to NgRx
    │
    └──► Load tail ops (seq > snapshot.lastAppliedOpSeq)
              │
              └──► Replay ops with isRemote=true (prevents re-logging)
```

### 3.3 Sync Upload Path (Legacy Providers)

```
Sync Triggered (WebDAV/Dropbox/LocalFile)
    │
    ▼
SyncService compares local vs remote vector clocks (from META_MODEL)
    │
    └──► If local is ahead (changes exist):
              │
              ▼
         PFAPI.getAllSyncModelData()
              │
              ▼
         PfapiStoreDelegateService.getAllSyncModelDataFromStore()
              │
              └──► Read ALL models from NgRx state via selectors
                        │
                        ▼
                   Return combined data
                        │
                        ▼
                   Generate __meta / model files
                        │
                        ▼
                   Upload to provider
```

### 3.4 Sync Download Path (Legacy Providers)

```
Download from Provider
    │
    ▼
PFAPI receives main.json
    │
    ▼
Dispatch loadAllData(remoteData, { isRemoteSync: true }) to NgRx
    │
    ▼
OperationLogEffects sees loadAllData with isRemoteSync=true
    │
    ├──► Create "SYNC_IMPORT" operation in SUP_OPS  ◄── CRITICAL
    │         (This persists the remote state)
    │
    └──► Force snapshot to state_cache  ◄── SAFETY
              (Ensures persistence even if app crashes)
```

**CRITICAL:** Sync downloads MUST be persisted to SUP_OPS. Either:

1. Create a special `SYNC_IMPORT` operation with full state
2. OR force an immediate snapshot after applying remote data

Without this, downloaded data exists only in memory and would be lost on crash.

### 3.5 loadAllData Action Variants

The `loadAllData` action needs to distinguish its source:

```typescript
interface LoadAllDataMeta {
  isHydration?: boolean; // From SUP_OPS on startup - skip logging
  isRemoteSync?: boolean; // From sync download - create import op + snapshot
  isBackupImport?: boolean; // From file import - create import op
}

// Usage:
dispatch(loadAllData({ data, meta: { isRemoteSync: true } }));
```

| Source               | Create Op?          | Force Snapshot? |
| -------------------- | ------------------- | --------------- |
| Hydration (startup)  | No                  | No              |
| Remote sync download | Yes (SYNC_IMPORT)   | Yes             |
| Backup file import   | Yes (BACKUP_IMPORT) | Yes             |

---

## 4. Vector Clock Synchronization

### 4.1 Two Vector Clock Systems

The system has two vector clock locations:

1. **Per-operation vector clock** - Each op in SUP_OPS has its own vector clock
2. **META_MODEL vector clock** - Global vector clock used by legacy sync protocol

Legacy sync compares `META_MODEL.vectorClock` (local) vs remote `__meta.vectorClock` to detect changes.

### 4.2 Keeping Vector Clocks in Sync

**Question:** When ops are written to SUP_OPS, do we need to update META_MODEL's vector clock?

**Answer:** The sync protocol compares META_MODEL vector clocks. If we don't update META_MODEL's vector clock when ops are written, legacy sync won't detect local changes.

**Solution:** When `OperationLogEffects` writes an operation, also increment META_MODEL's vector clock:

```typescript
// After writing op to SUP_OPS:
await this.metaModel.incrementVectorClock(this.clientId);
```

This ensures legacy sync can detect that local state has changed.

### 4.3 Note on lastLocalSyncModelChange

The `lastLocalSyncModelChange` field is NOT used for sync decision-making. Sync uses vector clock comparison, not timestamps.

---

## 5. Provider-Specific Sync Strategy

### 5.1 Decision Matrix

| Provider            | Remote Sync Protocol    | Notes                              |
| ------------------- | ----------------------- | ---------------------------------- |
| **WebDAV**          | Legacy LWW              | Uploads main.json, reads from NgRx |
| **Dropbox**         | Legacy LWW              | Uploads main.json, reads from NgRx |
| **Local File Sync** | Legacy LWW              | Single file sync, reads from NgRx  |
| **Future Server**   | Operation Log (planned) | Would upload/download ops directly |

### 5.2 Why Legacy Providers Don't Use Op-Log Sync

- **WebDAV**: HTTP overhead makes thousands of small op files slow
- **Dropbox**: API rate limits, slow directory listing
- **LocalFile**: Simpler to sync one file than manage op chunks

Op-log sync is reserved for future server-based providers.

---

## 6. Key Services

### 6.1 File Map

```
src/app/core/persistence/operation-log/
├── operation.types.ts               # Type definitions
├── operation-log-store.service.ts   # SUP_OPS IndexedDB persistence
├── operation-log.effects.ts         # NgRx effect capture + META_MODEL sync
├── operation-log-hydrator.service.ts# Startup state restoration
├── operation-log-compaction.service.ts # Snapshot + GC
├── operation-applier.service.ts     # Apply ops to store
├── operation-converter.util.ts      # Op ↔ Action conversion
├── dependency-resolver.service.ts   # Entity dependency tracking
├── lock.service.ts                  # Cross-tab locking
└── multi-tab-coordinator.service.ts # BroadcastChannel sync

src/app/pfapi/
├── pfapi-store-delegate.service.ts  # Reads NgRx state for sync
└── pfapi.service.ts                 # Sync orchestration
```

### 6.2 Service Responsibilities

| Service                         | Responsibility                                    |
| ------------------------------- | ------------------------------------------------- |
| `OperationLogStoreService`      | SUP_OPS IndexedDB CRUD, vector clock tracking     |
| `OperationLogEffects`           | Capture actions, write ops, **update META_MODEL** |
| `OperationLogHydratorService`   | Load snapshot + replay tail on startup            |
| `OperationLogCompactionService` | Create snapshots, prune old ops                   |
| `PfapiStoreDelegateService`     | Read NgRx state + non-NgRx models for sync        |
| `LockService`                   | Web Locks API + fallback for cross-tab safety     |
| `MultiTabCoordinatorService`    | BroadcastChannel for tab coordination             |

---

## 7. Operation Structure

```typescript
interface Operation {
  id: string; // UUID v7 (time-ordered)
  actionType: string; // NgRx action type
  opType: OpType; // CRT | UPD | DEL | MOV | BATCH | SYNC_IMPORT
  entityType: EntityType; // TASK | PROJECT | TAG | NOTE | ...
  entityId?: string; // Affected entity ID
  entityIds?: string[]; // For batch operations
  payload: unknown; // Action payload
  clientId: string; // Device ID
  vectorClock: VectorClock; // Causality tracking
  timestamp: number; // Wall clock (epoch ms)
  schemaVersion: number; // For migrations
  parentOpId?: string; // For conflict chains
}

type OpType = 'CRT' | 'UPD' | 'DEL' | 'MOV' | 'BATCH' | 'SYNC_IMPORT' | 'BACKUP_IMPORT';
```

---

## 8. Compaction

### 8.1 Triggers

- Every 500 operations
- After sync download (safety)
- On app close (optional)

### 8.2 Process

```
1. Acquire compaction lock
2. Read current state from NgRx (via PfapiStoreDelegateService)
3. Save snapshot to SUP_OPS.state_cache
4. Delete ops WHERE syncedAt IS NOT NULL AND appliedAt < (now - 7 days)
5. Never delete unsynced ops
```

### 8.3 Configuration

| Setting            | Value   | Description                            |
| ------------------ | ------- | -------------------------------------- |
| Compaction trigger | 500 ops | Ops before snapshot                    |
| Retention window   | 7 days  | Keep synced ops for conflict detection |

---

## 9. Schema Migrations

### 9.1 The Challenge

With operation log persistence, schema migrations are more complex than with snapshot-only persistence:

1. **Ops are immutable** - We can't modify historical ops to match new schema
2. **Snapshots must be current** - state_cache needs the latest schema
3. **Replay must work** - Old ops applied to new reducers must not break

### 9.2 Migration Strategy

**Approach: Migrate at snapshot boundaries**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Schema Migration Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  App Update (schema v1 → v2)                                    │
│       │                                                          │
│       ▼                                                          │
│  Load state_cache (v1 snapshot)                                 │
│       │                                                          │
│       ▼                                                          │
│  Run migration: migrateV1ToV2(snapshot)                         │
│       │                                                          │
│       ▼                                                          │
│  Dispatch loadAllData(migratedSnapshot, { isHydration: true })  │
│       │                                                          │
│       ▼                                                          │
│  Force new snapshot (now v2)                                    │
│       │                                                          │
│       ▼                                                          │
│  Delete old ops (they're now baked into v2 snapshot)            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Implementation

```typescript
// schema-migration.service.ts
interface SchemaMigration {
  fromVersion: number;
  toVersion: number;
  migrate: (state: AllSyncModels) => AllSyncModels;
}

const MIGRATIONS: SchemaMigration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    migrate: (state) => ({
      ...state,
      task: migrateTasksV1ToV2(state.task),
    }),
  },
  // ... future migrations
];

@Injectable({ providedIn: 'root' })
export class SchemaMigrationService {
  async migrateIfNeeded(snapshot: StateCache): Promise<StateCache> {
    const currentVersion = CURRENT_SCHEMA_VERSION;
    let { state, schemaVersion } = snapshot;

    while (schemaVersion < currentVersion) {
      const migration = MIGRATIONS.find((m) => m.fromVersion === schemaVersion);
      if (!migration) {
        throw new Error(`No migration path from v${schemaVersion}`);
      }
      state = migration.migrate(state);
      schemaVersion = migration.toVersion;
    }

    return { ...snapshot, state, schemaVersion };
  }
}
```

### 9.4 Op Schema Versioning

Each operation has a `schemaVersion` field:

```typescript
interface Operation {
  // ...
  schemaVersion: number; // Schema version when op was created
}
```

**During replay:**

- Ops with older schema versions are applied via compatibility layer
- OR skipped if snapshot already contains their effects (post-migration)

### 9.5 Best Practices

1. **Additive changes are safe** - New fields with defaults work without migration
2. **Destructive changes require migration** - Renaming/removing fields needs explicit handling
3. **Compact after migration** - New snapshot bakes in migration, old ops can be deleted
4. **Test migration paths** - Each version pair needs migration test coverage

---

## 10. Genesis Migration

On first startup with operation log (when SUP_OPS is empty):

```
1. Check if SUP_OPS has any ops
2. If empty:
   a. Load all data from 'pf' database (legacy)
   b. Create "GENESIS" operation with full state
   c. Save snapshot to state_cache
   d. Mark genesis op as synced (it came from legacy sync)
3. Future startups hydrate from SUP_OPS
```

---

## 10. Disaster Recovery

### 10.1 SUP_OPS Corruption

If SUP_OPS IndexedDB is corrupted or cleared:

```
1. Detect: Hydration fails or returns empty/invalid state
2. Check: Does 'pf' database have valid data?
   a. If yes: Re-run genesis migration
   b. If no: Check remote sync for data
3. If remote has data: Force sync download
4. If all else fails: User must restore from backup
```

### 10.2 Genesis Migration Failure

If genesis migration crashes mid-way:

```
1. On next startup, SUP_OPS may have partial data
2. Detect: state_cache missing or ops count < expected
3. Recovery: Clear SUP_OPS, re-run genesis migration
```

### 10.3 Recovery Implementation

```typescript
// In OperationLogHydratorService
async hydrateStore(): Promise<void> {
  try {
    const snapshot = await this.opLogStore.loadStateCache();
    if (!snapshot || !this.isValidSnapshot(snapshot)) {
      // Recovery path
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

---

## 11. Multi-Tab Coordination

### 11.1 Write Coordination

```typescript
// Primary: Web Locks API
await navigator.locks.request('sp_op_log_write', callback);

// Fallback: localStorage mutex (for older WebViews)
await this.acquireFallbackLock(lockName, callback);
```

### 11.2 State Broadcast

When one tab writes an operation:

1. Write to SUP_OPS
2. Broadcast via BroadcastChannel
3. Other tabs receive and apply operation (with isRemote=true)

---

## 12. Action Filtering

We use a **blacklist** approach - all actions are persisted unless explicitly excluded.

```typescript
// action-blacklist.ts
export const BLACKLISTED_ACTION_TYPES: Set<string> = new Set([
  '[Layout] Toggle Sidebar',
  '[Layout] Show AddTaskBar',
  '[Layout] Hide AddTaskBar',
  '[Task] SetCurrentTask',
  '[Task] SetSelectedTask',
  '[Task] UnsetCurrentTask',
  '[Task] Update Task Ui',
  // ... UI-only actions
]);
```

**Note:** This list needs auditing to ensure all transient UI actions are excluded.

---

## 13. Current Implementation Status

### Complete ✅

- Dual IndexedDB architecture (pf + SUP_OPS)
- NgRx effect capture with vector clock
- Snapshot + tail replay hydration
- Multi-tab BroadcastChannel coordination
- Web Locks + localStorage fallback
- Genesis migration from legacy data
- Op → Action conversion with isRemote flag
- `PfapiStoreDelegateService` (reads NgRx for sync)

### Needs Implementation 🚧

| Component                 | Issue                             | Priority     |
| ------------------------- | --------------------------------- | ------------ |
| META_MODEL sync           | Ops don't update META_MODEL       | **CRITICAL** |
| Sync download persistence | Downloads not written to SUP_OPS  | **CRITICAL** |
| Non-NgRx model migration  | reminders, archives bypass op-log | **HIGH**     |
| Compaction triggers       | Logic exists, never invoked       | HIGH         |
| Action blacklist          | Only ~10 actions, needs audit     | MEDIUM       |
| Disaster recovery         | No recovery path implemented      | MEDIUM       |
| Schema migration service  | No migration infrastructure       | MEDIUM       |

### Not Started ❌

| Component              | Description                      | Priority |
| ---------------------- | -------------------------------- | -------- |
| Future server sync     | Op-log sync for server providers | LOW      |
| Per-entity conflict UI | Field-level diff display         | LOW      |

---

## 14. Architectural Simplifications Made

### 14.1 Removed: Feature Flag

**Old:** `useOperationLogSync` feature flag to toggle persistence.

**New:** Operation log is always enabled. One implementation.

### 14.2 Removed: Dual Write Path

**Old:** Both `SaveToDbEffects` and `OperationLogEffects` running in parallel.

**New:** Only `OperationLogEffects` writes model data. `SaveToDbEffects` disabled.

### 14.3 Removed: Memory-Only Adapter

**Old:** `SaveToDbEffects` updating ModelCtrl cache without disk writes.

**New:** PFAPI reads directly from NgRx. No cache to manage.

### 14.4 Simplified: PFAPI Role

**Old:** PFAPI managed local persistence + sync protocol.

**New:** PFAPI manages sync protocol only. Local persistence is SUP_OPS.

---

## 15. References

- [Execution Plan](./operation-log-execution-plan.md) - Implementation tasks
