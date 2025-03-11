import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { TaskService } from '../../tasks/task.service';
import { TaskCopy } from '../../tasks/task.model';
import { IssueProviderActions } from './issue-provider.actions';
import { first, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Update } from '@ngrx/entity/src/models';
import { Store } from '@ngrx/store';
import { __updateMultipleTaskSimple } from '../../tasks/store/task.actions';
import { PersistenceService } from '../../../core/persistence/persistence.service';

@Injectable()
export class UnlinkAllTasksOnProviderDeletionEffects {
  private _actions$ = inject(Actions);
  private _taskService = inject(TaskService);
  private _store = inject(Store);
  private _persistenceService = inject(PersistenceService);

  readonly UNLINKED_PARTIAL_TASK: Partial<TaskCopy> = {
    issueId: undefined,
    issueProviderId: undefined,
    issueType: undefined,
    issueWasUpdated: undefined,
    issueLastUpdated: undefined,
    issueAttachmentNr: undefined,
    issueTimeTracked: undefined,
    issuePoints: undefined,
  } as const;

  unlinkAllTasksOnProviderDeletion$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(IssueProviderActions.deleteIssueProvider),
        tap((v) => this._unlinkProvider(v.id)),
      ),
    { dispatch: false },
  );

  unlinkAllTasksOnProviderDeletions$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(IssueProviderActions.deleteIssueProviders),
        tap((v) => v.ids.forEach((id) => this._unlinkProvider(id))),
      ),
    { dispatch: false },
  );

  private async _unlinkProvider(issueProviderId: string): Promise<void> {
    const regularTasks = await this._taskService.allTasks$.pipe(first()).toPromise();
    const archiveTasks = await this._taskService.getArchivedTasks();

    const taskUpdates: Update<TaskCopy>[] = regularTasks
      .filter((task) => task.issueProviderId === issueProviderId)
      .map((task) => {
        return {
          id: task.id,
          changes: this.UNLINKED_PARTIAL_TASK,
        };
      });
    this._store.dispatch(__updateMultipleTaskSimple({ taskUpdates }));

    const archiveTaskUpdates: Update<TaskCopy>[] = archiveTasks
      .filter((task) => task.issueProviderId === issueProviderId)
      .map((task) => {
        return {
          id: task.id,
          changes: this.UNLINKED_PARTIAL_TASK,
        };
      });
    await this._persistenceService.taskArchive.execAction(
      __updateMultipleTaskSimple({ taskUpdates: archiveTaskUpdates }),
      true,
    );

    console.log('unlinkAllTasksOnProviderDeletion$', {
      regularTasks,
      archiveTasks,
      taskUpdates,
      archiveTaskUpdates,
    });
  }
}
