import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Note } from '../note.model';
import { NoteState } from './note.reducer';

export const loadNoteState = createAction(
  '[Note] Load Note State',
  props<{ state: NoteState }>(),
);

export const updateNoteOrder = createAction(
  '[Note] Update Note Order',
  props<{ ids: string[] }>(),
);

export const addNote = createAction(
  '[Note] Add Note',
  props<{ note: Note; isPreventFocus?: boolean; remindAt: number | null }>(),
);

export const upsertNote = createAction(
  '[Note] Upsert Note',
  props<{ note: Note }>(),
);

export const addNotes = createAction(
  '[Note] Add Notes',
  props<{ notes: Note[] }>(),
);

export const upsertNotes = createAction(
  '[Note] Upsert Notes',
  props<{ notes: Note[] }>(),
);

export const updateNote = createAction(
  '[Note] Update Note',
  props<{ note: Update<Note> }>(),
);

export const updateNotes = createAction(
  '[Note] Update Notes',
  props<{ notes: Update<Note> [] }>(),
);

export const deleteNote = createAction(
  '[Note] Delete Note',
  props<{ id: string }>(),
);

export const deleteNotes = createAction(
  '[Note] Delete Notes',
  props<{ ids: string[] }>(),
);

export const clearNotes = createAction(
  '[Note] Clear Notes',
);
// Reminder Actions
export const addNoteReminder = createAction(
  '[Note] Add reminder',
  props<{ id: string; title: string; remindAt: number }>(),
);

export const updateNoteReminder = createAction(
  '[Note] Update reminder',
  props<{ id: string; title: string; reminderId: string; remindAt: number }>(),
);

export const removeNoteReminder = createAction(
  '[Note] Remove reminder',
  props<{ id: string; reminderId: string }>(),
);
