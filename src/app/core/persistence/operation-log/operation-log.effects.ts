import { inject, Injectable, Injector } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { filter, concatMap } from 'rxjs/operators';
import { LockService } from './lock.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { isPersistentAction, PersistentAction } from './persistent-action.interface';
import { uuidv7 } from '../../../util/uuid-v7';
import { incrementVectorClock } from '../../../pfapi/api/util/vector-clock';
import { Operation } from './operation.types';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { MultiTabCoordinatorService } from './multi-tab-coordinator.service';
import { OperationLogCompactionService } from './operation-log-compaction.service';
import { PFLog } from '../../log';
import { SnackService } from '../../snack/snack.service';
import { T } from '../../../t.const';
import { validateOperationPayload } from './validate-operation-payload';
import { VectorClockService } from './vector-clock.service';

const CURRENT_SCHEMA_VERSION = 1;
const COMPACTION_THRESHOLD = 500;
const MAX_COMPACTION_FAILURES = 3;

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
  private actions$ = inject(Actions);
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
        concatMap((action) => this.writeOperation(action as PersistentAction)),
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
          PFLog.err('[OperationLogEffects] Invalid operation payload', {
            error: validationResult.error,
            actionType: action.type,
            opType: op.opType,
            entityType: op.entityType,
          });
          this.snackService.open({
            type: 'ERROR',
            msg: T.F.SYNC.S.INVALID_OPERATION_PAYLOAD,
          });
          return; // Skip persisting invalid operation
        }

        // Log warnings if any (but still persist)
        if (validationResult.warnings?.length) {
          PFLog.warn('[OperationLogEffects] Operation payload warnings', {
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
      this.notifyUserAndTriggerRollback();
    }
  }

  /**
   * Triggers compaction asynchronously without blocking the main operation.
   * This is called after COMPACTION_THRESHOLD operations have been written.
   * Tracks failures and notifies user after MAX_COMPACTION_FAILURES consecutive failures.
   * Counter is reset by compaction service on success.
   */
  private triggerCompaction(): void {
    PFLog.normal('OperationLogEffects: Triggering compaction...');
    this.compactionService
      .compact()
      .then(() => {
        this.compactionFailures = 0;
      })
      .catch((e) => {
        PFLog.err('OperationLogEffects: Compaction failed', e);
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
}
