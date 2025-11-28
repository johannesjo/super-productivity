import { inject, Injectable } from '@angular/core';
import { LockService } from './lock.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { PfapiService } from '../../../pfapi/pfapi.service';

/**
 * Manages the compaction (garbage collection) of the operation log.
 * To prevent the log from growing indefinitely, this service periodically
 * creates a complete snapshot of the current application state and stores it
 * in IndexedDB. It then deletes old operations from the log that are already
 * reflected in the snapshot and have been successfully synced (if applicable)
 * and are older than a defined retention window.
 */
@Injectable({ providedIn: 'root' })
export class OperationLogCompactionService {
  private opLogStore = inject(OperationLogStoreService);
  private lockService = inject(LockService);
  private pfapiService = inject(PfapiService);

  async compact(): Promise<void> {
    await this.lockService.request('sp_op_log_compact', async () => {
      // 1. Get current state
      const currentState = await this.pfapiService.pf.getAllSyncModelData();

      // 2. Get current vector clock (max of all ops)
      const currentVectorClock = await this.opLogStore.getCurrentVectorClock();

      // 3. Write to state cache
      const lastSeq = await this.opLogStore.getLastSeq();
      await this.opLogStore.saveStateCache({
        state: currentState,
        lastAppliedOpSeq: lastSeq,
        vectorClock: currentVectorClock,
        compactedAt: Date.now(),
      });

      // 4. Delete old operations (keep recent for conflict resolution window)
      const retentionWindowMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      const cutoff = Date.now() - retentionWindowMs;

      await this.opLogStore.deleteOpsWhere(
        (entry) =>
          !!entry.syncedAt && // never drop unsynced ops
          entry.appliedAt < cutoff &&
          entry.seq <= lastSeq, // keep tail for conflict frontier
      );
    });
  }
}
