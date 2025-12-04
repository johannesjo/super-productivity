# Operation Log Code Audit

**Date:** December 4, 2025
**Status:** Initial Audit
**Scope:** Check codebase compliance with `operation-rules.md`.

## Summary

The codebase largely adheres to the new Operation Log rules, particularly regarding architecture (Append-Only, Single Source of Truth) and safety (Validation, Robust Replay). However, several actions violate the **Granularity** rule by including large payloads (full entity lists or large object dumps) which may increase conflict probability during sync.

## Detailed Findings

### 1. Granularity & Atomicity (Rule 2.1)

**Violations:**

- **`TaskSharedActions.moveToArchive`**

  - **Payload:** `tasks: TaskWithSubTasks[]`
  - **Issue:** Persists the full content of all archived tasks (including subtasks) in the operation log. For bulk archiving, this creates a massive payload.
  - **Recommendation:** Change payload to `taskIds: string[]`. The reducer/effect should look up the task data from the store if needed, or the receiver should use its local state. If data preservation is the goal, ensure this is strictly necessary.

- **`TaskSharedActions.deleteProject`**

  - **Payload:** `project: Project`, `allTaskIds: string[]`
  - **Issue:** Persists the full `Project` object during deletion.
  - **Recommendation:** Payload should only require `projectId` (and maybe `allTaskIds` for cascading delete, though cascading should ideally be handled by the reducer/service).

- **`TaskSharedActions.addTagToTask`**

  - **Payload:** `tag: Tag`, `taskId: string`
  - **Issue:** Persists the full `Tag` object.
  - **Recommendation:** Should likely only require `tagId`. If the tag is being created, it should be a separate `TagActions.addTag` operation followed by `addTagToTask` (Rule 2.1 Atomicity).

- **`ProjectActions.moveProjectTaskInBacklogList`** (and similar move actions)
  - **Payload:** `newOrderedIds: string[]`
  - **Issue:** Persists the _entire_ list of IDs in the backlog/project. For large projects, this is a "dump" op.
  - **Risk:** High conflict probability. If two users move different tasks, their `newOrderedIds` lists will conflict completely.
  - **Recommendation:** Use relative move semantics (`move taskId to index X` or `after taskId Y`) in the operation, and let the reducer calculate the new list.

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

- `OperationApplierService` implements a retry queue for missing dependencies.
- Topological sorting is implemented for batch operations.
- **Risk:** `moveProjectTaskInBacklogList` (and similar) depends on the existence of _all_ tasks in the `newOrderedIds` list. If one task is missing (not synced yet), does the action fail?
  - _Analysis:_ The reducer likely ignores IDs that don't exist in the entity state, or it might reset the order to only valid IDs. This needs verification in `project.reducer.ts`. If strict dependency is enforced, a single missing task could block the reordering of the whole list.

## Recommendations for Next Steps

1.  **Refactor Move Operations:** Switch from absolute list sorting (`ids: string[]`) to relative moves (`taskId`, `targetIndex`) for operations to reduce conflict surface.
2.  **Slim Down Payloads:** Update `moveToArchive`, `deleteProject`, and `addTagToTask` to transmit only IDs where possible.
3.  **Dependency Check for Lists:** Verify how `projectReducer` handles `updateProjectOrder` when some IDs are missing. Ensure it degrades gracefully rather than breaking the project view.
