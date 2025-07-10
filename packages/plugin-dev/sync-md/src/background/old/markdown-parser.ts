// Pure markdown parsing utilities - easily testable
import { ParsedTask, TaskParseResult } from './models/markdown.model';

/**
 * Detect the base indentation size used in the markdown
 * Returns the smallest non-zero indentation found
 */
const detectIndentSize = (lines: string[]): number => {
  let minIndent = Infinity;

  for (const line of lines) {
    const match = line.match(/^(\s*)- \[/);
    if (match && match[1].length > 0) {
      minIndent = Math.min(minIndent, match[1].length);
    }
  }

  // Default to 2 if no indentation found
  return minIndent === Infinity ? 2 : minIndent;
};

/**
 * Pure function to parse markdown content into task objects
 * This is easily testable as it has no side effects
 */
export const parseMarkdownTasks = (content: string): TaskParseResult => {
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

  // Detect the indentation size used in this file
  const detectedIndentSize = detectIndentSize(lines);
  console.log(`📏 Detected indent size: ${detectedIndentSize} spaces per level`);

  // First pass: identify all task lines and parse tasks
  lines.forEach((line, index) => {
    // Try new format first (no sp: prefix, no spaces)
    let taskMatch = line.match(/^(\s*)- \[([ x])\]\s*(?:<!--([^>]+)-->)?\s*(.*)$/);

    // If no match, try old format (with sp: prefix and spaces)
    if (!taskMatch) {
      taskMatch = line.match(/^(\s*)- \[([ x])\]\s*(?:<!-- sp:([^>]+) -->)?\s*(.*)$/);
    }

    if (taskMatch) {
      const [, indent, completed, id, title] = taskMatch;
      const indentLevel = indent.length;

      // Calculate depth using actual detected indent size
      let depth: number;
      if (detectedIndentSize === 1) {
        // Special handling for 1-space indentation
        // 0 spaces = depth 0, 1 space = depth 1, 2+ spaces = depth 2+
        depth = indentLevel;
      } else {
        // Normal calculation for 2+ space indentation
        depth = detectedIndentSize > 0 ? Math.floor(indentLevel / detectedIndentSize) : 0;
      }

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

        // Skip tasks with empty titles
        if (!title.trim()) {
          errors.push(`Skipping task with empty title at line ${index + 1}`);
          return; // Skip this iteration in forEach
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

  // Second pass: collect notes for all tasks at depth 0 and 1
  // Notes are any lines between a task and the next task
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    // Both parent tasks (depth 0) and subtasks (depth 1) can have notes
    if (task.depth <= 1) {
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

  return { tasks, errors, detectedIndentSize };
};
