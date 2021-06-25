import { Dictionary } from '@ngrx/entity';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isMigrateModel } from '../../util/model-version';
import { TaskRepeatCfg, TaskRepeatCfgState } from './task-repeat-cfg.model';

const MODEL_VERSION = 1.1;

export const migrateTaskRepeatCfgState = (
  taskRepeatState: TaskRepeatCfgState,
): TaskRepeatCfgState => {
  if (!isMigrateModel(taskRepeatState, MODEL_VERSION, 'TaskRepeat')) {
    return taskRepeatState;
  }

  const taskRepeatEntities: Dictionary<TaskRepeatCfg> = { ...taskRepeatState.entities };
  Object.keys(taskRepeatEntities).forEach((key) => {
    // NOTE: absolutely needs to come last as otherwise the previous defaults won't work
    taskRepeatEntities[key] = _addNewFieldsToTaskRepeatCfgs(
      taskRepeatEntities[key] as TaskRepeatCfg,
    );
  });

  return {
    ...taskRepeatState,
    entities: taskRepeatEntities,
    // Update model version after all migrations ran successfully
    [MODEL_VERSION_KEY]: MODEL_VERSION,
  };
};

const _addNewFieldsToTaskRepeatCfgs = (taskRepeat: TaskRepeatCfg): TaskRepeatCfg => {
  return {
    ...taskRepeat,
    tagIds: taskRepeat.tagIds || [],
    startTime: undefined,
  };
};
