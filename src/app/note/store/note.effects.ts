import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { selectCurrentProjectId } from '../../project/store/project.reducer';
import { NoteActionTypes } from './note.actions';
import { selectNoteFeatureState } from './note.reducer';

@Injectable()
export class NoteEffects {
  @Effect({dispatch: false}) updateNote$: any = this._actions$
    .pipe(
      ofType(
        NoteActionTypes.AddNote,
        NoteActionTypes.DeleteNote,
        NoteActionTypes.UpdateNote,
        NoteActionTypes.UpdateNoteOrder,
        NoteActionTypes.ToggleShowNotes,
        NoteActionTypes.HideNotes,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectNoteFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, currentProjectId, taskState]) {
    if (currentProjectId) {
      this._persistenceService.saveNotesForProject(currentProjectId, taskState);
    } else {
      throw new Error('No current project id');
    }
  }
}
