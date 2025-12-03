import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EntityConflict } from './operation.types';
import { OperationApplierService } from './operation-applier.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { PFLog } from '../../log';
import {
  ConflictResolutionResult,
  DialogConflictResolutionComponent,
} from '../../../imex/sync/dialog-conflict-resolution/dialog-conflict-resolution.component';
import { firstValueFrom } from 'rxjs';
import { SnackService } from '../../snack/snack.service';
import { T } from '../../../t.const';
import { ValidateStateService } from './validate-state.service';
import { RepairOperationService } from './repair-operation.service';
import { PfapiStoreDelegateService } from '../../../pfapi/pfapi-store-delegate.service';
import { AppDataCompleteNew } from '../../../pfapi/pfapi-config';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';

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

  private _dialogRef?: MatDialogRef<DialogConflictResolutionComponent>;

  async presentConflicts(conflicts: EntityConflict[]): Promise<void> {
    PFLog.warn('ConflictResolutionService: Presenting conflicts', conflicts);

    this._dialogRef = this.dialog.open(DialogConflictResolutionComponent, {
      data: { conflicts },
      disableClose: true,
    });

    const result: ConflictResolutionResult | undefined = await firstValueFrom(
      this._dialogRef.afterClosed(),
    );

    if (result && result.resolutions) {
      PFLog.normal(
        'ConflictResolutionService: Processing resolutions',
        result.resolutions,
      );

      for (let i = 0; i < conflicts.length; i++) {
        const conflict = conflicts[i];
        const resolution = result.resolutions.get(i); // Use index to match dialog

        if (!resolution) {
          PFLog.warn(
            `ConflictResolutionService: No resolution for conflict ${i} (${conflict.entityId}), skipping`,
          );
          continue;
        }

        if (resolution === 'remote') {
          const appliedOpIds: string[] = [];
          try {
            // Apply remote ops
            for (const op of conflict.remoteOps) {
              if (!(await this.opLogStore.hasOp(op.id))) {
                await this.opLogStore.append(op, 'remote');
              }
              await this.operationApplier.applyOperations([op]);
              await this.opLogStore.markApplied(op.id);
              appliedOpIds.push(op.id);
            }
            // Mark local ops as rejected so they won't be re-synced
            const localOpIds = conflict.localOps.map((op) => op.id);
            await this.opLogStore.markRejected(localOpIds);
            PFLog.normal(
              `ConflictResolutionService: Applied remote ops for ${conflict.entityId}`,
            );
          } catch (e) {
            PFLog.err(
              `ConflictResolutionService: Failed during remote resolution for ${conflict.entityId}`,
              { appliedOpIds, error: e },
            );
            this.snackService.open({
              type: 'ERROR',
              msg: T.F.SYNC.S.CONFLICT_RESOLUTION_FAILED,
              actionStr: T.PS.RELOAD,
              actionFn: (): void => {
                window.location.reload();
              },
            });
            throw e;
          }
        } else {
          // Keep local ops.
          // We assume they are already applied to state.
          // We just need to ensure they are kept in the log for sync later.
          // We essentially "ignore" the remote ops (don't apply them).
          PFLog.normal(
            `ConflictResolutionService: Keeping local ops for ${conflict.entityId}`,
          );
        }
      }

      // CHECKPOINT D: Validate and repair state after conflict resolution
      await this._validateAndRepairAfterResolution();
    }
  }

  /**
   * Validates the current state after conflict resolution and repairs if necessary.
   * This is Checkpoint D in the validation architecture.
   */
  private async _validateAndRepairAfterResolution(): Promise<void> {
    PFLog.normal('[ConflictResolutionService] Running post-resolution validation...');

    // Get current state from NgRx
    const currentState =
      (await this.storeDelegateService.getAllSyncModelDataFromStore()) as AppDataCompleteNew;

    // Validate and repair if needed
    const result = this.validateStateService.validateAndRepair(currentState);

    if (!result.wasRepaired) {
      PFLog.normal('[ConflictResolutionService] State valid after conflict resolution');
      return;
    }

    if (!result.repairedState || !result.repairSummary) {
      PFLog.err(
        '[ConflictResolutionService] Repair failed after conflict resolution:',
        result.error,
      );
      return;
    }

    // Create REPAIR operation
    await this.repairOperationService.createRepairOperation(
      result.repairedState,
      result.repairSummary,
    );

    // Dispatch repaired state to NgRx
    this.store.dispatch(loadAllData({ appDataComplete: result.repairedState as any }));

    PFLog.log(
      '[ConflictResolutionService] Created REPAIR operation after conflict resolution',
    );
  }
}
