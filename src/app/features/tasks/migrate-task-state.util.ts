import {Dictionary} from '@ngrx/entity';
import {Task, TaskArchive, TaskState} from './task.model';
import {GITHUB_TYPE, LEGACY_GITHUB_TYPE} from '../issue/issue.const';
import {MODEL_VERSION_KEY, WORKLOG_DATE_STR_FORMAT} from '../../app.constants';
import * as moment from 'moment';
import { convertToWesternArabic } from '../../util/numeric-converter';

const MODEL_VERSION = 2;

export const migrateTaskState = (taskState: TaskState, projectId: string): TaskState => {
  if (!taskState || (taskState && taskState[MODEL_VERSION_KEY] === MODEL_VERSION)) {
    return taskState;
  }

  const taskEntities: Dictionary<Task> = {...taskState.entities};
  Object.keys(taskEntities).forEach((key) => {
    taskEntities[key] = _addProjectId(taskEntities[key], projectId);
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
): TaskArchive => migrateTaskState((taskArchiveState as TaskState), projectId);

const _addProjectId = (task: Task, projectId: string): Task => {
  return (task.hasOwnProperty('projectId') && task.projectId !== null && task.projectId)
    ? task
    : {
      ...task,
      projectId,
    };
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

        const totalTimeSpentOnDay = Object.keys(task.timeSpentOnDay).filter( (key) => {
          return key === westernArabicKey && westernArabicKey !== dateKey;
        }).reduce( (tot, val) => {
          return tot + task.timeSpentOnDay[val];
        } , task.timeSpentOnDay[dateKey]);

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
    // the rest
    ...cleanTask
  } = task;
  return cleanTask;
};
