import { NoteState } from '../note/note.model';
import { isMigrateModel } from '../../util/is-migrate-model';
import { MODEL_VERSION } from '../../core/model-version';
import { MODEL_VERSION_KEY } from '../../app.constants';

export const migrateNoteState = (noteState: NoteState): NoteState => {
  if (!isMigrateModel(noteState, MODEL_VERSION.NOTE, 'Note')) {
    return noteState;
  }

  // const noteEntities: Dictionary<Note> = { ...noteState.entities };
  // Object.keys(noteEntities).forEach((key) => {
  // noteEntities[key] = _updateThemeModel(noteEntities[key] as Note);
  // });

  return {
    ...noteState,
    // Update model version after all migrations ran successfully
    [MODEL_VERSION_KEY]: MODEL_VERSION.NOTE,
  };
};
