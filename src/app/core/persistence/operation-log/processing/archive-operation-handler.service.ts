import { inject, Injectable, Injector } from '@angular/core';
import { Action } from '@ngrx/store';
import { PersistentAction } from '../persistent-action.interface';
import { TaskSharedActions } from '../../../../root-store/meta/task-shared.actions';
import {
  compressArchive,
  flushYoungToOld,
} from '../../../../features/time-tracking/store/archive.actions';
import { ArchiveService } from '../../../../features/time-tracking/archive.service';
import { TaskArchiveService } from '../../../../features/time-tracking/task-archive.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { sortTimeTrackingAndTasksFromArchiveYoungToOld } from '../../../../features/time-tracking/sort-data-to-flush';
import { ARCHIVE_TASK_YOUNG_TO_OLD_THRESHOLD } from '../../../../features/time-tracking/archive.service';
import { OpLog } from '../../../log';
import { lazyInject } from '../../../../util/lazy-inject';
import { deleteTag, deleteTags } from '../../../../features/tag/store/tag.actions';
import { TimeTrackingService } from '../../../../features/time-tracking/time-tracking.service';
import { ArchiveCompressionService } from '../../../../features/time-tracking/archive-compression.service';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';
import { ArchiveModel } from '../../../../features/time-tracking/time-tracking.model';

/**
 * Action types that affect archive storage and require special handling.
 */
const ARCHIVE_AFFECTING_ACTION_TYPES: string[] = [
  TaskSharedActions.moveToArchive.type,
  TaskSharedActions.restoreTask.type,
  TaskSharedActions.updateTask.type,
  flushYoungToOld.type,
  compressArchive.type,
  TaskSharedActions.deleteProject.type,
  deleteTag.type,
  deleteTags.type,
  TaskSharedActions.deleteTaskRepeatCfg.type,
  TaskSharedActions.deleteIssueProvider.type,
  TaskSharedActions.deleteIssueProviders.type,
  loadAllData.type, // For SYNC_IMPORT/BACKUP_IMPORT handling
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
  // ═══════════════════════════════════════════════════════════════════════════
  // ARCHITECTURAL DEBT: Lazy Injection for Circular Dependencies
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // These services use lazyInject() to break circular dependency chains:
  //   DataInitService -> OperationLogHydratorService -> OperationApplierService
  //   -> ArchiveOperationHandler -> ArchiveService/TaskArchiveService -> PfapiService
  //   DataInitService also injects PfapiService directly, causing the cycle.
  //
  // POTENTIAL REFACTORING APPROACHES:
  // 1. Extract archive storage operations into a lower-level service that doesn't
  //    depend on PfapiService directly, only on the database adapter
  // 2. Create an event-based notification system where archive operations emit
  //    events and a dedicated handler picks them up (decouples dependencies)
  // 3. Move archive storage into NgRx state instead of IndexedDB (would require
  //    significant architectural changes and increase memory usage)
  //
  // For now, lazyInject works correctly and the pattern is well-documented.
  // ═══════════════════════════════════════════════════════════════════════════
  private _injector = inject(Injector);
  private _getArchiveService = lazyInject(this._injector, ArchiveService);
  private _getTaskArchiveService = lazyInject(this._injector, TaskArchiveService);
  private _getPfapiService = lazyInject(this._injector, PfapiService);
  private _getTimeTrackingService = lazyInject(this._injector, TimeTrackingService);
  private _getArchiveCompressionService = lazyInject(
    this._injector,
    ArchiveCompressionService,
  );

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

      case compressArchive.type:
        await this._handleCompressArchive(action);
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

      case loadAllData.type:
        await this._handleLoadAllData(action);
        break;
    }
  }

  /**
   * Writes archived tasks to archiveYoung storage.
   *
   * @localBehavior SKIP - Archive written by ArchiveService.moveToArchive() before dispatch
   * @remoteBehavior Executes - Writes tasks to archiveYoung
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
   *
   * @localBehavior Executes normally (acquires DB lock)
   * @remoteBehavior Executes with isIgnoreDBLock (sync has DB locked)
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
   *
   * @localBehavior SKIP - Archive written by TaskArchiveService.updateTask() before dispatch
   * @remoteBehavior Executes - Updates task in archive if it exists there
   */
  private async _handleUpdateTask(action: PersistentAction): Promise<void> {
    if (!action.meta.isRemote) {
      return; // Local: already written by TaskArchiveService before dispatch
    }

    const { id, changes } = (action as ReturnType<typeof TaskSharedActions.updateTask>)
      .task;

    // Check if task exists in archive before attempting update
    // Non-archived tasks are handled by the NgRx reducer instead
    const taskArchiveService = this._getTaskArchiveService();
    if (!(await taskArchiveService.hasTask(id as string))) {
      return;
    }

    await taskArchiveService.updateTask(id as string, changes, {
      isSkipDispatch: true,
      isIgnoreDBLock: true,
    });
  }

  /**
   * Executes the flush from archiveYoung to archiveOld.
   * This operation is deterministic - given the same timestamp and archive state,
   * it will produce the same result on all clients.
   *
   * @localBehavior SKIP - Flush performed by ArchiveService.moveTasksToArchiveAndFlushArchiveIfDue() before dispatch
   * @remoteBehavior Executes - Performs flush with isIgnoreDBLock (sync has DB locked)
   */
  private async _handleFlushYoungToOld(action: PersistentAction): Promise<void> {
    if (!action.meta?.isRemote) {
      return; // Local: already written by ArchiveService before dispatch
    }

    const timestamp = (action as ReturnType<typeof flushYoungToOld>).timestamp;
    const pfapi = this._getPfapiService();

    // Load original state for potential rollback
    const originalArchiveYoung = await pfapi.m.archiveYoung.load();
    const originalArchiveOld = await pfapi.m.archiveOld.load();

    const newSorted = sortTimeTrackingAndTasksFromArchiveYoungToOld({
      archiveYoung: originalArchiveYoung,
      archiveOld: originalArchiveOld,
      threshold: ARCHIVE_TASK_YOUNG_TO_OLD_THRESHOLD,
      now: timestamp,
    });

    try {
      await pfapi.m.archiveYoung.save(
        {
          ...newSorted.archiveYoung,
          lastTimeTrackingFlush: timestamp,
        },
        {
          isUpdateRevAndLastUpdate: true,
          isIgnoreDBLock: true, // Remote ops: DB is locked during sync processing
        },
      );

      await pfapi.m.archiveOld.save(
        {
          ...newSorted.archiveOld,
          lastTimeTrackingFlush: timestamp,
        },
        {
          isUpdateRevAndLastUpdate: true,
          isIgnoreDBLock: true, // Remote ops: DB is locked during sync processing
        },
      );
    } catch (e) {
      // Attempt rollback: restore BOTH archiveYoung and archiveOld to original state
      OpLog.err('Archive flush failed, attempting rollback...', e);
      const rollbackErrors: Error[] = [];

      // Rollback archiveYoung
      try {
        if (originalArchiveYoung) {
          await pfapi.m.archiveYoung.save(originalArchiveYoung, {
            isUpdateRevAndLastUpdate: true,
            isIgnoreDBLock: true,
          });
        }
      } catch (rollbackErr) {
        rollbackErrors.push(rollbackErr as Error);
      }

      // Rollback archiveOld
      try {
        if (originalArchiveOld) {
          await pfapi.m.archiveOld.save(originalArchiveOld, {
            isUpdateRevAndLastUpdate: true,
            isIgnoreDBLock: true,
          });
        }
      } catch (rollbackErr) {
        rollbackErrors.push(rollbackErr as Error);
      }

      if (rollbackErrors.length > 0) {
        OpLog.err(
          'Archive flush rollback FAILED - archive may be inconsistent',
          rollbackErrors,
        );
      } else {
        OpLog.log('Archive flush rollback successful');
      }
      throw e; // Re-throw original error
    }

    OpLog.log(
      '______________________\nFLUSHED ALL FROM ARCHIVE YOUNG TO OLD (via remote op handler)\n_______________________',
    );
  }

  /**
   * Compresses archive data by:
   * 1. Deleting subtask entities and merging their time data to parent tasks
   * 2. Clearing notes from tasks older than the threshold
   * 3. Clearing non-essential issue fields (keeps issueId and issueType)
   *
   * This operation is deterministic - given the same timestamp, it produces
   * the same result on all clients.
   *
   * @localBehavior Executes normally (acquires DB lock)
   * @remoteBehavior Executes with isIgnoreDBLock (sync has DB locked)
   */
  private async _handleCompressArchive(action: PersistentAction): Promise<void> {
    const { oneYearAgoTimestamp } = action as ReturnType<typeof compressArchive>;
    const isRemote = !!action.meta?.isRemote;

    await this._getArchiveCompressionService().compressArchive(
      oneYearAgoTimestamp,
      isRemote,
    );

    OpLog.log(`Archive compressed (via ${isRemote ? 'remote' : 'local'} op handler)`);
  }

  /**
   * Removes all archived tasks for a deleted project.
   *
   * @localBehavior Executes (cleans up archive for deleted project)
   * @remoteBehavior Executes (same behavior)
   */
  private async _handleDeleteProject(action: PersistentAction): Promise<void> {
    const projectId = (action as ReturnType<typeof TaskSharedActions.deleteProject>)
      .projectId;
    await this._getTaskArchiveService().removeAllArchiveTasksForProject(projectId);
    await this._getTimeTrackingService().cleanupDataEverywhereForProject(projectId);
  }

  /**
   * Removes tag references from archived tasks and deletes orphaned tasks.
   *
   * @localBehavior Executes (cleans up archive for deleted tags)
   * @remoteBehavior Executes (same behavior)
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
   *
   * @localBehavior Executes (cleans up archive for deleted repeat config)
   * @remoteBehavior Executes (same behavior)
   */
  private async _handleDeleteTaskRepeatCfg(action: PersistentAction): Promise<void> {
    const repeatCfgId = (
      action as ReturnType<typeof TaskSharedActions.deleteTaskRepeatCfg>
    ).taskRepeatCfgId;
    await this._getTaskArchiveService().removeRepeatCfgFromArchiveTasks(repeatCfgId);
  }

  /**
   * Unlinks issue data from archived tasks for a deleted issue provider.
   *
   * @localBehavior Executes (cleans up archive for deleted provider)
   * @remoteBehavior Executes (same behavior)
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
   *
   * @localBehavior Executes (cleans up archive for deleted providers)
   * @remoteBehavior Executes (same behavior)
   */
  private async _handleDeleteIssueProviders(action: PersistentAction): Promise<void> {
    const ids = (action as ReturnType<typeof TaskSharedActions.deleteIssueProviders>).ids;
    for (const issueProviderId of ids) {
      await this._getTaskArchiveService().unlinkIssueProviderFromArchiveTasks(
        issueProviderId,
      );
    }
  }

  /**
   * Writes archive data to IndexedDB from a SYNC_IMPORT/BACKUP_IMPORT operation.
   * Fixes bug where SYNC_IMPORT updated NgRx state but never persisted archive
   * data to IndexedDB on remote client, causing data loss on restart.
   *
   * @localBehavior SKIP - Archive written by PfapiService._updateModelCtrlCaches()
   * @remoteBehavior Executes - Writes archiveYoung/archiveOld to IndexedDB
   */
  private async _handleLoadAllData(action: PersistentAction): Promise<void> {
    if (!action.meta?.isRemote) {
      return; // Local: already written by PfapiService._updateModelCtrlCaches
    }

    const loadAllDataAction = action as unknown as ReturnType<typeof loadAllData>;
    const appDataComplete = loadAllDataAction.appDataComplete;
    const pfapi = this._getPfapiService();

    // Write archiveYoung if present in the import data
    const archiveYoung = (appDataComplete as { archiveYoung?: ArchiveModel })
      .archiveYoung;
    if (archiveYoung !== undefined) {
      await pfapi.m.archiveYoung.save(archiveYoung, {
        isUpdateRevAndLastUpdate: false, // Preserve rev from import
        isIgnoreDBLock: true,
      });
    }

    // Write archiveOld if present in the import data
    const archiveOld = (appDataComplete as { archiveOld?: ArchiveModel }).archiveOld;
    if (archiveOld !== undefined) {
      await pfapi.m.archiveOld.save(archiveOld, {
        isUpdateRevAndLastUpdate: false,
        isIgnoreDBLock: true,
      });
    }

    OpLog.log(
      '[ArchiveOperationHandler] Wrote archive data from SYNC_IMPORT/BACKUP_IMPORT',
    );
  }
}
