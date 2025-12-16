import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { EntityAdapter } from '@ngrx/entity';
import { RootState } from '../../root-state';
import {
  PROJECT_FEATURE_NAME,
  projectAdapter,
} from '../../../features/project/store/project.reducer';
import { TAG_FEATURE_NAME, tagAdapter } from '../../../features/tag/store/tag.reducer';
import {
  TASK_FEATURE_NAME,
  taskAdapter,
} from '../../../features/tasks/store/task.reducer';
import {
  adapter as simpleCounterAdapter,
  SIMPLE_COUNTER_FEATURE_NAME,
} from '../../../features/simple-counter/store/simple-counter.reducer';
import {
  adapter as taskRepeatCfgAdapter,
  TASK_REPEAT_CFG_FEATURE_NAME,
} from '../../../features/task-repeat-cfg/store/task-repeat-cfg.selectors';
import {
  adapter as noteAdapter,
  NOTE_FEATURE_NAME,
} from '../../../features/note/store/note.reducer';
import { EntityType } from '../../../core/persistence/operation-log/operation.types';

/**
 * Regex to match LWW Update action types.
 * Matches patterns like '[TASK] LWW Update', '[PROJECT] LWW Update', etc.
 */
const LWW_UPDATE_REGEX = /^\[([A-Z_]+)\] LWW Update$/;

/**
 * Map from entity type to feature name and adapter.
 * This allows us to handle LWW Update for all entity types generically.
 */
const ENTITY_CONFIG: Record<
  string,
  { featureName: string; adapter: EntityAdapter<any> }
> = {
  TASK: { featureName: TASK_FEATURE_NAME, adapter: taskAdapter },
  PROJECT: { featureName: PROJECT_FEATURE_NAME, adapter: projectAdapter },
  TAG: { featureName: TAG_FEATURE_NAME, adapter: tagAdapter },
  NOTE: { featureName: NOTE_FEATURE_NAME, adapter: noteAdapter },
  SIMPLE_COUNTER: {
    featureName: SIMPLE_COUNTER_FEATURE_NAME,
    adapter: simpleCounterAdapter,
  },
  TASK_REPEAT_CFG: {
    featureName: TASK_REPEAT_CFG_FEATURE_NAME,
    adapter: taskRepeatCfgAdapter,
  },
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
    const config = ENTITY_CONFIG[entityType];

    if (!config) {
      console.warn(`lwwUpdateMetaReducer: Unknown entity type: ${entityType}`);
      return reducer(state, action);
    }

    const rootState = state as RootState;
    const { featureName, adapter } = config;
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

    // Check if entity exists
    const entityId = entityData['id'] as string;
    const existingEntity = (featureState as any).entities?.[entityId];
    if (!existingEntity) {
      console.warn(
        `lwwUpdateMetaReducer: Entity ${entityType}:${entityId} not found, skipping update`,
      );
      return reducer(state, action);
    }

    // Replace the entity entirely with the LWW winning state
    // Use updateOne with all fields as changes to preserve adapter behavior
    const updatedFeatureState = adapter.updateOne(
      {
        id: entityId,
        changes: {
          ...entityData,
          modified: Date.now(), // Update modified timestamp
        },
      },
      featureState as any,
    );

    const updatedState: RootState = {
      ...rootState,
      [featureName]: updatedFeatureState,
    };

    return reducer(updatedState, action);
  };
};
