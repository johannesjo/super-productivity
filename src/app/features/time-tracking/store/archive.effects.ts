import { Injectable, inject } from '@angular/core';
import { createEffect, ofType } from '@ngrx/effects';
import { LOCAL_ACTIONS } from '../../../util/local-actions.token';
import { tap } from 'rxjs/operators';
import { flushYoungToOld } from './archive.actions';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { sortTimeTrackingAndTasksFromArchiveYoungToOld } from '../sort-data-to-flush';
import { ARCHIVE_TASK_YOUNG_TO_OLD_THRESHOLD } from '../archive.service';
import { Log } from '../../../core/log';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { TaskArchiveService } from '../task-archive.service';
import { Task } from '../../tasks/task.model';

/**
 * Effects for archive-related side effects triggered by LOCAL user actions.
 *
 * IMPORTANT: All effects in this file use LOCAL_ACTIONS, meaning they only run
 * for local user actions, NOT for remote operations received via sync.
 *
 * Remote archive operations are handled by ArchiveOperationHandler, which is
 * called directly by OperationApplierService. This ensures that:
 * 1. Effects never run during sync replay (preventing duplicate side effects)
 * 2. Archive state is explicitly managed in a predictable way
 * 3. The general rule "effects should never run for remote operations" is followed
 *
 * For moveToArchive, local operations are handled by ArchiveService BEFORE
 * dispatching the action, so there's no effect needed for that case.
 */
@Injectable()
export class ArchiveEffects {
  private _actions$ = inject(LOCAL_ACTIONS);
  private _pfapiService = inject(PfapiService);
  private _taskArchiveService = inject(TaskArchiveService);

  /**
   * Handles the flushYoungToOld action by executing the actual flush operation.
   * Only runs for LOCAL dispatches - remote flushes are handled by ArchiveOperationHandler.
   *
   * The flush operation:
   * 1. Loads archiveYoung and archiveOld
   * 2. Moves old tasks and time tracking data from Young to Old
   * 3. Saves both archives
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
            { isUpdateRevAndLastUpdate: true },
          );

          await this._pfapiService.m.archiveOld.save(
            {
              ...newSorted.archiveOld,
              lastTimeTrackingFlush: now,
            },
            { isUpdateRevAndLastUpdate: true },
          );

          Log.log(
            '______________________\nFLUSHED ALL FROM ARCHIVE YOUNG TO OLD (via local action)\n_______________________',
          );
        }),
      ),
    { dispatch: false },
  );

  /**
   * When a task is restored from archive via LOCAL user action, remove it from
   * archive storage. Remote restoreTask operations are handled by ArchiveOperationHandler.
   */
  removeFromArchiveForRestoreTask$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.restoreTask),
        tap(({ task }) => this._removeFromArchive(task)),
      ),
    { dispatch: false },
  );

  private async _removeFromArchive(task: Task): Promise<void> {
    const taskIds = [task.id, ...task.subTaskIds];
    await this._taskArchiveService.deleteTasks(taskIds);
  }
}
