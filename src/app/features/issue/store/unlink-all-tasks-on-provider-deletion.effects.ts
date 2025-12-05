import { inject, Injectable } from '@angular/core';
import { createEffect, ofType } from '@ngrx/effects';
import { LOCAL_ACTIONS } from '../../../util/local-actions.token';
import { Task, TaskCopy } from '../../tasks/task.model';
import { IssueProviderActions } from './issue-provider.actions';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Update } from '@ngrx/entity/src/models';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';
import { IssueLog } from '../../../core/log';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';

const UNLINKED_PARTIAL_TASK: Partial<TaskCopy> = {
  issueId: undefined,
  issueProviderId: undefined,
  issueType: undefined,
  issueWasUpdated: undefined,
  issueLastUpdated: undefined,
  issueAttachmentNr: undefined,
  issueTimeTracked: undefined,
  issuePoints: undefined,
} as const;

/**
 * Handles unlinking tasks from deleted issue providers.
 *
 * Regular tasks are handled atomically by the meta-reducer (issue-provider-shared.reducer.ts)
 * to ensure proper sync. This effect only handles archive tasks which are stored separately.
 */
@Injectable()
export class UnlinkAllTasksOnProviderDeletionEffects {
  private _actions$ = inject(LOCAL_ACTIONS);
  private _taskArchiveService = inject(TaskArchiveService);

  /**
   * Unlink archive tasks when an issue provider is deleted via TaskSharedActions.
   * Regular tasks are handled by the meta-reducer for atomic sync.
   */
  unlinkArchiveTasksOnProviderDeletion$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.deleteIssueProvider),
        tap(({ issueProviderId }) => this._unlinkArchiveTasks(issueProviderId)),
      ),
    { dispatch: false },
  );

  /**
   * Handle bulk deletion of issue providers (used by sync/import).
   * This still needs to unlink both regular and archive tasks since bulk deletions
   * don't go through the new TaskSharedActions flow.
   */
  unlinkAllTasksOnProviderDeletions$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(IssueProviderActions.deleteIssueProviders),
        tap((v) => v.ids.forEach((id) => this._unlinkArchiveTasks(id))),
      ),
    { dispatch: false },
  );

  private async _unlinkArchiveTasks(issueProviderId: string): Promise<void> {
    const archiveTasks = await this._taskArchiveService.load();
    const archiveTaskUpdates: Update<TaskCopy>[] = Object.values(archiveTasks.entities)
      .filter(
        (task): task is Task =>
          task !== undefined && task.issueProviderId === issueProviderId,
      )
      .map((task) => ({
        id: task.id,
        changes: UNLINKED_PARTIAL_TASK,
      }));

    if (archiveTaskUpdates.length > 0) {
      await this._taskArchiveService.updateTasks(archiveTaskUpdates);
      IssueLog.log('unlinkArchiveTasksOnProviderDeletion$', {
        issueProviderId,
        archiveTaskUpdates,
      });
    }
  }
}
