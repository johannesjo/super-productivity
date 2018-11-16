import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { NoteActionTypes } from './note.actions';

@Injectable()
export class NoteEffects {

  @Effect()
  loadNotes$ = this.actions$.pipe(ofType(NoteActionTypes.LoadNotes));

  constructor(private actions$: Actions) {}
}
