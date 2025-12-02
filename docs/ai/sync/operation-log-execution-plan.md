# Operation Log Sync: Execution Plan

**Created:** December 2, 2025
**Branch:** `feat/operation-logs`
**Status:** Implementation in Progress (~60% complete)
**Last Updated:** December 2, 2025

---

## 1. Executive Summary

The Operation Log sync system provides per-entity conflict detection with semantic merge capabilities, replacing the whole-file Last-Writer-Wins (LWW) approach. The current implementation (~800+ lines across 16 files) has a solid foundation: IndexedDB persistence, NgRx effect capture, vector clock conflict detection, multi-tab coordination, and genesis migration.

### 1.1 Decision: Event Sourcing vs. Per-Entity Delta

**Status: ✅ DECIDED - Use Event Sourcing**

We evaluated both approaches. Per-entity delta sync was attempted but proved complex due to relationship handling. Event sourcing was chosen because:

1. ✅ **Disk space**: Acceptable (~1.5-2x with compaction)
2. ✅ **Sync speed**: Faster (delta ops vs full state)
3. ✅ **Legacy compatibility**: Maintained (WebDAV/Dropbox use legacy only)

### 1.2 Critical Path

> **⚠️ DO NOT MERGE TO MASTER** until these are fixed. They affect ALL users, not just op-log users.

**Before ANY further development**, these critical blockers must be fixed:

| #   | Blocker                                      | Impact                                                  | Effort |
| --- | -------------------------------------------- | ------------------------------------------------------- | ------ |
| 1   | **Legacy sync uploads stale data**           | ALL WebDAV/Dropbox/LocalFileSync users lose recent work | Medium |
| 2   | **SaveToDbEffects disabled at branch level** | NO persistence when feature flag is OFF                 | Small  |
| 3   | **Provider gating missing**                  | Op-log sync runs for ALL providers                      | Small  |
| 4   | **Compaction reads stale cache**             | Data loss when compaction runs                          | Small  |
| 5   | **Dependency ops silently dropped**          | Subtasks arriving before parents are LOST               | Medium |

> **Note:** LocalFileSync uses the same legacy LWW sync approach as WebDAV/Dropbox. All three sync to a single `main.json` file. Op-log sync for LocalFileSync is planned but not yet implemented.

This plan outlines **Phase 0 (critical blockers)** + **5 phases** to bring the system to production-ready status.

---

## 2. Assessment Findings

### 2.1 What's Implemented (Working)

| Component            | File                                              | Status      | Notes                                                                |
| -------------------- | ------------------------------------------------- | ----------- | -------------------------------------------------------------------- |
| Operation Types      | `operation.types.ts`                              | ✅ Complete | Well-defined types for `Operation`, `EntityConflict`, `VectorClock`  |
| IndexedDB Store      | `operation-log-store.service.ts`                  | ✅ Complete | `SUP_OPS` database with ops + state_cache stores, indexes            |
| Effect Capture       | `operation-log.effects.ts`                        | ✅ Complete | Captures persistent actions, increments vector clock, appends to log |
| Sync Upload/Download | `operation-log-sync.service.ts`                   | ✅ Complete | Manifest-based chunked file sync, deduplication                      |
| Conflict Detection   | `operation-log-sync.service.ts:detectConflicts()` | ✅ Complete | Per-entity vector clock comparison                                   |
| Hydrator             | `operation-log-hydrator.service.ts`               | ✅ Complete | Snapshot + tail replay on startup                                    |
| Compaction           | `operation-log-compaction.service.ts`             | ✅ Complete | 7-day retention window, snapshot creation                            |
| Multi-Tab Sync       | `multi-tab-coordinator.service.ts`                | ✅ Complete | BroadcastChannel API coordination                                    |
| Genesis Migration    | `operation-log-migration.service.ts`              | ✅ Complete | Legacy data → first operation                                        |
| Lock Service         | `lock.service.ts`                                 | ✅ Complete | Web Locks API + localStorage fallback                                |
| Action Converter     | `operation-converter.util.ts`                     | ✅ Complete | Op → Action with `isRemote` flag                                     |
| Dependency Extractor | `dependency-resolver.service.ts`                  | 🚧 Partial  | Extracts deps, but no retry queue                                    |

### 2.2 What's Stubbed or Incomplete

| Component            | File                                      | Gap                                                                   | Impact                                                         |
| -------------------- | ----------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Conflict UI**      | `dialog-conflict-resolution.component.ts` | Basic local/remote choice only; no field-level diff, no merge preview | Users can't make informed decisions                            |
| **Conflict Service** | `conflict-resolution.service.ts:51-54`    | TODO: Revert/remove local ops on "remote wins"                        | Potential state inconsistency                                  |
| **Dependency Retry** | `operation-applier.service.ts:20-21`      | TODO: Queue + retry for missing hard deps                             | Subtasks orphaned if parent arrives later                      |
| **Smart Resolution** | `operation-log-sync.service.ts:277-278`   | TODO: `suggestResolution` always returns 'manual'                     | No auto-merge for trivial conflicts                            |
| **Action Blacklist** | `action-whitelist.ts`                     | Only 9 blacklisted actions                                            | UI actions might leak into operation log                       |
| **Effect Guards**    | `operation-log.effects.ts`                | No replay guard flag                                                  | Side effects (notifications, analytics) may fire during replay |
| **Error Recovery**   | `operation-log.effects.ts:77-80`          | Commented out rollback                                                | Optimistic updates not recoverable                             |
| **Testing**          | `*.spec.ts`                               | Only 1 spec file (multi-tab)                                          | No coverage for sync, compaction, hydration                    |

### 2.3 Detailed Code Review Findings (December 2, 2025)

#### 2.3.1 Replay Guard - Missing

**Location:** `replay-guard.service.ts` does not exist

**Current State:**

- No `ReplayGuardService` implemented
- `operation-log-hydrator.service.ts:22-73` performs hydration without any replay guard
- Tail ops are dispatched directly via `store.dispatch(action)` at lines 51-54 and 67-69
- No mechanism to prevent side effects during replay

**Risk:** HIGH - During hydration, dispatched actions may trigger:

- Notification effects
- Analytics tracking
- External API calls
- Other side effects that should only fire for new user actions

#### 2.3.2 Action Blacklist - Minimal

**Location:** `action-whitelist.ts:1-15`

**Current State:** Only 9 actions blacklisted:

```
[App] Set Current Worklog Task
[Layout] Toggle Sidebar
[Layout] Show AddTaskBar
[Layout] Hide AddTaskBar
[Focus Mode] Enter/Exit
[Task] SetCurrentTask
[Task] SetSelectedTask
[Task] UnsetCurrentTask
[Task] Update Task Ui
[Task] Toggle Show Sub Tasks
```

**Risk:** MEDIUM - Many UI-only actions across feature modules likely missing. Need audit of:

- `src/app/features/*/store/*.actions.ts`
- Layout/UI state actions
- Transient selection states

#### 2.3.3 Dependency Resolver - No Retry Queue

**Location:** `dependency-resolver.service.ts` and `operation-applier.service.ts`

**Current State:**

- `extractDependencies()` at lines 22-48 correctly identifies TASK→PROJECT (soft) and TASK→parentId (hard)
- `checkDependencies()` at lines 53-73 checks if entities exist via selectors
- Only handles TASK and PROJECT entity types (lines 76-88), others return `true` (assume exists)
- **Critical:** `operation-applier.service.ts:38-44` skips ops with missing hard deps with only a warning

**Code at operation-applier.service.ts:38-44:**

```typescript
if (missingHardDeps.length > 0) {
  PFLog.warn(
    'OperationApplierService: Skipping operation due to missing hard dependencies.',
    { op, missingHardDeps },
  );
  // TODO: Queue for retry or flag as failed for user intervention
  continue;
}
```

**Risk:** HIGH - Subtasks arriving before parent tasks are silently dropped.

#### 2.3.4 Conflict Resolution - Single Global Resolution

**Location:** `conflict-resolution.service.ts` and `dialog-conflict-resolution.component.ts`

**Current State:**

- Dialog returns single resolution for ALL conflicts (`resolveAll` at lines 44-49)
- `conflict-resolution.service.ts:37` extracts single `result.resolution` and applies to all
- No field-level diff computation
- TODO at line 51-54 for handling local ops when "remote wins"

**Code at conflict-resolution.service.ts:34-42:**

```typescript
if (result) {
  // Simplified handling: apply resolution to all conflicts for now
  // In reality, we would iterate over resolved conflicts
  const resolution = result.resolution; // 'local' | 'remote'

  PFLog.normal(`ConflictResolutionService: Resolved with ${resolution}`);

  for (const conflict of conflicts) {
```

**Risk:** HIGH - Users cannot make per-conflict decisions or see what actually changed.

#### 2.3.5 Error Recovery - Commented Out

**Location:** `operation-log.effects.ts:76-80`

**Current State:**

```typescript
} catch (e) {
  // 4.1.1 Error Handling for Optimistic Updates
  console.error('Failed to persist operation', e);
  // this.notifyUserAndTriggerRollback(action);
}
```

- No user notification on persist failure
- No rollback mechanism implemented
- Method `notifyUserAndTriggerRollback` is referenced but doesn't exist

**Risk:** MEDIUM - Users may think changes saved when they didn't.

#### 2.3.6 Provider Gating - Not Implemented

**Location:** `src/app/pfapi/api/sync/sync.service.ts:99-111`

**Current State:**

- Docs claim WebDAV/Dropbox should skip op-log sync (architecture.md:62-129)
- Actual code at sync.service.ts:103-105 calls op-log sync for ALL providers:

```typescript
if (currentSyncProvider) {
  await this._operationLogSyncService.uploadPendingOps(currentSyncProvider);
  await this._operationLogSyncService.downloadRemoteOps(currentSyncProvider);
}
```

- `OperationLogSyncService` has no provider type checks
- No `supportsOpLogSync()` method exists (despite docs showing it at architecture.md:125-129)

**Risk:** HIGH - WebDAV/Dropbox users will upload `ops/` directory and manifest files, creating unnecessary overhead and potential confusion. The documented gating behavior does not exist in code.

#### 2.3.7 Compaction Snapshot Source - Stale PFAPI Cache

**Location:** `operation-log-compaction.service.ts:22-34`

**Current State:**

- Docs say "Snapshot current NgRx state" (architecture.md:397-405)
- Actual code snapshots `pfapiService.pf.getAllSyncModelData()` at line 23
- With `SaveToDbEffects` disabled, PFAPI caches are NOT updated on user actions
- PFAPI caches only update on: hydration, legacy sync download, or migration

**Code at operation-log-compaction.service.ts:22-34:**

```typescript
// 1. Get current state
const currentState = await this.pfapiService.pf.getAllSyncModelData();
// ...
await this.opLogStore.saveStateCache({
  state: currentState,
  // ...
});
```

**Risk:** HIGH - Snapshots may contain stale state. After compaction deletes ops, hydration from snapshot + remaining tail may not reconstruct correct current state.

#### 2.3.8 Compaction Never Triggered

**Location:** `operation-log-compaction.service.ts` (orphaned)

**Current State:**

- `OperationLogCompactionService.compact()` exists but is never called
- Docs claim triggers: "Every 500 ops, app close, size > 10MB" (architecture.md:399-406)
- `rg OperationLogCompactionService` returns only the service definition and docs
- No hooks, effects, or scheduled calls invoke compaction

**Risk:** MEDIUM - Operation log will grow unbounded. Eventually causes:

- Slow startup (full replay)
- Large IndexedDB storage consumption
- No snapshots created for fast hydration

### 2.4 Architectural Observations

1. **Integration Point**: Operation log sync runs _before_ legacy full-file sync in `sync.service.ts:99-111`. This is correct for incremental adoption.

2. **Replay Safety**: `convertOpToAction()` sets `isRemote: true`, which correctly prevents re-logging in effects. However, NgRx effects other than `OperationLogEffects` may still trigger (e.g., notification effects).

3. **Compaction Risk**: Deleting synced ops older than 7 days is safe, but if a device is offline for >7 days, it may miss ops that were compacted away. The snapshot should contain the full state, but conflict detection loses granularity.

4. **Provider-Specific Sync**: WebDAV and Dropbox continue using legacy LWW (Last-Writer-Wins) sync with `main.json`. Operation log sync is only enabled for Local File Sync and future server-based providers where file operations are fast. See [Architecture Doc](./operation-log-architecture.md) for details.

---

## 3. Phased Implementation Plan

### Phase 0: Production Blockers (MUST DO FIRST)

**Objective:** Fix issues that break legacy sync or cause data loss.

**Prerequisites:** None - do this before any other work.

> **⚠️ CRITICAL: These blockers affect ALL users on this branch, not just those who enable the op-log feature flag.**

#### 0.1 Fix Legacy Sync Stale Data Problem

**Files to modify:**

- `src/app/pfapi/api/pfapi.ts` (method: `getAllSyncModelData`)
- OR `src/app/root-store/shared/save-to-db.effects.ts`

**Problem:**

- `SaveToDbEffects` is disabled (entire class body commented out)
- `getAllSyncModelData()` calls `modelCtrl.load()` for each model
- `ModelCtrl.load()` returns `this._inMemoryData || await this._db.load(...)`
- Since saves are disabled, caches are STALE after user actions
- **ALL sync providers (WebDAV, Dropbox, LocalFileSync) upload OLD state**

**Fix Options (choose ONE):**

**Option A: Read from NgRx directly (RECOMMENDED)**

```typescript
// pfapi.ts - add method to read from NgRx store
async getAllSyncModelDataFromStore(): Promise<AllSyncModels<MD>> {
  // Use selectors to get current NgRx state
  return await firstValueFrom(this.store.select(selectAllSyncModelData));
}

// Modify getAllSyncModelData to use this when op-log is enabled
async getAllSyncModelData(): Promise<AllSyncModels<MD>> {
  if (this.useOperationLogSync) {
    return this.getAllSyncModelDataFromStore();
  }
  // ... existing logic for legacy
}
```

**Option B: Flush NgRx to ModelCtrl before sync**

```typescript
// Add new effect that runs before sync upload
flushToModelCtrl$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(syncStarted),
      tap(() => {
        // Copy each NgRx slice to corresponding ModelCtrl cache
        for (const modelId of Object.keys(this.pfapiService.m)) {
          const state = this.store.selectSignal(selectModelState(modelId))();
          this.pfapiService.m[modelId]._inMemoryData = state;
        }
      }),
    ),
  { dispatch: false },
);
```

**Option C: Re-enable SaveToDbEffects**

- Uncomment `save-to-db.effects.ts`
- Accept increased write load
- Simplest but highest performance cost

**Acceptance Criteria:**

- [ ] WebDAV sync uploads CURRENT NgRx state, not stale cache
- [ ] Dropbox sync uploads CURRENT NgRx state
- [ ] LocalFileSync uploads CURRENT NgRx state
- [ ] User creates task → syncs → other device sees task
- [ ] Integration test verifies state consistency

#### 0.2 Gate SaveToDbEffects by Feature Flag

**File to modify:** `src/app/root-store/shared/save-to-db.effects.ts`

**Problem:**

- `SaveToDbEffects` is completely commented out at the BRANCH level
- Feature flag `useOperationLogSync` is separate
- When flag is OFF, user has NO persistence at all

**Fix:**

```typescript
@Injectable()
export class SaveToDbEffects {
  private _store = inject(Store<RootState>);
  private _actions = inject(Actions);
  private _pfapiService = inject(PfapiService);
  private _globalConfigService = inject(GlobalConfigService);

  // Only run if operation log sync is DISABLED
  private isLegacyPersistenceEnabled$ = this._globalConfigService.sync$.pipe(
    map((sync) => !sync?.useOperationLogSync),
  );

  tag$ = createEffect(
    () =>
      this.isLegacyPersistenceEnabled$.pipe(
        filter((enabled) => enabled),
        switchMap(() => this.createSaveEffect(selectTagFeatureState, 'tag')),
      ),
    { dispatch: false },
  );
  // ... repeat for other effects
}
```

**Acceptance Criteria:**

- [ ] When `useOperationLogSync: false`, SaveToDbEffects writes to 'pf' database
- [ ] When `useOperationLogSync: true`, SaveToDbEffects is disabled
- [ ] User without feature flag has working persistence
- [ ] Unit test verifies conditional behavior

#### 0.3 Implement Provider Gating

**File to modify:** `src/app/pfapi/api/sync/sync.service.ts`

**Current code (broken):**

```typescript
// sync.service.ts:103-105 - runs for ALL providers!
if (currentSyncProvider) {
  await this._operationLogSyncService.uploadPendingOps(currentSyncProvider);
  await this._operationLogSyncService.downloadRemoteOps(currentSyncProvider);
}
```

**Fix:**

```typescript
// Add helper method
private supportsOpLogSync(provider: SyncProvider | null): boolean {
  if (!provider) return false;
  // ALL current providers use legacy LWW sync
  // WebDAV, Dropbox, LocalFileSync: all sync to a single main.json file
  // Op-log sync is reserved for future server-based providers only
  return false;
}

// Update sync() method
if (this.supportsOpLogSync(currentSyncProvider)) {
  await this._operationLogSyncService.uploadPendingOps(currentSyncProvider);
  await this._operationLogSyncService.downloadRemoteOps(currentSyncProvider);
}
```

> **Note:** ALL current providers (WebDAV, Dropbox, LocalFileSync) use legacy LWW sync with a single `main.json` file. Op-log sync is designed for future server-based providers where the server can efficiently handle operation streams. LocalFileSync will remain on legacy sync.

**Acceptance Criteria:**

- [ ] WebDAV sync does NOT call `uploadPendingOps` or `downloadRemoteOps`
- [ ] Dropbox sync does NOT call op-log methods
- [ ] LocalFileSync does NOT call op-log methods (uses legacy sync)
- [ ] Unit test verifies provider gating

#### 0.4 Fix Compaction Snapshot Source

**Files to modify:**

- `src/app/core/persistence/operation-log/operation-log.effects.ts`
- `src/app/core/persistence/operation-log/operation-log-compaction.service.ts`

**Implementation:**

1. **Fix snapshot source** - read from NgRx, not stale PFAPI cache:

```typescript
// operation-log-compaction.service.ts
// BEFORE (broken):
const currentState = await this.pfapiService.pf.getAllSyncModelData();

// AFTER (fixed):
const currentState = await firstValueFrom(this.store.select(selectAllSyncModelData));
```

2. **Add op count trigger** in effects:

```typescript
// operation-log.effects.ts - add after writeOperation
private opsSinceCompaction = 0;
private readonly COMPACTION_THRESHOLD = 500;

// In writeOperation success path:
this.opsSinceCompaction++;
if (this.opsSinceCompaction >= this.COMPACTION_THRESHOLD) {
  await this.compactionService.compact();
  this.opsSinceCompaction = 0;
}
```

3. **Add app-close trigger** (optional, for safety):

```typescript
// In AppComponent or similar
@HostListener('window:beforeunload')
async onBeforeUnload(): Promise<void> {
  await this.compactionService.compact();
}
```

**Acceptance Criteria:**

- [ ] Compaction runs after 500 ops
- [ ] Snapshot contains current NgRx state (not stale PFAPI cache)
- [ ] Old synced ops are deleted (respecting 7-day window)
- [ ] Unsynced ops are NEVER deleted
- [ ] Unit test verifies compaction trigger

#### 0.5 Add Dependency Retry Queue (Move from Phase 2)

**Files to modify:**

- `src/app/core/persistence/operation-log/operation-applier.service.ts`
- `src/app/core/persistence/operation-log/dependency-resolver.service.ts`

**Problem:**

```typescript
// operation-applier.service.ts:38-44
if (missingHardDeps.length > 0) {
  PFLog.warn('... Skipping operation due to missing hard dependencies.', ...);
  continue;  // <-- SILENTLY DROPS THE OPERATION!
}
```

**Impact:** If a subtask op arrives before its parent task op (due to network timing), the subtask is **permanently lost** with only a console warning.

**Fix:**

```typescript
// Add retry queue instead of continue
if (missingHardDeps.length > 0) {
  this.dependencyResolver.queueForRetry(op, missingHardDeps);
  continue; // Queue it, don't drop it
}
```

See Phase 2.1 for full implementation details of the retry queue.

**Acceptance Criteria:**

- [ ] Subtask op with missing parent is QUEUED, not dropped
- [ ] When parent arrives, subtask is retried and applied
- [ ] After MAX_RETRIES, op is logged as error (not silently dropped)
- [ ] Unit test: subtask before parent → both eventually applied

---

### Phase 1: Core Stability & Safety Guards

**Objective:** Ensure replay and sync operations don't trigger unintended side effects.

**Prerequisites:** Phase 0 complete.

#### 1.1 Add Replay Guard Flag

**Files to modify:**

- `src/app/core/persistence/operation-log/operation-log-hydrator.service.ts`
- New: `src/app/core/persistence/operation-log/replay-guard.service.ts`

**Implementation:**

```typescript
// replay-guard.service.ts
@Injectable({ providedIn: 'root' })
export class ReplayGuardService {
  private _isReplaying = signal(false);
  readonly isReplaying = this._isReplaying.asReadonly();

  enterReplayMode(): void {
    this._isReplaying.set(true);
  }
  exitReplayMode(): void {
    this._isReplaying.set(false);
  }
}
```

**Changes to hydrator:**

```typescript
async hydrateStore(): Promise<void> {
  this.replayGuard.enterReplayMode();
  try {
    // ... existing hydration logic ...
  } finally {
    this.replayGuard.exitReplayMode();
  }
}
```

**Changes to effects that shouldn't fire during replay:**

- Inject `ReplayGuardService` and add `filter(() => !this.replayGuard.isReplaying())`
- Identify effects: notification effects, analytics, external API calls

**Acceptance Criteria:**

- [ ] Replay flag is set during `hydrateStore()` and remote op application
- [ ] Notification effects don't fire during hydration
- [ ] Unit test verifies flag state transitions

#### 1.2 Refine Action Blacklist

**File to modify:** `src/app/core/persistence/operation-log/action-whitelist.ts`

**Implementation:**

- Audit all NgRx actions in `src/app/features/*/store/*.actions.ts`
- Identify transient, UI-only, or non-persistent actions that are missing from `BLACKLISTED_ACTION_TYPES`.
- Add comments or categorization to the blacklist for clarity.
- **Note:** We use a blacklist approach because most actions should be persisted.

**Deliverable:** Comprehensive blacklist of non-persistent actions.

**Acceptance Criteria:**

- [ ] Audit completed for all feature modules
- [ ] Confirmed that only persistent state changes are allowed through
- [ ] Unit test ensures known UI actions are blacklisted

#### 1.3 Error Recovery for Optimistic Updates

**File to modify:** `src/app/core/persistence/operation-log/operation-log.effects.ts`

**Implementation:**

```typescript
// On persist failure, dispatch a compensating action
private notifyUserAndTriggerRollback(action: PersistentAction): void {
  // Show notification to user
  this.snackbarService.showError('Failed to save change. Please retry.');
  // Optionally: Dispatch inverse action or reload state
  // For now, just warn - full rollback requires inverse action generation
}
```

**Acceptance Criteria:**

- [ ] User sees notification on persist failure
- [ ] System remains in consistent state (no partial writes)

---

### Phase 2: Dependency Resolution & Retry

**Objective:** Handle operations that arrive before their dependencies (e.g., subtask before parent task).

**Duration Estimate:** 1 week

#### 2.1 Implement Retry Queue

**Files to modify:**

- `src/app/core/persistence/operation-log/dependency-resolver.service.ts`
- `src/app/core/persistence/operation-log/operation-applier.service.ts`

**Implementation:**

```typescript
// dependency-resolver.service.ts - add retry queue
interface PendingOp {
  op: Operation;
  missingDeps: OperationDependency[];
  retryCount: number;
  addedAt: number;
}

private pendingQueue: PendingOp[] = [];
private readonly MAX_RETRIES = 5;
private readonly RETRY_DELAY_MS = 1000;

queueForRetry(op: Operation, missingDeps: OperationDependency[]): void {
  this.pendingQueue.push({ op, missingDeps, retryCount: 0, addedAt: Date.now() });
  this.scheduleRetry();
}

private async retryPending(): Promise<void> {
  const stillPending: PendingOp[] = [];
  for (const item of this.pendingQueue) {
    const { missing } = await this.checkDependencies(item.missingDeps);
    if (missing.length === 0) {
      await this.operationApplier.applyOperations([item.op]);
    } else if (item.retryCount < this.MAX_RETRIES) {
      item.retryCount++;
      stillPending.push(item);
    } else {
      PFLog.error('Dropping op after max retries', { op: item.op, missingDeps: missing });
      // TODO: Surface to user or create orphan recovery UI
    }
  }
  this.pendingQueue = stillPending;
  if (stillPending.length > 0) this.scheduleRetry();
}
```

**Changes to operation-applier.service.ts:**

```typescript
if (missingHardDeps.length > 0) {
  this.dependencyResolver.queueForRetry(op, missingHardDeps);
  continue;
}
```

**Acceptance Criteria:**

- [ ] Subtask op queued if parent doesn't exist yet
- [ ] Parent op arrival triggers retry, subtask applies successfully
- [ ] Ops dropped after MAX_RETRIES with error log
- [ ] Unit tests for queue/retry logic

#### 2.2 Add Dependency Types for All Entities

**File to modify:** `src/app/core/persistence/operation-log/dependency-resolver.service.ts`

**Implementation:**

- Add `checkEntityExists` cases for: `TAG`, `NOTE`, `SIMPLE_COUNTER`, `WORK_CONTEXT`, `TASK_REPEAT_CFG`, `ISSUE_PROVIDER`
- Add selectors for each entity type

**Acceptance Criteria:**

- [ ] All entity types have dependency checking
- [ ] Integration test: cross-entity references resolve correctly

---

### Phase 3: Conflict Resolution UI & Logic

**Objective:** Enable users to make informed conflict resolution decisions with field-level visibility and per-conflict granularity.

**Duration Estimate:** 2 weeks

#### Critical Issues in Current Implementation

1. **Single global resolution applied to all conflicts** (HIGH): `dialog-conflict-resolution.component.ts:34-49` returns one resolution, but `conflict-resolution.service.ts:24-66` applies it to ALL conflicts.

2. **No payload/field visibility** (HIGH): UI shows only op counts and timestamps, not actual data differences.

3. **Missing edge case handling** (MEDIUM): `conflict.localOps[conflict.localOps.length - 1]` throws if arrays are empty.

4. **No feature flag UI** (MEDIUM): `useOperationLogSync` has no settings toggle.

#### 3.1 Enhanced Conflict Data Structure

**File to modify:** `src/app/core/persistence/operation-log/operation.types.ts`

**Implementation:**

```typescript
export interface FieldDiff {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  isMergeable: boolean; // true if different fields changed
}

export interface EnhancedEntityConflict extends EntityConflict {
  fieldDiffs: FieldDiff[];
  canAutoMerge: boolean;
  autoMergedPayload?: unknown;
  entitySnapshot?: {
    local: unknown;
    remote: unknown;
    base?: unknown; // Common ancestor if available
  };
}
```

#### 3.2 Smart Resolution Suggestions

**File to modify:** `src/app/core/persistence/operation-log/conflict-resolution.service.ts`

**Implementation:**

```typescript
suggestResolution(conflict: EntityConflict): EnhancedEntityConflict {
  const localPayload = this.extractLatestPayload(conflict.localOps);
  const remotePayload = this.extractLatestPayload(conflict.remoteOps);
  const fieldDiffs = this.computeFieldDiffs(localPayload, remotePayload);

  // Auto-merge if different fields changed
  const localFields = new Set(fieldDiffs.filter(d => d.localValue !== undefined).map(d => d.field));
  const remoteFields = new Set(fieldDiffs.filter(d => d.remoteValue !== undefined).map(d => d.field));
  const overlappingFields = [...localFields].filter(f => remoteFields.has(f));

  const canAutoMerge = overlappingFields.length === 0;
  const autoMergedPayload = canAutoMerge
    ? { ...localPayload, ...remotePayload } // Non-overlapping merge
    : undefined;

  return {
    ...conflict,
    fieldDiffs,
    canAutoMerge,
    autoMergedPayload,
    suggestedResolution: canAutoMerge ? 'merge' :
      (conflict.localOps[0].timestamp > conflict.remoteOps[0].timestamp ? 'local' : 'remote'),
  };
}
```

#### 3.3 Enhanced Conflict Resolution UI

**Files to modify:**

- `src/app/imex/sync/dialog-conflict-resolution/dialog-conflict-resolution.component.ts`
- `src/app/imex/sync/dialog-conflict-resolution/dialog-conflict-resolution.component.html`

**Implementation:**

- Show field-level diff for each conflict
- Display timestamps and device IDs
- Offer "Auto-merge" button when `canAutoMerge: true`
- Allow per-field resolution (advanced mode)
- Show preview of resulting state before confirmation

**UI Mockup:**

```
+---------------------------------------------------------------+
| Sync Conflict: Task "Meeting notes"                           |
+---------------------------------------------------------------+
| Field       | Local (Desktop, 2m ago) | Remote (Phone, 5m ago)|
|-------------|-------------------------|-----------------------|
| title       | "Meeting notes v2"      | "Meeting notes"       |
| isDone      | false                   | > true                |
| timeSpent   | 3600                    | 3600 (same)           |
+---------------------------------------------------------------+
| Suggestion: Can auto-merge (different fields changed)         |
|                                                               |
| [Auto-merge] [Use Local] [Use Remote] [Resolve per field]     |
+---------------------------------------------------------------+
```

**Acceptance Criteria:**

- [ ] Field diffs computed and displayed
- [ ] Auto-merge works for non-overlapping changes
- [ ] User can choose local/remote/merge per conflict
- [ ] Preview shows final state before confirmation
- [ ] E2E test: simulate conflict, verify UI renders correctly

#### 3.4 Implement "Remote Wins" State Cleanup

**File to modify:** `src/app/core/persistence/operation-log/conflict-resolution.service.ts`

**Implementation:**

```typescript
// When user chooses "remote", we need to:
// 1. Apply remote ops to state
// 2. Mark local conflicting ops as "superseded" (not deleted, for audit trail)
// 3. Optionally: generate compensating ops to undo local changes

if (resolution === 'remote') {
  // Mark local ops as superseded
  for (const localOp of conflict.localOps) {
    await this.opLogStore.markSuperseded(localOp.id, conflict.remoteOps[0].id);
  }
  // Apply remote ops
  await this.operationApplier.applyOperations(conflict.remoteOps);
}
```

**New method in operation-log-store.service.ts:**

```typescript
async markSuperseded(opId: string, supersededById: string): Promise<void> {
  // Add supersededBy field to entry (for audit)
  // This op is still in log but won't be re-synced
}
```

---

### Phase 4: Testing & Hardening

**Objective:** Comprehensive test coverage for all sync scenarios.

**Duration Estimate:** 2 weeks

#### 4.1 Unit Tests

**New test files:**

- `operation-log-store.service.spec.ts`
- `operation-log-sync.service.spec.ts`
- `operation-log-hydrator.service.spec.ts`
- `operation-log-compaction.service.spec.ts`
- `conflict-resolution.service.spec.ts`
- `dependency-resolver.service.spec.ts`
- `operation-applier.service.spec.ts`

**Test scenarios:**

1. **Store Service:**

   - Append ops and verify sequence
   - Get unsynced ops
   - Mark synced
   - Delete old ops (compaction)
   - Vector clock accumulation

2. **Sync Service:**

   - Upload pending ops → verify manifest updated
   - Download remote ops → verify applied
   - Conflict detection (CONCURRENT vector clocks)
   - Non-conflicting ops (one HAPPENED_BEFORE other)

3. **Hydrator:**

   - Cold start with snapshot + tail ops
   - Cold start with no snapshot (full replay)
   - Migration path (legacy data → genesis op)

4. **Compaction:**

   - Snapshot creation
   - Old op deletion (respecting retention window)
   - Never delete unsynced ops

5. **Conflict Resolution:**
   - Field diff computation
   - Auto-merge for non-overlapping
   - Manual resolution paths

#### 4.2 Integration Tests

**New test file:** `operation-log-integration.spec.ts`

**Scenarios:**

1. Two clients edit same task → conflict detected
2. Two clients edit different tasks → no conflict, both apply
3. Client A creates subtask, Client B creates parent → dependency resolution
4. Client offline 8+ days → syncs via snapshot, no missing ops

#### 4.3 E2E Tests (Playwright)

**New test file:** `e2e/tests/sync/operation-log-sync.spec.ts`

**Scenarios:**

1. Create task on Device A → sync → verify on Device B (mocked)
2. Concurrent edits → conflict dialog appears → resolve → state consistent
3. Large dataset (1000 tasks) → sync completes in <5s
4. Offline mode → queue ops → reconnect → sync succeeds

#### 4.4 Performance Benchmarks

**Targets:**

- Startup with 10k ops in log: <2s
- Incremental sync (100 new ops): <3s
- Compaction (50k ops → snapshot): <5s

**Benchmark script:** `scripts/benchmark-oplog.ts`

---

### Phase 5: Rollout & Migration

**Objective:** Safe rollout with feature flag and rollback capability.

**Duration Estimate:** 1 week

#### 5.1 Feature Flag

**File to modify:** `src/app/features/config/global-config.model.ts`

**Implementation:**

```typescript
export interface SyncConfig {
  // ... existing ...
  useOperationLogSync: boolean; // Default: false
}
```

**Conditional in sync.service.ts:**

```typescript
if (this._globalConfigService.cfg.sync.useOperationLogSync) {
  await this._operationLogSyncService.uploadPendingOps(currentSyncProvider);
  await this._operationLogSyncService.downloadRemoteOps(currentSyncProvider);
}
// Legacy sync continues regardless (hybrid mode during rollout)
```

#### 5.2 Hybrid Sync Mode

During rollout, both sync systems run:

1. Operation log sync handles incremental changes
2. Legacy full-file sync provides safety net

This ensures:

- Users can disable oplog sync if issues arise
- Full state is still backed up to remote
- Gradual confidence building

#### 5.3 Migration Path

**For new users:**

- Operation log starts empty
- Genesis op created on first sync if legacy data exists

**For existing users:**

- Enable feature flag
- Genesis migration runs on next startup
- Both sync systems active

**Rollback:**

- Disable feature flag
- Legacy sync continues working
- Operation log data preserved but unused

#### 5.4 Monitoring & Metrics

**Metrics to track:**

- Operation log size (ops count, bytes)
- Sync duration (upload/download)
- Conflict rate (per day)
- Resolution choices (local/remote/merge distribution)
- Dependency retry count
- Compaction frequency

**Log events:**

```typescript
PFLog.metric('oplog_sync_complete', {
  uploadedOps: n,
  downloadedOps: m,
  conflicts: c,
  durationMs: t,
});
```

---

## 4. Critical Decisions

### 4.1 Architecture Decisions

| Decision                | Options                                                         | Chosen                      | Status     |
| ----------------------- | --------------------------------------------------------------- | --------------------------- | ---------- |
| Event sourcing vs delta | A) Operation log B) Per-entity delta                            | A) Operation log            | ✅ Decided |
| Hybrid vs. Replace sync | A) Run oplog alongside legacy B) Replace legacy entirely        | A) Hybrid during rollout    | ✅ Decided |
| Conflict auto-merge     | A) Always manual B) Auto for non-overlapping C) User preference | B) Auto for non-overlapping | ✅ Decided |
| Compaction retention    | A) 7 days B) 14 days C) Configurable                            | A) 7 days                   | ✅ Decided |
| Offline tolerance       | How long offline before snapshot-only sync?                     | 7 days (matches compaction) | ✅ Decided |

### 4.2 UX Decisions

| Decision               | Options                                                        | Chosen                    | Status     |
| ---------------------- | -------------------------------------------------------------- | ------------------------- | ---------- |
| Conflict notification  | A) Modal dialog B) Non-blocking notification C) Both           | A) Modal (current)        | ✅ Decided |
| Field-level resolution | A) Always available B) Advanced mode toggle C) Not implemented | B) Advanced mode toggle   | ✅ Decided |
| Conflict defer         | Can user dismiss conflict dialog and resolve later?            | Yes, with badge indicator | ✅ Decided |

### 4.3 Technical Decisions

| Decision             | Options                                                                | Chosen                                                   | Status     |
| -------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| Manifest locking     | A) Optimistic (current) B) Pessimistic (file lock) C) CRDT-style merge | A) Optimistic is sufficient                              | ✅ Decided |
| Op file chunking     | A) 100 ops/file (current) B) Time-based C) Size-based                  | A) 100 ops/file                                          | ✅ Decided |
| Vector clock pruning | A) Never B) After 30 days C) After device removal                      | B) After 30 days (implemented in `limitVectorClockSize`) | ✅ Decided |

### 4.4 Resolved Questions (December 2, 2025)

These questions from code review have been resolved:

| #   | Question                    | Decision                                       | Implementation |
| --- | --------------------------- | ---------------------------------------------- | -------------- |
| 1   | Provider gating location    | Gate in SyncService with `supportsOpLogSync()` | Phase 0.1      |
| 2   | Compaction snapshot source  | Read from NgRx store via selector              | Phase 0.2      |
| 3   | Compaction trigger location | Op count hook (500) + app close hook           | Phase 0.2      |

### 4.5 Model Migration Strategy (December 2, 2025)

**Key Rule:** Never replay old data into a newer model without migration. Versioned schemas and migration paths are required for both snapshots and ops.

#### 4.5.1 Current State

- `Operation.schemaVersion` exists (operation.types.ts:48), set to `1` in effects
- `OperationLogManifest.version` exists (operation.types.ts:75), set to `1`
- **Missing:** `state_cache` has no `schemaVersion` field (operation-log-store.service.ts:188-198)
- **Missing:** No migration logic exists for ops or snapshots
- **Missing:** No version compatibility checks during hydration or sync

#### 4.5.2 Required Components

| Component                    | Purpose                                                        | Status     |
| ---------------------------- | -------------------------------------------------------------- | ---------- |
| Snapshot schemaVersion       | Track data model version in state_cache                        | ❌ Missing |
| App data model version       | Global version in manifest/snapshot header                     | ❌ Missing |
| Op migration transforms      | Transform payload when `op.schemaVersion < currentVersion`     | ❌ Missing |
| Snapshot migration functions | Migrate snapshot state before hydration                        | ❌ Missing |
| Version check on hydration   | Check versions before dispatching, run migrations              | ❌ Missing |
| Sync version compatibility   | Block sync when remote version incompatible                    | ❌ Missing |
| Post-migration validation    | Typia validation after migration, fail fast if invalid         | ❌ Missing |
| Migration test fixtures      | Old snapshot + ops fixtures with expected post-migration state | ❌ Missing |

#### 4.5.3 Migration Flow

```
Hydration:
1. Load snapshot from state_cache
2. Check snapshot.schemaVersion vs currentSchemaVersion
3. If older: run snapshot migrations (pure, deterministic, idempotent)
4. Validate migrated snapshot with Typia
5. Dispatch loadAllData with migrated state
6. Load tail ops
7. For each op where op.schemaVersion < currentSchemaVersion:
   - Transform payload via migration function
   - Or drop with warning if unsupported version
8. Validate each migrated op payload
9. Dispatch actions

Sync (download):
1. Check remote manifest/snapshot version
2. If remote.version > client.maxSupportedVersion:
   - Block sync, show "App upgrade required" message
3. If remote.version < client.minReadableVersion:
   - Block sync, show "Remote data too old" message
4. Apply migrations to downloaded ops before applying
```

#### 4.5.4 Implementation Recommendation

Add as **Phase 1.4** (after 1.1-1.3) since model changes are inevitable and migration failures corrupt data silently.

**Files to create/modify:**

- `operation.types.ts` - Add `schemaVersion` to state_cache interface
- `operation-log-store.service.ts` - Include schemaVersion in saveStateCache/loadStateCache
- New: `operation-migration.service.ts` - Migration registry and transform functions
- `operation-log-hydrator.service.ts` - Add version checks and migration calls
- `operation-log-sync.service.ts` - Add version compatibility checks

**Acceptance Criteria:**

- [ ] state_cache includes schemaVersion field
- [ ] Hydration checks and migrates snapshot if version differs
- [ ] Tail ops are migrated before dispatch if version differs
- [ ] Sync rejects incompatible remote versions with clear message
- [ ] Post-migration Typia validation passes
- [ ] Test fixture: v1 snapshot + ops → v2 migration → valid state

---

## 5. Validation Checklist

### Phase 0 Validation (CRITICAL)

- [ ] **0.1 Stale Data:** User creates task → WebDAV sync → other device downloads → task appears
- [ ] **0.1 Stale Data:** User creates task → Dropbox sync → other device downloads → task appears
- [ ] **0.1 Stale Data:** User creates task → LocalFileSync → other device downloads → task appears
- [ ] **0.2 Feature Flag:** With flag OFF, user data persists to IndexedDB after app restart
- [ ] **0.2 Feature Flag:** With flag ON, SaveToDbEffects doesn't run
- [ ] **0.3 Provider Gating:** WebDAV sync does NOT call op-log methods
- [ ] **0.3 Provider Gating:** Dropbox sync does NOT call op-log methods
- [ ] **0.3 Provider Gating:** LocalFileSync does NOT call op-log methods (uses legacy)
- [ ] **0.4 Compaction:** Snapshot contains current NgRx state (verify with debugger)
- [ ] **0.4 Compaction:** Compaction actually triggers after 500 ops
- [ ] **0.5 Dependency:** Subtask arriving before parent is queued, not dropped

### Phase 1 Validation

- [ ] Run `npm test` - all existing tests pass
- [ ] Manual: Create task during hydration → no duplicate notifications
- [ ] Manual: Persist failure → user sees error message

### Phase 2 Validation

- [ ] Unit test: Dependency retry queue works
- [ ] Manual: Create subtask, then parent on different device → both sync correctly
- [ ] Manual: After 5 retries, orphan op is logged with error

### Phase 3 Validation

- [ ] Unit test: Field diff computation matches expected output
- [ ] Manual: Edit same task on two devices → conflict UI shows field diff
- [ ] Manual: Auto-merge works for different fields
- [ ] E2E: Full conflict resolution flow

### Phase 4 Validation

- [ ] All unit tests pass with >80% coverage on oplog files
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Benchmark: Startup <2s with 10k ops
- [ ] Benchmark: Sync <3s with 100 new ops

### Phase 5 Validation

- [ ] Feature flag toggles oplog sync correctly
- [ ] Hybrid mode: both syncs complete without error
- [ ] Migration: Legacy data becomes genesis op
- [ ] Rollback: Disabling flag doesn't break sync

---

## 6. Risk Register

### 🔴 CRITICAL Risks (Data Loss / Branch-Breaking)

| Risk                                           | Likelihood | Impact   | Mitigation                                                            |
| ---------------------------------------------- | ---------- | -------- | --------------------------------------------------------------------- |
| **Legacy sync uploads stale data**             | **100%**   | Critical | Phase 0.1 - Read from NgRx store instead of stale ModelCtrl cache     |
| **SaveToDbEffects disabled for ALL users**     | **100%**   | Critical | Phase 0.2 - Gate disable by feature flag                              |
| **Op-log sync runs for unsupported providers** | High       | High     | Phase 0.3 - Add provider gating check                                 |
| **Compaction snapshots stale data**            | High       | Critical | Phase 0.4 - Read from NgRx store                                      |
| **Dependency ops silently dropped**            | High       | High     | Phase 0.5 - Add retry queue                                           |
| **SUP_OPS corruption with no recovery path**   | Low        | Critical | Add recovery procedures (from remote, from legacy pf, from main.json) |
| **Genesis migration crashes mid-way**          | Low        | High     | Add idempotency checks and repair path                                |

### 🟠 HIGH Risks

| Risk                                     | Likelihood | Impact | Mitigation                                    |
| ---------------------------------------- | ---------- | ------ | --------------------------------------------- |
| Replay fires side effects                | High       | Medium | Phase 1 replay guard implementation           |
| Dual vector clocks diverge               | High       | Medium | Sync PFAPI VC when op log advances            |
| Device offline >7 days falls off op tail | Medium     | High   | Define snapshot merge strategy, gap detection |
| Action blacklist misses UI actions       | High       | Medium | Comprehensive audit OR switch to whitelist    |

### 🟡 MEDIUM Risks

| Risk                                                  | Likelihood | Impact   | Mitigation                                            |
| ----------------------------------------------------- | ---------- | -------- | ----------------------------------------------------- |
| Compaction deletes ops still needed by offline device | Medium     | High     | Longer retention window; snapshot contains full state |
| Concurrent manifest updates cause data loss           | Low        | High     | Atomic upload; manifest is append-only list           |
| Large op log slows startup                            | Medium     | Medium   | Compaction; snapshot hydration                        |
| Field-level merge produces invalid state              | Low        | High     | Typia validation after merge; manual override option  |
| User confusion with conflict UI                       | Medium     | Medium   | Clear UX; auto-merge for simple cases                 |
| Migration breaks existing data                        | Low        | Critical | Backup before migration; rollback path                |
| Vector clock pruning drops device (>50 devices)       | Low        | Medium   | Implement time-based pruning (30 days) as documented  |

---

## 7. File Reference

### Core Implementation

```
src/app/core/persistence/operation-log/
- action-whitelist.ts              # List of excluded actions
- conflict-resolution.service.ts   # Conflict UI and resolution
- dependency-resolver.service.ts   # Dep extraction and checking
- lock.service.ts                  # Cross-tab locking
- multi-tab-coordinator.service.ts # BroadcastChannel sync
- operation-applier.service.ts     # Apply ops to store
- operation-converter.util.ts      # Op → Action conversion
- operation-log-compaction.service.ts
- operation-log-hydrator.service.ts
- operation-log-migration.service.ts
- operation-log-store.service.ts   # IndexedDB persistence
- operation-log-sync.service.ts    # Remote sync
- operation-log-effects.ts         # NgRx effect capture
- operation.types.ts               # Type definitions
- persistent-action.interface.ts   # Action metadata
```

### UI Components

```
src/app/imex/sync/dialog-conflict-resolution/
- dialog-conflict-resolution.component.ts
- dialog-conflict-resolution.component.html
- dialog-conflict-resolution.component.scss
```

### Integration Points

```
src/app/pfapi/api/sync/sync.service.ts  # Calls oplog sync
src/app/pfapi/api/pfapi.ts              # Injects oplog service
```

---

## 8. Appendix: Vector Clock Primer

For reference, the system uses vector clocks for conflict detection:

```typescript
// Vector clock comparison results:
enum VectorClockComparison {
  EQUAL, // Same state - no conflict
  HAPPENED_BEFORE, // Local is ancestor of remote - apply remote
  HAPPENED_AFTER, // Remote is ancestor of local - remote is stale
  CONCURRENT, // Neither is ancestor - TRUE CONFLICT
}

// Example:
// Local:  { 'deviceA': 3, 'deviceB': 2 }
// Remote: { 'deviceA': 2, 'deviceB': 3 }
// Result: CONCURRENT (each has changes the other doesn't)
```

The operation log stores the vector clock state _after_ each operation, enabling precise conflict detection at the entity level.

---

## 9. Related Documents

- [Architecture Overview](./operation-log-architecture.md) - High-level system design and components
