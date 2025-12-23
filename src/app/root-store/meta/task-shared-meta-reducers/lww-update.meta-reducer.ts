import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { EntityAdapter } from '@ngrx/entity';
import { RootState } from '../../root-state';
import { EntityType } from '../../../core/persistence/operation-log/operation.types';
import {
  getEntityConfig,
  isAdapterEntity,
} from '../../../core/persistence/operation-log/entity-registry';

/**
 * Regex to match LWW Update action types.
 * Matches patterns like '[TASK] LWW Update', '[PROJECT] LWW Update', etc.
 */
const LWW_UPDATE_REGEX = /^\[([A-Z_]+)\] LWW Update$/;

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

    const updatedState: RootState = {
      ...rootState,
      [featureName]: updatedFeatureState,
    };

    return reducer(updatedState, action);
  };
};
