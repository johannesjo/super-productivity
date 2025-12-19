import { Update } from '@ngrx/entity';
import { RootState } from '../../root-state';
import { Tag } from '../../../features/tag/tag.model';
import { Project } from '../../../features/project/project.model';
import { Task } from '../../../features/tasks/task.model';
import {
  PROJECT_FEATURE_NAME,
  projectAdapter,
} from '../../../features/project/store/project.reducer';
import { TAG_FEATURE_NAME, tagAdapter } from '../../../features/tag/store/tag.reducer';

// =============================================================================
// TYPES
// =============================================================================

export type ProjectTaskList = 'backlogTaskIds' | 'taskIds';
export type TaskEntity = { id: string; projectId?: string | null; tagIds?: string[] };
export type TaskWithTags = Task & { tagIds: string[] };
export type ActionHandler = (state: RootState) => RootState;
export type ActionHandlerMap = Record<string, ActionHandler>;

// =============================================================================
// STATE UPDATE HELPERS
// =============================================================================

export const updateProject = (
  state: RootState,
  projectId: string,
  changes: Partial<Project>,
): RootState => ({
  ...state,
  [PROJECT_FEATURE_NAME]: projectAdapter.updateOne(
    { id: projectId, changes },
    state[PROJECT_FEATURE_NAME],
  ),
});

export const updateTags = (state: RootState, updates: Update<Tag>[]): RootState => ({
  ...state,
  [TAG_FEATURE_NAME]: tagAdapter.updateMany(updates, state[TAG_FEATURE_NAME]),
});

// =============================================================================
// ENTITY GETTERS
// =============================================================================

/**
 * Gets a tag entity from state. Throws if tag doesn't exist.
 * Callers should check existence before calling if tag may not exist.
 */
export const getTag = (state: RootState, tagId: string): Tag => {
  const tag = state[TAG_FEATURE_NAME].entities[tagId];
  if (!tag) {
    throw new Error(
      `Tag ${tagId} not found in state. This may indicate an out-of-order remote operation.`,
    );
  }
  return tag as Tag;
};

/**
 * Gets a tag entity from state, or undefined if it doesn't exist.
 * Use this when the tag may not exist (e.g., during remote sync).
 */
export const getTagOrUndefined = (state: RootState, tagId: string): Tag | undefined =>
  state[TAG_FEATURE_NAME].entities[tagId] as Tag | undefined;

/**
 * Gets a project entity from state. Throws if project doesn't exist.
 * Callers should check existence before calling if project may not exist.
 */
export const getProject = (state: RootState, projectId: string): Project => {
  const project = state[PROJECT_FEATURE_NAME].entities[projectId];
  if (!project) {
    throw new Error(
      `Project ${projectId} not found in state. This may indicate an out-of-order remote operation.`,
    );
  }
  return project as Project;
};

/**
 * Gets a project entity from state, or undefined if it doesn't exist.
 * Use this when the project may not exist (e.g., during remote sync).
 */
export const getProjectOrUndefined = (
  state: RootState,
  projectId: string,
): Project | undefined =>
  state[PROJECT_FEATURE_NAME].entities[projectId] as Project | undefined;

// =============================================================================
// LIST MANIPULATION HELPERS
// =============================================================================

export const addTaskToList = (
  taskIds: string[],
  taskId: string,
  isAddToBottom: boolean,
): string[] => (isAddToBottom ? [...taskIds, taskId] : [taskId, ...taskIds]);

export const removeTasksFromList = (taskIds: string[], toRemove: string[]): string[] => {
  // Use Set for O(1) lookup instead of O(n) Array.includes
  // This changes overall complexity from O(n*m) to O(n+m)
  const removeSet = new Set(toRemove);
  return taskIds.filter((id) => !removeSet.has(id));
};
