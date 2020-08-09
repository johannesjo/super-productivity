import { Dictionary } from '@ngrx/entity';
import { ArchiveTask, Task, TaskArchive, TaskCopy, TaskState } from './task.model';
import { GITHUB_TYPE } from '../issue/issue.const';
import { MODEL_VERSION_KEY, WORKLOG_DATE_STR_FORMAT } from '../../app.constants';
import * as moment from 'moment';
import { convertToWesternArabic } from '../../util/numeric-converter';
import { isMigrateModel } from '../../util/model-version';

const MODEL_VERSION = 3.3334;
export const LEGACY_GITHUB_TYPE = 'GIT';

export const migrateTaskState = (taskState: TaskState): TaskState => {
  if (!isMigrateModel(taskState, MODEL_VERSION, 'Task')) {
    return taskState;
  }

  const taskEntities: Dictionary<Task> = _addProjectIdForSubTasksAndRemoveTags({...taskState.entities});

  Object.keys(taskEntities).forEach((key) => {
    taskEntities[key] = _addNewIssueFields(taskEntities[key] as TaskCopy);
    taskEntities[key] = _makeNullAndArraysConsistent(taskEntities[key] as TaskCopy);
    taskEntities[key] = _replaceLegacyGitType(taskEntities[key] as TaskCopy);
    taskEntities[key] = _addTagIds(taskEntities[key] as TaskCopy);
    taskEntities[key] = _deleteUnusedFields(taskEntities[key] as TaskCopy);
    taskEntities[key] = _convertToWesternArabicDateKeys(taskEntities[key] as TaskCopy);
  });

  return {...taskState, entities: taskEntities, [MODEL_VERSION_KEY]: MODEL_VERSION};
};

export const migrateTaskArchiveState = (
  taskArchiveState: TaskArchive,
): TaskArchive => {
  if (!taskArchiveState || (taskArchiveState && taskArchiveState[MODEL_VERSION_KEY] === MODEL_VERSION)) {
    return taskArchiveState;
  }

  const taskEntities: Dictionary<Task> = {...taskArchiveState.entities};
  Object.keys(taskEntities).forEach((key) => {
    taskEntities[key] = _addNewIssueFields(taskEntities[key] as ArchiveTask);
    taskEntities[key] = _replaceLegacyGitType(taskEntities[key] as ArchiveTask);
    taskEntities[key] = _deleteUnusedFields(taskEntities[key] as ArchiveTask);
    taskEntities[key] = _convertToWesternArabicDateKeys(taskEntities[key] as ArchiveTask);
  });

  taskArchiveState[MODEL_VERSION_KEY] = MODEL_VERSION;
  return {...taskArchiveState, entities: taskEntities as Dictionary<ArchiveTask>};
};

const _addTagIds = (task: Task): Task => {
  return (task.hasOwnProperty('tagIds'))
    ? task
    : {
      ...task,
      tagIds: []
    };
};

const _addNewIssueFields = (task: Task): Task => {
  if (!task.hasOwnProperty('issueLastUpdated')) {
    return (task.issueId !== null)
      ? {
        // NOTE: we intentionally leave it as is, to allow for an update
        // issueAttachmentNr: null,
        // issueLastUpdated: Date.now(),
        // issueWasUpdated: false,
        ...task,
      }
      : {
        issueAttachmentNr: null,
        issueLastUpdated: null,
        issueWasUpdated: null,
        ...task
      };
  } else {
    return task;
  }
};

const _replaceLegacyGitType = (task: Task) => {
  const issueType = task.issueType as string;
  return (issueType === LEGACY_GITHUB_TYPE)
    ? {...task, issueType: GITHUB_TYPE}
    : task;
};

const _convertToWesternArabicDateKeys = (task: Task) => {
  return (task.timeSpentOnDay)
    ? {
      ...task,
      timeSpentOnDay: Object.keys(task.timeSpentOnDay).reduce((acc, dateKey) => {
        const date = moment(convertToWesternArabic(dateKey));
        if (!date.isValid()) {
          throw new Error('Cannot migrate invalid non western arabic date string ' + dateKey);
        }
        const westernArabicKey = date.locale('en').format(WORKLOG_DATE_STR_FORMAT);

        const totalTimeSpentOnDay = Object.keys(task.timeSpentOnDay).filter((key) => {
          return key === westernArabicKey && westernArabicKey !== dateKey;
        }).reduce((tot, val) => {
          return tot + task.timeSpentOnDay[val];
        }, task.timeSpentOnDay[dateKey]);

        return {
          ...acc,
          [westernArabicKey]: totalTimeSpentOnDay
        };
      }, {})
    }
    : task;
};

const _deleteUnusedFields = (task: Task): Task => {
  const {
    // legacy
    _isAdditionalInfoOpen,
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
  };
};

const _addProjectIdForSubTasksAndRemoveTags = (entities: Dictionary<Task>): Dictionary<Task> => {
  const entitiesCopy: any = {...entities};
  Object.keys(entitiesCopy).forEach(id => {
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



