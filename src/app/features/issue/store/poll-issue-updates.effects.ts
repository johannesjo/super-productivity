import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { forkJoin, merge, Observable } from 'rxjs';
import { filter, first, mapTo, switchMap, tap } from 'rxjs/operators';
import { IssueService } from '../issue.service';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { setActiveWorkContext } from '../../work-context/store/work-context.actions';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { Store } from '@ngrx/store';
import { IssueProvider } from '../issue.model';
import { selectEnabledIssueProviders } from './issue-provider.selectors';

@Injectable()
export class PollIssueUpdatesEffects {
  pollIssueTaskUpdatesActions$: Observable<unknown> = this._actions$.pipe(
    ofType(setActiveWorkContext, loadAllData),
  );

  pollIssueChangesForCurrentContext$: Observable<any> = createEffect(
    () =>
      this.pollIssueTaskUpdatesActions$.pipe(
        switchMap(() =>
          this._store.select(selectEnabledIssueProviders).pipe(
            switchMap((enabledProviders: IssueProvider[]) =>
              merge(
                ...enabledProviders.map((provider) =>
                  this._issueService.getPollTimer$(provider.issueProviderKey).pipe(
                    switchMap(() =>
                      this._workContextService.allTasksForCurrentContext$.pipe(
                        first(),
                        switchMap((tasks) => {
                          const issueTasksForProvider = tasks.filter(
                            (task) => task.issueType === provider.issueProviderKey,
                          );
                          return forkJoin(
                            issueTasksForProvider.map((task) => {
                              if (!task.issueProviderId) {
                                throw new Error('No issueProviderId for task');
                              }
                              return this._issueService
                                .isAutoPollEnabled$(
                                  provider.issueProviderKey,
                                  task.issueProviderId,
                                )
                                .pipe(
                                  filter((isEnabled) => isEnabled),
                                  mapTo(task),
                                );
                            }),
                          );
                        }),
                        tap((issueTasks: TaskWithSubTasks[]) =>
                          this._issueService.refreshIssueTasks(issueTasks, provider),
                        ),
                      ),
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
    private _store: Store,
    private _actions$: Actions,
    private readonly _issueService: IssueService,
    private readonly _workContextService: WorkContextService,
  ) {}
}
