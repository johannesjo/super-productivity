import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Note } from './note.model';
import { select, Store } from '@ngrx/store';
import { AddNote, DeleteNote, LoadNoteState, ToggleShowNotes, UpdateNote } from './store/note.actions';
import shortid from 'shortid';
import { initialNoteState, selectAllNotes, selectIsShowNotes } from './store/note.reducer';
import { PersistenceService } from '../core/persistence/persistence.service';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  public isShowNotes$: Observable<boolean> = this._store$.pipe(select(selectIsShowNotes));
  public notes$: Observable<Note[]> = this._store$.pipe(select(selectAllNotes));

  constructor(
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
  ) {
  }

  public toggleShow() {
    this._store$.dispatch(new ToggleShowNotes());
  }

  public loadStateForProject(projectId) {
    const notes = this._persistenceService.loadNotesForProject(projectId) || initialNoteState;
    this._store$.dispatch(new LoadNoteState({state: notes}));
  }

  public add(note: Partial<Note> = {}) {
    this._store$.dispatch(new AddNote({
      note: {
        id: shortid(),
        title: '',
        content: '',
        created: Date.now(),
        modified: Date.now(),
        ...note,
      }
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
}
