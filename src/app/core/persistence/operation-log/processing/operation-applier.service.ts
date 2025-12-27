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
import { bulkApplyOperations } from '../bulk-hydration.action';

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
 * Service responsible for applying operations to the local NgRx store.
 *
 * Uses bulk dispatch (bulkApplyOperations) to apply all operations in a single
 * NgRx store update. This provides two key benefits:
 *
 * 1. Performance: 500 operations = 1 dispatch instead of 500 dispatches
 * 2. Effect isolation: Effects don't see individual actions, only the bulk action
 *    which no effect listens for. This eliminates the need for LOCAL_ACTIONS
 *    filtering on action-based effects.
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
   * Apply operations to the NgRx store using bulk dispatch.
   *
   * All operations are applied in a single NgRx dispatch via bulkApplyOperations.
   * After the state is updated, archive operations are processed sequentially.
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
        `OperationApplierService: Hydrating ${ops.length} local operations (bulk dispatch)`,
      );
    } else {
      OpLog.normal(
        `OperationApplierService: Applying ${ops.length} remote operations (bulk dispatch)`,
      );
    }

    // Mark that we're applying remote operations to suppress selector-based effects
    this.hydrationState.startApplyingRemoteOps();
    try {
      // STEP 1: Bulk dispatch all operations in a single NgRx update
      // The bulkOperationsMetaReducer iterates through ops and applies each action.
      // Effects don't see individual actions - they only see bulkApplyOperations
      // which no effect listens for.
      this.store.dispatch(bulkApplyOperations({ operations: ops }));

      // Yield to event loop to ensure store update is processed
      await new Promise((resolve) => setTimeout(resolve, 0));

      // STEP 2: Handle archive operations (only for remote sync, not local hydration)
      // Archive data lives in IndexedDB, not NgRx state, so we need to persist it separately.
      if (!isLocalHydration) {
        const archiveResult = await this._processArchiveOperations(ops);
        if (archiveResult.failedOp) {
          return archiveResult;
        }

        // Trigger archive reload for UI if archive-affecting operations were applied
        if (archiveResult.hadArchiveAffectingOp) {
          this.store.dispatch(remoteArchiveDataApplied());
        }
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

    OpLog.normal('OperationApplierService: Finished applying operations.');
    return { appliedOps: ops };
  }

  /**
   * Process archive operations after bulk state dispatch.
   * Archive data lives in IndexedDB and needs to be persisted separately.
   *
   * The archive handler is called for all operations - it internally decides
   * which operations need archive storage updates.
   */
  private async _processArchiveOperations(ops: Operation[]): Promise<{
    appliedOps: Operation[];
    hadArchiveAffectingOp: boolean;
    failedOp?: { op: Operation; error: Error };
  }> {
    const appliedOps: Operation[] = [];
    let hadArchiveAffectingOp = false;

    for (const op of ops) {
      try {
        const action = convertOpToAction(op);

        // Call handler for all operations - it internally checks if action affects archive
        await this.archiveOperationHandler.handleOperation(action);

        // Track if any archive-affecting operations were processed (for UI refresh)
        if (isArchiveAffectingAction(action)) {
          hadArchiveAffectingOp = true;
        }

        appliedOps.push(op);
      } catch (e) {
        OpLog.err(
          `OperationApplierService: Failed archive handling for operation ${op.id}. ` +
            `${appliedOps.length} ops were processed before this failure.`,
          e,
        );

        return {
          appliedOps,
          hadArchiveAffectingOp,
          failedOp: {
            op,
            error: e instanceof Error ? e : new Error(String(e)),
          },
        };
      }
    }

    return { appliedOps, hadArchiveAffectingOp };
  }
}
