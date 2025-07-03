# Simplified Sync-MD: Scenario Examples

This document demonstrates the simplified `@sp` marker approach for syncing markdown tasks with SuperProductivity.

## The Simple Rules

1. Only lines starting with `- [ ] @sp` or `- [x] @sp` sync
2. SuperProductivity adds hidden IDs: `(id:xxx)`
3. Everything else in your markdown is ignored
4. No nesting - all tasks sync as top-level

---

## Scenario 1: First Time Sync

### Initial State

**tasks.md:**

```markdown
# My Project

Some notes about the project...

## Todo

- [ ] Review documentation
- [ ] @sp Fix login bug
- [ ] @sp Write unit tests
- [ ] Setup CI/CD pipeline
```

**SuperProductivity:** Empty project

### Action: User clicks "Sync"

### Sync Process

1. Parser finds 2 lines with `@sp` marker
2. Creates tasks in SuperProductivity
3. Updates markdown with IDs

### Final State

**tasks.md:**

```markdown
# My Project

Some notes about the project...

## Todo

- [ ] Review documentation
- [ ] @sp Fix login bug (id:task-001)
- [ ] @sp Write unit tests (id:task-002)
- [ ] Setup CI/CD pipeline
```

**SuperProductivity:**

```
✓ Project has 2 new tasks:
- [ ] Fix login bug (id:task-001, created: now)
- [ ] Write unit tests (id:task-002, created: now)
```

**Note:** "Review documentation" and "Setup CI/CD pipeline" are NOT synced (no @sp marker)

---

## Scenario 2: Complete Task in Markdown

### Initial State

**tasks.md:**

```markdown
- [ ] @sp Fix login bug (id:task-001)
- [ ] @sp Write unit tests (id:task-002)
- [ ] @sp Code review (id:task-003)
```

**SuperProductivity:**

```
- [ ] Fix login bug (timeSpent: 2h, tag: urgent)
- [ ] Write unit tests (timeSpent: 0h)
- [ ] Code review (timeSpent: 0h)
```

### Action: User checks box in markdown

**tasks.md (edited):**

```markdown
- [x] @sp Fix login bug (id:task-001) ← CHECKED
- [ ] @sp Write unit tests (id:task-002)
- [ ] @sp Code review (id:task-003)
```

### Sync Process

1. Detects task-001 is now completed
2. Updates SuperProductivity, preserving all metadata

### Final State

**SuperProductivity:**

```
- [x] Fix login bug (timeSpent: 2h, tag: urgent, completedAt: now) ← COMPLETED
- [ ] Write unit tests (timeSpent: 0h)
- [ ] Code review (timeSpent: 0h)
```

**All metadata preserved!** Time tracking, tags, etc. remain intact.

---

## Scenario 3: Add Tasks Mixed With Notes

### Initial State

**tasks.md:**

```markdown
## Sprint Planning

Yesterday we discussed:

- Need better error handling
- Performance improvements needed

Tasks for this sprint:

- [ ] @sp Implement error boundaries (id:task-010)
- [ ] Update dependencies (not urgent)
- [ ] @sp Add performance monitoring (id:task-011)

Remember to:

- [ ] Book meeting room
- [ ] Order lunch for team
```

### Action: User adds new @sp task

**tasks.md (edited):**

```markdown
## Sprint Planning

Yesterday we discussed:

- Need better error handling
- Performance improvements needed

Tasks for this sprint:

- [ ] @sp Implement error boundaries (id:task-010)
- [ ] Update dependencies (not urgent)
- [ ] @sp Add performance monitoring (id:task-011)
- [ ] @sp Optimize database queries ← NEW

Remember to:

- [ ] Book meeting room
- [ ] Order lunch for team
```

### Final State (after sync)

**tasks.md:**

```markdown
## Sprint Planning

Yesterday we discussed:

- Need better error handling
- Performance improvements needed

Tasks for this sprint:

- [ ] @sp Implement error boundaries (id:task-010)
- [ ] Update dependencies (not urgent)
- [ ] @sp Add performance monitoring (id:task-011)
- [ ] @sp Optimize database queries (id:task-012) ← ID ADDED

Remember to:

- [ ] Book meeting room
- [ ] Order lunch for team
```

Only the `@sp` marked task syncs. Other checkboxes remain local to markdown.

---

## Scenario 4: Rename Task

### Initial State

**tasks.md:**

```markdown
- [ ] @sp Fix login bug (id:task-001)
- [ ] @sp Write unit tests (id:task-002)
```

**SuperProductivity:**

```
- [ ] Fix login bug (timeSpent: 1h, attachments: 2)
- [ ] Write unit tests (timeSpent: 0h)
```

### Action: User renames task in markdown

**tasks.md (edited):**

```markdown
- [ ] @sp Fix authentication issue with OAuth (id:task-001) ← RENAMED
- [ ] @sp Write unit tests (id:task-002)
```

### Sync Process

1. ID `task-001` found - this is an update, not a new task
2. Updates title in SuperProductivity
3. All metadata preserved

### Final State

**SuperProductivity:**

```
- [ ] Fix authentication issue with OAuth (timeSpent: 1h, attachments: 2)    ← TITLE UPDATED
- [ ] Write unit tests (timeSpent: 0h)
```

The ID ensures we update the right task, even with a completely different title.

---

## Scenario 5: Remove @sp Marker (Archive Task)

### Initial State

**tasks.md:**

```markdown
- [ ] @sp Deploy to staging (id:task-020)
- [ ] @sp Fix memory leak (id:task-021)
- [ ] @sp Update README (id:task-022)
```

### Action: User removes @sp marker

**tasks.md (edited):**

```markdown
- [ ] @sp Deploy to staging (id:task-020)
- [ ] Fix memory leak ← @sp REMOVED
- [ ] @sp Update README (id:task-022)
```

### Sync Process

1. Task-021 no longer has @sp marker
2. Task is archived in SuperProductivity (not deleted!)
3. Markdown line is left as-is

### Final State

**SuperProductivity:**

```
Active:
- [ ] Deploy to staging (id:task-020)
- [ ] Update README (id:task-022)

Archived:
- [ ] Fix memory leak (id:task-021, timeSpent: 3h, archived: now)
```

**Note:** If user adds `@sp` back later, a NEW task is created (old one stays archived).

---

## Scenario 6: Conflict Resolution

### Initial State

Both have task synced:

```markdown
- [ ] @sp Refactor user service (id:task-030)
```

### Concurrent Actions

**In Markdown:** User checks the box

```markdown
- [x] @sp Refactor user service (id:task-030)
```

**In SuperProductivity:** User updates title and tracks time

```
- [ ] Refactor user service to use dependency injection (timeSpent: 2h)
```

### Sync Process

**Rule: Markdown state wins, SuperProductivity enrichment preserved**

### Final State

**tasks.md:** (unchanged)

```markdown
- [x] @sp Refactor user service (id:task-030)
```

**SuperProductivity:**

```
- [x] Refactor user service (id:task-030, timeSpent: 2h, completed: now)
         ↑                                      ↑
   Markdown title kept              SP time tracking kept
```

**Sync report:**

```
✓ Synced 1 task
  - task-030: Completed (kept markdown title, preserved 2h time tracking)
```

---

## Scenario 7: Move Tasks Around

### Initial State

**tasks.md:**

```markdown
## This Week

- [ ] @sp Task A (id:task-040)
- [ ] @sp Task B (id:task-041)

## Next Week

- [ ] @sp Task C (id:task-042)
```

### Action: User reorganizes in markdown

**tasks.md (edited):**

```markdown
## This Week

- [ ] @sp Task B (id:task-041) ← MOVED UP

## Next Week

- [ ] @sp Task C (id:task-042)
- [ ] @sp Task A (id:task-040) ← MOVED HERE

## Done

- [x] @sp Task B (id:task-041) ← WAIT, DUPLICATE!
```

### Sync Process

1. Parser finds duplicate ID (task-041)
2. Uses FIRST occurrence only
3. Warns user about duplicate

### Final State

**Sync warning:**

```
⚠️ Warning: Duplicate task found
  - "Task B (id:task-041)" appears 2 times
  - Using first occurrence (line 2)
```

**SuperProductivity:** No position changes (SP doesn't track markdown position)

---

## Key Takeaways

1. **Simplicity wins**: Just add `@sp` to sync a task
2. **IDs are hidden**: Users never need to manage them
3. **Markdown is king**: Your markdown structure is preserved
4. **Metadata is safe**: SP data (time, tags, etc.) is never lost
5. **Predictable**: Clear rules, no surprises

## What Users Love

- ✅ "My meeting notes stay clean"
- ✅ "I can mix todos and notes freely"
- ✅ "Time tracking doesn't clutter my markdown"
- ✅ "I can rename tasks without breaking anything"
- ✅ "It just works!"

## Error Handling

If something goes wrong:

1. Markdown is NEVER corrupted
2. Unknown IDs create new tasks
3. Duplicates are warned but handled
4. Sync conflicts are logged clearly
5. User can always remove `@sp` to "unsync" a task
