import {Dictionary} from '@ngrx/entity';
import {Task, TaskState} from './task.model';
import {GITHUB_TYPE, LEGACY_GITHUB_TYPE} from '../issue/issue.const';
import {MODEL_VERSION_KEY} from '../../app.constants';

const MODEL_VERSION = 1;

export const migrateTaskState = (taskState: TaskState, projectId: string): TaskState => {
  if (taskState && taskState[MODEL_VERSION_KEY] === MODEL_VERSION) {
    return taskState;
  } else {
    taskState[MODEL_VERSION_KEY] = MODEL_VERSION;
  }

  const taskEntities: Dictionary<Task> = {...taskState.entities};
  Object.keys(taskEntities).forEach((key) => {
    taskEntities[key] = _addProjectId(taskEntities[key], projectId);
    taskEntities[key] = _replaceLegacyGitType(taskEntities[key]);
  });
  return {...taskState, entities: taskEntities};
};

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
