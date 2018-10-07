import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { ProjectActionTypes } from './project.actions';

@Injectable()
export class ProjectEffects {

  @Effect()
  loadFoos$ = this.actions$.pipe(ofType(ProjectActionTypes.LoadProjects));

  constructor(private actions$: Actions) {}
}
