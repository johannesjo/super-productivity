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
import { Operation, OpType, RepairPayload } from './operation.types';
import { uuidv7 } from '../../../util/uuid-v7';
import { incrementVectorClock } from '../../../pfapi/api/util/vector-clock';
import { SnackService } from '../../snack/snack.service';
import { T } from '../../../t.const';
import { ValidateStateService } from './validate-state.service';
import { RepairOperationService } from './repair-operation.service';
import { AppDataCompleteNew } from '../../../pfapi/pfapi-config';

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
  private validateStateService = inject(ValidateStateService);
  private repairOperationService = inject(RepairOperationService);

  // Flag to prevent re-validation immediately after repair
  private _isRepairInProgress = false;

  async hydrateStore(): Promise<void> {
    PFLog.normal('OperationLogHydratorService: Starting hydration...');

    try {
      // A.7.12: Check for interrupted migration (backup exists)
      const hasBackup = await this.opLogStore.hasStateCacheBackup();
      if (hasBackup) {
        PFLog.warn(
          'OperationLogHydratorService: Found migration backup - previous migration may have crashed. Restoring...',
        );
        await this.opLogStore.restoreStateCacheFromBackup();
        PFLog.normal('OperationLogHydratorService: Restored from backup.');
      }

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

      // 2. Run schema migration if needed (A.7.12: with backup safety)
      if (snapshot && this.schemaMigrationService.needsMigration(snapshot)) {
        snapshot = await this._migrateSnapshotWithBackup(snapshot);
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

        // CHECKPOINT B: Validate and repair snapshot state before dispatching
        let stateToLoad = snapshot.state as AppDataCompleteNew;
        if (!this._isRepairInProgress) {
          const validationResult = await this._validateAndRepairState(
            stateToLoad,
            'snapshot',
          );
          if (validationResult.wasRepaired && validationResult.repairedState) {
            stateToLoad = validationResult.repairedState;
            // Update snapshot with repaired state
            snapshot = { ...snapshot, state: stateToLoad };
          }
        }

        // 3. Hydrate NgRx with (possibly repaired) snapshot
        this.store.dispatch(loadAllData({ appDataComplete: stateToLoad as any }));

        // 4. Replay tail operations (A.7.13: with operation migration)
        const tailOps = await this.opLogStore.getOpsAfterSeq(snapshot.lastAppliedOpSeq);

        if (tailOps.length > 0) {
          // Optimization: If last op is SyncImport or Repair, skip replay and load directly
          const lastOp = tailOps[tailOps.length - 1].op;
          const appData = this._extractFullStateFromOp(lastOp);
          if (appData) {
            PFLog.normal(
              `OperationLogHydratorService: Last of ${tailOps.length} tail ops is ${lastOp.opType}, loading directly`,
            );
            this.store.dispatch(loadAllData({ appDataComplete: appData as any }));
            // No snapshot save needed - full state ops already contain complete state
            // Snapshot will be saved after next batch of regular operations
          } else {
            // A.7.13: Migrate tail operations before replay
            const opsToReplay = this._migrateTailOps(tailOps.map((e) => e.op));

            const droppedCount = tailOps.length - opsToReplay.length;
            PFLog.normal(
              `OperationLogHydratorService: Replaying ${opsToReplay.length} tail ops ` +
                `(${droppedCount} dropped during migration).`,
            );
            for (const op of opsToReplay) {
              const action = convertOpToAction(op);
              this.store.dispatch(action);
            }

            // 5. If we replayed many ops, save a new snapshot for faster future loads
            if (opsToReplay.length > 10) {
              PFLog.normal(
                `OperationLogHydratorService: Saving new snapshot after replaying ${opsToReplay.length} ops`,
              );
              await this._saveCurrentStateAsSnapshot();
            }

            // CHECKPOINT C: Validate state after replaying tail operations
            if (!this._isRepairInProgress) {
              await this._validateAndRepairCurrentState('tail-replay');
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

        // Optimization: If last op is SyncImport or Repair, skip replay and load directly
        const lastOp = allOps[allOps.length - 1].op;
        const appData = this._extractFullStateFromOp(lastOp);
        if (appData) {
          PFLog.normal(
            `OperationLogHydratorService: Last of ${allOps.length} ops is ${lastOp.opType}, loading directly`,
          );
          this.store.dispatch(loadAllData({ appDataComplete: appData as any }));
          // No snapshot save needed - full state ops already contain complete state
        } else {
          // A.7.13: Migrate all operations before replay
          const opsToReplay = this._migrateTailOps(allOps.map((e) => e.op));

          const droppedCount = allOps.length - opsToReplay.length;
          PFLog.normal(
            `OperationLogHydratorService: Replaying all ${opsToReplay.length} ops ` +
              `(${droppedCount} dropped during migration).`,
          );
          for (const op of opsToReplay) {
            const action = convertOpToAction(op);
            this.store.dispatch(action);
          }

          // Save snapshot after replay for faster future loads
          PFLog.normal(
            `OperationLogHydratorService: Saving snapshot after replaying ${opsToReplay.length} ops`,
          );
          await this._saveCurrentStateAsSnapshot();

          // CHECKPOINT C: Validate state after replaying all operations
          if (!this._isRepairInProgress) {
            await this._validateAndRepairCurrentState('full-replay');
          }
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
   * Extracts full application state from operations that contain complete state.
   * Returns undefined for operations that don't contain full state (normal CRUD ops).
   *
   * Operations that contain full state:
   * - OpType.SyncImport: Full state from remote sync
   * - OpType.Repair: Full repaired state from auto-repair
   * - OpType.BackupImport: Full state from backup file restore
   */
  private _extractFullStateFromOp(op: Operation): unknown | undefined {
    if (!op.payload) {
      return undefined;
    }

    // Handle full state operations
    if (
      op.opType === OpType.SyncImport ||
      op.opType === OpType.BackupImport ||
      op.opType === OpType.Repair
    ) {
      const payload = op.payload as
        | { appDataComplete?: unknown }
        | RepairPayload
        | unknown;

      // Check if payload has appDataComplete wrapper
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'appDataComplete' in payload
      ) {
        return (payload as { appDataComplete: unknown }).appDataComplete;
      }

      // Legacy format: payload IS the appDataComplete
      return payload;
    }

    return undefined;
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

  // ============================================================
  // A.7.12 Migration Safety & A.7.13 Tail Ops Migration
  // ============================================================

  /**
   * Migrates a snapshot with backup safety (A.7.12).
   * Creates a backup before migration and restores it if migration fails.
   *
   * @param snapshot - The snapshot to migrate
   * @returns The migrated snapshot
   * @throws If migration fails and rollback also fails
   */
  private async _migrateSnapshotWithBackup(snapshot: StateCache): Promise<StateCache> {
    PFLog.normal(
      'OperationLogHydratorService: Running schema migration with backup safety...',
    );

    // 1. Create backup before migration
    await this.opLogStore.saveStateCacheBackup();
    PFLog.normal('OperationLogHydratorService: Created pre-migration backup.');

    try {
      // 2. Run migration
      const migratedSnapshot = this.schemaMigrationService.migrateStateIfNeeded(snapshot);

      // 3. Save migrated snapshot
      await this.opLogStore.saveStateCache(migratedSnapshot);

      // 4. Clear backup on success
      await this.opLogStore.clearStateCacheBackup();
      PFLog.normal(
        'OperationLogHydratorService: Schema migration complete. Backup cleared.',
      );

      return migratedSnapshot;
    } catch (e) {
      PFLog.err(
        'OperationLogHydratorService: Schema migration failed. Restoring backup...',
        e,
      );

      try {
        // Restore backup
        await this.opLogStore.restoreStateCacheFromBackup();
        PFLog.normal(
          'OperationLogHydratorService: Backup restored after migration failure.',
        );
      } catch (restoreErr) {
        PFLog.err(
          'OperationLogHydratorService: CRITICAL - Failed to restore backup after migration failure!',
          restoreErr,
        );
        // Both migration and restore failed - this is a critical error
        throw new Error(
          `Schema migration failed and backup restore also failed. ` +
            `Original error: ${e instanceof Error ? e.message : String(e)}. ` +
            `Restore error: ${restoreErr instanceof Error ? restoreErr.message : String(restoreErr)}`,
        );
      }

      // Re-throw original error after successful restore
      throw e;
    }
  }

  /**
   * Migrates tail operations to current schema version (A.7.13).
   * Operations that should be dropped (e.g., for removed features) are filtered out.
   *
   * @param ops - The operations to migrate
   * @returns Array of migrated operations
   */
  private _migrateTailOps(ops: Operation[]): Operation[] {
    // Check if any ops need migration
    const needsMigration = ops.some((op) =>
      this.schemaMigrationService.operationNeedsMigration(op),
    );

    if (!needsMigration) {
      return ops;
    }

    PFLog.normal(
      `OperationLogHydratorService: Migrating ${ops.length} tail ops to current schema version...`,
    );

    return this.schemaMigrationService.migrateOperations(ops);
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

  /**
   * Validates a state object and repairs it if necessary.
   * Used for validating snapshot state before dispatching.
   *
   * @param state - The state to validate
   * @param context - Context string for logging (e.g., 'snapshot', 'tail-replay')
   * @returns Validation result with optional repaired state
   */
  private async _validateAndRepairState(
    state: AppDataCompleteNew,
    context: string,
  ): Promise<{ wasRepaired: boolean; repairedState?: AppDataCompleteNew }> {
    const result = this.validateStateService.validateAndRepair(state);

    if (!result.wasRepaired) {
      return { wasRepaired: false };
    }

    if (!result.repairedState || !result.repairSummary) {
      PFLog.err(
        `[OperationLogHydratorService] Repair failed for ${context}:`,
        result.error,
      );
      return { wasRepaired: false };
    }

    // Create REPAIR operation to persist the repaired state
    this._isRepairInProgress = true;
    try {
      const clientId = await this.pfapiService.pf.metaModel.loadClientId();
      await this.repairOperationService.createRepairOperation(
        result.repairedState,
        result.repairSummary,
        clientId,
      );
      PFLog.log(`[OperationLogHydratorService] Created REPAIR operation for ${context}`);
    } finally {
      this._isRepairInProgress = false;
    }

    return { wasRepaired: true, repairedState: result.repairedState };
  }

  /**
   * Validates the current NgRx state and repairs it if necessary.
   * Used after replaying operations.
   *
   * @param context - Context string for logging
   */
  private async _validateAndRepairCurrentState(context: string): Promise<void> {
    // Get current state from NgRx
    const currentState =
      (await this.storeDelegateService.getAllSyncModelDataFromStore()) as AppDataCompleteNew;

    const result = await this._validateAndRepairState(currentState, context);

    if (result.wasRepaired && result.repairedState) {
      // Dispatch the repaired state to NgRx
      this.store.dispatch(loadAllData({ appDataComplete: result.repairedState as any }));
    }
  }
}
