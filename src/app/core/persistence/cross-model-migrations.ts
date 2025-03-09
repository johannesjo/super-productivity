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
import { Project } from '../../features/project/project.model';
import {
  IssueIntegrationCfg,
  IssueProvider,
  IssueProviderKey,
} from '../../features/issue/issue.model';
import { nanoid } from 'nanoid';
import {
  DEFAULT_ISSUE_PROVIDER_CFGS,
  ICAL_TYPE,
  ISSUE_PROVIDER_DEFAULT_COMMON_CFG,
  ISSUE_PROVIDER_TYPES,
} from '../../features/issue/issue.const';
import { JiraCfg } from '../../features/issue/providers/jira/jira.model';
import { OpenProjectCfg } from '../../features/issue/providers/open-project/open-project.model';
import { CaldavCfg } from '../../features/issue/providers/caldav/caldav.model';
import { RedmineCfg } from '../../features/issue/providers/redmine/redmine.model';
import { GithubCfg } from '../../features/issue/providers/github/github.model';
import { GiteaCfg } from '../../features/issue/providers/gitea/gitea.model';
import { GitlabCfg } from '../../features/issue/providers/gitlab/gitlab.model';
import { TaskCopy } from '../../features/tasks/task.model';
import { issueProviderInitialState } from '../../features/issue/store/issue-provider.reducer';
import { MODEL_VERSION } from '../model-version';
import { LegacyCalendarProvider } from '../../features/issue/providers/calendar/calendar.model';

export const crossModelMigrations = (data: AppDataComplete): AppDataComplete => {
  console.log('[M] Starting cross model migrations...', data);
  let newData = migrateTaskReminders(data);

  if (
    (!data.issueProvider ||
      (!data.issueProvider[MODEL_VERSION_KEY] && !data.issueProvider.ids.length)) &&
    data.project.ids.length &&
    data.project.ids.find((id) => data.project.entities[id]?.issueIntegrationCfgs)
  ) {
    newData = migrateIssueProvidersFromProjects(newData);
  }
  if (
    (!data.issueProvider ||
      (!data.issueProvider[MODEL_VERSION_KEY] && !data.issueProvider.ids.length)) &&
    data.globalConfig?.calendarIntegration?.calendarProviders?.length
  ) {
    newData = migrateIssueProvidersFromCalendars(newData);
  }

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

const migrateIssueProvidersFromProjects = (data: AppDataComplete): AppDataComplete => {
  const copy = { ...data };

  if (!copy.issueProvider) {
    copy.issueProvider = issueProviderInitialState;
  }

  let migrations: string[] = [];
  if (data.project.ids.length > 0) {
    Object.values(data.project.entities).forEach((project): void => {
      if (project) {
        migrations = migrations.concat(_addIssueProvidersForProject(copy, project));
      }
    });
  }
  migrations = migrations.concat(_cleanupIssueDataFromOrphanedIssueTasks(copy));

  if (migrations.length > 0) {
    console.log('Issue providers migrated from projects to standalone:', migrations);
    copy.issueProvider[MODEL_VERSION_KEY] = MODEL_VERSION.ISSUE_PROVIDER;
    return copy;
  }

  return data;
};

const migrateIssueProvidersFromCalendars = (data: AppDataComplete): AppDataComplete => {
  const copy = { ...data };

  if (!copy.issueProvider) {
    copy.issueProvider = issueProviderInitialState;
  }

  let migrations: string[] = [];
  if (!!data.globalConfig?.calendarIntegration?.calendarProviders?.length) {
    data.globalConfig.calendarIntegration.calendarProviders.forEach(
      (calProvider): void => {
        if (calProvider) {
          migrations = migrations.concat(
            _addIssueProvidersForCalendar(copy, calProvider),
          );
        }
      },
    );
  }

  if (migrations.length > 0) {
    console.log('Issue providers migrated from calProviders to standalone:', migrations);
    copy.issueProvider[MODEL_VERSION_KEY] = MODEL_VERSION.ISSUE_PROVIDER;
    // @ts-ignore
    delete copy.globalConfig.calendarIntegration.calendarProviders;
    return copy;
  }

  return data;
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function _cleanupIssueDataFromOrphanedIssueTasks(data: AppDataComplete): string[] {
  let count = 0;

  const updateTaskIfNecessary = (task: TaskCopy): void => {
    if (task.issueId && !task.issueProviderId) {
      count++;

      console.log('Cleaning up issue data for orphaned issue task', task);
      console.log(JSON.stringify(task));

      task.issueId = undefined;
      task.issueProviderId = undefined;
      task.issueType = undefined;
      task.issueWasUpdated = undefined;
      task.issueLastUpdated = undefined;
      task.issueAttachmentNr = undefined;
      task.issueTimeTracked = undefined;
      task.issuePoints = undefined;
    }
  };

  // Update tasks
  Object.keys(data.task.entities).forEach((taskId) => {
    const task = data.task.entities[taskId];
    if (task) {
      updateTaskIfNecessary(task);
    }
  });

  // Update archived tasks
  Object.keys(data.taskArchive.entities).forEach((taskId) => {
    const task = data.taskArchive.entities[taskId];
    if (task) {
      updateTaskIfNecessary(task);
    }
  });

  if (count === 0) {
    return [];
  }
  return [
    `Unlink issue data from ${count} orphaned issue tasks (check console via Ctrl+Shift+I for more details).`,
  ];
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function _addIssueProvider(data: AppDataComplete, newEntity: IssueProvider): void {
  // Create a copy of the issueProvider object
  const newIssueProvider = {
    ...data.issueProvider,
    ids: [...data.issueProvider.ids, newEntity.id],
    entities: {
      ...data.issueProvider.entities,
      [newEntity.id]: newEntity,
    },
  };

  // Assign the new issueProvider object back to data
  data.issueProvider = newIssueProvider;

  console.log('Added new issue provider:', newEntity);
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function _addIssueProvidersForProject(data: AppDataComplete, project: Project): string[] {
  let count = 0;
  if (!project.issueIntegrationCfgs) {
    return [];
  }

  Object.entries(project.issueIntegrationCfgs).forEach(([key, value]) => {
    if (_isMigrateIssueProvider(value, key as IssueProviderKey)) {
      count++;
      const issueProvider = {
        ...ISSUE_PROVIDER_DEFAULT_COMMON_CFG,
        ...DEFAULT_ISSUE_PROVIDER_CFGS[key as IssueProviderKey],
        issueProviderKey: key,
        migratedFromProjectId: project.id,
        defaultProjectId: project.id,
        id: nanoid(),
        isEnabled: value.isEnabled && !project.isHiddenFromMenu,
        ...value,
      } as IssueProvider;
      console.log('Migrating issue provider from project', key, issueProvider);

      _addIssueProvider(data, issueProvider);

      // Update tasks to reflect the migration
      _updateTasksForIssueProvider(data, issueProvider, project.id);
    }
  });

  if (count) {
    // alert(`Migrated ${count} issue providers for project ${project.title}`);
    return [`${count} for ${project.title}`];
  }
  return [];
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function _addIssueProvidersForCalendar(
  data: AppDataComplete,
  legacyCalProvider: LegacyCalendarProvider,
): string[] {
  if (!legacyCalProvider.id) {
    return [];
  }

  const issueProvider = {
    ...ISSUE_PROVIDER_DEFAULT_COMMON_CFG,
    ...DEFAULT_ISSUE_PROVIDER_CFGS[ICAL_TYPE],
    issueProviderKey: ICAL_TYPE,
    ...legacyCalProvider,
  } as IssueProvider;

  console.log('Migrating issue provider from calendarProvider', {
    newIssueProvider: issueProvider,
    legacyCalProvider,
  });

  _addIssueProvider(data, issueProvider);

  // Update tasks to reflect the migration
  _updateTasksForIssueProvider(data, issueProvider, legacyCalProvider.id);

  // alert(`Migrated ${count} issue providers for calendarProvider ${calendarProvider.title}`);
  return [`migrated calendar`];
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function _updateTasksForIssueProvider(
  data: AppDataComplete,
  issueProvider: IssueProvider,
  projectId: string,
): void {
  const updateTask = (task: TaskCopy): void => {
    if (
      task.issueType === issueProvider.issueProviderKey &&
      task.projectId === projectId
    ) {
      task.issueProviderId = issueProvider.id;
    }
  };

  // Update tasks
  data.task.ids.forEach((taskId) => {
    const task = data.task.entities[taskId];
    if (task) {
      updateTask(task);
    }
  });

  // Update archived tasks
  data.taskArchive.ids.forEach((taskId) => {
    const task = data.taskArchive.entities[taskId];
    if (task) {
      updateTask(task);
    }
  });
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function _isMigrateIssueProvider(
  fromProject: IssueIntegrationCfg,
  issueProviderKey: IssueProviderKey,
): boolean {
  if (!ISSUE_PROVIDER_TYPES.includes(issueProviderKey) || !fromProject) {
    return false;
  }

  if (issueProviderKey === 'JIRA' && (fromProject as JiraCfg).host === null) {
    return false;
  }

  if (
    issueProviderKey === 'OPEN_PROJECT' &&
    (fromProject as OpenProjectCfg).host === null
  ) {
    return false;
  }

  if (issueProviderKey === 'CALDAV' && (fromProject as CaldavCfg).caldavUrl === null) {
    return false;
  }

  if (issueProviderKey === 'REDMINE' && (fromProject as RedmineCfg).host === null) {
    return false;
  }

  if (issueProviderKey === 'GITHUB' && (fromProject as GithubCfg).repo === null) {
    return false;
  }

  if (issueProviderKey === 'GITEA' && (fromProject as GiteaCfg).repoFullname === null) {
    return false;
  }

  if (issueProviderKey === 'GITLAB' && (fromProject as GitlabCfg).project === null) {
    return false;
  }

  const defaultCfg = DEFAULT_ISSUE_PROVIDER_CFGS[issueProviderKey];
  // check if at least two properties are different
  const diffProps = Object.keys(fromProject).filter(
    (key) => fromProject[key] !== defaultCfg[key],
  );
  console.log(issueProviderKey, diffProps, fromProject, defaultCfg);

  return diffProps.length >= 2;
}

// TASK REMINDERS
// --------------
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
