# Operation Log Sync: Execution Plan

**Created:** December 2, 2025
**Branch:** `feat/operation-logs`
**Status:** Implementation in Progress (~70% complete)
**Last Updated:** December 2, 2025

---

## 1. Executive Summary

The Operation Log system is **always enabled** with a simplified architecture:

- **SUP_OPS** = Single persistence source of truth
- **NgRx** = Single runtime source of truth
- **PFAPI** = Sync protocol only (reads from NgRx via delegate)
- **No feature flags** = One implementation that always works

### 1.1 What's Done ✅

| Component                   | Status | Notes                            |
| --------------------------- | ------ | -------------------------------- |
| SUP_OPS IndexedDB store     | ✅     | ops + state_cache tables         |
| NgRx effect capture         | ✅     | Converts actions to operations   |
| Vector clock tracking       | ✅     | Per-operation causality          |
| Snapshot + tail hydration   | ✅     | Fast startup from state_cache    |
| Genesis migration           | ✅     | Legacy pf → SUP_OPS on first run |
| Multi-tab coordination      | ✅     | BroadcastChannel + Web Locks     |
| `PfapiStoreDelegateService` | ✅     | Reads NgRx state for sync        |

### 1.2 Critical Gaps 🔴

| Gap                                 | Issue                                      | Impact                   |
| ----------------------------------- | ------------------------------------------ | ------------------------ |
| META_MODEL vector clock not updated | Legacy sync doesn't detect local changes   | Sync uploads nothing     |
| Sync download not persisted         | Downloaded data only in memory             | Crash = data loss        |
| Non-NgRx models not migrated        | reminders, archives, plugins bypass op-log | Inconsistent persistence |
| SaveToDbEffects still active        | Unnecessary writes to `pf` database        | Wasted I/O, confusion    |
| Compaction never triggers           | Op log grows unbounded                     | Slow startup             |

---

## 2. Implementation Tasks (Priority Order)

### 2.1 🔴 Update META_MODEL Vector Clock on Op Write

**Priority:** CRITICAL
**Effort:** Small

**Problem:** Legacy sync compares local vs remote vector clocks to detect changes. If we don't increment the local vector clock when ops are written, sync won't detect local changes and won't upload anything.

**Files to modify:**

- `src/app/core/persistence/operation-log/operation-log.effects.ts`

**Implementation:**

```typescript
// In OperationLogEffects, after writing op to SUP_OPS:

private async writeOperation(op: Operation): Promise<void> {
  // 1. Write to SUP_OPS
  await this.opLogStore.appendOperation(op);

  // 2. Increment META_MODEL vector clock so sync detects local changes
  await this.pfapiService.pf.metaModel.incrementVectorClock(this.clientId);

  // 3. Broadcast to other tabs
  this.multiTabCoordinator.broadcastOperation(op);
}
```

**Acceptance criteria:**

- [ ] After creating a task, META_MODEL vector clock is incremented
- [ ] Legacy sync (WebDAV/Dropbox) correctly detects local changes via vector clock comparison
- [ ] Sync uploads the new task

---

### 2.2 🔴 Persist Sync Downloads to SUP_OPS

**Priority:** CRITICAL
**Effort:** Medium

**Problem:** When sync downloads remote data and dispatches `loadAllData`, the data goes to NgRx but NOT to SUP_OPS. If the app crashes, downloaded data is lost.

**Files to modify:**

- `src/app/root-store/meta/load-all-data.action.ts`
- `src/app/core/persistence/operation-log/operation-log.effects.ts`

**Implementation:**

**Step 1:** Add metadata to `loadAllData` action:

```typescript
// load-all-data.action.ts
export interface LoadAllDataMeta {
  isHydration?: boolean; // From SUP_OPS on startup
  isRemoteSync?: boolean; // From sync download
  isBackupImport?: boolean; // From file import
}

export const loadAllData = createAction(
  '[Meta] Load All Data',
  props<{ appDataComplete: AppDataComplete; meta?: LoadAllDataMeta }>(),
);
```

**Step 2:** Handle in effects:

```typescript
// operation-log.effects.ts
handleLoadAllData$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(loadAllData),
      filter((action) => action.meta?.isRemoteSync || action.meta?.isBackupImport),
      tap(async (action) => {
        // Create SYNC_IMPORT operation
        const op: Operation = {
          id: uuidv7(),
          actionType: loadAllData.type,
          opType: 'SYNC_IMPORT',
          entityType: 'ALL',
          payload: action.appDataComplete,
          // ... other fields
        };
        await this.opLogStore.appendOperation(op);

        // Force snapshot for safety
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

**Acceptance criteria:**

- [ ] Sync download creates `SYNC_IMPORT` op in SUP_OPS
- [ ] Snapshot is created after sync download
- [ ] App restart after sync shows downloaded data

---

### 2.3 🔴 Disable SaveToDbEffects

**Priority:** HIGH
**Effort:** Small

**Problem:** SaveToDbEffects is still writing model data to `pf` database. This is:

- Wasted I/O (data is in SUP_OPS)
- Confusing (two sources of truth)
- The effects have conditional feature flag checks that need removal

**Files to modify:**

- `src/app/root-store/shared/save-to-db.effects.ts`
- `src/app/root-store/root-store.module.ts`

**Option A: Remove from module (cleanest)**

```typescript
// root-store.module.ts
EffectsModule.forRoot([
  // SaveToDbEffects,  // REMOVED - persistence is via OperationLogEffects
  // ... other effects
]);
```

**Option B: Comment out effects (preserves code for reference)**

```typescript
// save-to-db.effects.ts
@Injectable()
export class SaveToDbEffects {
  // ALL EFFECTS DISABLED - Persistence is via OperationLogEffects
  // Keeping code for reference during transition
  // tag$ = this._createSaveEffect(...);  // DISABLED
  // project$ = this._createSaveEffect(...);  // DISABLED
  // ... etc
}
```

**Acceptance criteria:**

- [ ] No writes to `pf` database model tables (task, project, tag, etc.)
- [ ] App persists data correctly via SUP_OPS
- [ ] Restart shows persisted data

---

### 2.4 🔴 Wire Delegate Always-On

**Priority:** HIGH
**Effort:** Small

**Problem:** `PfapiService` has conditional logic based on `useOperationLogSync` flag. We need to always use the delegate.

**Files to modify:**

- `src/app/pfapi/pfapi.service.ts`

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
  // ... existing code ...

  // Always use NgRx delegate for sync data - no feature flag
  this.pf.setGetAllSyncModelDataFromStoreDelegate(() =>
    this._storeDelegateService.getAllSyncModelDataFromStore()
  );
}
```

**Also remove:**

- The subscription watching `useOperationLogSync`
- The flush-to-legacy-db logic (no longer needed)

**Acceptance criteria:**

- [ ] No conditional logic based on feature flag
- [ ] `getAllSyncModelData()` always reads from NgRx
- [ ] Legacy sync works correctly

---

### 2.5 Add Compaction Triggers

**Priority:** HIGH
**Effort:** Small

**Files to modify:**

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

**Also ensure compaction reads from NgRx:**

```typescript
// operation-log-compaction.service.ts
async compact(): Promise<void> {
  // Read from NgRx, NOT from stale pf database
  const currentState = await this._storeDelegateService.getAllSyncModelDataFromStore();
  await this.opLogStore.saveStateCache({
    state: currentState,
    lastAppliedOpSeq: await this.opLogStore.getLastSeq(),
    savedAt: Date.now()
  });
  // ... delete old ops
}
```

**Acceptance criteria:**

- [ ] Compaction runs after 500 ops
- [ ] Snapshot contains current NgRx state
- [ ] Old synced ops are deleted

---

### 2.6 🔴 Migrate Non-NgRx Models to Operation Log

**Priority:** BLOCKER
**Effort:** Large

**Problem:** Some sync models bypass NgRx and write directly to `pf` database via `ModelCtrl.save()`. ALL sync models must go through NgRx → OperationLogEffects → SUP_OPS. No hybrid persistence modes allowed.

**Models to migrate:**

| Model            | Current Owner     | Notes                           |
| ---------------- | ----------------- | ------------------------------- |
| `reminders`      | ReminderService   | High priority - frequently used |
| `archiveYoung`   | TaskService       | Archive operations              |
| `archiveOld`     | TaskService       | Archive operations              |
| `pluginUserData` | PluginService     | Plugin system                   |
| `pluginMetadata` | PluginService     | Plugin system                   |
| `improvement`    | EvaluationService | Evaluation feature              |
| `obstruction`    | EvaluationService | Evaluation feature              |

**Migration steps per model:**

1. **Create NgRx feature state** (reducer, actions, selectors):

   ```typescript
   // reminders.reducer.ts
   export interface RemindersState {
     reminders: Reminder[];
   }
   ```

2. **Create actions:**

   ```typescript
   // reminders.actions.ts
   export const addReminder = createAction(
     '[Reminders] Add',
     props<{ reminder: Reminder }>(),
   );
   export const updateReminder = createAction(
     '[Reminders] Update',
     props<{ reminder: Reminder }>(),
   );
   export const deleteReminder = createAction(
     '[Reminders] Delete',
     props<{ id: string }>(),
   );
   ```

3. **Update services to dispatch instead of direct save:**

   ```typescript
   // BEFORE
   this.pfapiService.m.reminders.save(newReminders);

   // AFTER
   this.store.dispatch(addReminder({ reminder }));
   ```

4. **Add selector to PfapiStoreDelegateService:**

   ```typescript
   this._store.select(selectRemindersState),
   ```

5. **Update genesis migration** to load ALL models from `pf` database into initial snapshot

**Genesis migration must include all models:**

```typescript
// Genesis loads ALL sync models from legacy pf database
const allModels = await Promise.all([
  this.pfapiService.m.task.load(),
  this.pfapiService.m.project.load(),
  // ... existing NgRx models ...
  this.pfapiService.m.reminders.load(), // NEW
  this.pfapiService.m.archiveYoung.load(), // NEW
  this.pfapiService.m.archiveOld.load(), // NEW
  // ... etc
]);
```

**Acceptance criteria:**

- [ ] All 7 models have NgRx state, actions, selectors
- [ ] All services dispatch actions instead of `ModelCtrl.save()`
- [ ] `PfapiStoreDelegateService` reads ALL models from NgRx (no `pf` fallback)
- [ ] Genesis migration includes ALL models in snapshot
- [ ] No dual persistence paths

---

### 2.7 Audit Action Blacklist

**Priority:** MEDIUM
**Effort:** Medium

**File to modify:**

- `src/app/core/persistence/operation-log/action-whitelist.ts` (rename to `action-blacklist.ts`)

**Process:**

1. List all action files: `find src/app/features -name "*.actions.ts"`
2. Identify UI-only actions (contain `Ui`, `UI`, `Selected`, `Current`, `Toggle`, `Show`, `Hide`)
3. Add to blacklist

**Likely missing:**

- `[Worklog]` UI state actions
- `[Pomodoro]` transient session state
- Focus session transient state
- Selection states across features

**Acceptance criteria:**

- [ ] All feature modules audited
- [ ] UI actions don't spam the op log
- [ ] Op log contains only persistent state changes

---

### 2.7 Add Basic Disaster Recovery

**Priority:** MEDIUM
**Effort:** Medium

**Files to modify:**

- `src/app/core/persistence/operation-log/operation-log-hydrator.service.ts`

**Implementation:**

```typescript
async hydrateStore(): Promise<void> {
  try {
    const snapshot = await this.opLogStore.loadStateCache();

    if (!snapshot || !this.isValidSnapshot(snapshot)) {
      await this.attemptRecovery();
      return;
    }

    // Normal hydration path...
  } catch (e) {
    PFLog.error('Hydration failed, attempting recovery', e);
    await this.attemptRecovery();
  }
}

private async attemptRecovery(): Promise<void> {
  PFLog.warn('Attempting recovery from legacy database');

  // Try legacy pf database
  try {
    const legacyData = await this.pfapi.pf.getAllSyncModelData();
    if (this.hasValidData(legacyData)) {
      await this.runGenesisMigration(legacyData);
      return;
    }
  } catch (e) {
    PFLog.error('Legacy recovery failed', e);
  }

  // Show error to user
  // They'll need to restore from backup or sync
}
```

**Acceptance criteria:**

- [ ] Corrupted SUP_OPS triggers recovery
- [ ] Recovery attempts genesis migration from pf
- [ ] User sees clear error if all recovery fails

---

## 3. Testing Checklist

### 3.1 Basic Persistence

- [ ] Create task → Reload app → Task exists
- [ ] Check SUP_OPS has the operation
- [ ] Check `pf` database task table is empty/stale

### 3.2 Legacy Sync

- [ ] Create task → Sync → Check META_MODEL vector clock incremented
- [ ] WebDAV sync detects local changes and uploads the task
- [ ] Dropbox sync detects local changes and uploads the task
- [ ] LocalFile sync detects local changes and uploads the task

### 3.3 Sync Download

- [ ] Sync downloads remote data
- [ ] Check SUP_OPS has SYNC_IMPORT op
- [ ] Check state_cache has snapshot
- [ ] App restart shows downloaded data

### 3.4 Multi-Tab

- [ ] Create task in Tab A → Appears in Tab B
- [ ] Both tabs have same SUP_OPS state

---

## 4. Risk Register

| Risk                               | Likelihood | Impact | Mitigation                     |
| ---------------------------------- | ---------- | ------ | ------------------------------ |
| Vector clock increment breaks sync | Low        | High   | Test legacy sync thoroughly    |
| Sync download persistence too slow | Low        | Medium | Async snapshot, don't block UI |
| Compaction deletes needed ops      | Low        | High   | Never delete unsynced ops      |
| Genesis recovery fails             | Low        | High   | Fallback to user notification  |

---

## 5. File Reference

### Core Implementation

```
src/app/core/persistence/operation-log/
├── operation.types.ts
├── operation-log-store.service.ts
├── operation-log.effects.ts           ← Main changes here
├── operation-log-hydrator.service.ts  ← Recovery logic
├── operation-log-compaction.service.ts
├── operation-applier.service.ts
├── operation-converter.util.ts
├── dependency-resolver.service.ts
├── action-whitelist.ts                ← Rename & audit
├── lock.service.ts
└── multi-tab-coordinator.service.ts
```

### PFAPI Integration

```
src/app/pfapi/
├── pfapi-store-delegate.service.ts    ← Already done
└── pfapi.service.ts                   ← Remove feature flag conditionals
```

### To Disable

```
src/app/root-store/shared/
└── save-to-db.effects.ts              ← Disable entirely
```

---

## 6. References

- [Architecture](./operation-log-architecture.md) - System design
