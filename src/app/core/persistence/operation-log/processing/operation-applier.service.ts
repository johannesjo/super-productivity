import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Operation, OpType } from '../operation.types';
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

    // Sort operations by dependency to ensure parents are created before children
    const sortedOps = this._sortByDependency(ops);

    // Apply the sorted operations
    for (const op of sortedOps) {
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

  /**
   * Sorts operations topologically so that dependencies (parents) are applied
   * before dependents (children). Uses Kahn's algorithm with soft dependency tie-breaking.
   *
   * For operations within the same batch, this ensures that:
   * - CREATE operations for parent entities come before CREATE operations for children
   * - Operations are ordered such that any entity referenced by another operation
   *   is created first (within the batch)
   * - DELETE operations come AFTER any operations that reference the deleted entity
   *   (to allow tag/project updates to remove references before the entity is deleted)
   * - Soft dependencies (mustExist: false) are used as secondary sort preference to
   *   minimize temporary broken references
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
    // Build a map of entityId -> operation that deletes it (within this batch)
    const deleterMap = new Map<string, Operation>();
    for (const op of ops) {
      if (op.opType === OpType.Create && op.entityId) {
        creatorMap.set(op.entityId, op);
      }
      if (op.opType === OpType.Delete && op.entityId) {
        deleterMap.set(op.entityId, op);
      }
    }

    // Log DELETE operations for debugging
    if (deleterMap.size > 0) {
      OpLog.verbose(
        'OperationApplierService: Batch contains DELETE operations:',
        Array.from(deleterMap.entries()).map(([entityId, op]) => ({
          entityId,
          opId: op.id,
          actionType: op.actionType,
        })),
      );
    }

    // Build dependency graph: opId -> set of opIds that must come before it (hard deps)
    // Also track soft dependencies for tie-breaking
    const hardDependencies = new Map<string, Set<string>>();
    const softDependsOn = new Map<string, Set<string>>(); // ops that soft-depend on this op
    const opById = new Map<string, Operation>();
    // Track delete-before relationships for debugging
    const deleteWaitsFor: Array<{
      deleteOpId: string;
      deleteEntityId: string;
      waitsForOpId: string;
      waitsForActionType: string;
      referencedEntityId: string;
    }> = [];

    for (const op of ops) {
      opById.set(op.id, op);
      hardDependencies.set(op.id, new Set());

      // Extract dependencies for this operation
      const deps = this.dependencyResolver.extractDependencies(op);

      for (const dep of deps) {
        // Check if this dependency is created by another operation in this batch
        const creatorOp = creatorMap.get(dep.entityId);
        if (creatorOp && creatorOp.id !== op.id) {
          if (dep.mustExist) {
            // Hard dependency - must be satisfied before this op
            hardDependencies.get(op.id)!.add(creatorOp.id);
          } else {
            // Soft dependency - use for tie-breaking (creatorOp should come first)
            if (!softDependsOn.has(creatorOp.id)) {
              softDependsOn.set(creatorOp.id, new Set());
            }
            softDependsOn.get(creatorOp.id)!.add(op.id);
          }
        }

        // IMPORTANT: If this operation references an entity that will be deleted,
        // the DELETE must come AFTER this operation. This ensures tag/project updates
        // that still reference a task can be applied before the task is deleted.
        const deleterOp = deleterMap.get(dep.entityId);
        if (deleterOp && deleterOp.id !== op.id) {
          // The delete operation depends on this operation completing first
          hardDependencies.get(deleterOp.id)!.add(op.id);
          deleteWaitsFor.push({
            deleteOpId: deleterOp.id,
            deleteEntityId: dep.entityId,
            waitsForOpId: op.id,
            waitsForActionType: op.actionType,
            referencedEntityId: dep.entityId,
          });
        }
      }
    }

    // Log delete ordering constraints
    if (deleteWaitsFor.length > 0) {
      OpLog.verbose(
        'OperationApplierService: DELETE ordering constraints:',
        deleteWaitsFor,
      );
    }

    // Kahn's algorithm for topological sort
    const inDegree = new Map<string, number>();
    for (const op of ops) {
      inDegree.set(op.id, hardDependencies.get(op.id)!.size);
    }

    // Queue of operations with no hard dependencies (in-degree = 0)
    const queue: Operation[] = [];
    for (const op of ops) {
      if (inDegree.get(op.id) === 0) {
        queue.push(op);
      }
    }

    const sorted: Operation[] = [];

    while (queue.length > 0) {
      // Sort queue to prioritize:
      // 1. CREATE ops first (they create entities others may reference)
      // 2. Ops that have soft dependents (other ops soft-depend on them)
      // 3. Earlier timestamp as final tie-breaker
      queue.sort((a, b) => {
        // CREATE ops first
        const aIsCreate = a.opType === OpType.Create ? 1 : 0;
        const bIsCreate = b.opType === OpType.Create ? 1 : 0;
        if (aIsCreate !== bIsCreate) {
          return bIsCreate - aIsCreate; // Higher (CREATE) first
        }

        // Ops with more soft dependents first (they unblock more ops)
        const aSoftDeps = softDependsOn.get(a.id)?.size ?? 0;
        const bSoftDeps = softDependsOn.get(b.id)?.size ?? 0;
        if (aSoftDeps !== bSoftDeps) {
          return bSoftDeps - aSoftDeps; // More soft dependents first
        }

        // Earlier timestamp first
        return a.timestamp - b.timestamp;
      });

      const op = queue.shift()!;
      sorted.push(op);

      // Reduce in-degree of operations that depend on this one
      for (const [depOpId, depSet] of hardDependencies) {
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
      OpLog.warn(
        'OperationApplierService: Detected cycle in operation dependencies. Adding remaining ops:',
        remaining.map((o) => o.id),
      );
      sorted.push(...remaining);
    }

    if (sorted.length !== ops.length) {
      OpLog.err('OperationApplierService: Topological sort lost operations!', {
        input: ops.length,
        output: sorted.length,
      });
      return ops; // Fallback to original order
    }

    // Log if ordering changed, especially for DELETE operations
    if (deleterMap.size > 0) {
      const inputOrder = ops.map((o) => ({
        id: o.id.slice(-8),
        type: o.opType,
        action: o.actionType,
        entityId: o.entityId?.slice(-8),
      }));
      const outputOrder = sorted.map((o) => ({
        id: o.id.slice(-8),
        type: o.opType,
        action: o.actionType,
        entityId: o.entityId?.slice(-8),
      }));

      // Check if any reordering happened
      const orderChanged = ops.some((op, i) => op.id !== sorted[i].id);
      if (orderChanged) {
        OpLog.log('OperationApplierService: Reordered operations for DELETE safety:', {
          inputOrder,
          outputOrder,
        });
      }
    }

    return sorted;
  }
}
