# Operation Log: Items Needing Evaluation

**Status:** Needs evaluation before implementation
**Created:** December 4, 2025

These items were identified in the code audit but require further evaluation and design discussion before implementation.

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

Actions like `moveProjectTaskInBacklogList` use `newOrderedIds: string[]` which sends the entire reordered list.

### Problem

Two concurrent moves of different tasks will conflict completely since both send the full list.

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

### Affected Actions

- `moveProjectTaskInBacklogList`
- `moveProjectTaskToBacklogList`
- `moveProjectTaskToRegularList`
- `updateProjectOrder`
- `updateTagOrder`

### Questions to Resolve

- Which approach balances complexity vs. robustness?
- How to handle edge cases (deleted anchors, concurrent creates)?
- Should we implement LWW conflict resolution for ordering conflicts?

---

## 3. Slim Down `moveToArchive` Payload

**Priority:** MEDIUM
**Complexity:** MEDIUM

### Current State

```typescript
moveToArchive: (taskProps: { tasks: TaskWithSubTasks[] })
```

Sends full task objects (5-50 KB per operation).

### Proposed Change

```typescript
moveToArchive: (taskProps: { taskIds: string[] })
```

### Considerations

- Archive is a special "snapshot" operation
- Receiver might not have task data if syncing from scratch
- May need separate "archive data" sync mechanism
- Evaluate if this is intentional design for data preservation

### Questions to Resolve

- Is full payload intentional for offline-first scenarios?
- How does archive sync work across clients?
- Should archive operations be treated like `SYNC_IMPORT` (rule 2.1 exception)?

---

## 4. Slim Down `deleteProject` Payload

**Priority:** LOW
**Complexity:** LOW

### Current State

```typescript
deleteProject: (taskProps: { project: Project; allTaskIds: string[] })
```

Full `Project` object (5-20 KB) is persisted but only `project.id` is used.

### Proposed Change

```typescript
deleteProject: (taskProps: { projectId: string; allTaskIds: string[] })
```

### Notes

- `allTaskIds` is needed for cascading delete (rule 3.5)
- Easy fix once tombstone system is in place
- Low priority since functional correctness is maintained

---

## Implementation Order Recommendation

1. **Tombstones** - Foundation for safe deletes, enables undo/restore
2. **Move operations** - Highest sync conflict risk
3. **moveToArchive** - Needs design decision on archive sync strategy
4. **deleteProject** - Simple cleanup, low impact

---

## Related Documentation

- [operation-rules.md](./operation-rules.md) - Design rules reference
- [code-audit.md](./code-audit.md) - Full audit findings
