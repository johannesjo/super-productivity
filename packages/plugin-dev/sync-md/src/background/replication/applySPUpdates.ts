import { SPCommands, SPUpdate, SuperProductivityTask } from './types';

/**
 * Apply SP updates - converts update list to command objects for SP API
 */
export const applySPUpdates = (updates: SPUpdate[]): SPCommands => {
  const creates: SuperProductivityTask[] = [];
  const updates_: { id: string; changes: Partial<SuperProductivityTask> }[] = [];
  const deletes: string[] = [];

  // Handle null/undefined input
  if (!updates || !Array.isArray(updates)) {
    return { creates, updates: updates_, deletes };
  }

  for (const update of updates) {
    // Skip null/undefined entries
    if (!update) {
      continue;
    }

    switch (update.type) {
      case 'create':
        if (update.task) {
          // Accept tasks with at least a title for creation
          const task = update.task as SuperProductivityTask;
          if (task.title !== undefined) {
            creates.push(task);
          }
        }
        break;
      case 'update':
        if (update.id && update.task !== undefined) {
          // Add updates even if task is empty object (for testing)
          updates_.push({ id: update.id, changes: update.task });
        }
        break;
      case 'delete':
        if (update.id) {
          // Ensure ID is valid
          const trimmedId = update.id.trim();
          if (trimmedId) {
            deletes.push(trimmedId);
          }
        }
        break;
      default:
        // Skip unknown update types
        continue;
    }
  }

  return { creates, updates: updates_, deletes };
};
