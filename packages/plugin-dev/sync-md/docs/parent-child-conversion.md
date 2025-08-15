# Parent-Child Task Conversion

The sync-md plugin now supports converting tasks between parent and subtask status by changing their indentation in the markdown file.

## How it works

### Converting Subtask to Parent Task

Simply unindent a subtask in the markdown file to convert it to a parent task:

**Before:**

```markdown
- [ ] Parent Task
  - [ ] This is a subtask
```

**After:**

```markdown
- [ ] Parent Task
- [ ] This is a subtask # Now a parent task
```

### Converting Parent Task to Subtask

Indent a parent task under another task to convert it to a subtask:

**Before:**

```markdown
- [ ] Task 1
- [ ] Task 2
```

**After:**

```markdown
- [ ] Task 1
  - [ ] Task 2 # Now a subtask of Task 1
```

### Moving Subtasks Between Parents

You can also move subtasks from one parent to another:

**Before:**

```markdown
- [ ] Parent 1
  - [ ] Subtask
- [ ] Parent 2
```

**After:**

```markdown
- [ ] Parent 1
- [ ] Parent 2
  - [ ] Subtask # Now under Parent 2
```

## Restrictions

Tasks with the following properties **cannot** be converted to subtasks:

- Tasks with `repeatCfgId` (repeating tasks)
- Tasks with `issueId` (issue-linked tasks)

If you try to indent these tasks, you'll see a warning message and the task will remain as a parent task.

**Example:**

```markdown
- [ ] Normal Task
  - [ ] Repeating Task # ⚠️ Won't work - will show warning
```

However, these tasks **can** be converted from subtasks to parent tasks without any restrictions.
