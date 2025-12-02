# Operation Log Sync: Architecture

**Status:** Implementation in Progress (~65% complete)
**Branch:** `feat/operation-logs`
**Last Updated:** December 2, 2025

---

## 1. Overview

The Operation Log sync system provides per-entity conflict detection and semantic merge capabilities for sync providers that support it, while maintaining compatibility with legacy Last-Writer-Wins (LWW) sync for WebDAV/Dropbox.

### 1.1 Why Event Sourcing?

We evaluated two approaches:

| Approach                       | Complexity | Effort     | Result                                                 |
| ------------------------------ | ---------- | ---------- | ------------------------------------------------------ |
| Per-entity delta sync          | Medium     | 2-3 weeks  | Attempted - still complex due to relationship handling |
| Operation log (event sourcing) | High       | 8-10 weeks | **Chosen** - better conflict granularity               |

**Decision Rationale (December 2, 2025):**

1. ✅ **Disk space**: Acceptable with compaction (snapshot + 7 days of ops ≈ 1.5-2x traditional)
2. ✅ **Sync speed**: Faster (delta ops vs full state transfer)
3. ✅ **Legacy compatibility**: Maintained (WebDAV/Dropbox use legacy sync only)

### 1.2 Core Paradigm

- **NgRx is the runtime state** (in-memory, volatile)
- **IndexedDB (`SUP_OPS`) is the durable source of truth** (survives restarts)
- **Persistence is Hybrid** (Op Log + Legacy)
- **Sync strategy varies by provider** (remote)

> **Note:** On startup, NgRx is hydrated FROM IndexedDB. The "source of truth" for persistence is `SUP_OPS`, not NgRx.

### 1.3 Key Benefits

| Problem (Current)       | Solution (Operation Log)                    |
| ----------------------- | ------------------------------------------- |
| Last-write-wins on file | Per-operation merge with granular conflicts |
| Full state sync         | Delta operations only                       |
| Dual source of truth    | SUP_OPS primary, NgRx is runtime cache      |
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

> All current providers (WebDAV, Dropbox, LocalFileSync) use the **same legacy LWW approach**. They all sync to a `__meta` file and WebDAV and Dropbox additionally sync separate per model files for certain files. Operation log sync is reserved for future server-based providers only.

| Provider            | Remote Sync Strategy            | Local Persistence | Reason                                    |
| ------------------- | ------------------------------- | ----------------- | ----------------------------------------- |
| **WebDAV**          | Legacy LWW (Meta + Model files) | Both (Hybrid)     | HTTP overhead makes many files slow       |
| **Dropbox**         | Legacy LWW (Meta + Model files) | Both (Hybrid)     | API rate limits, slow directory listing   |
| **Local File Sync** | Legacy LWW (Single Meta file)   | Both (Hybrid)     | Simple local file access, one file easier |
| **Future Server**   | Operation Log (planned)         | Both (Hybrid)     | Server would handle ops efficiently       |

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
              ├─→ Upload/download __meta file as needed
              ├─→ Upload/download model files as needed
              └─→ Full state replacement on conflict
```

**Local File Sync:**

> **Note:** LocalFileSync uses the same legacy LWW flow as WebDAV/Dropbox. It will remain on legacy sync.

```
Sync Triggered
    │
    └─→ SyncService.sync()
         │
         ├─→ Skip operation log sync (not supported)
         │
         └─→ Legacy MetaSyncService (single __meta file)
```

**Future Server (Operation Log - PLANNED):**

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

> **Hybrid Sync Logic:** The sync service determines which sync method to use based on the provider type.

```typescript
// INTENDED (sync.service.ts)
async sync(): Promise<void> {
  const provider = this._currentSyncProvider$.value;

  // 1. Operation Log Sync (Future Server Providers)
  if (this.supportsOpLogSync(provider)) {
    await this._operationLogSyncService.uploadPendingOps(provider);
    await this._operationLogSyncService.downloadRemoteOps(provider);
  }

  // 2. Legacy LWW Sync (WebDAV, Dropbox, LocalFile)
  // Maintained for backward compatibility and existing providers
  if (this.isLegacySyncProvider(provider)) {
     await this.legacySync();
  }
}

private supportsOpLogSync(provider: SyncProvider | null): boolean {
  // Only future server provider supports Op Log sync remotely
  return provider === 'SERVER';
}

private isLegacySyncProvider(provider: SyncProvider | null): boolean {
   // WebDAV, Dropbox, LocalFile use legacy LWW sync
   return ['WEBDAV', 'DROPBOX', 'LOCAL_FILE'].includes(provider);
}
```

### 3.4 Simplified Local Persistence Strategy

Running two local persistence paths (SUP_OPS + `pf`) in parallel adds significant complexity. A simpler approach:

- **Single local source of truth:** In op-log mode, hydrate only from SUP_OPS (snapshot + tail) and disable `SaveToDbEffects` writes to `pf`.
- **Legacy projection for sync:** Before a WebDAV/Dropbox/LocalFile sync, materialize the current NgRx state (or SUP_OPS snapshot) into the `pf` shape (`__meta` + model blobs). Use this projection solely for the sync upload/download; do not treat it as a second source of truth afterward.
- **Legacy ingest:** When legacy sync downloads data, convert it into a genesis op (or batch ops), append to SUP_OPS, then replay into NgRx so remote data still flows through the op-log pipeline.
- **Simple gating:** `syncMode = 'oplog' | 'legacy'`; op-log sync runs only for providers that support it. Legacy providers touch op-log only via the projection/ingest adapters.

This keeps “save/load locally” unified (op log only) and confines legacy compatibility to thin adapters at the sync boundary.

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

## 5. Architecture Layers & PFAPI Integration

### 5.1 Current State (Op Log Branch) - B-Lite Implementation

The system uses **exclusive persistence** based on the `useOperationLogSync` feature flag:

**When `useOperationLogSync: true` (Op-Log Mode):**

- `OperationLogEffects` writes all actions to `SUP_OPS` (IndexedDB)
- `SaveToDbEffects` is **completely disabled** (filtered out)
- Legacy sync reads from NgRx store via `PfapiStoreDelegateService`
- The 'pf' database is NOT written to during normal operation

**When `useOperationLogSync: false` (Legacy Mode):**

- `SaveToDbEffects` writes to 'pf' database as usual
- `OperationLogEffects` still runs (for future migration)

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interaction                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ NgRx Action
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     NgRx Store                              │
│                  (Runtime State)                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      │               │               │
      ▼               ▼               ▼
┌───────────┐  ┌─────────────┐  ┌───────────────────────┐
│ Op Log    │  │ SaveToDb    │  │ PfapiStoreDelegate    │
│ Effects   │  │ Effects     │  │ Service               │
│           │  │             │  │                       │
│ (Always)  │  │ (Legacy     │  │ (Reads NgRx for       │
│           │  │  mode only) │  │  legacy sync when     │
│           │  │             │  │  oplog enabled)       │
└─────┬─────┘  └──────┬──────┘  └───────────────────────┘
      │               │
      ▼               ▼
┌───────────┐  ┌─────────────┐
│ SUP_OPS   │  │ 'pf' DB     │
│ IndexedDB │  │ IndexedDB   │
└───────────┘  └─────────────┘
```

### 5.2 PFAPI Integration Points

The Operation Log system integrates with PFAPI at several key points:

| Integration Point                          | How It's Used                             |
| ------------------------------------------ | ----------------------------------------- |
| `PfapiService.pf.metaModel.loadClientId()` | Get device ID for vector clocks           |
| `PfapiService.pf.getAllSyncModelData()`    | Get current state for snapshots/migration |
| `VectorClock` utilities                    | Shared conflict detection logic           |
| `SyncProviderServiceInterface`             | Reuse provider abstractions               |
| `loadAllData` action                       | Hydrate NgRx from snapshot/legacy data    |

### 5.3 The 'pf' Database Role

In the B-Lite model, the `'pf'` database usage is minimized when op-log sync is enabled:

| Scenario                 | 'pf' Database Usage                                                            |
| ------------------------ | ------------------------------------------------------------------------------ |
| **Startup**              | NOT used - hydration is from SUP_OPS snapshot + tail replay                    |
| **User Actions**         | **NOT WRITTEN** - `SaveToDbEffects` is completely disabled                     |
| **Genesis Migration**    | READ ONCE - legacy data copied to SUP_OPS as genesis op                        |
| **Legacy Sync Download** | WRITTEN - WebDAV/Dropbox download updates 'pf' then dispatches to NgRx         |
| **Legacy Sync Upload**   | **BYPASSED** - Sync reads fresh data from NgRx via `PfapiStoreDelegateService` |
| **Disable Op-Log**       | **FLUSHED** - Current NgRx state is written to 'pf' database for legacy mode   |

### 5.4 Sync Flow (Full Picture)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SyncService.sync()                                 │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
      ┌───────────────────────────┴───────────────────────────┐
      │                                                       │
      ▼                                                       ▼
┌─────────────────────────────┐                 ┌─────────────────────────────┐
│  Operation Log Sync         │                 │  Legacy PFAPI Sync          │
│  (for Local File/Server)    │                 │  (for WebDAV/Dropbox)       │
│                             │                 │                             │
│  1. Upload pending ops      │                 │  1. Compare vector clocks   │
│  2. Download remote ops     │                 │  2. Download/upload __meta_ │
│  3. Per-entity conflict     │                 │  3. Sync changed models     │
│     detection               │                 │  4. Full state on conflict  │
│  4. Apply non-conflicting   │                 │                             │
│  5. Present conflicts       │                 │  Writes to 'pf' database    │
│                             │                 │  then dispatches to NgRx    │
│  Writes to SUP_OPS only     │                 │                             │
└─────────────────────────────┘                 └─────────────────────────────┘
```

### 5.5 Key Insight: B-Lite Delegate Pattern

When op-log sync is enabled, the system uses a **delegate pattern** for legacy sync:

- **NgRx Store**: Single runtime source of truth
- **SUP_OPS**: Durable persistence (source of truth on disk)
- **'pf' Database**: NOT written during normal operation
- **PfapiStoreDelegateService**: Reads from NgRx store for legacy sync uploads

**Implementation Details:**

- `PfapiService` sets the delegate via `pf.setGetAllSyncModelDataFromStoreDelegate()`
- The delegate combines 13 NgRx selectors for models in state
- Non-NgRx models (reminders, archives, plugins) are loaded from 'pf' database on-demand
- When disabling op-log mode, current NgRx state is flushed to 'pf' database

**Key Files:**

- `src/app/pfapi/pfapi-store-delegate.service.ts` - Reads all sync data from NgRx
- `src/app/pfapi/pfapi.service.ts:143-183` - Wires up delegate based on config
- `src/app/root-store/shared/save-to-db.effects.ts` - Disabled when oplog enabled

For comprehensive PFAPI architecture details, see [PFAPI Sync and Persistence Architecture](./pfapi-sync-persistence-architecture.md).

---

## 6. Core Services

### 6.1 File Map

```
src/app/core/persistence/operation-log/
├── operation.types.ts               # ✅ Type definitions
├── operation-log-store.service.ts   # ✅ SUP_OPS IndexedDB persistence
├── operation-log.effects.ts         # ✅ NgRx effect capture
├── operation-log-hydrator.service.ts# ✅ Startup state restoration
├── operation-log-sync.service.ts    # ⚠️ Remote sync (provider gating NOT implemented)
├── operation-log-compaction.service.ts # ⚠️ GC exists but NEVER TRIGGERED
├── operation-applier.service.ts     # ⚠️ Apply ops (missing retry queue)
├── operation-converter.util.ts      # ✅ Op ↔ Action conversion
├── conflict-resolution.service.ts   # ⚠️ Single global resolution only
├── dependency-resolver.service.ts   # ⚠️ Extracts deps, no retry queue
├── action-whitelist.ts              # ⚠️ Only 9 actions blacklisted
├── lock.service.ts                  # ✅ Cross-tab locking
├── multi-tab-coordinator.service.ts # ✅ BroadcastChannel sync
└── replay-guard.service.ts          # ❌ DOES NOT EXIST - Must create

src/app/pfapi/
├── pfapi-store-delegate.service.ts  # ✅ NEW: Reads sync data from NgRx store
└── pfapi.service.ts                 # ✅ MODIFIED: Wires up delegate for op-log mode

src/app/root-store/shared/
└── save-to-db.effects.ts            # ✅ MODIFIED: Disabled when op-log enabled
```

**Legend:** ✅ Complete | ⚠️ Partial/Broken | ❌ Missing

### 6.2 Service Responsibilities

| Service                         | Responsibility                                     | Status                |
| ------------------------------- | -------------------------------------------------- | --------------------- |
| `OperationLogStoreService`      | SUP_OPS IndexedDB CRUD, vector clock tracking      | ✅                    |
| `OperationLogEffects`           | Capture persistent actions, write ops              | ✅                    |
| `OperationLogHydratorService`   | Load snapshot + replay tail on startup             | ⚠️ No replay guard    |
| `OperationLogSyncService`       | Upload/download ops (non-WebDAV/Dropbox only)      | ⚠️ No provider gating |
| `OperationLogCompactionService` | Create snapshots, prune old ops                    | ⚠️ Never invoked      |
| `OperationApplierService`       | Dispatch ops as actions with dependency resolution | ⚠️ Missing retry      |
| `ConflictResolutionService`     | Present conflicts to user, apply resolutions       | ⚠️ Single resolution  |
| `DependencyResolverService`     | Track entity dependencies, queue missing deps      | ⚠️ No queue           |
| `ReplayGuardService`            | Signal to block side effects during hydration      | ❌ Missing            |
| `LockService`                   | Web Locks API + fallback for cross-tab safety      | ✅                    |
| `MultiTabCoordinatorService`    | BroadcastChannel for tab coordination              | ✅                    |
| `PfapiStoreDelegateService`     | Read sync data from NgRx for legacy sync           | ✅ NEW                |

---

## 7. Key Workflows

### 7.1 Write Path (User Action)

**When `useOperationLogSync: true`:**

```
1. User action → NgRx dispatch
2. Reducer updates state (optimistic)
3. OperationLogEffects → Writes to SUP_OPS (Disk)
4. SaveToDbEffects is DISABLED (no 'pf' writes)
```

**When `useOperationLogSync: false`:**

```
1. User action → NgRx dispatch
2. Reducer updates state (optimistic)
3. SaveToDbEffects → Writes to 'pf' database (Disk)
4. OperationLogEffects → Writes to SUP_OPS (for future migration)
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

> **⚠️ NOT IMPLEMENTED:** The `ReplayGuardService` does not exist. This section describes the intended design.

Prevents side effects (notifications, analytics) during hydration/sync:

```typescript
// Services check this before triggering side effects
if (this.replayGuard.isReplaying()) return;
```

**Required Scope:** The replay guard MUST be active during ALL operation replay scenarios:

| Entry Point                  | Location                               | Status         |
| ---------------------------- | -------------------------------------- | -------------- |
| Startup hydration            | `operation-log-hydrator.service.ts:22` | ❌ Not guarded |
| Remote op application        | `operation-log-sync.service.ts:223`    | ❌ Not guarded |
| Conflict resolution apply    | `conflict-resolution.service.ts:48`    | ❌ Not guarded |
| Dependency retry application | `dependency-resolver.service.ts`       | ❌ Not guarded |
| Multi-tab broadcast receive  | `multi-tab-coordinator.service.ts`     | ❌ Not guarded |

**Effects that MUST check the guard:**

- Notification scheduling
- Analytics tracking
- External API calls (Jira, GitHub, etc.)
- Electron tray updates
- Reminder scheduling
- Any effect with external side effects

### 9.2 Action Filtering

> **⚠️ FILE NAMING BUG:** The file `action-whitelist.ts` exports `BLACKLISTED_ACTION_TYPES`. This is confusing and should be renamed to `action-blacklist.ts`.

We use a **Blacklist** approach. By default, all actions are persisted unless explicitly excluded. This ensures that new features are persisted by default, but requires care to exclude transient UI state.

```typescript
// File: action-whitelist.ts (should be renamed to action-blacklist.ts)
// Blacklisted actions are NOT persisted
export const BLACKLISTED_ACTION_TYPES: Set<string> = new Set([
  '[App] Set Current Worklog Task',
  '[Layout] Toggle Sidebar',
  '[Layout] Show AddTaskBar',
  '[Layout] Hide AddTaskBar',
  '[Focus Mode] Enter Focus Mode',
  '[Focus Mode] Exit Focus Mode',
  '[Task] SetCurrentTask',
  '[Task] SetSelectedTask',
  '[Task] UnsetCurrentTask',
  '[Task] Update Task Ui',
  '[Task] Toggle Show Sub Tasks',
  // ... only 11 actions currently blacklisted!
]);
```

**Risk:** Using a blacklist means any new UI feature that dispatches an action will be persisted unless manually added to the list. Developers will forget, causing:

- Op log bloat with UI state changes
- Replay crashes if actions depend on transient DOM state

**Recommendation:** Consider switching to a **Whitelist** approach using `PersistentActionMeta.isPersistent` (already exists but underused).

**Actions likely missing from blacklist:**

- All `[Worklog]` UI state actions
- `[Pomodoro]` transient session state (vs. config)
- Focus session transient state
- Selection states across features
- Any action with `Ui` or `UI` in the name

### 9.3 Cross-Tab Locking

```typescript
// Primary: Web Locks API
await navigator.locks.request('sp_op_log_write', callback);

// Fallback: localStorage mutex (for older WebViews)
await this.acquireFallbackLock(lockName, callback);
```

### 9.4 Vector Clock Pruning

> **⚠️ DOCS vs CODE MISMATCH:** Documentation says "After 30 days", but actual code uses **count > 50** (no time-based logic).

**Actual Implementation** (`vector-clock.ts:326, 343-379`):

```typescript
const MAX_VECTOR_CLOCK_SIZE = 50;

export const limitVectorClockSize = (clock, currentClientId) => {
  if (entries.length <= MAX_VECTOR_CLOCK_SIZE) return clock;
  // Sorts by value (descending), keeps top 50 most active
  // NO time-based logic exists!
};
```

**Risk:** A team with 55 devices will have device #51 pruned even if it was active yesterday. When that device syncs, its ops may be misclassified as new rather than concurrent, causing false conflicts or duplicate data.

**Required Fix:** Implement time-based pruning (30 days) as documented, with count limit as fallback only.

---

## 10. Configuration

| Setting            | Default | Description                            |
| ------------------ | ------- | -------------------------------------- |
| Compaction trigger | 500 ops | Ops before snapshot                    |
| Retention window   | 7 days  | Keep synced ops for conflict detection |
| Max retries        | 5       | Dependency retry attempts              |
| Retry delay        | 1000ms  | Between dependency retries             |

---

## 11. Feature Flag Strategy

> **Decision:** We use `useOperationLogSync` feature flag to control persistence strategy.

### 11.1 B-Lite Persistence Strategy (Delegate Pattern)

The B-Lite approach completely disables `SaveToDbEffects` when op-log sync is enabled, using a delegate pattern for legacy sync reads:

**When `useOperationLogSync: true`:**

1.  **`OperationLogEffects` (Primary Persistence):** Writes to `SUP_OPS` (Disk).
2.  **`SaveToDbEffects` (DISABLED):** Completely filtered out - no 'pf' database writes.
3.  **`PfapiStoreDelegateService`:** Provides fresh data to legacy sync by reading from NgRx store.

**When `useOperationLogSync: false`:**

1.  **`SaveToDbEffects` (Primary Persistence):** Writes to 'pf' database as usual.
2.  **`OperationLogEffects` (ENABLED):** Still writes to SUP_OPS for future migration.

| Mechanism                   | Op-Log Mode | Legacy Mode | Behavior                        |
| --------------------------- | ----------- | ----------- | ------------------------------- |
| `OperationLogEffects`       | ✅ ENABLED  | ✅ ENABLED  | Writes to SUP_OPS               |
| `SaveToDbEffects`           | ❌ DISABLED | ✅ ENABLED  | Writes to 'pf' DB               |
| `PfapiStoreDelegateService` | ✅ ACTIVE   | ❌ INACTIVE | Reads from NgRx for legacy sync |

**Trade-offs:**

- **Performance:** Excellent. Zero redundant I/O when op-log enabled.
- **Simplicity:** No dual-write complexity or cache synchronization needed.
- **Downgrade Risk:** The legacy `'pf'` database becomes stale when op-log enabled. If disabling op-log mode, state is flushed to 'pf' database.
- **Legacy Sync:** WebDAV/Dropbox sync works correctly via delegate pattern.

---

## 12. Architectural Concerns & Mitigations

### 12.1 (Resolved) Legacy Sync Stale Data

**Issue:** Previously, `SaveToDbEffects` was disabled, causing the 'pf' database and memory cache to become stale.
**Resolution:** With the **B-Lite Delegate Pattern**, `SaveToDbEffects` is completely disabled when op-log is enabled, but legacy sync reads directly from NgRx store via `PfapiStoreDelegateService`. This ensures accurate uploads without needing 'pf' database persistence.

**Implementation:**

- `PfapiService` sets a delegate function via `pf.setGetAllSyncModelDataFromStoreDelegate()`
- The delegate reads 13 models from NgRx selectors
- Non-NgRx models (reminders, archives, plugins) are loaded from 'pf' database on-demand
- When legacy sync needs data, it calls the delegate instead of reading from `ModelCtrl` caches

### 12.2 (Resolved) SaveToDbEffects Configuration

**Issue:** `SaveToDbEffects` was commented out.
**Resolution:** `SaveToDbEffects` is gated by the `useOperationLogSync` feature flag:

- When `useOperationLogSync: true`: Effects are filtered out (disabled)
- When `useOperationLogSync: false`: Effects run normally (legacy behavior)

### 12.3 Dual Vector Clock Divergence

**Issue:** Two independent vector clocks exist:

- PFAPI: `LocalMeta.vectorClock` in 'pf' database
- Operation Log: Per-operation `vectorClock` in SUP_OPS

**They are NEVER synchronized.** The architecture "recommends" alignment but no implementation exists.

**Impact:**

- Op log advances vector clock on every action
- PFAPI vector clock only updates on legacy sync
- Legacy sync may think "no changes" when op log has 1000 pending ops
- False "in sync" status, missed uploads

**Required Fix:** Add an effect to update PFAPI vector clock whenever op log vector clock increments.

### 12.4 Conflict Resolution Paths

**Issue:** Conflicts can arise from two sources:

1. **Op Log Conflicts:** Per-entity conflicts detected during op log sync
2. **Legacy Conflicts:** Full-state conflicts detected during PFAPI sync (vector clock CONCURRENT)

**Current Behavior:**

- Op log conflicts → `ConflictResolutionService` → per-entity UI
- Legacy conflicts → PFAPI conflict handling → full state choice

**Recommendation:** When using op log sync, legacy conflicts should be rare (op log handles granular conflicts). But if both sync methods run, conflicting conflict resolutions could occur. Consider:

- Run op log sync FIRST (already the case)
- If op log sync has no conflicts, legacy sync should also be conflict-free
- If op log sync detects conflicts, resolve them BEFORE legacy sync runs

### 12.5 Offline > 7 Days = Undefined Behavior

**Issue:** Compaction deletes ops older than 7 days. A device offline for 8+ days:

1. Requests ops [100...500]
2. Server only has ops [400...800] (older ones compacted)
3. **No defined behavior** - client may partially apply, crash, or silently lose data

**Missing:**

- Detection of "ops gap"
- Signal to force snapshot resync
- Snapshot merge strategy (current state vs snapshot = which wins?)

**Required Fix:** Define and implement handling for devices that fall off the operation log tail.

### 12.6 No Disaster Recovery Path

**Issue:** If `SUP_OPS` IndexedDB is corrupted/cleared:

- It's the declared "source of truth"
- `'pf'` database is stale (not written to)
- Remote has ops but no full state snapshot
- **No recovery procedure documented or implemented**

**Needed:**

- Integrity checks on startup
- Recovery from remote ops + manifest
- Recovery from legacy `'pf'` database as fallback
- Recovery from remote `main.json` as last resort

### 12.7 Genesis Migration Has No Idempotency

**Issue:** Migration runs "only when SUP_OPS is empty." But:

- What if migration crashes mid-way?
- What if user downgrades and re-upgrades?
- What if SUP_OPS has partial ops from failed migration?

**No validation exists** to detect or repair these states.

### 12.8 Vector Clock Pruning: Code vs Docs Mismatch

**Docs say:** "Prune after 30 days"
**Code does:** `limitVectorClockSize()` prunes when **count > 50**

**Impact:** Team with 55 devices - device #51 gets pruned. When it syncs again, its ops may be misclassified (false conflicts or missed concurrent detection).

### 12.9 Action Blacklist is Maintenance Nightmare

**Issue:** Using a **Blacklist** means any new UI feature that dispatches an action must be manually added to the list.

**Risk:** Developers will forget. The Operation Log will silently fill with thousands of "Toggle Sidebar" or "Focus Input" events.

- **Bloat:** Sync performance degrades
- **Replay Crashes:** If these UI actions rely on transient DOM states or services not available during background replay/hydration, the app will crash on startup

**Recommendation:** Invert control. Use a **Whitelist** (via a decorator like `@Persistent()`) or a specific `PersistenceService.persist(op)` call. Explicit persistence is safer than implicit persistence.

---

## 13. Current Implementation Status

### 🚨 CRITICAL PRODUCTION BLOCKERS

> **⚠️ DO NOT MERGE TO MASTER** until these are fixed. They affect ALL users, not just op-log users.

| #     | Blocker                                    | Impact                                     | Location                                 | Severity    |
| ----- | ------------------------------------------ | ------------------------------------------ | ---------------------------------------- | ----------- |
| ~~1~~ | ~~**Legacy sync uploads stale data**~~     | ~~ALL sync providers upload OLD state~~    | ~~`pfapi.service.ts`~~                   | ✅ RESOLVED |
| 2     | **Provider gating missing**                | Op-log sync runs for ALL providers         | `sync.service.ts:102-110`                | 🔴 CRITICAL |
| 3     | **Compaction reads stale cache**           | Data loss when compaction runs             | `operation-log-compaction.service.ts:23` | 🔴 CRITICAL |
| 4     | **Dependency ops silently dropped**        | Subtasks arriving before parents are LOST  | `operation-applier.service.ts:44`        | 🟠 HIGH     |
| 5     | **Compaction never triggers**              | Op log grows unbounded                     | No triggers exist                        | 🟠 HIGH     |
| 6     | **Replay guard missing**                   | Side effects fire during hydration         | `replay-guard.service.ts` doesn't exist  | 🟠 HIGH     |
| 7     | **Per-entity conflict resolution missing** | All conflicts get single global resolution | `conflict-resolution.service.ts:37`      | 🟠 HIGH     |

**✅ Resolved in B-Lite Implementation (December 2, 2025):**

- Legacy sync stale data: Implemented `PfapiStoreDelegateService` to read from NgRx store
- SaveToDbEffects gating: Now filtered by `useOperationLogSync` feature flag

### Complete ✅

- Dual IndexedDB architecture (pf + SUP_OPS)
- NgRx effect capture with vector clock
- Snapshot + tail replay hydration
- Multi-tab BroadcastChannel coordination
- Web Locks + localStorage fallback
- Genesis migration from legacy data
- Op → Action conversion with isRemote flag
- Per-entity conflict detection
- **B-Lite PFAPI Integration** (NEW - December 2, 2025):
  - `PfapiStoreDelegateService` reads sync data from NgRx store
  - `SaveToDbEffects` gated by `useOperationLogSync` feature flag
  - Delegate wiring in `PfapiService` based on config
  - Backward compatibility: state flush when disabling op-log mode

### Partial / Broken ⚠️

| Component           | What Works    | What's Missing                           | Priority |
| ------------------- | ------------- | ---------------------------------------- | -------- |
| Compaction Service  | Logic exists  | Never triggered, reads stale PFAPI cache | HIGH     |
| Dependency Resolver | Extracts deps | No retry queue - ops silently dropped    | HIGH     |
| Conflict Resolution | Basic dialog  | Single global resolution, no field diffs | HIGH     |
| Action Blacklist    | 9 actions     | ~140 actions unaudited                   | MEDIUM   |
| Error Recovery      | Try/catch     | Rollback commented out                   | MEDIUM   |

### Missing ❌

| Component            | Description                                                 | Priority |
| -------------------- | ----------------------------------------------------------- | -------- |
| **Replay Guard**     | Service does not exist - side effects fire during hydration | HIGH     |
| **Model Migrations** | No schema version in state_cache, no migration logic        | HIGH     |
| **Feature Flag UI**  | No settings toggle for useOperationLogSync                  | MEDIUM   |
| **Test Coverage**    | Only 1 spec file (multi-tab)                                | MEDIUM   |

### Code Review Findings (December 2, 2025)

Detailed findings from code review are documented in the [Execution Plan](./operation-log-execution-plan.md#23-detailed-code-review-findings-december-2-2025).

**Summary of HIGH priority gaps:**

1. **`replay-guard.service.ts`** - Does not exist. Hydration dispatches actions without blocking side effects.
2. **`action-whitelist.ts`** - Only 9 actions blacklisted. Needs comprehensive audit of all NgRx actions.
3. **`operation-applier.service.ts:38-44`** - Missing deps cause ops to be silently skipped with `continue`.
4. **`conflict-resolution.service.ts:37`** - Single global resolution applied to ALL conflicts, no per-conflict choice.
5. **`sync.service.ts:103-105`** - Provider gating NOT implemented. Op-log sync runs for ALL providers including WebDAV/Dropbox (docs say it should be skipped).
6. **`operation-log-compaction.service.ts:23`** - Snapshots stale PFAPI cache, not NgRx state. With SaveToDbEffects disabled, snapshots may miss recent changes.
7. **`OperationLogCompactionService`** - Never invoked. No triggers exist despite docs claiming "Every 500 ops, app close, size > 10MB".
8. **Model Migrations** - No migration path exists. `state_cache` lacks `schemaVersion`. Hydration/sync don't check versions or transform payloads.

**Open Questions:** See [Execution Plan Section 4.4](./operation-log-execution-plan.md#44-open-questions-from-code-review-december-2-2025) for decisions needed.

**Model Migration Strategy:** See [Execution Plan Section 4.5](./operation-log-execution-plan.md#45-model-migration-strategy-december-2-2025) for required components and implementation plan.

---

## 14. References

- [Execution Plan](./operation-log-execution-plan.md) - Phased implementation details
- [Full Design Doc](./operation-log-sync.md) - Comprehensive technical specification
- [Vector Clock Implementation](../../../src/app/pfapi/api/util/vector-clock.ts)
- [Current Sync Service](../../../src/app/pfapi/api/sync/sync.service.ts)
- [PFAPI Architecture](./pfapi-sync-persistence-architecture.md) - Legacy persistence system details
