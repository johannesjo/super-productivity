import { inject, Injectable, Injector } from '@angular/core';
import { Store } from '@ngrx/store';
import { Operation } from '../operation.types';
import { convertOpToAction } from '../operation-converter.util';
import { DependencyResolverService } from '../sync/dependency-resolver.service';
import { OpLog } from '../../../log';
import {
  ArchiveOperationHandler,
  isArchiveAffectingAction,
} from './archive-operation-handler.service';
import { SyncStateCorruptedError } from '../sync-state-corrupted.error';
import { HydrationStateService } from './hydration-state.service';
import { WorklogService } from '../../../../features/worklog/worklog.service';
import { lazyInject } from '../../../../util/lazy-inject';

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
 * Options for applying operations to the NgRx store.
 */
export interface ApplyOperationsOptions {
  /**
   * When true, skip dependency checking and archive handling.
   * Use ONLY for local hydration where operations are replaying
   * previously validated local operations from SUP_OPS.
   *
   * SAFETY: This flag should NEVER be used for remote operations.
   * Remote ops need dependency validation for correctness.
   */
  isLocalHydration?: boolean;
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
  // Use lazy injection to break circular dependency:
  // OperationApplierService -> WorklogService -> PfapiService -> ... -> OperationApplierService
  private _injector = inject(Injector);
  private _getWorklogService = lazyInject(this._injector, WorklogService);

  /**
   * Apply operations to the NgRx store.
   * Operations are applied in order. If any operation fails, the result includes
   * information about which operations succeeded and which failed.
   *
   * @param ops Operations to apply
   * @param options Configuration options. Use `isLocalHydration: true` for
   *                replaying local operations (skips dependency checks and archive handling).
   * @returns Result containing applied operations and optionally the failed operation.
   *          Callers should:
   *          - Mark `appliedOps` as applied (they've been dispatched to NgRx)
   *          - Mark the failed op and any remaining ops as failed
   */
  async applyOperations(
    ops: Operation[],
    options: ApplyOperationsOptions = {},
  ): Promise<ApplyOperationsResult> {
    if (ops.length === 0) {
      return { appliedOps: [] };
    }

    const isLocalHydration = options.isLocalHydration ?? false;

    if (isLocalHydration) {
      OpLog.normal(
        `OperationApplierService: Hydrating ${ops.length} local operations (fast path)`,
      );
    } else {
      OpLog.normal(`OperationApplierService: Applying ${ops.length} operations`);
    }
    OpLog.verbose(
      'OperationApplierService: Operation IDs:',
      ops.map((op) => op.id),
    );

    const appliedOps: Operation[] = [];
    let hadArchiveAffectingOp = false;

    // Mark that we're applying remote operations to suppress selector-based effects
    this.hydrationState.startApplyingRemoteOps();
    try {
      for (const op of ops) {
        try {
          const wasArchiveAffecting = await this._applyOperation(op, isLocalHydration);
          hadArchiveAffectingOp = hadArchiveAffectingOp || wasArchiveAffecting;
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

    // Trigger archive reload for UI if archive-affecting operations were applied
    if (!isLocalHydration && hadArchiveAffectingOp) {
      this._getWorklogService().refreshWorklog();
    }

    OpLog.normal('OperationApplierService: Finished applying operations.');
    return { appliedOps };
  }

  /**
   * Apply a single operation, checking dependencies first.
   * Throws SyncStateCorruptedError if hard dependencies are missing.
   *
   * @param op Operation to apply
   * @param isLocalHydration When true, skip dependency checks and archive handling.
   *                         Used for replaying local operations that were already validated.
   * @returns Whether the operation affected archive data (for UI refresh purposes)
   */
  private async _applyOperation(
    op: Operation,
    isLocalHydration: boolean,
  ): Promise<boolean> {
    // FAST PATH: Local hydration skips dependency checks and archive handling.
    // These operations were already validated when created, and archive data
    // is already persisted in IndexedDB from the original execution.
    if (!isLocalHydration) {
      // STANDARD PATH: Full validation for remote operations
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
    }

    // Dependencies satisfied (or skipped for hydration), apply the operation
    const action = convertOpToAction(op);

    OpLog.verbose(
      'OperationApplierService: Dispatching action for operation:',
      op.id,
      action,
    );
    this.store.dispatch(action);

    // Archive handling - only needed for remote operations.
    // Local ops already have archive data persisted from original execution.
    if (!isLocalHydration) {
      await this.archiveOperationHandler.handleOperation(action);
      return isArchiveAffectingAction(action);
    }
    return false;
  }
}
