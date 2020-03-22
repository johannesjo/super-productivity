import {Injectable} from '@angular/core';
import {ProjectService} from '../project/project.service';
import {Actions, ofType} from '@ngrx/effects';
import {setActiveWorkContext} from '../work-context/store/work-context.actions';
import {ProjectActionTypes} from '../project/store/project.actions';
import {filter, first, switchMap, tap} from 'rxjs/operators';
import {WorkContextService} from '../work-context/work-context.service';
import {Observable, of} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class IssueEffectHelperService {
  pollIssueTaskUpdatesActions$ = this._actions$.pipe(
    ofType(
      setActiveWorkContext,
      ProjectActionTypes.UpdateProjectIssueProviderCfg,
    )
  );
  pollToBacklogActions$ = this._actions$.pipe(
    ofType(
      setActiveWorkContext,
      ProjectActionTypes.UpdateProjectIssueProviderCfg,
    )
  );
  pollToBacklogTriggerToProjectId$: Observable<string> = this.pollToBacklogActions$.pipe(
    tap(() => console.log('TRIGGER action')),
    switchMap(() => this._workContextService.isActiveWorkContextProject$.pipe(first())),
    // NOTE: it's important that the filter is on top level otherwise the subscription is not canceled
    filter(isProject => isProject),
    switchMap(() => this._workContextService.activeWorkContextId$.pipe(first()))
  );

  constructor(
    private  _actions$: Actions,
    private _projectService: ProjectService,
    private _workContextService: WorkContextService,
  ) {
  }

}
