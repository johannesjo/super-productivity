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
- **SUP_OPS (IndexedDB)** = Single persistence source of truth for all model data
- **PFAPI** = Sync protocol only. **NO LOCAL PERSISTENCE RESPONSIBILITY** for model data (Task, Project, etc.).
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

### 2.2 'pf' Database (Legacy - Metadata Only)

The legacy `pf` database is used ONLY for:

- **META_MODEL** - Vector clocks, revision tracking (needed by sync protocol)
- **Non-NgRx models** - reminders, archives, plugins (loaded on-demand)

**CRITICAL:** Model data (tasks, projects, tags, etc.) is **NOT** written to `pf` database anymore. `SaveToDbEffects` is completely disabled for these models.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         IndexedDB                                   │
├────────────────────────────────┬────────────────────────────────────┤
│      'pf' database             │      'SUP_OPS' database            │
│      (Metadata + Archives)     │      (Operation Log)               │
│                                │                                    │
│  ┌──────────────────────┐      │  ┌──────────────────────┐          │
│  │ META_MODEL (metadata)│      │  │ ops (event log)      │          │
│  │ reminders            │      │  │ state_cache (snapshot)│         │
│  │ archiveYoung         │      │  └──────────────────────┘          │
│  │ archiveOld           │      │                                    │
│  │ pluginUserData       │      │                                    │
│  │ pluginMetadata       │      │                                    │
│  └──────────────────────┘      │                                    │
│                                │                                    │
│  NOT used for:                 │  Used for:                         │
│  task, project, tag, etc.      │  All model persistence             │
└────────────────────────────────┴────────────────────────────────────┘
```

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
              ├──► Increment vector clock
              ├──► Append to SUP_OPS (disk)
              └──► Broadcast to other tabs
```

**SaveToDbEffects is DISABLED** - no writes to `pf` database for model data.

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
    ├──► Dispatch loadAllData(snapshot) to NgRx
    │
    └──► Load tail ops (seq > snapshot.lastAppliedOpSeq)
              │
              └──► Replay ops with isRemote=true (prevents re-logging)
```

### 3.3 Sync Path (Legacy Providers)

```
Sync Triggered (WebDAV/Dropbox/LocalFile)
    │
    ▼
SyncService calls PFAPI.getAllSyncModelData()
    │
    ▼
PfapiStoreDelegateService.getAllSyncModelDataFromStore()
    │
    ├──► Read NgRx state via selectors (task, project, tag, etc.)
    │
    └──► Load non-NgRx models from 'pf' database (reminders, archives)
              │
              ▼
         Return combined data
              │
              ▼
         Generate main.json / model files
              │
              ▼
         Upload to provider
```

**Key insight:** PFAPI reads directly from NgRx. The `pf` database is completely bypassed for model data read/write. It is NOT used as a cache.

### 3.4 Sync Download Path

```
Download from Provider
    │
    ▼
PFAPI receives main.json
    │
    ▼
Dispatch loadAllData(remoteData) to NgRx
    │
    ▼
OperationLogEffects sees loadAllData
    │
    └──► Creates "import" operation in SUP_OPS
         (or skips if isRemote=true)
```

---

## 4. Provider-Specific Sync Strategy

### 4.1 Decision Matrix

| Provider            | Remote Sync Protocol    | Notes                              |
| ------------------- | ----------------------- | ---------------------------------- |
| **WebDAV**          | Legacy LWW              | Uploads main.json, reads from NgRx |
| **Dropbox**         | Legacy LWW              | Uploads main.json, reads from NgRx |
| **Local File Sync** | Legacy LWW              | Single file sync, reads from NgRx  |
| **Future Server**   | Operation Log (planned) | Would upload/download ops directly |

### 4.2 Why Legacy Providers Don't Use Op-Log Sync

- **WebDAV**: HTTP overhead makes thousands of small op files slow
- **Dropbox**: API rate limits, slow directory listing
- **LocalFile**: Simpler to sync one file than manage op chunks

Op-log sync is reserved for future server-based providers that can efficiently handle operation streams.

---

## 5. Key Services

### 5.1 File Map

```
src/app/core/persistence/operation-log/
├── operation.types.ts               # Type definitions
├── operation-log-store.service.ts   # SUP_OPS IndexedDB persistence
├── operation-log.effects.ts         # NgRx effect capture
├── operation-log-hydrator.service.ts# Startup state restoration
├── operation-log-compaction.service.ts # Snapshot + GC
├── operation-applier.service.ts     # Apply ops to store
├── operation-converter.util.ts      # Op ↔ Action conversion
├── conflict-resolution.service.ts   # Conflict UI (future)
├── dependency-resolver.service.ts   # Entity dependency tracking
├── lock.service.ts                  # Cross-tab locking
└── multi-tab-coordinator.service.ts # BroadcastChannel sync

src/app/pfapi/
├── pfapi-store-delegate.service.ts  # Reads NgRx state for sync
└── pfapi.service.ts                 # Sync orchestration
```

### 5.2 Service Responsibilities

| Service                         | Responsibility                                |
| ------------------------------- | --------------------------------------------- |
| `OperationLogStoreService`      | SUP_OPS IndexedDB CRUD, vector clock tracking |
| `OperationLogEffects`           | Capture actions, write ops to SUP_OPS         |
| `OperationLogHydratorService`   | Load snapshot + replay tail on startup        |
| `OperationLogCompactionService` | Create snapshots, prune old ops               |
| `PfapiStoreDelegateService`     | Read NgRx state for legacy sync               |
| `LockService`                   | Web Locks API + fallback for cross-tab safety |
| `MultiTabCoordinatorService`    | BroadcastChannel for tab coordination         |

---

## 6. Operation Structure

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
  vectorClock: VectorClock; // Causality tracking
  timestamp: number; // Wall clock (epoch ms)
  schemaVersion: number; // For migrations
  parentOpId?: string; // For conflict chains
}

type OpType = 'CRT' | 'UPD' | 'DEL' | 'MOV' | 'BATCH';
```

---

## 7. Compaction

### 7.1 Triggers

- Every 500 operations
- On app close (optional)

### 7.2 Process

```
1. Acquire compaction lock
2. Read current state from NgRx (via selector)
3. Save snapshot to SUP_OPS.state_cache
4. Delete ops WHERE syncedAt IS NOT NULL AND appliedAt < (now - 7 days)
5. Never delete unsynced ops
```

### 7.3 Configuration

| Setting            | Value   | Description                            |
| ------------------ | ------- | -------------------------------------- |
| Compaction trigger | 500 ops | Ops before snapshot                    |
| Retention window   | 7 days  | Keep synced ops for conflict detection |

---

## 8. Genesis Migration

On first startup with operation log (when SUP_OPS is empty):

```
1. Check if SUP_OPS has any ops
2. If empty:
   a. Load all data from 'pf' database (legacy)
   b. Create "genesis" operation with full state
   c. Save snapshot to state_cache
3. Future startups hydrate from SUP_OPS
```

---

## 9. Multi-Tab Coordination

### 9.1 Write Coordination

```typescript
// Primary: Web Locks API
await navigator.locks.request('sp_op_log_write', callback);

// Fallback: localStorage mutex (for older WebViews)
await this.acquireFallbackLock(lockName, callback);
```

### 9.2 State Broadcast

When one tab writes an operation:

1. Write to SUP_OPS
2. Broadcast via BroadcastChannel
3. Other tabs receive and apply operation (with isRemote=true)

---

## 10. Action Filtering

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

## 11. Current Implementation Status

### Complete ✅

- Dual IndexedDB architecture (pf + SUP_OPS)
- NgRx effect capture with vector clock
- Snapshot + tail replay hydration
- Multi-tab BroadcastChannel coordination
- Web Locks + localStorage fallback
- Genesis migration from legacy data
- Op → Action conversion with isRemote flag
- `PfapiStoreDelegateService` (reads NgRx for sync)

### In Progress 🚧

| Component           | Status                        | Priority |
| ------------------- | ----------------------------- | -------- |
| Compaction triggers | Logic exists, never invoked   | HIGH     |
| Dependency resolver | Extracts deps, no retry queue | HIGH     |
| Action blacklist    | Only ~10 actions, needs audit | MEDIUM   |

### Not Started ❌

| Component              | Description                      | Priority |
| ---------------------- | -------------------------------- | -------- |
| Future server sync     | Op-log sync for server providers | LOW      |
| Per-entity conflict UI | Field-level diff display         | LOW      |
| Schema migrations      | Op/snapshot version migrations   | MEDIUM   |

---

## 12. Architectural Simplifications Made

### 12.1 Removed: Feature Flag

**Old:** `useOperationLogSync` feature flag to toggle between op-log and legacy persistence.

**New:** Operation log is always enabled. One implementation, no conditionals.

### 12.2 Removed: Dual Write Path

**Old:** Both `SaveToDbEffects` (→ pf) and `OperationLogEffects` (→ SUP_OPS) running in parallel.

**New:** Only `OperationLogEffects` writes to persistence. `SaveToDbEffects` is disabled.

### 12.3 Removed: Memory-Only Adapter

**Old:** `SaveToDbEffects` updating ModelCtrl cache without disk writes.

**New:** PFAPI reads directly from NgRx via `PfapiStoreDelegateService`. No cache to manage.

### 12.4 Simplified: PFAPI Role

**Old:** PFAPI managed local persistence + sync protocol.

**New:** PFAPI manages sync protocol only. Local persistence is handled by operation log. The `pf` database is strictly for metadata (vector clocks) and non-NgRx data (archives).

---

## 13. References

- [Execution Plan](./operation-log-execution-plan.md) - Implementation tasks
- [Refactoring Plan](./refactoring-plan-oplog-decoupling.md) - Decoupling details
