import { inject, Injectable } from '@angular/core';
import { LockService } from '../sync/lock.service';
import {
  COMPACTION_RETENTION_MS,
  COMPACTION_TIMEOUT_MS,
  EMERGENCY_COMPACTION_RETENTION_MS,
} from '../operation-log.const';
import { OperationLogStoreService } from './operation-log-store.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { CURRENT_SCHEMA_VERSION } from './schema-migration.service';
import { VectorClockService } from '../sync/vector-clock.service';
import { OpLog } from '../../../log';

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
    await this._doCompact(COMPACTION_RETENTION_MS, false);
  }

  /**
   * Emergency compaction triggered when storage quota is exceeded.
   * Uses a shorter retention window (1 day instead of 7) to free more space.
   * Returns true if compaction succeeded, false otherwise.
   */
  async emergencyCompact(): Promise<boolean> {
    try {
      await this._doCompact(EMERGENCY_COMPACTION_RETENTION_MS, true);
      return true;
    } catch (e) {
      OpLog.err('OperationLogCompactionService: Emergency compaction failed', e);
      return false;
    }
  }

  /**
   * Core compaction logic shared between regular and emergency compaction.
   * @param retentionMs - How long to keep synced operations (in ms)
   * @param isEmergency - Whether this is an emergency compaction (for logging)
   */
  private async _doCompact(retentionMs: number, isEmergency: boolean): Promise<void> {
    await this.lockService.request('sp_op_log', async () => {
      const startTime = Date.now();
      const label = isEmergency ? 'emergency ' : '';

      // 1. Get current state from NgRx store (via delegate for consistency)
      const currentState = await this.storeDelegate.getAllSyncModelDataFromStore();
      this.checkCompactionTimeout(startTime, `${label}state snapshot`);

      // 2. Get current vector clock (max of all ops)
      const currentVectorClock = await this.vectorClockService.getCurrentVectorClock();
      this.checkCompactionTimeout(startTime, `${label}vector clock`);

      // 3. Get lastSeq IMMEDIATELY before writing cache to minimize race window
      // This ensures new ops written after this point have seq > lastSeq
      const lastSeq = await this.opLogStore.getLastSeq();

      // 4. Write to state cache with schema version
      await this.opLogStore.saveStateCache({
        state: currentState,
        lastAppliedOpSeq: lastSeq,
        vectorClock: currentVectorClock,
        compactedAt: Date.now(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      });

      // After snapshot is saved, new operations with seq > lastSeq won't be deleted

      // 5. Reset compaction counter (persistent across tabs/restarts)
      await this.opLogStore.resetCompactionCounter();

      // 6. Delete old operations (keep recent for conflict resolution window)
      // Only delete ops that have been synced to remote
      const cutoff = Date.now() - retentionMs;

      await this.opLogStore.deleteOpsWhere(
        (entry) =>
          !!entry.syncedAt && // never drop unsynced ops
          entry.appliedAt < cutoff &&
          entry.seq <= lastSeq, // keep tail for conflict frontier
      );
    });
  }

  /**
   * Checks if compaction has exceeded the timeout threshold.
   * If exceeded, throws an error to abort compaction before the lock expires.
   * This prevents data corruption from concurrent access.
   */
  private checkCompactionTimeout(startTime: number, phase: string): void {
    const elapsed = Date.now() - startTime;
    if (elapsed > COMPACTION_TIMEOUT_MS) {
      throw new Error(
        `Compaction timeout after ${elapsed}ms during ${phase}. ` +
          `Aborting to prevent lock expiration. ` +
          `Consider reducing state size or increasing timeout.`,
      );
    }
  }
}
