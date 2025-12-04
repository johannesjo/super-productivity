# Operation Log Architecture

**Status:** Parts A, B, C, D Complete (single-version; cross-version sync requires A.7.11)
**Branch:** `feat/operation-logs`
**Last Updated:** December 4, 2025

---

## Introduction: The Core Architecture

### The Core Concept: Event Sourcing

The Operation Log fundamentally changes how the app treats data. Instead of treating the database as a "bucket" where we overwrite data (e.g., "The task title is now X"), we treat it as a **timeline of events** (e.g., "At 10:00 AM, User changed task title to X").

- **Source of Truth:** The _Log_ is the truth. The "current state" of the app (what you see on screen) is just a calculation derived by replaying that log from the beginning of time.
- **Immutability:** Once an operation is written, it is never changed. We only append new operations. If you "delete" a task, we don't remove the row; we append a `DELETE` operation.

### 1. How Data is Saved (The Write Path)

When a user performs an action (like ticking a checkbox):

1.  **Capture:** The system intercepts the Redux action (e.g., `TaskUpdate`).
2.  **Wrap:** It wraps this action into a standardized `Operation` object. This object includes:
    - **Payload:** What changed (e.g., `{ isDone: true }`).
    - **ID & Timestamp:** A unique ID (UUID v7) and the time it happened.
    - **Vector Clock:** A version counter used to track causality (e.g., "This change happened _after_ version 5").
3.  **Persist:** This `Operation` is immediately appended to the `SUP_OPS` table in IndexedDB. This is very fast because we're just adding a small JSON object, not rewriting a huge file.
4.  **Broadcast:** The operation is broadcast to other open tabs so they update instantly.

### 2. How Data is Loaded (The Read Path)

Replaying _every_ operation since the beginning would be too slow. We use **Snapshots** to speed this up:

1.  **Load Snapshot:** On startup, the app loads the most recent "Save Point" (a full copy of the app state saved, say, yesterday).
2.  **Replay Tail:** The app then queries the Log: "Give me all operations that happened _after_ this snapshot."
3.  **Fast Forward:** It applies those few "tail" operations to the snapshot. Now the app is fully up to date.
4.  **Hydration Optimization:** If a sync just happened, we might simply load the new state directly, skipping the replay entirely.

### 3. How Sync Works

The Operation Log enables two types of synchronization:

**A. True "Server Sync" (The Modern Way)**
This is efficient and precise.

- **Exchange:** Devices swap individual `Operations`, not full files. This saves massive amounts of bandwidth.
- **Conflict Detection:** Because every operation has a **Vector Clock**, we can mathematically prove if two changes happened concurrently.
  - _Example:_ Device A sends "Update Title (Version 1 -> 2)". Device B sees it has "Version 1", so it applies the update safely.
  - _Conflict:_ If Device B _also_ made a change and is at "Version 2", it knows "Wait, we both changed Version 1 at the same time!" -> **Conflict Detected**.
- **Resolution:** The user is shown a dialog to pick the winner. The loser isn't deleted; it's marked as "Rejected" in the log but kept for history.

**B. "Legacy Sync" (Dropbox, WebDAV, Local File)**
This is a compatibility bridge.

- The Operation Log itself doesn't sync files. Instead, when it saves an operation, it secretly "ticks" a version number in the legacy database.
- The legacy sync system (PFAPI) sees this tick, realizes "Local data has changed," and triggers its standard "Upload Everything" process.
- This ensures the new architecture works seamlessly with your existing sync providers without breaking them.

### 4. Safety & Self-Healing

The system assumes data corruption is inevitable (power loss, bad sync, cosmic rays) and builds defenses against it:

- **Validation Checkpoints:** Data is checked _before_ writing to disk, _after_ loading from disk, and _after_ receiving sync data.
- **Auto-Repair:** If the state is invalid (e.g., a subtask points to a missing parent), the app doesn't crash. It runs an auto-repair script (e.g., detaches the subtask) and generates a special **`REPAIR` Operation**.
- **Audit Trail:** This `REPAIR` op is saved to the log. This means you can look back and see exactly _when_ and _why_ the system modified your data automatically.

### 5. Maintenance (Compaction)

If we kept every operation forever, the database would grow huge.

- **Compaction:** Every ~500 operations, the system takes a new Snapshot of the current state.
- **Cleanup:** It then looks for old operations that are already "baked into" that snapshot and have been successfully synced to the server. It safely deletes them to free up space, keeping the log lean.

---

## Overview

The Operation Log serves **four distinct purposes**:

| Purpose                    | Description                                   | Status                        |
| -------------------------- | --------------------------------------------- | ----------------------------- |
| **A. Local Persistence**   | Fast writes, crash recovery, event sourcing   | Complete ✅                   |
| **B. Legacy Sync Bridge**  | Vector clock updates for PFAPI sync detection | Complete ✅                   |
| **C. Server Sync**         | Upload/download individual operations         | Complete ✅ (single-version)¹ |
| **D. Validation & Repair** | Prevent corruption, auto-repair invalid state | Complete ✅                   |

> ¹ **Cross-version sync limitation**: Part C is complete for clients on the same schema version. Cross-version sync (A.7.11) is not yet implemented—see [A.7.11 Conflict-Aware Migration](#a711-conflict-aware-migration-strategy) for guardrails.

> **✅ Migration Ready**: Migration safety (A.7.12), tail ops consistency (A.7.13), and unified migration interface (A.7.15) are now implemented. The system is ready for schema migrations when `CURRENT_SCHEMA_VERSION > 1`.

This document is structured around these four purposes. Most complexity lives in **Part A** (local persistence). **Part B** is a thin bridge to PFAPI. **Part C** handles operation-based sync with servers. **Part D** integrates validation and automatic repair.

```
┌───────────────────────────────────────────────────────────────────┐
│                          User Action                              │
└───────────────────────────────────────────────────────────────────┘
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
  vectorClock: VectorClock; // Current merged vector clock
  compactedAt: number; // When this snapshot was created
  schemaVersion?: number; // Optional for backward compatibility
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

type OpType =
  | 'CRT'
  | 'UPD'
  | 'DEL'
  | 'MOV'
  | 'BATCH'
  | 'SYNC_IMPORT'
  | 'BACKUP_IMPORT'
  | 'REPAIR';
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
              ├──► If last op is SyncImport: load directly (skip replay)
              │
              ├──► Otherwise: Replay ops (prevents re-logging via isRemote flag)
              │
              └──► If replayed >10 ops: Save new snapshot for faster future loads
```

### Hydration Optimizations

Two optimizations speed up hydration:

1. **Skip replay for SyncImport**: When the last operation in the log is a `SyncImport` (full state import), the hydrator loads it directly instead of replaying all preceding operations. This significantly speeds up initial load after imports or syncs.

2. **Save snapshot after replay**: After replaying more than 10 tail operations, a new state cache snapshot is saved. This avoids replaying the same operations on subsequent startups.

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
    vectorClock: {},
    compactedAt: Date.now(),
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

| Setting                 | Value   | Description                                 |
| ----------------------- | ------- | ------------------------------------------- |
| Compaction trigger      | 500 ops | Ops before snapshot                         |
| Retention window        | 7 days  | Keep recent synced ops                      |
| Emergency retention     | 1 day   | Shorter retention for quota exceeded        |
| Compaction timeout      | 25 sec  | Abort if exceeds (prevents lock expiration) |
| Max compaction failures | 3       | Failures before user notification           |
| Unsynced ops            | ∞       | Never delete unsynced ops                   |

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

## A.6 LOCAL_ACTIONS Token for Effects

### The Problem

When operations are synced from remote clients (other tabs or devices), they are dispatched to NgRx with `meta.isRemote: true`. Effects that perform side effects (snacks, work logs, notifications, plugin hooks) should NOT run for these remote operations because:

1. **Duplicate side effects** - The side effect already happened on the original client
2. **Invalid state access** - The task/entity referenced by the action may not exist yet (out-of-order delivery)
3. **User confusion** - Showing "Task completed!" snack for something completed on another device hours ago

### The Solution: LOCAL_ACTIONS Injection Token

The `LOCAL_ACTIONS` injection token provides a pre-filtered Actions stream that excludes remote operations:

```typescript
// src/app/util/local-actions.token.ts
import { inject, InjectionToken } from '@angular/core';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export const LOCAL_ACTIONS = new InjectionToken<Observable<Action>>('LOCAL_ACTIONS', {
  providedIn: 'root',
  factory: () => {
    const actions$ = inject(LOCAL_ACTIONS);
    return actions$.pipe(filter((action: Action) => !(action as any).meta?.isRemote));
  },
});
```

### Usage in Effects

Use `LOCAL_ACTIONS` instead of `Actions` for effects that should NOT run for remote operations:

```typescript
@Injectable()
export class MyEffects {
  private _actions$ = inject(LOCAL_ACTIONS);          // ALL actions (local + remote)
  private _localActions$ = inject(LOCAL_ACTIONS); // LOCAL actions only

  // ✅ Use LOCAL_ACTIONS for side effects
  showSnack$ = createEffect(
    () =>
      this._localActions$.pipe(
        ofType(TaskSharedActions.updateTask),
        filter((action) => action.task.changes.isDone === true),
        tap(() => this.snackService.open({ msg: 'Task completed!' })),
      ),
    { dispatch: false },
  );

  // ✅ Use regular actions$ for state updates that should apply everywhere
  moveTaskToList$ = createEffect(() =>
    this._actions$.pipe(
      ofType(moveTaskInTodayList),
      // This dispatches another action - should work for all sources
      map(({ taskId }) => TaskSharedActions.updateTask({ ... })),
    ),
  );
}
```

### When to Use LOCAL_ACTIONS

| Scenario                          | Use LOCAL_ACTIONS? | Reason                                              |
| --------------------------------- | ------------------ | --------------------------------------------------- |
| Show snackbar/toast               | ✅ Yes             | UI notification already happened on original client |
| Post work log to Jira/OpenProject | ✅ Yes             | External API call already made                      |
| Play sound                        | ✅ Yes             | Audio feedback is local-only                        |
| Update Electron taskbar           | ✅ Yes             | Desktop UI is local-only                            |
| Dispatch plugin hooks             | ✅ Yes             | Plugins already ran on original client              |
| Update another entity in store    | ❌ No              | State change should apply everywhere                |
| Navigate/route change             | ✅ Yes             | Navigation is local-only                            |
| Dispatch cascading actions        | ⚠️ Depends         | If it modifies state: No. If side-effect only: Yes  |

### Effects Using LOCAL_ACTIONS (Reference)

| File                            | Effect                                          | Side Effect Type         |
| ------------------------------- | ----------------------------------------------- | ------------------------ |
| `task-reminder.effects.ts`      | `snack$`, `updateTaskReminderSnack$`, etc.      | Snackbar                 |
| `task-repeat-cfg.effects.ts`    | `updateStartDateOnComplete$`                    | State + side effect      |
| `jira-issue.effects.ts`         | `addWorkLog$`                                   | External API             |
| `open-project.effects.ts`       | `postTime$`                                     | External API             |
| `project.effects.ts`            | `deleteProjectRelatedData`, `showDeletionSnack` | External cleanup + snack |
| `tag.effects.ts`                | `snackPlanForToday$`                            | Snackbar                 |
| `task-electron.effects.ts`      | `clearTaskBarOnTaskDone$`                       | Electron UI              |
| `plugin-hooks.effects.ts`       | `taskComplete$`, `taskUpdate$`                  | Plugin hooks             |
| `task-related-model.effects.ts` | `autoAddTodayTagOnMarkAsDone`                   | Cascading action         |

---

## A.7 Disaster Recovery

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

When Super Productivity's data model changes (new fields, renamed properties, restructured entities), schema migrations ensure existing data remains usable after app updates.

> **Current Status:** Migration infrastructure is implemented, but no actual migrations exist yet. The `MIGRATIONS` array is empty and `CURRENT_SCHEMA_VERSION = 1`. This section documents the designed behavior for when migrations are needed.

### Configuration

`CURRENT_SCHEMA_VERSION` is defined in `src/app/core/persistence/operation-log/schema-migration.service.ts`:

```typescript
export const CURRENT_SCHEMA_VERSION = 1;
export const MIN_SUPPORTED_SCHEMA_VERSION = 1;
export const MAX_VERSION_SKIP = 5; // Max versions ahead we'll attempt to load
```

### Core Concepts

| Concept                    | Description                                                                 |
| -------------------------- | --------------------------------------------------------------------------- |
| **Schema Version**         | Integer tracking current data model version (stored in ops + snapshots)     |
| **Migration**              | Function transforming state from version N to N+1                           |
| **Snapshot Boundary**      | Migrations run when loading snapshots, creating clean versioned checkpoints |
| **Forward Compatibility**  | Newer apps can read older data (via migrations)                             |
| **Backward Compatibility** | Older apps receiving newer ops (via graceful degradation)                   |

### Migration Triggers

```
┌─────────────────────────────────────────────────────────────────────┐
│                    App Update Detected                               │
│                    (schemaVersion mismatch)                          │
└─────────────────────────────────────────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    Load Snapshot         Replay Ops         Receive Remote Ops
    (stale version)       (mixed versions)   (newer/older version)
           │                   │                   │
           ▼                   ▼                   ▼
    Run migrations       Apply ops as-is     Migrate if needed
    on full state        (ops are additive)  (full state imports)
```

### A.7.1 Snapshot Migration (Local)

When app starts and finds a snapshot with older schema version:

```
App Startup (schema v1 → v2)
    │
    ▼
Load state_cache (v1 snapshot)
    │
    ▼
Detect version mismatch: snapshot.schemaVersion < CURRENT_SCHEMA_VERSION
    │
    ▼
Run migration chain: migrateV1ToV2(snapshot.state)
    │
    ▼
Dispatch loadAllData(migratedState)
    │
    ▼
Force new snapshot with schemaVersion = 2
    │
    ▼
Continue with tail ops (ops after snapshot)
```

### A.7.2 Operation Replay (Mixed Versions)

Operations in the log may have different schema versions. During replay:

```typescript
// Operations are "additive" - they describe what changed, not full state
// Example: { opType: 'UPD', payload: { task: { id: 'x', changes: { title: 'new' } } } }

// Old ops apply to migrated state because:
// 1. Fields they reference still exist (or are mapped)
// 2. New fields have defaults filled by migration
// 3. Renamed fields are handled by migration aliases

async replayOperation(op: Operation, currentState: AppDataComplete): Promise<void> {
  // Op schema version is informational - ops apply to current state structure
  // The snapshot was already migrated to current schema
  await this.operationApplier.applyOperations([op]);
}
```

> **Limitation:** Operations are NOT migrated during replay. If a migration renames a field (e.g., `estimate` → `timeEstimate`), old operations referencing `estimate` will apply that field to the entity, potentially causing data inconsistency. To avoid this:
>
> 1. **Prefer additive migrations** - Add new fields with defaults rather than renaming
> 2. **Use aliases in reducers** - If renaming is necessary, reducers should accept both old and new field names
> 3. **Force compaction after migration** - Reduce the window of mixed-version operations
>
> Operation-level migration (transforming old ops to new schema during replay) is listed as a future enhancement in A.7.9.

### A.7.3 Remote Sync (Cross-Version Clients)

When clients run different Super Productivity versions, sync must handle version differences:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Remote Sync Scenarios                            │
└─────────────────────────────────────────────────────────────────────┘

Scenario 1: Newer client receives older ops
──────────────────────────────────────────
Client v2 ◄─── ops from v1 client
    │
    └── Ops apply normally (additive changes to migrated state)
        Missing new fields use defaults from migration

Scenario 2: Older client receives newer ops
──────────────────────────────────────────
Client v1 ◄─── ops from v2 client
    │
    ├── Individual ops: Unknown fields ignored (graceful degradation)
    │   { task: { id: 'x', changes: { title: 'a', newFieldV2: 'b' } } }
    │                                            ↑ ignored by v1
    │
    └── Full state imports (SYNC_IMPORT): May fail validation
        → User prompted to update app or resolve manually

Scenario 3: Mixed version sync with conflicts
──────────────────────────────────────────
Client v1 conflicts with Client v2
    │
    └── Conflict resolution uses entity-level comparison
        Version-specific fields handled during merge
```

### A.7.4 Full State Imports (SYNC_IMPORT/BACKUP_IMPORT)

When receiving full state from remote (e.g., SYNC_IMPORT from another client):

```typescript
async handleFullStateImport(payload: { appDataComplete: AppDataComplete }): Promise<void> {
  const { appDataComplete } = payload;

  // 1. Detect schema version of incoming state (from schemaVersion field or structure)
  const incomingVersion = appDataComplete.schemaVersion ?? detectSchemaVersion(appDataComplete);

  if (incomingVersion < CURRENT_SCHEMA_VERSION) {
    // 2a. Migrate incoming state up to current version
    const migratedState = await this.migrateState(appDataComplete, incomingVersion);
    this.store.dispatch(loadAllData({ appDataComplete: migratedState }));

  } else if (incomingVersion > CURRENT_SCHEMA_VERSION + MAX_VERSION_SKIP) {
    // 2b. Too far ahead - reject and prompt user to update
    this.snackService.open({
      type: 'ERROR',
      msg: T.F.SYNC.S.VERSION_TOO_OLD,
      actionStr: T.PS.UPDATE_APP,
      actionFn: () => window.open(UPDATE_URL, '_blank'),
    });
    throw new Error(`Schema version ${incomingVersion} requires app update`);

  } else if (incomingVersion > CURRENT_SCHEMA_VERSION) {
    // 2c. Slightly ahead - attempt graceful load with warning
    PFLog.warn('Received state from newer app version', { incomingVersion, current: CURRENT_SCHEMA_VERSION });
    this.snackService.open({
      type: 'WARN',
      msg: T.F.SYNC.S.NEWER_VERSION_WARNING, // "Data from newer app version - some features may not work"
    });
    // Attempt load - unknown fields will be stripped by Typia validation
    // This may cause data loss for fields the older app doesn't understand
    this.store.dispatch(loadAllData({ appDataComplete }));

  } else {
    // 2d. Same version - direct load
    this.store.dispatch(loadAllData({ appDataComplete }));
  }

  // 3. Save snapshot (always with current schema version)
  await this.saveStateCache(/* current state with schemaVersion = CURRENT_SCHEMA_VERSION */);
}
```

### A.7.5 Migration Implementation

Migrations are defined in `src/app/core/persistence/operation-log/schema-migration.service.ts`.

#### How to Create a New Migration

1.  **Increment Version**: Update `CURRENT_SCHEMA_VERSION` to `N + 1`.
2.  **Define Migration**: Add a new entry to the `MIGRATIONS` array.
3.  **Implement Logic**: Write the transformation function `migrate(state)`.

```typescript
// src/app/core/persistence/operation-log/schema-migration.service.ts

export const CURRENT_SCHEMA_VERSION = 2; // Increment this!

const MIGRATIONS: SchemaMigration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    description: 'Add priority field to tasks',
    migrate: (state: AllSyncModels) => {
      // 'state' here is the entire app data (AllSyncModels)
      // Deep clone or careful spread recommended to avoid direct mutation
      const newState: AllSyncModels = { ...state };

      // Transform specific model (e.g., task)
      if (newState.task && newState.task.entities) {
        newState.task.entities = Object.fromEntries(
          Object.entries(newState.task.entities).map(([id, task]: [string, any]) => [
            id,
            { ...task, priority: task.priority ?? 'NORMAL' },
          ]),
        );
      }
      return newState;
    },
  },
];
```

#### Best Practices

1.  **Type Safety**: While `state: any` is used for flexibility, aim for `state: AllSyncModels` or a more specific type if possible, and cast internally as needed.
2.  **Immutability**: Always return a new state object. Avoid directly mutating the incoming `state` object.
3.  **Handle missing data**: `state` or its nested properties might be partial or undefined (e.g., in edge cases or if a new model is introduced). Use optional chaining (`?.`) and nullish coalescing (`??`) as appropriate.
4.  **Preserve unrelated data**: Do not unintentionally drop fields or entire models that your migration is not concerned with.
5.  **Test your migration**: Write unit tests to verify that your migration correctly transforms data from version N to N+1, especially edge cases.

#### Service Implementation

```typescript
// schema-migration.service.ts

interface SchemaMigration {
  fromVersion: number;
  toVersion: number;
  description: string;
  migrate: (state: unknown) => unknown;
}

async migrateIfNeeded(snapshot: StateCache): Promise<StateCache> {
  let { state, schemaVersion } = snapshot;
  schemaVersion = schemaVersion ?? 1; // Default for pre-versioned data

  while (schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS.find(m => m.fromVersion === schemaVersion);
    if (!migration) {
      throw new Error(`No migration path from schema v${schemaVersion}`);
    }

    PFLog.log(`[Migration] Running: ${migration.description}`);
    state = migration.migrate(state);
    schemaVersion = migration.toVersion;
  }

  return { ...snapshot, state, schemaVersion };
}

// Helper to detect schema version from state structure (fallback when schemaVersion field is missing)
function detectSchemaVersion(state: unknown): number {
  // Primary: Use explicit schemaVersion field if present
  if (typeof state === 'object' && state !== null && 'schemaVersion' in state) {
    return (state as { schemaVersion: number }).schemaVersion;
  }

  // Fallback: Infer from structure (add checks as migrations are implemented)
  // Example checks (not yet implemented):
  // - v2 added task.priority field
  // - v3 renamed task.estimate to task.timeEstimate
  //
  // if (hasTaskPriorityField(state)) return 2;
  // if (hasTimeEstimateField(state)) return 3;

  return 1; // Default: assume v1 for unversioned/legacy data
}
```

### A.7.6 Version Handling in Operations

Each operation includes the schema version when it was created:

```typescript
interface Operation {
  // ... other fields
  schemaVersion: number; // Schema version when op was created
}

// When creating operations:
const op: Operation = {
  id: uuidv7(),
  // ... other fields
  schemaVersion: CURRENT_SCHEMA_VERSION, // e.g., 1
};
```

This enables:

- **Debugging** - Know which app version created an operation
- **Future migration** - Transform old ops if needed (not currently implemented)
- **Compatibility checks** - Warn when receiving ops from much newer versions

### A.7.7 Design Principles for Migrations

| Principle                      | Description                                        |
| ------------------------------ | -------------------------------------------------- |
| **Additive changes preferred** | Adding new optional fields with defaults is safest |
| **Avoid breaking renames**     | Use aliases or transformations instead             |
| **Test migration chains**      | Ensure v1→v2→v3 produces same result as v1→v3      |
| **Preserve unknown fields**    | Don't strip fields from newer versions             |
| **Idempotent migrations**      | Running twice should be safe                       |

### A.7.8 Handling Unsupported Versions

```typescript
// When local version is too old for remote data
if (remoteSchemaVersion > CURRENT_SCHEMA_VERSION + MAX_VERSION_SKIP) {
  this.snackService.open({
    type: 'ERROR',
    msg: T.F.SYNC.S.VERSION_TOO_OLD,
    actionStr: T.PS.UPDATE_APP,
    actionFn: () => window.open(UPDATE_URL, '_blank'),
  });
  throw new Error('App version too old for synced data');
}

// When remote sends data from ancient version
if (remoteSchemaVersion < MIN_SUPPORTED_SCHEMA_VERSION) {
  this.snackService.open({
    type: 'ERROR',
    msg: T.F.SYNC.S.REMOTE_DATA_TOO_OLD,
  });
  // May need manual intervention or force re-sync
}
```

### A.7.9 Future Considerations

| Enhancement                  | Description                                   | Priority |
| ---------------------------- | --------------------------------------------- | -------- |
| **Operation migration**      | Transform old ops to new schema during replay | Low      |
| **Conflict-aware migration** | Special handling for version conflicts        | Medium   |
| **Migration rollback**       | Undo migration if it fails partway            | Low      |
| **Progressive migration**    | Migrate in background over multiple sessions  | Low      |

### A.7.10 Relationship with Legacy PFAPI Migrations (CROSS_MODEL_MIGRATION)

The application contains a legacy migration system (`CROSS_MODEL_MIGRATION` in `src/app/pfapi/migrate/cross-model-migrations.ts`) used by the old persistence layer.

**Do we keep it?**
Yes, for now. The **Genesis Migration** (A.3) relies on `pfapi` services to load the initial state from the legacy database. This loading process executes `CROSS_MODEL_MIGRATION`s to ensure the legacy data is in a consistent state before it is imported into the Operation Log.

**Should we remove it?**
No, not yet. It provides the bridge from older versions of the app to the Operation Log version. However:

1.  **No new migrations** should be added to `CROSS_MODEL_MIGRATION`.
2.  All future schema changes should use the **Schema Migration** system (A.7) described above.
3.  Once the Operation Log is fully established and legacy data is considered obsolete (e.g., after several major versions), the legacy migration code can be removed.

### A.7.11 Conflict-Aware Migration Strategy

**Status:** Design Ready (Not Implemented)

To handle synchronization between clients on different schema versions, the system must ensure that operations are comparable ("apples-to-apples") before conflict detection occurs.

#### Strategy

1.  **Operation-Level Migration Pipeline**

    - Extend `SchemaMigration` interface to include `migrateOperation?: (op: Operation) => Operation`.
    - This allows transforming a V1 `UPDATE` (e.g., `{ changes: { oldField: 'val' } }`) into a V2 `UPDATE` (e.g., `{ changes: { newField: 'val' } }`).

2.  **Inbound Migration (Receive Path)**

    - **Location:** `OperationLogSyncService.processRemoteOps`
    - **Logic:**
      1.  Receive `remoteOps`.
      2.  Check `op.schemaVersion` for each op.
      3.  If `op.schemaVersion < CURRENT_SCHEMA_VERSION`, run `SchemaMigrationService.migrateOperation(op)`.
      4.  Pass _migrated_ ops to `detectConflicts()`.
    - **Benefit:** Conflict detection works on the _current_ schema structure, preventing false negatives (missing a conflict because field names differ) and confusing diffs.

3.  **Outbound Migration (Send Path)**

    - **Location:** `OperationLogStore.getUnsynced()`
    - **Strategy:** **Send As-Is (Receiver Migrates)**.
    - **Logic:** The client sends operations exactly as they are stored in `SUP_OPS`, preserving their original `schemaVersion`. We do _not_ migrate operations before uploading.
    - **Reasoning:** This follows the "Robustness Principle" (be conservative in what you do, liberal in what you accept). It avoids the performance cost of batch-migrating thousands of pending operations after a long offline period and eliminates the need to rewrite `SUP_OPS`. The receiving client (which knows its own version best) is responsible for upgrading incoming data.

4.  **Destructive Migrations**

    - **Scenario:** A feature is removed in V2 (e.g., "Pomodoro" settings deleted), but we receive a V1 `UPDATE` op for it.
    - **Logic:** The `migrateOperation` function can return `null`.
    - **Handling:** The sync and replay systems must handle `null` by dropping the operation entirely.

5.  **Conflict Resolution**
    - The `ConflictResolutionService` will display the _migrated_ remote operation against the current local state.
    - **UI Decision:** We display the migrated values directly without special "migrated" annotations. Ideally, the conflict dialog uses the same formatters/components as the main UI, so the data looks familiar (e.g., "1 hour" instead of "3600").

#### Interim Guardrails (Until Implementation)

Until A.7.11 is fully implemented, the following guardrails protect against cross-version sync issues:

| Guardrail                    | Description                                                                | Location                                   |
| ---------------------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| **Version check on receive** | Reject operations with `schemaVersion > CURRENT + MAX_VERSION_SKIP`        | `OperationLogSyncService.processRemoteOps` |
| **Update prompt**            | Show "update app" snackbar when receiving newer-version ops                | `OperationLogSyncService`                  |
| **Same-version assumption**  | Current `CURRENT_SCHEMA_VERSION = 1` means all clients are on same version | N/A (no migrations yet)                    |

**When A.7.11 becomes critical:**

1. When `CURRENT_SCHEMA_VERSION` is bumped to 2+
2. When users on different app versions sync together
3. When migrations modify fields referenced by UPDATE operations

**Recommended pre-release checklist:**

- [ ] Implement A.7.11 before releasing any schema migration that renames/removes fields
- [ ] For additive-only migrations (new optional fields), A.7.11 is not strictly required
- [ ] Consider blocking sync upload if `localSchemaVersion < remoteSchemaVersion` to prevent older clients from polluting newer clients with stale-schema operations

### A.7.12 Migration Safety

**Status:** Implemented ✅

Migrations are critical and risky. To prevent data loss if a migration crashes mid-process:

1.  **Backup Before Migrate:** Before `SchemaMigrationService.migrateIfNeeded()` begins modifying the state, it must create a backup of the current `state_cache`.
    - Implementation: Copy `SUP_OPS` object store entry to a backup key (e.g., `state_cache_backup`).
2.  **Rollback on Failure:** If migration throws an error, catch it, restore the backup, and prevent the app from loading potentially corrupted "half-migrated" state. (Likely show a fatal error screen asking user to export backup or contact support).

### A.7.13 Tail Ops Consistency

**Status:** Implemented ✅

**What are Tail Ops?**
When the app starts, it loads the most recent snapshot (e.g., from yesterday). It then loads all operations that occurred _after_ that snapshot (the "tail") to reconstruct the exact state at the moment the app was closed.

**The Consistency Gap**

1.  Snapshot is loaded (Version 1).
2.  App is updated (Version 2).
3.  Snapshot is migrated (V1 → V2).
4.  Tail ops are loaded (Version 1).
5.  **Problem:** If we apply V1 tail ops to the V2 state, they might write to fields that no longer exist or have changed format.

**Solution**
The **Tail Ops MUST be migrated** during hydration.

- The `OperationLogHydrator` must pass tail ops through the same `SchemaMigrationService.migrateOperation` pipeline used for sync.
- This ensures that the `OperationApplier` always receives operations matching the current runtime schema.

### A.7.14 Other Design Decisions

**Operation Envelope vs. Payload**

- **Decision:** `schemaVersion` applies **only to the `payload`** of the operation.
- **Reasoning:** Changes to the Operation structure itself (the "envelope", e.g., `id`, `vectorClock`, `opType`) are considered "System Level" breaking changes. They cannot be handled by the standard schema migration system. If the envelope changes, we would likely need a "Genesis V2" event or a specialized one-time database upgrade script.

**Conflict UI for Synthetic Conflicts**

- **Scenario:** Migration transforms logic (e.g., "1h" string → 3600 seconds).
- **Decision:** The Conflict Resolution UI will simply show the migrated value (3600). We will **not** implement special annotations (e.g., "Values differ due to migration").
- **KISS Principle:** Users generally recognize their data even if the format shifts slightly. The complexity of tracking "why" a value changed is not worth the implementation cost.

### A.7.15 Unified State and Operation Migrations

**Status:** Implemented ✅

State migrations and operation migrations are closely related—both handle the same underlying data model changes. This section defines how they work together.

#### The Relationship

| Migration Type          | Applies To                    | When Executed               |
| ----------------------- | ----------------------------- | --------------------------- |
| **State migration**     | Full snapshot (AllSyncModels) | Hydration, sync import      |
| **Operation migration** | Individual ops                | Tail ops replay, remote ops |

Both use the same `schemaVersion` field. A single schema change may require one or both migration types.

#### When Is Operation Migration Needed?

| Change Type          | State Migration   | Op Migration                   | Example                     |
| -------------------- | ----------------- | ------------------------------ | --------------------------- |
| Add optional field   | ✅ (set default)  | ❌ (old ops just don't set it) | `priority?: string`         |
| Rename field         | ✅ (copy old→new) | ✅ (transform payload)         | `estimate` → `timeEstimate` |
| Remove field/feature | ✅ (delete it)    | ✅ (drop ops or strip field)   | Remove `pomodoro`           |
| Change field type    | ✅ (convert)      | ✅ (convert in payload)        | `"1h"` → `3600`             |
| Add entity type      | ✅ (initialize)   | ❌ (no old ops exist)          | New `Board` entity          |

**Rule of thumb:** If the change is purely additive (new optional fields with defaults, new entity types), operation migration is usually not needed. If the change modifies or removes existing fields, operation migration is required.

#### Unified Migration Definition

Link state and operation migrations in a single definition:

```typescript
interface SchemaMigration {
  fromVersion: number;
  toVersion: number;
  description: string;

  // Required: transform full state snapshot
  migrateState: (state: AllSyncModels) => AllSyncModels;

  // Optional: transform individual operation
  // Return null to drop the operation entirely (e.g., for removed features)
  migrateOperation?: (op: Operation) => Operation | null;

  // Explicit declaration forces author to think about operation migration
  // If true but migrateOperation is undefined, startup validation fails
  requiresOperationMigration: boolean;
}
```

**Benefits:**

1. **Single source of truth** - One place defines all changes for a version bump
2. **Explicit decision** - `requiresOperationMigration` forces thinking about ops
3. **Consistent versioning** - No risk of version number mismatch between the two
4. **Validation** - Startup check catches missing operation migrations

#### Startup Validation

```typescript
// In schema-migration.service.ts initialization
for (const migration of MIGRATIONS) {
  if (migration.requiresOperationMigration && !migration.migrateOperation) {
    throw new Error(
      `Migration v${migration.fromVersion}→v${migration.toVersion} declares ` +
        `requiresOperationMigration=true but migrateOperation is not defined`,
    );
  }
}
```

#### Execution Order

```
Hydration Flow:
  1. Load snapshot from state_cache (schemaVersion = 1)
  2. Run migrateState(snapshot) → v2 state
  3. Save migrated snapshot (for faster future loads)
  4. Load tail ops (may have schemaVersion = 1)
  5. For each op where op.schemaVersion < CURRENT:
       migrateOperation(op) → v2 op (or null to drop)
  6. Apply migrated ops to v2 state

Sync Flow (receiving remote ops):
  1. Download remote ops (may have mixed schemaVersions)
  2. For each op where op.schemaVersion < CURRENT:
       migrateOperation(op) → v2 op
  3. Run conflict detection on v2 ops
  4. Apply to v2 state
```

#### Example: Field Rename Migration

```typescript
const MIGRATIONS: SchemaMigration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    description: 'Rename task.estimate to task.timeEstimate',
    requiresOperationMigration: true,

    migrateState: (state) => {
      if (!state.task?.entities) return state;

      const migratedEntities = Object.fromEntries(
        Object.entries(state.task.entities).map(([id, task]: [string, any]) => [
          id,
          {
            ...task,
            timeEstimate: task.estimate ?? task.timeEstimate ?? 0,
            estimate: undefined, // Remove old field
          },
        ]),
      );

      return {
        ...state,
        task: { ...state.task, entities: migratedEntities },
      };
    },

    migrateOperation: (op) => {
      // Only transform TASK UPDATE operations
      if (op.entityType !== 'TASK' || op.opType !== 'UPD') {
        return op;
      }

      const changes = (op.payload as any)?.changes;
      if (!changes || changes.estimate === undefined) {
        return op; // No estimate field in this op
      }

      // Transform: estimate → timeEstimate
      return {
        ...op,
        schemaVersion: 2, // Mark as migrated
        payload: {
          ...op.payload,
          changes: {
            ...changes,
            timeEstimate: changes.estimate,
            estimate: undefined,
          },
        },
      };
    },
  },
];
```

#### Example: Feature Removal Migration

```typescript
{
  fromVersion: 2,
  toVersion: 3,
  description: 'Remove deprecated pomodoro feature',
  requiresOperationMigration: true,

  migrateState: (state) => {
    // Remove pomodoro data from state
    const { pomodoro, ...rest } = state as any;
    return rest;
  },

  migrateOperation: (op) => {
    // Drop any operations targeting the removed feature
    if (op.entityType === 'POMODORO') {
      return null; // Operation is dropped entirely
    }

    // Strip pomodoro fields from task operations
    if (op.entityType === 'TASK' && op.opType === 'UPD') {
      const changes = (op.payload as any)?.changes;
      if (changes?.pomodoroCount !== undefined) {
        const { pomodoroCount, ...restChanges } = changes;
        return {
          ...op,
          schemaVersion: 3,
          payload: { ...op.payload, changes: restChanges },
        };
      }
    }

    return op;
  },
}
```

#### Why Not Auto-Derive Operation Migration?

It might seem possible to derive operation migration from state migration:

```typescript
// Hypothetical auto-derivation (NOT recommended)
migrateOperation(op: Operation): Operation {
  const fakeState = { [op.entityType]: { entities: { temp: op.payload } } };
  const migrated = migrateState(fakeState);
  return { ...op, payload: migrated[op.entityType].entities.temp };
}
```

**This doesn't work because:**

1. **UPDATE payloads differ from entities** - UPDATE ops have `{ id, changes }`, not full entity
2. **Partial data** - Ops may only contain the fields being changed
3. **CREATE vs UPDATE semantics** - State migration sees full entities; ops may be partial
4. **Null handling** - Dropping ops (return null) can't be auto-derived

**Conclusion:** Explicit `migrateOperation` functions are required for non-additive changes.

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

  // 2. Bridge to PFAPI (Part B) - Update META_MODEL vector clock
  // Skip if sync is in progress (database locked) - the op is already safe in SUP_OPS
  if (!this.pfapiService.pf.isSyncInProgress) {
    await this.pfapiService.pf.metaModel.incrementVectorClockForLocalChange(this.clientId);
  }

  // 3. Broadcast to other tabs (Part A)
  this.multiTabCoordinator.broadcastOperation(op);
}
```

This ensures:

- PFAPI can detect "there are local changes to sync"
- Legacy sync providers work unchanged
- No changes needed to PFAPI sync protocol
- **No lock errors during sync** - META_MODEL update is skipped when sync is in progress (op is still safely persisted in SUP_OPS)

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

For providers without API support (WebDAV/Dropbox), operations are synced via files (`OperationLogUploadService` and `OperationLogDownloadService` handle this transparently):

```
ops/
├── manifest.json
├── ops_CLIENT1_1701234567890.json
├── ops_CLIENT1_1701234599999.json
└── ops_CLIENT2_1701234600000.json
```

The manifest tracks which operation files exist. Each file contains a batch of operations. The system supports both API-based sync and this file-based fallback.

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
    const localOpIds = conflicts.flatMap(c => c.localOps.map(op => op.id));
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

# Part D: Data Validation & Repair

The operation log integrates with PFAPI's validation and repair system to prevent data corruption and automatically recover from invalid states.

## D.1 Validation Architecture

Four validation checkpoints ensure data integrity throughout the operation lifecycle:

| Checkpoint | Location                            | When                      | Action on Failure                          |
| ---------- | ----------------------------------- | ------------------------- | ------------------------------------------ |
| **A**      | `operation-log.effects.ts`          | Before IndexedDB write    | Reject operation, log error, show snackbar |
| **B**      | `operation-log-hydrator.service.ts` | After loading snapshot    | Attempt repair, create REPAIR op           |
| **C**      | `operation-log-hydrator.service.ts` | After replaying tail ops  | Attempt repair, create REPAIR op           |
| **D**      | `operation-log-sync.service.ts`     | After applying remote ops | Attempt repair, create REPAIR op           |

## D.2 REPAIR Operation Type

When validation fails at checkpoints B, C, or D, the system attempts automatic repair using PFAPI's `dataRepair()` function. If repair succeeds, a REPAIR operation is created:

```typescript
enum OpType {
  // ... existing types
  Repair = 'REPAIR', // Auto-repair operation with full repaired state
}

interface RepairPayload {
  appDataComplete: AppDataCompleteNew; // Full repaired state
  repairSummary: RepairSummary; // What was fixed
}

interface RepairSummary {
  entityStateFixed: number; // Fixed ids/entities array sync
  orphanedEntitiesRestored: number; // Tasks restored from archive
  invalidReferencesRemoved: number; // Non-existent project/tag IDs removed
  relationshipsFixed: number; // Project/tag ID consistency
  structureRepaired: number; // Menu tree, inbox project creation
  typeErrorsFixed: number; // Typia errors auto-fixed
}
```

### REPAIR Operation Behavior

- **During replay**: REPAIR operations load state directly (like SyncImport), skipping prior operations
- **User notification**: Shows snackbar with count of issues fixed
- **Audit trail**: REPAIR operations are visible in the operation log for debugging

## D.3 Checkpoint A: Payload Validation

Before writing to IndexedDB, operation payloads are validated in `validate-operation-payload.ts`:

```typescript
validateOperationPayload(op: Operation): PayloadValidationResult {
  // 1. Structural validation - payload must be object
  // 2. OpType-specific validation:
  //    - CREATE: entity with valid 'id' field required
  //    - UPDATE: id + changes, or entity with id required
  //    - DELETE: entityId/entityIds required
  //    - MOVE: ids array required
  //    - BATCH: non-empty payload required
  //    - SYNC_IMPORT/BACKUP_IMPORT: appDataComplete structure required
  //    - REPAIR: skip (internally generated)
}
```

This validation is **intentionally lenient** - it checks structural requirements rather than deep entity validation. Full Typia validation happens at state checkpoints.

## D.4 Checkpoints B & C: Hydration Validation

During hydration, state is validated at two points:

```
App Startup
    │
    ▼
Load snapshot from state_cache
    │
    ├──► CHECKPOINT B: Validate snapshot
    │         │
    │         └──► If invalid: repair + create REPAIR op
    │
    ▼
Dispatch loadAllData(snapshot)
    │
    ▼
Replay tail operations
    │
    └──► CHECKPOINT C: Validate current state
              │
              └──► If invalid: repair + create REPAIR op + dispatch repaired state
```

### Implementation

```typescript
// In operation-log-hydrator.service.ts
private async _validateAndRepairState(state: AppDataCompleteNew): Promise<AppDataCompleteNew> {
  if (this._isRepairInProgress) return state; // Prevent infinite loops

  const result = this.validateStateService.validateAndRepair(state);
  if (!result.wasRepaired) return state;

  this._isRepairInProgress = true;
  try {
    await this.repairOperationService.createRepairOperation(
      result.repairedState,
      result.repairSummary,
    );
    return result.repairedState;
  } finally {
    this._isRepairInProgress = false;
  }
}
```

## D.5 Checkpoint D: Post-Sync Validation

After applying remote operations, state is validated:

- In `operation-log-sync.service.ts` - after applying non-conflicting ops (when no conflicts)
- In `conflict-resolution.service.ts` - after resolving all conflicts

This catches:

- State drift from remote operations
- Corruption introduced during sync
- Invalid operations from other clients

## D.6 ValidateStateService

Wraps PFAPI's validation and repair functionality:

```typescript
@Injectable({ providedIn: 'root' })
export class ValidateStateService {
  validateState(state: AppDataCompleteNew): StateValidationResult {
    // 1. Run Typia schema validation
    const typiaResult = validateAllData(state);

    // 2. Run cross-model relationship validation
    //    NOTE: isRelatedModelDataValid errors are now caught and treated as validation failures
    //    rather than crashing, allowing validateAndRepair to trigger dataRepair.
    let isRelatedValid = true;
    try {
      isRelatedValid = isRelatedModelDataValid(state);
    } catch (e) {
      PFLog.warn(
        'isRelatedModelDataValid threw an error, treating as validation failure',
        e,
      );
      isRelatedValid = false;
    }

    return {
      isValid,
      typiaErrors,
      crossModelError: !isRelatedValid
        ? 'isRelatedModelDataValid threw error'
        : undefined,
    };
  }

  validateAndRepair(state: AppDataCompleteNew): ValidateAndRepairResult {
    // 1. Validate
    // 2. If invalid: run dataRepair()
    // 3. Re-validate repaired state
    // 4. Return repaired state + summary
  }
}
```

## D.7 RepairOperationService

Creates REPAIR operations and notifies the user:

```typescript
@Injectable({ providedIn: 'root' })
export class RepairOperationService {
  async createRepairOperation(
    repairedState: AppDataCompleteNew,
    repairSummary: RepairSummary,
  ): Promise<void> {
    // 1. Create REPAIR operation with repaired state + summary
    // 2. Append to operation log
    // 3. Save state cache snapshot
    // 4. Show notification to user
  }

  static createEmptyRepairSummary(): RepairSummary {
    return {
      entityStateFixed: 0,
      orphanedEntitiesRestored: 0,
      invalidReferencesRemoved: 0,
      relationshipsFixed: 0,
      structureRepaired: 0,
      typeErrorsFixed: 0,
    };
  }
}
```

---

# Edge Cases & Missing Considerations

This section documents known edge cases and areas requiring further design or implementation.

## Storage & Resource Limits

### IndexedDB Quota Exhaustion

**Status:** ✅ Implemented (December 2025)

When IndexedDB storage quota is exceeded, the system handles it gracefully:

**Implementation** (see `operation-log.effects.ts`):

1. **Error Detection**: Catches `QuotaExceededError` including browser variants:

   - Standard: `DOMException` with name `QuotaExceededError`
   - Firefox: `NS_ERROR_DOM_QUOTA_REACHED`
   - Safari (legacy): Error code 22

2. **Emergency Compaction**: Triggers `emergencyCompact()` with shorter retention:

   - Normal retention: 7 days (`COMPACTION_RETENTION_MS`)
   - Emergency retention: 24 hours (`EMERGENCY_COMPACTION_RETENTION_MS`)
   - Only deletes ops that have been synced (`syncedAt` set)

3. **Circuit Breaker**: Flag `isHandlingQuotaExceeded` prevents infinite retry loops:

   - If quota exceeded during retry attempt, aborts immediately
   - Shows error to user instead of looping forever

4. **User Notification**: On permanent failure (after emergency compaction fails):
   - Shows snackbar with error message
   - Dispatches rollback action to revert optimistic update
   - User data in NgRx store remains consistent

**Constants** (`operation-log.const.ts`):

- `EMERGENCY_COMPACTION_RETENTION_MS = 24 * 60 * 60 * 1000` (1 day)
- `MAX_COMPACTION_FAILURES = 3`

### Compaction Trigger Coordination

**Status:** Implemented ✅

The 500-ops compaction trigger uses a persistent counter stored in `state_cache.compactionCounter`:

- Counter is shared across tabs via IndexedDB
- Counter persists across app restarts
- Counter is reset after successful compaction
- Web Locks still prevent concurrent compaction execution

## Data Integrity Edge Cases

### Genesis Migration with Partial Data

**Status:** ⚠️ Not Fully Defined — Edge Case Risk

**Risk Level:** MEDIUM — Silent data loss possible in crash/interruption scenarios.

What if data exists in both `pf` AND `SUP_OPS` databases?

- **Scenario**: Crash during genesis migration, or app downgrade after migration
- **Current behavior**: If `SUP_OPS.state_cache` exists, use it; ignore `pf` entirely
- **Risk**: May lose newer data that was written to `pf` after partial migration completed
- **Detection gap**: No mechanism to detect if `pf` has newer data than `SUP_OPS`

**Proposed solution:**

1. Store `migrationTimestamp` in both `SUP_OPS.state_cache` and `pf.META_MODEL`
2. On startup, compare timestamps:
   - If `pf.lastUpdate > SUP_OPS.migrationTimestamp`: Warn user, offer merge or re-migrate
   - If equal or `pf` older: Proceed with SUP_OPS (current behavior)
3. For app downgrades: Show clear error that downgrade may lose data, require explicit confirmation

**Mitigation (current):** Genesis migration is a one-time event. Once SUP_OPS is established, all writes go there. Risk is limited to the migration moment itself.

### Compaction During Active Sync

**Status:** Handled via Locks

- Compaction acquires `sp_op_log_compact` lock
- Sync operations use separate locks
- **Verified safe**: Compaction only deletes ops with `syncedAt` set, so unsynced ops from active sync are preserved

---

# Part E: Smart Archive Handling

The application splits data into "Active State" (in-memory, Redux) and "Archive State" (on-disk, rarely accessed) to maintain performance.

- **ArchiveYoung**: Recently archived tasks and their worklogs (e.g., last 30 days).
- **ArchiveOld**: Deep storage for historical data (months/years old).

## E.1 The Problem with Syncing Archives

In the legacy system, changing one task in the archive required re-uploading the entire (potentially massive) archive file. This was bandwidth-intensive and slow.

## E.2 New Strategy: Deterministic Local Side Effects

In the Operation Log architecture, **we do NOT sync the archive files directly.** Instead, we sync the **Instructions** that modify the archives. Because the logic is deterministic, all clients end up with identical archive files without ever transferring them.

| Component        | Sync Strategy                 | Mechanism                                                                  |
| ---------------- | ----------------------------- | -------------------------------------------------------------------------- |
| **Active State** | **Operation Log**             | Standard sync (Ops applied to Redux)                                       |
| **ArchiveYoung** | **Deterministic Side Effect** | `moveToArchive` ops trigger local moves from Active → Young on all clients |
| **ArchiveOld**   | **Deterministic Side Effect** | `flushYoungToOld` ops trigger local flush from Young → Old on all clients  |

### E.3 Workflow: moveToArchive

When a user archives tasks:

1.  **Client A (Origin):**
    - Generates `moveToArchive` operation.
    - Locally moves Tasks + Worklogs from Active Store → `ArchiveYoung`.
2.  **Sync:** Operation travels to Client B.
3.  **Client B (Remote):**
    - Receives `moveToArchive` operation.
    - Executes the **exact same logic**:
      - Selects the targeted tasks from its _own_ Active Store.
      - Moves Tasks + Worklogs to its _own_ `ArchiveYoung`.
      - Removes them from Active Store.

**Result:** Both clients have identical `ArchiveYoung` files, but zero archive data was transferred over the network.

### E.4 Workflow: Flushing (Young → Old)

_Note: This is the planned strategy for future implementation._

When `ArchiveYoung` gets too large:

1.  **Client A** decides it's time to flush.
2.  Instead of doing it silently, it emits a `flushYoungToOld` operation.
3.  **All Clients** receive this op and run the standard flush logic:
    - Move items older than X days from `Young` → `Old`.
    - Save both files.

This keeps even the deep storage `ArchiveOld` consistent across devices with minimal overhead.

### E.5 Error Handling & Edge Cases

The deterministic replay approach requires careful handling of edge cases to prevent archive divergence between clients.

#### Missing Entity on Remote

**Scenario:** Client B receives `moveToArchive(taskId: 'abc')` but task 'abc' doesn't exist in its Active Store.

**Possible causes:**

- Task was deleted on Client B before sync
- Task creation op hasn't arrived yet (out-of-order delivery)
- Task was never synced to Client B

**Handling strategy:**

| Cause            | Detection                                       | Response                                    |
| ---------------- | ----------------------------------------------- | ------------------------------------------- |
| **Deleted**      | Task exists in local archive or deletion log    | No-op (already handled)                     |
| **Out-of-order** | Task ID not in active, archive, or deletion log | Queue op for retry; apply when task arrives |
| **Never synced** | After retry timeout (e.g., 5 min)               | Log warning, skip op, accept divergence     |

#### Out-of-Order Operations

**Scenario:** `flushYoungToOld` arrives before `moveToArchive` that should have populated Young.

**Handling:**

1. Flush operations should be **idempotent**: flush only items that match criteria (age threshold)
2. If Young is empty/sparse, flush is a no-op—no error
3. Later `moveToArchive` ops populate Young normally
4. Next flush will catch them

#### Idempotency Requirements

All archive operations MUST be idempotent to handle:

- Duplicate delivery (network retry, tab broadcast + sync)
- Replay during hydration
- Re-application after conflict resolution

| Operation            | Idempotency guarantee                                |
| -------------------- | ---------------------------------------------------- |
| `moveToArchive`      | Check if task already in archive; skip if present    |
| `flushYoungToOld`    | Move only items not already in Old; merge if present |
| `restoreFromArchive` | Check if task already in Active; skip if present     |

#### Divergence Detection (Future)

To detect silent divergence between clients:

1. Compute hash of archive entity IDs periodically
2. Exchange hashes during sync
3. If mismatch: trigger full archive reconciliation (download missing, resolve duplicates)

**Status:** Not implemented. Current assumption is deterministic replay prevents divergence. If divergence is observed in production, implement detection.

---

# Implementation Status

## Part A: Local Persistence

### Complete ✅

- SUP_OPS IndexedDB store (ops + state_cache)
- NgRx effect capture with isPersistent pattern
- Snapshot + tail replay hydration
- Multi-tab BroadcastChannel coordination
- Web Locks + localStorage fallback
- Genesis migration from legacy data
- Compaction with 7-day retention window
- Disaster recovery from legacy 'pf' database
- Schema migration service infrastructure (no migrations defined yet)
- Persistent action metadata on all model actions
- Rollback notification on persistence failure (shows snackbar with reload action)
- Hydration optimizations (skip replay for SyncImport, save snapshot after >10 ops replayed)
- **Migration safety backup (A.7.12)** - Creates backup before migration, restores on failure
- **Tail ops migration (A.7.13)** - Migrates operations during hydration before replay
- **Unified migration interface (A.7.15)** - `SchemaMigration` includes both `migrateState` and optional `migrateOperation`
- **Persistent compaction counter** - Counter stored in `state_cache`, shared across tabs/restarts
- **`syncedAt` index** - Index on ops store for faster `getUnsynced()` queries
- **Quota handling** - Emergency compaction on `QuotaExceededError` with circuit breaker to prevent infinite loops

### Not Implemented ⚠️

| Item                            | Section | Risk if Missing                          | When Critical                                           |
| ------------------------------- | ------- | ---------------------------------------- | ------------------------------------------------------- |
| **Conflict-aware op migration** | A.7.11  | Conflicts may compare mismatched schemas | Before any schema migration that renames/removes fields |

> **Note**: A.7.11 is required for cross-version sync. Currently safe because `CURRENT_SCHEMA_VERSION = 1` (all clients on same version). See [A.7.11 Interim Guardrails](#interim-guardrails-until-implementation) for pre-release checklist.

## Part B: Legacy Sync Bridge

### Complete ✅

- `PfapiStoreDelegateService` (reads all NgRx models for sync)
- META_MODEL vector clock update (B.2)
- Sync download persistence via `hydrateFromRemoteSync()` (B.3)
- All models in NgRx (no hybrid persistence)
- Skip META_MODEL update during sync (prevents lock errors)

## Part C: Server Sync

### Complete ✅ (Single-Version)

- Operation sync protocol interface (`OperationSyncCapable`)
- `OperationLogSyncService` (orchestration, processRemoteOps, detectConflicts)
- `OperationLogUploadService` (API upload + file-based fallback)
- `OperationLogDownloadService` (API download + file-based fallback)
- Entity-level conflict detection (vector clock comparisons)
- `ConflictResolutionService` (UI presentation + apply resolutions)
- `DependencyResolverService` (extract/check dependencies)
- `OperationApplierService` (retry queue + topological sort)
- Rejected operation tracking (`rejectedAt` field)

> **Cross-version limitation**: Part C is complete for clients on the same schema version. When `CURRENT_SCHEMA_VERSION > 1` and clients run different versions, A.7.11 (conflict-aware op migration) is required to ensure correct conflict detection.

## Part D: Validation & Repair

### Complete ✅

- Payload validation at write (Checkpoint A - structural validation before IndexedDB write)
- State validation during hydration (Checkpoints B & C - Typia + cross-model validation)
- Post-sync validation (Checkpoint D - validation after applying remote ops)
- REPAIR operation type (auto-repair with full state + repair summary)
- ValidateStateService (wraps PFAPI validation + repair)
- RepairOperationService (creates REPAIR ops, user notification)
- User notification on repair (snackbar with issue count)

## Future Enhancements 🔮

| Component  | Description                                | Priority | Notes |
| ---------- | ------------------------------------------ | -------- | ----- |
| Auto-merge | Automatic merge for non-conflicting fields | Low      |       |
| Undo/Redo  | Leverage op-log for undo history           | Low      |       |
| Tombstones | Soft delete with retention window          | High     |       |

> **Recently Completed (December 2025):**
>
> - **Anchor-based move operations**: All task drag-drop moves now use `afterTaskId` instead of full list replacement. See `work-context-meta.helper.ts` for helper functions.
> - **Quota handling**: Emergency compaction and circuit breaker on `QuotaExceededError`
> - **`syncedAt` index**: Faster `getUnsynced()` queries
> - **Persistent compaction counter**: Tracks ops across tabs/restarts

---

# File Reference

```
src/app/core/persistence/operation-log/
├── operation.types.ts                    # Type definitions (Operation, OpType, EntityType)
├── operation-log.const.ts                # Constants
├── operation-log.effects.ts              # Action capture + META_MODEL bridge
├── operation-converter.util.ts           # Op ↔ Action conversion
├── persistent-action.interface.ts        # PersistentAction type + isPersistentAction guard
├── entity-key.util.ts                    # Entity key generation utilities
├── store/
│   ├── operation-log-store.service.ts        # SUP_OPS IndexedDB wrapper
│   ├── operation-log-hydrator.service.ts     # Startup hydration
│   ├── operation-log-compaction.service.ts   # Snapshot + cleanup
│   ├── operation-log-migration.service.ts    # Genesis migration from legacy
│   └── schema-migration.service.ts           # State schema migrations
├── sync/
│   ├── operation-log-sync.service.ts         # Upload/download operations (Part C)
│   ├── operation-log-download.service.ts     # Download operations
│   ├── operation-log-upload.service.ts       # Upload operations
│   ├── lock.service.ts                       # Cross-tab locking (Web Locks + fallback)
│   ├── multi-tab-coordinator.service.ts      # BroadcastChannel coordination
│   ├── dependency-resolver.service.ts        # Extract/check operation dependencies
│   └── conflict-resolution.service.ts        # Conflict UI presentation
└── processing/
    ├── operation-applier.service.ts          # Apply ops to store with dependency handling
    ├── validate-state.service.ts             # Typia + cross-model validation wrapper
    ├── validate-operation-payload.ts         # Checkpoint A - payload validation
    └── repair-operation.service.ts           # REPAIR operation creation + notification

src/app/features/work-context/store/
├── work-context-meta.actions.ts          # Move actions (moveTaskInTodayList, etc.)
└── work-context-meta.helper.ts           # Anchor-based positioning helpers

src/app/pfapi/
├── pfapi-store-delegate.service.ts       # Reads NgRx for sync (Part B)
└── pfapi.service.ts                      # Sync orchestration
```

---

# References

- [Execution Plan](./operation-log-execution-plan.md) - Implementation tasks
- [PFAPI Architecture](./pfapi-sync-persistence-architecture.md) - Legacy sync system
- [Server Sync Architecture](./server-sync-architecture.md) - Server-based sync details
