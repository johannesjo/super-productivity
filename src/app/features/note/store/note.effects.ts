import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {select, Store} from '@ngrx/store';
import {filter, map, mergeMap, tap, withLatestFrom} from 'rxjs/operators';
import {selectCurrentProjectId} from '../../project/store/project.reducer';
import {
  AddNote,
  AddNoteReminder,
  DeleteNote,
  NoteActionTypes,
  RemoveNoteReminder,
  UpdateNote,
  UpdateNoteReminder
} from './note.actions';
import {selectNoteFeatureState} from './note.reducer';
import {ReminderService} from '../../reminder/reminder.service';
import {SnackOpen} from '../../../core/snack/store/snack.actions';
import {T} from '../../../t.const';

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
      tap((a: DeleteNote) => this._reminderService.removeReminderByRelatedIdIfSet(a.payload.id))
    );

  @Effect() addReminderForNewNote$: any = this._actions$
    .pipe(
      ofType(
        NoteActionTypes.AddNote,
      ),
      filter((a: AddNote) => a.payload.remindAt && a.payload.remindAt > 0),
      map((a: AddNote) => new AddNoteReminder({
        id: a.payload.note.id,
        title: a.payload.note.content.substr(0, 40),
        remindAt: a.payload.remindAt,
      }))
    );

  @Effect() addNoteReminder$: any = this._actions$
    .pipe(
      ofType(
        NoteActionTypes.AddNoteReminder,
      ),
      mergeMap((a: AddNoteReminder) => {
        const {id, title, remindAt} = a.payload;
        const reminderId = this._reminderService.addReminder('NOTE', id, title, remindAt);

        return [
          new UpdateNote({
            note: {id, changes: {reminderId}}
          }),
          new SnackOpen({
            type: 'SUCCESS',
            msg: T.F.NOTE.SNACK.ADDED_REMINDER,
            ico: 'schedule',
          }),
        ];
      })
    );

  @Effect() updateNoteReminder$: any = this._actions$
    .pipe(
      ofType(
        NoteActionTypes.UpdateNoteReminder,
      ),
      map((a: UpdateNoteReminder) => {
        const {title, remindAt, reminderId} = a.payload;
        this._reminderService.updateReminder(reminderId, {
          remindAt,
          title,
        });
        return new SnackOpen({
          type: 'SUCCESS',
          msg: T.F.NOTE.SNACK.UPDATED_REMINDER,
          ico: 'schedule',
        });
      })
    );

  @Effect() removeNoteReminder$: any = this._actions$
    .pipe(
      ofType(
        NoteActionTypes.RemoveNoteReminder,
      ),
      mergeMap((a: RemoveNoteReminder) => {
        const {id, reminderId} = a.payload;
        this._reminderService.removeReminder(reminderId);

        return [
          new UpdateNote({
            note: {
              id,
              changes: {reminderId: null}
            }
          }),
          new SnackOpen({
            type: 'SUCCESS',
            msg: T.F.NOTE.SNACK.DELETED_REMINDER,
            ico: 'schedule',
          }),
        ];
      })
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
      this._persistenceService.note.save(currentProjectId, noteState);
    } else {
      throw new Error('No current project id');
    }
  }
}
