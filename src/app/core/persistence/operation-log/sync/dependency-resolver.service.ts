import { Injectable, inject } from '@angular/core';
import { Operation, EntityType, extractActionPayload } from '../operation.types';
import { Store } from '@ngrx/store';
import { selectTaskEntities } from '../../../../features/tasks/store/task.selectors';
import {
  selectProjectFeatureState,
  selectEntities as selectProjectEntitiesFromAdapter,
} from '../../../../features/project/store/project.reducer';
import {
  selectTagFeatureState,
  selectEntities as selectTagEntitiesFromAdapter,
} from '../../../../features/tag/store/tag.reducer';
import {
  selectNoteFeatureState,
  selectEntities as selectNoteEntitiesFromAdapter,
} from '../../../../features/note/store/note.reducer';
import {
  selectMetricFeatureState,
  selectEntities as selectMetricEntitiesFromAdapter,
} from '../../../../features/metric/store/metric.selectors';
import {
  selectSimpleCounterFeatureState,
  selectEntities as selectSimpleCounterEntitiesFromAdapter,
} from '../../../../features/simple-counter/store/simple-counter.reducer';
import { firstValueFrom } from 'rxjs';
import { createSelector, MemoizedSelector } from '@ngrx/store';
import { Dictionary } from '@ngrx/entity';

/**
 * Registry of entity dictionary selectors for bulk lookups.
 * To add a new entity type, simply add its selector here.
 * Entity types not in this registry are assumed to be singleton/aggregate types
 * that always exist (e.g., GLOBAL_CONFIG, PLANNER).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDictionarySelector = MemoizedSelector<object, Dictionary<any>>;

const ENTITY_SELECTORS: Partial<Record<EntityType, AnyDictionarySelector>> = {
  TASK: selectTaskEntities,
  PROJECT: createSelector(selectProjectFeatureState, selectProjectEntitiesFromAdapter),
  TAG: createSelector(selectTagFeatureState, selectTagEntitiesFromAdapter),
  NOTE: createSelector(selectNoteFeatureState, selectNoteEntitiesFromAdapter),
  METRIC: createSelector(selectMetricFeatureState, selectMetricEntitiesFromAdapter),
  SIMPLE_COUNTER: createSelector(
    selectSimpleCounterFeatureState,
    selectSimpleCounterEntitiesFromAdapter,
  ),
};

export interface OperationDependency {
  entityType: EntityType;
  entityId: string;
  mustExist: boolean;
  relation: 'parent' | 'reference';
}

/** Payload shape for task operations that may have dependencies */
interface TaskOperationPayload {
  projectId?: string;
  parentId?: string;
  tagIds?: string[];
  subTaskIds?: string[];
}

/** Payload shape for note operations that may have dependencies */
interface NoteOperationPayload {
  projectId?: string;
}

/** Payload shape for tag operations that may have dependencies */
interface TagOperationPayload {
  taskIds?: string[];
  // For updateTag action, taskIds are nested in tag.changes
  tag?: {
    id?: string;
    changes?: {
      taskIds?: string[];
    };
  };
}

@Injectable({ providedIn: 'root' })
export class DependencyResolverService {
  private store = inject(Store);

  /**
   * Identifies dependencies for a given operation.
   */
  extractDependencies(op: Operation): OperationDependency[] {
    const deps: OperationDependency[] = [];

    // Extract actionPayload for both multi-entity and legacy payloads
    const actionPayload = extractActionPayload(op.payload);

    if (op.entityType === 'TASK') {
      const payload = actionPayload as TaskOperationPayload;
      if (payload.projectId) {
        deps.push({
          entityType: 'PROJECT',
          entityId: payload.projectId,
          mustExist: false, // Soft dependency (Task can exist without project, or orphaned)
          relation: 'reference',
        });
      }
      if (payload.parentId) {
        deps.push({
          entityType: 'TASK',
          entityId: payload.parentId,
          mustExist: true, // Hard dependency (Subtask needs parent)
          relation: 'parent',
        });
      }
      // SubTaskIds are soft dependencies - parent task references children
      // We want subtasks to be created before parent updates that reference them
      if (payload.subTaskIds?.length) {
        for (const subTaskId of payload.subTaskIds) {
          deps.push({
            entityType: 'TASK',
            entityId: subTaskId,
            mustExist: false, // Soft dependency (prefer subtask exists, but don't block)
            relation: 'reference',
          });
        }
      }
      // Tags are soft dependencies, we usually ignore if missing or handle in reducer
    }

    if (op.entityType === 'NOTE') {
      const notePayload = actionPayload as NoteOperationPayload;
      if (notePayload.projectId) {
        deps.push({
          entityType: 'PROJECT',
          entityId: notePayload.projectId,
          mustExist: false, // Soft dependency (Note can exist without project)
          relation: 'reference',
        });
      }
    }

    if (op.entityType === 'TAG') {
      const tagPayload = actionPayload as TagOperationPayload;
      // Tag -> Task is a soft dependency. We want tasks to be created before
      // tag updates that reference them, to avoid the tag-shared.reducer
      // filtering out "non-existent" taskIds during sync.
      // Also ensures DELETE operations for tasks wait until after this tag update.

      // Handle both direct taskIds (addTag) and nested taskIds (updateTag)
      const taskIds = tagPayload.taskIds || tagPayload.tag?.changes?.taskIds;

      if (taskIds?.length) {
        for (const taskId of taskIds) {
          deps.push({
            entityType: 'TASK',
            entityId: taskId,
            mustExist: false, // Soft dependency (prefer task exists, but don't block)
            relation: 'reference',
          });
        }
      }
    }

    // SIMPLE_COUNTER, METRIC - typically don't have hard dependencies
    // PROJECT - typically independent unless nested structure is used

    return deps;
  }

  /**
   * Checks if dependencies are met in the current store state.
   * Uses bulk entity lookups to avoid N+1 selector subscriptions.
   */
  async checkDependencies(deps: OperationDependency[]): Promise<{
    missing: OperationDependency[];
  }> {
    if (deps.length === 0) {
      return { missing: [] };
    }

    // Group dependencies by entity type
    const depsByType = new Map<EntityType, OperationDependency[]>();
    for (const dep of deps) {
      const list = depsByType.get(dep.entityType) || [];
      list.push(dep);
      depsByType.set(dep.entityType, list);
    }

    // Fetch entity dictionaries only for types we need (single selector call per type)
    const entityDicts = await this.getEntityDictionaries(depsByType);

    // Check all dependencies against the fetched dictionaries
    const missing: OperationDependency[] = [];
    for (const dep of deps) {
      const dict = entityDicts.get(dep.entityType);
      // If we have a dictionary for this type, check it.
      // Entity types without selectors (singleton/aggregate) are assumed to exist.
      if (dict !== undefined && !dict[dep.entityId]) {
        missing.push(dep);
      }
    }

    return { missing };
  }

  /**
   * Fetches entity dictionaries for the requested entity types.
   * Only makes one selector call per entity type, regardless of how many entities are checked.
   */
  private async getEntityDictionaries(
    depsByType: Map<EntityType, OperationDependency[]>,
  ): Promise<Map<EntityType, Dictionary<unknown> | undefined>> {
    const result = new Map<EntityType, Dictionary<unknown> | undefined>();
    const promises: Promise<void>[] = [];

    for (const entityType of depsByType.keys()) {
      const selector = ENTITY_SELECTORS[entityType];
      if (selector) {
        promises.push(
          firstValueFrom(this.store.select(selector)).then((dict) => {
            result.set(entityType, dict);
          }),
        );
      }
      // Entity types not in ENTITY_SELECTORS are singleton/aggregate - assumed to exist
    }

    await Promise.all(promises);
    return result;
  }
}
