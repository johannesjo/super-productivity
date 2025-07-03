// Pure batch operation utilities - easily testable

import { ParsedTask } from '../markdown-parser';

export interface BatchTaskCreate {
  type: 'create';
  tempId: string;
  data: {
    title: string;
    notes?: string;
    isDone?: boolean;
    parentId?: string | null;
    timeEstimate?: number;
  };
}

export interface BatchTaskUpdate {
  type: 'update';
  taskId: string;
  updates: {
    title?: string;
    notes?: string;
    isDone?: boolean;
    parentId?: string | null;
    timeEstimate?: number;
  };
}

export interface BatchTaskDelete {
  type: 'delete';
  taskId: string;
}

export interface BatchTaskReorder {
  type: 'reorder';
  taskIds: string[];
}

export type BatchOperation =
  | BatchTaskCreate
  | BatchTaskUpdate
  | BatchTaskDelete
  | BatchTaskReorder;

export interface BatchUpdateResult {
  success: boolean;
  createdTaskIds: { [tempId: string]: string };
  errors?: Array<{
    operationIndex: number;
    type: string;
    message: string;
  }>;
}

export interface SPTask {
  id: string;
  title: string;
  isDone: boolean;
  notes?: string;
  parentId?: string;
  subTaskIds: string[];
  projectId: string;
}

/**
 * Pure function to build batch operations from markdown and SP tasks
 * This separates the business logic from the API calls
 */
export const buildBatchOperations = (
  mdTasks: ParsedTask[],
  spTasks: SPTask[],
  generateTempId: () => string,
): {
  operations: BatchOperation[];
  tempIdMap: Map<string, string>;
  taskLineToTempId: Map<number, string>;
  mdIdToLine: Map<string, number>;
} => {
  // Build maps for quick lookups
  const spById = new Map<string, SPTask>();
  spTasks.forEach((task) => {
    spById.set(task.id, task);
  });

  const operations: BatchOperation[] = [];
  const tempIdMap = new Map<string, string>();
  const taskLineToTempId = new Map<number, string>();
  const mdIdToLine = new Map<string, number>();

  // Process each markdown task
  mdTasks.forEach((mdTask) => {
    mdIdToLine.set(mdTask.id || `line-${mdTask.line}`, mdTask.line);

    if (mdTask.id) {
      const spTask = spById.get(mdTask.id);

      if (spTask) {
        // Task exists - check for updates
        const updates: any = {};
        if (spTask.title !== mdTask.title) {
          updates.title = mdTask.title;
        }
        if (spTask.isDone !== mdTask.completed) {
          updates.isDone = mdTask.completed;
        }

        if (Object.keys(updates).length > 0) {
          operations.push({
            type: 'update',
            taskId: spTask.id,
            updates,
          });
        }
      } else {
        console.warn(`Orphaned task with ID ${mdTask.id}: "${mdTask.title}"`);
      }
    } else {
      // New task - create it
      const tempId = generateTempId();
      taskLineToTempId.set(mdTask.line, tempId);

      operations.push({
        type: 'create',
        tempId,
        data: {
          title: mdTask.title,
          isDone: mdTask.completed,
          parentId: mdTask.parentId,
        },
      });
    }
  });

  // Check for tasks to delete
  const mdIds = new Set(mdTasks.filter((t) => t.id).map((t) => t.id));
  spTasks.forEach((spTask) => {
    if (!mdIds.has(spTask.id)) {
      operations.push({
        type: 'delete',
        taskId: spTask.id,
      });
    }
  });

  return { operations, tempIdMap, taskLineToTempId, mdIdToLine };
};

/**
 * Build ID update queue for delayed writing
 */
export const buildIdUpdateQueue = (
  createdTaskIds: { [tempId: string]: string },
  tempIdMap: Map<string, string>,
  mdIdToLine: Map<string, number>,
  mdTasks: ParsedTask[],
): Array<{
  tempId: string;
  actualId: string;
  mdId: string;
  line: number;
  task: { indent: number; completed: boolean; title: string };
}> => {
  const pendingUpdates: Array<{
    tempId: string;
    actualId: string;
    mdId: string;
    line: number;
    task: { indent: number; completed: boolean; title: string };
  }> = [];

  for (const [tempId, actualId] of Object.entries(createdTaskIds)) {
    const mdId = [...tempIdMap.entries()].find(([, tid]) => tid === tempId)?.[0];
    if (mdId) {
      const line = mdIdToLine.get(mdId);
      if (line !== undefined) {
        const task = mdTasks.find((t) => t.line === line);
        if (task) {
          pendingUpdates.push({
            tempId,
            actualId,
            mdId,
            line,
            task: {
              indent: task.indent,
              completed: task.completed,
              title: task.title,
            },
          });
        }
      }
    }
  }

  return pendingUpdates;
};
