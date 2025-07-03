# Bidirectional Replication Function Design

## Core Replication Function

```typescript
interface MarkdownTask {
  line: string;
  lineNumber: number;
  id?: string;
  title: string;
  isDone: boolean;
}

interface SuperProductivityTask {
  id: string;
  title: string;
  isDone: boolean;
  projectId: string;
  // Other SP fields preserved but not synced
  timeSpent?: number;
  tags?: string[];
  attachments?: any[];
}

interface ReplicationResult {
  markdownUpdates: MarkdownUpdate[];
  superProductivityUpdates: SPUpdate[];
  stats: {
    created: number;
    updated: number;
    deleted: number;
  };
}

interface MarkdownUpdate {
  lineNumber: number;
  newLine: string;
}

interface SPUpdate {
  type: 'create' | 'update' | 'delete';
  task?: Partial<SuperProductivityTask>;
  id?: string;
}

/**
 * Main replication function - compares two states and returns updates for both
 */
function replicateTasks(
  markdownTasks: MarkdownTask[],
  spTasks: SuperProductivityTask[],
  projectId: string,
): ReplicationResult {
  const markdownUpdates: MarkdownUpdate[] = [];
  const spUpdates: SPUpdate[] = [];
  const stats = { created: 0, updated: 0, deleted: 0 };

  // Create lookup maps
  const spTaskMap = new Map(spTasks.map((t) => [t.id, t]));
  const mdTaskMap = new Map<string, MarkdownTask>();
  const mdTasksWithoutId: MarkdownTask[] = [];

  // Separate markdown tasks by ID presence
  markdownTasks.forEach((mdTask) => {
    if (mdTask.id) {
      mdTaskMap.set(mdTask.id, mdTask);
    } else {
      mdTasksWithoutId.push(mdTask);
    }
  });

  // Step 1: Process markdown tasks with IDs
  mdTaskMap.forEach((mdTask, id) => {
    const spTask = spTaskMap.get(id);

    if (spTask) {
      // Task exists in both - check for updates
      if (mdTask.title !== spTask.title || mdTask.isDone !== spTask.isDone) {
        spUpdates.push({
          type: 'update',
          id: id,
          task: {
            title: mdTask.title,
            isDone: mdTask.isDone,
          },
        });
        stats.updated++;
      }

      // Remove from SP map to track what needs archiving
      spTaskMap.delete(id);
    } else {
      // Task has ID but doesn't exist in SP - create it
      spUpdates.push({
        type: 'create',
        task: {
          id: id,
          title: mdTask.title,
          isDone: mdTask.isDone,
          projectId: projectId,
        },
      });
      stats.created++;
    }
  });

  // Step 2: Process markdown tasks without IDs
  mdTasksWithoutId.forEach((mdTask) => {
    // Generate new ID
    const newId = generateTaskId();

    // Create in SuperProductivity
    spUpdates.push({
      type: 'create',
      task: {
        id: newId,
        title: mdTask.title,
        isDone: mdTask.isDone,
        projectId: projectId,
      },
    });
    stats.created++;

    // Update markdown with ID
    markdownUpdates.push({
      lineNumber: mdTask.lineNumber,
      newLine: createMarkdownLine(mdTask, newId),
    });
  });

  // Step 3: Delete SP tasks not in markdown
  spTaskMap.forEach((spTask) => {
    spUpdates.push({
      type: 'delete',
      id: spTask.id,
    });
    stats.deleted++;
  });

  return {
    markdownUpdates,
    superProductivityUpdates: spUpdates,
    stats,
  };
}

/**
 * Helper to create markdown line with ID
 */
function createMarkdownLine(task: MarkdownTask, id: string): string {
  const indent = task.line.match(/^(\s*)/)?.[1] || '';
  const checkbox = task.isDone ? '[x]' : '[ ]';
  return `${indent}- ${checkbox} <!-- sp:${id} --> ${task.title}`;
}

/**
 * Helper to generate unique task ID
 */
function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

## Parse and Apply Functions

```typescript
/**
 * Parse markdown content to extract tasks
 */
function parseMarkdownTasks(content: string): MarkdownTask[] {
  return content
    .split('\n')
    .map((line, lineNumber) => {
      // Match: - [ ] <!-- sp:id --> Title
      const match = line.match(
        /^(\s*)- \[([ x])\]\s*(?:<!-- sp:([a-zA-Z0-9_-]+) -->)?\s*(.*)$/,
      );

      if (!match) return null;

      const [_, indent, checked, id, title] = match;

      return {
        line,
        lineNumber,
        id,
        title: title.trim(),
        isDone: checked.toLowerCase() === 'x',
      };
    })
    .filter((task): task is MarkdownTask => task !== null);
}

/**
 * Apply markdown updates to content
 */
function applyMarkdownUpdates(content: string, updates: MarkdownUpdate[]): string {
  const lines = content.split('\n');

  // Sort updates by line number to apply in order
  updates.sort((a, b) => a.lineNumber - b.lineNumber);

  updates.forEach((update) => {
    lines[update.lineNumber] = update.newLine;
  });

  return lines.join('\n');
}

/**
 * Apply SP updates (returns commands for SP API)
 */
function applySPUpdates(updates: SPUpdate[]): {
  creates: SuperProductivityTask[];
  updates: { id: string; changes: Partial<SuperProductivityTask> }[];
  deletes: string[];
} {
  const creates: SuperProductivityTask[] = [];
  const updates: { id: string; changes: Partial<SuperProductivityTask> }[] = [];
  const deletes: string[] = [];

  for (const update of updates) {
    switch (update.type) {
      case 'create':
        if (update.task) {
          creates.push(update.task as SuperProductivityTask);
        }
        break;
      case 'update':
        if (update.id && update.task) {
          updates.push({ id: update.id, changes: update.task });
        }
        break;
      case 'delete':
        if (update.id) {
          deletes.push(update.id);
        }
        break;
    }
  }

  return { creates, updates, deletes };
}
```

## Complete Sync Flow

```typescript
/**
 * Complete sync flow example
 */
async function syncMarkdownWithSP(
  markdownContent: string,
  projectId: string,
): Promise<{ updatedMarkdown: string; stats: any }> {
  // 1. Parse current states
  const markdownTasks = parseMarkdownTasks(markdownContent);
  const spTasks = await fetchSPTasks(projectId);

  // 2. Run replication to get updates
  const replication = replicateTasks(markdownTasks, spTasks, projectId);

  // 3. Apply updates to both sides
  const updatedMarkdown = applyMarkdownUpdates(
    markdownContent,
    replication.markdownUpdates,
  );
  const spCommands = applySPUpdates(replication.superProductivityUpdates);

  // 4. Execute SP updates
  if (spCommands.creates.length > 0) {
    await createSPTasks(spCommands.creates);
  }
  if (spCommands.updates.length > 0) {
    await updateSPTasks(spCommands.updates);
  }
  if (spCommands.deletes.length > 0) {
    await deleteSPTasks(spCommands.deletes);
  }

  return {
    updatedMarkdown,
    stats: replication.stats,
  };
}
```

## Key Design Decisions

### 1. Pure Function Design

The `replicateTasks` function is pure - it only compares states and returns updates without side effects.

### 2. Bidirectional by Default

- Markdown is source of truth for: title, completion status
- SP is source of truth for: IDs, all other metadata
- No "sync direction" parameter needed

### 3. Simple Conflict Resolution

- If task exists in both: markdown wins for title/isDone
- If task only in markdown: create in SP
- If task only in SP: delete it

### 4. Minimal Updates

Only creates update records when actual changes are detected.

### 5. ID Management

- IDs are generated once and never change
- IDs are the single source of truth for identity
- Missing IDs are added automatically

## Usage Example

```typescript
// In the sync-md plugin
async function performSync() {
  const content = await readMarkdownFile();
  const projectId = getConfiguredProjectId();

  const { updatedMarkdown, stats } = await syncMarkdownWithSP(content, projectId);

  await writeMarkdownFile(updatedMarkdown);

  console.log(`Sync complete: 
    Created: ${stats.created}
    Updated: ${stats.updated}
    Deleted: ${stats.deleted}
  `);
}
```

## Benefits

1. **Single source of logic** - One function handles all sync scenarios
2. **Testable** - Pure function with clear inputs/outputs
3. **Predictable** - No hidden state or complex flows
4. **Efficient** - Only updates what changed
5. **Extensible** - Easy to add new fields or rules

This design provides a clean, maintainable approach to bidirectional sync that handles all the edge cases while keeping the implementation simple.
