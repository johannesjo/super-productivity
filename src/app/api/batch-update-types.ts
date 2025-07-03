// Types for the batchUpdateForProject PluginAPI method

export interface BatchTaskCreate {
  type: 'create';
  tempId: string; // Temporary ID to reference in other operations
  data: {
    title: string;
    notes?: string;
    isDone?: boolean;
    parentId?: string | null; // Can reference tempId or existing task ID
    timeEstimate?: number;
  };
}

export interface BatchTaskUpdate {
  type: 'update';
  taskId: string; // Existing task ID
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
  taskId: string; // Existing task ID
}

export interface BatchTaskReorder {
  type: 'reorder';
  taskIds: string[]; // Can include tempIds for newly created tasks
}

export type BatchOperation =
  | BatchTaskCreate
  | BatchTaskUpdate
  | BatchTaskDelete
  | BatchTaskReorder;

export interface BatchUpdateRequest {
  projectId: string;
  operations: BatchOperation[];
}

export interface BatchUpdateResult {
  success: boolean;
  // Map temporary IDs to actual created task IDs
  createdTaskIds: { [tempId: string]: string };
  errors?: BatchUpdateError[];
}

export interface BatchUpdateError {
  operationIndex: number;
  type:
    | 'VALIDATION_ERROR'
    | 'CIRCULAR_DEPENDENCY'
    | 'TASK_NOT_FOUND'
    | 'OUTSIDE_PROJECT'
    | 'UNKNOWN';
  message: string;
}

// Validation rules for batch updates
export interface BatchUpdateValidation {
  // Maximum depth of task nesting
  maxNestingDepth?: number;
  // Whether to allow tasks to be moved outside the project
  enforceProjectBoundary?: boolean;
  // Whether to validate circular dependencies
  checkCircularDependencies?: boolean;
}
