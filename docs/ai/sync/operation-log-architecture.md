# Operation Log Sync: Architecture

**Status:** Implementation in Progress
**Branch:** `feat/operation-logs`

---

## 1. Overview

The Operation Log sync system replaces whole-file Last-Writer-Wins (LWW) with per-entity conflict detection and semantic merge capabilities.

### Core Paradigm

- **NgRx is the Single Source of Truth**
- **Persistence is a Log of Operations**
- **Sync is the Exchange of Operations**

### Key Benefits

| Problem (Current)       | Solution (Operation Log)                    |
| ----------------------- | ------------------------------------------- |
| Last-write-wins on file | Per-operation merge with granular conflicts |
| Full state sync         | Delta operations only                       |
| Dual source of truth    | NgRx primary, IndexedDB derived             |
| Binary conflict choice  | Automatic merge of non-conflicting ops      |

---

## 2. Data Structures

### 2.1 Operation

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

### 2.2 Log Entry (IndexedDB)

```typescript
interface OperationLogEntry {
  seq: number; // Auto-increment primary key
  op: Operation;
  appliedAt: number; // When applied locally
  source: 'local' | 'remote';
  syncedAt?: number; // When synced (null if pending)
}
```

### 2.3 Conflict

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

## 3. Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interaction                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ NgRx Action
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     NgRx Store                              │
│                  (Single Source of Truth)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ Effect (isPersistent)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Operation Log Effects                          │
│  - Filter: blacklist + !isRemote                            │
│  - Convert action → Operation                               │
│  - Increment vector clock                                   │
│  - Write to IndexedDB (with Web Lock)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              IndexedDB: SUP_OPS                             │
│  ├── ops (operation log entries)                            │
│  └── state_cache (snapshots for hydration)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Sync Layer                                │
│  - Upload: pending ops → chunked files → remote             │
│  - Download: remote files → conflict detection → apply      │
│  - Manifest: tracks all op files + last snapshot            │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Core Services

### 4.1 File Map

```
src/app/core/persistence/operation-log/
├── operation.types.ts               # Type definitions
├── operation-log-store.service.ts   # IndexedDB persistence
├── operation-log.effects.ts         # NgRx effect capture
├── operation-log-hydrator.service.ts# Startup state restoration
├── operation-log-sync.service.ts    # Remote sync
├── operation-log-compaction.service.ts # Garbage collection
├── operation-applier.service.ts     # Apply ops to store
├── operation-converter.util.ts      # Op ↔ Action conversion
├── conflict-resolution.service.ts   # Conflict UI/logic
├── dependency-resolver.service.ts   # Entity dependency handling
├── action-whitelist.ts              # Persistent action registry (Blacklist)
├── lock.service.ts                  # Cross-tab locking
├── multi-tab-coordinator.service.ts # BroadcastChannel sync
└── replay-guard.service.ts          # Prevents side effects during replay
```

### 4.2 Service Responsibilities

| Service                         | Responsibility                                     |
| ------------------------------- | -------------------------------------------------- |
| `OperationLogStoreService`      | IndexedDB CRUD, vector clock tracking              |
| `OperationLogEffects`           | Capture persistent actions, write ops              |
| `OperationLogHydratorService`   | Load snapshot + replay tail on startup             |
| `OperationLogSyncService`       | Upload/download ops, detect conflicts              |
| `OperationLogCompactionService` | Create snapshots, prune old ops                    |
| `OperationApplierService`       | Dispatch ops as actions with dependency resolution |
| `ConflictResolutionService`     | Present conflicts to user, apply resolutions       |
| `DependencyResolverService`     | Track entity dependencies, queue missing deps      |
| `ReplayGuardService`            | Signal to block side effects during hydration      |
| `LockService`                   | Web Locks API + fallback for cross-tab safety      |
| `MultiTabCoordinatorService`    | BroadcastChannel for tab coordination              |

---

## 5. Key Workflows

### 5.1 Write Path (User Action)

```
1. User action → NgRx dispatch
2. Reducer updates state (optimistic)
3. OperationLogEffects:
   - Check blacklist (skip blacklisted)
   - Check !isRemote (skip remote ops)
   - Acquire Web Lock
   - Increment vector clock
   - Convert to Operation
   - Append to IndexedDB
```

### 5.2 Read Path (Startup)

```
1. Load snapshot from state_cache (if exists)
2. Hydrate NgRx with snapshot state
3. Query ops WHERE seq > snapshot.lastAppliedOpSeq
4. Replay tail ops with isRemote=true (prevents re-logging)
5. If no snapshot: full replay from op log
```

### 5.3 Sync Path

**Upload:**

```
1. Get unsynced ops from IndexedDB
2. Chunk into files (100 ops/file)
3. Upload to remote storage
4. Mark ops as synced
5. Update remote manifest
```

**Download:**

```
1. Fetch remote manifest
2. Identify new op files
3. Download and parse ops
4. Filter already-applied (by op.id)
5. Detect conflicts (vector clock comparison)
6. Apply non-conflicting ops
7. Present conflicts to user
```

### 5.4 Conflict Detection

```typescript
// Vector clock comparison determines conflict type:
EQUAL           → Same state, no action needed
HAPPENED_BEFORE → Local is ancestor, apply remote
HAPPENED_AFTER  → Remote is ancestor (stale), skip
CONCURRENT      → TRUE CONFLICT - needs resolution
```

### 5.5 Compaction

```
Triggers: Every 500 ops, app close, size > 10MB

1. Acquire compaction lock
2. Snapshot current NgRx state
3. Save to state_cache with lastAppliedOpSeq
4. Delete ops WHERE syncedAt AND appliedAt < (now - 7 days)
5. Never delete unsynced ops
```

---

## 6. Entity Relationships

### 6.1 Dependency Graph

```
TASK → PROJECT (soft: orphan if missing)
TASK → TAG (soft: skip missing)
TASK → TASK (parent/child - hard: queue if missing)
NOTE → PROJECT (soft: orphan if missing)
TASK_REPEAT_CFG → PROJECT (soft: orphan if missing)
```

### 6.2 Dependency Handling

| Type | Behavior                                                |
| ---- | ------------------------------------------------------- |
| Hard | Queue op, retry when dependency arrives (max 5 retries) |
| Soft | Apply op, skip/null missing reference, log warning      |

### 6.3 Cascade Operations

- **Delete Project** → Orphan tasks to inbox (not cascade delete)
- **Delete Parent Task** → Cascade delete subtasks
- **Delete Tag** → Remove from all task.tagIds

---

## 7. Remote Storage Format

```
/superproductivity/
├── main.json              # Legacy full state (backup)
├── meta.json              # Legacy metadata
├── ops/
│   ├── manifest.json      # Index of op files
│   ├── ops_clientA_*.json # Chunked op files
│   └── ...
└── snapshots/
    └── snapshot_*.json    # Periodic full snapshots
```

**Manifest:**

```typescript
interface OperationLogManifest {
  version: number;
  operationFiles: string[];
  lastCompactedSeq?: number;
  lastCompactedSnapshotFile?: string;
}
```

---

## 8. Safety Mechanisms

### 8.1 Replay Guard

Prevents side effects (notifications, analytics) during hydration/sync:

```typescript
// Services check this before triggering side effects
if (this.replayGuard.isReplaying()) return;
```

### 8.2 Action Filtering

We use a **Blacklist** approach. By default, all actions are persisted unless explicitly excluded. This ensures that new features are persisted by default, but requires care to exclude transient UI state.

```typescript
// Blacklisted actions are NOT persisted
BLACKLISTED_ACTION_TYPES: Set<string> = new Set([
  '[App] Set Current Worklog Task',
  '[Layout] Toggle Sidebar',
  // ...
]);
```

### 8.3 Cross-Tab Locking

```typescript
// Primary: Web Locks API
await navigator.locks.request('sp_op_log_write', callback);

// Fallback: localStorage mutex (for older WebViews)
await this.acquireFallbackLock(lockName, callback);
```

### 8.4 Vector Clock Pruning

After 30 days, prune device entries from vector clocks (implemented in `limitVectorClockSize`).

---

## 9. Configuration

| Setting            | Default | Description                            |
| ------------------ | ------- | -------------------------------------- |
| Compaction trigger | 500 ops | Ops before snapshot                    |
| Retention window   | 7 days  | Keep synced ops for conflict detection |
| Chunk size         | 100 ops | Ops per remote file                    |
| Max retries        | 5       | Dependency retry attempts              |
| Retry delay        | 1000ms  | Between dependency retries             |

---

## 10. Feature Flag

```typescript
// In SyncConfig
useOperationLogSync?: boolean; // Default: false

// Hybrid mode during rollout:
// - Operation log sync for incremental changes
// - Legacy full-file sync as safety net
```

---

## 11. Current Implementation Status

### Complete

- IndexedDB store with ops + state_cache
- NgRx effect capture with vector clock
- Manifest-based chunked file sync
- Per-entity conflict detection
- Snapshot + tail replay hydration
- 7-day compaction with snapshot
- Multi-tab BroadcastChannel coordination
- Web Locks + localStorage fallback
- Genesis migration from legacy data
- Op → Action conversion with isRemote flag

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

## 12. References

- [Execution Plan](./operation-log-execution-plan.md) - Phased implementation details
- [Full Design Doc](./operation-log-sync.md) - Comprehensive technical specification
- [Vector Clock Implementation](../../../src/app/pfapi/api/util/vector-clock.ts)
- [Current Sync Service](../../../src/app/pfapi/api/sync/sync.service.ts)
