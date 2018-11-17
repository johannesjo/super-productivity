import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Note } from '../note.model';
import { NoteActions, NoteActionTypes } from './note.actions';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export interface NoteState extends EntityState<Note> {
  // additional entities state properties
}

export const adapter: EntityAdapter<Note> = createEntityAdapter<Note>();

export const initialState: NoteState = adapter.getInitialState({
  // additional entity state properties
});

export const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal,
} = adapter.getSelectors();
export const NOTE_FEATURE_NAME = 'note';
export const selectNoteFeatureState = createFeatureSelector<NoteState>(NOTE_FEATURE_NAME);

export const selectAllNotes = createSelector(selectNoteFeatureState, selectAll);


export function reducer(
  state = initialState,
  action: NoteActions
): NoteState {
  switch (action.type) {
    case NoteActionTypes.AddNote: {
      return adapter.addOne(action.payload.note, state);
    }

    case NoteActionTypes.UpsertNote: {
      return adapter.upsertOne(action.payload.note, state);
    }

    case NoteActionTypes.AddNotes: {
      return adapter.addMany(action.payload.notes, state);
    }

    case NoteActionTypes.UpsertNotes: {
      return adapter.upsertMany(action.payload.notes, state);
    }

    case NoteActionTypes.UpdateNote: {
      return adapter.updateOne(action.payload.note, state);
    }

    case NoteActionTypes.UpdateNotes: {
      return adapter.updateMany(action.payload.notes, state);
    }

    case NoteActionTypes.DeleteNote: {
      return adapter.removeOne(action.payload.id, state);
    }

    case NoteActionTypes.DeleteNotes: {
      return adapter.removeMany(action.payload.ids, state);
    }

    case NoteActionTypes.LoadNotes: {
      return adapter.addAll(action.payload.notes, state);
    }

    case NoteActionTypes.ClearNotes: {
      return adapter.removeAll(state);
    }

    default: {
      return state;
    }
  }
}

