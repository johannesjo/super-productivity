import { Injectable, inject } from '@angular/core';
import { Operation, EntityType } from '../operation.types';
import { Store } from '@ngrx/store';
import { selectTaskById } from '../../../../features/tasks/store/task.selectors';
import { selectProjectById } from '../../../../features/project/store/project.reducer';
import { selectTagById } from '../../../../features/tag/store/tag.reducer';
import { selectNoteById } from '../../../../features/note/store/note.reducer';
import { selectMetricById } from '../../../../features/metric/store/metric.selectors';
import { selectSimpleCounterById } from '../../../../features/simple-counter/store/simple-counter.reducer';
import { firstValueFrom } from 'rxjs';

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
}

@Injectable({ providedIn: 'root' })
export class DependencyResolverService {
  private store = inject(Store);

  /**
   * Identifies dependencies for a given operation.
   */
  extractDependencies(op: Operation): OperationDependency[] {
    const deps: OperationDependency[] = [];

    if (op.entityType === 'TASK') {
      const payload = op.payload as TaskOperationPayload;
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
      const payload = op.payload as NoteOperationPayload;
      if (payload.projectId) {
        deps.push({
          entityType: 'PROJECT',
          entityId: payload.projectId,
          mustExist: false, // Soft dependency (Note can exist without project)
          relation: 'reference',
        });
      }
    }

    if (op.entityType === 'TAG') {
      const payload = op.payload as TagOperationPayload;
      // Tag -> Task is a soft dependency. We want tasks to be created before
      // tag updates that reference them, to avoid the tag-shared.reducer
      // filtering out "non-existent" taskIds during sync.
      if (payload.taskIds?.length) {
        for (const taskId of payload.taskIds) {
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
   */
  async checkDependencies(deps: OperationDependency[]): Promise<{
    missing: OperationDependency[];
  }> {
    const missing: OperationDependency[] = [];

    // We need access to the state. We can use selectors.
    // Note: selectors might be async.
    // For synchronous checking against a snapshot, we might need a different approach or
    // assume we can access state synchronously if we are inside an effect/reducer context.
    // But here we are likely in a service (Hydrator or Sync).
    // `firstValueFrom(store.select(...))` is the way.

    for (const dep of deps) {
      const exists = await this.checkEntityExists(dep.entityType, dep.entityId);
      if (!exists) {
        missing.push(dep);
      }
    }

    return { missing };
  }

  private async checkEntityExists(type: EntityType, id: string): Promise<boolean> {
    switch (type) {
      case 'TASK': {
        const task = await firstValueFrom(this.store.select(selectTaskById, { id }));
        return !!task;
      }
      case 'PROJECT': {
        const project = await firstValueFrom(
          this.store.select(selectProjectById, { id }),
        );
        return !!project;
      }
      case 'TAG': {
        const tag = await firstValueFrom(this.store.select(selectTagById, { id }));
        return !!tag;
      }
      case 'NOTE': {
        const note = await firstValueFrom(this.store.select(selectNoteById, { id }));
        return !!note;
      }
      case 'METRIC': {
        const metric = await firstValueFrom(this.store.select(selectMetricById, { id }));
        return !!metric;
      }
      case 'SIMPLE_COUNTER': {
        const counter = await firstValueFrom(
          this.store.select(selectSimpleCounterById, { id }),
        );
        return !!counter;
      }
      // These entity types don't have individual entity selectors or
      // don't require dependency checking (singleton/aggregate entities)
      case 'GLOBAL_CONFIG':
      case 'WORK_CONTEXT':
      case 'TASK_REPEAT_CFG':
      case 'ISSUE_PROVIDER':
      case 'PLANNER':
      case 'MENU_TREE':
      case 'BOARD':
      case 'REMINDER':
      case 'PLUGIN_USER_DATA':
      case 'PLUGIN_METADATA':
      case 'MIGRATION':
      case 'RECOVERY':
      case 'ALL':
        return true; // These don't require dependency resolution
      default:
        return true; // Unknown types assumed to exist
    }
  }
}
