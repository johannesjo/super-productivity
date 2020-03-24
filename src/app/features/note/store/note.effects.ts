import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {select, Store} from '@ngrx/store';
import {filter, map, tap, withLatestFrom} from 'rxjs/operators';
import {
  addNote,
  addNoteReminder,
  deleteNote,
  removeNoteReminder,
  updateNote,
  updateNoteOrder,
  updateNoteReminder
} from './note.actions';
import {selectNoteFeatureState} from './note.reducer';
import {ReminderService} from '../../reminder/reminder.service';
import {T} from '../../../t.const';
import {SnackService} from '../../../core/snack/snack.service';
import {WorkContextService} from '../../work-context/work-context.service';

@Injectable()
export class NoteEffects {
  updateNote$: any = createEffect(() => this._actions$.pipe(
    ofType(
      addNote,
      deleteNote,
      updateNote,
      updateNoteOrder,
    ),
    withLatestFrom(
      this._workContextService.activeWorkContextIdIfProject$,
      this._store$.pipe(select(selectNoteFeatureState)),
    ),
    tap(this._saveToLs.bind(this)),
    tap(this._updateLastActive.bind(this)),
  ), {dispatch: false});

  deleteNote$: any = createEffect(() => this._actions$.pipe(
    ofType(
      deleteNote,
    ),
    tap((p) => this._reminderService.removeReminderByRelatedIdIfSet(p.id))
  ), {dispatch: false});

  addReminderForNewNote$ = createEffect(() => this._actions$.pipe(
    ofType(
      addNote
    ),
    filter((p) => p.remindAt && p.remindAt > 0),
    map((p) => addNoteReminder({
      id: p.note.id,
      title: p.note.content.substr(0, 40),
      remindAt: p.remindAt,
    }))
  ));

  addNoteReminder$: any = createEffect(() => this._actions$.pipe(
    ofType(
      addNoteReminder
    ),
    map(({id, title, remindAt}) => {
      const reminderId = this._reminderService.addReminder('NOTE', id, title, remindAt);
      return updateNote({
        note: {id, changes: {reminderId}}
      });
    }),
    tap(() => this._snackService.open({
      type: 'SUCCESS',
      msg: T.F.NOTE.S.ADDED_REMINDER,
      ico: 'schedule',
    })),
  ));

  updateNoteReminder$: any = createEffect(() => this._actions$.pipe(
    ofType(
      updateNoteReminder
    ),
    tap(({title, remindAt, reminderId}) => {
      this._reminderService.updateReminder(reminderId, {
        remindAt,
        title,
      });
      this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.NOTE.S.UPDATED_REMINDER,
        ico: 'schedule',
      });
    })
  ), {dispatch: false});

  removeNoteReminder$: any = createEffect(() => this._actions$.pipe(
    ofType(
      removeNoteReminder
    ),
    map(({id, reminderId}) => {
      this._reminderService.removeReminder(reminderId);
      return updateNote({
        note: {
          id,
          changes: {reminderId: null}
        }
      });
    }),
    tap(() => this._snackService.open({
      type: 'SUCCESS',
      msg: T.F.NOTE.S.DELETED_REMINDER,
      ico: 'schedule',
    })),
  ));


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _reminderService: ReminderService,
    private _workContextService: WorkContextService,
    private _snackService: SnackService,
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
