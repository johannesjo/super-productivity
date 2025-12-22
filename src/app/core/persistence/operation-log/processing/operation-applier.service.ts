import { inject, Injectable } from '@angular/core';
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

  /**
   * Operations that were skipped due to missing dependencies after a SYNC_IMPORT.
   * These are "stale" ops that reference entities deleted by the import.
   * Callers should mark these as rejected (they will never succeed).
   */
  skippedOps?: {
    op: Operation;
    reason: 'stale_after_import';
    missingDeps: string[];
  }[];
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

  /**
   * UUIDv7 of the latest SYNC_IMPORT/BACKUP_IMPORT operation in this batch.
   * If provided, operations older than this with missing hard dependencies
   * will be gracefully skipped as "stale" instead of causing a fatal error.
   *
   * This handles the case where a SYNC_IMPORT replaces state, deleting entities
   * that older operations reference. Without this, those operations would cause
   * SyncStateCorruptedError even though the state is actually valid.
   */
  latestImportOpId?: string;
}

/**
 * Maximum number of operations to dispatch before yielding to the event loop.
 * Dispatching too many operations without yielding can overwhelm NgRx and cause
 * state updates to be lost. Testing shows smaller batches are safer for high-volume syncs.
 */
const DISPATCH_BATCH_SIZE = 10;

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
    const latestImportOpId = options.latestImportOpId;

    if (isLocalHydration) {
      OpLog.normal(
        `OperationApplierService: Hydrating ${ops.length} local operations (fast path)`,
      );
    } else {
      OpLog.normal(`OperationApplierService: Applying ${ops.length} operations`);
      // Debug: log operation types for high-volume debugging
      if (ops.length > 30) {
        const opTypeCounts = new Map<string, number>();
        for (const op of ops) {
          const key = op.opType;
          opTypeCounts.set(key, (opTypeCounts.get(key) || 0) + 1);
        }
        console.log(
          `[ol] OperationApplierService: Op type breakdown:`,
          Object.fromEntries(opTypeCounts),
        );
      }
    }
    OpLog.verbose(
      'OperationApplierService: Operation IDs:',
      ops.map((op) => op.id),
    );

    const appliedOps: Operation[] = [];
    const skippedOps: ApplyOperationsResult['skippedOps'] = [];
    let hadArchiveAffectingOp = false;
    let dispatchedSinceYield = 0;

    // Mark that we're applying remote operations to suppress selector-based effects
    this.hydrationState.startApplyingRemoteOps();
    try {
      for (const op of ops) {
        try {
          const result = await this._applyOperation(
            op,
            isLocalHydration,
            latestImportOpId,
          );
          if (result.skipped) {
            skippedOps.push({
              op,
              reason: 'stale_after_import',
              missingDeps: result.missingDeps!,
            });
          } else {
            hadArchiveAffectingOp = hadArchiveAffectingOp || result.wasArchiveAffecting;
            appliedOps.push(op);
          }
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

    if (skippedOps.length > 0) {
      OpLog.warn(
        `OperationApplierService: Skipped ${skippedOps.length} stale operations with missing dependencies`,
      );
    }

    OpLog.normal('OperationApplierService: Finished applying operations.');
    return {
      appliedOps,
      skippedOps: skippedOps.length > 0 ? skippedOps : undefined,
    };
  }

  /**
   * Apply a single operation, checking dependencies first.
   * Returns a result indicating whether the op was applied, skipped, or failed.
   *
   * @param op Operation to apply
   * @param isLocalHydration When true, skip dependency checks and archive handling.
   * @param latestImportOpId If provided, ops older than this with missing deps are skipped.
   * @returns Result indicating what happened with the operation
   */
  private async _applyOperation(
    op: Operation,
    isLocalHydration: boolean,
    latestImportOpId?: string,
  ): Promise<{
    skipped: boolean;
    wasArchiveAffecting: boolean;
    missingDeps?: string[];
  }> {
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

        // Check if this op is stale after a SYNC_IMPORT
        // If the op predates the import AND has missing deps, it's stale and can be skipped
        if (latestImportOpId && op.id < latestImportOpId) {
          OpLog.warn(
            'OperationApplierService: Skipping stale operation with missing dependencies ' +
              '(predates SYNC_IMPORT that deleted referenced entities)',
            {
              opId: op.id,
              actionType: op.actionType,
              missingDeps: missingDepIds,
              latestImportOpId,
            },
          );
          return {
            skipped: true,
            wasArchiveAffecting: false,
            missingDeps: missingDepIds,
          };
        }

        // Not stale - this is a genuine missing dependency, throw error
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
      return { skipped: false, wasArchiveAffecting: isArchiveAffectingAction(action) };
    }
    return { skipped: false, wasArchiveAffecting: false };
  }
}
