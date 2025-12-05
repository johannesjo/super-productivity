## Recently Identified Issues 🧐

### Evaluate Immediate Sync Trigger Discrepancy (December 2025)

**Priority:** HIGH
**Complexity:** MEDIUM
**Status:** Needs evaluation

**Finding:** There is a discrepancy between the stated memory regarding the implementation of an "immediate sync trigger after first configuration" and the current code.

- **Memory states:** The feature was implemented by adding `this.pf.sync()` to `PfapiService._commonAndLegacySyncConfig$` subscription.
- **Current Code (`src/app/pfapi/pfapi.service.ts`):** This call is explicitly commented out with a note: `// NOTE: Don't trigger sync here - SyncEffects.triggerSync$ handles initial sync`.
- **Further Investigation (`src/app/imex/sync/sync.effects.ts`):** The `SyncEffects.triggerSync$` also has a relevant section (`this._wasJustEnabled$`) for triggering sync after enabling that is commented out.

**Impact:** The intended "immediate sync" after enabling synchronization might not be functioning as expected. Sync might only occur after an app reload/restart.

**Action:**

1.  Confirm if "immediate sync after enabling" is a desired feature.
2.  If yes, evaluate the existing `SyncEffects.triggerSync$` logic and determine the correct mechanism to enable this without causing duplicate sync calls or race conditions.
3.  Consider whether the `pf.sync()` call in `PfapiService` should be re-enabled, or if `SyncEffects` should be modified to handle the "was just enabled" state.

---

## Recently Completed ✅

### Server Sync (SuperSync) Complete (December 2025)

**Implementation:** Full sync infrastructure now operational

- ✅ `OperationLogSyncService` orchestration with fresh client safety checks
- ✅ `OperationLogUploadService` with API-based sync + file-based fallback
- ✅ `OperationLogDownloadService` with pagination and bounded memory (50k ops max)
- ✅ `ConflictResolutionService` with user dialog and batch application
- ✅ `VectorClockService` for global/entity frontier tracking
- ✅ `DependencyResolverService` for hard/soft dependency extraction
- ✅ Rejected operations tracking and user notification
- ✅ Integration tests: `sync-scenarios.integration.spec.ts` (protocol-level)
- ✅ E2E test infrastructure: `supersync.spec.ts` (Playwright)

### Server Security & Reliability (December 2025)

**Implementation:** Comprehensive security hardening and reliability improvements

- ✅ Structured audit logging for security events
- ✅ Structured error codes for upload results (`SYNC_ERROR_CODES`)
- ✅ Gap detection in download operations
- ✅ Request ID deduplication for idempotent uploads
- ✅ Transaction isolation for download operations
- ✅ Entity type allowlist to prevent injection
- ✅ Input validation for operation ID, entity ID, and schema version
- ✅ Server-side conflict detection
- ✅ Vector clock sanitization
- ✅ Rate limiting and size validation for plugin data
- ✅ JWT secret minimum length validation (32 chars)
- ✅ Batch cleanup queries (replaced N+1 pattern)
- ✅ Database index on `(user_id, received_at)` for cleanup queries
- ✅ `MAX_OPS_FOR_SNAPSHOT = 100k` to prevent memory exhaustion

### Subtask Move Operations (December 2025)

**Implementation:** `task.service.ts`, `task.reducer.ts`

- ✅ `moveSubTask` migrated to anchor-based positioning (`afterTaskId`)
- ✅ Consistent with parent task move operations

### Tag Sanitization on Task Delete (December 2025)

**Implementation:** `tag-shared.reducer.ts`

- ✅ Remove subtask IDs from tags when parent task is deleted
- ✅ Sanitize Tag updates to filter non-existent taskIds
- ✅ Prevents referential integrity errors during sync

### Anchor-Based Move Operations (December 2025)

**Implementation:** `work-context-meta.helper.ts`, `project.reducer.ts`, `tag.reducer.ts`, `task-list.component.ts`, `task.service.ts`

- ✅ All task drag-drop moves now use anchor-based positioning (`afterTaskId`)
- ✅ Helper functions `moveItemAfterAnchor` and `getAnchorFromDragDrop` for consistent behavior
- ✅ Special handling for DONE section (append to end when `afterTaskId === null && target === 'DONE'`)
- ✅ Graceful fallback when anchor task deleted concurrently (append to end)
- ✅ Comprehensive test coverage (36 tests across project and tag reducers)

### Quota Handling (December 2025)

**Implementation:** `operation-log.effects.ts`

- ✅ Emergency compaction on `QuotaExceededError` with 1-day retention (vs 7-day normal)
- ✅ Cross-browser error detection (Chrome, Firefox `NS_ERROR_DOM_QUOTA_REACHED`, Safari code 22)
- ✅ Circuit breaker (`isHandlingQuotaExceeded`) prevents infinite retry loops
- ✅ User notification via snackbar on permanent failure
- ✅ App reload triggered to restore consistent state from persisted data

---

## 1. Tombstone System (Rule 3.5) - DEFERRED

**Priority:** MEDIUM (was HIGH)
**Complexity:** HIGH
**Status:** Evaluated December 2025 - Not currently required

### Evaluation Summary

After comprehensive analysis, tombstones are **not currently needed**. The existing system provides sufficient safeguards:

1. **Event-sourced deletes:** Delete operations are immutable events in the log, not destructive
2. **Conflict detection works:** Vector clocks detect concurrent delete+update; user resolution UI presented
3. **Tag sanitization (Dec 2025):** Recently added fixes filter non-existent task IDs at reducer level
4. **Auto-repair handles orphans:** Invalid states are detected and repaired with REPAIR operations
5. **Archive data preserved:** `moveToArchive` is an UPDATE op, not DELETE - historical data kept

### Current Safeguards Against Delete Conflicts

| Mechanism        | Location                                | What It Does                                    |
| ---------------- | --------------------------------------- | ----------------------------------------------- |
| Vector clocks    | `conflict-resolution.service.ts`        | Detects concurrent ops, presents to user        |
| Delete heuristic | `operation-log-sync.service.ts:524-540` | Delete vs Update → prefers preserving data      |
| Tag sanitization | `tag-shared.reducer.ts`                 | Filters non-existent taskIds (9a6bc139a)        |
| Subtask cascade  | `task-shared-crud.reducer.ts`           | Includes subtasks in delete cleanup (bf3a386cf) |
| Auto-repair      | `validate-state.service.ts`             | Removes orphaned references, creates REPAIR op  |

### Why Not Implement Now

- No critical data loss scenarios identified in integration tests
- Recent tag sanitization fixes prove system can self-heal
- Cross-version sync (A.7.11) is the real blocker - tombstones don't solve that
- Schema changes for tombstone fields would affect all entity models

### When to Revisit

- **Cross-version sync needed:** When `CURRENT_SCHEMA_VERSION > 1` and clients may run different app versions
- **Undo/restore feature requested:** Tombstones enable recovery of deleted entities
- **Audit compliance required:** If explicit "entity deleted at time X" records needed
- **Performance issues:** If delete ops cause sync bottleneck on high-churn datasets

### Original Proposed Changes (For Future Reference)

If tombstones become necessary:

- Add `isDeleted`, `deletedAt` fields to Task, Project, Tag models
- Update delete reducers to mark as deleted instead of removing
- Add compaction service to clean old tombstones after retention window (suggested 30 days)
- Update selectors to filter out tombstoned entities
- Add recovery/undo functions

---

## 2. ~~Refactor Move Operations to Relative Positioning~~ ✅ COMPLETED

**Status:** COMPLETED (December 2025)
**Approach:** Anchor-based positioning (Option B)

### Implementation Summary

All task drag-drop move operations now use anchor-based positioning (`afterTaskId`) instead of full list replacement (`newOrderedIds`). This makes concurrent moves much more sync-friendly.

#### Completed Actions

**Keyboard/button-triggered moves** (use only `taskId`):

- ✅ `moveProjectTaskUpInBacklogList`
- ✅ `moveProjectTaskDownInBacklogList`
- ✅ `moveProjectTaskToTopInBacklogList`
- ✅ `moveProjectTaskToBottomInBacklogList`
- ✅ `moveProjectTaskToBacklogListAuto`
- ✅ `moveProjectTaskToRegularListAuto`

**Drag-drop moves** (now use anchor-based `afterTaskId`):

- ✅ `moveProjectTaskInBacklogList` - `{ taskId, afterTaskId, workContextId }`
- ✅ `moveProjectTaskToBacklogList` - `{ taskId, afterTaskId, workContextId }`
- ✅ `moveProjectTaskToRegularList` - `{ taskId, afterTaskId, workContextId, src, target }`
- ✅ `moveTaskInTodayList` - `{ taskId, afterTaskId, workContextId, workContextType, src, target }`

#### Helper Functions (`work-context-meta.helper.ts`)

- `moveItemAfterAnchor(itemId, afterItemId, currentList)` - Anchor-based list reordering
- `getAnchorFromDragDrop(itemId, newOrderedIds)` - Extracts anchor from drag-drop event

#### Edge Cases Handled

- **Move to start**: `afterTaskId === null` → prepend to list
- **Move to DONE section**: `afterTaskId === null && target === 'DONE'` → append to end
- **Deleted anchor**: If anchor not found, fallback to append at end
- **Works across contexts**: Both PROJECT and TAG contexts handle moves consistently

#### Tests Added

- 24 tests in `project.reducer.spec.ts` (anchor-based moves + DONE section handling)
- 12 tests in `tag.reducer.spec.ts` (anchor-based moves for tags)

### Remaining Actions (low priority - infrequent operations)

- `updateProjectOrder` - Project list reordering (rarely used)
- `updateTagOrder` - Tag list reordering (rarely used)

---

## 3. Slim Down `moveToArchive` Payload

**Priority:** MEDIUM → DEFERRED
**Complexity:** HIGH (requires architectural changes)

### Current State

```typescript
moveToArchive: (taskProps: { tasks: TaskWithSubTasks[] })
```

Sends full task objects (5-50 KB per operation).

### Analysis (December 2025)

After investigation, the full payload is **intentionally required**:

1. **Remote sync needs full data**: When a client receives `moveToArchive`, it must write the tasks to its local archive storage (archiveYoung). The originating client has already removed tasks from its active state.

2. **Sync timing mismatch**: Operations sync immediately, but archiveYoung syncs daily. If we only sent task IDs, receiving clients couldn't look up the task data.

3. **Offline-first design**: A client may receive operations after being offline. The full payload ensures archive data is available even without recent archiveYoung sync.

### Potential Future Optimization

To reduce payload size would require architectural changes:

- Sync archiveYoung before sending moveToArchive operations
- Or implement "archive data fetch on demand" for receiving clients
- Or use a reference-based system where archive data is fetched separately

### Decision

Keep current implementation. The full payload is a deliberate design choice for sync reliability. The 5-50 KB per archive operation is acceptable given archive operations are infrequent (typically once per day at end-of-day).

---

## 4. ~~Slim Down `deleteProject` Payload~~ ✅ COMPLETED

**Status:** COMPLETED (December 2025)

### Implementation

Changed from:

```typescript
deleteProject: (taskProps: { project: Project; allTaskIds: string[] })
```

To:

```typescript
deleteProject: (taskProps: { projectId: string; noteIds: string[]; allTaskIds: string[] })
```

- Reduced payload from full `Project` object (5-20 KB) to just IDs
- `noteIds` is required by note.reducer.ts to delete associated notes
- Updated all reducers, effects, and tests

---

## Implementation Order Recommendation

1. ~~**Tombstones**~~ - DEFERRED: current safeguards sufficient (see Item 1 evaluation above)
2. ~~**Move operations**~~ ✅ - Completed December 2025 (anchor-based positioning)
3. ~~**moveToArchive**~~ - Deferred: full payload required for sync reliability
4. ~~**deleteProject**~~ ✅ - Completed December 2025
5. ~~**Server Sync**~~ ✅ - Completed December 2025 (single-version sync)
6. **Cross-Schema Sync (A.7.11)** - HIGH priority when `CURRENT_SCHEMA_VERSION > 1`

> **Note:** All major sync infrastructure is complete. The remaining HIGH priority item is A.7.11 (conflict-aware operation migration) which becomes critical when schema migrations are needed. Tombstones were evaluated and deferred - the event-sourced architecture plus recent tag sanitization fixes provide sufficient delete conflict handling.

---

## Current System Status

| Component              | Status             | Notes                                                                |
| ---------------------- | ------------------ | -------------------------------------------------------------------- |
| **Local Persistence**  | ✅ Complete        | Event sourcing, crash recovery, fast hydration                       |
| **Legacy Sync Bridge** | ✅ Complete        | PFAPI integration, vector clock updates                              |
| **Server Sync (API)**  | ✅ Complete        | Single-schema-version, upload/download working                       |
| **Conflict Detection** | ✅ Complete        | Vector clock-based, user resolution UI                               |
| **Validation**         | ✅ Complete        | Typia + cross-model, 4 checkpoints                                   |
| **Auto-Repair**        | ✅ Complete        | 6 fix categories, creates REPAIR operations                          |
| **Compaction**         | ✅ Complete        | Snapshot-based, retention windows, emergency mode                    |
| **Delete Handling**    | ✅ Complete        | Tag sanitization, cascading deletes, conflict heuristics             |
| **Server Security**    | ✅ Complete        | Audit logging, error codes, deduplication, validation, rate limiting |
| **Cross-Schema Sync**  | ⚠️ Not Implemented | A.7.11 required before CURRENT_SCHEMA_VERSION > 1                    |
| **Tombstone System**   | ⏸️ Deferred        | Not currently needed; revisit for undo/restore or audit needs        |
| **Plugin Data Sync**   | ✅ Complete        | Operation logging for plugin user data and metadata                  |
| **Move Operations**    | ✅ Complete        | Anchor-based positioning for tasks and subtasks                      |

---

## Related Documentation

- [operation-rules.md](./operation-rules.md) - Design rules reference
- [code-audit.md](./code-audit.md) - Full audit findings
- [operation-log-architecture.md](./operation-log-architecture.md) - Full system design
