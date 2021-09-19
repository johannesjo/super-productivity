import { Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { EMPTY, merge, Observable } from 'rxjs';

import { switchMap, takeUntil, tap } from 'rxjs/operators';
import { ISSUE_PROVIDER_TYPES } from '../issue.const';
import { IssueService } from '../issue.service';
import { IssueEffectHelperService } from '../issue-effect-helper.service';

@Injectable()
export class PollToBacklogEffects {
  pollNewIssuesToBacklog$: Observable<any> = createEffect(
    () =>
      this._issueEffectHelperService.pollToBacklogTriggerToProjectId$.pipe(
        switchMap((pId) =>
          merge(
            ...ISSUE_PROVIDER_TYPES.map((providerKey) =>
              this._issueService
                .isBacklogPollEnabledForProjectOnce$(providerKey, pId)
                .pipe(
                  switchMap((isEnabled) => {
                    return isEnabled
                      ? this._issueService.getPollTimer$(providerKey).pipe(
                          // NOTE: required otherwise timer stays alive for filtered actions
                          takeUntil(this._issueEffectHelperService.pollToBacklogActions$),
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
    private readonly _issueEffectHelperService: IssueEffectHelperService,
  ) {}
}
