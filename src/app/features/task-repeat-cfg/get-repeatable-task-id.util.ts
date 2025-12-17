/**
 * Generates a deterministic task ID for repeatable tasks.
 *
 * This ensures that if two clients create a task for the same repeat config
 * and due day simultaneously, they both generate the same task ID.
 * Conflict resolution then works correctly instead of creating duplicates.
 *
 * @param repeatCfgId - The ID of the task repeat configuration
 * @param dueDay - The due day in YYYY-MM-DD format
 * @returns A deterministic task ID (e.g., "rpt_abc123xyz_2025-01-15")
 */
export const getRepeatableTaskId = (repeatCfgId: string, dueDay: string): string => {
  return `rpt_${repeatCfgId}_${dueDay}`;
};
