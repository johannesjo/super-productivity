import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { OperationLogStoreService } from './operation-log-store.service';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { convertOpToAction } from './operation-converter.util';
import { OperationLogMigrationService } from './operation-log-migration.service';
import {
  CURRENT_SCHEMA_VERSION,
  MigratableStateCache,
  SchemaMigrationService,
} from './schema-migration.service';
import { PFLog } from '../../log';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { PfapiStoreDelegateService } from '../../../pfapi/pfapi-store-delegate.service';
import { Operation, OpType } from './operation.types';
import { uuidv7 } from '../../../util/uuid-v7';
import { incrementVectorClock } from '../../../pfapi/api/util/vector-clock';
import { SnackService } from '../../snack/snack.service';
import { T } from '../../../t.const';

type StateCache = MigratableStateCache;

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
  private schemaMigrationService = inject(SchemaMigrationService);
  private pfapiService = inject(PfapiService);
  private storeDelegateService = inject(PfapiStoreDelegateService);
  private snackService = inject(SnackService);

  async hydrateStore(): Promise<void> {
    PFLog.normal('OperationLogHydratorService: Starting hydration...');

    try {
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

      // 2. Run schema migration if needed
      if (snapshot && this.schemaMigrationService.needsMigration(snapshot)) {
        PFLog.normal('OperationLogHydratorService: Running schema migration...');
        snapshot = this.schemaMigrationService.migrateIfNeeded(snapshot);
        // Save migrated snapshot
        await this.opLogStore.saveStateCache(snapshot);
        PFLog.normal('OperationLogHydratorService: Schema migration complete.');
      }

      // 3. Validate snapshot if it exists
      if (snapshot && !this._isValidSnapshot(snapshot)) {
        PFLog.warn(
          'OperationLogHydratorService: Snapshot is invalid/corrupted. Attempting recovery...',
        );
        await this._attemptRecovery();
        return;
      }

      if (snapshot) {
        PFLog.normal('OperationLogHydratorService: Snapshot found. Hydrating state...', {
          lastAppliedOpSeq: snapshot.lastAppliedOpSeq,
        });
        // 3. Hydrate NgRx with snapshot
        // We cast state to any because AllSyncModels type is complex and we trust the cache
        this.store.dispatch(loadAllData({ appDataComplete: snapshot.state as any }));

        // 4. Replay tail operations
        const tailOps = await this.opLogStore.getOpsAfterSeq(snapshot.lastAppliedOpSeq);

        if (tailOps.length > 0) {
          // Optimization: If last op is SyncImport, skip replay and load it directly
          const lastOp = tailOps[tailOps.length - 1].op;
          if (lastOp.opType === OpType.SyncImport && lastOp.payload) {
            PFLog.normal(
              `OperationLogHydratorService: Last of ${tailOps.length} tail ops is SyncImport, loading directly`,
            );
            const payload = lastOp.payload as { appDataComplete?: unknown } | unknown;
            const appData =
              typeof payload === 'object' &&
              payload !== null &&
              'appDataComplete' in payload
                ? payload.appDataComplete
                : payload;
            this.store.dispatch(loadAllData({ appDataComplete: appData as any }));
            // No snapshot save needed - SyncImport already contains full state
            // Snapshot will be saved after next batch of regular operations
          } else {
            PFLog.normal(
              `OperationLogHydratorService: Replaying ${tailOps.length} tail operations.`,
            );
            for (const entry of tailOps) {
              const action = convertOpToAction(entry.op);
              this.store.dispatch(action);
            }

            // 5. If we replayed many ops, save a new snapshot for faster future loads
            if (tailOps.length > 10) {
              PFLog.normal(
                `OperationLogHydratorService: Saving new snapshot after replaying ${tailOps.length} ops`,
              );
              await this._saveCurrentStateAsSnapshot();
            }
          }
        }

        PFLog.normal('OperationLogHydratorService: Hydration complete.');
      } else {
        PFLog.warn(
          'OperationLogHydratorService: No snapshot found. Replaying all operations from start.',
        );
        // No snapshot means we might be in a fresh install state or post-migration-check with no legacy data.
        // We must replay ALL operations from the beginning of the log.
        const allOps = await this.opLogStore.getOpsAfterSeq(0);

        if (allOps.length === 0) {
          // Fresh install - no data at all
          PFLog.normal(
            'OperationLogHydratorService: Fresh install detected. No data to load.',
          );
          return;
        }

        // Optimization: If last op is SyncImport, skip replay and load it directly
        const lastOp = allOps[allOps.length - 1].op;
        if (lastOp.opType === OpType.SyncImport && lastOp.payload) {
          PFLog.normal(
            `OperationLogHydratorService: Last of ${allOps.length} ops is SyncImport, loading directly`,
          );
          const payload = lastOp.payload as { appDataComplete?: unknown } | unknown;
          const appData =
            typeof payload === 'object' &&
            payload !== null &&
            'appDataComplete' in payload
              ? payload.appDataComplete
              : payload;
          this.store.dispatch(loadAllData({ appDataComplete: appData as any }));
          // No snapshot save needed - SyncImport already contains full state
        } else {
          PFLog.normal(
            `OperationLogHydratorService: Replaying all ${allOps.length} operations.`,
          );
          for (const entry of allOps) {
            const action = convertOpToAction(entry.op);
            this.store.dispatch(action);
          }

          // Save snapshot after replay for faster future loads
          PFLog.normal(
            `OperationLogHydratorService: Saving snapshot after replaying ${allOps.length} ops`,
          );
          await this._saveCurrentStateAsSnapshot();
        }

        PFLog.normal('OperationLogHydratorService: Full replay complete.');
      }
    } catch (e) {
      PFLog.err('OperationLogHydratorService: Error during hydration', e);
      try {
        await this._attemptRecovery();
      } catch (recoveryErr) {
        PFLog.err('OperationLogHydratorService: Recovery also failed', recoveryErr);
        this.snackService.open({
          type: 'ERROR',
          msg: T.F.SYNC.S.HYDRATION_FAILED,
          actionStr: T.PS.RELOAD,
          actionFn: (): void => {
            window.location.reload();
          },
        });
        throw recoveryErr;
      }
    }
  }

  /**
   * Validates that a snapshot has the expected structure and data.
   */
  private _isValidSnapshot(snapshot: StateCache): boolean {
    // Check required properties exist
    if (!snapshot.state || typeof snapshot.lastAppliedOpSeq !== 'number') {
      return false;
    }

    // Check state is an object with expected structure
    const state = snapshot.state as Record<string, unknown>;
    if (typeof state !== 'object' || state === null) {
      return false;
    }

    // Check for at least some core models (task, project, globalConfig)
    // These should always exist even if empty
    const coreModels = ['task', 'project', 'globalConfig'];
    for (const model of coreModels) {
      if (!(model in state)) {
        PFLog.warn(
          `OperationLogHydratorService: Missing core model in snapshot: ${model}`,
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Attempts to recover from a corrupted or missing SUP_OPS database.
   * Recovery strategy:
   * 1. Try to load data from legacy 'pf' database (ModelCtrl caches)
   * 2. If found, run genesis migration with that data
   * 3. If no legacy data, log error (user will need to sync or restore from backup)
   */
  private async _attemptRecovery(): Promise<void> {
    PFLog.normal('OperationLogHydratorService: Attempting disaster recovery...');

    try {
      // 1. Try to load from legacy 'pf' database
      const legacyData = await this.pfapiService.pf.getAllSyncModelDataFromModelCtrls();

      // Check if legacy data has any actual content
      const hasData = this._hasUsableData(legacyData);

      if (hasData) {
        PFLog.normal(
          'OperationLogHydratorService: Found data in legacy database. Recovering...',
        );
        await this._recoverFromLegacyData(legacyData);
        return;
      }

      // 2. No legacy data found - check if sync provider is available
      PFLog.warn(
        'OperationLogHydratorService: No legacy data found. ' +
          'If you have sync enabled, please trigger a sync to restore your data. ' +
          'Otherwise, you may need to restore from a backup.',
      );

      // Dispatch empty state so app can at least start
      // User can then sync or import a backup
    } catch (e) {
      PFLog.err('OperationLogHydratorService: Recovery failed', e);
      // App will start with empty state
      // User can sync or restore from backup
    }
  }

  /**
   * Checks if the data has any usable content (not just empty/default state).
   */
  private _hasUsableData(data: Record<string, unknown>): boolean {
    // Check if there are any tasks (the most important data)
    const taskState = data['task'] as { ids?: string[] } | undefined;
    if (taskState?.ids && taskState.ids.length > 0) {
      return true;
    }

    // Check if there are any projects beyond the default
    const projectState = data['project'] as { ids?: string[] } | undefined;
    if (projectState?.ids && projectState.ids.length > 1) {
      return true;
    }

    // Check if there's any configuration that suggests user has used the app
    const globalConfig = data['globalConfig'] as Record<string, unknown> | undefined;
    if (globalConfig && Object.keys(globalConfig).length > 0) {
      // Has some configuration - might be worth recovering
      return true;
    }

    return false;
  }

  /**
   * Recovers from legacy data by creating a new genesis snapshot.
   */
  private async _recoverFromLegacyData(
    legacyData: Record<string, unknown>,
  ): Promise<void> {
    const clientId = await this.pfapiService.pf.metaModel.loadClientId();

    // Create recovery operation
    const recoveryOp: Operation = {
      id: uuidv7(),
      actionType: '[Recovery] Data Recovery Import',
      opType: OpType.Batch,
      entityType: 'RECOVERY',
      entityId: '*',
      payload: legacyData,
      clientId: clientId,
      vectorClock: { [clientId]: 1 },
      timestamp: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    // Write recovery operation
    await this.opLogStore.append(recoveryOp);

    // Create state cache
    const lastSeq = await this.opLogStore.getLastSeq();
    await this.opLogStore.saveStateCache({
      state: legacyData,
      lastAppliedOpSeq: lastSeq,
      vectorClock: recoveryOp.vectorClock,
      compactedAt: Date.now(),
    });

    // Dispatch to NgRx
    this.store.dispatch(loadAllData({ appDataComplete: legacyData as any }));

    PFLog.normal(
      'OperationLogHydratorService: Recovery complete. Data restored from legacy database.',
    );
  }

  /**
   * Saves the current NgRx state as a snapshot for faster future loads.
   * Called after replaying many operations to optimize next startup.
   */
  private async _saveCurrentStateAsSnapshot(): Promise<void> {
    try {
      // Get current state from NgRx
      const currentState = await this.storeDelegateService.getAllSyncModelDataFromStore();

      // Get current vector clock and last seq
      const vectorClock = await this.opLogStore.getCurrentVectorClock();
      const lastSeq = await this.opLogStore.getLastSeq();

      // Save snapshot
      await this.opLogStore.saveStateCache({
        state: currentState,
        lastAppliedOpSeq: lastSeq,
        vectorClock,
        compactedAt: Date.now(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      });

      PFLog.normal('OperationLogHydratorService: Saved new snapshot after replay');
    } catch (e) {
      // Don't fail hydration if snapshot save fails
      PFLog.warn('OperationLogHydratorService: Failed to save snapshot after replay', e);
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
