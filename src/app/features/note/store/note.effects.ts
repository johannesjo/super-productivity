import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { filter, first, map, switchMap, tap } from 'rxjs/operators';
import {
  addNote,
  addNoteReminder,
  deleteNote,
  removeNoteReminder,
  updateNote,
  updateNoteOrder,
  updateNoteReminder
} from './note.actions';
import { NoteState, selectNoteFeatureState } from './note.reducer';
import { ReminderService } from '../../reminder/reminder.service';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
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

  deleteNote$: any = createEffect(() => this._actions$.pipe(
    ofType(
      deleteNote,
    ),
    tap((p) => this._reminderService.removeReminderByRelatedIdIfSet(p.id))
  ), {dispatch: false});

  addReminderForNewNote$: any = createEffect(() => this._actions$.pipe(
    ofType(
      addNote
    ),
    filter(({remindAt}) => !!remindAt && remindAt > 0),
    map((p) => addNoteReminder({
      id: p.note.id,
      title: p.note.content.substr(0, 40),
      remindAt: p.remindAt as number,
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

  private async _saveToLs(currentProjectId: string, noteState: NoteState) {
    if (currentProjectId) {
      this._persistenceService.note.save(currentProjectId, noteState, {isSyncModelChange: true});
    } else {
      throw new Error('No current project id');
    }
  }
}
