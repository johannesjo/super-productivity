# Operation Log Code Audit

**Date:** December 4, 2025
**Last Updated:** December 5, 2025
**Status:** Most issues resolved
**Scope:** Check codebase compliance with `operation-rules.md`.

## Summary

The codebase largely adheres to the new Operation Log rules, particularly regarding architecture (Append-Only, Single Source of Truth) and safety (Validation, Robust Replay).

**Key improvements since initial audit (December 2025):**

- ✅ Move operations now use anchor-based positioning (`afterTaskId`) instead of full list replacement
- ✅ `deleteProject` payload slimmed down to IDs only
- ✅ `addTagToTask` payload verified - tag reference is intentional for tag creation + assignment in single operation
- ✅ `moveSubTask` migrated to anchor-based positioning
- ✅ Dependency handling verified - reducers gracefully handle missing IDs

**Remaining known payload concerns:**

- `moveToArchive` - Full task objects required for sync reliability (see todo.md for rationale)

## Detailed Findings

### 1. Granularity & Atomicity (Rule 2.1)

**Resolved Issues ✅:**

- **`TaskSharedActions.deleteProject`** ✅ FIXED (December 2025)

  - **Old Payload:** `project: Project`, `allTaskIds: string[]`
  - **New Payload:** `projectId: string`, `noteIds: string[]`, `allTaskIds: string[]`
  - **Resolution:** Reduced from full `Project` object (5-20 KB) to just IDs. `noteIds` required by note.reducer.ts.

- **`ProjectActions.moveProjectTaskInBacklogList`** (and similar move actions) ✅ FIXED (December 2025)

  - **Old Payload:** `newOrderedIds: string[]`
  - **New Payload:** `taskId: string`, `afterTaskId: string | null`
  - **Resolution:** Anchor-based positioning reduces conflict probability to near-zero. 36 tests added.

- **`moveSubTask`** ✅ FIXED (December 2025)
  - **Old Payload:** `newOrderedIds: string[]`
  - **New Payload:** `taskId: string`, `afterTaskId: string | null`, `parentTaskId: string`
  - **Resolution:** Same anchor-based approach as parent task moves.

**Acceptable By Design:**

- **`TaskSharedActions.moveToArchive`**

  - **Payload:** `tasks: TaskWithSubTasks[]`
  - **Status:** Intentional - full payload required for sync reliability
  - **Rationale:** When a client receives `moveToArchive`, it must write the tasks to its local archive. The originating client has already removed tasks from active state. Operations sync immediately but `archiveYoung` syncs daily, so receiving clients couldn't look up the task data if we only sent IDs. See `todo.md` Item 3 for full analysis.

- **`TaskSharedActions.addTagToTask`**
  - **Payload:** `tag: Tag`, `taskId: string`
  - **Status:** Acceptable - supports "create and assign tag" workflow
  - **Rationale:** The full tag object allows creating a new tag and assigning it to a task in a single atomic operation. The reducer handles both tag creation (if new) and task assignment. This pattern is more user-friendly than requiring two separate operations.

### 2. Idempotency (Rule 2.2)

**Compliance:**

- `uuidv7` is used for IDs, ensuring uniqueness.
- `OperationApplier` uses `convertOpToAction` which maps to standard NgRx actions.
- **Observation:** `OpType.Create` checks are generally handled by reducers (e.g., `adapter.addOne` usually ignores or throws on duplicate ID). The `OperationLogStore` does not enforce uniqueness on `op.entityId` (only `op.id` is unique). This is acceptable as long as reducers are idempotent.

### 3. Serializable Payload (Rule 2.3)

**Compliance:**

- `Task` model uses `number` for timestamps (`created`, `doneOn`, etc.) and `string` for dates.
- No `Date` objects found in key models.
- No functions or circular references detected in action payloads.

### 4. Causality Tracking (Rule 2.4)

**Compliance:**

- `OperationLogEffects` correctly increments and attaches `vectorClock` to every new operation.
- `OperationLogStore` persists `vectorClock`.

### 5. Schema Versioning (Rule 2.5)

**Compliance:**

- `OperationLogEffects` attaches `CURRENT_SCHEMA_VERSION` to every new operation.

### 6. Explicit Intent (Rule 2.6)

**Compliance:**

- Most actions map to specific `OpType` (`Create`, `Update`, `Delete`, `Move`).
- `deleteTasks` uses `OpType.Delete` with `isBulk: true`.
- **Improvement:** `archiveProject` is mapped to `OpType.Update`. It might benefit from being `OpType.Move` (to archive) or a specific status update, but `Update` is technically correct.

### 7. Validation (Rule 3.1)

**Compliance:**

- `validateOperationPayload` is called in `OperationLogEffects` before appending.
- The validation logic is currently lenient (structural checks only) but serves as the required checkpoint.

### 8. Sync Isolation (Rule 3.3)

**Compliance:**

- `OperationLogStore` is pure persistence.
- Sync logic is separated into `OperationLogSyncService` and provider-specific adapters.
- `getUnsynced()` is generic.

### 9. Dependency Awareness (Rule 3.4)

**Compliance:**

- ✅ `OperationApplierService` implements a retry queue for missing dependencies.
- ✅ Topological sorting is implemented for batch operations.
- ✅ `DependencyResolverService` handles hard/soft dependency extraction.
- ✅ Tag dependencies on Tasks now properly tracked (prevents sync data loss).
- ✅ Anchor-based moves degrade gracefully - if anchor task is missing, item appends to end.

**Verified Behavior (December 2025):**

- Move operations now use anchor-based positioning (`afterTaskId`).
- If the anchor task doesn't exist (deleted concurrently), the reducer appends the task to the end of the list.
- This provides graceful degradation instead of blocking or failing.

## Resolved Recommendations ✅

1.  ~~**Refactor Move Operations:**~~ ✅ COMPLETE - All task moves now use anchor-based positioning (`afterTaskId`).
2.  ~~**Slim Down Payloads:**~~ ✅ COMPLETE - `deleteProject` reduced to IDs. `moveToArchive` intentionally keeps full payload (required for sync). `addTagToTask` is acceptable as-is.
3.  ~~**Dependency Check for Lists:**~~ ✅ VERIFIED - Anchor-based moves handle missing tasks gracefully.

## Remaining Low-Priority Items

1.  **`updateProjectOrder` / `updateTagOrder`**: Still use full list replacement. Low priority - these are infrequently used operations.
2.  **Archive search**: Consider adding task lookup in archive during sync for edge cases (low priority, current behavior is acceptable).
