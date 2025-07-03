/**
 * Generate a unique task ID
 * Format: task-{timestamp}-{random}
 */
export const generateTaskId = (): string =>
  `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
