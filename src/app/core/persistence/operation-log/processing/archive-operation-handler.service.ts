import { inject, Injectable, Injector } from '@angular/core';
import { Action } from '@ngrx/store';
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

/**
 * Action types that affect archive storage and require special handling.
 */
const ARCHIVE_AFFECTING_ACTION_TYPES: string[] = [
  TaskSharedActions.moveToArchive.type,
  TaskSharedActions.restoreTask.type,
  TaskSharedActions.updateTask.type,
  flushYoungToOld.type,
  TaskSharedActions.deleteProject.type,
  deleteTag.type,
  deleteTags.type,
  TaskSharedActions.deleteTaskRepeatCfg.type,
  TaskSharedActions.deleteIssueProvider.type,
  TaskSharedActions.deleteIssueProviders.type,
];

/**
 * Helper function to check if an action affects archive storage.
 * Used by ArchiveOperationHandlerEffects to filter actions.
 */
export const isArchiveAffectingAction = (action: Action): action is PersistentAction => {
  return ARCHIVE_AFFECTING_ACTION_TYPES.includes(action.type);
};

/**
 * Centralized handler for all archive-specific side effects.
 *
 * This is the SINGLE SOURCE OF TRUTH for archive storage operations. All code paths
 * that need to update archive storage (IndexedDB) should go through this handler.
 *
 * ## Entry Points
 *
 * 1. **Local operations**: Called by ArchiveOperationHandlerEffects after action dispatch
 * 2. **Remote operations**: Called by OperationApplierService after applying remote operations
 *
 * ## Why This Architecture
 *
 * Archive data is stored in IndexedDB (via PFAPI), not in NgRx state. Previously,
 * archive operations were duplicated across multiple effect files. This handler
 * consolidates all archive logic to:
 *
 * 1. Eliminate duplicate code between local effects and remote operation handling
 * 2. Make it easy to add new archive-affecting operations (update one switch statement)
 * 3. Ensure consistent behavior between local and remote operations
 * 4. Provide a clear audit point for all archive writes
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
 * - For remote operations, uses `isIgnoreDBLock: true` because sync processing has the DB locked
 * - All operations are idempotent - safe to run multiple times
 * - Use `isArchiveAffectingAction()` helper to check if an action needs archive handling
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
   * Process an action and handle any archive-related side effects.
   *
   * This method handles both local and remote operations. For remote operations
   * (action.meta.isRemote === true), it uses isIgnoreDBLock: true because sync
   * processing has the database locked.
   *
   * @param action The action that was dispatched
   * @returns Promise that resolves when archive operations are complete
   */
  async handleOperation(action: PersistentAction): Promise<void> {
    switch (action.type) {
      case TaskSharedActions.moveToArchive.type:
        await this._handleMoveToArchive(action);
        break;

      case TaskSharedActions.restoreTask.type:
        await this._handleRestoreTask(action);
        break;

      case TaskSharedActions.updateTask.type:
        await this._handleUpdateTask(action);
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

      case TaskSharedActions.deleteIssueProviders.type:
        await this._handleDeleteIssueProviders(action);
        break;
    }
  }

  /**
   * Writes archived tasks to archiveYoung storage.
   * REMOTE ONLY: For local operations, archive is written BEFORE action dispatch
   * by ArchiveService.moveToArchive(), so we skip here to avoid double-writes.
   */
  private async _handleMoveToArchive(action: PersistentAction): Promise<void> {
    if (!action.meta.isRemote) {
      return; // Local: already written by ArchiveService before dispatch
    }
    const tasks = (action as ReturnType<typeof TaskSharedActions.moveToArchive>).tasks;
    await this._getArchiveService().writeTasksToArchiveForRemoteSync(tasks);
  }

  /**
   * Removes a restored task from archive storage.
   * Called for both local and remote restoreTask operations.
   */
  private async _handleRestoreTask(action: PersistentAction): Promise<void> {
    const task = (action as ReturnType<typeof TaskSharedActions.restoreTask>).task;
    const taskIds = [task.id, ...task.subTaskIds];
    const isRemote = !!action.meta?.isRemote;
    await this._getTaskArchiveService().deleteTasks(
      taskIds,
      isRemote ? { isIgnoreDBLock: true } : {},
    );
  }

  /**
   * Updates an archived task in archive storage.
   * REMOTE ONLY: For local operations, archive is written BEFORE action dispatch
   * by TaskArchiveService.updateTask(), so we skip here to avoid double-writes.
   */
  private async _handleUpdateTask(action: PersistentAction): Promise<void> {
    if (!action.meta.isRemote) {
      return; // Local: already written by TaskArchiveService before dispatch
    }

    const { id, changes } = (action as ReturnType<typeof TaskSharedActions.updateTask>)
      .task;

    // Try to update in archive - will throw if task is not archived (which is fine,
    // the NgRx reducer already handled it for non-archived tasks)
    try {
      await this._getTaskArchiveService().updateTask(id as string, changes, {
        isSkipDispatch: true,
        isIgnoreDBLock: true,
      });
    } catch (e) {
      // Task not in archive - this is expected for non-archived tasks
      // The reducer already handled it
      Log.log('[ArchiveOperationHandler] updateTask: task not in archive, skipping');
    }
  }

  /**
   * Executes the flush from archiveYoung to archiveOld.
   * Called for both local and remote flushYoungToOld operations.
   *
   * This operation is deterministic - given the same timestamp and archive state,
   * it will produce the same result on all clients.
   */
  private async _handleFlushYoungToOld(action: PersistentAction): Promise<void> {
    const timestamp = (action as ReturnType<typeof flushYoungToOld>).timestamp;
    const isRemote = !!action.meta?.isRemote;
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
        isIgnoreDBLock: isRemote ? true : undefined,
      },
    );

    await pfapi.m.archiveOld.save(
      {
        ...newSorted.archiveOld,
        lastTimeTrackingFlush: timestamp,
      },
      {
        isUpdateRevAndLastUpdate: true,
        isIgnoreDBLock: isRemote ? true : undefined,
      },
    );

    Log.log(
      `______________________\nFLUSHED ALL FROM ARCHIVE YOUNG TO OLD (via ${isRemote ? 'remote' : 'local'} op handler)\n_______________________`,
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
    const ids = (action as ReturnType<typeof TaskSharedActions.deleteIssueProviders>).ids;
    for (const issueProviderId of ids) {
      await this._getTaskArchiveService().unlinkIssueProviderFromArchiveTasks(
        issueProviderId,
      );
    }
  }
}
