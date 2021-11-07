import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { first, switchMap, tap } from 'rxjs/operators';
import { addNote, deleteNote, updateNote, updateNoteOrder } from './note.actions';
import { selectNoteFeatureState } from './note.reducer';
import { WorkContextService } from '../../work-context/work-context.service';
import { Observable } from 'rxjs';
import { NoteState } from '../note.model';
import { MODEL_VERSION_KEY } from '../../../app.constants';

@Injectable()
export class NoteEffects {
  updateNote$: Observable<any> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addNote, deleteNote, updateNote, updateNoteOrder),
        switchMap(() => this._store$.pipe(select(selectNoteFeatureState)).pipe(first())),
        tap((state) => this._saveToLs(state)),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _workContextService: WorkContextService,
  ) {}

  private _saveToLs(noteState: NoteState): void {
    console.log('save noteState', noteState[MODEL_VERSION_KEY], noteState);

    this._persistenceService.note.saveState(noteState, {
      isSyncModelChange: true,
    });
  }
}
