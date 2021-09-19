import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { forkJoin, merge, Observable } from 'rxjs';
import { filter, first, mapTo, switchMap, tap } from 'rxjs/operators';
import { ISSUE_PROVIDER_TYPES } from '../issue.const';
import { IssueService } from '../issue.service';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { setActiveWorkContext } from '../../work-context/store/work-context.actions';
import { updateProjectIssueProviderCfg } from '../../project/store/project.actions';

@Injectable()
export class PollIssueUpdatesEffects {
  pollIssueTaskUpdatesActions$: Observable<unknown> = this._actions$.pipe(
    ofType(setActiveWorkContext, updateProjectIssueProviderCfg.type),
  );

  pollIssueChangesForCurrentContext$: Observable<any> = createEffect(
    () =>
      this.pollIssueTaskUpdatesActions$.pipe(
        switchMap(() =>
          merge(
            ...ISSUE_PROVIDER_TYPES.map((providerKey) =>
              this._issueService.getPollTimer$(providerKey).pipe(
                switchMap(() =>
                  this._workContextService.allTasksForCurrentContext$.pipe(
                    first(),
                    switchMap((tasks) => {
                      const issueTasksForProvider = tasks.filter(
                        (task) => task.issueType === providerKey,
                      );
                      return forkJoin(
                        issueTasksForProvider.map((task) => {
                          if (!task.projectId) {
                            throw new Error('No project for task');
                          }
                          return this._issueService
                            .isPollIssueChangesEnabledForProjectOnce$(
                              providerKey,
                              task.projectId,
                            )
                            .pipe(
                              filter((isEnabled) => isEnabled),
                              mapTo(task),
                            );
                        }),
                      );
                    }),
                    tap((issueTasks: TaskWithSubTasks[]) =>
                      this._issueService.refreshIssues(issueTasks),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private readonly _issueService: IssueService,
    private readonly _workContextService: WorkContextService,
  ) {}
}
