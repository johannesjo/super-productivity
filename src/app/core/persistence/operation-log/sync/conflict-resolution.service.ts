import { inject, Injectable, Injector } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EntityConflict } from '../operation.types';
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

  async presentConflicts(conflicts: EntityConflict[]): Promise<void> {
    OpLog.warn('ConflictResolutionService: Presenting conflicts', conflicts);

    this._dialogRef = this.dialog.open(DialogConflictResolutionComponent, {
      data: { conflicts },
      disableClose: false,
    });

    const result: ConflictResolutionResult | undefined = await firstValueFrom(
      this._dialogRef.afterClosed(),
    );

    // If dialog was cancelled, still validate state since non-conflicting ops
    // may have already been applied before the dialog opened
    if (!result || !result.resolutions) {
      OpLog.normal(
        'ConflictResolutionService: Dialog cancelled, running validation for already-applied ops',
      );
      await this._validateAndRepairAfterResolution();
      return;
    }

    OpLog.normal('ConflictResolutionService: Processing resolutions', result.resolutions);

    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];
      const resolution = result.resolutions.get(i); // Use index to match dialog

      if (!resolution) {
        OpLog.warn(
          `ConflictResolutionService: No resolution for conflict ${i} (${conflict.entityId}), skipping`,
        );
        continue;
      }

      if (resolution === 'remote') {
        try {
          const storedOps: Array<{ id: string; seq: number }> = [];
          const appliedOpIds: string[] = [];
          let hadFailure = false;

          // Step 1: Persist ALL operations first to ensure safety
          // This ensures that even if we crash or fail during application,
          // we have a record of all operations in the sequence
          for (const op of conflict.remoteOps) {
            // Skip duplicates
            if (await this.opLogStore.hasOp(op.id)) {
              OpLog.verbose(`ConflictResolutionService: Skipping duplicate op: ${op.id}`);
              continue;
            }

            // Store with pending status for crash recovery
            const seq = await this.opLogStore.append(op, 'remote', {
              pendingApply: true,
            });
            storedOps.push({ id: op.id, seq });
          }

          // Step 2: Apply operations sequentially
          for (const { id } of storedOps) {
            const op = conflict.remoteOps.find((o) => o.id === id);
            if (!op) continue;

            try {
              // Apply single operation
              await this.operationApplier.applyOperations([op]);

              // Check if this operation failed
              const failedCount = this.operationApplier.getFailedCount();
              if (failedCount > 0) {
                OpLog.err(
                  `ConflictResolutionService: Operation ${op.id} failed to apply`,
                );
                this.operationApplier.clearFailedOperations();
                hadFailure = true;
                break; // Stop applying more ops
              }

              appliedOpIds.push(op.id);
            } catch (e) {
              OpLog.err(`ConflictResolutionService: Exception applying op ${op.id}`, e);
              hadFailure = true;
              break;
            }
          }

          // Only mark successfully applied ops (not failed ones)
          const appliedSet = new Set(appliedOpIds);
          const successSeqs = storedOps
            .filter((o) => appliedSet.has(o.id))
            .map((o) => o.seq);
          if (successSeqs.length > 0) {
            await this.opLogStore.markApplied(successSeqs);
          }

          if (hadFailure) {
            OpLog.err(
              `ConflictResolutionService: Partial failure for ${conflict.entityId}. Applied ${appliedOpIds.length}/${conflict.remoteOps.length} ops`,
            );

            // Mark failed ops as 'failed' so they can be retried on next startup.
            // After MAX_CONFLICT_RETRY_ATTEMPTS, markFailed will mark them as rejected.
            const failedOpIds = storedOps
              .filter((o) => !appliedSet.has(o.id))
              .map((o) => o.id);

            if (failedOpIds.length > 0) {
              OpLog.warn(
                `ConflictResolutionService: Marking ${failedOpIds.length} failed ops for retry`,
              );
              await this.opLogStore.markFailed(failedOpIds, MAX_CONFLICT_RETRY_ATTEMPTS);
            }

            this.snackService.open({
              type: 'ERROR',
              msg: T.F.SYNC.S.CONFLICT_RESOLUTION_FAILED,
              actionStr: T.PS.RELOAD,
              actionFn: (): void => {
                window.location.reload();
              },
            });
            continue; // Skip marking local as rejected for this conflict
          }

          // Only mark local ops as rejected if ALL remote ops succeeded
          const localOpIds = conflict.localOps.map((op) => op.id);
          await this.opLogStore.markRejected(localOpIds);
          OpLog.normal(
            `ConflictResolutionService: Applied ${appliedOpIds.length} remote ops for ${conflict.entityId}`,
          );
        } catch (e) {
          OpLog.err(
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
        OpLog.normal(
          `ConflictResolutionService: Keeping local ops for ${conflict.entityId}`,
        );
      }
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
