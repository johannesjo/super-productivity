import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { EntityAdapter } from '@ngrx/entity';
import { RootState } from '../../root-state';
import { EntityType } from '../../../op-log/core/operation.types';
import { getEntityConfig, isAdapterEntity } from '../../../op-log/core/entity-registry';
import {
  PROJECT_FEATURE_NAME,
  projectAdapter,
} from '../../../features/project/store/project.reducer';
import { Project } from '../../../features/project/project.model';
import { TAG_FEATURE_NAME, tagAdapter } from '../../../features/tag/store/tag.reducer';
import { Tag } from '../../../features/tag/tag.model';
import { unique } from '../../../util/unique';

/**
 * Regex to match LWW Update action types.
 * Matches patterns like '[TASK] LWW Update', '[PROJECT] LWW Update', etc.
 */
const LWW_UPDATE_REGEX = /^\[([A-Z_]+)\] LWW Update$/;

/**
 * Updates project.taskIds arrays when a task's projectId changes via LWW Update.
 *
 * When LWW conflict resolution updates a task's projectId, we must also update
 * the corresponding project.taskIds arrays to maintain bidirectional consistency:
 * - Remove task from old project's taskIds (if it exists there)
 * - Add task to new project's taskIds (if not already there)
 *
 * This is necessary because the original moveToOtherProject action updates both
 * the task and project entities atomically, but LWW Update only syncs the TASK
 * entity state.
 */
const syncProjectTaskIds = (
  state: RootState,
  taskId: string,
  oldProjectId: string | undefined,
  newProjectId: string | undefined,
  isSubTask: boolean,
): RootState => {
  // Don't add subtasks to project.taskIds - only parent tasks should be there
  if (isSubTask) {
    return state;
  }

  // If projectId didn't change, nothing to do
  if (oldProjectId === newProjectId) {
    return state;
  }

  let projectState = state[PROJECT_FEATURE_NAME];

  // Remove from old project's taskIds
  if (oldProjectId && projectState.entities[oldProjectId]) {
    const oldProject = projectState.entities[oldProjectId] as Project;
    const filteredTaskIds = oldProject.taskIds.filter((id) => id !== taskId);
    const filteredBacklogTaskIds = oldProject.backlogTaskIds.filter(
      (id) => id !== taskId,
    );

    // Only update if the task was actually in the list
    if (
      filteredTaskIds.length !== oldProject.taskIds.length ||
      filteredBacklogTaskIds.length !== oldProject.backlogTaskIds.length
    ) {
      projectState = projectAdapter.updateOne(
        {
          id: oldProjectId,
          changes: {
            taskIds: filteredTaskIds,
            backlogTaskIds: filteredBacklogTaskIds,
          },
        },
        projectState,
      );
    }
  }

  // Add to new project's taskIds
  if (newProjectId && projectState.entities[newProjectId]) {
    const newProject = projectState.entities[newProjectId] as Project;
    // Only add if not already present
    if (!newProject.taskIds.includes(taskId)) {
      projectState = projectAdapter.updateOne(
        {
          id: newProjectId,
          changes: {
            taskIds: unique([...newProject.taskIds, taskId]),
          },
        },
        projectState,
      );
    }
  }

  return {
    ...state,
    [PROJECT_FEATURE_NAME]: projectState,
  };
};

/**
 * Updates tag.taskIds arrays when a task's tagIds changes via LWW Update.
 *
 * When LWW conflict resolution updates a task's tagIds, we must also update
 * the corresponding tag.taskIds arrays to maintain bidirectional consistency:
 * - Remove task from tags that were removed from the task's tagIds
 * - Add task to tags that were added to the task's tagIds
 *
 * This is necessary because the original updateTags action updates both
 * the task and tag entities atomically, but LWW Update only syncs the TASK
 * entity state.
 */
const syncTagTaskIds = (
  state: RootState,
  taskId: string,
  oldTagIds: string[],
  newTagIds: string[],
): RootState => {
  // Find tags that were removed and added
  const oldTagSet = new Set(oldTagIds);
  const newTagSet = new Set(newTagIds);

  const removedTags = oldTagIds.filter((id) => !newTagSet.has(id));
  const addedTags = newTagIds.filter((id) => !oldTagSet.has(id));

  // If no changes, nothing to do
  if (removedTags.length === 0 && addedTags.length === 0) {
    return state;
  }

  let tagState = state[TAG_FEATURE_NAME];

  // Remove task from removed tags' taskIds
  for (const tagId of removedTags) {
    if (tagState.entities[tagId]) {
      const tag = tagState.entities[tagId] as Tag;
      if (tag.taskIds.includes(taskId)) {
        tagState = tagAdapter.updateOne(
          {
            id: tagId,
            changes: {
              taskIds: tag.taskIds.filter((id) => id !== taskId),
            },
          },
          tagState,
        );
      }
    }
  }

  // Add task to added tags' taskIds
  for (const tagId of addedTags) {
    if (tagState.entities[tagId]) {
      const tag = tagState.entities[tagId] as Tag;
      if (!tag.taskIds.includes(taskId)) {
        tagState = tagAdapter.updateOne(
          {
            id: tagId,
            changes: {
              taskIds: unique([...tag.taskIds, taskId]),
            },
          },
          tagState,
        );
      }
    }
  }

  return {
    ...state,
    [TAG_FEATURE_NAME]: tagState,
  };
};

/**
 * Meta-reducer that handles LWW (Last-Write-Wins) Update actions.
 *
 * When a LWW conflict is resolved and local state wins, a `[ENTITY_TYPE] LWW Update`
 * operation is created and synced to other clients. This meta-reducer applies those
 * operations by REPLACING the entire entity with the winning state.
 *
 * Unlike regular update actions that merge changes, LWW Update replaces the entity
 * entirely because it represents the "winning" state after conflict resolution.
 *
 * The action payload has entity fields spread at the top level:
 * ```
 * {
 *   type: '[TASK] LWW Update',
 *   id: 'xxx',
 *   title: 'Winning title',
 *   ... other entity fields
 *   meta: { isPersistent: true, ... }
 * }
 * ```
 */
export const lwwUpdateMetaReducer: MetaReducer = (
  reducer: ActionReducer<any, Action>,
) => {
  return (state: unknown, action: Action) => {
    if (!state) return reducer(state, action);

    const match = action.type.match(LWW_UPDATE_REGEX);
    if (!match) {
      // Not an LWW Update action, pass through
      return reducer(state, action);
    }

    const entityType = match[1] as EntityType;
    const config = getEntityConfig(entityType);

    if (!config || !isAdapterEntity(config)) {
      console.warn(
        `lwwUpdateMetaReducer: Unknown or non-adapter entity type: ${entityType}`,
      );
      return reducer(state, action);
    }

    const { featureName, adapter } = config;
    if (!featureName || !adapter) {
      console.warn(
        `lwwUpdateMetaReducer: Missing featureName or adapter for: ${entityType}`,
      );
      return reducer(state, action);
    }

    const rootState = state as RootState;
    const featureState = rootState[featureName as keyof RootState];

    if (!featureState) {
      console.warn(`lwwUpdateMetaReducer: Feature state not found: ${featureName}`);
      return reducer(state, action);
    }

    // Extract entity data from action (exclude 'type' and 'meta')
    const actionAny = action as unknown as Record<string, unknown>;
    const entityData: Record<string, unknown> = {};
    for (const key of Object.keys(actionAny)) {
      if (key !== 'type' && key !== 'meta') {
        entityData[key] = actionAny[key];
      }
    }

    if (!entityData['id']) {
      console.warn('lwwUpdateMetaReducer: Entity data has no id');
      return reducer(state, action);
    }

    const entityId = entityData['id'] as string;
    const existingEntity = (featureState as any).entities?.[entityId];

    let updatedFeatureState;

    if (!existingEntity) {
      // Entity was deleted locally but UPDATE won via LWW.
      // This means another client's update beat our delete, so we need to
      // recreate the entity with the winning state.
      console.log(
        `lwwUpdateMetaReducer: Entity ${entityType}:${entityId} not found, recreating from LWW update`,
      );
      updatedFeatureState = (adapter as EntityAdapter<any>).addOne(
        {
          ...entityData,
          modified: Date.now(),
        } as any,
        featureState as any,
      );
    } else {
      // Entity exists - replace it entirely with the LWW winning state
      // Use updateOne with all fields as changes to preserve adapter behavior
      updatedFeatureState = (adapter as EntityAdapter<any>).updateOne(
        {
          id: entityId,
          changes: {
            ...entityData,
            modified: Date.now(), // Update modified timestamp
          },
        },
        featureState as any,
      );
    }

    let updatedState: RootState = {
      ...rootState,
      [featureName]: updatedFeatureState,
    };

    // For TASK entities, sync related entities when relationships change
    if (entityType === 'TASK') {
      // Sync project.taskIds when projectId changes
      const oldProjectId = existingEntity?.projectId as string | undefined;
      const newProjectId = entityData['projectId'] as string | undefined;
      const isSubTask = !!(entityData['parentId'] || existingEntity?.parentId);

      updatedState = syncProjectTaskIds(
        updatedState,
        entityId,
        oldProjectId,
        newProjectId,
        isSubTask,
      );

      // Sync tag.taskIds when tagIds changes
      const oldTagIds = (existingEntity?.tagIds as string[]) || [];
      const newTagIds = (entityData['tagIds'] as string[]) || [];

      updatedState = syncTagTaskIds(updatedState, entityId, oldTagIds, newTagIds);
    }

    return reducer(updatedState, action);
  };
};
