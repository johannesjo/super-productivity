import { Task } from '@super-productivity/plugin-api';

export interface ParsedTask {
  line: number;
  indent: number;
  completed: boolean;
  id: string | null;
  title: string;
  originalLine: string;
  parentId?: string | null;
  isSubtask: boolean;
  depth: number;
  notes?: string;
}

export interface TaskParseResult {
  tasks: ParsedTask[];
  errors: string[];
}

/**
 * Detect the base indentation size used in the markdown
 */
const detectIndentSize = (lines: string[]): number => {
  let minIndent = Infinity;

  for (const line of lines) {
    const match = line.match(/^(\s+)- \[/);
    if (match && match[1].length > 0) {
      minIndent = Math.min(minIndent, match[1].length);
    }
  }

  return minIndent === Infinity ? 2 : minIndent;
};

/**
 * Parse markdown content into task objects
 * Handles tasks and subtasks (first two levels) and converts deeper levels to notes
 */
export const parseMarkdown = (content: string): ParsedTask[] => {
  const result = parseMarkdownWithErrors(content);
  return result.tasks;
};

/**
 * Parse markdown content into task objects with error collection
 * Handles tasks and subtasks (first two levels) and converts deeper levels to notes
 */
export const parseMarkdownWithErrors = (content: string): TaskParseResult => {
  const lines = content.split('\n');
  const tasks: ParsedTask[] = [];
  const errors: string[] = [];
  const parentStack: Array<{
    indent: number;
    id: string | null;
    taskIndex: number;
  }> = [];
  const seenIds = new Set<string>();

  const detectedIndentSize = detectIndentSize(lines);
  console.log(`[sync-md] Detected indent size: ${detectedIndentSize} spaces`);

  let currentTaskIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match task line: - [ ] or - [x] with optional ID comment at the beginning
    const taskMatch = line.match(/^(\s*)- \[([ x])\]\s*(?:<!--([^>]+)-->\s*)?(.*)$/);

    if (taskMatch) {
      const [, indent, completed, id, title] = taskMatch;
      const indentLevel = indent.length;
      const depth = indentLevel === 0 ? 0 : Math.floor(indentLevel / detectedIndentSize);

      // Check for empty task title
      if (!title.trim()) {
        errors.push(`Skipping task with empty title at line ${i + 1}`);
        continue;
      }

      // Only process tasks at depth 0 (parent) and 1 (subtask)
      if (depth <= 1) {
        const isSubtask = depth === 1;
        let parentId: string | null = null;

        if (isSubtask) {
          // Find parent from stack
          for (let j = parentStack.length - 1; j >= 0; j--) {
            if (parentStack[j].indent < indentLevel) {
              parentId = parentStack[j].id;
              break;
            }
          }
        }

        // Clean up stack for current level
        while (
          parentStack.length > 0 &&
          parentStack[parentStack.length - 1].indent >= indentLevel
        ) {
          parentStack.pop();
        }

        // Check for duplicate IDs
        const taskId = id?.trim() || null;
        if (taskId && seenIds.has(taskId)) {
          errors.push(`Duplicate task ID found: ${taskId} at line ${i + 1}`);
          console.warn(
            `[sync-md] Skipping duplicate task ID: ${taskId} at line ${i + 1}`,
          );
          // Skip this task to avoid issues
          continue;
        }
        if (taskId) {
          seenIds.add(taskId);
        }

        // Create task
        const task: ParsedTask = {
          line: i,
          indent: indentLevel,
          completed: completed === 'x',
          id: taskId,
          title: title.trim(),
          originalLine: line,
          parentId,
          isSubtask,
          depth,
        };

        tasks.push(task);
        currentTaskIndex = tasks.length - 1;

        // Add to parent stack
        parentStack.push({
          indent: indentLevel,
          id: task.id,
          taskIndex: currentTaskIndex,
        });
      } else {
        // Depth 2+ - convert to notes content for the current task
        if (currentTaskIndex >= 0) {
          // For subtasks, we need to remove the subtask's indentation (2 spaces)
          // to get the note content with correct relative indentation
          const currentTask = tasks[currentTaskIndex];
          const baseIndent = currentTask.isSubtask
            ? currentTask.indent + detectedIndentSize
            : detectedIndentSize * 2;
          const noteLine =
            line.length > baseIndent ? line.substring(baseIndent) : line.trim();
          if (!tasks[currentTaskIndex].notes) {
            tasks[currentTaskIndex].notes = '';
          }
          tasks[currentTaskIndex].notes +=
            (tasks[currentTaskIndex].notes ? '\n' : '') + noteLine;
        }
      }
    } else if (line.trim() && currentTaskIndex >= 0) {
      // Non-task line - add to current task's notes if it's not empty
      // Remove the expected indentation for notes under the current task
      const currentTask = tasks[currentTaskIndex];
      const baseIndent = currentTask.isSubtask
        ? currentTask.indent + detectedIndentSize
        : detectedIndentSize;
      const noteLine =
        line.length > baseIndent ? line.substring(baseIndent) : line.trim();

      if (!tasks[currentTaskIndex].notes) {
        tasks[currentTaskIndex].notes = '';
      }
      tasks[currentTaskIndex].notes +=
        (tasks[currentTaskIndex].notes ? '\n' : '') + noteLine;
    }
  }

  return { tasks, errors };
};

/**
 * Generate a unique task ID
 */
export const generateTaskId = (): string => {
  return 'sp-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

/**
 * Convert markdown parsed tasks to SP format for comparison
 */
export const convertParsedTasksToSP = (
  parsedTasks: ParsedTask[],
  projectId: string,
): Partial<Task>[] => {
  return parsedTasks.map((task) => ({
    id: task.id || generateTaskId(),
    title: task.title,
    isDone: task.completed,
    notes: task.notes || '',
    projectId,
    parentId: task.parentId || null,
  }));
};
