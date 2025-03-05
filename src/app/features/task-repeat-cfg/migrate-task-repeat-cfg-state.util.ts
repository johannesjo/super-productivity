import { Dictionary } from '@ngrx/entity';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isMigrateModel } from '../../util/is-migrate-model';
import {
  DEFAULT_TASK_REPEAT_CFG,
  TaskRepeatCfg,
  TaskRepeatCfgState,
} from './task-repeat-cfg.model';
import { isValidSplitTime } from '../../util/is-valid-split-time';
import { MODEL_VERSION } from '../../core/model-version';
import { getWorklogStr } from '../../util/get-work-log-str';

export const migrateTaskRepeatCfgState = (
  taskRepeatState: TaskRepeatCfgState,
): TaskRepeatCfgState => {
  if (!isMigrateModel(taskRepeatState, MODEL_VERSION.TASK_REPEAT, 'TaskRepeat')) {
    return taskRepeatState;
  }

  const taskRepeatEntities: Dictionary<TaskRepeatCfg> = { ...taskRepeatState.entities };
  Object.keys(taskRepeatEntities).forEach((key) => {
    // NOTE: absolutely needs to come last as otherwise the previous defaults won't work
    taskRepeatEntities[key] = _addNewFieldsToTaskRepeatCfgs(
      taskRepeatEntities[key] as TaskRepeatCfg,
    );
    taskRepeatEntities[key] = _fixTaskRepeatCfgClockStr(
      taskRepeatEntities[key] as TaskRepeatCfg,
    );
  });

  return {
    ...taskRepeatState,
    entities: taskRepeatEntities,
    // Update model version after all migrations ran successfully
    [MODEL_VERSION_KEY]: MODEL_VERSION.TASK_REPEAT,
  };
};

const _addNewFieldsToTaskRepeatCfgs = (taskRepeat: TaskRepeatCfg): TaskRepeatCfg => {
  const isMondayToFriday =
    taskRepeat.monday &&
    taskRepeat.tuesday &&
    taskRepeat.wednesday &&
    taskRepeat.thursday &&
    taskRepeat.friday;

  const isMondayToFridayOnly =
    isMondayToFriday && !taskRepeat.saturday && !taskRepeat.sunday;

  const isAllWeek = isMondayToFriday && taskRepeat.saturday && taskRepeat.sunday;

  let quickSetting = taskRepeat.quickSetting;

  if (!quickSetting) {
    if (isAllWeek) {
      quickSetting = 'DAILY';
    } else if (isMondayToFridayOnly) {
      quickSetting = 'MONDAY_TO_FRIDAY';
    } else {
      quickSetting = 'CUSTOM';
    }
  }

  return {
    ...DEFAULT_TASK_REPEAT_CFG,
    ...taskRepeat,
    tagIds: taskRepeat.tagIds || [],
    startTime: taskRepeat.startTime || undefined,
    order:
      typeof taskRepeat.order === 'number'
        ? taskRepeat.order
        : (taskRepeat as any).isAddToBottom
          ? 1
          : 0,
    quickSetting,
    repeatCycle: taskRepeat.repeatCycle || 'WEEKLY',
    repeatEvery: taskRepeat.repeatEvery || 1,
    startDate: taskRepeat.startDate || getWorklogStr(),
  };
};

const _fixTaskRepeatCfgClockStr = (taskRepeat: TaskRepeatCfg): TaskRepeatCfg => {
  return taskRepeat.startTime && !isValidSplitTime(taskRepeat.startTime)
    ? { ...taskRepeat, startTime: undefined }
    : taskRepeat;
};
