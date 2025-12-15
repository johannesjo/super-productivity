import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EntityConflict, Operation } from '../operation.types';
import { OperationApplierService } from '../processing/operation-applier.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { OpLog } from '../../../log';
import { toEntityKey } from '../entity-key.util';
import {
  ConflictResolutionResult,
  DialogConflictResolutionComponent,
} from '../../../../imex/sync/dialog-conflict-resolution/dialog-conflict-resolution.component';
import { firstValueFrom } from 'rxjs';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';
import { ValidateStateService } from '../processing/validate-state.service';
import {
  MAX_CONFLICT_RETRY_ATTEMPTS,
  CONFLICT_DIALOG_TIMEOUT_MS,
} from '../operation-log.const';
import { UserInputWaitStateService } from '../../../../imex/sync/user-input-wait-state.service';
import { SyncSafetyBackupService } from '../../../../imex/sync/sync-safety-backup.service';

/**
 * Handles sync conflicts when the same entity has been modified both locally and remotely.
 *
 * ## Overview
 * When syncing detects that both local and remote clients modified the same entity,
 * this service presents a dialog letting the user choose which version to keep.
 * It then applies the chosen resolution while maintaining data consistency.
 *
 * ## Resolution Flow
 * 1. Present conflict dialog to user (one choice per conflicting entity)
 * 2. User chooses "local" or "remote" for each conflict (or cancels)
 * 3. If cancelled: nothing happens, state remains as-is
 * 4. If resolved:
 *    - Remote wins: Apply remote ops, reject local ops AND any stale pending ops
 *    - Local wins: Store remote ops as rejected, local ops will upload on next sync
 * 5. Apply all chosen ops in a single batch (for dependency sorting)
 * 6. Validate and repair state (Checkpoint D)
 *
 * ## Safety Features
 * - **Timeout prevention**: Signals user input wait state to prevent sync timeout
 * - **Duplicate detection**: Skips ops already in the store
 * - **Crash safety**: Marks ops as rejected BEFORE applying
 * - **Stale op rejection**: When remote wins, rejects ALL pending ops for affected entities
 *   (prevents uploading ops with outdated vector clocks)
 * - **Batch application**: All ops applied together for correct dependency sorting
 * - **Post-resolution validation**: Runs state validation and repair after resolution
 */
@Injectable({
  providedIn: 'root',
})
export class ConflictResolutionService {
  private dialog = inject(MatDialog);
  private operationApplier = inject(OperationApplierService);
  private opLogStore = inject(OperationLogStoreService);
  private snackService = inject(SnackService);
  private validateStateService = inject(ValidateStateService);
  private userInputWaitState = inject(UserInputWaitStateService);
  private syncSafetyBackupService = inject(SyncSafetyBackupService);

  /** Reference to the open conflict dialog, if any */
  private _dialogRef?: MatDialogRef<DialogConflictResolutionComponent>;

  /** Atomic flag to prevent timeout race condition with user resolution */
  private _dialogResolved = false;

  /**
   * Present conflicts to the user and apply their chosen resolutions.
   *
   * Opens a dialog where the user can choose "local" or "remote" for each conflict.
   * After the user makes their choices (or cancels), this method:
   * 1. Stores and applies chosen remote operations
   * 2. Rejects the losing side's operations (and any stale pending ops)
   * 3. Validates state after resolution
   *
   * @param conflicts - Entity conflicts where both local and remote modified the same entity.
   *   Each conflict contains the local ops, remote ops, and entity info.
   * @param nonConflictingOps - Remote ops that don't conflict but arrived in the same sync.
   *   These are batched with conflict resolutions so dependency sorting works correctly
   *   (e.g., a non-conflicting Task create that depends on a Project from a resolved conflict).
   *
   * @returns Resolves when resolution is complete (or immediately if user cancels)
   *
   * @example
   * ```ts
   * // During sync, conflicts were detected
   * const conflicts = detectConflicts(localOps, remoteOps);
   * const nonConflicting = remoteOps.filter(op => !isConflicting(op));
   *
   * // Present to user and apply their choices
   * await conflictResolutionService.presentConflicts(conflicts, nonConflicting);
   * ```
   */
  async presentConflicts(
    conflicts: EntityConflict[],
    nonConflictingOps: Operation[] = [],
  ): Promise<void> {
    OpLog.warn('ConflictResolutionService: Presenting conflicts', conflicts);

    // SAFETY: Create backup before conflict resolution
    // If state corruption occurs during apply, user can restore from this backup
    try {
      await this.syncSafetyBackupService.createBackup();
      OpLog.normal(
        'ConflictResolutionService: Safety backup created before conflict resolution',
      );
    } catch (backupErr) {
      OpLog.err('ConflictResolutionService: Failed to create safety backup', backupErr);
      // Continue with conflict resolution - backup failure shouldn't block sync
    }

    // Signal that we're waiting for user input to prevent sync timeout
    const stopWaiting = this.userInputWaitState.startWaiting('oplog-conflict');
    let result: ConflictResolutionResult | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // Reset atomic flag for this dialog session
    this._dialogResolved = false;

    try {
      this._dialogRef = this.dialog.open(DialogConflictResolutionComponent, {
        data: { conflicts },
        disableClose: false,
      });

      // Set up timeout to auto-cancel the dialog
      // This prevents sync from being blocked indefinitely if user walks away
      // Uses atomic flag to prevent race condition with user resolution
      timeoutId = setTimeout(() => {
        if (this._dialogRef && !this._dialogResolved) {
          this._dialogResolved = true; // Set flag before closing
          OpLog.warn(
            'ConflictResolutionService: Dialog timeout - auto-cancelling after ' +
              `${CONFLICT_DIALOG_TIMEOUT_MS / 1000}s`,
          );
          this._dialogRef.close(undefined);
          this.snackService.open({
            type: 'ERROR',
            msg: T.F.SYNC.S.CONFLICT_DIALOG_TIMEOUT,
          });
        }
      }, CONFLICT_DIALOG_TIMEOUT_MS);

      result = await firstValueFrom(this._dialogRef.afterClosed());
      this._dialogResolved = true; // Mark as resolved after dialog closes
    } finally {
      // Clear timeout on normal close
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      stopWaiting();
    }

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

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Process each conflict based on user's choice
    // - Remote wins: queue remote ops for application, mark local ops for rejection
    // - Local wins: store remote ops as rejected (local ops stay pending for upload)
    // ─────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1.5: Reject ALL pending ops for entities where remote won
    // Why: When remote wins, the local state is replaced. Any pending ops for that
    // entity were created against the old local state and have outdated vector clocks.
    // Uploading them would cause conflicts on other clients or corrupt data.
    // ─────────────────────────────────────────────────────────────────────────
    if (localOpsToReject.length > 0) {
      const affectedEntityKeys = new Set<string>();
      for (let i = 0; i < conflicts.length; i++) {
        const conflict = conflicts[i];
        const resolution = result.resolutions.get(i);
        if (resolution === 'remote') {
          for (const op of conflict.remoteOps) {
            const ids = op.entityIds || (op.entityId ? [op.entityId] : []);
            for (const id of ids) {
              affectedEntityKeys.add(toEntityKey(op.entityType, id));
            }
          }
        }
      }

      // Get all pending ops and reject those targeting affected entities
      const pendingByEntity = await this.opLogStore.getUnsyncedByEntity();
      for (const entityKey of affectedEntityKeys) {
        const pendingOps = pendingByEntity.get(entityKey) || [];
        for (const op of pendingOps) {
          if (!localOpsToReject.includes(op.id)) {
            localOpsToReject.push(op.id);
            OpLog.normal(
              `ConflictResolutionService: Also rejecting stale op ${op.id} for entity ${entityKey}`,
            );
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Add non-conflicting remote ops to the batch
    // These are remote ops that don't conflict but need to be applied together
    // with conflict resolutions for correct dependency sorting.
    // ─────────────────────────────────────────────────────────────────────────
    for (const op of nonConflictingOps) {
      if (await this.opLogStore.hasOp(op.id)) {
        OpLog.verbose(`ConflictResolutionService: Skipping duplicate op: ${op.id}`);
        continue;
      }
      const seq = await this.opLogStore.append(op, 'remote', { pendingApply: true });
      allStoredOps.push({ id: op.id, seq });
      allOpsToApply.push(op);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2.5: Mark rejected operations BEFORE applying (crash safety)
    // Why do this before applying? If we crash after applying but before marking,
    // rejected ops won't be re-uploaded on restart. Order matters for consistency.
    // ─────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Apply ALL operations in a single batch
    // Why batch? Dependency sorting only works within a single applyOperations() call.
    // Example: A Task create depends on its Project existing. If the Project came from
    // a conflict resolution and the Task from non-conflicting ops, batching ensures
    // the Project is created first.
    // ─────────────────────────────────────────────────────────────────────────
    if (allOpsToApply.length > 0) {
      OpLog.normal(
        `ConflictResolutionService: Applying ${allOpsToApply.length} ops in single batch`,
      );

      // Map op ID to seq for marking partial success
      const opIdToSeq = new Map(allStoredOps.map((o) => [o.id, o.seq]));

      const applyResult = await this.operationApplier.applyOperations(allOpsToApply);

      // Mark successfully applied ops
      const appliedSeqs = applyResult.appliedOps
        .map((op) => opIdToSeq.get(op.id))
        .filter((seq): seq is number => seq !== undefined);

      if (appliedSeqs.length > 0) {
        await this.opLogStore.markApplied(appliedSeqs);
        OpLog.normal(
          `ConflictResolutionService: Successfully applied ${appliedSeqs.length} ops`,
        );
      }

      // Handle partial failure
      if (applyResult.failedOp) {
        // Find all ops that weren't applied (failed op + remaining ops)
        const failedOpIndex = allOpsToApply.findIndex(
          (op) => op.id === applyResult.failedOp!.op.id,
        );
        const failedOps = allOpsToApply.slice(failedOpIndex);
        const failedOpIds = failedOps.map((op) => op.id);

        OpLog.err(
          `ConflictResolutionService: ${applyResult.appliedOps.length} ops applied before failure. ` +
            `Marking ${failedOpIds.length} ops as failed.`,
          applyResult.failedOp.error,
        );
        await this.opLogStore.markFailed(failedOpIds, MAX_CONFLICT_RETRY_ATTEMPTS);

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

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4 (CHECKPOINT D): Validate and repair state after conflict resolution
    // Conflict resolution can leave orphaned references or inconsistent state.
    // This checkpoint catches and repairs any issues before normal operation resumes.
    // ─────────────────────────────────────────────────────────────────────────
    await this._validateAndRepairAfterResolution();
  }

  /**
   * Validates the current state after conflict resolution and repairs if necessary.
   *
   * This is **Checkpoint D** in the validation architecture. It catches issues like:
   * - Tasks referencing deleted projects/tags
   * - Orphaned sub-tasks after parent deletion
   * - Inconsistent taskIds arrays in projects/tags
   *
   * @see ValidateStateService for the full validation and repair logic
   */
  private async _validateAndRepairAfterResolution(): Promise<void> {
    await this.validateStateService.validateAndRepairCurrentState('conflict-resolution');
  }
}
