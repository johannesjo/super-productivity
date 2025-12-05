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
   * @param nonConflictingOps - Non-conflicting ops to apply AFTER conflicts are resolved
   *   These are passed separately to ensure all ops are applied together after user decision.
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

    // Apply non-conflicting ops FIRST before resolving conflicts
    // These are safe to apply and may include dependencies needed by conflict ops
    if (nonConflictingOps.length > 0) {
      OpLog.normal(
        `ConflictResolutionService: Applying ${nonConflictingOps.length} non-conflicting ops before conflict resolution`,
      );
      await this._applyNonConflictingOps(nonConflictingOps);
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
          const opsToApply: Operation[] = [];

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
            opsToApply.push(op);
          }

          // Step 2: Apply ALL operations at once so the applier can sort by dependencies
          // This is critical - applying one at a time bypasses dependency resolution
          if (opsToApply.length > 0) {
            try {
              await this.operationApplier.applyOperations(opsToApply);

              // Check if any operations failed
              const failedCount = this.operationApplier.getFailedCount();
              if (failedCount > 0) {
                OpLog.err(
                  `ConflictResolutionService: ${failedCount} operations failed to apply for ${conflict.entityId}`,
                );
                this.operationApplier.clearFailedOperations();

                // Mark all stored ops as failed for retry
                const allOpIds = storedOps.map((o) => o.id);
                await this.opLogStore.markFailed(allOpIds, MAX_CONFLICT_RETRY_ATTEMPTS);

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

              // All ops succeeded - mark as applied
              const successSeqs = storedOps.map((o) => o.seq);
              await this.opLogStore.markApplied(successSeqs);
            } catch (e) {
              OpLog.err(
                `ConflictResolutionService: Exception applying ops for ${conflict.entityId}`,
                e,
              );
              const allOpIds = storedOps.map((o) => o.id);
              await this.opLogStore.markFailed(allOpIds, MAX_CONFLICT_RETRY_ATTEMPTS);

              this.snackService.open({
                type: 'ERROR',
                msg: T.F.SYNC.S.CONFLICT_RESOLUTION_FAILED,
                actionStr: T.PS.RELOAD,
                actionFn: (): void => {
                  window.location.reload();
                },
              });
              continue;
            }
          }

          // Mark local ops as rejected since we chose remote
          const localOpIds = conflict.localOps.map((op) => op.id);
          await this.opLogStore.markRejected(localOpIds);
          OpLog.normal(
            `ConflictResolutionService: Applied ${opsToApply.length} remote ops for ${conflict.entityId}`,
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
        // Keep local ops - store remote ops as rejected so they won't be sent again
        // This creates a record of the conflict resolution decision
        for (const op of conflict.remoteOps) {
          if (!(await this.opLogStore.hasOp(op.id))) {
            await this.opLogStore.append(op, 'remote');
          }
        }
        const remoteOpIds = conflict.remoteOps.map((op) => op.id);
        await this.opLogStore.markRejected(remoteOpIds);
        OpLog.normal(
          `ConflictResolutionService: Keeping local ops for ${conflict.entityId}, marked ${remoteOpIds.length} remote ops as rejected`,
        );
      }
    }

    // CHECKPOINT D: Validate and repair state after conflict resolution
    await this._validateAndRepairAfterResolution();
  }

  /**
   * Apply non-conflicting operations with crash-safe tracking.
   * These are operations that don't conflict with local state and are safe to apply.
   */
  private async _applyNonConflictingOps(ops: Operation[]): Promise<void> {
    const storedSeqs: number[] = [];
    const opsToApply: Operation[] = [];
    const storedOpIds: string[] = [];

    // Store operations with pending status before applying
    for (const op of ops) {
      if (!(await this.opLogStore.hasOp(op.id))) {
        const seq = await this.opLogStore.append(op, 'remote', { pendingApply: true });
        storedSeqs.push(seq);
        storedOpIds.push(op.id);
        opsToApply.push(op);
      } else {
        OpLog.verbose(`ConflictResolutionService: Skipping duplicate op: ${op.id}`);
      }
    }

    // Apply operations to NgRx store
    if (opsToApply.length > 0) {
      try {
        await this.operationApplier.applyOperations(opsToApply);
      } catch (e) {
        OpLog.err(
          `ConflictResolutionService: Failed to apply ${opsToApply.length} non-conflicting ops`,
          e,
        );
        await this.opLogStore.markFailed(storedOpIds);
        throw e;
      }
    }

    // Mark ops as successfully applied
    if (storedSeqs.length > 0) {
      await this.opLogStore.markApplied(storedSeqs);
      OpLog.normal(
        `ConflictResolutionService: Applied and marked ${storedSeqs.length} non-conflicting ops`,
      );
    }
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
