import { inject, Injectable, Injector } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import {
  EntityConflict,
  EntityType,
  Operation,
  OpType,
  VectorClock,
} from '../operation.types';
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
import {
  incrementVectorClock,
  mergeVectorClocks,
} from '../../../../pfapi/api/util/vector-clock';
import { uuidv7 } from '../../../../util/uuid-v7';
import { CURRENT_SCHEMA_VERSION } from '../store/schema-migration.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { lazyInject } from '../../../../util/lazy-inject';
import { selectTaskById } from '../../../../features/tasks/store/task.selectors';
import { selectProjectById } from '../../../../features/project/store/project.selectors';
import { selectTagById } from '../../../../features/tag/store/tag.reducer';
import { selectNoteById } from '../../../../features/note/store/note.reducer';
import { selectConfigFeatureState } from '../../../../features/config/store/global-config.reducer';
import { selectSimpleCounterById } from '../../../../features/simple-counter/store/simple-counter.reducer';
import { selectTaskRepeatCfgById } from '../../../../features/task-repeat-cfg/store/task-repeat-cfg.selectors';
import { selectIssueProviderById } from '../../../../features/issue/store/issue-provider.selectors';
import { selectMetricById } from '../../../../features/metric/store/metric.selectors';
import { selectPlannerState } from '../../../../features/planner/store/planner.selectors';
import { selectBoardsState } from '../../../../features/boards/store/boards.selectors';
import { selectReminderFeatureState } from '../../../../features/reminder/store/reminder.reducer';
import { selectTimeTrackingState } from '../../../../features/time-tracking/store/time-tracking.selectors';
import { selectMenuTreeState } from '../../../../features/menu-tree/store/menu-tree.selectors';

/**
 * Represents the result of LWW (Last-Write-Wins) conflict resolution.
 */
interface LWWResolution {
  /** The conflict that was resolved */
  conflict: EntityConflict;
  /** Which side won: 'local' or 'remote' */
  winner: 'local' | 'remote';
  /** If local wins, this is the new UPDATE operation to sync local state */
  localWinOp?: Operation;
}

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
  private store = inject(Store);
  private operationApplier = inject(OperationApplierService);
  private opLogStore = inject(OperationLogStoreService);
  private snackService = inject(SnackService);
  private validateStateService = inject(ValidateStateService);
  private userInputWaitState = inject(UserInputWaitStateService);
  private syncSafetyBackupService = inject(SyncSafetyBackupService);

  // Lazy injection to break circular dependency
  private _injector = inject(Injector);
  private _getPfapiService = lazyInject(this._injector, PfapiService);

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

    // ─────────────────────────────────────────────────────────────────────────
    // AUTO-RESOLVE IDENTICAL CONFLICTS
    // Conflicts where both sides have the same effect (e.g., both DELETE)
    // are auto-resolved as "remote" without user intervention.
    // ─────────────────────────────────────────────────────────────────────────
    const identicalConflicts: EntityConflict[] = [];
    const realConflicts: EntityConflict[] = [];

    for (const conflict of conflicts) {
      if (this.isIdenticalConflict(conflict)) {
        identicalConflicts.push(conflict);
      } else {
        realConflicts.push(conflict);
      }
    }

    if (identicalConflicts.length > 0) {
      OpLog.normal(
        `ConflictResolutionService: Auto-resolving ${identicalConflicts.length} identical conflict(s) as remote`,
      );
    }

    // SAFETY: Create backup before conflict resolution
    // If state corruption occurs during apply, user can restore from this backup
    try {
      await this.syncSafetyBackupService.createBackup();
      OpLog.normal(
        'ConflictResolutionService: Safety backup created before conflict resolution',
      );
    } catch (backupErr) {
      OpLog.err('ConflictResolutionService: Failed to create safety backup', backupErr);
      // Warn user but continue - backup failure shouldn't block sync
      this.snackService.open({
        type: 'ERROR',
        msg: T.F.SYNC.SAFETY_BACKUP.CREATE_FAILED_SYNC_CONTINUES,
      });
    }

    // Collect all operations to apply in a single batch for proper dependency sorting
    const allOpsToApply: Operation[] = [];
    const allStoredOps: Array<{ id: string; seq: number }> = [];
    const localOpsToReject: string[] = [];
    const remoteOpsToReject: string[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 0: Process identical conflicts automatically (always choose remote)
    // ─────────────────────────────────────────────────────────────────────────
    for (const conflict of identicalConflicts) {
      // Remote wins for identical conflicts
      for (const op of conflict.remoteOps) {
        if (await this.opLogStore.hasOp(op.id)) {
          OpLog.verbose(
            `ConflictResolutionService: Skipping duplicate op (identical): ${op.id}`,
          );
          continue;
        }
        const seq = await this.opLogStore.append(op, 'remote', { pendingApply: true });
        allStoredOps.push({ id: op.id, seq });
        allOpsToApply.push(op);
      }
      localOpsToReject.push(...conflict.localOps.map((op) => op.id));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Show dialog for real conflicts (if any)
    // ─────────────────────────────────────────────────────────────────────────
    let result: ConflictResolutionResult | undefined;

    if (realConflicts.length > 0) {
      // Signal that we're waiting for user input to prevent sync timeout
      const stopWaiting = this.userInputWaitState.startWaiting('oplog-conflict');
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      // Reset atomic flag for this dialog session
      this._dialogResolved = false;

      try {
        this._dialogRef = this.dialog.open(DialogConflictResolutionComponent, {
          data: { conflicts: realConflicts },
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

      OpLog.normal(
        'ConflictResolutionService: Processing resolutions',
        result.resolutions,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Process each real conflict based on user's choice
    // - Remote wins: queue remote ops for application, mark local ops for rejection
    // - Local wins: store remote ops as rejected (local ops stay pending for upload)
    // ─────────────────────────────────────────────────────────────────────────
    for (let i = 0; i < realConflicts.length; i++) {
      const conflict = realConflicts[i];
      const resolution = result?.resolutions.get(i);

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
    // STEP 2.5: Reject ALL pending ops for entities where remote won
    // Why: When remote wins, the local state is replaced. Any pending ops for that
    // entity were created against the old local state and have outdated vector clocks.
    // Uploading them would cause conflicts on other clients or corrupt data.
    // ─────────────────────────────────────────────────────────────────────────
    if (localOpsToReject.length > 0) {
      const affectedEntityKeys = new Set<string>();

      // Add entity keys from identical conflicts (always resolved as remote)
      for (const conflict of identicalConflicts) {
        for (const op of conflict.remoteOps) {
          const ids = op.entityIds || (op.entityId ? [op.entityId] : []);
          for (const id of ids) {
            affectedEntityKeys.add(toEntityKey(op.entityType, id));
          }
        }
      }

      // Add entity keys from real conflicts resolved as remote
      for (let i = 0; i < realConflicts.length; i++) {
        const conflict = realConflicts[i];
        const resolution = result?.resolutions.get(i);
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
    // STEP 3: Add non-conflicting remote ops to the batch
    // These are remote ops that don't conflict but need to be applied together
    // with conflict resolutions for correct dependency sorting.
    // ─────────────────────────────────────────────────────────────────────────
    const newNonConflictingOps = await this.opLogStore.filterNewOps(nonConflictingOps);
    const duplicateCount = nonConflictingOps.length - newNonConflictingOps.length;
    if (duplicateCount > 0) {
      OpLog.verbose(
        `ConflictResolutionService: Skipping ${duplicateCount} duplicate non-conflicting op(s)`,
      );
    }
    for (const op of newNonConflictingOps) {
      const seq = await this.opLogStore.append(op, 'remote', { pendingApply: true });
      allStoredOps.push({ id: op.id, seq });
      allOpsToApply.push(op);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Mark rejected operations BEFORE applying (crash safety)
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
    // STEP 5: Apply ALL operations in a single batch
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

  /**
   * Check if a conflict has identical effects on both sides.
   *
   * Identical conflicts occur when both local and remote operations would result
   * in the same final state. These can be auto-resolved without user intervention.
   *
   * ## Identical Conflict Scenarios:
   * 1. **Both DELETE**: Both sides deleted the same entity
   * 2. **Same UPDATE payloads**: Both sides made identical changes
   *
   * @param conflict - The conflict to check
   * @returns true if the conflict has identical effects and can be auto-resolved
   */
  isIdenticalConflict(conflict: EntityConflict): boolean {
    const { localOps, remoteOps } = conflict;

    // Empty ops can't be identical conflicts
    if (localOps.length === 0 || remoteOps.length === 0) {
      return false;
    }

    // Case 1: Both sides DELETE the same entity
    // This is the most common "identical" conflict
    const allLocalDelete = localOps.every((op) => op.opType === OpType.Delete);
    const allRemoteDelete = remoteOps.every((op) => op.opType === OpType.Delete);
    if (allLocalDelete && allRemoteDelete) {
      OpLog.verbose(
        `ConflictResolutionService: Identical conflict (both DELETE) for ${conflict.entityType}:${conflict.entityId}`,
      );
      return true;
    }

    // Case 2: Single ops with same opType and identical payloads
    // Only check single-op conflicts for payload comparison (multi-op is too complex)
    if (localOps.length === 1 && remoteOps.length === 1) {
      const localOp = localOps[0];
      const remoteOp = remoteOps[0];

      // Must be same operation type
      if (localOp.opType !== remoteOp.opType) {
        return false;
      }

      // Compare payloads using deep equality
      if (this._deepEqual(localOp.payload, remoteOp.payload)) {
        OpLog.verbose(
          `ConflictResolutionService: Identical conflict (same ${localOp.opType} payload) for ${conflict.entityType}:${conflict.entityId}`,
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Deep equality check for payloads.
   * Handles nested objects, arrays, and primitives.
   */
  private _deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((val, i) => this._deepEqual(val, b[i]));
      }

      if (Array.isArray(a) !== Array.isArray(b)) return false;

      const aKeys = Object.keys(a as object);
      const bKeys = Object.keys(b as object);
      if (aKeys.length !== bKeys.length) return false;

      return aKeys.every((key) =>
        this._deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
      );
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAST-WRITE-WINS (LWW) AUTO-RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Automatically resolves conflicts using Last-Write-Wins (LWW) strategy.
   *
   * ## How LWW Works
   * 1. Compare timestamps of conflicting operations
   * 2. The side with the newer timestamp wins
   * 3. When timestamps are equal, remote wins (server-authoritative)
   *
   * ## When Local Wins
   * When local state is newer, we can't just reject the remote ops - that would
   * cause the local state to never sync to the server. Instead, we:
   * 1. Reject BOTH local AND remote ops (they're now obsolete)
   * 2. Create a NEW update operation with:
   *    - Current entity state from NgRx store
   *    - Merged vector clock (local + remote) + increment
   *    - New timestamp
   * 3. This new op will be uploaded on next sync, propagating local state
   *
   * @param conflicts - Entity conflicts to auto-resolve
   * @param nonConflictingOps - Remote ops that don't conflict (batched for dependency sorting)
   * @returns Promise resolving when all resolutions are applied
   */
  async autoResolveConflictsLWW(
    conflicts: EntityConflict[],
    nonConflictingOps: Operation[] = [],
  ): Promise<void> {
    if (conflicts.length === 0 && nonConflictingOps.length === 0) {
      return;
    }

    OpLog.normal(
      `ConflictResolutionService: Auto-resolving ${conflicts.length} conflict(s) using LWW`,
    );

    // SAFETY: Create backup before conflict resolution
    try {
      await this.syncSafetyBackupService.createBackup();
      OpLog.normal(
        'ConflictResolutionService: Safety backup created before LWW resolution',
      );
    } catch (backupErr) {
      OpLog.err('ConflictResolutionService: Failed to create safety backup', backupErr);
      this.snackService.open({
        type: 'ERROR',
        msg: T.F.SYNC.SAFETY_BACKUP.CREATE_FAILED_SYNC_CONTINUES,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Resolve each conflict using LWW
    // ─────────────────────────────────────────────────────────────────────────
    const resolutions = await this._resolveConflictsWithLWW(conflicts);

    // Count results for notification
    let localWinsCount = 0;
    let remoteWinsCount = 0;

    const allOpsToApply: Operation[] = [];
    const allStoredOps: Array<{ id: string; seq: number }> = [];
    const localOpsToReject: string[] = [];
    const remoteOpsToReject: string[] = [];
    const newLocalWinOps: Operation[] = [];

    for (const resolution of resolutions) {
      if (resolution.winner === 'remote') {
        remoteWinsCount++;
        // Remote wins: apply remote ops, reject local ops
        for (const op of resolution.conflict.remoteOps) {
          if (await this.opLogStore.hasOp(op.id)) {
            OpLog.verbose(
              `ConflictResolutionService: Skipping duplicate op (LWW remote): ${op.id}`,
            );
            continue;
          }
          const seq = await this.opLogStore.append(op, 'remote', { pendingApply: true });
          allStoredOps.push({ id: op.id, seq });
          allOpsToApply.push(op);
        }
        localOpsToReject.push(...resolution.conflict.localOps.map((op) => op.id));
      } else {
        localWinsCount++;
        // Local wins: reject both local AND remote ops, create new update op
        localOpsToReject.push(...resolution.conflict.localOps.map((op) => op.id));
        for (const op of resolution.conflict.remoteOps) {
          if (!(await this.opLogStore.hasOp(op.id))) {
            await this.opLogStore.append(op, 'remote');
          }
        }
        remoteOpsToReject.push(...resolution.conflict.remoteOps.map((op) => op.id));

        // Store the new update op (will be uploaded on next sync)
        if (resolution.localWinOp) {
          newLocalWinOps.push(resolution.localWinOp);
          OpLog.warn(
            `ConflictResolutionService: LWW local wins - creating update op for ` +
              `${resolution.conflict.entityType}:${resolution.conflict.entityId}`,
          );
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Reject ALL pending ops for entities where remote won
    // ─────────────────────────────────────────────────────────────────────────
    if (localOpsToReject.length > 0) {
      const affectedEntityKeys = new Set<string>();
      for (const resolution of resolutions) {
        if (resolution.winner === 'remote') {
          for (const op of resolution.conflict.remoteOps) {
            const ids = op.entityIds || (op.entityId ? [op.entityId] : []);
            for (const id of ids) {
              affectedEntityKeys.add(toEntityKey(op.entityType, id));
            }
          }
        }
      }

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
    // STEP 3: Add non-conflicting remote ops to the batch
    // ─────────────────────────────────────────────────────────────────────────
    const newNonConflictingOps = await this.opLogStore.filterNewOps(nonConflictingOps);
    for (const op of newNonConflictingOps) {
      const seq = await this.opLogStore.append(op, 'remote', { pendingApply: true });
      allStoredOps.push({ id: op.id, seq });
      allOpsToApply.push(op);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Mark rejected operations BEFORE applying (crash safety)
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
    // STEP 5: Apply ALL remote operations in a single batch
    // ─────────────────────────────────────────────────────────────────────────
    if (allOpsToApply.length > 0) {
      OpLog.normal(
        `ConflictResolutionService: Applying ${allOpsToApply.length} ops in single batch`,
      );

      const opIdToSeq = new Map(allStoredOps.map((o) => [o.id, o.seq]));
      const applyResult = await this.operationApplier.applyOperations(allOpsToApply);

      const appliedSeqs = applyResult.appliedOps
        .map((op) => opIdToSeq.get(op.id))
        .filter((seq): seq is number => seq !== undefined);

      if (appliedSeqs.length > 0) {
        await this.opLogStore.markApplied(appliedSeqs);
        OpLog.normal(
          `ConflictResolutionService: Successfully applied ${appliedSeqs.length} ops`,
        );
      }

      if (applyResult.failedOp) {
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
    // STEP 6: Append new update ops for local wins (will sync on next cycle)
    // ─────────────────────────────────────────────────────────────────────────
    for (const op of newLocalWinOps) {
      await this.opLogStore.append(op, 'local');
      OpLog.normal(
        `ConflictResolutionService: Appended local-win update op ${op.id} for ${op.entityType}:${op.entityId}`,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: Show non-blocking notification
    // ─────────────────────────────────────────────────────────────────────────
    if (localWinsCount > 0 || remoteWinsCount > 0) {
      this.snackService.open({
        msg: T.F.SYNC.S.LWW_CONFLICTS_AUTO_RESOLVED,
        translateParams: {
          localWins: localWinsCount,
          remoteWins: remoteWinsCount,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8: Validate and repair state after resolution
    // ─────────────────────────────────────────────────────────────────────────
    await this._validateAndRepairAfterResolution();
  }

  /**
   * Resolves conflicts using LWW timestamp comparison.
   *
   * @param conflicts - The conflicts to resolve
   * @returns Array of resolutions with winner and optional new update op
   */
  private async _resolveConflictsWithLWW(
    conflicts: EntityConflict[],
  ): Promise<LWWResolution[]> {
    const resolutions: LWWResolution[] = [];

    for (const conflict of conflicts) {
      // Get max timestamp from each side
      const localMaxTimestamp = Math.max(...conflict.localOps.map((op) => op.timestamp));
      const remoteMaxTimestamp = Math.max(
        ...conflict.remoteOps.map((op) => op.timestamp),
      );

      // LWW comparison: newer wins, tie goes to remote (server-authoritative)
      if (localMaxTimestamp > remoteMaxTimestamp) {
        // Local wins - create update op with current state
        const localWinOp = await this._createLocalWinUpdateOp(conflict);
        resolutions.push({
          conflict,
          winner: 'local',
          localWinOp,
        });
        OpLog.normal(
          `ConflictResolutionService: LWW resolved ${conflict.entityType}:${conflict.entityId} as LOCAL ` +
            `(local: ${localMaxTimestamp}, remote: ${remoteMaxTimestamp})`,
        );
      } else {
        // Remote wins (includes tie)
        resolutions.push({
          conflict,
          winner: 'remote',
        });
        OpLog.normal(
          `ConflictResolutionService: LWW resolved ${conflict.entityType}:${conflict.entityId} as REMOTE ` +
            `(local: ${localMaxTimestamp}, remote: ${remoteMaxTimestamp})`,
        );
      }
    }

    return resolutions;
  }

  /**
   * Creates a new UPDATE operation to sync local state when local wins LWW.
   *
   * The new operation has:
   * - Fresh UUIDv7 ID
   * - Current entity state from NgRx store
   * - Merged vector clock (local + remote) + increment
   * - Current timestamp
   *
   * @param conflict - The conflict where local won
   * @returns New UPDATE operation, or undefined if entity not found
   */
  private async _createLocalWinUpdateOp(
    conflict: EntityConflict,
  ): Promise<Operation | undefined> {
    // Get current entity state from store
    const entityState = await this._getCurrentEntityState(
      conflict.entityType,
      conflict.entityId,
    );

    if (entityState === undefined) {
      OpLog.warn(
        `ConflictResolutionService: Cannot create local-win op - entity not found: ` +
          `${conflict.entityType}:${conflict.entityId}`,
      );
      return undefined;
    }

    // Get client ID
    const clientId = await this._getPfapiService().pf.metaModel.loadClientId();
    if (!clientId) {
      OpLog.err('ConflictResolutionService: Cannot create local-win op - no client ID');
      return undefined;
    }

    // Merge all vector clocks (local ops + remote ops) and increment
    let mergedClock: VectorClock = {};
    for (const op of conflict.localOps) {
      mergedClock = mergeVectorClocks(mergedClock, op.vectorClock);
    }
    for (const op of conflict.remoteOps) {
      mergedClock = mergeVectorClocks(mergedClock, op.vectorClock);
    }
    const newClock = incrementVectorClock(mergedClock, clientId);

    // Create the update operation
    const op: Operation = {
      id: uuidv7(),
      actionType: `[${conflict.entityType}] LWW Update`,
      opType: OpType.Update,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      payload: entityState,
      clientId,
      vectorClock: newClock,
      timestamp: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    return op;
  }

  /**
   * Gets the current state of an entity from the NgRx store.
   *
   * @param entityType - The type of entity
   * @param entityId - The ID of the entity
   * @returns The entity state, or undefined if not found
   */
  private async _getCurrentEntityState(
    entityType: EntityType,
    entityId: string,
  ): Promise<unknown> {
    try {
      switch (entityType) {
        // Entities with direct selectById selectors
        case 'TASK':
          return await firstValueFrom(
            this.store.select(selectTaskById, { id: entityId }),
          );
        case 'PROJECT':
          return await firstValueFrom(
            this.store.select(selectProjectById, { id: entityId }),
          );
        case 'TAG':
          return await firstValueFrom(this.store.select(selectTagById, { id: entityId }));
        case 'NOTE':
          return await firstValueFrom(
            this.store.select(selectNoteById, { id: entityId }),
          );
        case 'SIMPLE_COUNTER':
          return await firstValueFrom(
            this.store.select(selectSimpleCounterById, { id: entityId }),
          );
        case 'TASK_REPEAT_CFG':
          return await firstValueFrom(
            this.store.select(selectTaskRepeatCfgById, { id: entityId }),
          );
        case 'ISSUE_PROVIDER':
          // selectIssueProviderById is a factory function: (id, key) => selector
          return await firstValueFrom(
            this.store.select(selectIssueProviderById(entityId, null)),
          );
        case 'METRIC':
          return await firstValueFrom(
            this.store.select(selectMetricById, { id: entityId }),
          );

        // Singleton entities (entire feature state)
        case 'GLOBAL_CONFIG':
          return await firstValueFrom(this.store.select(selectConfigFeatureState));
        case 'TIME_TRACKING':
          return await firstValueFrom(this.store.select(selectTimeTrackingState));
        case 'MENU_TREE':
          return await firstValueFrom(this.store.select(selectMenuTreeState));

        // Complex state entities - extract entity from feature state
        case 'PLANNER': {
          const plannerState = await firstValueFrom(
            this.store.select(selectPlannerState),
          );
          // Planner stores days as a map, entityId is the day string
          return plannerState?.days?.[entityId];
        }
        case 'BOARD': {
          const boardsState = await firstValueFrom(this.store.select(selectBoardsState));
          // Boards state has boardCfgs array, find by id
          return boardsState?.boardCfgs?.find((b: { id: string }) => b.id === entityId);
        }
        case 'REMINDER': {
          const reminderState = await firstValueFrom(
            this.store.select(selectReminderFeatureState),
          );
          // Reminder state follows entity adapter pattern
          return (reminderState as { entities?: Record<string, unknown> })?.entities?.[
            entityId
          ];
        }

        // Fallback for unhandled entity types
        case 'WORK_CONTEXT':
        case 'PLUGIN_USER_DATA':
        case 'PLUGIN_METADATA':
        case 'MIGRATION':
        case 'RECOVERY':
        case 'ALL':
        default:
          OpLog.warn(
            `ConflictResolutionService: No selector for entity type ${entityType}, falling back to remote`,
          );
          return undefined;
      }
    } catch (err) {
      OpLog.err(
        `ConflictResolutionService: Error getting entity state for ${entityType}:${entityId}`,
        err,
      );
      return undefined;
    }
  }
}
