import {Dictionary} from '@ngrx/entity';
import {Task, TaskArchive, TaskState} from './task.model';
import {GITHUB_TYPE} from '../issue/issue.const';
import {MODEL_VERSION_KEY, WORKLOG_DATE_STR_FORMAT} from '../../app.constants';
import * as moment from 'moment';
import {convertToWesternArabic} from '../../util/numeric-converter';

const MODEL_VERSION = 3;
export const LEGACY_GITHUB_TYPE = 'GIT';

export const migrateTaskState = (taskState: TaskState): TaskState => {
  if (!taskState || (taskState && taskState[MODEL_VERSION_KEY] === MODEL_VERSION)) {
    return taskState;
  }

  const taskEntities: Dictionary<Task> = {...taskState.entities};
  Object.keys(taskEntities).forEach((key) => {
    taskEntities[key] = _addNewIssueFields(taskEntities[key]);
    taskEntities[key] = _replaceLegacyGitType(taskEntities[key]);
    taskEntities[key] = _deleteUnusedFields(taskEntities[key]);
    taskEntities[key] = _convertToWesternArabicDateKeys(taskEntities[key]);
  });

  taskState[MODEL_VERSION_KEY] = MODEL_VERSION;
  return {...taskState, entities: taskEntities};
};

export const migrateTaskArchiveState = (
  taskArchiveState: TaskArchive,
  projectId: string
): TaskArchive => migrateTaskState((taskArchiveState as TaskState));

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

const _deleteUnusedFields = (task: Task) => {
  const {
    // legacy
    _isAdditionalInfoOpen,
    _currentTab,
    // the rest
    ...cleanTask
  }: any | Task = task;
  return cleanTask;
};
