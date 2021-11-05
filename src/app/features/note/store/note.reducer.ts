import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { Note, NoteState } from '../note.model';
import { addNote, deleteNote, updateNote, updateNoteOrder } from './note.actions';
import {
  Action,
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
} from '@ngrx/store';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { devError } from '../../../util/dev-error';
import { WorkContextType } from '../../work-context/work-context.model';

export const adapter: EntityAdapter<Note> = createEntityAdapter<Note>();

export const initialNoteState: NoteState = adapter.getInitialState({
  todayOrder: [],
});

export const { selectIds, selectEntities, selectAll, selectTotal } =
  adapter.getSelectors();
export const NOTE_FEATURE_NAME = 'note';
export const selectNoteFeatureState = createFeatureSelector<NoteState>(NOTE_FEATURE_NAME);

export const selectAllNotes = createSelector(selectNoteFeatureState, selectAll);
export const selectNoteTodayOrder = createSelector(
  selectNoteFeatureState,
  (state: NoteState) => state.todayOrder,
);

export const selectNoteById = createSelector(
  selectNoteFeatureState,
  (state: NoteState, props: { id: string }): Note => {
    const n = state.entities[props.id];
    if (!n) {
      throw new Error('No note');
    }
    return n;
  },
);

export const selectNotesById = createSelector(
  selectNoteFeatureState,
  (state: NoteState, props: { ids: string[] }): Note[] =>
    props.ids.map((id: string) => {
      const note = state.entities[id];
      if (!note) {
        devError('Note data not found for ' + id);
      }
      return note as Note;
    }),
);

const _reducer = createReducer<NoteState>(
  initialNoteState,

  // META ACTIONS
  // ------------
  on(loadAllData, (state, { appDataComplete }) =>
    appDataComplete.note ? appDataComplete.note : state,
  ),

  on(updateNoteOrder, (state, { ids, activeContextType }) =>
    activeContextType !== WorkContextType.PROJECT
      ? {
          ...state,
          noteIds: ids,
        }
      : state,
  ),

  on(addNote, (state, payload) => ({
    ...state,
    entities: {
      ...state.entities,
      [payload.note.id]: payload.note,
    },
    // add to top rather than bottom
    ids: [payload.note.id, ...state.ids] as string[] | number[],
  })),

  on(updateNote, (state, { note }) => adapter.updateOne(note, state)),

  on(deleteNote, (state, { id }) => adapter.removeOne(id, state)),
);

export const noteReducer = (
  state: NoteState = initialNoteState,
  action: Action,
): NoteState => _reducer(state, action);
