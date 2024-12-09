import { Dictionary } from '@ngrx/entity';
import { Task, TaskArchive, TaskCopy, TaskState } from './task.model';
import { GITHUB_TYPE, ICAL_TYPE } from '../issue/issue.const';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isMigrateModel } from '../../util/model-version';
import { MODEL_VERSION } from '../../core/model-version';

export const LEGACY_GITHUB_TYPE = 'GIT';

export const migrateTaskState = (taskState: TaskState, modelType = 'Task'): TaskState => {
  if (!isMigrateModel(taskState, MODEL_VERSION.TASK, modelType)) {
    return taskState;
  }

  const taskEntities: Dictionary<Task> = _addProjectIdForSubTasksAndRemoveTags({
    ...taskState.entities,
  });

  Object.keys(taskEntities).forEach((key) => {
    taskEntities[key] = _taskEntityMigrations(taskEntities[key] as TaskCopy, taskState);
  });

  return {
    ...taskState,
    entities: taskEntities,
    [MODEL_VERSION_KEY]: MODEL_VERSION.TASK,
  };
};

export const migrateTaskArchiveState = (taskArchiveState: TaskArchive): TaskArchive => {
  // @ts-ignore
  return migrateTaskState(taskArchiveState as TaskState, 'Task Archive') as TaskArchive;
};

const _taskEntityMigrations = (task: TaskCopy, taskState: TaskState): TaskCopy => {
  task = _addNewIssueFields(task);
  task = _makeNullAndArraysConsistent(task);
  task = _replaceLegacyGitType(task);
  task = _addTagIds(task);
  task = _deleteUnusedFields(task);
  task = _updateUndefinedNoteFields(task);
  task = _updateTimeEstimate(task, taskState);
  task = _updateIssueCalendarToIcal(task);
  task = _removeLegacyGitLabIssueData(task);
  return task;
};

const _removeLegacyGitLabIssueData = (task: Task): Task => {
  return task.issueType === 'GITLAB' &&
    (typeof task.issueId !== 'string' || !task.issueId.includes('#'))
    ? {
        ...task,
        issueId: null,
        issueType: null,
        issueWasUpdated: null,
        issueLastUpdated: null,
        issueAttachmentNr: null,
        issuePoints: null,
        issueTimeTracked: null,
      }
    : task;
};

const _updateIssueCalendarToIcal = (task: Task): Task => {
  return task.issueType === ('CALENDAR' as any)
    ? { ...task, issueType: ICAL_TYPE }
    : task;
};

const _updateUndefinedNoteFields = (task: Task): Task => {
  return task.notes !== undefined ? task : { ...task, notes: '' };
};

const _updateTimeEstimate = (task: Task, taskState: TaskState): Task => {
  const getTotalEstimate = (): number => {
    const subTasks = task.subTaskIds.map((id) => taskState.entities[id]) as TaskCopy[];
    return subTasks && subTasks.length > 0
      ? subTasks.reduce(
          (acc: number, st: Task) =>
            acc + (st.isDone ? 0 : Math.max(0, st.timeEstimate - st.timeSpent)),
          0,
        )
      : 0;
  };

  return task.subTaskIds.length > 0
    ? {
        ...task,
        timeEstimate: getTotalEstimate(),
      }
    : task;
};

const _addTagIds = (task: Task): Task => {
  return task.hasOwnProperty('tagIds')
    ? task
    : {
        ...task,
        tagIds: [],
      };
};

const _addNewIssueFields = (task: Task): Task => {
  if (!task.hasOwnProperty('issueLastUpdated')) {
    return task.issueId !== null
      ? {
          // NOTE: we intentionally leave it as is, to allow for an update
          // issueAttachmentNr: null,
          // issueLastUpdated: Date.now(),
          // issueWasUpdated: false,
          ...task,
        }
      : {
          // @ts-ignore
          issueAttachmentNr: null,
          // @ts-ignore
          issueLastUpdated: null,
          // @ts-ignore
          issueWasUpdated: null,
          // @ts-ignore
          issueProviderId: null,
          ...task,
        };
  } else {
    return task;
  }
};

const _replaceLegacyGitType = (task: Task): Task => {
  const issueType = task.issueType as string;
  return issueType === LEGACY_GITHUB_TYPE ? { ...task, issueType: GITHUB_TYPE } : task;
};

const _deleteUnusedFields = (task: Task): Task => {
  const {
    // legacy
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _isAdditionalInfoOpen,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _currentTab,
    // the rest
    ...cleanTask
  }: any | Task = task;
  return cleanTask;
};

const _makeNullAndArraysConsistent = (task: Task): Task => {
  return {
    ...task,

    projectId: task.projectId ?? null,
    doneOn: task.doneOn ?? null,
    parentId: task.parentId ?? null,
    reminderId: task.reminderId ?? null,
    repeatCfgId: task.repeatCfgId ?? null,

    tagIds: task.tagIds ?? [],
    subTaskIds: task.subTaskIds ?? [],
    attachments: task.attachments ?? [],

    notes: task.notes ?? '',

    isDone: task.isDone ?? false,

    issueId: task.issueId ?? null,
    issueType: task.issueType ?? null,
    issueWasUpdated: task.issueWasUpdated ?? null,
    issueLastUpdated: task.issueLastUpdated ?? null,
    issueAttachmentNr: task.issueAttachmentNr ?? null,
    issuePoints: task.issuePoints ?? null,
    issueTimeTracked: task.issueTimeTracked ?? null,
  };
};

const _addProjectIdForSubTasksAndRemoveTags = (
  entities: Dictionary<Task>,
): Dictionary<Task> => {
  const entitiesCopy: any = { ...entities };
  Object.keys(entitiesCopy).forEach((id) => {
    const task = entitiesCopy[id];
    if (!task) {
      throw new Error('No task');
    }

    if (task.parentId) {
      entitiesCopy[id] = {
        ...entitiesCopy[id],
        tagIds: [],
        projectId: entitiesCopy[task.parentId].projectId,
      };
    }
  });

  return entitiesCopy;
};
