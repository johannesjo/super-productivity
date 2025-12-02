# Operation Log Sync: Architecture

**Status:** Implementation in Progress
**Branch:** `feat/operation-logs`

---

## 1. Overview

The Operation Log sync system provides per-entity conflict detection and semantic merge capabilities for sync providers that support it, while maintaining compatibility with legacy Last-Writer-Wins (LWW) sync for WebDAV/Dropbox.

### Core Paradigm

- **NgRx is the Single Source of Truth**
- **Persistence is a Log of Operations** (local)
- **Sync strategy varies by provider** (remote)

### Key Benefits

| Problem (Current)       | Solution (Operation Log)                    |
| ----------------------- | ------------------------------------------- |
| Last-write-wins on file | Per-operation merge with granular conflicts |
| Full state sync         | Delta operations only                       |
| Dual source of truth    | NgRx primary, IndexedDB derived             |
| Binary conflict choice  | Automatic merge of non-conflicting ops      |

---

## 2. Dual Database Architecture

The system uses **two separate IndexedDB databases** that coexist:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         IndexedDB                                   │
├────────────────────────────────┬────────────────────────────────────┤
│      'pf' database             │      'SUP_OPS' database            │
│      (Legacy PFAPI)            │      (Operation Log)               │
│                                │                                    │
│  ┌──────────────────────┐      │  ┌──────────────────────┐          │
│  │ META_MODEL (metadata)│      │  │ ops (event log)      │          │
│  │ task (full state)    │      │  │ state_cache (snapshot)│         │
│  │ project (full state) │      │  └──────────────────────┘          │
│  │ tag (full state)     │      │                                    │
│  │ ...                  │      │                                    │
│  └──────────────────────┘      │                                    │
│                                │                                    │
│  Used by: Legacy LWW sync      │  Used by: Op log sync              │
│  (WebDAV, Dropbox)             │  (Local File, Future Server)       │
└────────────────────────────────┴────────────────────────────────────┘
```

### Why Two Databases?

- **No key conflicts** - completely separate namespaces
- **Backward compatible** - legacy sync continues to work unchanged
- **Provider-specific sync** - each uses the appropriate database
- **Migration safe** - Genesis op copies legacy state to op log

---

## 3. Provider-Specific Sync Strategy

### 3.1 Decision Matrix

| Provider            | Remote Sync Strategy     | Local Persistence | Reason                                  |
| ------------------- | ------------------------ | ----------------- | --------------------------------------- |
| **WebDAV**          | Legacy LWW (`main.json`) | Both databases    | HTTP overhead makes many files slow     |
| **Dropbox**         | Legacy LWW (`main.json`) | Both databases    | API rate limits, slow directory listing |
| **Local File Sync** | Operation Log            | Both databases    | Local disk is fast                      |
| **Future Server**   | Operation Log            | Both databases    | Server handles ops efficiently          |

### 3.2 Sync Flow by Provider

**WebDAV / Dropbox (Legacy LWW):**

```
Sync Triggered
    │
    └─→ SyncService.sync()
         │
         ├─→ Skip operation log sync (provider not supported)
         │
         └─→ Legacy MetaSyncService
              ├─→ Compare vector clocks (from 'pf' META_MODEL)
              ├─→ Upload/download main.json as needed
              └─→ Full state replacement on conflict
```

**Local File Sync / Future Server (Operation Log):**

```
Sync Triggered
    │
    └─→ SyncService.sync()
         │
         ├─→ OperationLogSyncService
         │    ├─→ Upload pending ops from SUP_OPS
         │    ├─→ Download remote ops
         │    ├─→ Detect per-entity conflicts
         │    └─→ Apply/resolve conflicts
         │
         └─→ Legacy sync (optional backup)
```

### 3.3 Implementation

```typescript
// In sync.service.ts
async sync(): Promise<void> {
  const provider = this._currentSyncProvider$.value;

  // Operation log sync only for supported providers
  if (this.supportsOpLogSync(provider)) {
    await this._operationLogSyncService.uploadPendingOps(provider);
    await this._operationLogSyncService.downloadRemoteOps(provider);
  }

  // Legacy LWW sync
  // - For WebDAV/Dropbox: This is the primary sync
  // - For others: This provides backup
  await this.legacySync();
}

private supportsOpLogSync(provider: SyncProvider | null): boolean {
  if (!provider) return false;
  // WebDAV and Dropbox use legacy only
  return provider.id !== 'WebDAV' && provider.id !== 'Dropbox';
}
```

---

## 4. Data Structures

### 4.1 Operation

```typescript
interface Operation {
  id: string; // UUID v7 (time-ordered)
  actionType: string; // NgRx action type
  opType: OpType; // CRT | UPD | DEL | MOV | BATCH
  entityType: EntityType; // TASK | PROJECT | TAG | NOTE | ...
  entityId?: string; // Affected entity ID
  entityIds?: string[]; // For batch operations
  payload: unknown; // Action payload (Typia-validated)
  clientId: string; // Device ID
  vectorClock: VectorClock; // Causality tracking
  timestamp: number; // Wall clock (epoch ms)
  schemaVersion: number; // For migrations
  parentOpId?: string; // For conflict chains
}
```

### 4.2 Log Entry (IndexedDB)

```typescript
interface OperationLogEntry {
  seq: number; // Auto-increment primary key
  op: Operation;
  appliedAt: number; // When applied locally
  source: 'local' | 'remote';
  syncedAt?: number; // When synced (null if pending)
}
```

### 4.3 Conflict

```typescript
interface EntityConflict {
  entityType: EntityType;
  entityId: string;
  localOps: Operation[];
  remoteOps: Operation[];
  suggestedResolution: 'local' | 'remote' | 'merge' | 'manual';
  mergedPayload?: unknown;
}
```

---

## 5. Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interaction                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ NgRx Action
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     NgRx Store                              │
│                  (Single Source of Truth)                   │
└───────────┬─────────────────────────────────┬───────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│  Operation Log Effects    │   │  Legacy PFAPI ModelCtrl     │
│  - Blacklist filter       │   │  - Direct state saves       │
│  - !isRemote filter       │   │  - Used by legacy code      │
│  - Write to SUP_OPS       │   │  - Write to 'pf' DB         │
└───────────┬───────────────┘   └──────────────┬──────────────┘
            │                                  │
            ▼                                  ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│  IndexedDB: SUP_OPS       │   │  IndexedDB: pf              │
│  ├── ops (log entries)    │   │  ├── META_MODEL             │
│  └── state_cache          │   │  ├── task, project, ...     │
└───────────┬───────────────┘   └──────────────┬──────────────┘
            │                                  │
            ▼                                  ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│  Op Log Sync              │   │  Legacy LWW Sync            │
│  (Local File, Server)     │   │  (WebDAV, Dropbox)          │
└───────────────────────────┘   └─────────────────────────────┘
```

---

## 6. Core Services

### 6.1 File Map

```
src/app/core/persistence/operation-log/
├── operation.types.ts               # Type definitions
├── operation-log-store.service.ts   # SUP_OPS IndexedDB persistence
├── operation-log.effects.ts         # NgRx effect capture
├── operation-log-hydrator.service.ts# Startup state restoration
├── operation-log-sync.service.ts    # Remote sync (for supported providers)
├── operation-log-compaction.service.ts # Garbage collection
├── operation-applier.service.ts     # Apply ops to store
├── operation-converter.util.ts      # Op ↔ Action conversion
├── conflict-resolution.service.ts   # Conflict UI/logic
├── dependency-resolver.service.ts   # Entity dependency handling
├── action-whitelist.ts              # Blacklisted actions (not persisted)
├── lock.service.ts                  # Cross-tab locking
├── multi-tab-coordinator.service.ts # BroadcastChannel sync
└── replay-guard.service.ts          # [PLANNED] Prevents side effects during replay
```

### 6.2 Service Responsibilities

| Service                         | Responsibility                                     |
| ------------------------------- | -------------------------------------------------- |
| `OperationLogStoreService`      | SUP_OPS IndexedDB CRUD, vector clock tracking      |
| `OperationLogEffects`           | Capture persistent actions, write ops              |
| `OperationLogHydratorService`   | Load snapshot + replay tail on startup             |
| `OperationLogSyncService`       | Upload/download ops (non-WebDAV/Dropbox only)      |
| `OperationLogCompactionService` | Create snapshots, prune old ops                    |
| `OperationApplierService`       | Dispatch ops as actions with dependency resolution |
| `ConflictResolutionService`     | Present conflicts to user, apply resolutions       |
| `DependencyResolverService`     | Track entity dependencies, queue missing deps      |
| `ReplayGuardService`            | Signal to block side effects during hydration      |
| `LockService`                   | Web Locks API + fallback for cross-tab safety      |
| `MultiTabCoordinatorService`    | BroadcastChannel for tab coordination              |

---

## 7. Key Workflows

### 7.1 Write Path (User Action)

```
1. User action → NgRx dispatch
2. Reducer updates state (optimistic)
3. OperationLogEffects:
   - Check blacklist (skip blacklisted)
   - Check !isRemote (skip remote ops)
   - Acquire Web Lock
   - Increment vector clock
   - Convert to Operation
   - Append to SUP_OPS IndexedDB
4. Legacy PFAPI also saves to 'pf' database (parallel)
```

### 7.2 Read Path (Startup)

```
1. Load snapshot from SUP_OPS state_cache (if exists)
2. Hydrate NgRx with snapshot state
3. Query ops WHERE seq > snapshot.lastAppliedOpSeq
4. Replay tail ops with isRemote=true (prevents re-logging)
5. If no snapshot: run migration from legacy 'pf' database
```

### 7.3 Migration (Legacy → Op Log)

```
First startup with op log enabled:
1. Check if SUP_OPS has any ops (lastSeq > 0)
2. If empty, load all data from 'pf' database
3. Create Genesis Operation (batch of all legacy state)
4. Save snapshot to state_cache
5. Future startups hydrate from SUP_OPS
```

### 7.4 Sync Path (Provider-Dependent)

**For Local File Sync / Future Server:**

```
Upload:
1. Get unsynced ops from SUP_OPS
2. Upload ops to remote
3. Mark ops as synced

Download:
1. Download remote ops
2. Detect conflicts (vector clock comparison)
3. Apply non-conflicting ops
4. Present conflicts to user
```

**For WebDAV / Dropbox:**

```
(Uses legacy sync unchanged)
1. Compare META_MODEL vector clocks
2. Download/upload main.json as needed
3. Full state replacement
```

### 7.5 Conflict Detection

```typescript
// Vector clock comparison determines conflict type:
EQUAL           → Same state, no action needed
HAPPENED_BEFORE → Local is ancestor, apply remote
HAPPENED_AFTER  → Remote is ancestor (stale), skip
CONCURRENT      → TRUE CONFLICT - needs resolution
```

### 7.6 Compaction

```
Triggers: Every 500 ops, app close, size > 10MB

1. Acquire compaction lock
2. Snapshot current NgRx state
3. Save to SUP_OPS state_cache with lastAppliedOpSeq
4. Delete ops WHERE syncedAt AND appliedAt < (now - 7 days)
5. Never delete unsynced ops
```

---

## 8. Entity Relationships

### 8.1 Dependency Graph

```
TASK → PROJECT (soft: orphan if missing)
TASK → TAG (soft: skip missing)
TASK → TASK (parent/child - hard: queue if missing)
NOTE → PROJECT (soft: orphan if missing)
TASK_REPEAT_CFG → PROJECT (soft: orphan if missing)
```

### 8.2 Dependency Handling

| Type | Behavior                                                |
| ---- | ------------------------------------------------------- |
| Hard | Queue op, retry when dependency arrives (max 5 retries) |
| Soft | Apply op, skip/null missing reference, log warning      |

### 8.3 Cascade Operations

- **Delete Project** → Orphan tasks to inbox (not cascade delete)
- **Delete Parent Task** → Cascade delete subtasks
- **Delete Tag** → Remove from all task.tagIds

---

## 9. Safety Mechanisms

### 9.1 Replay Guard

Prevents side effects (notifications, analytics) during hydration/sync:

```typescript
// Services check this before triggering side effects
if (this.replayGuard.isReplaying()) return;
```

### 9.2 Action Filtering

We use a **Blacklist** approach. By default, all actions are persisted unless explicitly excluded. This ensures that new features are persisted by default, but requires care to exclude transient UI state.

```typescript
// Blacklisted actions are NOT persisted
BLACKLISTED_ACTION_TYPES: Set<string> = new Set([
  '[App] Set Current Worklog Task',
  '[Layout] Toggle Sidebar',
  // ...
]);
```

### 9.3 Cross-Tab Locking

```typescript
// Primary: Web Locks API
await navigator.locks.request('sp_op_log_write', callback);

// Fallback: localStorage mutex (for older WebViews)
await this.acquireFallbackLock(lockName, callback);
```

### 9.4 Vector Clock Pruning

After 30 days, prune device entries from vector clocks (implemented in `limitVectorClockSize`).

---

## 10. Configuration

| Setting            | Default | Description                            |
| ------------------ | ------- | -------------------------------------- |
| Compaction trigger | 500 ops | Ops before snapshot                    |
| Retention window   | 7 days  | Keep synced ops for conflict detection |
| Max retries        | 5       | Dependency retry attempts              |
| Retry delay        | 1000ms  | Between dependency retries             |

---

## 11. Feature Flag

```typescript
// In SyncConfig
useOperationLogSync?: boolean; // Default: false

// When enabled:
// - Local File Sync uses operation log
// - WebDAV/Dropbox continue using legacy LWW
// - Legacy sync runs as backup for all providers
```

---

## 12. Current Implementation Status

### Complete

- Dual IndexedDB architecture (pf + SUP_OPS)
- NgRx effect capture with vector clock
- Snapshot + tail replay hydration
- 7-day compaction with snapshot
- Multi-tab BroadcastChannel coordination
- Web Locks + localStorage fallback
- Genesis migration from legacy data
- Op → Action conversion with isRemote flag
- Per-entity conflict detection

### In Progress / Gaps

| Component        | Gap                                        | Priority |
| ---------------- | ------------------------------------------ | -------- |
| Replay Guard     | No global flag to block side effects       | HIGH     |
| Action Blacklist | Refining blacklist (auditing all actions)  | HIGH     |
| Dependency Retry | Ops with missing deps are dropped          | HIGH     |
| Conflict UI      | Single global resolution, no field diffs   | HIGH     |
| Error Recovery   | Optimistic update rollback commented out   | MEDIUM   |
| Feature Flag UI  | No settings toggle for useOperationLogSync | MEDIUM   |
| Testing          | Only 1 spec file (multi-tab)               | MEDIUM   |

---

## 13. References

- [Execution Plan](./operation-log-execution-plan.md) - Phased implementation details
- [Full Design Doc](./operation-log-sync.md) - Comprehensive technical specification
- [Vector Clock Implementation](../../../src/app/pfapi/api/util/vector-clock.ts)
- [Current Sync Service](../../../src/app/pfapi/api/sync/sync.service.ts)
