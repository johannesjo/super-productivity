import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { OperationLogStoreService } from './operation-log-store.service';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { convertOpToAction } from './operation-converter.util';
import { OperationLogMigrationService } from './operation-log-migration.service';
import { PFLog } from '../../log';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { Operation, OpType } from './operation.types';
import { uuidv7 } from '../../../util/uuid-v7';
import { incrementVectorClock } from '../../../pfapi/api/util/vector-clock';

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Handles the hydration (loading) of the application state from the operation log
 * during application startup. It first attempts to load a saved state snapshot,
 * and then replays any subsequent operations from the log to bring the application
 * state up to date. This approach optimizes startup performance by avoiding a full
 * replay of all historical operations.
 */
@Injectable({ providedIn: 'root' })
export class OperationLogHydratorService {
  private store = inject(Store);
  private opLogStore = inject(OperationLogStoreService);
  private migrationService = inject(OperationLogMigrationService);
  private pfapiService = inject(PfapiService);

  async hydrateStore(): Promise<void> {
    PFLog.normal('OperationLogHydratorService: Starting hydration...');
    // 1. Load snapshot
    let snapshot = await this.opLogStore.loadStateCache();

    if (!snapshot) {
      PFLog.normal(
        'OperationLogHydratorService: No snapshot found. Checking for migration...',
      );
      // Fresh install or migration - no snapshot exists
      await this.migrationService.checkAndMigrate();
      // Try loading again after potential migration
      snapshot = await this.opLogStore.loadStateCache();
    }

    if (snapshot) {
      PFLog.normal('OperationLogHydratorService: Snapshot found. Hydrating state...', {
        lastAppliedOpSeq: snapshot.lastAppliedOpSeq,
      });
      // 2. Hydrate NgRx with snapshot
      // We cast state to any because AllSyncModels type is complex and we trust the cache
      this.store.dispatch(loadAllData({ appDataComplete: snapshot.state as any }));

      // 3. Replay tail operations
      const tailOps = await this.opLogStore.getOpsAfterSeq(snapshot.lastAppliedOpSeq);
      PFLog.normal(
        `OperationLogHydratorService: Replaying ${tailOps.length} tail operations.`,
      );

      for (const entry of tailOps) {
        const action = convertOpToAction(entry.op);
        this.store.dispatch(action);
      }
      PFLog.normal('OperationLogHydratorService: Hydration complete.');
    } else {
      PFLog.warn(
        'OperationLogHydratorService: No snapshot found. Replaying all operations from start.',
      );
      // No snapshot means we might be in a fresh install state or post-migration-check with no legacy data.
      // We must replay ALL operations from the beginning of the log.
      const allOps = await this.opLogStore.getOpsAfterSeq(0);
      PFLog.normal(
        `OperationLogHydratorService: Replaying all ${allOps.length} operations.`,
      );

      for (const entry of allOps) {
        const action = convertOpToAction(entry.op);
        this.store.dispatch(action);
      }
      PFLog.normal('OperationLogHydratorService: Full replay complete.');
    }
  }

  /**
   * Handles hydration after a remote sync download.
   * This method:
   * 1. Reads the newly synced data directly from 'pf' database (ModelCtrl caches)
   * 2. Creates a SYNC_IMPORT operation to persist it to SUP_OPS
   * 3. Saves a new state cache (snapshot) for crash safety
   * 4. Dispatches loadAllData to update NgRx
   *
   * This is called instead of hydrateStore() after sync downloads to ensure
   * the synced data is persisted to SUP_OPS and loaded into NgRx.
   */
  async hydrateFromRemoteSync(): Promise<void> {
    PFLog.normal('OperationLogHydratorService: Hydrating from remote sync...');

    try {
      // 1. Read synced data directly from 'pf' database (bypassing NgRx delegate)
      const syncedData = await this.pfapiService.pf.getAllSyncModelDataFromModelCtrls();
      PFLog.normal('OperationLogHydratorService: Loaded synced data from pf database');

      // 2. Get client ID for vector clock
      const clientId = await this.pfapiService.pf.metaModel.loadClientId();

      // 3. Create SYNC_IMPORT operation
      const currentClock = await this.opLogStore.getCurrentVectorClock();
      const newClock = incrementVectorClock(currentClock, clientId);

      const op: Operation = {
        id: uuidv7(),
        actionType: '[SP_ALL] Load(import) all data',
        opType: OpType.SyncImport,
        entityType: 'ALL',
        payload: syncedData,
        clientId: clientId,
        vectorClock: newClock,
        timestamp: Date.now(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };

      // 4. Append operation to SUP_OPS
      await this.opLogStore.append(op, 'remote');
      PFLog.normal('OperationLogHydratorService: Persisted SYNC_IMPORT operation');

      // 5. Get the sequence number of the operation we just wrote
      const lastSeq = await this.opLogStore.getLastSeq();

      // 6. Save new state cache (snapshot) for crash safety
      await this.opLogStore.saveStateCache({
        state: syncedData,
        lastAppliedOpSeq: lastSeq,
        vectorClock: newClock,
        compactedAt: Date.now(),
      });
      PFLog.normal('OperationLogHydratorService: Saved state cache after sync');

      // 7. Dispatch loadAllData to update NgRx
      this.store.dispatch(loadAllData({ appDataComplete: syncedData as any }));
      PFLog.normal(
        'OperationLogHydratorService: Dispatched loadAllData with synced data',
      );
    } catch (e) {
      PFLog.err('OperationLogHydratorService: Error during hydrateFromRemoteSync', e);
      throw e;
    }
  }
}
