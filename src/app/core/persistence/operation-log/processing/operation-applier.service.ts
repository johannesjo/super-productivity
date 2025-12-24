import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Operation } from '../operation.types';
import { convertOpToAction } from '../operation-converter.util';
import { OpLog } from '../../../log';
import {
  ArchiveOperationHandler,
  isArchiveAffectingAction,
} from './archive-operation-handler.service';
import { HydrationStateService } from './hydration-state.service';
import { remoteArchiveDataApplied } from '../../../../features/time-tracking/store/archive.actions';

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
   * When true, skip archive handling (already persisted from original execution).
   * Use ONLY for local hydration where operations are replaying
   * previously validated local operations from SUP_OPS.
   */
  isLocalHydration?: boolean;
}

/**
 * Maximum number of operations to dispatch before yielding to the event loop.
 * Dispatching too many operations without yielding can overwhelm NgRx and cause
 * state updates to be lost. A batch size of 50 balances throughput with responsiveness:
 * - Too small (10): Excessive event loop yields add ~4ms each on mobile
 * - Too large (100+): UI becomes unresponsive during large syncs
 */
const DISPATCH_BATCH_SIZE = 50;

/**
 * Service responsible for applying operations to the local NgRx store.
 *
 * Operations are applied in the order they arrive from the sync server,
 * which guarantees correct dependency ordering. Each client uploads ops
 * in causal order (can't create a child before parent), and the server
 * assigns sequence numbers in upload order.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationApplierService {
  private store = inject(Store);
  private archiveOperationHandler = inject(ArchiveOperationHandler);
  private hydrationState = inject(HydrationStateService);

  /**
   * Apply operations to the NgRx store.
   * Operations are applied in order. If any operation fails, the result includes
   * information about which operations succeeded and which failed.
   *
   * @param ops Operations to apply
   * @param options Configuration options. Use `isLocalHydration: true` for
   *                replaying local operations (skips archive handling).
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
    // PERF: Skip expensive debug logging - only enable for explicit debugging
    // To debug, uncomment the lines below:
    // if (ops.length > 30) {
    //   const opTypeCounts = new Map<string, number>();
    //   for (const op of ops) opTypeCounts.set(op.opType, (opTypeCounts.get(op.opType) || 0) + 1);
    //   console.log('[ol] Op type breakdown:', Object.fromEntries(opTypeCounts));
    // }
    // OpLog.verbose('Operation IDs:', ops.map((op) => op.id));

    const appliedOps: Operation[] = [];
    let hadArchiveAffectingOp = false;
    let dispatchedSinceYield = 0;

    // Mark that we're applying remote operations to suppress selector-based effects
    this.hydrationState.startApplyingRemoteOps();
    try {
      for (const op of ops) {
        try {
          const result = await this._applyOperation(op, isLocalHydration);
          hadArchiveAffectingOp = hadArchiveAffectingOp || result.wasArchiveAffecting;
          appliedOps.push(op);
          dispatchedSinceYield++;

          // Yield to the event loop periodically to prevent overwhelming NgRx.
          // store.dispatch() is non-blocking - without yielding between batches,
          // 50+ rapid dispatches can cause state updates to be lost.
          if (dispatchedSinceYield >= DISPATCH_BATCH_SIZE) {
            await new Promise((resolve) => setTimeout(resolve, 0));
            dispatchedSinceYield = 0;
          }
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

      // Final yield to ensure the last batch is fully processed
      if (dispatchedSinceYield > 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally {
      this.hydrationState.endApplyingRemoteOps();

      // Start post-sync cooldown to suppress selector-based effects
      // that might fire due to freshly-synced state changes.
      // Only needed for remote ops - local hydration doesn't cause the timing gap issue.
      if (!isLocalHydration) {
        this.hydrationState.startPostSyncCooldown();
      }
    }

    // Trigger archive reload for UI if archive-affecting operations were applied
    if (!isLocalHydration && hadArchiveAffectingOp) {
      this.store.dispatch(remoteArchiveDataApplied());
    }

    OpLog.normal('OperationApplierService: Finished applying operations.');
    return { appliedOps };
  }

  /**
   * Apply a single operation to the NgRx store.
   *
   * @param op Operation to apply
   * @param isLocalHydration When true, skip archive handling (already persisted).
   * @returns Result indicating whether the operation affected the archive
   */
  private async _applyOperation(
    op: Operation,
    isLocalHydration: boolean,
  ): Promise<{
    wasArchiveAffecting: boolean;
  }> {
    // Apply the operation - server sequence order ensures dependencies exist
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
      return { wasArchiveAffecting: isArchiveAffectingAction(action) };
    }
    return { wasArchiveAffecting: false };
  }
}
