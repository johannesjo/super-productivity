import { Injectable, inject } from '@angular/core';
import { createEffect, ofType } from '@ngrx/effects';
import { ALL_ACTIONS } from '../../../util/local-actions.token';
import { tap } from 'rxjs/operators';
import { flushYoungToOld } from './archive.actions';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { sortTimeTrackingAndTasksFromArchiveYoungToOld } from '../sort-data-to-flush';
import { ARCHIVE_TASK_YOUNG_TO_OLD_THRESHOLD } from '../archive.service';
import { Log } from '../../../core/log';

@Injectable()
export class ArchiveEffects {
  // Uses ALL_ACTIONS because this effect must run for both local and remote dispatches
  // to ensure deterministic archive state across all clients
  private _actions$ = inject(ALL_ACTIONS);
  private _pfapiService = inject(PfapiService);

  /**
   * Handles the flushYoungToOld action by executing the actual flush operation.
   * This effect runs for both local and remote dispatches, ensuring deterministic
   * archive state across all clients.
   *
   * The flush operation:
   * 1. Loads archiveYoung and archiveOld
   * 2. Moves old tasks and time tracking data from Young to Old
   * 3. Saves both archives
   *
   * NOTE on isIgnoreDBLock: When using Operation Log sync, this effect can be triggered
   * during sync processing (via OperationApplierService dispatching remote ops). The PFAPI
   * sync wrapper (pfapi.ts:_wrapSyncAction) locks the database to prevent external writes
   * during sync. However, this effect IS part of sync processing - it's applying a remote
   * `flushYoungToOld` operation to maintain deterministic archive state across clients.
   * Therefore, we must use isIgnoreDBLock:true to allow these writes to proceed.
   * Without this flag, the meta model update (triggered by isUpdateRevAndLastUpdate:true)
   * would be blocked, causing "Attempting to write DB for __meta_ while locked" errors.
   */
  flushYoungToOld$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(flushYoungToOld),
        tap(async ({ timestamp }) => {
          const now = timestamp;

          const archiveYoung = await this._pfapiService.m.archiveYoung.load();
          const archiveOld = await this._pfapiService.m.archiveOld.load();

          const newSorted = sortTimeTrackingAndTasksFromArchiveYoungToOld({
            archiveYoung,
            archiveOld,
            threshold: ARCHIVE_TASK_YOUNG_TO_OLD_THRESHOLD,
            now,
          });

          await this._pfapiService.m.archiveYoung.save(
            {
              ...newSorted.archiveYoung,
              lastTimeTrackingFlush: now,
            },
            {
              isUpdateRevAndLastUpdate: true,
              // Required during OpLog sync - see JSDoc above for explanation
              isIgnoreDBLock: true,
            },
          );

          await this._pfapiService.m.archiveOld.save(
            {
              ...newSorted.archiveOld,
              lastTimeTrackingFlush: now,
            },
            {
              isUpdateRevAndLastUpdate: true,
              // Required during OpLog sync - see JSDoc above for explanation
              isIgnoreDBLock: true,
            },
          );

          Log.log(
            '______________________\nFLUSHED ALL FROM ARCHIVE YOUNG TO OLD (via action)\n_______________________',
          );
        }),
      ),
    { dispatch: false },
  );
}
