import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { first, switchMap, tap } from 'rxjs/operators';
import { addNote, deleteNote, updateNote, updateNoteOrder } from './note.actions';
import { NoteState, selectNoteFeatureState } from './note.reducer';
import { WorkContextService } from '../../work-context/work-context.service';
import { combineLatest, Observable } from 'rxjs';

@Injectable()
export class NoteEffects {
  updateNote$: Observable<any> = createEffect(() => this._actions$.pipe(
    ofType(
      addNote,
      deleteNote,
      updateNote,
      updateNoteOrder,
    ),
    switchMap(() => combineLatest([
      this._workContextService.activeWorkContextIdIfProject$,
      this._store$.pipe(select(selectNoteFeatureState)),
    ]).pipe(first())),
    tap(([projectId, state]) => this._saveToLs(projectId, state)),
  ), {dispatch: false});

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _workContextService: WorkContextService,
  ) {
  }

  private async _saveToLs(currentProjectId: string, noteState: NoteState) {
    if (currentProjectId) {
      this._persistenceService.note.save(currentProjectId, noteState, {isSyncModelChange: true});
    } else {
      throw new Error('No current project id');
    }
  }
}
