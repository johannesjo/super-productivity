import { inject, Injectable } from '@angular/core';
import { PersistentAction } from '../persistent-action.interface';
import { TaskSharedActions } from '../../../../root-store/meta/task-shared.actions';
import { flushYoungToOld } from '../../../../features/time-tracking/store/archive.actions';
import { ArchiveService } from '../../../../features/time-tracking/archive.service';
import { TaskArchiveService } from '../../../../features/time-tracking/task-archive.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { sortTimeTrackingAndTasksFromArchiveYoungToOld } from '../../../../features/time-tracking/sort-data-to-flush';
import { ARCHIVE_TASK_YOUNG_TO_OLD_THRESHOLD } from '../../../../features/time-tracking/archive.service';
import { Log } from '../../../log';

/**
 * Handles archive-specific side effects for REMOTE operations.
 *
 * This service is called by OperationApplierService AFTER dispatching remote operations.
 * It ensures that archive storage (IndexedDB) is updated to match the NgRx state changes.
 *
 * ## Why This Exists
 *
 * Archive data is stored in IndexedDB (via PFAPI), not in NgRx state. When remote operations
 * are applied, we need to update the archive storage to maintain consistency. This cannot
 * be done in effects because:
 *
 * 1. Effects should only run for LOCAL_ACTIONS (local user actions)
 * 2. Running effects for remote operations would cause side effects to happen twice
 *    (once on original client, once on receiving client)
 * 3. The OperationApplierService has full control over when side effects happen
 *
 * ## Operations Handled
 *
 * - **moveToArchive**: Writes archived tasks to archiveYoung storage
 * - **restoreTask**: Removes task from archive storage
 * - **flushYoungToOld**: Moves old tasks from archiveYoung to archiveOld
 *
 * ## Important Notes
 *
 * - Uses `isIgnoreDBLock: true` because this runs during sync processing when PFAPI
 *   has the database locked
 * - All operations are idempotent - safe to run multiple times
 */
@Injectable({
  providedIn: 'root',
})
export class ArchiveOperationHandler {
  private _archiveService = inject(ArchiveService);
  private _taskArchiveService = inject(TaskArchiveService);
  private _pfapiService = inject(PfapiService);

  /**
   * Process a remote operation and handle any archive-related side effects.
   *
   * @param action The action that was dispatched (already has meta.isRemote = true)
   * @returns Promise that resolves when archive operations are complete
   */
  async handleRemoteOperation(action: PersistentAction): Promise<void> {
    switch (action.type) {
      case TaskSharedActions.moveToArchive.type:
        await this._handleMoveToArchive(action);
        break;

      case TaskSharedActions.restoreTask.type:
        await this._handleRestoreTask(action);
        break;

      case flushYoungToOld.type:
        await this._handleFlushYoungToOld(action);
        break;
    }
  }

  /**
   * Writes archived tasks to archiveYoung storage.
   * Called when receiving a remote moveToArchive operation.
   */
  private async _handleMoveToArchive(action: PersistentAction): Promise<void> {
    const tasks = (action as ReturnType<typeof TaskSharedActions.moveToArchive>).tasks;
    await this._archiveService.writeTasksToArchiveForRemoteSync(tasks);
  }

  /**
   * Removes a restored task from archive storage.
   * Called when receiving a remote restoreTask operation.
   */
  private async _handleRestoreTask(action: PersistentAction): Promise<void> {
    const task = (action as ReturnType<typeof TaskSharedActions.restoreTask>).task;
    const taskIds = [task.id, ...task.subTaskIds];
    await this._taskArchiveService.deleteTasks(taskIds, { isIgnoreDBLock: true });
  }

  /**
   * Executes the flush from archiveYoung to archiveOld.
   * Called when receiving a remote flushYoungToOld operation.
   *
   * This operation is deterministic - given the same timestamp and archive state,
   * it will produce the same result on all clients.
   */
  private async _handleFlushYoungToOld(action: PersistentAction): Promise<void> {
    const timestamp = (action as ReturnType<typeof flushYoungToOld>).timestamp;

    const archiveYoung = await this._pfapiService.m.archiveYoung.load();
    const archiveOld = await this._pfapiService.m.archiveOld.load();

    const newSorted = sortTimeTrackingAndTasksFromArchiveYoungToOld({
      archiveYoung,
      archiveOld,
      threshold: ARCHIVE_TASK_YOUNG_TO_OLD_THRESHOLD,
      now: timestamp,
    });

    await this._pfapiService.m.archiveYoung.save(
      {
        ...newSorted.archiveYoung,
        lastTimeTrackingFlush: timestamp,
      },
      {
        isUpdateRevAndLastUpdate: true,
        isIgnoreDBLock: true,
      },
    );

    await this._pfapiService.m.archiveOld.save(
      {
        ...newSorted.archiveOld,
        lastTimeTrackingFlush: timestamp,
      },
      {
        isUpdateRevAndLastUpdate: true,
        isIgnoreDBLock: true,
      },
    );

    Log.log(
      '______________________\nFLUSHED ALL FROM ARCHIVE YOUNG TO OLD (via remote op handler)\n_______________________',
    );
  }
}
