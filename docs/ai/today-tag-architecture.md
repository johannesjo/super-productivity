# TODAY_TAG Architecture

This document explains the dual-system architecture for task ordering in Super Productivity and why TODAY_TAG is a "virtual tag."

## Overview

Super Productivity uses two complementary systems for task ordering:

| System                  | Purpose                     | Storage Location                |
| ----------------------- | --------------------------- | ------------------------------- |
| `TODAY_TAG.taskIds`     | Order tasks for today       | `tag.entities['TODAY'].taskIds` |
| `planner.days[dateStr]` | Order tasks for future days | `planner.days`                  |

This is intentional, not technical debt. The dual system keeps move operations (drag/drop, keyboard shortcuts) simple and uniform.

## The "Virtual Tag" Pattern

TODAY_TAG is special:

1. **Should NOT be in `task.tagIds`** - Unlike regular tags, TODAY_TAG must never appear in a task's `tagIds` array
2. **Only exists in `tag.taskIds`** - TODAY_TAG.taskIds stores the ordered list of task IDs for today
3. **Acts as a work context** - Users can click TODAY in the sidebar to view today's tasks

This pattern was enforced in commit `ca08724bd` ("fix(sync): remove TODAY_TAG from task.tagIds").

### Why This Pattern?

Regular tags use a "board-style" pattern:

- `task.tagIds` = source of truth for membership
- `tag.taskIds` = ordering only

TODAY_TAG cannot follow this pattern because:

- Tasks belong to "today" based on `task.dueDay`, not `task.tagIds`
- Adding TODAY_TAG to `task.tagIds` would create sync conflicts
- The planner already tracks day membership via `task.dueDay`

## Code Paths

### TODAY_TAG.taskIds is modified by:

| File                                | Lines   | Purpose                                 |
| ----------------------------------- | ------- | --------------------------------------- |
| `task-shared-scheduling.reducer.ts` | 29-264  | scheduleTaskWithTime, planTasksForToday |
| `planner-shared.reducer.ts`         | 91-151  | Transfer to/from today                  |
| `task-shared-crud.reducer.ts`       | 120-156 | Add task with dueDay === today          |
| `short-syntax-shared.reducer.ts`    | 215-232 | @today syntax                           |
| `tag.reducer.ts`                    | 257-361 | Move actions (drag/drop, Ctrl+↑/↓)      |

### planner.days is modified by:

| File                                | Lines   | Purpose                                     |
| ----------------------------------- | ------- | ------------------------------------------- |
| `planner.reducer.ts`                | 155-183 | planTaskForDay (skips today)                |
| `planner-shared.reducer.ts`         | 47-82   | Transfer between days                       |
| `task-shared-scheduling.reducer.ts` | 206-226 | Remove from planner when planning for today |

## Why Not Unify in Planner?

We considered making `planner.days[todayStr]` the source of truth for today's ordering. However:

1. **Move handlers would need special routing:**

   ```typescript
   // tag.reducer.ts would need:
   if (workContextId === TODAY_TAG.id) {
     // Route to planner.days[todayStr]
   } else {
     // Update tag.taskIds
   }
   ```

2. **Current architecture is simpler:**

   ```typescript
   // All tags (including TODAY) handled uniformly:
   if (workContextType === 'TAG') {
     // Update tag.taskIds - works for all tags
   }
   ```

3. **Cost/benefit doesn't favor refactoring:**
   - 8+ files would need changes
   - Migration required for existing data
   - Conceptual benefit only (no functional improvement)

## Guidance for New Features

### When adding a task to today:

1. Set `task.dueDay = getDbDateStr()`
2. Add task ID to `TODAY_TAG.taskIds` (meta-reducer handles this)
3. Do NOT add `TODAY_TAG.id` to `task.tagIds`

### When moving a task away from today:

1. Update `task.dueDay` to the new day
2. Remove task ID from `TODAY_TAG.taskIds`
3. Add to `planner.days[newDay]` if not today

### When implementing move/reorder operations:

- For TODAY context: operations go through `tag.reducer.ts` like any other tag
- The selector `selectTodayTaskIds` computes the ordered list

## Key Selectors

```typescript
// Get ordered today task IDs (uses board-style pattern internally)
selectTodayTaskIds;

// Get active work context (TODAY_TAG or project)
selectActiveWorkContext;
```

## Related Files

- `src/app/features/tag/tag.const.ts` - TODAY_TAG definition
- `src/app/features/planner/store/planner.reducer.ts` - Planner state
- `src/app/features/tag/store/tag.reducer.ts` - Tag state and move handlers
- `src/app/features/work-context/store/work-context.selectors.ts` - Work context selectors
- `src/app/root-store/meta/task-shared-meta-reducers/` - Meta-reducers for atomic updates
