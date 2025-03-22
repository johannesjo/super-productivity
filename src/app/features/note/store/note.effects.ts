import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { first, switchMap, tap } from 'rxjs/operators';
import {
  addNote,
  deleteNote,
  moveNoteToOtherProject,
  updateNote,
  updateNoteOrder,
} from './note.actions';
import { selectNoteFeatureState } from './note.reducer';
import { Observable } from 'rxjs';
import { NoteState } from '../note.model';
import { deleteProject } from '../../project/store/project.actions';
import { PfapiService } from '../../../pfapi/pfapi.service';

@Injectable()
export class NoteEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _pfapiService = inject(PfapiService);

  updateNote$: Observable<any> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addNote,
          deleteNote,
          updateNote,
          updateNoteOrder,
          moveNoteToOtherProject,
          // PROJECT
          deleteProject,
        ),
        switchMap(() => this._store$.pipe(select(selectNoteFeatureState)).pipe(first())),
        tap((state) => this._saveToLs(state)),
      ),
    { dispatch: false },
  );

  private _saveToLs(noteState: NoteState): void {
    this._pfapiService.m.note.save(noteState, {
      isUpdateRevAndLastUpdate: true,
    });
  }
}
