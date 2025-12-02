# Operation Log Sync: Execution Plan

**Created:** December 2, 2025
**Branch:** `feat/operation-logs`
**Status:** Implementation in Progress

---

## 1. Executive Summary

The Operation Log sync system provides per-entity conflict detection with semantic merge capabilities, replacing the whole-file Last-Writer-Wins (LWW) approach. The current implementation (~800+ lines across 16 files) has a solid foundation: IndexedDB persistence, NgRx effect capture, vector clock conflict detection, multi-tab coordination, and genesis migration. Key gaps remain in **conflict resolution UX**, **dependency retry logic**, **effect guards during replay**, and **comprehensive testing**. This plan outlines 5 phases to bring the system to production-ready status.

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
| **Smart Resolution** | `operation-log-sync.service.ts:278`       | TODO: `suggestResolution` always returns 'manual'                     | No auto-merge for trivial conflicts                            |
| **Action Whitelist** | `action-whitelist.ts`                     | Only 9 blacklisted actions                                            | Need explicit whitelist per entity type                        |
| **Effect Guards**    | `operation-log.effects.ts`                | No replay guard flag                                                  | Side effects (notifications, analytics) may fire during replay |
| **Error Recovery**   | `operation-log.effects.ts:77-80`          | Commented out rollback                                                | Optimistic updates not recoverable                             |
| **Testing**          | `*.spec.ts`                               | Only 1 spec file (multi-tab)                                          | No coverage for sync, compaction, hydration                    |

### 2.3 Architectural Observations

1. **Integration Point**: Operation log sync runs _before_ legacy full-file sync in `sync.service.ts:99-111`. This is correct for incremental adoption.

2. **Replay Safety**: `convertOpToAction()` sets `isRemote: true`, which correctly prevents re-logging in effects. However, NgRx effects other than `OperationLogEffects` may still trigger (e.g., notification effects).

3. **Compaction Risk**: Deleting synced ops older than 7 days is safe, but if a device is offline for >7 days, it may miss ops that were compacted away. The snapshot should contain the full state, but conflict detection loses granularity.

4. **Manifest Consistency**: The manifest file is overwritten atomically (`forceOverwrite: true`), which is correct for eventual consistency but may cause issues if two devices upload simultaneously.

---

## 3. Phased Implementation Plan

### Phase 1: Core Stability & Safety Guards

**Objective:** Ensure replay and sync operations don't trigger unintended side effects.

**Duration Estimate:** 1 week

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

#### 1.2 Complete Action Whitelist

**File to modify:** `src/app/core/persistence/operation-log/action-whitelist.ts`

**Implementation:**

- Audit all NgRx actions in `src/app/features/*/store/*.actions.ts`
- Create explicit whitelist map: `Map<ActionType, EntityType>`
- Update effect to use whitelist instead of blacklist

**Deliverable:** Complete mapping of ~50-100 action types to entity types

**Acceptance Criteria:**

- [ ] Every persistent action has explicit entity type mapping
- [ ] Unit test verifies all feature actions are categorized

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

**Objective:** Enable users to make informed conflict resolution decisions with field-level visibility.

**Duration Estimate:** 2 weeks

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

#### 5.4 Monitoring & Alerts

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

## 4. Critical Decisions Needed

### 4.1 Architecture Decisions

| Decision                | Options                                                         | Recommendation              | Status            |
| ----------------------- | --------------------------------------------------------------- | --------------------------- | ----------------- |
| Hybrid vs. Replace sync | A) Run oplog alongside legacy B) Replace legacy entirely        | A) Hybrid during rollout    | ❓ Needs approval |
| Conflict auto-merge     | A) Always manual B) Auto for non-overlapping C) User preference | B) Auto for non-overlapping | ❓ Needs approval |
| Compaction retention    | A) 7 days B) 14 days C) Configurable                            | A) 7 days (current)         | ✅ Decided        |
| Offline tolerance       | How long offline before snapshot-only sync?                     | 7 days (matches compaction) | ❓ Needs approval |

### 4.2 UX Decisions

| Decision               | Options                                                        | Recommendation            | Status            |
| ---------------------- | -------------------------------------------------------------- | ------------------------- | ----------------- |
| Conflict notification  | A) Modal dialog B) Non-blocking notification C) Both           | A) Modal (current)        | ❓ Needs approval |
| Field-level resolution | A) Always available B) Advanced mode toggle C) Not implemented | B) Advanced mode toggle   | ❓ Needs approval |
| Conflict defer         | Can user dismiss conflict dialog and resolve later?            | Yes, with badge indicator | ❓ Needs approval |

### 4.3 Technical Decisions

| Decision             | Options                                                                | Recommendation                                           | Status     |
| -------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| Manifest locking     | A) Optimistic (current) B) Pessimistic (file lock) C) CRDT-style merge | A) Optimistic is sufficient                              | ✅ Decided |
| Op file chunking     | A) 100 ops/file (current) B) Time-based C) Size-based                  | A) 100 ops/file                                          | ✅ Decided |
| Vector clock pruning | A) Never B) After 30 days C) After device removal                      | B) After 30 days (implemented in `limitVectorClockSize`) | ✅ Decided |

---

## 5. Validation Checklist

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

| Risk                                                  | Likelihood | Impact   | Mitigation                                            |
| ----------------------------------------------------- | ---------- | -------- | ----------------------------------------------------- |
| Compaction deletes ops still needed by offline device | Medium     | High     | Longer retention window; snapshot contains full state |
| Concurrent manifest updates cause data loss           | Low        | High     | Atomic upload; manifest is append-only list           |
| Replay fires side effects                             | High       | Medium   | Phase 1 replay guard implementation                   |
| Large op log slows startup                            | Medium     | Medium   | Compaction; snapshot hydration                        |
| Field-level merge produces invalid state              | Low        | High     | Typia validation after merge; manual override option  |
| User confusion with conflict UI                       | Medium     | Medium   | Clear UX; auto-merge for simple cases                 |
| Migration breaks existing data                        | Low        | Critical | Backup before migration; rollback path                |

---

## 7. File Reference

### Core Implementation

```
src/app/core/persistence/operation-log/
- action-whitelist.ts              # Action → Entity mapping
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
