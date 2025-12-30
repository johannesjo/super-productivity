import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { OperationLogStoreService } from './operation-log-store.service';
import { CURRENT_SCHEMA_VERSION } from './schema-migration.service';
import { PfapiService } from '../../pfapi/pfapi.service';
import { ClientIdService } from '../../core/util/client-id.service';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import { Operation, OpType, ActionType } from '../core/operation.types';
import { uuidv7 } from '../../util/uuid-v7';
import { PENDING_OPERATION_EXPIRY_MS } from '../core/operation-log.const';
import { OpLog } from '../../core/log';
import { AppDataCompleteNew } from '../../pfapi/pfapi-config';

/**
 * Handles crash recovery and data restoration for the operation log system.
 *
 * Responsibilities:
 * - Recovering from corrupted/missing SUP_OPS database
 * - Loading data from legacy 'pf' database
 * - Recovering pending remote ops from crashed syncs
 *
 * This service is used by OperationLogHydratorService during startup
 * when normal hydration fails or pending ops need recovery.
 */
@Injectable({ providedIn: 'root' })
export class OperationLogRecoveryService {
  private store = inject(Store);
  private opLogStore = inject(OperationLogStoreService);
  private pfapiService = inject(PfapiService);
  private clientIdService = inject(ClientIdService);

  /**
   * Attempts to recover from a corrupted or missing SUP_OPS database.
   * Recovery strategy:
   * 1. Try to load data from legacy 'pf' database (ModelCtrl caches)
   * 2. If found, run genesis migration with that data
   * 3. If no legacy data, log error (user will need to sync or restore from backup)
   */
  async attemptRecovery(): Promise<void> {
    OpLog.normal('OperationLogRecoveryService: Attempting disaster recovery...');

    try {
      // 1. Try to load from legacy 'pf' database
      const legacyData = await this.pfapiService.pf.getAllSyncModelDataFromModelCtrls();

      // Check if legacy data has any actual content
      const hasData = this.hasUsableData(legacyData);

      if (hasData) {
        OpLog.normal(
          'OperationLogRecoveryService: Found data in legacy database. Recovering...',
        );
        await this.recoverFromLegacyData(legacyData);
        return;
      }

      // 2. No legacy data found
      // App will start with NgRx initial state (empty).
      // User can sync or import a backup to restore their data.
      OpLog.warn(
        'OperationLogRecoveryService: No legacy data found. ' +
          'If you have sync enabled, please trigger a sync to restore your data. ' +
          'Otherwise, you may need to restore from a backup.',
      );
    } catch (e) {
      OpLog.err('OperationLogRecoveryService: Recovery failed', e);
      // App will start with NgRx initial state (empty).
      // User can sync or restore from backup.
    }
  }

  /**
   * Checks if the data has any usable content (not just empty/default state).
   */
  hasUsableData(data: Record<string, unknown>): boolean {
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
  async recoverFromLegacyData(legacyData: Record<string, unknown>): Promise<void> {
    const clientId = await this.clientIdService.loadClientId();
    if (!clientId) {
      throw new Error('Failed to load clientId - cannot create recovery operation');
    }

    // Create recovery operation
    const recoveryOp: Operation = {
      id: uuidv7(),
      actionType: ActionType.RECOVERY_DATA_IMPORT,
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

    // Persist vector clock to IndexedDB store for immediate availability
    // Without this, getVectorClock() returns stale clock until cache is populated
    await this.opLogStore.setVectorClock(recoveryOp.vectorClock);

    // Dispatch to NgRx
    this.store.dispatch(
      loadAllData({ appDataComplete: legacyData as AppDataCompleteNew }),
    );

    // Sync PFAPI vector clock to match the recovery operation
    // This ensures that the meta model knows about the new clock state
    await this.pfapiService.pf.metaModel.syncVectorClock(recoveryOp.vectorClock);

    OpLog.normal(
      'OperationLogRecoveryService: Recovery complete. Data restored from legacy database.',
    );
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
  async recoverPendingRemoteOps(): Promise<void> {
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
        `OperationLogRecoveryService: Rejected ${expiredOps.length} expired pending remote ops ` +
          `(pending > ${PENDING_OPERATION_EXPIRY_MS / (60 * 60 * 1000)}h). ` +
          `Oldest was ${Math.round((now - Math.min(...expiredOps.map((e) => e.appliedAt))) / (60 * 60 * 1000))}h old.`,
      );
    }

    // Mark valid ops as applied - they'll be replayed during normal hydration
    if (validOps.length > 0) {
      const seqs = validOps.map((e) => e.seq);
      await this.opLogStore.markApplied(seqs);
      OpLog.warn(
        `OperationLogRecoveryService: Found ${validOps.length} pending remote ops from previous crash. ` +
          `Marking as applied (they will be replayed during hydration).`,
      );
    }

    OpLog.normal(
      `OperationLogRecoveryService: Recovered ${validOps.length} pending remote ops, ` +
        `rejected ${expiredOps.length} expired ops.`,
    );
  }
}
