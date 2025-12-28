import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { OperationLogStoreService } from './operation-log-store.service';
import { CURRENT_SCHEMA_VERSION } from './schema-migration.service';
import { PfapiService } from '../../pfapi/pfapi.service';
import { ClientIdService } from '../../core/util/client-id.service';
import { VectorClockService } from '../sync/vector-clock.service';
import { ValidateStateService } from '../validation/validate-state.service';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import { Operation, OpType, ActionType } from '../core/operation.types';
import { uuidv7 } from '../../util/uuid-v7';
import { incrementVectorClock, mergeVectorClocks } from '../../core/util/vector-clock';
import { OpLog } from '../../core/log';
import { AppDataCompleteNew } from '../../pfapi/pfapi-config';

/**
 * Handles hydration after remote sync downloads.
 *
 * Responsibilities:
 * - Merging entity models from sync with archive data from IndexedDB
 * - Creating SYNC_IMPORT operations with proper vector clocks
 * - Saving state cache (snapshot) for crash safety
 * - Updating NgRx with synced data
 *
 * This service is called by sync providers after downloading remote data,
 * instead of the normal startup hydration flow.
 */
@Injectable({ providedIn: 'root' })
export class SyncHydrationService {
  private store = inject(Store);
  private opLogStore = inject(OperationLogStoreService);
  private pfapiService = inject(PfapiService);
  private clientIdService = inject(ClientIdService);
  private vectorClockService = inject(VectorClockService);
  private validateStateService = inject(ValidateStateService);

  /**
   * Handles hydration after a remote sync download.
   * This method:
   * 1. Merges passed mainModelData (entity models) with IndexedDB data (archive models)
   * 2. Creates a SYNC_IMPORT operation to persist it to SUP_OPS
   * 3. Saves a new state cache (snapshot) for crash safety
   * 4. Dispatches loadAllData to update NgRx
   *
   * This is called instead of hydrateStore() after sync downloads to ensure
   * the synced data is persisted to SUP_OPS and loaded into NgRx.
   *
   * @param downloadedMainModelData - Entity models from remote meta file.
   *   These are NOT stored in IndexedDB (only archives are) so must be passed explicitly.
   */
  async hydrateFromRemoteSync(
    downloadedMainModelData?: Record<string, unknown>,
  ): Promise<void> {
    OpLog.normal('SyncHydrationService: Hydrating from remote sync...');

    try {
      // 1. Read archive data from IndexedDB and merge with passed entity data
      // Entity models (task, tag, project, etc.) come from downloadedMainModelData
      // Archive models (archiveYoung, archiveOld) come from IndexedDB
      const dbData = await this.pfapiService.pf.getAllSyncModelDataFromModelCtrls();
      const mergedData = downloadedMainModelData
        ? { ...dbData, ...downloadedMainModelData }
        : dbData;
      const syncedData = this._stripLocalOnlySettings(mergedData);
      OpLog.normal(
        'SyncHydrationService: Loaded synced data',
        downloadedMainModelData
          ? '(merged passed entity models with archive data from DB)'
          : '(from pf database only)',
      );

      // 2. Get client ID for vector clock
      const clientId = await this.clientIdService.loadClientId();
      if (!clientId) {
        throw new Error('Failed to load clientId - cannot create SYNC_IMPORT operation');
      }

      // 3. Create SYNC_IMPORT operation with merged clock
      // CRITICAL: The SYNC_IMPORT's clock must include ALL known clients, not just local ones.
      // If we only use the local clock, ops from other clients will be CONCURRENT with
      // this import and get filtered out by SyncImportFilterService.
      // By merging the PFAPI meta model's clock (which includes synced clients),
      // we ensure ops created AFTER this sync point are GREATER_THAN the import.
      const localClock = await this.vectorClockService.getCurrentVectorClock();
      const pfapiMetaModel = await this.pfapiService.pf.metaModel.load();
      const pfapiClock = pfapiMetaModel?.vectorClock || {};
      const mergedClock = mergeVectorClocks(localClock, pfapiClock);
      const newClock = incrementVectorClock(mergedClock, clientId);
      OpLog.normal('SyncHydrationService: Creating SYNC_IMPORT with merged clock', {
        localClockSize: Object.keys(localClock).length,
        pfapiClockSize: Object.keys(pfapiClock).length,
        mergedClockSize: Object.keys(mergedClock).length,
      });

      const op: Operation = {
        id: uuidv7(),
        actionType: ActionType.LOAD_ALL_DATA,
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
      OpLog.normal('SyncHydrationService: Persisted SYNC_IMPORT operation');

      // 5. Get the sequence number of the operation we just wrote
      const lastSeq = await this.opLogStore.getLastSeq();

      // 6. Validate and repair synced data before dispatching
      // This fixes stale task references (e.g., tags/projects referencing deleted tasks)
      let dataToLoad = syncedData as AppDataCompleteNew;
      const validationResult = this.validateStateService.validateAndRepair(dataToLoad);
      if (validationResult.wasRepaired && validationResult.repairedState) {
        dataToLoad = validationResult.repairedState;
        OpLog.normal('SyncHydrationService: Repaired synced data before loading');
      }

      // 7. Save new state cache (snapshot) for crash safety
      await this.opLogStore.saveStateCache({
        state: dataToLoad,
        lastAppliedOpSeq: lastSeq,
        vectorClock: newClock,
        compactedAt: Date.now(),
      });
      OpLog.normal('SyncHydrationService: Saved state cache after sync');

      // 8. Update vector clock store to match the new clock
      // This is critical because:
      // - The SYNC_IMPORT was appended with source='remote', so store wasn't updated
      // - If user creates new ops in this session, incrementAndStoreVectorClock reads from store
      // - Without this, new ops would have clocks missing entries from the SYNC_IMPORT
      await this.opLogStore.setVectorClock(newClock);
      OpLog.normal('SyncHydrationService: Updated vector clock store after sync');

      // 9. Dispatch loadAllData to update NgRx
      this.store.dispatch(loadAllData({ appDataComplete: dataToLoad }));
      OpLog.normal('SyncHydrationService: Dispatched loadAllData with synced data');
    } catch (e) {
      OpLog.err('SyncHydrationService: Error during hydrateFromRemoteSync', e);
      throw e;
    }
  }

  /**
   * Strips local-only settings from synced data to prevent them from being
   * overwritten by remote data. These settings should remain local to each client.
   *
   * Currently strips:
   * - globalConfig.sync.syncProvider: Each client chooses its own sync provider
   */
  private _stripLocalOnlySettings(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const typedData = data as Record<string, unknown>;
    if (!typedData['globalConfig']) {
      return data;
    }

    const globalConfig = typedData['globalConfig'] as Record<string, unknown>;
    if (!globalConfig['sync']) {
      return data;
    }

    const sync = globalConfig['sync'] as Record<string, unknown>;

    // Return data with syncProvider nulled out
    return {
      ...typedData,
      globalConfig: {
        ...globalConfig,
        sync: {
          ...sync,
          syncProvider: null, // Local-only setting, don't overwrite from remote
        },
      },
    };
  }
}
