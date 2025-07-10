import { Action } from '@ngrx/store';
import { Task, DEFAULT_TASK } from '../../../features/tasks/task.model';
import { TaskSharedActions } from '../task-shared.actions';

import { taskAdapter } from '../../../features/tasks/store/task.adapter';
import { TASK_FEATURE_NAME } from '../../../features/tasks/store/task.reducer';
import {
  PROJECT_FEATURE_NAME,
  projectAdapter,
} from '../../../features/project/store/project.reducer';
import { TAG_FEATURE_NAME } from '../../../features/tag/store/tag.reducer';
import { nanoid } from 'nanoid';
import { Tag } from '../../../features/tag/tag.model';
import { RootState } from '../../root-state';
import {
  BatchOperation,
  BatchTaskCreate,
  BatchTaskDelete,
  BatchTaskReorder,
  BatchTaskUpdate,
} from '@super-productivity/plugin-api';

/**
 * Meta reducer for handling batch updates to tasks within a project
 * This reducer processes all operations in a single state update for efficiency
 */
export const taskBatchUpdateMetaReducer = (
  reducer: any,
): ((state: any, action: any) => any) => {
  return (state: any, action: Action) => {
    if (action.type === TaskSharedActions.batchUpdateForProject.type) {
      const { projectId, operations, createdTaskIds } = action as ReturnType<
        typeof TaskSharedActions.batchUpdateForProject
      >;

      // Ensure state has required properties
      if (!state[TASK_FEATURE_NAME] || !state[PROJECT_FEATURE_NAME]) {
        console.error('taskBatchUpdateMetaReducer: Missing required state properties');
        return reducer(state, action);
      }

      // Validate project exists
      if (!state[PROJECT_FEATURE_NAME].entities[projectId]) {
        console.error(`taskBatchUpdateMetaReducer: Project ${projectId} not found`);
        return reducer(state, action);
      }

      let newState = { ...state } as RootState;
      const tasksToAdd: Task[] = [];
      const tasksToUpdate: { id: string; changes: Partial<Task> }[] = [];
      const taskIdsToDelete: string[] = [];
      let newTaskOrder: string[] | null = null;

      // Process each operation
      operations.forEach((op: BatchOperation) => {
        switch (op.type) {
          case 'create': {
            const createOp = op as BatchTaskCreate;
            const actualId = createdTaskIds[createOp.tempId] || nanoid();

            // Resolve parent ID if it's a temp ID (convert null to undefined)
            let parentId = createOp.data.parentId || undefined;
            if (
              parentId &&
              (parentId.startsWith('temp-') || parentId.startsWith('temp_'))
            ) {
              parentId = createdTaskIds[parentId] || parentId;
            }

            // Skip if circular dependency (task is its own parent)
            if (parentId === actualId) {
              console.warn(`Skipping task with circular dependency: ${actualId}`);
              break;
            }

            // Skip if title is empty
            if (!createOp.data.title || createOp.data.title.trim() === '') {
              console.warn(`Skipping task with empty title: ${actualId}`);
              break;
            }

            const newTask: Task = {
              ...DEFAULT_TASK,
              id: actualId,
              projectId,
              title: createOp.data.title || '',
              isDone: createOp.data.isDone || false,
              notes: createOp.data.notes || '',
              parentId,
              timeEstimate: createOp.data.timeEstimate || 0,
              created: Date.now(),
            };

            tasksToAdd.push(newTask);

            // Update parent task's subTaskIds if needed
            if (
              parentId &&
              !parentId.startsWith('temp-') &&
              !parentId.startsWith('temp_')
            ) {
              tasksToUpdate.push({
                id: parentId,
                changes: {
                  subTaskIds: [
                    ...(newState[TASK_FEATURE_NAME].entities[parentId]?.subTaskIds || []),
                    actualId,
                  ],
                },
              });
            }
            break;
          }

          case 'update': {
            const updateOp = op as BatchTaskUpdate;

            // Skip if task doesn't exist
            if (!newState[TASK_FEATURE_NAME].entities[updateOp.taskId]) {
              console.warn(`Skipping update for non-existent task: ${updateOp.taskId}`);
              break;
            }

            const updates: any = {};

            if (updateOp.updates.title !== undefined) {
              updates.title = updateOp.updates.title;
            }
            if (updateOp.updates.notes !== undefined) {
              updates.notes = updateOp.updates.notes;
            }
            if (updateOp.updates.isDone !== undefined) {
              updates.isDone = updateOp.updates.isDone;
            }
            if (updateOp.updates.timeEstimate !== undefined) {
              updates.timeEstimate = updateOp.updates.timeEstimate;
            }
            if (updateOp.updates.subTaskIds !== undefined) {
              // Handle direct subTaskIds updates (for reordering subtasks)
              updates.subTaskIds = updateOp.updates.subTaskIds;
            }
            if (updateOp.updates.parentId !== undefined) {
              // Handle parent ID changes (moving subtasks)
              const oldTask = newState[TASK_FEATURE_NAME].entities[updateOp.taskId];
              if (oldTask) {
                // Remove from old parent
                if (oldTask.parentId) {
                  const oldParent =
                    newState[TASK_FEATURE_NAME].entities[oldTask.parentId];
                  if (oldParent) {
                    tasksToUpdate.push({
                      id: oldTask.parentId,
                      changes: {
                        subTaskIds: oldParent.subTaskIds.filter(
                          (id) => id !== updateOp.taskId,
                        ),
                      },
                    });
                  }
                }

                // Add to new parent (convert null to undefined)
                let newParentId = updateOp.updates.parentId || undefined;
                if (
                  newParentId &&
                  (newParentId.startsWith('temp-') || newParentId.startsWith('temp_'))
                ) {
                  newParentId = createdTaskIds[newParentId] || newParentId;
                }

                if (newParentId) {
                  const newParent = newState[TASK_FEATURE_NAME].entities[newParentId];
                  if (newParent) {
                    tasksToUpdate.push({
                      id: newParentId,
                      changes: {
                        subTaskIds: [...newParent.subTaskIds, updateOp.taskId],
                      },
                    });
                  }
                }

                updates.parentId = newParentId;
              }
            }

            if (Object.keys(updates).length > 0) {
              tasksToUpdate.push({
                id: updateOp.taskId,
                changes: updates,
              });
            }
            break;
          }

          case 'delete': {
            const deleteOp = op as BatchTaskDelete;

            // Skip if task doesn't exist
            if (!newState[TASK_FEATURE_NAME].entities[deleteOp.taskId]) {
              console.warn(`Skipping delete for non-existent task: ${deleteOp.taskId}`);
              break;
            }

            taskIdsToDelete.push(deleteOp.taskId);

            // Remove from parent's subTaskIds
            const taskToDelete = newState[TASK_FEATURE_NAME].entities[deleteOp.taskId];
            if (taskToDelete?.parentId) {
              const parent = newState[TASK_FEATURE_NAME].entities[taskToDelete.parentId];
              if (parent) {
                tasksToUpdate.push({
                  id: taskToDelete.parentId,
                  changes: {
                    subTaskIds: parent.subTaskIds.filter((id) => id !== deleteOp.taskId),
                  },
                });
              }
            }

            // Delete subtasks recursively
            if (taskToDelete?.subTaskIds?.length) {
              taskIdsToDelete.push(...taskToDelete.subTaskIds);
            }
            break;
          }

          case 'reorder': {
            const reorderOp = op as BatchTaskReorder;
            // Resolve temp IDs in the order array
            newTaskOrder = reorderOp.taskIds.map((id) => {
              if (id.startsWith('temp-') || id.startsWith('temp_')) {
                return createdTaskIds[id] || id;
              }
              return id;
            });
            break;
          }
        }
      });

      // Apply all task changes
      if (tasksToAdd.length > 0) {
        newState[TASK_FEATURE_NAME] = taskAdapter.addMany(
          tasksToAdd,
          newState[TASK_FEATURE_NAME],
        );
      }
      if (tasksToUpdate.length > 0) {
        newState[TASK_FEATURE_NAME] = taskAdapter.updateMany(
          tasksToUpdate,
          newState[TASK_FEATURE_NAME],
        );
      }
      if (taskIdsToDelete.length > 0) {
        newState[TASK_FEATURE_NAME] = taskAdapter.removeMany(
          taskIdsToDelete,
          newState[TASK_FEATURE_NAME],
        );

        // Comprehensive cleanup: Remove deleted task IDs from all remaining tasks' subTaskIds
        const deletedTaskIdsSet = new Set(taskIdsToDelete);
        const additionalUpdates: { id: string; changes: Partial<Task> }[] = [];

        Object.values(newState[TASK_FEATURE_NAME].entities).forEach((task) => {
          if (task && task.subTaskIds && task.subTaskIds.length > 0) {
            const cleanedSubTaskIds = task.subTaskIds.filter(
              (subTaskId) => !deletedTaskIdsSet.has(subTaskId),
            );

            // Only update if the array actually changed
            if (cleanedSubTaskIds.length !== task.subTaskIds.length) {
              additionalUpdates.push({
                id: task.id,
                changes: { subTaskIds: cleanedSubTaskIds },
              });
            }
          }
        });

        // Apply additional cleanup updates if needed
        if (additionalUpdates.length > 0) {
          newState[TASK_FEATURE_NAME] = taskAdapter.updateMany(
            additionalUpdates,
            newState[TASK_FEATURE_NAME],
          );
        }
      }

      // Apply comprehensive data validation and consistency fixes
      newState = validateAndFixDataConsistency(
        newState,
        projectId,
        tasksToAdd,
        tasksToUpdate,
        taskIdsToDelete,
        newTaskOrder,
      );

      return reducer(newState, action);
    }

    return reducer(state, action);
  };
};

/**
 * Validates and fixes data consistency across tasks, projects, and tags
 * Ensures bidirectional consistency: project.taskIds ↔ task.projectId, tag.taskIds ↔ task.tagIds
 */
const validateAndFixDataConsistency = (
  state: RootState,
  projectId: string,
  tasksToAdd: Task[],
  tasksToUpdate: { id: string; changes: Partial<Task> }[],
  taskIdsToDelete: string[],
  newTaskOrder: string[] | null,
): RootState => {
  // eslint-disable-next-line prefer-const
  let newState = { ...state };

  // Get all affected task IDs for validation
  const deletedTaskIds = new Set(taskIdsToDelete);

  // Build current task state after all operations
  const allCurrentTasks = new Map<string, Task>();

  // Add existing tasks that weren't deleted
  Object.values(newState[TASK_FEATURE_NAME].entities).forEach((task) => {
    if (task && !deletedTaskIds.has(task.id)) {
      allCurrentTasks.set(task.id, { ...task });
    }
  });

  // Apply updates to existing tasks
  tasksToUpdate.forEach((update) => {
    const existingTask = allCurrentTasks.get(update.id);
    if (existingTask) {
      allCurrentTasks.set(update.id, { ...existingTask, ...update.changes });
    }
  });

  // Add new tasks
  tasksToAdd.forEach((task) => {
    allCurrentTasks.set(task.id, task);
  });

  // =========================================================================
  // 1. PROJECT CONSISTENCY: Validate project.taskIds ↔ task.projectId
  // =========================================================================

  const project = newState[PROJECT_FEATURE_NAME].entities[projectId];
  if (project) {
    // Get all tasks that should belong to this project
    const projectTaskIds = Array.from(allCurrentTasks.values())
      .filter((task) => task.projectId === projectId && !task.parentId) // Only root tasks
      .map((task) => task.id);

    // Apply reordering if specified
    let finalTaskIds = projectTaskIds;
    if (newTaskOrder) {
      // Start with the specified order
      const orderedIds = newTaskOrder.filter((id) => projectTaskIds.includes(id));
      // Add any missing tasks at the end
      const remainingIds = projectTaskIds.filter((id) => !newTaskOrder.includes(id));
      finalTaskIds = [...orderedIds, ...remainingIds];
    }

    // Update project with validated task list
    newState[PROJECT_FEATURE_NAME] = projectAdapter.updateOne(
      {
        id: projectId,
        changes: { taskIds: finalTaskIds },
      },
      newState[PROJECT_FEATURE_NAME],
    );
  }

  // =========================================================================
  // 2. TAG CONSISTENCY: Validate tag.taskIds ↔ task.tagIds
  // =========================================================================

  // Collect all tags that need updating
  const tagsToUpdate = new Map<string, Set<string>>();

  // Initialize with existing tag task lists
  Object.values(newState[TAG_FEATURE_NAME].entities).forEach((tag) => {
    if (tag) {
      const currentTaskIds = tag.taskIds || [];
      tagsToUpdate.set(
        tag.id,
        new Set(currentTaskIds.filter((id) => !deletedTaskIds.has(id))),
      );
    }
  });

  // Update tag memberships based on task.tagIds
  allCurrentTasks.forEach((task) => {
    if (task.tagIds && task.tagIds.length > 0) {
      task.tagIds.forEach((tagId) => {
        // Ensure tag exists
        if (newState[TAG_FEATURE_NAME].entities[tagId]) {
          if (!tagsToUpdate.has(tagId)) {
            tagsToUpdate.set(tagId, new Set());
          }
          tagsToUpdate.get(tagId)!.add(task.id);
        }
      });
    }
  });

  // Apply tag updates
  const tagUpdates: { id: string; changes: Partial<Tag> }[] = [];
  tagsToUpdate.forEach((taskIds, tagId) => {
    const currentTag = newState[TAG_FEATURE_NAME].entities[tagId];
    if (currentTag) {
      const newTaskIds = Array.from(taskIds);
      const currentTaskIds = currentTag.taskIds || [];

      // Only update if the task list actually changed
      if (
        JSON.stringify([...currentTaskIds].sort()) !==
        JSON.stringify([...newTaskIds].sort())
      ) {
        tagUpdates.push({
          id: tagId,
          changes: { taskIds: newTaskIds },
        });
      }
    }
  });

  if (tagUpdates.length > 0) {
    newState[TAG_FEATURE_NAME] = {
      ...newState[TAG_FEATURE_NAME],
      entities: {
        ...newState[TAG_FEATURE_NAME].entities,
      },
    };

    tagUpdates.forEach((update) => {
      newState[TAG_FEATURE_NAME].entities[update.id] = {
        ...newState[TAG_FEATURE_NAME].entities[update.id]!,
        ...update.changes,
      };
    });
  }

  // =========================================================================
  // 3. PARENT-CHILD CONSISTENCY: Validate parent.subTaskIds ↔ child.parentId
  // =========================================================================

  const parentChildUpdates: { id: string; changes: Partial<Task> }[] = [];
  const parentsToUpdate = new Map<string, Set<string>>();

  // Collect all parent-child relationships
  allCurrentTasks.forEach((task) => {
    if (task.parentId && allCurrentTasks.has(task.parentId)) {
      if (!parentsToUpdate.has(task.parentId)) {
        parentsToUpdate.set(task.parentId, new Set());
      }
      parentsToUpdate.get(task.parentId)!.add(task.id);
    }
  });

  // Update parent tasks with correct subTaskIds
  parentsToUpdate.forEach((subTaskIds, parentId) => {
    const parentTask = allCurrentTasks.get(parentId);
    if (parentTask) {
      const newSubTaskIds = Array.from(subTaskIds);
      const currentSubTaskIds = parentTask.subTaskIds || [];

      // Only update if the subtask list actually changed
      if (
        JSON.stringify([...currentSubTaskIds].sort()) !==
        JSON.stringify([...newSubTaskIds].sort())
      ) {
        parentChildUpdates.push({
          id: parentId,
          changes: { subTaskIds: newSubTaskIds },
        });
      }
    }
  });

  // Apply parent-child updates
  if (parentChildUpdates.length > 0) {
    newState[TASK_FEATURE_NAME] = taskAdapter.updateMany(
      parentChildUpdates,
      newState[TASK_FEATURE_NAME],
    );
  }

  // =========================================================================
  // 4. ORPHAN CLEANUP: Remove invalid references
  // =========================================================================

  // This is handled implicitly by the above validation steps:
  // - Tasks with invalid projectIds are not included in project.taskIds
  // - Tasks with invalid tagIds are not included in tag.taskIds
  // - Tasks with invalid parentIds are not included in parent.subTaskIds
  // - The entity adapters handle removing deleted tasks from collections

  return newState;
};
