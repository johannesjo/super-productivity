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

export const getTag = (state: RootState, tagId: string): Tag =>
  state[TAG_FEATURE_NAME].entities[tagId] as Tag;

export const getProject = (state: RootState, projectId: string): Project =>
  state[PROJECT_FEATURE_NAME].entities[projectId] as Project;

// =============================================================================
// LIST MANIPULATION HELPERS
// =============================================================================

export const addTaskToList = (
  taskIds: string[],
  taskId: string,
  isAddToBottom: boolean,
): string[] => (isAddToBottom ? [...taskIds, taskId] : [taskId, ...taskIds]);

export const removeTasksFromList = (taskIds: string[], toRemove: string[]): string[] =>
  taskIds.filter((id) => !toRemove.includes(id));
