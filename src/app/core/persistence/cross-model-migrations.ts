import { AppDataComplete } from '../../imex/sync/sync.model';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { initialNoteState } from '../../features/note/store/note.reducer';
import { Note, NoteState } from '../../features/note/note.model';
import { unique } from '../../util/unique';
import { initialMetricState } from '../../features/metric/store/metric.reducer';
import { initialImprovementState } from '../../features/metric/improvement/store/improvement.reducer';
import { initialObstructionState } from '../../features/metric/obstruction/store/obstruction.reducer';
import { ImprovementState } from '../../features/metric/improvement/improvement.model';
import { MetricCopy, MetricState } from '../../features/metric/metric.model';
import { EntityState } from '@ngrx/entity';

export const crossModelMigrations = (data: AppDataComplete): AppDataComplete => {
  console.log('[M] Starting cross model migrations...');
  let newData = migrateTaskReminders(data);

  if (!data.note[MODEL_VERSION_KEY]) {
    newData = migrateGlobalNoteModel(newData);
  }
  if (!data.metric[MODEL_VERSION_KEY]) {
    newData = migrateGlobalMetricModel(newData);
  }
  if (
    data.project?.entities['DEFAULT'] &&
    !data.project?.entities['INBOX'] &&
    data.globalConfig?.misc.defaultProjectId === 'INBOX'
  ) {
    newData = migrateDefaultProjectIdChange(newData);
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
  console.log(newNoteState);

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

const migrateGlobalMetricModel = (data: AppDataComplete): AppDataComplete => {
  const metricState = data.metric;
  const projectState = data.project;
  console.log('[M] Migrating Legacy Metric State to new model');
  console.log('[M] metricMigration:', metricState[MODEL_VERSION_KEY], {
    metricState,
  });

  // For new instances
  if (!projectState?.ids?.length) {
    return data;
  }

  console.log(projectState);
  let newM = initialMetricState;
  let newI = initialImprovementState;
  let newO = initialObstructionState;

  for (const id of projectState.ids as string[]) {
    const mForProject = (data.metric as any)[id];
    const iForProject = (data.improvement as any)[id];
    const oForProject = (data.obstruction as any)[id];
    if (mForProject && (oForProject || iForProject)) {
      console.log('[M] metricMigration:', {
        mForProject,
        iForProject,
        oForProject,
      });
      newM = _mergeMetricsState(newM, mForProject);
      if (iForProject) {
        newI = _mergeIntoState(newI, iForProject) as ImprovementState;
      }
      if (oForProject) {
        newO = _mergeIntoState(newO, oForProject);
      }
    }
  }

  data.metric = newM;
  data.improvement = newI;
  data.obstruction = newO;
  console.log('[M] metricMigration:', { newM, newI, newO });

  return data;
};
const migrateDefaultProjectIdChange = (data: AppDataComplete): AppDataComplete => {
  console.log(
    '[M] Migrating default project id state to make it work with legacy default',
  );

  data.globalConfig = {
    ...data.globalConfig,
    misc: {
      ...data.globalConfig.misc,
      defaultProjectId: 'DEFAULT',
    },
  };

  return data;
};

const _mergeMetricsState = (
  completeState: MetricState,
  newState: MetricState,
): MetricState => {
  const s = {
    ...completeState,
    ...newState,
    // NOTE: we need to make them unique, because we're possibly merging multiple entities into one
    ids: unique([...(completeState.ids as string[]), ...(newState.ids as string[])]),
    entities: {
      ...completeState.entities,
      ...newState.entities,
    },
  };

  Object.keys(newState.entities).forEach((dayStr) => {
    const mOld = completeState.entities[dayStr] as MetricCopy;
    const mNew = newState.entities[dayStr] as MetricCopy;
    // merge same entry into one
    if (mOld && mNew) {
      s.entities[dayStr] = {
        ...mOld,
        obstructions: [...mOld.obstructions, ...mNew.obstructions],
        improvements: [...mOld.improvements, ...mNew.improvements],
        improvementsTomorrow: [
          ...mOld.improvementsTomorrow,
          ...mNew.improvementsTomorrow,
        ],
      };
    }
  });
  return s;
};

const _mergeIntoState = (
  completeState: EntityState<any>,
  newState: EntityState<any>,
): EntityState<any> => {
  return {
    ...completeState,
    ...newState,
    ids: [...(completeState.ids as string[]), ...(newState.ids as string[])],
    entities: {
      ...completeState.entities,
      ...newState.entities,
    },
  };
};
