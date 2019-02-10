import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Note } from './note.model';
import { select, Store } from '@ngrx/store';
import {
  AddNote,
  DeleteNote,
  HideNotes,
  LoadNoteState,
  NoteActionTypes,
  ToggleShowNotes,
  UpdateNote,
  UpdateNoteOrder
} from './store/note.actions';
import shortid from 'shortid';
import { initialNoteState, NoteState, selectAllNotes, selectIsShowNotes, selectNoteById } from './store/note.reducer';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { Actions, ofType } from '@ngrx/effects';
import { take } from 'rxjs/operators';
import { ReminderService } from '../reminder/reminder.service';
import { SnackService } from '../../core/snack/snack.service';
import { createFromDrop, DropPasteInput } from '../../core/drop-paste-input/drop-paste-input';
import { isImageUrl, isImageUrlSimple } from '../../util/is-image-url';

@Injectable({
  providedIn: 'root',
})
export class NoteService {
  public isShowNotes$: Observable<boolean> = this._store$.pipe(select(selectIsShowNotes));
  public notes$: Observable<Note[]> = this._store$.pipe(select(selectAllNotes));
  public onNoteAdd$: Observable<any> = this._actions$.pipe(ofType(NoteActionTypes.AddNote));

  constructor(
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _reminderService: ReminderService,
    private _snackService: SnackService,
    private _actions$: Actions,
  ) {
  }

  getById(id: string): Observable<Note> {
    return this._store$.pipe(select(selectNoteById, {id}), take(1));
  }

  public toggleShow() {
    this._store$.dispatch(new ToggleShowNotes());
  }

  public hide() {
    this._store$.dispatch(new HideNotes());
  }

  public async loadStateForProject(projectId) {
    const notes = await this._persistenceService.loadNotesForProject(projectId) || initialNoteState;
    this.loadState(notes);
  }

  public loadState(state: NoteState) {
    this._store$.dispatch(new LoadNoteState({state: state}));
  }

  public add(note: Partial<Note> = {}, remindAt?: number, isPreventFocus = false) {
    const id = shortid();

    let reminderId = null;
    if (remindAt) {
      reminderId = this._addReminderForNewNote(id, remindAt, (note.content && note.content.substr(0, 40)));
    }

    this._store$.dispatch(new AddNote({
      note: {
        id,
        content: '',
        created: Date.now(),
        modified: Date.now(),
        ...note,
        reminderId,
      },
      isPreventFocus
    }));
  }

  public remove(id: string) {
    this._store$.dispatch(new DeleteNote({id}));
  }

  public update(id, note: Partial<Note>) {
    this._store$.dispatch(new UpdateNote({
      note: {
        id,
        changes: note,
      }
    }));
  }

  public async updateFromDifferentProject(projectId, id, updates: Partial<Note>) {
    const noteState = await this._persistenceService.loadNotesForProject(projectId);
    const noteToUpdate = noteState.entities[id];
    Object.assign(noteToUpdate, updates);
    return await this._persistenceService.saveNotesForProject(projectId, noteState);
  }

  public updateOrder(ids: string[]) {
    this._store$.dispatch(new UpdateNoteOrder({ids}));
  }

  // REMINDER
  // --------
  public addReminder(noteId: string, remindAt: number, title: string) {
    const reminderId = this._reminderService.addReminder(
      'NOTE',
      noteId,
      title,
      remindAt,
    );
    this.update(noteId, {reminderId});
    this._snackService.open({
      type: 'SUCCESS',
      message: `Added reminder for note`,
      icon: 'schedule',
    });
  }

  public updateReminder(noteId: string, reminderId: string, remindAt: number, title: string) {
    this._reminderService.updateReminder(reminderId, {
      remindAt,
      title,
    });
    this._snackService.open({
      type: 'SUCCESS',
      message: `Updated reminder for note`,
      icon: 'schedule',
    });
  }

  public removeReminder(noteId: string, reminderId: string) {
    this._reminderService.removeReminder(reminderId);
    this.update(noteId, {reminderId: null});
    this._snackService.open({
      type: 'SUCCESS',
      message: `Deleted reminder for note`,
      icon: 'schedule',
    });
  }

  createFromDrop(ev) {
    this._handleInput(createFromDrop(ev), ev);
  }

  private _addReminderForNewNote(noteId: string, remindAt: number, title: string): string {
    const reminderId = this._reminderService.addReminder(
      'NOTE',
      noteId,
      title,
      remindAt,
    );
    return reminderId;
  }

  private async _handleInput(drop: DropPasteInput, ev) {
    // properly not intentional so we leave
    if (!drop || !drop.path || drop.type === 'FILE') {
      return;
    }

    // don't intervene with text inputs
    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') {
      return;
    }

    const note: Partial<Note> = {
      content: drop.path,
    };

    const isImg = isImageUrlSimple(drop.path) || await isImageUrl(drop.path);
    if (isImg) {
      note.imgUrl = drop.path;
    }

    this.add(note);

    ev.preventDefault();
    ev.stopPropagation();
  }
}
