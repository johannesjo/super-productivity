import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import 'rxjs/add/operator/withLatestFrom';
import { withLatestFrom } from 'rxjs/operators';
import { tap } from 'rxjs/operators';
import { ProjectActionTypes } from './project.actions';
import { PROJECT_FEATURE_NAME } from './project.reducer';

@Injectable()
export class ProjectEffects {
  @Effect({dispatch: false}) updateProject$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.AddProject,
        ProjectActionTypes.DeleteProject,
        ProjectActionTypes.SetCurrentProject,
        ProjectActionTypes.UpdateProject,
      ),
      withLatestFrom(this._store$),
      tap(this._saveToLs.bind(this))
    );

  constructor(private _actions$: Actions,
              private _store$: Store<any>,) {
  }

  private _saveToLs(state) {
    const projectsFeatureState = state[1][PROJECT_FEATURE_NAME];
    const currentProjectId = projectsFeatureState.currentProjectId;
    console.log('SYNC', projectsFeatureState, currentProjectId);
    // this._projectService.saveProjectsForCurrent(projectsFeatureState);
  }
}


