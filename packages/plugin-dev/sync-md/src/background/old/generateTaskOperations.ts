import { ParsedTask } from './models/markdown.model';
import { SpTask } from './models/sync.model';
import { BatchOperation } from '@super-productivity/plugin-api';

/**
 * Generate batch operations to sync markdown tasks to Super Productivity
 */
export const generateTaskOperations = (
  mdTasks: ParsedTask[],
  spTasks: SpTask[],
  projectId: string,
): BatchOperation[] => {
  const operations: BatchOperation[] = [];

  // Create maps for easier lookup
  const spById = new Map<string, SpTask>();
  const spByTitle = new Map<string, SpTask>();
  const mdById = new Map<string, ParsedTask>();
  const mdByTitle = new Map<string, ParsedTask>();

  // Build SP maps
  spTasks.forEach((task) => {
    spById.set(task.id, task);
    // Only map by title if no duplicate titles
    if (!spByTitle.has(task.title)) {
      spByTitle.set(task.title, task);
    }
  });

  // Build MD maps and check for duplicates
  const duplicateIds = new Set<string>();
  const firstOccurrence = new Map<string, number>();

  mdTasks.forEach((mdTask) => {
    const checkId = mdTask.id;
    if (checkId) {
      if (firstOccurrence.has(checkId)) {
        duplicateIds.add(checkId);
      } else {
        firstOccurrence.set(checkId, mdTask.line);
        mdById.set(checkId, mdTask);
      }
    }
    if (!mdByTitle.has(mdTask.title)) {
      mdByTitle.set(mdTask.title, mdTask);
    }
  });

  // Track which SP tasks we've seen
  const processedSpIds = new Set<string>();

  // First pass: process MD tasks
  mdTasks.forEach((mdTask) => {
    // Skip subtasks - they'll be handled with their parents
    if (mdTask.isSubtask) {
      return;
    }

    // Check if this task has a duplicate ID
    const effectiveId = mdTask.id && !duplicateIds.has(mdTask.id) ? mdTask.id : null;

    if (effectiveId) {
      const spTask = spById.get(effectiveId);
      if (spTask) {
        processedSpIds.add(spTask.id);

        // Update existing task
        const updates: Record<string, unknown> = {};
        if (spTask.title !== mdTask.title) {
          updates.title = mdTask.title;
        }
        if (spTask.isDone !== mdTask.completed) {
          updates.isDone = mdTask.completed;
        }

        // Handle notes
        const mdNotes = mdTask.noteLines ? mdTask.noteLines.join('\n') : '';
        if ((spTask.notes || '') !== mdNotes) {
          updates.notes = mdNotes;
        }

        if (Object.keys(updates).length > 0) {
          operations.push({
            type: 'update',
            taskId: spTask.id,
            updates,
          } as BatchTaskUpdate);
        }
      } else {
        // Create new task with the specified ID
        operations.push({
          type: 'create',
          tempId: `temp_${mdTask.line}`,
          data: {
            id: effectiveId,
            title: mdTask.title,
            isDone: mdTask.completed,
            notes: mdTask.noteLines ? mdTask.noteLines.join('\n') : undefined,
            projectId,
          },
        } as BatchTaskCreate);
      }
    } else {
      // No ID - try to match by title
      const spTask = spByTitle.get(mdTask.title);
      if (spTask && !processedSpIds.has(spTask.id)) {
        processedSpIds.add(spTask.id);

        // Update existing task
        const updates: Record<string, unknown> = {};
        if (spTask.isDone !== mdTask.completed) {
          updates.isDone = mdTask.completed;
        }

        const mdNotes = mdTask.noteLines ? mdTask.noteLines.join('\n') : '';
        if ((spTask.notes || '') !== mdNotes) {
          updates.notes = mdNotes;
        }

        if (Object.keys(updates).length > 0) {
          operations.push({
            type: 'update',
            taskId: spTask.id,
            updates,
          } as BatchTaskUpdate);
        }
      } else {
        // Create new task
        operations.push({
          type: 'create',
          tempId: `temp_${mdTask.line}`,
          data: {
            title: mdTask.title,
            isDone: mdTask.completed,
            notes: mdTask.noteLines ? mdTask.noteLines.join('\n') : undefined,
            projectId,
          },
        } as BatchTaskCreate);
      }
    }
  });

  // Second pass: delete tasks that exist in SP but not in MD
  spTasks.forEach((spTask) => {
    if (!processedSpIds.has(spTask.id) && !spTask.parentId) {
      operations.push({
        type: 'delete',
        taskId: spTask.id,
      } as BatchTaskDelete);
    }
  });

  // Third pass: handle reordering if needed
  const mdRootTasks = mdTasks.filter((t) => !t.isSubtask);
  const mdTaskIds = mdRootTasks.map((t) => {
    if (t.id && spById.has(t.id)) {
      return t.id;
    }
    const spTask = spByTitle.get(t.title);
    return spTask ? spTask.id : `temp_${t.line}`;
  });

  if (mdTaskIds.length > 0) {
    operations.push({
      type: 'reorder',
      taskIds: mdTaskIds,
    } as BatchTaskReorder);
  }

  return operations;
};
