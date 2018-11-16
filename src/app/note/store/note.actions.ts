import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Note } from '../note.model';

export enum NoteActionTypes {
  LoadNotes = '[Note] Load Notes',
  AddNote = '[Note] Add Note',
  UpsertNote = '[Note] Upsert Note',
  AddNotes = '[Note] Add Notes',
  UpsertNotes = '[Note] Upsert Notes',
  UpdateNote = '[Note] Update Note',
  UpdateNotes = '[Note] Update Notes',
  DeleteNote = '[Note] Delete Note',
  DeleteNotes = '[Note] Delete Notes',
  ClearNotes = '[Note] Clear Notes'
}

export class LoadNotes implements Action {
  readonly type = NoteActionTypes.LoadNotes;

  constructor(public payload: { notes: Note[] }) {}
}

export class AddNote implements Action {
  readonly type = NoteActionTypes.AddNote;

  constructor(public payload: { note: Note }) {}
}

export class UpsertNote implements Action {
  readonly type = NoteActionTypes.UpsertNote;

  constructor(public payload: { note: Note }) {}
}

export class AddNotes implements Action {
  readonly type = NoteActionTypes.AddNotes;

  constructor(public payload: { notes: Note[] }) {}
}

export class UpsertNotes implements Action {
  readonly type = NoteActionTypes.UpsertNotes;

  constructor(public payload: { notes: Note[] }) {}
}

export class UpdateNote implements Action {
  readonly type = NoteActionTypes.UpdateNote;

  constructor(public payload: { note: Update<Note> }) {}
}

export class UpdateNotes implements Action {
  readonly type = NoteActionTypes.UpdateNotes;

  constructor(public payload: { notes: Update<Note>[] }) {}
}

export class DeleteNote implements Action {
  readonly type = NoteActionTypes.DeleteNote;

  constructor(public payload: { id: string }) {}
}

export class DeleteNotes implements Action {
  readonly type = NoteActionTypes.DeleteNotes;

  constructor(public payload: { ids: string[] }) {}
}

export class ClearNotes implements Action {
  readonly type = NoteActionTypes.ClearNotes;
}

export type NoteActions =
 LoadNotes
 | AddNote
 | UpsertNote
 | AddNotes
 | UpsertNotes
 | UpdateNote
 | UpdateNotes
 | DeleteNote
 | DeleteNotes
 | ClearNotes;
