import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PersistenceService } from '../../../core/persistence/persistence.service';
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
import { WorkContextService } from '../../work-context/work-context.service';
import { Observable } from 'rxjs';
import { NoteState } from '../note.model';
import { deleteProject } from '../../project/store/project.actions';

@Injectable()
export class NoteEffects {
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

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _workContextService: WorkContextService,
  ) {}

  private _saveToLs(noteState: NoteState): void {
    this._persistenceService.note.saveState(noteState, {
      isSyncModelChange: true,
    });
  }
}
