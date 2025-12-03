import { inject, Injectable } from '@angular/core';
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

const CURRENT_SCHEMA_VERSION = 1;
const COMPACTION_THRESHOLD = 500;

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
  private opsSinceCompaction = 0;
  private actions$ = inject(Actions);
  private lockService = inject(LockService);
  private opLogStore = inject(OperationLogStoreService);
  private pfapiService = inject(PfapiService);
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
    if (!this.clientId) {
      this.clientId = await this.pfapiService.pf.metaModel.loadClientId();
    }
    const clientId = this.clientId;

    // Extract payload (everything except type and meta)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, meta, ...payload } = action;

    try {
      await this.lockService.request('sp_op_log', async () => {
        const currentClock = await this.opLogStore.getCurrentVectorClock();
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

        // 1. Write to SUP_OPS (Part A)
        await this.opLogStore.append(op);

        // 2. Bridge to PFAPI (Part B) - Update META_MODEL vector clock
        // This ensures legacy sync (WebDAV/Dropbox) can detect local changes
        await this.pfapiService.pf.metaModel.incrementVectorClockForLocalChange(clientId);

        // 3. Broadcast to other tabs
        this.multiTabCoordinator.notifyNewOperation(op);
      });

      // 4. Check if compaction is needed
      this.opsSinceCompaction++;
      if (this.opsSinceCompaction >= COMPACTION_THRESHOLD) {
        this.opsSinceCompaction = 0;
        // Trigger compaction asynchronously (don't block write operation)
        this.triggerCompaction();
      }
    } catch (e) {
      // 4.1.1 Error Handling for Optimistic Updates
      console.error('Failed to persist operation', e);
      this.notifyUserAndTriggerRollback();
    }
  }

  /**
   * Triggers compaction asynchronously without blocking the main operation.
   * This is called after COMPACTION_THRESHOLD operations have been written.
   */
  private triggerCompaction(): void {
    PFLog.normal('OperationLogEffects: Triggering compaction...');
    this.compactionService.compact().catch((e) => {
      PFLog.err('OperationLogEffects: Compaction failed', e);
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
