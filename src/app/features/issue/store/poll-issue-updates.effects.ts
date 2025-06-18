import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { forkJoin, Observable, timer } from 'rxjs';
import { first, map, switchMap, tap } from 'rxjs/operators';
import { IssueService } from '../issue.service';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { WorkContextService } from '../../work-context/work-context.service';
import { setActiveWorkContext } from '../../work-context/store/work-context.actions';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { Store } from '@ngrx/store';
import { IssueProvider } from '../issue.model';
import { selectEnabledIssueProviders } from './issue-provider.selectors';
import { DELAY_BEFORE_ISSUE_POLLING } from '../issue.const';

@Injectable()
export class PollIssueUpdatesEffects {
  private _store = inject(Store);
  private _actions$ = inject(Actions);
  private readonly _issueService = inject(IssueService);
  private readonly _workContextService = inject(WorkContextService);

  pollIssueTaskUpdatesActions$: Observable<unknown> = this._actions$.pipe(
    ofType(setActiveWorkContext, loadAllData),
  );
  pollIssueChangesForCurrentContext$: Observable<any> = createEffect(
    () =>
      this.pollIssueTaskUpdatesActions$.pipe(
        switchMap(() => this._store.select(selectEnabledIssueProviders).pipe(first())),
        // Get the list of enabled issue providers
        switchMap((enabledProviders: IssueProvider[]) =>
          forkJoin(
            // For each enabled provider, start a polling timer
            enabledProviders
              // only for providers that have auto-polling enabled
              .filter((provider) => provider.isAutoPoll)
              // filter out providers with 0 poll interval (no polling)
              .filter(
                (provider) =>
                  this._issueService.getPollInterval(provider.issueProviderKey) > 0,
              )
              .map((provider) =>
                timer(
                  DELAY_BEFORE_ISSUE_POLLING,
                  this._issueService.getPollInterval(provider.issueProviderKey),
                ).pipe(
                  // => whenever the provider specific poll timer ticks:
                  // ---------------------------------------------------
                  // Get all tasks for the current context
                  switchMap(() =>
                    this._workContextService.allTasksForCurrentContext$.pipe(
                      // get once each cycle and no updates
                      first(),
                      map((tasks) =>
                        // only use tasks that are assigned to the current issue provider
                        tasks.filter((task) => task.issueProviderId === provider.id),
                      ),
                    ),
                  ),
                  // Refresh issue tasks for the current provider
                  tap((issueTasks: TaskWithSubTasks[]) =>
                    this._issueService.refreshIssueTasks(issueTasks, provider),
                  ),
                ),
              ),
          ),
        ),
      ),
    { dispatch: false },
  );
}
