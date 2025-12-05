import { inject, Injectable, Injector } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EntityConflict, Operation } from '../operation.types';
import { OperationApplierService } from '../processing/operation-applier.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { OpLog } from '../../../log';
import {
  ConflictResolutionResult,
  DialogConflictResolutionComponent,
} from '../../../../imex/sync/dialog-conflict-resolution/dialog-conflict-resolution.component';
import { firstValueFrom } from 'rxjs';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';
import { ValidateStateService } from '../processing/validate-state.service';
import { RepairOperationService } from '../processing/repair-operation.service';
import { PfapiStoreDelegateService } from '../../../../pfapi/pfapi-store-delegate.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { AppDataCompleteNew } from '../../../../pfapi/pfapi-config';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';
import { MAX_CONFLICT_RETRY_ATTEMPTS } from '../operation-log.const';

/**
 * Service to manage conflict resolution, typically presenting a UI to the user.
 * It takes detected conflicts, presents them, and applies the chosen resolutions.
 */
@Injectable({
  providedIn: 'root',
})
export class ConflictResolutionService {
  private dialog = inject(MatDialog);
  private store = inject(Store);
  private operationApplier = inject(OperationApplierService);
  private opLogStore = inject(OperationLogStoreService);
  private snackService = inject(SnackService);
  private validateStateService = inject(ValidateStateService);
  private repairOperationService = inject(RepairOperationService);
  private storeDelegateService = inject(PfapiStoreDelegateService);
  private injector = inject(Injector);

  private _dialogRef?: MatDialogRef<DialogConflictResolutionComponent>;

  /**
   * Present conflicts to the user for resolution.
   * @param conflicts - The detected conflicts to resolve
   * @param nonConflictingOps - Non-conflicting ops to apply together with resolved conflict ops.
   *   These are merged with chosen remote ops and applied in a single batch so that
   *   dependency sorting works correctly (e.g., a non-conflicting Task create that
   *   depends on a Project from a resolved conflict).
   */
  async presentConflicts(
    conflicts: EntityConflict[],
    nonConflictingOps: Operation[] = [],
  ): Promise<void> {
    OpLog.warn('ConflictResolutionService: Presenting conflicts', conflicts);

    this._dialogRef = this.dialog.open(DialogConflictResolutionComponent, {
      data: { conflicts },
      disableClose: false,
    });

    const result: ConflictResolutionResult | undefined = await firstValueFrom(
      this._dialogRef.afterClosed(),
    );

    // If dialog was cancelled, don't apply any operations
    // The user chose not to sync - state should remain as-is
    if (!result || !result.resolutions) {
      OpLog.normal(
        'ConflictResolutionService: Dialog cancelled, no operations will be applied',
      );
      return;
    }

    OpLog.normal('ConflictResolutionService: Processing resolutions', result.resolutions);

    // Collect all operations to apply in a single batch for proper dependency sorting
    const allOpsToApply: Operation[] = [];
    const allStoredOps: Array<{ id: string; seq: number }> = [];
    const localOpsToReject: string[] = [];
    const remoteOpsToReject: string[] = [];

    // Step 1: Process conflicts and collect operations based on user choices
    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];
      const resolution = result.resolutions.get(i);

      if (!resolution) {
        OpLog.warn(
          `ConflictResolutionService: No resolution for conflict ${i} (${conflict.entityId}), skipping`,
        );
        continue;
      }

      if (resolution === 'remote') {
        // User chose remote - add remote ops to batch, mark local for rejection
        for (const op of conflict.remoteOps) {
          if (await this.opLogStore.hasOp(op.id)) {
            OpLog.verbose(`ConflictResolutionService: Skipping duplicate op: ${op.id}`);
            continue;
          }
          const seq = await this.opLogStore.append(op, 'remote', { pendingApply: true });
          allStoredOps.push({ id: op.id, seq });
          allOpsToApply.push(op);
        }
        localOpsToReject.push(...conflict.localOps.map((op) => op.id));
      } else {
        // User chose local - store remote ops as rejected
        for (const op of conflict.remoteOps) {
          if (!(await this.opLogStore.hasOp(op.id))) {
            await this.opLogStore.append(op, 'remote');
          }
        }
        remoteOpsToReject.push(...conflict.remoteOps.map((op) => op.id));
        OpLog.normal(
          `ConflictResolutionService: Keeping local ops for ${conflict.entityId}`,
        );
      }
    }

    // Step 2: Add non-conflicting ops to the batch
    for (const op of nonConflictingOps) {
      if (await this.opLogStore.hasOp(op.id)) {
        OpLog.verbose(`ConflictResolutionService: Skipping duplicate op: ${op.id}`);
        continue;
      }
      const seq = await this.opLogStore.append(op, 'remote', { pendingApply: true });
      allStoredOps.push({ id: op.id, seq });
      allOpsToApply.push(op);
    }

    // Step 3: Apply ALL operations in a single batch for proper dependency sorting
    // This ensures that dependencies between conflict ops and non-conflicting ops are resolved
    if (allOpsToApply.length > 0) {
      OpLog.normal(
        `ConflictResolutionService: Applying ${allOpsToApply.length} ops in single batch`,
      );
      try {
        await this.operationApplier.applyOperations(allOpsToApply);

        const failedCount = this.operationApplier.getFailedCount();
        if (failedCount > 0) {
          OpLog.err(
            `ConflictResolutionService: ${failedCount} operations failed to apply`,
          );
          this.operationApplier.clearFailedOperations();
          const allOpIds = allStoredOps.map((o) => o.id);
          await this.opLogStore.markFailed(allOpIds, MAX_CONFLICT_RETRY_ATTEMPTS);
          this.snackService.open({
            type: 'ERROR',
            msg: T.F.SYNC.S.CONFLICT_RESOLUTION_FAILED,
            actionStr: T.PS.RELOAD,
            actionFn: (): void => {
              window.location.reload();
            },
          });
        } else {
          // All ops succeeded - mark as applied
          const successSeqs = allStoredOps.map((o) => o.seq);
          await this.opLogStore.markApplied(successSeqs);
          OpLog.normal(
            `ConflictResolutionService: Successfully applied ${allOpsToApply.length} ops`,
          );
        }
      } catch (e) {
        OpLog.err('ConflictResolutionService: Exception applying ops', e);
        const allOpIds = allStoredOps.map((o) => o.id);
        await this.opLogStore.markFailed(allOpIds, MAX_CONFLICT_RETRY_ATTEMPTS);
        this.snackService.open({
          type: 'ERROR',
          msg: T.F.SYNC.S.CONFLICT_RESOLUTION_FAILED,
          actionStr: T.PS.RELOAD,
          actionFn: (): void => {
            window.location.reload();
          },
        });
      }
    }

    // Step 4: Mark rejected operations
    if (localOpsToReject.length > 0) {
      await this.opLogStore.markRejected(localOpsToReject);
      OpLog.normal(
        `ConflictResolutionService: Marked ${localOpsToReject.length} local ops as rejected`,
      );
    }
    if (remoteOpsToReject.length > 0) {
      await this.opLogStore.markRejected(remoteOpsToReject);
      OpLog.normal(
        `ConflictResolutionService: Marked ${remoteOpsToReject.length} remote ops as rejected`,
      );
    }

    // CHECKPOINT D: Validate and repair state after conflict resolution
    await this._validateAndRepairAfterResolution();
  }

  /**
   * Validates the current state after conflict resolution and repairs if necessary.
   * This is Checkpoint D in the validation architecture.
   */
  private async _validateAndRepairAfterResolution(): Promise<void> {
    OpLog.normal('[ConflictResolutionService] Running post-resolution validation...');

    // Get current state from NgRx
    const currentState =
      (await this.storeDelegateService.getAllSyncModelDataFromStore()) as AppDataCompleteNew;

    // Validate and repair if needed
    const result = this.validateStateService.validateAndRepair(currentState);

    if (!result.wasRepaired) {
      OpLog.normal('[ConflictResolutionService] State valid after conflict resolution');
      return;
    }

    if (!result.repairedState || !result.repairSummary) {
      OpLog.err(
        '[ConflictResolutionService] Repair failed after conflict resolution:',
        result.error,
      );
      return;
    }

    // Create REPAIR operation
    const pfapiService = this.injector.get(PfapiService);
    const clientId = await pfapiService.pf.metaModel.loadClientId();
    await this.repairOperationService.createRepairOperation(
      result.repairedState,
      result.repairSummary,
      clientId,
    );

    // Dispatch repaired state to NgRx
    this.store.dispatch(loadAllData({ appDataComplete: result.repairedState }));

    OpLog.log(
      '[ConflictResolutionService] Created REPAIR operation after conflict resolution',
    );
  }
}
