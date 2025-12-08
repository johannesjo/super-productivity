import { inject, Injectable, Injector } from '@angular/core';
import { PersistentAction } from '../persistent-action.interface';
import { TaskSharedActions } from '../../../../root-store/meta/task-shared.actions';
import { flushYoungToOld } from '../../../../features/time-tracking/store/archive.actions';
import { ArchiveService } from '../../../../features/time-tracking/archive.service';
import { TaskArchiveService } from '../../../../features/time-tracking/task-archive.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { sortTimeTrackingAndTasksFromArchiveYoungToOld } from '../../../../features/time-tracking/sort-data-to-flush';
import { ARCHIVE_TASK_YOUNG_TO_OLD_THRESHOLD } from '../../../../features/time-tracking/archive.service';
import { Log } from '../../../log';
import { lazyInject } from '../../../../util/lazy-inject';
import { deleteTag, deleteTags } from '../../../../features/tag/store/tag.actions';
import { TimeTrackingService } from '../../../../features/time-tracking/time-tracking.service';
import { IssueProviderActions } from '../../../../features/issue/store/issue-provider.actions';

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
 * - **deleteProject**: Removes all tasks for the deleted project from archive
 * - **deleteTag/deleteTags**: Removes tag references from archive tasks, deletes orphaned tasks
 * - **deleteTaskRepeatCfg**: Removes repeatCfgId from archive tasks
 * - **deleteIssueProvider/deleteIssueProviders**: Unlinks issue data from archive tasks
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
  // Use lazy injection to break circular dependency:
  // DataInitService -> OperationLogHydratorService -> OperationApplierService
  // -> ArchiveOperationHandler -> ArchiveService/TaskArchiveService -> PfapiService
  // DataInitService also injects PfapiService directly, causing the cycle.
  private _injector = inject(Injector);
  private _getArchiveService = lazyInject(this._injector, ArchiveService);
  private _getTaskArchiveService = lazyInject(this._injector, TaskArchiveService);
  private _getPfapiService = lazyInject(this._injector, PfapiService);
  private _getTimeTrackingService = lazyInject(this._injector, TimeTrackingService);

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

      case TaskSharedActions.deleteProject.type:
        await this._handleDeleteProject(action);
        break;

      case deleteTag.type:
      case deleteTags.type:
        await this._handleDeleteTags(action);
        break;

      case TaskSharedActions.deleteTaskRepeatCfg.type:
        await this._handleDeleteTaskRepeatCfg(action);
        break;

      case TaskSharedActions.deleteIssueProvider.type:
        await this._handleDeleteIssueProvider(action);
        break;

      case IssueProviderActions.deleteIssueProviders.type:
        await this._handleDeleteIssueProviders(action);
        break;
    }
  }

  /**
   * Writes archived tasks to archiveYoung storage.
   * Called when receiving a remote moveToArchive operation.
   */
  private async _handleMoveToArchive(action: PersistentAction): Promise<void> {
    const tasks = (action as ReturnType<typeof TaskSharedActions.moveToArchive>).tasks;
    await this._getArchiveService().writeTasksToArchiveForRemoteSync(tasks);
  }

  /**
   * Removes a restored task from archive storage.
   * Called when receiving a remote restoreTask operation.
   */
  private async _handleRestoreTask(action: PersistentAction): Promise<void> {
    const task = (action as ReturnType<typeof TaskSharedActions.restoreTask>).task;
    const taskIds = [task.id, ...task.subTaskIds];
    await this._getTaskArchiveService().deleteTasks(taskIds, { isIgnoreDBLock: true });
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
    const pfapi = this._getPfapiService();

    const archiveYoung = await pfapi.m.archiveYoung.load();
    const archiveOld = await pfapi.m.archiveOld.load();

    const newSorted = sortTimeTrackingAndTasksFromArchiveYoungToOld({
      archiveYoung,
      archiveOld,
      threshold: ARCHIVE_TASK_YOUNG_TO_OLD_THRESHOLD,
      now: timestamp,
    });

    await pfapi.m.archiveYoung.save(
      {
        ...newSorted.archiveYoung,
        lastTimeTrackingFlush: timestamp,
      },
      {
        isUpdateRevAndLastUpdate: true,
        isIgnoreDBLock: true,
      },
    );

    await pfapi.m.archiveOld.save(
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

  /**
   * Removes all archived tasks for a deleted project.
   * Called when receiving a remote deleteProject operation.
   */
  private async _handleDeleteProject(action: PersistentAction): Promise<void> {
    const projectId = (action as ReturnType<typeof TaskSharedActions.deleteProject>)
      .projectId;
    await this._getTaskArchiveService().removeAllArchiveTasksForProject(projectId);
    await this._getTimeTrackingService().cleanupDataEverywhereForProject(projectId);
  }

  /**
   * Removes tag references from archived tasks and deletes orphaned tasks.
   * Called when receiving a remote deleteTag or deleteTags operation.
   */
  private async _handleDeleteTags(action: PersistentAction): Promise<void> {
    const tagIdsToRemove =
      action.type === deleteTags.type
        ? (action as ReturnType<typeof deleteTags>).ids
        : [(action as ReturnType<typeof deleteTag>).id];

    await this._getTaskArchiveService().removeTagsFromAllTasks(tagIdsToRemove);

    for (const tagId of tagIdsToRemove) {
      await this._getTimeTrackingService().cleanupArchiveDataForTag(tagId);
    }
  }

  /**
   * Removes repeatCfgId from archived tasks.
   * Called when receiving a remote deleteTaskRepeatCfg operation.
   */
  private async _handleDeleteTaskRepeatCfg(action: PersistentAction): Promise<void> {
    const repeatCfgId = (
      action as ReturnType<typeof TaskSharedActions.deleteTaskRepeatCfg>
    ).taskRepeatCfgId;
    await this._getTaskArchiveService().removeRepeatCfgFromArchiveTasks(repeatCfgId);
  }

  /**
   * Unlinks issue data from archived tasks for a deleted issue provider.
   * Called when receiving a remote deleteIssueProvider operation.
   */
  private async _handleDeleteIssueProvider(action: PersistentAction): Promise<void> {
    const issueProviderId = (
      action as ReturnType<typeof TaskSharedActions.deleteIssueProvider>
    ).issueProviderId;
    await this._getTaskArchiveService().unlinkIssueProviderFromArchiveTasks(
      issueProviderId,
    );
  }

  /**
   * Unlinks issue data from archived tasks for multiple deleted issue providers.
   * Called when receiving a remote deleteIssueProviders operation.
   */
  private async _handleDeleteIssueProviders(action: PersistentAction): Promise<void> {
    const ids = (action as ReturnType<typeof IssueProviderActions.deleteIssueProviders>)
      .ids;
    for (const issueProviderId of ids) {
      await this._getTaskArchiveService().unlinkIssueProviderFromArchiveTasks(
        issueProviderId,
      );
    }
  }
}
