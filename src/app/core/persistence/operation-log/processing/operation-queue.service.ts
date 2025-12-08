import { Injectable } from '@angular/core';
import { EntityChange } from '../operation.types';
import { OpLog } from '../../../log';

/**
 * Represents entity changes queued by the operation-capture meta-reducer.
 * These are pre-computed synchronously and consumed by the effect for persistence.
 */
export interface QueuedOperation {
  /**
   * Unique identifier correlating the action to its entity changes.
   * Generated from action type + entity info + hash.
   */
  captureId: string;

  /**
   * Pre-computed entity changes derived from state diff.
   */
  entityChanges: EntityChange[];

  /**
   * Timestamp when the operation was queued (for stale cleanup).
   */
  queuedAt: number;
}

/**
 * Service that queues pre-computed entity changes between the meta-reducer and effect.
 *
 * The operation-capture meta-reducer computes entity changes synchronously
 * (eliminating the race condition) and enqueues them here. The effect then
 * dequeues them for persistence.
 *
 * This replaces the async `store.select()` pattern that caused race conditions.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationQueueService {
  /**
   * Queue of pending operations keyed by captureId.
   */
  private queue = new Map<string, QueuedOperation>();

  /**
   * Maximum age of queued operations before cleanup (5 seconds).
   * Handles cases where an action is captured but effect never runs.
   */
  private readonly MAX_QUEUE_AGE_MS = 5000;

  /**
   * Enqueues pre-computed entity changes for later consumption by the effect.
   * Called synchronously by the operation-capture meta-reducer.
   *
   * @param captureId Unique identifier for this action's capture
   * @param entityChanges Pre-computed entity changes from state diff
   */
  enqueue(captureId: string, entityChanges: EntityChange[]): void {
    // Clean up stale entries first
    this.cleanupStale();

    this.queue.set(captureId, {
      captureId,
      entityChanges,
      queuedAt: Date.now(),
    });

    OpLog.verbose('OperationQueueService: Enqueued operation', {
      captureId,
      changeCount: entityChanges.length,
    });
  }

  /**
   * Dequeues entity changes for a given captureId.
   * Called by the effect to retrieve pre-computed changes.
   *
   * @param captureId Unique identifier for this action's capture
   * @returns Entity changes array, or empty array if not found
   */
  dequeue(captureId: string): EntityChange[] {
    const queued = this.queue.get(captureId);

    if (!queued) {
      OpLog.warn('OperationQueueService: No queued operation found', { captureId });
      return [];
    }

    // Remove from queue
    this.queue.delete(captureId);

    OpLog.verbose('OperationQueueService: Dequeued operation', {
      captureId,
      changeCount: queued.entityChanges.length,
    });

    return queued.entityChanges;
  }

  /**
   * Checks if an operation is queued (for testing/debugging).
   */
  has(captureId: string): boolean {
    return this.queue.has(captureId);
  }

  /**
   * Gets the current queue size (for monitoring).
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Clears all queued operations (for testing).
   */
  clear(): void {
    this.queue.clear();
  }

  /**
   * Removes stale entries that were never consumed.
   * This handles edge cases where an action is captured but the effect never runs.
   */
  private cleanupStale(): void {
    const now = Date.now();
    const staleIds: string[] = [];

    for (const [captureId, queued] of this.queue) {
      if (now - queued.queuedAt > this.MAX_QUEUE_AGE_MS) {
        staleIds.push(captureId);
      }
    }

    if (staleIds.length > 0) {
      OpLog.warn('OperationQueueService: Cleaning up stale queued operations', {
        count: staleIds.length,
        ids: staleIds,
      });
      for (const id of staleIds) {
        this.queue.delete(id);
      }
    }
  }
}
