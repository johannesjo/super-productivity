import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Note } from './note.model';
import { Store } from '@ngrx/store';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  notes$: Observable<Note[]>;

  constructor(private _store$: Store<any>) {
  }
}
