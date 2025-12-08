import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Operation } from '../operation.types';
import { convertOpToAction } from '../operation-converter.util';
import { DependencyResolverService } from '../sync/dependency-resolver.service';
import { OpLog } from '../../../log';
import {
  MAX_DEPENDENCY_RETRY_ATTEMPTS,
  MAX_FAILED_OPS_SIZE,
  MAX_PENDING_QUEUE_SIZE,
} from '../operation-log.const';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';
import { ArchiveOperationHandler } from './archive-operation-handler.service';

/**
 * Interface for tracking pending operations that failed due to missing dependencies.
 */
interface PendingOperation {
  op: Operation;
  retryCount: number;
  missingDeps: string[];
}

/**
 * Service responsible for applying operations to the local NgRx store.
 * It handles dependency resolution and dispatches actions, ensuring that
 * operations are applied in a causally correct order.
 *
 * Operations with missing hard dependencies are queued for retry.
 * If dependencies still aren't resolved after MAX_RETRY_ATTEMPTS,
 * the operation is logged as permanently failed for debugging.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationApplierService {
  private store = inject(Store);
  private dependencyResolver = inject(DependencyResolverService);
  private snackService = inject(SnackService);
  private archiveOperationHandler = inject(ArchiveOperationHandler);

  /**
   * Queue of operations that failed due to missing dependencies.
   * These are retried when new operations are applied that might resolve them.
   */
  private pendingQueue: PendingOperation[] = [];

  /**
   * Operations that have permanently failed after exhausting retry attempts.
   * Kept for debugging and potential manual recovery.
   */
  private permanentlyFailedOps: PendingOperation[] = [];

  async applyOperations(ops: Operation[]): Promise<void> {
    OpLog.normal(
      'OperationApplierService: Applying operations:',
      ops.map((op) => op.id),
    );

    // NOTE: Dependency sorting is currently disabled.
    // The sync server guarantees operations arrive in sequence order, and delete
    // operations are atomic via meta-reducers (no separate cleanup operations).
    // If ordering issues arise, re-enable using sortOperationsByDependency from:
    // ./sort-operations-by-dependency.util.ts
    for (const op of ops) {
      await this._tryApplyOperation({ op, retryCount: 0, missingDeps: [] });
    }

    // After applying new operations, retry any pending operations
    // (new ops might have resolved their dependencies)
    await this._retryPendingOperations();

    OpLog.normal('OperationApplierService: Finished applying operations.');
  }

  /**
   * Returns the count of operations currently pending in the retry queue.
   */
  getPendingCount(): number {
    return this.pendingQueue.length;
  }

  /**
   * Returns the count of operations that permanently failed.
   */
  getFailedCount(): number {
    return this.permanentlyFailedOps.length;
  }

  /**
   * Returns a copy of the permanently failed operations for debugging.
   */
  getFailedOperations(): PendingOperation[] {
    return [...this.permanentlyFailedOps];
  }

  /**
   * Clears permanently failed operations (e.g., after user acknowledgment).
   */
  clearFailedOperations(): void {
    this.permanentlyFailedOps = [];
  }

  /**
   * Clears old failed operations that are beyond useful debugging.
   * Called periodically (e.g., on app startup or after sync) to prevent memory growth.
   *
   * @param maxAgeMs - Maximum age of failed operations to keep (default: 7 days)
   * @returns Number of operations pruned
   */
  pruneOldFailedOperations(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    const before = this.permanentlyFailedOps.length;

    this.permanentlyFailedOps = this.permanentlyFailedOps.filter(
      (pending) => pending.op.timestamp > cutoff,
    );

    const pruned = before - this.permanentlyFailedOps.length;
    if (pruned > 0) {
      OpLog.normal(`OperationApplierService: Pruned ${pruned} old failed operations`);
    }

    return pruned;
  }

  /**
   * Attempts to apply a single operation, handling dependency failures.
   */
  private async _tryApplyOperation(pending: PendingOperation): Promise<boolean> {
    const { op, retryCount } = pending;
    const deps = this.dependencyResolver.extractDependencies(op);
    const { missing } = await this.dependencyResolver.checkDependencies(deps);

    // Check for hard dependencies
    const missingHardDeps = missing.filter((dep) => dep.mustExist);

    if (missingHardDeps.length > 0) {
      const missingDepIds = missingHardDeps.map((d) => d.entityId);

      // Check if we should mark as failed (max retries or queue at capacity)
      const shouldMarkFailed =
        retryCount >= MAX_DEPENDENCY_RETRY_ATTEMPTS ||
        this.pendingQueue.length >= MAX_PENDING_QUEUE_SIZE;

      if (shouldMarkFailed) {
        // Log reason for failure
        if (this.pendingQueue.length >= MAX_PENDING_QUEUE_SIZE) {
          OpLog.warn(
            'OperationApplierService: Pending queue at capacity, marking operation as failed immediately.',
            { opId: op.id, queueSize: this.pendingQueue.length },
          );
        } else {
          OpLog.err(
            'OperationApplierService: Operation permanently failed after max retries.',
            {
              opId: op.id,
              actionType: op.actionType,
              missingDeps: missingDepIds,
              retryCount,
            },
          );
        }

        // Ensure failed ops list doesn't exceed capacity
        if (this.permanentlyFailedOps.length >= MAX_FAILED_OPS_SIZE) {
          OpLog.warn(
            'OperationApplierService: Failed ops queue at capacity, dropping oldest.',
          );
          this.permanentlyFailedOps.shift();
        }

        this.permanentlyFailedOps.push({
          op,
          retryCount,
          missingDeps: missingDepIds,
        });

        // Notify user about failed operation (only once per batch to avoid spam)
        // Check if this is the first failed op or if we just hit a threshold
        if (this.permanentlyFailedOps.length === 1) {
          this.snackService.open({
            type: 'ERROR',
            msg: T.F.SYNC.S.OPERATION_PERMANENTLY_FAILED,
          });
        }
        return false;
      }

      // Queue for retry
      OpLog.warn(
        'OperationApplierService: Queuing operation for retry due to missing dependencies.',
        { opId: op.id, missingDeps: missingDepIds, retryCount: retryCount + 1 },
      );
      this.pendingQueue.push({
        op,
        retryCount: retryCount + 1,
        missingDeps: missingDepIds,
      });
      return false;
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
    await this.archiveOperationHandler.handleRemoteOperation(action);

    return true;
  }

  /**
   * Retries all pending operations once.
   * Operations that still fail are kept in the queue for the next cycle.
   */
  private async _retryPendingOperations(): Promise<void> {
    if (this.pendingQueue.length === 0) {
      return;
    }

    OpLog.normal(
      'OperationApplierService: Retrying pending operations:',
      this.pendingQueue.length,
    );

    // Take all pending ops and clear the queue
    const toRetry = [...this.pendingQueue];
    this.pendingQueue = [];

    // Try to apply each one (they may re-queue themselves if still missing deps)
    for (const pending of toRetry) {
      await this._tryApplyOperation(pending);
    }
  }
}
