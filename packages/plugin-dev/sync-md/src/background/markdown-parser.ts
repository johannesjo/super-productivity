import { MarkdownTask } from '../shared/types';

// Pure markdown parsing utilities - easily testable
export interface ParsedTask {
  line: number;
  indent: number;
  completed: boolean;
  id: string | null;
  title: string;
  originalLine: string;
  parentId?: string | null;
  isSubtask: boolean;
  originalId?: string | null; // Track the original ID even if it's a duplicate
  depth: number; // Track depth level (0 = root, 1 = subtask, 2+ = notes content)
  noteLines?: string[]; // Third-level content to be synced as notes
}

export interface TaskParseResult {
  tasks: ParsedTask[];
  errors: string[];
}

/**
 * Pure function to parse markdown content into task objects
 * This is easily testable as it has no side effects
 */
export function parseMarkdownTasks(content: string): TaskParseResult {
  const lines = content.split('\n');
  const tasks: ParsedTask[] = [];
  const errors: string[] = [];
  const parentStack: Array<{
    indent: number;
    id: string | null;
    line: number;
    taskIndex: number;
  }> = [];
  const seenIds = new Set<string>();

  // First pass: identify all task lines and parse tasks
  lines.forEach((line, index) => {
    const taskMatch = line.match(/^(\s*)- \[([ x])\]\s*(?:<!-- sp:([^>]+) -->)?\s*(.*)$/);

    if (taskMatch) {
      const [, indent, completed, id, title] = taskMatch;
      const indentLevel = indent.length;
      const depth = Math.floor(indentLevel / 2);

      // Only process tasks at depth 0 or 1 (parent tasks and subtasks)
      if (depth <= 1) {
        const isSubtask = indentLevel > 0;

        let parentId: string | null = null;
        if (isSubtask) {
          // Find parent from stack
          for (let i = parentStack.length - 1; i >= 0; i--) {
            if (parentStack[i].indent < indentLevel) {
              parentId = parentStack[i].id;
              break;
            }
          }

          // Clean up stack
          while (
            parentStack.length > 0 &&
            parentStack[parentStack.length - 1].indent >= indentLevel
          ) {
            parentStack.pop();
          }
        } else {
          parentStack.length = 0;
        }

        // Check for duplicate IDs
        let actualId: string | null = id || null;
        if (id && seenIds.has(id)) {
          errors.push(`Duplicate task ID "${id}" at line ${index + 1} - ID removed`);
          actualId = null;
        } else if (id) {
          seenIds.add(id);
        }

        // Validate task structure
        if (!title.trim()) {
          errors.push(`Empty task title at line ${index + 1}`);
        }

        const taskIndex = tasks.length;
        tasks.push({
          line: index,
          indent: indentLevel,
          completed: completed === 'x',
          id: actualId || null,
          title: title.trim(),
          originalLine: line,
          parentId,
          isSubtask,
          originalId: id || null,
          depth,
        });

        // Add to parent stack
        parentStack.push({
          indent: indentLevel,
          id: actualId || null,
          line: index,
          taskIndex,
        });
      }
    }
  });

  // Second pass: collect notes for subtasks
  // Notes are any lines between a subtask and the next task
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    // Only subtasks (depth 1) can have notes
    if (task.depth === 1) {
      const startLine = task.line + 1;
      let endLine = lines.length;

      // Find the next task line
      for (let j = i + 1; j < tasks.length; j++) {
        if (tasks[j].line > task.line) {
          endLine = tasks[j].line;
          break;
        }
      }

      // Collect all lines between this task and the next as notes
      const noteLines: string[] = [];
      for (let lineNum = startLine; lineNum < endLine; lineNum++) {
        const line = lines[lineNum];
        // Include all lines, preserving empty lines
        noteLines.push(line);
      }

      // Trim trailing empty lines
      while (noteLines.length > 0 && !noteLines[noteLines.length - 1].trim()) {
        noteLines.pop();
      }

      if (noteLines.length > 0) {
        task.noteLines = noteLines;
      }
    }
  }

  return { tasks, errors };
}

/**
 * Generate a unique task ID
 */
export function generateTaskId(): string {
  return 'md-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Convert tasks back to markdown lines
 */
export function tasksToMarkdownLines(tasks: ParsedTask[]): string[] {
  return tasks.map((task) => {
    const indent = ' '.repeat(task.indent);
    const check = task.completed ? 'x' : ' ';
    const idPart = task.id ? ` <!-- sp:${task.id} -->` : '';
    return `${indent}- [${check}]${idPart} ${task.title}`;
  });
}

/**
 * Convert parsed tasks to hierarchical MarkdownTask structure
 */
export function buildTaskHierarchy(parsedTasks: ParsedTask[]): MarkdownTask[] {
  const rootTasks: MarkdownTask[] = [];
  const taskMap = new Map<string | null, MarkdownTask>();

  // First pass: create all tasks
  parsedTasks.forEach((parsed) => {
    const task: MarkdownTask = {
      title: parsed.title,
      isDone: parsed.completed,
      lineNumber: parsed.line,
      indentLevel: parsed.indent / 2, // Convert spaces to indent level
      subTasks: [],
    };

    if (parsed.id) {
      taskMap.set(parsed.id, task);
    } else {
      taskMap.set(`line-${parsed.line}`, task);
    }
  });

  // Second pass: build hierarchy
  parsedTasks.forEach((parsed, index) => {
    const taskKey = parsed.id || `line-${parsed.line}`;
    const task = taskMap.get(taskKey)!;

    if (parsed.parentId) {
      const parent = taskMap.get(parsed.parentId);
      if (parent) {
        parent.subTasks.push(task);
      } else {
        rootTasks.push(task);
      }
    } else if (!parsed.isSubtask) {
      rootTasks.push(task);
    } else {
      // Find parent by indentation
      for (let i = index - 1; i >= 0; i--) {
        if (parsedTasks[i].indent < parsed.indent) {
          const parentKey = parsedTasks[i].id || `line-${parsedTasks[i].line}`;
          const parent = taskMap.get(parentKey);
          if (parent) {
            parent.subTasks.push(task);
            break;
          }
        }
      }
    }
  });

  return rootTasks;
}
