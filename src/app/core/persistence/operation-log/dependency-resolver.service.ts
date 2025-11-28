import { Injectable, inject } from '@angular/core';
import { Operation, EntityType } from './operation.types';
import { Store } from '@ngrx/store';
import { selectTaskById } from '../../../features/tasks/store/task.selectors';
import { selectProjectById } from '../../../features/project/store/project.reducer';
import { firstValueFrom } from 'rxjs';

export interface OperationDependency {
  entityType: EntityType;
  entityId: string;
  mustExist: boolean;
  relation: 'parent' | 'reference';
}

@Injectable({ providedIn: 'root' })
export class DependencyResolverService {
  private store = inject(Store);

  /**
   * Identifies dependencies for a given operation.
   */
  extractDependencies(op: Operation): OperationDependency[] {
    const deps: OperationDependency[] = [];
    const payload = op.payload as any;

    if (op.entityType === 'TASK') {
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
      // Tags are soft dependencies, we usually ignore if missing or handle in reducer
    }

    // Add other entity types as needed
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
      case 'TASK':
        const task = await firstValueFrom(this.store.select(selectTaskById, { id }));
        return !!task;
      case 'PROJECT':
        const project = await firstValueFrom(
          this.store.select(selectProjectById, { id }),
        );
        return !!project;
      // Implement others
      default:
        return true; // Assume exists if we don't track it yet
    }
  }
}
