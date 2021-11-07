import { AppDataComplete } from '../../imex/sync/sync.model';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { initialNoteState } from '../../features/note/store/note.reducer';
import { Note, NoteState } from '../../features/note/note.model';
import { unique } from '../../util/unique';

export const crossModelMigrations = (data: AppDataComplete): AppDataComplete => {
  let newData = migrateTaskReminders(data);
  console.log(data.note[MODEL_VERSION_KEY]);

  if (!data.note[MODEL_VERSION_KEY]) {
    newData = migrateGlobalNoteModel(newData);
  }
  return newData;
};

const migrateTaskReminders = (data: AppDataComplete): AppDataComplete => {
  if (data?.task?.ids.length && data?.reminders?.length) {
    data.reminders.forEach((reminder) => {
      const task = data.task.entities[reminder.relatedId];
      if (task && task.reminderId && !task.plannedAt) {
        // @ts-ignore
        task.plannedAt = reminder.remindAt;
      }
    });
  }
  return data;
};

const migrateGlobalNoteModel = (data: AppDataComplete): AppDataComplete => {
  const legacyNote = data.note;

  console.log('[M] Migrating Legacy Note State to new model');
  console.log('[M] noteMigration:', legacyNote[MODEL_VERSION_KEY], {
    legacyNote,
  });

  const projectState = data.project;
  // For new instances
  if (!projectState?.ids?.length) {
    return data;
  }
  let newNoteState = initialNoteState;
  const newProjectState = { ...projectState };

  for (const projectId of projectState.ids as string[]) {
    const legacyNoteStateForProject = (legacyNote as any)[projectId];
    console.log('[M] legacyNoteStateForProject', legacyNoteStateForProject);

    if (legacyNoteStateForProject && legacyNoteStateForProject.ids.length) {
      console.log('[M] noteMigration:', {
        legacyNoteStateForProject,
      });
      legacyNoteStateForProject.ids.forEach((id: string) => {
        const entity = legacyNoteStateForProject.entities[id] as Note;
        entity.projectId = projectId;
        entity.isPinnedToToday = false;
      });

      newNoteState = _mergeNotesState(newNoteState, legacyNoteStateForProject);

      // @ts-ignore
      newProjectState.entities[projectId].noteIds = legacyNoteStateForProject.ids || [];
    }
  }
  console.log('[M] noteMigration:', { newNoteState, newProjectState });

  data.project = newProjectState;
  data.note = newNoteState;

  return data;
};

const _mergeNotesState = (
  completeState: NoteState,
  legacyNoteStateForProject: NoteState,
): NoteState => {
  const s = {
    ...completeState,
    // NOTE: we need to make them unique, because we're possibly merging multiple entities into one
    ids: unique([
      ...(completeState.ids as string[]),
      ...(legacyNoteStateForProject.ids as string[]),
    ]),
    entities: {
      ...completeState.entities,
      ...legacyNoteStateForProject.entities,
    },
  };
  return s;
};
