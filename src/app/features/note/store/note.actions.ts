import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Note } from '../note.model';
import { WorkContextType } from '../../work-context/work-context.model';

export const updateNoteOrder = createAction(
  '[Note] Update Note Order',
  props<{ ids: string[]; activeContextType: WorkContextType; activeContextId: string }>(),
);

export const addNote = createAction(
  '[Note] Add Note',
  props<{
    note: Note;
    isPreventFocus?: boolean;
  }>(),
);

export const updateNote = createAction(
  '[Note] Update Note',
  props<{ note: Update<Note> }>(),
);

export const deleteNote = createAction(
  '[Note] Delete Note',
  props<{ id: string; projectId: string | null; isPinnedToToday: boolean }>(),
);

export const moveNoteToOtherProject = createAction(
  '[Note] Move to other project',
  props<{ note: Note; targetProjectId: string }>(),
);
