import { inject, Injectable } from '@angular/core';
import { LockService } from './lock.service';

/**
 * Service to ensure all pending operation writes have completed.
 *
 * Used by sync to guarantee conflict detection sees all local operations.
 * This prevents race conditions where an action is dispatched but the
 * corresponding operation hasn't been written to IndexedDB yet.
 *
 * ## How it works
 * The `OperationLogEffects.writeOperation()` uses `concatMap` for sequential
 * processing and acquires the `sp_op_log` lock for each write. By acquiring
 * the same lock, we wait for our turn in the queue - which means all prior
 * writes have completed. The Web Locks API guarantees FIFO ordering.
 */
@Injectable({ providedIn: 'root' })
export class OperationWriteFlushService {
  private lockService = inject(LockService);

  /**
   * Waits for all pending operation writes to complete.
   *
   * Acquires the same lock used by `writeOperation()`, ensuring
   * all queued writes finish before returning.
   *
   * @returns Promise that resolves when all pending writes are complete
   */
  async flushPendingWrites(): Promise<void> {
    await this.lockService.request('sp_op_log', async () => {
      // No-op - acquiring the lock ensures all prior writes have completed
      // (concatMap in effects + FIFO lock ordering guarantees this)
    });
  }
}
