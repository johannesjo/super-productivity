import { Injectable } from '@angular/core';
import { Actions, ofType } from '@ngrx/effects';
import { setActiveWorkContext } from '../work-context/store/work-context.actions';
import { ProjectActionTypes } from '../project/store/project.actions';
import { concatMap, filter, first, switchMap } from 'rxjs/operators';
import { WorkContextService } from '../work-context/work-context.service';
import { Observable } from 'rxjs';
import { SyncTriggerService } from '../../imex/sync/sync-trigger.service';

@Injectable({
  providedIn: 'root',
})
export class IssueEffectHelperService {
  pollIssueTaskUpdatesActions$: Observable<unknown> = this._actions$.pipe(
    ofType(setActiveWorkContext, ProjectActionTypes.UpdateProjectIssueProviderCfg),
  );
  pollToBacklogActions$: Observable<unknown> = this._actions$.pipe(
    ofType(setActiveWorkContext, ProjectActionTypes.UpdateProjectIssueProviderCfg),
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

  constructor(
    private _actions$: Actions,
    private _workContextService: WorkContextService,
    private _syncTriggerService: SyncTriggerService,
  ) {}
}
