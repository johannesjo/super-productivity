import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Operation, OpType } from '../operation.types';
import { convertOpToAction } from '../operation-converter.util';
import { DependencyResolverService } from '../sync/dependency-resolver.service';
import { PFLog } from '../../../log';
import {
  MAX_DEPENDENCY_RETRY_ATTEMPTS,
  MAX_FAILED_OPS_SIZE,
  MAX_PENDING_QUEUE_SIZE,
} from '../operation-log.const';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';

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

    // Sort operations by dependency to ensure parents are created before children
    const sortedOps = this._sortByDependency(ops);

    // Apply the sorted operations
    for (const op of sortedOps) {
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

      // Check if we should mark as failed (max retries or queue at capacity)
      const shouldMarkFailed =
        retryCount >= MAX_DEPENDENCY_RETRY_ATTEMPTS ||
        this.pendingQueue.length >= MAX_PENDING_QUEUE_SIZE;

      if (shouldMarkFailed) {
        // Log reason for failure
        if (this.pendingQueue.length >= MAX_PENDING_QUEUE_SIZE) {
          PFLog.warn(
            'OperationApplierService: Pending queue at capacity, marking operation as failed immediately.',
            { opId: op.id, queueSize: this.pendingQueue.length },
          );
        } else {
          PFLog.err(
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
          PFLog.warn(
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

  /**
   * Sorts operations topologically so that dependencies (parents) are applied
   * before dependents (children). Uses Kahn's algorithm.
   *
   * For operations within the same batch, this ensures that:
   * - CREATE operations for parent entities come before CREATE operations for children
   * - Operations are ordered such that any entity referenced by another operation
   *   is created first (within the batch)
   *
   * Note: This only sorts within the batch. Dependencies on entities that already
   * exist in the store are handled by the retry mechanism.
   */
  private _sortByDependency(ops: Operation[]): Operation[] {
    if (ops.length <= 1) {
      return ops;
    }

    // Build a map of entityId -> operation that creates it (within this batch)
    const creatorMap = new Map<string, Operation>();
    for (const op of ops) {
      if (op.opType === OpType.Create && op.entityId) {
        creatorMap.set(op.entityId, op);
      }
    }

    // Build dependency graph: opId -> set of opIds that must come before it
    const dependencies = new Map<string, Set<string>>();
    const opById = new Map<string, Operation>();

    for (const op of ops) {
      opById.set(op.id, op);
      dependencies.set(op.id, new Set());

      // Extract dependencies for this operation
      const deps = this.dependencyResolver.extractDependencies(op);

      for (const dep of deps) {
        // Only consider hard dependencies (mustExist: true)
        if (!dep.mustExist) continue;

        // Check if this dependency is created by another operation in this batch
        const creatorOp = creatorMap.get(dep.entityId);
        if (creatorOp && creatorOp.id !== op.id) {
          // This operation depends on creatorOp
          dependencies.get(op.id)!.add(creatorOp.id);
        }
      }
    }

    // Kahn's algorithm for topological sort
    const inDegree = new Map<string, number>();
    for (const op of ops) {
      inDegree.set(op.id, dependencies.get(op.id)!.size);
    }

    // Queue of operations with no dependencies (in-degree = 0)
    const queue: Operation[] = [];
    for (const op of ops) {
      if (inDegree.get(op.id) === 0) {
        queue.push(op);
      }
    }

    const sorted: Operation[] = [];

    while (queue.length > 0) {
      const op = queue.shift()!;
      sorted.push(op);

      // Reduce in-degree of operations that depend on this one
      for (const [depOpId, depSet] of dependencies) {
        if (depSet.has(op.id)) {
          depSet.delete(op.id);
          const newDegree = inDegree.get(depOpId)! - 1;
          inDegree.set(depOpId, newDegree);
          if (newDegree === 0) {
            queue.push(opById.get(depOpId)!);
          }
        }
      }
    }

    // If there are cycles (shouldn't happen normally), add remaining ops at the end
    if (sorted.length < ops.length) {
      const sortedIds = new Set(sorted.map((o) => o.id));
      const remaining = ops.filter((o) => !sortedIds.has(o.id));
      PFLog.warn(
        'OperationApplierService: Detected cycle in operation dependencies. Adding remaining ops:',
        remaining.map((o) => o.id),
      );
      sorted.push(...remaining);
    }

    if (sorted.length !== ops.length) {
      PFLog.err('OperationApplierService: Topological sort lost operations!', {
        input: ops.length,
        output: sorted.length,
      });
      return ops; // Fallback to original order
    }

    return sorted;
  }
}
