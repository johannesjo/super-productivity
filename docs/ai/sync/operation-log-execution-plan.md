# Operation Log: Execution Plan

**Created:** December 2, 2025
**Branch:** `feat/operation-logs`
**Status:** Implementation in Progress (~70% complete)
**Last Updated:** December 2, 2025

---

## Overview

This execution plan is organized around the three parts of the [Operation Log Architecture](./operation-log-architecture.md):

| Part                      | Purpose                        | Status      |
| ------------------------- | ------------------------------ | ----------- |
| **A. Local Persistence**  | Fast writes, crash recovery    | ~80% done   |
| **B. Legacy Sync Bridge** | Vector clock updates for PFAPI | ~50% done   |
| **C. Server Sync**        | Op-log based sync (future)     | Not started |

---

## What's Done ✅

| Component                   | Part | Notes                            |
| --------------------------- | ---- | -------------------------------- |
| SUP_OPS IndexedDB store     | A    | ops + state_cache tables         |
| NgRx effect capture         | A    | Converts actions to operations   |
| Per-op vector clock         | A    | Causality tracking               |
| Snapshot + tail hydration   | A    | Fast startup from state_cache    |
| Genesis migration           | A    | Legacy pf → SUP_OPS on first run |
| Multi-tab coordination      | A    | BroadcastChannel + Web Locks     |
| `PfapiStoreDelegateService` | B    | Reads NgRx state for sync        |

---

## Critical Gaps 🔴

| Gap                                 | Part | Issue                                    | Impact                   |
| ----------------------------------- | ---- | ---------------------------------------- | ------------------------ |
| META_MODEL vector clock not updated | B    | Legacy sync doesn't detect local changes | Sync uploads nothing     |
| Sync download not persisted         | B    | Downloaded data only in memory           | Crash = data loss        |
| Non-NgRx models not migrated        | B    | reminders, archives bypass op-log        | Inconsistent persistence |
| SaveToDbEffects still active        | A    | Unnecessary writes to `pf`               | Wasted I/O               |
| Compaction never triggers           | A    | Op log grows unbounded                   | Slow startup             |

---

# ⚠️ Implementation Order (CRITICAL)

Tasks have dependencies. **Follow this order exactly:**

```
Phase 1: Foundation (can be parallelized)
├── B.1 Update META_MODEL Vector Clock
├── B.2 Persist Sync Downloads
├── B.3 Wire Delegate Always-On
├── A.2 Add Compaction Triggers (⚠️ depends on B.4 for full correctness)
├── A.3 Audit Action Blacklist
└── A.5 Add Schema Migration Service

Phase 2: Non-NgRx Migration (BLOCKER for Phase 3)
└── B.4 Migrate Non-NgRx Models ← Must complete before A.1

Phase 3: Cutover (only after B.4 is complete)
├── A.1 Disable SaveToDbEffects ← Depends on B.4
└── A.4 Update Disaster Recovery ← Update recovery paths
```

**Why B.4 must complete before A.1:**

- If SaveToDbEffects is disabled before non-NgRx models are migrated to NgRx
- Non-NgRx models (reminders, archives) will have NO persistence path
- Data loss will occur

---

# Part A Tasks: Local Persistence

## A.1 Disable SaveToDbEffects

> ⚠️ **DEPENDENCY:** This task can ONLY be done after B.4 (Migrate Non-NgRx Models) is complete!

**Priority:** HIGH | **Effort:** Small

**Problem:** SaveToDbEffects is still writing model data to `pf` database. This is wasted I/O since data is in SUP_OPS.

**Files:**

- `src/app/root-store/shared/save-to-db.effects.ts`
- `src/app/root-store/root-store.module.ts`

**Implementation:**

```typescript
// Option A: Remove from module (cleanest)
// root-store.module.ts
EffectsModule.forRoot([
  // SaveToDbEffects,  // REMOVED - persistence via OperationLogEffects
  // ... other effects
]);

// Option B: Comment out effects (preserves code for reference)
```

**Acceptance:**

- [ ] No writes to `pf` database model tables
- [ ] App persists data correctly via SUP_OPS
- [ ] Restart shows persisted data

---

## A.2 Add Compaction Triggers

**Priority:** HIGH | **Effort:** Small

> ⚠️ **WARNING:** Until B.4 (Migrate Non-NgRx Models) is complete, compaction snapshots will include stale data for non-NgRx models (read from `pf` database). This is acceptable during transition - the snapshot is still crash-safe, just potentially out-of-date for those models.

**Problem:** Compaction logic exists but is never invoked. Op log grows unbounded.

**Files:**

- `src/app/core/persistence/operation-log/operation-log.effects.ts`
- `src/app/core/persistence/operation-log/operation-log-compaction.service.ts`

**Implementation:**

```typescript
// operation-log.effects.ts
private opsSinceCompaction = 0;
private readonly COMPACTION_THRESHOLD = 500;

private async writeOperation(op: Operation): Promise<void> {
  await this.opLogStore.appendOperation(op);
  await this.pfapiService.pf.metaModel.incrementVectorClock(this.clientId);
  this.multiTabCoordinator.broadcastOperation(op);

  // Check compaction trigger
  this.opsSinceCompaction++;
  if (this.opsSinceCompaction >= this.COMPACTION_THRESHOLD) {
    await this.compactionService.compact();
    this.opsSinceCompaction = 0;
  }
}
```

```typescript
// operation-log-compaction.service.ts
async compact(): Promise<void> {
  // Read from NgRx, NOT from stale pf database
  const currentState = await this._storeDelegateService.getAllSyncModelDataFromStore();
  await this.opLogStore.saveStateCache({
    state: currentState,
    lastAppliedOpSeq: await this.opLogStore.getLastSeq(),
    savedAt: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION
  });
  // Delete old ops (aggressive for local-only)
  await this.opLogStore.deleteOpsBefore(lastSeq - RETENTION_BUFFER);
}
```

**Acceptance:**

- [ ] Compaction runs after 500 ops
- [ ] Snapshot contains current NgRx state
- [ ] Old ops are deleted

---

## A.3 Audit Action Blacklist

**Priority:** MEDIUM | **Effort:** Medium

**Problem:** Only ~10 actions in blacklist. UI actions may be spamming the op log.

**File:** `src/app/core/persistence/operation-log/action-whitelist.ts` (rename to `action-blacklist.ts`)

**Process:**

1. `find src/app/features -name "*.actions.ts"`
2. Identify UI-only actions (`Ui`, `UI`, `Selected`, `Current`, `Toggle`, `Show`, `Hide`)
3. Add to blacklist

**Likely missing:**

- `[Worklog]` UI state actions
- `[Pomodoro]` transient session state
- Focus session transient state
- Selection states across features

**Acceptance:**

- [ ] All feature modules audited
- [ ] UI actions excluded from op log
- [ ] Op log contains only persistent changes

---

## A.4 Add Disaster Recovery

**Priority:** MEDIUM | **Effort:** Medium

**Problem:** No recovery path if SUP_OPS is corrupted.

**File:** `src/app/core/persistence/operation-log/operation-log-hydrator.service.ts`

> ⚠️ **NOTE:** Recovery paths change based on transition phase:
>
> - **During transition (before A.1):** `pf` database has recent data - can use genesis migration
> - **After transition (A.1 complete):** `pf` database becomes stale - must use remote sync or backup import

**Implementation:**

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
  // 1. Try legacy pf database (only useful during transition)
  const legacyData = await this.pfapi.getAllSyncModelData();
  if (legacyData && this.hasData(legacyData)) {
    console.warn('SUP_OPS corrupted - recovering from pf database (may be stale post-transition)');
    await this.runGenesisMigration(legacyData);
    return;
  }

  // 2. Try remote sync (preferred post-transition)
  if (this.syncService.isConfigured()) {
    console.warn('SUP_OPS corrupted - attempting recovery from remote sync');
    await this.syncService.forceDownload();
    return;
  }

  // 3. Show error to user with backup import option
  this.showRecoveryDialog();
}
```

**Acceptance:**

- [ ] Corrupted SUP_OPS triggers recovery
- [ ] Recovery attempts genesis migration from pf (with staleness warning)
- [ ] Recovery attempts remote sync if configured
- [ ] User sees clear error with backup import option if all recovery fails

---

## A.5 Add Schema Migration Service

**Priority:** MEDIUM | **Effort:** Medium

**Problem:** No infrastructure for schema migrations.

**Implementation:**

```typescript
// schema-migration.service.ts
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
    if (!migration) throw new Error(`No migration from v${schemaVersion}`);
    state = migration.migrate(state);
    schemaVersion = migration.toVersion;
  }
  return { ...snapshot, state, schemaVersion };
}
```

**Acceptance:**

- [ ] Migration service exists
- [ ] Hydrator calls migration before dispatching
- [ ] Schema version stored in snapshot

---

# Part B Tasks: Legacy Sync Bridge

## B.1 🔴 Update META_MODEL Vector Clock on Op Write

**Priority:** CRITICAL | **Effort:** Small

**Problem:** Legacy sync compares vector clocks to detect local changes. If we don't increment META_MODEL's vector clock when ops are written, sync won't detect changes.

**File:** `src/app/core/persistence/operation-log/operation-log.effects.ts`

**Implementation:**

```typescript
private async writeOperation(op: Operation): Promise<void> {
  // 1. Write to SUP_OPS (Part A)
  await this.opLogStore.appendOperation(op);

  // 2. Bridge to PFAPI (Part B) - CRITICAL
  await this.pfapiService.pf.metaModel.incrementVectorClock(this.clientId);

  // 3. Broadcast to other tabs (Part A)
  this.multiTabCoordinator.broadcastOperation(op);
}
```

**Acceptance:**

- [ ] After creating a task, META_MODEL vector clock is incremented
- [ ] Legacy sync detects local changes via vector clock comparison
- [ ] Sync uploads the new task

---

## B.2 🔴 Persist Sync Downloads to SUP_OPS

**Priority:** CRITICAL | **Effort:** Medium

**Problem:** When sync downloads remote data, it dispatches `loadAllData`. Data goes to NgRx but NOT to SUP_OPS. Crash = data loss.

**Files:**

- `src/app/root-store/meta/load-all-data.action.ts`
- `src/app/core/persistence/operation-log/operation-log.effects.ts`

**Step 1:** Add metadata to action:

```typescript
// load-all-data.action.ts
export interface LoadAllDataMeta {
  isHydration?: boolean; // From SUP_OPS startup - skip logging
  isRemoteSync?: boolean; // From sync download - create import op
  isBackupImport?: boolean; // From file import - create import op
}

export const loadAllData = createAction(
  '[Meta] Load All Data',
  props<{ appDataComplete: AppDataComplete; meta?: LoadAllDataMeta }>(),
);
```

**Step 2:** Handle in effects:

```typescript
// operation-log.effects.ts
// ⚠️ IMPORTANT: Use switchMap, NOT tap(async) - tap doesn't await async callbacks!
handleLoadAllData$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(loadAllData),
      filter((action) => action.meta?.isRemoteSync || action.meta?.isBackupImport),
      switchMap(async (action) => {
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

**Step 3:** Update sync download to pass metadata:

```typescript
// In PFAPI sync download handler
this.store.dispatch(
  loadAllData({
    appDataComplete: remoteData,
    meta: { isRemoteSync: true },
  }),
);
```

**Acceptance:**

- [ ] Sync download creates `SYNC_IMPORT` op in SUP_OPS
- [ ] Snapshot is created after sync download
- [ ] App restart after sync shows downloaded data

---

## B.3 🔴 Wire Delegate Always-On

**Priority:** HIGH | **Effort:** Small

**Problem:** `PfapiService` has conditional logic based on `useOperationLogSync` flag. Should always use delegate.

**File:** `src/app/pfapi/pfapi.service.ts`

**Current (conditional):**

```typescript
this._commonAndLegacySyncConfig$
  .pipe(map(cfg => !!cfg?.useOperationLogSync), ...)
  .subscribe(([wasOpLog, useOpLog]) => {
    if (useOpLog) {
      this.pf.setGetAllSyncModelDataFromStoreDelegate(...);
    } else {
      this.pf.setGetAllSyncModelDataFromStoreDelegate(null);
    }
  });
```

**Required (always on):**

```typescript
constructor() {
  // Always use NgRx delegate for sync data - no feature flag
  this.pf.setGetAllSyncModelDataFromStoreDelegate(() =>
    this._storeDelegateService.getAllSyncModelDataFromStore()
  );
}
```

**Also remove:**

- The subscription watching `useOperationLogSync`
- The flush-to-legacy-db logic

**Acceptance:**

- [ ] No conditional logic based on feature flag
- [ ] `getAllSyncModelData()` always reads from NgRx
- [ ] Legacy sync works correctly

---

## B.4 🔴 Migrate Non-NgRx Models

**Priority:** BLOCKER | **Effort:** Large

**Problem:** Some sync models bypass NgRx and write directly to `pf` database. ALL sync models must go through NgRx → OperationLogEffects → SUP_OPS.

**Models to migrate:**

| Model            | Current Owner     | Priority |
| ---------------- | ----------------- | -------- |
| `reminders`      | ReminderService   | High     |
| `archiveYoung`   | TaskService       | High     |
| `archiveOld`     | TaskService       | High     |
| `pluginUserData` | PluginService     | Medium   |
| `pluginMetadata` | PluginService     | Medium   |
| `improvement`    | EvaluationService | Low      |
| `obstruction`    | EvaluationService | Low      |

**Migration steps per model:**

1. Create NgRx feature state (reducer, actions, selectors)
2. Update services to dispatch actions instead of `ModelCtrl.save()`
3. Add selector to `PfapiStoreDelegateService`
4. Update genesis migration to include model

**Acceptance:**

- [ ] All 7 models have NgRx state
- [ ] All services dispatch actions
- [ ] `PfapiStoreDelegateService` reads ALL models from NgRx
- [ ] No dual persistence paths

---

# Part C Tasks: Server Sync (Future)

These tasks are NOT needed for legacy sync. They will be implemented when server sync is built.

## C.1 Per-Op Sync Tracking

Add `syncedAt` field usage for tracking which ops have been uploaded to server.

## C.2 Sync-Aware Compaction

Modify compaction to never delete unsynced ops when server sync is enabled.

## C.3 Operation Upload/Download

Implement server API integration for uploading pending ops and downloading remote ops.

## C.4 Entity-Level Conflict Detection

Implement conflict detection using per-op vector clocks.

---

# Testing Checklist

## Part A: Local Persistence

- [ ] Create task → Reload app → Task exists
- [ ] Check SUP_OPS has the operation
- [ ] Check `pf` database task table is empty/stale
- [ ] Create 600 ops → Check compaction ran
- [ ] Corrupt SUP_OPS → App recovers from pf

## Part B: Legacy Sync

- [ ] Create task → Check META_MODEL vector clock incremented
- [ ] WebDAV sync detects and uploads the task
- [ ] Dropbox sync detects and uploads the task
- [ ] LocalFile sync detects and uploads the task
- [ ] Sync downloads remote data → Restart → Data persists

## Multi-Tab

- [ ] Create task in Tab A → Appears in Tab B
- [ ] Both tabs have same SUP_OPS state

---

# Risk Register

| Risk                               | Part | Likelihood | Impact | Mitigation                  |
| ---------------------------------- | ---- | ---------- | ------ | --------------------------- |
| Vector clock increment breaks sync | B    | Low        | High   | Test legacy sync thoroughly |
| Sync download persistence too slow | B    | Low        | Medium | Async snapshot              |
| Compaction deletes needed ops      | A    | Low        | Medium | Keep retention buffer       |
| Genesis recovery fails             | A    | Low        | High   | User notification           |
| Non-NgRx migration breaks features | B    | Medium     | High   | Incremental migration       |

---

# File Reference

```
src/app/core/persistence/operation-log/
├── operation.types.ts               # Type definitions
├── operation-log-store.service.ts   # SUP_OPS IndexedDB
├── operation-log.effects.ts         # Action capture + META_MODEL bridge
├── operation-log-hydrator.service.ts# Startup hydration + recovery
├── operation-log-compaction.service.ts
├── operation-applier.service.ts
├── operation-converter.util.ts
├── action-blacklist.ts              # UI action filtering
├── lock.service.ts
└── multi-tab-coordinator.service.ts

src/app/pfapi/
├── pfapi-store-delegate.service.ts  # Reads NgRx for sync
└── pfapi.service.ts                 # Remove feature flag conditionals

src/app/root-store/shared/
└── save-to-db.effects.ts            # Disable entirely
```

---

# References

- [Architecture](./operation-log-architecture.md) - System design (Part A/B/C)
- [PFAPI Architecture](./pfapi-sync-persistence-architecture.md) - Legacy sync system
