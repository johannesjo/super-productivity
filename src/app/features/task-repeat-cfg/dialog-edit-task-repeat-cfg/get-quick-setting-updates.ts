import {
  RepeatQuickSetting,
  TASK_REPEAT_WEEKDAY_MAP,
  TaskRepeatCfg,
} from '../task-repeat-cfg.model';
import { getDbDateStr } from '../../../util/get-db-date-str';

export const getQuickSettingUpdates = (
  quickSetting: RepeatQuickSetting,
): Partial<TaskRepeatCfg> | undefined => {
  switch (quickSetting) {
    case 'DAILY': {
      return {
        repeatCycle: 'DAILY',
        repeatEvery: 1,
        startDate: getDbDateStr(),
      };
    }

    case 'WEEKLY_CURRENT_WEEKDAY': {
      const todayWeekdayStr = TASK_REPEAT_WEEKDAY_MAP[new Date().getDay()];
      return {
        repeatCycle: 'WEEKLY',
        repeatEvery: 1,
        startDate: getDbDateStr(),
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
        [todayWeekdayStr as keyof TaskRepeatCfg]: true,
      };
    }

    case 'MONDAY_TO_FRIDAY': {
      return {
        repeatCycle: 'WEEKLY',
        repeatEvery: 1,
        startDate: getDbDateStr(),
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      };
    }

    case 'MONTHLY_CURRENT_DATE': {
      return {
        repeatCycle: 'MONTHLY',
        repeatEvery: 1,
        startDate: getDbDateStr(),
      };
    }

    case 'YEARLY_CURRENT_DATE': {
      return {
        repeatCycle: 'YEARLY',
        repeatEvery: 1,
        startDate: getDbDateStr(),
      };
    }

    case 'CUSTOM':
    default:
  }
  return undefined;
};
