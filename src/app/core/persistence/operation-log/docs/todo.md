# Operation Log: Items Needing Evaluation

**Status:** Needs evaluation before implementation
**Created:** December 4, 2025
**Last Updated:** December 4, 2025

These items were identified in the code audit but require further evaluation and design discussion before implementation.

---

## Recently Completed ✅

### Quota Handling (December 2025)

**Implementation:** `operation-log.effects.ts`

- ✅ Emergency compaction on `QuotaExceededError` with 1-day retention (vs 7-day normal)
- ✅ Cross-browser error detection (Chrome, Firefox `NS_ERROR_DOM_QUOTA_REACHED`, Safari code 22)
- ✅ Circuit breaker (`isHandlingQuotaExceeded`) prevents infinite retry loops
- ✅ User notification via snackbar on permanent failure
- ✅ App reload triggered to restore consistent state from persisted data

---

## 1. Implement Tombstone System (Rule 3.5)

**Priority:** HIGH
**Complexity:** HIGH

### Current State

- Deletions are immediate hard removals via `adapter.removeOne()`
- No `isDeleted`, `deletedAt` fields exist on models
- No retention window for recovery

### Required Changes

- Add tombstone fields to Task, Project, Tag models
- Update delete reducers to mark as deleted instead of removing
- Add compaction service to clean old tombstones after retention window
- Update selectors to filter out tombstoned entities
- Add recovery/undo functions

### Sync Impact

Without tombstones, concurrent delete + update operations result in non-deterministic state depending on replay order.

### Questions to Resolve

- What should the retention window be? (Rule suggests 30 days)
- How should UI handle tombstoned entities?
- Should archived tasks also use tombstones?

---

## 2. Refactor Move Operations to Relative Positioning

**Priority:** CRITICAL
**Complexity:** HIGH

### Current State

Some drag-drop actions like `moveProjectTaskInBacklogList` use `newOrderedIds: string[]` which sends the entire reordered list.

### Partial Progress ✅

Keyboard/button-triggered moves have already been refactored to use only `taskId`:

- ✅ `moveProjectTaskUpInBacklogList`
- ✅ `moveProjectTaskDownInBacklogList`
- ✅ `moveProjectTaskToTopInBacklogList`
- ✅ `moveProjectTaskToBottomInBacklogList`
- ✅ `moveProjectTaskToBacklogListAuto`
- ✅ `moveProjectTaskToRegularListAuto`

**December 2025 Update:** Drag-drop moves refactored to anchor-based positioning:

- ✅ `moveProjectTaskInBacklogList` - Now uses `{ taskId, afterTaskId, workContextId }`
- ✅ `moveProjectTaskToBacklogList` - Now uses `{ taskId, afterTaskId, workContextId }`
- ✅ `moveProjectTaskToRegularList` - Now uses `{ taskId, afterTaskId, workContextId, src, target }` (src/target retained for done/undone effects)
- ✅ `moveTaskInTodayList` - Now uses `{ taskId, afterTaskId, workContextId, workContextType, src, target }` (handles PROJECT and TAG contexts, special handling for DONE section)

Helper functions added in `work-context-meta.helper.ts`:

- `moveItemAfterAnchor(itemId, afterItemId, currentList)` - Anchor-based list reordering
- `getAnchorFromDragDrop(itemId, newOrderedIds)` - Extracts anchor from drag-drop event

### Problem

Two concurrent drag-drop moves of different tasks will conflict completely since both send the full list.

### Remaining Actions (still use full list ordering)

- `updateProjectOrder` - Project list reordering (less frequent operation)
- `updateTagOrder` - Tag list reordering (less frequent operation)

### Proposed Solutions

**Option A: Index-based moves**

```typescript
{
  taskId: string;
  fromIndex: number;
  toIndex: number;
}
```

- Simple to implement
- Fragile if list length changed concurrently

**Option B: Anchor-based moves**

```typescript
{ taskId: string; afterTaskId?: string }  // null = move to start
```

- More robust to concurrent changes
- Requires handling deleted anchor tasks

**Option C: CRDT-based ordering**

- Most robust but significantly complex
- Consider libraries like Yjs or Automerge

### Questions to Resolve

- Which approach balances complexity vs. robustness?
- How to handle edge cases (deleted anchors, concurrent creates)?
- Should we implement LWW conflict resolution for ordering conflicts?

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

1. **Tombstones** - Foundation for safe deletes, enables undo/restore (HIGH priority)
2. **Move operations** - Highest sync conflict risk (CRITICAL priority)
3. ~~**moveToArchive**~~ - Deferred: full payload required for sync reliability
4. ~~**deleteProject**~~ ✅ - Completed December 2025

> **Note:** Quota handling and deleteProject payload slim-down are complete. moveToArchive was analyzed and deferred - see Item 3 for rationale.

---

## Related Documentation

- [operation-rules.md](./operation-rules.md) - Design rules reference
- [code-audit.md](./code-audit.md) - Full audit findings
