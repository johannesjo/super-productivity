import { inject, Injectable, Injector } from '@angular/core';
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
import { PfapiService } from '../../../pfapi/pfapi.service';
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
  private injector = inject(Injector);

  private _dialogRef?: MatDialogRef<DialogConflictResolutionComponent>;

  async presentConflicts(conflicts: EntityConflict[]): Promise<void> {
    PFLog.warn('ConflictResolutionService: Presenting conflicts', conflicts);

    this._dialogRef = this.dialog.open(DialogConflictResolutionComponent, {
      data: { conflicts },
      disableClose: false,
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
          try {
            // First, store all remote ops in IndexedDB (ensures durability)
            const storedOpIds: string[] = [];
            for (const op of conflict.remoteOps) {
              if (!(await this.opLogStore.hasOp(op.id))) {
                await this.opLogStore.append(op, 'remote');
                storedOpIds.push(op.id);
              }
            }

            // Apply all remote ops together - applyOperations now handles dependency sorting
            await this.operationApplier.applyOperations(conflict.remoteOps);

            // Check if any operations failed permanently
            const failedCount = this.operationApplier.getFailedCount();
            if (failedCount > 0) {
              const failedOps = this.operationApplier.getFailedOperations();
              PFLog.err(
                `ConflictResolutionService: ${failedCount} operations failed for ${conflict.entityId}`,
                failedOps,
              );
              // Don't reject local ops if some remote ops failed - state is inconsistent
              this.snackService.open({
                type: 'ERROR',
                msg: T.F.SYNC.S.CONFLICT_RESOLUTION_FAILED,
                actionStr: T.PS.RELOAD,
                actionFn: (): void => {
                  window.location.reload();
                },
              });
              // Clear failed ops for next resolution attempt
              this.operationApplier.clearFailedOperations();
              continue; // Skip marking local as rejected for this conflict
            }

            // Mark applied ops
            for (const op of conflict.remoteOps) {
              await this.opLogStore.markApplied(op.id);
            }

            // Only mark local ops as rejected if ALL remote ops succeeded
            const localOpIds = conflict.localOps.map((op) => op.id);
            await this.opLogStore.markRejected(localOpIds);
            PFLog.normal(
              `ConflictResolutionService: Applied remote ops for ${conflict.entityId}`,
            );
          } catch (e) {
            PFLog.err(
              `ConflictResolutionService: Failed during remote resolution for ${conflict.entityId}`,
              { error: e },
            );
            this.snackService.open({
              type: 'ERROR',
              msg: T.F.SYNC.S.CONFLICT_RESOLUTION_FAILED,
              actionStr: T.PS.RELOAD,
              actionFn: (): void => {
                window.location.reload();
              },
            });
            // Continue to next conflict instead of throwing - allows partial resolution
            continue;
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
    const pfapiService = this.injector.get(PfapiService);
    const clientId = await pfapiService.pf.metaModel.loadClientId();
    await this.repairOperationService.createRepairOperation(
      result.repairedState,
      result.repairSummary,
      clientId,
    );

    // Dispatch repaired state to NgRx
    this.store.dispatch(loadAllData({ appDataComplete: result.repairedState as any }));

    PFLog.log(
      '[ConflictResolutionService] Created REPAIR operation after conflict resolution',
    );
  }
}
