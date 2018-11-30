import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Note } from '../note.model';
import { NoteState } from './note.reducer';

export enum NoteActionTypes {
  LoadNoteState = '[Note] Load Note State',
  ToggleShowNotes = '[Note] ToggleShow Notes',
  HideNotes = '[Note] Hide Notes',

  UpdateNoteOrder = '[Note] Update Note Order',
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

export class LoadNoteState implements Action {
  readonly type = NoteActionTypes.LoadNoteState;

  constructor(public payload: { state: NoteState }) {
  }
}

export class ToggleShowNotes implements Action {
  readonly type = NoteActionTypes.ToggleShowNotes;
}

export class HideNotes implements Action {
  readonly type = NoteActionTypes.HideNotes;
}

export class UpdateNoteOrder implements Action {
  readonly type = NoteActionTypes.UpdateNoteOrder;

  constructor(public payload: { ids: string[] }) {
  }
}

export class AddNote implements Action {
  readonly type = NoteActionTypes.AddNote;

  constructor(public payload: { note: Note, isPreventFocus?: boolean }) {
  }
}

export class UpsertNote implements Action {
  readonly type = NoteActionTypes.UpsertNote;

  constructor(public payload: { note: Note }) {
  }
}

export class AddNotes implements Action {
  readonly type = NoteActionTypes.AddNotes;

  constructor(public payload: { notes: Note[] }) {
  }
}

export class UpsertNotes implements Action {
  readonly type = NoteActionTypes.UpsertNotes;

  constructor(public payload: { notes: Note[] }) {
  }
}

export class UpdateNote implements Action {
  readonly type = NoteActionTypes.UpdateNote;

  constructor(public payload: { note: Update<Note> }) {
  }
}

export class UpdateNotes implements Action {
  readonly type = NoteActionTypes.UpdateNotes;

  constructor(public payload: { notes: Update<Note>[] }) {
  }
}

export class DeleteNote implements Action {
  readonly type = NoteActionTypes.DeleteNote;

  constructor(public payload: { id: string }) {
  }
}

export class DeleteNotes implements Action {
  readonly type = NoteActionTypes.DeleteNotes;

  constructor(public payload: { ids: string[] }) {
  }
}

export class ClearNotes implements Action {
  readonly type = NoteActionTypes.ClearNotes;
}

export type NoteActions =
  LoadNoteState
  | ToggleShowNotes
  | HideNotes
  | UpdateNoteOrder
  | AddNote
  | UpsertNote
  | AddNotes
  | UpsertNotes
  | UpdateNote
  | UpdateNotes
  | DeleteNote
  | DeleteNotes
  | ClearNotes;
