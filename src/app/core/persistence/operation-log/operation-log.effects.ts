import { inject, Injectable, Injector } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { ALL_ACTIONS } from '../../../util/local-actions.token';
import { filter, mergeMap } from 'rxjs/operators';
import { LockService } from './sync/lock.service';
import { OperationLogStoreService } from './store/operation-log-store.service';
import { isPersistentAction, PersistentAction } from './persistent-action.interface';
import { uuidv7 } from '../../../util/uuid-v7';
import { incrementVectorClock } from '../../../pfapi/api/util/vector-clock';
import { Operation } from './operation.types';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { MultiTabCoordinatorService } from './sync/multi-tab-coordinator.service';
import { OperationLogCompactionService } from './store/operation-log-compaction.service';
import { OpLog } from '../../log';
import { SnackService } from '../../snack/snack.service';
import { T } from '../../../t.const';
import { validateOperationPayload } from './processing/validate-operation-payload';
import { VectorClockService } from './sync/vector-clock.service';
import { COMPACTION_THRESHOLD, MAX_COMPACTION_FAILURES } from './operation-log.const';
import { CURRENT_SCHEMA_VERSION } from './store/schema-migration.service';

/**
 * NgRx Effects for persisting application state changes as operations to the
 * `OperationLogStoreService`. It listens for specific NgRx actions marked
 * as 'persistent' (via `PersistentActionMeta`), converts them into `Operation`
 * objects, and writes them to the IndexedDB log. This effect handles concurrency
 * control via `LockService` and ensures that remote operations (from sync)
 * are not re-logged.
 */
@Injectable()
export class OperationLogEffects {
  private clientId?: string;
  private compactionFailures = 0;
  /** Circuit breaker: prevents recursive quota exceeded handling */
  private isHandlingQuotaExceeded = false;
  // Uses ALL_ACTIONS because this effect captures all persistent actions and handles isRemote filtering internally
  private actions$ = inject(ALL_ACTIONS);
  private lockService = inject(LockService);
  private opLogStore = inject(OperationLogStoreService);
  private vectorClockService = inject(VectorClockService);
  private injector = inject(Injector);
  private multiTabCoordinator = inject(MultiTabCoordinatorService);
  private compactionService = inject(OperationLogCompactionService);
  private snackService = inject(SnackService);

  persistOperation$ = createEffect(
    () =>
      this.actions$.pipe(
        filter((action) => isPersistentAction(action)),
        filter((action) => !(action as PersistentAction).meta.isRemote),
        // Use mergeMap with concurrency limit for parallel writes
        // Lock service handles ordering; this prevents action queue backup
        mergeMap((action) => this.writeOperation(action as PersistentAction), 4),
      ),
    { dispatch: false },
  );

  private async writeOperation(action: PersistentAction): Promise<void> {
    const pfapiService = this.injector.get(PfapiService);

    if (!this.clientId) {
      this.clientId = await pfapiService.pf.metaModel.loadClientId();
    }
    if (!this.clientId) {
      throw new Error('Failed to load clientId - cannot persist operation');
    }
    const clientId = this.clientId;

    // Extract payload (everything except type and meta)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, meta, ...payload } = action;

    try {
      await this.lockService.request('sp_op_log', async () => {
        const currentClock = await this.vectorClockService.getCurrentVectorClock();
        const newClock = incrementVectorClock(currentClock, clientId);

        const op: Operation = {
          id: uuidv7(),
          actionType: action.type,
          opType: action.meta.opType,
          entityType: action.meta.entityType,
          entityId: action.meta.entityId,
          entityIds: action.meta.entityIds,
          payload: payload,
          clientId: clientId,
          vectorClock: newClock,
          timestamp: Date.now(),
          schemaVersion: CURRENT_SCHEMA_VERSION,
        };

        // CHECKPOINT A: Validate payload before persisting
        const validationResult = validateOperationPayload(op);
        if (!validationResult.success) {
          OpLog.err('[OperationLogEffects] Invalid operation payload', {
            error: validationResult.error,
            actionType: action.type,
            opType: op.opType,
            entityType: op.entityType,
          });
          // State may be inconsistent (action dispatched to reducers but not persisted)
          this.snackService.open({
            type: 'ERROR',
            msg: T.F.SYNC.S.INVALID_OPERATION_PAYLOAD,
            actionStr: T.PS.RELOAD,
            actionFn: (): void => {
              window.location.reload();
            },
          });
          return; // Skip persisting invalid operation
        }

        // Log warnings if any (but still persist)
        if (validationResult.warnings?.length) {
          OpLog.warn('[OperationLogEffects] Operation payload warnings', {
            warnings: validationResult.warnings,
            actionType: action.type,
          });
        }

        // 1. Write to SUP_OPS (Part A)
        await this.opLogStore.append(op);

        // 2. Bridge to PFAPI (Part B) - Update META_MODEL vector clock
        // This ensures legacy sync (WebDAV/Dropbox) can detect local changes
        // Skip if sync is in progress (database locked) - the op is already safe in SUP_OPS
        if (!pfapiService.pf.isSyncInProgress) {
          await pfapiService.pf.metaModel.incrementVectorClockForLocalChange(clientId);
        }

        // 3. Broadcast to other tabs
        this.multiTabCoordinator.notifyNewOperation(op);

        // 4. Check if compaction is needed (inside lock to prevent race between tabs)
        const opsCount = await this.opLogStore.incrementCompactionCounter();
        if (opsCount >= COMPACTION_THRESHOLD) {
          // Trigger compaction asynchronously (don't block write operation)
          // Counter is reset in compaction service on success
          this.triggerCompaction();
        }
      });
    } catch (e) {
      // 4.1.1 Error Handling for Optimistic Updates
      console.error('Failed to persist operation', e);
      if (this.isQuotaExceededError(e)) {
        // Circuit breaker: prevent recursive quota handling
        if (this.isHandlingQuotaExceeded) {
          OpLog.err(
            'OperationLogEffects: Quota exceeded during retry - aborting to prevent loop',
          );
          this.notifyUserAndTriggerRollback();
        } else {
          await this.handleQuotaExceeded(action);
        }
      } else {
        this.notifyUserAndTriggerRollback();
      }
    }
  }

  /**
   * Triggers compaction asynchronously without blocking the main operation.
   * This is called after COMPACTION_THRESHOLD operations have been written.
   * Tracks failures and notifies user after MAX_COMPACTION_FAILURES consecutive failures.
   * Counter is reset by compaction service on success.
   */
  private triggerCompaction(): void {
    OpLog.normal('OperationLogEffects: Triggering compaction...');
    this.compactionService
      .compact()
      .then(() => {
        this.compactionFailures = 0;
      })
      .catch((e) => {
        OpLog.err('OperationLogEffects: Compaction failed', e);
        this.compactionFailures++;
        if (this.compactionFailures >= MAX_COMPACTION_FAILURES) {
          this.snackService.open({
            type: 'ERROR',
            msg: T.F.SYNC.S.COMPACTION_FAILED,
          });
        }
      });
  }

  /**
   * Notifies the user that persistence failed and offers to reload the app.
   * This is called when writing to IndexedDB fails, leaving the app state
   * potentially inconsistent with persisted data.
   */
  private notifyUserAndTriggerRollback(): void {
    this.snackService.open({
      type: 'ERROR',
      msg: T.F.SYNC.S.PERSIST_FAILED,
      actionStr: T.PS.RELOAD,
      actionFn: (): void => {
        window.location.reload();
      },
    });
  }

  /**
   * Checks if an error is a QuotaExceededError from IndexedDB.
   * This happens when the browser storage quota is exceeded.
   */
  private isQuotaExceededError(e: unknown): boolean {
    if (e instanceof DOMException) {
      // Standard quota exceeded error names
      return (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
        e.code === 22 // Legacy Safari
      );
    }
    return false;
  }

  /**
   * Handles storage quota exceeded by triggering emergency compaction
   * and retrying the failed operation.
   * Uses circuit breaker flag to prevent infinite recursion.
   */
  private async handleQuotaExceeded(action: PersistentAction): Promise<void> {
    OpLog.err(
      'OperationLogEffects: Storage quota exceeded, attempting emergency compaction',
    );

    const compactionSucceeded = await this.compactionService.emergencyCompact();

    if (compactionSucceeded) {
      try {
        // Set circuit breaker before retry to prevent recursive handling
        this.isHandlingQuotaExceeded = true;
        // Retry the failed operation after compaction freed space
        await this.writeOperation(action);
        this.snackService.open({
          type: 'SUCCESS',
          msg: T.F.SYNC.S.STORAGE_RECOVERED_AFTER_COMPACTION,
        });
        return;
      } catch (retryErr) {
        OpLog.err('OperationLogEffects: Retry after compaction also failed', retryErr);
      } finally {
        // Always clear circuit breaker
        this.isHandlingQuotaExceeded = false;
      }
    } else {
      OpLog.err('OperationLogEffects: Emergency compaction failed');
    }

    // Compaction failed or retry failed - show error with action
    this.snackService.open({
      type: 'ERROR',
      msg: T.F.SYNC.S.STORAGE_QUOTA_EXCEEDED,
      actionStr: T.PS.RELOAD,
      actionFn: (): void => {
        window.location.reload();
      },
    });
  }
}
