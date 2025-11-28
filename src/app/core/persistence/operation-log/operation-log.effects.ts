import { inject, Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { filter, concatMap } from 'rxjs/operators';
import { LockService } from './lock.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { isPersistentAction, PersistentAction } from './persistent-action.interface';
import { BLACKLISTED_ACTION_TYPES } from './action-whitelist';
import { uuidv7 } from '../../../util/uuid-v7';
import { incrementVectorClock } from '../../../pfapi/api/util/vector-clock';
import { Operation } from './operation.types';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { MultiTabCoordinatorService } from './multi-tab-coordinator.service';

const CURRENT_SCHEMA_VERSION = 1;

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
  private actions$ = inject(Actions);
  private lockService = inject(LockService);
  private opLogStore = inject(OperationLogStoreService);
  private pfapiService = inject(PfapiService);
  private multiTabCoordinator = inject(MultiTabCoordinatorService);

  persistOperation$ = createEffect(
    () =>
      this.actions$.pipe(
        filter((action) => isPersistentAction(action)),
        filter((action) => !BLACKLISTED_ACTION_TYPES.has(action.type)),
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
      await this.lockService.request('sp_op_log_write', async () => {
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

        await this.opLogStore.append(op);
        this.multiTabCoordinator.notifyNewOperation(op);
      });
    } catch (e) {
      // 4.1.1 Error Handling for Optimistic Updates
      console.error('Failed to persist operation', e);
      // this.notifyUserAndTriggerRollback(action);
    }
  }
}
