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
  header?: string;
}

/**
 * Detect the base indentation size used in the markdown
 * Uses most common indent size among subtasks, not minimum
 */
const detectIndentSize = (lines: string[]): number => {
  const indentCounts = new Map<number, number>();

  for (const line of lines) {
    const match = line.match(/^(\s+)- \[/);
    if (match && match[1].length > 0) {
      const indentSize = match[1].length;
      indentCounts.set(indentSize, (indentCounts.get(indentSize) || 0) + 1);
    }
  }

  // If no indented tasks found, default to 2 spaces
  if (indentCounts.size === 0) {
    return 2;
  }

  // Find the most common indent size
  let mostCommonIndent = 2;
  let maxCount = 0;

  for (const [indent, count] of indentCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonIndent = indent;
    }
  }

  return mostCommonIndent;
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
 * Parse markdown content and return header content
 * Returns everything before the first task
 */
export const parseMarkdownWithHeader = (content: string): TaskParseResult => {
  return parseMarkdownWithErrors(content);
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
  let firstTaskLineIndex = -1;
  let header: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match task line: - [ ] or - [x] with optional ID comment at the beginning
    const taskMatch = line.match(/^(\s*)- \[([ x])\]\s*(?:<!--([^>]+)-->\s*)?(.*)$/);

    if (taskMatch) {
      // Mark the first task line if not already marked
      if (firstTaskLineIndex === -1) {
        firstTaskLineIndex = i;
        // Extract header content (everything before the first task)
        if (i > 0) {
          header = lines.slice(0, i).join('\n');
        }
      }

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
              const parentStackEntry = parentStack[j];
              // If the parent has a real ID, use it. Otherwise, use the temp ID.
              // This allows subtasks to reference their parent even when parsing
              // markdown without IDs for the first time.
              parentId = parentStackEntry.id;
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
        let taskId = id?.trim() || null;
        if (taskId && seenIds.has(taskId)) {
          errors.push(`Duplicate task ID found: ${taskId} at line ${i + 1}`);
          console.warn(
            `[sync-md] Found duplicate task ID: ${taskId} at line ${i + 1}, setting to null`,
          );
          // Set ID to null instead of skipping the task
          taskId = null;
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
        // Use the task ID if available, otherwise use a temporary ID based on line number
        // This ensures subtasks can find their parent even when IDs haven't been assigned yet
        const stackId = task.id || `temp_${i}`;
        parentStack.push({
          indent: indentLevel,
          id: stackId,
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

  // If no tasks were found, the entire content is considered header
  if (firstTaskLineIndex === -1 && lines.length > 0) {
    header = content;
  }

  return { tasks, errors, header };
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
