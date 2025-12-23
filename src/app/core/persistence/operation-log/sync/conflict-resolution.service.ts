import { inject, Injectable } from '@angular/core';
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
import { firstValueFrom } from 'rxjs';
import { SnackService } from '../../../snack/snack.service';
import { T } from '../../../../t.const';
import { ValidateStateService } from '../processing/validate-state.service';
import { MAX_CONFLICT_RETRY_ATTEMPTS } from '../operation-log.const';
import { SyncSafetyBackupService } from '../../../../imex/sync/sync-safety-backup.service';
import {
  incrementVectorClock,
  mergeVectorClocks,
} from '../../../../pfapi/api/util/vector-clock';
import { uuidv7 } from '../../../../util/uuid-v7';
import { CURRENT_SCHEMA_VERSION } from '../store/schema-migration.service';
import { CLIENT_ID_PROVIDER } from '../client-id.provider';
import {
  getEntityConfig,
  isAdapterEntity,
  isSingletonEntity,
  isMapEntity,
  isArrayEntity,
} from '../entity-registry';
import { selectIssueProviderById } from '../../../../features/issue/store/issue-provider.selectors';

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
 * Handles sync conflicts using Last-Write-Wins (LWW) automatic resolution.
 *
 * ## Overview
 * When syncing detects that both local and remote clients modified the same entity,
 * this service automatically resolves conflicts using LWW timestamp comparison.
 * No user interaction required - conflicts are resolved silently with a notification.
 *
 * ## LWW Resolution Flow
 * 1. Compare timestamps of conflicting operations
 * 2. The side with the newer timestamp wins
 * 3. When timestamps are equal, remote wins (server-authoritative)
 * 4. If local wins, create a new update op to sync local state to server
 * 5. Apply all chosen ops in a single batch (for dependency sorting)
 * 6. Validate and repair state (Checkpoint D)
 *
 * ## Safety Features
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
  private store = inject(Store);
  private operationApplier = inject(OperationApplierService);
  private opLogStore = inject(OperationLogStoreService);
  private snackService = inject(SnackService);
  private validateStateService = inject(ValidateStateService);
  private syncSafetyBackupService = inject(SyncSafetyBackupService);
  private clientIdProvider = inject(CLIENT_ID_PROVIDER);

  /**
   * Validates the current state after conflict resolution and repairs if necessary.
   *
   * This is **Checkpoint D** in the validation architecture. It catches issues like:
   * - Tasks referencing deleted projects/tags
   * - Orphaned sub-tasks after parent deletion
   * - Inconsistent taskIds arrays in projects/tags
   *
   * Note: This is called from within the sp_op_log lock (via autoResolveConflictsLWW),
   * so we pass callerHoldsLock: true to prevent deadlock when creating repair operations.
   *
   * @see ValidateStateService for the full validation and repair logic
   */
  private async _validateAndRepairAfterResolution(): Promise<void> {
    await this.validateStateService.validateAndRepairCurrentState('conflict-resolution', {
      callerHoldsLock: true,
    });
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
   * Maximum depth for deep equality check to prevent stack overflow
   * from deeply nested or circular structures.
   */
  private readonly MAX_DEEP_EQUAL_DEPTH = 50;

  /**
   * Deep equality check for payloads.
   * Handles nested objects, arrays, and primitives.
   * Includes protection against circular references and deep nesting.
   *
   * @param a First value to compare
   * @param b Second value to compare
   * @param seen WeakSet to track visited objects (circular reference protection)
   * @param depth Current recursion depth (deep nesting protection)
   */
  private _deepEqual(
    a: unknown,
    b: unknown,
    seen: WeakSet<object> = new WeakSet(),
    depth: number = 0,
  ): boolean {
    // Depth limit protection
    if (depth > this.MAX_DEEP_EQUAL_DEPTH) {
      OpLog.warn(
        'ConflictResolutionService: _deepEqual exceeded max depth, returning false',
      );
      return false;
    }

    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      // Circular reference protection: if we've seen this object before, return false
      // (comparing circular structures for equality is complex and likely indicates corrupted data)
      if (seen.has(a as object) || seen.has(b as object)) {
        OpLog.warn(
          'ConflictResolutionService: _deepEqual detected circular reference, returning false',
        );
        return false;
      }
      seen.add(a as object);
      seen.add(b as object);

      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((val, i) => this._deepEqual(val, b[i], seen, depth + 1));
      }

      if (Array.isArray(a) !== Array.isArray(b)) return false;

      const aKeys = Object.keys(a as object);
      const bKeys = Object.keys(b as object);
      if (aKeys.length !== bKeys.length) return false;

      return aKeys.every((key) =>
        this._deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
          seen,
          depth + 1,
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
  ): Promise<{ localWinOpsCreated: number }> {
    if (conflicts.length === 0 && nonConflictingOps.length === 0) {
      return { localWinOpsCreated: 0 };
    }

    OpLog.normal(
      `ConflictResolutionService: Auto-resolving ${conflicts.length} conflict(s) using LWW`,
    );

    // SAFETY: Create backup before conflict resolution (with timeout to prevent indefinite stall)
    const BACKUP_TIMEOUT_MS = 10000; // 10 seconds
    try {
      const backupPromise = this.syncSafetyBackupService.createBackup();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Backup creation timed out')),
          BACKUP_TIMEOUT_MS,
        ),
      );
      await Promise.race([backupPromise, timeoutPromise]);
      OpLog.normal(
        'ConflictResolutionService: Safety backup created before LWW resolution',
      );
    } catch (backupErr) {
      const isTimeout =
        backupErr instanceof Error && backupErr.message === 'Backup creation timed out';
      if (isTimeout) {
        OpLog.warn(
          `ConflictResolutionService: Safety backup timed out after ${BACKUP_TIMEOUT_MS}ms, continuing with sync`,
        );
      } else {
        OpLog.err('ConflictResolutionService: Failed to create safety backup', backupErr);
      }
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

    return { localWinOpsCreated: newLocalWinOps.length };
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
    const entityState = await this.getCurrentEntityState(
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
    const clientId = await this.clientIdProvider.loadClientId();
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
   * Uses the entity registry to look up the appropriate selector.
   *
   * @param entityType - The type of entity
   * @param entityId - The ID of the entity
   * @returns The entity state, or undefined if not found
   */
  async getCurrentEntityState(
    entityType: EntityType,
    entityId: string,
  ): Promise<unknown> {
    const config = getEntityConfig(entityType);
    if (!config) {
      OpLog.warn(
        `ConflictResolutionService: No config for entity type ${entityType}, falling back to remote`,
      );
      return undefined;
    }

    try {
      // Adapter entities - use selectById
      if (isAdapterEntity(config) && config.selectById) {
        // Special case: ISSUE_PROVIDER has a factory selector (id, key) => selector
        if (entityType === 'ISSUE_PROVIDER') {
          return await firstValueFrom(
            this.store.select(selectIssueProviderById(entityId, null)),
          );
        }
        // Standard props-based selector
        return await firstValueFrom(
          this.store.select(config.selectById as any, { id: entityId }),
        );
      }

      // Singleton entities - return entire feature state
      if (isSingletonEntity(config) && config.selectState) {
        return await firstValueFrom(this.store.select(config.selectState));
      }

      // Map entities - get state and extract by key
      if (isMapEntity(config) && config.selectState && config.mapKey) {
        const state = await firstValueFrom(this.store.select(config.selectState));
        return (state as Record<string, unknown>)?.[config.mapKey]?.[entityId];
      }

      // Array entities - get state and find by id
      if (isArrayEntity(config) && config.selectState) {
        const state = await firstValueFrom(this.store.select(config.selectState));
        if (config.arrayKey === null) {
          // State IS the array (e.g., REMINDER)
          return (state as Array<{ id: string }>)?.find((item) => item.id === entityId);
        }
        // State has array at arrayKey (e.g., BOARD.boardCfgs)
        if (config.arrayKey) {
          const arr = (state as Record<string, unknown>)?.[config.arrayKey];
          return (arr as Array<{ id: string }>)?.find((item) => item.id === entityId);
        }
        return undefined;
      }

      OpLog.warn(
        `ConflictResolutionService: Cannot get state for entity type ${entityType}`,
      );
      return undefined;
    } catch (err) {
      OpLog.err(
        `ConflictResolutionService: Error getting entity state for ${entityType}:${entityId}`,
        err,
      );
      return undefined;
    }
  }
}
