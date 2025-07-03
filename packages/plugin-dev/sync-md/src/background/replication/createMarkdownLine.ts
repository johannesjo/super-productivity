import { MarkdownTask } from './types';

/**
 * Create a markdown line with ID in HTML comment format
 * Format: - [ ] <!-- sp:id --> Title
 */
export const createMarkdownLine = (task: MarkdownTask, id: string): string => {
  // Handle null/undefined task
  if (!task) {
    return `- [ ] <!-- sp:${id || ''} --> `;
  }

  // Extract indentation from original line, or use empty string
  const indent = task.line?.match(/^(\s*)/)?.[1] || '';

  // Handle checkbox state
  const checkbox = task.isDone ? '[x]' : '[ ]';

  // Handle title - ensure it's a string
  const title = task.title || '';

  // Validate ID - ensure it only contains allowed characters
  const sanitizedId = id?.replace(/[^a-zA-Z0-9_-]/g, '') || '';

  return `${indent}- ${checkbox} <!-- sp:${sanitizedId} --> ${title}`;
};
