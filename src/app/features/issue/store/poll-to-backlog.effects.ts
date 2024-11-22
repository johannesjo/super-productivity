import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { EMPTY, merge, Observable } from 'rxjs';
import { concatMap, filter, first, switchMap, takeUntil, tap } from 'rxjs/operators';
import { IssueService } from '../issue.service';
import { setActiveWorkContext } from '../../work-context/store/work-context.actions';
import { WorkContextService } from '../../work-context/work-context.service';
import { SyncTriggerService } from '../../../imex/sync/sync-trigger.service';
import { Store } from '@ngrx/store';
import { selectEnabledIssueProviders } from './issue-provider.selectors';
import { IssueProvider } from '../issue.model';

@Injectable()
export class PollToBacklogEffects {
  pollToBacklogActions$: Observable<unknown> = this._actions$.pipe(
    ofType(setActiveWorkContext),
  );

  pollToBacklogTriggerToProjectId$: Observable<string> =
    this._syncTriggerService.afterInitialSyncDoneAndDataLoadedInitially$.pipe(
      concatMap(() => this.pollToBacklogActions$),
      switchMap(() => this._workContextService.isActiveWorkContextProject$.pipe(first())),
      filter((isProject) => isProject),
      switchMap(
        () =>
          this._workContextService.activeWorkContextId$.pipe(
            first(),
          ) as Observable<string>,
      ),
      filter((projectId) => !!projectId),
    );

  pollNewIssuesToBacklog$: Observable<any> = createEffect(
    () =>
      this.pollToBacklogTriggerToProjectId$.pipe(
        switchMap((pId) =>
          this._store.select(selectEnabledIssueProviders).pipe(
            switchMap((enabledProviders: IssueProvider[]) =>
              merge(
                ...enabledProviders
                  .filter((provider) => provider.defaultProjectId === pId)
                  .map((provider) =>
                    this._issueService
                      .isAutoImportEnabled$(provider.issueProviderKey, provider.id)
                      .pipe(
                        tap((v) =>
                          console.log(
                            'pollNewIssuesToBacklog$:isAutoImportEnabled$',
                            v,
                            provider,
                          ),
                        ),
                        switchMap((isEnabled) => {
                          return isEnabled
                            ? this._issueService
                                .getPollTimer$(provider.issueProviderKey)
                                .pipe(
                                  takeUntil(this.pollToBacklogActions$),
                                  tap(() =>
                                    console.log('POLL ' + provider.issueProviderKey),
                                  ),
                                  switchMap(() =>
                                    this._issueService.checkAndImportNewIssuesToBacklogForProject(
                                      provider.issueProviderKey,
                                      provider.id,
                                    ),
                                  ),
                                )
                            : EMPTY;
                        }),
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
    private readonly _issueService: IssueService,
    private readonly _actions$: Actions,
    private readonly _workContextService: WorkContextService,
    private readonly _syncTriggerService: SyncTriggerService,
    private readonly _store: Store,
  ) {}
}
