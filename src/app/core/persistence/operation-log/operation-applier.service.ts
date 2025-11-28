import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Operation } from './operation.types';
import { convertOpToAction } from './operation-converter.util';
import { DependencyResolverService } from './dependency-resolver.service';
import { PFLog } from '../../log';

/**
 * Service responsible for applying operations to the local NgRx store.
 * It handles dependency resolution and dispatches actions, ensuring that
 * operations are applied in a causally correct order.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationApplierService {
  private store = inject(Store);
  private dependencyResolver = inject(DependencyResolverService);

  // TODO: Add retry mechanism for operations with missing hard dependencies.
  // This will require queuing operations and retrying them after some delay or
  // after new operations have been applied that might resolve the dependency.

  async applyOperations(ops: Operation[]): Promise<void> {
    PFLog.normal(
      'OperationApplierService: Applying operations:',
      ops.map((op) => op.id),
    );

    // For now, a simple sequential apply. Dependency resolution will be more complex later.
    for (const op of ops) {
      const deps = this.dependencyResolver.extractDependencies(op);
      const { missing } = await this.dependencyResolver.checkDependencies(deps);

      // Check for hard dependencies
      const missingHardDeps = missing.filter((dep) => dep.mustExist);

      if (missingHardDeps.length > 0) {
        PFLog.warn(
          'OperationApplierService: Skipping operation due to missing hard dependencies.',
          { op, missingHardDeps },
        );
        // TODO: Queue for retry or flag as failed for user intervention
        continue;
      }

      // Handle soft dependencies (e.g., tags) by modifying the action payload if necessary
      const action = convertOpToAction(op);

      PFLog.verbose(
        'OperationApplierService: Dispatching action for operation:',
        op.id,
        action,
      );
      this.store.dispatch(action);
    }
    PFLog.normal('OperationApplierService: Finished applying operations.');
  }
}
