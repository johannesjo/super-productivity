import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { EMPTY, merge, Observable } from 'rxjs';

import { concatMap, filter, first, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ISSUE_PROVIDER_TYPES } from '../issue.const';
import { IssueService } from '../issue.service';
import { setActiveWorkContext } from '../../work-context/store/work-context.actions';
import { updateProjectIssueProviderCfg } from '../../project/store/project.actions';
import { WorkContextService } from '../../work-context/work-context.service';
import { SyncTriggerService } from '../../../imex/sync/sync-trigger.service';

@Injectable()
export class PollToBacklogEffects {
  pollToBacklogActions$: Observable<unknown> = this._actions$.pipe(
    ofType(setActiveWorkContext, updateProjectIssueProviderCfg.type),
  );

  pollToBacklogTriggerToProjectId$: Observable<string> =
    this._syncTriggerService.afterInitialSyncDoneAndDataLoadedInitially$.pipe(
      concatMap(() => this.pollToBacklogActions$),
      switchMap(() => this._workContextService.isActiveWorkContextProject$.pipe(first())),
      // NOTE: it's important that the filter is on top level otherwise the subscription is not canceled
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
          merge(
            ...ISSUE_PROVIDER_TYPES.map((providerKey) =>
              this._issueService
                .isBacklogPollEnabledForProjectOnce$(providerKey, pId)
                .pipe(
                  switchMap((isEnabled) => {
                    //TODO fix this later
                    if (providerKey == 'GITEA') return EMPTY;
                    return isEnabled
                      ? this._issueService.getPollTimer$(providerKey).pipe(
                          // NOTE: required otherwise timer stays alive for filtered actions
                          takeUntil(this.pollToBacklogActions$),
                          tap(() => console.log('POLL ' + providerKey)),
                          switchMap(() =>
                            this._issueService.checkAndImportNewIssuesToBacklogForProject(
                              providerKey,
                              pId,
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
    { dispatch: false },
  );

  constructor(
    private readonly _issueService: IssueService,
    private readonly _actions$: Actions,
    private readonly _workContextService: WorkContextService,
    private readonly _syncTriggerService: SyncTriggerService,
  ) {}
}
