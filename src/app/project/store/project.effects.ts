import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { ProjectActionTypes } from './project.actions';
import { selectProjectFeatureState } from './project.reducer';
import { PersistenceService } from '../../core/persistence/persistence.service';

@Injectable()
export class ProjectEffects {
  @Effect({dispatch: false}) updateProject$: any = this._actions$
    .pipe(
      ofType(
        ProjectActionTypes.AddProject,
        ProjectActionTypes.DeleteProject,
        ProjectActionTypes.SetCurrentProject,
        ProjectActionTypes.UpdateProject,
        ProjectActionTypes.SaveProjectIssueConfig,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectProjectFeatureState))
      ),
      tap(this._saveToLs.bind(this))
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
  ) {
  }

  private _saveToLs([action, projectFeatureState]) {
    this._persistenceService.saveProjectsMeta(projectFeatureState);
  }
}


