# Architecture V2: Operation Log & Event Sourcing

## 1. Executive Summary

**Goal:** Transition `super-productivity` from a state-snapshot sync model to an operation-based (event sourcing) model.

### 1.1. Current Problems Solved

| Problem                 | Current Behavior                                                  | With Operation Log                                      |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| **Data Loss/Overwrite** | "Last write wins" on whole file level overwrites granular changes | Per-operation merge enables granular conflict detection |
| **Performance**         | Sync downloads full state and reloads entire app (`reInit`)       | Only delta operations transferred and replayed          |
| **State Drift**         | Dual source of truth (NgRx vs. IndexedDB)                         | NgRx is single source, IndexedDB is derived             |
| **Conflict Resolution** | User must choose entire file: local vs remote                     | Automatic merge of non-conflicting operations           |

### 1.2. New Paradigm

- **NgRx is the Single Source of Truth.**
- **Persistence is a Log of Operations.**
- **Sync is the Exchange of Operations.**

### 1.3. Key Benefits Over Current Implementation

The current sync system (see [`sync.service.ts`](../../src/app/pfapi/api/sync/sync.service.ts)) already uses vector clocks for conflict detection at the whole-data level. This proposal extends that to per-operation granularity:

```
Current:  [Device A State] vs [Device B State] → Conflict if concurrent
Proposed: [Op1, Op2, Op3]  vs [Op4, Op5]       → Merge non-conflicting, flag conflicts per-entity
```

---

## 2. Core Data Structures

### 2.1. The Vector Clock (Existing)

Already implemented in [`vector-clock.ts`](../../src/app/pfapi/api/util/vector-clock.ts). No changes needed.

```typescript
// Map of Client ID -> Counter
// e.g., { 'client_A': 15, 'client_B': 7 }
export type VectorClock = Record<string, number>;
```

### 2.2. The Operation Schema

All changes to the application state must be representable as a discrete operation.

```typescript
export enum OpType {
  Create = 'CRT',
  Update = 'UPD',
  Delete = 'DEL',
  Move = 'MOV', // For list reordering
  Batch = 'BATCH', // For bulk operations (import, mass update)
}

export interface Operation {
  // IDENTITY
  id: string; // UUID v7 (time-ordered, better for sorting)

  // ACTION MAPPING
  actionType: string; // NgRx Action type (e.g., '[Task] Update')
  opType: OpType; // High-level operation category

  // SCOPE
  entityType: EntityType; // 'TASK' | 'PROJECT' | 'TAG' | 'NOTE' | 'GLOBAL_CONFIG' | 'SIMPLE_COUNTER'
  entityId: string; // ID of the affected entity (or '*' for global config)

  // DATA
  payload: unknown; // The partial update / diff (validated by Typia)

  // CAUSALITY & ORDERING
  clientId: string; // Device generating the op (reuse existing from vector-clock)
  vectorClock: VectorClock; // State of the world AFTER this Op
  timestamp: number; // Wall clock time (ISO 8601 or epoch ms)

  // META
  schemaVersion: number; // For future migrations
  parentOpId?: string; // For conflict resolution chains
}

export type EntityType =
  | 'TASK'
  | 'PROJECT'
  | 'TAG'
  | 'NOTE'
  | 'GLOBAL_CONFIG'
  | 'SIMPLE_COUNTER'
  | 'WORK_CONTEXT'
  | 'TASK_REPEAT_CFG'
  | 'ISSUE_PROVIDER';
```

### 2.3. The Persistent Log Entry

How operations are stored locally in IndexedDB.

```typescript
export interface OperationLogEntry {
  seq: number; // Local, monotonic auto-increment (IndexedDB primary key)
  op: Operation;
  appliedAt: number; // When this op was applied locally (epoch ms)
  source: 'local' | 'remote'; // Origin of this operation
  syncedAt?: number; // When successfully synced to remote (null if pending)
}
```

### 2.4. Entity-Level Conflict Tracking

For fine-grained conflict resolution:

```typescript
export interface EntityConflict {
  entityType: EntityType;
  entityId: string;
  localOps: Operation[]; // Local ops affecting this entity
  remoteOps: Operation[]; // Remote ops affecting the same entity
  suggestedResolution: 'local' | 'remote' | 'merge' | 'manual';
  mergedPayload?: unknown; // If auto-mergeable
}
```

---

## 3. Architecture Layers

### 3.1. The Unified Flow

```mermaid
graph TD
    subgraph User Actions
        User[User Interaction] -->|Triggers| Action[NgRx Action]
    end

    subgraph Core State
        Action -->|Reducer| Store[NgRx Store]
    end

    subgraph Persistence Layer
        Action -.->|Effect: isPersistent| OpConverter[Operation Converter]
        OpConverter -->|Web Locks| OpLog[(IndexedDB: op_log)]
        OpLog -->|Compaction Trigger| StateCache[(IndexedDB: state_cache)]
    end

    subgraph Sync Layer
        OpLog -->|Pending Ops| SyncUp[Sync Upload]
        SyncUp -->|HTTP/WebDAV| Cloud[(Remote Storage)]
        Cloud -->|Download| SyncDown[Sync Download]
        SyncDown -->|Filter Duplicates| MergeEngine[Merge Engine]
        MergeEngine -->|Non-Conflict| RemoteAction[Dispatch isRemote:true]
        MergeEngine -->|Conflict| ConflictResolver[Conflict Resolution UI]
        RemoteAction --> Store
    end

    subgraph Compaction
        StateCache -->|Load| Hydrate[Hydrate Store]
        OpLog -->|Replay Tail| Hydrate
    end
```

### 3.2. The Action Contract (Whitelisting)

Not all NgRx actions should be persisted. We need an explicit contract.

```typescript
// In src/app/core/persistence/operation-log/persistent-action.interface.ts

export interface PersistentActionMeta {
  isPersistent: true; // MUST be true to be recorded
  entityType: EntityType;
  entityId: string;
  opType: OpType;
  isRemote?: boolean; // TRUE if from Sync (prevents re-logging)
  isBulk?: boolean; // TRUE for batch operations
}

export interface PersistentAction<P = unknown> extends Action {
  type: string; // Standard NgRx action type
  meta: PersistentActionMeta;
  payload?: P;
}

// Helper type guard
export function isPersistentAction(action: Action): action is PersistentAction {
  return (action as PersistentAction).meta?.isPersistent === true;
}
```

### 3.3. Action Whitelist Registry

```typescript
// In src/app/core/persistence/operation-log/action-whitelist.ts

export const PERSISTENT_ACTION_TYPES: Set<string> = new Set([
  // Task actions
  '[Task] Add Task',
  '[Task] Update Task',
  '[Task] Delete Task',
  '[Task] Move',
  '[Task] Add SubTask',
  '[Task] Toggle Start',

  // Project actions
  '[Project] Add Project',
  '[Project] Update Project',
  '[Project] Delete Project',

  // Tag actions
  '[Tag] Add Tag',
  '[Tag] Update Tag',
  '[Tag] Delete Tag',

  // Note actions
  '[Note] Add Note',
  '[Note] Update Note',
  '[Note] Delete Note',

  // Config (global)
  '[Global Config] Update Config Section',

  // Explicitly EXCLUDED (not persisted):
  // - '[App] Set Current Worklog Task' (UI state)
  // - '[Layout] Toggle Sidebar' (UI state)
  // - '[Focus Mode] Enter/Exit' (transient)
]);
```

---

## 4. Critical Workflows

### 4.1. The Write Path (Local User Action)

1. User clicks "Complete Task".
2. Component dispatches `TaskActions.update({ id, changes: { isDone: true } })`.
3. **Reducer:** Updates memory state immediately (optimistic UI).
4. **OperationLogEffect** (new):
   - Listens for actions matching `PERSISTENT_ACTION_TYPES` or with `meta.isPersistent: true`.
   - **Ignores** actions with `meta.isRemote: true`.
   - Converts Action → [`Operation`](#22-the-operation-schema) object.
   - Increments local vector clock counter.
   - Writes to IndexedDB using **Web Locks API**.

```typescript
// In src/app/core/persistence/operation-log/operation-log.effects.ts

@Injectable()
export class OperationLogEffects {
  private clientId = this.getOrCreateClientId();

  persistOperation$ = createEffect(
    () =>
      this.actions$.pipe(
        filter(isPersistentAction),
        filter((action) => !action.meta.isRemote),
        concatMap((action) => this.writeOperation(action)),
      ),
    { dispatch: false },
  );

  private async writeOperation(action: PersistentAction): Promise<void> {
    await navigator.locks.request('sp_op_log_write', async () => {
      const currentClock = await this.opLogStore.getCurrentVectorClock();
      const newClock = incrementVectorClock(currentClock, this.clientId);

      const op: Operation = {
        id: uuidv7(),
        actionType: action.type,
        opType: action.meta.opType,
        entityType: action.meta.entityType,
        entityId: action.meta.entityId,
        payload: action.payload,
        clientId: this.clientId,
        vectorClock: newClock,
        timestamp: Date.now(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };

      await this.opLogStore.append(op);
    });
  }
}
```

### 4.2. The Read Path (Startup / App Load)

Loading thousands of operations is too slow. We use a **Rolling Snapshot** strategy.

```mermaid
sequenceDiagram
    participant App
    participant StateCache as IndexedDB: state_cache
    participant OpLog as IndexedDB: op_log
    participant Store as NgRx Store

    App->>StateCache: Load cached state + lastAppliedOpSeq
    StateCache-->>App: { state, lastAppliedOpSeq: 1500 }
    App->>Store: Hydrate with cached state
    App->>OpLog: Query ops WHERE seq > 1500
    OpLog-->>App: [Op 1501, Op 1502, Op 1503]
    loop Replay Each Op
        App->>Store: Dispatch action (isRemote: true)
    end
    App->>App: Ready
```

**Implementation:**

```typescript
// In src/app/core/persistence/operation-log/operation-log-hydrator.service.ts

@Injectable({ providedIn: 'root' })
export class OperationLogHydratorService {
  async hydrateStore(): Promise<void> {
    // 1. Load snapshot
    const snapshot = await this.opLogStore.loadStateCache();

    if (snapshot) {
      // 2. Hydrate NgRx with snapshot
      this.store.dispatch(hydrateFromSnapshot({ state: snapshot.state }));

      // 3. Replay tail operations
      const tailOps = await this.opLogStore.getOpsAfterSeq(snapshot.lastAppliedOpSeq);

      for (const entry of tailOps) {
        const action = this.opToActionConverter.convert(entry.op);
        action.meta.isRemote = true; // Prevent re-logging
        this.store.dispatch(action);
      }
    } else {
      // Fresh install or migration - no snapshot exists
      await this.handleFreshInstallOrMigration();
    }
  }
}
```

### 4.3. The Sync Path (Bidirectional)

#### 4.3.1. Upload (Local → Remote)

```typescript
async uploadPendingOps(): Promise<void> {
  const pendingOps = await this.opLogStore.getUnsynced();

  if (pendingOps.length === 0) return;

  // Batch into chunks (e.g., 100 ops per file for WebDAV)
  const chunks = chunkArray(pendingOps, 100);

  for (const chunk of chunks) {
    const filename = `ops_${this.clientId}_${chunk[0].op.timestamp}.json`;
    await this.syncProvider.uploadFile(filename, JSON.stringify(chunk));

    // Mark as synced
    await this.opLogStore.markSynced(chunk.map(e => e.seq));
  }

  // Update remote manifest
  await this.updateRemoteManifest();
}
```

#### 4.3.2. Download (Remote → Local)

```typescript
async downloadRemoteOps(): Promise<void> {
  const manifest = await this.syncProvider.downloadFile('manifest.json');
  const appliedOpIds = await this.opLogStore.getAppliedOpIds();

  // Find new remote op files
  const newFiles = manifest.opFiles.filter(f => !this.isFileFullyApplied(f, appliedOpIds));

  for (const file of newFiles) {
    const opsData = await this.syncProvider.downloadFile(file);
    const remoteOps: Operation[] = JSON.parse(opsData);

    // Filter already-applied ops
    const newOps = remoteOps.filter(op => !appliedOpIds.has(op.id));

    // Check for conflicts at entity level
    const { nonConflicting, conflicts } = await this.detectConflicts(newOps);

    // Apply non-conflicting ops
    for (const op of nonConflicting) {
      const action = this.opToActionConverter.convert(op);
      action.meta.isRemote = true;
      this.store.dispatch(action);
      await this.opLogStore.markApplied(op.id);
    }

    // Handle conflicts
    if (conflicts.length > 0) {
      await this.conflictHandler.present(conflicts);
    }
  }
}
```

#### 4.3.3. Conflict Detection Algorithm

```typescript
async detectConflicts(remoteOps: Operation[]): Promise<ConflictResult> {
  const localPendingOps = await this.opLogStore.getUnsyncedByEntity();
  const conflicts: EntityConflict[] = [];
  const nonConflicting: Operation[] = [];

  for (const remoteOp of remoteOps) {
    const entityKey = `${remoteOp.entityType}:${remoteOp.entityId}`;
    const localOpsForEntity = localPendingOps.get(entityKey) || [];

    if (localOpsForEntity.length === 0) {
      // No local changes to this entity - no conflict
      nonConflicting.push(remoteOp);
      continue;
    }

    // Check if ops are concurrent (vector clock comparison)
    const vcComparison = compareVectorClocks(
      localOpsForEntity[0].vectorClock,
      remoteOp.vectorClock
    );

    if (vcComparison === VectorClockComparison.CONCURRENT) {
      // True conflict - same entity modified independently
      conflicts.push({
        entityType: remoteOp.entityType,
        entityId: remoteOp.entityId,
        localOps: localOpsForEntity,
        remoteOps: [remoteOp],
        suggestedResolution: this.suggestResolution(localOpsForEntity, remoteOp),
      });
    } else {
      // One happened before the other - can be auto-resolved
      nonConflicting.push(remoteOp);
    }
  }

  return { nonConflicting, conflicts };
}
```

### 4.4. Multi-Tab Concurrency

We use the **Web Locks API** and **BroadcastChannel** for coordination.

```typescript
// In src/app/core/persistence/operation-log/multi-tab-coordinator.service.ts

@Injectable({ providedIn: 'root' })
export class MultiTabCoordinatorService {
  private broadcastChannel = new BroadcastChannel('sp_op_log');

  constructor() {
    this.broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'NEW_OP') {
        // Another tab wrote an operation - reload from DB
        this.handleRemoteTabOp(event.data.op);
      }
    };
  }

  async writeOperation(op: Operation): Promise<void> {
    await navigator.locks.request('sp_op_log_write', async () => {
      await this.opLogStore.append(op);
      // Notify other tabs
      this.broadcastChannel.postMessage({ type: 'NEW_OP', op });
    });
  }
}
```

### 4.5. Compaction (Garbage Collection)

To prevent the log from growing infinitely.

**Triggers:**

- Every N operations (configurable, default: 500)
- On app close/background
- When log size exceeds threshold (e.g., 10MB)

**Process:**

```typescript
async compact(): Promise<void> {
  await navigator.locks.request('sp_op_log_compact', async () => {
    // 1. Get current NgRx state
    const currentState = await firstValueFrom(this.store.select(selectAllSyncState));

    // 2. Get current vector clock (max of all ops)
    const currentVectorClock = await this.opLogStore.getCurrentVectorClock();

    // 3. Write to state cache
    const lastSeq = await this.opLogStore.getLastSeq();
    await this.opLogStore.saveStateCache({
      state: currentState,
      lastAppliedOpSeq: lastSeq,
      vectorClock: currentVectorClock,
      compactedAt: Date.now(),
    });

    // 4. Delete old operations (keep recent for conflict resolution window)
    const retentionWindowMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    await this.opLogStore.deleteOpsOlderThan(Date.now() - retentionWindowMs);
  });
}
```

---

## 5. Cross-Model Relationships & Referential Integrity

Super Productivity has several cross-model relationships that require special handling in an operation-based sync system:

### 5.1. Entity Relationship Map

```mermaid
erDiagram
    TASK ||--o| PROJECT : "belongs to"
    TASK }|--o{ TAG : "has many"
    TASK ||--o| TASK : "parent/child"
    NOTE ||--o| PROJECT : "belongs to"
    TASK_REPEAT_CFG ||--o| PROJECT : "belongs to"
    ISSUE_PROVIDER ||--o| PROJECT : "belongs to"

    TASK {
        string id PK
        string projectId FK
        string parentId FK
        array tagIds FK
    }
    PROJECT {
        string id PK
        array taskIds
        array backlogTaskIds
    }
    TAG {
        string id PK
        array taskIds
    }
```

### 5.2. Reference Types & Handling Strategies

| Relationship            | Reference Field  | On Foreign Delete                  | On Missing Reference                |
| ----------------------- | ---------------- | ---------------------------------- | ----------------------------------- |
| Task → Project          | `task.projectId` | Orphan (keep task, null projectId) | Queue op, apply when project exists |
| Task → Tag              | `task.tagIds[]`  | Remove from array                  | Skip missing tag, log warning       |
| Task → Parent Task      | `task.parentId`  | Cascade delete subtask             | Queue op, apply when parent exists  |
| Note → Project          | `note.projectId` | Orphan (keep note)                 | Queue op, apply when project exists |
| TaskRepeatCfg → Project | `cfg.projectId`  | Orphan or delete cfg               | Queue op                            |

### 5.3. Operation Ordering & Dependencies

When syncing operations, some must be applied before others. We use a dependency resolver:

```typescript
interface OperationDependency {
  opId: string;
  dependsOn: {
    entityType: EntityType;
    entityId: string;
    mustExist: boolean; // true = hard dependency, false = soft (can apply without)
  }[];
}

// Example dependencies:
// - Create SubTask depends on parent Task existing (hard)
// - Create Task in Project depends on Project existing (soft - can orphan)
// - Add Tag to Task depends on Tag existing (soft - skip missing)
```

**Dependency Resolution Algorithm:**

```typescript
async applyOperationsWithDependencies(ops: Operation[]): Promise<ApplyResult> {
  const pendingQueue: Operation[] = [];
  const applied: Operation[] = [];
  const failed: { op: Operation; reason: string }[] = [];

  // Sort operations by logical order
  const sortedOps = this.topologicalSort(ops);

  for (const op of sortedOps) {
    const deps = this.extractDependencies(op);
    const missingHardDeps = await this.findMissingHardDependencies(deps);

    if (missingHardDeps.length > 0) {
      // Check if dependency will be satisfied by a pending op
      const willBeSatisfied = missingHardDeps.every(dep =>
        pendingQueue.some(pendingOp =>
          pendingOp.entityType === dep.entityType &&
          pendingOp.entityId === dep.entityId &&
          pendingOp.opType === OpType.Create
        )
      );

      if (willBeSatisfied) {
        pendingQueue.push(op);
      } else {
        // Hard dependency missing and won't be created - queue for later sync
        this.queueForRetry(op, missingHardDeps);
      }
      continue;
    }

    // Handle soft dependencies (missing tags, etc.)
    const missingSoftDeps = await this.findMissingSoftDependencies(deps);
    if (missingSoftDeps.length > 0) {
      op.payload = this.removeMissingReferences(op.payload, missingSoftDeps);
      this.logWarning('Applied op with missing soft dependencies', { op, missingSoftDeps });
    }

    // Apply operation
    await this.applyOperation(op);
    applied.push(op);

    // Check if any pending ops can now be applied
    await this.processPendingQueue(pendingQueue, applied);
  }

  return { applied, pending: pendingQueue, failed };
}
```

### 5.4. Cascade Operations

When a parent entity is deleted, related entities must be handled:

```typescript
// In operation-log.effects.ts

// Intercept delete operations and emit cascade ops
handleCascadeDelete$ = createEffect(() =>
  this.actions$.pipe(
    filter(isPersistentAction),
    filter(action => action.meta.opType === OpType.Delete),
    switchMap(action => this.generateCascadeOps(action)),
  )
);

private async generateCascadeOps(deleteAction: PersistentAction): Promise<Action[]> {
  const cascadeOps: Action[] = [];

  switch (deleteAction.meta.entityType) {
    case 'PROJECT':
      // Find all tasks in this project
      const tasks = await this.taskService.getAllTasksForProject(deleteAction.meta.entityId);

      // Option A: Orphan tasks (move to inbox)
      for (const task of tasks) {
        if (!task.parentId) { // Only main tasks
          cascadeOps.push(updateTask({
            task: { id: task.id, changes: { projectId: INBOX_PROJECT.id } },
            meta: {
              isPersistent: true,
              entityType: 'TASK',
              entityId: task.id,
              opType: OpType.Update,
              cascadeFrom: deleteAction.meta.entityId,
            }
          }));
        }
      }
      break;

    case 'TASK':
      // If parent task deleted, delete all subtasks
      const parentTask = await this.taskService.getByIdOnce$(deleteAction.meta.entityId);
      for (const subTaskId of parentTask.subTaskIds) {
        cascadeOps.push(deleteTask({
          task: { id: subTaskId },
          meta: {
            isPersistent: true,
            entityType: 'TASK',
            entityId: subTaskId,
            opType: OpType.Delete,
            cascadeFrom: deleteAction.meta.entityId,
          }
        }));
      }
      break;

    case 'TAG':
      // Remove tag from all tasks (soft cascade)
      // This is handled by the reducer, but we log it
      break;
  }

  return cascadeOps;
}
```

### 5.5. Conflict Resolution with Related Entities

When conflicts occur, we must consider the relationship graph:

```typescript
interface RelatedConflict extends EntityConflict {
  relatedConflicts: EntityConflict[];  // Conflicts in related entities
  relationshipType: 'parent' | 'child' | 'reference';
}

// Example: Task updated locally, but its Project was deleted remotely
// This creates a "cascading conflict" that needs unified resolution

async detectRelatedConflicts(conflict: EntityConflict): Promise<RelatedConflict> {
  const relatedConflicts: EntityConflict[] = [];

  if (conflict.entityType === 'TASK') {
    const task = conflict.localOps[0].payload as Partial<Task>;

    // Check if project was modified/deleted
    if (task.projectId) {
      const projectConflict = await this.findConflictForEntity('PROJECT', task.projectId);
      if (projectConflict) {
        relatedConflicts.push({ ...projectConflict, relationshipType: 'parent' });
      }
    }

    // Check if parent task was modified/deleted
    if (task.parentId) {
      const parentConflict = await this.findConflictForEntity('TASK', task.parentId);
      if (parentConflict) {
        relatedConflicts.push({ ...parentConflict, relationshipType: 'parent' });
      }
    }

    // Check if any referenced tags were modified/deleted
    for (const tagId of (task.tagIds || [])) {
      const tagConflict = await this.findConflictForEntity('TAG', tagId);
      if (tagConflict) {
        relatedConflicts.push({ ...tagConflict, relationshipType: 'reference' });
      }
    }
  }

  return { ...conflict, relatedConflicts };
}
```

### 5.6. Atomic Multi-Entity Operations

Some user actions affect multiple entities atomically. These should be grouped:

```typescript
// Example: Moving a task to another project affects:
// 1. Task.projectId
// 2. Source Project.taskIds (remove)
// 3. Target Project.taskIds (add)

interface AtomicOperationGroup {
  groupId: string; // UUIDv7
  operations: Operation[]; // All ops in this group
  rollbackOnPartialFailure: boolean;
}

// When creating ops for moveToProject:
const moveToProjectOps: AtomicOperationGroup = {
  groupId: uuidv7(),
  operations: [
    {
      id: uuidv7(),
      actionType: '[Task] Update',
      opType: OpType.Update,
      entityType: 'TASK',
      entityId: taskId,
      payload: { projectId: targetProjectId },
      // ... other fields
      groupId: groupId, // Link to group
    },
    // Note: Project.taskIds updates are derived, not stored as separate ops
    // The reducer handles this automatically
  ],
  rollbackOnPartialFailure: true,
};
```

### 5.7. Optimistic Updates with Rollback

For related entities, we need coordinated rollback:

```typescript
class RelatedEntityRollbackService {
  private pendingRollbacks = new Map<string, RollbackState>();

  async applyWithRollback(ops: Operation[]): Promise<void> {
    const groupId = ops[0].groupId || uuidv7();
    const rollbackState: RollbackState = {
      originalStates: new Map(),
      appliedOps: [],
    };

    try {
      for (const op of ops) {
        // Capture original state before applying
        const originalState = await this.captureEntityState(op.entityType, op.entityId);
        rollbackState.originalStates.set(
          `${op.entityType}:${op.entityId}`,
          originalState,
        );

        // Apply operation
        await this.applyOperation(op);
        rollbackState.appliedOps.push(op);
      }

      // All succeeded - clear rollback state
      this.pendingRollbacks.delete(groupId);
    } catch (error) {
      // Rollback all applied operations in reverse order
      for (const appliedOp of rollbackState.appliedOps.reverse()) {
        const key = `${appliedOp.entityType}:${appliedOp.entityId}`;
        const originalState = rollbackState.originalStates.get(key);
        await this.restoreEntityState(
          appliedOp.entityType,
          appliedOp.entityId,
          originalState,
        );
      }
      throw error;
    }
  }
}
```

### 5.8. Handling Orphaned References During Sync

When downloading remote operations, we may encounter references to entities that don't exist locally:

```typescript
enum OrphanHandling {
  QUEUE_AND_RETRY = 'queue', // Wait for the referenced entity to be created
  SKIP_REFERENCE = 'skip', // Apply op but skip the missing reference
  CREATE_PLACEHOLDER = 'placeholder', // Create a minimal placeholder entity
  REJECT = 'reject', // Fail the operation
}

const ORPHAN_HANDLING_POLICY: Record<string, OrphanHandling> = {
  'TASK.projectId': OrphanHandling.QUEUE_AND_RETRY,
  'TASK.parentId': OrphanHandling.QUEUE_AND_RETRY,
  'TASK.tagIds': OrphanHandling.SKIP_REFERENCE,
  'NOTE.projectId': OrphanHandling.QUEUE_AND_RETRY,
  'TASK_REPEAT_CFG.projectId': OrphanHandling.QUEUE_AND_RETRY,
};
```

---

## 6. Integration with Existing pfapi

### 6.1. Coexistence Strategy

The operation log can be introduced **alongside** the existing sync system, not as a replacement:

```
Phase 1: Operation logging only (local persistence, no sync changes)
Phase 2: Dual-write (log ops + maintain current snapshot sync)
Phase 3: Operation-based sync (read from log for sync)
Phase 4: Remove snapshot sync (operation log is primary)
```

### 6.2. pfapi Integration Points

| Existing Component                                                       | Integration Approach          |
| ------------------------------------------------------------------------ | ----------------------------- |
| [`MetaModelCtrl`](../../src/app/pfapi/api/model-ctrl/meta-model-ctrl.ts) | Add op log sequence to meta   |
| [`ModelSyncService`](../../src/app/pfapi/api/sync/model-sync.service.ts) | Keep for snapshot backup      |
| [`SyncService.sync()`](../../src/app/pfapi/api/sync/sync.service.ts:91)  | Add operation exchange phase  |
| Vector Clock utilities                                                   | Reuse existing implementation |

### 6.3. Remote Storage Format

For compatibility with existing WebDAV/Dropbox providers:

```
/superproductivity/
├── main.json              # Legacy: Full state snapshot (kept for backup)
├── meta.json              # Legacy: Metadata with vector clock
├── ops/                   # NEW: Operation logs directory
│   ├── manifest.json      # Index of all op files + last compaction
│   ├── ops_clientA_1700000000.json
│   ├── ops_clientA_1700001000.json
│   ├── ops_clientB_1700000500.json
│   └── ...
└── snapshots/             # NEW: Periodic full snapshots
    ├── snapshot_1700000000.json
    └── ...
```

---

## 7. Migration Strategy

### 7.1. Detection Phase

```typescript
async detectMigrationNeeded(): Promise<MigrationType> {
  const opLogExists = await this.opLogStore.exists();
  const legacyDataExists = await this.legacyStore.hasData();

  if (!opLogExists && legacyDataExists) {
    return MigrationType.LEGACY_TO_OPLOG;
  }
  if (opLogExists && legacyDataExists) {
    return MigrationType.HYBRID; // During transition
  }
  if (!opLogExists && !legacyDataExists) {
    return MigrationType.FRESH_INSTALL;
  }
  return MigrationType.ALREADY_MIGRATED;
}
```

### 7.2. Genesis Operation

For existing users upgrading from the current snapshot-based system:

```typescript
async migrateFromLegacy(): Promise<void> {
  // 1. Load all legacy data
  const legacyState = await this.pfapi.getAllSyncModelData();

  // 2. Create genesis operation
  const genesisOp: Operation = {
    id: uuidv7(),
    actionType: '[Migration] Genesis Import',
    opType: OpType.Batch,
    entityType: 'MIGRATION' as EntityType,
    entityId: '*',
    payload: legacyState,
    clientId: this.clientId,
    vectorClock: { [this.clientId]: 1 },
    timestamp: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  // 3. Write genesis op
  await this.opLogStore.append(genesisOp);

  // 4. Create initial state cache
  await this.opLogStore.saveStateCache({
    state: legacyState,
    lastAppliedOpSeq: 1,
    vectorClock: genesisOp.vectorClock,
    compactedAt: Date.now(),
  });

  // 5. Mark legacy as migrated (don't delete yet)
  await this.legacyStore.markMigrated();
}
```

### 7.3. Rollback Strategy

If issues are detected after migration:

```typescript
async rollbackToLegacy(): Promise<void> {
  // 1. Check if legacy backup exists
  const legacyBackup = await this.legacyStore.getBackup();
  if (!legacyBackup) {
    throw new Error('No legacy backup available for rollback');
  }

  // 2. Restore legacy data
  await this.pfapi.importAllSycModelData({ data: legacyBackup });

  // 3. Clear operation log
  await this.opLogStore.clearAll();

  // 4. Update migration status
  await this.legacyStore.markRolledBack();
}
```

---

## 8. Risks & Mitigations

| Risk                      | Severity | Mitigation                                                    |
| :------------------------ | :------: | :------------------------------------------------------------ |
| **Infinite Loops**        |   High   | Strict `isRemote` flag + action type whitelist + tests        |
| **Startup Slowness**      |  Medium  | Aggressive compaction (default: 500 ops, 7 day retention)     |
| **Lost Updates (Tabs)**   |   High   | Web Locks API + BroadcastChannel coordination                 |
| **Data Bloat**            |  Medium  | Whitelist only essential actions + automatic compaction       |
| **Ordering Glitches**     |  Medium  | Vector clocks + UUID v7 (time-ordered) + deterministic sort   |
| **Memory Pressure**       |  Medium  | Streaming replay for large op sets + pagination               |
| **Sync Provider Limits**  |   Low    | Chunk ops into max 1MB files + manifest index                 |
| **Schema Evolution**      |  Medium  | `schemaVersion` field + forward-compatible payloads           |
| **Partial Sync Failures** |   High   | Transaction-like batching + rollback on failure               |
| **Clock Skew**            |   Low    | Use vector clocks for ordering, wall clock only as tiebreaker |
| **Dangling References**   |   High   | Dependency resolver + orphan handling policies (Section 5)    |
| **Cascade Failures**      |  Medium  | Atomic operation groups + coordinated rollback                |
| **Circular Dependencies** |   Low    | Topological sort with cycle detection                         |

---

## 9. Testing Strategy

### 8.1. Unit Tests

```typescript
describe('OperationLogStore', () => {
  it('should append operations with correct sequence numbers');
  it('should query operations after a given sequence');
  it('should handle concurrent writes with Web Locks');
  it('should compact old operations correctly');
});

describe('OperationLogEffects', () => {
  it('should convert persistent actions to operations');
  it('should ignore remote actions (isRemote: true)');
  it('should increment vector clock on each operation');
});

describe('ConflictDetector', () => {
  it('should identify concurrent changes to same entity');
  it('should auto-resolve sequential changes');
  it('should suggest merge for compatible changes');
});

describe('DependencyResolver', () => {
  it('should detect hard dependencies (subtask -> parent task)');
  it('should handle soft dependencies (task -> tag)');
  it('should queue operations with missing dependencies');
  it('should apply queued ops when dependencies arrive');
  it('should detect and reject circular dependencies');
});

describe('CascadeOperations', () => {
  it('should generate cascade deletes for subtasks when parent deleted');
  it('should orphan tasks when project deleted');
  it('should remove deleted tag from all task.tagIds');
});
```

### 8.2. Integration Tests

```typescript
describe('Multi-Tab Sync', () => {
  it('should coordinate writes across browser tabs');
  it('should broadcast new operations to other tabs');
  it('should handle tab crashes gracefully');
});

describe('Remote Sync', () => {
  it('should upload pending operations');
  it('should download and apply remote operations');
  it('should detect and present conflicts');
  it('should handle operations referencing entities that arrive later');
  it('should resolve related entity conflicts together');
});

describe('Cross-Model Integrity', () => {
  it('should maintain task-project relationship after sync');
  it('should maintain task-tag relationship after sync');
  it('should maintain parent-subtask relationship after sync');
  it('should handle project deletion with associated tasks during sync');
});
```

### 8.3. E2E Tests

```typescript
describe('Operation Log E2E', () => {
  it('should persist task creation across page reload');
  it('should sync changes between two browser sessions');
  it('should handle offline changes and sync on reconnect');
  it('should migrate from legacy data correctly');
});
```

---

## 10. Implementation Phases

### Phase 1: Local Operation Logging (2-3 weeks)

- [ ] Create `OperationLogStore` (IndexedDB adapter)
- [ ] Create `Operation` types and validators (Typia)
- [ ] Create `OperationLogEffects` (listen to persistent actions)
- [ ] Create action whitelist registry
- [ ] Add `isPersistent` meta to 10-15 core actions
- [ ] Create `OperationLogHydrator` for startup
- [ ] Create compaction service
- [ ] Unit tests for all components

### Phase 2: Multi-Tab Coordination (1 week)

- [ ] Implement Web Locks for write coordination
- [ ] Implement BroadcastChannel for cross-tab notification
- [ ] Handle tab crash/unexpected close
- [ ] Integration tests

### Phase 3: Dependency & Relationship Handling (1-2 weeks)

- [ ] Implement dependency resolver for operation ordering
- [ ] Implement orphan handling policies
- [ ] Implement cascade operation generation
- [ ] Implement atomic operation groups
- [ ] Unit tests for cross-model scenarios

### Phase 4: Conflict Detection (1-2 weeks)

- [ ] Implement entity-level conflict detection
- [ ] Implement related entity conflict detection
- [ ] Create conflict resolution UI component
- [ ] Implement auto-merge strategies where possible
- [ ] Add "suggest resolution" logic

### Phase 5: Remote Sync Integration (2-3 weeks)

- [ ] Extend sync providers with op file support
- [ ] Implement op manifest handling
- [ ] Implement bidirectional op sync
- [ ] Handle partial sync failures
- [ ] Integrate with existing `SyncService`

### Phase 6: Migration & Rollout (1-2 weeks)

- [ ] Implement legacy detection
- [ ] Implement genesis operation migration
- [ ] Implement rollback mechanism
- [ ] Feature flag for gradual rollout
- [ ] E2E tests for migration scenarios

### Phase 7: Legacy Removal (Post-Stable)

- [ ] Remove dual-write mode
- [ ] Remove snapshot sync code
- [ ] Update documentation
- [ ] Announce breaking change (if needed)

---

## 11. Open Questions

1. **Payload Size Limits:** Should we split large payloads (e.g., long notes) into separate operations?
2. **Selective Sync:** Can users choose which entities to sync (e.g., only project A)?
3. **Audit Trail:** Should we expose the operation log as a user-visible feature (activity history)?
4. **Rate Limiting:** How do we handle rapid-fire operations (e.g., typing in a text field)?
5. **Encryption:** Should individual operations be encrypted, or only the full op files?
6. **Cascade Delete Policy:** When deleting a project, should tasks be:
   - Moved to Inbox (orphaned)?
   - Deleted along with the project?
   - User prompted to choose?
7. **Relationship Validation:** Should we validate referential integrity on every operation, or trust the client?
8. **Partial Relationship Sync:** If a task references 3 tags but only 2 exist remotely, how do we handle the third?
9. **Ordering Guarantees:** Do we need strict causal ordering for related entities, or is eventual consistency acceptable?
10. **Cross-Client Consistency:** How do we handle the case where Client A deletes a project while Client B creates a task in that project (both offline)?

---

## 12. References

- [Event Sourcing Pattern (Martin Fowler)](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CRDT Primer](https://crdt.tech/)
- [Vector Clocks Explained](https://en.wikipedia.org/wiki/Vector_clock)
- [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [Existing Vector Clock Implementation](../../src/app/pfapi/api/util/vector-clock.ts)
- [Current Sync Service](../../src/app/pfapi/api/sync/sync.service.ts)
