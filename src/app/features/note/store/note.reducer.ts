import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { Note, NoteState } from '../note.model';
import {
  addNote,
  addNotes,
  clearNotes,
  deleteNote,
  deleteNotes,
  updateNote,
  updateNoteOrder,
  updateNotes,
  upsertNote,
  upsertNotes,
} from './note.actions';
import {
  Action,
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
} from '@ngrx/store';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { devError } from '../../../util/dev-error';

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

  on(updateNoteOrder, (state, payload) => ({
    ...state,
    ids: payload.ids,
  })),

  on(addNote, (state, payload) => ({
    ...state,
    entities: {
      ...state.entities,
      [payload.note.id]: payload.note,
    },
    // add to top rather than bottom
    ids: [payload.note.id, ...state.ids] as string[] | number[],
  })),

  on(upsertNote, (state, { note }) => adapter.upsertOne(note, state)),

  on(addNotes, (state, { notes }) => adapter.addMany(notes, state)),

  on(upsertNotes, (state, { notes }) => adapter.upsertMany(notes, state)),

  on(updateNote, (state, { note }) => adapter.updateOne(note, state)),

  on(updateNotes, (state, { notes }) => adapter.updateMany(notes, state)),

  on(deleteNote, (state, { id }) => adapter.removeOne(id, state)),

  on(deleteNotes, (state, { ids }) => adapter.removeMany(ids, state)),

  on(clearNotes, (state) => adapter.removeAll(state)),
);

export const noteReducer = (
  state: NoteState = initialNoteState,
  action: Action,
): NoteState => _reducer(state, action);
