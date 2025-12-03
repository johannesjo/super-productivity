import { Injectable, inject } from '@angular/core';
import { OperationLogStoreService } from './operation-log-store.service';
import { Operation, OpType, RepairPayload, RepairSummary } from './operation.types';
import { uuidv7 } from '../../../util/uuid-v7';
import { incrementVectorClock } from '../../../pfapi/api/util/vector-clock';
import { LockService } from './lock.service';
import { SnackService } from '../../snack/snack.service';
import { T } from '../../../t.const';
import { PFLog } from '../../log';

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Service responsible for creating REPAIR operations.
 * When validation fails and data is repaired, this service creates a REPAIR operation
 * containing the full repaired state and a summary of what was fixed.
 * REPAIR operations behave like SyncImport - they replace the entire state atomically.
 */
@Injectable({
  providedIn: 'root',
})
export class RepairOperationService {
  private opLogStore = inject(OperationLogStoreService);
  private lockService = inject(LockService);
  private snackService = inject(SnackService);

  /**
   * Creates a REPAIR operation with the repaired state and saves it to the operation log.
   * Also updates the state cache to the repaired state for faster future hydration.
   *
   * @param repairedState - The fully repaired application state
   * @param repairSummary - Summary of what was repaired (counts by category)
   * @param clientId - The client ID for the operation (passed by caller to avoid circular dependency)
   * @returns The sequence number of the created operation
   */
  async createRepairOperation(
    repairedState: unknown,
    repairSummary: RepairSummary,
    clientId: string,
  ): Promise<number> {
    if (!clientId) {
      throw new Error('clientId is required - cannot create repair operation');
    }

    const payload: RepairPayload = {
      appDataComplete: repairedState,
      repairSummary,
    };

    let seq: number = 0;

    await this.lockService.request('sp_op_log', async () => {
      const currentClock = await this.opLogStore.getCurrentVectorClock();
      const newClock = incrementVectorClock(currentClock, clientId);

      const op: Operation = {
        id: uuidv7(),
        actionType: '[Repair] Auto Repair',
        opType: OpType.Repair,
        entityType: 'ALL',
        payload,
        clientId,
        vectorClock: newClock,
        timestamp: Date.now(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };

      // 1. Append REPAIR operation to log
      await this.opLogStore.append(op, 'local');

      // 2. Save state cache with repaired state for fast hydration
      seq = await this.opLogStore.getLastSeq();
      await this.opLogStore.saveStateCache({
        state: repairedState,
        lastAppliedOpSeq: seq,
        vectorClock: newClock,
        compactedAt: Date.now(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      });

      PFLog.log('[RepairOperationService] Created REPAIR operation', {
        seq,
        repairSummary,
      });
    });

    // Notify user that repair happened
    this._notifyUser(repairSummary);

    return seq;
  }

  /**
   * Shows a snackbar notification to the user about the repair.
   */
  private _notifyUser(summary: RepairSummary): void {
    const totalFixes = this._getTotalFixes(summary);
    if (totalFixes > 0) {
      this.snackService.open({
        type: 'SUCCESS',
        msg: T.F.SYNC.S.DATA_REPAIRED,
        translateParams: { count: totalFixes.toString() },
      });
    }
  }

  /**
   * Calculates the total number of fixes from a repair summary.
   */
  private _getTotalFixes(summary: RepairSummary): number {
    return (
      summary.entityStateFixed +
      summary.orphanedEntitiesRestored +
      summary.invalidReferencesRemoved +
      summary.relationshipsFixed +
      summary.structureRepaired +
      summary.typeErrorsFixed
    );
  }

  /**
   * Creates an empty repair summary (all counts at zero).
   */
  static createEmptyRepairSummary(): RepairSummary {
    return {
      entityStateFixed: 0,
      orphanedEntitiesRestored: 0,
      invalidReferencesRemoved: 0,
      relationshipsFixed: 0,
      structureRepaired: 0,
      typeErrorsFixed: 0,
    };
  }
}
