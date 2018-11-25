import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Note } from '../note.model';
import { NoteActions, NoteActionTypes } from './note.actions';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { selectTaskFeatureState } from '../../tasks/store/task.selectors';

export interface NoteState extends EntityState<Note> {
  // additional entities state properties
  isShowNotes: boolean;
}

export const adapter: EntityAdapter<Note> = createEntityAdapter<Note>();

export const initialNoteState: NoteState = adapter.getInitialState({
  // additional entity state properties
  isShowNotes: false,
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
export const selectIsShowNotes = createSelector(selectNoteFeatureState, state => state.isShowNotes);
export const selectNoteById = createSelector(
  selectNoteFeatureState,
  (state, props: { id: string }) => state.entities[props.id]
);


export function reducer(
  state = initialNoteState,
  action: NoteActions
): NoteState {
  switch (action.type) {
    case NoteActionTypes.LoadNoteState: {
      return {...action.payload.state};
    }

    case NoteActionTypes.ToggleShowNotes: {
      return {...state, isShowNotes: !state.isShowNotes};
    }

    case NoteActionTypes.HideNotes: {
      return {...state, isShowNotes: false};
    }

    case NoteActionTypes.UpdateNoteOrder: {
      return {...state, ids: action.payload.ids};
    }

    case NoteActionTypes.AddNote: {
      // return adapter.addOne(action.payload.note, state);
      // add to top rather than bottom
      return {
        ...state,
        entities: {
          ...state.entities,
          [action.payload.note.id]: action.payload.note
        },
        ids: [action.payload.note.id, ...state.ids] as string[] | number[]
      };
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

    case NoteActionTypes.ClearNotes: {
      return adapter.removeAll(state);
    }

    default: {
      return state;
    }
  }
}

