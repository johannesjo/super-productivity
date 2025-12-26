import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { OperationLogStoreService } from './operation-log-store.service';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';
import { OperationLogMigrationService } from './operation-log-migration.service';
import {
  CURRENT_SCHEMA_VERSION,
  MigratableStateCache,
  SchemaMigrationService,
} from './schema-migration.service';
import { OpLog } from '../../../log';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { Operation, OpType, RepairPayload } from '../operation.types';
import { uuidv7 } from '../../../../util/uuid-v7';
import {
  incrementVectorClock,
  mergeVectorClocks,
} from '../../../../pfapi/api/util/vector-clock';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';
import { ValidateStateService } from '../processing/validate-state.service';
// DISABLED: Repair system is non-functional
// import { RepairOperationService } from '../processing/repair-operation.service';
import { OperationApplierService } from '../processing/operation-applier.service';
import { HydrationStateService } from '../processing/hydration-state.service';
import { bulkApplyHydrationOperations } from '../bulk-hydration.action';
import { AppDataCompleteNew } from '../../../../pfapi/pfapi-config';
import { VectorClockService } from '../sync/vector-clock.service';
import {
  MAX_CONFLICT_RETRY_ATTEMPTS,
  PENDING_OPERATION_EXPIRY_MS,
} from '../operation-log.const';

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
  // DISABLED: Repair system is non-functional
  // private repairOperationService = inject(RepairOperationService);
  private vectorClockService = inject(VectorClockService);
  private operationApplierService = inject(OperationApplierService);
  private hydrationStateService = inject(HydrationStateService);

  // Mutex to prevent concurrent repair operations and re-validation during repair
  private _repairMutex: Promise<void> | null = null;

  // Track if schema migration ran during this hydration (requires validation)
  private _migrationRanDuringHydration = false;

  async hydrateStore(): Promise<void> {
    OpLog.normal('OperationLogHydratorService: Starting hydration...');

    try {
      // Check for pending remote ops from crashed sync
      await this._recoverPendingRemoteOps();

      // Migrate vector clock from pf.META_MODEL to SUP_OPS.vector_clock if needed.
      // This is a one-time migration when upgrading from DB version 1 to 2.
      // The vector_clock store in SUP_OPS is now the source of truth for performance.
      await this._migrateVectorClockFromPfapiIfNeeded();

      // A.7.12: Check for interrupted migration (backup exists)
      const hasBackup = await this.opLogStore.hasStateCacheBackup();
      if (hasBackup) {
        OpLog.warn(
          'OperationLogHydratorService: Found migration backup - previous migration may have crashed. Restoring...',
        );
        await this.opLogStore.restoreStateCacheFromBackup();
        OpLog.normal('OperationLogHydratorService: Restored from backup.');
      }

      // 1. Load snapshot
      let snapshot = await this.opLogStore.loadStateCache();

      if (!snapshot) {
        OpLog.normal(
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
        this._migrationRanDuringHydration = true;
      }

      // 3. Validate snapshot if it exists
      if (snapshot && !this._isValidSnapshot(snapshot)) {
        OpLog.warn(
          'OperationLogHydratorService: Snapshot is invalid/corrupted. Attempting recovery...',
        );
        await this._attemptRecovery();
        return;
      }

      if (snapshot) {
        OpLog.normal('OperationLogHydratorService: Snapshot found. Hydrating state...', {
          lastAppliedOpSeq: snapshot.lastAppliedOpSeq,
        });

        // CHECKPOINT B: Schema-version trust optimization
        // Skip synchronous validation if schema version matches current - the snapshot
        // was validated before being saved in the previous session. Only validate
        // synchronously if a migration ran (schema changed).
        // A deferred background validation runs after hydration to catch any corruption.
        let stateToLoad = snapshot.state as AppDataCompleteNew;
        const snapshotSchemaVersion = (snapshot as { schemaVersion?: number })
          .schemaVersion;
        const needsSyncValidation =
          this._migrationRanDuringHydration ||
          snapshotSchemaVersion !== CURRENT_SCHEMA_VERSION;

        if (needsSyncValidation && !this._repairMutex) {
          OpLog.normal(
            'OperationLogHydratorService: Running synchronous validation (migration ran or schema mismatch)',
          );
          const validationResult = await this._validateAndRepairState(
            stateToLoad,
            'snapshot',
          );
          if (validationResult.wasRepaired && validationResult.repairedState) {
            stateToLoad = validationResult.repairedState;
            // Update snapshot with repaired state
            snapshot = { ...snapshot, state: stateToLoad };
          }
        } else {
          OpLog.normal(
            'OperationLogHydratorService: Trusting snapshot (schema version matches, no migration)',
          );
        }

        // CRITICAL: Restore snapshot's vector clock to the vector_clock store.
        // This is necessary because:
        // 1. hydrateFromRemoteSync saves the clock in the snapshot but NOT in the store
        // 2. When user creates new ops, incrementAndStoreVectorClock reads from the store
        // 3. Without this, new ops would have clocks missing entries from the SYNC_IMPORT
        // 4. Those ops would be CONCURRENT with the SYNC_IMPORT and get filtered on sync
        if (snapshot.vectorClock && Object.keys(snapshot.vectorClock).length > 0) {
          await this.opLogStore.setVectorClock(snapshot.vectorClock);
          OpLog.normal(
            'OperationLogHydratorService: Restored vector clock from snapshot',
            { clockSize: Object.keys(snapshot.vectorClock).length },
          );
        }

        // 3. Hydrate NgRx with (possibly repaired) snapshot
        this.store.dispatch(loadAllData({ appDataComplete: stateToLoad }));

        // 4. Replay tail operations (A.7.13: with operation migration)
        const tailOps = await this.opLogStore.getOpsAfterSeq(snapshot.lastAppliedOpSeq);

        if (tailOps.length > 0) {
          // Optimization: If last op is SyncImport or Repair, skip replay and load directly
          const lastOp = tailOps[tailOps.length - 1].op;
          const appData = this._extractFullStateFromOp(lastOp);
          if (appData) {
            OpLog.normal(
              `OperationLogHydratorService: Last of ${tailOps.length} tail ops is ${lastOp.opType}, loading directly`,
            );

            // Validate and repair the full-state data BEFORE loading to NgRx
            // This prevents corrupted SyncImport/Repair operations from breaking the app
            if (!this._repairMutex) {
              const validationResult = await this._validateAndRepairState(
                appData as AppDataCompleteNew,
                'tail-full-state-op-load',
              );
              const tailStateToLoad =
                validationResult.wasRepaired && validationResult.repairedState
                  ? validationResult.repairedState
                  : (appData as AppDataCompleteNew);
              this.store.dispatch(loadAllData({ appDataComplete: tailStateToLoad }));
            } else {
              this.store.dispatch(
                loadAllData({ appDataComplete: appData as AppDataCompleteNew }),
              );
            }
            // Merge the full-state op's clock into local clock
            // This ensures subsequent ops have clocks that dominate this SYNC_IMPORT
            await this.opLogStore.mergeRemoteOpClocks([lastOp]);
            // No snapshot save needed - full state ops already contain complete state
            // Snapshot will be saved after next batch of regular operations
          } else {
            // A.7.13: Migrate tail operations before replay
            const opsToReplay = this._migrateTailOps(tailOps.map((e) => e.op));

            const droppedCount = tailOps.length - opsToReplay.length;
            OpLog.normal(
              `OperationLogHydratorService: Replaying ${opsToReplay.length} tail ops ` +
                `(${droppedCount} dropped during migration).`,
            );
            // PERF: Use bulk dispatch to apply all operations in a single NgRx update.
            // This reduces 500 dispatches to 1, dramatically improving startup performance.
            // The bulkHydrationMetaReducer iterates through ops and applies each action.
            this.hydrationStateService.startApplyingRemoteOps();
            this.store.dispatch(
              bulkApplyHydrationOperations({ operations: opsToReplay }),
            );
            this.hydrationStateService.endApplyingRemoteOps();

            // Merge replayed ops' clocks into local clock
            // This ensures subsequent ops have clocks that dominate these tail ops
            await this.opLogStore.mergeRemoteOpClocks(opsToReplay);

            // CHECKPOINT C: Validate state after replaying tail operations
            // Must validate BEFORE saving snapshot to avoid persisting corrupted state
            if (!this._repairMutex) {
              await this._validateAndRepairCurrentState('tail-replay');
            }

            // 5. If we replayed many ops, save a new snapshot for faster future loads
            // Snapshot is saved AFTER validation to ensure we persist valid/repaired state
            if (opsToReplay.length > 10) {
              OpLog.normal(
                `OperationLogHydratorService: Saving new snapshot after replaying ${opsToReplay.length} ops`,
              );
              await this._saveCurrentStateAsSnapshot();
            }
          }
        }

        OpLog.normal('OperationLogHydratorService: Hydration complete.');
      } else {
        OpLog.warn(
          'OperationLogHydratorService: No snapshot found. Replaying all operations from start.',
        );
        // No snapshot means we might be in a fresh install state or post-migration-check with no legacy data.
        // We must replay ALL operations from the beginning of the log.
        const allOps = await this.opLogStore.getOpsAfterSeq(0);

        if (allOps.length === 0) {
          // Fresh install - no data at all
          OpLog.normal(
            'OperationLogHydratorService: Fresh install detected. No data to load.',
          );
          return;
        }

        // Optimization: If last op is SyncImport or Repair, skip replay and load directly
        const lastOp = allOps[allOps.length - 1].op;
        const appData = this._extractFullStateFromOp(lastOp);
        if (appData) {
          OpLog.normal(
            `OperationLogHydratorService: Last of ${allOps.length} ops is ${lastOp.opType}, loading directly`,
          );

          // Validate and repair the full-state data BEFORE loading to NgRx
          // This prevents corrupted SyncImport/Repair operations from breaking the app
          if (!this._repairMutex) {
            const validationResult = await this._validateAndRepairState(
              appData as AppDataCompleteNew,
              'full-state-op-load',
            );
            const stateToLoad =
              validationResult.wasRepaired && validationResult.repairedState
                ? validationResult.repairedState
                : (appData as AppDataCompleteNew);
            this.store.dispatch(loadAllData({ appDataComplete: stateToLoad }));
          } else {
            this.store.dispatch(
              loadAllData({ appDataComplete: appData as AppDataCompleteNew }),
            );
          }
          // Merge the full-state op's clock into local clock
          await this.opLogStore.mergeRemoteOpClocks([lastOp]);
          // No snapshot save needed - full state ops already contain complete state
        } else {
          // A.7.13: Migrate all operations before replay
          const opsToReplay = this._migrateTailOps(allOps.map((e) => e.op));

          const droppedCount = allOps.length - opsToReplay.length;
          OpLog.normal(
            `OperationLogHydratorService: Replaying all ${opsToReplay.length} ops ` +
              `(${droppedCount} dropped during migration).`,
          );
          // PERF: Use bulk dispatch to apply all operations in a single NgRx update.
          // This reduces 500 dispatches to 1, dramatically improving startup performance.
          // The bulkHydrationMetaReducer iterates through ops and applies each action.
          this.hydrationStateService.startApplyingRemoteOps();
          this.store.dispatch(bulkApplyHydrationOperations({ operations: opsToReplay }));
          this.hydrationStateService.endApplyingRemoteOps();

          // Merge replayed ops' clocks into local clock
          await this.opLogStore.mergeRemoteOpClocks(opsToReplay);

          // CHECKPOINT C: Validate state after replaying all operations
          // Must validate BEFORE saving snapshot to avoid persisting corrupted state
          if (!this._repairMutex) {
            await this._validateAndRepairCurrentState('full-replay');
          }

          // Save snapshot after replay for faster future loads
          // Snapshot is saved AFTER validation to ensure we persist valid/repaired state
          OpLog.normal(
            `OperationLogHydratorService: Saving snapshot after replaying ${opsToReplay.length} ops`,
          );
          await this._saveCurrentStateAsSnapshot();
        }

        OpLog.normal('OperationLogHydratorService: Full replay complete.');
      }

      // Sync PFAPI vector clock with SUP_OPS to ensure consistency
      // This recovers from any failed PFAPI updates during previous operations
      await this._syncPfapiVectorClock();

      // Retry any failed remote ops from previous conflict resolution attempts
      // Now that state is fully hydrated, dependencies might be resolved
      await this.retryFailedRemoteOps();

      // Schedule deferred background validation to catch any corruption
      // that wasn't detected during synchronous validation (schema trust optimization)
      this._scheduleDeferredValidation();
    } catch (e) {
      OpLog.err('OperationLogHydratorService: Error during hydration', e);
      try {
        await this._attemptRecovery();
      } catch (recoveryErr) {
        OpLog.err('OperationLogHydratorService: Recovery also failed', recoveryErr);
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
        OpLog.warn(
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
    OpLog.normal('OperationLogHydratorService: Attempting disaster recovery...');

    try {
      // 1. Try to load from legacy 'pf' database
      const legacyData = await this.pfapiService.pf.getAllSyncModelDataFromModelCtrls();

      // Check if legacy data has any actual content
      const hasData = this._hasUsableData(legacyData);

      if (hasData) {
        OpLog.normal(
          'OperationLogHydratorService: Found data in legacy database. Recovering...',
        );
        await this._recoverFromLegacyData(legacyData);
        return;
      }

      // 2. No legacy data found
      // App will start with NgRx initial state (empty).
      // User can sync or import a backup to restore their data.
      OpLog.warn(
        'OperationLogHydratorService: No legacy data found. ' +
          'If you have sync enabled, please trigger a sync to restore your data. ' +
          'Otherwise, you may need to restore from a backup.',
      );
    } catch (e) {
      OpLog.err('OperationLogHydratorService: Recovery failed', e);
      // App will start with NgRx initial state (empty).
      // User can sync or restore from backup.
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
    this.store.dispatch(
      loadAllData({ appDataComplete: legacyData as AppDataCompleteNew }),
    );

    // Sync PFAPI vector clock to match the recovery operation
    // This ensures that the meta model knows about the new clock state
    await this.pfapiService.pf.metaModel.syncVectorClock(recoveryOp.vectorClock);

    OpLog.normal(
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
      const vectorClock = await this.vectorClockService.getCurrentVectorClock();
      const lastSeq = await this.opLogStore.getLastSeq();

      // Save snapshot
      await this.opLogStore.saveStateCache({
        state: currentState,
        lastAppliedOpSeq: lastSeq,
        vectorClock,
        compactedAt: Date.now(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      });

      OpLog.normal('OperationLogHydratorService: Saved new snapshot after replay');
    } catch (e) {
      // Don't fail hydration if snapshot save fails
      OpLog.warn('OperationLogHydratorService: Failed to save snapshot after replay', e);
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
    OpLog.normal(
      'OperationLogHydratorService: Running schema migration with backup safety...',
    );

    // 1. Create backup before migration
    await this.opLogStore.saveStateCacheBackup();
    OpLog.normal('OperationLogHydratorService: Created pre-migration backup.');

    try {
      // 2. Run migration
      const migratedSnapshot = this.schemaMigrationService.migrateStateIfNeeded(snapshot);

      // 3. Save migrated snapshot
      await this.opLogStore.saveStateCache(migratedSnapshot);

      // 4. Clear backup on success
      await this.opLogStore.clearStateCacheBackup();
      OpLog.normal(
        'OperationLogHydratorService: Schema migration complete. Backup cleared.',
      );

      return migratedSnapshot;
    } catch (e) {
      OpLog.err(
        'OperationLogHydratorService: Schema migration failed. Restoring backup...',
        e,
      );

      try {
        // Restore backup
        await this.opLogStore.restoreStateCacheFromBackup();
        OpLog.normal(
          'OperationLogHydratorService: Backup restored after migration failure.',
        );
      } catch (restoreErr) {
        OpLog.err(
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

    OpLog.normal(
      `OperationLogHydratorService: Migrating ${ops.length} tail ops to current schema version...`,
    );

    return this.schemaMigrationService.migrateOperations(ops);
  }

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
    OpLog.normal('OperationLogHydratorService: Hydrating from remote sync...');

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
        'OperationLogHydratorService: Loaded synced data',
        downloadedMainModelData
          ? '(merged passed entity models with archive data from DB)'
          : '(from pf database only)',
      );

      // 2. Get client ID for vector clock
      const clientId = await this.pfapiService.pf.metaModel.loadClientId();

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
      OpLog.normal(
        'OperationLogHydratorService: Creating SYNC_IMPORT with merged clock',
        {
          localClockSize: Object.keys(localClock).length,
          pfapiClockSize: Object.keys(pfapiClock).length,
          mergedClockSize: Object.keys(mergedClock).length,
        },
      );

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
      OpLog.normal('OperationLogHydratorService: Persisted SYNC_IMPORT operation');

      // 5. Get the sequence number of the operation we just wrote
      const lastSeq = await this.opLogStore.getLastSeq();

      // 6. Validate and repair synced data before dispatching
      // This fixes stale task references (e.g., tags/projects referencing deleted tasks)
      let dataToLoad = syncedData as AppDataCompleteNew;
      if (!this._repairMutex) {
        const validationResult = await this._validateAndRepairState(
          dataToLoad,
          'remote-sync',
        );
        if (validationResult.wasRepaired && validationResult.repairedState) {
          dataToLoad = validationResult.repairedState;
          OpLog.normal(
            'OperationLogHydratorService: Repaired synced data before loading',
          );
        }
      }

      // 7. Save new state cache (snapshot) for crash safety
      await this.opLogStore.saveStateCache({
        state: dataToLoad,
        lastAppliedOpSeq: lastSeq,
        vectorClock: newClock,
        compactedAt: Date.now(),
      });
      OpLog.normal('OperationLogHydratorService: Saved state cache after sync');

      // 8. Update vector clock store to match the new clock
      // This is critical because:
      // - The SYNC_IMPORT was appended with source='remote', so store wasn't updated
      // - If user creates new ops in this session, incrementAndStoreVectorClock reads from store
      // - Without this, new ops would have clocks missing entries from the SYNC_IMPORT
      await this.opLogStore.setVectorClock(newClock);
      OpLog.normal('OperationLogHydratorService: Updated vector clock store after sync');

      // 9. Dispatch loadAllData to update NgRx
      this.store.dispatch(loadAllData({ appDataComplete: dataToLoad }));
      OpLog.normal(
        'OperationLogHydratorService: Dispatched loadAllData with synced data',
      );
    } catch (e) {
      OpLog.err('OperationLogHydratorService: Error during hydrateFromRemoteSync', e);
      throw e;
    }
  }

  /**
   * Validates a state object and repairs it if necessary.
   * Used for validating snapshot state before dispatching.
   * Uses a mutex to prevent concurrent repair operations.
   *
   * @param state - The state to validate
   * @param context - Context string for logging (e.g., 'snapshot', 'tail-replay')
   * @returns Validation result with optional repaired state
   */
  private async _validateAndRepairState(
    state: AppDataCompleteNew,
    context: string,
  ): Promise<{ wasRepaired: boolean; repairedState?: AppDataCompleteNew }> {
    // Wait for any ongoing repair to complete before validating
    if (this._repairMutex) {
      await this._repairMutex;
    }

    const result = this.validateStateService.validateAndRepair(state);

    if (!result.wasRepaired) {
      return { wasRepaired: false };
    }

    if (!result.repairedState || !result.repairSummary) {
      OpLog.err(
        `[OperationLogHydratorService] Repair failed for ${context}:`,
        result.error,
      );
      return { wasRepaired: false };
    }

    // DISABLED: Repair system is non-functional - this code path is unreachable
    // because validateAndRepair() always returns wasRepaired: false
    //
    // const repairPromise = (async () => {
    //   try {
    //     const clientId = await this.pfapiService.pf.metaModel.loadClientId();
    //     await this.repairOperationService.createRepairOperation(
    //       result.repairedState!,
    //       result.repairSummary!,
    //       clientId,
    //     );
    //     OpLog.log(`[OperationLogHydratorService] Created REPAIR operation for ${context}`);
    //   } catch (e) {
    //     OpLog.err(`[OperationLogHydratorService] Failed to create REPAIR operation for ${context}:`, e);
    //     throw e;
    //   } finally {
    //     this._repairMutex = null;
    //   }
    // })();
    // this._repairMutex = repairPromise;
    // await repairPromise;

    // Should never reach here while repair is disabled
    return { wasRepaired: false };
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
      this.store.dispatch(loadAllData({ appDataComplete: result.repairedState }));
    }
  }

  /**
   * Syncs PFAPI meta model's vector clock with the current SUP_OPS vector clock.
   * This ensures eventual consistency if a previous PFAPI update failed after
   * an operation was written to SUP_OPS.
   */
  private async _syncPfapiVectorClock(): Promise<void> {
    try {
      const currentClock = await this.vectorClockService.getCurrentVectorClock();

      // Only sync if we have operations (not fresh install)
      if (Object.keys(currentClock).length === 0) {
        return;
      }

      // Update PFAPI meta model to match SUP_OPS clock
      // This uses a direct update rather than increment to set the exact values
      await this.pfapiService.pf.metaModel.syncVectorClock(currentClock);
      OpLog.normal('OperationLogHydratorService: Synced PFAPI vector clock with SUP_OPS');
    } catch (e) {
      // Distinguish between expected errors and actual failures
      const errorMessage = e instanceof Error ? e.message : String(e);
      const isExpectedError =
        errorMessage.includes('not initialized') ||
        errorMessage.includes('sync not enabled') ||
        errorMessage.includes('not ready');

      if (isExpectedError) {
        // Non-fatal - PFAPI might not be ready yet or sync might not be enabled
        OpLog.verbose(
          'OperationLogHydratorService: Could not sync PFAPI vector clock (expected)',
          e,
        );
      } else {
        // Unexpected error - log as warning for visibility
        OpLog.warn('OperationLogHydratorService: Failed to sync PFAPI vector clock', e);
      }
    }
  }

  /**
   * Recovers from pending remote ops that were stored but not applied (crash recovery).
   * These ops are in the log and will be replayed during normal hydration, so we just
   * need to mark them as applied to prevent them appearing as orphaned.
   *
   * Operations pending for longer than PENDING_OPERATION_EXPIRY_MS are considered
   * stale (likely due to data corruption or repeated failures) and are rejected
   * instead of replayed.
   */
  private async _recoverPendingRemoteOps(): Promise<void> {
    const pendingOps = await this.opLogStore.getPendingRemoteOps();

    if (pendingOps.length === 0) {
      return;
    }

    const now = Date.now();
    const validOps = pendingOps.filter(
      (e) => now - e.appliedAt < PENDING_OPERATION_EXPIRY_MS,
    );
    const expiredOps = pendingOps.filter(
      (e) => now - e.appliedAt >= PENDING_OPERATION_EXPIRY_MS,
    );

    // Reject expired ops - they've been pending too long
    if (expiredOps.length > 0) {
      const expiredIds = expiredOps.map((e) => e.op.id);
      await this.opLogStore.markRejected(expiredIds);
      OpLog.warn(
        `OperationLogHydratorService: Rejected ${expiredOps.length} expired pending remote ops ` +
          `(pending > ${PENDING_OPERATION_EXPIRY_MS / (60 * 60 * 1000)}h). ` +
          `Oldest was ${Math.round((now - Math.min(...expiredOps.map((e) => e.appliedAt))) / (60 * 60 * 1000))}h old.`,
      );
    }

    // Mark valid ops as applied - they'll be replayed during normal hydration
    if (validOps.length > 0) {
      const seqs = validOps.map((e) => e.seq);
      await this.opLogStore.markApplied(seqs);
      OpLog.warn(
        `OperationLogHydratorService: Found ${validOps.length} pending remote ops from previous crash. ` +
          `Marking as applied (they will be replayed during hydration).`,
      );
    }

    OpLog.normal(
      `OperationLogHydratorService: Recovered ${validOps.length} pending remote ops, ` +
        `rejected ${expiredOps.length} expired ops.`,
    );
  }

  /**
   * Retries failed remote operations from previous conflict resolution attempts.
   * Called after hydration to give failed ops another chance to apply now that
   * more state might be available (e.g., dependencies resolved by sync).
   *
   * Failed ops are ops that previously failed during conflict resolution
   * but may succeed now that more state has been loaded.
   */
  async retryFailedRemoteOps(): Promise<void> {
    const failedOps = await this.opLogStore.getFailedRemoteOps();

    if (failedOps.length === 0) {
      return;
    }

    OpLog.normal(
      `OperationLogHydratorService: Retrying ${failedOps.length} previously failed remote ops...`,
    );

    const appliedOpIds: string[] = [];
    const stillFailedOpIds: string[] = [];

    for (const entry of failedOps) {
      const result = await this.operationApplierService.applyOperations([entry.op]);
      if (result.failedOp) {
        // SyncStateCorruptedError or any other error means the op still can't be applied
        OpLog.warn(
          `OperationLogHydratorService: Failed to retry op ${entry.op.id}`,
          result.failedOp.error,
        );
        stillFailedOpIds.push(entry.op.id);
      } else {
        // Operation succeeded
        appliedOpIds.push(entry.op.id);
      }
    }

    // Mark successfully applied ops
    if (appliedOpIds.length > 0) {
      const appliedSeqs = failedOps
        .filter((e) => appliedOpIds.includes(e.op.id))
        .map((e) => e.seq);
      await this.opLogStore.markApplied(appliedSeqs);
      OpLog.normal(
        `OperationLogHydratorService: Successfully retried ${appliedOpIds.length} failed ops`,
      );
    }

    // Update retry count for still-failed ops (may reject them if max retries reached)
    if (stillFailedOpIds.length > 0) {
      await this.opLogStore.markFailed(stillFailedOpIds, MAX_CONFLICT_RETRY_ATTEMPTS);
      OpLog.warn(
        `OperationLogHydratorService: ${stillFailedOpIds.length} ops still failing after retry`,
      );
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

  /**
   * Schedules a deferred background validation to run after hydration completes.
   * This catches any corruption that wasn't detected during synchronous validation
   * (when we trusted the snapshot due to schema version match).
   *
   * If corruption is found, we attempt auto-repair and show a warning to the user.
   * This runs 5 seconds after hydration to avoid blocking startup.
   */
  private _scheduleDeferredValidation(): void {
    const DEFERRED_VALIDATION_DELAY_MS = 5000;

    setTimeout(async () => {
      try {
        OpLog.normal(
          'OperationLogHydratorService: Running deferred background validation...',
        );

        const currentState =
          (await this.storeDelegateService.getAllSyncModelDataFromStore()) as AppDataCompleteNew;

        const result = this.validateStateService.validateAndRepair(currentState);

        if (result.isValid && !result.wasRepaired) {
          OpLog.normal(
            'OperationLogHydratorService: Deferred validation passed - no issues found',
          );
          return;
        }

        // DISABLED: Repair system is non-functional - this code path is unreachable
        // because validateAndRepair() always returns wasRepaired: false
        //
        // if (result.wasRepaired && result.repairedState && result.repairSummary) {
        //   OpLog.warn('OperationLogHydratorService: Deferred validation found and repaired issues', result.repairSummary);
        //   const clientId = await this.pfapiService.pf.metaModel.loadClientId();
        //   await this.repairOperationService.createRepairOperation(
        //     result.repairedState, result.repairSummary, clientId,
        //   );
        //   this.store.dispatch(loadAllData({ appDataComplete: result.repairedState }));
        //   this.snackService.open({
        //     type: 'ERROR',
        //     msg: T.F.SYNC.S.INTEGRITY_CHECK_FAILED,
        //     actionStr: T.PS.RELOAD,
        //     actionFn: (): void => { window.location.reload(); },
        //   });
        // } else
        if (!result.isValid) {
          // Repair failed or wasn't possible
          OpLog.err(
            'OperationLogHydratorService: Deferred validation found issues but repair failed',
            result.error,
          );
          this.snackService.open({
            type: 'ERROR',
            msg: T.F.SYNC.S.INTEGRITY_CHECK_FAILED,
            actionStr: T.PS.RELOAD,
            actionFn: (): void => {
              window.location.reload();
            },
          });
        }
      } catch (e) {
        // Don't crash the app if deferred validation fails
        OpLog.err('OperationLogHydratorService: Deferred validation error', e);
      }
    }, DEFERRED_VALIDATION_DELAY_MS);
  }

  /**
   * Migrates the vector clock from pf.META_MODEL to SUP_OPS.vector_clock if needed.
   * This is a one-time migration when upgrading from DB version 1 to 2.
   */
  private async _migrateVectorClockFromPfapiIfNeeded(): Promise<void> {
    const existingClock = await this.opLogStore.getVectorClock();

    if (existingClock !== null) {
      OpLog.normal(
        'OperationLogHydratorService: SUP_OPS already has vector clock, skipping migration',
      );
      return;
    }

    // Load vector clock from pf.META_MODEL
    const metaModel = await this.pfapiService.pf.metaModel.load();
    if (metaModel?.vectorClock && Object.keys(metaModel.vectorClock).length > 0) {
      OpLog.normal(
        'OperationLogHydratorService: Migrating vector clock from pf.META_MODEL to SUP_OPS',
        {
          clockSize: Object.keys(metaModel.vectorClock).length,
        },
      );

      await this.opLogStore.setVectorClock(metaModel.vectorClock);
    } else {
      OpLog.normal(
        'OperationLogHydratorService: No vector clock to migrate from pf.META_MODEL',
      );
    }
  }
}
