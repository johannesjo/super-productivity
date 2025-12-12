import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Operation } from '../operation.types';
import { convertOpToAction } from '../operation-converter.util';
import { DependencyResolverService } from '../sync/dependency-resolver.service';
import { OpLog } from '../../../log';
import { ArchiveOperationHandler } from './archive-operation-handler.service';
import { SyncStateCorruptedError } from '../sync-state-corrupted.error';
import { HydrationStateService } from './hydration-state.service';

/**
 * Result of applying operations to the NgRx store.
 *
 * This allows callers to handle partial success scenarios where some operations
 * were applied before an error occurred.
 */
export interface ApplyOperationsResult {
  /**
   * Operations that were successfully applied to the NgRx store.
   * These ops have already been dispatched and should be marked as applied.
   */
  appliedOps: Operation[];

  /**
   * If an error occurred, this contains the failed operation and the error.
   * Operations after this one in the batch were NOT applied.
   */
  failedOp?: {
    op: Operation;
    error: Error;
  };
}

/**
 * Service responsible for applying operations to the local NgRx store.
 *
 * ## Design Philosophy: Fail Fast, Re-sync Clean
 *
 * This service uses a deliberately simple approach to dependency handling:
 * - If all dependencies are satisfied → apply the operation
 * - If hard dependencies are missing → throw SyncStateCorruptedError
 *
 * We do NOT attempt complex retry logic because:
 * 1. The sync server guarantees operations arrive in sequence order
 * 2. Delete operations are atomic via meta-reducers (no separate cleanup operations)
 * 3. If dependencies are missing, something is fundamentally wrong with sync state
 * 4. A full re-sync is safer than partial recovery with potential inconsistencies
 *
 * ### What Happens on Failure?
 *
 * When this service throws SyncStateCorruptedError:
 * 1. The caller (OperationLogSyncService) catches the error
 * 2. The operations are marked as failed in the operation log
 * 3. The user is notified and can trigger a full re-sync
 *
 * This approach trades occasional re-syncs for guaranteed correctness.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationApplierService {
  private store = inject(Store);
  private dependencyResolver = inject(DependencyResolverService);
  private archiveOperationHandler = inject(ArchiveOperationHandler);
  private hydrationState = inject(HydrationStateService);

  /**
   * Apply operations to the NgRx store.
   * Operations are applied in order. If any operation fails, the result includes
   * information about which operations succeeded and which failed.
   *
   * @returns Result containing applied operations and optionally the failed operation.
   *          Callers should:
   *          - Mark `appliedOps` as applied (they've been dispatched to NgRx)
   *          - Mark the failed op and any remaining ops as failed
   */
  async applyOperations(ops: Operation[]): Promise<ApplyOperationsResult> {
    if (ops.length === 0) {
      return { appliedOps: [] };
    }

    OpLog.normal(
      'OperationApplierService: Applying operations:',
      ops.map((op) => op.id),
    );

    const appliedOps: Operation[] = [];

    // Mark that we're applying remote operations to suppress selector-based effects
    this.hydrationState.startApplyingRemoteOps();
    try {
      for (const op of ops) {
        try {
          await this._applyOperation(op);
          appliedOps.push(op);
        } catch (e) {
          // Log the error
          OpLog.err(
            `OperationApplierService: Failed to apply operation ${op.id}. ` +
              `${appliedOps.length} ops were applied before this failure.`,
            e,
          );

          // Return partial success result with the failed op
          return {
            appliedOps,
            failedOp: {
              op,
              error: e instanceof Error ? e : new Error(String(e)),
            },
          };
        }
      }
    } finally {
      this.hydrationState.endApplyingRemoteOps();
    }

    OpLog.normal('OperationApplierService: Finished applying operations.');
    return { appliedOps };
  }

  /**
   * Apply a single operation, checking dependencies first.
   * Throws SyncStateCorruptedError if hard dependencies are missing.
   */
  private async _applyOperation(op: Operation): Promise<void> {
    const deps = this.dependencyResolver.extractDependencies(op);
    const { missing } = await this.dependencyResolver.checkDependencies(deps);

    // Only hard dependencies block application
    const missingHardDeps = missing.filter((dep) => dep.mustExist);

    if (missingHardDeps.length > 0) {
      const missingDepIds = missingHardDeps.map((d) => `${d.entityType}:${d.entityId}`);

      OpLog.err(
        'OperationApplierService: Operation has missing hard dependencies. ' +
          'This indicates corrupted sync state - a full re-sync is required.',
        {
          opId: op.id,
          actionType: op.actionType,
          missingDeps: missingDepIds,
        },
      );

      throw new SyncStateCorruptedError(
        `Operation ${op.id} cannot be applied: missing hard dependencies [${missingDepIds.join(', ')}]. ` +
          'This indicates corrupted sync state. A full re-sync is required to restore consistency.',
        {
          opId: op.id,
          actionType: op.actionType,
          missingDependencies: missingDepIds,
        },
      );
    }

    // Dependencies satisfied, apply the operation
    const action = convertOpToAction(op);

    OpLog.verbose(
      'OperationApplierService: Dispatching action for operation:',
      op.id,
      action,
    );
    this.store.dispatch(action);

    // Handle archive-specific side effects for remote operations
    // This is called AFTER dispatch because the NgRx state must be updated first
    await this.archiveOperationHandler.handleOperation(action);
  }
}
