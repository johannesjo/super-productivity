# Sync-MD Plugin: Example Scenarios

This document illustrates 5 different sync scenarios showing how the proposed `updateTasksForProject` API would handle various situations.

## Scenario 1: Add New Task in Markdown

**Initial State:**

SuperProductivity:

```
- [x] Deploy backend (id: task-1, timeSpent: 2h, tag: urgent)
  - [x] Update database (id: task-2, timeSpent: 1h)
- [ ] Write documentation (id: task-3, timeSpent: 0h, attachments: 2)
```

tasks.md (Obsidian):

```markdown
- [x] Deploy backend
  - [x] Update database
- [ ] Write documentation
```

**User Action:** Add new task in tasks.md

tasks.md (After edit):

```markdown
- [x] Deploy backend
  - [x] Update database
- [ ] Write documentation
- [ ] Review PR #123 ← NEW
```

**Sync Process (fileToProject):**

1. Plugin detects new task without ID
2. Calls `updateTasksForProject`:

```typescript
{
  projectId: "project-1",
  tasks: [
    // Existing tasks (no changes, not sent)
    {
      tempId: "temp-001",
      title: "Review PR #123",
      isDone: false,
      parentId: null,
      order: 3
    }
  ],
  syncMode: "merge",
  preserveFields: ["timeSpent", "attachments", "reminders", "tags"]
}
```

3. SuperProductivity creates task with all defaults
4. Returns: `{ taskIdMapping: { "temp-001": "task-4" } }`

**Final State:**

SuperProductivity:

```
- [x] Deploy backend (id: task-1, timeSpent: 2h, tag: urgent)
  - [x] Update database (id: task-2, timeSpent: 1h)
- [ ] Write documentation (id: task-3, timeSpent: 0h, attachments: 2)
- [ ] Review PR #123 (id: task-4, timeSpent: 0h) ← NEW
```

tasks.md (unchanged, IDs hidden):

```markdown
- [x] Deploy backend
  - [x] Update database
- [ ] Write documentation
- [ ] Review PR #123
```

## Scenario 2: Complete Task with Time Tracking

**Initial State:**

SuperProductivity:

```
- [ ] Fix login bug (id: task-1, timeSpent: 1.5h, reminderId: rem-1)
  - [ ] Debug issue (id: task-2, timeSpent: 1h)
  - [ ] Write tests (id: task-3, timeSpent: 0.5h)
```

tasks.md:

```markdown
- [ ] Fix login bug
  - [ ] Debug issue
  - [ ] Write tests
```

**User Action:** Complete task in SuperProductivity AND track 2 more hours

SuperProductivity (After):

```
- [x] Fix login bug (id: task-1, timeSpent: 3.5h, reminderId: rem-1) ← COMPLETED + 2h
  - [x] Debug issue (id: task-2, timeSpent: 1h)
  - [x] Write tests (id: task-3, timeSpent: 0.5h)
```

**Sync Process (projectToFile):**

1. Plugin detects changes in SuperProductivity
2. Generates updated markdown preserving hierarchy
3. Time tracking data stays in SuperProductivity only

**Final State:**

tasks.md (Updated):

```markdown
- [x] Fix login bug ← UPDATED
  - [x] Debug issue ← UPDATED
  - [x] Write tests ← UPDATED
```

SuperProductivity (Unchanged - all metadata preserved):

```
- [x] Fix login bug (id: task-1, timeSpent: 3.5h, reminderId: rem-1)
  - [x] Debug issue (id: task-2, timeSpent: 1h)
  - [x] Write tests (id: task-3, timeSpent: 0.5h)
```

## Scenario 3: Conflicting Edits (Bidirectional)

**Initial State:**

Both systems:

```
- [ ] Refactor authentication module
- [ ] Update user interface
```

**User Actions (Concurrent):**

tasks.md edited to:

```markdown
- [ ] Refactor authentication module using JWT ← TITLE CHANGED
- [x] Update user interface ← MARKED COMPLETE
```

SuperProductivity edited to:

```
- [ ] Refactor authentication module (timeSpent: 2h)  ← TIME TRACKED
- [ ] Update user interface with new design  ← TITLE CHANGED
```

**Sync Process (bidirectional):**

1. Plugin detects conflicts
2. Calls `updateTasksForProject`:

```typescript
{
  projectId: "project-1",
  tasks: [
    {
      id: "task-1",
      title: "Refactor authentication module using JWT",  // From markdown
      isDone: false,
      syncMetadata: { lastSyncChecksum: "abc123" }
    },
    {
      id: "task-2",
      title: "Update user interface",  // Conflict! Using markdown (completed)
      isDone: true,  // From markdown
      syncMetadata: { lastSyncChecksum: "def456" }
    }
  ],
  syncMode: "merge",
  preserveFields: ["timeSpent", "attachments", "reminders", "tags"]
}
```

3. Conflict resolution (configurable):
   - Task 1: Markdown title wins, SuperProductivity timeSpent preserved
   - Task 2: Markdown completion wins, title conflict needs resolution

**Final State (with "prefer markdown" setting):**

SuperProductivity:

```
- [ ] Refactor authentication module using JWT (timeSpent: 2h) ← TITLE FROM MD, TIME PRESERVED
- [x] Update user interface (timeSpent: 0h) ← COMPLETED FROM MD, TITLE KEPT SIMPLE
```

tasks.md:

```markdown
- [ ] Refactor authentication module using JWT
- [x] Update user interface
```

Conflict report shown to user:

```
⚠️ Conflict on "Update user interface":
- Markdown: "Update user interface" [completed]
- SuperProductivity: "Update user interface with new design" [incomplete]
- Resolution: Used markdown version
```

## Scenario 4: Reordering and Hierarchy Changes

**Initial State:**

SuperProductivity:

```
- [ ] Project setup (id: task-1, timeSpent: 0.5h)
- [ ] Backend development (id: task-2)
  - [ ] Create API endpoints (id: task-3, timeSpent: 2h)
  - [ ] Setup database (id: task-4, attachments: 1)
- [ ] Frontend development (id: task-5)
```

tasks.md:

```markdown
- [ ] Project setup
- [ ] Backend development
  - [ ] Create API endpoints
  - [ ] Setup database
- [ ] Frontend development
```

**User Action:** Reorganize in markdown

tasks.md (After):

```markdown
- [ ] Backend development
  - [ ] Setup database ← REORDERED
  - [ ] Create API endpoints
  - [ ] Project setup ← MOVED AS SUBTASK
- [ ] Frontend development
```

**Sync Process (fileToProject):**

1. Plugin detects structure changes
2. Calls `updateTasksForProject`:

```typescript
{
  projectId: "project-1",
  tasks: [
    {
      id: "task-2",
      parentId: null,
      order: 0
    },
    {
      id: "task-4",
      parentId: "task-2",
      order: 0
    },
    {
      id: "task-3",
      parentId: "task-2",
      order: 1
    },
    {
      id: "task-1",
      parentId: "task-2",  // Now child of Backend
      order: 2
    },
    {
      id: "task-5",
      parentId: null,
      order: 1
    }
  ],
  syncMode: "merge",
  preserveFields: ["timeSpent", "attachments", "reminders", "tags", "title", "isDone"]
}
```

**Final State:**

SuperProductivity (structure updated, data preserved):

```
- [ ] Backend development (id: task-2)
  - [ ] Setup database (id: task-4, attachments: 1) ← ATTACHMENT PRESERVED
  - [ ] Create API endpoints (id: task-3, timeSpent: 2h) ← TIME PRESERVED
  - [ ] Project setup (id: task-1, timeSpent: 0.5h) ← TIME PRESERVED
- [ ] Frontend development (id: task-5)
```

## Scenario 5: Delete Task with Important Metadata

**Initial State:**

SuperProductivity:

```
- [ ] Implement feature X (id: task-1, timeSpent: 5h, attachments: 3)
- [ ] Fix critical bug (id: task-2, timeSpent: 2h, tag: urgent, reminderId: rem-1)
- [ ] Code review (id: task-3)
```

tasks.md:

```markdown
- [ ] Implement feature X
- [ ] Fix critical bug
- [ ] Code review
```

**User Action:** Delete middle task in markdown

tasks.md (After):

```markdown
- [ ] Implement feature X
- [ ] Code review
```

**Sync Process (fileToProject with safety check):**

1. Plugin detects task deletion
2. Checks if task has significant data (timeSpent > 0 or attachments)
3. Shows warning: "Task 'Fix critical bug' has 2h tracked time and is tagged as urgent. Delete anyway?"

**Option A: User confirms deletion**

SuperProductivity:

```
- [ ] Implement feature X (id: task-1, timeSpent: 5h, attachments: 3)
- [ ] Code review (id: task-3)
```

(Task moved to archive with all data preserved for recovery)

**Option B: User cancels deletion**

No changes made, markdown restored:

```markdown
- [ ] Implement feature X
- [ ] Fix critical bug ← RESTORED
- [ ] Code review
```

**Option C: Soft delete (configured behavior)**

SuperProductivity:

```
- [ ] Implement feature X (id: task-1, timeSpent: 5h, attachments: 3)
- [ ] ~Fix critical bug~ (id: task-2, timeSpent: 2h, tag: urgent, archived: true)
- [ ] Code review (id: task-3)
```

tasks.md (unchanged - deletion ignored):

```markdown
- [ ] Implement feature X
- [ ] Code review
```

## Summary

The proposed approach handles these scenarios by:

1. **Preserving Data**: Never losing timeSpent, attachments, or other metadata
2. **Intelligent Syncing**: Only updating what changed, using batch operations
3. **Conflict Detection**: Identifying and reporting conflicts clearly
4. **Safety Checks**: Warning before deleting tasks with significant data
5. **Flexibility**: Supporting different sync modes and conflict resolution strategies

This ensures a robust sync experience where users can edit in their preferred environment without fear of losing important data.
