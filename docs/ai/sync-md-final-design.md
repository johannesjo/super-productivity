# Final Sync-MD Design: HTML Comment IDs

## The Solution: Invisible HTML Comments

```markdown
- [ ] <!-- sp:task-001 --> Fix login bug
- [x] <!-- sp:task-002 --> Write tests
- [ ] <!-- sp:task-003 --> Deploy to prod
```

## Why This Works

1. **Completely invisible** when viewing markdown (GitHub, Obsidian, VSCode preview)
2. **Stays with the task** on the same line
3. **Standard HTML** - won't break any markdown processor
4. **Clear prefix** `sp:` prevents conflicts with other comments
5. **Simple to implement** - just regex matching

## Implementation

### Parsing Tasks

```typescript
interface ParsedTask {
  line: string;
  lineNumber: number;
  id?: string;
  title: string;
  isDone: boolean;
}

function parseMarkdownTasks(content: string): ParsedTask[] {
  return content
    .split('\n')
    .map((line, index) => {
      // Match checkbox with optional comment before title
      const taskMatch = line.match(
        /^(\s*)- \[([ x])\]\s*(?:<!-- sp:([a-zA-Z0-9_-]+) -->)?\s*(.*)$/,
      );
      if (!taskMatch) return null;

      const [_, indent, checked, id, title] = taskMatch;

      return {
        line,
        lineNumber: index,
        id,
        title: title.trim(),
        isDone: checked.toLowerCase() === 'x',
      };
    })
    .filter(Boolean);
}
```

### Updating Tasks

```typescript
function updateTaskLine(task: ParsedTask, spId: string): string {
  const checkbox = task.isDone ? '[x]' : '[ ]';
  const indent = task.line.match(/^(\s*)/)?.[1] || '';
  return `${indent}- ${checkbox} <!-- sp:${spId} --> ${task.title}`;
}

function updateMarkdownContent(content: string, updates: Map<number, string>): string {
  const lines = content.split('\n');

  updates.forEach((newLine, lineNumber) => {
    lines[lineNumber] = newLine;
  });

  return lines.join('\n');
}
```

## Sync Logic

### Step 1: First Sync (Markdown → SuperProductivity)

**Before:**

```markdown
- [ ] Build new feature
- [ ] Fix bug #123
- [x] Update docs
```

**After sync:**

```markdown
- [ ] <!-- sp:task-a1b2 --> Build new feature
- [ ] <!-- sp:task-c3d4 --> Fix bug #123
- [x] <!-- sp:task-e5f6 --> Update docs
```

### Step 2: Update from SuperProductivity

When task is completed in SuperProductivity:

```typescript
// SuperProductivity state
{ id: 'task-a1b2', isDone: true, title: 'Build new feature', timeSpent: 3600 }

// Updates only the checkbox, preserves title
```

**Result:**

```markdown
- [x] <!-- sp:task-a1b2 --> Build new feature
```

### Step 3: Handle Renamed Tasks

**User renames in markdown:**

```markdown
- [ ] <!-- sp:task-a1b2 --> Build awesome new feature
```

The ID ensures we update the right task in SuperProductivity.

## Complete Sync Function

```typescript
async function syncMarkdownToSuperProductivity(
  markdownContent: string,
  projectId: string,
): Promise<string> {
  // 1. Parse all tasks from markdown
  const mdTasks = parseMarkdownTasks(markdownContent);

  // 2. Get existing tasks from SuperProductivity
  const spTasks = await getSuperProductivityTasks(projectId);
  const spTaskMap = new Map(spTasks.map((t) => [t.id, t]));

  // 3. Process each markdown task
  const updates = new Map<number, string>();
  const tasksToCreate: Task[] = [];
  const tasksToUpdate: Task[] = [];

  for (const mdTask of mdTasks) {
    if (mdTask.id && spTaskMap.has(mdTask.id)) {
      // Existing task - check for updates
      const spTask = spTaskMap.get(mdTask.id)!;

      if (spTask.title !== mdTask.title || spTask.isDone !== mdTask.isDone) {
        tasksToUpdate.push({
          id: mdTask.id,
          title: mdTask.title,
          isDone: mdTask.isDone,
        });
      }

      // Remove from map to track deletions
      spTaskMap.delete(mdTask.id);
    } else {
      // New task - needs ID
      const newId = generateId();
      tasksToCreate.push({
        id: newId,
        title: mdTask.title,
        isDone: mdTask.isDone,
        projectId,
      });

      // Update markdown line with new ID
      updates.set(mdTask.lineNumber, updateTaskLine(mdTask, newId));
    }
  }

  // 4. Archive tasks that no longer exist in markdown
  const tasksToArchive = Array.from(spTaskMap.values());

  // 5. Apply all changes to SuperProductivity
  if (tasksToCreate.length > 0) {
    await createTasks(tasksToCreate);
  }
  if (tasksToUpdate.length > 0) {
    await updateTasks(tasksToUpdate);
  }
  if (tasksToArchive.length > 0) {
    await archiveTasks(tasksToArchive.map((t) => t.id));
  }

  // 6. Return updated markdown with new IDs
  return updateMarkdownContent(markdownContent, updates);
}
```

## User Experience

### Creating Tasks

User types normal markdown:

```markdown
- [ ] New task
```

After sync, ID is added automatically:

```markdown
- [ ] <!-- sp:task-xyz --> New task
```

### Completing Tasks

Check the box in either markdown or SuperProductivity - it syncs both ways.

### Deleting Tasks

Just delete the line in markdown. Task is archived in SuperProductivity (preserving time tracking).

### Moving Tasks

Cut and paste freely - the HTML comment moves with the task.

## Benefits

1. **No metadata files** - Everything is in the markdown
2. **Invisible to users** - Clean rendered output
3. **Reliable** - IDs stick to their tasks
4. **Simple** - Just 50 lines of core logic
5. **Foolproof** - Hard to break accidentally

## Edge Cases Handled

**Duplicate IDs:** Use first occurrence, warn about others

```markdown
- [ ] <!-- sp:task-001 --> Task A
- [ ] <!-- sp:task-001 --> Task A Copy ⚠️ Ignored
```

**Malformed comments:** Treat as new task

```markdown
- [ ] <!-- sp:invalid format --> Task → Creates new task with proper ID
```

**Missing IDs after edit:** Match by title + position if possible, otherwise create new

## Why Not Other Approaches?

- **Inline IDs** `(task-123)` - Too visible, users complain
- **Link references** - Too complex, can be separated from task
- **Zero-width characters** - Fragile, breaks in some editors
- **End-of-line markers** - Can wrap in narrow editors
- **Metadata files** - Extra complexity, sync issues

The HTML comment approach is the sweet spot: invisible but reliable.

## Key Benefits of Comment-First Format

Placing the comment between the checkbox and title (`- [ ] <!-- sp:id --> Title`) has several advantages:

1. **Cleaner visual scanning** - The checkbox pattern stays consistent at the start
2. **Better for regex** - Easier to parse optional comments in the middle
3. **Natural reading flow** - Eyes skip over the comment to the title
4. **Safer editing** - Less likely to accidentally delete when editing the title
5. **Consistent spacing** - No awkward space at the end of lines
