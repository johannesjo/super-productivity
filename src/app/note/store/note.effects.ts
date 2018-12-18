import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { selectCurrentProjectId } from '../../project/store/project.reducer';
import { NoteActionTypes } from './note.actions';
import { selectNoteFeatureState } from './note.reducer';
import { ReminderService } from '../../reminder/reminder.service';

@Injectable()
export class NoteEffects {
  @Effect({dispatch: false}) updateNote$: any = this._actions$
    .pipe(
      ofType(
        NoteActionTypes.AddNote,
        NoteActionTypes.DeleteNote,
        NoteActionTypes.UpdateNote,
        NoteActionTypes.UpdateNoteOrder,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectNoteFeatureState)),
      ),
      tap(this._saveToLs.bind(this)),
      tap(this._updateLastActive.bind(this)),
    );

  @Effect({dispatch: false}) updateNoteUi$: any = this._actions$
    .pipe(
      ofType(
        NoteActionTypes.ToggleShowNotes,
        NoteActionTypes.HideNotes,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectNoteFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );


  @Effect({dispatch: false}) deleteNote$: any = this._actions$
    .pipe(
      ofType(
        NoteActionTypes.DeleteNote,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectNoteFeatureState)),
      ),
      tap(this._removeRemindersIfAny.bind(this))
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _reminderService: ReminderService,
  ) {
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }

  private async _saveToLs([action, currentProjectId, noteState]) {
    if (currentProjectId) {
      this._persistenceService.saveNotesForProject(currentProjectId, noteState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _removeRemindersIfAny([action, noteState]) {
    const note = noteState.entities[action.payload.id];
    if (note && note.reminderId) {
      this._reminderService.removeReminder(note.reminderId);
    }
  }
}
