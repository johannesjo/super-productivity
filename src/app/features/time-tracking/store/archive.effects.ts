import { Injectable, inject } from '@angular/core';
import { createEffect, ofType } from '@ngrx/effects';
import { ALL_ACTIONS } from '../../../util/local-actions.token';
import { tap } from 'rxjs/operators';
import { flushYoungToOld } from './archive.actions';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { sortTimeTrackingAndTasksFromArchiveYoungToOld } from '../sort-data-to-flush';
import { ArchiveService, ARCHIVE_TASK_YOUNG_TO_OLD_THRESHOLD } from '../archive.service';
import { Log } from '../../../core/log';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { filterRemoteAction } from '../../../util/filter-local-action';
import { TaskArchiveService } from '../task-archive.service';
import { Task } from '../../tasks/task.model';

/**
 * Centralized effects for all archive-related side effects.
 *
 * IMPORTANT: All effects in this file use ALL_ACTIONS (not LOCAL_ACTIONS) because
 * archive operations must run for BOTH local and remote dispatches to maintain
 * deterministic archive state across all clients.
 *
 * Archive data is stored in IndexedDB (via PFAPI), not NgRx. When operations like
 * moveToArchive or restoreTask are synced, the receiving client must also update
 * their local archive storage.
 *
 * Effects in this file:
 * - flushYoungToOld$: Moves old tasks from archiveYoung to archiveOld
 * - writeArchivedTasksForRemoteSync$: Writes tasks to archive when receiving moveToArchive
 * - removeFromArchiveForRestoreTask$: Removes tasks from archive when restoring
 */
@Injectable()
export class ArchiveEffects {
  // ALL effects in this file use ALL_ACTIONS to run for both local and remote dispatches
  private _actions$ = inject(ALL_ACTIONS);
  private _pfapiService = inject(PfapiService);
  private _archiveService = inject(ArchiveService);
  private _taskArchiveService = inject(TaskArchiveService);

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

  /**
   * When receiving a REMOTE moveToArchive operation, write the archived tasks
   * to archiveYoung. This is necessary because the operation log only syncs
   * operations, not model files like archiveYoung/archiveOld.
   *
   * For LOCAL moveToArchive operations, the ArchiveService handles the write
   * before dispatching the action. This effect only handles the remote case.
   *
   * Uses filterRemoteAction() to only process remote operations.
   */
  writeArchivedTasksForRemoteSync$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.moveToArchive),
        filterRemoteAction(),
        tap(({ tasks }) => {
          this._archiveService.writeTasksToArchiveForRemoteSync(tasks);
        }),
      ),
    { dispatch: false },
  );

  /**
   * When a task is restored from archive (local or remote), remove it from
   * archive storage. Uses ALL_ACTIONS because remote clients also need to
   * remove the task from their local archive to maintain consistency.
   *
   * Without this, a task restored on one client would remain in the archive
   * on other clients, causing the task to exist in both places.
   *
   * NOTE: Uses isIgnoreDBLock:true for remote operations because PFAPI locks
   * the database during sync processing, but this effect IS part of sync.
   */
  removeFromArchiveForRestoreTask$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.restoreTask),
        tap(({ task, meta }) => this._removeFromArchive(task, (meta as any)?.isRemote)),
      ),
    { dispatch: false },
  );

  private async _removeFromArchive(task: Task, isRemote?: boolean): Promise<void> {
    const taskIds = [task.id, ...task.subTaskIds];
    await this._taskArchiveService.deleteTasks(taskIds, { isIgnoreDBLock: isRemote });
  }
}
