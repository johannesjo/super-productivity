import { inject, Injectable } from '@angular/core';
import { LockService } from './lock.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { PfapiStoreDelegateService } from '../../../pfapi/pfapi-store-delegate.service';
import { CURRENT_SCHEMA_VERSION } from './schema-migration.service';
import { VectorClockService } from './vector-clock.service';

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
  private storeDelegate = inject(PfapiStoreDelegateService);
  private vectorClockService = inject(VectorClockService);

  async compact(): Promise<void> {
    await this.lockService.request('sp_op_log', async () => {
      // 1. Get current state from NgRx store (via delegate for consistency)
      const currentState = await this.storeDelegate.getAllSyncModelDataFromStore();

      // 2. Get current vector clock (max of all ops)
      const currentVectorClock = await this.vectorClockService.getCurrentVectorClock();

      // 3. Write to state cache with schema version
      const lastSeq = await this.opLogStore.getLastSeq();
      await this.opLogStore.saveStateCache({
        state: currentState,
        lastAppliedOpSeq: lastSeq,
        vectorClock: currentVectorClock,
        compactedAt: Date.now(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      });

      // 4. Reset compaction counter (persistent across tabs/restarts)
      await this.opLogStore.resetCompactionCounter();

      // 5. Delete old operations (keep recent for conflict resolution window)
      // Retention: 7 days - keeps enough history for conflict detection
      // Only delete ops that have been synced to remote
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
