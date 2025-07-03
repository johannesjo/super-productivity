import { MarkdownTask } from './types';

/**
 * Parse markdown content to extract tasks with HTML comment IDs
 * Format: - [ ] <!-- sp:id --> Title
 */
export const parseMarkdownTasks = (content: string): MarkdownTask[] => {
  // Handle null/undefined input
  if (!content || typeof content !== 'string') {
    return [];
  }

  const tasks: MarkdownTask[] = [];

  content.split('\n').forEach((line, lineNumber) => {
    // Match: - [ ] <!-- sp:id --> Title
    // Also support uppercase X
    const match = line.match(
      /^(\s*)- \[([ xX]?)\]\s*(?:<!-- sp:([a-zA-Z0-9_-]+) -->)?\s*(.*)$/,
    );

    if (match) {
      const [_, indent, checked, id, title] = match;
      const trimmedTitle = title.trim();

      // Don't skip empty tasks - they should be included

      tasks.push({
        line,
        lineNumber,
        id,
        title: trimmedTitle,
        isDone: checked.toLowerCase() === 'x',
      });
    }
  });

  return tasks;
};
