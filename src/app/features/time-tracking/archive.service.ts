import { inject, Injectable, Injector } from '@angular/core';
import { TaskWithSubTasks } from '../tasks/task.model';
import { flattenTasks } from '../tasks/store/task.selectors';
import { createEmptyEntity } from '../../util/create-empty-entity';
import { taskAdapter } from '../tasks/store/task.adapter';
import { PfapiService } from '../../pfapi/pfapi.service';
import { sortTimeTrackingDataToArchiveYoung } from './sort-data-to-flush';
import { Store } from '@ngrx/store';
import { TimeTrackingActions } from './store/time-tracking.actions';
import { flushYoungToOld } from './store/archive.actions';
import { getDbDateStr } from '../../util/get-db-date-str';
import { Log } from '../../core/log';

/*
# Considerations for flush architecture:
** The main purpose of flushing is mainly to reduce the amount of data that needs to be transferred over the network **
Roughly we aim at these 3 syncs to occur under normal circumstances:

every sync  => sync the meta file
daily       => +archiveYoung (moving tasks to archive)
less often  => +archiveOld (after flushing data from archiveYoung to archiveOld)

## Other considerations:

timeTracking:
* (currently) there seems to be no writing of archiveYoung or archiveOld like there is for archive tasks, when editing tasks in worklog
=> archiveOld.timeTracking and archiveYoung.timeTracking can be read-only
* data for today should never be in the archive and always be in the store to avoid problems when doing partial updates
=> timeTracking should always retain some data, at least for today (or  maybe later for the whole current week, if we want to make it editable)

taskArchive:
* data in archiveYoung should be faster to access and write
* when updating some old data, we need to upload archiveOld regardless of flushing
=> makes sense to retain data in archiveYoung that is likely to be accessed more often
=> 21 days is maybe a good middle ground for this, since it allows us to write data from the last month
 */

export const ARCHIVE_ALL_YOUNG_TO_OLD_THRESHOLD = 1000 * 60 * 60 * 24 * 14;
export const ARCHIVE_TASK_YOUNG_TO_OLD_THRESHOLD = 1000 * 60 * 60 * 24 * 21;

@Injectable({
  providedIn: 'root',
})
export class ArchiveService {
  // Use lazy injection to break circular dependency:
  // PfapiService -> Pfapi -> OperationLogSyncService -> OperationApplierService
  // -> ArchiveOperationHandler -> ArchiveService -> PfapiService
  private readonly _injector = inject(Injector);
  private _pfapiService?: PfapiService;
  private get pfapiService(): PfapiService {
    if (!this._pfapiService) {
      this._pfapiService = this._injector.get(PfapiService);
    }
    return this._pfapiService;
  }
  private readonly _store = inject(Store);

  // NOTE: we choose this method as trigger to check for flushing to archive, since
  // it is usually triggered every work-day once
  async moveTasksToArchiveAndFlushArchiveIfDue(tasks: TaskWithSubTasks[]): Promise<void> {
    const now = Date.now();
    const flatTasks = flattenTasks(tasks);

    Log.log('[ArchiveService] moveTasksToArchiveAndFlushArchiveIfDue:', {
      inputTasksCount: tasks.length,
      flatTasksCount: flatTasks.length,
      taskIds: flatTasks.map((t) => t.id),
    });

    if (!flatTasks.length) {
      Log.log('[ArchiveService] No tasks to archive after flattening');
      return;
    }

    const archiveYoung = await this.pfapiService.m.archiveYoung.load();
    const taskArchiveState = archiveYoung.task || createEmptyEntity();

    const newTaskArchive = taskAdapter.addMany(
      flatTasks.map(({ subTasks, ...task }) => ({
        ...task,
        reminderId: undefined,
        isDone: true,
        dueWithTime: undefined,
        dueDay: undefined,
        _hideSubTasksMode: undefined,
        doneOn:
          task.isDone && task.doneOn
            ? task.doneOn
            : task.parentId
              ? flatTasks.find((t) => t.id === task.parentId)?.doneOn || now
              : now,
      })),
      taskArchiveState,
    );

    // ------------------------------------------------
    // Result A:
    // Move all archived tasks to archiveYoung
    // Move timeTracking data to archiveYoung
    const newSorted1 = sortTimeTrackingDataToArchiveYoung({
      // TODO think if it is better to get this from store as it is fresher potentially
      timeTracking: await this.pfapiService.m.timeTracking.load(),
      archiveYoung,
      todayStr: getDbDateStr(now),
    });
    const newArchiveYoung = {
      ...newSorted1.archiveYoung,
      task: newTaskArchive,
      lastFlush: now,
    };
    await this.pfapiService.m.archiveYoung.save(newArchiveYoung, {
      isUpdateRevAndLastUpdate: true,
    });

    Log.log('[ArchiveService] Saved tasks to archiveYoung:', {
      archivedTaskCount: Object.keys(newTaskArchive.entities).length,
      archivedTaskIds: newTaskArchive.ids,
    });

    this._store.dispatch(
      TimeTrackingActions.updateWholeState({
        newState: newSorted1.timeTracking,
      }),
    );

    // ------------------------------------------------
    // Check if it's time to flush archiveYoung to archiveOld
    const archiveOld = await this.pfapiService.m.archiveOld.load();
    const isFlushArchiveOld =
      now - archiveOld.lastTimeTrackingFlush > ARCHIVE_ALL_YOUNG_TO_OLD_THRESHOLD;

    if (!isFlushArchiveOld) {
      return;
    }

    // Dispatch the flush action - this will be persisted and synced to other clients
    // The actual flush operation is handled by ArchiveEffects.flushYoungToOld$
    // This ensures other clients receive the operation and replay the same flush,
    // maintaining deterministic archive state without syncing large archiveOld files.
    this._store.dispatch(flushYoungToOld({ timestamp: now }));
  }

  /**
   * Writes tasks to archiveYoung for remote sync operations.
   * Also moves historical time tracking data to archiveYoung to keep
   * the client's archive consistent with the originating client.
   *
   * Used when receiving moveToArchive operations from other clients.
   */
  async writeTasksToArchiveForRemoteSync(tasks: TaskWithSubTasks[]): Promise<void> {
    const now = Date.now();
    const flatTasks = flattenTasks(tasks);

    Log.log('[ArchiveService] writeTasksToArchiveForRemoteSync:', {
      inputTasksCount: tasks.length,
      flatTasksCount: flatTasks.length,
      taskIds: flatTasks.map((t) => t.id),
    });

    if (!flatTasks.length) {
      Log.log('[ArchiveService] No tasks to archive for remote sync');
      return;
    }

    const archiveYoung = await this.pfapiService.m.archiveYoung.load();
    const taskArchiveState = archiveYoung.task || createEmptyEntity();

    const newTaskArchive = taskAdapter.addMany(
      flatTasks.map(({ subTasks, ...task }) => ({
        ...task,
        reminderId: undefined,
        isDone: true,
        dueWithTime: undefined,
        dueDay: undefined,
        _hideSubTasksMode: undefined,
        doneOn:
          task.isDone && task.doneOn
            ? task.doneOn
            : task.parentId
              ? flatTasks.find((t) => t.id === task.parentId)?.doneOn || now
              : now,
      })),
      taskArchiveState,
    );

    // Also move historical time tracking data to archiveYoung
    // This ensures the remote client's archive matches the originating client
    const timeTracking = await this.pfapiService.m.timeTracking.load();
    const sorted = sortTimeTrackingDataToArchiveYoung({
      timeTracking,
      archiveYoung,
      todayStr: getDbDateStr(now),
    });

    await this.pfapiService.m.archiveYoung.save(
      {
        ...sorted.archiveYoung,
        task: newTaskArchive,
      },
      {
        isUpdateRevAndLastUpdate: false, // Don't update rev for remote sync
        isIgnoreDBLock: true, // Called during sync when DB is locked
      },
    );

    // Update active time tracking state (remove historical data that was moved to archive)
    this._store.dispatch(
      TimeTrackingActions.updateWholeState({
        newState: sorted.timeTracking,
      }),
    );

    Log.log(
      '[ArchiveService] Remote sync: saved tasks and time tracking to archiveYoung:',
      {
        archivedTaskCount: Object.keys(newTaskArchive.entities).length,
      },
    );
  }
}
