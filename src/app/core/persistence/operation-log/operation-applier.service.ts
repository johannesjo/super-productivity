import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Operation } from './operation.types';
import { convertOpToAction } from './operation-converter.util';
import { DependencyResolverService } from './dependency-resolver.service';
import { PFLog } from '../../log';

/**
 * Maximum number of retry attempts for operations with missing dependencies.
 * After this many attempts, the operation is considered permanently failed.
 */
const MAX_RETRY_ATTEMPTS = 3;

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
    PFLog.normal(
      'OperationApplierService: Applying operations:',
      ops.map((op) => op.id),
    );

    // First, apply the new operations
    for (const op of ops) {
      await this._tryApplyOperation({ op, retryCount: 0, missingDeps: [] });
    }

    // After applying new operations, retry any pending operations
    // (new ops might have resolved their dependencies)
    await this._retryPendingOperations();

    PFLog.normal('OperationApplierService: Finished applying operations.');
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

      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        // Permanently failed - move to failed list
        PFLog.err(
          'OperationApplierService: Operation permanently failed after max retries.',
          {
            opId: op.id,
            actionType: op.actionType,
            missingDeps: missingDepIds,
            retryCount,
          },
        );
        this.permanentlyFailedOps.push({
          op,
          retryCount,
          missingDeps: missingDepIds,
        });
        return false;
      }

      // Queue for retry
      PFLog.warn(
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

    PFLog.verbose(
      'OperationApplierService: Dispatching action for operation:',
      op.id,
      action,
    );
    this.store.dispatch(action);
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

    PFLog.normal(
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
