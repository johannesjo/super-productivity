import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Note } from './note.model';
import { select, select, Store } from '@ngrx/store';
import { AddNote } from './store/note.actions';
import shortid from 'shortid';
import { selectAllNotes } from './store/note.reducer';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  public notes$: Observable<Note[]> = this._store$.pipe(select(selectAllNotes));

  constructor(private _store$: Store<any>) {
  }

  public addNote() {
    this._store$.dispatch(new AddNote({
      note: {
        id: shortid(),
        title: '',
        note: '',
      }
    }));
  }
}
